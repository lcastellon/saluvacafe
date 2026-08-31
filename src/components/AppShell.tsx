import { Link } from "@tanstack/react-router";
import { DoodleTaza, DoodleFlor, DoodleTrazo } from "@/components/doodles";
import {
  BarChart3,
  Boxes,
  Coffee,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

const nav: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/caja", label: "Punto de venta", icon: ShoppingBag },
  { to: "/pedidos", label: "Pedidos activos", icon: ReceiptText },
  { to: "/menu", label: "Menú y productos", icon: Coffee },
  { to: "/inventario", label: "Inventario", icon: Boxes },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

export function AppShell({
  titulo,
  descripcion,
  acciones,
  children,
}: {
  titulo: string;
  descripcion: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sidebar-primary text-lg font-semibold text-sidebar-primary-foreground">
            S
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-xl leading-none">Salúva</p>
            <p className="mt-1 truncate text-xs text-sidebar-foreground/60">Café de barrio</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              inactiveProps={{ className: "text-sidebar-foreground/70 hover:bg-sidebar-accent/60" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="rounded-2xl bg-sidebar-accent/70 p-4">
          <p className="text-xs text-sidebar-foreground/70">Turno matutino</p>
          <p className="mt-1 font-display text-lg">Ana Sotelo</p>
          <p className="mt-1 text-xs text-sidebar-foreground/60">Caja 1 · abierta desde 07:00</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-background/85 px-5 py-4 backdrop-blur sm:flex sm:flex-wrap sm:justify-between lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold sm:text-3xl">{titulo}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">{descripcion}</p>
          </div>
          {acciones ? <div className="flex shrink-0 items-center gap-2">{acciones}</div> : null}
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-cream px-4 py-2 md:hidden">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
