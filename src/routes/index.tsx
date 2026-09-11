import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { emailDeCodigo, passwordDeCodigo, useAuth } from "@/lib/auth";
import { DoodleTaza, DoodleTrazo, DoodleFlor } from "@/components/doodles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acceso del personal · Salúva" },
      {
        name: "description",
        content:
          "Ingresa con tu código personal de Salúva para abrir la caja, atender pedidos y administrar la cafetería.",
      },
      { property: "og:title", content: "Acceso del personal · Salúva" },
      {
        property: "og:description",
        content: "Códigos individuales para administración y baristas de la cafetería Salúva.",
      },
    ],
  }),
  component: Acceso,
});

function Acceso() {
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const { session, cargando: cargandoSesion, refrescar } = useAuth();

  useEffect(() => {
    if (!cargandoSesion && session) void navigate({ to: "/panel", replace: true });
  }, [cargandoSesion, session, navigate]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = codigo.trim();
    if (!/^\d{6}$/.test(c)) {
      toast.error("El código debe tener 6 dígitos");
      return;
    }
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailDeCodigo(c),
      password: passwordDeCodigo(c),
    });
    if (error) {
      setCargando(false);
      toast.error("Código incorrecto o cuenta desactivada");
      return;
    }
    const { data: perfil } = await supabase.from("perfiles").select("activo").maybeSingle();
    if (perfil && perfil.activo === false) {
      await supabase.auth.signOut();
      setCargando(false);
      toast.error("Esta cuenta está desactivada");
      return;
    }
    await refrescar();
    setCargando(false);
    toast.success("Bienvenido a Salúva");
    void navigate({ to: "/panel", replace: true });
  };

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-sidebar-primary text-sidebar-primary">
            <DoodleTaza className="h-7 w-7" />
          </div>
          <p className="font-display text-2xl font-bold uppercase tracking-tight">
            Sal<span className="text-sidebar-primary">ú</span>va
          </p>
        </div>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">
            Cada persona del equipo
            <br />
            entra con su propio código.
          </h2>
          <DoodleTrazo className="mt-3 h-2 w-40 text-sidebar-primary" />
          <p className="mt-4 max-w-sm text-sm text-sidebar-foreground/70">
            Administración crea y desactiva los códigos de las baristas desde el panel de personal.
          </p>
        </div>
        <DoodleFlor className="absolute -bottom-10 -right-10 h-56 w-56 text-sidebar-primary/20" />
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <form onSubmit={entrar} className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-bold tracking-tight">Acceso del personal</h1>
          <DoodleTrazo className="mt-1 h-1.5 w-24 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Escribe tu código personal de 6 dígitos para iniciar tu turno.
          </p>

          <div className="mt-8 space-y-2">
            <Label htmlFor="codigo">Código de acceso</Label>
            <Input
              id="codigo"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              placeholder="••••••"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              className="text-center font-display text-2xl tracking-[0.5em]"
            />
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={cargando}>
            {cargando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
