import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock3, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTienda } from "@/lib/tienda";
import { esHoy } from "@/lib/metricas";
import { mxnExacto, type Comanda, type EstadoPedido, type Pedido } from "@/data/saluva";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({
    meta: [
      { title: "Comandas · Salúva" },
      {
        name: "description",
        content: "Comandas del día de Salúva, pendientes de cobro y pagadas.",
      },
      { property: "og:title", content: "Comandas · Salúva" },
      {
        property: "og:description",
        content: "Consulta y atiende las comandas del día desde un solo lugar.",
      },
    ],
  }),
  component: Comandas,
});

type Registro = { tipo: "pendiente"; datos: Comanda } | { tipo: "cobrada"; datos: Pedido };

function numeroOrden(folio: string) {
  const coincidencia = folio.match(/^SLV-\d{8}-(\d+)$/);
  return coincidencia ? String(Number(coincidencia[1])) : folio;
}

function Comandas() {
  const { pedidos, comandas, cambiarEstado, cambiarEstadoComanda, seleccionarComanda } =
    useTienda();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<"hoy" | "pendientes">("hoy");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);

  const registros = useMemo<Registro[]>(() => {
    const texto = busqueda.trim().toLowerCase();
    const pendientes: Registro[] = comandas
      .filter((comanda) => esHoy(comanda.creadoEn))
      .map((datos) => ({ tipo: "pendiente", datos }));
    const cobradas: Registro[] = pedidos
      .filter((pedido) => esHoy(pedido.creadoEn))
      .map((datos) => ({ tipo: "cobrada", datos }));
    return [...pendientes, ...(filtro === "hoy" ? cobradas : [])]
      .filter(({ datos }) => {
        if (!texto) return true;
        return [datos.folio, datos.cliente, datos.canal, ...datos.items.map((item) => item.nombre)]
          .join(" ")
          .toLowerCase()
          .includes(texto);
      })
      .sort((a, b) => new Date(b.datos.creadoEn).getTime() - new Date(a.datos.creadoEn).getTime());
  }, [busqueda, comandas, filtro, pedidos]);

  const seleccionada =
    registros.find(({ datos }) => datos.id === seleccionadaId) ?? registros[0] ?? null;
  const pendientesHoy = comandas.filter((comanda) => esHoy(comanda.creadoEn)).length;

  const actualizarEstado = (registro: Registro, estado: EstadoPedido) => {
    if (registro.tipo === "pendiente") cambiarEstadoComanda(registro.datos.id, estado);
    else cambiarEstado(registro.datos.id, estado);
    toast.success(`${registro.datos.folio}: ${estado}`);
  };

  const continuarCobro = (comanda: Comanda) => {
    seleccionarComanda(comanda.id);
    void navigate({ to: "/caja" });
  };

  return (
    <AppShell
      titulo="Comandas"
      descripcion="Órdenes de hoy, desde barra hasta el cobro"
      acciones={
        <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300">
          {pendientesHoy} pendientes
        </Badge>
      }
    >
      <div className="grid min-h-[620px] gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
        <aside className="surface flex min-h-0 flex-col p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar folio, cliente o producto…"
              className="pl-9"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={filtro === "hoy" ? "default" : "outline"}
              onClick={() => setFiltro("hoy")}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" /> Hoy
            </Button>
            <Button
              type="button"
              variant={filtro === "pendientes" ? "default" : "outline"}
              onClick={() => setFiltro("pendientes")}
            >
              <Clock3 className="mr-1.5 h-4 w-4" /> Pendientes
            </Button>
          </div>

          <div className="mt-4 max-h-[66vh] space-y-2 overflow-y-auto pr-1">
            {registros.map((registro) => {
              const { datos } = registro;
              const pendiente = registro.tipo === "pendiente";
              const activa = seleccionada?.datos.id === datos.id;
              return (
                <button
                  key={`${registro.tipo}-${datos.id}`}
                  type="button"
                  onClick={() => setSeleccionadaId(datos.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${pendiente ? "border-sky-500/55 bg-sky-500/10" : "border-border bg-card hover:bg-secondary/55"} ${activa ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {datos.folio} · Orden {numeroOrden(datos.folio)}
                      </p>
                      <p className="mt-1 truncate text-sm">
                        <span className="font-semibold">{mxnExacto(datos.total)}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {datos.cliente || datos.canal}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium">Hoy, {datos.hora}</p>
                      {pendiente ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-sky-700 dark:text-sky-300">
                          <span className="h-2 w-2 rounded-full bg-sky-500" /> Pendiente
                        </span>
                      ) : (
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {registro.datos.metodoPago}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {registros.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                {filtro === "pendientes"
                  ? "No hay comandas pendientes de cobro."
                  : "Todavía no hay comandas registradas hoy."}
              </p>
            ) : null}
          </div>
        </aside>

        <section className="surface min-w-0 p-5">
          {seleccionada ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Orden {numeroOrden(seleccionada.datos.folio)}
                  </p>
                  <h2 className="font-display text-2xl font-bold">{seleccionada.datos.cliente}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {seleccionada.datos.canal} · {seleccionada.datos.comensales} comensal
                    {seleccionada.datos.comensales === 1 ? "" : "es"} · {seleccionada.datos.hora}
                  </p>
                </div>
                {seleccionada.tipo === "pendiente" ? (
                  <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300">
                    Pendiente de cobro
                  </Badge>
                ) : (
                  <Badge variant="secondary">Cobrada · {seleccionada.datos.metodoPago}</Badge>
                )}
              </div>

              <ul className="mt-4 divide-y divide-border">
                {seleccionada.datos.items.map((item) => (
                  <li
                    key={item.lineaId ?? item.productoId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {item.cantidad} × {item.nombre}
                      </p>
                      {item.opciones?.length ? (
                        <p className="text-xs text-muted-foreground">{item.opciones.join(" · ")}</p>
                      ) : null}
                    </div>
                    <span className="font-semibold">{mxnExacto(item.precio * item.cantidad)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 font-display text-2xl font-bold">
                <span>Total</span>
                <span>{mxnExacto(seleccionada.datos.total)}</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {seleccionada.tipo === "pendiente" ? (
                  <Button onClick={() => continuarCobro(seleccionada.datos)}>
                    Abrir en caja y cobrar
                  </Button>
                ) : null}
                {seleccionada.datos.estado === "En preparación" ? (
                  <Button variant="outline" onClick={() => actualizarEstado(seleccionada, "Listo")}>
                    Marcar lista
                  </Button>
                ) : null}
                {seleccionada.datos.estado === "Listo" ? (
                  <Button
                    variant="outline"
                    onClick={() => actualizarEstado(seleccionada, "Entregado")}
                  >
                    Marcar entregada
                  </Button>
                ) : null}
                {seleccionada.datos.estado !== "En preparación" ? (
                  <Button
                    variant="ghost"
                    onClick={() => actualizarEstado(seleccionada, "En preparación")}
                  >
                    Regresar a barra
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="grid min-h-[360px] place-items-center text-center text-sm text-muted-foreground">
              Selecciona una comanda para ver sus productos y estado.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
