# Plan: Editor completo de inventario

## Objetivo
Pasar el inventario de insumos de datos estáticos en memoria a una tabla en la base de datos, de modo que el administrador pueda crear, editar y eliminar insumos, y cualquier usuario autenticado pueda seguir ajustando existencias con los botones + y –.

## Alcance
- La tabla se llamará `public.insumos`.
- Se migran los 10 insumos actuales de `src/data/saluva.ts` a la base de datos.
- Se crean server functions para listar, crear, editar, eliminar y ajustar existencias.
- Se actualiza la pantalla `Inventario` para operar contra la base de datos.
- Se mantienen los productos y pedidos en memoria por ahora (afectan otras pantallas y no son parte de este cambio).

## Permisos
- **Admin**: puede crear, editar, eliminar y ajustar existencias.
- **Barista**: solo puede ajustar existencias con +/- y ver el inventario.
- El propio sistema no usará actualizaciones de columnas sensibles desde el cliente; el ajuste de existencias enviará solo el delta y el servidor calculará el nuevo valor.

## Cambios en la base de datos

### Tabla `public.insumos`
- `id uuid primary key default gen_random_uuid()`
- `nombre text not null`
- `unidad text not null` (kg, L, g, pza)
- `existencia numeric(12,2) not null default 0`
- `minimo numeric(12,2) not null default 0`
- `costo_unitario numeric(12,2) not null default 0`
- `proveedor text not null default ''`
- `activo boolean not null default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### Grants y RLS
- GRANT SELECT a `authenticated`.
- GRANT ALL a `service_role`.
- Activar RLS.
- Política: administrador puede gestionar todos los insumos (`has_role(auth.uid(), 'admin')`).
- Política: cualquier usuario autenticado puede ver insumos activos.

### Datos iniciales
Insertar los 10 insumos actuales de `src/data/saluva.ts` (café en grano, leches, matcha, harina, mantequilla, etc.).

### Trigger
Trigger estándar para mantener `updated_at` actualizado.

## Funciones de servidor (`src/lib/inventario.functions.ts`)

1. **listarInsumos** — `GET`, requiere autenticación. Devuelve todos los insumos activos ordenados por nombre.
2. **crearInsumo** — `POST`, admin. Valida nombre, unidad y números. Inserta en la base de datos.
3. **actualizarInsumo** — `POST`, admin. Actualiza nombre, unidad, existencia, mínimo, costo unitario, proveedor y activo.
4. **eliminarInsumo** — `POST`, admin. Marca el insumo como inactivo (soft delete).
5. **ajustarExistencia** — `POST`, autenticado. Recibe `id` y `delta` (puede ser negativo). Lee la existencia actual, calcula el nuevo valor con `max(0, ...)` y actualiza solo ese campo.

## Cambios en el frontend

### `src/lib/tienda.tsx`
- Eliminar `insumos` del contexto y del proveedor.
- Eliminar `ajustarInsumo` del contexto.
- Los productos y pedidos permanecen inalterados.

### `src/routes/_authenticated/inventario.tsx`
- Cargar insumos con `useQuery` llamando a `listarInsumos`.
- Mostrar tarjetas igual que ahora, con el valor total y alertas de "Reponer".
- Agregar botón "Nuevo insumo" visible solo para admin.
- Agregar un diálogo (`Dialog`) para crear y editar insumo con campos: nombre, unidad, existencia, mínimo, costo unitario, proveedor.
- En cada tarjeta, agregar menú/botones de "Editar" y "Eliminar" solo para admin.
- Los botones +/- funcionarán para cualquier usuario autenticado y dispararán `ajustarExistencia`.
- Invalidar la query después de cada mutación.

### Tipos
- Después de aplicar la migración, se regenerarán los tipos de Supabase para incluir `insumos`.

## Criterios de aceptación
- [ ] El admin puede abrir Inventario, hacer clic en "Nuevo insumo" y crear uno.
- [ ] El admin puede editar cualquier campo de un insumo existente.
- [ ] El admin puede "eliminar" un insumo (se oculta del listado).
- [ ] Cualquier usuario autenticado puede tocar +/- y la existencia cambia en tiempo real en la UI y persiste en la base de datos.
- [ ] Los insumos iniciales aparecen automáticamente tras aplicar la migración.
- [ ] La app sigue compilandose y el punto de venta sigue funcionando.

## Notas técnicas
- El ajuste de existencias no usará columnas editables por baristas; el servidor recibe solo el delta y aplica el cambio.
- Se reutilizarán los componentes existentes: `Dialog`, `Input`, `Label`, `Button`, `Badge`, `Progress` y los doodles de Salúva.
- Se seguirá el mismo patrón de server functions y React Query usado en la pantalla de Personal (`src/lib/personal.functions.ts`).
