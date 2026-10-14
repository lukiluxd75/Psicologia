import React, { useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  Baby,
  Calendar,
  User,
  Briefcase,
  ShieldAlert,
  FileSpreadsheet,
  Database,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertOctagon,
} from "lucide-react";
import { PASS_ITEMS, ETIQUETAS_PASS, PASS_ESCALAS_META } from "../constants/passItems";

export interface PassResultData {
  paciente?: string; // for unified historial
  guardado_en_sheets?: boolean;
  paciente_obj?: {
    nombre: string;
    edad: number;
    ocupacion?: string;
    etapa_perinatal: string;
    semanas_embarazo: number;
    edad_bebe: number;
    fecha?: string;
  };
  // When coming from OCR endpoint the structure is { paciente: {...}, resultados: {...} }
  // We support both shapes
  nombre?: string;
  edad?: number;
  resultados: {
    subescalas: {
      escala_1_preocupacion_miedos: number;
      escala_2_perfeccionismo_trauma: number;
      escala_3_ansiedad_social: number;
      escala_4_ansiedad_aguda_ajuste: number;
    };
    maximos: {
      escala_1_preocupacion_miedos: number;
      escala_2_perfeccionismo_trauma: number;
      escala_3_ansiedad_social: number;
      escala_4_ansiedad_aguda_ajuste: number;
      total: number;
    };
    total: number;
    corte_riesgo: number;
    riesgo_trastorno: string;
    severidad: string;
    item_7_fobia: {
      puntaje: number;
      alerta_fobia: boolean;
    };
    respuestas?: number[];
  };
}

interface PassResultViewProps {
  data: PassResultData;
  onReset?: () => void;
}

// Helper to extract patient info from both data shapes
function getPaciente(data: PassResultData) {
  if (data.paciente_obj) return data.paciente_obj;
  return {
    nombre: (data as any).paciente?.nombre ?? data.nombre ?? "Paciente Anónimo",
    edad: (data as any).paciente?.edad ?? data.edad ?? 0,
    ocupacion: (data as any).paciente?.ocupacion ?? "",
    etapa_perinatal: (data as any).paciente?.etapa_perinatal ?? "Prenatal",
    semanas_embarazo: (data as any).paciente?.semanas_embarazo ?? 0,
    edad_bebe: (data as any).paciente?.edad_bebe ?? 0,
    fecha: (data as any).paciente?.fecha ?? "",
  };
}

export const PassResultView: React.FC<PassResultViewProps> = ({ data, onReset }) => {
  const [mostrarItems, setMostrarItems] = useState(false);

  const pac = getPaciente(data);
  const { subescalas, total, severidad, riesgo_trastorno, item_7_fobia, maximos, respuestas } = data.resultados;

  const esAltoRiesgo = riesgo_trastorno === "Alto riesgo";
  const esSevero = severidad === "Síntomas severos";
  const esLeveMod = severidad === "Síntomas leves-moderados";

  // Severity badge colors
  const severidadColor = esSevero
    ? "bg-rose-100 text-rose-800 border-rose-300"
    : esLeveMod
    ? "bg-amber-100 text-amber-800 border-amber-300"
    : "bg-emerald-100 text-emerald-800 border-emerald-300";

  const SeveridadIcon = esSevero ? AlertOctagon : esLeveMod ? AlertTriangle : CheckCircle;

  // Progress bar: 0-93
  const pct = Math.min(100, Math.round((total / 93) * 100));
  // Corte de 26 pts = 27.96% del rango
  const cortePct = Math.round((26 / 93) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      {/* ── Cabecera ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-fuchsia-600 bg-fuchsia-50 px-2.5 py-1 rounded-full">
            Resultado PASS — Ansiedad Perinatal
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2">{pac.nombre}</h2>
        </div>

        {data.guardado_en_sheets ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 shrink-0">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Guardado en Google Sheets
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 shrink-0">
            <Database className="w-3.5 h-3.5" />
            Sheets no sincronizado
          </span>
        )}
      </div>

      {/* ── Ficha perinatal ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <User className="w-4 h-4 text-slate-500 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Edad</div>
            <div className="font-bold text-slate-800">{pac.edad > 0 ? `${pac.edad} años` : "—"}</div>
          </div>
        </div>

        {pac.ocupacion && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
            <Briefcase className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Ocupación</div>
              <div className="font-bold text-slate-800 truncate">{pac.ocupacion}</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 bg-fuchsia-50 rounded-xl border border-fuchsia-200">
          <Baby className="w-4 h-4 text-fuchsia-600 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-fuchsia-700 tracking-wider">Etapa</div>
            <div className="font-bold text-fuchsia-900">{pac.etapa_perinatal}</div>
          </div>
        </div>

        {pac.etapa_perinatal === "Prenatal" && pac.semanas_embarazo > 0 && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <Baby className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Semanas</div>
              <div className="font-bold text-slate-800">{pac.semanas_embarazo} sem.</div>
            </div>
          </div>
        )}

        {pac.etapa_perinatal === "Posnatal" && pac.edad_bebe >= 0 && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <Baby className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Edad bebé</div>
              <div className="font-bold text-slate-800">{pac.edad_bebe} mes(es)</div>
            </div>
          </div>
        )}

        {pac.fecha && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Fecha</div>
              <div className="font-bold text-slate-800">{pac.fecha}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Alerta de Fobia (Ítem 7) ─────────────────────────────── */}
      {item_7_fobia.alerta_fobia && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-sm text-rose-900">
              ⚠️ INDICADOR CLÍNICO DE FOBIA — Ítem 7 con puntaje elevado ({item_7_fobia.puntaje}/3)
            </h4>
            <p className="text-rose-800">
              <strong>Ítem 7:</strong> "Miedos muy fuertes sobre ciertas cosas: agujas, sangre, al parto, al dolor, etc."<br />
              El manual especifica que este ítem debe evaluarse <strong>individualmente</strong>. Una respuesta ≥ 2 (A menudo o Casi siempre) es un indicador clínico directo de <strong>fobia específica perinatal</strong> que requiere evaluación especializada.
            </p>
          </div>
        </div>
      )}

      {/* ── Tarjetas de Puntuación Global ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Puntaje total */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:col-span-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Puntaje Global (0 – 93)
          </span>
          <div className="flex items-baseline gap-2 my-2">
            <span className="text-4xl font-extrabold text-slate-900">{total}</span>
            <span className="text-sm text-slate-400 font-medium">/ 93 pts</span>
          </div>

          {/* Barra segmentada */}
          <div className="relative w-full h-4 rounded-full overflow-hidden bg-slate-200 mt-3">
            {/* Verde: 0-20 */}
            <div className="absolute left-0 top-0 h-full bg-emerald-400" style={{ width: `${(20 / 93) * 100}%` }} />
            {/* Ámbar: 21-41 */}
            <div className="absolute top-0 h-full bg-amber-400" style={{ left: `${(21 / 93) * 100}%`, width: `${(21 / 93) * 100}%` }} />
            {/* Rojo: 42-93 */}
            <div className="absolute top-0 h-full bg-rose-400" style={{ left: `${(42 / 93) * 100}%`, right: 0 }} />
            {/* Marcador de puntaje */}
            <div
              className="absolute top-0 h-full w-1 bg-slate-900 rounded-full z-10 transition-all duration-700"
              style={{ left: `calc(${pct}% - 2px)` }}
            />
            {/* Línea de corte clínico */}
            <div
              className="absolute top-0 h-full w-0.5 bg-slate-700 z-20"
              title="Punto de corte clínico: 26 pts"
              style={{ left: `${cortePct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span className="text-emerald-700 font-semibold">0–20 Asintomático</span>
            <span className="text-amber-700 font-semibold">21–41 Leve-Mod.</span>
            <span className="text-rose-700 font-semibold">42–93 Severo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            La línea vertical indica el <strong>punto de corte clínico de 26 pts</strong> (Bajo riesgo vs Alto riesgo).
          </p>
        </div>

        {/* Nivel de riesgo y severidad */}
        <div className="flex flex-col gap-3">
          <div className={`p-4 rounded-xl border ${esAltoRiesgo ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Nivel de Riesgo</span>
            <div className={`mt-1 text-base font-extrabold ${esAltoRiesgo ? "text-rose-800" : "text-emerald-800"}`}>
              {riesgo_trastorno}
            </div>
            <p className="text-[10px] mt-0.5 text-slate-500">
              Corte clínico: {data.resultados.corte_riesgo} pts
            </p>
          </div>

          <div className={`p-4 rounded-xl border flex items-center gap-2 ${severidadColor}`}>
            <SeveridadIcon className="w-5 h-5 shrink-0" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Severidad</div>
              <div className="font-bold text-sm">{severidad}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Gráfico de las 4 subescalas ─────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-fuchsia-600" />
          Puntuaciones en las 4 Subescalas Clínicas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.entries(PASS_ESCALAS_META) as [keyof typeof PASS_ESCALAS_META, typeof PASS_ESCALAS_META[keyof typeof PASS_ESCALAS_META]][]).map(([clave, meta]) => {
            const puntaje = subescalas[clave as keyof typeof subescalas] ?? 0;
            const max = maximos[clave as keyof typeof maximos] ?? meta.maximo;
            const pctEscala = Math.min(100, Math.round((puntaje / max) * 100));
            return (
              <div key={clave} className={`p-4 rounded-xl border ${meta.colorBorder} bg-white space-y-2`}>
                <div className="flex justify-between items-baseline">
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{meta.titulo}</h5>
                    <p className="text-[11px] text-slate-500">Ítems {meta.items}</p>
                  </div>
                  <span className="text-base font-extrabold text-slate-900 font-mono ml-2">
                    {puntaje} <span className="text-[10px] text-slate-400 font-normal">/ {max}</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${meta.color} transition-all duration-500`} style={{ width: `${pctEscala}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Desglose expandible de los 31 ítems ─────────────────── */}
      {respuestas && respuestas.length === 31 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setMostrarItems(!mostrarItems)}
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition"
          >
            <span>Desglose Ítem por Ítem (31 Ítems)</span>
            {mostrarItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {mostrarItems && (
            <div className="p-4 bg-white border-t border-slate-200 space-y-2 text-xs">
              {PASS_ITEMS.map((item) => {
                const valor = respuestas[item.numero - 1] ?? 0;
                const etiqueta = ETIQUETAS_PASS[valor] ?? `Valor ${valor}`;
                return (
                  <div
                    key={item.numero}
                    className={`p-2.5 rounded-lg border flex justify-between items-start gap-2 ${
                      item.esIndicadorFobia && valor >= 2
                        ? "bg-rose-50 border-rose-300"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex-1">
                      <span className="font-semibold text-slate-700">Ítem {item.numero}: </span>
                      <span className="text-slate-500">{item.texto}</span>
                      {item.esIndicadorFobia && (
                        <span className="ml-1 text-[10px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-semibold">
                          ★ Indicador Fobia
                        </span>
                      )}
                      <span className="text-blue-600 font-medium block mt-0.5">{etiqueta}</span>
                      <span className="text-[10px] text-slate-400 block">{item.indicadorRiesgo}</span>
                    </div>
                    <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs shrink-0">
                      +{valor}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Botón reset ──────────────────────────────────────────── */}
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
