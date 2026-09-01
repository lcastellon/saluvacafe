import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CODIGO_ADMIN = "100100";
const email = (codigo: string) => `${codigo}@saluva.app`;
const password = (codigo: string) => `slv-${codigo}`;

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Solo el administrador puede realizar esta acción");
}

/** Crea la cuenta de administrador inicial si todavía no existe ninguna. */
export const asegurarAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if ((count ?? 0) > 0) return { creado: false, codigo: CODIGO_ADMIN };

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email(CODIGO_ADMIN),
    password: password(CODIGO_ADMIN),
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? "No se pudo crear el administrador");

  await supabaseAdmin.from("perfiles").insert({
    id: data.user.id,
    nombre: "Administrador",
    codigo: CODIGO_ADMIN,
    activo: true,
  });
  await supabaseAdmin.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
  return { creado: true, codigo: CODIGO_ADMIN };
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
    const mapa = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));
    return (data ?? []).map((p: any) => ({ ...p, rol: (mapa.get(p.id) ?? "barista") as "admin" | "barista" }));
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
