import React, { useEffect, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";

import { oyentes, type Aviso } from "../../lib/avisos";

export const AvisosFlotantes: React.FC = () => {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    const oyente = (a: Aviso) => {
      setAvisos((prev) => [...prev.slice(-2), a]);
      setTimeout(() => setAvisos((prev) => prev.filter((x) => x.id !== a.id)), a.tipo === "error" ? 9000 : 6000);
    };
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="fixed z-50 bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 flex flex-col gap-2 pointer-events-none"
    >
      {avisos.map((a) => (
        <div
          key={a.id}
          role={a.tipo === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm ${
            a.tipo === "error" ? "bg-red-50 border-red-300 text-red-900" : "bg-white border-slate-300 text-slate-800"
          }`}
        >
          {a.tipo === "error" ? (
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          ) : (
            <Check className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{a.titulo}</p>
            {a.detalle && <p className="text-xs mt-0.5 opacity-90">{a.detalle}</p>}
          </div>
          <button
            onClick={() => setAvisos((prev) => prev.filter((x) => x.id !== a.id))}
            aria-label="Cerrar aviso"
            className="shrink-0 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
