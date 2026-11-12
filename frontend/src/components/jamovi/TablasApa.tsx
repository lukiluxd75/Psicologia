import React, { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { parrafoHtml, tablaApaHtml } from "../../lib/apa";
import { copiarConAviso } from "../../lib/avisos";

/* Tablas en formato APA 7.ª ed. (pantalla y HTML para pegar en Word). */

export const TH = "px-3 py-1.5 font-semibold text-slate-900 whitespace-nowrap";
export const TD = "px-3 py-1.5 tabular-nums text-slate-800 whitespace-nowrap";

const BOTON = "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50";

/** Botón pequeño que cambia a "Copiado" durante 2 s tras una copia correcta. */
export const BotonCopiar: React.FC<{ etiqueta: string; alCopiar: () => Promise<boolean> }> = ({ etiqueta, alCopiar }) => {
  const [hecho, setHecho] = useState(false);
  return (
    <button
      onClick={async () => {
        if (await alCopiar()) {
          setHecho(true);
          setTimeout(() => setHecho(false), 2000);
        }
      }}
      className={BOTON}
    >
      {hecho ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
      {hecho ? "Copiado" : etiqueta}
    </button>
  );
};

/** Párrafo de interpretación automática con su propio botón de copiar. */
export const Interpretacion: React.FC<{ texto: string }> = ({ texto }) => {
  if (!texto) return null;
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interpretación</p>
        <BotonCopiar
          etiqueta="Copiar texto"
          alCopiar={() => copiarConAviso(parrafoHtml(texto), texto, "Interpretación copiada", "Pégala en Word con Ctrl+V.")}
        />
      </div>
      <p className="text-sm text-slate-800 leading-relaxed">{texto}</p>
      <p className="text-xs text-slate-500">Texto generado a partir de los datos: revíselo antes de usarlo en un informe.</p>
    </div>
  );
};

export interface CopiaTabla {
  cabeceras: string[];
  filas: string[][];
}

export const TablaApa: React.FC<{
  numero: number;
  titulo: string;
  nota?: string;
  copia?: CopiaTabla;
  interpretacion?: string;
  children: React.ReactNode;
}> = ({ numero, titulo, nota, copia, interpretacion, children }) => {
  const copiar = () => {
    if (!copia) return Promise.resolve(false);
    let html = tablaApaHtml(numero, titulo, copia.cabeceras, copia.filas, nota);
    let texto = [`Tabla ${numero}`, titulo, copia.cabeceras.join("\t"), ...copia.filas.map((f) => f.join("\t"))].join("\n");
    if (nota) texto += `\nNota. ${nota}`;
    if (interpretacion) {
      html += parrafoHtml(interpretacion);
      texto += `\n\n${interpretacion}`;
    }
    return copiarConAviso(
      html,
      texto,
      `Tabla ${numero} copiada`,
      `Pégala en Word con Ctrl+V: conserva el formato APA${interpretacion ? " e incluye la interpretación" : ""}. En Excel se pega en celdas.`
    );
  };

  return (
    <figure className="space-y-2 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <figcaption className="text-sm">
          <span className="font-bold text-slate-900">Tabla {numero}</span>
          <br />
          <span className="italic text-slate-800">{titulo}</span>
        </figcaption>
        {copia && <BotonCopiar etiqueta="Copiar tabla" alCopiar={copiar} />}
      </div>
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
      {interpretacion && <Interpretacion texto={interpretacion} />}
    </figure>
  );
};
