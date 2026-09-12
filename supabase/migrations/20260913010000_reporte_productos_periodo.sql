-- Reporte imprimible de productos vendidos por periodo y sucursal.
-- Devuelve únicamente productos cuya cantidad vendida sea mayor a cero.

CREATE OR REPLACE FUNCTION public.reporte_productos_periodo_pos(
  p_desde timestamptz,
  p_hasta timestamptz,
  p_sucursal_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_productos jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sólo un administrador puede generar reportes de productos';
  END IF;

  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde >= p_hasta THEN
    RAISE EXCEPTION 'El periodo solicitado no es válido';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'productoId', productos.producto_id,
        'nombre', productos.nombre,
        'cantidad', productos.cantidad,
        'montoTotal', round(productos.monto_total, 2)
      )
      ORDER BY productos.nombre
    ),
    '[]'::jsonb
  )
  INTO v_productos
  FROM (
    SELECT
      item.producto_id,
      (array_agg(item.nombre ORDER BY venta.creado_en DESC))[1] AS nombre,
      sum(item.cantidad)::integer AS cantidad,
      sum(item.cantidad * item.precio)::numeric AS monto_total
    FROM public.pos_venta_items AS item
    JOIN public.pos_ventas AS venta ON venta.id = item.venta_id
    LEFT JOIN public.pos_cajas AS caja ON caja.id = venta.caja_id
    WHERE venta.creado_en >= p_desde
      AND venta.creado_en < p_hasta
      AND (p_sucursal_id IS NULL OR caja.sucursal_id = p_sucursal_id)
    GROUP BY item.producto_id
    HAVING sum(item.cantidad) > 0
  ) AS productos;

  RETURN v_productos;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reporte_productos_periodo_pos(timestamptz, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reporte_productos_periodo_pos(timestamptz, timestamptz, uuid)
  TO authenticated, service_role;
