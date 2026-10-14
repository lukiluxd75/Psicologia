// Datos y preguntas para AUDIT y BRIEF

export interface PreguntaAudit {
  id: number;
  texto: string;
  opciones: { valor: number; etiqueta: string }[];
}

export const PREGUNTAS_AUDIT: PreguntaAudit[] = [
  {
    id: 1,
    texto: "¿Con qué frecuencia consume alguna bebida alcohólica?",
    opciones: [
      { valor: 0, etiqueta: "Nunca" },
      { valor: 1, etiqueta: "Una o menos veces al mes" },
      { valor: 2, etiqueta: "De 2 a 4 veces al mes" },
      { valor: 3, etiqueta: "De 2 a 3 veces por semana" },
      { valor: 4, etiqueta: "4 o más veces por semana" },
    ],
  },
  {
    id: 2,
    texto: "¿Cuántas consumiciones de bebidas alcohólicas suele realizar en un día de consumo normal?",
    opciones: [
      { valor: 0, etiqueta: "1 ó 2" },
      { valor: 1, etiqueta: "3 ó 4" },
      { valor: 2, etiqueta: "5 ó 6" },
      { valor: 3, etiqueta: "De 7 a 9" },
      { valor: 4, etiqueta: "10 o más" },
    ],
  },
  {
    id: 3,
    texto: "¿Con qué frecuencia toma 6 o más bebidas alcohólicas en un solo día?",
    opciones: [
      { valor: 0, etiqueta: "Nunca" },
      { valor: 1, etiqueta: "Menos de una vez al mes" },
      { valor: 2, etiqueta: "Mensualmente" },
      { valor: 3, etiqueta: "Semanalmente" },
      { valor: 4, etiqueta: "A diario o casi a diario" },
    ],
  },
  {
    id: 4,
    texto: "¿Con qué frecuencia en el curso del último año ha sido incapaz de parar de beber una vez había empezado?",
    opciones: [
      { valor: 0, etiqueta: "Nunca" },
      { valor: 1, etiqueta: "Menos de una vez al mes" },
      { valor: 2, etiqueta: "Mensualmente" },
      { valor: 3, etiqueta: "Semanalmente" },
      { valor: 4, etiqueta: "A diario o casi a diario" },
    ],
  },
  {
    id: 5,
    texto: "¿Con qué frecuencia en el último año no pudo hacer lo que se esperaba de usted porque había bebido?",
    opciones: [
      { valor: 0, etiqueta: "Nunca" },
      { valor: 1, etiqueta: "Menos de una vez al mes" },
      { valor: 2, etiqueta: "Mensualmente" },
      { valor: 3, etiqueta: "Semanalmente" },
      { valor: 4, etiqueta: "A diario o casi a diario" },
    ],
  },
  {
    id: 6,
    texto: "¿Con qué frecuencia en el último año ha necesitado beber en ayunas para recuperarse después de haber bebido mucho?",
    opciones: [
      { valor: 0, etiqueta: "Nunca" },
      { valor: 1, etiqueta: "Menos de una vez al mes" },
      { valor: 2, etiqueta: "Mensualmente" },
      { valor: 3, etiqueta: "Semanalmente" },
      { valor: 4, etiqueta: "A diario o casi a diario" },
    ],
  },
  {
    id: 7,
    texto: "¿Con qué frecuencia en el último año ha tenido remordimientos o sentimientos de culpa después de haber bebido?",
    opciones: [
      { valor: 0, etiqueta: "Nunca" },
      { valor: 1, etiqueta: "Menos de una vez al mes" },
      { valor: 2, etiqueta: "Mensualmente" },
      { valor: 3, etiqueta: "Semanalmente" },
      { valor: 4, etiqueta: "A diario o casi a diario" },
    ],
  },
  {
    id: 8,
    texto: "¿Con qué frecuencia en el último año no ha podido recordar lo que sucedió la noche anterior porque había estado bebiendo?",
    opciones: [
      { valor: 0, etiqueta: "Nunca" },
      { valor: 1, etiqueta: "Menos de una vez al mes" },
      { valor: 2, etiqueta: "Mensualmente" },
      { valor: 3, etiqueta: "Semanalmente" },
      { valor: 4, etiqueta: "A diario o casi a diario" },
    ],
  },
  {
    id: 9,
    texto: "¿Usted o alguna otra persona ha resultado herido porque usted había bebido?",
    opciones: [
      { valor: 0, etiqueta: "No" },
      { valor: 2, etiqueta: "Sí, pero no en el último año" },
      { valor: 4, etiqueta: "Sí, el último año" },
    ],
  },
  {
    id: 10,
    texto: "¿Algún familiar, amigo, médico o profesional se ha preocupado por su consumo o le ha sugerido que deje de beber?",
    opciones: [
      { valor: 0, etiqueta: "No" },
      { valor: 2, etiqueta: "Sí, pero no en el último año" },
      { valor: 4, etiqueta: "Sí, el último año" },
    ],
  },
];

export const BRIEF_ESCALAS_METADATA: Record<string, { titulo: string; descripcion: string; color: string }> = {
  inhibicion: {
    titulo: "Inhibición",
    descripcion: "Control de impulsos y capacidad para frenar conductas inapropiadas.",
    color: "bg-red-500",
  },
  flexibilidad: {
    titulo: "Flexibilidad",
    descripcion: "Capacidad para adaptarse a cambios e imprevistos.",
    color: "bg-orange-500",
  },
  control_emocional: {
    titulo: "Control Emocional",
    descripcion: "Regulación de respuestas afectivas y tolerancia a la frustración.",
    color: "bg-amber-500",
  },
  automonitoreo: {
    titulo: "Automonitoreo",
    descripcion: "Consciencia del propio comportamiento y su impacto en los demás.",
    color: "bg-yellow-500",
  },
  iniciativa: {
    titulo: "Iniciativa",
    descripcion: "Comenzar tareas de forma autónoma y generar ideas.",
    color: "bg-emerald-500",
  },
  memoria_trabajo: {
    titulo: "Memoria de Trabajo",
    descripcion: "Retener y manipular información mental para resolver tareas.",
    color: "bg-teal-500",
  },
  planificacion_organizacion: {
    titulo: "Planificación y Organización",
    descripcion: "Anticipar metas, establecer pasos lógicos y priorizar.",
    color: "bg-blue-500",
  },
  monitoreo_tareas: {
    titulo: "Monitoreo de Tareas",
    descripcion: "Seguimiento y verificación del propio desempeño en tareas.",
    color: "bg-indigo-500",
  },
  organizacion_materiales: {
    titulo: "Organización de Materiales",
    descripcion: "Orden en el espacio de trabajo y cuidado de pertenencias.",
    color: "bg-purple-500",
  },
};

// Ítems de los indicadores de validez (para resaltar visualmente en el frontend)
// Negatividad: ítems donde el recuadro [3] indica alerta si marca F
// Infrecuencia: ítems 10, 27, 38, 48, 59 (control de validez, no pertenecen a escalas clínicas)
export const ITEMS_VALIDEZ_BRIEF = [
  1, 8, 19, 21, 22, 23, 29, 36, 39, 40, // Negatividad (N)
  10, 27, 38, 48, 59, // Infrecuencia (F)
];

// Perfiles típicos para pruebas interactivas de AUDIT
export const PERFILES_AUDIT_DEMO = [
  {
    nombre: "Bajo Riesgo (Hombre)",
    paciente: "Lucas Martínez",
    edad: 26,
    genero: "M",
    respuestas: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0], // Total: 2
    esperado: "Consumo de bajo riesgo",
  },
  {
    nombre: "Consumo de Riesgo (Mujer)",
    paciente: "Camila Rojas",
    edad: 24,
    genero: "F",
    respuestas: [2, 2, 1, 1, 0, 0, 0, 0, 0, 0], // Total: 6
    esperado: "Consumo de riesgo",
  },
  {
    nombre: "Consumo de Riesgo (Hombre)",
    paciente: "Mateo Silva",
    edad: 35,
    genero: "M",
    respuestas: [3, 2, 2, 1, 1, 1, 0, 1, 0, 0], // Total: 11
    esperado: "Consumo de riesgo",
  },
  {
    nombre: "Posible Dependencia",
    paciente: "Roberto Valenzuela",
    edad: 42,
    genero: "M",
    respuestas: [4, 4, 3, 2, 2, 2, 2, 2, 2, 2], // Total: 25
    esperado: "Posible dependencia",
  },
];

// Perfiles típicos para pruebas de BRIEF
// Puntaje directo: N=1 (bajo), A=2 (medio), F=3 (alto). Sin inversión.
export const PERFILES_BRIEF_DEMO = [
  {
    nombre: "Perfil Equilibrado (Sin alertas)",
    paciente: "Sofía Navarro",
    edad: 29,
    genero: "F",
    // Todo en 1 (Nunca) = puntajes bajos en todas las escalas
    generarRespuestas: () => {
      return Array(75).fill(1);
    },
    descripcion: "Paciente con bajo reporte de dificultades ejecutivas y sin banderas de inconsistencia.",
  },
  {
    nombre: "Alerta Negatividad (N >= 3)",
    paciente: "Diego Fernández",
    edad: 31,
    genero: "M",
    // Marcamos F=3 en varios ítems de Negatividad para activar la alerta
    generarRespuestas: () => {
      const resp = Array(75).fill(2);
      // Ítems de N marcados como 3 (F=Frecuentemente) -> activa negatividad
      const itemsN = [1, 8, 19, 21, 22];
      itemsN.forEach((idx) => {
        resp[idx - 1] = 3;
      });
      return resp;
    },
    descripcion: "Simula un sesgo de negatividad severo que activa la alerta para entrevista clínica.",
  },
  {
    nombre: "Alerta Infrecuencia (F >= 2)",
    paciente: "Valentina Morales",
    edad: 27,
    genero: "F",
    // Activar infrecuencia: ítems 10, 38 con valor 3; ítems 27, 48 con valor 1
    generarRespuestas: () => {
      const resp = Array(75).fill(2);
      // Ítems 10 y 38 se activan con F=3
      resp[10 - 1] = 3;
      resp[38 - 1] = 3;
      // Ítems 27 y 48 se activan con N=1 (diciendo "nunca" a cosas que todos hacen)
      resp[27 - 1] = 1;
      resp[48 - 1] = 1;
      return resp;
    },
    descripcion: "Simula respuestas con alta infrecuencia activando alerta_entrevista.",
  },
  {
    nombre: "Dificultades Ejecutivas Severas",
    paciente: "Esteban Castro",
    edad: 38,
    genero: "M",
    // Todo en 3 (Frecuentemente) = puntajes máximos en todas las escalas
    generarRespuestas: () => {
      return Array(75).fill(3);
    },
    descripcion: "Elevación generalizada en todas las escalas ejecutivas.",
  },
];
