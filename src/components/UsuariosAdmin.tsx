"use client";

import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import EditableGrid from "@/components/EditableGrid";
import { useData } from "@/components/DataProvider";
import { selectColumn } from "@/lib/grid";
import { supabase } from "@/lib/supabase/client";
import { USERNAME_HINT, cleanUsername, traducirError, validUsername } from "@/lib/usuarios";

export default function UsuariosAdmin({ height }: { height: string }) {
  const { me, profiles, reload } = useData();
  const isAdmin = me?.role === "admin";
  const [gridKey, setGridKey] = useState(0);
  const [panel, setPanel] = useState<"nuevo" | "clave" | "borrar" | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // formulario
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"usuario" | "admin">("usuario");
  const [target, setTarget] = useState("");

  const others = profiles.filter((p) => p.id !== me?.id);

  const columns = useMemo<ColDef[]>(
    () => [
      { field: "username", headerName: "Usuario", editable: isAdmin, minWidth: 160 },
      { field: "full_name", headerName: "Nombre", minWidth: 200, editable: (p) => isAdmin || p.data?.id === me?.id },
      selectColumn(
        "role",
        "Rol",
        [
          { value: "admin", label: "Administrador", color: "#6250d6" },
          { value: "usuario", label: "Usuario", color: "#64748b" },
        ],
        { editable: isAdmin },
      ),
      { field: "active", headerName: "Activo (puede ingresar)", cellDataType: "boolean", editable: isAdmin },
      {
        field: "created_at",
        headerName: "Creado",
        editable: false,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString("es-AR") : ""),
      },
    ],
    [isAdmin, me?.id],
  );

  const reset = () => {
    setUsername("");
    setFullName("");
    setPassword("");
    setRole("usuario");
    setTarget("");
  };

  const run = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true);
    setMsg(null);
    const { error } = await fn();
    setBusy(false);
    if (error) return setMsg({ text: traducirError(error.message), error: true });
    setMsg({ text: ok });
    reset();
    setPanel(null);
    setGridKey((k) => k + 1);
    reload();
  };

  const crear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validUsername(username)) return setMsg({ text: USERNAME_HINT, error: true });
    if (password.length < 6) return setMsg({ text: "La contraseña debe tener al menos 6 caracteres.", error: true });
    const u = cleanUsername(username);
    run(
      async () =>
        await supabase().rpc("admin_create_user", { p_username: u, p_password: password, p_full_name: fullName, p_role: role }),
      `Usuario "${u}" creado. Ya puede ingresar con su usuario y contraseña.`,
    );
  };

  const cambiarClave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return setMsg({ text: "Elegí un usuario.", error: true });
    if (password.length < 6) return setMsg({ text: "La contraseña debe tener al menos 6 caracteres.", error: true });
    run(async () => await supabase().rpc("admin_set_password", { p_user: target, p_password: password }), "Contraseña cambiada.");
  };

  const borrar = (e: React.FormEvent) => {
    e.preventDefault();
    const p = profiles.find((x) => x.id === target);
    if (!p) return setMsg({ text: "Elegí un usuario.", error: true });
    if (!window.confirm(`¿Borrar el usuario "${p.username}"? Sus clientes y llamadas quedan sin asignar. No se puede deshacer.`)) return;
    run(async () => await supabase().rpc("admin_delete_user", { p_user: target }), "Usuario borrado.");
  };

  const toggle = (k: "nuevo" | "clave" | "borrar") => {
    reset();
    setMsg(null);
    setPanel(panel === k ? null : k);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Cada persona ingresa con su <b>usuario</b> y contraseña.{" "}
        {isAdmin
          ? "Como administrador podés crear usuarios, cambiar contraseñas, roles, y desactivar o borrar usuarios."
          : "Solo un administrador puede crear usuarios o cambiar roles."}
      </p>

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button className={`btn ${panel === "nuevo" ? "btn-active" : "btn-primary"}`} onClick={() => toggle("nuevo")}>
            + Nuevo usuario
          </button>
          <button className={`btn ${panel === "clave" ? "btn-active" : ""}`} onClick={() => toggle("clave")}>
            Cambiar contraseña de un usuario
          </button>
          <button className={`btn ${panel === "borrar" ? "btn-active" : "btn-danger"}`} onClick={() => toggle("borrar")}>
            Borrar usuario
          </button>
        </div>
      )}

      {panel === "nuevo" && (
        <form onSubmit={crear} className="card grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Usuario
            <input className="input mt-1 w-full" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <span className="mt-1 block text-xs text-slate-500">{USERNAME_HINT}</span>
          </label>
          <label className="text-sm">
            Nombre y apellido
            <input className="input mt-1 w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="text-sm">
            Contraseña inicial
            <input className="input mt-1 w-full" type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <span className="mt-1 block text-xs text-slate-500">Pasásela a la persona; después la puede cambiar.</span>
          </label>
          <label className="text-sm">
            Rol
            <select className="input mt-1 w-full" value={role} onChange={(e) => setRole(e.target.value as "usuario" | "admin")}>
              <option value="usuario">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        </form>
      )}

      {(panel === "clave" || panel === "borrar") && (
        <form onSubmit={panel === "clave" ? cambiarClave : borrar} className="card flex max-w-3xl flex-wrap items-end gap-3">
          <label className="text-sm">
            Usuario
            <select className="input mt-1 block w-60" value={target} onChange={(e) => setTarget(e.target.value)} required>
              <option value="">Elegí…</option>
              {(panel === "borrar" ? others : profiles).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.username} {p.full_name ? `(${p.full_name})` : ""}
                </option>
              ))}
            </select>
          </label>
          {panel === "clave" && (
            <label className="text-sm">
              Nueva contraseña
              <input className="input mt-1 block w-60" type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
          )}
          <button className={`btn ${panel === "clave" ? "btn-primary" : "btn-danger"}`} disabled={busy}>
            {panel === "clave" ? "Cambiar contraseña" : "Borrar usuario"}
          </button>
        </form>
      )}

      {msg && <p className={`text-sm ${msg.error ? "text-red-600" : "text-green-700"}`}>{msg.text}</p>}

      <EditableGrid
        key={gridKey}
        fit
        table="profiles"
        columns={columns}
        orderBy={{ column: "username", ascending: true }}
        height={height}
        canAdd={false}
        canDelete={false}
        onChange={() => reload()}
        exportName="usuarios"
      />
    </div>
  );
}
