import React from "react";
import { COLOR_SEMESTRE, type Analitica, type AnaliticaSemestre } from "../../lib/jamovi";
import { interpretarComparacionBoxplot, interpretarComparacionDescriptivas, interpretarComparacionFrecuencias } from "../../lib/interpretacion";
import { bloquesComparacion, preparar, sinCero } from "../../lib/comparacion";
import { ChartCard } from "./JamoviCharts";
import { BarrasGrupos, BoxPlotGrupos, FiabilidadGrupos, HistogramaGrupos } from "./GraficosSemestre";
import { TablaApa, TD, TH } from "./TablasApa";

/* Vista "Comparar semestres": tablas y figuras con 1.º y 8.º semestre lado a lado. */

export const ComparacionSemestres: React.FC<{
  datos: Analitica;
  nombreTest: string;
  prefijo: string;
  varBarra: string;
  setVarBarra: (v: string) => void;
}> = ({ datos, nombreTest, prefijo, varBarra, setVarBarra }) => {
  const p = preparar(datos);
  const series = p.grupos.map((g) => ({ etiqueta: `${g.etiqueta} (n = ${g.total_registros})`, color: COLOR_SEMESTRE[g.semestre] ?? "#9ca3af" }));
  const conSerie = <T,>(f: (g: AnaliticaSemestre) => T) => p.grupos.map((g, i) => ({ ...series[i], ...f(g) }));
  const interpGrupos = p.grupos.map((g) => ({ etiqueta: g.etiqueta, descriptivas: g.descriptivas }));

  const escalasBox = datos.escalas_boxplot.flatMap((v) => {
    const d = datos.descriptivas.find((x) => x.variable === v);
    return d ? [{ variable: v, etiqueta: d.etiqueta }] : [];
  });
  const global = datos.descriptivas.find((d) => d.variable === datos.puntaje_global);
  const barraActiva = p.categoricas.some(([k]) => k === varBarra) ? varBarra : (p.categoricas.find(([k]) => k === datos.categorica_principal)?.[0] ?? p.categoricas[0]?.[0] ?? "");
  const etiquetaBarra = p.categoricas.find(([k]) => k === barraActiva)?.[1] ?? "";
  const bloques = bloquesComparacion(datos, nombreTest);
  const tablaFiab = bloques.find((b) => b.titulo.startsWith("Fiabilidad"));
  const tablasFrec = bloques.filter((b) => b.titulo.startsWith("Frecuencias"));

  const figBox = 1;
  const figBarra = barraActiva ? 2 : 1;
  const figHist = global ? figBarra + 1 : figBarra;
  const figFiab = figHist + 1;

  return (
    <>
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <TablaApa numero={1} titulo={bloques[0].titulo} nota={bloques[0].nota} copia={bloques[0].copia} interpretacion={bloques[0].interp}>
          <thead>
            <tr>
              <th className={`${TH} text-left`} rowSpan={2}>
                Variable / Escala
              </th>
              {p.grupos.map((g) => (
                <th key={g.semestre} colSpan={3} className={`${TH} text-center border-b border-slate-400`}>
                  {g.etiqueta}
                </th>
              ))}
            </tr>
            <tr>
              {p.grupos.flatMap((g) =>
                ["n", "M", "DE"].map((h) => (
                  <th key={`${g.semestre}-${h}`} className={`${TH} text-right ${h === "M" || h === "DE" ? "italic" : ""}`}>
                    {h}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {bloques[0].copia.filas.map((f) => (
              <tr key={f[0]}>
                {f.map((c, i) => (
                  <td key={i} className={`${TD} ${i === 0 ? "text-left" : "text-right"}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </TablaApa>
      </section>

      <ChartCard
        numero={figBox}
        titulo={`Distribución de las escalas de ${nombreTest} por semestre`}
        subtitulo="Para cada escala, una caja por semestre: la caja abarca de Q1 a Q3, la línea interior es la mediana y el cuadrado negro, la media. Los bigotes llegan hasta 1.5 × RIC y cada punto es un caso."
        archivo={`${prefijo}_boxplot_semestres.png`}
        interpretacion={interpretarComparacionBoxplot(interpGrupos, escalasBox)}
      >
        <BoxPlotGrupos escalas={escalasBox} grupos={conSerie((g) => ({ descriptivas: g.descriptivas }))} titulo={`${nombreTest}: distribución por escala y semestre`} />
      </ChartCard>

      {barraActiva && (
        <ChartCard
          numero={figBarra}
          titulo={`Frecuencias de ${etiquetaBarra} por semestre`}
          subtitulo="Porcentaje de cada categoría dentro de su semestre; debajo del porcentaje, el número de casos."
          archivo={`${prefijo}_barras_${barraActiva}_semestres.png`}
          interpretacion={interpretarComparacionFrecuencias(
            etiquetaBarra,
            p.grupos.map((g) => ({ etiqueta: g.etiqueta, tabla: g.frecuencias[barraActiva]?.tabla ?? [] }))
          )}
          acciones={
            <select
              value={barraActiva}
              onChange={(e) => setVarBarra(e.target.value)}
              aria-label="Variable del gráfico de barras"
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white max-w-56"
            >
              {p.categoricas.map(([k, et]) => (
                <option key={k} value={k}>
                  {et}
                </option>
              ))}
            </select>
          }
        >
          <BarrasGrupos grupos={conSerie((g) => ({ tabla: g.frecuencias[barraActiva]?.tabla ?? [] }))} titulo={`${etiquetaBarra} por semestre`} />
        </ChartCard>
      )}

      {global && (
        <ChartCard
          numero={figHist}
          titulo={`Distribución de ${global.etiqueta} por semestre`}
          subtitulo={`Histograma con los mismos intervalos para ambos semestres; la altura es el porcentaje de casos de cada semestre.${datos.cortes.length ? " Las líneas discontinuas marcan los puntos de corte clínicos." : ""}`}
          archivo={`${prefijo}_histograma_semestres.png`}
          interpretacion={interpretarComparacionDescriptivas(interpGrupos, global.variable)}
        >
          <HistogramaGrupos
            grupos={conSerie((g) => ({ valores: g.descriptivas.find((d) => d.variable === global.variable)?.valores ?? [] }))}
            cortes={datos.cortes}
            etiquetaX={global.etiqueta}
            titulo={`Distribución de ${global.etiqueta} por semestre`}
          />
        </ChartCard>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        {tablaFiab ? (
          <TablaApa numero={tablaFiab.numero} titulo={tablaFiab.titulo} nota={tablaFiab.nota} copia={tablaFiab.copia} interpretacion={tablaFiab.interp}>
            <thead>
              <tr>
                <th className={`${TH} text-left`} rowSpan={2}>
                  Escala
                </th>
                <th className={`${TH} text-right italic`} rowSpan={2}>
                  k
                </th>
                {p.grupos.map((g) => (
                  <th key={g.semestre} colSpan={2} className={`${TH} text-center border-b border-slate-400`}>
                    {g.etiqueta}
                  </th>
                ))}
              </tr>
              <tr>
                {p.grupos.flatMap((g) => [
                  <th key={`${g.semestre}-a`} className={`${TH} text-right`}>
                    α
                  </th>,
                  <th key={`${g.semestre}-n`} className={`${TH} text-right italic`}>
                    n
                  </th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {p.escalasFiab.map((e) => (
                <tr key={e.escala}>
                  <td className={`${TD} text-left`}>{e.etiqueta}</td>
                  <td className={`${TD} text-right`}>{p.grupos.map((g) => g.fiabilidad.find((f) => f.escala === e.escala)?.k).find((k) => k) ?? ""}</td>
                  {p.grupos.flatMap((g) => {
                    const f = g.fiabilidad.find((x) => x.escala === e.escala);
                    return [
                      <td key={`${g.semestre}-a`} className={`${TD} text-right`}>
                        {sinCero(f?.alfa ?? null)}
                      </td>,
                      <td key={`${g.semestre}-n`} className={`${TD} text-right`}>
                        {f?.n ?? 0}
                      </td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </TablaApa>
        ) : (
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Fiabilidad por semestre:</span> ningún semestre tiene todavía tests con las respuestas
            guardadas ítem por ítem.
          </p>
        )}
      </section>

      {tablaFiab && (
        <ChartCard
          numero={figFiab}
          titulo="Fiabilidad por consistencia interna de cada escala según semestre"
          subtitulo="α = alfa de Cronbach. La línea discontinua marca el mínimo aceptable (α = .70). Interpretación según George y Mallery (2003)."
          archivo={`${prefijo}_fiabilidad_semestres.png`}
          interpretacion={tablaFiab.interp}
        >
          <FiabilidadGrupos escalas={p.escalasFiab} grupos={conSerie((g) => ({ filas: g.fiabilidad }))} titulo={`${nombreTest}: consistencia interna por semestre`} />
        </ChartCard>
      )}

      {tablasFrec.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          {tablasFrec.map((b) => (
            <TablaApa key={b.numero} numero={b.numero} titulo={b.titulo} copia={b.copia} interpretacion={b.interp}>
              <thead>
                <tr>
                  {b.copia.cabeceras.map((h, i) => (
                    <th key={h} className={`${TH} ${i === 0 ? "text-left" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.copia.filas.map((f) => (
                  <tr key={f[0]}>
                    {f.map((c, i) => (
                      <td key={i} className={`${TD} ${i === 0 ? "text-left" : "text-right"}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </TablaApa>
          ))}
        </section>
      )}
    </>
  );
};
