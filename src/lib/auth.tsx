import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Rol = "admin" | "barista";

export type Perfil = { id: string; nombre: string; codigo: string; activo: boolean };

type AuthCache = {
  userId: string;
  perfil: Perfil | null;
  rol: Rol | null;
};

const AUTH_CACHE_KEY = "saluva-auth-v1";

export function leerAuthCache(userId?: string): AuthCache | null {
  if (typeof window === "undefined") return null;
  try {
    const cache = JSON.parse(
      window.localStorage.getItem(AUTH_CACHE_KEY) ?? "null",
    ) as AuthCache | null;
    if (!cache || (userId && cache.userId !== userId)) return null;
    return cache;
  } catch {
    return null;
  }
}

function guardarAuthCache(cache: AuthCache) {
  try {
    window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // El inicio offline es una mejora progresiva si el navegador bloquea localStorage.
  }
}

type Ctx = {
  session: Session | null;
  perfil: Perfil | null;
  rol: Rol | null;
  cargando: boolean;
  esAdmin: boolean;
  refrescar: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export const emailDeCodigo = (codigo: string) => `${codigo.trim()}@saluva.app`;
export const passwordDeCodigo = (codigo: string) => `slv-${codigo.trim()}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarDatos = async (uid: string | undefined) => {
    if (!uid) {
      setPerfil(null);
      setRol(null);
      return;
    }

    const cache = leerAuthCache(uid);
    if (!navigator.onLine) {
      setPerfil(cache?.perfil ?? null);
      setRol(cache?.rol ?? null);
      return;
    }

    try {
      const [{ data: p, error: perfilError }, { data: r, error: rolError }] = await Promise.all([
        supabase.from("perfiles").select("id, nombre, codigo, activo").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      ]);
      if (perfilError || rolError) throw perfilError ?? rolError;
      const siguientePerfil = (p as Perfil) ?? null;
      const siguienteRol = (r?.role as Rol) ?? null;
      setPerfil(siguientePerfil);
      setRol(siguienteRol);
      guardarAuthCache({ userId: uid, perfil: siguientePerfil, rol: siguienteRol });
    } catch (error) {
      setPerfil(cache?.perfil ?? null);
      setRol(cache?.rol ?? null);
      console.warn("Se usaron los datos locales de la sesión", error);
    }
  };

  useEffect(() => {
    let vivo = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!vivo) return;
      setSession(s);
      void cargarDatos(s?.user.id).then(() => setCargando(false));
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setSession(data.session);
      await cargarDatos(data.session?.user.id);
      setCargando(false);
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      session,
      perfil,
      rol,
      cargando,
      esAdmin: rol === "admin",
      refrescar: async () => {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        await cargarDatos(data.session?.user.id);
      },
    }),
    [session, perfil, rol, cargando],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
