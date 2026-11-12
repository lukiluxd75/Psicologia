/* Redacción automática de la interpretación de cada tabla y gráfico del módulo de estadísticas. */

import { fmt, type Corte, type Descriptiva, type FilaFrecuencia, type Fiabilidad } from "./jamovi";

const pct = (k: number, n: number) => (n ? `${((k / n) * 100).toFixed(1)} %` : "—");

/** Asimetría muestral ajustada (G1, la que reporta Jamovi). */
export function asimetria(valores: number[]): number | null {
  const n = valores.length;
  if (n < 3) return null;
  const m = valores.reduce((a, b) => a + b, 0) / n;
  const m2 = valores.reduce((a, v) => a + (v - m) ** 2, 0) / n;
  const m3 = valores.reduce((a, v) => a + (v - m) ** 3, 0) / n;
  if (m2 === 0) return null;
  const g1 = m3 / m2 ** 1.5;
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
}

function forma(valores: number[]): string {
  const g = asimetria(valores);
  if (g === null) return "";
  if (Math.abs(g) < 0.5) return `aproximadamente simétrica (asimetría = ${fmt(g)})`;
  if (g > 0)
    return `asimétrica positiva (asimetría = ${fmt(g)}): la mayoría de los casos se concentra en puntajes bajos y unos pocos obtienen puntajes altos`;
  return `asimétrica negativa (asimetría = ${fmt(g)}): la mayoría de los casos se concentra en puntajes altos`;
}

function atipicos(d: Descriptiva): number {
  if (d.q1 === null || d.q3 === null) return 0;
  const r = d.q3 - d.q1;
  return d.valores.filter((v) => v < d.q1! - 1.5 * r || v > d.q3! + 1.5 * r).length;
}

const resumen = (d: Descriptiva) => `M = ${fmt(d.media)}, DE = ${fmt(d.de)}, Mdn = ${fmt(d.mediana)}, rango ${fmt(d.minimo, 0)}–${fmt(d.maximo, 0)}`;

export function interpretarDescriptivas(desc: Descriptiva[], total: number, global?: Descriptiva): string {
  const conDatos = desc.filter((d) => d.n > 0 && d.media !== null);
  if (!conDatos.length) return "";
  const frases: string[] = [`Se analizaron ${total} registros.`];
  if (global && global.media !== null) {
    frases.push(`${global.etiqueta}: ${resumen(global)}.`);
  }
  const resto = conDatos.filter((d) => d.variable !== global?.variable);
  if (resto.length) frases.push(`Resto de variables: ${resto.map((d) => `${d.etiqueta} (${resumen(d)})`).join("; ")}.`);
  const conPerdidos = desc.filter((d) => d.perdidos > 0);
  if (conPerdidos.length)
    frases.push(`Hay datos perdidos en ${conPerdidos.map((d) => `${d.etiqueta} (${d.perdidos})`).join(", ")}; revise esos registros.`);
  return frases.join(" ");
}

export function interpretarBoxplot(escalas: Descriptiva[]): string {
  const validas = escalas.filter((d) => d.n > 0 && d.media !== null);
  if (!validas.length) return "";
  const frases = validas.map((d) => {
    const f = forma(d.valores);
    const at = atipicos(d);
    return (
      `${d.etiqueta}: la mitad central de los casos está entre ${fmt(d.q1)} y ${fmt(d.q3)} (Mdn = ${fmt(d.mediana)})` +
      (f ? `; la distribución es ${f}` : "") +
      (at ? `; hay ${at} caso(s) atípico(s) (fuera de 1.5 × RIC) que conviene revisar` : "; no hay casos atípicos") +
      "."
    );
  });
  const relativas = validas.filter((d) => d.maximo_teorico);
  if (relativas.length > 1) {
    const alta = [...relativas].sort((a, b) => a.media! / a.maximo_teorico! - b.media! / b.maximo_teorico!).pop()!;
    frases.push(
      `En proporción a su puntaje máximo posible, la escala con puntajes más altos es ${alta.etiqueta} (media = ${((alta.media! / alta.maximo_teorico!) * 100).toFixed(0)} % del máximo).`
    );
  }
  return frases.join(" ");
}

export function interpretarFrecuencias(etiqueta: string, tabla: FilaFrecuencia[]): string {
  const filas = tabla.filter((f) => f.frecuencia > 0).sort((a, b) => b.frecuencia - a.frecuencia);
  if (!filas.length) return "";
  const n = tabla.reduce((a, f) => a + f.frecuencia, 0);
  const [primera, ...resto] = filas;
  let texto = `En ${etiqueta} (n = ${n}), la categoría más frecuente fue «${primera.categoria}» con ${primera.frecuencia} caso(s) (${pct(primera.frecuencia, n)})`;
  if (resto.length) texto += `, seguida de ${resto.map((f) => `«${f.categoria}» (${f.frecuencia}; ${pct(f.frecuencia, n)})`).join(", ")}`;
  texto += ".";
  const vacias = tabla.filter((f) => f.frecuencia === 0);
  if (vacias.length) texto += ` Ningún caso en ${vacias.map((f) => `«${f.categoria}»`).join(", ")}.`;
  return texto;
}

const PLURAL_GENERO: Record<string, string> = { Femenino: "mujeres", Masculino: "hombres" };

/**
 * `filas` son los registros crudos: hacen falta para contar por sexo los cortes que dependen de él.
 * Sin ellas, los cortes por sexo se omiten en vez de calcularse sobre toda la muestra.
 */
export function interpretarHistograma(d: Descriptiva, cortes: Corte[], filas: Record<string, unknown>[] = []): string {
  if (!d.valores.length) return "";
  const f = forma(d.valores);
  const frases = [`La distribución de ${d.etiqueta} (n = ${d.n}, M = ${fmt(d.media)}, DE = ${fmt(d.de)})${f ? ` es ${f}` : ""}.`];

  const porSexo = cortes.filter((c) => c.genero);
  if (porSexo.length && filas.length) {
    const puntaje = (r: Record<string, unknown>) => (typeof r[d.variable] === "number" ? (r[d.variable] as number) : null);
    const conPuntaje = filas.filter((r) => puntaje(r) !== null);
    let enRiesgo = 0;
    let evaluados = 0;
    for (const c of porSexo) {
      const grupo = conPuntaje.filter((r) => r.genero === c.genero);
      const k = grupo.filter((r) => puntaje(r)! >= c.valor).length;
      enRiesgo += k;
      evaluados += grupo.length;
      const nombre = PLURAL_GENERO[c.genero!] ?? c.genero!;
      frases.push(
        grupo.length
          ? `De ${grupo.length} ${nombre}, ${k} (${pct(k, grupo.length)}) tienen ${c.valor} puntos o más (punto de corte para ${nombre}).`
          : `No hay ${nombre} en la muestra para el punto de corte de ${c.valor}.`
      );
    }
    if (porSexo.length > 1 && evaluados)
      frases.push(`En conjunto, ${enRiesgo} de ${evaluados} casos (${pct(enRiesgo, evaluados)}) superan el punto de corte de su sexo.`);
    const sinSexo = conPuntaje.length - evaluados;
    if (sinSexo > 0)
      frases.push(`${sinSexo} caso(s) sin género registrado no entran en estos porcentajes: complete el género para incluirlos.`);
  }

  for (const c of cortes.filter((c) => !c.genero)) {
    const k = d.valores.filter((v) => v >= c.valor).length;
    frases.push(`${k} de ${d.n} casos (${pct(k, d.n)}) tienen ${c.valor} puntos o más (${c.etiqueta}).`);
  }
  return frases.join(" ");
}

const alfa = (v: number | null) => (v === null ? "—" : v.toFixed(2).replace(/^(-?)0\./, "$1."));

export function interpretarFiabilidad(filas: Fiabilidad[]): string {
  if (!filas.length) return "";
  const calculadas = filas.filter((f) => f.alfa !== null);
  const frases: string[] = [];
  if (calculadas.length)
    frases.push(
      `La consistencia interna (α de Cronbach) fue: ${calculadas.map((f) => `${f.etiqueta}, α = ${alfa(f.alfa)} (${f.interpretacion.toLowerCase()})`).join("; ")}.`
    );
  const bajas = calculadas.filter((f) => f.alfa! < 0.7);
  if (bajas.length)
    frases.push(`Las escalas con α inferior a .70 (${bajas.map((f) => f.etiqueta).join(", ")}) deben interpretarse con cautela.`);
  const sinCalculo = filas.filter((f) => f.alfa === null);
  if (sinCalculo.length) frases.push(`No se pudo calcular el α de ${sinCalculo.map((f) => f.etiqueta).join(", ")} por falta de casos completos.`);
  if (filas.some((f) => f.n < 30)) frases.push("Con menos de 30 casos completos, estos valores son orientativos.");
  return frases.join(" ");
}

/** Magnitud de la d de Cohen (1988). */
export function magnitudD(d: number | null | undefined): string {
  if (d === null || d === undefined) return "";
  const a = Math.abs(d);
  return a < 0.2 ? "despreciable" : a < 0.5 ? "pequeño" : a < 0.8 ? "mediano" : "grande";
}
