import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useTienda } from "@/lib/tienda";
import { DoodleTrazo, DoodleGrano, DoodleFlor } from "@/components/doodles";
import { mxn } from "@/data/saluva";
import { esHoy, productosMasVendidos, ventasPorHora, ventasUltimosSieteDias } from "@/lib/metricas";
import { listarInsumos } from "@/lib/inventario.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Coffee, CupSoda, Receipt, TrendingUp, TriangleAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Dashboard · Salúva Punto de Venta" },
      {
        name: "description",
        content: "Panel general de Salúva con ventas, pedidos e inventario reales.",
      },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  label,
  valor,
  detalle,
  icon: Icon,
}: {
  label: string;
  valor: string;
  detalle: string;
  icon: typeof Coffee;
}) {
  return (
    <div className="surface grain-top relative overflow-hidden p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{valor}</p>
      <DoodleTrazo className="mt-2 h-1.5 w-16 text-primary/70" />
      <p className="mt-2 text-xs text-muted-foreground">{detalle}</p>
    </div>
  );
}

type Insumo = {
  id: string;
  nombre: string;
  unidad: string;
  existencia: number;
  minimo: number;
  costo_unitario: number;
  proveedor: string;
};

function Dashboard() {
  const { pedidos, enLinea } = useTienda();
  const listar = useServerFn(listarInsumos);
  const { data: insumos } = useQuery({
    queryKey: ["insumos"],
    queryFn: () => listar() as Promise<Insumo[]>,
    enabled: enLinea,
    retry: false,
  });
  const pedidosHoy = pedidos.filter((pedido) => esHoy(pedido.creadoEn));
  const ventasDia = pedidosHoy.reduce((suma, pedido) => suma + pedido.total, 0);
  const tickets = pedidosHoy.length;
  const activos = pedidos.filter((pedido) => pedido.estado !== "Entregado");
  const horas = ventasPorHora(pedidos);
  const semana = ventasUltimosSieteDias(pedidos);
  const top = productosMasVendidos(pedidosHoy);
  const bajos = (insumos ?? []).filter((i: Insumo) => Number(i.existencia) <= Number(i.minimo));
  const criticos = (insumos ?? []).filter(
    (i: Insumo) => Number(i.minimo) > 0 && Number(i.existencia) <= Number(i.minimo) * 0.1,
  );

  return (
    <AppShell
      titulo="Buen día, Salúva"
      descripcion="Resumen real del turno de hoy"
      acciones={
        <Button asChild>
          <Link to="/caja">Abrir caja</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Ventas del día"
          valor={mxn(ventasDia)}
          detalle="Suma de tickets registrados"
          icon={TrendingUp}
        />
        <Kpi label="Tickets" valor={`${tickets}`} detalle="Ventas realizadas hoy" icon={Receipt} />
        <Kpi
          label="Ticket promedio"
          valor={mxn(tickets > 0 ? ventasDia / tickets : 0)}
          detalle="Promedio de ventas reales"
          icon={CupSoda}
        />
        <Kpi
          label="Pedidos activos"
          valor={`${activos.length}`}
          detalle="En barra y listos"
          icon={Coffee}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Ventas por hora</h2>
            <Badge variant="secondary">Hoy</Badge>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={horas} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis dataKey="hora" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(v: number) => [mxn(v), "Ventas"]} />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  fill="url(#g1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <DoodleGrano className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Más vendidos hoy</h2>
          </div>
          <ul className="mt-4 space-y-3">
            {top.map((producto, indice) => (
              <li key={producto.nombre} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                  {indice + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{producto.nombre}</p>
                  <p className="text-xs text-muted-foreground">{producto.unidades} unidades</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">{mxn(producto.ingreso)}</span>
              </li>
            ))}
            {top.length === 0 && (
              <li className="text-sm text-muted-foreground">Aún no hay ventas registradas.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Pedidos en barra</h2>
            <Link
              to="/pedidos"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Ver todos <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {activos.slice(0, 5).map((pedido) => (
              <li
                key={pedido.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {pedido.folio} · {pedido.cliente}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {pedido.items.map((item) => `${item.cantidad}× ${item.nombre}`).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={pedido.estado === "Listo" ? "default" : "secondary"}>
                    {pedido.estado}
                  </Badge>
                  <span className="text-sm font-semibold">{mxn(pedido.total)}</span>
                </div>
              </li>
            ))}
            {activos.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">No hay pedidos activos.</li>
            )}
          </ul>
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-warning" />
            <h2 className="text-lg font-semibold">Inventario bajo</h2>
          </div>
          {!enLinea && (
            <p className="mt-4 text-sm text-muted-foreground">
              Disponible nuevamente al recuperar conexión.
            </p>
          )}
          {enLinea && criticos.length > 0 && (
            <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-destructive">
                Crítico · menos del 10%
              </p>
              <p className="mt-1 text-sm text-destructive">
                {criticos.map((i) => `${i.nombre} (${i.existencia} ${i.unidad})`).join(", ")}
              </p>
            </div>
          )}
          {enLinea && (
            <ul className="mt-4 space-y-3">
              {bajos.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium">{i.nombre}</span>
                  <span className="shrink-0 text-sm font-semibold text-destructive">
                    {i.existencia} {i.unidad}
                  </span>
                </li>
              ))}
              {bajos.length === 0 && (
                <li className="text-sm text-muted-foreground">Todo en niveles óptimos.</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="surface mt-6 p-5">
        <div className="flex items-center gap-2">
          <DoodleFlor className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Últimos siete días</h2>
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={semana} margin={{ left: -18, right: 6, top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip formatter={(v: number) => [mxn(v), "Ventas"]} />
              <Bar dataKey="ventas" fill="var(--color-chart-2)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppShell>
  );
}
