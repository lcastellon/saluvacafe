-- Sustituye los insumos de demostración por un inventario inicial coherente
-- con la carta vigente. Los renglones ya capturados por el usuario se respetan.

-- Ajusta únicamente los renglones originales de demostración. La condición del
-- proveedor evita sobrescribir una existencia que el negocio ya personalizó.
UPDATE public.insumos
SET nombre = 'Café en grano de la casa',
    unidad = 'kg',
    existencia = 5,
    minimo = 2,
    costo_unitario = 350,
    proveedor = 'Por definir',
    activo = true
WHERE nombre = 'Café en grano (Chiapas)'
  AND proveedor = 'Finca La Alameda';

UPDATE public.insumos
SET existencia = 24,
    minimo = 12,
    costo_unitario = 28,
    proveedor = 'Por definir',
    activo = true
WHERE nombre = 'Leche entera'
  AND proveedor = 'Lácteos del Valle';

UPDATE public.insumos
SET existencia = 8,
    minimo = 4,
    costo_unitario = 58,
    proveedor = 'Por definir',
    activo = true
WHERE nombre = 'Leche de avena'
  AND proveedor = 'Avena Nórdica';

UPDATE public.insumos
SET existencia = 500,
    minimo = 200,
    costo_unitario = 3.5,
    proveedor = 'Por definir',
    activo = true
WHERE nombre = 'Matcha ceremonial'
  AND proveedor = 'Uji Import';

UPDATE public.insumos
SET existencia = 150,
    minimo = 75,
    costo_unitario = 2.1,
    proveedor = 'Por definir',
    activo = true
WHERE nombre = 'Vasos 12 oz'
  AND proveedor = 'EcoPack';

-- Retira solamente los renglones que pertenecían a la carta de demostración.
UPDATE public.insumos
SET activo = false
WHERE (nombre, proveedor) IN (
  ('Mezcla de chai', 'Especias Kali'),
  ('Harina de trigo', 'Molino San Juan'),
  ('Mantequilla', 'Lácteos del Valle'),
  ('Aguacate', 'Mercado Central'),
  ('Huevo', 'Granja El Roble')
);

-- Agrega los insumos que aún no existan. Ejecutar de nuevo esta migración no
-- duplica renglones ni reinicia las cantidades posteriores.
WITH inventario(nombre, unidad, existencia, minimo, costo_unitario, proveedor) AS (
  VALUES
    ('Café en grano de la casa', 'kg', 5::numeric, 2::numeric, 350::numeric, 'Por definir'),
    ('Café para cold brew', 'kg', 3, 1.5, 350, 'Por definir'),
    ('Grano de temporada', 'kg', 2, 1, 420, 'Por definir'),
    ('Grano invitado', 'kg', 1, 0.5, 650, 'Por definir'),
    ('Leche entera', 'L', 24, 12, 28, 'Por definir'),
    ('Leche de avena', 'L', 8, 4, 58, 'Por definir'),
    ('Leche de soya', 'L', 6, 3, 45, 'Por definir'),
    ('Matcha ceremonial', 'g', 500, 200, 3.5, 'Por definir'),
    ('Hōjicha', 'g', 400, 150, 2.5, 'Por definir'),
    ('Taro en polvo', 'g', 1000, 400, 0.45, 'Por definir'),
    ('Jarabe de vainilla', 'ml', 2000, 500, 0.18, 'Por definir'),
    ('Jarabe de lavanda', 'ml', 1500, 500, 0.2, 'Por definir'),
    ('Agua tónica', 'pza', 24, 12, 18, 'Por definir'),
    ('Agua mineral Topo Chico', 'pza', 24, 12, 22, 'Por definir'),
    ('Panqué de la casa', 'rebanada', 12, 6, 30, 'Producción propia'),
    ('Panqué de limón', 'rebanada', 12, 6, 30, 'Producción propia'),
    ('Hielo', 'kg', 20, 8, 4, 'Por definir'),
    ('Vasos 8 oz', 'pza', 100, 50, 1.6, 'Por definir'),
    ('Vasos 12 oz', 'pza', 150, 75, 2.1, 'Por definir'),
    ('Tapas 8 oz', 'pza', 100, 50, 1, 'Por definir'),
    ('Tapas 12 oz', 'pza', 150, 75, 1.2, 'Por definir'),
    ('Servilletas', 'pza', 500, 200, 0.15, 'Por definir'),
    ('Azúcar en sobres', 'pza', 300, 100, 0.25, 'Por definir')
)
INSERT INTO public.insumos (
  nombre,
  unidad,
  existencia,
  minimo,
  costo_unitario,
  proveedor,
  activo
)
SELECT
  inventario.nombre,
  inventario.unidad,
  inventario.existencia,
  inventario.minimo,
  inventario.costo_unitario,
  inventario.proveedor,
  true
FROM inventario
WHERE NOT EXISTS (
  SELECT 1
  FROM public.insumos AS existente
  WHERE lower(trim(existente.nombre)) = lower(trim(inventario.nombre))
);
