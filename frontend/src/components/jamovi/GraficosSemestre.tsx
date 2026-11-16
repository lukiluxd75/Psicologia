import React from "react";
import { JMV, fmt, jitter, ticksBonitos, type Descriptiva, type Fiabilidad, type FilaFrecuencia } from "../../lib/jamovi";
import { EjeY, FUENTE, SinDatos } from "./JamoviCharts";

/* Gráficos que comparan grupos (1.º y 8.º semestre) sobre un mismo eje. */

export interface Serie {
  etiqueta: string;
  color: string;
}

const fmtAlfa = (v: number) => v.toFixed(2).replace(/^(-?)0\./, "$1.");

function Titulo({ W, texto }: { W: number; texto: string }) {
  return (
    <text x={W / 2} y={22} textAnchor="middle" fontFamily={FUENTE} fontSize={14} fontWeight={600} fill={JMV.tinta}>
      {texto}
    </text>
  );
}

function Leyenda({ series, x, y }: { series: Serie[]; x: number; y: number }) {
  const posiciones = series.map((_, i) => anchoLeyenda(series.slice(0, i)));
  return (
    <g fontFamily={FUENTE} fontSize={11} fill={JMV.tinta} transform={`translate(${x} ${y})`}>
      {series.map((s, i) => {
        const pos = posiciones[i];
        return (
          <g key={s.etiqueta} transform={`translate(${pos} 0)`}>
            <rect x={0} y={-5} width={12} height={10} rx={2} fill={s.color} />
            <text x={17} y={0} dominantBaseline="middle">
              {s.etiqueta}
            </text>
          </g>
        );
      })}
    </g>
  );
}

const anchoLeyenda = (series: Serie[]) => series.reduce((a, s) => a + 26 + s.etiqueta.length * 6.2, 0);

function etiquetaEje(texto: string, max = 18): string[] {
  const palabras = texto.split(" ");
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    if (actual && (actual + " " + p).length > max) {
      lineas.push(actual);
      actual = p;
    } else actual = actual ? `${actual} ${p}` : p;
  }
  if (actual) lineas.push(actual);
  return lineas.slice(0, 2);
}

/* ─── Diagrama de cajas por grupo ─────────────────────────────────────── */

export const BoxPlotGrupos: React.FC<{
  escalas: { variable: string; etiqueta: string }[];
  grupos: (Serie & { descriptivas: Descriptiva[] })[];
  titulo: string;
}> = ({ escalas, grupos, titulo }) => {
  const celdas = grupos.flatMap((g) => g.descriptivas.filter((d) => d.n > 0 && escalas.some((e) => e.variable === d.variable)));
  if (celdas.length === 0) return <SinDatos />;

  const banda = Math.max(110, 52 * grupos.length);
  const rotar = escalas.length > 4;
  const m = { t: 66, r: 20, b: rotar ? 150 : 78, l: 60 };
  const W = Math.max(560, m.l + m.r + banda * escalas.length);
  const H = rotar ? 470 : 410;
  const plotW = W - m.l - m.r;
  const bandaReal = Math.min(plotW / escalas.length, 220);
  const xIni = m.l + (plotW - bandaReal * escalas.length) / 2;

  const yMin = Math.min(...celdas.map((d) => Math.min(d.minimo_teorico ?? d.minimo!, d.minimo!)));
  const yMax = Math.max(...celdas.map((d) => Math.max(d.maximo_teorico ?? d.maximo!, d.maximo!)));
  const ticks = ticksBonitos(Math.floor(yMin), Math.ceil(yMax));
  const d0 = Math.min(ticks[0], yMin);
  const d1 = Math.max(ticks[ticks.length - 1], yMax);
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - (v - d0) / (d1 - d0 || 1));
  const sub = bandaReal / (grupos.length + 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: Math.min(W, 640), maxWidth: W, display: "block", margin: "0 auto" }} role="img" aria-label={titulo}>
      <rect width={W} height={H} fill="#ffffff" />
      <Titulo W={W} texto={titulo} />
      <Leyenda series={[...grupos, { etiqueta: "Media", color: "#111111" }]} x={W / 2 - anchoLeyenda([...grupos, { etiqueta: "Media", color: "" }]) / 2} y={44} />
      <EjeY ticks={ticks} y={y} x0={m.l} x1={W - m.r} etiqueta="Puntuación directa" />

      {escalas.map((e, i) => {
        const centro = xIni + bandaReal * (i + 0.5);
        return (
          <g key={e.variable}>
            {grupos.map((g, j) => {
              const d = g.descriptivas.find((x) => x.variable === e.variable);
              if (!d || d.n === 0 || d.q1 === null || d.q3 === null) return null;
              const cx = centro + (j - (grupos.length - 1) / 2) * sub;
              const iqr = d.q3 - d.q1;
              const bigoteInf = Math.min(...d.valores.filter((v) => v >= d.q1! - 1.5 * iqr));
              const bigoteSup = Math.max(...d.valores.filter((v) => v <= d.q3! + 1.5 * iqr));
              const cajaW = Math.min(26, sub * 0.55);
              return (
                <g key={g.etiqueta}>
                  <line x1={cx} x2={cx} y1={y(bigoteInf)} y2={y(d.q1)} stroke={JMV.tinta} strokeWidth={1.2} />
                  <line x1={cx} x2={cx} y1={y(d.q3)} y2={y(bigoteSup)} stroke={JMV.tinta} strokeWidth={1.2} />
                  <rect x={cx - cajaW / 2} y={y(d.q3)} width={cajaW} height={Math.max(1, y(d.q1) - y(d.q3))} fill={g.color} fillOpacity={0.3} stroke={JMV.tinta} strokeWidth={1.2}>
                    <title>{`${e.etiqueta} · ${g.etiqueta}\nQ1 = ${fmt(d.q1)} · Mediana = ${fmt(d.mediana)} · Q3 = ${fmt(d.q3)} · n = ${d.n}`}</title>
                  </rect>
                  <line x1={cx - cajaW / 2} x2={cx + cajaW / 2} y1={y(d.mediana!)} y2={y(d.mediana!)} stroke={JMV.tinta} strokeWidth={2} />
                  {d.valores.map((v, k) => (
                    <circle key={k} cx={cx + jitter(k) * sub * 0.5} cy={y(v)} r={3} fill={g.color} fillOpacity={0.75} stroke="#ffffff" strokeWidth={0.8}>
                      <title>{`${e.etiqueta} · ${g.etiqueta}: ${v}`}</title>
                    </circle>
                  ))}
                  <rect x={cx - 4.5} y={y(d.media!) - 4.5} width={9} height={9} fill="#111111" stroke="#ffffff" strokeWidth={1}>
                    <title>{`${g.etiqueta}: media = ${fmt(d.media)} (DE = ${fmt(d.de)}, n = ${d.n})`}</title>
                  </rect>
                </g>
              );
            })}
            <text
              fontFamily={FUENTE}
              fontSize={11}
              fill={JMV.tinta}
              textAnchor={rotar ? "end" : "middle"}
              transform={rotar ? `translate(${centro + 4} ${H - m.b + 14}) rotate(-35)` : `translate(${centro} ${H - m.b + 16})`}
            >
              {(rotar ? [e.etiqueta.length > 26 ? e.etiqueta.slice(0, 25) + "…" : e.etiqueta] : etiquetaEje(e.etiqueta)).map((l, k) => (
                <tspan key={k} x={0} dy={k === 0 ? 0 : 13}>
                  {l}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
      <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke={JMV.eje} />
    </svg>
  );
};

/* ─── Barras agrupadas: % de cada categoría dentro de cada grupo ──────── */

export const BarrasGrupos: React.FC<{
  grupos: (Serie & { tabla: FilaFrecuencia[] })[];
  titulo: string;
}> = ({ grupos, titulo }) => {
  const categorias: string[] = [];
  grupos.forEach((g) => g.tabla.forEach((f) => !categorias.includes(f.categoria) && categorias.push(f.categoria)));
  if (categorias.length === 0) return <SinDatos />;

  const m = { t: 66, r: 20, b: 72, l: 60 };
  const banda = Math.max(130, 46 * grupos.length + 40);
  const W = Math.max(560, m.l + m.r + banda * categorias.length);
  const H = 380;
  const plotW = W - m.l - m.r;
  const bandaReal = plotW / categorias.length;
  const barW = Math.min(52, (bandaReal * 0.75) / grupos.length);
  const maxPct = Math.max(...grupos.flatMap((g) => g.tabla.map((f) => f.porcentaje)), 1);
  const ticks = ticksBonitos(0, Math.min(100, maxPct * 1.2), 5);
  const top = Math.max(ticks[ticks.length - 1], maxPct * 1.2);
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - v / top);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: Math.min(W, 600), maxWidth: W, display: "block", margin: "0 auto" }} role="img" aria-label={titulo}>
      <rect width={W} height={H} fill="#ffffff" />
      <Titulo W={W} texto={titulo} />
      <Leyenda series={grupos} x={W / 2 - anchoLeyenda(grupos) / 2} y={44} />
      <EjeY ticks={ticks} y={y} x0={m.l} x1={W - m.r} etiqueta="% dentro del grupo" />
      {categorias.map((c, i) => {
        const centro = m.l + bandaReal * (i + 0.5);
        return (
          <g key={c} fontFamily={FUENTE}>
            {grupos.map((g, j) => {
              const f = g.tabla.find((x) => x.categoria === c);
              const pct = f?.porcentaje ?? 0;
              const x = centro + (j - grupos.length / 2) * (barW + 2) + 1;
              const yTop = y(pct);
              const alto = y(0) - yTop;
              const r = Math.min(4, alto / 2, barW / 2);
              const d = `M${x},${y(0)}V${yTop + r}Q${x},${yTop} ${x + r},${yTop}H${x + barW - r}Q${x + barW},${yTop} ${x + barW},${yTop + r}V${y(0)}Z`;
              return (
                <g key={g.etiqueta}>
                  {alto > 0 && (
                    <path d={d} fill={g.color}>
                      <title>{`${c} · ${g.etiqueta}: ${pct.toFixed(1)} % (n = ${f?.frecuencia ?? 0})`}</title>
                    </path>
                  )}
                  <text x={x + barW / 2} y={yTop - 19} textAnchor="middle" fontSize={11} fontWeight={600} fill={JMV.tinta}>
                    {`${pct.toFixed(0)} %`}
                  </text>
                  <text x={x + barW / 2} y={yTop - 6} textAnchor="middle" fontSize={10} fill={JMV.tintaSuave}>
                    {`n = ${f?.frecuencia ?? 0}`}
                  </text>
                </g>
              );
            })}
            <text fontSize={11} fill={JMV.tinta} textAnchor="middle" transform={`translate(${centro} ${H - m.b + 16})`}>
              {etiquetaEje(c).map((l, k) => (
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

/* ─── Histograma por grupo: mismos intervalos, barras lado a lado ─────── */

export const HistogramaGrupos: React.FC<{
  grupos: (Serie & { valores: number[] })[];
  cortes: { valor: number; etiqueta: string }[];
  etiquetaX: string;
  titulo: string;
}> = ({ grupos, cortes, etiquetaX, titulo }) => {
  const todos = grupos.flatMap((g) => g.valores);
  if (todos.length === 0) return <SinDatos />;

  const m = { t: 76, r: 24, b: 52, l: 64 };
  const W = 680;
  const H = 400;
  const vMin = Math.min(...todos);
  const vMax = Math.max(...todos);
  const k = Math.min(15, Math.max(5, Math.ceil(Math.log2(todos.length)) + 1));
  const anchoBin = Math.max(1, Math.ceil((vMax - vMin + 1) / k));
  const enteros = todos.every(Number.isInteger);
  const inicio = Math.floor(vMin) - (enteros && anchoBin === 1 ? 0.5 : 0);
  const nBins = Math.max(1, Math.ceil((vMax - inicio + 1) / anchoBin));
  const fin = inicio + nBins * anchoBin;
  const bins = Array.from({ length: nBins }, (_, i) => {
    const a = inicio + i * anchoBin;
    const b = a + anchoBin;
    const pcts = grupos.map((g) => {
      const n = g.valores.filter((v) => v >= a && (v < b || (i === nBins - 1 && v <= b))).length;
      return { n, pct: g.valores.length ? (n / g.valores.length) * 100 : 0 };
    });
    return { a, b, pcts };
  });

  const cortesVisibles = cortes.filter((c) => c.valor >= inicio - anchoBin && c.valor <= fin + anchoBin);
  const xMin = Math.min(inicio, ...cortesVisibles.map((c) => c.valor));
  const xMax = Math.max(fin, ...cortesVisibles.map((c) => c.valor));
  const x = (v: number) => m.l + ((v - xMin) / (xMax - xMin || 1)) * (W - m.l - m.r);
  const maxPct = Math.max(...bins.flatMap((b) => b.pcts.map((p) => p.pct)), 1);
  const ticksY = ticksBonitos(0, Math.min(100, maxPct * 1.1), 5);
  const top = Math.max(ticksY[ticksY.length - 1], maxPct);
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - v / top);
  const ticksX = ticksBonitos(xMin, xMax, 8).filter((t) => t >= xMin && t <= xMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 600, maxWidth: W, display: "block", margin: "0 auto" }} role="img" aria-label={titulo}>
      <rect width={W} height={H} fill="#ffffff" />
      <Titulo W={W} texto={titulo} />
      <Leyenda series={grupos} x={W / 2 - anchoLeyenda(grupos) / 2} y={44} />
      <EjeY ticks={ticksY} y={y} x0={m.l} x1={W - m.r} etiqueta="% dentro del grupo" />

      {bins.map((b) => {
        const ancho = x(b.b) - x(b.a);
        const barW = Math.max(1, (ancho - 4) / grupos.length - 1);
        return (
          <g key={b.a}>
            {b.pcts.map((p, j) =>
              p.pct > 0 ? (
                <rect key={j} x={x(b.a) + 2 + j * (barW + 1)} y={y(p.pct)} width={barW} height={y(0) - y(p.pct)} fill={grupos[j].color}>
                  <title>{`${grupos[j].etiqueta} · [${b.a}, ${b.b}${b.b === fin ? "]" : ")"}: n = ${p.n} (${p.pct.toFixed(1)} %)`}</title>
                </rect>
              ) : null
            )}
          </g>
        );
      })}

      {cortesVisibles.map((c, i) => (
        <g key={c.valor} fontFamily={FUENTE}>
          <line x1={x(c.valor)} x2={x(c.valor)} y1={m.t - 6} y2={y(0)} stroke={JMV.coral} strokeWidth={1.6} strokeDasharray="5 4" />
          <text
            x={x(c.valor) > W - 150 ? x(c.valor) - 4 : x(c.valor) + 4}
            y={m.t + 4 + (i % 2) * 13}
            textAnchor={x(c.valor) > W - 150 ? "end" : "start"}
            fontSize={10.5}
            fill={JMV.tinta}
            stroke="#ffffff"
            strokeWidth={3}
            paintOrder="stroke"
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
          {etiquetaX}
        </text>
      </g>
    </svg>
  );
};

/* ─── α de Cronbach por escala y grupo ────────────────────────────────── */

const ALFA_ACEPTABLE = 0.7;

export const FiabilidadGrupos: React.FC<{
  escalas: { escala: string; etiqueta: string }[];
  grupos: (Serie & { filas: Fiabilidad[] })[];
  titulo: string;
}> = ({ escalas, grupos, titulo }) => {
  if (escalas.length === 0) return <SinDatos />;
  const alfaDe = (g: { filas: Fiabilidad[] }, escala: string) => g.filas.find((f) => f.escala === escala);
  const calculados = grupos.flatMap((g) => g.filas.flatMap((f) => (f.alfa === null ? [] : [f.alfa])));
  const m = { t: 70, r: 150, b: 52, l: 200 };
  const barH = 13;
  const fila = 10 + grupos.length * (barH + 3);
  const W = 720;
  const H = m.t + m.b + fila * escalas.length;
  const minimo = Math.min(0, Math.floor(Math.min(...calculados, 0) * 10) / 10);
  const x = (v: number) => m.l + ((v - minimo) / (1 - minimo)) * (W - m.l - m.r);
  const ticks = Array.from({ length: Math.round((1 - minimo) * 10) + 1 }, (_, i) => Math.round((minimo + i / 10) * 10) / 10);
  const indiceTotal = escalas.findIndex((e) => e.escala === "total");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 600, maxWidth: W, display: "block", margin: "0 auto" }} role="img" aria-label={titulo}>
      <rect width={W} height={H} fill="#ffffff" />
      <Titulo W={W} texto={titulo} />
      <Leyenda series={grupos} x={W / 2 - anchoLeyenda(grupos) / 2} y={42} />

      <g fontFamily={FUENTE} fontSize={11} fill={JMV.tintaSuave}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} stroke={JMV.grid} />
            <text x={x(t)} y={H - m.b + 17} textAnchor="middle">
              {t === 0 ? "0" : fmtAlfa(t)}
            </text>
          </g>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 12} textAnchor="middle" fontSize={12} fill={JMV.tinta}>
          α de Cronbach
        </text>
      </g>

      <line x1={x(ALFA_ACEPTABLE)} x2={x(ALFA_ACEPTABLE)} y1={m.t - 6} y2={H - m.b} stroke={JMV.coral} strokeWidth={1.6} strokeDasharray="5 4" />
      <text x={x(ALFA_ACEPTABLE) + 4} y={m.t - 8} fontFamily={FUENTE} fontSize={10.5} fill={JMV.tinta}>
        α = .70
      </text>

      {escalas.map((e, i) => {
        const y0 = m.t + fila * i;
        const cy = y0 + fila / 2;
        const esTotal = i === indiceTotal;
        const lineas = etiquetaEje(e.etiqueta, 28);
        return (
          <g key={e.escala} fontFamily={FUENTE}>
            {esTotal && i > 0 && <line x1={8} x2={W - 8} y1={y0} y2={y0} stroke={JMV.eje} strokeWidth={0.8} />}
            <text x={m.l - 10} y={cy - (lineas.length - 1) * 6.5} textAnchor="end" dominantBaseline="middle" fontSize={11.5} fontWeight={esTotal ? 700 : 400} fill={JMV.tinta}>
              {lineas.map((l, k) => (
                <tspan key={k} x={m.l - 10} dy={k === 0 ? 0 : 13}>
                  {l}
                </tspan>
              ))}
            </text>
            {grupos.map((g, j) => {
              const f = alfaDe(g, e.escala);
              const yb = y0 + 5 + j * (barH + 3);
              if (!f || f.alfa === null)
                return (
                  <text key={g.etiqueta} x={x(0) + 6} y={yb + barH / 2} dominantBaseline="middle" fontSize={10.5} fontStyle="italic" fill={JMV.tintaSuave}>
                    {`${g.etiqueta}: sin casos suficientes`}
                  </text>
                );
              return (
                <g key={g.etiqueta}>
                  <rect x={Math.min(x(0), x(f.alfa))} y={yb} width={Math.max(2, Math.abs(x(f.alfa) - x(0)))} height={barH} rx={3} fill={g.color}>
                    <title>{`${e.etiqueta} · ${g.etiqueta}: α = ${fmtAlfa(f.alfa)} (${f.interpretacion}) · n = ${f.n}`}</title>
                  </rect>
                  <text
                    x={x(Math.max(f.alfa, 0)) + 6}
                    y={yb + barH / 2}
                    dominantBaseline="middle"
                    fontSize={10.5}
                    fill={JMV.tinta}
                    stroke="#ffffff"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                  >
                    <tspan fontWeight={600}>{fmtAlfa(f.alfa)}</tspan>
                    <tspan fill={JMV.tintaSuave}>{` · ${f.interpretacion}`}</tspan>
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      <line x1={x(0)} x2={x(0)} y1={m.t} y2={H - m.b} stroke={JMV.eje} />
    </svg>
  );
};
