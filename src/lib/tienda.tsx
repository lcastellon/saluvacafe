import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  pedidosIniciales,
  productos as productosSeed,
  type EstadoPedido,
  type LineaPedido,
  type Pedido,
  type Producto,
} from "@/data/saluva";

type Negocio = {
  nombre: string;
  sucursal: string;
  direccion: string;
  telefono: string;
  horario: string;
  iva: number;
  propinaSugerida: number;
  moneda: string;
};

type Ctx = {
  productos: Producto[];
  pedidos: Pedido[];
  negocio: Negocio;
  setNegocio: (n: Negocio) => void;
  toggleProducto: (id: string) => void;
  actualizarPrecio: (id: string, precio: number) => void;
  crearProducto: (p: Omit<Producto, "id">) => void;
  eliminarProducto: (id: string) => void;
  cambiarEstado: (id: string, estado: EstadoPedido) => void;
  crearPedido: (args: {
    cliente: string;
    canal: Pedido["canal"];
    metodoPago: Pedido["metodoPago"];
    items: LineaPedido[];
  }) => Pedido;
};


const TiendaContext = createContext<Ctx | null>(null);

export function TiendaProvider({ children }: { children: ReactNode }) {
  const [productos, setProductos] = useState<Producto[]>(productosSeed);
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales);
  const [folio, setFolio] = useState(1048);
  const [negocio, setNegocio] = useState<Negocio>({
    nombre: "Salúva",
    sucursal: "Salúva Centro",
    direccion: "Av. Reforma 118, Col. Juárez",
    telefono: "55 4821 0093",
    horario: "07:00 – 20:00",
    iva: 16,
    propinaSugerida: 10,
    moneda: "MXN",
  });

  const value = useMemo<Ctx>(
    () => ({
      productos,
      pedidos,
      negocio,
      setNegocio,
      toggleProducto: (id) =>
        setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, activo: !p.activo } : p))),
      actualizarPrecio: (id, precio) =>
        setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, precio } : p))),
      crearProducto: (p) =>
        setProductos((prev) => [{ ...p, id: `p-${Date.now()}-${prev.length}` }, ...prev]),
      eliminarProducto: (id) => setProductos((prev) => prev.filter((p) => p.id !== id)),

      cambiarEstado: (id, estado) =>
        setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p))),
      crearPedido: ({ cliente, canal, metodoPago, items }) => {
        const nuevo: Pedido = {
          id: `SLV-${folio}`,
          folio: `SLV-${folio}`,
          cliente: cliente || "Mostrador",
          canal,
          metodoPago,
          estado: "En preparación",
          hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
          items,
          total: items.reduce((s, i) => s + i.precio * i.cantidad, 0),
        };
        setFolio((f) => f + 1);
        setPedidos((prev) => [nuevo, ...prev]);
        return nuevo;
      },
    }),
    [productos, pedidos, negocio, folio],
  );

  return <TiendaContext.Provider value={value}>{children}</TiendaContext.Provider>;
}

export function useTienda() {
  const ctx = useContext(TiendaContext);
  if (!ctx) throw new Error("useTienda debe usarse dentro de TiendaProvider");
  return ctx;
}
