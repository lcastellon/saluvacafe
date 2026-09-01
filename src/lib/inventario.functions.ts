import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Solo el administrador puede realizar esta acción");
}

function validarInsumo(input: {
  nombre?: string;
  unidad?: string;
  existencia?: number;
  minimo?: number;
  costoUnitario?: number;
  proveedor?: string;
}) {
  const nombre = input.nombre?.trim();
  const unidad = input.unidad?.trim();
  const proveedor = input.proveedor?.trim() ?? "";
  if (!nombre) throw new Error("El nombre es obligatorio");
  if (!unidad) throw new Error("La unidad es obligatoria");
  const existencia = Number(input.existencia ?? 0);
  const minimo = Number(input.minimo ?? 0);
  const costoUnitario = Number(input.costoUnitario ?? 0);
  if (Number.isNaN(existencia) || existencia < 0) throw new Error("La existencia debe ser un número positivo");
  if (Number.isNaN(minimo) || minimo < 0) throw new Error("El mínimo debe ser un número positivo");
  if (Number.isNaN(costoUnitario) || costoUnitario < 0) throw new Error("El costo unitario debe ser un número positivo");
  return { nombre, unidad, existencia, minimo, costoUnitario, proveedor };
}

export const listarInsumos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("insumos")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const crearInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nombre: string; unidad: string; existencia: number; minimo: number; costoUnitario: number; proveedor: string }) =>
    validarInsumo(input),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as never);
    const { data: creado, error } = await context.supabase
      .from("insumos")
      .insert({
        nombre: data.nombre,
        unidad: data.unidad,
        existencia: data.existencia,
        minimo: data.minimo,
        costo_unitario: data.costoUnitario,
        proveedor: data.proveedor,
        activo: true,
      })
      .select("id")
      .single();
    if (error || !creado) throw new Error(error?.message ?? "No se pudo crear el insumo");
    return { id: creado.id };
  });

export const actualizarInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      nombre: string;
      unidad: string;
      existencia: number;
      minimo: number;
      costoUnitario: number;
      proveedor: string;
      activo: boolean;
    }) => {
      if (!input.id) throw new Error("El id es obligatorio");
      const v = validarInsumo(input);
      return { ...v, id: input.id, activo: input.activo ?? true };
    },
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as never);
    const { error } = await context.supabase
      .from("insumos")
      .update({
        nombre: data.nombre,
        unidad: data.unidad,
        existencia: data.existencia,
        minimo: data.minimo,
        costo_unitario: data.costoUnitario,
        proveedor: data.proveedor,
        activo: data.activo,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const eliminarInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as never);
    const { error } = await context.supabase.from("insumos").update({ activo: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ajustarExistencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; delta: number }) => {
    if (!input.id) throw new Error("El id es obligatorio");
    const delta = Number(input.delta);
    if (Number.isNaN(delta)) throw new Error("El delta debe ser un número");
    return { id: input.id, delta };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: insumo, error: e1 } = await supabaseAdmin
      .from("insumos")
      .select("existencia")
      .eq("id", data.id)
      .eq("activo", true)
      .single();
    if (e1 || !insumo) throw new Error(e1?.message ?? "Insumo no encontrado");

    const nueva = Math.max(0, Number(insumo.existencia) + data.delta);
    const { error: e2 } = await supabaseAdmin
      .from("insumos")
      .update({ existencia: nueva })
      .eq("id", data.id);
    if (e2) throw new Error(e2.message);

    return { id: data.id, existencia: nueva };
  });
