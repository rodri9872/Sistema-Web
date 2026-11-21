"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DataProvider, useData } from "@/components/DataProvider";
import { isConfigured } from "@/lib/supabase/env";
import { supabase } from "@/lib/supabase/client";
import SetupNotice from "@/components/SetupNotice";

const NAV = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/llamadas", label: "Llamadas", icon: "📞" },
  { href: "/planes", label: "Planes", icon: "📦" },
  { href: "/redes", label: "Redes sociales", icon: "📈" },
  { href: "/configuracion", label: "Configuración", icon: "⚙️" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured) return <SetupNotice />;
  return (
    <DataProvider>
      <Shell>{children}</Shell>
    </DataProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { me, loading } = useData();
  const logout = async () => {
    await supabase().auth.signOut();
    window.location.href = "/login";
  };
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-4 py-4 text-lg font-semibold">Sistema Web</div>
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  active ? "bg-green-50 font-medium text-green-800" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3 text-sm">
          <div className="truncate font-medium">{me?.full_name ?? "…"}</div>
          <div className="truncate text-xs text-slate-500">{me?.role === "admin" ? "Administrador" : "Usuario"}</div>
          <button onClick={logout} className="mt-2 text-xs text-slate-500 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5">{loading ? <p className="text-slate-500">Cargando…</p> : children}</main>
    </div>
  );
}
