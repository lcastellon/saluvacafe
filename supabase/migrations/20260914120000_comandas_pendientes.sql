-- Comandas abiertas antes del cobro. Se separan de ventas para no alterar reportes ni cortes.

CREATE TABLE IF NOT EXISTS public.pos_comandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  folio text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  cliente text NOT NULL DEFAULT 'Cliente',
  canal text NOT NULL CHECK (canal IN ('A mesa', 'Para llevar', 'Para recoger')),
  estado text NOT NULL CHECK (estado IN ('En preparación', 'Listo', 'Entregado')),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  iva numeric(12,2) NOT NULL CHECK (iva >= 0),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  comensales integer NOT NULL DEFAULT 1 CHECK (comensales BETWEEN 1 AND 99),
  caja_id uuid REFERENCES public.pos_cajas(id) ON DELETE SET NULL,
  creado_en timestamptz NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_comanda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id uuid NOT NULL REFERENCES public.pos_comandas(id) ON DELETE CASCADE,
  linea_id text NOT NULL,
  producto_id text NOT NULL,
  nombre text NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio numeric(12,2) NOT NULL CHECK (precio >= 0),
  opciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (comanda_id, linea_id)
);

CREATE INDEX IF NOT EXISTS pos_comandas_creado_en_idx
  ON public.pos_comandas (creado_en DESC);

ALTER TABLE public.pos_comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_comanda_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_comandas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_comanda_items TO authenticated;
GRANT ALL ON public.pos_comandas, public.pos_comanda_items TO service_role;

DROP POLICY IF EXISTS "El personal consulta comandas" ON public.pos_comandas;
CREATE POLICY "El personal consulta comandas" ON public.pos_comandas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "El personal registra comandas" ON public.pos_comandas;
CREATE POLICY "El personal registra comandas" ON public.pos_comandas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "El personal actualiza comandas" ON public.pos_comandas;
CREATE POLICY "El personal actualiza comandas" ON public.pos_comandas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "El personal elimina comandas" ON public.pos_comandas;
CREATE POLICY "El personal elimina comandas" ON public.pos_comandas
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "El personal consulta partidas de comandas" ON public.pos_comanda_items;
CREATE POLICY "El personal consulta partidas de comandas" ON public.pos_comanda_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "El personal registra partidas de comandas" ON public.pos_comanda_items;
CREATE POLICY "El personal registra partidas de comandas" ON public.pos_comanda_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.pos_comandas WHERE id = comanda_id)
  );

DROP POLICY IF EXISTS "El personal actualiza partidas de comandas" ON public.pos_comanda_items;
CREATE POLICY "El personal actualiza partidas de comandas" ON public.pos_comanda_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "El personal elimina partidas de comandas" ON public.pos_comanda_items;
CREATE POLICY "El personal elimina partidas de comandas" ON public.pos_comanda_items
  FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.guardar_comanda_pos(p_comanda jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_comanda_id uuid;
  v_item jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;

  INSERT INTO public.pos_comandas (
    client_id, folio, user_id, cliente, canal, estado, subtotal, iva, total,
    comensales, caja_id, creado_en, actualizado_en
  ) VALUES (
    p_comanda->>'id',
    p_comanda->>'folio',
    auth.uid(),
    COALESCE(NULLIF(p_comanda->>'cliente', ''), 'Cliente'),
    p_comanda->>'canal',
    p_comanda->>'estado',
    (p_comanda->>'subtotal')::numeric,
    (p_comanda->>'iva')::numeric,
    (p_comanda->>'total')::numeric,
    LEAST(GREATEST(COALESCE(NULLIF(p_comanda->>'comensales', '')::integer, 1), 1), 99),
    NULLIF(p_comanda->>'cajaId', '')::uuid,
    (p_comanda->>'creadoEn')::timestamptz,
    now()
  )
  ON CONFLICT (client_id) DO UPDATE SET
    cliente = EXCLUDED.cliente,
    canal = EXCLUDED.canal,
    estado = EXCLUDED.estado,
    subtotal = EXCLUDED.subtotal,
    iva = EXCLUDED.iva,
    total = EXCLUDED.total,
    comensales = EXCLUDED.comensales,
    caja_id = COALESCE(EXCLUDED.caja_id, pos_comandas.caja_id),
    actualizado_en = now()
  RETURNING id INTO v_comanda_id;

  DELETE FROM public.pos_comanda_items WHERE comanda_id = v_comanda_id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_comanda->'items')
  LOOP
    INSERT INTO public.pos_comanda_items (
      comanda_id, linea_id, producto_id, nombre, cantidad, precio, opciones
    ) VALUES (
      v_comanda_id,
      COALESCE(v_item->>'lineaId', v_item->>'productoId'),
      v_item->>'productoId',
      v_item->>'nombre',
      (v_item->>'cantidad')::integer,
      (v_item->>'precio')::numeric,
      COALESCE(v_item->'opciones', '[]'::jsonb)
    );
  END LOOP;

  RETURN v_comanda_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_comandas_pos()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', comanda.client_id,
        'folio', comanda.folio,
        'cliente', comanda.cliente,
        'canal', comanda.canal,
        'estado', comanda.estado,
        'subtotal', comanda.subtotal,
        'iva', comanda.iva,
        'total', comanda.total,
        'comensales', comanda.comensales,
        'cajaId', comanda.caja_id,
        'creadoEn', comanda.creado_en,
        'hora', to_char(comanda.creado_en AT TIME ZONE 'America/Mexico_City', 'HH24:MI'),
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
              ) ORDER BY item.id
            )
            FROM public.pos_comanda_items AS item
            WHERE item.comanda_id = comanda.id
          ),
          '[]'::jsonb
        )
      ) ORDER BY comanda.creado_en DESC
    ),
    '[]'::jsonb
  )
  FROM public.pos_comandas AS comanda;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_comanda_pos(p_client_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;
  DELETE FROM public.pos_comandas WHERE client_id = p_client_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guardar_comanda_pos(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.listar_comandas_pos() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.eliminar_comanda_pos(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_comanda_pos(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.listar_comandas_pos() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.eliminar_comanda_pos(text) TO authenticated, service_role;
