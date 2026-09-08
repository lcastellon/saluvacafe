import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useTienda } from "@/lib/tienda";
import { useAuth } from "@/lib/auth";
import {
  mxnExacto,
  esBebida,
  TAMANOS,
  LECHES,
  EXTRA_SHOT,
  type Categoria,
  type LineaPedido,
  type Pedido,
  type Producto,
} from "@/data/saluva";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Printer, Search, Trash2 } from "lucide-react";
import { DoodleTicket } from "@/components/doodles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/caja")({
  head: () => ({
    meta: [
      { title: "Punto de venta · Salúva" },
      {
        name: "description",
        content:
          "Cobra desde el mostrador de Salúva: arma el ticket, elige método de pago y envía el pedido a barra.",
      },
      { property: "og:title", content: "Punto de venta · Salúva" },
      {
        property: "og:description",
        content: "Caja rápida para cobrar cafés, panadería y desayunos en Salúva.",
      },
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

function DetalleTicket({
  referencia,
  fecha,
  cliente,
  atendio,
  canal,
  items,
  subtotal,
  iva,
  total,
  negocio,
  esVenta = false,
  metodoPago,
  propina = 0,
  montoRecibido = 0,
  cambio = 0,
}: {
  referencia: string;
  fecha: string;
  cliente: string;
  atendio: string;
  canal: Pedido["canal"];
  items: LineaPedido[];
  subtotal: number;
  iva: number;
  total: number;
  negocio: {
    nombre: string;
    sucursal: string;
    direccion: string;
    telefono: string;
    iva: number;
  };
  esVenta?: boolean;
  metodoPago?: Pedido["metodoPago"];
  propina?: number;
  montoRecibido?: number;
  cambio?: number;
}) {
  const fechaLocal = new Date(fecha);
  const montoCobrado = total + propina;

  return (
    <div className="font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="text-lg font-bold uppercase">{negocio.nombre}</p>
        <p>{negocio.sucursal}</p>
        <p>{negocio.direccion}</p>
        <p>{negocio.telefono}</p>
        <p className="mt-3 border-y border-dashed border-black py-2 text-sm font-bold uppercase tracking-[0.16em]">
          {esVenta ? "Ticket de venta" : "Pre-ticket"}
        </p>
      </div>

      <div className="my-3 space-y-1">
        <div className="flex justify-between gap-3">
          <span>Referencia</span>
          <span>{referencia}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Fecha</span>
          <span>{fechaLocal.toLocaleDateString("es-MX")}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Hora</span>
          <span>
            {fechaLocal.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Cliente / mesa</span>
          <span className="text-right">{cliente.trim() || "Mostrador"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Atendió</span>
          <span className="text-right">{atendio}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Servicio</span>
          <span>{canal}</span>
        </div>
      </div>

      <div className="border-y border-dashed border-black py-2">
        {items.map((item) => (
          <div key={item.lineaId ?? item.productoId} className="py-1.5">
            <div className="flex items-start justify-between gap-3">
              <span>
                {item.cantidad} × {item.nombre}
              </span>
              <span className="shrink-0">{mxnExacto(item.precio * item.cantidad)}</span>
            </div>
            {item.opciones && item.opciones.length > 0 && (
              <p className="pr-8 text-[10px] text-black/65">{item.opciones.join(" · ")}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{mxnExacto(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>IVA ({negocio.iva}%)</span>
          <span>{mxnExacto(iva)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-black pt-2 text-base font-bold">
          <span>Total consumo</span>
          <span>{mxnExacto(total)}</span>
        </div>
        {esVenta && metodoPago && (
          <div className="mt-3 space-y-1 border-t border-dashed border-black pt-3">
            <div className="flex justify-between">
              <span>Método de pago</span>
              <span>{metodoPago}</span>
            </div>
            <div className="flex justify-between">
              <span>Propina</span>
              <span>{mxnExacto(propina)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Monto cobrado</span>
              <span>{mxnExacto(montoCobrado)}</span>
            </div>
            <div className="flex justify-between">
              <span>Recibido</span>
              <span>{mxnExacto(montoRecibido)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cambio</span>
              <span>{mxnExacto(cambio)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-dashed border-black pt-3 text-center">
        <p className="font-bold">{esVenta ? "Pago registrado" : "Documento informativo"}</p>
        <p>
          {esVenta ? "No es comprobante fiscal." : "No es comprobante fiscal ni confirma el pago."}
        </p>
        <p className="mt-3">Gracias por visitar Salúva.</p>
      </div>
    </div>
  );
}

function Caja() {
  const { perfil } = useAuth();
  const { productos, crearPedido, negocio, enLinea } = useTienda();
  const [cat, setCat] = useState<(typeof categorias)[number]>("Todo");
  const [busqueda, setBusqueda] = useState("");
  const [items, setItems] = useState<LineaPedido[]>([]);
  const [cliente, setCliente] = useState("");
  const [canal, setCanal] = useState<Pedido["canal"]>("Mostrador");
  const [pago, setPago] = useState<Pedido["metodoPago"]>("Efectivo");
  const [tocado, setTocado] = useState<string | null>(null);
  const [preTicket, setPreTicket] = useState<{ referencia: string; fecha: string } | null>(null);
  const [cobroAbierto, setCobroAbierto] = useState(false);
  const [propinaTexto, setPropinaTexto] = useState("0");
  const [recibidoTexto, setRecibidoTexto] = useState("");
  const [ticketCobrado, setTicketCobrado] = useState<Pedido | null>(null);

  useEffect(() => {
    if (!enLinea) setPago("Efectivo");
  }, [enLinea]);

  // Modificadores
  const [enModificadores, setEnModificadores] = useState<Producto | null>(null);
  const [tamano, setTamano] = useState("Mediano");
  const [leche, setLeche] = useState("Entera");
  const [extraShot, setExtraShot] = useState(false);
  const [sinAzucar, setSinAzucar] = useState(false);
  const [paraLlevar, setParaLlevar] = useState(false);

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
  const propinaIngresada = Number(propinaTexto);
  const propina =
    Number.isFinite(propinaIngresada) && propinaIngresada >= 0
      ? Math.round(propinaIngresada * 100) / 100
      : 0;
  const montoCobrar = Math.round((total + propina) * 100) / 100;
  const recibidoIngresado = Number(recibidoTexto);
  const montoRecibido =
    pago === "Efectivo"
      ? Number.isFinite(recibidoIngresado) && recibidoIngresado >= 0
        ? Math.round(recibidoIngresado * 100) / 100
        : 0
      : montoCobrar;
  const cambio = Math.max(0, Math.round((montoRecibido - montoCobrar) * 100) / 100);

  const abrirModificadores = (p: Producto) => {
    setTocado(p.id);
    setTimeout(() => setTocado((current) => (current === p.id ? null : current)), 180);
    setTamano("Mediano");
    setLeche("Entera");
    setExtraShot(false);
    setSinAzucar(false);
    setParaLlevar(canal === "Para llevar");
    setEnModificadores(p);
  };

  const agregarConModificadores = () => {
    const p = enModificadores;
    if (!p) return;
    const bebida = esBebida(p.categoria);
    const extraTamano = bebida ? (TAMANOS.find((t) => t.valor === tamano)?.extra ?? 0) : 0;
    const extraLeche = bebida ? (LECHES.find((l) => l.valor === leche)?.extra ?? 0) : 0;
    const extraShotPrecio = bebida && extraShot ? EXTRA_SHOT : 0;
    const precio = Math.max(0, p.precio + extraTamano + extraLeche + extraShotPrecio);

    const opciones: string[] = [];
    if (bebida) {
      opciones.push(tamano, `Leche ${leche.toLowerCase()}`);
      if (extraShot) opciones.push("Extra shot");
      if (sinAzucar) opciones.push("Sin azúcar");
    } else if (sinAzucar) {
      opciones.push("Sin azúcar");
    }
    opciones.push(paraLlevar ? "Para llevar" : "Consumir aquí");

    const firma = `${p.id}|${opciones.join(",")}`;
    setItems((prev) => {
      const found = prev.find((i) => i.lineaId === firma);
      if (found)
        return prev.map((i) => (i.lineaId === firma ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [
        ...prev,
        { lineaId: firma, productoId: p.id, nombre: p.nombre, cantidad: 1, precio, opciones },
      ];
    });
    setEnModificadores(null);
  };

  const cambiar = (lineaId: string, delta: number) =>
    setItems((prev) =>
      prev
        .map((i) => (i.lineaId === lineaId ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0),
    );

  const abrirCobro = () => {
    if (items.length === 0) return;
    setPropinaTexto("0");
    setRecibidoTexto("");
    setCobroAbierto(true);
  };

  const confirmarCobro = () => {
    if (items.length === 0) return;
    if (!Number.isFinite(propinaIngresada) || propinaIngresada < 0) {
      toast.error("Ingresa una propina válida");
      return;
    }
    if (pago === "Efectivo" && montoRecibido < montoCobrar) {
      toast.error("El efectivo recibido no cubre el monto a cobrar", {
        description: `Faltan ${mxnExacto(montoCobrar - montoRecibido)}`,
      });
      return;
    }

    const pedido = crearPedido({
      cliente,
      canal,
      metodoPago: pago,
      items,
      propina,
      montoRecibido,
      cambio,
    });
    setPreTicket(null);
    setTicketCobrado(pedido);
    setCobroAbierto(false);
    if (enLinea) {
      toast.success(`Pedido ${pedido.folio} enviado a barra`, {
        description: `${mxnExacto(pedido.total + propina)} · ${pedido.metodoPago}`,
      });
    } else {
      toast.success(`Pedido ${pedido.folio} guardado en este dispositivo`, {
        description: `${mxnExacto(pedido.total + propina)} · Efectivo · Se sincronizará al volver Internet`,
      });
    }
    setItems([]);
    setCliente("");
  };

  useEffect(() => {
    if (!ticketCobrado) return;
    const temporizador = window.setTimeout(() => window.print(), 150);
    return () => window.clearTimeout(temporizador);
  }, [ticketCobrado]);

  const abrirPreTicket = () => {
    if (items.length === 0) return;
    const ahora = new Date();
    setPreTicket({
      referencia: `PRE-${ahora.getTime().toString().slice(-6)}`,
      fecha: ahora.toISOString(),
    });
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
                onClick={() => abrirModificadores(p)}
                className={`surface grain-top group cursor-pointer p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground active:scale-[0.98] ${tocado === p.id ? "scale-[0.97] !border-primary bg-primary/[0.10]" : ""}`}
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
            <Input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre o mesa"
            />
            <div className="grid grid-cols-3 gap-2">
              {(["Mostrador", "Para llevar", "App"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCanal(c)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                    canal === c
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {items.map((i) => (
              <li
                key={i.lineaId ?? i.productoId}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-cream px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.nombre}</p>
                  <p className="text-xs text-muted-foreground">{mxnExacto(i.precio)} c/u</p>
                  {i.opciones && i.opciones.length > 0 && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {i.opciones.join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => cambiar(i.lineaId ?? i.productoId, -1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-5 text-center text-sm font-semibold">{i.cantidad}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => cambiar(i.lineaId ?? i.productoId, 1)}
                  >
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full border-dashed"
            disabled={items.length === 0}
            onClick={abrirPreTicket}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Generar pre-ticket
          </Button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            No cobra ni registra la venta.
          </p>

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
                disabled={!enLinea && m !== "Efectivo"}
                title={!enLinea && m !== "Efectivo" ? "Este método requiere conexión" : undefined}
                className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                  pago === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {m}
              </button>
            ))}
          </div>

          {!enLinea && (
            <p className="mt-2 text-xs text-muted-foreground">
              Sin conexión: puedes cobrar en efectivo. La venta quedará guardada aquí.
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <Button className="flex-1" size="lg" disabled={items.length === 0} onClick={abrirCobro}>
              Cobrar
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={items.length === 0}
              onClick={() => setItems([])}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </aside>
      </div>

      <Dialog open={enModificadores !== null} onOpenChange={(o) => !o && setEnModificadores(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {enModificadores?.emoji} {enModificadores?.nombre}
            </DialogTitle>
            <DialogDescription>
              Elige los modificadores antes de agregarlo al ticket.
            </DialogDescription>
          </DialogHeader>

          {enModificadores && (
            <div className="grid gap-4">
              {esBebida(enModificadores.categoria) && (
                <>
                  <div className="grid gap-1.5">
                    <Label>Tamaño</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {TAMANOS.map((t) => (
                        <button
                          key={t.valor}
                          type="button"
                          onClick={() => setTamano(t.valor)}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                            tamano === t.valor
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-card"
                          }`}
                        >
                          {t.valor}
                          {t.extra !== 0 && (
                            <span className="block text-[10px] opacity-70">
                              {t.extra > 0 ? "+" : ""}
                              {t.extra}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Tipo de leche</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {LECHES.map((l) => (
                        <button
                          key={l.valor}
                          type="button"
                          onClick={() => setLeche(l.valor)}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                            leche === l.valor
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-card"
                          }`}
                        >
                          {l.valor}
                          {l.extra > 0 && (
                            <span className="block text-[10px] opacity-70">+{l.extra}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <Label htmlFor="extra-shot">Extra shot (+{EXTRA_SHOT})</Label>
                    <Switch id="extra-shot" checked={extraShot} onCheckedChange={setExtraShot} />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <Label htmlFor="sin-azucar">Sin azúcar</Label>
                <Switch id="sin-azucar" checked={sinAzucar} onCheckedChange={setSinAzucar} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {([false, true] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setParaLlevar(v)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                      paraLlevar === v
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card"
                    }`}
                  >
                    {v ? "Para llevar" : "Consumir aquí"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnModificadores(null)}>
              Cancelar
            </Button>
            <Button onClick={agregarConModificadores}>Agregar al ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cobroAbierto} onOpenChange={setCobroAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar cobro</DialogTitle>
            <DialogDescription>
              Revisa el pago. Al confirmar se registrará la venta y se abrirá la impresión del
              ticket.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-xl bg-cream p-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Consumo</span>
                <span>{mxnExacto(total)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span>Método de pago</span>
                <span className="font-semibold">{pago}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="propina">Propina</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setPropinaTexto("0")}>
                  Sin propina
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPropinaTexto((Math.round(total * negocio.propinaSugerida) / 100).toFixed(2))
                  }
                >
                  Sugerida {negocio.propinaSugerida}%
                </Button>
              </div>
              <Input
                id="propina"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={propinaTexto}
                onChange={(evento) => setPropinaTexto(evento.target.value)}
                placeholder="0.00"
              />
            </div>

            {pago === "Efectivo" && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="monto-recibido">Efectivo recibido</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecibidoTexto(montoCobrar.toFixed(2))}
                  >
                    Monto exacto
                  </Button>
                </div>
                <Input
                  id="monto-recibido"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={recibidoTexto}
                  onChange={(evento) => setRecibidoTexto(evento.target.value)}
                  placeholder={montoCobrar.toFixed(2)}
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between font-display text-xl font-bold">
                <span>Monto a cobrar</span>
                <span>{mxnExacto(montoCobrar)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cambio</span>
                <span className="font-semibold">{mxnExacto(cambio)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCobroAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarCobro}>
              <Printer className="mr-1.5 h-4 w-4" />
              Confirmar e imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={preTicket !== null} onOpenChange={(abierto) => !abierto && setPreTicket(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vista previa del pre-ticket</DialogTitle>
            <DialogDescription>
              Revisa el consumo antes de imprimirlo. El pedido todavía no se cobrará.
            </DialogDescription>
          </DialogHeader>

          {preTicket && (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-white p-5 shadow-inner">
              <DetalleTicket
                referencia={preTicket.referencia}
                fecha={preTicket.fecha}
                cliente={cliente}
                atendio={perfil?.nombre ?? "Personal Salúva"}
                canal={canal}
                items={items}
                subtotal={subtotal}
                iva={iva}
                total={total}
                negocio={negocio}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreTicket(null)}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {preTicket && (
        <div className="preticket-print">
          <DetalleTicket
            referencia={preTicket.referencia}
            fecha={preTicket.fecha}
            cliente={cliente}
            atendio={perfil?.nombre ?? "Personal Salúva"}
            canal={canal}
            items={items}
            subtotal={subtotal}
            iva={iva}
            total={total}
            negocio={negocio}
          />
        </div>
      )}

      <Dialog
        open={ticketCobrado !== null}
        onOpenChange={(abierto) => !abierto && setTicketCobrado(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Venta cobrada</DialogTitle>
            <DialogDescription>
              El ticket se envió a impresión. Puedes revisarlo o imprimirlo de nuevo.
            </DialogDescription>
          </DialogHeader>

          {ticketCobrado && (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-white p-5 shadow-inner">
              <DetalleTicket
                referencia={ticketCobrado.folio}
                fecha={ticketCobrado.creadoEn}
                cliente={ticketCobrado.cliente}
                atendio={perfil?.nombre ?? "Personal Salúva"}
                canal={ticketCobrado.canal}
                items={ticketCobrado.items}
                subtotal={ticketCobrado.subtotal}
                iva={ticketCobrado.iva}
                total={ticketCobrado.total}
                negocio={negocio}
                esVenta
                metodoPago={ticketCobrado.metodoPago}
                propina={ticketCobrado.propina}
                montoRecibido={ticketCobrado.montoRecibido}
                cambio={ticketCobrado.cambio}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTicketCobrado(null)}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" />
              Reimprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ticketCobrado && (
        <div className="preticket-print">
          <DetalleTicket
            referencia={ticketCobrado.folio}
            fecha={ticketCobrado.creadoEn}
            cliente={ticketCobrado.cliente}
            atendio={perfil?.nombre ?? "Personal Salúva"}
            canal={ticketCobrado.canal}
            items={ticketCobrado.items}
            subtotal={ticketCobrado.subtotal}
            iva={ticketCobrado.iva}
            total={ticketCobrado.total}
            negocio={negocio}
            esVenta
            metodoPago={ticketCobrado.metodoPago}
            propina={ticketCobrado.propina}
            montoRecibido={ticketCobrado.montoRecibido}
            cambio={ticketCobrado.cambio}
          />
        </div>
      )}
    </AppShell>
  );
}
