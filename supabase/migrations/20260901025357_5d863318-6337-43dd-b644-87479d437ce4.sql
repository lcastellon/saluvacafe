REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;

CREATE OR REPLACE FUNCTION public.ajustar_existencia(p_id uuid, p_delta numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_actual numeric(12,2);
  v_nueva numeric(12,2);
BEGIN
  SELECT existencia INTO v_actual FROM public.insumos WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo no encontrado';
  END IF;

  v_nueva := GREATEST(0, v_actual + p_delta);

  UPDATE public.insumos
  SET existencia = v_nueva
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ajustar_existencia(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ajustar_existencia(uuid, numeric) TO service_role;