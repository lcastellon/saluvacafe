import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useTienda } from "@/lib/tienda";
import { mxnExacto, type EstadoPedido } from "@/data/saluva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos activos · Salúva" },
      {
        name: "description",
        content: "Tablero de barra de Salúva: pedidos en preparación, listos para entregar y ya entregados.",
      },
      { property: "og:title", content: "Pedidos activos · Salúva" },
      { property: "og:description", content: "Sigue cada pedido de la cafetería desde la barra hasta la entrega." },
    ],
  }),
  component: Pedidos,
});

const columnas: EstadoPedido[] = ["En preparación", "Listo", "Entregado"];

function Pedidos() {
  const { pedidos, cambiarEstado } = useTienda();

  return (
    <AppShell
      titulo="Pedidos activos"
      descripcion="Tablero de barra en tiempo real"
      acciones={<Badge variant="secondary">{pedidos.filter((p) => p.estado !== "Entregado").length} en curso</Badge>}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {columnas.map((col) => {
          const lista = pedidos.filter((p) => p.estado === col);
          return (
            <section key={col} className="min-w-0">
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 className="text-lg font-semibold">{col}</h2>
                <span className="text-sm text-muted-foreground">{lista.length}</span>
              </div>

              <div className="mt-3 space-y-3">
                {lista.map((p) => (
                  <article key={p.id} className="surface p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.cliente}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.folio} · {p.hora} · {p.canal}
                        </p>
                      </div>
                      <span className="shrink-0 font-display text-lg">{mxnExacto(p.total)}</span>
                    </div>

                    <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                      {p.items.map((i) => (
                        <li key={i.productoId} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate text-muted-foreground">
                            {i.cantidad}× {i.nombre}
                          </span>
                          <span className="shrink-0">{mxnExacto(i.precio * i.cantidad)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {col === "En preparación" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            cambiarEstado(p.id, "Listo");
                            toast.success(`${p.folio} listo para entregar`);
                          }}
                        >
                          Marcar listo
                        </Button>
                      )}
                      {col === "Listo" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            cambiarEstado(p.id, "Entregado");
                            toast.success(`${p.folio} entregado`);
                          }}
                        >
                          Entregar
                        </Button>
                      )}
                      {col !== "En preparación" && (
                        <Button size="sm" variant="outline" onClick={() => cambiarEstado(p.id, "En preparación")}>
                          Regresar a barra
                        </Button>
                      )}
                      <Badge variant="secondary" className="ml-auto self-center">
                        {p.metodoPago}
                      </Badge>
                    </div>
                  </article>
                ))}
                {lista.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                    Sin pedidos aquí
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
