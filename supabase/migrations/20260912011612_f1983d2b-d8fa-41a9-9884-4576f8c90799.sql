CREATE OR REPLACE FUNCTION public.autorizar_terminal_pos(p_token text, p_nombre text, p_sucursal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_nombre text := trim(p_nombre);
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_existente uuid;
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

  -- Si ya hay una terminal activa con ese nombre en la sucursal, revincúlala a esta computadora.
  SELECT id INTO v_existente
  FROM public.pos_terminales
  WHERE sucursal_id = p_sucursal_id
    AND lower(nombre) = lower(v_nombre)
    AND activa = true
    AND token_hash <> v_hash
  LIMIT 1;

  IF v_existente IS NOT NULL THEN
    -- Libera el registro previo de esta computadora, si existe.
    DELETE FROM public.pos_terminales
    WHERE token_hash = v_hash
      AND id <> v_existente
      AND NOT EXISTS (SELECT 1 FROM public.pos_cajas WHERE terminal_id = pos_terminales.id);

    UPDATE public.pos_terminales SET
      token_hash = v_hash,
      nombre = v_nombre,
      sucursal_id = p_sucursal_id,
      activa = true,
      autorizada_por = auth.uid(),
      autorizada_en = now(),
      ultimo_uso_en = now()
    WHERE id = v_existente;

    RETURN public.estado_terminal_caja(p_token);
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
    v_hash,
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
$function$;