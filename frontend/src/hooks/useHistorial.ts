import { useState, useEffect, useCallback } from "react";
import type { AuditResultData } from "../components/AuditResultView";
import type { BriefResultData } from "../components/BriefResultView";
import type { PassResultData } from "../components/PassResultView";
import type { PsicosocialResultData } from "../components/PsicosocialResultView";

export interface HistorialEntryAudit extends AuditResultData {
  id: string;
  fecha: string;
  tipo: "AUDIT";
}

export interface HistorialEntryBrief extends BriefResultData {
  id: string;
  fecha: string;
  tipo: "BRIEF";
}

export interface HistorialEntryPass extends PassResultData {
  id: string;
  fechaRegistro: string;
  tipo: "PASS";
}

export interface HistorialEntryPsicosocial extends PsicosocialResultData {
  id: string;
  fechaRegistro: string;
  tipo: "PSICOSOCIAL";
}

export type HistorialEntry =
  | HistorialEntryAudit
  | HistorialEntryBrief
  | HistorialEntryPass
  | HistorialEntryPsicosocial;

export const STORAGE_KEYS = {
  AUDIT: "historial_audit",
  BRIEF: "historial_brief",
  PASS: "historial_pass",
  PSICOSOCIAL: "historial_psicosocial",
} as const;

const STORAGE_KEY_AUDIT = STORAGE_KEYS.AUDIT;
const STORAGE_KEY_BRIEF = STORAGE_KEYS.BRIEF;
const STORAGE_KEY_PASS = STORAGE_KEYS.PASS;
const STORAGE_KEY_PSICOSOCIAL = STORAGE_KEYS.PSICOSOCIAL;

function cargarDesdeStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function guardarEnStorage<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

export function useHistorial() {
  const [historialAudit, setHistorialAudit] = useState<HistorialEntryAudit[]>(
    () => cargarDesdeStorage<HistorialEntryAudit>(STORAGE_KEY_AUDIT)
  );
  const [historialBrief, setHistorialBrief] = useState<HistorialEntryBrief[]>(
    () => cargarDesdeStorage<HistorialEntryBrief>(STORAGE_KEY_BRIEF)
  );
  const [historialPass, setHistorialPass] = useState<HistorialEntryPass[]>(
    () => cargarDesdeStorage<HistorialEntryPass>(STORAGE_KEY_PASS)
  );
  const [historialPsicosocial, setHistorialPsicosocial] = useState<
    HistorialEntryPsicosocial[]
  >(() =>
    cargarDesdeStorage<HistorialEntryPsicosocial>(STORAGE_KEY_PSICOSOCIAL)
  );

  useEffect(() => {
    guardarEnStorage(STORAGE_KEY_AUDIT, historialAudit);
  }, [historialAudit]);

  useEffect(() => {
    guardarEnStorage(STORAGE_KEY_BRIEF, historialBrief);
  }, [historialBrief]);

  useEffect(() => {
    guardarEnStorage(STORAGE_KEY_PASS, historialPass);
  }, [historialPass]);

  useEffect(() => {
    guardarEnStorage(STORAGE_KEY_PSICOSOCIAL, historialPsicosocial);
  }, [historialPsicosocial]);

  // Si el historial cambia en otra pestaña (p. ej. el envío automático a Sheets), reflejarlo aquí
  // para no pisar esos cambios con datos viejos.
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === STORAGE_KEY_AUDIT) setHistorialAudit(cargarDesdeStorage(STORAGE_KEY_AUDIT));
      else if (ev.key === STORAGE_KEY_BRIEF) setHistorialBrief(cargarDesdeStorage(STORAGE_KEY_BRIEF));
      else if (ev.key === STORAGE_KEY_PASS) setHistorialPass(cargarDesdeStorage(STORAGE_KEY_PASS));
      else if (ev.key === STORAGE_KEY_PSICOSOCIAL)
        setHistorialPsicosocial(cargarDesdeStorage(STORAGE_KEY_PSICOSOCIAL));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const agregarAudit = useCallback((resultado: AuditResultData) => {
    const entry: HistorialEntryAudit = {
      ...resultado,
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      tipo: "AUDIT",
    };
    setHistorialAudit((prev) => [entry, ...prev]);
  }, []);

  const agregarBrief = useCallback((resultado: BriefResultData) => {
    const entry: HistorialEntryBrief = {
      ...resultado,
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      tipo: "BRIEF",
    };
    setHistorialBrief((prev) => [entry, ...prev]);
  }, []);

  const agregarPass = useCallback((resultado: PassResultData) => {
    const entry: HistorialEntryPass = {
      ...resultado,
      id: crypto.randomUUID(),
      fechaRegistro: new Date().toISOString(),
      tipo: "PASS",
    };
    setHistorialPass((prev) => [entry, ...prev]);
  }, []);

  const agregarPsicosocial = useCallback(
    (resultado: PsicosocialResultData) => {
      const entry: HistorialEntryPsicosocial = {
        ...resultado,
        id: crypto.randomUUID(),
        fechaRegistro: new Date().toISOString(),
        tipo: "PSICOSOCIAL",
      };
      setHistorialPsicosocial((prev) => [entry, ...prev]);
    },
    []
  );

  const eliminarAudit = useCallback((id: string) => {
    setHistorialAudit((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const eliminarBrief = useCallback((id: string) => {
    setHistorialBrief((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const eliminarPass = useCallback((id: string) => {
    setHistorialPass((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const eliminarPsicosocial = useCallback((id: string) => {
    setHistorialPsicosocial((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const marcarSincronizados = useCallback(
    (tipo: "AUDIT" | "BRIEF" | "PASS" | "PSICOSOCIAL", ids: string[]) => {
      const set = new Set(ids);
      const marcar = <T extends { id: string; guardado_en_sheets?: boolean }>(prev: T[]) =>
        prev.map((e) => (set.has(e.id) ? { ...e, guardado_en_sheets: true } : e));
      if (tipo === "AUDIT") setHistorialAudit(marcar);
      else if (tipo === "BRIEF") setHistorialBrief(marcar);
      else if (tipo === "PASS") setHistorialPass(marcar);
      else setHistorialPsicosocial(marcar);
    },
    []
  );

  const limpiarAudit = useCallback(() => setHistorialAudit([]), []);
  const limpiarBrief = useCallback(() => setHistorialBrief([]), []);
  const limpiarPass = useCallback(() => setHistorialPass([]), []);
  const limpiarPsicosocial = useCallback(
    () => setHistorialPsicosocial([]),
    []
  );

  return {
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
  };
}
