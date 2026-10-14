import { useState } from "react";
import { Header } from "./components/Header";
import { OcrUploader } from "./components/OcrUploader";
import { AuditResultView } from "./components/AuditResultView";
import { BriefResultView } from "./components/BriefResultView";
import { PassResultView } from "./components/PassResultView";
import { HistorialView } from "./components/HistorialView";
import { useHistorial } from "./hooks/useHistorial";

export function App() {
  const [tabActiva, setTabActiva] = useState<string>("ocr");
  const [resultadoAudit, setResultadoAudit] = useState<any>(null);
  const [resultadoBrief, setResultadoBrief] = useState<any>(null);
  const [resultadoPass, setResultadoPass] = useState<any>(null);

  const {
    historialAudit,
    historialBrief,
    historialPass,
    agregarAudit,
    agregarBrief,
    agregarPass,
    eliminarAudit,
    eliminarBrief,
    eliminarPass,
    limpiarAudit,
    limpiarBrief,
    limpiarPass,
  } = useHistorial();

  const handleResultadoAudit = (res: any) => {
    limpiarResultados();
    setResultadoAudit(res);
    agregarAudit(res);
  };

  const handleResultadoBrief = (res: any) => {
    limpiarResultados();
    setResultadoBrief(res);
    agregarBrief(res);
  };

  const handleResultadoPass = (res: any) => {
    limpiarResultados();
    setResultadoPass(res);
    agregarPass(res);
  };

  const limpiarResultados = () => {
    setResultadoAudit(null);
    setResultadoBrief(null);
    setResultadoPass(null);
  };

  const totalHistorial =
    historialAudit.length + historialBrief.length + historialPass.length;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans">
      {/* Barra de navegación superior con estado del backend */}
      <Header
        tabActiva={tabActiva}
        setTabActiva={(tab) => {
          setTabActiva(tab);
          // Al ir al historial, limpiar resultado activo para no confundir
          if (tab === "historial") {
            limpiarResultados();
          }
        }}
        totalHistorial={totalHistorial}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Vista de Historial */}
        {tabActiva === "historial" && (
          <HistorialView
            historialAudit={historialAudit}
            historialBrief={historialBrief}
            historialPass={historialPass}
            eliminarAudit={eliminarAudit}
            eliminarBrief={eliminarBrief}
            eliminarPass={eliminarPass}
            limpiarAudit={limpiarAudit}
            limpiarBrief={limpiarBrief}
            limpiarPass={limpiarPass}
          />
        )}

        {/* Visualización de Resultados si existen */}
        {tabActiva !== "historial" && resultadoAudit && (
          <AuditResultView data={resultadoAudit} onReset={limpiarResultados} />
        )}

        {tabActiva !== "historial" && resultadoBrief && (
          <BriefResultView data={resultadoBrief} onReset={limpiarResultados} />
        )}

        {tabActiva !== "historial" && resultadoPass && (
          <PassResultView data={resultadoPass} onReset={limpiarResultados} />
        )}

        {/* Módulos según la pestaña activa cuando no hay resultados en pantalla */}
        {tabActiva !== "historial" &&
          !resultadoAudit &&
          !resultadoBrief &&
          !resultadoPass && (
            <>
              {tabActiva === "ocr" && (
                <OcrUploader
                  onResultadoAudit={handleResultadoAudit}
                  onResultadoBrief={handleResultadoBrief}
                  onResultadoPass={handleResultadoPass}
                />
              )}
            </>
          )}
      </main>

      {/* Pie de página */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sistema de Corrección Psicométrica Automatizada • Psicología Clínica</span>
          <span className="text-[11px] text-slate-400">FastAPI + React 19 + Gemini Flash + Google Sheets</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
