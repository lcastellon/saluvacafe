import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  productos as productosSeed,
  type Comanda,
  type EstadoPedido,
  type LineaPedido,
  type Pedido,
  type Producto,
} from "@/data/saluva";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { useCajaTurno } from "@/lib/caja-turno";
import {
  cargarSnapshot,
  eliminarPendiente,
  guardarPendiente,
  guardarSnapshot,
  listarPendientes,
  type NegocioLocal,
} from "@/lib/offline-db";

type Negocio = NegocioLocal;

type Ctx = {
  productos: Producto[];
  pedidos: Pedido[];
  comandas: Comanda[];
  comandaSeleccionada: Comanda | null;
  negocio: Negocio;
  enLinea: boolean;
  cargandoLocal: boolean;
  cargandoConfiguracion: boolean;
  pendientesSincronizar: number;
  sincronizarAhora: () => Promise<void>;
  guardarNegocio: (n: Negocio) => Promise<Negocio>;
  toggleProducto: (id: string) => void;
  actualizarPrecio: (id: string, precio: number) => void;
  crearProducto: (p: Omit<Producto, "id">) => void;
  eliminarProducto: (id: string) => void;
  cambiarEstado: (id: string, estado: EstadoPedido) => void;
  cambiarEstadoComanda: (id: string, estado: EstadoPedido) => void;
  guardarComanda: (args: {
    id?: string;
    folio?: string;
    cliente: string;
    canal: Pedido["canal"];
    items: LineaPedido[];
    comensales: number;
  }) => Comanda;
  eliminarComanda: (id: string) => void;
  seleccionarComanda: (id: string) => void;
  limpiarComandaSeleccionada: () => void;
  generarFolioPedido: () => string;
  crearPedido: (args: {
    cliente: string;
    canal: Pedido["canal"];
    metodoPago: Pedido["metodoPago"];
    items: LineaPedido[];
    propina?: number;
    montoRecibido?: number;
    cambio?: number;
    comensales: number;
    folio?: string;
    estado?: EstadoPedido;
  }) => Pedido;
};

const negocioInicial: Negocio = {
  nombre: "Salúva",
  sucursal: "Salúva Centro",
  direccion: "Av. Reforma 118, Col. Juárez",
  telefono: "55 4821 0093",
  horario: "07:00 – 20:00",
  iva: 16,
  propinaSugerida: 10,
  moneda: "MXN",
};

const TiendaContext = createContext<Ctx | null>(null);

function idVenta() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `venta-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function claveFechaLocal(fecha: Date) {
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("");
}

function folioVenta(pedidos: Pedido[], creadoEn: string) {
  const fecha = new Date(creadoEn);
  const clave = claveFechaLocal(fecha);
  const prefijo = `SLV-${clave}-`;
  const claveContador = `saluva-folio-diario-${clave}`;
  const pedidosDelDia = pedidos.filter(
    (pedido) => claveFechaLocal(new Date(pedido.creadoEn)) === clave,
  );
  const ultimoNumero = pedidosDelDia.reduce((mayor, pedido) => {
    if (!pedido.folio.startsWith(prefijo)) return mayor;
    const numero = Number(pedido.folio.slice(prefijo.length));
    return Number.isInteger(numero) && numero > mayor ? numero : mayor;
  }, 0);
  let ultimoReservado = 0;
  try {
    const guardado = Number(globalThis.localStorage?.getItem(claveContador));
    if (Number.isInteger(guardado) && guardado > 0) ultimoReservado = guardado;
  } catch {
    // El historial cargado sigue permitiendo numerar aunque el navegador bloquee localStorage.
  }
  const siguiente = Math.max(pedidosDelDia.length, ultimoNumero, ultimoReservado) + 1;
  try {
    globalThis.localStorage?.setItem(claveContador, String(siguiente));
  } catch {
    // La venta y la comanda continúan aunque no sea posible guardar el contador local.
  }

  return `${prefijo}${String(siguiente).padStart(3, "0")}`;
}

function ventasDesdeNube(data: Json): Pedido[] {
  if (!Array.isArray(data)) return [];
  return (data as unknown as Pedido[]).map((pedido) => normalizarPedido(pedido, "sincronizado"));
}

function normalizarPedido(
  pedido: Pedido,
  sincronizacion: Pedido["sincronizacion"] = pedido.sincronizacion,
): Pedido {
  const canalAnterior = pedido.canal as string;
  const canal: Pedido["canal"] =
    canalAnterior === "Mostrador"
      ? "A mesa"
      : canalAnterior === "App"
        ? "Para recoger"
        : pedido.canal;
  return {
    ...pedido,
    canal,
    comensales: Math.max(1, Math.floor(Number(pedido.comensales) || 1)),
    sincronizacion,
  };
}

function normalizarComanda(comanda: Comanda): Comanda {
  const canalAnterior = comanda.canal as string;
  return {
    ...comanda,
    canal:
      canalAnterior === "Mostrador"
        ? "A mesa"
        : canalAnterior === "App"
          ? "Para recoger"
          : comanda.canal,
    comensales: Math.max(1, Math.floor(Number(comanda.comensales) || 1)),
  };
}

function comandasDesdeNube(data: Json): Comanda[] {
  if (!Array.isArray(data)) return [];
  return (data as unknown as Comanda[]).map((comanda) =>
    normalizarComanda({ ...comanda, sincronizacion: "sincronizado" }),
  );
}

type RespuestaRpc = { data: Json; error: unknown };

function ejecutarRpc(nombre: string, argumentos?: Record<string, Json>): Promise<RespuestaRpc> {
  const cliente = supabase as unknown as {
    rpc: (funcion: string, args?: Record<string, Json>) => Promise<RespuestaRpc>;
  };
  return cliente.rpc(nombre, argumentos);
}

export function TiendaProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const {
    cajaActual,
    terminalAutorizada,
    terminalSucursalId,
    cargarConfiguracionSucursal,
    guardarConfiguracionSucursal,
  } = useCajaTurno();
  const [productos, setProductos] = useState<Producto[]>(productosSeed);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [comandasEliminadas, setComandasEliminadas] = useState<string[]>([]);
  const [comandaSeleccionada, setComandaSeleccionada] = useState<Comanda | null>(null);
  const comandasRef = useRef<Comanda[]>([]);
  const comandasEliminadasRef = useRef<string[]>([]);
  const [negocio, setNegocio] = useState<Negocio>(negocioInicial);
  const [enLinea, setEnLinea] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [cargandoLocal, setCargandoLocal] = useState(true);
  const [cargandoConfiguracion, setCargandoConfiguracion] = useState(true);
  const [pendientesSincronizar, setPendientesSincronizar] = useState(0);
  const sincronizando = useRef(false);
  const solicitudConfiguracion = useRef(0);

  useEffect(() => {
    comandasRef.current = comandas;
    comandasEliminadasRef.current = comandasEliminadas;
  }, [comandas, comandasEliminadas]);

  useEffect(() => {
    let activo = true;
    void Promise.all([cargarSnapshot(), listarPendientes()])
      .then(([snapshot, pendientes]) => {
        if (!activo) return;
        if (snapshot) {
          setProductos(snapshot.productos);
          setPedidos(snapshot.pedidos.map((pedido) => normalizarPedido(pedido)));
          setComandas((snapshot.comandas ?? []).map((comanda) => normalizarComanda(comanda)));
          setComandasEliminadas(snapshot.comandasEliminadas ?? []);
          setNegocio(snapshot.negocio);
        }
        setPendientesSincronizar(pendientes.length);
      })
      .catch((error) => {
        console.warn("No fue posible cargar los datos locales", error);
      })
      .finally(() => activo && setCargandoLocal(false));
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine);
    actualizar();
    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);
    return () => {
      window.removeEventListener("online", actualizar);
      window.removeEventListener("offline", actualizar);
    };
  }, []);

  useEffect(() => {
    if (cargandoLocal) return;
    void guardarSnapshot({ productos, pedidos, comandas, comandasEliminadas, negocio }).catch(
      (error) => {
        console.warn("No fue posible guardar los datos locales", error);
      },
    );
  }, [cargandoLocal, comandas, comandasEliminadas, negocio, pedidos, productos]);

  useEffect(() => {
    if (cargandoLocal) return;
    const solicitud = ++solicitudConfiguracion.current;
    if (!enLinea || !session || !terminalAutorizada || !terminalSucursalId) {
      setCargandoConfiguracion(false);
      return;
    }
    let activo = true;
    setCargandoConfiguracion(true);

    void cargarConfiguracionSucursal()
      .then((data) => {
        if (!activo || solicitud !== solicitudConfiguracion.current) return;
        setNegocio(data);
      })
      .catch((error) => {
        if (!activo || solicitud !== solicitudConfiguracion.current) return;
        console.warn("No fue posible cargar la configuración de la sucursal", error);
      })
      .finally(() => {
        if (activo && solicitud === solicitudConfiguracion.current) {
          setCargandoConfiguracion(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [
    cargandoLocal,
    cargarConfiguracionSucursal,
    enLinea,
    session,
    terminalAutorizada,
    terminalSucursalId,
  ]);

  const guardarNegocio = useCallback(
    async (siguiente: Negocio) => {
      if (!session) throw new Error("Inicia sesión para guardar la configuración.");
      if (!navigator.onLine) {
        throw new Error("Necesitas conexión para guardar la configuración del negocio.");
      }

      const solicitud = ++solicitudConfiguracion.current;
      setCargandoConfiguracion(true);
      try {
        const normalizado = await guardarConfiguracionSucursal(siguiente);
        setNegocio(normalizado);
        await guardarSnapshot({
          productos,
          pedidos,
          comandas,
          comandasEliminadas,
          negocio: normalizado,
        });
        return normalizado;
      } finally {
        if (solicitud === solicitudConfiguracion.current) {
          setCargandoConfiguracion(false);
        }
      }
    },
    [comandas, comandasEliminadas, guardarConfiguracionSucursal, pedidos, productos, session],
  );

  const sincronizarAhora = useCallback(async () => {
    if (!navigator.onLine || !session || sincronizando.current) return;
    sincronizando.current = true;
    try {
      const pendientes = await listarPendientes();
      for (const pedido of pendientes) {
        const pedidoNormalizado = normalizarPedido(pedido);
        const { error } = await ejecutarRpc("sincronizar_venta_pos", {
          p_venta: pedidoNormalizado as unknown as Json,
        });
        if (error) throw error;
        await eliminarPendiente(pedido.id);
        setPedidos((actuales) =>
          actuales.map((actual) =>
            actual.id === pedido.id ? { ...actual, sincronizacion: "sincronizado" } : actual,
          ),
        );
      }
      const pendientesRestantes = await listarPendientes();
      setPendientesSincronizar(pendientesRestantes.length);

      // Las comandas se sincronizan aparte de las ventas para que una migración
      // pendiente nunca impida subir cobros guardados sin conexión.
      for (const id of comandasEliminadasRef.current) {
        const { error } = await ejecutarRpc("eliminar_comanda_pos", { p_client_id: id });
        if (!error) setComandasEliminadas((actuales) => actuales.filter((actual) => actual !== id));
      }
      for (const comanda of comandasRef.current.filter(
        (actual) => actual.sincronizacion === "pendiente",
      )) {
        const { error } = await ejecutarRpc("guardar_comanda_pos", {
          p_comanda: comanda as unknown as Json,
        });
        if (!error) {
          setComandas((actuales) =>
            actuales.map((actual) =>
              actual.id === comanda.id ? { ...actual, sincronizacion: "sincronizado" } : actual,
            ),
          );
        }
      }
      const respuestaComandas = await ejecutarRpc("listar_comandas_pos");
      if (!respuestaComandas.error) {
        const remotas = comandasDesdeNube(respuestaComandas.data);
        const eliminadas = new Set(comandasEliminadasRef.current);
        setComandas((actuales) => {
          const porId = new Map(
            remotas
              .filter((comanda) => !eliminadas.has(comanda.id))
              .map((comanda) => [comanda.id, comanda]),
          );
          actuales
            .filter(
              (comanda) => comanda.sincronizacion === "pendiente" && !eliminadas.has(comanda.id),
            )
            .forEach((comanda) => porId.set(comanda.id, comanda));
          return [...porId.values()].sort(
            (a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime(),
          );
        });
      }

      const { data, error } = await ejecutarRpc("listar_ventas_pos");
      if (error) throw error;
      const remotas = ventasDesdeNube(data);
      const idsPendientes = new Set(pendientesRestantes.map((pedido) => pedido.id));
      setPedidos((actuales) => {
        const localesPendientes = actuales.filter((pedido) => idsPendientes.has(pedido.id));
        const porId = new Map(remotas.map((pedido) => [pedido.id, pedido]));
        localesPendientes.forEach((pedido) => porId.set(pedido.id, pedido));
        return [...porId.values()].sort(
          (a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime(),
        );
      });
    } catch (error) {
      console.warn("No fue posible sincronizar las ventas pendientes", error);
    } finally {
      sincronizando.current = false;
    }
  }, [session]);

  useEffect(() => {
    if (enLinea && session) void sincronizarAhora();
  }, [enLinea, pendientesSincronizar, session, sincronizarAhora]);

  useEffect(() => {
    if (
      enLinea &&
      session &&
      (comandasEliminadas.length > 0 ||
        comandas.some((comanda) => comanda.sincronizacion === "pendiente"))
    ) {
      void sincronizarAhora();
    }
  }, [comandas, comandasEliminadas, enLinea, session, sincronizarAhora]);

  const ponerEnCola = useCallback((pedido: Pedido) => {
    void guardarPendiente(pedido)
      .then(async () => {
        setPendientesSincronizar((await listarPendientes()).length);
      })
      .catch((error) => {
        console.warn("No fue posible guardar la venta pendiente", error);
      });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      productos,
      pedidos,
      comandas,
      comandaSeleccionada,
      negocio,
      enLinea,
      cargandoLocal,
      cargandoConfiguracion,
      pendientesSincronizar,
      sincronizarAhora,
      guardarNegocio,
      toggleProducto: (id) =>
        setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, activo: !p.activo } : p))),
      actualizarPrecio: (id, precio) =>
        setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, precio } : p))),
      crearProducto: (p) =>
        setProductos((prev) => [{ ...p, id: `p-${Date.now()}-${prev.length}` }, ...prev]),
      eliminarProducto: (id) => setProductos((prev) => prev.filter((p) => p.id !== id)),
      cambiarEstado: (id, estado) =>
        setPedidos((prev) =>
          prev.map((pedido) => {
            if (pedido.id !== id) return pedido;
            const actualizado = { ...pedido, estado, sincronizacion: "pendiente" as const };
            ponerEnCola(actualizado);
            return actualizado;
          }),
        ),
      cambiarEstadoComanda: (id, estado) =>
        setComandas((prev) =>
          prev.map((comanda) => {
            if (comanda.id !== id) return comanda;
            return { ...comanda, estado, sincronizacion: "pendiente" as const };
          }),
        ),
      guardarComanda: ({ id, folio, cliente, canal, items, comensales }) => {
        const existente = id ? comandas.find((comanda) => comanda.id === id) : undefined;
        const creadoEn = existente?.creadoEn ?? new Date().toISOString();
        const subtotal = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
        const iva = subtotal * (negocio.iva / 100);
        const comanda: Comanda = normalizarComanda({
          id: existente?.id ?? idVenta(),
          folio: existente?.folio ?? folio ?? folioVenta(pedidos, creadoEn),
          cliente: cliente || (canal === "A mesa" ? "Mesa" : "Cliente"),
          canal,
          estado: existente?.estado ?? "En preparación",
          hora: new Date(creadoEn).toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          items: items.map((item) => ({
            ...item,
            opciones: item.opciones ? [...item.opciones] : undefined,
          })),
          subtotal,
          iva,
          total: subtotal + iva,
          cajaId: cajaActual?.id,
          comensales,
          creadoEn,
          sincronizacion: "pendiente",
        });
        setComandas((actuales) => {
          const restantes = actuales.filter((actual) => actual.id !== comanda.id);
          return [comanda, ...restantes];
        });
        return comanda;
      },
      eliminarComanda: (id) => {
        setComandas((actuales) => actuales.filter((comanda) => comanda.id !== id));
        setComandasEliminadas((actuales) => (actuales.includes(id) ? actuales : [...actuales, id]));
      },
      seleccionarComanda: (id) =>
        setComandaSeleccionada(comandas.find((comanda) => comanda.id === id) ?? null),
      limpiarComandaSeleccionada: () => setComandaSeleccionada(null),
      generarFolioPedido: () => folioVenta(pedidos, new Date().toISOString()),
      crearPedido: ({
        cliente,
        canal,
        metodoPago,
        items,
        propina = 0,
        montoRecibido,
        cambio = 0,
        comensales,
        folio,
        estado = "En preparación",
      }) => {
        const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
        const iva = subtotal * (negocio.iva / 100);
        const creadoEn = new Date().toISOString();
        const nuevo: Pedido = {
          id: idVenta(),
          folio: folio ?? folioVenta(pedidos, creadoEn),
          cliente: cliente || (canal === "A mesa" ? "Mesa" : "Cliente"),
          canal,
          metodoPago: enLinea ? metodoPago : "Efectivo",
          cajaId: cajaActual?.id,
          estado,
          hora: new Date(creadoEn).toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          items,
          subtotal,
          iva,
          total: subtotal + iva,
          propina,
          montoRecibido: montoRecibido ?? subtotal + iva + propina,
          cambio,
          comensales: Math.max(1, Math.floor(comensales)),
          creadoEn,
          sincronizacion: "pendiente",
        };
        setPedidos((prev) => [nuevo, ...prev]);
        ponerEnCola(nuevo);
        return nuevo;
      },
    }),
    [
      cargandoLocal,
      cargandoConfiguracion,
      cajaActual?.id,
      comandas,
      comandaSeleccionada,
      enLinea,
      negocio,
      pedidos,
      pendientesSincronizar,
      ponerEnCola,
      productos,
      guardarNegocio,
      sincronizarAhora,
    ],
  );

  return <TiendaContext.Provider value={value}>{children}</TiendaContext.Provider>;
}

export function useTienda() {
  const ctx = useContext(TiendaContext);
  if (!ctx) throw new Error("useTienda debe usarse dentro de TiendaProvider");
  return ctx;
}
