import { useEffect, useState, type FormEvent } from "react";
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
import { useCajaTurno, type CajaActual } from "@/lib/caja-turno";
import { useTienda } from "@/lib/tienda";
import { mxnExacto, type Pedido } from "@/data/saluva";
import {
  Clock3,
  Laptop,
  LockKeyhole,
  Printer,
  RefreshCw,
  Store,
  UnlockKeyhole,
} from "lucide-react";
import { toast } from "sonner";

function fechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function horaCorta(fecha: string) {
  return new Date(fecha).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const redondear = (valor: number) => Math.round(valor * 100) / 100;

type ResumenFormaPago = {
  operaciones: number;
  ventas: number;
  propinas: number;
};

type CorteCaja = {
  sucursal: string;
  direccion: string;
  terminal: string;
  abiertoEn: string;
  cerradoEn: string;
  abiertoPor: string;
  cerradoPor: string;
  fondoInicial: number;
  efectivoContado: number;
  notas: string;
  ventaTotal: number;
  ventaNeta: number;
  impuestos: number;
  propinas: number;
  ingresosTotales: number;
  saldoFinalEstimado: number;
  efectivoTotalEstimado: number;
  diferenciaEfectivo: number;
  formas: Record<Pedido["metodoPago"], ResumenFormaPago>;
  tiposOrden: Record<Pedido["canal"], { operaciones: number; ventas: number }>;
  cuentasIniciadas: number;
  cuentasCerradas: number;
  cuentasPendientes: number;
  comensales: number;
  cuentaPromedio: number;
};

function crearCorte({
  caja,
  pedidos,
  direccion,
  efectivoContado,
  notas,
  cerradoPor,
}: {
  caja: CajaActual;
  pedidos: Pedido[];
  direccion: string;
  efectivoContado: number;
  notas: string;
  cerradoPor: string;
}): CorteCaja {
  const formas: CorteCaja["formas"] = {
    Efectivo: { operaciones: 0, ventas: 0, propinas: 0 },
    Tarjeta: { operaciones: 0, ventas: 0, propinas: 0 },
    Transferencia: { operaciones: 0, ventas: 0, propinas: 0 },
  };
  const tiposOrden: CorteCaja["tiposOrden"] = {
    "Para llevar": { operaciones: 0, ventas: 0 },
    "A mesa": { operaciones: 0, ventas: 0 },
    "Para recoger": { operaciones: 0, ventas: 0 },
  };
  const ventasDeCaja = pedidos.filter((pedido) => pedido.cajaId === caja.id);

  for (const pedido of ventasDeCaja) {
    const forma = formas[pedido.metodoPago];
    forma.operaciones += 1;
    forma.ventas += pedido.total;
    forma.propinas += pedido.propina ?? 0;
    const tipo = tiposOrden[pedido.canal];
    tipo.operaciones += 1;
    tipo.ventas += pedido.total;
  }

  const ventaNeta = redondear(ventasDeCaja.reduce((total, pedido) => total + pedido.subtotal, 0));
  const impuestos = redondear(ventasDeCaja.reduce((total, pedido) => total + pedido.iva, 0));
  const ventaTotal = redondear(ventasDeCaja.reduce((total, pedido) => total + pedido.total, 0));
  const propinas = redondear(
    ventasDeCaja.reduce((total, pedido) => total + (pedido.propina ?? 0), 0),
  );
  const ingresosTotales = redondear(ventaTotal + propinas);
  const efectivoTotalEstimado = redondear(
    caja.fondoInicial + formas.Efectivo.ventas + formas.Efectivo.propinas,
  );

  for (const forma of Object.values(formas)) {
    forma.ventas = redondear(forma.ventas);
    forma.propinas = redondear(forma.propinas);
  }
  for (const tipo of Object.values(tiposOrden)) tipo.ventas = redondear(tipo.ventas);
  const cuentasIniciadas = ventasDeCaja.length;
  const cuentasCerradas = ventasDeCaja.filter((pedido) => pedido.estado === "Entregado").length;
  const comensales = ventasDeCaja.reduce((total, pedido) => total + (pedido.comensales ?? 1), 0);

  return {
    sucursal: caja.sucursalNombre,
    direccion,
    terminal: caja.terminalNombre,
    abiertoEn: caja.abiertoEn,
    cerradoEn: new Date().toISOString(),
    abiertoPor: caja.abiertoPorNombre,
    cerradoPor,
    fondoInicial: caja.fondoInicial,
    efectivoContado,
    notas: notas.trim(),
    ventaTotal,
    ventaNeta,
    impuestos,
    propinas,
    ingresosTotales,
    saldoFinalEstimado: redondear(caja.fondoInicial + ingresosTotales),
    efectivoTotalEstimado,
    diferenciaEfectivo: redondear(efectivoContado - efectivoTotalEstimado),
    formas,
    tiposOrden,
    cuentasIniciadas,
    cuentasCerradas,
    cuentasPendientes: cuentasIniciadas - cuentasCerradas,
    comensales,
    cuentaPromedio: cuentasIniciadas > 0 ? redondear(ventaTotal / cuentasIniciadas) : 0,
  };
}

function FilaCorte({
  etiqueta,
  valor,
  fuerte = false,
}: {
  etiqueta: string;
  valor: number;
  fuerte?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${fuerte ? "font-bold" : ""}`}>
      <span>{etiqueta}</span>
      <span className="shrink-0">{mxnExacto(valor)}</span>
    </div>
  );
}

function TicketCorteCaja({ corte }: { corte: CorteCaja }) {
  const formas: { nombre: string; resumen: ResumenFormaPago }[] = [
    { nombre: "Efectivo", resumen: corte.formas.Efectivo },
    { nombre: "Tarjetas", resumen: corte.formas.Tarjeta },
    { nombre: "Transferencias", resumen: corte.formas.Transferencia },
  ];
  const totalOperaciones = formas.reduce((total, forma) => total + forma.resumen.operaciones, 0);
  const tiposOrden: { nombre: string; resumen: { operaciones: number; ventas: number } }[] = [
    { nombre: "Para llevar", resumen: corte.tiposOrden["Para llevar"] },
    { nombre: "A mesa", resumen: corte.tiposOrden["A mesa"] },
    { nombre: "Para recoger", resumen: corte.tiposOrden["Para recoger"] },
  ];

  return (
    <div className="font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="text-lg font-bold uppercase">Salúva</p>
        <p className="font-bold">{corte.sucursal}</p>
        {corte.direccion ? <p>{corte.direccion}</p> : null}
        <p className="mt-3 border-y border-dashed border-black py-2 text-sm font-bold uppercase tracking-[0.14em]">
          Corte de caja
        </p>
      </div>

      <div className="my-3 space-y-1">
        <div className="flex justify-between gap-3">
          <span>Periodo</span>
          <span className="text-right">
            {horaCorta(corte.abiertoEn)} a {horaCorta(corte.cerradoEn)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Fecha</span>
          <span>{new Date(corte.cerradoEn).toLocaleDateString("es-MX")}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Terminal</span>
          <span className="text-right">{corte.terminal}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Abrió</span>
          <span className="text-right">{corte.abiertoPor}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Cerró</span>
          <span className="text-right">{corte.cerradoPor}</span>
        </div>
      </div>

      <section className="border-t border-dashed border-black pt-2">
        <p className="mb-2 text-center font-bold uppercase">Resumen</p>
        <div className="space-y-1">
          <FilaCorte etiqueta="Venta total" valor={corte.ventaTotal} />
          <FilaCorte etiqueta="Venta neta" valor={corte.ventaNeta} />
          <FilaCorte etiqueta="Impuestos" valor={corte.impuestos} />
          <FilaCorte etiqueta="Propinas" valor={corte.propinas} />
          <FilaCorte etiqueta="Ingresos totales" valor={corte.ingresosTotales} fuerte />
        </div>
      </section>

      <section className="mt-3 border-t border-dashed border-black pt-2">
        <p className="mb-2 text-center font-bold uppercase">Desglose del cierre</p>
        <div className="space-y-1">
          <FilaCorte etiqueta="Efectivo inicial" valor={corte.fondoInicial} />
          <FilaCorte etiqueta="Ventas efectivo" valor={corte.formas.Efectivo.ventas} />
          <FilaCorte etiqueta="Propinas efectivo" valor={corte.formas.Efectivo.propinas} />
          <FilaCorte etiqueta="Ventas tarjetas" valor={corte.formas.Tarjeta.ventas} />
          <FilaCorte etiqueta="Propinas tarjetas" valor={corte.formas.Tarjeta.propinas} />
          <FilaCorte etiqueta="Ventas transferencias" valor={corte.formas.Transferencia.ventas} />
          <FilaCorte
            etiqueta="Propinas transferencias"
            valor={corte.formas.Transferencia.propinas}
          />
          <FilaCorte etiqueta="Saldo final estimado" valor={corte.saldoFinalEstimado} />
          <FilaCorte
            etiqueta="Efectivo total estimado"
            valor={corte.efectivoTotalEstimado}
            fuerte
          />
          <FilaCorte etiqueta="Efectivo contado" valor={corte.efectivoContado} />
          <FilaCorte etiqueta="Diferencia" valor={corte.diferenciaEfectivo} fuerte />
        </div>
      </section>

      <section className="mt-3 border-t border-dashed border-black pt-2">
        <p className="mb-2 text-center font-bold uppercase">Forma de pago de ventas</p>
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] uppercase">
            <span>Forma</span>
            <span>Cant.</span>
            <span className="text-right">Importe</span>
          </div>
          {formas.map((forma) => (
            <div key={forma.nombre} className="grid grid-cols-[1fr_auto_auto] gap-2">
              <span>{forma.nombre}</span>
              <span>{forma.resumen.operaciones}</span>
              <span className="text-right">{mxnExacto(forma.resumen.ventas)}</span>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-t border-black pt-1 font-bold">
            <span>Total</span>
            <span>{totalOperaciones}</span>
            <span className="text-right">{mxnExacto(corte.ventaTotal)}</span>
          </div>
        </div>
      </section>

      <section className="mt-3 border-t border-dashed border-black pt-2">
        <p className="mb-2 text-center font-bold uppercase">Tipos de orden</p>
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] uppercase">
            <span>Tipo</span>
            <span>Cant.</span>
            <span className="text-right">Importe</span>
          </div>
          {tiposOrden.map((tipo) => (
            <div key={tipo.nombre} className="grid grid-cols-[1fr_auto_auto] gap-2">
              <span>{tipo.nombre}</span>
              <span>{tipo.resumen.operaciones}</span>
              <span className="text-right">{mxnExacto(tipo.resumen.ventas)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 border-t border-dashed border-black pt-2">
        <p className="mb-2 text-center font-bold uppercase">Estadísticas</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-3">
            <span>Cuentas iniciadas</span>
            <span>{corte.cuentasIniciadas}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Cuentas cerradas</span>
            <span>{corte.cuentasCerradas}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Cuentas pendientes</span>
            <span>{corte.cuentasPendientes}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Comensales</span>
            <span>{corte.comensales}</span>
          </div>
          <FilaCorte etiqueta="Cuenta promedio" valor={corte.cuentaPromedio} fuerte />
        </div>
      </section>

      {corte.notas ? (
        <section className="mt-3 border-t border-dashed border-black pt-2">
          <p className="font-bold uppercase">Notas</p>
          <p className="mt-1 whitespace-pre-wrap">{corte.notas}</p>
        </section>
      ) : null}

      <p className="mt-5 border-t border-dashed border-black pt-3 text-center">
        Fin del corte de caja
      </p>
    </div>
  );
}

export function ControlCaja() {
  const { esAdmin, perfil } = useAuth();
  const { enLinea, negocio, pedidos, sincronizarAhora } = useTienda();
  const {
    cajaActual,
    terminalAutorizada,
    terminalNombre,
    terminalSucursalNombre,
    cargandoCaja,
    errorCaja,
    sucursales,
    refrescarCaja,
    crearSucursal,
    autorizarTerminal,
    abrirCaja,
    cerrarCaja,
  } = useCajaTurno();
  const [dialogo, setDialogo] = useState<
    "autorizar" | "sucursal" | "abrir" | "cerrar" | "corte" | null
  >(null);
  const [nombreTerminal, setNombreTerminal] = useState("Caja 1");
  const [sucursalId, setSucursalId] = useState("");
  const [nuevaSucursal, setNuevaSucursal] = useState("");
  const [direccionSucursal, setDireccionSucursal] = useState("");
  const [fondoInicial, setFondoInicial] = useState("0");
  const [efectivoContado, setEfectivoContado] = useState("");
  const [notas, setNotas] = useState("");
  const [corteCerrado, setCorteCerrado] = useState<CorteCaja | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!sucursalId && sucursales[0]) setSucursalId(sucursales[0].id);
  }, [sucursalId, sucursales]);

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
    if (!sucursalId) {
      toast.error("Selecciona la sucursal de esta terminal");
      return;
    }
    void ejecutar(
      () => autorizarTerminal(nombreTerminal, sucursalId),
      "Esta computadora quedó autorizada",
    );
  };

  const confirmarSucursal = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!nuevaSucursal.trim()) return;
    setGuardando(true);
    try {
      await crearSucursal(nuevaSucursal, direccionSucursal);
      setNuevaSucursal("");
      setDireccionSucursal("");
      setDialogo("autorizar");
      toast.success("Sucursal registrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible crear la sucursal");
    } finally {
      setGuardando(false);
    }
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

  const confirmarCierre = async (evento: FormEvent) => {
    evento.preventDefault();
    const efectivo = Number(efectivoContado);
    if (!Number.isFinite(efectivo) || efectivo < 0) {
      toast.error("Ingresa el efectivo contado al cierre");
      return;
    }
    if (!cajaActual) {
      toast.error("No hay una caja abierta para cerrar");
      return;
    }

    setGuardando(true);
    try {
      await sincronizarAhora();
      const efectivoRedondeado = redondear(efectivo);
      const sucursal = sucursales.find((item) => item.id === cajaActual.sucursalId);
      const corte = crearCorte({
        caja: cajaActual,
        pedidos,
        direccion: sucursal?.direccion || negocio.direccion,
        efectivoContado: efectivoRedondeado,
        notas,
        cerradoPor: perfil?.nombre ?? "Personal Salúva",
      });
      await cerrarCaja(efectivoRedondeado, notas);
      setCorteCerrado(corte);
      setDialogo("corte");
      setEfectivoContado("");
      setNotas("");
      toast.success("Caja cerrada. El corte está listo para imprimir");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cerrar la caja");
    } finally {
      setGuardando(false);
    }
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
                  Sucursal: {cajaActual.sucursalNombre} · Fondo inicial:{" "}
                  {mxnExacto(cajaActual.fondoInicial)} · Terminal: {cajaActual.terminalNombre}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Aún no se ha registrado la apertura del local para este turno.
              </p>
            )}

            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Laptop className="h-3.5 w-3.5" />
              Este dispositivo:{" "}
              {terminalAutorizada
                ? `${terminalNombre} · ${terminalSucursalNombre ?? "Sucursal asignada"}`
                : "no autorizado"}
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
                Asigna este dispositivo a la sucursal donde permanecerá físicamente.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre-terminal">Nombre de la terminal</Label>
                <Input
                  id="nombre-terminal"
                  value={nombreTerminal}
                  onChange={(evento) => setNombreTerminal(evento.target.value)}
                  maxLength={40}
                  placeholder="Ej. Caja principal"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="sucursal-terminal">Sucursal</Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setDialogo("sucursal")}
                  >
                    Agregar sucursal
                  </button>
                </div>
                <select
                  id="sucursal-terminal"
                  value={sucursalId}
                  onChange={(evento) => setSucursalId(evento.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="" disabled>
                    Selecciona una sucursal
                  </option>
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogo(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando || !nombreTerminal.trim() || !sucursalId}>
                {guardando ? "Autorizando…" : "Autorizar equipo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogo === "sucursal"}
        onOpenChange={(abierto) => !abierto && setDialogo(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={confirmarSucursal}>
            <DialogHeader>
              <DialogTitle>Registrar sucursal</DialogTitle>
              <DialogDescription>
                Sólo los administradores pueden agregar sucursales a Salúva.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nueva-sucursal">Nombre</Label>
                <Input
                  id="nueva-sucursal"
                  value={nuevaSucursal}
                  onChange={(evento) => setNuevaSucursal(evento.target.value)}
                  maxLength={60}
                  placeholder="Ej. Salúva Centro"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="direccion-sucursal">Dirección (opcional)</Label>
                <Input
                  id="direccion-sucursal"
                  value={direccionSucursal}
                  onChange={(evento) => setDireccionSucursal(evento.target.value)}
                  maxLength={160}
                  placeholder="Calle, número y colonia"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogo("autorizar")}>
                Volver
              </Button>
              <Button type="submit" disabled={guardando || !nuevaSucursal.trim()}>
                {guardando ? "Guardando…" : "Registrar sucursal"}
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

      <Dialog
        open={dialogo === "corte" && corteCerrado !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setDialogo(null);
            setCorteCerrado(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vista previa del corte de caja</DialogTitle>
            <DialogDescription>
              Revisa el resumen del turno antes de imprimirlo en la impresora de tickets.
            </DialogDescription>
          </DialogHeader>
          {corteCerrado ? (
            <div className="rounded-xl border border-border bg-white p-5 shadow-inner">
              <TicketCorteCaja corte={corteCerrado} />
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogo(null);
                setCorteCerrado(null);
              }}
            >
              Listo
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir corte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {corteCerrado ? (
        <div className="preticket-print">
          <TicketCorteCaja corte={corteCerrado} />
        </div>
      ) : null}
    </>
  );
}
