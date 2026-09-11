CREATE TABLE IF NOT EXISTS public.pos_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  folio text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  cliente text NOT NULL DEFAULT 'Mostrador',
  canal text NOT NULL CHECK (canal IN ('Mostrador', 'Para llevar', 'App')),
  metodo_pago text NOT NULL CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),
  estado text NOT NULL CHECK (estado IN ('En preparación', 'Listo', 'Entregado')),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  iva numeric(12,2) NOT NULL CHECK (iva >= 0),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  propina numeric(12,2) NOT NULL DEFAULT 0 CHECK (propina >= 0),
  monto_recibido numeric(12,2) NOT NULL DEFAULT 0 CHECK (monto_recibido >= 0),
  cambio numeric(12,2) NOT NULL DEFAULT 0 CHECK (cambio >= 0),
  creado_en timestamptz NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_venta_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES public.pos_ventas(id) ON DELETE CASCADE,
  linea_id text NOT NULL,
  producto_id text NOT NULL,
  nombre text NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio numeric(12,2) NOT NULL CHECK (precio >= 0),
  opciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (venta_id, linea_id)
);

ALTER TABLE public.pos_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_venta_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.pos_ventas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_venta_items TO authenticated;
GRANT ALL ON public.pos_ventas, public.pos_venta_items TO service_role;

DROP POLICY IF EXISTS "El personal consulta ventas" ON public.pos_ventas;
CREATE POLICY "El personal consulta ventas" ON public.pos_ventas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "El personal registra ventas" ON public.pos_ventas;
CREATE POLICY "El personal registra ventas" ON public.pos_ventas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "El personal actualiza ventas" ON public.pos_ventas;
CREATE POLICY "El personal actualiza ventas" ON public.pos_ventas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "El personal consulta partidas" ON public.pos_venta_items;
CREATE POLICY "El personal consulta partidas" ON public.pos_venta_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "El personal registra partidas" ON public.pos_venta_items;
CREATE POLICY "El personal registra partidas" ON public.pos_venta_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.pos_ventas WHERE id = venta_id)
  );

DROP POLICY IF EXISTS "El personal actualiza partidas" ON public.pos_venta_items;
CREATE POLICY "El personal actualiza partidas" ON public.pos_venta_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "El personal elimina partidas" ON public.pos_venta_items;
CREATE POLICY "El personal elimina partidas" ON public.pos_venta_items
  FOR DELETE TO authenticated USING (true);

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
    client_id, folio, user_id, cliente, canal, metodo_pago, estado,
    subtotal, iva, total, propina, monto_recibido, cambio, creado_en, actualizado_en
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