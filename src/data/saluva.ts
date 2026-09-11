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
  {
    id: "p1",
    nombre: "Americano",
    categoria: "Café caliente",
    precio: 42,
    costo: 11,
    descripcion: "Doble shot con agua caliente",
    activo: true,
    emoji: "☕",
  },
  {
    id: "p2",
    nombre: "Espresso doble",
    categoria: "Café caliente",
    precio: 38,
    costo: 9,
    descripcion: "Intenso, de origen Chiapas",
    activo: true,
    emoji: "☕",
  },
  {
    id: "p3",
    nombre: "Latte",
    categoria: "Café caliente",
    precio: 58,
    costo: 17,
    descripcion: "Leche vaporizada y arte latte",
    activo: true,
    emoji: "🥛",
  },
  {
    id: "p4",
    nombre: "Cappuccino",
    categoria: "Café caliente",
    precio: 56,
    costo: 16,
    descripcion: "Espuma densa y canela",
    activo: true,
    emoji: "☕",
  },
  {
    id: "p5",
    nombre: "Flat white",
    categoria: "Café caliente",
    precio: 60,
    costo: 18,
    descripcion: "Microespuma sedosa",
    activo: true,
    emoji: "☕",
  },
  {
    id: "p6",
    nombre: "Cold brew",
    categoria: "Café frío",
    precio: 62,
    costo: 15,
    descripcion: "18 horas de extracción en frío",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "p7",
    nombre: "Latte helado",
    categoria: "Café frío",
    precio: 62,
    costo: 18,
    descripcion: "Servido sobre hielo",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "p8",
    nombre: "Matcha latte",
    categoria: "Infusiones",
    precio: 72,
    costo: 24,
    descripcion: "Matcha ceremonial japonés",
    activo: true,
    emoji: "🍵",
  },
  {
    id: "p9",
    nombre: "Chai latte",
    categoria: "Infusiones",
    precio: 66,
    costo: 20,
    descripcion: "Especias molidas en casa",
    activo: true,
    emoji: "🍵",
  },
  {
    id: "p10",
    nombre: "Té de jamaica",
    categoria: "Infusiones",
    precio: 40,
    costo: 8,
    descripcion: "Frío o caliente, sin azúcar",
    activo: true,
    emoji: "🌺",
  },
  {
    id: "p11",
    nombre: "Croissant de mantequilla",
    categoria: "Panadería",
    precio: 45,
    costo: 14,
    descripcion: "Hojaldre horneado cada mañana",
    activo: true,
    emoji: "🥐",
  },
  {
    id: "p12",
    nombre: "Panqué de plátano",
    categoria: "Panadería",
    precio: 42,
    costo: 12,
    descripcion: "Con nuez caramelizada",
    activo: true,
    emoji: "🍰",
  },
  {
    id: "p13",
    nombre: "Galletas de avena",
    categoria: "Panadería",
    precio: 28,
    costo: 7,
    descripcion: "Pieza artesanal con chispas",
    activo: true,
    emoji: "🍪",
  },
  {
    id: "p14",
    nombre: "Concha de vainilla",
    categoria: "Panadería",
    precio: 26,
    costo: 6,
    descripcion: "Receta tradicional",
    activo: true,
    emoji: "🥯",
  },
  {
    id: "p15",
    nombre: "Avo toast",
    categoria: "Desayunos",
    precio: 95,
    costo: 34,
    descripcion: "Pan de masa madre, aguacate y ajonjolí",
    activo: true,
    emoji: "🥑",
  },
  {
    id: "p16",
    nombre: "Bowl de yogurt griego",
    categoria: "Desayunos",
    precio: 88,
    costo: 30,
    descripcion: "Granola de la casa y frutos rojos",
    activo: true,
    emoji: "🥣",
  },
  {
    id: "p17",
    nombre: "Molletes Salúva",
    categoria: "Desayunos",
    precio: 92,
    costo: 31,
    descripcion: "Frijol, queso gratinado y pico de gallo",
    activo: true,
    emoji: "🫓",
  },
  {
    id: "p18",
    nombre: "Huevos al comal",
    categoria: "Desayunos",
    precio: 98,
    costo: 35,
    descripcion: "Dos huevos, salsa verde y tortilla",
    activo: true,
    emoji: "🍳",
  },
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
  {
    id: "i1",
    nombre: "Café en grano (Chiapas)",
    unidad: "kg",
    existencia: 12.4,
    minimo: 6,
    costoUnitario: 320,
    proveedor: "Finca La Alameda",
  },
  {
    id: "i2",
    nombre: "Leche entera",
    unidad: "L",
    existencia: 18,
    minimo: 24,
    costoUnitario: 26,
    proveedor: "Lácteos del Valle",
  },
  {
    id: "i3",
    nombre: "Leche de avena",
    unidad: "L",
    existencia: 9,
    minimo: 8,
    costoUnitario: 48,
    proveedor: "Avena Nórdica",
  },
  {
    id: "i4",
    nombre: "Matcha ceremonial",
    unidad: "g",
    existencia: 340,
    minimo: 500,
    costoUnitario: 3.2,
    proveedor: "Uji Import",
  },
  {
    id: "i5",
    nombre: "Mezcla de chai",
    unidad: "g",
    existencia: 820,
    minimo: 400,
    costoUnitario: 1.4,
    proveedor: "Especias Kali",
  },
  {
    id: "i6",
    nombre: "Harina de trigo",
    unidad: "kg",
    existencia: 22,
    minimo: 10,
    costoUnitario: 32,
    proveedor: "Molino San Juan",
  },
  {
    id: "i7",
    nombre: "Mantequilla",
    unidad: "kg",
    existencia: 5.5,
    minimo: 6,
    costoUnitario: 210,
    proveedor: "Lácteos del Valle",
  },
  {
    id: "i8",
    nombre: "Aguacate",
    unidad: "pza",
    existencia: 46,
    minimo: 30,
    costoUnitario: 14,
    proveedor: "Mercado Central",
  },
  {
    id: "i9",
    nombre: "Huevo",
    unidad: "pza",
    existencia: 120,
    minimo: 90,
    costoUnitario: 4.1,
    proveedor: "Granja El Roble",
  },
  {
    id: "i10",
    nombre: "Vasos 12 oz",
    unidad: "pza",
    existencia: 380,
    minimo: 250,
    costoUnitario: 2.3,
    proveedor: "EcoPack",
  },
];

export type EstadoPedido = "En preparación" | "Listo" | "Entregado";

export type LineaPedido = {
  lineaId?: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  opciones?: string[];
};

/* ---------- Modificadores ---------- */

export type OpcionModificador = { valor: string; extra: number };

export const TAMANOS: OpcionModificador[] = [
  { valor: "Chico", extra: -6 },
  { valor: "Mediano", extra: 0 },
  { valor: "Grande", extra: 10 },
];

export const LECHES: OpcionModificador[] = [
  { valor: "Entera", extra: 0 },
  { valor: "Deslactosada", extra: 5 },
  { valor: "Avena", extra: 12 },
  { valor: "Almendra", extra: 12 },
];

export const EXTRA_SHOT = 15;

export const categoriasConBebida: Categoria[] = ["Café caliente", "Café frío", "Infusiones"];

export const esBebida = (categoria: Categoria) => categoriasConBebida.includes(categoria);

export type Pedido = {
  id: string;
  folio: string;
  cliente: string;
  canal: "A mesa" | "Para llevar" | "Para recoger";
  estado: EstadoPedido;
  hora: string;
  items: LineaPedido[];
  subtotal: number;
  iva: number;
  total: number;
  metodoPago: "Efectivo" | "Tarjeta" | "Transferencia";
  cajaId?: string | undefined;
  propina?: number;
  montoRecibido?: number;
  cambio?: number;
  comensales: number;
  creadoEn: string;
  sincronizacion: "pendiente" | "sincronizado";
};

export const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

export const mxnExacto = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
