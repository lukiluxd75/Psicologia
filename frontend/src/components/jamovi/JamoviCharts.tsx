import React, { useRef, useState } from "react";
import { Camera } from "lucide-react";
import {
  COLOR_CATEGORIA,
  JMV,
  densidadKernel,
  descargarSvgComoPng,
  fmt,
  jitter,
  ticksBonitos,
  type Descriptiva,
  type FilaFrecuencia,
} from "../../lib/jamovi";

const FUENTE = "Arial, Helvetica, sans-serif";

/* ─── Contenedor con botón de descarga PNG ─────────────────────────────── */

export const ChartCard: React.FC<{
  titulo: string;
  subtitulo?: string;
  archivo: string;
  acciones?: React.ReactNode;
  children: React.ReactNode;
}> = ({ titulo, subtitulo, archivo, acciones, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const descargar = async () => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    setError(null);
    try {
      await descargarSvgComoPng(svg, archivo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar");
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
          {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {acciones}
          <button
            onClick={descargar}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Camera className="w-3.5 h-3.5" /> Descargar PNG
          </button>
        </div>
      </div>
      <div ref={ref} className="overflow-x-auto">
        {children}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
};

const SinDatos: React.FC = () => (
  <p className="text-sm text-slate-500 py-10 text-center">No hay datos suficientes para este gráfico.</p>
);

/* ─── Ejes compartidos ────────────────────────────────────────────────── */

function EjeY({ ticks, y, x0, x1, etiqueta }: { ticks: number[]; y: (v: number) => number; x0: number; x1: number; etiqueta: string }) {
  const yMid = (y(ticks[0]) + y(ticks[ticks.length - 1])) / 2;
  return (
    <g fontFamily={FUENTE} fontSize={11} fill={JMV.tintaSuave}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} stroke={JMV.grid} strokeWidth={1} />
          <text x={x0 - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
            {Number.isInteger(t) ? t : t.toFixed(2)}
          </text>
        </g>
      ))}
      <line x1={x0} x2={x0} y1={y(ticks[0])} y2={y(ticks[ticks.length - 1])} stroke={JMV.eje} />
      <text x={14} y={yMid} textAnchor="middle" transform={`rotate(-90 14 ${yMid})`} fontSize={12} fill={JMV.tinta}>
        {etiqueta}
      </text>
    </g>
  );
}

function partirEtiqueta(texto: string, max = 16): string[] {
  const palabras = texto.split(" ");
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    if ((actual + " " + p).trim().length > max && actual) {
      lineas.push(actual);
      actual = p;
    } else actual = (actual + " " + p).trim();
  }
  if (actual) lineas.push(actual);
  if (lineas.length > 2) return [lineas[0], lineas.slice(1).join(" ").slice(0, max - 1) + "…"];
  return lineas;
}

/* ─── A. Boxplot + violín + jitter + media ────────────────────────────── */

export const BoxViolinPlot: React.FC<{ escalas: Descriptiva[]; titulo: string }> = ({ escalas, titulo }) => {
  const conDatos = escalas.filter((e) => e.n > 0);
  if (conDatos.length === 0) return <SinDatos />;

  const banda = 92;
  const rotar = escalas.length > 4;
  const m = { t: 58, r: 20, b: rotar ? 150 : 78, l: 60 };
  const W = Math.max(520, m.l + m.r + banda * escalas.length);
  const H = rotar ? 460 : 400;
  const plotW = W - m.l - m.r;
  // Con pocas escalas se limita el ancho de cada banda para que el violín no se aplane
  const bandaReal = Math.min(plotW / escalas.length, 170);
  const xIni = m.l + (plotW - bandaReal * escalas.length) / 2;

  const yMin = Math.min(...conDatos.map((e) => Math.min(e.minimo_teorico ?? e.minimo!, e.minimo!)));
  const yMax = Math.max(...conDatos.map((e) => Math.max(e.maximo_teorico ?? e.maximo!, e.maximo!)));
  const ticks = ticksBonitos(Math.floor(yMin), Math.ceil(yMax));
  const d0 = Math.min(ticks[0], yMin);
  const d1 = Math.max(ticks[ticks.length - 1], yMax);
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - (v - d0) / (d1 - d0 || 1));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: Math.min(W, 640), maxWidth: W, display: "block", margin: "0 auto" }} role="img" aria-label={titulo}>
      <rect width={W} height={H} fill="#ffffff" />
      <text x={W / 2} y={22} textAnchor="middle" fontFamily={FUENTE} fontSize={14} fontWeight={600} fill={JMV.tinta}>
        {titulo}
      </text>
      <EjeY ticks={ticks} y={y} x0={m.l} x1={W - m.r} etiqueta="Puntuación directa" />

      {escalas.map((e, i) => {
        const cx = xIni + bandaReal * (i + 0.5);
        const etiqueta = (
          <text
            fontFamily={FUENTE}
            fontSize={11}
            fill={JMV.tinta}
            textAnchor={rotar ? "end" : "middle"}
            transform={rotar ? `translate(${cx + 4} ${H - m.b + 14}) rotate(-35)` : `translate(${cx} ${H - m.b + 16})`}
          >
            {(rotar ? [e.etiqueta.length > 26 ? e.etiqueta.slice(0, 25) + "…" : e.etiqueta] : partirEtiqueta(e.etiqueta)).map((l, k) => (
              <tspan key={k} x={0} dy={k === 0 ? 0 : 13}>
                {l}
              </tspan>
            ))}
          </text>
        );
        if (e.n === 0 || e.q1 === null || e.q3 === null) return <g key={e.variable}>{etiqueta}</g>;

        const vals = e.valores;
        const iqr = e.q3 - e.q1;
        const bigoteInf = Math.min(...vals.filter((v) => v >= e.q1! - 1.5 * iqr));
        const bigoteSup = Math.max(...vals.filter((v) => v <= e.q3! + 1.5 * iqr));
        const cajaW = Math.min(22, bandaReal * 0.22);

        // Violín recortado al rango de los datos (como jmv)
        let violin: string | null = null;
        if (vals.length > 1 && e.maximo! > e.minimo!) {
          const pasos = 40;
          const pts = Array.from({ length: pasos + 1 }, (_, k) => e.minimo! + ((e.maximo! - e.minimo!) * k) / pasos);
          const dens = densidadKernel(vals, pts);
          const dMax = Math.max(...dens) || 1;
          const ancho = bandaReal * 0.4;
          const der = pts.map((p, k) => `${cx + (dens[k] / dMax) * ancho},${y(p)}`);
          const izq = pts.map((p, k) => `${cx - (dens[k] / dMax) * ancho},${y(p)}`).reverse();
          violin = `M${der.join("L")}L${izq.join("L")}Z`;
        }

        return (
          <g key={e.variable}>
            {violin && <path d={violin} fill={JMV.azul} fillOpacity={0.14} stroke={JMV.azul} strokeOpacity={0.55} strokeWidth={1} />}
            <line x1={cx} x2={cx} y1={y(bigoteInf)} y2={y(e.q1)} stroke={JMV.tinta} strokeWidth={1.2} />
            <line x1={cx} x2={cx} y1={y(e.q3)} y2={y(bigoteSup)} stroke={JMV.tinta} strokeWidth={1.2} />
            <rect
              x={cx - cajaW / 2}
              y={y(e.q3)}
              width={cajaW}
              height={Math.max(1, y(e.q1) - y(e.q3))}
              fill="#ffffff"
              fillOpacity={0.85}
              stroke={JMV.tinta}
              strokeWidth={1.2}
            >
              <title>{`${e.etiqueta}\nQ1 = ${fmt(e.q1)} · Mediana = ${fmt(e.mediana)} · Q3 = ${fmt(e.q3)}`}</title>
            </rect>
            <line x1={cx - cajaW / 2} x2={cx + cajaW / 2} y1={y(e.mediana!)} y2={y(e.mediana!)} stroke={JMV.tinta} strokeWidth={2} />
            {vals.map((v, k) => (
              <circle key={k} cx={cx + jitter(k) * bandaReal * 0.3} cy={y(v)} r={3.5} fill={JMV.azul} fillOpacity={0.6} stroke="#ffffff" strokeWidth={0.8}>
                <title>{`${e.etiqueta}: ${v}`}</title>
              </circle>
            ))}
            <rect x={cx - 4.5} y={y(e.media!) - 4.5} width={9} height={9} fill="#111111" stroke="#ffffff" strokeWidth={1}>
              <title>{`Media = ${fmt(e.media)} (DE = ${fmt(e.de)}, n = ${e.n})`}</title>
            </rect>
            {etiqueta}
          </g>
        );
      })}

      <g fontFamily={FUENTE} fontSize={10.5} fill={JMV.tintaSuave} transform={`translate(${W / 2 - 112} 40)`}>
        <rect x={0} y={-4.5} width={9} height={9} fill="#111111" />
        <text x={14} y={0} dominantBaseline="middle">Media</text>
        <line x1={58} x2={74} y1={0} y2={0} stroke={JMV.tinta} strokeWidth={2} />
        <text x={79} y={0} dominantBaseline="middle">Mediana</text>
        <circle cx={135} cy={0} r={3.5} fill={JMV.azul} fillOpacity={0.6} />
        <text x={143} y={0} dominantBaseline="middle">Caso individual</text>
      </g>
    </svg>
  );
};

/* ─── B. Barras de frecuencias ────────────────────────────────────────── */

export const BarPlot: React.FC<{ tabla: FilaFrecuencia[]; titulo: string }> = ({ tabla, titulo }) => {
  if (tabla.length === 0) return <SinDatos />;
  const m = { t: 44, r: 20, b: 72, l: 60 };
  const W = Math.max(520, m.l + m.r + 96 * tabla.length);
  const H = 360;
  const plotW = W - m.l - m.r;
  const banda = plotW / tabla.length;
  const barW = Math.min(76, banda * 0.62);
  const maxF = Math.max(...tabla.map((f) => f.frecuencia));
  const ticks = ticksBonitos(0, maxF * 1.15, 5).filter((t) => Number.isInteger(t));
  const top = Math.max(ticks[ticks.length - 1], maxF * 1.15);
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - v / top);
  const rotar = tabla.length > 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: Math.min(W, 600), maxWidth: W, display: "block", margin: "0 auto" }} role="img" aria-label={titulo}>
      <rect width={W} height={H} fill="#ffffff" />
      <text x={W / 2} y={22} textAnchor="middle" fontFamily={FUENTE} fontSize={14} fontWeight={600} fill={JMV.tinta}>
        {titulo}
      </text>
      <EjeY ticks={ticks.length ? ticks : [0, top]} y={y} x0={m.l} x1={W - m.r} etiqueta="Frecuencia (n)" />
      {tabla.map((f, i) => {
        const cx = m.l + banda * (i + 0.5);
        const color = COLOR_CATEGORIA[f.categoria] ?? JMV.azul;
        const yTop = y(f.frecuencia);
        const alto = y(0) - yTop;
        const r = Math.min(4, alto / 2, barW / 2);
        // Barra con extremo de datos redondeado y base recta sobre el eje
        const d = `M${cx - barW / 2},${y(0)}V${yTop + r}Q${cx - barW / 2},${yTop} ${cx - barW / 2 + r},${yTop}H${cx + barW / 2 - r}Q${cx + barW / 2},${yTop} ${cx + barW / 2},${yTop + r}V${y(0)}Z`;
        return (
          <g key={f.categoria} fontFamily={FUENTE}>
            <path d={d} fill={color}>
              <title>{`${f.categoria}: n = ${f.frecuencia} (${f.porcentaje}%)`}</title>
            </path>
            <text x={cx} y={yTop - 7} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={JMV.tinta}>
              {`${f.frecuencia} (${f.porcentaje.toFixed(1)}%)`}
            </text>
            <text
              fontSize={11}
              fill={JMV.tinta}
              textAnchor={rotar ? "end" : "middle"}
              transform={rotar ? `translate(${cx + 4} ${H - m.b + 14}) rotate(-35)` : `translate(${cx} ${H - m.b + 16})`}
            >
              {(rotar ? [f.categoria.length > 22 ? f.categoria.slice(0, 21) + "…" : f.categoria] : partirEtiqueta(f.categoria)).map((l, k) => (
                <tspan key={k} x={0} dy={k === 0 ? 0 : 13}>
                  {l}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
      <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} stroke={JMV.eje} />
    </svg>
  );
};

/* ─── C. Histograma + densidad + cortes clínicos ──────────────────────── */

export const HistogramPlot: React.FC<{
  variable: Descriptiva;
  cortes: { valor: number; etiqueta: string }[];
  titulo: string;
}> = ({ variable, cortes, titulo }) => {
  const vals = variable.valores;
  if (vals.length === 0) return <SinDatos />;

  const m = { t: 56, r: 24, b: 52, l: 64 };
  const W = 640;
  const H = 380;
  const dMin = Math.min(...vals, ...cortes.map((c) => c.valor));
  const dMax = Math.max(...vals, ...cortes.map((c) => c.valor));
  const k = Math.min(20, Math.max(5, Math.ceil(Math.log2(vals.length)) + 1));
  const anchoBin = Math.max(1, Math.ceil((Math.max(...vals) - Math.min(...vals) + 1) / k));
  const enteros = vals.every(Number.isInteger);
  const inicio = Math.floor(Math.min(...vals)) - (enteros && anchoBin === 1 ? 0.5 : 0);
  const nBins = Math.max(1, Math.ceil((Math.max(...vals) - inicio + 1) / anchoBin));
  const bins = Array.from({ length: nBins }, (_, i) => {
    const a = inicio + i * anchoBin;
    const b = a + anchoBin;
    const n = vals.filter((v) => v >= a && (v < b || (i === nBins - 1 && v <= b))).length;
    return { a, b, n, dens: n / (vals.length * anchoBin) };
  });

  const x0 = Math.min(dMin, inicio) - anchoBin * 0.5;
  const x1 = Math.max(dMax, inicio + nBins * anchoBin) + anchoBin * 0.5;
  const x = (v: number) => m.l + (W - m.l - m.r) * ((v - x0) / (x1 - x0));

  const puntosCurva = Array.from({ length: 81 }, (_, i) => x0 + ((x1 - x0) * i) / 80);
  const curva = vals.length > 1 && Math.max(...vals) > Math.min(...vals) ? densidadKernel(vals, puntosCurva) : null;
  const yTop = Math.max(...bins.map((b) => b.dens), ...(curva ?? [0])) * 1.12;
  const ticksY = ticksBonitos(0, yTop, 4);
  const top = Math.max(yTop, ticksY[ticksY.length - 1]);
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - v / top);
  const ticksX = ticksBonitos(x0, x1, 8).filter((t) => t >= x0 && t <= x1 && (!enteros || Number.isInteger(t)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 560, maxWidth: W, display: "block", margin: "0 auto" }} role="img" aria-label={titulo}>
      <rect width={W} height={H} fill="#ffffff" />
      <text x={W / 2} y={22} textAnchor="middle" fontFamily={FUENTE} fontSize={14} fontWeight={600} fill={JMV.tinta}>
        {titulo}
      </text>
      <EjeY ticks={ticksY} y={y} x0={m.l} x1={W - m.r} etiqueta="Densidad" />

      {bins.map((b) => (
        <rect
          key={b.a}
          x={x(b.a) + 1}
          y={y(b.dens)}
          width={Math.max(0, x(b.b) - x(b.a) - 2)}
          height={y(0) - y(b.dens)}
          fill={JMV.azul}
          fillOpacity={0.55}
        >
          <title>{`[${b.a}, ${b.b}${b.b === inicio + nBins * anchoBin ? "]" : ")"}: n = ${b.n}`}</title>
        </rect>
      ))}
      {curva && (
        <path
          d={`M${puntosCurva.map((p, i) => `${x(p)},${y(curva[i])}`).join("L")}`}
          fill="none"
          stroke={JMV.tinta}
          strokeWidth={2}
        />
      )}

      {cortes.map((c, i) => (
        <g key={c.valor} fontFamily={FUENTE}>
          <line x1={x(c.valor)} x2={x(c.valor)} y1={m.t - 6} y2={y(0)} stroke={JMV.coral} strokeWidth={1.6} strokeDasharray="5 4" />
          <text
            x={x(c.valor) > W - 150 ? x(c.valor) - 4 : x(c.valor) + 4}
            y={m.t - 10 + (i % 2) * 13}
            textAnchor={x(c.valor) > W - 150 ? "end" : "start"}
            fontSize={10.5}
            fill={JMV.tinta}
          >
            {c.etiqueta}
          </text>
        </g>
      ))}

      <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} stroke={JMV.eje} />
      <g fontFamily={FUENTE} fontSize={11} fill={JMV.tintaSuave}>
        {ticksX.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(0) + 4} stroke={JMV.eje} />
            <text x={x(t)} y={y(0) + 17} textAnchor="middle">
              {t}
            </text>
          </g>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 10} textAnchor="middle" fontSize={12} fill={JMV.tinta}>
          {variable.etiqueta}
        </text>
      </g>
    </svg>
  );
};
