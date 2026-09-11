import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

export type CajaActual = {
  id: string;
  terminalId: string;
  terminalNombre: string;
  sucursalId: string;
  sucursalNombre: string;
  abiertoPor: string;
  abiertoPorNombre: string;
  abiertoEn: string;
  fondoInicial: number;
};

export type Sucursal = {
  id: string;
  nombre: string;
  direccion: string;
};

type EstadoCaja = {
  terminalAutorizada: boolean;
  terminalNombre: string | null;
  terminalSucursalNombre: string | null;
  cajaActual: CajaActual | null;
};

type Ctx = EstadoCaja & {
  cargandoCaja: boolean;
  errorCaja: string | null;
  sucursales: Sucursal[];
  refrescarCaja: () => Promise<void>;
  crearSucursal: (nombre: string, direccion: string) => Promise<void>;
  autorizarTerminal: (nombre: string, sucursalId: string) => Promise<void>;
  abrirCaja: (fondoInicial: number) => Promise<void>;
  cerrarCaja: (efectivoContado: number, notas: string) => Promise<void>;
};

const TOKEN_KEY = "saluva-terminal-token-v1";
const CACHE_KEY = "saluva-estado-caja-v1";
const estadoInicial: EstadoCaja = {
  terminalAutorizada: false,
  terminalNombre: null,
  terminalSucursalNombre: null,
  cajaActual: null,
};

const CajaTurnoContext = createContext<Ctx | null>(null);

type RespuestaRpc = { data: Json; error: unknown };

function ejecutarRpc(nombre: string, argumentos?: Record<string, Json>): Promise<RespuestaRpc> {
  const cliente = supabase as unknown as {
    rpc: (funcion: string, args?: Record<string, Json>) => Promise<RespuestaRpc>;
  };
  return cliente.rpc(nombre, argumentos);
}

function obtenerTokenTerminal() {
  let token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = globalThis.crypto?.randomUUID?.() ?? `terminal-${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

function leerCache(): EstadoCaja {
  try {
    const cache = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "null") as EstadoCaja | null;
    return cache ? { ...estadoInicial, ...cache } : estadoInicial;
  } catch {
    return estadoInicial;
  }
}

function guardarCache(estado: EstadoCaja) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(estado));
  } catch {
    // El estado seguirá disponible durante esta sesión si el navegador bloquea localStorage.
  }
}

function interpretarEstado(data: Json): EstadoCaja {
  if (!data || typeof data !== "object" || Array.isArray(data)) return estadoInicial;
  const respuesta = data as Record<string, Json | undefined>;
  return {
    terminalAutorizada: respuesta["terminalAutorizada"] === true,
    terminalNombre:
      typeof respuesta["terminalNombre"] === "string" ? respuesta["terminalNombre"] : null,
    terminalSucursalNombre:
      typeof respuesta["terminalSucursalNombre"] === "string"
        ? respuesta["terminalSucursalNombre"]
        : null,
    cajaActual:
      respuesta["cajaActual"] &&
      typeof respuesta["cajaActual"] === "object" &&
      !Array.isArray(respuesta["cajaActual"])
        ? (respuesta["cajaActual"] as unknown as CajaActual)
        : null,
  };
}

function interpretarSucursales(data: Json): Sucursal[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const registro = item as Record<string, Json | undefined>;
    if (typeof registro["id"] !== "string" || typeof registro["nombre"] !== "string") return [];
    return [
      {
        id: registro["id"],
        nombre: registro["nombre"],
        direccion: typeof registro["direccion"] === "string" ? registro["direccion"] : "",
      },
    ];
  });
}

function mensajeDeError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const mensaje = String(error.message);
    if (mensaje.includes("estado_terminal_caja") || mensaje.includes("schema cache")) {
      return "Falta aplicar la migración de apertura y cierre de caja en Supabase.";
    }
    return mensaje;
  }
  return "No fue posible consultar el estado de la caja.";
}

export function CajaTurnoProvider({ children }: { children: ReactNode }) {
  const { session, esAdmin } = useAuth();
  const [estado, setEstado] = useState<EstadoCaja>(estadoInicial);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargandoCaja, setCargandoCaja] = useState(true);
  const [errorCaja, setErrorCaja] = useState<string | null>(null);

  const aplicarEstado = useCallback((siguiente: EstadoCaja) => {
    setEstado(siguiente);
    guardarCache(siguiente);
  }, []);

  const refrescarCaja = useCallback(async () => {
    if (!session) {
      setEstado(estadoInicial);
      setSucursales([]);
      setCargandoCaja(false);
      return;
    }

    if (!navigator.onLine) {
      setEstado(leerCache());
      setErrorCaja(null);
      setCargandoCaja(false);
      return;
    }

    setCargandoCaja(true);
    try {
      const [estadoRemoto, sucursalesRemotas] = await Promise.all([
        ejecutarRpc("estado_terminal_caja", { p_token: obtenerTokenTerminal() }),
        esAdmin ? ejecutarRpc("listar_sucursales_pos") : Promise.resolve(null),
      ]);
      if (estadoRemoto.error) throw estadoRemoto.error;
      if (sucursalesRemotas?.error) throw sucursalesRemotas.error;
      aplicarEstado(interpretarEstado(estadoRemoto.data));
      if (sucursalesRemotas) setSucursales(interpretarSucursales(sucursalesRemotas.data));
      setErrorCaja(null);
    } catch (error) {
      setEstado(leerCache());
      setErrorCaja(mensajeDeError(error));
    } finally {
      setCargandoCaja(false);
    }
  }, [aplicarEstado, esAdmin, session]);

  useEffect(() => {
    void refrescarCaja();
    const alVolverInternet = () => void refrescarCaja();
    const alEnfocar = () => navigator.onLine && void refrescarCaja();
    window.addEventListener("online", alVolverInternet);
    window.addEventListener("focus", alEnfocar);
    return () => {
      window.removeEventListener("online", alVolverInternet);
      window.removeEventListener("focus", alEnfocar);
    };
  }, [refrescarCaja]);

  const ejecutarAccion = useCallback(
    async (nombre: string, argumentos: Record<string, Json>) => {
      if (!navigator.onLine)
        throw new Error("Necesitas conexión para cambiar el estado de la caja.");
      const { data, error } = await ejecutarRpc(nombre, {
        p_token: obtenerTokenTerminal(),
        ...argumentos,
      });
      if (error) throw new Error(mensajeDeError(error));
      aplicarEstado(interpretarEstado(data));
      setErrorCaja(null);
    },
    [aplicarEstado],
  );

  const value = useMemo<Ctx>(
    () => ({
      ...estado,
      cargandoCaja,
      errorCaja,
      sucursales,
      refrescarCaja,
      crearSucursal: async (nombre, direccion) => {
        if (!navigator.onLine) throw new Error("Necesitas conexión para registrar una sucursal.");
        const { data, error } = await ejecutarRpc("crear_sucursal_pos", {
          p_nombre: nombre.trim(),
          p_direccion: direccion.trim(),
        });
        if (error) throw new Error(mensajeDeError(error));
        setSucursales(interpretarSucursales(data));
      },
      autorizarTerminal: (nombre, sucursalId) =>
        ejecutarAccion("autorizar_terminal_pos", {
          p_nombre: nombre.trim() || "Caja 1",
          p_sucursal_id: sucursalId,
        }),
      abrirCaja: (fondoInicial) =>
        ejecutarAccion("abrir_caja_pos", { p_fondo_inicial: fondoInicial }),
      cerrarCaja: (efectivoContado, notas) =>
        ejecutarAccion("cerrar_caja_pos", {
          p_efectivo_contado: efectivoContado,
          p_notas: notas.trim(),
        }),
    }),
    [cargandoCaja, errorCaja, estado, ejecutarAccion, refrescarCaja, sucursales],
  );

  return <CajaTurnoContext.Provider value={value}>{children}</CajaTurnoContext.Provider>;
}

export function useCajaTurno() {
  const ctx = useContext(CajaTurnoContext);
  if (!ctx) throw new Error("useCajaTurno debe usarse dentro de CajaTurnoProvider");
  return ctx;
}
