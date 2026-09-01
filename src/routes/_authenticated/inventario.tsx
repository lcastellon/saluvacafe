import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { mxn } from "@/data/saluva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Minus, Plus, Pencil, Trash2, Package } from "lucide-react";
import { DoodleCaja } from "@/components/doodles";
import {
  ajustarExistencia,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
  listarInsumos,
} from "@/lib/inventario.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario de insumos · Salúva" },
      {
        name: "description",
        content:
          "Control de insumos de Salúva: café en grano, leches, matcha, panadería y desechables con alertas de mínimo.",
      },
      { property: "og:title", content: "Inventario de insumos · Salúva" },
      {
        property: "og:description",
        content: "Existencias, mínimos y valor del almacén de la cafetería Salúva.",
      },
    ],
  }),
  component: Inventario,
});

type Insumo = {
  id: string;
  nombre: string;
  unidad: string;
  existencia: number;
  minimo: number;
  costo_unitario: number;
  proveedor: string;
  activo: boolean;
};

const formularioVacio = {
  nombre: "",
  unidad: "",
  existencia: "",
  minimo: "",
  costoUnitario: "",
  proveedor: "",
};

function Inventario() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();

  const listar = useServerFn(listarInsumos);
  const crear = useServerFn(crearInsumo);
  const actualizar = useServerFn(actualizarInsumo);
  const eliminar = useServerFn(eliminarInsumo);
  const ajustar = useServerFn(ajustarExistencia);

  const { data, isLoading } = useQuery({
    queryKey: ["insumos"],
    queryFn: () => listar() as Promise<Insumo[]>,
  });

  const insumos = data ?? [];
  const valor = insumos.reduce((s: number, i: Insumo) => s + Number(i.existencia) * Number(i.costo_unitario), 0);
  const bajos = insumos.filter((i: Insumo) => Number(i.existencia) <= Number(i.minimo)).length;

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [form, setForm] = useState(formularioVacio);

  const abrirCrear = () => {
    setEditando(null);
    setForm(formularioVacio);
    setDialogoAbierto(true);
  };

  const abrirEditar = (insumo: Insumo) => {
    setEditando(insumo);
    setForm({
      nombre: insumo.nombre,
      unidad: insumo.unidad,
      existencia: String(insumo.existencia),
      minimo: String(insumo.minimo),
      costoUnitario: String(insumo.costo_unitario),
      proveedor: insumo.proveedor,
    });
    setDialogoAbierto(true);
  };

  const invalidar = () => void qc.invalidateQueries({ queryKey: ["insumos"] });
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Ocurrió un error");

  const mCrear = useMutation({
    mutationFn: () =>
      crear({
        data: {
          nombre: form.nombre,
          unidad: form.unidad,
          existencia: Number(form.existencia),
          minimo: Number(form.minimo),
          costoUnitario: Number(form.costoUnitario),
          proveedor: form.proveedor,
        },
      }),
    onSuccess: () => {
      toast.success("Insumo creado");
      setDialogoAbierto(false);
      setForm(formularioVacio);
      invalidar();
    },
    onError,
  });

  const mActualizar = useMutation({
    mutationFn: () => {
      if (!editando) throw new Error("No hay insumo para actualizar");
      return actualizar({
        data: {
          id: editando.id,
          nombre: form.nombre,
          unidad: form.unidad,
          existencia: Number(form.existencia),
          minimo: Number(form.minimo),
          costoUnitario: Number(form.costoUnitario),
          proveedor: form.proveedor,
          activo: editando.activo,
        },
      });
    },
    onSuccess: () => {
      toast.success("Insumo actualizado");
      setDialogoAbierto(false);
      setEditando(null);
      setForm(formularioVacio);
      invalidar();
    },
    onError,
  });

  const mEliminar = useMutation({
    mutationFn: (id: string) => eliminar({ data: { id } }),
    onSuccess: () => {
      toast.success("Insumo eliminado");
      invalidar();
    },
    onError,
  });

  const mAjustar = useMutation({
    mutationFn: (v: { id: string; delta: number }) => ajustar({ data: v }),
    onSuccess: invalidar,
    onError,
  });

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (editando) {
      mActualizar.mutate();
    } else {
      mCrear.mutate();
    }
  };

  const inputClass = "font-normal";

  return (
    <AppShell
      titulo="Inventario"
      descripcion="Insumos de barra, cocina y empaque"
      acciones={
        <>
          <Badge variant="secondary">Valor {mxn(valor)}</Badge>
          <Badge variant={bajos ? "destructive" : "default"}>{bajos} por reponer</Badge>
          {esAdmin && (
            <Button onClick={abrirCrear} className="hidden sm:inline-flex">
              <Package className="mr-1.5 h-4 w-4" />
              Nuevo insumo
            </Button>
          )}
        </>
      }
    >
      {esAdmin && (
        <div className="mb-4 sm:hidden">
          <Button onClick={abrirCrear} className="w-full">
            <Package className="mr-1.5 h-4 w-4" />
            Nuevo insumo
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando inventario…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insumos.map((i: Insumo) => {
            const existencia = Number(i.existencia);
            const minimo = Number(i.minimo);
            const pct = Math.min(100, Math.round((existencia / (minimo * 2 || 1)) * 100));
            const bajo = existencia <= minimo;
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
                    {existencia} <span className="text-sm text-muted-foreground">{i.unidad}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Mín. {minimo} {i.unidad}</p>
                </div>

                <Progress value={pct} className="mt-3 h-2" />

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {mxn(existencia * Number(i.costo_unitario))} en almacén
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {esAdmin && (
                      <>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => abrirEditar(i)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => mEliminar.mutate(i.id)}
                          disabled={mEliminar.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => mAjustar.mutate({ id: i.id, delta: -1 })}
                      disabled={mAjustar.isPending}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => mAjustar.mutate({ id: i.id, delta: 1 })}
                      disabled={mAjustar.isPending}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
            <DialogDescription>
              Completa los datos del insumo. El costo unitario sirve para calcular el valor en almacén.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={guardar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Café en grano"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="unidad">Unidad</Label>
                <Input
                  id="unidad"
                  value={form.unidad}
                  onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                  placeholder="kg"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proveedor">Proveedor</Label>
                <Input
                  id="proveedor"
                  value={form.proveedor}
                  onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}
                  placeholder="Proveedor"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="existencia">Existencia</Label>
                <Input
                  id="existencia"
                  inputMode="decimal"
                  value={form.existencia}
                  onChange={(e) => setForm((f) => ({ ...f, existencia: e.target.value }))}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimo">Mínimo</Label>
                <Input
                  id="minimo"
                  inputMode="decimal"
                  value={form.minimo}
                  onChange={(e) => setForm((f) => ({ ...f, minimo: e.target.value }))}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costoUnitario">Costo</Label>
                <Input
                  id="costoUnitario"
                  inputMode="decimal"
                  value={form.costoUnitario}
                  onChange={(e) => setForm((f) => ({ ...f, costoUnitario: e.target.value }))}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogoAbierto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mCrear.isPending || mActualizar.isPending}>
                {mCrear.isPending || mActualizar.isPending
                  ? "Guardando…"
                  : editando
                  ? "Guardar cambios"
                  : "Crear insumo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
