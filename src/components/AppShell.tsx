import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DoodleTaza, DoodleFlor, DoodleTrazo } from "@/components/doodles";
import {
  BarChart3,
  Boxes,
  Coffee,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { listarInsumos } from "@/lib/inventario.functions";


const nav: { to: string; label: string; icon: LucideIcon; soloAdmin?: boolean }[] = [
  { to: "/panel", label: "Dashboard", icon: LayoutDashboard },
  { to: "/caja", label: "Punto de venta", icon: ShoppingBag },
  { to: "/pedidos", label: "Pedidos activos", icon: ReceiptText },
  { to: "/menu", label: "Menú y productos", icon: Coffee },
  { to: "/inventario", label: "Inventario", icon: Boxes },
  { to: "/reportes", label: "Reportes", icon: BarChart3, soloAdmin: true },
  { to: "/personal", label: "Personal", icon: Users, soloAdmin: true },
  { to: "/configuracion", label: "Configuración", icon: Settings, soloAdmin: true },
];

type Insumo = {
  id: string;
  nombre: string;
  unidad: string;
  existencia: number;
  minimo: number;
};

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
  const { perfil, esAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listar = useServerFn(listarInsumos);

  const { data: insumos } = useQuery({
    queryKey: ["insumos"],
    queryFn: () => listar() as Promise<Insumo[]>,
  });

  const faltantes =
    (insumos ?? []).filter((i) => i.minimo > 0 && Number(i.existencia) <= Number(i.minimo) * 0.1).length;

  const items = nav.filter((n) => !n.soloAdmin || esAdmin);

  const salir = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-sidebar-primary text-sidebar-primary">
            <DoodleTaza className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold uppercase leading-none tracking-tight">
              Sal<span className="text-sidebar-primary">ú</span>va
            </p>
            <p className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/55">
              CAFÉ
            </p>
          </div>
        </div>
        <DoodleTrazo className="mt-4 h-2 w-full text-sidebar-primary/70" />

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground" }}
              inactiveProps={{ className: "text-sidebar-foreground/70 hover:bg-sidebar-accent" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="relative overflow-hidden rounded-xl border border-sidebar-border p-4">
          <DoodleFlor className="absolute -right-2 -top-2 h-14 w-14 text-sidebar-primary/30" />
          <p className="text-[11px] uppercase tracking-[0.16em] text-sidebar-foreground/60">
            {esAdmin ? "Administración" : "Turno en curso"}
          </p>
          <p className="mt-1 truncate font-display text-lg font-semibold">{perfil?.nombre ?? "Salúva"}</p>
          <p className="mt-1 text-xs text-sidebar-foreground/60">
            Código {perfil?.codigo ?? "······"} · Caja 1
          </p>
          <button
            onClick={salir}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-background/90 px-5 py-4 backdrop-blur sm:flex sm:flex-wrap sm:justify-between lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
            <DoodleTrazo className="mt-1 h-1.5 w-24 text-primary" />
            <p className="mt-2 truncate text-sm text-muted-foreground">{descripcion}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {acciones}
            <button
              onClick={salir}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-accent md:hidden"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-cream px-4 py-2 md:hidden">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              inactiveProps={{ className: "border border-border text-foreground" }}
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
