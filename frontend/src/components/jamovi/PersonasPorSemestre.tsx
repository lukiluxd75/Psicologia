import React, { useEffect, useState } from "react";

/* Cuántas personas de cada semestre entran en las tablas y gráficos de 1.º, 8.º y la comparación. */

/** Límite por semestre; sin clave (o null) = todas las personas. */
export type Limites = Partial<Record<number, number | null>>;

interface Grupo {
  semestre: number;
  etiqueta: string;
  disponibles: number;
}

const CampoLimite: React.FC<{ grupo: Grupo; valor: number | null; onCambio: (n: number | null) => void }> = ({ grupo, valor, onCambio }) => {
  const texto = (v: number | null) => (v ? String(v) : "");
  const [borrador, setBorrador] = useState(texto(valor));
  const [previo, setPrevio] = useState(valor);
  // Si el valor cambia desde fuera (botones "Todas" o "Igualar"), el campo lo refleja.
  if (valor !== previo) {
    setPrevio(valor);
    setBorrador(texto(valor));
  }

  // Espera a que se deje de escribir para no pedir la analítica en cada tecla.
  useEffect(() => {
    const limpio = borrador.trim();
    const n = limpio === "" ? null : Math.floor(Number(limpio));
    if (n !== null && (!Number.isFinite(n) || n < 1)) return;
    if (n === valor) return;
    const t = setTimeout(() => onCambio(n), 600);
    return () => clearTimeout(t);
  }, [borrador, valor, onCambio]);

  const invalido = borrador.trim() !== "" && !(Number(borrador) >= 1);
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      {grupo.etiqueta}
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={grupo.disponibles || undefined}
        value={borrador}
        placeholder="Todas"
        onChange={(e) => setBorrador(e.target.value)}
        aria-invalid={invalido}
        className={`w-20 border rounded-lg px-2 py-1.5 text-sm bg-white ${invalido ? "border-red-400" : "border-slate-300"}`}
      />
      <span className="text-xs text-slate-500">de {grupo.disponibles}</span>
    </label>
  );
};

export const PersonasPorSemestre: React.FC<{
  grupos: Grupo[];
  limites: Limites;
  onCambio: (semestre: number, n: number | null) => void;
  onCambiarTodos: (limites: Limites) => void;
}> = ({ grupos, limites, onCambio, onCambiarTodos }) => {
  const menor = Math.min(...grupos.map((g) => g.disponibles));
  const hayLimite = grupos.some((g) => limites[g.semestre]);
  const recortados = grupos.filter((g) => {
    const l = limites[g.semestre];
    return l && l < g.disponibles;
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label="Personas por semestre">
        <span className="text-sm text-slate-700">Personas por semestre</span>
        {grupos.map((g) => (
          <CampoLimite key={g.semestre} grupo={g} valor={limites[g.semestre] ?? null} onCambio={(n) => onCambio(g.semestre, n)} />
        ))}
        {menor > 0 && grupos.some((g) => g.disponibles !== menor) && (
          <button
            onClick={() => onCambiarTodos(Object.fromEntries(grupos.map((g) => [g.semestre, menor])))}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Igualar a {menor} por semestre
          </button>
        )}
        {hayLimite && (
          <button onClick={() => onCambiarTodos({})} className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
            Usar todas
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        {recortados.length
          ? `${recortados.map((g) => `${g.etiqueta}: primeras ${limites[g.semestre]} de ${g.disponibles} personas`).join(" · ")}, en el orden en que se registraron. `
          : ""}
        Se aplica a las tablas y gráficos de cada semestre y de la comparación; General siempre usa todos los registros.
      </p>
    </div>
  );
};
