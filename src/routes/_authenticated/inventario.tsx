import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useTienda } from "@/lib/tienda";
import { mxn } from "@/data/saluva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Minus, Plus } from "lucide-react";
import { DoodleCaja } from "@/components/doodles";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario de insumos · Salúva" },
      {
        name: "description",
        content: "Control de insumos de Salúva: café en grano, leches, matcha, panadería y desechables con alertas de mínimo.",
      },
      { property: "og:title", content: "Inventario de insumos · Salúva" },
      { property: "og:description", content: "Existencias, mínimos y valor del almacén de la cafetería Salúva." },
    ],
  }),
  component: Inventario,
});

function Inventario() {
  const { insumos, ajustarInsumo } = useTienda();
  const valor = insumos.reduce((s, i) => s + i.existencia * i.costoUnitario, 0);
  const bajos = insumos.filter((i) => i.existencia <= i.minimo).length;

  return (
    <AppShell
      titulo="Inventario"
      descripcion="Insumos de barra, cocina y empaque"
      acciones={
        <>
          <Badge variant="secondary">Valor {mxn(valor)}</Badge>
          <Badge variant={bajos ? "destructive" : "default"}>{bajos} por reponer</Badge>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insumos.map((i) => {
          const pct = Math.min(100, Math.round((i.existencia / (i.minimo * 2 || 1)) * 100));
          const bajo = i.existencia <= i.minimo;
          return (
            <article key={i.id} className="surface p-4 transition-colors hover:border-foreground">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <DoodleCaja className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                  <p className="truncate font-medium">{i.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.proveedor}</p>
                  </div>
                </div>
                {bajo && <Badge variant="destructive" className="shrink-0">Reponer</Badge>}
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="font-display text-2xl font-bold">
                  {i.existencia} <span className="text-sm text-muted-foreground">{i.unidad}</span>
                </p>
                <p className="text-xs text-muted-foreground">Mín. {i.minimo} {i.unidad}</p>
              </div>

              <Progress value={pct} className="mt-3 h-2" />

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">{mxn(i.existencia * i.costoUnitario)} en almacén</span>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => ajustarInsumo(i.id, -1)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => ajustarInsumo(i.id, 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
