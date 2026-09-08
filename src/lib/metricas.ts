import type { Pedido, Producto } from "@/data/saluva";

const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function esHoy(fecha: string): boolean {
  const d = new Date(fecha);
  const hoy = new Date();
  return d.toDateString() === hoy.toDateString();
}

export function ventasPorHora(pedidos: Pedido[]) {
  const horas = Array.from({ length: 14 }, (_, i) => i + 7);
  return horas.map((hora) => ({
    hora: `${String(hora).padStart(2, "0")}:00`,
    ventas: pedidos
      .filter((pedido) => esHoy(pedido.creadoEn) && new Date(pedido.creadoEn).getHours() === hora)
      .reduce((suma, pedido) => suma + pedido.total, 0),
  }));
}

export function ventasUltimosSieteDias(pedidos: Pedido[]) {
  return Array.from({ length: 7 }, (_, indice) => {
    const fecha = new Date();
    fecha.setHours(0, 0, 0, 0);
    fecha.setDate(fecha.getDate() - (6 - indice));
    const siguiente = new Date(fecha);
    siguiente.setDate(siguiente.getDate() + 1);
    const ventasDelDia = pedidos.filter((pedido) => {
      const creada = new Date(pedido.creadoEn);
      return creada >= fecha && creada < siguiente;
    });
    return {
      dia: dias[fecha.getDay()],
      ventas: ventasDelDia.reduce((suma, pedido) => suma + pedido.total, 0),
      tickets: ventasDelDia.length,
    };
  });
}

export function productosMasVendidos(pedidos: Pedido[]) {
  const acumulado = new Map<string, { nombre: string; unidades: number; ingreso: number }>();
  pedidos.forEach((pedido) => {
    pedido.items.forEach((item) => {
      const actual = acumulado.get(item.productoId) ?? {
        nombre: item.nombre,
        unidades: 0,
        ingreso: 0,
      };
      actual.unidades += item.cantidad;
      actual.ingreso += item.precio * item.cantidad;
      acumulado.set(item.productoId, actual);
    });
  });
  return [...acumulado.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 5);
}

export function ventasPorCategoria(pedidos: Pedido[], productos: Producto[]) {
  const categorias = new Map(productos.map((producto) => [producto.id, producto.categoria]));
  const acumulado = new Map<string, number>();
  pedidos.forEach((pedido) => {
    pedido.items.forEach((item) => {
      const categoria = categorias.get(item.productoId) ?? "Sin categoría";
      acumulado.set(categoria, (acumulado.get(categoria) ?? 0) + item.precio * item.cantidad);
    });
  });
  return [...acumulado.entries()].map(([nombre, valor]) => ({ nombre, valor }));
}
