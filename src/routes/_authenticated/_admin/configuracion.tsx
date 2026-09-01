import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DoodleBolsa, DoodleTicket } from "@/components/doodles";
import { useTienda } from "@/lib/tienda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración del negocio · Salúva" },
      {
        name: "description",
        content: "Datos de la sucursal, impuestos, propina sugerida y preferencias de operación de la cafetería Salúva.",
      },
      { property: "og:title", content: "Configuración del negocio · Salúva" },
      { property: "og:description", content: "Ajusta sucursal, horario, IVA y propina sugerida de Salúva." },
    ],
  }),
  component: Configuracion,
});

function Configuracion() {
  const { negocio, setNegocio } = useTienda();
  const [form, setForm] = useState(negocio);
  const [imprimir, setImprimir] = useState(true);
  const [alertas, setAlertas] = useState(true);

  const campo = (k: keyof typeof form, label: string, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        type={type}
        value={String(form[k])}
        onChange={(e) => setForm({ ...form, [k]: type === "number" ? Number(e.target.value) : e.target.value })}
      />
    </div>
  );

  return (
    <AppShell titulo="Configuración" descripcion="Datos del negocio y preferencias de operación">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><DoodleBolsa className="h-5 w-5 text-primary" />Datos de la sucursal</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {campo("nombre", "Nombre comercial")}
            {campo("sucursal", "Sucursal")}
            <div className="sm:col-span-2">{campo("direccion", "Dirección")}</div>
            {campo("telefono", "Teléfono")}
            {campo("horario", "Horario")}
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><DoodleTicket className="h-5 w-5 text-primary" />Cobro</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {campo("iva", "IVA (%)", "number")}
            {campo("propinaSugerida", "Propina sugerida (%)", "number")}
            {campo("moneda", "Moneda")}
          </div>

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
                <p className="text-xs text-muted-foreground">Avisar cuando un insumo llegue al mínimo</p>
              </div>
              <Switch checked={alertas} onCheckedChange={setAlertas} />
            </div>
          </div>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setNegocio(form);
            toast.success("Configuración guardada");
          }}
        >
          Guardar cambios
        </Button>
        <Button variant="outline" onClick={() => setForm(negocio)}>
          Descartar
        </Button>
      </div>
    </AppShell>
  );
}
