import type {
  HistorialEntryAudit,
  HistorialEntryBrief,
  HistorialEntryPass,
  HistorialEntryPsicosocial,
} from "../hooks/useHistorial";

export type TipoTest = "AUDIT" | "BRIEF" | "PASS" | "PSICOSOCIAL";

export interface Descriptiva {
  variable: string;
  etiqueta: string;
  n: number;
  perdidos: number;
  media: number | null;
  mediana: number | null;
  de: number | null;
  minimo: number | null;
  maximo: number | null;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  minimo_teorico: number | null;
  maximo_teorico: number | null;
  valores: number[];
}

export interface FilaFrecuencia {
  categoria: string;
  frecuencia: number;
  porcentaje: number;
  porcentaje_acumulado: number;
}

export interface Fiabilidad {
  escala: string;
  etiqueta: string;
  k: number;
  n: number;
  alfa: number | null;
  interpretacion: string;
}

export interface Analitica {
  tipo_test: TipoTest;
  total_registros: number;
  descriptivas: Descriptiva[];
  frecuencias: Record<string, { etiqueta: string; tabla: FilaFrecuencia[] }>;
  escalas_boxplot: string[];
  puntaje_global: string;
  categorica_principal: string;
  cortes: Corte[];
  fiabilidad: Fiabilidad[];
  registros_con_items: number;
  /** Registros normalizados (snake_case), sin nombres. */
  filas_crudas?: Record<string, unknown>[];
}

/** Punto de corte clínico; con `genero` solo aplica a ese sexo (p. ej. AUDIT: mujeres ≥ 4, hombres ≥ 5). */
export interface Corte {
  valor: number;
  etiqueta: string;
  genero?: string;
}

/** Paleta jmv solicitada: azul acero, verde salvia, ámbar, coral. */
export const JMV = {
  azul: "#4B6B94",
  verde: "#5C9E7A",
  ambar: "#E6A15C",
  coral: "#D95F5F",
  tinta: "#1f2937",
  tintaSuave: "#4b5563",
  grid: "#e5e7eb",
  eje: "#6b7280",
};

/** Colores con significado clínico (bajo → alto riesgo). El resto de categorías usa azul acero. */
export const COLOR_CATEGORIA: Record<string, string> = {
  "Consumo de bajo riesgo": JMV.verde,
  "Consumo de riesgo": JMV.ambar,
  "Posible dependencia": JMV.coral,
  "Bajo riesgo": JMV.verde,
  "Alto riesgo": JMV.coral,
  Asintomático: JMV.verde,
  "Síntomas leves-moderados": JMV.ambar,
  "Síntomas severos": JMV.coral,
  NO: JMV.verde,
  SÍ: JMV.coral,
  "Muy bajo": JMV.coral,
  Bajo: JMV.ambar,
  Moderado: JMV.azul,
  Alto: JMV.verde,
  "Muy alto": JMV.verde,
};

// ---------------------------------------------------------------------------
// Historial local → filas con las mismas cabeceras que Google Sheets
// ---------------------------------------------------------------------------

type Fila = Record<string, unknown>;

const rango = (desde: number, hasta: number) => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);

/** Mismos ítems y cabeceras "Ítem N" que guarda el backend en Sheets. */
const ITEMS_POR_TEST: Record<TipoTest, number[]> = {
  AUDIT: rango(1, 10),
  BRIEF: rango(1, 75),
  PASS: rango(1, 31),
  PSICOSOCIAL: [...rango(11, 37), ...rango(43, 47)],
};

function columnasItems(tipo: TipoTest, respuestas: unknown): Fila {
  const fila: Fila = {};
  if (Array.isArray(respuestas)) {
    for (const n of ITEMS_POR_TEST[tipo]) if (respuestas[n - 1] !== undefined) fila[`Ítem ${n}`] = respuestas[n - 1];
  } else if (respuestas && typeof respuestas === "object") {
    const r = respuestas as Record<string, unknown>;
    for (const n of ITEMS_POR_TEST[tipo]) if (r[String(n)] !== undefined) fila[`Ítem ${n}`] = r[String(n)];
  }
  return fila;
}

function filaAudit(e: HistorialEntryAudit): Fila {
  return {
    Nombre: e.paciente,
    Edad: e.edad ?? "",
    Género: e.genero ?? "",
    "Puntaje Total": e.puntaje,
    Diagnóstico: e.diagnostico,
    ...columnasItems("AUDIT", e.respuestas),
    Semestre: e.semestre ?? "",
  };
}

function filaBrief(e: HistorialEntryBrief): Fila {
  const r = e.resultados;
  const s = r.escalas;
  return {
    Nombre: e.paciente,
    Edad: e.edad ?? "",
    Género: e.genero ?? "",
    Inhibición: s.inhibicion,
    Flexibilidad: s.flexibilidad,
    "Control Emocional": s.control_emocional,
    Automonitoreo: s.automonitoreo,
    Iniciativa: s.iniciativa,
    "Memoria de Trabajo": s.memoria_trabajo,
    "Planificación/Organización": s.planificacion_organizacion,
    "Monitoreo de Tareas": s.monitoreo_tareas,
    "Organización de Materiales": s.organizacion_materiales,
    "Subtotal (1-38)": r.subtotal_1_38,
    "Subtotal (39-75)": r.subtotal_39_75,
    "Total General": r.total,
    "Alerta Entrevista": r.validez?.alerta_entrevista ? "SÍ" : "NO",
    ...columnasItems("BRIEF", e.respuestas),
    Semestre: e.semestre ?? "",
  };
}

function filaPass(e: HistorialEntryPass): Fila {
  // El historial guarda el paciente como objeto (OCR) o como campos sueltos (manual)
  const crudo: unknown = (e as { paciente?: unknown }).paciente;
  const p: Partial<NonNullable<HistorialEntryPass["paciente_obj"]>> =
    e.paciente_obj ?? (crudo && typeof crudo === "object" ? crudo : {});
  const r = e.resultados;
  const s = r.subescalas;
  const pts = r.item_7_fobia?.puntaje ?? 0;
  return {
    Nombre: p.nombre ?? e.nombre ?? (typeof e.paciente === "string" ? e.paciente : ""),
    Edad: p.edad ?? e.edad ?? "",
    Ocupación: p.ocupacion ?? "",
    "Etapa Perinatal": p.etapa_perinatal ?? "",
    "Semanas Embarazo": p.semanas_embarazo ?? "",
    "Edad Bebé": p.edad_bebe ?? "",
    Fecha: p.fecha ?? "",
    "Escala 1: Preocupación y Miedos (0-30)": s.escala_1_preocupacion_miedos,
    "Escala 2: Perfeccionismo y Trauma (0-24)": s.escala_2_perfeccionismo_trauma,
    "Escala 3: Ansiedad Social (0-15)": s.escala_3_ansiedad_social,
    "Escala 4: Ansiedad Aguda y Ajuste (0-24)": s.escala_4_ansiedad_aguda_ajuste,
    "Puntaje Global (0-93)": r.total,
    Severidad: r.severidad,
    "Nivel de Riesgo (Corte 26)": r.riesgo_trastorno,
    "Alerta Fobia (Ítem 7)": `${r.item_7_fobia?.alerta_fobia ? "SÍ" : "NO"} (Pts: ${pts})`,
    ...columnasItems("PASS", r.respuestas),
  };
}

function filaPsicosocial(e: HistorialEntryPsicosocial): Fila {
  const s = e.sociodemografico ?? {};
  const d = e.resultados?.dimensiones ?? {};
  const dim = (k: string) => d[k] ?? { puntaje: "", nivel: "" };
  return {
    Nombre: s.nombre ?? "",
    Fecha: s.fecha ?? "",
    Edad: s.edad ?? "",
    Ocupación: s.ocupacion ?? "",
    "Grado Instrucción": s.grado_instruccion ?? "",
    "Estado Civil": s.estado_civil ?? "",
    "Zona Vivienda": s.zona_vivienda ?? "",
    "Semanas Gestación": s.semanas_gestacion ?? "",
    "Hijos Anteriores": s.hijos_anteriores ?? "",
    "Recibe Subsidio": s.recibe_subsidio ?? "",
    "Embarazo Planificado": s.embarazo_planificado ?? "",
    "Pérdida Significativa": s.perdida_significativa ?? "",
    "A. Relación Pareja (6-30)": dim("relacion_pareja").puntaje,
    "Nivel Pareja": dim("relacion_pareja").nivel,
    "B. Apoyo Familiar (6-30)": dim("apoyo_familiar").puntaje,
    "Nivel Familia": dim("apoyo_familiar").nivel,
    "C. Red Apoyo Social (5-25)": dim("red_apoyo_social").puntaje,
    "Nivel Red Social": dim("red_apoyo_social").nivel,
    "D. Integración Entorno (5-25)": dim("integracion_entorno").puntaje,
    "Nivel Entorno": dim("integracion_entorno").nivel,
    "E. Situación Económica (5-25)": dim("situacion_economica").puntaje,
    "Nivel Economía": dim("situacion_economica").nivel,
    "G. Vivencia Embarazo (5-25)": dim("vivencia_embarazo").puntaje,
    "Nivel Vivencia": dim("vivencia_embarazo").nivel,
    "Puntaje Global (32-160)": e.resultados?.puntaje_global ?? "",
    ...columnasItems("PSICOSOCIAL", e.respuestas),
  };
}

export interface HistorialLocal {
  AUDIT: HistorialEntryAudit[];
  BRIEF: HistorialEntryBrief[];
  PASS: HistorialEntryPass[];
  PSICOSOCIAL: HistorialEntryPsicosocial[];
}

export function filasDesdeHistorial(tipo: TipoTest, h: HistorialLocal): Fila[] {
  switch (tipo) {
    case "AUDIT":
      return h.AUDIT.map(filaAudit);
    case "BRIEF":
      return h.BRIEF.filter((e) => e.resultados?.escalas).map(filaBrief);
    case "PASS":
      return h.PASS.filter((e) => e.resultados?.subescalas).map(filaPass);
    case "PSICOSOCIAL":
      return h.PSICOSOCIAL.filter((e) => e.resultados).map(filaPsicosocial);
  }
}

/** Fila de una sola entrada del historial (null si le faltan resultados). */
export function filaDeEntrada(
  tipo: TipoTest,
  e: HistorialEntryAudit | HistorialEntryBrief | HistorialEntryPass | HistorialEntryPsicosocial
): Fila | null {
  switch (tipo) {
    case "AUDIT":
      return filaAudit(e as HistorialEntryAudit);
    case "BRIEF":
      return (e as HistorialEntryBrief).resultados?.escalas ? filaBrief(e as HistorialEntryBrief) : null;
    case "PASS":
      return (e as HistorialEntryPass).resultados?.subescalas ? filaPass(e as HistorialEntryPass) : null;
    case "PSICOSOCIAL":
      return (e as HistorialEntryPsicosocial).resultados ? filaPsicosocial(e as HistorialEntryPsicosocial) : null;
  }
}

// ---------------------------------------------------------------------------
// Estadística para gráficos
// ---------------------------------------------------------------------------

function desviacion(valores: number[]): number {
  const n = valores.length;
  if (n < 2) return 0;
  const m = valores.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(valores.reduce((a, v) => a + (v - m) ** 2, 0) / (n - 1));
}

/** Ancho de banda de Silverman (bw.nrd0 de R, el que usa ggplot/jmv). */
export function anchoBanda(valores: number[]): number {
  const n = valores.length;
  if (n < 2) return 1;
  const ord = [...valores].sort((a, b) => a - b);
  const q = (p: number) => {
    const h = (n - 1) * p;
    const lo = Math.floor(h);
    return ord[lo] + (h - lo) * (ord[Math.min(lo + 1, n - 1)] - ord[lo]);
  };
  const s = desviacion(valores);
  const iqr = (q(0.75) - q(0.25)) / 1.34;
  const base = Math.min(s, iqr) || s || Math.abs(ord[0]) || 1;
  return 0.9 * base * n ** -0.2;
}

/** Densidad kernel gaussiana evaluada en `puntos`. */
export function densidadKernel(valores: number[], puntos: number[], bw = anchoBanda(valores)): number[] {
  const n = valores.length;
  const k = 1 / (n * bw * Math.sqrt(2 * Math.PI));
  return puntos.map((x) => k * valores.reduce((acc, v) => acc + Math.exp(-0.5 * ((x - v) / bw) ** 2), 0));
}

/** Desplazamiento horizontal determinístico en [-0.5, 0.5) (secuencia de Weyl). */
export function jitter(i: number): number {
  return ((i * 0.6180339887 + 0.31) % 1) - 0.5;
}

export function ticksBonitos(min: number, max: number, objetivo = 5): number[] {
  if (max <= min) max = min + 1;
  const bruto = (max - min) / objetivo;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((p) => p >= bruto) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / paso) * paso; t <= max + 1e-9; t += paso) ticks.push(+t.toFixed(10));
  return ticks;
}

export const fmt = (v: number | null | undefined, dec = 2) =>
  v === null || v === undefined || Number.isNaN(v) ? "—" : v.toFixed(dec);

// ---------------------------------------------------------------------------
// Descargas
// ---------------------------------------------------------------------------

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function descargarSvgComoPng(svg: SVGSVGElement, nombre: string, escala = 2): Promise<void> {
  descargarBlob(await svgAPng(svg, escala), nombre);
}

/** El portapapeles solo existe en contextos seguros (https o localhost). */
export const portapapelesDisponible = () =>
  typeof window !== "undefined" && window.isSecureContext && !!navigator.clipboard?.write && "ClipboardItem" in window;

/**
 * Copia el gráfico como imagen PNG al portapapeles.
 * Se pasa la promesa al ClipboardItem (no el blob resuelto) para que Safari
 * conserve el gesto del usuario mientras se rasteriza.
 */
export async function copiarSvgAlPortapapeles(svg: SVGSVGElement, escala = 2): Promise<void> {
  if (!portapapelesDisponible()) throw new Error("Portapapeles no disponible");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": svgAPng(svg, escala) })]);
}

/** Rasteriza un <svg> a PNG a escala 2x con fondo blanco. Los estilos deben ir como atributos. */
export function svgAPng(svg: SVGSVGElement, escala = 2): Promise<Blob> {
  const { width, height } = svg.viewBox.baseVal;
  const clon = svg.cloneNode(true) as SVGSVGElement;
  clon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clon.setAttribute("width", String(width));
  clon.setAttribute("height", String(height));
  const datos = new XMLSerializer().serializeToString(clon);
  const url = URL.createObjectURL(new Blob([datos], { type: "image/svg+xml;charset=utf-8" }));

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * escala;
      canvas.height = height * escala;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas no disponible"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("No se pudo generar el PNG"));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo renderizar el gráfico"));
    };
    img.src = url;
  });
}
