import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useTienda } from "@/lib/tienda";
import { mxnExacto, type Categoria, type LineaPedido, type Pedido } from "@/data/saluva";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { DoodleTicket } from "@/components/doodles";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/caja")({
  head: () => ({
    meta: [
      { title: "Punto de venta · Salúva" },
      {
        name: "description",
        content: "Cobra desde el mostrador de Salúva: arma el ticket, elige método de pago y envía el pedido a barra.",
      },
      { property: "og:title", content: "Punto de venta · Salúva" },
      { property: "og:description", content: "Caja rápida para cobrar cafés, panadería y desayunos en Salúva." },
    ],
  }),
  component: Caja,
});

const categorias: (Categoria | "Todo")[] = [
  "Todo",
  "Café caliente",
  "Café frío",
  "Infusiones",
  "Panadería",
  "Desayunos",
];

function Caja() {
  const { productos, crearPedido, negocio } = useTienda();
  const [cat, setCat] = useState<(typeof categorias)[number]>("Todo");
  const [busqueda, setBusqueda] = useState("");
  const [items, setItems] = useState<LineaPedido[]>([]);
  const [cliente, setCliente] = useState("");
  const [canal, setCanal] = useState<Pedido["canal"]>("Mostrador");
  const [pago, setPago] = useState<Pedido["metodoPago"]>("Efectivo");
  const [tocado, setTocado] = useState<string | null>(null);

  const visibles = useMemo(
    () =>
      productos.filter(
        (p) =>
          p.activo &&
          (cat === "Todo" || p.categoria === cat) &&
          p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()),
      ),
    [productos, cat, busqueda],
  );

  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const iva = subtotal * (negocio.iva / 100);
  const total = subtotal + iva;

  const agregar = (id: string) => {
    const p = productos.find((x) => x.id === id)!;
    setItems((prev) => {
      const found = prev.find((i) => i.productoId === id);
      if (found) return prev.map((i) => (i.productoId === id ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [...prev, { productoId: id, nombre: p.nombre, cantidad: 1, precio: p.precio }];
    });
  };

  const cambiar = (id: string, delta: number) =>
    setItems((prev) =>
      prev
        .map((i) => (i.productoId === id ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0),
    );

  const cobrar = () => {
    if (items.length === 0) return;
    const pedido = crearPedido({ cliente, canal, metodoPago: pago, items });
    toast.success(`Pedido ${pedido.folio} enviado a barra`, {
      description: `${mxnExacto(total)} · ${pago}`,
    });
    setItems([]);
    setCliente("");
  };

  return (
    <AppShell titulo="Punto de venta" descripcion="Arma el ticket y cobra en segundos">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categorias.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  cat === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((p) => (
              <button
                key={p.id}
                onClick={() => agregar(p.id)}
                className="surface grain-top group p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl">{p.emoji}</span>
                  <Badge variant="secondary" className="shrink-0 text-[11px]">
                    {p.categoria}
                  </Badge>
                </div>
                <p className="mt-3 font-medium leading-tight">{p.nombre}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descripcion}</p>
                <p className="mt-3 font-display text-xl">{mxnExacto(p.precio)}</p>
              </button>
            ))}
            {visibles.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay productos con ese criterio.</p>
            )}
          </div>
        </div>

        <aside className="surface flex h-fit flex-col p-5 xl:sticky xl:top-28">
          <div className="flex items-center gap-2">
            <DoodleTicket className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Ticket actual</h2>
          </div>

          <div className="mt-4 space-y-3">
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre o mesa" />
            <div className="grid grid-cols-3 gap-2">
              {(["Mostrador", "Para llevar", "App"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCanal(c)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                    canal === c ? "border-foreground bg-foreground text-background" : "border-border bg-card"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {items.map((i) => (
              <li key={i.productoId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-cream px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.nombre}</p>
                  <p className="text-xs text-muted-foreground">{mxnExacto(i.precio)} c/u</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cambiar(i.productoId, -1)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-5 text-center text-sm font-semibold">{i.cantidad}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cambiar(i.productoId, 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                Toca un producto para agregarlo
              </li>
            )}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{mxnExacto(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA ({negocio.iva}%)</span>
              <span>{mxnExacto(iva)}</span>
            </div>
            <div className="flex justify-between pt-1 font-display text-2xl font-bold">
              <span>Total</span>
              <span>{mxnExacto(total)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["Efectivo", "Tarjeta", "Transferencia"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPago(m)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                  pago === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Button className="flex-1" size="lg" disabled={items.length === 0} onClick={cobrar}>
              Cobrar
            </Button>
            <Button variant="outline" size="lg" disabled={items.length === 0} onClick={() => setItems([])}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
