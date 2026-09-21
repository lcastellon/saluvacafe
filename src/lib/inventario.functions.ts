import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function exigirAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
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
  if (Number.isNaN(existencia) || existencia < 0)
    throw new Error("La existencia debe ser un número positivo");
  if (Number.isNaN(minimo) || minimo < 0) throw new Error("El mínimo debe ser un número positivo");
  if (Number.isNaN(costoUnitario) || costoUnitario < 0)
    throw new Error("El costo unitario debe ser un número positivo");
  return { nombre, unidad, existencia, minimo, costoUnitario, proveedor };
}

function claveInsumo(nombre: string) {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
  const sufijo = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now().toString(36);
  return `${base || "insumo"}-${sufijo}`;
}

export type RecetaInventario = {
  id: string;
  producto_id: string;
  insumo_clave: string;
  cantidad: number;
  condicion: "base" | "para_llevar";
  activa: boolean;
};

export const listarInsumos = createServerFn({ method: "GET" })
  .validator((input?: { sucursalId?: string | null }) => ({
    sucursalId: input?.sucursalId?.trim() || null,
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    if (!data.sucursalId) return [];
    const { data: insumos, error } = await context.supabase
      .from("insumos")
      .select("*")
      .eq("activo", true)
      .eq("sucursal_id", data.sucursalId)
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return insumos ?? [];
  });

export const crearInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      nombre: string;
      unidad: string;
      existencia: number;
      minimo: number;
      costoUnitario: number;
      proveedor: string;
      sucursalId: string;
    }) => ({ ...validarInsumo(input), sucursalId: input.sucursalId?.trim() }),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const sucursalId = data.sucursalId;
    if (!sucursalId) throw new Error("La sucursal es obligatoria");
    const { data: creado, error } = await context.supabase
      .from("insumos")
      .insert({
        clave: claveInsumo(data.nombre),
        sucursal_id: sucursalId,
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
    await exigirAdmin(context);
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

export const listarRecetasInventario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pos_recetas")
      .select("id, producto_id, insumo_clave, cantidad, condicion, activa")
      .eq("activa", true)
      .order("producto_id", { ascending: true })
      .order("condicion", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as RecetaInventario[];
  });

export const guardarRecetaInventario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      productoId: string;
      insumoClave: string;
      cantidad: number;
      condicion: "base" | "para_llevar";
    }) => {
      const productoId = input.productoId.trim();
      const insumoClave = input.insumoClave.trim();
      const cantidad = Number(input.cantidad);
      if (!productoId || !insumoClave) throw new Error("Selecciona producto e insumo");
      if (!Number.isFinite(cantidad) || cantidad <= 0)
        throw new Error("La cantidad debe ser mayor que cero");
      if (input.condicion !== "base" && input.condicion !== "para_llevar")
        throw new Error("La condición de consumo no es válida");
      return { productoId, insumoClave, cantidad, condicion: input.condicion };
    },
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { error } = await context.supabase.from("pos_recetas").upsert(
      {
        producto_id: data.productoId,
        insumo_clave: data.insumoClave,
        cantidad: data.cantidad,
        condicion: data.condicion,
        activa: true,
        actualizada_en: new Date().toISOString(),
      },
      { onConflict: "producto_id,insumo_clave,condicion" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const eliminarRecetaInventario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("La receta no es válida");
    return input;
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { error } = await context.supabase.from("pos_recetas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const eliminarInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { error } = await context.supabase
      .from("insumos")
      .update({ activo: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
