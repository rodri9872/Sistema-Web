"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Antes de generar un PDF muestra un cartel para escribir una observación.
 * ask() devuelve el texto (puede ser vacío) o null si se canceló.
 */
export function useNotePrompt() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const resolver = useRef<((v: string | null) => void) | null>(null);

  const ask = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        resolver.current = resolve;
        setOpen(true);
      }),
    [],
  );

  const close = (value: string | null) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  };

  const dialog = open ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" onClick={() => close(null)}>
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Observaciones del informe</h2>
        <p className="mt-1 text-sm text-slate-500">Se imprime al final del PDF. Podés dejarlo vacío.</p>
        <textarea
          autoFocus
          className="input mt-3 h-36 w-full resize-y"
          placeholder="Escribí una observación…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close(null);
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) close(text);
          }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={() => close(null)}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => close(text)}>
            Generar PDF
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { ask, dialog };
}
