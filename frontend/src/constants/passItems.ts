export interface PassItemMeta {
  numero: number;
  texto: string;
  escala: 1 | 2 | 3 | 4;
  nombreEscala: string;
  indicadorRiesgo: string;
  esIndicadorFobia?: boolean;
}

export const PASS_ITEMS: PassItemMeta[] = [
  // Escala 1: Preocupación Excesiva y Miedos Específicos (1-10)
  { numero: 1, texto: "Preocupación por el bebé/embarazo", escala: 1, nombreEscala: "Preocupación Excesiva y Miedos Específicos", indicadorRiesgo: "Ansiedad generalizada o específica" },
  { numero: 2, texto: "Miedo a que algo lastime a mi bebé", escala: 1, nombreEscala: "Preocupación Excesiva y Miedos Específicos", indicadorRiesgo: "Ansiedad generalizada, miedos específicos" },
  { numero: 3, texto: "Sensación de terror de que algo malo va a pasar", escala: 1, nombreEscala: "Preocupación Excesiva y Miedos Específicos", indicadorRiesgo: "Ansiedad generalizada, pánico" },
  { numero: 4, texto: "Preocupación por muchas cosas", escala: 1, nombreEscala: "Preocupación Excesiva y Miedos Específicos", indicadorRiesgo: "Ansiedad generalizada" },
  { numero: 5, texto: "Preocupación por el futuro", escala: 1, nombreEscala: "Preocupación Excesiva y Miedos Específicos", indicadorRiesgo: "Ansiedad generalizada" },
  { numero: 6, texto: "Sentirme abrumada", escala: 1, nombreEscala: "Preocupación Excesiva y Miedos Específicos", indicadorRiesgo: "Ansiedad generalizada, pánico" },
  { numero: 7, texto: "Miedos muy fuertes sobre ciertas cosas. Por ejemplo; agujas, sangre, al parto, al dolor, etc.", escala: 1, nombreEscala: "Preocupación Excesiva y Miedos Específicos", indicadorRiesgo: "Fobia (Indicador clínico individual)", esIndicadorFobia: true },
  { numero: 8, texto: "Sensaciones repentinas de miedo o incomodidad extremos", escala: 1, nombreEscala: "Preocupación Excesiva y Miedos Específicos", indicadorRiesgo: "Fobia, pánico" },
  { numero: 9, texto: "Pensamientos repetitivos que son difíciles de detener o controlar", escala: 1, nombreEscala: "Preocupación Excesiva y Miedos Específicos", indicadorRiesgo: "Ansiedad generalizada, obsesivo" },
  { numero: 10, texto: "Dificultad para dormir incluso cuando tengo la oportunidad de hacerlo", escala: 1, nombreEscala: "Preocupación Excesiva y Miedos Específicos", indicadorRiesgo: "Síntoma de ansiedad general, ajuste, ansiedad generalizada" },

  // Escala 2: Perfeccionismo, Control y Trauma (11-18)
  { numero: 11, texto: "Tener que hacer las cosas de cierta forma u orden", escala: 2, nombreEscala: "Perfeccionismo, Control y Trauma", indicadorRiesgo: "Perfeccionismo, obsesivo compulsivo" },
  { numero: 12, texto: "Querer que las cosas sean perfectas", escala: 2, nombreEscala: "Perfeccionismo, Control y Trauma", indicadorRiesgo: "Perfeccionismo, obsesivo" },
  { numero: 13, texto: "Necesidad de controlar las cosas", escala: 2, nombreEscala: "Perfeccionismo, Control y Trauma", indicadorRiesgo: "Perfeccionismo, obsesión, trauma" },
  { numero: 14, texto: "Dificultad para dejar de revisar o hacer las cosas una y otra vez", escala: 2, nombreEscala: "Perfeccionismo, Control y Trauma", indicadorRiesgo: "Obsesivo, compulsiones" },
  { numero: 15, texto: "Sentirme nerviosa o fácilmente asustada", escala: 2, nombreEscala: "Perfeccionismo, Control y Trauma", indicadorRiesgo: "Trauma" },
  { numero: 16, texto: "Preocupaciones sobre ideas repetitivas", escala: 2, nombreEscala: "Perfeccionismo, Control y Trauma", indicadorRiesgo: "Trauma, Tendencias obsesivas" },
  { numero: 17, texto: "Estar \"alerta\" o necesitar estar al pendiente de las cosas", escala: 2, nombreEscala: "Perfeccionismo, Control y Trauma", indicadorRiesgo: "Trauma" },
  { numero: 18, texto: "Alterada por recuerdos, sueños o pesadillas repetitivas", escala: 2, nombreEscala: "Perfeccionismo, Control y Trauma", indicadorRiesgo: "Trauma" },

  // Escala 3: Ansiedad Social (19-23)
  { numero: 19, texto: "Preocupación de que voy a pasar vergüenza delante de los demás", escala: 3, nombreEscala: "Ansiedad Social", indicadorRiesgo: "Social-interpersonal" },
  { numero: 20, texto: "Temor de que los otros me juzguen negativamente", escala: 3, nombreEscala: "Ansiedad Social", indicadorRiesgo: "Social-interpersonal" },
  { numero: 21, texto: "Sentirme muy incómoda entre multitudes", escala: 3, nombreEscala: "Ansiedad Social", indicadorRiesgo: "Social-interpersonal, miedos específicos" },
  { numero: 22, texto: "Evitar actividades sociales porque me podría poner nerviosa", escala: 3, nombreEscala: "Ansiedad Social", indicadorRiesgo: "Social-interpersonal" },
  { numero: 23, texto: "Evitar cosas que me inquieten", escala: 3, nombreEscala: "Ansiedad Social", indicadorRiesgo: "Síntoma de ansiedad general, fobia" },

  // Escala 4: Ansiedad Aguda y Ajuste (24-31)
  { numero: 24, texto: "Sensación de distanciamiento como si me estuviera viendo a mí misma en una película", escala: 4, nombreEscala: "Ansiedad Aguda y Ajuste", indicadorRiesgo: "Disociación, trauma, pánico" },
  { numero: 25, texto: "Pierdo la noción del tiempo y no recuerdo lo que pasó", escala: 4, nombreEscala: "Ansiedad Aguda y Ajuste", indicadorRiesgo: "Disociación, trauma, pánico" },
  { numero: 26, texto: "Dificultad para adaptarse a cambios", escala: 4, nombreEscala: "Ansiedad Aguda y Ajuste", indicadorRiesgo: "Ajuste" },
  { numero: 27, texto: "Ansiedad que me dificulta la capacidad para hacer cosas", escala: 4, nombreEscala: "Ansiedad Aguda y Ajuste", indicadorRiesgo: "Adaptación, síntoma general de ansiedad" },
  { numero: 28, texto: "Pensamientos acelerados que hacen difícil concentrarme", escala: 4, nombreEscala: "Ansiedad Aguda y Ajuste", indicadorRiesgo: "Pánico" },
  { numero: 29, texto: "Miedo a perder el control", escala: 4, nombreEscala: "Ansiedad Aguda y Ajuste", indicadorRiesgo: "Síntoma de ansiedad general, pánico" },
  { numero: 30, texto: "Sentirme con pánico", escala: 4, nombreEscala: "Ansiedad Aguda y Ajuste", indicadorRiesgo: "Pánico" },
  { numero: 31, texto: "Sentirme con agitación", escala: 4, nombreEscala: "Ansiedad Aguda y Ajuste", indicadorRiesgo: "Pánico, adaptación, ansiedad generalizada" },
];

export const ETIQUETAS_PASS = ["Nunca", "Algunas veces", "A menudo", "Casi siempre"];

export const PASS_ESCALAS_META = {
  escala_1_preocupacion_miedos: {
    clave: "escala_1_preocupacion_miedos",
    titulo: "Preocupación Excesiva y Miedos Específicos",
    maximo: 30,
    color: "bg-blue-500",
    colorBorder: "border-blue-200",
    colorBg: "bg-blue-50",
    colorText: "text-blue-800",
    items: "1 – 10",
    rangoIndices: [0, 10] as [number, number],
  },
  escala_2_perfeccionismo_trauma: {
    clave: "escala_2_perfeccionismo_trauma",
    titulo: "Perfeccionismo, Control y Trauma",
    maximo: 24,
    color: "bg-violet-500",
    colorBorder: "border-violet-200",
    colorBg: "bg-violet-50",
    colorText: "text-violet-800",
    items: "11 – 18",
    rangoIndices: [10, 18] as [number, number],
  },
  escala_3_ansiedad_social: {
    clave: "escala_3_ansiedad_social",
    titulo: "Ansiedad Social",
    maximo: 15,
    color: "bg-amber-500",
    colorBorder: "border-amber-200",
    colorBg: "bg-amber-50",
    colorText: "text-amber-800",
    items: "19 – 23",
    rangoIndices: [18, 23] as [number, number],
  },
  escala_4_ansiedad_aguda_ajuste: {
    clave: "escala_4_ansiedad_aguda_ajuste",
    titulo: "Ansiedad Aguda y Ajuste",
    maximo: 24,
    color: "bg-rose-500",
    colorBorder: "border-rose-200",
    colorBg: "bg-rose-50",
    colorText: "text-rose-800",
    items: "24 – 31",
    rangoIndices: [23, 31] as [number, number],
  },
};

// Perfiles clínicos predeterminados para el simulador
export const PERFILES_PASS_DEMO = [
  {
    nombre: "Caso Real Calibrado (Faran Miranda)",
    nombre_paciente: "Faran Miranda",
    edad: 21,
    ocupacion: "Estudiante, Música",
    etapa_perinatal: "Prenatal",
    semanas_embarazo: 31,
    edad_bebe: 0,
    fecha: "28/09/26",
    respuestas: [2, 3, 3, 0, 3, 1, 3, 1, 1, 3, 3, 1, 2, 0, 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    descripcion: "Total 32 pts (Escala 1=20, Escala 2=12), Alto riesgo, Síntomas leves-moderados, Alerta Fobia Ítem 7 activa.",
  },
  {
    nombre: "Perfil Asintomático (Bajo Riesgo)",
    nombre_paciente: "Ana García",
    edad: 28,
    ocupacion: "Maestra",
    etapa_perinatal: "Prenatal",
    semanas_embarazo: 20,
    edad_bebe: 0,
    fecha: "12/10/26",
    // 12 puntos: doce 1s, resto 0s (ítem 7 = 1, sin fobia)
    respuestas: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    descripcion: "Total 12 pts (≤ 20), Asintomático, Bajo riesgo.",
  },
  {
    nombre: "Perfil Leve-Moderado sin Riesgo Clínico",
    nombre_paciente: "Lucía Pérez",
    edad: 33,
    ocupacion: "Contadora",
    etapa_perinatal: "Posnatal",
    semanas_embarazo: 0,
    edad_bebe: 3,
    fecha: "05/10/26",
    // 23 puntos: veintitrés 1s, resto 0s (ítem 7 = 1, total 23 < 26)
    respuestas: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    descripcion: "Total 23 pts (21 a 25), Síntomas leves-moderados pero < 26 Bajo riesgo.",
  },
  {
    nombre: "Perfil Ansiedad Severa",
    nombre_paciente: "María López",
    edad: 25,
    ocupacion: "Diseñadora",
    etapa_perinatal: "Prenatal",
    semanas_embarazo: 36,
    edad_bebe: 0,
    fecha: "01/10/26",
    // 58 puntos: diecinueve 3s (57) + un 1 (1) + once 0s = 58 pts (≥ 42)
    respuestas: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    descripcion: "Total 58 pts (≥ 42), Síntomas severos, Alto riesgo.",
  },
];
