-- Resúmenes semanales y mensuales calculados en la base de datos.
-- Sólo se devuelve un objeto de totales para evitar cargar todas las ventas en el navegador.

CREATE INDEX IF NOT EXISTS pos_ventas_creado_en_idx
  ON public.pos_ventas (creado_en);

CREATE OR REPLACE FUNCTION public.reporte_periodo_pos(
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
  v_fondo_inicial numeric := 0;
  v_efectivo_contado numeric := 0;
  v_venta_total numeric := 0;
  v_venta_neta numeric := 0;
  v_impuestos numeric := 0;
  v_propinas numeric := 0;
  v_ventas_efectivo numeric := 0;
  v_propinas_efectivo numeric := 0;
  v_ventas_tarjeta numeric := 0;
  v_propinas_tarjeta numeric := 0;
  v_ventas_transferencia numeric := 0;
  v_propinas_transferencia numeric := 0;
  v_cuentas integer := 0;
  v_cuentas_cerradas integer := 0;
  v_comensales integer := 0;
  v_operaciones_efectivo integer := 0;
  v_operaciones_tarjeta integer := 0;
  v_operaciones_transferencia integer := 0;
  v_ordenes_mesa integer := 0;
  v_ventas_mesa numeric := 0;
  v_ordenes_llevar integer := 0;
  v_ventas_llevar numeric := 0;
  v_ordenes_recoger integer := 0;
  v_ventas_recoger numeric := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sólo un administrador puede generar reportes de caja';
  END IF;
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde >= p_hasta THEN
    RAISE EXCEPTION 'El periodo solicitado no es válido';
  END IF;

  SELECT
    COALESCE(sum(venta.total), 0),
    COALESCE(sum(venta.subtotal), 0),
    COALESCE(sum(venta.iva), 0),
    COALESCE(sum(venta.propina), 0),
    COALESCE(sum(venta.total) FILTER (WHERE venta.metodo_pago = 'Efectivo'), 0),
    COALESCE(sum(venta.propina) FILTER (WHERE venta.metodo_pago = 'Efectivo'), 0),
    COALESCE(sum(venta.total) FILTER (WHERE venta.metodo_pago = 'Tarjeta'), 0),
    COALESCE(sum(venta.propina) FILTER (WHERE venta.metodo_pago = 'Tarjeta'), 0),
    COALESCE(sum(venta.total) FILTER (WHERE venta.metodo_pago = 'Transferencia'), 0),
    COALESCE(sum(venta.propina) FILTER (WHERE venta.metodo_pago = 'Transferencia'), 0),
    count(*)::integer,
    count(*) FILTER (WHERE venta.estado = 'Entregado')::integer,
    COALESCE(sum(venta.comensales), 0)::integer,
    count(*) FILTER (WHERE venta.metodo_pago = 'Efectivo')::integer,
    count(*) FILTER (WHERE venta.metodo_pago = 'Tarjeta')::integer,
    count(*) FILTER (WHERE venta.metodo_pago = 'Transferencia')::integer,
    count(*) FILTER (WHERE venta.canal = 'A mesa')::integer,
    COALESCE(sum(venta.total) FILTER (WHERE venta.canal = 'A mesa'), 0),
    count(*) FILTER (WHERE venta.canal = 'Para llevar')::integer,
    COALESCE(sum(venta.total) FILTER (WHERE venta.canal = 'Para llevar'), 0),
    count(*) FILTER (WHERE venta.canal = 'Para recoger')::integer,
    COALESCE(sum(venta.total) FILTER (WHERE venta.canal = 'Para recoger'), 0)
  INTO
    v_venta_total,
    v_venta_neta,
    v_impuestos,
    v_propinas,
    v_ventas_efectivo,
    v_propinas_efectivo,
    v_ventas_tarjeta,
    v_propinas_tarjeta,
    v_ventas_transferencia,
    v_propinas_transferencia,
    v_cuentas,
    v_cuentas_cerradas,
    v_comensales,
    v_operaciones_efectivo,
    v_operaciones_tarjeta,
    v_operaciones_transferencia,
    v_ordenes_mesa,
    v_ventas_mesa,
    v_ordenes_llevar,
    v_ventas_llevar,
    v_ordenes_recoger,
    v_ventas_recoger
  FROM public.pos_ventas AS venta
  LEFT JOIN public.pos_cajas AS caja ON caja.id = venta.caja_id
  WHERE venta.creado_en >= p_desde
    AND venta.creado_en < p_hasta
    AND (p_sucursal_id IS NULL OR caja.sucursal_id = p_sucursal_id);

  SELECT
    COALESCE(sum(caja.fondo_inicial), 0),
    COALESCE(sum(caja.efectivo_contado) FILTER (WHERE caja.estado = 'cerrada'), 0)
  INTO v_fondo_inicial, v_efectivo_contado
  FROM public.pos_cajas AS caja
  WHERE caja.abierto_en >= p_desde
    AND caja.abierto_en < p_hasta
    AND (p_sucursal_id IS NULL OR caja.sucursal_id = p_sucursal_id);

  RETURN jsonb_build_object(
    'ventaTotal', round(v_venta_total, 2),
    'ventaNeta', round(v_venta_neta, 2),
    'impuestos', round(v_impuestos, 2),
    'propinas', round(v_propinas, 2),
    'ingresosTotales', round(v_venta_total + v_propinas, 2),
    'fondoInicial', round(v_fondo_inicial, 2),
    'efectivoContado', round(v_efectivo_contado, 2),
    'saldoFinalEstimado', round(v_fondo_inicial + v_venta_total + v_propinas, 2),
    'efectivoTotalEstimado', round(v_fondo_inicial + v_ventas_efectivo + v_propinas_efectivo, 2),
    'diferenciaEfectivo', round(
      v_efectivo_contado - (v_fondo_inicial + v_ventas_efectivo + v_propinas_efectivo),
      2
    ),
    'formas', jsonb_build_object(
      'Efectivo', jsonb_build_object(
        'operaciones', v_operaciones_efectivo,
        'ventas', round(v_ventas_efectivo, 2),
        'propinas', round(v_propinas_efectivo, 2)
      ),
      'Tarjeta', jsonb_build_object(
        'operaciones', v_operaciones_tarjeta,
        'ventas', round(v_ventas_tarjeta, 2),
        'propinas', round(v_propinas_tarjeta, 2)
      ),
      'Transferencia', jsonb_build_object(
        'operaciones', v_operaciones_transferencia,
        'ventas', round(v_ventas_transferencia, 2),
        'propinas', round(v_propinas_transferencia, 2)
      )
    ),
    'tiposOrden', jsonb_build_object(
      'A mesa', jsonb_build_object('operaciones', v_ordenes_mesa, 'ventas', round(v_ventas_mesa, 2)),
      'Para llevar', jsonb_build_object('operaciones', v_ordenes_llevar, 'ventas', round(v_ventas_llevar, 2)),
      'Para recoger', jsonb_build_object('operaciones', v_ordenes_recoger, 'ventas', round(v_ventas_recoger, 2))
    ),
    'cuentasIniciadas', v_cuentas,
    'cuentasCerradas', v_cuentas_cerradas,
    'cuentasPendientes', v_cuentas - v_cuentas_cerradas,
    'comensales', v_comensales,
    'cuentaPromedio', CASE
      WHEN v_cuentas > 0 THEN round(v_venta_total / v_cuentas, 2)
      ELSE 0
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reporte_periodo_pos(timestamptz, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reporte_periodo_pos(timestamptz, timestamptz, uuid)
  TO authenticated, service_role;
