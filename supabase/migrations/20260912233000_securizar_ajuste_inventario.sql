-- Permite ajustar existencias al personal autenticado sin exponer la función a usuarios anónimos.
-- El ajuste y la devolución del nuevo valor ocurren dentro de la misma transacción.

DROP FUNCTION IF EXISTS public.ajustar_existencia(uuid, numeric);

CREATE FUNCTION public.ajustar_existencia(p_id uuid, p_delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual numeric(12,2);
  v_nueva numeric(12,2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'El ajuste de existencia no es válido';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND activo = true
  ) THEN
    RAISE EXCEPTION 'El perfil no está activo';
  END IF;

  SELECT existencia INTO v_actual
  FROM public.insumos
  WHERE id = p_id AND activo = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo no encontrado';
  END IF;

  v_nueva := GREATEST(0, v_actual + p_delta);

  UPDATE public.insumos
  SET existencia = v_nueva
  WHERE id = p_id;

  RETURN v_nueva;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ajustar_existencia(uuid, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ajustar_existencia(uuid, numeric)
  TO authenticated, service_role;
