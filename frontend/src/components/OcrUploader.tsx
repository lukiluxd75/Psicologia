import React, { useState } from "react";
import { Camera, Images, X, AlertCircle, FileText, FileCheck, Image as ImageIcon } from "lucide-react";

type TipoTest = "AUDIT" | "BRIEF" | "PASS" | "PSICOSOCIAL";

const ETIQUETA_TEST: Record<TipoTest, string> = {
  AUDIT: "1 foto",
  BRIEF: "2 fotos",
  PASS: "2 fotos",
  PSICOSOCIAL: "Gestantes · 1 a 8",
};

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
    setEtapaCarga("Enviando las fotos…");
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

      setEtapaCarga("Leyendo las respuestas de las hojas…");
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
        msg = "No se pudo conectar con el servidor. Revisa tu conexión a internet y vuelve a intentarlo; las fotos siguen seleccionadas.";
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
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Calificar un test desde fotos</h2>
        <p className="text-xs text-slate-500 mt-1">
          Fotografía las hojas respondidas o sube el escaneo (imagen o PDF). La app lee las respuestas, calcula los puntajes y guarda el resultado en el historial.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selector de Test con 4 opciones */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["AUDIT", "BRIEF", "PASS", "PSICOSOCIAL"] as TipoTest[]).map((tipo) => {
            const activo = tipoTest === tipo;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => cambiarTipo(tipo)}
                aria-pressed={activo}
                className={`min-h-11 py-2 px-3 rounded-xl border text-center transition flex flex-col items-center justify-center leading-tight ${
                  activo
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="text-sm font-semibold">{tipo}</span>
                <span className={`text-xs ${activo ? "text-blue-100" : "text-slate-500"}`}>
                  {ETIQUETA_TEST[tipo]}
                </span>
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
                onChange={handleArchivo2Change}
              />
            )}
          </div>
        ) : (
          /* Subida dinámica de 1 a 8 páginas para PSICOSOCIAL */
          <div className="space-y-4">
            <div className="p-3 sm:p-4 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-400 bg-blue-50/40 transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Hojas del Cuestionario PSICOSOCIAL (1 a 8 páginas o PDF)
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Puedes tomar fotos de las páginas (datos sociodemográficos y escalas Likert) o subir el documento escaneado completo.
                  </p>
                </div>
                {archivosPsicosocial.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 self-start sm:self-auto">
                    {archivosPsicosocial.length} de 8 páginas
                  </span>
                )}
              </div>

              {/* Botón de selección múltiple */}
              {archivosPsicosocial.length < 8 && (
                <div className="pt-3 border-t border-blue-100 mt-3">
                  <SelectorArchivo
                    multiple
                    accept="image/*,application/pdf"
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
                    <span className="text-xs text-blue-600 font-semibold">
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
                            <span className="text-xs font-bold mt-0.5">PDF</span>
                          </div>
                        ) : (
                          <div className="w-14 h-16 bg-slate-100 text-slate-500 rounded border border-slate-200 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 text-xs">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            Página {idx + 1}
                          </span>
                          <p className="font-semibold text-slate-800 truncate mt-1">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuitarArchivoPsicosocial(idx)}
                          title="Quitar esta página" aria-label="Quitar esta página"
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
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
          className="w-full py-3.5 sm:py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm"
        >
          {cargando ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{etapaCarga || "Leyendo las hojas…"}</span>
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4" />
              <span>Calificar test</span>
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
  onChange: (file: File | null) => void;
}> = ({ label, archivo, preview, onChange }) => {
  return (
    <div className="p-3 sm:p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 transition">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
          {label}
        </p>
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
            alt={`Vista previa: ${label}`}
            width={64}
            height={80}
            className="w-16 h-20 object-cover rounded border border-slate-200 shrink-0"
          />
          <div className="text-xs space-y-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{archivo?.name}</p>
            <p className="text-slate-500">
              {((archivo?.size || 0) / 1024).toFixed(1)} KB
            </p>
            <span className="inline-block text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
              Listo para analizar
            </span>
          </div>
        </div>
      ) : (
        <div className="pt-1">
          <SelectorArchivo
            accept="image/*"
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
const SelectorArchivo: React.FC<{
  accept: string;
  multiple?: boolean;
  onFiles: (files: FileList | null) => void;
}> = ({ accept, multiple, onFiles }) => {
  const manejar = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiles(e.target.files);
    // Permite volver a elegir el mismo archivo después de quitarlo
    e.target.value = "";
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex items-center justify-center gap-2 min-h-12 px-3 rounded-xl text-white text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-600">
        <Camera className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span>Tomar foto</span>
        <input type="file" accept="image/*" capture="environment" onChange={manejar} className="sr-only" />
      </label>
      <label className="flex items-center justify-center gap-2 min-h-12 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold transition hover:bg-slate-50 active:bg-slate-100 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-600">
        <Images className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span>{accept.includes("pdf") ? "Galería / PDF" : "Galería"}</span>
        <input type="file" accept={accept} multiple={multiple} onChange={manejar} className="sr-only" />
      </label>
    </div>
  );
};
