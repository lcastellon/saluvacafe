import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Producto } from "@/data/saluva";
import { AppShell } from "@/components/AppShell";
import { useTienda } from "@/lib/tienda";
import { mxnExacto, esBebida, type Categoria } from "@/data/saluva";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DoodleTaza } from "@/components/doodles";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/menu")({
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
  const { productos, toggleProducto, actualizarPrecio, crearProducto, eliminarProducto } = useTienda();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Café caliente");
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [emoji, setEmoji] = useState("☕");
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);

  const limpiar = () => {
    setNombre("");
    setCategoria("Café caliente");
    setPrecio("");
    setCosto("");
    setDescripcion("");
    setEmoji("☕");
  };

  const guardar = () => {
    if (!nombre.trim() || !Number(precio)) {
      toast.error("Escribe al menos nombre y precio");
      return;
    }
    crearProducto({
      nombre: nombre.trim(),
      categoria,
      precio: Number(precio),
      costo: Number(costo) || 0,
      descripcion: descripcion.trim() || "Producto de la casa",
      activo: true,
      emoji: emoji || "☕",
    });
    toast.success(`${nombre.trim()} agregado al menú`);
    limpiar();
    setAbierto(false);
  };

  return (
    <AppShell
      titulo="Menú y productos"
      descripcion="Carta de la casa, precios y disponibilidad"
      acciones={
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{productos.filter((p) => p.activo).length} activos</Badge>
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Nuevo producto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo producto</DialogTitle>
                <DialogDescription>Se agrega al menú y aparece de inmediato en el punto de venta.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-3">
                  <div className="grid gap-1.5">
                    <Label>Emoji</Label>
                    <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Nombre</Label>
                    <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Latte de vainilla" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Categoría</Label>
                  <div className="flex flex-wrap gap-2">
                    {orden.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategoria(c)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                          categoria === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Precio</Label>
                    <Input type="number" min={0} value={precio} onChange={(e) => setPrecio(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Costo</Label>
                    <Input type="number" min={0} value={costo} onChange={(e) => setCosto(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Descripción</Label>
                  <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAbierto(false)}>
                  Cancelar
                </Button>
                <Button onClick={guardar}>Guardar producto</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6">
        {orden.map((cat) => (
          <section key={cat}>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <DoodleTaza className="h-5 w-5 text-primary" />
              {cat}
            </h2>
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

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {esBebida(p.categoria) ? (
                          <>
                            <Badge variant="outline" className="text-[10px]">Tamaño</Badge>
                            <Badge variant="outline" className="text-[10px]">Leche</Badge>
                            <Badge variant="outline" className="text-[10px]">Extra shot</Badge>
                            <Badge variant="outline" className="text-[10px]">Sin azúcar</Badge>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Para llevar</Badge>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-3">
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
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 text-destructive"
                          onClick={() => setProductoAEliminar(p)}
                          aria-label={`Eliminar ${p.nombre}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
