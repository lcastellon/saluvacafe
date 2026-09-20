-- Unifica los datos visibles de Configuración con la sucursal asignada a cada terminal.

ALTER TABLE public.pos_sucursales
  ADD COLUMN IF NOT EXISTS telefono text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS horario text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS actualizada_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS actualizada_en timestamptz NOT NULL DEFAULT now();

-- Conserva la configuración existente en la sucursal con el mismo nombre.
UPDATE public.pos_sucursales AS sucursal
SET direccion = COALESCE(NULLIF(trim(configuracion.direccion), ''), sucursal.direccion),
    telefono = COALESCE(NULLIF(trim(configuracion.telefono), ''), sucursal.telefono),
    horario = COALESCE(NULLIF(trim(configuracion.horario), ''), sucursal.horario),
    actualizada_por = configuracion.actualizado_por,
    actualizada_en = configuracion.actualizado_en
FROM public.pos_configuracion AS configuracion
WHERE configuracion.id = 'negocio'
  AND lower(sucursal.nombre) = lower(configuracion.sucursal);

-- En instalaciones con una sola sucursal, esa sucursal hereda los datos anteriores
-- aunque el nombre haya sido cambiado antes de esta migración.
UPDATE public.pos_sucursales AS sucursal
SET nombre = configuracion.sucursal,
    direccion = COALESCE(NULLIF(trim(configuracion.direccion), ''), sucursal.direccion),
    telefono = COALESCE(NULLIF(trim(configuracion.telefono), ''), sucursal.telefono),
    horario = COALESCE(NULLIF(trim(configuracion.horario), ''), sucursal.horario),
    actualizada_por = configuracion.actualizado_por,
    actualizada_en = configuracion.actualizado_en
FROM public.pos_configuracion AS configuracion
WHERE configuracion.id = 'negocio'
  AND (SELECT count(*) FROM public.pos_sucursales) = 1;

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
          'direccion', sucursal.direccion,
          'telefono', sucursal.telefono,
          'horario', sucursal.horario
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

CREATE OR REPLACE FUNCTION public.estado_terminal_caja(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_terminal public.pos_terminales%ROWTYPE;
  v_sucursal public.pos_sucursales%ROWTYPE;
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
    SELECT * INTO v_sucursal
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
    'terminalAutorizada', v_terminal.id IS NOT NULL AND v_sucursal.id IS NOT NULL,
    'terminalNombre', v_terminal.nombre,
    'terminalSucursalId', v_sucursal.id,
    'terminalSucursalNombre', v_sucursal.nombre,
    'cajaActual', CASE
      WHEN v_caja.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_caja.id,
        'terminalId', v_caja.terminal_id,
        'terminalNombre', v_terminal.nombre,
        'sucursalId', v_caja.sucursal_id,
        'sucursalNombre', v_sucursal.nombre,
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

CREATE OR REPLACE FUNCTION public.configuracion_terminal_pos(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sucursal public.pos_sucursales%ROWTYPE;
  v_configuracion public.pos_configuracion%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;

  SELECT sucursal.* INTO v_sucursal
  FROM public.pos_terminales AS terminal
  INNER JOIN public.pos_sucursales AS sucursal ON sucursal.id = terminal.sucursal_id
  WHERE terminal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND terminal.activa = true
    AND sucursal.activa = true;

  IF v_sucursal.id IS NULL THEN
    RAISE EXCEPTION 'Esta computadora no tiene una sucursal autorizada';
  END IF;

  SELECT * INTO v_configuracion
  FROM public.pos_configuracion
  WHERE id = 'negocio';

  RETURN jsonb_build_object(
    'nombre', COALESCE(v_configuracion.nombre, 'Salúva'),
    'sucursal', v_sucursal.nombre,
    'direccion', v_sucursal.direccion,
    'telefono', v_sucursal.telefono,
    'horario', v_sucursal.horario,
    'iva', COALESCE(v_configuracion.iva, 16),
    'propinaSugerida', COALESCE(v_configuracion.propina_sugerida, 10),
    'moneda', COALESCE(v_configuracion.moneda, 'MXN')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.configuracion_terminal_pos(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.configuracion_terminal_pos(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guardar_configuracion_terminal_pos(
  p_token text,
  p_nombre_comercial text,
  p_sucursal_nombre text,
  p_direccion text,
  p_telefono text,
  p_horario text,
  p_iva numeric,
  p_propina_sugerida numeric,
  p_moneda text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sucursal_id uuid;
  v_nombre_comercial text := trim(p_nombre_comercial);
  v_sucursal_nombre text := trim(p_sucursal_nombre);
  v_direccion text := trim(COALESCE(p_direccion, ''));
  v_telefono text := trim(COALESCE(p_telefono, ''));
  v_horario text := trim(COALESCE(p_horario, ''));
  v_moneda text := upper(trim(p_moneda));
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sólo un administrador puede cambiar la configuración';
  END IF;

  SELECT terminal.sucursal_id INTO v_sucursal_id
  FROM public.pos_terminales AS terminal
  INNER JOIN public.pos_sucursales AS sucursal ON sucursal.id = terminal.sucursal_id
  WHERE terminal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND terminal.activa = true
    AND sucursal.activa = true;

  IF v_sucursal_id IS NULL THEN
    RAISE EXCEPTION 'Autoriza esta computadora y asígnala a una sucursal antes de guardar';
  END IF;
  IF v_nombre_comercial = '' OR length(v_nombre_comercial) > 80 THEN
    RAISE EXCEPTION 'El nombre comercial no es válido';
  END IF;
  IF v_sucursal_nombre = '' OR length(v_sucursal_nombre) > 60 THEN
    RAISE EXCEPTION 'El nombre de la sucursal no es válido';
  END IF;
  IF length(v_direccion) > 160 OR length(v_telefono) > 40 OR length(v_horario) > 100 THEN
    RAISE EXCEPTION 'Uno de los datos de la sucursal excede la longitud permitida';
  END IF;
  IF p_iva IS NULL OR p_iva < 0 OR p_iva > 100 THEN
    RAISE EXCEPTION 'El IVA no es válido';
  END IF;
  IF p_propina_sugerida IS NULL OR p_propina_sugerida < 0 OR p_propina_sugerida > 100 THEN
    RAISE EXCEPTION 'La propina sugerida no es válida';
  END IF;
  IF length(v_moneda) < 3 OR length(v_moneda) > 8 THEN
    RAISE EXCEPTION 'La moneda no es válida';
  END IF;

  BEGIN
    UPDATE public.pos_sucursales
    SET nombre = v_sucursal_nombre,
        direccion = v_direccion,
        telefono = v_telefono,
        horario = v_horario,
        actualizada_por = auth.uid(),
        actualizada_en = now()
    WHERE id = v_sucursal_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe otra sucursal con ese nombre';
  END;

  INSERT INTO public.pos_configuracion (
    id,
    nombre,
    sucursal,
    direccion,
    telefono,
    horario,
    iva,
    propina_sugerida,
    moneda,
    actualizado_por,
    actualizado_en
  ) VALUES (
    'negocio',
    v_nombre_comercial,
    v_sucursal_nombre,
    v_direccion,
    v_telefono,
    v_horario,
    round(p_iva, 2),
    round(p_propina_sugerida, 2),
    v_moneda,
    auth.uid(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    sucursal = EXCLUDED.sucursal,
    direccion = EXCLUDED.direccion,
    telefono = EXCLUDED.telefono,
    horario = EXCLUDED.horario,
    iva = EXCLUDED.iva,
    propina_sugerida = EXCLUDED.propina_sugerida,
    moneda = EXCLUDED.moneda,
    actualizado_por = EXCLUDED.actualizado_por,
    actualizado_en = EXCLUDED.actualizado_en;

  RETURN public.configuracion_terminal_pos(p_token);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guardar_configuracion_terminal_pos(
  text, text, text, text, text, text, numeric, numeric, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_configuracion_terminal_pos(
  text, text, text, text, text, text, numeric, numeric, text
) TO authenticated, service_role;