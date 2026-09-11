CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.pos_terminales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  activa boolean NOT NULL DEFAULT true,
  autorizada_por uuid NOT NULL REFERENCES auth.users(id),
  autorizada_en timestamptz NOT NULL DEFAULT now(),
  ultimo_uso_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pos_cajas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id uuid NOT NULL REFERENCES public.pos_terminales(id),
  abierto_por uuid NOT NULL REFERENCES auth.users(id),
  abierto_por_nombre text NOT NULL,
  abierto_en timestamptz NOT NULL DEFAULT now(),
  fondo_inicial numeric(12,2) NOT NULL DEFAULT 0 CHECK (fondo_inicial >= 0),
  cerrado_por uuid REFERENCES auth.users(id),
  cerrado_por_nombre text,
  cerrado_en timestamptz,
  efectivo_contado numeric(12,2) CHECK (efectivo_contado >= 0),
  notas_cierre text,
  estado text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada'))
);

CREATE UNIQUE INDEX pos_una_caja_abierta_idx
  ON public.pos_cajas ((true))
  WHERE estado = 'abierta';

CREATE INDEX pos_cajas_abierto_en_idx ON public.pos_cajas (abierto_en DESC);

GRANT ALL ON public.pos_terminales TO service_role;
GRANT ALL ON public.pos_cajas TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pos_terminales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pos_cajas TO authenticated;

ALTER TABLE public.pos_terminales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_cajas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gestionan terminales" ON public.pos_terminales
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuarios autenticados ven terminales activas" ON public.pos_terminales
  FOR SELECT TO authenticated
  USING (activa = true);

CREATE POLICY "Admins gestionan cajas" ON public.pos_cajas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuarios autenticados consultan cajas" ON public.pos_cajas
  FOR SELECT TO authenticated
  USING (true);

ALTER TABLE public.pos_ventas
  ADD COLUMN IF NOT EXISTS caja_id uuid REFERENCES public.pos_cajas(id);

CREATE OR REPLACE FUNCTION public.estado_terminal_caja(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_terminal public.pos_terminales%ROWTYPE;
  v_caja public.pos_cajas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;

  SELECT * INTO v_terminal
  FROM public.pos_terminales
  WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND activa = true;

  SELECT * INTO v_caja
  FROM public.pos_cajas
  WHERE estado = 'abierta'
  ORDER BY abierto_en DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'terminalAutorizada', v_terminal.id IS NOT NULL,
    'terminalNombre', v_terminal.nombre,
    'cajaActual', CASE
      WHEN v_caja.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_caja.id,
        'terminalId', v_caja.terminal_id,
        'terminalNombre', (
          SELECT nombre FROM public.pos_terminales WHERE id = v_caja.terminal_id
        ),
        'abiertoPor', v_caja.abierto_por,
        'abiertoPorNombre', v_caja.abierto_por_nombre,
        'abiertoEn', v_caja.abierto_en,
        'fondoInicial', v_caja.fondo_inicial
      )
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.estado_terminal_caja(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estado_terminal_caja(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.autorizar_terminal_pos(p_token text, p_nombre text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_nombre text := trim(p_nombre);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sólo un administrador puede autorizar una terminal';
  END IF;
  IF length(p_token) < 20 THEN
    RAISE EXCEPTION 'La identificación de la terminal no es válida';
  END IF;
  IF v_nombre = '' OR length(v_nombre) > 40 THEN
    RAISE EXCEPTION 'El nombre de la terminal no es válido';
  END IF;

  UPDATE public.pos_terminales
  SET activa = false
  WHERE token_hash <> encode(digest(p_token, 'sha256'), 'hex')
    AND activa = true;

  INSERT INTO public.pos_terminales (
    nombre,
    token_hash,
    activa,
    autorizada_por,
    autorizada_en,
    ultimo_uso_en
  ) VALUES (
    v_nombre,
    encode(digest(p_token, 'sha256'), 'hex'),
    true,
    auth.uid(),
    now(),
    now()
  )
  ON CONFLICT (token_hash) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    activa = true,
    autorizada_por = auth.uid(),
    autorizada_en = now(),
    ultimo_uso_en = now();

  RETURN public.estado_terminal_caja(p_token);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.autorizar_terminal_pos(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.autorizar_terminal_pos(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.abrir_caja_pos(p_token text, p_fondo_inicial numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_terminal_id uuid;
  v_nombre text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;
  IF p_fondo_inicial IS NULL OR p_fondo_inicial < 0 THEN
    RAISE EXCEPTION 'El fondo inicial no es válido';
  END IF;

  SELECT id INTO v_terminal_id
  FROM public.pos_terminales
  WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND activa = true;
  IF v_terminal_id IS NULL THEN
    RAISE EXCEPTION 'Esta computadora no está autorizada para abrir caja';
  END IF;

  SELECT nombre INTO v_nombre
  FROM public.perfiles
  WHERE id = auth.uid() AND activo = true;
  IF v_nombre IS NULL THEN
    RAISE EXCEPTION 'El perfil no está activo';
  END IF;

  BEGIN
    INSERT INTO public.pos_cajas (
      terminal_id,
      abierto_por,
      abierto_por_nombre,
      fondo_inicial
    ) VALUES (
      v_terminal_id,
      auth.uid(),
      v_nombre,
      round(p_fondo_inicial, 2)
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe una caja abierta';
  END;

  UPDATE public.pos_terminales SET ultimo_uso_en = now() WHERE id = v_terminal_id;
  RETURN public.estado_terminal_caja(p_token);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.abrir_caja_pos(text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abrir_caja_pos(text, numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cerrar_caja_pos(
  p_token text,
  p_efectivo_contado numeric,
  p_notas text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_terminal_id uuid;
  v_nombre text;
  v_caja_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;
  IF p_efectivo_contado IS NULL OR p_efectivo_contado < 0 THEN
    RAISE EXCEPTION 'El efectivo contado no es válido';
  END IF;

  SELECT id INTO v_terminal_id
  FROM public.pos_terminales
  WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND activa = true;
  IF v_terminal_id IS NULL THEN
    RAISE EXCEPTION 'Esta computadora no está autorizada para cerrar caja';
  END IF;

  SELECT nombre INTO v_nombre
  FROM public.perfiles
  WHERE id = auth.uid() AND activo = true;
  IF v_nombre IS NULL THEN
    RAISE EXCEPTION 'El perfil no está activo';
  END IF;

  UPDATE public.pos_cajas
  SET estado = 'cerrada',
      cerrado_por = auth.uid(),
      cerrado_por_nombre = v_nombre,
      cerrado_en = now(),
      efectivo_contado = round(p_efectivo_contado, 2),
      notas_cierre = NULLIF(trim(p_notas), '')
  WHERE estado = 'abierta'
  RETURNING id INTO v_caja_id;

  IF v_caja_id IS NULL THEN
    RAISE EXCEPTION 'No hay una caja abierta';
  END IF;

  UPDATE public.pos_terminales SET ultimo_uso_en = now() WHERE id = v_terminal_id;
  RETURN public.estado_terminal_caja(p_token);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cerrar_caja_pos(text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cerrar_caja_pos(text, numeric, text) TO authenticated, service_role;

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
    caja_id,
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
    NULLIF(p_venta->>'cajaId', '')::uuid,
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
    caja_id = COALESCE(EXCLUDED.caja_id, pos_ventas.caja_id),
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
        'cajaId', venta.caja_id,
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