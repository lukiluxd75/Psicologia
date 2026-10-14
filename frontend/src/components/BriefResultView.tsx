import React, { useState } from "react";
import { CheckCircle, ShieldAlert, FileSpreadsheet, Database, ChevronDown, ChevronUp, Layers, Info } from "lucide-react";
import { BRIEF_ESCALAS_METADATA, ITEMS_VALIDEZ_BRIEF } from "../data/testsData";

export interface BriefResultData {
  paciente: string;
  edad?: number;
  genero?: string;
  respuestas?: number[];
  resultados: {
    escalas: {
      inhibicion: number;
      flexibilidad: number;
      control_emocional: number;
      automonitoreo: number;
      iniciativa: number;
      memoria_trabajo: number;
      planificacion_organizacion: number;
      monitoreo_tareas: number;
      organizacion_materiales: number;
    };
    subtotal_1_38: number;
    subtotal_39_75: number;
    total: number;
    validez: {
      negatividad_N: number;
      inconsistencia_I: number;
      infrecuencia_F: number;
      alerta_entrevista: boolean;
    };
  };
  guardado_en_sheets?: boolean;
}

interface BriefResultViewProps {
  data: BriefResultData;
  onReset?: () => void;
}

export const BriefResultView: React.FC<BriefResultViewProps> = ({ data, onReset }) => {
  const [mostrarDetalleItems, setMostrarDetalleItems] = useState(false);
  const { escalas, subtotal_1_38, subtotal_39_75, total, validez } = data.resultados;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Resultado Test BRIEF (Funciones Ejecutivas)
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

      {/* Alerta de Validez / Entrevista Clínica */}
      {validez.alerta_entrevista ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-sm text-amber-900">
              ⚠️ ALERTA CLÍNICA ACTIVADA: Se sugiere entrevista de profundización
            </h4>
            <p className="text-amber-800">
              El protocolo superó los umbrales de control de validez (Negatividad N ≥ 3 o Infrecuencia F ≥ 2). Puede reflejar un sesgo de respuesta negativo o dificultades atípicas que requieren triangulación clínica.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-emerald-800">Protocolo Válido: </span>
            <span className="text-emerald-700">No se detectaron inconsistencias significativas en las escalas de control.</span>
          </div>
        </div>
      )}

      {/* Métricas Principales (Totales y Subtotales) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-500 uppercase">Subtotal 1 (Ítems 1-38)</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{subtotal_1_38} <span className="text-xs font-normal text-slate-400">pts</span></p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-500 uppercase">Subtotal 2 (Ítems 39-75)</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{subtotal_39_75} <span className="text-xs font-normal text-slate-400">pts</span></p>
        </div>
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <span className="text-xs font-semibold text-blue-700 uppercase">Puntuación Total General</span>
          <p className="text-3xl font-extrabold text-blue-900 mt-0.5">{total} <span className="text-xs font-normal text-blue-500">pts</span></p>
        </div>
      </div>

      {/* Indicadores de Validez N, I, F */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-500" />
          Indicadores de Validez y Consistencia
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* N */}
          <div className={`p-3 rounded-lg border ${validez.negatividad_N >= 3 ? "bg-rose-50 border-rose-300 text-rose-900" : "bg-white border-slate-200"}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Negatividad (N)</span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold ${validez.negatividad_N >= 3 ? "bg-rose-200 text-rose-900" : "bg-slate-100 text-slate-800"}`}>
                {validez.negatividad_N} / 10
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {validez.negatividad_N >= 3 ? "⚠️ Alerta activada (≥3 respuestas máximas)" : "Rango esperado normal"}
            </p>
          </div>

          {/* I */}
          <div className="p-3 rounded-lg border bg-white border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Inconsistencia (I)</span>
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800">
                {validez.inconsistencia_I} / 20
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Pares de inconsistencia evaluados</p>
          </div>

          {/* F */}
          <div className={`p-3 rounded-lg border ${validez.infrecuencia_F >= 2 ? "bg-rose-50 border-rose-300 text-rose-900" : "bg-white border-slate-200"}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Infrecuencia (F)</span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold ${validez.infrecuencia_F >= 2 ? "bg-rose-200 text-rose-900" : "bg-slate-100 text-slate-800"}`}>
                {validez.infrecuencia_F} / 5
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {validez.infrecuencia_F >= 2 ? "⚠️ Alerta activada (≥2 respuestas máximas)" : "Rango esperado normal"}
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico y Desglose de las 9 Escalas Clínicas */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Puntuaciones en las 9 Escalas Clínicas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {Object.entries(escalas).map(([clave, puntaje]) => {
            const meta = BRIEF_ESCALAS_METADATA[clave] || {
              titulo: clave,
              descripcion: "",
              color: "bg-blue-500",
            };
            // Estimación de porcentaje para la barra visual (máximo aproximado ~30 pts)
            const pct = Math.min(100, Math.round((puntaje / 30) * 100));

            return (
              <div key={clave} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 hover:border-slate-300 transition">
                <div className="flex justify-between items-baseline">
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{meta.titulo}</h5>
                    <p className="text-[11px] text-slate-500">{meta.descripcion}</p>
                  </div>
                  <span className="text-base font-extrabold text-slate-900 font-mono ml-2">
                    {puntaje} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${meta.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle expandible de respuestas brutas */}
      {data.respuestas && data.respuestas.length === 75 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setMostrarDetalleItems(!mostrarDetalleItems)}
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition"
          >
            <span>Matriz de Respuestas (75 Ítems) e Indicadores de Validez (N y F)</span>
            {mostrarDetalleItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {mostrarDetalleItems && (
            <div className="p-4 bg-white text-xs border-t border-slate-200">
              <div className="flex items-center gap-4 mb-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Ítem de validez (Negatividad o Infrecuencia)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Ítem clínico regular
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 gap-1.5 text-center">
                {data.respuestas.map((resp, i) => {
                  const num = i + 1;
                  const esValidez = ITEMS_VALIDEZ_BRIEF.includes(num);
                  return (
                    <div
                      key={num}
                      title={`Ítem ${num}: marcado ${resp}${esValidez ? " (Indicador de Validez)" : ""}`}
                      className={`p-1 rounded text-[11px] font-mono border ${
                        esValidez ? "bg-amber-50 border-amber-300 text-amber-900 font-bold" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="text-[9px] text-slate-400">#{num}</div>
                      <div>{resp}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón reset */}
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
