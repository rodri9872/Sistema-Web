"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/supabase/env";
import SetupNotice from "@/components/SetupNotice";
import { USERNAME_HINT, cleanUsername, traducirError, usernameToEmail, validUsername } from "@/lib/usuarios";

export default function LoginPage() {
  const [setup, setSetup] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isConfigured) return;
    supabase()
      .rpc("needs_setup")
      .then(({ data, error }) => {
        if (error) {
          setMsg(traducirError(error.message));
          setSetup(false);
        } else setSetup(Boolean(data));
      });
  }, []);

  if (!isConfigured) return <SetupNotice />;

  const signIn = async () => {
    const { error } = await supabase().auth.signInWithPassword({ email: usernameToEmail(username), password });
    if (error) throw new Error(traducirError(error.message));
    window.location.href = "/";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!validUsername(username)) return setMsg(USERNAME_HINT);
    setBusy(true);
    try {
      if (setup) {
        if (password !== password2) throw new Error("Las contraseñas no coinciden.");
        if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
        const { error } = await supabase().rpc("create_first_admin", {
          p_username: cleanUsername(username),
          p_password: password,
          p_full_name: name,
        });
        if (error) throw new Error(traducirError(error.message));
      }
      await signIn();
    } catch (err) {
      setMsg((err as Error).message);
      setBusy(false);
    }
  };

  if (setup === null) return <main className="flex min-h-screen items-center justify-center text-slate-500">Cargando…</main>;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Sistema Web</h1>
          <p className="text-sm text-slate-500">
            {setup ? "Configuración inicial: creá el usuario administrador" : "Ingresá con tu usuario"}
          </p>
        </div>
        {setup && (
          <div className="rounded-md bg-green-50 p-3 text-xs text-green-900">
            Este será el <b>superusuario</b>: puede crear y administrar a los demás usuarios. Esta pantalla aparece una sola vez.
          </div>
        )}
        {setup && (
          <label className="block text-sm">
            Nombre y apellido
            <input className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label className="block text-sm">
          Usuario
          <input
            className="input mt-1 w-full"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {setup && <span className="mt-1 block text-xs text-slate-500">{USERNAME_HINT}</span>}
        </label>
        <label className="block text-sm">
          Contraseña
          <input
            className="input mt-1 w-full"
            type="password"
            autoComplete={setup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {setup && (
          <label className="block text-sm">
            Repetir contraseña
            <input
              className="input mt-1 w-full"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />
          </label>
        )}
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button className="btn btn-primary w-full justify-center" disabled={busy}>
          {busy ? "Un momento…" : setup ? "Crear administrador e ingresar" : "Ingresar"}
        </button>
        {!setup && <p className="text-center text-xs text-slate-500">¿No tenés usuario? Pedíselo al administrador.</p>}
      </form>
    </main>
  );
}
