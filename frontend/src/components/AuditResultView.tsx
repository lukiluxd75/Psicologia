import React from "react";
import { CheckCircle, AlertTriangle, AlertOctagon, Award, Database, FileSpreadsheet } from "lucide-react";
import { PREGUNTAS_AUDIT } from "../data/testsData";

export interface AuditResultData {
  paciente: string;
  edad?: number;
  genero?: string;
  puntaje: number;
  diagnostico: string;
  respuestas?: number[];
  guardado_en_sheets?: boolean;
}

interface AuditResultViewProps {
  data: AuditResultData;
  onReset?: () => void;
}

export const AuditResultView: React.FC<AuditResultViewProps> = ({ data, onReset }) => {
  // Determinar color y nivel de severidad según diagnóstico
  const esRiesgo = data.diagnostico.toLowerCase().includes("consumo de riesgo");
  const esDependencia = data.diagnostico.toLowerCase().includes("dependencia");

  let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
  let barColor = "bg-emerald-500";
  let Icono = CheckCircle;
  let mensajeGuia = "Consumo con baja probabilidad de daño a la salud. Educación y refuerzo de hábitos saludables.";

  if (esRiesgo) {
    badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
    barColor = "bg-amber-500";
    Icono = AlertTriangle;
    mensajeGuia = "Consumo por encima de las pautas seguras. Se sugiere consejo breve y pautas de reducción de consumo.";
  } else if (esDependencia) {
    badgeColor = "bg-rose-100 text-rose-800 border-rose-300";
    barColor = "bg-rose-500";
    Icono = AlertOctagon;
    mensajeGuia = "Alta probabilidad de abuso o dependencia al alcohol. Se aconseja evaluación médica y terapéutica especializada.";
  }

  // Porcentaje de la barra (AUDIT es sobre 40 puntos max)
  const porcentaje = Math.min(100, Math.round((data.puntaje / 40) * 100));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Cabecera del Resultado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Resultado AUDIT (OMS)
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
            <span>{data.paciente || "Paciente Anónimo"}</span>
            {data.genero && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {data.genero.toUpperCase() === "M" ? "Hombre" : data.genero.toUpperCase() === "F" ? "Mujer" : data.genero}
                {data.edad ? ` • ${data.edad} años` : ""}
              </span>
            )}
          </h2>
        </div>

        {/* Estado en Google Sheets */}
        <div className="flex items-center gap-2">
          {data.guardado_en_sheets ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Guardado en Google Sheets
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200">
              <Database className="w-3.5 h-3.5" />
              Sheets no sincronizado
            </span>
          )}
        </div>
      </div>

      {/* Tarjeta de Diagnóstico Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Puntaje */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Puntaje Total Obtenido
          </span>
          <div className="flex items-baseline gap-2 my-2">
            <span className="text-4xl font-extrabold text-slate-900">{data.puntaje}</span>
            <span className="text-sm text-slate-400 font-medium">/ 40 pts</span>
          </div>
          {/* Barra de progreso */}
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div className={`h-full ${barColor} transition-all duration-700`} style={{ width: `${porcentaje}%` }} />
          </div>
        </div>

        {/* Diagnóstico Clínico */}
        <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Diagnóstico del Algoritmo
              </span>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-1.5 text-base font-bold px-3 py-1 rounded-lg border ${badgeColor}`}>
                  <Icono className="w-4 h-4" />
                  {data.diagnostico}
                </span>
              </div>
            </div>
            <Award className="w-6 h-6 text-slate-400" />
          </div>

          <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200/80">
            <strong>Recomendación:</strong> {mensajeGuia}
          </p>
        </div>
      </div>

      {/* Desglose de las 10 preguntas si están disponibles */}
      {data.respuestas && data.respuestas.length === 10 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Desglose Ítem por Ítem (1 al 10)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {PREGUNTAS_AUDIT.map((item, index) => {
              const valor = data.respuestas ? data.respuestas[index] : 0;
              const opcionElegida = item.opciones.find((o) => o.valor === valor);
              return (
                <div key={item.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <span className="font-semibold text-slate-700">Ítem {item.id}: </span>
                    <span className="text-slate-500 line-clamp-1">{item.texto}</span>
                    <span className="text-blue-600 font-medium block mt-0.5">
                      {opcionElegida ? opcionElegida.etiqueta : `Valor ${valor}`}
                    </span>
                  </div>
                  <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs">
                    +{valor}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botón para reiniciar o hacer otro cálculo */}
      {onReset && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={onReset}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            ← Realizar otra prueba
          </button>
        </div>
      )}
    </div>
  );
};
