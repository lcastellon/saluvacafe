import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { DoodleTrazo, DoodleFlor } from "@/components/doodles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  cambiarEstadoBarista,
  crearBarista,
  eliminarBarista,
  listarPersonal,
} from "@/lib/personal.functions";

export const Route = createFileRoute("/_authenticated/_admin/personal")({
  head: () => ({
    meta: [
      { title: "Personal y códigos de acceso · Salúva" },
      {
        name: "description",
        content:
          "Crea, desactiva y elimina los códigos individuales de acceso de las baristas de la cafetería Salúva.",
      },
      { property: "og:title", content: "Personal y códigos de acceso · Salúva" },
      { property: "og:description", content: "Administra los códigos individuales del equipo de Salúva." },
    ],
  }),
  component: Personal,
});

type Miembro = {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
  rol: "admin" | "barista";
};

function Personal() {
  const listar = useServerFn(listarPersonal);
  const crear = useServerFn(crearBarista);
  const cambiar = useServerFn(cambiarEstadoBarista);
  const borrar = useServerFn(eliminarBarista);
  const qc = useQueryClient();

  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["personal"],
    queryFn: () => listar() as Promise<Miembro[]>,
  });

  const invalidar = () => void qc.invalidateQueries({ queryKey: ["personal"] });
  const error = (e: unknown) => toast.error(e instanceof Error ? e.message : "Ocurrió un error");

  const mCrear = useMutation({
    mutationFn: () => crear({ data: { nombre, codigo } }),
    onSuccess: () => {
      toast.success(`Código ${codigo} creado para ${nombre}`);
      setNombre("");
      setCodigo("");
      invalidar();
    },
    onError: error,
  });

  const mEstado = useMutation({
    mutationFn: (v: { id: string; activo: boolean }) => cambiar({ data: v }),
    onSuccess: invalidar,
    onError: error,
  });

  const mBorrar = useMutation({
    mutationFn: (id: string) => borrar({ data: { id } }),
    onSuccess: () => {
      toast.success("Cuenta eliminada");
      invalidar();
    },
    onError: error,
  });

  const sugerir = () => setCodigo(String(Math.floor(100000 + Math.random() * 900000)));

  return (
    <AppShell titulo="Personal" descripcion="Códigos de acceso individuales del equipo Salúva">
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="surface relative overflow-hidden p-5">
          <DoodleFlor className="absolute -right-6 -top-6 h-24 w-24 text-primary/10" />
          <h2 className="font-display text-lg font-semibold">Nueva barista</h2>
          <DoodleTrazo className="mt-1 h-1.5 w-16 text-primary" />
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mCrear.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ana Sotelo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo">Código de 6 dígitos</Label>
              <div className="flex gap-2">
                <Input
                  id="codigo"
                  inputMode="numeric"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                  placeholder="482301"
                  className="font-display tracking-[0.3em]"
                />
                <Button type="button" variant="outline" onClick={sugerir}>
                  Generar
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={mCrear.isPending}>
              {mCrear.isPending ? "Creando…" : "Crear código"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Con este código la barista entra directamente desde la pantalla de acceso.
            </p>
          </form>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-lg font-semibold">Equipo</h2>
          <DoodleTrazo className="mt-1 h-1.5 w-16 text-primary" />

          {isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Cargando equipo…</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {(data ?? []).map((m) => (
                <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{m.nombre}</p>
                      <Badge variant={m.rol === "admin" ? "default" : "outline"}>
                        {m.rol === "admin" ? "Administrador" : "Barista"}
                      </Badge>
                      {!m.activo ? <Badge variant="outline">Desactivada</Badge> : null}
                    </div>
                    <p className="mt-1 font-display text-sm tracking-[0.25em] text-muted-foreground">{m.codigo}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      checked={m.activo}
                      disabled={m.rol === "admin" || mEstado.isPending}
                      onCheckedChange={(v) => mEstado.mutate({ id: m.id, activo: v })}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={m.rol === "admin" || mBorrar.isPending}
                      onClick={() => mBorrar.mutate(m.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
