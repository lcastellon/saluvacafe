import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useTienda } from "@/lib/tienda";
import { mxnExacto, type Categoria } from "@/data/saluva";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menú y productos · Salúva" },
      {
        name: "description",
        content: "Administra la carta de Salúva: cafés, infusiones, panadería y desayunos con precio, costo y margen.",
      },
      { property: "og:title", content: "Menú y productos · Salúva" },
      { property: "og:description", content: "Precios, disponibilidad y margen de cada producto de la cafetería." },
    ],
  }),
  component: Menu,
});

const orden: Categoria[] = ["Café caliente", "Café frío", "Infusiones", "Panadería", "Desayunos"];

function Menu() {
  const { productos, toggleProducto, actualizarPrecio } = useTienda();

  return (
    <AppShell
      titulo="Menú y productos"
      descripcion="Carta de la casa, precios y disponibilidad"
      acciones={<Badge variant="secondary">{productos.filter((p) => p.activo).length} activos</Badge>}
    >
      <div className="space-y-6">
        {orden.map((cat) => (
          <section key={cat}>
            <h2 className="text-lg font-semibold">{cat}</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {productos
                .filter((p) => p.categoria === cat)
                .map((p) => {
                  const margen = Math.round(((p.precio - p.costo) / p.precio) * 100);
                  return (
                    <article key={p.id} className={`surface p-4 ${p.activo ? "" : "opacity-60"}`}>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            <span className="mr-2">{p.emoji}</span>
                            {p.nombre}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descripcion}</p>
                        </div>
                        <Switch checked={p.activo} onCheckedChange={() => toggleProducto(p.id)} />
                      </div>

                      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3">
                        <Input
                          type="number"
                          value={p.precio}
                          min={0}
                          onChange={(e) => actualizarPrecio(p.id, Number(e.target.value) || 0)}
                          className="h-9 w-24"
                        />
                        <div className="min-w-0 text-right text-xs text-muted-foreground">
                          Costo {mxnExacto(p.costo)} · Margen{" "}
                          <span className="font-semibold text-foreground">{margen}%</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
