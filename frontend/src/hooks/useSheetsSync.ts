import { useCallback, useRef, useState } from "react";
import { filaDeEntrada, type TipoTest } from "../lib/jamovi";
import { STORAGE_KEYS, type HistorialEntry } from "./useHistorial";

const TIPOS: TipoTest[] = ["AUDIT", "BRIEF", "PASS", "PSICOSOCIAL"];
const LOCK_NAME = "psicometric-sheets-sync";

export interface EstadoSync {
  enviando: boolean;
  ultimoEnvio: Date | null;
  error: string | null;
}

export interface ResultadoSync {
  /** Filas nuevas escritas en la hoja. */
  enviados: number;
  /** Registros que ya estaban en la hoja y no se repitieron. */
  omitidos: number;
  error: string | null;
}

type MarcarSincronizados = (tipo: TipoTest, ids: string[]) => void;

function leerStorage(tipo: TipoTest): HistorialEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[tipo]);
    return raw ? (JSON.parse(raw) as HistorialEntry[]) : [];
  } catch {
    return [];
  }
}

function marcarEnStorage(tipo: TipoTest, ids: Set<string>) {
  try {
    const lista = leerStorage(tipo).map((e) => (ids.has(e.id) ? { ...e, guardado_en_sheets: true } : e));
    localStorage.setItem(STORAGE_KEYS[tipo], JSON.stringify(lista));
  } catch {
    // sin storage disponible: el estado de React se actualiza igual
  }
}

export function pendientesDe(tipo: TipoTest, lista: HistorialEntry[]) {
  return lista
    .filter((e) => e.guardado_en_sheets !== true)
    .map((e) => ({ id: e.id, fila: filaDeEntrada(tipo, e) }))
    .filter((p): p is { id: string; fila: Record<string, unknown> } => p.fila !== null);
}

/**
 * Lock compartido entre pestañas del mismo navegador, para que dos pestañas abiertas
 * no envíen los mismos registros a la vez. Si otra pestaña ya está enviando, se omite.
 */
async function conLock<T>(fn: () => Promise<T>): Promise<T | null> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(LOCK_NAME, { ifAvailable: true }, (lock) => (lock ? fn() : null));
  }
  return fn();
}

/**
 * Envía a Google Sheets los resultados del historial local que aún no están guardados allí.
 * Solo se envía cuando el usuario pulsa el botón (cabecera o Historial).
 * El servidor descarta los registros que ya están en la hoja, así que reenviar no duplica filas.
 */
export function useSheetsSync(marcarSincronizados: MarcarSincronizados) {
  const [estado, setEstado] = useState<EstadoSync>({ enviando: false, ultimoEnvio: null, error: null });
  const enCurso = useRef(false);

  const sincronizar = useCallback(
    async (tipos: TipoTest[] = TIPOS): Promise<ResultadoSync> => {
      if (enCurso.current) return { enviados: 0, omitidos: 0, error: null };
      enCurso.current = true;

      const apiBase = import.meta.env.VITE_API_URL || "";
      let enviados = 0;
      let omitidos = 0;
      let error: string | null = null;

      try {
        await conLock(async () => {
          for (const tipo of tipos) {
            // Se lee de localStorage (no del estado) para ver lo que otras pestañas ya marcaron.
            const pendientes = pendientesDe(tipo, leerStorage(tipo));
            if (pendientes.length === 0) continue;
            setEstado((s) => (s.enviando ? s : { ...s, enviando: true }));
            try {
              const res = await fetch(`${apiBase}/api/sheets/sync/${tipo}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registros: pendientes.map((p) => p.fila) }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
              const ids = pendientes.map((p) => p.id);
              marcarEnStorage(tipo, new Set(ids));
              marcarSincronizados(tipo, ids);
              enviados += typeof data.guardados === "number" ? data.guardados : ids.length;
              omitidos += typeof data.omitidos === "number" ? data.omitidos : 0;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              error = msg.includes("Failed to fetch") || msg.includes("NetworkError") ? "Sin conexión con el servidor" : msg;
            }
          }
        });
      } finally {
        enCurso.current = false;
        setEstado((s) => ({
          enviando: false,
          ultimoEnvio: error ? s.ultimoEnvio : new Date(),
          error,
        }));
      }
      return { enviados, omitidos, error };
    },
    [marcarSincronizados]
  );

  return { estado, sincronizar };
}
