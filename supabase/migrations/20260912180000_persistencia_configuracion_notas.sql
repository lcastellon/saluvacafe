-- Persistencia compartida para la configuración del negocio y las notas del dashboard.

CREATE TABLE IF NOT EXISTS public.pos_configuracion (
  id text PRIMARY KEY DEFAULT 'negocio' CHECK (id = 'negocio'),
  nombre text NOT NULL,
  sucursal text NOT NULL,
  direccion text NOT NULL,
  telefono text NOT NULL,
  horario text NOT NULL,
  iva numeric(5,2) NOT NULL CHECK (iva BETWEEN 0 AND 100),
  propina_sugerida numeric(5,2) NOT NULL CHECK (propina_sugerida BETWEEN 0 AND 100),
  moneda text NOT NULL CHECK (char_length(moneda) BETWEEN 3 AND 8),
  actualizado_por uuid REFERENCES auth.users(id),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_configuracion ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pos_configuracion FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.pos_configuracion TO authenticated;
GRANT ALL ON public.pos_configuracion TO service_role;

DROP POLICY IF EXISTS "Personal consulta configuración" ON public.pos_configuracion;
CREATE POLICY "Personal consulta configuración" ON public.pos_configuracion
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins guardan configuración" ON public.pos_configuracion;
CREATE POLICY "Admins guardan configuración" ON public.pos_configuracion
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.pos_notas_turno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL CHECK (char_length(trim(texto)) BETWEEN 1 AND 180),
  color smallint NOT NULL DEFAULT 0 CHECK (color BETWEEN 0 AND 3),
  hecha boolean NOT NULL DEFAULT false,
  creada_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  creada_en timestamptz NOT NULL DEFAULT now(),
  actualizada_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pos_notas_turno_creada_en_idx
  ON public.pos_notas_turno (creada_en DESC);

ALTER TABLE public.pos_notas_turno ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pos_notas_turno FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_notas_turno TO authenticated;
GRANT ALL ON public.pos_notas_turno TO service_role;

DROP POLICY IF EXISTS "Personal consulta notas" ON public.pos_notas_turno;
CREATE POLICY "Personal consulta notas" ON public.pos_notas_turno
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Personal crea notas" ON public.pos_notas_turno;
CREATE POLICY "Personal crea notas" ON public.pos_notas_turno
  FOR INSERT TO authenticated
  WITH CHECK (creada_por = auth.uid());

DROP POLICY IF EXISTS "Personal actualiza notas" ON public.pos_notas_turno;
CREATE POLICY "Personal actualiza notas" ON public.pos_notas_turno
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Personal elimina notas" ON public.pos_notas_turno;
CREATE POLICY "Personal elimina notas" ON public.pos_notas_turno
  FOR DELETE TO authenticated
  USING (true);
