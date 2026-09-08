import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { leerAuthCache } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/_admin")({
  ssr: false,
  beforeLoad: async () => {
    if (!navigator.onLine) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw redirect({ to: "/" });
      if (leerAuthCache(data.session.user.id)?.rol !== "admin") {
        throw redirect({ to: "/panel" });
      }
      return {};
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
    const { data: esAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!esAdmin) throw redirect({ to: "/panel" });
    return {};
  },
  component: () => <Outlet />,
});
