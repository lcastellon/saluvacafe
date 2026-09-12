import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Printer } from "lucide-react";
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
import { mxnExacto } from "@/data/saluva";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useCajaTurno } from "@/lib/caja-turno";
import { useTienda } from "@/lib/tienda";

type TipoPeriodo = "diario" | "semanal" | "mensual" | "personalizado";
type FormaPago = "Efectivo" | "Tarjeta" | "Transferencia";
type TipoOrden = "A mesa" | "Para llevar" | "Para recoger";

type ResumenFormaPago = {
  operaciones: number;
  ventas: number;
  propinas: number;
};

type ResumenPeriodo = {
  ventaTotal: number;
  ventaNeta: number;
  impuestos: number;
  propinas: number;
  ingresosTotales: number;
  fondoInicial: number;
  efectivoContado: number;
  saldoFinalEstimado: number;
  efectivoTotalEstimado: number;
  diferenciaEfectivo: number;
  formas: Record<FormaPago, ResumenFormaPago>;
  tiposOrden: Record<TipoOrden, { operaciones: number; ventas: number }>;
  cuentasIniciadas: number;
  cuentasCerradas: number;
  cuentasPendientes: number;
  comensales: number;
  cuentaPromedio: number;
};

type Periodo = {
  inicio: Date;
  fin: Date;
  etiqueta: string;
};

const formasPago: FormaPago[] = ["Efectivo", "Tarjeta", "Transferencia"];
const tiposOrden: TipoOrden[] = ["Para llevar", "A mesa", "Para recoger"];
const nombrePeriodo: Record<TipoPeriodo, string> = {
  diario: "del día",
  semanal: "semanal",
  mensual: "mensual",
  personalizado: "personalizado",
};

function fechaLocalActual() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function fechaDesdeTexto(valor: string) {
  const partes = valor.split("-").map(Number);
  if (partes.length !== 3 || partes.some((parte) => !Number.isFinite(parte))) return null;

  const [anio = 0, mes = 0, dia = 0] = partes;
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return null;
  }
  return fecha;
}

function calcularPeriodo(fecha: string, tipo: TipoPeriodo, fechaHasta: string): Periodo | null {
  const referencia = fechaDesdeTexto(fecha);
  if (!referencia) return null;

  let inicio: Date;
  let fin: Date;

  if (tipo === "diario") {
    inicio = new Date(referencia);
    fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);
  } else if (tipo === "semanal") {
    inicio = new Date(referencia);
    const desplazamiento = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - desplazamiento);
    inicio.setHours(0, 0, 0, 0);
    fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);
  } else if (tipo === "mensual") {
    inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
    fin = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 1);
  } else {
    const ultimoDiaSolicitado = fechaDesdeTexto(fechaHasta);
    if (!ultimoDiaSolicitado || ultimoDiaSolicitado < referencia) return null;
    inicio = new Date(referencia);
    fin = new Date(ultimoDiaSolicitado);
    fin.setDate(fin.getDate() + 1);
  }

  const ultimoDia = new Date(fin);
  ultimoDia.setDate(ultimoDia.getDate() - 1);
  const formato = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    inicio,
    fin,
    etiqueta:
      tipo === "diario"
        ? formato.format(inicio)
        : `${formato.format(inicio)} al ${formato.format(ultimoDia)}`,
  };
}

function objeto(valor: Json | undefined): Record<string, Json | undefined> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  return valor as Record<string, Json | undefined>;
}

function numero(valor: Json | undefined) {
  const resultado = Number(valor ?? 0);
  return Number.isFinite(resultado) ? resultado : 0;
}

function leerResumen(data: Json): ResumenPeriodo {
  const raiz = objeto(data);
  const formas = objeto(raiz["formas"]);
  const ordenes = objeto(raiz["tiposOrden"]);

  const leerForma = (nombre: FormaPago): ResumenFormaPago => {
    const forma = objeto(formas[nombre]);
    return {
      operaciones: numero(forma["operaciones"]),
      ventas: numero(forma["ventas"]),
      propinas: numero(forma["propinas"]),
    };
  };
  const leerOrden = (nombre: TipoOrden) => {
    const orden = objeto(ordenes[nombre]);
    return {
      operaciones: numero(orden["operaciones"]),
      ventas: numero(orden["ventas"]),
    };
  };

  return {
    ventaTotal: numero(raiz["ventaTotal"]),
    ventaNeta: numero(raiz["ventaNeta"]),
    impuestos: numero(raiz["impuestos"]),
    propinas: numero(raiz["propinas"]),
    ingresosTotales: numero(raiz["ingresosTotales"]),
    fondoInicial: numero(raiz["fondoInicial"]),
    efectivoContado: numero(raiz["efectivoContado"]),
    saldoFinalEstimado: numero(raiz["saldoFinalEstimado"]),
    efectivoTotalEstimado: numero(raiz["efectivoTotalEstimado"]),
    diferenciaEfectivo: numero(raiz["diferenciaEfectivo"]),
    formas: {
      Efectivo: leerForma("Efectivo"),
      Tarjeta: leerForma("Tarjeta"),
      Transferencia: leerForma("Transferencia"),
    },
    tiposOrden: {
      "A mesa": leerOrden("A mesa"),
      "Para llevar": leerOrden("Para llevar"),
      "Para recoger": leerOrden("Para recoger"),
    },
    cuentasIniciadas: numero(raiz["cuentasIniciadas"]),
    cuentasCerradas: numero(raiz["cuentasCerradas"]),
    cuentasPendientes: numero(raiz["cuentasPendientes"]),
    comensales: numero(raiz["comensales"]),
    cuentaPromedio: numero(raiz["cuentaPromedio"]),
  };
}

function FilaDinero({
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

function TicketReportePeriodo({
  resumen,
  tipo,
  periodo,
  sucursal,
  direccion,
}: {
  resumen: ResumenPeriodo;
  tipo: TipoPeriodo;
  periodo: Periodo;
  sucursal: string;
  direccion: string;
}) {
  const operaciones = formasPago.reduce(
    (total, forma) => total + resumen.formas[forma].operaciones,
    0,
  );

  return (
    <div className="font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="text-lg font-bold uppercase">Salúva</p>
        <p className="font-bold">{sucursal}</p>
        {direccion ? <p>{direccion}</p> : null}
        <p className="mt-3 border-y border-dashed border-black py-2 text-sm font-bold uppercase tracking-[0.1em]">
          Corte {nombrePeriodo[tipo]}
        </p>
        <p className="mt-2">{periodo.etiqueta}</p>
      </div>

      <section className="mt-3 border-t border-dashed border-black pt-2">
        <p className="mb-2 text-center font-bold uppercase">Resumen</p>
        <div className="space-y-1">
          <FilaDinero etiqueta="Venta total" valor={resumen.ventaTotal} />
          <FilaDinero etiqueta="Venta neta" valor={resumen.ventaNeta} />
          <FilaDinero etiqueta="Impuestos" valor={resumen.impuestos} />
          <FilaDinero etiqueta="Propinas" valor={resumen.propinas} />
          <FilaDinero etiqueta="Ingresos totales" valor={resumen.ingresosTotales} fuerte />
        </div>
      </section>

      <section className="mt-3 border-t border-dashed border-black pt-2">
        <p className="mb-2 text-center font-bold uppercase">Desglose del periodo</p>
        <div className="space-y-1">
          <FilaDinero etiqueta="Fondos iniciales" valor={resumen.fondoInicial} />
          <FilaDinero etiqueta="Ventas efectivo" valor={resumen.formas.Efectivo.ventas} />
          <FilaDinero etiqueta="Propinas efectivo" valor={resumen.formas.Efectivo.propinas} />
          <FilaDinero etiqueta="Ventas tarjetas" valor={resumen.formas.Tarjeta.ventas} />
          <FilaDinero etiqueta="Propinas tarjetas" valor={resumen.formas.Tarjeta.propinas} />
          <FilaDinero
            etiqueta="Ventas transferencias"
            valor={resumen.formas.Transferencia.ventas}
          />
          <FilaDinero
            etiqueta="Propinas transferencias"
            valor={resumen.formas.Transferencia.propinas}
          />
          <FilaDinero etiqueta="Saldo final estimado" valor={resumen.saldoFinalEstimado} />
          <FilaDinero
            etiqueta="Efectivo total estimado"
            valor={resumen.efectivoTotalEstimado}
            fuerte
          />
          <FilaDinero etiqueta="Efectivo contado" valor={resumen.efectivoContado} />
          <FilaDinero etiqueta="Diferencia" valor={resumen.diferenciaEfectivo} fuerte />
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
          {formasPago.map((forma) => (
            <div key={forma} className="grid grid-cols-[1fr_auto_auto] gap-2">
              <span>{forma}</span>
              <span>{resumen.formas[forma].operaciones}</span>
              <span className="text-right">{mxnExacto(resumen.formas[forma].ventas)}</span>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-t border-black pt-1 font-bold">
            <span>Total</span>
            <span>{operaciones}</span>
            <span className="text-right">{mxnExacto(resumen.ventaTotal)}</span>
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
          {tiposOrden.map((tipoOrden) => (
            <div key={tipoOrden} className="grid grid-cols-[1fr_auto_auto] gap-2">
              <span>{tipoOrden}</span>
              <span>{resumen.tiposOrden[tipoOrden].operaciones}</span>
              <span className="text-right">{mxnExacto(resumen.tiposOrden[tipoOrden].ventas)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 border-t border-dashed border-black pt-2">
        <p className="mb-2 text-center font-bold uppercase">Estadísticas</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-3">
            <span>Cuentas iniciadas</span>
            <span>{resumen.cuentasIniciadas}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Cuentas cerradas</span>
            <span>{resumen.cuentasCerradas}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Cuentas pendientes</span>
            <span>{resumen.cuentasPendientes}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Comensales</span>
            <span>{resumen.comensales}</span>
          </div>
          <FilaDinero etiqueta="Cuenta promedio" valor={resumen.cuentaPromedio} fuerte />
        </div>
      </section>

      <p className="mt-5 border-t border-dashed border-black pt-3 text-center">Fin del corte</p>
    </div>
  );
}

export function ReporteCajaPeriodico() {
  const { sucursales } = useCajaTurno();
  const { enLinea, pendientesSincronizar, sincronizarAhora } = useTienda();
  const [tipo, setTipo] = useState<TipoPeriodo>("diario");
  const [fecha, setFecha] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [vistaPrevia, setVistaPrevia] = useState(false);

  useEffect(() => {
    const hoy = fechaLocalActual();
    setFecha(hoy);
    setFechaHasta(hoy);
  }, []);

  const periodo = useMemo(
    () => calcularPeriodo(fecha, tipo, fechaHasta),
    [fecha, fechaHasta, tipo],
  );
  const sucursal = sucursales.find((item) => item.id === sucursalId);
  const nombreSucursal = sucursal?.nombre ?? "Todas las sucursales";
  const direccionSucursal = sucursal?.direccion ?? "";

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["reporte-periodo-pos", tipo, fecha, fechaHasta, sucursalId],
    enabled: Boolean(periodo && enLinea && pendientesSincronizar === 0),
    retry: false,
    queryFn: async () => {
      if (!periodo) throw new Error("Selecciona una fecha válida");
      const { data: respuesta, error: errorRpc } = await supabase.rpc("reporte_periodo_pos", {
        p_desde: periodo.inicio.toISOString(),
        p_hasta: periodo.fin.toISOString(),
        ...(sucursalId ? { p_sucursal_id: sucursalId } : {}),
      });
      if (errorRpc) throw errorRpc;
      return leerResumen(respuesta);
    },
  });

  const mensajeError = error instanceof Error ? error.message : "No fue posible generar el corte";

  return (
    <>
      <section className="surface grain-top mb-4 overflow-hidden p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="max-w-xl">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="h-5 w-5 text-primary" /> Cortes imprimibles
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta lo que llevas hoy o genera un resumen por semana, mes o rango de fechas.
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-lg border border-border bg-cream p-1 sm:grid-cols-4">
            <Button
              type="button"
              size="sm"
              variant={tipo === "diario" ? "default" : "ghost"}
              onClick={() => {
                const hoy = fechaLocalActual();
                setFecha(hoy);
                setFechaHasta(hoy);
                setTipo("diario");
              }}
            >
              Hoy
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tipo === "semanal" ? "default" : "ghost"}
              onClick={() => setTipo("semanal")}
            >
              Semana
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tipo === "mensual" ? "default" : "ghost"}
              onClick={() => setTipo("mensual")}
            >
              Mes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tipo === "personalizado" ? "default" : "ghost"}
              onClick={() => setTipo("personalizado")}
            >
              Fechas
            </Button>
          </div>
        </div>

        <div
          className={
            tipo === "personalizado"
              ? "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end"
              : tipo === "diario"
                ? "mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
                : "mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
          }
        >
          {tipo !== "diario" ? (
            <div className="grid gap-2">
              <Label htmlFor="fecha-corte-periodico">
                {tipo === "personalizado" ? "Desde" : "Fecha dentro del periodo"}
              </Label>
              <Input
                id="fecha-corte-periodico"
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
              />
            </div>
          ) : null}
          {tipo === "personalizado" ? (
            <div className="grid gap-2">
              <Label htmlFor="fecha-hasta-corte-periodico">Hasta</Label>
              <Input
                id="fecha-hasta-corte-periodico"
                type="date"
                value={fechaHasta}
                onChange={(evento) => setFechaHasta(evento.target.value)}
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="sucursal-corte-periodico">Sucursal</Label>
            <select
              id="sucursal-corte-periodico"
              value={sucursalId}
              onChange={(evento) => setSucursalId(evento.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={() => setVistaPrevia(true)}
            disabled={!data || isLoading || isFetching || !enLinea || pendientesSincronizar > 0}
          >
            <Printer className="mr-1.5 h-4 w-4" /> Vista previa
          </Button>
        </div>

        {periodo ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {tipo === "diario"
              ? "Hoy"
              : tipo === "semanal"
                ? "Semana"
                : tipo === "mensual"
                  ? "Mes"
                  : "Periodo"}
            : {periodo.etiqueta} · {nombreSucursal}
          </p>
        ) : fecha && fechaHasta && tipo === "personalizado" ? (
          <p className="mt-3 text-sm text-destructive">
            La fecha final debe ser igual o posterior a la fecha inicial.
          </p>
        ) : null}

        {!enLinea ? (
          <p className="mt-4 rounded-lg border border-border bg-cream px-3 py-2 text-sm text-muted-foreground">
            Conéctate a Internet para calcular el corte seleccionado.
          </p>
        ) : null}
        {enLinea && pendientesSincronizar > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
            <span>
              Sincroniza {pendientesSincronizar} venta
              {pendientesSincronizar === 1 ? "" : "s"} pendiente
              {pendientesSincronizar === 1 ? "" : "s"} antes de generar el corte.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void sincronizarAhora()}
            >
              Sincronizar ahora
            </Button>
          </div>
        ) : null}
        {isLoading || isFetching ? (
          <p className="mt-4 text-sm text-muted-foreground">Calculando el corte…</p>
        ) : null}
        {error ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            <span>{mensajeError}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {data && !error ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs text-muted-foreground">Venta total</p>
              <p className="mt-1 font-display text-xl">{mxnExacto(data.ventaTotal)}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs text-muted-foreground">Propinas</p>
              <p className="mt-1 font-display text-xl">{mxnExacto(data.propinas)}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs text-muted-foreground">Cuentas</p>
              <p className="mt-1 font-display text-xl">{data.cuentasIniciadas}</p>
            </div>
          </div>
        ) : null}
      </section>

      <Dialog open={vistaPrevia} onOpenChange={setVistaPrevia}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vista previa del corte {nombrePeriodo[tipo]}</DialogTitle>
            <DialogDescription>
              Revisa el resumen antes de enviarlo a la impresora de tickets.
            </DialogDescription>
          </DialogHeader>
          {data && periodo ? (
            <div className="mx-auto w-full max-w-[340px] rounded-sm bg-white p-5 shadow-inner">
              <TicketReportePeriodo
                resumen={data}
                tipo={tipo}
                periodo={periodo}
                sucursal={nombreSucursal}
                direccion={direccionSucursal}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVistaPrevia(false)}>
              Cerrar
            </Button>
            <Button type="button" onClick={() => window.print()} disabled={!data || !periodo}>
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {data && periodo ? (
        <div className="preticket-print" aria-hidden="true">
          <TicketReportePeriodo
            resumen={data}
            tipo={tipo}
            periodo={periodo}
            sucursal={nombreSucursal}
            direccion={direccionSucursal}
          />
        </div>
      ) : null}
    </>
  );
}
