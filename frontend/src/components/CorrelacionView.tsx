import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ClipboardCopy, Download, RefreshCw } from "lucide-react";
import { descargarBlob, filasDesdeHistorial, fmt, JMV, ticksBonitos, type HistorialLocal } from "../lib/jamovi";
import { pendientesDe } from "../hooks/useSheetsSync";
import { ChartCard, EjeY, FUENTE, SinDatos } from "./jamovi/JamoviCharts";
import { parrafoHtml, tablaApaHtml } from "../lib/apa";
import { TablaApa, TD, TH, type CopiaTabla } from "./jamovi/TablasApa";
import { avisar, avisarError, copiarConAviso, MSJ_DESCARGA } from "../lib/avisos";
import { magnitudD } from "../lib/interpretacion";

/* ─── Tipos de la respuesta del backend ───────────────────────────────── */

interface Corr {
  n: number;
  r: number | null;
  p: number | null;
  ic95: [number, number] | null;
  rho: number | null;
  p_rho: number | null;
  pendiente: number | null;
  intercepto: number | null;
  interpretacion: string;
}

interface Desc {
  n: number;
  media: number | null;
  de: number | null;
}

interface Grupo {
  semestre: number | null;
  etiqueta: string;
  n: number;
  audit: Desc;
  brief: Desc;
  correlacion: Corr;
  correlacion_escalas: (Corr & { escala: string; etiqueta: string })[];
}

interface Persona {
  nombre: string;
  semestre: number | null;
  audit: number;
  diagnostico: string;
  total_general: number;
  alerta_entrevista: string;
  emparejado_por: "exacto" | "similar";
}

interface Promedio {
  grupos: string[];
  n: number;
  r: number;
  ic95: [number, number];
  z: number;
  p: number | null;
  interpretacion: string;
  q: number;
  gl_q: number;
  p_q: number | null;
}

interface Prueba {
  t: number;
  gl: number;
  p: number | null;
  diferencia: number;
  d: number | null;
}

interface Resultado {
  total_audit: number;
  total_brief: number;
  personas: Persona[];
  sin_semestre: string[];
  semestre_conflicto: string[];
  emparejados_por_similitud: { audit: string; brief: string }[];
  solo_audit: string[];
  solo_brief: string[];
  semestres: number[];
  grupos: Grupo[];
  total: Grupo;
  promedio_semestres: Promedio | null;
  comparacion: {
    semestre_a: number;
    semestre_b: number;
    n_a: number;
    n_b: number;
    audit: Prueba | null;
    brief: Prueba | null;
    correlaciones: { z: number; p: number | null } | null;
  };
}

type Fuente = "sheets" | "local";

const apiBase = import.meta.env.VITE_API_URL || "";
const SEMESTRES = Array.from({ length: 10 }, (_, i) => i + 1);
const PALETA = [JMV.azul, JMV.ambar, JMV.verde, JMV.coral];

/* ─── Formato APA ─────────────────────────────────────────────────────── */

/** Sin cero inicial en valores que no pueden superar 1 (r = .45). */
const sinCero = (v: number | null | undefined, dec = 2) =>
  v === null || v === undefined ? "—" : v.toFixed(dec).replace(/^(-?)0\./, "$1.");

const fmtP = (p: number | null | undefined) => (p === null || p === undefined ? "—" : p < 0.001 ? "< .001" : sinCero(p, 3));
const pTexto = (p: number | null | undefined) => (p !== null && p !== undefined && p < 0.001 ? "p < .001" : `p = ${fmtP(p)}`);
const estrellas = (p: number | null | undefined) => (p === null || p === undefined ? "" : p < 0.01 ? "**" : p < 0.05 ? "*" : "");
const ic = (c: { ic95: [number, number] | null }) => (c.ic95 ? `[${sinCero(c.ic95[0])}, ${sinCero(c.ic95[1])}]` : "—");

const GRIS_SIN_SEMESTRE = "#9ca3af";

function colorDe(semestre: number | null, semestres: number[]) {
  if (semestre === null) return GRIS_SIN_SEMESTRE;
  const i = semestres.indexOf(semestre);
  return PALETA[i % PALETA.length];
}

/* ─── Gráfico de dispersión ──────────────────────────────────────────── */

const Dispersion: React.FC<{ personas: Persona[]; grupos: Grupo[]; total: Grupo; semestres: number[] }> = ({
  personas,
  grupos,
  total,
  semestres,
}) => {
  if (personas.length === 0) return <SinDatos />;

  const W = 700;
  const leyenda = grupos.length + 1 + (personas.some((p) => p.semestre === null) ? 1 : 0);
  const m = { t: 44 + leyenda * 17, r: 24, b: 54, l: 66 };
  const H = 420 + leyenda * 17;

  const xs = personas.map((p) => p.audit);
  const ys = personas.map((p) => p.total_general);
  const ticksX = ticksBonitos(0, Math.max(10, ...xs)).filter(Number.isInteger);
  const x1 = Math.max(ticksX[ticksX.length - 1], ...xs);
  const ticksY = ticksBonitos(Math.min(...ys) - 5, Math.max(...ys) + 5);
  const y0 = Math.min(ticksY[0], ...ys);
  const y1 = Math.max(ticksY[ticksY.length - 1], ...ys);
  const x = (v: number) => m.l + (W - m.l - m.r) * (v / (x1 || 1));
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - (v - y0) / (y1 - y0 || 1));

  const recta = (c: Corr, desde: number, hasta: number) => {
    if (c.pendiente === null || c.intercepto === null || desde === hasta) return null;
    const f = (v: number) => c.intercepto! + c.pendiente! * v;
    return { x1: x(desde), y1: y(f(desde)), x2: x(hasta), y2: y(f(hasta)) };
  };

  const filasLeyenda = [
    ...grupos.map((g) => ({
      color: colorDe(g.semestre, semestres),
      texto: `${g.etiqueta} (n = ${g.n}): r = ${sinCero(g.correlacion.r)}, ${pTexto(g.correlacion.p)}`,
      discontinua: false,
    })),
    ...(personas.some((p) => p.semestre === null)
      ? [{ color: GRIS_SIN_SEMESTRE, texto: "Sin semestre indicado", discontinua: false }]
      : []),
    {
      color: JMV.tinta,
      texto: `Muestra total (n = ${total.n}): r = ${sinCero(total.correlacion.r)}, ${pTexto(total.correlacion.p)}`,
      discontinua: true,
    },
  ];

  const titulo = "Relación entre consumo de alcohol (AUDIT) y función ejecutiva (BRIEF) por semestre";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 560, maxWidth: W, display: "block", margin: "0 auto" }} role="img" aria-label={titulo}>
      <rect width={W} height={H} fill="#ffffff" />
      <text x={W / 2} y={22} textAnchor="middle" fontFamily={FUENTE} fontSize={13.5} fontWeight={600} fill={JMV.tinta}>
        {titulo}
      </text>

      <g fontFamily={FUENTE} fontSize={11.5} fill={JMV.tinta}>
        {filasLeyenda.map((f, i) => (
          <g key={f.texto} transform={`translate(${m.l} ${42 + i * 17})`}>
            {f.discontinua ? (
              <line x1={0} x2={16} y1={0} y2={0} stroke={f.color} strokeWidth={2} strokeDasharray="5 3" />
            ) : (
              <circle cx={8} cy={0} r={5} fill={f.color} />
            )}
            <text x={24} y={0} dominantBaseline="middle">
              {f.texto}
            </text>
          </g>
        ))}
      </g>

      <EjeY ticks={ticksY} y={y} x0={m.l} x1={W - m.r} etiqueta="BRIEF: Total General (70–210)" />

      {(() => {
        const l = recta(total.correlacion, Math.min(...xs), Math.max(...xs));
        return l && <line {...l} stroke={JMV.tinta} strokeWidth={1.6} strokeDasharray="6 4" />;
      })()}
      {grupos.map((g) => {
        const propios = personas.filter((p) => p.semestre === g.semestre).map((p) => p.audit);
        if (propios.length < 3) return null;
        const l = recta(g.correlacion, Math.min(...propios), Math.max(...propios));
        return l && <line key={g.etiqueta} {...l} stroke={colorDe(g.semestre, semestres)} strokeWidth={2.4} />;
      })}

      {personas.map((p, i) => (
        <circle
          key={i}
          cx={x(p.audit)}
          cy={y(p.total_general)}
          r={5.5}
          fill={p.semestre === null ? "#ffffff" : colorDe(p.semestre, semestres)}
          fillOpacity={p.semestre === null ? 1 : 0.8}
          stroke={p.semestre === null ? GRIS_SIN_SEMESTRE : "#ffffff"}
          strokeWidth={p.semestre === null ? 2 : 1.2}
        >
          <title>{`${p.semestre ? `${p.semestre}.º sem.` : "Sin semestre"} · AUDIT ${p.audit} · BRIEF ${p.total_general}`}</title>
        </circle>
      ))}

      <line x1={m.l} x2={W - m.r} y1={y(y0)} y2={y(y0)} stroke={JMV.eje} />
      <g fontFamily={FUENTE} fontSize={11} fill={JMV.tintaSuave}>
        {ticksX.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={y(y0)} y2={y(y0) + 4} stroke={JMV.eje} />
            <text x={x(t)} y={y(y0) + 17} textAnchor="middle">
              {t}
            </text>
          </g>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 12} textAnchor="middle" fontSize={12} fill={JMV.tinta}>
          AUDIT: Puntaje Total (0–40)
        </text>
      </g>
    </svg>
  );
};

/* ─── Promedios por semestre ─────────────────────────────────────────── */

const Promedios: React.FC<{ grupos: Grupo[]; semestres: number[] }> = ({ grupos, semestres }) => {
  if (grupos.length === 0) return <SinDatos />;
  const W = 700;
  const H = 360;
  const m = { t: 60, b: 48 };
  const panelW = W / 2;

  const panel = (clave: "audit" | "brief", titulo: string, offset: number) => {
    const l = offset + 58;
    const r = offset + panelW - 18;
    const altos = grupos.map((g) => (g[clave].media ?? 0) + (g[clave].de ?? 0));
    const ticks = ticksBonitos(0, Math.max(1, ...altos) * 1.12, 5);
    const top = Math.max(ticks[ticks.length - 1], ...altos);
    const y = (v: number) => m.t + (H - m.t - m.b) * (1 - v / top);
    const banda = (r - l) / grupos.length;
    const barW = Math.min(64, banda * 0.55);

    return (
      <g key={clave}>
        <text x={(l + r) / 2} y={m.t - 22} textAnchor="middle" fontFamily={FUENTE} fontSize={12.5} fontWeight={600} fill={JMV.tinta}>
          {titulo}
        </text>
        <EjeY ticks={ticks} y={y} x0={l} x1={r} etiqueta="" />
        {grupos.map((g, i) => {
          const d = g[clave];
          if (d.media === null) return null;
          const cx = l + banda * (i + 0.5);
          const de = d.de ?? 0;
          return (
            <g key={g.etiqueta} fontFamily={FUENTE}>
              <rect x={cx - barW / 2} y={y(d.media)} width={barW} height={y(0) - y(d.media)} fill={colorDe(g.semestre, semestres)}>
                <title>{`${g.etiqueta}: M = ${fmt(d.media)}, DE = ${fmt(d.de)}, n = ${d.n}`}</title>
              </rect>
              {de > 0 && (
                <g stroke={JMV.tinta} strokeWidth={1.4}>
                  <line x1={cx} x2={cx} y1={y(d.media + de)} y2={y(Math.max(0, d.media - de))} />
                  <line x1={cx - 7} x2={cx + 7} y1={y(d.media + de)} y2={y(d.media + de)} />
                  <line x1={cx - 7} x2={cx + 7} y1={y(Math.max(0, d.media - de))} y2={y(Math.max(0, d.media - de))} />
                </g>
              )}
              <text x={cx + barW / 2 + 4} y={y(d.media)} dominantBaseline="middle" fontSize={11} fontWeight={600} fill={JMV.tinta}>
                {fmt(d.media)}
              </text>
              <text x={cx} y={y(0) + 16} textAnchor="middle" fontSize={11} fill={JMV.tinta}>
                {g.semestre ? `${g.semestre}.º sem.` : g.etiqueta}
              </text>
              <text x={cx} y={y(0) + 30} textAnchor="middle" fontSize={10.5} fill={JMV.tintaSuave}>
                n = {d.n}
              </text>
            </g>
          );
        })}
        <line x1={l} x2={r} y1={y(0)} y2={y(0)} stroke={JMV.eje} />
      </g>
    );
  };

  const titulo = "Promedio de AUDIT y BRIEF por semestre";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 560, maxWidth: W, display: "block", margin: "0 auto" }} role="img" aria-label={titulo}>
      <rect width={W} height={H} fill="#ffffff" />
      <text x={W / 2} y={20} textAnchor="middle" fontFamily={FUENTE} fontSize={13.5} fontWeight={600} fill={JMV.tinta}>
        {titulo}
      </text>
      {panel("audit", "AUDIT: Puntaje Total (M ± DE)", 0)}
      {panel("brief", "BRIEF: Total General (M ± DE)", panelW)}
    </svg>
  );
};

/* ─── Texto de resultados ────────────────────────────────────────────── */

const significativa = (p: number | null | undefined) => p !== null && p !== undefined && p < 0.05;

function frasesCorrelacion(d: Resultado): string[] {
  const frases: string[] = [];
  for (const g of d.grupos) {
    const c = g.correlacion;
    if (c.r === null) {
      frases.push(`${g.etiqueta}: con ${g.n} caso(s) todavía no se puede calcular la correlación (se necesitan al menos 3).`);
      continue;
    }
    frases.push(
      `En ${g.etiqueta} (n = ${g.n}), la correlación de Pearson entre el puntaje AUDIT y el total del BRIEF fue ` +
        `r(${g.n - 2}) = ${sinCero(c.r)}, ${pTexto(c.p)}, IC 95 % ${ic(c)}: ${c.interpretacion.toLowerCase()}, ` +
        `${c.p !== null && c.p < 0.05 ? "estadísticamente significativa" : "no significativa"}.`
    );
  }
  return frases;
}

function frasesComparacion(d: Resultado): string[] {
  const frases: string[] = [];
  const cmp = d.comparacion;
  const etA = `${cmp.semestre_a}.º`;
  const etB = `${cmp.semestre_b}.º`;
  if (cmp.audit) {
    frases.push(
      `La diferencia de medias en AUDIT entre ${etA} y ${etB} semestre fue t(${fmt(cmp.audit.gl, 1)}) = ${fmt(cmp.audit.t)}, ` +
        `${pTexto(cmp.audit.p)}, d = ${fmt(cmp.audit.d)}.`
    );
  }
  if (cmp.brief) {
    frases.push(
      `En el BRIEF fue t(${fmt(cmp.brief.gl, 1)}) = ${fmt(cmp.brief.t)}, ${pTexto(cmp.brief.p)}, d = ${fmt(cmp.brief.d)}.`
    );
  }
  if (cmp.correlaciones) {
    frases.push(
      `Al comparar la fuerza de la correlación entre ambos semestres (z de Fisher): z = ${fmt(cmp.correlaciones.z)}, ` +
        `${pTexto(cmp.correlaciones.p)}${cmp.correlaciones.p !== null && cmp.correlaciones.p < 0.05 ? "; la relación difiere entre semestres." : "; no hay evidencia de que la relación difiera entre semestres."}`
    );
  }
  return frases;
}

function frasesPromedio(d: Resultado): string[] {
  const frases: string[] = [];
  const pm = d.promedio_semestres;
  if (pm) {
    const homogeneo = pm.p_q === null || pm.p_q >= 0.05;
    frases.push(
      `Promediando las correlaciones de ${pm.grupos.join(" y ")} (z de Fisher ponderada por n − 3, N = ${pm.n}), ` +
        `la correlación AUDIT–BRIEF fue r = ${sinCero(pm.r)}, ${pTexto(pm.p)}, IC 95 % ${ic(pm)}: ` +
        `${pm.interpretacion.toLowerCase()}, ${pm.p !== null && pm.p < 0.05 ? "estadísticamente significativa" : "no significativa"}. ` +
        (homogeneo
          ? `Las correlaciones de los semestres no difieren entre sí (Q(${pm.gl_q}) = ${fmt(pm.q)}, ${pTexto(pm.p_q)}), por lo que este promedio las resume bien.`
          : `Sin embargo, las correlaciones de los semestres difieren entre sí (Q(${pm.gl_q}) = ${fmt(pm.q)}, ${pTexto(pm.p_q)}): conviene informar cada semestre por separado y usar el promedio solo como referencia.`)
    );
  }
  return frases;
}

function redactarResultados(d: Resultado): string[] {
  return [...frasesCorrelacion(d), ...frasesComparacion(d), ...frasesPromedio(d)];
}

/* ─── Interpretación de cada gráfico y tabla ─────────────────────────── */

function interpretarDispersion(d: Resultado): string {
  const frases = [...d.grupos, d.total]
    .filter((g) => g.correlacion.r !== null)
    .map((g) => {
      const r = g.correlacion.r!;
      const sentido =
        Math.abs(r) < 0.1
          ? "los puntos no siguen ninguna tendencia: el puntaje AUDIT no se asocia con el del BRIEF"
          : r > 0
            ? "la nube de puntos sube de izquierda a derecha: a mayor puntaje AUDIT, mayor puntaje total en el BRIEF"
            : "la nube de puntos baja de izquierda a derecha: a mayor puntaje AUDIT, menor puntaje total en el BRIEF";
      return `En ${g.etiqueta} (n = ${g.n}, r = ${sinCero(r)}, ${pTexto(g.correlacion.p)}) ${sentido}${
        significativa(g.correlacion.p) ? "" : ", aunque la relación no es estadísticamente significativa"
      }.`;
    });
  if (!frases.length) return "";
  frases.push("Correlación no implica causalidad: el gráfico muestra asociación, no que un puntaje produzca el otro.");
  return frases.join(" ");
}

function frasesDiferencia(d: Resultado): string[] {
  const cmp = d.comparacion;
  const gA = d.grupos.find((g) => g.semestre === cmp.semestre_a);
  const gB = d.grupos.find((g) => g.semestre === cmp.semestre_b);
  const frases: string[] = [];
  for (const [nombre, prueba, clave] of [
    ["AUDIT", cmp.audit, "audit"],
    ["BRIEF (Total General)", cmp.brief, "brief"],
  ] as const) {
    if (!prueba || !gA || !gB) continue;
    const mA = gA[clave].media;
    const mB = gB[clave].media;
    const mayor = mA !== null && mB !== null ? (mA > mB ? `${cmp.semestre_a}.º` : `${cmp.semestre_b}.º`) : null;
    frases.push(
      `En ${nombre}, ${cmp.semestre_a}.º semestre obtuvo M = ${fmt(mA)} y ${cmp.semestre_b}.º M = ${fmt(mB)}` +
        (mayor ? ` (más alto en ${mayor})` : "") +
        `; la diferencia ${significativa(prueba.p) ? "es" : "no es"} estadísticamente significativa ` +
        `(t(${fmt(prueba.gl, 1)}) = ${fmt(prueba.t)}, ${pTexto(prueba.p)}), con un tamaño del efecto ${magnitudD(prueba.d)} (d = ${fmt(prueba.d)}).`
    );
  }
  return frases;
}

function interpretarDescriptivosGrupo(grupos: Grupo[]): string {
  return grupos
    .map((g) => `${g.etiqueta} (n = ${g.n}): AUDIT M = ${fmt(g.audit.media)} (DE = ${fmt(g.audit.de)}), BRIEF M = ${fmt(g.brief.media)} (DE = ${fmt(g.brief.de)})`)
    .join("; ")
    .concat(".");
}

function interpretarEscalas(total: Grupo): string {
  const escalas = total.correlacion_escalas.filter((e) => e.r !== null);
  if (!escalas.length) return "";
  const sig = escalas.filter((e) => significativa(e.p)).sort((a, b) => Math.abs(b.r!) - Math.abs(a.r!));
  const noSig = escalas.filter((e) => !significativa(e.p));
  const frases: string[] = [];
  if (sig.length)
    frases.push(
      `En ${total.etiqueta.toLowerCase()}, el AUDIT se relacionó significativamente con ${sig
        .map((e) => `${e.etiqueta} (r = ${sinCero(e.r)}, ${e.interpretacion.toLowerCase()})`)
        .join(", ")}.`
    );
  else frases.push(`En ${total.etiqueta.toLowerCase()}, el AUDIT no se relacionó significativamente con ninguna escala del BRIEF.`);
  if (sig.length && noSig.length) frases.push(`No hubo relación significativa con ${noSig.map((e) => e.etiqueta).join(", ")}.`);
  return frases.join(" ");
}

/* ─── Vista ──────────────────────────────────────────────────────────── */

const notaPromedio = (pm: Promedio) =>
  `Promedio ponderado = media de las r de cada semestre por z de Fisher, ponderada por n − 3; a diferencia de la muestra total, no se infla por las diferencias de nivel entre semestres. Homogeneidad: Q(${pm.gl_q}) = ${fmt(pm.q)}, ${pTexto(pm.p_q)}.`;

const NOTA_CORR =
  "r = correlación de Pearson; ρ = rho de Spearman (recomendada si los puntajes no siguen una distribución normal). Magnitud según Cohen (1988): .10 débil, .30 moderada, .50 fuerte.";

export const CorrelacionView: React.FC<{ historial: HistorialLocal }> = ({ historial }) => {
  const [fuente, setFuente] = useState<Fuente>("sheets");
  const [semA, setSemA] = useState(1);
  const [semB, setSemB] = useState(8);
  const [recarga, setRecarga] = useState(0);
  const [incluirNombres, setIncluirNombres] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Con "sheets" se mandan solo los registros locales que aún no llegaron a Sheets, para no duplicarlos.
  const cuerpo = useMemo(() => {
    if (fuente === "local") {
      return { audit: filasDesdeHistorial("AUDIT", historial), brief: filasDesdeHistorial("BRIEF", historial) };
    }
    return {
      audit: pendientesDe("AUDIT", historial.AUDIT).map((p) => p.fila),
      brief: pendientesDe("BRIEF", historial.BRIEF).map((p) => p.fila),
    };
  }, [fuente, historial]);

  const clave = `${fuente}|${semA}|${semB}|${recarga}`;
  const [resultado, setResultado] = useState<{ clave: string; datos: Resultado | null; error: string | null }>({
    clave: "",
    datos: null,
    error: null,
  });
  const cargando = resultado.clave !== clave;
  const datos = resultado.datos;

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const qs = `incluir_sheets=${fuente === "sheets"}&semestre_a=${semA}&semestre_b=${semB}`;
        const res = await fetch(`${apiBase}/api/correlacion/audit-brief?${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.detail || `Error ${res.status}`);
        if (vigente) setResultado({ clave, datos: json as Resultado, error: null });
      } catch (e) {
        if (vigente) setResultado({ clave, datos: null, error: e instanceof Error ? e.message : "No se pudo calcular" });
      }
    })();
    return () => {
      vigente = false;
    };
  }, [clave, fuente, semA, semB, cuerpo]);

  const descargarCsv = async () => {
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}/api/correlacion/audit-brief/csv?incluir_sheets=${fuente === "sheets"}&incluir_nombres=${incluirNombres}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      descargarBlob(await res.blob(), "jamovi_audit_brief_por_estudiante.csv");
      avisar("Descarga iniciada: jamovi_audit_brief_por_estudiante.csv", MSJ_DESCARGA);
    } catch (e) {
      const msj = e instanceof Error ? e.message : "No se pudo descargar";
      setError(msj);
      avisarError("No se pudo descargar el CSV", msj);
    }
  };

  const grupos = datos?.grupos ?? [];
  const cmp = datos?.comparacion;
  const filasTabla = datos ? [...grupos, datos.total] : [];
  const pm = datos?.promedio_semestres ?? null;

  // Definición única de las 4 tablas: se usa para pintarlas, copiarlas una a una y copiarlas todas.
  type DefTabla = { numero: number; titulo: string; nota: string; copia: CopiaTabla; interp: string };
  const tablas: DefTabla[] =
    datos && cmp
      ? [
          {
            numero: 1,
            titulo: "Estadísticos descriptivos de AUDIT y BRIEF por semestre",
            nota: "M = media; DE = desviación estándar. BRIEF = Total General.",
            copia: {
              cabeceras: ["Grupo", "n", "AUDIT M", "AUDIT DE", "BRIEF M", "BRIEF DE"],
              filas: filasTabla.map((g) => [g.etiqueta, String(g.n), fmt(g.audit.media), fmt(g.audit.de), fmt(g.brief.media), fmt(g.brief.de)]),
            },
            interp: interpretarDescriptivosGrupo(filasTabla),
          },
          {
            numero: 2,
            titulo: "Correlación entre AUDIT y BRIEF por semestre",
            nota: NOTA_CORR + (pm ? ` ${notaPromedio(pm)}` : ""),
            copia: {
              cabeceras: ["Grupo", "n", "r", "IC 95 %", "p", "ρ", "p (ρ)", "Magnitud"],
              filas: [
                ...filasTabla.map((g) => {
                  const c = g.correlacion;
                  return [g.etiqueta, String(g.n), sinCero(c.r), ic(c), fmtP(c.p), sinCero(c.rho), fmtP(c.p_rho), c.interpretacion];
                }),
                ...(pm ? [["Promedio ponderado de semestres", String(pm.n), sinCero(pm.r), ic(pm), fmtP(pm.p), "—", "—", pm.interpretacion]] : []),
              ],
            },
            interp: [...frasesCorrelacion(datos), ...frasesPromedio(datos)].join(" "),
          },
          {
            numero: 3,
            titulo: `Comparación entre ${cmp.semestre_a}.º (n = ${cmp.n_a}) y ${cmp.semestre_b}.º semestre (n = ${cmp.n_b})`,
            nota: `t de Welch (sin asumir varianzas iguales); diferencia = ${cmp.semestre_a}.º − ${cmp.semestre_b}.º. Diferencia entre las correlaciones (z de Fisher): ${
              cmp.correlaciones ? `z = ${fmt(cmp.correlaciones.z)}, ${pTexto(cmp.correlaciones.p)}` : "requiere al menos 4 estudiantes por semestre"
            }.`,
            copia: {
              cabeceras: ["Variable", "Diferencia", "t", "gl", "p", "d de Cohen"],
              filas: (
                [
                  ["AUDIT", cmp.audit],
                  ["BRIEF (Total General)", cmp.brief],
                ] as const
              ).map(([nombre, t]) => [nombre, fmt(t?.diferencia), fmt(t?.t), fmt(t?.gl, 1), fmtP(t?.p), fmt(t?.d)]),
            },
            interp: [...frasesDiferencia(datos), ...frasesComparacion(datos).filter((f) => f.startsWith("Al comparar"))].join(" "),
          },
          {
            numero: 4,
            titulo: "Correlación del AUDIT con cada escala del BRIEF",
            nota: "Valores = r de Pearson. * p < .05; ** p < .01.",
            copia: {
              cabeceras: ["Escala BRIEF", ...filasTabla.map((g) => g.etiqueta)],
              filas: (datos.total.correlacion_escalas ?? []).map((e, i) => [
                e.etiqueta,
                ...filasTabla.map((g) => {
                  const c = g.correlacion_escalas[i];
                  return `${sinCero(c.r)}${estrellas(c.p)}`;
                }),
              ]),
            },
            interp: interpretarEscalas(datos.total),
          },
        ]
      : [];

  const propsTabla = (i: number) => {
    const t = tablas[i];
    return { numero: t.numero, titulo: t.titulo, nota: t.nota, copia: t.copia, interpretacion: t.interp };
  };

  const copiarTablas = async () => {
    if (!datos || !tablas.length) return;
    const resultados = redactarResultados(datos).join(" ");
    const html =
      tablas
        .map((t) => tablaApaHtml(t.numero, t.titulo, t.copia.cabeceras, t.copia.filas, t.nota) + (t.interp ? parrafoHtml(t.interp) : ""))
        .join("") + parrafoHtml(resultados);
    const texto =
      tablas
        .map((t) => [`Tabla ${t.numero}`, t.titulo, t.copia.cabeceras.join("\t"), ...t.copia.filas.map((f) => f.join("\t")), t.interp].join("\n"))
        .join("\n\n") + `\n\n${resultados}`;
    const ok = await copiarConAviso(
      html,
      texto,
      "Tablas y resultados copiados",
      "Pégalos en Word con Ctrl+V: 4 tablas APA, cada una con su interpretación, y el párrafo de resultados."
    );
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const avisos: string[] = [];
  if (datos) {
    if (datos.sin_semestre.length)
      avisos.push(
        `${datos.sin_semestre.length} estudiante(s) sin semestre: aparecen en gris y solo cuentan en la muestra total. Complete la columna “Semestre” en Google Sheets: ${datos.sin_semestre.join(", ")}.`
      );
    if (datos.solo_audit.length) avisos.push(`Tienen AUDIT pero no BRIEF: ${datos.solo_audit.join(", ")}.`);
    if (datos.solo_brief.length) avisos.push(`Tienen BRIEF pero no AUDIT: ${datos.solo_brief.join(", ")}.`);
    if (datos.semestre_conflicto.length)
      avisos.push(`El AUDIT y el BRIEF indican semestres distintos (se usó el del AUDIT): ${datos.semestre_conflicto.join(", ")}.`);
    for (const s of datos.emparejados_por_similitud)
      avisos.push(`Emparejados por nombre parecido: “${s.audit}” (AUDIT) con “${s.brief}” (BRIEF). Verifique que sea la misma persona.`);
  }

  const errorCarga = cargando ? null : resultado.error;
  const hayDatos = !!datos && datos.personas.length > 0;
  const selectCls = "border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white";

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Estudio correlacional AUDIT × BRIEF por semestre</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Une el AUDIT y el BRIEF de cada estudiante por su nombre y calcula la correlación dentro de cada semestre. Cada estudiante
            necesita los dos tests y el semestre indicado al corregirlos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Fuente de datos
            <select value={fuente} onChange={(e) => setFuente(e.target.value as Fuente)} className={selectCls}>
              <option value="sheets">Google Sheets (+ pendientes de este equipo)</option>
              <option value="local">Solo historial de este equipo</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Comparar
            <select value={semA} onChange={(e) => setSemA(Number(e.target.value))} className={selectCls} aria-label="Primer semestre">
              {SEMESTRES.map((s) => (
                <option key={s} value={s}>
                  {s}.º
                </option>
              ))}
            </select>
            con
            <select value={semB} onChange={(e) => setSemB(Number(e.target.value))} className={selectCls} aria-label="Segundo semestre">
              {SEMESTRES.map((s) => (
                <option key={s} value={s}>
                  {s}.º
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => setRecarga((r) => r + 1)}
            disabled={cargando}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-slate-100">
          <button
            onClick={copiarTablas}
            disabled={!hayDatos}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <ClipboardCopy className="w-4 h-4" />}
            {copiado ? "Tablas copiadas" : "Copiar tablas y resultados para Word"}
          </button>
          <button
            onClick={descargarCsv}
            disabled={!hayDatos}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> CSV por estudiante (Jamovi)
          </button>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={incluirNombres} onChange={(e) => setIncluirNombres(e.target.checked)} />
            Incluir nombres en el CSV (dato sensible)
          </label>
        </div>

        {(errorCarga || error) && (
          <p className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {errorCarga || error}
          </p>
        )}
        {avisos.length > 0 && (
          <ul className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1 list-disc pl-6">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
      </section>

      {cargando && !datos && <p className="text-sm text-slate-500 text-center py-8">Calculando…</p>}

      {datos && !hayDatos && !cargando && (
        <section className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
          No hay estudiantes con AUDIT y BRIEF a la vez ({datos.total_audit} AUDIT y {datos.total_brief} BRIEF en la fuente). Corrija
          los dos tests de cada estudiante con el mismo nombre y el semestre indicado.
        </section>
      )}

      {hayDatos && datos && cmp && (
        <>
          <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Resultados</h3>
            {redactarResultados(datos).map((f) => (
              <p key={f} className="text-sm text-slate-800">
                {f}
              </p>
            ))}
            {grupos.some((g) => g.n < 30) && (
              <p className="text-xs text-slate-500">
                Con menos de 30 estudiantes por semestre, revise también la ρ de Spearman: es más robusta ante valores extremos.
              </p>
            )}
          </section>

          <ChartCard
            titulo="Diagrama de dispersión AUDIT × BRIEF"
            subtitulo="Un punto por estudiante · línea continua = recta de regresión de cada semestre · discontinua = muestra total"
            archivo="correlacion_audit_brief_dispersion.png"
            interpretacion={interpretarDispersion(datos)}
          >
            <Dispersion personas={datos.personas} grupos={grupos} total={datos.total} semestres={datos.semestres} />
          </ChartCard>

          <ChartCard
            titulo="Promedios por semestre"
            subtitulo="Barras = media · líneas = ± 1 desviación estándar"
            archivo="correlacion_audit_brief_promedios.png"
            interpretacion={frasesDiferencia(datos).join(" ")}
          >
            <Promedios grupos={grupos} semestres={datos.semestres} />
          </ChartCard>

          <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-6">
            <TablaApa {...propsTabla(0)}>
              <thead>
                <tr>
                  <th className={`${TH} text-left`}>Grupo</th>
                  {["n", "AUDIT M", "AUDIT DE", "BRIEF M", "BRIEF DE"].map((h) => (
                    <th key={h} className={`${TH} text-right`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasTabla.map((g) => (
                  <tr key={g.etiqueta}>
                    <td className={`${TD} text-left`}>{g.etiqueta}</td>
                    <td className={`${TD} text-right`}>{g.n}</td>
                    <td className={`${TD} text-right`}>{fmt(g.audit.media)}</td>
                    <td className={`${TD} text-right`}>{fmt(g.audit.de)}</td>
                    <td className={`${TD} text-right`}>{fmt(g.brief.media)}</td>
                    <td className={`${TD} text-right`}>{fmt(g.brief.de)}</td>
                  </tr>
                ))}
              </tbody>
            </TablaApa>

            <TablaApa {...propsTabla(1)}>
              <thead>
                <tr>
                  <th className={`${TH} text-left`}>Grupo</th>
                  {["n", "r", "IC 95 %", "p", "ρ", "p (ρ)"].map((h) => (
                    <th key={h} className={`${TH} text-right`}>
                      {h}
                    </th>
                  ))}
                  <th className={`${TH} text-left`}>Magnitud</th>
                </tr>
              </thead>
              <tbody>
                {filasTabla.map((g) => {
                  const c = g.correlacion;
                  return (
                    <tr key={g.etiqueta}>
                      <td className={`${TD} text-left`}>{g.etiqueta}</td>
                      <td className={`${TD} text-right`}>{g.n}</td>
                      <td className={`${TD} text-right`}>{sinCero(c.r)}</td>
                      <td className={`${TD} text-right`}>{ic(c)}</td>
                      <td className={`${TD} text-right`}>{fmtP(c.p)}</td>
                      <td className={`${TD} text-right`}>{sinCero(c.rho)}</td>
                      <td className={`${TD} text-right`}>{fmtP(c.p_rho)}</td>
                      <td className={`${TD} text-left`}>{c.interpretacion}</td>
                    </tr>
                  );
                })}
                {pm && (
                  <tr className="border-t border-slate-300">
                    <td className={`${TD} text-left font-semibold`}>Promedio ponderado de semestres</td>
                    <td className={`${TD} text-right`}>{pm.n}</td>
                    <td className={`${TD} text-right font-semibold`}>{sinCero(pm.r)}</td>
                    <td className={`${TD} text-right`}>{ic(pm)}</td>
                    <td className={`${TD} text-right`}>{fmtP(pm.p)}</td>
                    <td className={`${TD} text-right`}>—</td>
                    <td className={`${TD} text-right`}>—</td>
                    <td className={`${TD} text-left`}>{pm.interpretacion}</td>
                  </tr>
                )}
              </tbody>
            </TablaApa>

            <TablaApa {...propsTabla(2)}>
              <thead>
                <tr>
                  <th className={`${TH} text-left`}>Variable</th>
                  {["Diferencia", "t", "gl", "p", "d de Cohen"].map((h) => (
                    <th key={h} className={`${TH} text-right`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["AUDIT", cmp.audit],
                    ["BRIEF (Total General)", cmp.brief],
                  ] as const
                ).map(([nombre, t]) => (
                  <tr key={nombre}>
                    <td className={`${TD} text-left`}>{nombre}</td>
                    <td className={`${TD} text-right`}>{fmt(t?.diferencia)}</td>
                    <td className={`${TD} text-right`}>{fmt(t?.t)}</td>
                    <td className={`${TD} text-right`}>{fmt(t?.gl, 1)}</td>
                    <td className={`${TD} text-right`}>{fmtP(t?.p)}</td>
                    <td className={`${TD} text-right`}>{fmt(t?.d)}</td>
                  </tr>
                ))}
              </tbody>
            </TablaApa>

            <TablaApa {...propsTabla(3)}>
              <thead>
                <tr>
                  <th className={`${TH} text-left`}>Escala BRIEF</th>
                  {filasTabla.map((g) => (
                    <th key={g.etiqueta} className={`${TH} text-right`}>
                      {g.etiqueta}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.total.correlacion_escalas.map((e, i) => (
                  <tr key={e.escala}>
                    <td className={`${TD} text-left`}>{e.etiqueta}</td>
                    {filasTabla.map((g) => {
                      const c = g.correlacion_escalas[i];
                      return (
                        <td key={g.etiqueta} className={`${TD} text-right`}>
                          {sinCero(c.r)}
                          {estrellas(c.p)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </TablaApa>
          </section>

          <details className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-slate-900">
              AUDIT y BRIEF de cada estudiante ({datos.personas.length})
            </summary>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className={`${TH} text-left`}>Estudiante</th>
                    <th className={`${TH} text-right`}>Semestre</th>
                    <th className={`${TH} text-right`}>AUDIT</th>
                    <th className={`${TH} text-left`}>Diagnóstico AUDIT</th>
                    <th className={`${TH} text-right`}>BRIEF total</th>
                    <th className={`${TH} text-left`}>Alerta BRIEF</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.personas.map((p, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className={`${TD} text-left`}>
                        {p.nombre}
                        {p.emparejado_por === "similar" && <span className="text-amber-700"> (nombre parecido)</span>}
                      </td>
                      <td className={`${TD} text-right`}>{p.semestre ? `${p.semestre}.º` : "—"}</td>
                      <td className={`${TD} text-right`}>{p.audit}</td>
                      <td className={`${TD} text-left`}>{p.diagnostico || "—"}</td>
                      <td className={`${TD} text-right`}>{p.total_general}</td>
                      <td className={`${TD} text-left`}>{p.alerta_entrevista || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
};
