import { copiarHtml } from "./apa";

/* Avisos flotantes ("Copiado", "Revisa tu carpeta Descargas"...). Se lanzan con avisar() desde cualquier parte. */

export type Tipo = "ok" | "error";
export interface Aviso {
  id: number;
  tipo: Tipo;
  titulo: string;
  detalle?: string;
}

let siguienteId = 1;
export const oyentes = new Set<(a: Aviso) => void>();

export function avisar(titulo: string, detalle?: string, tipo: Tipo = "ok") {
  const aviso = { id: siguienteId++, tipo, titulo, detalle };
  oyentes.forEach((o) => o(aviso));
}

export const avisarError = (titulo: string, detalle?: string) => avisar(titulo, detalle, "error");

export const MSJ_DESCARGA =
  "Revisa tu carpeta Descargas o el icono de descargas (↓) arriba a la derecha del navegador. Si no aparece, el navegador puede estar bloqueando descargas: usa mejor el botón Copiar.";


/** Copia HTML + texto plano y avisa del resultado. Devuelve si se copió. */
export async function copiarConAviso(html: string, texto: string, titulo: string, detalle: string): Promise<boolean> {
  try {
    await copiarHtml(html, texto);
    avisar(titulo, detalle);
    return true;
  } catch {
    avisarError(
      "No se pudo copiar",
      "El navegador bloqueó el portapapeles. Selecciona el texto con el ratón y usa Ctrl+C, o abre la app desde http://localhost."
    );
    return false;
  }
}

/** Aviso tras pulsar "Enviar a Sheets". */
export function avisarResultadoSync(r: { enviados: number; omitidos: number; error: string | null }) {
  if (r.error) {
    avisarError("No se pudo enviar a Google Sheets", `${r.error}. Los resultados siguen guardados en este equipo: vuelve a pulsar Enviar.`);
    return;
  }
  if (r.enviados === 0 && r.omitidos === 0) {
    avisar("No hay nada pendiente", "Todos los resultados de este equipo ya están en Google Sheets.");
    return;
  }
  const partes = [];
  if (r.enviados) partes.push(`${r.enviados} resultado(s) nuevo(s) guardado(s)`);
  if (r.omitidos) partes.push(`${r.omitidos} ya estaba(n) en la hoja y no se repitió/repitieron`);
  avisar("Enviado a Google Sheets", `${partes.join("; ")}.`);
}
