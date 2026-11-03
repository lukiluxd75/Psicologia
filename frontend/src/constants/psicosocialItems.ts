export interface DimensionMeta {
  id: string;
  titulo: string;
  maximo: number;
  itemsRango: string;
  items: number[];
  color: string;
  colorBorder: string;
  colorText: string;
  colorBgLight: string;
}

export const PSICOSOCIAL_DIMENSIONES_META: Record<string, DimensionMeta> = {
  relacion_pareja: {
    id: "relacion_pareja",
    titulo: "A. Relación de Pareja",
    maximo: 30,
    itemsRango: "11 al 16",
    items: [11, 12, 13, 14, 15, 16],
    color: "bg-rose-500",
    colorBorder: "border-rose-200",
    colorText: "text-rose-600",
    colorBgLight: "bg-rose-50",
  },
  apoyo_familiar: {
    id: "apoyo_familiar",
    titulo: "B. Apoyo y Relaciones Familiares",
    maximo: 30,
    itemsRango: "17 al 22",
    items: [17, 18, 19, 20, 21, 22],
    color: "bg-indigo-500",
    colorBorder: "border-indigo-200",
    colorText: "text-indigo-600",
    colorBgLight: "bg-indigo-50",
  },
  red_apoyo_social: {
    id: "red_apoyo_social",
    titulo: "C. Amistades y Red de Apoyo Social",
    maximo: 25,
    itemsRango: "23 al 27",
    items: [23, 24, 25, 26, 27],
    color: "bg-teal-500",
    colorBorder: "border-teal-200",
    colorText: "text-teal-600",
    colorBgLight: "bg-teal-50",
  },
  integracion_entorno: {
    id: "integracion_entorno",
    titulo: "D. Participación e Integración en el Entorno",
    maximo: 25,
    itemsRango: "28 al 32",
    items: [28, 29, 30, 31, 32],
    color: "bg-amber-500",
    colorBorder: "border-amber-200",
    colorText: "text-amber-600",
    colorBgLight: "bg-amber-50",
  },
  situacion_economica: {
    id: "situacion_economica",
    titulo: "E. Situación Económica",
    maximo: 25,
    itemsRango: "33 al 37",
    items: [33, 34, 35, 36, 37],
    color: "bg-emerald-500",
    colorBorder: "border-emerald-200",
    colorText: "text-emerald-600",
    colorBgLight: "bg-emerald-50",
  },
  vivencia_embarazo: {
    id: "vivencia_embarazo",
    titulo: "G. Planificación y Vivencia del Embarazo",
    maximo: 25,
    itemsRango: "43 al 47",
    items: [43, 44, 45, 46, 47],
    color: "bg-purple-500",
    colorBorder: "border-purple-200",
    colorText: "text-purple-600",
    colorBgLight: "bg-purple-50",
  },
};

export const ETIQUETAS_LIKERT_PSICOSOCIAL: Record<number, string> = {
  1: "Nunca",
  2: "Casi nunca",
  3: "Algunas veces",
  4: "Casi siempre",
  5: "Siempre",
};

export function getNivelBadgeClass(nivel: string): string {
  switch (nivel) {
    case "Muy bajo":
      return "bg-rose-100 text-rose-800 border-rose-300";
    case "Bajo":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "Moderado":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "Alto":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "Muy alto":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    default:
      return "bg-slate-100 text-slate-800 border-slate-300";
  }
}
