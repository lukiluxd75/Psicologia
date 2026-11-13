import { useMemo, useState } from "react";
import { Header } from "./components/Header";
import { OcrUploader } from "./components/OcrUploader";
import { AuditResultView } from "./components/AuditResultView";
import { BriefResultView } from "./components/BriefResultView";
import { PassResultView } from "./components/PassResultView";
import { PsicosocialResultView } from "./components/PsicosocialResultView";
import { HistorialView } from "./components/HistorialView";
import { JamoviAnalyticsView } from "./components/JamoviAnalyticsView";
import { useHistorial } from "./hooks/useHistorial";
import { pendientesDe, useSheetsSync } from "./hooks/useSheetsSync";
import { avisarResultadoSync } from "./lib/avisos";
import { AvisosFlotantes } from "./components/jamovi/Avisos";

export function App() {
  const [tabActiva, setTabActiva] = useState<string>("ocr");
  const [resultadoAudit, setResultadoAudit] = useState<any>(null);
  const [resultadoBrief, setResultadoBrief] = useState<any>(null);
  const [resultadoPass, setResultadoPass] = useState<any>(null);
  const [resultadoPsicosocial, setResultadoPsicosocial] = useState<any>(null);

  const {
    historialAudit,
    historialBrief,
    historialPass,
    historialPsicosocial,
    agregarAudit,
    agregarBrief,
    agregarPass,
    agregarPsicosocial,
    eliminarAudit,
    eliminarBrief,
    eliminarPass,
    eliminarPsicosocial,
    marcarSincronizados,
    limpiarAudit,
    limpiarBrief,
    limpiarPass,
    limpiarPsicosocial,
  } = useHistorial();

  const { estado: estadoSync, sincronizar } = useSheetsSync(marcarSincronizados);

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

  const handleResultadoPsicosocial = (res: any) => {
    limpiarResultados();
    setResultadoPsicosocial(res);
    agregarPsicosocial(res);
  };

  const limpiarResultados = () => {
    setResultadoAudit(null);
    setResultadoBrief(null);
    setResultadoPass(null);
    setResultadoPsicosocial(null);
  };

  const historialLocal = useMemo(
    () => ({
      AUDIT: historialAudit,
      BRIEF: historialBrief,
      PASS: historialPass,
      PSICOSOCIAL: historialPsicosocial,
    }),
    [historialAudit, historialBrief, historialPass, historialPsicosocial]
  );

  const pendientesSheets = useMemo(
    () =>
      pendientesDe("AUDIT", historialAudit).length +
      pendientesDe("BRIEF", historialBrief).length +
      pendientesDe("PASS", historialPass).length +
      pendientesDe("PSICOSOCIAL", historialPsicosocial).length,
    [historialAudit, historialBrief, historialPass, historialPsicosocial]
  );

  const totalHistorial =
    historialAudit.length +
    historialBrief.length +
    historialPass.length +
    historialPsicosocial.length;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans">
      <AvisosFlotantes />
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
        pendientesSheets={pendientesSheets}
        estadoSync={estadoSync}
        onSincronizar={async () => avisarResultadoSync(await sincronizar())}
      />

      {/* Contenido Principal */}
      <main
        className={`flex-1 w-full mx-auto px-3 py-4 sm:p-6 space-y-6 ${
          tabActiva === "estadisticas" ? "max-w-6xl" : "max-w-4xl"
        }`}
      >
        {tabActiva === "estadisticas" && <JamoviAnalyticsView historial={historialLocal} />}

        {/* Vista de Historial */}
        {tabActiva === "historial" && (
          <HistorialView
            historialAudit={historialAudit}
            historialBrief={historialBrief}
            historialPass={historialPass}
            historialPsicosocial={historialPsicosocial}
            eliminarAudit={eliminarAudit}
            eliminarBrief={eliminarBrief}
            eliminarPass={eliminarPass}
            eliminarPsicosocial={eliminarPsicosocial}
            sincronizar={sincronizar}
            sincronizando={estadoSync.enviando}
            limpiarAudit={limpiarAudit}
            limpiarBrief={limpiarBrief}
            limpiarPass={limpiarPass}
            limpiarPsicosocial={limpiarPsicosocial}
          />
        )}

        {/* Visualización de Resultados si existen */}
        {tabActiva === "ocr" && resultadoAudit && (
          <AuditResultView data={resultadoAudit} onReset={limpiarResultados} />
        )}

        {tabActiva === "ocr" && resultadoBrief && (
          <BriefResultView data={resultadoBrief} onReset={limpiarResultados} />
        )}

        {tabActiva === "ocr" && resultadoPass && (
          <PassResultView data={resultadoPass} onReset={limpiarResultados} />
        )}

        {tabActiva === "ocr" && resultadoPsicosocial && (
          <PsicosocialResultView
            data={resultadoPsicosocial}
            onReset={limpiarResultados}
          />
        )}

        {/* Módulos según la pestaña activa cuando no hay resultados en pantalla */}
        {tabActiva === "ocr" &&
          !resultadoAudit &&
          !resultadoBrief &&
          !resultadoPass &&
          !resultadoPsicosocial && (
            <>
              <OcrUploader
                onResultadoAudit={handleResultadoAudit}
                onResultadoBrief={handleResultadoBrief}
                onResultadoPass={handleResultadoPass}
                onResultadoPsicosocial={handleResultadoPsicosocial}
              />
            </>
          )}
      </main>

      {/* Pie de página */}
      <footer className="border-t border-slate-200 bg-white py-4 mb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:mb-0 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2">
          <span>Corrección de tests psicométricos · Psicología Clínica</span>
          <span>Los resultados se guardan en este dispositivo y en Google Sheets</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
