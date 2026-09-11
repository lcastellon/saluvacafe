-- Reparación idempotente: sucursales + caja por terminal

CREATE TABLE IF NOT EXISTS public.pos_sucursales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  direccion text NOT NULL DEFAULT '',
  activa boolean NOT NULL DEFAULT true,
  creada_por uuid REFERENCES auth.users(id),
  creada_en timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pos_sucursales_nombre_idx
  ON public.pos_sucursales (lower(nombre));

GRANT ALL ON public.pos_sucursales TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pos_sucursales TO authenticated;
ALTER TABLE public.pos_sucursales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gestionan sucursales" ON public.pos_sucursales;
CREATE POLICY "Admins gestionan sucursales" ON public.pos_sucursales
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Personal consulta sucursales activas" ON public.pos_sucursales;
CREATE POLICY "Personal consulta sucursales activas" ON public.pos_sucursales
  FOR SELECT TO authenticated
  USING (activa = true);

INSERT INTO public.pos_sucursales (nombre, direccion)
SELECT 'Salúva Centro', ''
WHERE NOT EXISTS (SELECT 1 FROM public.pos_sucursales);

ALTER TABLE public.pos_terminales
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.pos_sucursales(id);

UPDATE public.pos_terminales
SET sucursal_id = (SELECT id FROM public.pos_sucursales ORDER BY creada_en LIMIT 1)
WHERE sucursal_id IS NULL;

ALTER TABLE public.pos_terminales ALTER COLUMN sucursal_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pos_terminal_nombre_sucursal_idx
  ON public.pos_terminales (sucursal_id, lower(nombre))
  WHERE activa = true;

ALTER TABLE public.pos_cajas
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.pos_sucursales(id);

UPDATE public.pos_cajas AS caja
SET sucursal_id = terminal.sucursal_id
FROM public.pos_terminales AS terminal
WHERE caja.terminal_id = terminal.id
  AND caja.sucursal_id IS NULL;

UPDATE public.pos_cajas
SET sucursal_id = (SELECT id FROM public.pos_sucursales ORDER BY creada_en LIMIT 1)
WHERE sucursal_id IS NULL;

ALTER TABLE public.pos_cajas ALTER COLUMN sucursal_id SET NOT NULL;

DROP INDEX IF EXISTS public.pos_una_caja_abierta_idx;

CREATE UNIQUE INDEX IF NOT EXISTS pos_una_caja_abierta_por_terminal_idx
  ON public.pos_cajas (terminal_id)
  WHERE estado = 'abierta';

CREATE OR REPLACE FUNCTION public.listar_sucursales_pos()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sólo un administrador puede consultar las sucursales';
  END IF;

  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', sucursal.id,
          'nombre', sucursal.nombre,
          'direccion', sucursal.direccion
        )
        ORDER BY sucursal.nombre
      ),
      '[]'::jsonb
    )
    FROM public.pos_sucursales AS sucursal
    WHERE sucursal.activa = true
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.listar_sucursales_pos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_sucursales_pos() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.crear_sucursal_pos(p_nombre text, p_direccion text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre text := trim(p_nombre);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sólo un administrador puede registrar sucursales';
  END IF;
  IF v_nombre = '' OR length(v_nombre) > 60 THEN
    RAISE EXCEPTION 'El nombre de la sucursal no es válido';
  END IF;
  IF length(COALESCE(p_direccion, '')) > 160 THEN
    RAISE EXCEPTION 'La dirección es demasiado larga';
  END IF;

  INSERT INTO public.pos_sucursales (nombre, direccion, creada_por)
  VALUES (v_nombre, trim(COALESCE(p_direccion, '')), auth.uid());

  RETURN public.listar_sucursales_pos();
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Ya existe una sucursal con ese nombre';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.crear_sucursal_pos(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_sucursal_pos(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.estado_terminal_caja(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_terminal public.pos_terminales%ROWTYPE;
  v_sucursal_nombre text;
  v_caja public.pos_cajas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;

  SELECT * INTO v_terminal
  FROM public.pos_terminales
  WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND activa = true;

  IF v_terminal.id IS NOT NULL THEN
    SELECT nombre INTO v_sucursal_nombre
    FROM public.pos_sucursales
    WHERE id = v_terminal.sucursal_id AND activa = true;

    SELECT * INTO v_caja
    FROM public.pos_cajas
    WHERE terminal_id = v_terminal.id
      AND estado = 'abierta'
    ORDER BY abierto_en DESC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'terminalAutorizada', v_terminal.id IS NOT NULL AND v_sucursal_nombre IS NOT NULL,
    'terminalNombre', v_terminal.nombre,
    'terminalSucursalNombre', v_sucursal_nombre,
    'cajaActual', CASE
      WHEN v_caja.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_caja.id,
        'terminalId', v_caja.terminal_id,
        'terminalNombre', v_terminal.nombre,
        'sucursalId', v_caja.sucursal_id,
        'sucursalNombre', v_sucursal_nombre,
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

DROP FUNCTION IF EXISTS public.autorizar_terminal_pos(text, text);
DROP FUNCTION IF EXISTS public.autorizar_terminal_pos(text, text, uuid);

CREATE FUNCTION public.autorizar_terminal_pos(
  p_token text,
  p_nombre text,
  p_sucursal_id uuid
)
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
  IF NOT EXISTS (
    SELECT 1 FROM public.pos_sucursales WHERE id = p_sucursal_id AND activa = true
  ) THEN
    RAISE EXCEPTION 'La sucursal seleccionada no está activa';
  END IF;

  INSERT INTO public.pos_terminales (
    nombre,
    token_hash,
    sucursal_id,
    activa,
    autorizada_por,
    autorizada_en,
    ultimo_uso_en
  ) VALUES (
    v_nombre,
    encode(digest(p_token, 'sha256'), 'hex'),
    p_sucursal_id,
    true,
    auth.uid(),
    now(),
    now()
  )
  ON CONFLICT (token_hash) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    sucursal_id = EXCLUDED.sucursal_id,
    activa = true,
    autorizada_por = auth.uid(),
    autorizada_en = now(),
    ultimo_uso_en = now();

  RETURN public.estado_terminal_caja(p_token);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.autorizar_terminal_pos(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.autorizar_terminal_pos(text, text, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.abrir_caja_pos(p_token text, p_fondo_inicial numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_terminal_id uuid;
  v_sucursal_id uuid;
  v_nombre text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;
  IF p_fondo_inicial IS NULL OR p_fondo_inicial < 0 THEN
    RAISE EXCEPTION 'El fondo inicial no es válido';
  END IF;

  SELECT terminal.id, terminal.sucursal_id
  INTO v_terminal_id, v_sucursal_id
  FROM public.pos_terminales AS terminal
  INNER JOIN public.pos_sucursales AS sucursal ON sucursal.id = terminal.sucursal_id
  WHERE terminal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND terminal.activa = true
    AND sucursal.activa = true;
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
      sucursal_id,
      abierto_por,
      abierto_por_nombre,
      fondo_inicial
    ) VALUES (
      v_terminal_id,
      v_sucursal_id,
      auth.uid(),
      v_nombre,
      round(p_fondo_inicial, 2)
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Esta terminal ya tiene una caja abierta';
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

  SELECT terminal.id INTO v_terminal_id
  FROM public.pos_terminales AS terminal
  WHERE terminal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND terminal.activa = true;
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
    AND terminal_id = v_terminal_id
  RETURNING id INTO v_caja_id;

  IF v_caja_id IS NULL THEN
    RAISE EXCEPTION 'Esta terminal no tiene una caja abierta';
  END IF;

  UPDATE public.pos_terminales SET ultimo_uso_en = now() WHERE id = v_terminal_id;
  RETURN public.estado_terminal_caja(p_token);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cerrar_caja_pos(text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cerrar_caja_pos(text, numeric, text)
  TO authenticated, service_role;