export type Categoria =
  "Espresso" | "Cold brew" | "Filtrados" | "Matcha y hōjicha" | "Bebidas extra" | "Panadería";

export const CATALOGO_VERSION = 2;
export const IVA_INCLUIDO = 16;

export type Producto = {
  id: string;
  nombre: string;
  categoria: Categoria;
  precio: number;
  precioMaximo?: number;
  costo: number;
  descripcion: string;
  activo: boolean;
  emoji: string;
};

export const productos: Producto[] = [
  {
    id: "espresso",
    nombre: "Espresso",
    categoria: "Espresso",
    precio: 60,
    costo: 0,
    descripcion: "Espresso de la casa",
    activo: true,
    emoji: "☕",
  },
  {
    id: "americano",
    nombre: "Americano",
    categoria: "Espresso",
    precio: 60,
    costo: 0,
    descripcion: "Espresso con agua caliente",
    activo: true,
    emoji: "☕",
  },
  {
    id: "cortado",
    nombre: "Cortado",
    categoria: "Espresso",
    precio: 65,
    costo: 0,
    descripcion: "Espresso cortado con leche",
    activo: true,
    emoji: "☕",
  },
  {
    id: "flat-white",
    nombre: "Flat white",
    categoria: "Espresso",
    precio: 65,
    costo: 0,
    descripcion: "Espresso con microespuma",
    activo: true,
    emoji: "☕",
  },
  {
    id: "cappuccino",
    nombre: "Cappuccino",
    categoria: "Espresso",
    precio: 70,
    costo: 0,
    descripcion: "Espresso, leche y espuma",
    activo: true,
    emoji: "☕",
  },
  {
    id: "latte",
    nombre: "Latte",
    categoria: "Espresso",
    precio: 70,
    costo: 0,
    descripcion: "Espresso con leche",
    activo: true,
    emoji: "🥛",
  },
  {
    id: "latte-frio",
    nombre: "Latte frío",
    categoria: "Espresso",
    precio: 80,
    costo: 0,
    descripcion: "Espresso y leche servido frío",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "espresso-tonic",
    nombre: "Espresso tonic",
    categoria: "Espresso",
    precio: 80,
    costo: 0,
    descripcion: "Espresso con agua tónica",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "vainilla-latte",
    nombre: "Vainilla latte",
    categoria: "Espresso",
    precio: 85,
    costo: 0,
    descripcion: "Latte con vainilla",
    activo: true,
    emoji: "🥛",
  },
  {
    id: "lavanda-latte",
    nombre: "Lavanda latte",
    categoria: "Espresso",
    precio: 85,
    costo: 0,
    descripcion: "Latte con lavanda",
    activo: true,
    emoji: "🥛",
  },
  {
    id: "cold-brew",
    nombre: "Cold brew",
    categoria: "Cold brew",
    precio: 70,
    costo: 0,
    descripcion: "Café extraído en frío",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "cold-brew-latte",
    nombre: "Cold brew latte",
    categoria: "Cold brew",
    precio: 80,
    costo: 0,
    descripcion: "Cold brew con leche",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "cold-brew-tonic",
    nombre: "Cold brew tonic",
    categoria: "Cold brew",
    precio: 80,
    costo: 0,
    descripcion: "Cold brew con agua tónica",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "saluva-cold-brew",
    nombre: "Salúva cold brew",
    categoria: "Cold brew",
    precio: 70,
    costo: 0,
    descripcion: "Especialidad fría de la casa",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "shakerato",
    nombre: "Shakerato",
    categoria: "Cold brew",
    precio: 90,
    costo: 0,
    descripcion: "Café frío agitado",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "taro-cold-brew",
    nombre: "Taro cold brew",
    categoria: "Cold brew",
    precio: 95,
    costo: 0,
    descripcion: "Cold brew con taro",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "grano-temporada",
    nombre: "Grano de temporada",
    categoria: "Filtrados",
    precio: 80,
    costo: 0,
    descripcion: "Café filtrado con grano de temporada",
    activo: true,
    emoji: "☕",
  },
  {
    id: "grano-invitado",
    nombre: "Grano invitado",
    categoria: "Filtrados",
    precio: 90,
    precioMaximo: 300,
    costo: 0,
    descripcion: "Precio según el grano seleccionado",
    activo: true,
    emoji: "☕",
  },
  {
    id: "batch-brew",
    nombre: "Batch brew (café del día)",
    categoria: "Filtrados",
    precio: 35,
    costo: 0,
    descripcion: "Café filtrado del día",
    activo: true,
    emoji: "☕",
  },
  {
    id: "usucha-tradicional",
    nombre: "Usucha tradicional",
    categoria: "Matcha y hōjicha",
    precio: 85,
    costo: 0,
    descripcion: "Matcha ceremonial grado alto",
    activo: true,
    emoji: "🍵",
  },
  {
    id: "matcha-latte-caliente",
    nombre: "Matcha latte caliente",
    categoria: "Matcha y hōjicha",
    precio: 90,
    costo: 0,
    descripcion: "Matcha ceremonial con leche",
    activo: true,
    emoji: "🍵",
  },
  {
    id: "matcha-latte-frio",
    nombre: "Matcha latte frío",
    categoria: "Matcha y hōjicha",
    precio: 90,
    costo: 0,
    descripcion: "Matcha ceremonial frío con leche",
    activo: true,
    emoji: "🍵",
  },
  {
    id: "matcha-tonic",
    nombre: "Matcha tonic",
    categoria: "Matcha y hōjicha",
    precio: 90,
    costo: 0,
    descripcion: "Matcha ceremonial con agua tónica",
    activo: true,
    emoji: "🍵",
  },
  {
    id: "hojicha-latte-caliente",
    nombre: "Hōjicha latte caliente",
    categoria: "Matcha y hōjicha",
    precio: 90,
    costo: 0,
    descripcion: "Té hōjicha tostado con leche",
    activo: true,
    emoji: "🍵",
  },
  {
    id: "hojicha-latte-frio",
    nombre: "Hōjicha latte frío",
    categoria: "Matcha y hōjicha",
    precio: 90,
    costo: 0,
    descripcion: "Té hōjicha tostado frío con leche",
    activo: true,
    emoji: "🍵",
  },
  {
    id: "hojicha-shakerato",
    nombre: "Hōjicha shakerato",
    categoria: "Matcha y hōjicha",
    precio: 95,
    costo: 0,
    descripcion: "Hōjicha frío agitado",
    activo: true,
    emoji: "🍵",
  },
  {
    id: "agua-mineral-topo-chico",
    nombre: "Agua mineral Topo Chico",
    categoria: "Bebidas extra",
    precio: 50,
    costo: 0,
    descripcion: "Agua mineral",
    activo: true,
    emoji: "💧",
  },
  {
    id: "taro-caliente",
    nombre: "Taro caliente",
    categoria: "Bebidas extra",
    precio: 80,
    costo: 0,
    descripcion: "Bebida de taro caliente",
    activo: true,
    emoji: "🥛",
  },
  {
    id: "taro-frio",
    nombre: "Taro frío",
    categoria: "Bebidas extra",
    precio: 80,
    costo: 0,
    descripcion: "Bebida de taro fría",
    activo: true,
    emoji: "🧊",
  },
  {
    id: "panque-casa",
    nombre: "Panqué de la casa",
    categoria: "Panadería",
    precio: 70,
    costo: 0,
    descripcion: "Rebanada de plátano, avena y chocolate",
    activo: true,
    emoji: "🍰",
  },
  {
    id: "panque-limon",
    nombre: "Panqué de limón",
    categoria: "Panadería",
    precio: 70,
    costo: 0,
    descripcion: "Rebanada con frosting de limón y semilla de amapola",
    activo: true,
    emoji: "🍰",
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
    nombre: "Café en grano de la casa",
    unidad: "g",
    existencia: 5000,
    minimo: 2000,
    costoUnitario: 0.35,
    proveedor: "Por definir",
  },
  {
    id: "i2",
    nombre: "Café para cold brew",
    unidad: "g",
    existencia: 3000,
    minimo: 1500,
    costoUnitario: 0.35,
    proveedor: "Por definir",
  },
  {
    id: "i3",
    nombre: "Grano de temporada",
    unidad: "g",
    existencia: 2000,
    minimo: 1000,
    costoUnitario: 0.42,
    proveedor: "Por definir",
  },
  {
    id: "i4",
    nombre: "Grano invitado",
    unidad: "g",
    existencia: 1000,
    minimo: 500,
    costoUnitario: 0.65,
    proveedor: "Por definir",
  },
  {
    id: "i5",
    nombre: "Leche entera",
    unidad: "L",
    existencia: 24,
    minimo: 12,
    costoUnitario: 28,
    proveedor: "Por definir",
  },
  {
    id: "i6",
    nombre: "Leche de avena",
    unidad: "L",
    existencia: 8,
    minimo: 4,
    costoUnitario: 58,
    proveedor: "Por definir",
  },
  {
    id: "i7",
    nombre: "Leche de soya",
    unidad: "L",
    existencia: 6,
    minimo: 3,
    costoUnitario: 45,
    proveedor: "Por definir",
  },
  {
    id: "i8",
    nombre: "Matcha ceremonial",
    unidad: "g",
    existencia: 500,
    minimo: 200,
    costoUnitario: 3.5,
    proveedor: "Por definir",
  },
  {
    id: "i9",
    nombre: "Hōjicha",
    unidad: "g",
    existencia: 400,
    minimo: 150,
    costoUnitario: 2.5,
    proveedor: "Por definir",
  },
  {
    id: "i10",
    nombre: "Taro en polvo",
    unidad: "g",
    existencia: 1000,
    minimo: 400,
    costoUnitario: 0.45,
    proveedor: "Por definir",
  },
  {
    id: "i11",
    nombre: "Jarabe de vainilla",
    unidad: "ml",
    existencia: 2000,
    minimo: 500,
    costoUnitario: 0.18,
    proveedor: "Por definir",
  },
  {
    id: "i12",
    nombre: "Jarabe de lavanda",
    unidad: "ml",
    existencia: 1500,
    minimo: 500,
    costoUnitario: 0.2,
    proveedor: "Por definir",
  },
  {
    id: "i13",
    nombre: "Agua tónica",
    unidad: "pza",
    existencia: 24,
    minimo: 12,
    costoUnitario: 18,
    proveedor: "Por definir",
  },
  {
    id: "i14",
    nombre: "Agua mineral Topo Chico",
    unidad: "pza",
    existencia: 24,
    minimo: 12,
    costoUnitario: 22,
    proveedor: "Por definir",
  },
  {
    id: "i15",
    nombre: "Panqué de la casa",
    unidad: "rebanada",
    existencia: 12,
    minimo: 6,
    costoUnitario: 30,
    proveedor: "Producción propia",
  },
  {
    id: "i16",
    nombre: "Panqué de limón",
    unidad: "rebanada",
    existencia: 12,
    minimo: 6,
    costoUnitario: 30,
    proveedor: "Producción propia",
  },
  {
    id: "i17",
    nombre: "Hielo",
    unidad: "kg",
    existencia: 20,
    minimo: 8,
    costoUnitario: 4,
    proveedor: "Por definir",
  },
  {
    id: "i18",
    nombre: "Vasos 8 oz",
    unidad: "pza",
    existencia: 100,
    minimo: 50,
    costoUnitario: 1.6,
    proveedor: "Por definir",
  },
  {
    id: "i19",
    nombre: "Vasos 12 oz",
    unidad: "pza",
    existencia: 150,
    minimo: 75,
    costoUnitario: 2.1,
    proveedor: "Por definir",
  },
  {
    id: "i20",
    nombre: "Tapas 8 oz",
    unidad: "pza",
    existencia: 100,
    minimo: 50,
    costoUnitario: 1,
    proveedor: "Por definir",
  },
  {
    id: "i21",
    nombre: "Tapas 12 oz",
    unidad: "pza",
    existencia: 150,
    minimo: 75,
    costoUnitario: 1.2,
    proveedor: "Por definir",
  },
  {
    id: "i22",
    nombre: "Servilletas",
    unidad: "pza",
    existencia: 500,
    minimo: 200,
    costoUnitario: 0.15,
    proveedor: "Por definir",
  },
  {
    id: "i23",
    nombre: "Azúcar en sobres",
    unidad: "pza",
    existencia: 300,
    minimo: 100,
    costoUnitario: 0.25,
    proveedor: "Por definir",
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

export const LECHES: OpcionModificador[] = [
  { valor: "Sin cambio", extra: 0 },
  { valor: "Avena", extra: 15 },
  { valor: "Soya", extra: 10 },
];

export const EXTRA_SHOT = 25;

export const categoriasConBebida: Categoria[] = [
  "Espresso",
  "Cold brew",
  "Filtrados",
  "Matcha y hōjicha",
  "Bebidas extra",
];

export const esBebida = (categoria: Categoria) => categoriasConBebida.includes(categoria);

export function desglosarIvaIncluido(totalBruto: number) {
  const total = Math.round(totalBruto * 100) / 100;
  const subtotal = Math.round((total / (1 + IVA_INCLUIDO / 100)) * 100) / 100;
  return {
    subtotal,
    iva: Math.round((total - subtotal) * 100) / 100,
    total,
  };
}

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

export type Comanda = {
  id: string;
  folio: string;
  cliente: string;
  canal: Pedido["canal"];
  estado: EstadoPedido;
  hora: string;
  items: LineaPedido[];
  subtotal: number;
  iva: number;
  total: number;
  cajaId?: string | undefined;
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
