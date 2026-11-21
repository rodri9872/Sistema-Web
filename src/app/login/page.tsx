"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/supabase/env";
import SetupNotice from "@/components/SetupNotice";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isConfigured) return <SetupNotice />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = supabase();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg({ text: traducir(error.message), error: true });
      else window.location.href = "/";
    } else {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) setMsg({ text: traducir(error.message), error: true });
      else if (data.session) window.location.href = "/";
      else setMsg({ text: "Cuenta creada. Revisá tu correo y confirmá la cuenta, después iniciá sesión." });
    }
    setBusy(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Sistema Web</h1>
          <p className="text-sm text-slate-500">{mode === "login" ? "Iniciá sesión para continuar" : "Crear una cuenta nueva"}</p>
        </div>
        {mode === "signup" && (
          <label className="block text-sm">
            Nombre
            <input className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label className="block text-sm">
          Correo
          <input className="input mt-1 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm">
          Contraseña
          <input
            className="input mt-1 w-full"
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {msg && <p className={`text-sm ${msg.error ? "text-red-600" : "text-green-700"}`}>{msg.text}</p>}
        <button className="btn btn-primary w-full justify-center" disabled={busy}>
          {busy ? "Un momento…" : mode === "login" ? "Ingresar" : "Crear cuenta"}
        </button>
        <button
          type="button"
          className="w-full text-center text-sm text-slate-500 hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "¿No tenés cuenta? Crear una" : "Ya tengo cuenta, iniciar sesión"}
        </button>
      </form>
    </main>
  );
}

function traducir(m: string) {
  if (/invalid login/i.test(m)) return "Correo o contraseña incorrectos.";
  if (/already registered/i.test(m)) return "Ese correo ya tiene una cuenta.";
  if (/email not confirmed/i.test(m)) return "Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.";
  if (/password/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
  return m;
}
