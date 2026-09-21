-- Vincula cada venta con el inventario de su sucursal mediante recetas.
-- El descuento es transaccional e idempotente: una venta sincronizada varias
-- veces descuenta existencias una sola vez.

ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS clave text,
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.pos_sucursales(id);

-- Conserva los renglones existentes y los asigna a la primera sucursal.
UPDATE public.insumos
SET sucursal_id = (
  SELECT id FROM public.pos_sucursales WHERE activa = true ORDER BY creada_en LIMIT 1
)
WHERE sucursal_id IS NULL;

-- Retira los insumos que pertenecían a la carta de demostración.
UPDATE public.insumos
SET activo = false
WHERE (nombre, proveedor) IN (
  ('Mezcla de chai', 'Especias Kali'),
  ('Harina de trigo', 'Molino San Juan'),
  ('Mantequilla', 'Lácteos del Valle'),
  ('Aguacate', 'Mercado Central'),
  ('Huevo', 'Granja El Roble')
);

-- Normaliza el café inicial y asigna claves estables a los insumos de la carta.
UPDATE public.insumos
SET existencia = 5, minimo = 2, costo_unitario = 350, proveedor = 'Por definir'
WHERE nombre = 'Café en grano (Chiapas)' AND proveedor = 'Finca La Alameda';
UPDATE public.insumos
SET existencia = 24, minimo = 12, costo_unitario = 28, proveedor = 'Por definir'
WHERE nombre = 'Leche entera' AND proveedor = 'Lácteos del Valle';
UPDATE public.insumos
SET existencia = 8, minimo = 4, costo_unitario = 58, proveedor = 'Por definir'
WHERE nombre = 'Leche de avena' AND proveedor = 'Avena Nórdica';
UPDATE public.insumos
SET existencia = 500, minimo = 200, costo_unitario = 3.5, proveedor = 'Por definir'
WHERE nombre = 'Matcha ceremonial' AND proveedor = 'Uji Import';
UPDATE public.insumos
SET existencia = 150, minimo = 75, costo_unitario = 2.1, proveedor = 'Por definir'
WHERE nombre = 'Vasos 12 oz' AND proveedor = 'EcoPack';

UPDATE public.insumos
SET nombre = 'Café en grano de la casa'
WHERE nombre = 'Café en grano (Chiapas)';

UPDATE public.insumos
SET clave = CASE nombre
  WHEN 'Café en grano de la casa' THEN 'cafe-casa'
  WHEN 'Café para cold brew' THEN 'cafe-cold-brew'
  WHEN 'Grano de temporada' THEN 'grano-temporada'
  WHEN 'Grano invitado' THEN 'grano-invitado'
  WHEN 'Leche entera' THEN 'leche-entera'
  WHEN 'Leche de avena' THEN 'leche-avena'
  WHEN 'Leche de soya' THEN 'leche-soya'
  WHEN 'Matcha ceremonial' THEN 'matcha'
  WHEN 'Hōjicha' THEN 'hojicha'
  WHEN 'Taro en polvo' THEN 'taro'
  WHEN 'Jarabe de vainilla' THEN 'jarabe-vainilla'
  WHEN 'Jarabe de lavanda' THEN 'jarabe-lavanda'
  WHEN 'Agua tónica' THEN 'agua-tonica'
  WHEN 'Agua mineral Topo Chico' THEN 'topo-chico'
  WHEN 'Panqué de la casa' THEN 'panque-casa'
  WHEN 'Panqué de limón' THEN 'panque-limon'
  WHEN 'Hielo' THEN 'hielo'
  WHEN 'Vasos 8 oz' THEN 'vaso-8oz'
  WHEN 'Vasos 12 oz' THEN 'vaso-12oz'
  WHEN 'Tapas 8 oz' THEN 'tapa-8oz'
  WHEN 'Tapas 12 oz' THEN 'tapa-12oz'
  WHEN 'Servilletas' THEN 'servilleta'
  WHEN 'Azúcar en sobres' THEN 'azucar-sobre'
  ELSE 'insumo-' || id::text
END
WHERE clave IS NULL OR trim(clave) = '';

-- El café se controla en gramos para que los descuentos sean comprensibles.
UPDATE public.insumos
SET unidad = 'g',
    existencia = existencia * 1000,
    minimo = minimo * 1000,
    costo_unitario = costo_unitario / 1000
WHERE clave IN ('cafe-casa', 'cafe-cold-brew', 'grano-temporada', 'grano-invitado')
  AND lower(unidad) = 'kg';

-- Crea el inventario base en cada sucursal que aún no tenga esos insumos.
WITH inventario(clave, nombre, unidad, existencia, minimo, costo_unitario, proveedor) AS (
  VALUES
    ('cafe-casa', 'Café en grano de la casa', 'g', 5000::numeric, 2000::numeric, 0.35::numeric, 'Por definir'),
    ('cafe-cold-brew', 'Café para cold brew', 'g', 3000, 1500, 0.35, 'Por definir'),
    ('grano-temporada', 'Grano de temporada', 'g', 2000, 1000, 0.42, 'Por definir'),
    ('grano-invitado', 'Grano invitado', 'g', 1000, 500, 0.65, 'Por definir'),
    ('leche-entera', 'Leche entera', 'L', 24, 12, 28, 'Por definir'),
    ('leche-avena', 'Leche de avena', 'L', 8, 4, 58, 'Por definir'),
    ('leche-soya', 'Leche de soya', 'L', 6, 3, 45, 'Por definir'),
    ('matcha', 'Matcha ceremonial', 'g', 500, 200, 3.5, 'Por definir'),
    ('hojicha', 'Hōjicha', 'g', 400, 150, 2.5, 'Por definir'),
    ('taro', 'Taro en polvo', 'g', 1000, 400, 0.45, 'Por definir'),
    ('jarabe-vainilla', 'Jarabe de vainilla', 'ml', 2000, 500, 0.18, 'Por definir'),
    ('jarabe-lavanda', 'Jarabe de lavanda', 'ml', 1500, 500, 0.2, 'Por definir'),
    ('agua-tonica', 'Agua tónica', 'pza', 24, 12, 18, 'Por definir'),
    ('topo-chico', 'Agua mineral Topo Chico', 'pza', 24, 12, 22, 'Por definir'),
    ('panque-casa', 'Panqué de la casa', 'rebanada', 12, 6, 30, 'Producción propia'),
    ('panque-limon', 'Panqué de limón', 'rebanada', 12, 6, 30, 'Producción propia'),
    ('hielo', 'Hielo', 'kg', 20, 8, 4, 'Por definir'),
    ('vaso-8oz', 'Vasos 8 oz', 'pza', 100, 50, 1.6, 'Por definir'),
    ('vaso-12oz', 'Vasos 12 oz', 'pza', 150, 75, 2.1, 'Por definir'),
    ('tapa-8oz', 'Tapas 8 oz', 'pza', 100, 50, 1, 'Por definir'),
    ('tapa-12oz', 'Tapas 12 oz', 'pza', 150, 75, 1.2, 'Por definir'),
    ('servilleta', 'Servilletas', 'pza', 500, 200, 0.15, 'Por definir'),
    ('azucar-sobre', 'Azúcar en sobres', 'pza', 300, 100, 0.25, 'Por definir')
)
INSERT INTO public.insumos (
  clave, sucursal_id, nombre, unidad, existencia, minimo, costo_unitario, proveedor, activo
)
SELECT inventario.clave, sucursal.id, inventario.nombre, inventario.unidad,
       inventario.existencia, inventario.minimo, inventario.costo_unitario,
       inventario.proveedor, true
FROM public.pos_sucursales AS sucursal
CROSS JOIN inventario
WHERE sucursal.activa = true
  AND NOT EXISTS (
    SELECT 1 FROM public.insumos AS existente
    WHERE existente.sucursal_id = sucursal.id
      AND existente.clave = inventario.clave
  );

ALTER TABLE public.insumos
  ALTER COLUMN clave SET NOT NULL,
  ALTER COLUMN sucursal_id SET NOT NULL;

-- Si se capturó dos veces el mismo insumo antes de tener claves, conserva el
-- primero como receta y asigna una clave propia a los duplicados.
WITH duplicados AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY sucursal_id, clave
           ORDER BY activo DESC, created_at, id
         ) AS numero
  FROM public.insumos
)
UPDATE public.insumos AS insumo
SET clave = insumo.clave || '-' || left(insumo.id::text, 8)
FROM duplicados
WHERE duplicados.id = insumo.id
  AND duplicados.numero > 1;

CREATE UNIQUE INDEX IF NOT EXISTS insumos_sucursal_clave_idx
  ON public.insumos (sucursal_id, clave);
CREATE INDEX IF NOT EXISTS insumos_sucursal_activo_idx
  ON public.insumos (sucursal_id, activo, nombre);

CREATE TABLE IF NOT EXISTS public.pos_recetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id text NOT NULL,
  insumo_clave text NOT NULL,
  cantidad numeric(12,4) NOT NULL CHECK (cantidad > 0),
  condicion text NOT NULL DEFAULT 'base'
    CHECK (condicion IN ('base', 'para_llevar')),
  activa boolean NOT NULL DEFAULT true,
  actualizada_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (producto_id, insumo_clave, condicion)
);

GRANT SELECT ON public.pos_recetas TO authenticated;
GRANT ALL ON public.pos_recetas TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.pos_recetas TO authenticated;
ALTER TABLE public.pos_recetas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal consulta recetas" ON public.pos_recetas;
CREATE POLICY "Personal consulta recetas" ON public.pos_recetas
  FOR SELECT TO authenticated USING (activa = true);

DROP POLICY IF EXISTS "Admins gestionan recetas" ON public.pos_recetas;
CREATE POLICY "Admins gestionan recetas" ON public.pos_recetas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Recetas base. Las cantidades usan la misma unidad mostrada en Inventario.
INSERT INTO public.pos_recetas (producto_id, insumo_clave, cantidad, condicion)
VALUES
  ('espresso', 'cafe-casa', 18, 'base'),
  ('espresso', 'vaso-8oz', 1, 'para_llevar'), ('espresso', 'tapa-8oz', 1, 'para_llevar'),
  ('americano', 'cafe-casa', 18, 'base'),
  ('americano', 'vaso-8oz', 1, 'para_llevar'), ('americano', 'tapa-8oz', 1, 'para_llevar'),
  ('cortado', 'cafe-casa', 18, 'base'), ('cortado', 'leche-entera', 0.06, 'base'),
  ('cortado', 'vaso-8oz', 1, 'para_llevar'), ('cortado', 'tapa-8oz', 1, 'para_llevar'),
  ('flat-white', 'cafe-casa', 18, 'base'), ('flat-white', 'leche-entera', 0.15, 'base'),
  ('flat-white', 'vaso-8oz', 1, 'para_llevar'), ('flat-white', 'tapa-8oz', 1, 'para_llevar'),
  ('cappuccino', 'cafe-casa', 18, 'base'), ('cappuccino', 'leche-entera', 0.15, 'base'),
  ('cappuccino', 'vaso-8oz', 1, 'para_llevar'), ('cappuccino', 'tapa-8oz', 1, 'para_llevar'),
  ('latte', 'cafe-casa', 18, 'base'), ('latte', 'leche-entera', 0.22, 'base'),
  ('latte', 'vaso-12oz', 1, 'para_llevar'), ('latte', 'tapa-12oz', 1, 'para_llevar'),
  ('latte-frio', 'cafe-casa', 18, 'base'), ('latte-frio', 'leche-entera', 0.22, 'base'),
  ('latte-frio', 'hielo', 0.15, 'base'),
  ('latte-frio', 'vaso-12oz', 1, 'para_llevar'), ('latte-frio', 'tapa-12oz', 1, 'para_llevar'),
  ('espresso-tonic', 'cafe-casa', 18, 'base'), ('espresso-tonic', 'agua-tonica', 1, 'base'),
  ('espresso-tonic', 'hielo', 0.15, 'base'),
  ('espresso-tonic', 'vaso-12oz', 1, 'para_llevar'), ('espresso-tonic', 'tapa-12oz', 1, 'para_llevar'),
  ('vainilla-latte', 'cafe-casa', 18, 'base'), ('vainilla-latte', 'leche-entera', 0.22, 'base'),
  ('vainilla-latte', 'jarabe-vainilla', 20, 'base'),
  ('vainilla-latte', 'vaso-12oz', 1, 'para_llevar'), ('vainilla-latte', 'tapa-12oz', 1, 'para_llevar'),
  ('lavanda-latte', 'cafe-casa', 18, 'base'), ('lavanda-latte', 'leche-entera', 0.22, 'base'),
  ('lavanda-latte', 'jarabe-lavanda', 20, 'base'),
  ('lavanda-latte', 'vaso-12oz', 1, 'para_llevar'), ('lavanda-latte', 'tapa-12oz', 1, 'para_llevar'),
  ('cold-brew', 'cafe-cold-brew', 30, 'base'), ('cold-brew', 'hielo', 0.15, 'base'),
  ('cold-brew', 'vaso-12oz', 1, 'para_llevar'), ('cold-brew', 'tapa-12oz', 1, 'para_llevar'),
  ('cold-brew-latte', 'cafe-cold-brew', 30, 'base'), ('cold-brew-latte', 'leche-entera', 0.15, 'base'),
  ('cold-brew-latte', 'hielo', 0.15, 'base'),
  ('cold-brew-latte', 'vaso-12oz', 1, 'para_llevar'), ('cold-brew-latte', 'tapa-12oz', 1, 'para_llevar'),
  ('cold-brew-tonic', 'cafe-cold-brew', 30, 'base'), ('cold-brew-tonic', 'agua-tonica', 1, 'base'),
  ('cold-brew-tonic', 'hielo', 0.15, 'base'),
  ('cold-brew-tonic', 'vaso-12oz', 1, 'para_llevar'), ('cold-brew-tonic', 'tapa-12oz', 1, 'para_llevar'),
  ('saluva-cold-brew', 'cafe-cold-brew', 30, 'base'), ('saluva-cold-brew', 'hielo', 0.15, 'base'),
  ('saluva-cold-brew', 'vaso-12oz', 1, 'para_llevar'), ('saluva-cold-brew', 'tapa-12oz', 1, 'para_llevar'),
  ('shakerato', 'cafe-casa', 18, 'base'), ('shakerato', 'hielo', 0.15, 'base'),
  ('shakerato', 'vaso-12oz', 1, 'para_llevar'), ('shakerato', 'tapa-12oz', 1, 'para_llevar'),
  ('taro-cold-brew', 'cafe-cold-brew', 30, 'base'), ('taro-cold-brew', 'taro', 20, 'base'),
  ('taro-cold-brew', 'hielo', 0.15, 'base'),
  ('taro-cold-brew', 'vaso-12oz', 1, 'para_llevar'), ('taro-cold-brew', 'tapa-12oz', 1, 'para_llevar'),
  ('grano-temporada', 'grano-temporada', 20, 'base'),
  ('grano-temporada', 'vaso-8oz', 1, 'para_llevar'), ('grano-temporada', 'tapa-8oz', 1, 'para_llevar'),
  ('grano-invitado', 'grano-invitado', 20, 'base'),
  ('grano-invitado', 'vaso-8oz', 1, 'para_llevar'), ('grano-invitado', 'tapa-8oz', 1, 'para_llevar'),
  ('batch-brew', 'grano-temporada', 18, 'base'),
  ('batch-brew', 'vaso-8oz', 1, 'para_llevar'), ('batch-brew', 'tapa-8oz', 1, 'para_llevar'),
  ('usucha-tradicional', 'matcha', 3, 'base'),
  ('usucha-tradicional', 'vaso-8oz', 1, 'para_llevar'), ('usucha-tradicional', 'tapa-8oz', 1, 'para_llevar'),
  ('matcha-latte-caliente', 'matcha', 3, 'base'), ('matcha-latte-caliente', 'leche-entera', 0.22, 'base'),
  ('matcha-latte-caliente', 'vaso-12oz', 1, 'para_llevar'), ('matcha-latte-caliente', 'tapa-12oz', 1, 'para_llevar'),
  ('matcha-latte-frio', 'matcha', 3, 'base'), ('matcha-latte-frio', 'leche-entera', 0.22, 'base'),
  ('matcha-latte-frio', 'hielo', 0.15, 'base'),
  ('matcha-latte-frio', 'vaso-12oz', 1, 'para_llevar'), ('matcha-latte-frio', 'tapa-12oz', 1, 'para_llevar'),
  ('matcha-tonic', 'matcha', 3, 'base'), ('matcha-tonic', 'agua-tonica', 1, 'base'),
  ('matcha-tonic', 'hielo', 0.15, 'base'),
  ('matcha-tonic', 'vaso-12oz', 1, 'para_llevar'), ('matcha-tonic', 'tapa-12oz', 1, 'para_llevar'),
  ('hojicha-latte-caliente', 'hojicha', 5, 'base'), ('hojicha-latte-caliente', 'leche-entera', 0.22, 'base'),
  ('hojicha-latte-caliente', 'vaso-12oz', 1, 'para_llevar'), ('hojicha-latte-caliente', 'tapa-12oz', 1, 'para_llevar'),
  ('hojicha-latte-frio', 'hojicha', 5, 'base'), ('hojicha-latte-frio', 'leche-entera', 0.22, 'base'),
  ('hojicha-latte-frio', 'hielo', 0.15, 'base'),
  ('hojicha-latte-frio', 'vaso-12oz', 1, 'para_llevar'), ('hojicha-latte-frio', 'tapa-12oz', 1, 'para_llevar'),
  ('hojicha-shakerato', 'hojicha', 5, 'base'), ('hojicha-shakerato', 'hielo', 0.15, 'base'),
  ('hojicha-shakerato', 'vaso-12oz', 1, 'para_llevar'), ('hojicha-shakerato', 'tapa-12oz', 1, 'para_llevar'),
  ('agua-mineral-topo-chico', 'topo-chico', 1, 'base'),
  ('taro-caliente', 'taro', 25, 'base'), ('taro-caliente', 'leche-entera', 0.22, 'base'),
  ('taro-caliente', 'vaso-12oz', 1, 'para_llevar'), ('taro-caliente', 'tapa-12oz', 1, 'para_llevar'),
  ('taro-frio', 'taro', 25, 'base'), ('taro-frio', 'leche-entera', 0.22, 'base'),
  ('taro-frio', 'hielo', 0.15, 'base'),
  ('taro-frio', 'vaso-12oz', 1, 'para_llevar'), ('taro-frio', 'tapa-12oz', 1, 'para_llevar'),
  ('panque-casa', 'panque-casa', 1, 'base'),
  ('panque-limon', 'panque-limon', 1, 'base')
ON CONFLICT (producto_id, insumo_clave, condicion) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pos_inventario_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES public.pos_ventas(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id),
  cantidad numeric(12,4) NOT NULL CHECK (cantidad > 0),
  existencia_anterior numeric(12,4) NOT NULL,
  existencia_nueva numeric(12,4) NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venta_id, insumo_id)
);

GRANT SELECT ON public.pos_inventario_movimientos TO authenticated;
GRANT ALL ON public.pos_inventario_movimientos TO service_role;
ALTER TABLE public.pos_inventario_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal consulta movimientos de inventario" ON public.pos_inventario_movimientos;
CREATE POLICY "Personal consulta movimientos de inventario"
  ON public.pos_inventario_movimientos FOR SELECT TO authenticated USING (true);

-- Las ventas anteriores ya estaban cerradas antes de activar esta función y no
-- deben descontarse retroactivamente.
ALTER TABLE public.pos_ventas
  ADD COLUMN IF NOT EXISTS inventario_aplicado boolean;
UPDATE public.pos_ventas SET inventario_aplicado = true WHERE inventario_aplicado IS NULL;
ALTER TABLE public.pos_ventas
  ALTER COLUMN inventario_aplicado SET DEFAULT false,
  ALTER COLUMN inventario_aplicado SET NOT NULL;

CREATE OR REPLACE FUNCTION public.sincronizar_venta_pos(p_venta jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta_id uuid;
  v_item jsonb;
  v_inventario_aplicado boolean;
  v_sucursal_id uuid;
  v_consumo record;
  v_insumo_id uuid;
  v_existencia_anterior numeric(12,4);
  v_existencia_nueva numeric(12,4);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión activa';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND activo = true
  ) THEN
    RAISE EXCEPTION 'El perfil no está activo';
  END IF;

  INSERT INTO public.pos_ventas (
    client_id, folio, user_id, cliente, canal, metodo_pago, estado,
    subtotal, iva, total, propina, monto_recibido, cambio, comensales,
    caja_id, creado_en, actualizado_en
  ) VALUES (
    p_venta->>'id',
    p_venta->>'folio',
    auth.uid(),
    COALESCE(NULLIF(p_venta->>'cliente', ''), 'Cliente'),
    CASE p_venta->>'canal'
      WHEN 'Mostrador' THEN 'A mesa'
      WHEN 'App' THEN 'Para recoger'
      ELSE p_venta->>'canal'
    END,
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
    LEAST(GREATEST(COALESCE(NULLIF(p_venta->>'comensales', '')::integer, 1), 1), 99),
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
    comensales = EXCLUDED.comensales,
    caja_id = COALESCE(EXCLUDED.caja_id, pos_ventas.caja_id),
    actualizado_en = now()
  RETURNING id INTO v_venta_id;

  DELETE FROM public.pos_venta_items WHERE venta_id = v_venta_id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_venta->'items', '[]'::jsonb))
  LOOP
    INSERT INTO public.pos_venta_items (
      venta_id, linea_id, producto_id, nombre, cantidad, precio, opciones
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

  SELECT venta.inventario_aplicado, caja.sucursal_id
  INTO v_inventario_aplicado, v_sucursal_id
  FROM public.pos_ventas AS venta
  LEFT JOIN public.pos_cajas AS caja ON caja.id = venta.caja_id
  WHERE venta.id = v_venta_id
  FOR UPDATE OF venta;

  IF NOT v_inventario_aplicado THEN
    FOR v_consumo IN
      SELECT consumo.insumo_clave, sum(consumo.cantidad)::numeric(12,4) AS cantidad
      FROM (
        SELECT
          CASE
            WHEN receta.insumo_clave = 'leche-entera'
              AND item.opciones @> '["Leche de avena"]'::jsonb THEN 'leche-avena'
            WHEN receta.insumo_clave = 'leche-entera'
              AND item.opciones @> '["Leche de soya"]'::jsonb THEN 'leche-soya'
            ELSE receta.insumo_clave
          END AS insumo_clave,
          receta.cantidad * item.cantidad AS cantidad
        FROM public.pos_venta_items AS item
        INNER JOIN public.pos_recetas AS receta
          ON receta.producto_id = item.producto_id AND receta.activa = true
        INNER JOIN public.pos_ventas AS venta ON venta.id = item.venta_id
        WHERE item.venta_id = v_venta_id
          AND (
            receta.condicion = 'base'
            OR (
              receta.condicion = 'para_llevar'
              AND (
                venta.canal IN ('Para llevar', 'Para recoger')
                OR item.opciones @> '["Para llevar"]'::jsonb
              )
            )
          )
        UNION ALL
        SELECT 'cafe-casa', 18::numeric * item.cantidad
        FROM public.pos_venta_items AS item
        WHERE item.venta_id = v_venta_id
          AND item.opciones @> '["Extra shot"]'::jsonb
      ) AS consumo
      GROUP BY consumo.insumo_clave
    LOOP
      SELECT insumo.id, insumo.existencia
      INTO v_insumo_id, v_existencia_anterior
      FROM public.insumos AS insumo
      WHERE insumo.sucursal_id = v_sucursal_id
        AND insumo.clave = v_consumo.insumo_clave
        AND insumo.activo = true
      FOR UPDATE;

      IF FOUND THEN
        v_existencia_nueva := GREATEST(0, v_existencia_anterior - v_consumo.cantidad);
        UPDATE public.insumos
        SET existencia = v_existencia_nueva
        WHERE id = v_insumo_id;

        INSERT INTO public.pos_inventario_movimientos (
          venta_id, insumo_id, cantidad, existencia_anterior, existencia_nueva
        ) VALUES (
          v_venta_id, v_insumo_id, v_consumo.cantidad,
          v_existencia_anterior, v_existencia_nueva
        )
        ON CONFLICT (venta_id, insumo_id) DO NOTHING;
      END IF;
    END LOOP;

    UPDATE public.pos_ventas
    SET inventario_aplicado = true
    WHERE id = v_venta_id;
  END IF;

  RETURN v_venta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sincronizar_venta_pos(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_venta_pos(jsonb) TO authenticated, service_role;