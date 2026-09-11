import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ReporteCajaPeriodico } from "@/components/ReporteCajaPeriodico";
import { DoodleFlor, DoodleGrano, DoodleTicket, DoodleTrazo } from "@/components/doodles";
import { mxn } from "@/data/saluva";
import { useTienda } from "@/lib/tienda";
import {
  productosMasVendidos,
  ventasPorCategoria,
  ventasPorHora,
  ventasUltimosSieteDias,
} from "@/lib/metricas";
import { Badge } from "@/components/ui/badge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/_admin/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes de ventas · Salúva" },
      { name: "description", content: "Reportes calculados con las ventas registradas en Salúva." },
    ],
  }),
  component: Reportes,
});

const paleta = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function Reportes() {
  const { pedidos, productos } = useTienda();
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - 6);
  const pedidosSemana = pedidos.filter((pedido) => new Date(pedido.creadoEn) >= inicio);
  const semana = ventasUltimosSieteDias(pedidos);
  const horas = ventasPorHora(pedidos);
  const categorias = ventasPorCategoria(pedidosSemana, productos);
  const top = productosMasVendidos(pedidosSemana);
  const pagos = (["Efectivo", "Tarjeta", "Transferencia"] as const).map((metodo) => ({
    metodo,
    monto: pedidosSemana
      .filter((pedido) => pedido.metodoPago === metodo)
      .reduce((suma, pedido) => suma + pedido.total, 0),
  }));
  const totalSemana = pedidosSemana.reduce((suma, pedido) => suma + pedido.total, 0);
  const ticketsSemana = pedidosSemana.length;

  return (
    <AppShell
      titulo="Reportes de ventas"
      descripcion="Cortes imprimibles y análisis de ventas"
      acciones={<Badge variant="secondary">Administración</Badge>}
    >
      <ReporteCajaPeriodico />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface grain-top p-5">
          <p className="text-sm text-muted-foreground">Ventas</p>
          <p className="mt-2 font-display text-3xl">{mxn(totalSemana)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Tickets</p>
          <p className="mt-2 font-display text-3xl">{ticketsSemana}</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Ticket promedio</p>
          <p className="mt-2 font-display text-3xl">
            {mxn(ticketsSemana > 0 ? totalSemana / ticketsSemana : 0)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <DoodleTrazo className="h-2 w-10 text-primary" /> Tendencia diaria
          </h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={semana} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(v: number) => [mxn(v), "Ventas"]} />
                <Line
                  type="monotone"
                  dataKey="ventas"
                  stroke="var(--color-chart-1)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <DoodleFlor className="h-5 w-5 text-primary" /> Mezcla por categoría
          </h2>
          <div className="mt-2 h-56">
            {categorias.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorias}
                    dataKey="valor"
                    nameKey="nombre"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {categorias.map((categoria, indice) => (
                      <Cell key={categoria.nombre} fill={paleta[indice % paleta.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => mxn(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Sin ventas registradas
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Ventas por hora de hoy</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horas} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis dataKey="hora" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(v: number) => [mxn(v), "Ventas"]} />
                <Bar dataKey="ventas" fill="var(--color-chart-3)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <DoodleTicket className="h-5 w-5 text-primary" /> Métodos de pago
          </h2>
          <ul className="mt-4 space-y-3">
            {pagos.map((pago) => (
              <li key={pago.metodo} className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{pago.metodo}</span>
                <span className="font-semibold">{mxn(pago.monto)}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-6 flex items-center gap-2 text-lg font-semibold">
            <DoodleGrano className="h-5 w-5 text-primary" /> Productos estrella
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {top.map((producto) => (
              <li key={producto.nombre} className="flex items-center justify-between gap-3">
                <span className="truncate text-muted-foreground">{producto.nombre}</span>
                <span className="shrink-0 font-medium">{producto.unidades} u.</span>
              </li>
            ))}
            {top.length === 0 && <li className="text-muted-foreground">Sin ventas registradas.</li>}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
