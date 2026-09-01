REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM public;
REVOKE ALL ON FUNCTION public.ajustar_existencia(uuid, numeric) FROM public;

GRANT EXECUTE ON FUNCTION public.ajustar_existencia(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ajustar_existencia(uuid, numeric) TO service_role;