# Seguimiento de la auditoría 001 (2026-11-12)

El usuario aprobó todos los puntos (1 a 14). Para los que dependían de una dirección de diseño se usó esta lectura:

> Reading this as: herramienta clínica para psicólogas que califican tests en consulta, lenguaje sobrio y clínico, dial ENERGY 1 / RHYTHM 1 / MOTION 1.

| # | Regla | Estado | Qué se hizo |
|---|---|---|---|
| 1 | R-39 | Arreglado | Regla base en `index.css`: `cursor: pointer` en botones, `label` y `select`; `not-allowed` en los deshabilitados; estado activo al presionar; anillo de foco azul visible. |
| 2 | R-25 | Arreglado | Los 22 `text-slate-400` pasaron a `text-slate-500` (4.8:1 sobre blanco). |
| 3 | R-02 | Arreglado, con 1 excepción aprobada | Títulos con dos puntos y campos vacíos con "Sin dato". Queda la raya larga de las celdas vacías de las tablas APA (`JamoviAnalyticsView.tsx:131`), porque APA 7 la exige en tablas. El usuario decidió mantenerla. |
| 4 | R-27 | Arreglado | El error de conexión dice: "No se pudo conectar con el servidor. Revisa tu conexión a internet y vuelve a intentarlo; las fotos siguen seleccionadas." |
| 5 | R-39, R-19 | Arreglado | El punto de "En línea" ya no late, y hay una regla global para `prefers-reduced-motion`. |
| 6 | R-23 | Aprobado por el usuario | Se mantiene el ícono de cerebro sobre fondo azul liso, sin degradado ni sombra. El usuario confirmó que se queda así. |
| 7 | R-37 | Arreglado | Se aplicó la lectura sobria y clínica de arriba. |
| 8 | R-04 | Arreglado | Se quitaron todos los emojis decorativos. Las alertas clínicas usan `AlertTriangle`/`ShieldAlert`, el estado de la configuración es un punto ámbar con texto, y los íconos de la ficha psicosocial son grises (los destellos se cambiaron por `CalendarCheck`). |
| 9 | R-01 | Arreglado | Logo y barra psicosocial en azul sólido. |
| 10 | R-12 | Arreglado | Se quitaron las sombras de color y la `shadow-md` del botón principal. |
| 11 | R-06 | Arreglado | Las etiquetas de 9 a 11 px pasaron a 12 px, y se quitaron `uppercase` y el espaciado de letras. |
| 12 | R-09 | Arreglado | Se quitó el badge "v2.0". |
| 13 | R-29 | Arreglado | Un solo color de marca (azul). Los tests se distinguen por su nombre, y las escalas y subescalas van en azul. El verde, ámbar y rojo quedan solo para la severidad y las alertas. |
| 14 | R-16, C-3 | Arreglado | Textos: "Calificar test", "Leyendo las respuestas de las hojas…", "Escanear test", "Estadísticas" y "En línea"; pie de página sin la lista de tecnologías. |

Además, durante la verificación se encontró y arregló un desborde horizontal de 135 px en Estadísticas en el celular cuando hay datos: la tabla APA estaba dentro de un grid sin `min-w-0`.

## Delivery Gate

- R-02 PASS con excepción aprobada: la raya larga de las celdas vacías de las tablas APA se mantiene por decisión del usuario.
- R-03 PASS: a 390 px, scrollWidth = clientWidth en Escanear, Historial (con los 4 resultados expandidos) y Estadísticas con datos.
- R-17, R-18, R-36, R-38 PASS: todos los números vienen del cálculo real de los tests. No hay testimonios ni afirmaciones.
- R-23 PASS: el usuario confirmó el logo actual.
- R-24, R-26 PASS: las 3 pestañas tienen destino, y "Ver resultado completo" expande cada uno de los 4 tests.
- R-25 PASS: el texto más claro que queda es `slate-500` sobre blanco (4.8:1).
- R-27 PASS: Historial y Estadísticas tienen estados vacío, de carga y de error, y el error de conexión del escaneo explica qué hacer.
- R-32, R-39 PASS: `cursor: pointer` medido en el navegador, anillo de foco, `aria-label` en los botones con solo ícono, `alt` en las vistas previas, un `h1`, `lang="es"` y zoom permitido.
- R-35 PASS: compilación y recorrido en Edge sin errores de consola. El recorrido fue: precarga de un resultado de cada test, Escanear, cambio de test a PSICOSOCIAL, Historial, PASS ▸ ver, BRIEF ▸ ver, PSICOSOCIAL ▸ ver, AUDIT ▸ ver, Estadísticas y vista de escritorio. Sheets estuvo interceptado y no se envió nada al real.
- R-40 PASS: las vistas previas tienen `width` y `height`.
- Liveliness: dial 1/1/1 declarado. El foco por pantalla es el botón principal o el puntaje. El único acento es el azul de marca, y el semáforo de severidad tiene función clínica.
