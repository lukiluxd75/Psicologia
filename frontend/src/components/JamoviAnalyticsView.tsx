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
import { BarPlot, BoxViolinPlot, ChartCard, FiabilidadPlot, HistogramPlot } from "./jamovi/JamoviCharts";
import { parrafoHtml, tablaApaHtml } from "../lib/apa";
import { TablaApa, TD, TH, type CopiaTabla } from "./jamovi/TablasApa";
import { avisar, avisarError, copiarConAviso, MSJ_DESCARGA } from "../lib/avisos";
import {
  interpretarBoxplot,
  interpretarDescriptivas,
  interpretarFiabilidad,
  interpretarGraficoFiabilidad,
  interpretarFrecuencias,
  interpretarHistograma,
} from "../lib/interpretacion";
import { CorrelacionView } from "./CorrelacionView";
import { CitaJamovi } from "./jamovi/CitaJamovi";
import { ComparacionSemestres } from "./jamovi/ComparacionSemestres";
import { bloquesComparacion } from "../lib/comparacion";

type Fuente = "sheets" | "local" | "combinado";
/** Qué parte de la muestra se analiza (solo AUDIT y BRIEF registran semestre). */
type Muestra = "general" | "1" | "8" | "comparar";

const MODULOS: { id: TipoTest; etiqueta: string; nombre: string }[] = [
  { id: "AUDIT", etiqueta: "AUDIT", nombre: "AUDIT" },
  { id: "BRIEF", etiqueta: "BRIEF", nombre: "BRIEF" },
  { id: "PASS", etiqueta: "PASS (Perinatal)", nombre: "PASS" },
  { id: "PSICOSOCIAL", etiqueta: "PSICOSOCIAL (Gestantes)", nombre: "Cuestionario Psicosocial" },
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

const copiaDescriptivas = (filas: Descriptiva[]): CopiaTabla => ({
  cabeceras: ["Variable", "N", "Perdidos", "M", "Mdn", "DE", "Mín.", "Máx.", "Q1", "Q3"],
  filas: filas.map((d) => [d.etiqueta, String(d.n), String(d.perdidos), fmt(d.media), fmt(d.mediana), fmt(d.de), fmt(d.minimo, 0), fmt(d.maximo, 0), fmt(d.q1), fmt(d.q3)]),
});

const notaDescriptivas = (total: number) =>
  `N = ${total}. M = media; Mdn = mediana; DE = desviación estándar; Q1 = percentil 25; Q3 = percentil 75. Cuartiles calculados con el método tipo 7 de R (Jamovi).`;

const copiaFrecuencias = (tabla: FilaFrecuencia[]): CopiaTabla => ({
  cabeceras: ["Nivel / Categoría", "n", "% del total", "% acumulado"],
  filas: tabla.map((r) => [r.categoria, String(r.frecuencia), r.porcentaje.toFixed(1), r.porcentaje_acumulado.toFixed(1)]),
});

const TablaDescriptivas: React.FC<{ filas: Descriptiva[]; numero: number; total: number; interpretacion: string; sufijo?: string }> = ({
  filas,
  numero,
  total,
  interpretacion,
  sufijo = "",
}) => (
  <TablaApa
    numero={numero}
    titulo={`Estadísticos descriptivos${sufijo}`}
    nota={notaDescriptivas(total)}
    copia={copiaDescriptivas(filas)}
    interpretacion={interpretacion}
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

const TablaFrecuencias: React.FC<{ etiqueta: string; tabla: FilaFrecuencia[]; numero: number; sufijo?: string }> = ({ etiqueta, tabla, numero, sufijo = "" }) => (
  <TablaApa
    numero={numero}
    titulo={`Frecuencias de ${etiqueta}${sufijo}`}
    copia={copiaFrecuencias(tabla)}
    interpretacion={interpretarFrecuencias(etiqueta, tabla)}
  >
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

const copiaFiabilidad = (filas: Fiabilidad[]): CopiaTabla => ({
  cabeceras: ["Escala", "k", "n", "α", "Interpretación"],
  filas: filas.map((f) => [f.etiqueta, String(f.k), String(f.n), fmtAlfa(f.alfa), f.interpretacion]),
});

/** Pasos para obtener en Jamovi el mismo α de cada escala a partir del .sav exportado. */
const FiabilidadEnJamovi: React.FC<{ filas: Fiabilidad[] }> = ({ filas }) => {
  const conItems = filas.filter((f) => f.items?.length);
  if (!conItems.length) return null;
  return (
    <details className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
      <summary className="cursor-pointer font-semibold text-slate-900">Cómo obtener esta tabla en Jamovi</summary>
      <ol className="list-decimal pl-5 mt-3 space-y-2">
        <li>
          Pulsa <b>Descargar para Jamovi (.sav)</b> y abre el archivo en Jamovi.
        </li>
        <li>
          Ve a <b>Factor → Análisis de fiabilidad</b> (<i>Reliability Analysis</i>) y deja marcado <b>α de Cronbach</b>.
        </li>
        <li>
          Haz un análisis por escala: arrastra a <i>Items</i> exactamente estas columnas. Jamovi excluye los casos con algún ítem vacío, igual
          que esta tabla, así que el α debe coincidir.
        </li>
      </ol>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="text-left font-semibold text-slate-900 py-1 pr-3">Escala</th>
              <th className="text-left font-semibold text-slate-900 py-1">Ítems</th>
            </tr>
          </thead>
          <tbody>
            {conItems.map((f) => (
              <tr key={f.escala} className="border-b border-slate-100 align-top">
                <td className="py-1.5 pr-3 whitespace-nowrap text-slate-800">{f.etiqueta}</td>
                <td className="py-1.5 font-mono text-slate-700">
                  {f.escala === "total" ? `Los ${f.k} ítems de las escalas anteriores` : f.items!.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Jamovi no dibuja el α de todas las escalas en un solo gráfico: para el informe usa la figura de esta página (botón Copiar figura).
      </p>
    </details>
  );
};

const TablaFiabilidad: React.FC<{ filas: Fiabilidad[]; numero: number; sufijo?: string }> = ({ filas, numero, sufijo = "" }) => (
  <TablaApa
    numero={numero}
    titulo={`Fiabilidad por consistencia interna${sufijo}`}
    nota={NOTA_FIABILIDAD}
    copia={copiaFiabilidad(filas)}
    interpretacion={interpretarFiabilidad(filas)}
  >
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

/* ─── Vista principal ─────────────────────────────────────────────────── */

export const JamoviAnalyticsView: React.FC<{ historial: HistorialLocal }> = ({ historial }) => {
  const [tipo, setTipo] = useState<TipoTest>("AUDIT");
  const [modo, setModo] = useState<"test" | "correlacion">("test");
  const [fuente, setFuente] = useState<Fuente>("sheets");
  const [recarga, setRecarga] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [varBarra, setVarBarra] = useState<string>("");
  const [incluirNombres, setIncluirNombres] = useState(false);
  const [descargando, setDescargando] = useState<"sav" | "csv" | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [muestra, setMuestra] = useState<Muestra>("general");

  // Cada combinación test/fuente/recarga es una petición; "cargando" se deriva de si su respuesta ya llegó.
  const clave = `${tipo}|${fuente}|${recarga}`;
  const [resultado, setResultado] = useState<{ clave: string; datos: Analitica | null; error: string | null }>({
    clave: "",
    datos: null,
    error: null,
  });
  const cargando = resultado.clave !== clave;
  const datosTodos = resultado.datos;
  const porSemestre = datosTodos?.por_semestre;
  const muestraActiva: Muestra = porSemestre ? muestra : "general";
  const grupoActivo = porSemestre?.find((g) => String(g.semestre) === muestraActiva);
  // En "1" u "8" toda la página (tablas, figuras, interpretaciones) usa solo ese semestre.
  const datos: Analitica | null = datosTodos && grupoActivo ? { ...datosTodos, ...grupoActivo } : datosTodos;
  const sufijo = grupoActivo ? ` (${grupoActivo.etiqueta})` : "";
  const nombreTest = MODULOS.find((m) => m.id === tipo)!.nombre;
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
      const nombre = `jamovi_${tipo.toLowerCase()}_dataset.${formato}`;
      descargarBlob(await res.blob(), nombre);
      avisar(`Descarga iniciada: ${nombre}`, MSJ_DESCARGA);
    } catch (e) {
      const msj = e instanceof Error ? e.message : "No se pudo descargar el dataset";
      setError(msj);
      avisarError("No se pudo descargar el dataset", msj);
    } finally {
      setDescargando(null);
    }
  };

  const tablasFrecuencia = datos
    ? Object.entries(datos.frecuencias).filter(([, f]) => f.tabla.length > 0)
    : [];
  const hayFiabilidad = !!datos && datos.registros_con_items > 0;
  const primeraFrecuencia = hayFiabilidad ? 3 : 2;

  const escalasBox = datos ? datos.escalas_boxplot.map((v) => datos.descriptivas.find((d) => d.variable === v)).filter((d): d is Descriptiva => !!d) : [];
  const global = datos?.descriptivas.find((d) => d.variable === datos.puntaje_global);
  const barraActiva = datos && datos.frecuencias[varBarra]?.tabla.length ? varBarra : (datos?.categorica_principal ?? "");
  const tablaBarra = datos?.frecuencias[barraActiva];
  const prefijo = `jamovi_${tipo.toLowerCase()}`;
  const sufijoArchivo = grupoActivo ? `_semestre${grupoActivo.semestre}` : "";
  // Figuras numeradas en el orden en que aparecen (APA 7)
  const figBox = 1;
  const figBarra = tablaBarra ? figBox + 1 : figBox;
  const figHistograma = global ? figBarra + 1 : figBarra;
  const figFiabilidad = figHistograma + 1;
  const interpDescriptivas = datos ? interpretarDescriptivas(datos.descriptivas, datos.total_registros, global) : "";

  const copiarTablas = async () => {
    if (!datos) return;
    const comparar = muestraActiva === "comparar";
    const bloques: { numero: number; titulo: string; copia: CopiaTabla; nota?: string; interp: string }[] = comparar
      ? bloquesComparacion(datos, nombreTest)
      : [
          {
            numero: 1,
            titulo: `Estadísticos descriptivos: ${tipo}${sufijo}`,
            copia: copiaDescriptivas(datos.descriptivas),
            nota: notaDescriptivas(datos.total_registros),
            interp: interpDescriptivas,
          },
        ];
    if (hayFiabilidad && !comparar)
      bloques.push({
        numero: 2,
        titulo: `Fiabilidad por consistencia interna${sufijo}`,
        copia: copiaFiabilidad(datos.fiabilidad),
        nota: NOTA_FIABILIDAD,
        interp: interpretarFiabilidad(datos.fiabilidad),
      });
    if (!comparar)
      tablasFrecuencia.forEach(([, f], i) =>
        bloques.push({
          numero: i + primeraFrecuencia,
          titulo: `Frecuencias de ${f.etiqueta}${sufijo}`,
          copia: copiaFrecuencias(f.tabla),
          interp: interpretarFrecuencias(f.etiqueta, f.tabla),
        })
      );
    const html = bloques
      .map((b) => tablaApaHtml(b.numero, b.titulo, b.copia.cabeceras, b.copia.filas, b.nota) + (b.interp ? parrafoHtml(b.interp) : ""))
      .join("");
    const texto = bloques
      .map((b) => [`Tabla ${b.numero}`, b.titulo, b.copia.cabeceras.join("\t"), ...b.copia.filas.map((f) => f.join("\t")), b.interp].join("\n"))
      .join("\n\n");
    const ok = await copiarConAviso(
      html,
      texto,
      `${bloques.length} tablas copiadas`,
      "Pégalas en Word con Ctrl+V: van en formato APA y con su interpretación debajo."
    );
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const claseTab = (activa: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
      activa ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
    }`;

  const pestanas = (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Módulo">
      {MODULOS.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={modo === "test" && tipo === m.id}
          onClick={() => {
            setAviso(null);
            setFuente("sheets");
            setTipo(m.id);
            setModo("test");
          }}
          className={claseTab(modo === "test" && tipo === m.id)}
        >
          {m.etiqueta}
        </button>
      ))}
      <button role="tab" aria-selected={modo === "correlacion"} onClick={() => setModo("correlacion")} className={claseTab(modo === "correlacion")}>
        AUDIT × BRIEF por semestre
      </button>
    </div>
  );

  const encabezado = (
    <div>
      <h2 className="text-base font-bold text-slate-900">Estadísticas y gráficos estilo Jamovi</h2>
      <p className="text-xs text-slate-500 mt-0.5">
        Tablas en formato APA 7.ª ed. y gráficos listos para informes. Exporta el dataset codificado para abrirlo en Jamovi Desktop.
      </p>
    </div>
  );

  if (modo === "correlacion") {
    return (
      <div className="space-y-5">
        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          {encabezado}
          {pestanas}
        </section>
        <CorrelacionView historial={historial} />
        <CitaJamovi />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Barra de control */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        {encabezado}

        {pestanas}

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

        {porSemestre && datosTodos && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Muestra analizada">
              <span className="text-sm text-slate-700 mr-1">Muestra</span>
              {(
                [
                  ["general", `General (${datosTodos.total_registros})`],
                  ...porSemestre.map((g) => [String(g.semestre), `${g.etiqueta} (${g.total_registros})`]),
                  ["comparar", "Comparar 1.º y 8.º"],
                ] as [Muestra, string][]
              ).map(([id, texto]) => (
                <button
                  key={id}
                  onClick={() => setMuestra(id)}
                  aria-pressed={muestraActiva === id}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    muestraActiva === id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
            {!!datosTodos.sin_semestre && (
              <p className="text-xs text-slate-500">
                {datosTodos.sin_semestre === 1 ? "1 registro no tiene" : `${datosTodos.sin_semestre} registros no tienen`} semestre 1.º u 8.º:
                cuenta{datosTodos.sin_semestre === 1 ? "" : "n"} en General, pero no en las vistas por semestre.
              </p>
            )}
          </div>
        )}

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
          {grupoActivo
            ? `No hay registros de ${tipo} del ${grupoActivo.etiqueta} en la fuente seleccionada.`
            : `No hay registros de ${tipo} en la fuente seleccionada. Corrige algunos tests con “Guardar en Sheets” o usa el historial local.`}
        </section>
      )}

      {datos && datos.total_registros > 0 && muestraActiva === "comparar" && (
        <ComparacionSemestres datos={datos} nombreTest={nombreTest} prefijo={prefijo} varBarra={varBarra} setVarBarra={setVarBarra} />
      )}

      {datos && datos.total_registros > 0 && muestraActiva !== "comparar" && (
        <>
          <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
            <TablaDescriptivas filas={datos.descriptivas} numero={1} total={datos.total_registros} interpretacion={interpDescriptivas} sufijo={sufijo} />
          </section>

          <ChartCard
            numero={figBox}
            titulo={`Diagrama de cajas con violín y casos individuales${sufijo}`}
            subtitulo="La caja abarca de Q1 a Q3; la línea interior es la mediana y el cuadrado, la media. Los bigotes llegan hasta 1.5 × RIC y cada punto es un caso (con desplazamiento horizontal aleatorio para que no se superpongan)."
            archivo={`${prefijo}${sufijoArchivo}_boxplot.png`}
            interpretacion={interpretarBoxplot(escalasBox)}
          >
            <BoxViolinPlot escalas={escalasBox} titulo={`${nombreTest}: distribución por escala${sufijo}`} />
          </ChartCard>

          {tablaBarra && (
            <ChartCard
              numero={figBarra}
              titulo={`Frecuencias de ${tablaBarra.etiqueta}${sufijo}`}
              subtitulo="Sobre cada barra se indica la frecuencia absoluta (n) y, entre paréntesis, el porcentaje del total."
              archivo={`${prefijo}${sufijoArchivo}_barras_${barraActiva}.png`}
              interpretacion={interpretarFrecuencias(tablaBarra.etiqueta, tablaBarra.tabla)}
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
              <BarPlot tabla={tablaBarra.tabla} titulo={`${tablaBarra.etiqueta}${sufijo}`} />
            </ChartCard>
          )}

          {global && (
            <ChartCard
              numero={figHistograma}
              titulo={`Distribución de ${global.etiqueta}${sufijo}`}
              subtitulo={`Histograma con curva de densidad.${datos.cortes.length ? " Las líneas discontinuas marcan los puntos de corte clínicos." : ""}`}
              archivo={`${prefijo}${sufijoArchivo}_histograma.png`}
              interpretacion={interpretarHistograma(global, datos.cortes, datos.filas_crudas)}
            >
              <HistogramPlot variable={global} cortes={datos.cortes} titulo={`Distribución de ${global.etiqueta}${sufijo}`} />
            </ChartCard>
          )}

          <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
            {hayFiabilidad ? (
              <div className="space-y-3">
                <TablaFiabilidad filas={datos.fiabilidad} numero={2} sufijo={sufijo} />
                <FiabilidadEnJamovi filas={datos.fiabilidad} />
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Fiabilidad (α de Cronbach):</span> los registros actuales no tienen las
                respuestas ítem por ítem. Los tests que se corrijan desde ahora las guardan automáticamente y esta tabla aparecerá sola.
              </p>
            )}
          </section>

          {hayFiabilidad && (
            <ChartCard
              numero={figFiabilidad}
              titulo={`Fiabilidad por consistencia interna de cada escala${sufijo}`}
              subtitulo="α = alfa de Cronbach. La línea discontinua marca el mínimo aceptable (α = .70); las barras en ámbar quedan por debajo. Interpretación según George y Mallery (2003)."
              archivo={`${prefijo}${sufijoArchivo}_fiabilidad.png`}
              interpretacion={interpretarGraficoFiabilidad(datos.fiabilidad)}
            >
              <FiabilidadPlot filas={datos.fiabilidad} titulo={`${nombreTest}: consistencia interna por escala${sufijo}`} />
            </ChartCard>
          )}

          {tablasFrecuencia.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 grid grid-cols-1 gap-6 md:grid-cols-2">
              {tablasFrecuencia.map(([k, f], i) => (
                <TablaFrecuencias key={k} etiqueta={f.etiqueta} tabla={f.tabla} numero={i + primeraFrecuencia} sufijo={sufijo} />
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
            <i>Violín</i>, <i>Datos</i>, <i>Histograma</i> o <i>Gráfico de barras</i>. Para comparar grupos (p. ej. por semestre, género o
            nivel de riesgo), pon esa variable en <i>Dividir por</i>. En AUDIT y BRIEF el archivo trae la columna <code>semestre</code>{" "}
            (1.º / 8.º semestre).
          </li>
          <li>
            <b>Factor → Análisis de fiabilidad</b>: arrastra los ítems de una escala (<code>item_01</code>, <code>item_02</code>, …) para
            obtener el α de Cronbach y la ω de McDonald. Solo los tests corregidos desde esta versión tienen los ítems guardados. Para el α
            de un solo semestre, filtra antes los datos: <b>Datos → Filtros</b> con <code>semestre == 1</code> (o <code>== 8</code>).
          </li>
          <li>
            El <b>CSV</b> es la alternativa para Excel u otros programas: trae cada categoría como texto y además una columna{" "}
            <code>_cod</code> con su código numérico.
          </li>
        </ol>
      </details>

      <CitaJamovi />
    </div>
  );
};
