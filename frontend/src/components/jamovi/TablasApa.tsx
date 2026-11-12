import React from "react";

/* Tablas en formato APA 7.ª ed. (pantalla y HTML para pegar en Word). */

export const TH = "px-3 py-1.5 font-semibold text-slate-900 whitespace-nowrap";
export const TD = "px-3 py-1.5 tabular-nums text-slate-800 whitespace-nowrap";

export const TablaApa: React.FC<{ numero: number; titulo: string; nota?: string; children: React.ReactNode }> = ({
  numero,
  titulo,
  nota,
  children,
}) => (
  <figure className="space-y-1.5 min-w-0">
    <figcaption className="text-sm">
      <span className="font-bold text-slate-900">Tabla {numero}</span>
      <br />
      <span className="italic text-slate-800">{titulo}</span>
    </figcaption>
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse border-y-2 border-slate-900 [&_thead_tr]:border-b [&_thead_tr]:border-slate-900">
        {children}
      </table>
    </div>
    {nota && (
      <p className="text-xs text-slate-600">
        <span className="italic">Nota.</span> {nota}
      </p>
    )}
  </figure>
);
