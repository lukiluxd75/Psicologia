import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, Brain, Camera, CloudUpload, ClipboardList, RefreshCw } from "lucide-react";
import type { EstadoSync } from "../hooks/useSheetsSync";

interface HeaderProps {
  tabActiva: string;
  setTabActiva: (tab: string) => void;
  totalHistorial?: number;
  pendientesSheets?: number;
  estadoSync?: EstadoSync;
  onSincronizar?: () => void;
}

const TABS = [
  { id: "ocr", label: "Escanear test", corto: "Escanear", Icon: Camera },
  { id: "historial", label: "Historial", corto: "Historial", Icon: ClipboardList },
  { id: "estadisticas", label: "Estadísticas", corto: "Estadísticas", Icon: BarChart3 },
] as const;

function horaCorta(d: Date) {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

const IndicadorSync: React.FC<{ pendientes: number; estado?: EstadoSync; onClick?: () => void }> = ({
  pendientes,
  estado,
  onClick,
}) => {
  let texto: string;
  let corto: string;
  let color: string;
  if (estado?.enviando) {
    texto = corto = "Enviando…";
    color = "text-slate-600 bg-slate-50 border-slate-200";
  } else if (estado?.error && pendientes > 0) {
    texto = `${pendientes} sin enviar`;
    corto = `${pendientes}`;
    color = "text-amber-800 bg-amber-50 border-amber-200";
  } else if (pendientes > 0) {
    texto = `${pendientes} pendiente${pendientes === 1 ? "" : "s"}`;
    corto = `${pendientes}`;
    color = "text-amber-800 bg-amber-50 border-amber-200";
  } else {
    texto = estado?.ultimoEnvio ? `Sheets al día · ${horaCorta(estado.ultimoEnvio)}` : "Sheets al día";
    corto = "Sheets";
    color = "text-emerald-700 bg-emerald-50 border-emerald-200";
  }

  const titulo = estado?.error
    ? `Último intento falló: ${estado.error}. Se reintenta cada 5 min. Toca para reintentar ahora.`
    : "Los resultados se envían a Google Sheets automáticamente cada 5 minutos. Toca para enviar ahora.";

  return (
    <button
      onClick={onClick}
      disabled={estado?.enviando}
      title={titulo}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 sm:py-1 rounded-full border transition hover:brightness-95 disabled:cursor-wait ${color}`}
    >
      {estado?.enviando ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <CloudUpload className="w-3.5 h-3.5" />
      )}
      <span className="font-medium whitespace-nowrap sm:hidden">{corto}</span>
      <span className="font-medium whitespace-nowrap hidden sm:inline">{texto}</span>
    </button>
  );
};

export const Header: React.FC<HeaderProps> = ({
  tabActiva,
  setTabActiva,
  totalHistorial = 0,
  pendientesSheets = 0,
  estadoSync,
  onSincronizar,
}) => {
  const [backendStatus, setBackendStatus] = useState<"verificando" | "online" | "offline">("verificando");
  const [sheetsConfig, setSheetsConfig] = useState(false);
  const [geminiConfig, setGeminiConfig] = useState(false);

  const checkHealth = useCallback(async (mostrarVerificando = true) => {
    if (mostrarVerificando) setBackendStatus("verificando");
    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus("online");
        setGeminiConfig(data.gemini_configurado);
        setSheetsConfig(data.spreadsheet_id_configurado);
      } else {
        setBackendStatus("offline");
      }
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => {
    const primera = setTimeout(() => checkHealth(false), 0);
    const interval = setInterval(() => checkHealth(false), 20000);
    return () => {
      clearTimeout(primera);
      clearInterval(interval);
    };
  }, [checkHealth]);

  const badge = (activo: boolean) =>
    activo ? "bg-white/30 text-white" : "bg-slate-200 text-slate-700";

  return (
    <>
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30 shadow-xs pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {/* Logo y título */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center text-white" aria-hidden="true">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none truncate">
                    PsicoMetric AI
                  </h1>
                </div>
                <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                  Corrección Psicométrica Automatizada (AUDIT, BRIEF, PASS & PSICOSOCIAL)
                </p>
              </div>
            </div>

            {/* Estado del Backend y Servicios */}
            <div className="flex items-center gap-2 shrink-0">
              {backendStatus === "online" && sheetsConfig && (
                <IndicadorSync pendientes={pendientesSheets} estado={estadoSync} onClick={onSincronizar} />
              )}

              <button
                onClick={() => checkHealth()}
                title={
                  backendStatus === "online"
                    ? `API en línea · IA ${geminiConfig ? "configurada" : "sin GEMINI_API_KEY"} · Sheets ${
                        sheetsConfig ? "configurado" : "sin SPREADSHEET_ID"
                      }`
                    : "Volver a comprobar la conexión con el servidor"
                }
                aria-label="Estado del servidor"
                className="flex items-center gap-1.5 text-xs p-2 sm:px-2.5 sm:py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
              >
                {backendStatus === "verificando" && (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                    <span className="hidden sm:inline">Conectando…</span>
                  </>
                )}
                {backendStatus === "online" && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span className="hidden sm:inline font-medium text-emerald-700">En línea</span>
                  </>
                )}
                {backendStatus === "offline" && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
                    <span className="font-medium text-rose-700">Sin conexión</span>
                  </>
                )}
              </button>

              {backendStatus === "online" && (!geminiConfig || !sheetsConfig) && (
                <span
                  title={[!geminiConfig && "Falta GEMINI_API_KEY", !sheetsConfig && "Falta SPREADSHEET_ID"].filter(Boolean).join(" · ")}
                  className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
                  {!geminiConfig ? "Lectura de fotos sin configurar" : "Google Sheets sin configurar"}
                </span>
              )}
            </div>
          </div>

          {/* Pestañas (escritorio / tablet) */}
          <nav className="hidden sm:flex gap-2 mt-3 border-t border-slate-100 pt-2 text-sm font-medium">
            {TABS.map(({ id, label, Icon }) => {
              const activo = tabActiva === id;
              return (
                <button
                  key={id}
                  onClick={() => setTabActiva(id)}
                  aria-current={activo ? "page" : undefined}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-2 whitespace-nowrap transition-all ${
                    activo
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {id === "historial" && totalHistorial > 0 && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${badge(activo)}`}>
                      {totalHistorial}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Barra inferior (celular): al alcance del pulgar */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegación principal"
      >
        <div className="grid grid-cols-3">
          {TABS.map(({ id, corto, Icon }) => {
            const activo = tabActiva === id;
            return (
              <button
                key={id}
                onClick={() => setTabActiva(id)}
                aria-current={activo ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-14 text-xs font-medium transition ${
                  activo ? "text-blue-700" : "text-slate-500 active:bg-slate-100"
                }`}
              >
                <span className={`absolute top-0 h-0.5 w-10 rounded-full ${activo ? "bg-blue-600" : "bg-transparent"}`} />
                <span className="relative">
                  <Icon className="w-5 h-5" strokeWidth={activo ? 2.4 : 2} />
                  {id === "historial" && totalHistorial > 0 && (
                    <span className="absolute -top-1.5 -right-3 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[11px] font-bold leading-4 text-center">
                      {totalHistorial > 99 ? "99+" : totalHistorial}
                    </span>
                  )}
                </span>
                <span>{corto}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
