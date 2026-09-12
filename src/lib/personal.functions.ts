import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const ADMINISTRADORES_NUEVOS = ["Felipe", "Valeria"] as const;
const email = (codigo: string) => `${codigo}@saluva.app`;
const password = (codigo: string) => `slv-${codigo}`;

function codigoAleatorio() {
  const valor = new Uint32Array(1);
  globalThis.crypto.getRandomValues(valor);
  return String(100000 + ((valor[0] ?? 0) % 900000));
}

async function exigirAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Solo el administrador puede realizar esta acción");
}

/** Completa el equipo administrativo desde una sesión de administrador existente. */
export const asegurarAdministradores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let creados = 0;

    const { data: administradorActual } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .in("nombre", ["Admin", "Administrador"])
      .limit(1);
    const idAdmin = administradorActual?.[0]?.id ?? context.userId;
    const { error: errorAdmin } = await supabaseAdmin
      .from("perfiles")
      .update({ nombre: "Admin", activo: true })
      .eq("id", idAdmin);
    if (errorAdmin) throw new Error(errorAdmin.message);
    const { error: errorRolAdmin } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: idAdmin, role: "admin" }, { onConflict: "user_id,role" });
    if (errorRolAdmin) throw new Error(errorRolAdmin.message);

    for (const nombre of ADMINISTRADORES_NUEVOS) {
      const { data: perfiles, error: errorPerfil } = await supabaseAdmin
        .from("perfiles")
        .select("id")
        .eq("nombre", nombre)
        .limit(1);
      if (errorPerfil) throw new Error(errorPerfil.message);

      let id = perfiles?.[0]?.id;
      if (!id) {
        for (let intento = 0; intento < 10 && !id; intento += 1) {
          const codigo = codigoAleatorio();
          const { data: codigoEnUso } = await supabaseAdmin
            .from("perfiles")
            .select("id")
            .eq("codigo", codigo)
            .maybeSingle();
          if (codigoEnUso) continue;

          const { data: cuenta, error: errorCuenta } = await supabaseAdmin.auth.admin.createUser({
            email: email(codigo),
            password: password(codigo),
            email_confirm: true,
          });
          if (errorCuenta || !cuenta.user) continue;

          const { error: errorInsertar } = await supabaseAdmin.from("perfiles").insert({
            id: cuenta.user.id,
            nombre,
            codigo,
            activo: true,
          });
          if (errorInsertar) {
            await supabaseAdmin.auth.admin.deleteUser(cuenta.user.id);
            continue;
          }
          id = cuenta.user.id;
          creados += 1;
        }
      }
      if (!id) throw new Error(`No se pudo crear la cuenta de ${nombre}`);

      const { error: errorActualizar } = await supabaseAdmin
        .from("perfiles")
        .update({ activo: true })
        .eq("id", id);
      if (errorActualizar) throw new Error(errorActualizar.message);
      const { error: errorRol } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: id, role: "admin" }, { onConflict: "user_id,role" });
      if (errorRol) throw new Error(errorRol.message);
    }

    return { creados };
  });

export const cambiarCodigoPropio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { codigoActual: string; nuevoCodigo: string; confirmarCodigo: string }) => {
      const codigoActual = input.codigoActual?.trim();
      const nuevoCodigo = input.nuevoCodigo?.trim();
      const confirmarCodigo = input.confirmarCodigo?.trim();
      if (!/^\d{6}$/.test(codigoActual ?? "")) {
        throw new Error("Escribe tu código actual de 6 dígitos");
      }
      if (!/^\d{6}$/.test(nuevoCodigo ?? "")) {
        throw new Error("El nuevo código debe tener 6 dígitos");
      }
      if (nuevoCodigo !== confirmarCodigo) throw new Error("Los códigos nuevos no coinciden");
      if (nuevoCodigo === codigoActual) throw new Error("Elige un código diferente al actual");
      return { codigoActual, nuevoCodigo };
    },
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfil, error: errorPerfil } = await supabaseAdmin
      .from("perfiles")
      .select("codigo")
      .eq("id", context.userId)
      .single();
    if (errorPerfil || !perfil) throw new Error("No se pudo verificar tu cuenta");
    if (perfil.codigo !== data.codigoActual) throw new Error("El código actual es incorrecto");

    const { data: codigoOcupado } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .eq("codigo", data.nuevoCodigo)
      .neq("id", context.userId)
      .maybeSingle();
    if (codigoOcupado) throw new Error("Ese código ya está en uso");

    const { error: errorCuenta } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      email: email(data.nuevoCodigo),
      password: password(data.nuevoCodigo),
      email_confirm: true,
    });
    if (errorCuenta) throw new Error(errorCuenta.message);

    const { error: errorCodigo } = await supabaseAdmin
      .from("perfiles")
      .update({ codigo: data.nuevoCodigo })
      .eq("id", context.userId);
    if (errorCodigo) {
      await supabaseAdmin.auth.admin.updateUserById(context.userId, {
        email: email(data.codigoActual),
        password: password(data.codigoActual),
        email_confirm: true,
      });
      throw new Error("No se pudo guardar el nuevo código. Inténtalo de nuevo");
    }

    return { ok: true };
  });

export const listarPersonal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context as never);
    const { data, error } = await context.supabase
      .from("perfiles")
      .select("id, nombre, codigo, activo, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const mapa = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    return (data ?? []).map((p) => ({
      ...p,
      rol: (mapa.get(p.id) ?? "barista") as "admin" | "barista",
    }));
  });

export const crearBarista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nombre: string; codigo: string }) => {
    const nombre = input.nombre?.trim();
    const codigo = input.codigo?.trim();
    if (!nombre) throw new Error("El nombre es obligatorio");
    if (!/^\d{6}$/.test(codigo ?? "")) throw new Error("El código debe tener 6 dígitos");
    return { nombre, codigo };
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existe } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .eq("codigo", data.codigo)
      .maybeSingle();
    if (existe) throw new Error("Ese código ya está en uso");

    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: email(data.codigo),
      password: password(data.codigo),
      email_confirm: true,
    });
    if (error || !creado.user) throw new Error(error?.message ?? "No se pudo crear la cuenta");

    const { error: e1 } = await supabaseAdmin
      .from("perfiles")
      .insert({ id: creado.user.id, nombre: data.nombre, codigo: data.codigo, activo: true });
    if (e1) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new Error(e1.message);
    }
    await supabaseAdmin.from("user_roles").insert({ user_id: creado.user.id, role: "barista" });
    return { id: creado.user.id };
  });

export const cambiarEstadoBarista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; activo: boolean }) => input)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("perfiles")
      .update({ activo: data.activo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.activo ? "none" : "876000h",
    });
    return { ok: true };
  });

export const eliminarBarista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as never);
    if (data.id === context.userId) throw new Error("No puedes eliminar tu propia cuenta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rol } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.id)
      .maybeSingle();
    if (rol?.role === "admin") throw new Error("No se puede eliminar una cuenta de administrador");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
