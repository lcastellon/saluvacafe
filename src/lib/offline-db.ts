import type { Comanda, Pedido, Producto } from "@/data/saluva";

export type NegocioLocal = {
  nombre: string;
  sucursal: string;
  direccion: string;
  telefono: string;
  horario: string;
  iva: number;
  propinaSugerida: number;
  moneda: string;
};

export type TiendaSnapshot = {
  catalogoVersion?: number;
  productos: Producto[];
  pedidos: Pedido[];
  comandas?: Comanda[];
  comandasEliminadas?: string[];
  negocio: NegocioLocal;
};

export type InsumoLocal = {
  id: string;
  clave: string;
  sucursal_id: string;
  nombre: string;
  unidad: string;
  existencia: number;
  minimo: number;
  costo_unitario: number;
  proveedor: string;
  activo: boolean;
};

const DB_NAME = "saluva-pos";
const DB_VERSION = 1;
const STORE_ESTADO = "estado";
const STORE_PENDIENTES = "ventas-pendientes";
const SNAPSHOT_KEY = "tienda";
const INVENTARIO_KEY = "inventario";
const TERMINAL_TOKEN_KEY = "terminal-token";

function claveInventario(sucursalId?: string | null) {
  return sucursalId ? `${INVENTARIO_KEY}:${sucursalId}` : INVENTARIO_KEY;
}

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ESTADO)) db.createObjectStore(STORE_ESTADO);
      if (!db.objectStoreNames.contains(STORE_PENDIENTES)) {
        db.createObjectStore(STORE_PENDIENTES, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("No se pudo abrir el almacenamiento local"));
  });
}

function esperar<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falló el almacenamiento local"));
  });
}

export async function cargarSnapshot(): Promise<TiendaSnapshot | null> {
  const db = await abrirDb();
  try {
    const tx = db.transaction(STORE_ESTADO, "readonly");
    return (await esperar(tx.objectStore(STORE_ESTADO).get(SNAPSHOT_KEY))) ?? null;
  } finally {
    db.close();
  }
}

export async function guardarSnapshot(snapshot: TiendaSnapshot): Promise<void> {
  const db = await abrirDb();
  try {
    const tx = db.transaction(STORE_ESTADO, "readwrite");
    await esperar(tx.objectStore(STORE_ESTADO).put(snapshot, SNAPSHOT_KEY));
  } finally {
    db.close();
  }
}

export async function cargarInventario(sucursalId?: string | null): Promise<InsumoLocal[]> {
  const db = await abrirDb();
  try {
    const tx = db.transaction(STORE_ESTADO, "readonly");
    const store = tx.objectStore(STORE_ESTADO);
    const guardadoRequest = esperar<InsumoLocal[] | undefined>(
      store.get(claveInventario(sucursalId)),
    );
    const anteriorRequest = sucursalId
      ? esperar<InsumoLocal[] | undefined>(store.get(INVENTARIO_KEY))
      : Promise.resolve(undefined);
    const [guardado, anteriorGuardado] = await Promise.all([guardadoRequest, anteriorRequest]);
    if (guardado) return guardado;

    // Compatibilidad con la copia creada antes de separar el inventario por sucursal.
    const anterior = anteriorGuardado ?? [];
    return sucursalId ? anterior.filter((insumo) => insumo.sucursal_id === sucursalId) : anterior;
  } finally {
    db.close();
  }
}

export async function guardarInventario(
  insumos: InsumoLocal[],
  sucursalId?: string | null,
): Promise<void> {
  const db = await abrirDb();
  try {
    const tx = db.transaction(STORE_ESTADO, "readwrite");
    await esperar(tx.objectStore(STORE_ESTADO).put(insumos, claveInventario(sucursalId)));
  } finally {
    db.close();
  }
}

export async function cargarTokenTerminal(): Promise<string | null> {
  const db = await abrirDb();
  try {
    const tx = db.transaction(STORE_ESTADO, "readonly");
    const token = await esperar(tx.objectStore(STORE_ESTADO).get(TERMINAL_TOKEN_KEY));
    return typeof token === "string" ? token : null;
  } finally {
    db.close();
  }
}

export async function guardarTokenTerminal(token: string): Promise<void> {
  const db = await abrirDb();
  try {
    const tx = db.transaction(STORE_ESTADO, "readwrite");
    await esperar(tx.objectStore(STORE_ESTADO).put(token, TERMINAL_TOKEN_KEY));
  } finally {
    db.close();
  }
}

export async function guardarPendiente(pedido: Pedido): Promise<void> {
  const db = await abrirDb();
  try {
    const tx = db.transaction(STORE_PENDIENTES, "readwrite");
    await esperar(tx.objectStore(STORE_PENDIENTES).put(pedido));
  } finally {
    db.close();
  }
}

export async function listarPendientes(): Promise<Pedido[]> {
  const db = await abrirDb();
  try {
    const tx = db.transaction(STORE_PENDIENTES, "readonly");
    return await esperar(tx.objectStore(STORE_PENDIENTES).getAll());
  } finally {
    db.close();
  }
}

export async function eliminarPendiente(id: string): Promise<void> {
  const db = await abrirDb();
  try {
    const tx = db.transaction(STORE_PENDIENTES, "readwrite");
    await esperar(tx.objectStore(STORE_PENDIENTES).delete(id));
  } finally {
    db.close();
  }
}
