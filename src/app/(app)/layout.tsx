"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DataProvider, useData } from "@/components/DataProvider";
import { isConfigured } from "@/lib/supabase/env";
import { supabase } from "@/lib/supabase/client";
import SetupNotice from "@/components/SetupNotice";
import CambiarClave from "@/components/CambiarClave";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/llamadas", label: "Llamadas", icon: "📞" },
  { href: "/planes", label: "Planes", icon: "📦" },
  { href: "/redes", label: "Redes sociales", icon: "📈" },
  { href: "/resultados", label: "Resultados mensuales", icon: "📊" },
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
  const [changePw, setChangePw] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setMenuOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);
  const logout = async () => {
    await supabase().auth.signOut();
    window.location.href = "/login";
  };
  const current = NAV.find((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)));
  return (
    <div className="flex min-h-screen">
      {/* Barra superior en celular */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-2 border-b border-slate-200 bg-white px-3 md:hidden">
        <button className="rounded-md p-2 text-xl leading-none hover:bg-slate-100" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
          ☰
        </button>
        <span className="truncate font-semibold">Sistema Web</span>
      </header>
      {menuOpen && <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setMenuOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform md:sticky md:top-0 md:w-56 md:translate-x-0 ${
          menuOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold">Sistema Web</span>
          <button className="rounded-md p-1 text-slate-500 hover:bg-slate-100 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            ✕
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {NAV.map((n) => {
            const active = n === current;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm md:py-2 ${
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
          <div className="truncate text-xs text-slate-500">
            @{me?.username ?? "…"} · {me?.role === "admin" ? "Administrador" : "Usuario"}
          </div>
          <div className="mt-2 flex flex-col items-start gap-1">
            <button onClick={() => {
                setChangePw(true);
                setMenuOpen(false);
              }} className="py-0.5 text-xs text-slate-500 hover:underline">
              Cambiar mi contraseña
            </button>
            <button onClick={logout} className="py-0.5 text-xs text-slate-500 hover:underline">
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
      {changePw && <CambiarClave onClose={() => setChangePw(false)} />}
      <main className="min-w-0 flex-1 px-3 pb-4 pt-15 md:p-5">{loading ? <p className="text-slate-500">Cargando…</p> : children}</main>
    </div>
  );
}
