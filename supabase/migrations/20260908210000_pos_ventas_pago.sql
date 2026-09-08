ALTER TABLE public.pos_ventas
  ADD COLUMN IF NOT EXISTS propina numeric(12,2) NOT NULL DEFAULT 0 CHECK (propina >= 0),
  ADD COLUMN IF NOT EXISTS monto_recibido numeric(12,2) NOT NULL DEFAULT 0 CHECK (monto_recibido >= 0),
  ADD COLUMN IF NOT EXISTS cambio numeric(12,2) NOT NULL DEFAULT 0 CHECK (cambio >= 0);

CREATE OR REPLACE FUNCTION public.sincronizar_venta_pos(p_venta jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_venta_id uuid;
  v_item jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;

  INSERT INTO public.pos_ventas (
    client_id,
    folio,
    user_id,
    cliente,
    canal,
    metodo_pago,
    estado,
    subtotal,
    iva,
    total,
    propina,
    monto_recibido,
    cambio,
    creado_en,
    actualizado_en
  ) VALUES (
    p_venta->>'id',
    p_venta->>'folio',
    auth.uid(),
    COALESCE(NULLIF(p_venta->>'cliente', ''), 'Mostrador'),
    p_venta->>'canal',
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
    actualizado_en = now()
  RETURNING id INTO v_venta_id;

  DELETE FROM public.pos_venta_items WHERE venta_id = v_venta_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_venta->'items')
  LOOP
    INSERT INTO public.pos_venta_items (
      venta_id,
      linea_id,
      producto_id,
      nombre,
      cantidad,
      precio,
      opciones
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
        'metodoPago', venta.metodo_pago,
        'estado', venta.estado,
        'subtotal', venta.subtotal,
        'iva', venta.iva,
        'total', venta.total,
        'propina', venta.propina,
        'montoRecibido', venta.monto_recibido,
        'cambio', venta.cambio,
        'creadoEn', venta.creado_en,
        'hora', to_char(venta.creado_en AT TIME ZONE 'America/Mexico_City', 'HH24:MI'),
        'sincronizacion', 'sincronizado',
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
              )
              ORDER BY item.id
            )
            FROM public.pos_venta_items AS item
            WHERE item.venta_id = venta.id
          ),
          '[]'::jsonb
        )
      )
      ORDER BY venta.creado_en DESC
    ),
    '[]'::jsonb
  )
  FROM public.pos_ventas AS venta;
$$;

REVOKE EXECUTE ON FUNCTION public.listar_ventas_pos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_ventas_pos() TO authenticated, service_role;
