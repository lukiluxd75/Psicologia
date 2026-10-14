import React, { useEffect, useState } from "react";
import { Brain, RefreshCw } from "lucide-react";

interface HeaderProps {
  tabActiva: string;
  setTabActiva: (tab: string) => void;
  totalHistorial?: number;
}

export const Header: React.FC<HeaderProps> = ({ tabActiva, setTabActiva, totalHistorial = 0 }) => {
  const [backendStatus, setBackendStatus] = useState<"verificando" | "online" | "offline">("verificando");
  const [sheetsConfig, setSheetsConfig] = useState(false);
  const [geminiConfig, setGeminiConfig] = useState(false);

  const checkHealth = async () => {
    setBackendStatus("verificando");
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
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  PsicoMetric AI
                </h1>
                <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Corrección Psicométrica Automatizada (AUDIT & BRIEF)
              </p>
            </div>
          </div>

          {/* Estado del Backend y Servicios */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={checkHealth}
              title="Volver a verificar estado del backend"
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
            >
              {backendStatus === "verificando" && (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                  <span>Conectando...</span>
                </>
              )}
              {backendStatus === "online" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium text-emerald-700">API En Línea</span>
                </>
              )}
              {backendStatus === "offline" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-medium text-red-700">API Desconectada</span>
                </>
              )}
            </button>

            {backendStatus === "online" && (
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                <span title={geminiConfig ? "Gemini configurado" : "Falta GEMINI_API_KEY"}>
                  IA: {geminiConfig ? "🟢" : "🟡"}
                </span>
                <span>•</span>
                <span title={sheetsConfig ? "Google Sheets configurado" : "Falta SPREADSHEET_ID"}>
                  Sheets: {sheetsConfig ? "🟢" : "🟡"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <nav className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-2 text-sm font-medium">
          <button
            onClick={() => setTabActiva("ocr")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 whitespace-nowrap transition-all ${
              tabActiva === "ocr"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>📷 Escaneo con Cámara / OCR</span>
          </button>
          <button
            onClick={() => setTabActiva("historial")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 whitespace-nowrap transition-all ${
              tabActiva === "historial"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>📋 Historial</span>
            {totalHistorial > 0 && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  tabActiva === "historial"
                    ? "bg-white/30 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {totalHistorial}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
