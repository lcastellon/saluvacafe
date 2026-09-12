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
  type EstadoPedido,
  type LineaPedido,
  type Pedido,
  type Producto,
} from "@/data/saluva";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
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
  negocio: Negocio;
  enLinea: boolean;
  cargandoLocal: boolean;
  pendientesSincronizar: number;
  sincronizarAhora: () => Promise<void>;
  guardarNegocio: (n: Negocio) => Promise<void>;
  toggleProducto: (id: string) => void;
  actualizarPrecio: (id: string, precio: number) => void;
  crearProducto: (p: Omit<Producto, "id">) => void;
  eliminarProducto: (id: string) => void;
  cambiarEstado: (id: string, estado: EstadoPedido) => void;
  crearPedido: (args: {
    cliente: string;
    canal: Pedido["canal"];
    metodoPago: Pedido["metodoPago"];
    items: LineaPedido[];
    propina?: number;
    montoRecibido?: number;
    cambio?: number;
    comensales: number;
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

function folioVenta() {
  return `SLV-${Date.now().toString().slice(-7)}`;
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

type RespuestaRpc = { data: Json; error: unknown };

function ejecutarRpc(nombre: string, argumentos?: Record<string, Json>): Promise<RespuestaRpc> {
  const cliente = supabase as unknown as {
    rpc: (funcion: string, args?: Record<string, Json>) => Promise<RespuestaRpc>;
  };
  return cliente.rpc(nombre, argumentos);
}

function negocioDesdeNube(
  registro: Database["public"]["Tables"]["pos_configuracion"]["Row"],
): Negocio {
  return {
    nombre: registro.nombre,
    sucursal: registro.sucursal,
    direccion: registro.direccion,
    telefono: registro.telefono,
    horario: registro.horario,
    iva: Number(registro.iva),
    propinaSugerida: Number(registro.propina_sugerida),
    moneda: registro.moneda,
  };
}

export function TiendaProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { cajaActual } = useCajaTurno();
  const [productos, setProductos] = useState<Producto[]>(productosSeed);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [negocio, setNegocio] = useState<Negocio>(negocioInicial);
  const [enLinea, setEnLinea] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [cargandoLocal, setCargandoLocal] = useState(true);
  const [pendientesSincronizar, setPendientesSincronizar] = useState(0);
  const sincronizando = useRef(false);

  useEffect(() => {
    let activo = true;
    void Promise.all([cargarSnapshot(), listarPendientes()])
      .then(([snapshot, pendientes]) => {
        if (!activo) return;
        if (snapshot) {
          setProductos(snapshot.productos);
          setPedidos(snapshot.pedidos.map((pedido) => normalizarPedido(pedido)));
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
    void guardarSnapshot({ productos, pedidos, negocio }).catch((error) => {
      console.warn("No fue posible guardar los datos locales", error);
    });
  }, [cargandoLocal, negocio, pedidos, productos]);

  useEffect(() => {
    if (cargandoLocal || !enLinea || !session) return;
    let activo = true;

    void supabase
      .from("pos_configuracion")
      .select(
        "nombre, sucursal, direccion, telefono, horario, iva, propina_sugerida, moneda, id, actualizado_por, actualizado_en",
      )
      .eq("id", "negocio")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.warn("No fue posible cargar la configuración compartida", error);
          return;
        }
        if (data) setNegocio(negocioDesdeNube(data));
      });

    return () => {
      activo = false;
    };
  }, [cargandoLocal, enLinea, session]);

  const guardarNegocio = useCallback(
    async (siguiente: Negocio) => {
      if (!session) throw new Error("Inicia sesión para guardar la configuración.");
      if (!navigator.onLine) {
        throw new Error("Necesitas conexión para guardar la configuración del negocio.");
      }

      const { error } = await supabase.from("pos_configuracion").upsert({
        id: "negocio",
        nombre: siguiente.nombre.trim(),
        sucursal: siguiente.sucursal.trim(),
        direccion: siguiente.direccion.trim(),
        telefono: siguiente.telefono.trim(),
        horario: siguiente.horario.trim(),
        iva: siguiente.iva,
        propina_sugerida: siguiente.propinaSugerida,
        moneda: siguiente.moneda.trim(),
        actualizado_por: session.user.id,
        actualizado_en: new Date().toISOString(),
      });
      if (error) throw error;

      const normalizado: Negocio = {
        ...siguiente,
        nombre: siguiente.nombre.trim(),
        sucursal: siguiente.sucursal.trim(),
        direccion: siguiente.direccion.trim(),
        telefono: siguiente.telefono.trim(),
        horario: siguiente.horario.trim(),
        moneda: siguiente.moneda.trim(),
      };
      setNegocio(normalizado);
      await guardarSnapshot({ productos, pedidos, negocio: normalizado });
    },
    [pedidos, productos, session],
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
      negocio,
      enLinea,
      cargandoLocal,
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
      crearPedido: ({
        cliente,
        canal,
        metodoPago,
        items,
        propina = 0,
        montoRecibido,
        cambio = 0,
        comensales,
      }) => {
        const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
        const iva = subtotal * (negocio.iva / 100);
        const creadoEn = new Date().toISOString();
        const nuevo: Pedido = {
          id: idVenta(),
          folio: folioVenta(),
          cliente: cliente || (canal === "A mesa" ? "Mesa" : "Cliente"),
          canal,
          metodoPago: enLinea ? metodoPago : "Efectivo",
          cajaId: cajaActual?.id,
          estado: "En preparación",
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
      cajaActual?.id,
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
