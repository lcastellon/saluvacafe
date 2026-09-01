REVOKE ALL ON FUNCTION public.ajustar_existencia(uuid, numeric) FROM public;
REVOKE ALL ON FUNCTION public.ajustar_existencia(uuid, numeric) FROM authenticated;
REVOKE ALL ON FUNCTION public.ajustar_existencia(uuid, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.ajustar_existencia(uuid, numeric) FROM service_role;

DROP FUNCTION IF EXISTS public.ajustar_existencia(uuid, numeric);