"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { traducirError } from "@/lib/usuarios";

export default function CambiarClave({ onClose }: { onClose: () => void }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (p1.length < 6) return setMsg({ text: "La contraseña debe tener al menos 6 caracteres.", error: true });
    if (p1 !== p2) return setMsg({ text: "Las contraseñas no coinciden.", error: true });
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) return setMsg({ text: traducirError(error.message), error: true });
    setMsg({ text: "Contraseña cambiada ✓" });
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm space-y-3">
        <h2 className="text-lg font-semibold">Cambiar mi contraseña</h2>
        <label className="block text-sm">
          Nueva contraseña
          <input className="input mt-1 w-full" type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} required />
        </label>
        <label className="block text-sm">
          Repetir contraseña
          <input className="input mt-1 w-full" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} required />
        </label>
        {msg && <p className={`text-sm ${msg.error ? "text-red-600" : "text-green-700"}`}>{msg.text}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={busy}>
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
