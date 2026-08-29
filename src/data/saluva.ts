export type Categoria = "Café caliente" | "Café frío" | "Infusiones" | "Panadería" | "Desayunos";

export type Producto = {
  id: string;
  nombre: string;
  categoria: Categoria;
  precio: number;
  costo: number;
  descripcion: string;
  activo: boolean;
  emoji: string;
};

export const productos: Producto[] = [
  { id: "p1", nombre: "Americano", categoria: "Café caliente", precio: 42, costo: 11, descripcion: "Doble shot con agua caliente", activo: true, emoji: "☕" },
  { id: "p2", nombre: "Espresso doble", categoria: "Café caliente", precio: 38, costo: 9, descripcion: "Intenso, de origen Chiapas", activo: true, emoji: "☕" },
  { id: "p3", nombre: "Latte", categoria: "Café caliente", precio: 58, costo: 17, descripcion: "Leche vaporizada y arte latte", activo: true, emoji: "🥛" },
  { id: "p4", nombre: "Cappuccino", categoria: "Café caliente", precio: 56, costo: 16, descripcion: "Espuma densa y canela", activo: true, emoji: "☕" },
  { id: "p5", nombre: "Flat white", categoria: "Café caliente", precio: 60, costo: 18, descripcion: "Microespuma sedosa", activo: true, emoji: "☕" },
  { id: "p6", nombre: "Cold brew", categoria: "Café frío", precio: 62, costo: 15, descripcion: "18 horas de extracción en frío", activo: true, emoji: "🧊" },
  { id: "p7", nombre: "Latte helado", categoria: "Café frío", precio: 62, costo: 18, descripcion: "Servido sobre hielo", activo: true, emoji: "🧊" },
  { id: "p8", nombre: "Matcha latte", categoria: "Infusiones", precio: 72, costo: 24, descripcion: "Matcha ceremonial japonés", activo: true, emoji: "🍵" },
  { id: "p9", nombre: "Chai latte", categoria: "Infusiones", precio: 66, costo: 20, descripcion: "Especias molidas en casa", activo: true, emoji: "🍵" },
  { id: "p10", nombre: "Té de jamaica", categoria: "Infusiones", precio: 40, costo: 8, descripcion: "Frío o caliente, sin azúcar", activo: true, emoji: "🌺" },
  { id: "p11", nombre: "Croissant de mantequilla", categoria: "Panadería", precio: 45, costo: 14, descripcion: "Hojaldre horneado cada mañana", activo: true, emoji: "🥐" },
  { id: "p12", nombre: "Panqué de plátano", categoria: "Panadería", precio: 42, costo: 12, descripcion: "Con nuez caramelizada", activo: true, emoji: "🍰" },
  { id: "p13", nombre: "Galletas de avena", categoria: "Panadería", precio: 28, costo: 7, descripcion: "Pieza artesanal con chispas", activo: true, emoji: "🍪" },
  { id: "p14", nombre: "Concha de vainilla", categoria: "Panadería", precio: 26, costo: 6, descripcion: "Receta tradicional", activo: true, emoji: "🥯" },
  { id: "p15", nombre: "Avo toast", categoria: "Desayunos", precio: 95, costo: 34, descripcion: "Pan de masa madre, aguacate y ajonjolí", activo: true, emoji: "🥑" },
  { id: "p16", nombre: "Bowl de yogurt griego", categoria: "Desayunos", precio: 88, costo: 30, descripcion: "Granola de la casa y frutos rojos", activo: true, emoji: "🥣" },
  { id: "p17", nombre: "Molletes Salúva", categoria: "Desayunos", precio: 92, costo: 31, descripcion: "Frijol, queso gratinado y pico de gallo", activo: true, emoji: "🫓" },
  { id: "p18", nombre: "Huevos al comal", categoria: "Desayunos", precio: 98, costo: 35, descripcion: "Dos huevos, salsa verde y tortilla", activo: true, emoji: "🍳" },
];

export type Insumo = {
  id: string;
  nombre: string;
  unidad: string;
  existencia: number;
  minimo: number;
  costoUnitario: number;
  proveedor: string;
};

export const insumos: Insumo[] = [
  { id: "i1", nombre: "Café en grano (Chiapas)", unidad: "kg", existencia: 12.4, minimo: 6, costoUnitario: 320, proveedor: "Finca La Alameda" },
  { id: "i2", nombre: "Leche entera", unidad: "L", existencia: 18, minimo: 24, costoUnitario: 26, proveedor: "Lácteos del Valle" },
  { id: "i3", nombre: "Leche de avena", unidad: "L", existencia: 9, minimo: 8, costoUnitario: 48, proveedor: "Avena Nórdica" },
  { id: "i4", nombre: "Matcha ceremonial", unidad: "g", existencia: 340, minimo: 500, costoUnitario: 3.2, proveedor: "Uji Import" },
  { id: "i5", nombre: "Mezcla de chai", unidad: "g", existencia: 820, minimo: 400, costoUnitario: 1.4, proveedor: "Especias Kali" },
  { id: "i6", nombre: "Harina de trigo", unidad: "kg", existencia: 22, minimo: 10, costoUnitario: 32, proveedor: "Molino San Juan" },
  { id: "i7", nombre: "Mantequilla", unidad: "kg", existencia: 5.5, minimo: 6, costoUnitario: 210, proveedor: "Lácteos del Valle" },
  { id: "i8", nombre: "Aguacate", unidad: "pza", existencia: 46, minimo: 30, costoUnitario: 14, proveedor: "Mercado Central" },
  { id: "i9", nombre: "Huevo", unidad: "pza", existencia: 120, minimo: 90, costoUnitario: 4.1, proveedor: "Granja El Roble" },
  { id: "i10", nombre: "Vasos 12 oz", unidad: "pza", existencia: 380, minimo: 250, costoUnitario: 2.3, proveedor: "EcoPack" },
];

export type EstadoPedido = "En preparación" | "Listo" | "Entregado";

export type LineaPedido = { productoId: string; nombre: string; cantidad: number; precio: number };

export type Pedido = {
  id: string;
  folio: string;
  cliente: string;
  canal: "Mostrador" | "Para llevar" | "App";
  estado: EstadoPedido;
  hora: string;
  items: LineaPedido[];
  total: number;
  metodoPago: "Efectivo" | "Tarjeta" | "Transferencia";
};

const l = (productoId: string, cantidad: number): LineaPedido => {
  const p = productos.find((x) => x.id === productoId)!;
  return { productoId, nombre: p.nombre, cantidad, precio: p.precio };
};

const total = (items: LineaPedido[]) => items.reduce((s, i) => s + i.precio * i.cantidad, 0);

const mk = (
  folio: string,
  cliente: string,
  canal: Pedido["canal"],
  estado: EstadoPedido,
  hora: string,
  items: LineaPedido[],
  metodoPago: Pedido["metodoPago"],
): Pedido => ({ id: folio, folio, cliente, canal, estado, hora, items, total: total(items), metodoPago });

export const pedidosIniciales: Pedido[] = [
  mk("SLV-1042", "Mariana R.", "Mostrador", "En preparación", "09:12", [l("p3", 2), l("p11", 1)], "Tarjeta"),
  mk("SLV-1043", "Diego", "Para llevar", "En preparación", "09:18", [l("p1", 1), l("p13", 2)], "Efectivo"),
  mk("SLV-1044", "Sofía L.", "App", "Listo", "09:24", [l("p8", 1), l("p16", 1)], "Transferencia"),
  mk("SLV-1045", "Mesa 4", "Mostrador", "Listo", "09:31", [l("p15", 2), l("p6", 2)], "Tarjeta"),
  mk("SLV-1046", "Andrés P.", "Para llevar", "Entregado", "09:40", [l("p4", 1), l("p12", 1)], "Efectivo"),
  mk("SLV-1047", "Mesa 2", "Mostrador", "En preparación", "09:52", [l("p18", 2), l("p2", 2), l("p14", 2)], "Tarjeta"),
];

export const ventasPorHora = [
  { hora: "07:00", ventas: 420 },
  { hora: "08:00", ventas: 1180 },
  { hora: "09:00", ventas: 1960 },
  { hora: "10:00", ventas: 2340 },
  { hora: "11:00", ventas: 1720 },
  { hora: "12:00", ventas: 2110 },
  { hora: "13:00", ventas: 2680 },
  { hora: "14:00", ventas: 1490 },
  { hora: "15:00", ventas: 980 },
];

export const ventasSemana = [
  { dia: "Lun", ventas: 11400, tickets: 142 },
  { dia: "Mar", ventas: 12850, tickets: 158 },
  { dia: "Mié", ventas: 12190, tickets: 149 },
  { dia: "Jue", ventas: 14320, tickets: 171 },
  { dia: "Vie", ventas: 18760, tickets: 214 },
  { dia: "Sáb", ventas: 22480, tickets: 259 },
  { dia: "Dom", ventas: 19630, tickets: 231 },
];

export const topProductos = [
  { nombre: "Latte", unidades: 96, ingreso: 5568 },
  { nombre: "Americano", unidades: 84, ingreso: 3528 },
  { nombre: "Matcha latte", unidades: 61, ingreso: 4392 },
  { nombre: "Croissant", unidades: 58, ingreso: 2610 },
  { nombre: "Avo toast", unidades: 39, ingreso: 3705 },
];

export const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export const mxnExacto = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
