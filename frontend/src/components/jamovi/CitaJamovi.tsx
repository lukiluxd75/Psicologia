import React, { useState } from "react";
import { ClipboardCopy } from "lucide-react";
import { copiarConAviso } from "../../lib/avisos";

/*
 * Cómo citar jamovi en APA 7.ª ed. El año y la versión dependen de la instalación
 * de cada uno (en jamovi: ☰ → Acerca de), así que se pueden editar y se recuerdan.
 * jamovi pide citar también R, el motor sobre el que hace los cálculos.
 */

const CLAVE = "cita_jamovi";
const PREDETERMINADO = { anio: "2024", version: "2.6", anioR: "2024" };
type Datos = typeof PREDETERMINADO;

function leer(): Datos {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? "{}");
    return { ...PREDETERMINADO, ...guardado };
  } catch {
    return PREDETERMINADO;
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const PARRAFO_APA =
  "font-family:'Times New Roman',serif;font-size:12pt;line-height:200%;margin:0;padding-left:0.5in;text-indent:-0.5in";

export const CitaJamovi: React.FC = () => {
  const [d, setD] = useState<Datos>(leer);
  const cambiar = (campo: keyof Datos, valor: string) => {
    const nuevo = { ...d, [campo]: valor.trim() };
    setD(nuevo);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nuevo));
    } catch {
      // sin storage: los valores valen solo para esta sesión
    }
  };

  const anio = d.anio || "s.f.";
  const anioR = d.anioR || "s.f.";
  const version = d.version ? ` (Versión ${d.version})` : "";

  // Cada referencia en tres partes: antes de la cursiva, la cursiva y después.
  const referencias: [string, string, string][] = [
    [`The jamovi project. (${anio}). `, "jamovi", `${version} [Software]. https://www.jamovi.org`],
    [
      `R Core Team. (${anioR}). `,
      "R: A language and environment for statistical computing",
      " [Software]. R Foundation for Statistical Computing. https://www.R-project.org/",
    ],
  ];
  const textoPlano = referencias.map((r) => r.join("")).join("\n");
  const html =
    `<p style="font-family:'Times New Roman',serif;font-size:12pt;line-height:200%;margin:0;text-align:center"><b>Referencias</b></p>` +
    referencias.map(([a, i, b]) => `<p style="${PARRAFO_APA}">${esc(a)}<i>${esc(i)}</i>${esc(b)}</p>`).join("");

  const enTexto = `(The jamovi project, ${anio})`;
  const metodo =
    `Los análisis estadísticos se realizaron con jamovi${d.version ? ` (Versión ${d.version})` : ""} ` +
    `(The jamovi project, ${anio}), que se basa en el lenguaje R (R Core Team, ${anioR}).`;

  const campo = "w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white";

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 text-sm text-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Cómo citar jamovi (APA 7.ª ed.)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pon el año y la versión de tu instalación (en jamovi: ☰ → Acerca de). jamovi pide citar también R, el programa que hace los
            cálculos.
          </p>
        </div>
        <button
          onClick={() => copiarConAviso(html, textoPlano, "Referencias copiadas", "Pégalas en la lista de referencias de Word.")}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <ClipboardCopy className="w-4 h-4" /> Copiar referencias para Word
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2">
          Año de jamovi
          <input value={d.anio} onChange={(e) => cambiar("anio", e.target.value)} inputMode="numeric" className={campo} />
        </label>
        <label className="flex items-center gap-2">
          Versión
          <input value={d.version} onChange={(e) => cambiar("version", e.target.value)} className={campo} />
        </label>
        <label className="flex items-center gap-2">
          Año de R
          <input value={d.anioR} onChange={(e) => cambiar("anioR", e.target.value)} inputMode="numeric" className={campo} />
        </label>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Lista de referencias</p>
        <div className="font-serif text-[15px] leading-relaxed text-slate-900 space-y-1">
          {referencias.map(([a, i, b]) => (
            <p key={i} className="pl-8 -indent-8 break-words">
              {a}
              <i>{i}</i>
              {b}
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Cita en el texto</p>
          <p className="font-serif text-[15px] text-slate-900">{enTexto}</p>
          <p className="text-xs text-slate-500 mt-0.5">Narrativa: The jamovi project ({anio})</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Ejemplo para el apartado de Método</p>
          <p className="font-serif text-[15px] text-slate-900">{metodo}</p>
        </div>
      </div>
    </section>
  );
};
