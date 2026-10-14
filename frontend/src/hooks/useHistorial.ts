import { useState, useEffect, useCallback } from "react";
import type { AuditResultData } from "../components/AuditResultView";
import type { BriefResultData } from "../components/BriefResultView";
import type { PassResultData } from "../components/PassResultView";

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

const STORAGE_KEY_AUDIT = "historial_audit";
const STORAGE_KEY_BRIEF = "historial_brief";
const STORAGE_KEY_PASS = "historial_pass";

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

  useEffect(() => {
    guardarEnStorage(STORAGE_KEY_AUDIT, historialAudit);
  }, [historialAudit]);

  useEffect(() => {
    guardarEnStorage(STORAGE_KEY_BRIEF, historialBrief);
  }, [historialBrief]);

  useEffect(() => {
    guardarEnStorage(STORAGE_KEY_PASS, historialPass);
  }, [historialPass]);

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

  const eliminarAudit = useCallback((id: string) => {
    setHistorialAudit((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const eliminarBrief = useCallback((id: string) => {
    setHistorialBrief((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const eliminarPass = useCallback((id: string) => {
    setHistorialPass((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const limpiarAudit = useCallback(() => setHistorialAudit([]), []);
  const limpiarBrief = useCallback(() => setHistorialBrief([]), []);
  const limpiarPass = useCallback(() => setHistorialPass([]), []);

  return {
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
  };
}
