import React, { useState } from "react";
import {
  ClipboardList,
  Trash2,
  Eye,
  ChevronUp,
  Calendar,
  User,
  AlertTriangle,
  Baby,
  ShieldAlert,
} from "lucide-react";
import type {
  HistorialEntryAudit,
  HistorialEntryBrief,
  HistorialEntryPass,
} from "../hooks/useHistorial";
import { AuditResultView } from "./AuditResultView";
import { BriefResultView } from "./BriefResultView";
import { PassResultView } from "./PassResultView";

interface HistorialViewProps {
  historialAudit: HistorialEntryAudit[];
  historialBrief: HistorialEntryBrief[];
  historialPass: HistorialEntryPass[];
  eliminarAudit: (id: string) => void;
  eliminarBrief: (id: string) => void;
  eliminarPass: (id: string) => void;
  limpiarAudit: () => void;
  limpiarBrief: () => void;
  limpiarPass: () => void;
}

type Pestaña = "audit" | "brief" | "pass";

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Tarjeta AUDIT ─────────────────────────────────────────────────────── */
const TarjetaAudit: React.FC<{
  entry: HistorialEntryAudit;
  onEliminar: () => void;
}> = ({ entry, onEliminar }) => {
  const [expandido, setExpandido] = useState(false);

  const esDependencia = entry.diagnostico
    .toLowerCase()
    .includes("dependencia");
  const esRiesgo = entry.diagnostico
    .toLowerCase()
    .includes("consumo de riesgo");

  const badgeColor = esDependencia
    ? "bg-rose-100 text-rose-800 border-rose-300"
    : esRiesgo
    ? "bg-amber-100 text-amber-800 border-amber-300"
    : "bg-emerald-100 text-emerald-800 border-emerald-300";

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition">
      {/* Fila de resumen */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm truncate">
              {entry.paciente || "Paciente Anónimo"}
            </span>
            {entry.edad !== undefined && (
              <span className="text-xs text-slate-500">{entry.edad} años</span>
            )}
            {entry.genero && (
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                {entry.genero.toUpperCase() === "M"
                  ? "Hombre"
                  : entry.genero.toUpperCase() === "F"
                  ? "Mujer"
                  : entry.genero}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}
            >
              {entry.diagnostico}
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Puntaje: {entry.puntaje} / 40
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar className="w-3 h-3" />
            {formatFecha(entry.fecha)}
          </span>
          <button
            onClick={() => setExpandido((v) => !v)}
            title="Ver resultado completo"
            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition"
          >
            {expandido ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEliminar}
            title="Eliminar del historial"
            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detalle expandido */}
      {expandido && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <AuditResultView data={entry} />
        </div>
      )}
    </div>
  );
};

/* ─── Tarjeta BRIEF ──────────────────────────────────────────────────────── */
const TarjetaBrief: React.FC<{
  entry: HistorialEntryBrief;
  onEliminar: () => void;
}> = ({ entry, onEliminar }) => {
  const [expandido, setExpandido] = useState(false);
  const alerta = entry.resultados.validez.alerta_entrevista;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition">
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-indigo-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm truncate">
              {entry.paciente || "Paciente Anónimo"}
            </span>
            {entry.edad !== undefined && (
              <span className="text-xs text-slate-500">{entry.edad} años</span>
            )}
            {entry.genero && (
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                {entry.genero.toUpperCase() === "M"
                  ? "Hombre"
                  : entry.genero.toUpperCase() === "F"
                  ? "Mujer"
                  : entry.genero}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] font-mono text-slate-500">
              Total: {entry.resultados.total} pts
            </span>
            {alerta && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
                <AlertTriangle className="w-3 h-3" />
                Alerta clínica
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar className="w-3 h-3" />
            {formatFecha(entry.fecha)}
          </span>
          <button
            onClick={() => setExpandido((v) => !v)}
            title="Ver resultado completo"
            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition"
          >
            {expandido ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEliminar}
            title="Eliminar del historial"
            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <BriefResultView data={entry} />
        </div>
      )}
    </div>
  );
};

/* ─── Tarjeta PASS ───────────────────────────────────────────────────────── */
const TarjetaPass: React.FC<{
  entry: HistorialEntryPass;
  onEliminar: () => void;
}> = ({ entry, onEliminar }) => {
  const [expandido, setExpandido] = useState(false);

  const nombrePaciente =
    entry.paciente_obj?.nombre ||
    (entry as any).paciente?.nombre ||
    entry.nombre ||
    (typeof entry.paciente === "string" ? entry.paciente : "Paciente Anónimo");

  const edadPaciente =
    entry.paciente_obj?.edad ??
    (entry as any).paciente?.edad ??
    entry.edad;

  const etapa =
    entry.paciente_obj?.etapa_perinatal ||
    (entry as any).paciente?.etapa_perinatal;

  const r = entry.resultados;
  const esAltoRiesgo = r.riesgo_trastorno === "Alto riesgo";
  const alertaFobia = r.item_7_fobia?.alerta_fobia;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition">
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-full bg-fuchsia-50 border border-fuchsia-200 flex items-center justify-center shrink-0">
          <Baby className="w-4 h-4 text-fuchsia-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm truncate">
              {nombrePaciente}
            </span>
            {edadPaciente !== undefined && edadPaciente > 0 && (
              <span className="text-xs text-slate-500">{edadPaciente} años</span>
            )}
            {etapa && (
              <span className="text-xs bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 px-1.5 py-0.5 rounded-full font-medium">
                {etapa}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                esAltoRiesgo
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : "bg-emerald-100 text-emerald-800 border-emerald-300"
              }`}
            >
              {r.riesgo_trastorno} ({r.severidad})
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Total: {r.total} / 93 pts
            </span>
            {alertaFobia && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-medium">
                <ShieldAlert className="w-3 h-3" />
                Alerta Fobia (Ítem 7)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar className="w-3 h-3" />
            {formatFecha(entry.fechaRegistro)}
          </span>
          <button
            onClick={() => setExpandido((v) => !v)}
            title="Ver resultado completo"
            className="p-1.5 rounded-lg hover:bg-fuchsia-50 text-slate-500 hover:text-fuchsia-600 transition"
          >
            {expandido ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEliminar}
            title="Eliminar del historial"
            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <PassResultView data={entry} />
        </div>
      )}
    </div>
  );
};

/* ─── Vista principal ────────────────────────────────────────────────────── */
export const HistorialView: React.FC<HistorialViewProps> = ({
  historialAudit,
  historialBrief,
  historialPass,
  eliminarAudit,
  eliminarBrief,
  eliminarPass,
  limpiarAudit,
  limpiarBrief,
  limpiarPass,
}) => {
  const [pestaña, setPestaña] = useState<Pestaña>("audit");
  const [confirmarLimpiar, setConfirmarLimpiar] = useState(false);

  const lista =
    pestaña === "audit"
      ? historialAudit
      : pestaña === "brief"
      ? historialBrief
      : historialPass;

  const handleLimpiar = () => {
    if (!confirmarLimpiar) {
      setConfirmarLimpiar(true);
      setTimeout(() => setConfirmarLimpiar(false), 3000);
      return;
    }
    if (pestaña === "audit") limpiarAudit();
    else if (pestaña === "brief") limpiarBrief();
    else limpiarPass();
    setConfirmarLimpiar(false);
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-slate-600" />
          <h2 className="text-base font-bold text-slate-900">
            Historial de Resultados Clínicos
          </h2>
        </div>

        {lista.length > 0 && (
          <button
            onClick={handleLimpiar}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
              confirmarLimpiar
                ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
                : "bg-white text-slate-600 border-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
            }`}
          >
            {confirmarLimpiar ? "¿Confirmar borrado?" : "🗑 Limpiar historial"}
          </button>
        )}
      </div>

      {/* Sub-pestañas AUDIT / BRIEF / PASS */}
      <div className="flex gap-2 border-b border-slate-200 pb-0 flex-wrap">
        <button
          onClick={() => { setPestaña("audit"); setConfirmarLimpiar(false); }}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
            pestaña === "audit"
              ? "border-blue-600 text-blue-700 bg-blue-50/60"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          Test AUDIT
          {historialAudit.length > 0 && (
            <span className="ml-1.5 text-[11px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
              {historialAudit.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setPestaña("brief"); setConfirmarLimpiar(false); }}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
            pestaña === "brief"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          Test BRIEF
          {historialBrief.length > 0 && (
            <span className="ml-1.5 text-[11px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">
              {historialBrief.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setPestaña("pass"); setConfirmarLimpiar(false); }}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
            pestaña === "pass"
              ? "border-fuchsia-600 text-fuchsia-700 bg-fuchsia-50/60"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          Test PASS (Perinatal)
          {historialPass.length > 0 && (
            <span className="ml-1.5 text-[11px] bg-fuchsia-100 text-fuchsia-700 font-bold px-1.5 py-0.5 rounded-full">
              {historialPass.length}
            </span>
          )}
        </button>
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No hay resultados guardados</p>
          <p className="text-xs mt-1">
            Los resultados del test{" "}
            <strong>
              {pestaña === "audit" ? "AUDIT" : pestaña === "brief" ? "BRIEF" : "PASS"}
            </strong>{" "}
            aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pestaña === "audit" &&
            historialAudit.map((entry) => (
              <TarjetaAudit
                key={entry.id}
                entry={entry}
                onEliminar={() => eliminarAudit(entry.id)}
              />
            ))}
          {pestaña === "brief" &&
            historialBrief.map((entry) => (
              <TarjetaBrief
                key={entry.id}
                entry={entry}
                onEliminar={() => eliminarBrief(entry.id)}
              />
            ))}
          {pestaña === "pass" &&
            historialPass.map((entry) => (
              <TarjetaPass
                key={entry.id}
                entry={entry}
                onEliminar={() => eliminarPass(entry.id)}
              />
            ))}
        </div>
      )}
    </div>
  );
};
