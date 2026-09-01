CREATE TABLE public.insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  unidad text NOT NULL,
  existencia numeric(12,2) NOT NULL DEFAULT 0,
  minimo numeric(12,2) NOT NULL DEFAULT 0,
  costo_unitario numeric(12,2) NOT NULL DEFAULT 0,
  proveedor text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.insumos TO authenticated;
GRANT ALL ON public.insumos TO service_role;

ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver insumos activos" ON public.insumos
  FOR SELECT TO authenticated
  USING (activo = true);

CREATE POLICY "Admin gestiona insumos" ON public.insumos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_insumos_updated_at
  BEFORE UPDATE ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.insumos (nombre, unidad, existencia, minimo, costo_unitario, proveedor, activo)
VALUES
  ('Café en grano (Chiapas)', 'kg', 12.4, 6, 320, 'Finca La Alameda', true),
  ('Leche entera', 'L', 18, 24, 26, 'Lácteos del Valle', true),
  ('Leche de avena', 'L', 9, 8, 48, 'Avena Nórdica', true),
  ('Matcha ceremonial', 'g', 340, 500, 3.2, 'Uji Import', true),
  ('Mezcla de chai', 'g', 820, 400, 1.4, 'Especias Kali', true),
  ('Harina de trigo', 'kg', 22, 10, 32, 'Molino San Juan', true),
  ('Mantequilla', 'kg', 5.5, 6, 210, 'Lácteos del Valle', true),
  ('Aguacate', 'pza', 46, 30, 14, 'Mercado Central', true),
  ('Huevo', 'pza', 120, 90, 4.1, 'Granja El Roble', true),
  ('Vasos 12 oz', 'pza', 380, 250, 2.3, 'EcoPack', true);