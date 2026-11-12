import React, { useState } from "react";
import {
  Heart,
  Users,
  Baby,
  Calendar,
  User,
  Briefcase,
  GraduationCap,
  MapPin,
  ShieldCheck,
  CalendarCheck,
  AlertCircle,
  FileSpreadsheet,
  Database,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Printer,
  Activity,
  Layers,
} from "lucide-react";
import {
  PSICOSOCIAL_DIMENSIONES_META,
  ETIQUETAS_LIKERT_PSICOSOCIAL,
  getNivelBadgeClass,
} from "../constants/psicosocialItems";

export interface SociodemograficoData {
  nombre?: string;
  fecha?: string;
  edad?: number;
  ocupacion?: string;
  grado_instruccion?: string;
  estado_civil?: string;
  zona_vivienda?: string;
  semanas_gestacion?: number;
  hijos_anteriores?: string;
  recibe_subsidio?: string;
  embarazo_planificado?: string;
  perdida_significativa?: string;
}

export interface DimensionResultado {
  titulo: string;
  puntaje: number;
  maximo: number;
  nivel: string;
  interpretacion: string;
}

export interface PsicosocialResultData {
  guardado_en_sheets?: boolean;
  sociodemografico: SociodemograficoData;
  resultados: {
    dimensiones: Record<string, DimensionResultado>;
    puntaje_global: number;
    maximo_global: number;
  };
  respuestas?: Record<string, number>;
}

interface PsicosocialResultViewProps {
  data: PsicosocialResultData;
  onReset?: () => void;
}

export const PsicosocialResultView: React.FC<PsicosocialResultViewProps> = ({
  data,
  onReset,
}) => {
  const [mostrarItems, setMostrarItems] = useState(false);

  const socio = data.sociodemografico || {};
  const { dimensiones, puntaje_global, maximo_global = 160 } =
    data.resultados || { dimensiones: {}, puntaje_global: 0, maximo_global: 160 };

  const pctGlobal = Math.min(100, Math.round((puntaje_global / maximo_global) * 100));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      {/* ── Cabecera ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <span className="text-sm font-semibold text-blue-700">
            Cuestionario Psicosocial: factores psicosociales en gestantes
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            {socio.nombre || "Anónima / No especificado"}
          </h2>
          {socio.fecha && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              Fecha de evaluación: {socio.fecha}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {data.guardado_en_sheets ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 shrink-0">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Guardado en Google Sheets
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 shrink-0">
              <Database className="w-3.5 h-3.5" />
              Pendiente de enviar a Sheets
            </span>
          )}

          <button
            onClick={handlePrint}
            title="Imprimir informe clínico"
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
          >
            <Printer className="w-4 h-4" />
          </button>

          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Nuevo Escaneo
            </button>
          )}
        </div>
      </div>

      {/* ── Parte I: Ficha Sociodemográfica Completa (Ítems 1 al 10) ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          Ficha Sociodemográfica de la Gestante (Ítems 1 al 10)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Edad */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
            <User className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">
                1. Edad
              </div>
              <div className="font-bold text-slate-800 truncate">
                {socio.edad && socio.edad > 0 ? `${socio.edad} años` : "Sin dato"}
              </div>
            </div>
          </div>

          {/* 6. Semanas de Gestación */}
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex items-start gap-2.5">
            <Baby className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-blue-700">
                6. Semanas Gestación
              </div>
              <div className="font-bold text-blue-900 truncate">
                {socio.semanas_gestacion && socio.semanas_gestacion > 0
                  ? `${socio.semanas_gestacion} sem.`
                  : "Sin dato"}
              </div>
            </div>
          </div>

          {/* 2. Ocupación */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5 col-span-2 sm:col-span-1">
            <Briefcase className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">
                2. Ocupación
              </div>
              <div className="font-bold text-slate-800 truncate" title={socio.ocupacion}>
                {socio.ocupacion || "Sin dato"}
              </div>
            </div>
          </div>

          {/* 3. Grado de Instrucción */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
            <GraduationCap className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">
                3. Instrucción
              </div>
              <div className="font-bold text-slate-800 truncate" title={socio.grado_instruccion}>
                {socio.grado_instruccion || "Sin dato"}
              </div>
            </div>
          </div>

          {/* 4. Estado Civil */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
            <Heart className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">
                4. Estado Civil
              </div>
              <div className="font-bold text-slate-800 truncate" title={socio.estado_civil}>
                {socio.estado_civil || "Sin dato"}
              </div>
            </div>
          </div>

          {/* 5. Zona donde vive */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">
                5. Zona Vivienda
              </div>
              <div className="font-bold text-slate-800 truncate" title={socio.zona_vivienda}>
                {socio.zona_vivienda || "Sin dato"}
              </div>
            </div>
          </div>

          {/* 7. Hijos Anteriores */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
            <Users className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">
                7. Hijos Anteriores
              </div>
              <div className="font-bold text-slate-800 truncate">
                {socio.hijos_anteriores || "Sin dato"}
              </div>
            </div>
          </div>

          {/* 8. Subsidio Prenatal */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">
                8. Subsidio Prenatal
              </div>
              <div className="font-bold text-slate-800 truncate">
                {socio.recibe_subsidio || "Sin dato"}
              </div>
            </div>
          </div>

          {/* 9. Embarazo Planificado */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
            <CalendarCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">
                9. Planificado
              </div>
              <div className="font-bold text-slate-800 truncate">
                {socio.embarazo_planificado || "Sin dato"}
              </div>
            </div>
          </div>

          {/* 10. Pérdida Significativa */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">
                10. Pérdida Signif.
              </div>
              <div className="font-bold text-slate-800 truncate">
                {socio.perdida_significativa || "Sin dato"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Puntuación Global ────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Puntaje Psicosocial Global
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                {puntaje_global}
              </span>
              <span className="text-sm font-medium text-slate-500">
                / {maximo_global} pts (Rango 32–160)
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 max-w-xs">
            Evaluación integral de soporte y factores psicosociales durante el periodo de gestación.
          </div>
        </div>

        {/* Barra de progreso global */}
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden mt-4">
          <div
            className="h-full bg-blue-600 transition-all duration-700"
            style={{ width: `${pctGlobal}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-medium">
          <span>32 pts (Mínimo)</span>
          <span>{pctGlobal}% del total</span>
          <span>160 pts (Máximo)</span>
        </div>
      </div>

      {/* ── Parte II: Tarjetas de las 6 Dimensiones Psicosociales ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Dimensiones de Factores Psicosociales (A, B, C, D, E, G)
          </h3>
          <span className="text-xs text-slate-500">Escala Likert 1 a 5</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(PSICOSOCIAL_DIMENSIONES_META).map(([clave, meta]) => {
            const dimRes = dimensiones[clave] || {
              titulo: meta.titulo,
              puntaje: 0,
              maximo: meta.maximo,
              nivel: "Sin dato",
              interpretacion: "",
            };

            const pctDim = Math.min(
              100,
              Math.round((dimRes.puntaje / meta.maximo) * 100)
            );
            const badgeClass = getNivelBadgeClass(dimRes.nivel);

            return (
              <div
                key={clave}
                className={`p-4 rounded-xl border ${meta.colorBorder} bg-white shadow-xs space-y-3 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        {meta.titulo}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Ítems {meta.itemsRango}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-lg font-black text-slate-900 font-mono">
                        {dimRes.puntaje}
                      </span>
                      <span className="text-xs text-slate-500 font-normal">
                        {" "}
                        / {meta.maximo}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso de la dimensión */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2.5">
                    <div
                      className={`h-full ${meta.color} transition-all duration-500`}
                      style={{ width: `${pctDim}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Nivel Clínico
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}
                    >
                      {dimRes.nivel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                    "{dimRes.interpretacion}"
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Desglose expandible de respuestas por ítem ────────────── */}
      {data.respuestas && Object.keys(data.respuestas).length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setMostrarItems((v) => !v)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition text-left"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">
                Ver detalle de respuestas marcadas por ítem ({Object.keys(data.respuestas).length} ítems)
              </span>
            </div>
            {mostrarItems ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {mostrarItems && (
            <div className="p-4 bg-white border-t border-slate-200 space-y-4">
              <div className="text-xs text-slate-500">
                Escala de respuesta: 1 = Nunca, 2 = Casi nunca, 3 = Algunas veces, 4 = Casi siempre, 5 = Siempre.
              </div>

              <div className="space-y-4">
                {Object.entries(PSICOSOCIAL_DIMENSIONES_META).map(([dimKey, meta]) => (
                  <div key={dimKey} className="border border-slate-200 rounded-lg p-3">
                    <h5 className="font-bold text-xs text-slate-800 mb-2">
                      {meta.titulo}
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {meta.items.map((numItem) => {
                        const val = data.respuestas?.[String(numItem)] ?? 3;
                        const etiqueta = ETIQUETAS_LIKERT_PSICOSOCIAL[val] || `${val}`;
                        return (
                          <div
                            key={numItem}
                            className="bg-slate-50 p-2 rounded-md border border-slate-200 text-center"
                          >
                            <span className="text-xs text-slate-500 font-semibold block">
                              Ítem {numItem}
                            </span>
                            <span className="text-sm font-bold text-slate-900 block my-0.5">
                              {val}
                            </span>
                            <span className="text-xs text-slate-600 font-medium block truncate" title={etiqueta}>
                              {etiqueta}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
