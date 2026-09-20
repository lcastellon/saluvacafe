import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { DoodleBolsa, DoodleTicket, DoodleTrazo } from "@/components/doodles";
import { useTienda } from "@/lib/tienda";
import { useCajaTurno } from "@/lib/caja-turno";
import { IVA_INCLUIDO } from "@/data/saluva";
import { cambiarCodigoPropio } from "@/lib/personal.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración del negocio · Salúva" },
      {
        name: "description",
        content:
          "Datos de la sucursal, propina sugerida y preferencias de operación de la cafetería Salúva.",
      },
      { property: "og:title", content: "Configuración del negocio · Salúva" },
      {
        property: "og:description",
        content: "Ajusta sucursal, horario y propina sugerida de Salúva.",
      },
    ],
  }),
  component: Configuracion,
});

function Configuracion() {
  const { negocio, guardarNegocio, enLinea, cargandoLocal, cargandoConfiguracion } = useTienda();
  const { terminalAutorizada, terminalNombre, terminalSucursalNombre } = useCajaTurno();
  const [form, setForm] = useState(negocio);
  const [formSucio, setFormSucio] = useState(false);
  const [imprimir, setImprimir] = useState(true);
  const [alertas, setAlertas] = useState(true);
  const [codigoActual, setCodigoActual] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [confirmarCodigo, setConfirmarCodigo] = useState("");
  const cambiarCodigo = useServerFn(cambiarCodigoPropio);
  const navigate = useNavigate();

  useEffect(() => {
    if (!formSucio) setForm(negocio);
  }, [formSucio, negocio]);

  const mensajeConfiguracion = (error: unknown) => {
    if (error instanceof Error) {
      if (
        error.message.includes("pos_configuracion") ||
        error.message.includes("configuracion_terminal_pos") ||
        error.message.includes("guardar_configuracion_terminal_pos") ||
        error.message.toLowerCase().includes("schema cache")
      ) {
        return "Falta aplicar la migración que unifica Configuración con la sucursal.";
      }
      return error.message;
    }
    return "No se pudo guardar la configuración";
  };

  const guardarConfiguracion = useMutation({
    mutationFn: () => guardarNegocio({ ...form, iva: IVA_INCLUIDO }),
    onSuccess: (guardado) => {
      setForm(guardado);
      setFormSucio(false);
      toast.success("Configuración guardada en Supabase");
    },
    onError: (error) => toast.error(mensajeConfiguracion(error)),
  });

  const cambioCodigo = useMutation({
    mutationFn: () => cambiarCodigo({ data: { codigoActual, nuevoCodigo, confirmarCodigo } }),
    onSuccess: async () => {
      toast.success("Código actualizado. Vuelve a entrar con tu nuevo código");
      await supabase.auth.signOut();
      void navigate({ to: "/", replace: true });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el código"),
  });

  const codigo = (valor: string) => valor.replace(/\D/g, "").slice(0, 6);

  const campo = (k: keyof typeof form, label: string, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        type={type}
        value={String(form[k])}
        disabled={cargandoConfiguracion || !terminalAutorizada}
        onChange={(e) => {
          setForm((actual) => ({
            ...actual,
            [k]: type === "number" ? Number(e.target.value) : e.target.value,
          }));
          setFormSucio(true);
        }}
      />
    </div>
  );

  return (
    <AppShell titulo="Configuración" descripcion="Datos del negocio y preferencias de operación">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <DoodleBolsa className="h-5 w-5 text-primary" />
            Datos de la sucursal
          </h2>
          {terminalAutorizada ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Configurando {terminalSucursalNombre} desde {terminalNombre}.
            </p>
          ) : (
            <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              Autoriza este dispositivo y asígnalo a una sucursal antes de editar sus datos.
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {campo("nombre", "Nombre comercial")}
            {campo("sucursal", "Sucursal")}
            <div className="sm:col-span-2">{campo("direccion", "Dirección")}</div>
            {campo("telefono", "Teléfono")}
            {campo("horario", "Horario")}
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <DoodleTicket className="h-5 w-5 text-primary" />
            Cobro
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {campo("propinaSugerida", "Propina sugerida (%)", "number")}
            {campo("moneda", "Moneda")}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Los precios de la carta ya incluyen IVA. El ticket sólo muestra su desglose.
          </p>

          <div className="mt-6 space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Imprimir ticket automáticamente</p>
                <p className="text-xs text-muted-foreground">Al cobrar en caja 1</p>
              </div>
              <Switch checked={imprimir} onCheckedChange={setImprimir} />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Alertas de inventario bajo</p>
                <p className="text-xs text-muted-foreground">
                  Avisar cuando un insumo llegue al mínimo
                </p>
              </div>
              <Switch checked={alertas} onCheckedChange={setAlertas} />
            </div>
          </div>
        </section>

        <section className="surface p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Mi acceso</h2>
          <DoodleTrazo className="mt-1 h-1.5 w-16 text-primary" />
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Cambia únicamente tu propio código. Al guardarlo se cerrará tu sesión y podrás entrar
            con el nuevo.
          </p>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              cambioCodigo.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="codigo-actual">Código actual</Label>
              <Input
                id="codigo-actual"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={6}
                value={codigoActual}
                onChange={(event) => setCodigoActual(codigo(event.target.value))}
                placeholder="••••••"
                className="font-display tracking-[0.3em]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-codigo">Nuevo código</Label>
              <Input
                id="nuevo-codigo"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={nuevoCodigo}
                onChange={(event) => setNuevoCodigo(codigo(event.target.value))}
                placeholder="6 dígitos"
                className="font-display tracking-[0.3em]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar-codigo">Confirmar nuevo código</Label>
              <Input
                id="confirmar-codigo"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={confirmarCodigo}
                onChange={(event) => setConfirmarCodigo(codigo(event.target.value))}
                placeholder="Repite el código"
                className="font-display tracking-[0.3em]"
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" variant="outline" disabled={cambioCodigo.isPending}>
                {cambioCodigo.isPending ? "Actualizando…" : "Cambiar mi código"}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          onClick={() => guardarConfiguracion.mutate()}
          disabled={
            !enLinea ||
            cargandoLocal ||
            cargandoConfiguracion ||
            !terminalAutorizada ||
            !formSucio ||
            guardarConfiguracion.isPending
          }
        >
          {guardarConfiguracion.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button
          variant="outline"
          disabled={cargandoConfiguracion || guardarConfiguracion.isPending}
          onClick={() => {
            setForm(negocio);
            setFormSucio(false);
          }}
        >
          Descartar
        </Button>
        {cargandoConfiguracion ? (
          <p className="self-center text-sm text-muted-foreground">
            Recuperando los datos guardados…
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
