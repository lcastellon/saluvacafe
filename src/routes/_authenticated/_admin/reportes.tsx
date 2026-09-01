import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DoodleFlor, DoodleGrano, DoodleTicket, DoodleTrazo } from "@/components/doodles";
import { mxn, topProductos, ventasPorHora, ventasSemana } from "@/data/saluva";
import { useTienda } from "@/lib/tienda";
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

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes de ventas · Salúva" },
      {
        name: "description",
        content: "Reportes de Salúva: ventas por día y hora, mezcla por categoría, métodos de pago y productos estrella.",
      },
      { property: "og:title", content: "Reportes de ventas · Salúva" },
      { property: "og:description", content: "Analiza el desempeño semanal de la cafetería Salúva." },
    ],
  }),
  component: Reportes,
});

const paleta = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
};

function Reportes() {
  const { pedidos } = useTienda();

  const porCategoria = [
    { nombre: "Café caliente", valor: 38200 },
    { nombre: "Café frío", valor: 16400 },
    { nombre: "Infusiones", valor: 14900 },
    { nombre: "Panadería", valor: 12600 },
    { nombre: "Desayunos", valor: 29530 },
  ];

  const pagos = (["Efectivo", "Tarjeta", "Transferencia"] as const).map((m) => ({
    metodo: m,
    monto: pedidos.filter((p) => p.metodoPago === m).reduce((s, p) => s + p.total, 0),
  }));

  const semana = ventasSemana.reduce((s, d) => s + d.ventas, 0);
  const ticketsSemana = ventasSemana.reduce((s, d) => s + d.tickets, 0);

  return (
    <AppShell
      titulo="Reportes de ventas"
      descripcion="Semana del 24 al 30 de agosto"
      acciones={<Badge variant="secondary">7 días</Badge>}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface grain-top p-5">
          <p className="text-sm text-muted-foreground">Ventas de la semana</p>
          <p className="mt-2 font-display text-3xl">{mxn(semana)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Tickets</p>
          <p className="mt-2 font-display text-3xl">{ticketsSemana}</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Ticket promedio</p>
          <p className="mt-2 font-display text-3xl">{mxn(semana / ticketsSemana)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><DoodleTrazo className="h-2 w-10 text-primary" />Tendencia diaria</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ventasSemana} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(v: number) => [mxn(v), "Ventas"]} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="ventas" stroke="var(--color-chart-1)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><DoodleFlor className="h-5 w-5 text-primary" />Mezcla por categoría</h2>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porCategoria} dataKey="valor" nameKey="nombre" innerRadius={48} outerRadius={78} paddingAngle={3}>
                  {porCategoria.map((_, i) => (
                    <Cell key={i} fill={paleta[i % paleta.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => mxn(v)} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {porCategoria.map((c, i) => (
              <li key={c.nombre} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: paleta[i % paleta.length] }} />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.nombre}</span>
                <span className="shrink-0 font-medium">{mxn(c.valor)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Ventas por hora (hoy)</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ventasPorHora} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="hora" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(v: number) => [mxn(v), "Ventas"]} contentStyle={tooltipStyle} />
                <Bar dataKey="ventas" fill="var(--color-chart-3)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><DoodleTicket className="h-5 w-5 text-primary" />Métodos de pago</h2>
          <ul className="mt-4 space-y-3">
            {pagos.map((p) => (
              <li key={p.metodo} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-muted-foreground">{p.metodo}</span>
                <span className="shrink-0 font-semibold">{mxn(p.monto)}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-6 flex items-center gap-2 text-lg font-semibold"><DoodleGrano className="h-5 w-5 text-primary" />Productos estrella</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {topProductos.map((p) => (
              <li key={p.nombre} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-muted-foreground">{p.nombre}</span>
                <span className="shrink-0 font-medium">{p.unidades} u.</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
