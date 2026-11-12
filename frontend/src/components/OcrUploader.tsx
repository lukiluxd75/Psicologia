import React, { useState } from "react";
import { Camera, Images, X, AlertCircle, FileText, FileCheck, Image as ImageIcon } from "lucide-react";

type TipoTest = "AUDIT" | "BRIEF" | "PASS" | "PSICOSOCIAL";

interface OcrUploaderProps {
  onResultadoAudit: (res: any) => void;
  onResultadoBrief: (res: any) => void;
  onResultadoPass: (res: any) => void;
  onResultadoPsicosocial: (res: any) => void;
}

export const OcrUploader: React.FC<OcrUploaderProps> = ({
  onResultadoAudit,
  onResultadoBrief,
  onResultadoPass,
  onResultadoPsicosocial,
}) => {
  const [tipoTest, setTipoTest] = useState<TipoTest>("AUDIT");
  const [archivo1, setArchivo1] = useState<File | null>(null);
  const [archivo2, setArchivo2] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);

  // Estado para subida múltiple del test PSICOSOCIAL (de 1 a 8 páginas o PDF)
  const [archivosPsicosocial, setArchivosPsicosocial] = useState<File[]>([]);
  const [previewsPsicosocial, setPreviewsPsicosocial] = useState<string[]>([]);

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

  const handleAgregarArchivosPsicosocial = (filesNuevos: FileList | null) => {
    if (!filesNuevos || filesNuevos.length === 0) return;
    const arrayNuevos = Array.from(filesNuevos);
    const combinados = [...archivosPsicosocial, ...arrayNuevos].slice(0, 8);
    setArchivosPsicosocial(combinados);

    const nuevasPreviews = combinados.map((f) => {
      if (f.type.startsWith("image/")) {
        return URL.createObjectURL(f);
      }
      return "";
    });
    setPreviewsPsicosocial(nuevasPreviews);
    setError("");
  };

  const handleQuitarArchivoPsicosocial = (indice: number) => {
    const nuevosArchivos = archivosPsicosocial.filter((_, i) => i !== indice);
    setArchivosPsicosocial(nuevosArchivos);
    const nuevasPreviews = nuevosArchivos.map((f) => {
      if (f.type.startsWith("image/")) {
        return URL.createObjectURL(f);
      }
      return "";
    });
    setPreviewsPsicosocial(nuevasPreviews);
  };

  const cambiarTipo = (tipo: TipoTest) => {
    setTipoTest(tipo);
    handleArchivo1Change(null);
    handleArchivo2Change(null);
    setArchivosPsicosocial([]);
    setPreviewsPsicosocial([]);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (tipoTest === "PSICOSOCIAL") {
      if (archivosPsicosocial.length === 0) {
        setError("Debes seleccionar o fotografiar al menos una página del cuestionario PSICOSOCIAL.");
        return;
      }
    } else {
      if (!archivo1) {
        setError("Debes seleccionar al menos la primera fotografía.");
        return;
      }
      if ((tipoTest === "BRIEF" || tipoTest === "PASS") && !archivo2) {
        setError(`El test ${tipoTest} requiere exactamente 2 fotografías (Página 1 y Página 2).`);
        return;
      }
    }

    setCargando(true);
    setEtapaCarga("Subiendo archivo(s) al backend...");
    try {
      const formData = new FormData();
      const apiBase = import.meta.env.VITE_API_URL || "";
      let url = "";

      if (tipoTest === "AUDIT") {
        formData.append("file", archivo1!);
        url = `${apiBase}/api/upload/audit`;
      } else if (tipoTest === "BRIEF") {
        formData.append("files", archivo1!);
        formData.append("files", archivo2!);
        url = `${apiBase}/api/upload/brief`;
      } else if (tipoTest === "PASS") {
        formData.append("files", archivo1!);
        formData.append("files", archivo2!);
        url = `${apiBase}/api/upload/pass`;
      } else {
        // PSICOSOCIAL: lista dinámica de 1 a 8 archivos
        for (const arch of archivosPsicosocial) {
          formData.append("files", arch);
        }
        url = `${apiBase}/api/upload/psicosocial`;
      }

      setEtapaCarga("Google Gemini Flash analizando y extrayendo respuestas...");
      const response = await fetch(url, { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || errorData?.error || `Error ${response.status}`);
      }
      setEtapaCarga("Calculando dimensiones y puntajes...");
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (tipoTest === "AUDIT") onResultadoAudit(data);
      else if (tipoTest === "BRIEF") onResultadoBrief(data);
      else if (tipoTest === "PASS") onResultadoPass(data);
      else onResultadoPsicosocial(data);
    } catch (err: any) {
      let msg = err.message || "Ocurrió un error al procesar el cuestionario.";
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
  const deshabilitado =
    cargando ||
    (tipoTest === "PSICOSOCIAL"
      ? archivosPsicosocial.length === 0
      : !archivo1 || (necesita2Imagenes && !archivo2));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Escaneo de Hojas Físicas con IA</h2>
        <p className="text-xs text-slate-500 mt-1">
          Toma fotografías con la cámara o sube documentos escaneados (imágenes o PDF). Google Gemini Flash extraerá las respuestas y el backend calculará los puntajes automáticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selector de Test con 4 opciones */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["AUDIT", "BRIEF", "PASS", "PSICOSOCIAL"] as TipoTest[]).map((tipo) => {
            const activo = tipoTest === tipo;
            let label: string;
            let activeColor = "bg-blue-600 text-white border-blue-600";

            if (tipo === "AUDIT") {
              label = "AUDIT (1 Img)";
            } else if (tipo === "BRIEF") {
              label = "BRIEF (2 Imgs)";
              activeColor = "bg-indigo-600 text-white border-indigo-600";
            } else if (tipo === "PASS") {
              label = "PASS (2 Imgs)";
              activeColor = "bg-fuchsia-600 text-white border-fuchsia-600";
            } else {
              label = "🤰 PSICOSOCIAL (Gestantes)";
              activeColor = "bg-purple-600 text-white border-purple-600";
            }

            return (
              <button
                key={tipo}
                type="button"
                onClick={() => cambiarTipo(tipo)}
                className={`min-h-11 py-2.5 px-3 rounded-xl border font-semibold text-xs transition text-center ${
                  activo
                    ? `${activeColor} shadow-sm`
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Zonas de subida según el test seleccionado */}
        {tipoTest !== "PSICOSOCIAL" ? (
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
        ) : (
          /* Subida dinámica de 1 a 8 páginas para PSICOSOCIAL */
          <div className="space-y-4">
            <div className="p-3 sm:p-4 rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-400 bg-purple-50/40 transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Hojas del Cuestionario PSICOSOCIAL (1 a 8 páginas o PDF)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Puedes tomar fotos de las páginas (datos sociodemográficos y escalas Likert) o subir el documento escaneado completo.
                  </p>
                </div>
                {archivosPsicosocial.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 self-start sm:self-auto">
                    {archivosPsicosocial.length} de 8 páginas
                  </span>
                )}
              </div>

              {/* Botón de selección múltiple */}
              {archivosPsicosocial.length < 8 && (
                <div className="pt-3 border-t border-purple-100 mt-3">
                  <SelectorArchivo
                    multiple
                    accept="image/*,application/pdf"
                    color="purple"
                    onFiles={handleAgregarArchivosPsicosocial}
                  />
                </div>
              )}
            </div>

            {/* Galería de páginas añadidas */}
            {archivosPsicosocial.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>Páginas seleccionadas ({archivosPsicosocial.length}):</span>
                  {archivosPsicosocial.length < 8 && (
                    <span className="text-[11px] text-purple-600 font-semibold">
                      Puedes agregar hasta {8 - archivosPsicosocial.length} página(s) más
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {archivosPsicosocial.map((file, idx) => {
                    const prev = previewsPsicosocial[idx];
                    const esPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

                    return (
                      <div
                        key={`${file.name}-${idx}`}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 relative group"
                      >
                        {prev ? (
                          <img
                            src={prev}
                            alt={`Página ${idx + 1}`}
                            className="w-14 h-16 object-cover rounded border border-slate-200 shrink-0"
                          />
                        ) : esPdf ? (
                          <div className="w-14 h-16 bg-red-50 text-red-600 rounded border border-red-200 flex flex-col items-center justify-center shrink-0">
                            <FileText className="w-6 h-6" />
                            <span className="text-[9px] font-bold mt-0.5">PDF</span>
                          </div>
                        ) : (
                          <div className="w-14 h-16 bg-slate-100 text-slate-500 rounded border border-slate-200 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 text-xs">
                          <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            Página {idx + 1}
                          </span>
                          <p className="font-semibold text-slate-800 truncate mt-1">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuitarArchivoPsicosocial(idx)}
                          title="Quitar esta página"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={deshabilitado}
          className={`w-full py-3.5 sm:py-3 px-4 rounded-xl font-bold text-white shadow-md disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm ${
            tipoTest === "PSICOSOCIAL"
              ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
              : tipoTest === "PASS"
              ? "bg-fuchsia-600 hover:bg-fuchsia-700 shadow-fuchsia-500/20"
              : tipoTest === "BRIEF"
              ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
          }`}
        >
          {cargando ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{etapaCarga || "Procesando documentos con IA..."}</span>
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4" />
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
  const borderHover =
    accentColor === "fuchsia"
      ? "hover:border-fuchsia-400"
      : accentColor === "indigo"
      ? "hover:border-indigo-400"
      : "hover:border-blue-400";
  const iconColor =
    accentColor === "fuchsia"
      ? "text-fuchsia-600"
      : accentColor === "indigo"
      ? "text-indigo-600"
      : "text-blue-600";

  return (
    <div
      className={`p-3 sm:p-4 rounded-xl border-2 border-dashed border-slate-300 ${borderHover} bg-slate-50 transition`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <label className={`text-xs font-bold text-slate-700 flex items-center gap-1.5`}>
          <FileText className={`w-4 h-4 ${iconColor}`} />
          {label}
        </label>
        {archivo && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 self-start sm:self-auto py-1.5 -my-1.5"
          >
            <X className="w-3.5 h-3.5" /> Quitar imagen
          </button>
        )}
      </div>

      {preview ? (
        <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
          <img
            src={preview}
            alt="Preview"
            className="w-16 h-20 object-cover rounded border border-slate-200 shrink-0"
          />
          <div className="text-xs space-y-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{archivo?.name}</p>
            <p className="text-slate-500">
              {((archivo?.size || 0) / 1024).toFixed(1)} KB
            </p>
            <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
              Listo para analizar
            </span>
          </div>
        </div>
      ) : (
        <div className="pt-1">
          <SelectorArchivo
            accept="image/*"
            color={accentColor}
            onFiles={(files) => onChange(files?.[0] || null)}
          />
        </div>
      )}
    </div>
  );
};

// ── Botones "Tomar foto" / "Galería" ───────────────────────────────
// En muchos Android, un input con `capture` abre solo la cámara y no deja elegir de la galería,
// por eso se ofrecen dos entradas separadas.
const COLORES_BOTON: Record<string, string> = {
  blue: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
  indigo: "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800",
  fuchsia: "bg-fuchsia-600 hover:bg-fuchsia-700 active:bg-fuchsia-800",
  purple: "bg-purple-600 hover:bg-purple-700 active:bg-purple-800",
};

const SelectorArchivo: React.FC<{
  accept: string;
  multiple?: boolean;
  color: string;
  onFiles: (files: FileList | null) => void;
}> = ({ accept, multiple, color, onFiles }) => {
  const manejar = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiles(e.target.files);
    // Permite volver a elegir el mismo archivo después de quitarlo
    e.target.value = "";
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <label
        className={`flex items-center justify-center gap-2 min-h-12 px-3 rounded-xl text-white text-sm font-semibold cursor-pointer transition focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-slate-400 ${
          COLORES_BOTON[color] || COLORES_BOTON.blue
        }`}
      >
        <Camera className="w-5 h-5 shrink-0" />
        <span>Tomar foto</span>
        <input type="file" accept="image/*" capture="environment" onChange={manejar} className="sr-only" />
      </label>
      <label className="flex items-center justify-center gap-2 min-h-12 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold cursor-pointer transition hover:bg-slate-50 active:bg-slate-100 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-slate-400">
        <Images className="w-5 h-5 shrink-0" />
        <span>{accept.includes("pdf") ? "Galería / PDF" : "Galería"}</span>
        <input type="file" accept={accept} multiple={multiple} onChange={manejar} className="sr-only" />
      </label>
    </div>
  );
};
