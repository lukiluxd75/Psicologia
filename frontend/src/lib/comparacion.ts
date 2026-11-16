/* Tablas APA de la vista "Comparar semestres" (pantalla y copia para Word). */

import { fmt, type Analitica, type AnaliticaSemestre, type Descriptiva } from "./jamovi";
import { interpretarComparacionDescriptivas, interpretarComparacionFiabilidad, interpretarComparacionFrecuencias } from "./interpretacion";
import type { CopiaTabla } from "../components/jamovi/TablasApa";

export const sinCero = (v: number | null) => (v === null ? "—" : v.toFixed(2).replace(/^(-?)0\./, "$1."));

export interface BloqueTabla {
  numero: number;
  titulo: string;
  copia: CopiaTabla;
  nota?: string;
  interp: string;
}

export interface Preparado {
  grupos: AnaliticaSemestre[];
  variables: Descriptiva[];
  categoricas: [string, string][];
  conFiabilidad: boolean;
  escalasFiab: { escala: string; etiqueta: string }[];
}

export function preparar(datos: Analitica): Preparado {
  const grupos = datos.por_semestre ?? [];
  const categoricas = Object.entries(datos.frecuencias)
    .filter(([k]) => grupos.some((g) => g.frecuencias[k]?.tabla.length))
    .map(([k, f]) => [k, f.etiqueta] as [string, string]);
  return {
    grupos,
    variables: datos.descriptivas,
    categoricas,
    conFiabilidad: grupos.some((g) => g.registros_con_items > 0),
    escalasFiab: datos.fiabilidad.map((f) => ({ escala: f.escala, etiqueta: f.etiqueta })),
  };
}

const notaDescriptivos = (grupos: AnaliticaSemestre[]) =>
  `${grupos.map((g) => `${g.etiqueta}: N = ${g.total_registros}`).join("; ")}. M = media; DE = desviación estándar; n = casos con dato en esa variable.`;

const NOTA_FIAB = "α = alfa de Cronbach (n = casos con todos los ítems de la escala respondidos). Interpretación según George y Mallery (2003).";

function copiaDescriptivos(p: Preparado): CopiaTabla {
  return {
    cabeceras: ["Variable", ...p.grupos.flatMap((g) => [`n (${g.etiqueta})`, `M (${g.etiqueta})`, `DE (${g.etiqueta})`])],
    filas: p.variables.map((v) => [
      v.etiqueta,
      ...p.grupos.flatMap((g) => {
        const d = g.descriptivas.find((x) => x.variable === v.variable);
        return [String(d?.n ?? 0), fmt(d?.media ?? null), fmt(d?.de ?? null)];
      }),
    ]),
  };
}

function copiaFiabilidad(p: Preparado): CopiaTabla {
  return {
    cabeceras: ["Escala", "k", ...p.grupos.map((g) => `α (${g.etiqueta})`), ...p.grupos.map((g) => `n (${g.etiqueta})`)],
    filas: p.escalasFiab.map((e) => {
      const filas = p.grupos.map((g) => g.fiabilidad.find((f) => f.escala === e.escala));
      return [e.etiqueta, String(filas.find((f) => f)?.k ?? ""), ...filas.map((f) => sinCero(f?.alfa ?? null)), ...filas.map((f) => String(f?.n ?? 0))];
    }),
  };
}

function copiaFrecuencias(p: Preparado, variable: string): CopiaTabla {
  const categorias = [...new Set(p.grupos.flatMap((g) => g.frecuencias[variable]?.tabla.map((f) => f.categoria) ?? []))];
  return {
    cabeceras: ["Categoría", ...p.grupos.flatMap((g) => [`n (${g.etiqueta})`, `% (${g.etiqueta})`])],
    filas: categorias.map((c) => [
      c,
      ...p.grupos.flatMap((g) => {
        const f = g.frecuencias[variable]?.tabla.find((x) => x.categoria === c);
        return [String(f?.frecuencia ?? 0), (f?.porcentaje ?? 0).toFixed(1)];
      }),
    ]),
  };
}

/** Las mismas tablas de la vista, para el botón "Copiar tablas APA para Word". */
export function bloquesComparacion(datos: Analitica, nombreTest: string): BloqueTabla[] {
  const p = preparar(datos);
  const bloques: BloqueTabla[] = [
    {
      numero: 1,
      titulo: `Estadísticos descriptivos de ${nombreTest} por semestre`,
      copia: copiaDescriptivos(p),
      nota: notaDescriptivos(p.grupos),
      interp: interpretarComparacionDescriptivas(p.grupos, datos.puntaje_global),
    },
  ];
  if (p.conFiabilidad)
    bloques.push({
      numero: 2,
      titulo: "Fiabilidad por consistencia interna según semestre",
      copia: copiaFiabilidad(p),
      nota: NOTA_FIAB,
      interp: interpretarComparacionFiabilidad(p.grupos.map((g) => ({ etiqueta: g.etiqueta, filas: g.fiabilidad }))),
    });
  p.categoricas.forEach(([k, etiqueta], i) =>
    bloques.push({
      numero: i + (p.conFiabilidad ? 3 : 2),
      titulo: `Frecuencias de ${etiqueta} por semestre`,
      copia: copiaFrecuencias(p, k),
      interp: interpretarComparacionFrecuencias(
        etiqueta,
        p.grupos.map((g) => ({ etiqueta: g.etiqueta, tabla: g.frecuencias[k]?.tabla ?? [] }))
      ),
    })
  );
  return bloques;
}
