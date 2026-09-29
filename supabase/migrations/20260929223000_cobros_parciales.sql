-- Permite dividir una venta entre varias formas de pago sin duplicar la venta,
-- el inventario ni las estadísticas de productos.

CREATE TABLE IF NOT EXISTS public.pos_venta_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES public.pos_ventas(id) ON DELETE CASCADE,
  orden integer NOT NULL CHECK (orden > 0),
  metodo_pago text NOT NULL
    CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),
  monto numeric(12,2) NOT NULL CHECK (monto > 0),
  monto_recibido numeric(12,2) NOT NULL DEFAULT 0 CHECK (monto_recibido >= 0),
  cambio numeric(12,2) NOT NULL DEFAULT 0 CHECK (cambio >= 0),
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venta_id, orden)
);

CREATE INDEX IF NOT EXISTS pos_venta_pagos_venta_id_idx
  ON public.pos_venta_pagos (venta_id);
CREATE INDEX IF NOT EXISTS pos_venta_pagos_metodo_idx
  ON public.pos_venta_pagos (metodo_pago);

GRANT SELECT ON public.pos_venta_pagos TO authenticated;
GRANT ALL ON public.pos_venta_pagos TO service_role;
ALTER TABLE public.pos_venta_pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal consulta pagos de ventas" ON public.pos_venta_pagos;
CREATE POLICY "Personal consulta pagos de ventas"
  ON public.pos_venta_pagos FOR SELECT TO authenticated USING (true);

-- Las ventas anteriores se conservan como un solo pago.
INSERT INTO public.pos_venta_pagos (
  venta_id, orden, metodo_pago, monto, monto_recibido, cambio
)
SELECT
  venta.id,
  1,
  venta.metodo_pago,
  round(venta.total + venta.propina, 2),
  venta.monto_recibido,
  venta.cambio
FROM public.pos_ventas AS venta
WHERE venta.total + venta.propina > 0
ON CONFLICT (venta_id, orden) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_venta_pos(p_venta jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta_id uuid;
  v_item jsonb;
  v_pago jsonb;
  v_pago_orden integer := 0;
  v_total_pagos numeric(12,2) := 0;
  v_inventario_aplicado boolean;
  v_sucursal_id uuid;
  v_consumo record;
  v_insumo_id uuid;
  v_existencia_anterior numeric(12,4);
  v_existencia_nueva numeric(12,4);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND activo = true
  ) THEN
    RAISE EXCEPTION 'El perfil no está activo';
  END IF;

  INSERT INTO public.pos_ventas (
    client_id, folio, user_id, cliente, canal, metodo_pago, estado,
    subtotal, iva, total, propina, monto_recibido, cambio, comensales,
    caja_id, sucursal_id, creado_en, actualizado_en
  ) VALUES (
    p_venta->>'id',
    p_venta->>'folio',
    auth.uid(),
    COALESCE(NULLIF(p_venta->>'cliente', ''), 'Cliente'),
    CASE p_venta->>'canal'
      WHEN 'Mostrador' THEN 'A mesa'
      WHEN 'App' THEN 'Para recoger'
      ELSE p_venta->>'canal'
    END,
    CASE
      WHEN jsonb_typeof(p_venta->'pagos') = 'array'
        AND jsonb_array_length(p_venta->'pagos') > 0
        THEN p_venta->'pagos'->0->>'metodo'
      WHEN (p_venta->>'metodoPago') IN ('Efectivo', 'Tarjeta', 'Transferencia')
        THEN p_venta->>'metodoPago'
      ELSE 'Efectivo'
    END,
    p_venta->>'estado',
    (p_venta->>'subtotal')::numeric,
    (p_venta->>'iva')::numeric,
    (p_venta->>'total')::numeric,
    COALESCE(NULLIF(p_venta->>'propina', '')::numeric, 0),
    COALESCE(
      NULLIF(p_venta->>'montoRecibido', '')::numeric,
      (p_venta->>'total')::numeric + COALESCE(NULLIF(p_venta->>'propina', '')::numeric, 0)
    ),
    COALESCE(NULLIF(p_venta->>'cambio', '')::numeric, 0),
    LEAST(GREATEST(COALESCE(NULLIF(p_venta->>'comensales', '')::integer, 1), 1), 99),
    NULLIF(p_venta->>'cajaId', '')::uuid,
    COALESCE(
      NULLIF(p_venta->>'sucursalId', '')::uuid,
      (
        SELECT caja.sucursal_id
        FROM public.pos_cajas AS caja
        WHERE caja.id = NULLIF(p_venta->>'cajaId', '')::uuid
      )
    ),
    (p_venta->>'creadoEn')::timestamptz,
    now()
  )
  ON CONFLICT (client_id) DO UPDATE SET
    cliente = EXCLUDED.cliente,
    canal = EXCLUDED.canal,
    metodo_pago = EXCLUDED.metodo_pago,
    estado = EXCLUDED.estado,
    subtotal = EXCLUDED.subtotal,
    iva = EXCLUDED.iva,
    total = EXCLUDED.total,
    propina = EXCLUDED.propina,
    monto_recibido = EXCLUDED.monto_recibido,
    cambio = EXCLUDED.cambio,
    comensales = EXCLUDED.comensales,
    caja_id = COALESCE(EXCLUDED.caja_id, pos_ventas.caja_id),
    sucursal_id = COALESCE(EXCLUDED.sucursal_id, pos_ventas.sucursal_id),
    actualizado_en = now()
  RETURNING id INTO v_venta_id;

  DELETE FROM public.pos_venta_items WHERE venta_id = v_venta_id;
  FOR v_item IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_venta->'items', '[]'::jsonb))
  LOOP
    INSERT INTO public.pos_venta_items (
      venta_id, linea_id, producto_id, nombre, cantidad, precio, opciones
    ) VALUES (
      v_venta_id,
      COALESCE(v_item->>'lineaId', v_item->>'productoId'),
      v_item->>'productoId',
      v_item->>'nombre',
      (v_item->>'cantidad')::integer,
      (v_item->>'precio')::numeric,
      COALESCE(v_item->'opciones', '[]'::jsonb)
    );
  END LOOP;

  DELETE FROM public.pos_venta_pagos WHERE venta_id = v_venta_id;
  IF jsonb_typeof(p_venta->'pagos') = 'array'
    AND jsonb_array_length(p_venta->'pagos') > 0 THEN
    FOR v_pago IN SELECT * FROM jsonb_array_elements(p_venta->'pagos')
    LOOP
      IF (v_pago->>'metodo') NOT IN ('Efectivo', 'Tarjeta', 'Transferencia') THEN
        RAISE EXCEPTION 'El método de pago parcial no es válido';
      END IF;
      IF COALESCE(NULLIF(v_pago->>'monto', '')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION 'El monto de cada pago debe ser mayor que cero';
      END IF;

      v_pago_orden := v_pago_orden + 1;
      v_total_pagos := v_total_pagos + (v_pago->>'monto')::numeric;
      INSERT INTO public.pos_venta_pagos (
        venta_id, orden, metodo_pago, monto, monto_recibido, cambio
      ) VALUES (
        v_venta_id,
        v_pago_orden,
        v_pago->>'metodo',
        round((v_pago->>'monto')::numeric, 2),
        round(COALESCE(NULLIF(v_pago->>'recibido', '')::numeric, (v_pago->>'monto')::numeric), 2),
        round(COALESCE(NULLIF(v_pago->>'cambio', '')::numeric, 0), 2)
      );
    END LOOP;

    IF abs(
      round(v_total_pagos, 2) - round(
        (p_venta->>'total')::numeric + COALESCE(NULLIF(p_venta->>'propina', '')::numeric, 0),
        2
      )
    ) > 0.01 THEN
      RAISE EXCEPTION 'Los pagos parciales no cubren exactamente el total de la venta';
    END IF;
  ELSE
    INSERT INTO public.pos_venta_pagos (
      venta_id, orden, metodo_pago, monto, monto_recibido, cambio
    ) VALUES (
      v_venta_id,
      1,
      CASE
        WHEN (p_venta->>'metodoPago') IN ('Efectivo', 'Tarjeta', 'Transferencia')
          THEN p_venta->>'metodoPago'
        ELSE 'Efectivo'
      END,
      round(
        (p_venta->>'total')::numeric + COALESCE(NULLIF(p_venta->>'propina', '')::numeric, 0),
        2
      ),
      round(COALESCE(
        NULLIF(p_venta->>'montoRecibido', '')::numeric,
        (p_venta->>'total')::numeric + COALESCE(NULLIF(p_venta->>'propina', '')::numeric, 0)
      ), 2),
      round(COALESCE(NULLIF(p_venta->>'cambio', '')::numeric, 0), 2)
    );
  END IF;

  SELECT venta.inventario_aplicado, COALESCE(caja.sucursal_id, venta.sucursal_id)
  INTO v_inventario_aplicado, v_sucursal_id
  FROM public.pos_ventas AS venta
  LEFT JOIN public.pos_cajas AS caja ON caja.id = venta.caja_id
  WHERE venta.id = v_venta_id
  FOR UPDATE OF venta;

  IF v_sucursal_id IS NOT NULL THEN
    UPDATE public.pos_ventas
    SET sucursal_id = v_sucursal_id
    WHERE id = v_venta_id AND sucursal_id IS NULL;
  END IF;

  IF NOT v_inventario_aplicado THEN
    FOR v_consumo IN
      SELECT consumo.insumo_clave, sum(consumo.cantidad)::numeric(12,4) AS cantidad
      FROM (
        SELECT
          CASE
            WHEN receta.insumo_clave = 'leche-entera'
              AND item.opciones @> '["Leche de avena"]'::jsonb THEN 'leche-avena'
            WHEN receta.insumo_clave = 'leche-entera'
              AND item.opciones @> '["Leche de soya"]'::jsonb THEN 'leche-soya'
            ELSE receta.insumo_clave
          END AS insumo_clave,
          receta.cantidad * item.cantidad AS cantidad
        FROM public.pos_venta_items AS item
        INNER JOIN public.pos_recetas AS receta
          ON receta.producto_id = item.producto_id AND receta.activa = true
        INNER JOIN public.pos_ventas AS venta ON venta.id = item.venta_id
        WHERE item.venta_id = v_venta_id
          AND (
            receta.condicion = 'base'
            OR (
              receta.condicion = 'para_llevar'
              AND (
                venta.canal IN ('Para llevar', 'Para recoger')
                OR item.opciones @> '["Para llevar"]'::jsonb
              )
            )
          )
        UNION ALL
        SELECT 'cafe-casa', 18::numeric * item.cantidad
        FROM public.pos_venta_items AS item
        WHERE item.venta_id = v_venta_id
          AND item.opciones @> '["Extra shot"]'::jsonb
      ) AS consumo
      GROUP BY consumo.insumo_clave
    LOOP
      SELECT insumo.id, insumo.existencia
      INTO v_insumo_id, v_existencia_anterior
      FROM public.insumos AS insumo
      WHERE insumo.sucursal_id = v_sucursal_id
        AND insumo.clave = v_consumo.insumo_clave
        AND insumo.activo = true
      FOR UPDATE;

      IF FOUND THEN
        v_existencia_nueva := GREATEST(0, v_existencia_anterior - v_consumo.cantidad);
        UPDATE public.insumos
        SET existencia = v_existencia_nueva
        WHERE id = v_insumo_id;

        INSERT INTO public.pos_inventario_movimientos (
          venta_id, insumo_id, cantidad, existencia_anterior, existencia_nueva
        ) VALUES (
          v_venta_id, v_insumo_id, v_consumo.cantidad,
          v_existencia_anterior, v_existencia_nueva
        )
        ON CONFLICT (venta_id, insumo_id) DO NOTHING;
      END IF;
    END LOOP;

    UPDATE public.pos_ventas
    SET inventario_aplicado = true
    WHERE id = v_venta_id;
  END IF;

  RETURN v_venta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sincronizar_venta_pos(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_venta_pos(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.listar_ventas_pos()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', venta.client_id,
        'folio', venta.folio,
        'cliente', venta.cliente,
        'canal', venta.canal,
        'metodoPago', CASE
          WHEN (
            SELECT count(DISTINCT pago.metodo_pago)
            FROM public.pos_venta_pagos AS pago
            WHERE pago.venta_id = venta.id
          ) > 1 THEN 'Mixto'
          ELSE venta.metodo_pago
        END,
        'estado', venta.estado,
        'subtotal', venta.subtotal,
        'iva', venta.iva,
        'total', venta.total,
        'propina', venta.propina,
        'montoRecibido', venta.monto_recibido,
        'cambio', venta.cambio,
        'comensales', venta.comensales,
        'cajaId', venta.caja_id,
        'sucursalId', venta.sucursal_id,
        'sucursalNombre', sucursal.nombre,
        'creadoEn', venta.creado_en,
        'hora', to_char(venta.creado_en AT TIME ZONE 'America/Mexico_City', 'HH24:MI'),
        'sincronizacion', 'sincronizado',
        'pagos', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'metodo', pago.metodo_pago,
                'monto', pago.monto,
                'recibido', pago.monto_recibido,
                'cambio', pago.cambio
              ) ORDER BY pago.orden
            )
            FROM public.pos_venta_pagos AS pago
            WHERE pago.venta_id = venta.id
          ),
          '[]'::jsonb
        ),
        'items', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'lineaId', item.linea_id,
                'productoId', item.producto_id,
                'nombre', item.nombre,
                'cantidad', item.cantidad,
                'precio', item.precio,
                'opciones', item.opciones
              ) ORDER BY item.id
            )
            FROM public.pos_venta_items AS item
            WHERE item.venta_id = venta.id
          ),
          '[]'::jsonb
        )
      ) ORDER BY venta.creado_en DESC
    ),
    '[]'::jsonb
  )
  FROM public.pos_ventas AS venta
  LEFT JOIN public.pos_sucursales AS sucursal ON sucursal.id = venta.sucursal_id;
$$;

REVOKE EXECUTE ON FUNCTION public.listar_ventas_pos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_ventas_pos() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reporte_periodo_pos(
  p_desde timestamptz,
  p_hasta timestamptz,
  p_sucursal_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fondo_inicial numeric := 0;
  v_efectivo_contado numeric := 0;
  v_venta_total numeric := 0;
  v_venta_neta numeric := 0;
  v_impuestos numeric := 0;
  v_propinas numeric := 0;
  v_ventas_efectivo numeric := 0;
  v_propinas_efectivo numeric := 0;
  v_ventas_tarjeta numeric := 0;
  v_propinas_tarjeta numeric := 0;
  v_ventas_transferencia numeric := 0;
  v_propinas_transferencia numeric := 0;
  v_cuentas integer := 0;
  v_cuentas_cerradas integer := 0;
  v_comensales integer := 0;
  v_operaciones_efectivo integer := 0;
  v_operaciones_tarjeta integer := 0;
  v_operaciones_transferencia integer := 0;
  v_ordenes_mesa integer := 0;
  v_ventas_mesa numeric := 0;
  v_ordenes_llevar integer := 0;
  v_ventas_llevar numeric := 0;
  v_ordenes_recoger integer := 0;
  v_ventas_recoger numeric := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sólo un administrador puede generar reportes de caja';
  END IF;
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde >= p_hasta THEN
    RAISE EXCEPTION 'El periodo solicitado no es válido';
  END IF;

  SELECT
    COALESCE(sum(venta.total), 0),
    COALESCE(sum(venta.subtotal), 0),
    COALESCE(sum(venta.iva), 0),
    COALESCE(sum(venta.propina), 0),
    count(*)::integer,
    count(*) FILTER (WHERE venta.estado = 'Entregado')::integer,
    COALESCE(sum(venta.comensales), 0)::integer,
    count(*) FILTER (WHERE venta.canal = 'A mesa')::integer,
    COALESCE(sum(venta.total) FILTER (WHERE venta.canal = 'A mesa'), 0),
    count(*) FILTER (WHERE venta.canal = 'Para llevar')::integer,
    COALESCE(sum(venta.total) FILTER (WHERE venta.canal = 'Para llevar'), 0),
    count(*) FILTER (WHERE venta.canal = 'Para recoger')::integer,
    COALESCE(sum(venta.total) FILTER (WHERE venta.canal = 'Para recoger'), 0)
  INTO
    v_venta_total,
    v_venta_neta,
    v_impuestos,
    v_propinas,
    v_cuentas,
    v_cuentas_cerradas,
    v_comensales,
    v_ordenes_mesa,
    v_ventas_mesa,
    v_ordenes_llevar,
    v_ventas_llevar,
    v_ordenes_recoger,
    v_ventas_recoger
  FROM public.pos_ventas AS venta
  LEFT JOIN public.pos_cajas AS caja ON caja.id = venta.caja_id
  WHERE venta.creado_en >= p_desde
    AND venta.creado_en < p_hasta
    AND (
      p_sucursal_id IS NULL
      OR COALESCE(venta.sucursal_id, caja.sucursal_id) = p_sucursal_id
    );

  WITH desglose AS (
    SELECT
      pago.metodo_pago,
      CASE
        WHEN venta.total + venta.propina > 0
          THEN pago.monto * venta.total / (venta.total + venta.propina)
        ELSE 0
      END AS venta,
      CASE
        WHEN venta.total + venta.propina > 0
          THEN pago.monto * venta.propina / (venta.total + venta.propina)
        ELSE 0
      END AS propina
    FROM public.pos_venta_pagos AS pago
    INNER JOIN public.pos_ventas AS venta ON venta.id = pago.venta_id
    LEFT JOIN public.pos_cajas AS caja ON caja.id = venta.caja_id
    WHERE venta.creado_en >= p_desde
      AND venta.creado_en < p_hasta
      AND (
        p_sucursal_id IS NULL
        OR COALESCE(venta.sucursal_id, caja.sucursal_id) = p_sucursal_id
      )
  )
  SELECT
    COALESCE(sum(venta) FILTER (WHERE metodo_pago = 'Efectivo'), 0),
    COALESCE(sum(propina) FILTER (WHERE metodo_pago = 'Efectivo'), 0),
    COALESCE(sum(venta) FILTER (WHERE metodo_pago = 'Tarjeta'), 0),
    COALESCE(sum(propina) FILTER (WHERE metodo_pago = 'Tarjeta'), 0),
    COALESCE(sum(venta) FILTER (WHERE metodo_pago = 'Transferencia'), 0),
    COALESCE(sum(propina) FILTER (WHERE metodo_pago = 'Transferencia'), 0),
    count(*) FILTER (WHERE metodo_pago = 'Efectivo')::integer,
    count(*) FILTER (WHERE metodo_pago = 'Tarjeta')::integer,
    count(*) FILTER (WHERE metodo_pago = 'Transferencia')::integer
  INTO
    v_ventas_efectivo,
    v_propinas_efectivo,
    v_ventas_tarjeta,
    v_propinas_tarjeta,
    v_ventas_transferencia,
    v_propinas_transferencia,
    v_operaciones_efectivo,
    v_operaciones_tarjeta,
    v_operaciones_transferencia
  FROM desglose;

  SELECT
    COALESCE(sum(caja.fondo_inicial), 0),
    COALESCE(sum(caja.efectivo_contado) FILTER (WHERE caja.estado = 'cerrada'), 0)
  INTO v_fondo_inicial, v_efectivo_contado
  FROM public.pos_cajas AS caja
  WHERE caja.abierto_en >= p_desde
    AND caja.abierto_en < p_hasta
    AND (p_sucursal_id IS NULL OR caja.sucursal_id = p_sucursal_id);

  RETURN jsonb_build_object(
    'ventaTotal', round(v_venta_total, 2),
    'ventaNeta', round(v_venta_neta, 2),
    'impuestos', round(v_impuestos, 2),
    'propinas', round(v_propinas, 2),
    'ingresosTotales', round(v_venta_total + v_propinas, 2),
    'fondoInicial', round(v_fondo_inicial, 2),
    'efectivoContado', round(v_efectivo_contado, 2),
    'saldoFinalEstimado', round(v_fondo_inicial + v_venta_total + v_propinas, 2),
    'efectivoTotalEstimado', round(v_fondo_inicial + v_ventas_efectivo + v_propinas_efectivo, 2),
    'diferenciaEfectivo', round(
      v_efectivo_contado - (v_fondo_inicial + v_ventas_efectivo + v_propinas_efectivo),
      2
    ),
    'formas', jsonb_build_object(
      'Efectivo', jsonb_build_object(
        'operaciones', v_operaciones_efectivo,
        'ventas', round(v_ventas_efectivo, 2),
        'propinas', round(v_propinas_efectivo, 2)
      ),
      'Tarjeta', jsonb_build_object(
        'operaciones', v_operaciones_tarjeta,
        'ventas', round(v_ventas_tarjeta, 2),
        'propinas', round(v_propinas_tarjeta, 2)
      ),
      'Transferencia', jsonb_build_object(
        'operaciones', v_operaciones_transferencia,
        'ventas', round(v_ventas_transferencia, 2),
        'propinas', round(v_propinas_transferencia, 2)
      )
    ),
    'tiposOrden', jsonb_build_object(
      'A mesa', jsonb_build_object('operaciones', v_ordenes_mesa, 'ventas', round(v_ventas_mesa, 2)),
      'Para llevar', jsonb_build_object('operaciones', v_ordenes_llevar, 'ventas', round(v_ventas_llevar, 2)),
      'Para recoger', jsonb_build_object('operaciones', v_ordenes_recoger, 'ventas', round(v_ventas_recoger, 2))
    ),
    'cuentasIniciadas', v_cuentas,
    'cuentasCerradas', v_cuentas_cerradas,
    'cuentasPendientes', v_cuentas - v_cuentas_cerradas,
    'comensales', v_comensales,
    'cuentaPromedio', CASE
      WHEN v_cuentas > 0 THEN round(v_venta_total / v_cuentas, 2)
      ELSE 0
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reporte_periodo_pos(timestamptz, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reporte_periodo_pos(timestamptz, timestamptz, uuid)
  TO authenticated, service_role;
