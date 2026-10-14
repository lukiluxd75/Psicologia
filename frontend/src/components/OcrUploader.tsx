import React, { useState } from "react";
import { UploadCloud, X, AlertCircle, FileText } from "lucide-react";

type TipoTest = "AUDIT" | "BRIEF" | "PASS";

interface OcrUploaderProps {
  onResultadoAudit: (res: any) => void;
  onResultadoBrief: (res: any) => void;
  onResultadoPass: (res: any) => void;
}

export const OcrUploader: React.FC<OcrUploaderProps> = ({
  onResultadoAudit,
  onResultadoBrief,
  onResultadoPass,
}) => {
  const [tipoTest, setTipoTest] = useState<TipoTest>("AUDIT");
  const [archivo1, setArchivo1] = useState<File | null>(null);
  const [archivo2, setArchivo2] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [etapaCarga, setEtapaCarga] = useState("");
  const [error, setError] = useState("");

  const handleArchivo1Change = (file: File | null) => {
    setArchivo1(file);
    setPreview1(file ? URL.createObjectURL(file) : null);
  };

  const handleArchivo2Change = (file: File | null) => {
    setArchivo2(file);
    setPreview2(file ? URL.createObjectURL(file) : null);
  };

  const cambiarTipo = (tipo: TipoTest) => {
    setTipoTest(tipo);
    handleArchivo1Change(null);
    handleArchivo2Change(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!archivo1) { setError("Debes seleccionar al menos la primera fotografía."); return; }
    if ((tipoTest === "BRIEF" || tipoTest === "PASS") && !archivo2) {
      setError(`El test ${tipoTest} requiere exactamente 2 fotografías (Página 1 y Página 2).`);
      return;
    }
    setCargando(true);
    setEtapaCarga("Subiendo archivo(s) al backend...");
    try {
      const formData = new FormData();
      const apiBase = import.meta.env.VITE_API_URL || "";
      let url = "";

      if (tipoTest === "AUDIT") {
        formData.append("file", archivo1);
        url = `${apiBase}/api/upload/audit`;
      } else if (tipoTest === "BRIEF") {
        formData.append("files", archivo1);
        formData.append("files", archivo2!);
        url = `${apiBase}/api/upload/brief`;
      } else {
        formData.append("files", archivo1);
        formData.append("files", archivo2!);
        url = `${apiBase}/api/upload/pass`;
      }

      setEtapaCarga("Google Gemini Flash extrayendo respuestas visuales...");
      const response = await fetch(url, { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || errorData?.error || `Error ${response.status}`);
      }
      setEtapaCarga("Calculando escalas...");
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (tipoTest === "AUDIT") onResultadoAudit(data);
      else if (tipoTest === "BRIEF") onResultadoBrief(data);
      else onResultadoPass(data);
    } catch (err: any) {
      let msg = err.message || "Ocurrió un error al procesar el test.";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        msg = "No se pudo conectar con el servidor backend. Verifica que FastAPI esté corriendo en el puerto 8000.";
      }
      setError(msg);
    } finally {
      setCargando(false);
      setEtapaCarga("");
    }
  };

  const necesita2Imagenes = tipoTest === "BRIEF" || tipoTest === "PASS";
  const deshabilitado = cargando || !archivo1 || (necesita2Imagenes && !archivo2);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Escaneo de Hojas Físicas con IA</h2>
        <p className="text-xs text-slate-500 mt-1">
          Toma una fotografía con la cámara o sube un archivo escaneado. Google Gemini Flash extraerá las respuestas y el backend calculará los puntajes automáticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selector de Test */}
        <div className="flex gap-2 flex-wrap">
          {(["AUDIT", "BRIEF", "PASS"] as TipoTest[]).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => cambiarTipo(tipo)}
              className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl border font-semibold text-sm transition ${
                tipoTest === tipo
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {tipo === "AUDIT" ? "AUDIT (Alcohol) — 1 Imagen" :
               tipo === "BRIEF" ? "BRIEF (Ejecutivas) — 2 Imgs" :
               "PASS (Ansiedad Perinatal) — 2 Imgs"}
            </button>
          ))}
        </div>

        {/* Zonas de subida */}
        <div className="space-y-4">
          {/* Archivo 1 */}
          <FileDropZone
            label={
              tipoTest === "AUDIT"
                ? "Fotografía del Test AUDIT"
                : tipoTest === "BRIEF"
                ? "Página 1 (Ítems 1 al 38 y Datos del Paciente)"
                : "Página 1 (Ítems 1-18 y Cabecera de la Paciente)"
            }
            archivo={archivo1}
            preview={preview1}
            accentColor={tipoTest === "PASS" ? "fuchsia" : "blue"}
            onChange={handleArchivo1Change}
          />

          {/* Archivo 2 (sólo BRIEF o PASS) */}
          {necesita2Imagenes && (
            <FileDropZone
              label={
                tipoTest === "BRIEF"
                  ? "Página 2 (Ítems 39 al 75)"
                  : "Página 2 (Ítems 19-31 y Puntuación Global)"
              }
              archivo={archivo2}
              preview={preview2}
              accentColor={tipoTest === "PASS" ? "fuchsia" : "indigo"}
              onChange={handleArchivo2Change}
            />
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={deshabilitado}
          className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm"
        >
          {cargando ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{etapaCarga || "Procesando imágenes con IA..."}</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Analizar y Calificar con Gemini Flash</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

// ── Subcomponente FileDropZone ─────────────────────────────────────
const FileDropZone: React.FC<{
  label: string;
  archivo: File | null;
  preview: string | null;
  accentColor: string;
  onChange: (file: File | null) => void;
}> = ({ label, archivo, preview, accentColor, onChange }) => {
  const borderHover = accentColor === "fuchsia" ? "hover:border-fuchsia-400" : accentColor === "indigo" ? "hover:border-indigo-400" : "hover:border-blue-400";
  const iconColor = accentColor === "fuchsia" ? "text-fuchsia-600" : accentColor === "indigo" ? "text-indigo-600" : "text-blue-600";

  return (
    <div className={`p-4 rounded-xl border-2 border-dashed border-slate-300 ${borderHover} bg-slate-50 transition`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <label className={`text-xs font-bold text-slate-700 flex items-center gap-1.5`}>
          <FileText className={`w-4 h-4 ${iconColor}`} />
          {label}
        </label>
        {archivo && (
          <button type="button" onClick={() => onChange(null)}
            className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 self-start sm:self-auto">
            <X className="w-3.5 h-3.5" /> Quitar imagen
          </button>
        )}
      </div>

      {preview ? (
        <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
          <img src={preview} alt="Preview" className="w-16 h-20 object-cover rounded border border-slate-200" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-slate-800">{archivo?.name}</p>
            <p className="text-slate-500">{((archivo?.size || 0) / 1024).toFixed(1)} KB</p>
            <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
              Listo para analizar
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-600 font-medium">Toca para tomar foto o seleccionar archivo</p>
          <input
            type="file" accept="image/*" capture="environment"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
            className="mt-3 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
