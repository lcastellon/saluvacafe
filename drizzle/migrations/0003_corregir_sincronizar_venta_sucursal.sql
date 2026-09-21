CREATE OR REPLACE FUNCTION public.sincronizar_venta_pos(p_venta jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta_id uuid;
  v_item jsonb;
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
    p_venta->>'metodoPago',
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
      (SELECT caja.sucursal_id FROM public.pos_cajas AS caja WHERE caja.id = NULLIF(p_venta->>'cajaId', '')::uuid)
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
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_venta->'items', '[]'::jsonb))
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