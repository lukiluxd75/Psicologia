import React, { useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Download, RefreshCw, Check, AlertTriangle } from "lucide-react";
import {
  descargarBlob,
  filasDesdeHistorial,
  fmt,
  type Analitica,
  type Descriptiva,
  type FilaFrecuencia,
  type Fiabilidad,
  type HistorialLocal,
  type TipoTest,
} from "../lib/jamovi";
import { BarPlot, BoxViolinPlot, ChartCard, HistogramPlot } from "./jamovi/JamoviCharts";

type Fuente = "sheets" | "local" | "combinado";

const MODULOS: { id: TipoTest; etiqueta: string; nombre: string }[] = [
  { id: "AUDIT", etiqueta: "🍺 AUDIT", nombre: "AUDIT" },
  { id: "BRIEF", etiqueta: "🧠 BRIEF", nombre: "BRIEF" },
  { id: "PASS", etiqueta: "🤰 PASS (Perinatal)", nombre: "PASS" },
  { id: "PSICOSOCIAL", etiqueta: "👩‍👧 PSICOSOCIAL (Gestantes)", nombre: "Cuestionario Psicosocial" },
];

const FUENTES: { id: Fuente; etiqueta: string }[] = [
  { id: "sheets", etiqueta: "Google Sheets" },
  { id: "local", etiqueta: "Historial local" },
  { id: "combinado", etiqueta: "Sheets + local" },
];

const apiBase = import.meta.env.VITE_API_URL || "";

async function leerError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j.detail || j.error || `Error ${res.status}`;
  } catch {
    return `Error ${res.status}`;
  }
}

/* ─── Tablas APA ──────────────────────────────────────────────────────── */

const TH = "px-3 py-1.5 font-semibold text-slate-900 whitespace-nowrap";
const TD = "px-3 py-1.5 tabular-nums text-slate-800 whitespace-nowrap";

const TablaApa: React.FC<{ numero: number; titulo: string; nota?: string; children: React.ReactNode }> = ({
  numero,
  titulo,
  nota,
  children,
}) => (
  <figure className="space-y-1.5">
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

const TablaDescriptivas: React.FC<{ filas: Descriptiva[]; numero: number; total: number }> = ({ filas, numero, total }) => (
  <TablaApa
    numero={numero}
    titulo="Estadísticos descriptivos"
    nota={`N = ${total}. DE = desviación estándar; Q1 = percentil 25; Q3 = percentil 75. Cuartiles calculados con el método tipo 7 de R (Jamovi).`}
  >
    <thead>
      <tr>
        <th className={`${TH} text-left`}>Variable / Escala</th>
        {["N", "Perdidos", "Media", "Mediana", "DE", "Mínimo", "Máximo", "Q1 (25%)", "Q3 (75%)"].map((h) => (
          <th key={h} className={`${TH} text-right`}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {filas.map((d) => (
        <tr key={d.variable}>
          <td className={`${TD} text-left`}>{d.etiqueta}</td>
          <td className={`${TD} text-right`}>{d.n}</td>
          <td className={`${TD} text-right`}>{d.perdidos}</td>
          <td className={`${TD} text-right`}>{fmt(d.media)}</td>
          <td className={`${TD} text-right`}>{fmt(d.mediana)}</td>
          <td className={`${TD} text-right`}>{fmt(d.de)}</td>
          <td className={`${TD} text-right`}>{fmt(d.minimo, 0)}</td>
          <td className={`${TD} text-right`}>{fmt(d.maximo, 0)}</td>
          <td className={`${TD} text-right`}>{fmt(d.q1)}</td>
          <td className={`${TD} text-right`}>{fmt(d.q3)}</td>
        </tr>
      ))}
    </tbody>
  </TablaApa>
);

const TablaFrecuencias: React.FC<{ etiqueta: string; tabla: FilaFrecuencia[]; numero: number }> = ({ etiqueta, tabla, numero }) => (
  <TablaApa numero={numero} titulo={`Frecuencias de ${etiqueta}`}>
    <thead>
      <tr>
        <th className={`${TH} text-left`}>Nivel / Categoría</th>
        <th className={`${TH} text-right`}>Frecuencias (n)</th>
        <th className={`${TH} text-right`}>% del total</th>
        <th className={`${TH} text-right`}>% acumulado</th>
      </tr>
    </thead>
    <tbody>
      {tabla.map((f) => (
        <tr key={f.categoria}>
          <td className={`${TD} text-left`}>{f.categoria}</td>
          <td className={`${TD} text-right`}>{f.frecuencia}</td>
          <td className={`${TD} text-right`}>{f.porcentaje.toFixed(1)}</td>
          <td className={`${TD} text-right`}>{f.porcentaje_acumulado.toFixed(1)}</td>
        </tr>
      ))}
    </tbody>
  </TablaApa>
);

/** APA: sin cero inicial en valores que no pueden superar 1 (α = .85). */
const fmtAlfa = (v: number | null) => (v === null ? "—" : v.toFixed(2).replace(/^(-?)0\./, "$1."));

const NOTA_FIABILIDAD =
  "α = alfa de Cronbach; k = número de ítems; n = casos con todos los ítems respondidos. Interpretación según George y Mallery (2003). Con muestras pequeñas el α es inestable.";

const TablaFiabilidad: React.FC<{ filas: Fiabilidad[]; numero: number }> = ({ filas, numero }) => (
  <TablaApa numero={numero} titulo="Fiabilidad por consistencia interna" nota={NOTA_FIABILIDAD}>
    <thead>
      <tr>
        <th className={`${TH} text-left`}>Escala</th>
        <th className={`${TH} text-right`}>k</th>
        <th className={`${TH} text-right`}>n</th>
        <th className={`${TH} text-right`}>α</th>
        <th className={`${TH} text-left`}>Interpretación</th>
      </tr>
    </thead>
    <tbody>
      {filas.map((f) => (
        <tr key={f.escala}>
          <td className={`${TD} text-left`}>{f.etiqueta}</td>
          <td className={`${TD} text-right`}>{f.k}</td>
          <td className={`${TD} text-right`}>{f.n}</td>
          <td className={`${TD} text-right`}>{fmtAlfa(f.alfa)}</td>
          <td className={`${TD} text-left`}>{f.interpretacion}</td>
        </tr>
      ))}
    </tbody>
  </TablaApa>
);

/* ─── HTML para Word ──────────────────────────────────────────────────── */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function tablaApaHtml(numero: number, titulo: string, cabeceras: string[], filas: string[][], nota?: string): string {
  const base = "font-family:'Times New Roman',serif;font-size:12pt;padding:2pt 8pt;";
  const head = cabeceras
    .map((h, i) => `<th style="${base}border-top:1px solid #000;border-bottom:1px solid #000;font-weight:normal;text-align:${i ? "center" : "left"}">${esc(h)}</th>`)
    .join("");
  const body = filas
    .map(
      (f, r) =>
        `<tr>${f
          .map(
            (c, i) =>
              `<td style="${base}text-align:${i ? "center" : "left"};${r === filas.length - 1 ? "border-bottom:1px solid #000;" : ""}">${esc(c)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  return (
    `<p style="${base}padding:0;margin:12pt 0 0"><b>Tabla ${numero}</b></p>` +
    `<p style="${base}padding:0;margin:0 0 6pt"><i>${esc(titulo)}</i></p>` +
    `<table style="border-collapse:collapse">${`<thead><tr>${head}</tr></thead>`}<tbody>${body}</tbody></table>` +
    (nota ? `<p style="${base}padding:0;margin:4pt 0 0"><i>Nota.</i> ${esc(nota)}</p>` : "")
  );
}

async function copiarHtml(html: string, texto: string) {
  if (navigator.clipboard && "ClipboardItem" in window) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([texto], { type: "text/plain" }),
      }),
    ]);
    return;
  }
  // Respaldo para navegadores sin Clipboard API (p. ej. HTTP sin TLS)
  const div = document.createElement("div");
  div.innerHTML = html;
  div.style.position = "fixed";
  div.style.left = "-9999px";
  document.body.appendChild(div);
  const rango = document.createRange();
  rango.selectNodeContents(div);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(rango);
  document.execCommand("copy");
  sel?.removeAllRanges();
  div.remove();
}

/* ─── Vista principal ─────────────────────────────────────────────────── */

export const JamoviAnalyticsView: React.FC<{ historial: HistorialLocal }> = ({ historial }) => {
  const [tipo, setTipo] = useState<TipoTest>("AUDIT");
  const [fuente, setFuente] = useState<Fuente>("sheets");
  const [recarga, setRecarga] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [varBarra, setVarBarra] = useState<string>("");
  const [incluirNombres, setIncluirNombres] = useState(false);
  const [descargando, setDescargando] = useState<"sav" | "csv" | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Cada combinación test/fuente/recarga es una petición; "cargando" se deriva de si su respuesta ya llegó.
  const clave = `${tipo}|${fuente}|${recarga}`;
  const [resultado, setResultado] = useState<{ clave: string; datos: Analitica | null; error: string | null }>({
    clave: "",
    datos: null,
    error: null,
  });
  const cargando = resultado.clave !== clave;
  const datos = resultado.datos;
  const errorCarga = cargando ? null : resultado.error;

  const filasLocales = useMemo(() => filasDesdeHistorial(tipo, historial), [tipo, historial]);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const locales = filasDesdeHistorial(tipo, historial);
        const res =
          fuente === "sheets"
            ? await fetch(`${apiBase}/api/analytics/${tipo}`)
            : await fetch(`${apiBase}/api/analytics/${tipo}/from-local?incluir_sheets=${fuente === "combinado"}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registros: locales }),
              });
        if (!res.ok) throw new Error(await leerError(res));
        const json: Analitica = await res.json();
        if (!vigente) return;

        if (fuente === "sheets" && json.total_registros === 0 && locales.length > 0) {
          setAviso("Google Sheets no tiene registros de este test (o no está conectado). Se muestran los del historial local.");
          setFuente("local");
          return;
        }
        setResultado({ clave, datos: json, error: null });
      } catch (e) {
        if (vigente) setResultado({ clave, datos: null, error: e instanceof Error ? e.message : "No se pudo cargar la analítica" });
      }
    })();
    return () => {
      vigente = false;
    };
  }, [clave, tipo, fuente, historial]);

  const descargarDataset = async (formato: "sav" | "csv") => {
    setDescargando(formato);
    setError(null);
    try {
      const qs = `incluir_nombres=${incluirNombres}&formato=${formato}`;
      const res =
        fuente === "sheets"
          ? await fetch(`${apiBase}/api/export/jamovi/${tipo}?${qs}`)
          : await fetch(`${apiBase}/api/export/jamovi/${tipo}/from-local?${qs}&incluir_sheets=${fuente === "combinado"}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ registros: filasLocales }),
            });
      if (!res.ok) throw new Error(await leerError(res));
      descargarBlob(await res.blob(), `jamovi_${tipo.toLowerCase()}_dataset.${formato}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar el dataset");
    } finally {
      setDescargando(null);
    }
  };

  const tablasFrecuencia = datos
    ? Object.entries(datos.frecuencias).filter(([, f]) => f.tabla.length > 0)
    : [];
  const hayFiabilidad = !!datos && datos.registros_con_items > 0;
  const primeraFrecuencia = hayFiabilidad ? 3 : 2;

  const copiarTablas = async () => {
    if (!datos) return;
    const desc = datos.descriptivas;
    let html = tablaApaHtml(
      1,
      `Estadísticos descriptivos — ${tipo}`,
      ["Variable", "N", "Perdidos", "M", "Mdn", "DE", "Mín.", "Máx.", "Q1", "Q3"],
      desc.map((d) => [d.etiqueta, String(d.n), String(d.perdidos), fmt(d.media), fmt(d.mediana), fmt(d.de), fmt(d.minimo, 0), fmt(d.maximo, 0), fmt(d.q1), fmt(d.q3)]),
      `N = ${datos.total_registros}. M = media; Mdn = mediana; DE = desviación estándar; Q1 = percentil 25; Q3 = percentil 75.`
    );
    let texto = ["Variable\tN\tPerdidos\tM\tMdn\tDE\tMín.\tMáx.\tQ1\tQ3", ...desc.map((d) => [d.etiqueta, d.n, d.perdidos, fmt(d.media), fmt(d.mediana), fmt(d.de), fmt(d.minimo, 0), fmt(d.maximo, 0), fmt(d.q1), fmt(d.q3)].join("\t"))].join("\n");
    if (hayFiabilidad) {
      html += tablaApaHtml(
        2,
        "Fiabilidad por consistencia interna",
        ["Escala", "k", "n", "α", "Interpretación"],
        datos.fiabilidad.map((f) => [f.etiqueta, String(f.k), String(f.n), fmtAlfa(f.alfa), f.interpretacion]),
        NOTA_FIABILIDAD
      );
      texto +=
        "\n\nFiabilidad\nEscala\tk\tn\tα\tInterpretación\n" +
        datos.fiabilidad.map((f) => `${f.etiqueta}\t${f.k}\t${f.n}\t${fmtAlfa(f.alfa)}\t${f.interpretacion}`).join("\n");
    }
    tablasFrecuencia.forEach(([, f], i) => {
      html += tablaApaHtml(
        i + primeraFrecuencia,
        `Frecuencias de ${f.etiqueta}`,
        ["Nivel / Categoría", "n", "% del total", "% acumulado"],
        f.tabla.map((r) => [r.categoria, String(r.frecuencia), r.porcentaje.toFixed(1), r.porcentaje_acumulado.toFixed(1)])
      );
      texto += `\n\n${f.etiqueta}\nCategoría\tn\t%\t% acumulado\n` + f.tabla.map((r) => `${r.categoria}\t${r.frecuencia}\t${r.porcentaje.toFixed(1)}\t${r.porcentaje_acumulado.toFixed(1)}`).join("\n");
    });
    try {
      await copiarHtml(html, texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("El navegador no permitió copiar al portapapeles.");
    }
  };

  const escalasBox = datos ? datos.escalas_boxplot.map((v) => datos.descriptivas.find((d) => d.variable === v)).filter((d): d is Descriptiva => !!d) : [];
  const global = datos?.descriptivas.find((d) => d.variable === datos.puntaje_global);
  const barraActiva = datos && datos.frecuencias[varBarra]?.tabla.length ? varBarra : (datos?.categorica_principal ?? "");
  const tablaBarra = datos?.frecuencias[barraActiva];
  const prefijo = `jamovi_${tipo.toLowerCase()}`;

  return (
    <div className="space-y-5">
      {/* Barra de control */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">📊 Estadísticas y gráficos estilo Jamovi</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tablas en formato APA 7.ª ed. y gráficos listos para informes. Exporta el dataset codificado para abrirlo en Jamovi Desktop.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Módulo">
          {MODULOS.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={tipo === m.id}
              onClick={() => {
                setAviso(null);
                setFuente("sheets");
                setTipo(m.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                tipo === m.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {m.etiqueta}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Fuente de datos
            <select
              value={fuente}
              onChange={(e) => {
                setAviso(null);
                setFuente(e.target.value as Fuente);
              }}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
            >
              {FUENTES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.etiqueta}
                  {f.id !== "sheets" ? ` (${filasLocales.length} locales)` : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={() => {
              setAviso(null);
              if (fuente === "sheets") setRecarga((r) => r + 1);
              else setFuente("sheets");
            }}
            disabled={cargando}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} /> Sincronizar con Google Sheets
          </button>

          <button
            onClick={copiarTablas}
            disabled={!datos || datos.total_registros === 0}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <ClipboardCopy className="w-4 h-4" />}
            {copiado ? "Tablas copiadas" : "Copiar tablas APA para Word"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-slate-100">
          <button
            onClick={() => descargarDataset("sav")}
            disabled={descargando !== null}
            title="Archivo con tipos de variable y etiquetas ya configurados: se abre con doble clic en Jamovi (o SPSS)"
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {descargando === "sav" ? "Generando…" : "Descargar para Jamovi (.sav)"}
          </button>
          <button
            onClick={() => descargarDataset("csv")}
            disabled={descargando !== null}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {descargando === "csv" ? "Generando…" : "CSV (Excel)"}
          </button>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={incluirNombres} onChange={(e) => setIncluirNombres(e.target.checked)} />
            Incluir nombres de pacientes (dato sensible; por defecto el archivo es anónimo)
          </label>
        </div>

        {fuente === "combinado" && (
          <p className="text-xs text-slate-500">
            Los casos guardados en Sheets que también estén en el historial local aparecerán duplicados.
          </p>
        )}
        {aviso && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{aviso}</p>}
        {(errorCarga || error) && (
          <p className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {errorCarga || error}
          </p>
        )}
      </section>

      {cargando && !datos && <p className="text-sm text-slate-500 text-center py-8">Cargando datos…</p>}

      {datos && datos.total_registros === 0 && !cargando && (
        <section className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
          No hay registros de {tipo} en la fuente seleccionada. Corrige algunos tests con “Guardar en Sheets” o usa el historial local.
        </section>
      )}

      {datos && datos.total_registros > 0 && (
        <>
          <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
            <TablaDescriptivas filas={datos.descriptivas} numero={1} total={datos.total_registros} />
          </section>

          <ChartCard
            titulo="Diagrama de cajas con violín y casos individuales"
            subtitulo="Caja = Q1–Q3 · línea = mediana · ■ = media · bigotes = 1.5 × RIC · puntos con jitter"
            archivo={`${prefijo}_boxplot.png`}
          >
            <BoxViolinPlot escalas={escalasBox} titulo={`${MODULOS.find((m) => m.id === tipo)!.nombre}: distribución por escala`} />
          </ChartCard>

          {tablaBarra && (
            <ChartCard
              titulo="Gráfico de barras de frecuencias"
              subtitulo="n (% del total) sobre cada barra"
              archivo={`${prefijo}_barras_${barraActiva}.png`}
              acciones={
                <select
                  value={barraActiva}
                  onChange={(e) => setVarBarra(e.target.value)}
                  aria-label="Variable del gráfico de barras"
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white max-w-56"
                >
                  {tablasFrecuencia.map(([k, f]) => (
                    <option key={k} value={k}>
                      {f.etiqueta}
                    </option>
                  ))}
                </select>
              }
            >
              <BarPlot tabla={tablaBarra.tabla} titulo={tablaBarra.etiqueta} />
            </ChartCard>
          )}

          {global && (
            <ChartCard
              titulo="Histograma con curva de densidad"
              subtitulo={datos.cortes.length ? "Líneas discontinuas = puntos de corte clínicos" : undefined}
              archivo={`${prefijo}_histograma.png`}
            >
              <HistogramPlot variable={global} cortes={datos.cortes} titulo={`Distribución de ${global.etiqueta}`} />
            </ChartCard>
          )}

          <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
            {hayFiabilidad ? (
              <TablaFiabilidad filas={datos.fiabilidad} numero={2} />
            ) : (
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Fiabilidad (α de Cronbach):</span> los registros actuales no tienen las
                respuestas ítem por ítem. Los tests que se corrijan desde ahora las guardan automáticamente y esta tabla aparecerá sola.
              </p>
            )}
          </section>

          {tablasFrecuencia.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 grid gap-6 md:grid-cols-2">
              {tablasFrecuencia.map(([k, f], i) => (
                <TablaFrecuencias key={k} etiqueta={f.etiqueta} tabla={f.tabla} numero={i + primeraFrecuencia} />
              ))}
            </section>
          )}
        </>
      )}

      <details className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 group">
        <summary className="cursor-pointer font-semibold text-slate-900">¿Cómo abrir estos datos en Jamovi Desktop?</summary>
        <ol className="list-decimal pl-5 mt-3 space-y-2">
          <li>
            Pulsa <b>Descargar para Jamovi (.sav)</b> y abre el archivo con doble clic (o en Jamovi: <b>☰ → Abrir → Examinar</b>). Las
            variables ya vienen con su tipo (nominal, ordinal o continua) y sus etiquetas: por ejemplo, <code>diagnostico</code> muestra
            “Consumo de bajo riesgo / Consumo de riesgo / Posible dependencia” en ese orden. No hace falta configurar nada.
          </li>
          <li>
            <b>Exploración → Descriptivas</b>: arrastra las escalas a <i>Variables</i> y, en <b>Gráficos</b>, marca <i>Diagrama de cajas</i>,{" "}
            <i>Violín</i>, <i>Datos</i>, <i>Histograma</i> o <i>Gráfico de barras</i>. Para comparar grupos (p. ej. por género o nivel de
            riesgo), pon esa variable en <i>Dividir por</i>.
          </li>
          <li>
            <b>Factor → Análisis de fiabilidad</b>: arrastra los ítems de una escala (<code>item_01</code>, <code>item_02</code>, …) para
            obtener el α de Cronbach y la ω de McDonald. Solo los tests corregidos desde esta versión tienen los ítems guardados.
          </li>
          <li>
            El <b>CSV</b> es la alternativa para Excel u otros programas: trae cada categoría como texto y además una columna{" "}
            <code>_cod</code> con su código numérico.
          </li>
        </ol>
      </details>
    </div>
  );
};
