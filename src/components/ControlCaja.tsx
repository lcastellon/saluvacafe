import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useCajaTurno } from "@/lib/caja-turno";
import { useTienda } from "@/lib/tienda";
import { mxnExacto } from "@/data/saluva";
import { Clock3, Laptop, LockKeyhole, RefreshCw, Store, UnlockKeyhole } from "lucide-react";
import { toast } from "sonner";

function fechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ControlCaja() {
  const { esAdmin, perfil } = useAuth();
  const { enLinea } = useTienda();
  const {
    cajaActual,
    terminalAutorizada,
    terminalNombre,
    cargandoCaja,
    errorCaja,
    refrescarCaja,
    autorizarTerminal,
    abrirCaja,
    cerrarCaja,
  } = useCajaTurno();
  const [dialogo, setDialogo] = useState<"autorizar" | "abrir" | "cerrar" | null>(null);
  const [nombreTerminal, setNombreTerminal] = useState("Caja 1");
  const [fondoInicial, setFondoInicial] = useState("0");
  const [efectivoContado, setEfectivoContado] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const ejecutar = async (accion: () => Promise<void>, mensaje: string) => {
    setGuardando(true);
    try {
      await accion();
      setDialogo(null);
      toast.success(mensaje);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar la caja");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarAutorizacion = (evento: FormEvent) => {
    evento.preventDefault();
    void ejecutar(() => autorizarTerminal(nombreTerminal), "Esta computadora quedó autorizada");
  };

  const confirmarApertura = (evento: FormEvent) => {
    evento.preventDefault();
    const fondo = Number(fondoInicial);
    if (!Number.isFinite(fondo) || fondo < 0) {
      toast.error("Ingresa un fondo inicial válido");
      return;
    }
    void ejecutar(
      () => abrirCaja(Math.round(fondo * 100) / 100),
      `Caja abierta por ${perfil?.nombre ?? "Personal Salúva"}`,
    );
  };

  const confirmarCierre = (evento: FormEvent) => {
    evento.preventDefault();
    const efectivo = Number(efectivoContado);
    if (!Number.isFinite(efectivo) || efectivo < 0) {
      toast.error("Ingresa el efectivo contado al cierre");
      return;
    }
    void ejecutar(
      () => cerrarCaja(Math.round(efectivo * 100) / 100, notas),
      "Caja cerrada correctamente",
    );
  };

  return (
    <>
      <section className="surface grain-top mb-5 overflow-hidden p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Control de caja</h2>
              {cargandoCaja ? (
                <Badge variant="secondary">Verificando…</Badge>
              ) : cajaActual ? (
                <Badge className="bg-[#dcefe2] text-[#215c34] hover:bg-[#dcefe2]">
                  Caja abierta
                </Badge>
              ) : (
                <Badge variant="secondary">Caja cerrada</Badge>
              )}
            </div>

            {cajaActual ? (
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 shrink-0" />
                  Abrió <strong className="text-foreground">
                    {cajaActual.abiertoPorNombre}
                  </strong>{" "}
                  el {fechaHora(cajaActual.abiertoEn)}
                </p>
                <p>
                  Fondo inicial: {mxnExacto(cajaActual.fondoInicial)} · Terminal:{" "}
                  {cajaActual.terminalNombre}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Aún no se ha registrado la apertura del local para este turno.
              </p>
            )}

            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Laptop className="h-3.5 w-3.5" />
              Este dispositivo: {terminalAutorizada ? terminalNombre : "no autorizado"}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {errorCaja && (
              <Button variant="outline" onClick={() => void refrescarCaja()} disabled={!enLinea}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Reintentar
              </Button>
            )}
            {!terminalAutorizada && esAdmin && (
              <Button onClick={() => setDialogo("autorizar")} disabled={!enLinea}>
                <LockKeyhole className="mr-1.5 h-4 w-4" /> Autorizar esta computadora
              </Button>
            )}
            {terminalAutorizada && !cajaActual && (
              <Button onClick={() => setDialogo("abrir")} disabled={!enLinea || cargandoCaja}>
                <UnlockKeyhole className="mr-1.5 h-4 w-4" /> Abrir caja
              </Button>
            )}
            {terminalAutorizada && cajaActual && (
              <>
                <Button asChild variant="outline">
                  <Link to="/caja">Ir al punto de venta</Link>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDialogo("cerrar")}
                  disabled={!enLinea}
                >
                  Cerrar caja
                </Button>
              </>
            )}
          </div>
        </div>

        {errorCaja && (
          <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
            {errorCaja}
          </p>
        )}
        {!terminalAutorizada && !esAdmin && !cargandoCaja && (
          <p className="mt-4 rounded-lg border border-border bg-cream px-3 py-2 text-sm text-muted-foreground">
            Desde este dispositivo sólo puedes consultar el estado. Un administrador debe autorizar
            la computadora fija del local para abrir o cerrar caja.
          </p>
        )}
        {!enLinea && (
          <p className="mt-4 rounded-lg border border-border bg-cream px-3 py-2 text-sm text-muted-foreground">
            Sin conexión puedes continuar una caja que ya estaba abierta, pero abrirla o cerrarla
            requiere Internet.
          </p>
        )}
      </section>

      <Dialog
        open={dialogo === "autorizar"}
        onOpenChange={(abierto) => !abierto && setDialogo(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={confirmarAutorizacion}>
            <DialogHeader>
              <DialogTitle>Autorizar computadora del local</DialogTitle>
              <DialogDescription>
                Haz esto únicamente en el equipo que permanecerá físicamente en Salúva.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 grid gap-2">
              <Label htmlFor="nombre-terminal">Nombre de la terminal</Label>
              <Input
                id="nombre-terminal"
                value={nombreTerminal}
                onChange={(evento) => setNombreTerminal(evento.target.value)}
                maxLength={40}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogo(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando || !nombreTerminal.trim()}>
                {guardando ? "Autorizando…" : "Autorizar equipo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "abrir"} onOpenChange={(abierto) => !abierto && setDialogo(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={confirmarApertura}>
            <DialogHeader>
              <DialogTitle>Abrir caja</DialogTitle>
              <DialogDescription>
                La hora y el nombre de {perfil?.nombre ?? "la persona en turno"} se registrarán
                automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 grid gap-2">
              <Label htmlFor="fondo-inicial">Fondo inicial en efectivo</Label>
              <Input
                id="fondo-inicial"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={fondoInicial}
                onChange={(evento) => setFondoInicial(evento.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogo(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? "Abriendo…" : "Confirmar apertura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "cerrar"} onOpenChange={(abierto) => !abierto && setDialogo(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={confirmarCierre}>
            <DialogHeader>
              <DialogTitle>Cerrar caja</DialogTitle>
              <DialogDescription>
                Cuenta todo el efectivo disponible antes de confirmar el cierre.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="efectivo-contado">Efectivo contado</Label>
                <Input
                  id="efectivo-contado"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={efectivoContado}
                  onChange={(evento) => setEfectivoContado(evento.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notas-cierre">Notas del cierre (opcional)</Label>
                <textarea
                  id="notas-cierre"
                  value={notas}
                  onChange={(evento) => setNotas(evento.target.value)}
                  maxLength={300}
                  rows={3}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Ej. Se retiraron $500 para cambio…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogo(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={guardando}>
                {guardando ? "Cerrando…" : "Confirmar cierre"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
