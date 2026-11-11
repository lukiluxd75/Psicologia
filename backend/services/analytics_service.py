"""
Estadística descriptiva estilo Jamovi y exportación de datasets codificados para Jamovi Desktop.

Las filas de entrada son diccionarios con las cabeceras de Google Sheets como claves
(ver *_HEADERS en sheets_service). La búsqueda de columnas tolera diferencias de
tildes, mayúsculas y espacios en las cabeceras.
"""
import csv
import io
import math
import re
import statistics
import os
import tempfile
import unicodedata
from typing import Any

from services.scoring_service import INTERPRETACIONES_PSICOSOCIAL, MAPEO_ESCALAS, MAPEO_PASS
from services.sheets_service import ITEMS_POR_TEST, cabecera_item

TESTS_SOPORTADOS = ("AUDIT", "BRIEF", "PASS", "PSICOSOCIAL")

# El OCR y los formularios guardan 0 cuando el dato no se leyó o no aplica
# (p. ej. semanas de embarazo en etapa posnatal): se tratan como perdidos.
CERO_ES_PERDIDO = {"edad", "semanas_embarazo", "semanas_gestacion"}

NIVELES_PSICOSOCIAL = ["Muy bajo", "Bajo", "Moderado", "Alto", "Muy alto"]
CODIGOS_NIVEL = {n: i + 1 for i, n in enumerate(NIVELES_PSICOSOCIAL)}

# Cada variable: (cabecera en Sheets, nombre snake_case, etiqueta visible, mínimo teórico, máximo teórico)
# Para categóricas: (cabecera, snake, etiqueta, orden_preferido, codificación {categoria: código} | None)
ESQUEMAS: dict[str, dict[str, Any]] = {
    "AUDIT": {
        "numericas": [
            ("Edad", "edad", "Edad", None, None),
            ("Puntaje Total", "puntaje_total", "Puntaje Total AUDIT", 0, 40),
        ],
        "categoricas": [
            ("Género", "genero", "Género", ["Masculino", "Femenino"], {"Masculino": 1, "Femenino": 2}),
            ("Diagnóstico", "diagnostico", "Diagnóstico",
             ["Consumo de bajo riesgo", "Consumo de riesgo", "Posible dependencia"],
             {"Consumo de bajo riesgo": 1, "Consumo de riesgo": 2, "Posible dependencia": 3}),
        ],
        "escalas_boxplot": ["puntaje_total"],
        "puntaje_global": "puntaje_total",
        "categorica_principal": "diagnostico",
        "cortes": [
            {"valor": 4, "etiqueta": "Riesgo (M ≥ 4)"},
            {"valor": 5, "etiqueta": "Riesgo (H ≥ 5)"},
            {"valor": 16, "etiqueta": "Dependencia (≥ 16)"},
        ],
    },
    "BRIEF": {
        "numericas": [
            ("Edad", "edad", "Edad", None, None),
            ("Inhibición", "inhibicion", "Inhibición", 8, 24),
            ("Flexibilidad", "flexibilidad", "Flexibilidad", 6, 18),
            ("Control Emocional", "control_emocional", "Control Emocional", 10, 30),
            ("Automonitoreo", "automonitoreo", "Automonitoreo", 6, 18),
            ("Iniciativa", "iniciativa", "Iniciativa", 8, 24),
            ("Memoria de Trabajo", "memoria_trabajo", "Memoria de Trabajo", 8, 24),
            ("Planificación/Organización", "planificacion_organizacion", "Planificación/Organización", 10, 30),
            ("Monitoreo de Tareas", "monitoreo_tareas", "Monitoreo de Tareas", 6, 18),
            ("Organización de Materiales", "organizacion_materiales", "Organización de Materiales", 8, 24),
            # Las 9 escalas suman 70 ítems: 10, 27, 38, 48 y 59 solo cuentan para validez
            ("Subtotal (1-38)", "subtotal_1_38", "Subtotal (1–38)", 35, 105),
            ("Subtotal (39-75)", "subtotal_39_75", "Subtotal (39–75)", 35, 105),
            ("Total General", "total_general", "Total General", 70, 210),
        ],
        "categoricas": [
            ("Género", "genero", "Género", ["Masculino", "Femenino"], {"Masculino": 1, "Femenino": 2}),
            ("Alerta Entrevista", "alerta_entrevista", "Alerta Entrevista", ["NO", "SÍ"], {"NO": 0, "SÍ": 1}),
        ],
        "escalas_boxplot": [
            "inhibicion", "flexibilidad", "control_emocional", "automonitoreo", "iniciativa",
            "memoria_trabajo", "planificacion_organizacion", "monitoreo_tareas", "organizacion_materiales",
        ],
        "puntaje_global": "total_general",
        "categorica_principal": "alerta_entrevista",
        "cortes": [],
    },
    "PASS": {
        "numericas": [
            ("Edad", "edad", "Edad", None, None),
            ("Semanas Embarazo", "semanas_embarazo", "Semanas de Embarazo", None, None),
            ("Edad Bebé", "edad_bebe", "Edad del Bebé", None, None),
            ("Escala 1: Preocupación y Miedos (0-30)", "escala_1_preocupacion_miedos", "E1. Preocupación y Miedos", 0, 30),
            ("Escala 2: Perfeccionismo y Trauma (0-24)", "escala_2_perfeccionismo_trauma", "E2. Perfeccionismo y Trauma", 0, 24),
            ("Escala 3: Ansiedad Social (0-15)", "escala_3_ansiedad_social", "E3. Ansiedad Social", 0, 15),
            ("Escala 4: Ansiedad Aguda y Ajuste (0-24)", "escala_4_ansiedad_aguda_ajuste", "E4. Ansiedad Aguda y Ajuste", 0, 24),
            ("Puntaje Global (0-93)", "puntaje_global", "Puntaje Global PASS", 0, 93),
        ],
        "categoricas": [
            ("Ocupación", "ocupacion", "Ocupación", None, None),
            ("Etapa Perinatal", "etapa_perinatal", "Etapa Perinatal", ["Prenatal", "Posnatal"], {"Prenatal": 1, "Posnatal": 2}),
            ("Severidad", "severidad", "Severidad",
             ["Asintomático", "Síntomas leves-moderados", "Síntomas severos"],
             {"Asintomático": 1, "Síntomas leves-moderados": 2, "Síntomas severos": 3}),
            ("Nivel de Riesgo (Corte 26)", "nivel_riesgo", "Nivel de Riesgo (corte 26)",
             ["Bajo riesgo", "Alto riesgo"], {"Bajo riesgo": 0, "Alto riesgo": 1}),
            ("Alerta Fobia (Ítem 7)", "alerta_fobia_item7", "Alerta Fobia (ítem 7)", ["NO", "SÍ"], {"NO": 0, "SÍ": 1}),
        ],
        "escalas_boxplot": [
            "escala_1_preocupacion_miedos", "escala_2_perfeccionismo_trauma",
            "escala_3_ansiedad_social", "escala_4_ansiedad_aguda_ajuste",
        ],
        "puntaje_global": "puntaje_global",
        "categorica_principal": "nivel_riesgo",
        "cortes": [
            {"valor": 21, "etiqueta": "Leve-moderado (≥ 21)"},
            {"valor": 26, "etiqueta": "Riesgo (≥ 26)"},
            {"valor": 42, "etiqueta": "Severo (≥ 42)"},
        ],
    },
    "PSICOSOCIAL": {
        "numericas": [
            ("Edad", "edad", "Edad", None, None),
            ("Semanas Gestación", "semanas_gestacion", "Semanas de Gestación", None, None),
            ("A. Relación Pareja (6-30)", "relacion_pareja", "A. Relación de Pareja", 6, 30),
            ("B. Apoyo Familiar (6-30)", "apoyo_familiar", "B. Apoyo Familiar", 6, 30),
            ("C. Red Apoyo Social (5-25)", "red_apoyo_social", "C. Red de Apoyo Social", 5, 25),
            ("D. Integración Entorno (5-25)", "integracion_entorno", "D. Integración en el Entorno", 5, 25),
            ("E. Situación Económica (5-25)", "situacion_economica", "E. Situación Económica", 5, 25),
            ("G. Vivencia Embarazo (5-25)", "vivencia_embarazo", "G. Vivencia del Embarazo", 5, 25),
            ("Puntaje Global (32-160)", "puntaje_global", "Puntaje Global", 32, 160),
        ],
        "categoricas": [
            ("Ocupación", "ocupacion", "Ocupación", None, None),
            ("Grado Instrucción", "grado_instruccion", "Grado de Instrucción", None, None),
            ("Estado Civil", "estado_civil", "Estado Civil", None, None),
            ("Zona Vivienda", "zona_vivienda", "Zona de Vivienda", None, None),
            ("Hijos Anteriores", "hijos_anteriores", "Hijos Anteriores", None, None),
            ("Recibe Subsidio", "recibe_subsidio", "Recibe Subsidio", None, None),
            ("Embarazo Planificado", "embarazo_planificado", "Embarazo Planificado", None, None),
            ("Pérdida Significativa", "perdida_significativa", "Pérdida Significativa", None, None),
            ("Nivel Pareja", "nivel_pareja", "Nivel Relación de Pareja", NIVELES_PSICOSOCIAL, CODIGOS_NIVEL),
            ("Nivel Familia", "nivel_familia", "Nivel Apoyo Familiar", NIVELES_PSICOSOCIAL, CODIGOS_NIVEL),
            ("Nivel Red Social", "nivel_red_social", "Nivel Red de Apoyo Social", NIVELES_PSICOSOCIAL, CODIGOS_NIVEL),
            ("Nivel Entorno", "nivel_entorno", "Nivel Integración Entorno", NIVELES_PSICOSOCIAL, CODIGOS_NIVEL),
            ("Nivel Economía", "nivel_economia", "Nivel Situación Económica", NIVELES_PSICOSOCIAL, CODIGOS_NIVEL),
            ("Nivel Vivencia", "nivel_vivencia", "Nivel Vivencia del Embarazo", NIVELES_PSICOSOCIAL, CODIGOS_NIVEL),
        ],
        "escalas_boxplot": [
            "relacion_pareja", "apoyo_familiar", "red_apoyo_social",
            "integracion_entorno", "situacion_economica", "vivencia_embarazo",
        ],
        "puntaje_global": "puntaje_global",
        "categorica_principal": "nivel_pareja",
        "cortes": [],
    },
}


ETIQUETAS_BRIEF = {snake: etiqueta for _, snake, etiqueta, *_ in ESQUEMAS["BRIEF"]["numericas"]}
ETIQUETAS_PASS = {snake: etiqueta for _, snake, etiqueta, *_ in ESQUEMAS["PASS"]["numericas"]}

# (clave, etiqueta, ítems) para el alfa de Cronbach, en el orden en que se muestran
ESCALAS_FIABILIDAD: dict[str, list[tuple[str, str, list[int]]]] = {
    "AUDIT": [("total", "AUDIT total", ITEMS_POR_TEST["AUDIT"])],
    "BRIEF": [(k, ETIQUETAS_BRIEF[k], items) for k, items in MAPEO_ESCALAS.items()]
    + [("total", "Total (70 ítems clínicos)", sorted(i for items in MAPEO_ESCALAS.values() for i in items))],
    "PASS": [(k, ETIQUETAS_PASS[k], items) for k, items in MAPEO_PASS.items()]
    + [("total", "PASS total", ITEMS_POR_TEST["PASS"])],
    "PSICOSOCIAL": [(k, cfg["titulo"], cfg["items"]) for k, cfg in INTERPRETACIONES_PSICOSOCIAL.items()]
    + [("total", "Puntaje global", ITEMS_POR_TEST["PSICOSOCIAL"])],
}


def nombre_item(numero: int) -> str:
    return f"item_{numero:02d}"


# ---------------------------------------------------------------------------
# Utilidades de normalización
# ---------------------------------------------------------------------------

def _clave(texto: str) -> str:
    """'Género ' -> 'genero'; 'Subtotal (1-38)' -> 'subtotal138'."""
    sin_tildes = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", sin_tildes.lower())


def _valor_columna(fila: dict, cabecera: str) -> Any:
    if cabecera in fila:
        return fila[cabecera]
    objetivo = _clave(cabecera)
    for k, v in fila.items():
        if _clave(k) == objetivo:
            return v
    return None


def _a_numero(valor: Any) -> float | None:
    if valor is None or isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float)):
        return None if math.isnan(valor) else float(valor)
    texto = str(valor).strip().replace(",", ".")
    if not texto:
        return None
    try:
        num = float(texto)
        return None if math.isnan(num) else num
    except ValueError:
        return None


def _normalizar_categoria(snake: str, valor: Any) -> str | None:
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto:
        return None
    k = _clave(texto)

    if snake == "genero":
        if k in ("m", "masculino", "hombre", "varon"):
            return "Masculino"
        if k in ("f", "femenino", "mujer"):
            return "Femenino"
        return texto

    if snake in ("alerta_entrevista", "alerta_fobia_item7"):
        # Sheets guarda 'SÍ (Pts: 2)' / 'NO (Pts: 0)' en PASS
        if k.startswith("si") or k == "true":
            return "SÍ"
        if k.startswith("no") or k == "false":
            return "NO"
        return texto

    if snake.startswith("nivel_") and snake != "nivel_riesgo":
        for n in NIVELES_PSICOSOCIAL:
            if _clave(n) == k:
                return n
        return texto

    if snake == "etapa_perinatal":
        if k.startswith("pre"):
            return "Prenatal"
        if k.startswith("pos") or k.startswith("post"):
            return "Posnatal"
        return texto

    # Ajustar al texto canónico del esquema si coincide salvo tildes/mayúsculas
    for esquema in ESQUEMAS.values():
        for _, s, _, orden, _ in esquema["categoricas"]:
            if s == snake and orden:
                for opcion in orden:
                    if _clave(opcion) == k:
                        return opcion
    return texto


def _item7_puntaje(valor: Any) -> float | None:
    m = re.search(r"(\d+)", str(valor or ""))
    return float(m.group(1)) if m else None


# ---------------------------------------------------------------------------
# Estadística
# ---------------------------------------------------------------------------

def _cuantil(ordenados: list[float], p: float) -> float:
    """Cuantil tipo 7 de R (el que usa Jamovi por defecto)."""
    n = len(ordenados)
    if n == 1:
        return ordenados[0]
    h = (n - 1) * p
    lo = math.floor(h)
    hi = min(lo + 1, n - 1)
    return ordenados[lo] + (h - lo) * (ordenados[hi] - ordenados[lo])


def calcular_descriptivas_variable(
    valores: list,
    nombre: str,
    maximo_teorico: float | None = None,
    etiqueta: str | None = None,
    minimo_teorico: float | None = None,
) -> dict:
    validos = [v for v in (_a_numero(x) for x in valores) if v is not None]
    n = len(validos)
    base = {
        "variable": nombre,
        "etiqueta": etiqueta or nombre,
        "n": n,
        "perdidos": len(valores) - n,
        "minimo_teorico": minimo_teorico,
        "maximo_teorico": maximo_teorico,
    }
    if n == 0:
        return {**base, "media": None, "mediana": None, "de": None, "minimo": None,
                "maximo": None, "q1": None, "q3": None, "iqr": None, "valores": []}

    ordenados = sorted(validos)
    q1 = _cuantil(ordenados, 0.25)
    q3 = _cuantil(ordenados, 0.75)
    return {
        **base,
        "media": round(statistics.fmean(validos), 2),
        "mediana": round(statistics.median(validos), 2),
        "de": round(statistics.stdev(validos), 2) if n > 1 else 0.0,
        "minimo": ordenados[0],
        "maximo": ordenados[-1],
        "q1": round(q1, 2),
        "q3": round(q3, 2),
        "iqr": round(q3 - q1, 2),
        "valores": validos,
    }


def calcular_frecuencias(valores_categoricos: list, orden_preferido: list[str] | None = None) -> list[dict]:
    conteo: dict[str, int] = {}
    for v in valores_categoricos:
        if v is None or str(v).strip() == "":
            continue
        conteo[str(v)] = conteo.get(str(v), 0) + 1

    total = sum(conteo.values())
    if total == 0:
        return []

    orden = [c for c in (orden_preferido or []) if c in conteo]
    orden += sorted(c for c in conteo if c not in orden)

    tabla, acumulado = [], 0.0
    for cat in orden:
        pct = conteo[cat] / total * 100
        acumulado += pct
        tabla.append({
            "categoria": cat,
            "frecuencia": conteo[cat],
            "porcentaje": round(pct, 1),
            "porcentaje_acumulado": round(min(acumulado, 100.0), 1),
        })
    return tabla


def interpretar_alfa(alfa: float | None) -> str:
    """Criterios de George y Mallery (2003)."""
    if alfa is None:
        return "—"
    for corte, texto in ((0.9, "Excelente"), (0.8, "Bueno"), (0.7, "Aceptable"), (0.6, "Cuestionable"), (0.5, "Pobre")):
        if alfa >= corte:
            return texto
    return "Inaceptable"


def calcular_alfa_cronbach(matriz: list[list[float]]) -> float | None:
    """
    matriz: casos × ítems, sin valores perdidos. Devuelve None si no es calculable
    (menos de 2 casos o 2 ítems, o varianza total nula).
    """
    if len(matriz) < 2 or len(matriz[0]) < 2:
        return None
    k = len(matriz[0])
    suma_var_items = sum(statistics.variance(col) for col in zip(*matriz))
    var_total = statistics.variance([sum(fila) for fila in matriz])
    if var_total == 0:
        return None
    return k / (k - 1) * (1 - suma_var_items / var_total)


def calcular_fiabilidad(tipo_test: str, registros: list[dict]) -> list[dict]:
    resultado = []
    for clave, etiqueta, items in ESCALAS_FIABILIDAD[tipo_test]:
        columnas = [nombre_item(i) for i in items]
        # Eliminación por lista (listwise), como Jamovi por defecto
        matriz = [[r[c] for c in columnas] for r in registros if all(r.get(c) is not None for c in columnas)]
        alfa = calcular_alfa_cronbach(matriz)
        resultado.append({
            "escala": clave,
            "etiqueta": etiqueta,
            "k": len(items),
            "n": len(matriz),
            "alfa": None if alfa is None else round(alfa, 3),
            "interpretacion": interpretar_alfa(alfa),
        })
    return resultado


# ---------------------------------------------------------------------------
# Normalización de filas
# ---------------------------------------------------------------------------

def _validar_tipo(tipo_test: str) -> dict:
    tipo = tipo_test.upper()
    if tipo not in ESQUEMAS:
        raise ValueError(f"Tipo de test no soportado: {tipo_test}. Use uno de {', '.join(TESTS_SOPORTADOS)}.")
    return ESQUEMAS[tipo]


def normalizar_filas(tipo_test: str, filas: list[dict], incluir_nombres: bool = False) -> list[dict]:
    """Convierte filas de Sheets en registros con claves snake_case y tipos limpios."""
    esquema = _validar_tipo(tipo_test)
    normalizadas = []
    for i, fila in enumerate(filas, start=1):
        if not isinstance(fila, dict):
            continue
        reg: dict[str, Any] = {"id_caso": i}
        if incluir_nombres:
            reg["nombre"] = str(_valor_columna(fila, "Nombre") or "").strip()
        for cab, snake, *_ in esquema["numericas"]:
            num = _a_numero(_valor_columna(fila, cab))
            reg[snake] = None if (num == 0 and snake in CERO_ES_PERDIDO) else num
        for cab, snake, *_ in esquema["categoricas"]:
            crudo = _valor_columna(fila, cab)
            reg[snake] = _normalizar_categoria(snake, crudo)
            if snake == "alerta_fobia_item7":
                reg["item7_puntaje"] = _item7_puntaje(crudo)
        for num in ITEMS_POR_TEST[tipo_test.upper()]:
            reg[nombre_item(num)] = _a_numero(_valor_columna(fila, cabecera_item(num)))
        normalizadas.append(reg)
    return normalizadas


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------

def generar_analitica_jamovi(tipo_test: str, filas_sheets: list[dict]) -> dict:
    tipo = tipo_test.upper()
    esquema = _validar_tipo(tipo)
    registros = normalizar_filas(tipo, filas_sheets)

    descriptivas = [
        calcular_descriptivas_variable(
            [r[snake] for r in registros], snake, maximo_teorico=maximo,
            etiqueta=etiqueta, minimo_teorico=minimo,
        )
        for _, snake, etiqueta, minimo, maximo in esquema["numericas"]
    ]

    frecuencias = {}
    for _, snake, etiqueta, orden, _ in esquema["categoricas"]:
        frecuencias[snake] = {
            "etiqueta": etiqueta,
            "tabla": calcular_frecuencias([r[snake] for r in registros], orden),
        }

    return {
        "tipo_test": tipo,
        "total_registros": len(registros),
        "descriptivas": descriptivas,
        "frecuencias": frecuencias,
        "escalas_boxplot": esquema["escalas_boxplot"],
        "puntaje_global": esquema["puntaje_global"],
        "categorica_principal": esquema["categorica_principal"],
        "cortes": esquema["cortes"],
        "fiabilidad": calcular_fiabilidad(tipo, registros),
        "registros_con_items": sum(
            1 for r in registros if any(r.get(nombre_item(n)) is not None for n in ITEMS_POR_TEST[tipo])
        ),
        "filas_crudas": registros,
    }


def generar_csv_jamovi(tipo_test: str, filas_sheets: list[dict], incluir_nombres: bool = False) -> str:
    """
    CSV con cabeceras snake_case. Cada categórica con codificación conocida lleva además
    una columna <variable>_cod con su código numérico ordinal. Devuelve el texto con BOM UTF-8.
    """
    tipo = tipo_test.upper()
    esquema = _validar_tipo(tipo)
    registros = normalizar_filas(tipo, filas_sheets, incluir_nombres=incluir_nombres)

    columnas = ["id_caso"] + (["nombre"] if incluir_nombres else [])
    columnas += [snake for _, snake, *_ in esquema["numericas"]]
    for _, snake, _, _, codigos in esquema["categoricas"]:
        columnas.append(snake)
        if codigos:
            columnas.append(f"{snake}_cod")
        if snake == "alerta_fobia_item7":
            columnas.append("item7_puntaje")
    columnas += [nombre_item(n) for n in ITEMS_POR_TEST[tipo]]

    buffer = io.StringIO()
    escritor = csv.writer(buffer, lineterminator="\n")
    escritor.writerow(columnas)

    codigos_por_var = {snake: cod for _, snake, _, _, cod in esquema["categoricas"] if cod}
    for reg in registros:
        fila = []
        for col in columnas:
            if col.endswith("_cod") and col[:-4] in codigos_por_var:
                valor = codigos_por_var[col[:-4]].get(reg.get(col[:-4]))
            else:
                valor = reg.get(col)
            if isinstance(valor, float) and valor.is_integer():
                valor = int(valor)
            fila.append("" if valor is None else valor)
        escritor.writerow(fila)

    return "﻿" + buffer.getvalue()


def generar_sav_jamovi(tipo_test: str, filas_sheets: list[dict], incluir_nombres: bool = False) -> bytes:
    """
    Archivo SPSS (.sav) que Jamovi abre con tipos de medida, etiquetas de variable y
    etiquetas de valor ya definidos. Las categóricas con codificación conocida se guardan
    como su código numérico con etiquetas (p. ej. 1 = "Consumo de bajo riesgo").
    """
    import pandas as pd  # import diferido: solo se carga al exportar (512 MB de RAM en Render)
    import pyreadstat

    tipo = tipo_test.upper()
    esquema = _validar_tipo(tipo)
    registros = normalizar_filas(tipo, filas_sheets, incluir_nombres=incluir_nombres)

    datos: dict[str, list] = {"id_caso": [r["id_caso"] for r in registros]}
    etiquetas = {"id_caso": "Identificador del caso"}
    medida = {"id_caso": "nominal"}
    etiquetas_valor: dict[str, dict] = {}

    if incluir_nombres:
        datos["nombre"] = [r.get("nombre") or "" for r in registros]
        etiquetas["nombre"] = "Nombre"
        medida["nombre"] = "nominal"

    for _, snake, etiqueta, minimo, maximo in esquema["numericas"]:
        datos[snake] = [r[snake] for r in registros]
        rango = f" ({minimo}–{maximo})" if minimo is not None and maximo is not None else ""
        etiquetas[snake] = f"{etiqueta}{rango}"
        medida[snake] = "scale"

    for _, snake, etiqueta, _, codigos in esquema["categoricas"]:
        etiquetas[snake] = etiqueta
        if codigos:
            datos[snake] = [codigos.get(r[snake]) for r in registros]
            etiquetas_valor[snake] = {float(c): cat for cat, c in codigos.items()}
            medida[snake] = "ordinal" if len(codigos) > 2 else "nominal"
        else:
            datos[snake] = [r[snake] or "" for r in registros]
            medida[snake] = "nominal"
        if snake == "alerta_fobia_item7":
            datos["item7_puntaje"] = [r.get("item7_puntaje") for r in registros]
            etiquetas["item7_puntaje"] = "Puntaje del ítem 7 (0–3)"
            medida["item7_puntaje"] = "scale"

    for n in ITEMS_POR_TEST[tipo]:
        col = nombre_item(n)
        datos[col] = [r.get(col) for r in registros]
        etiquetas[col] = f"Ítem {n}"
        medida[col] = "scale"

    df = pd.DataFrame(datos)
    for col, med in medida.items():
        if med != "nominal" or col in etiquetas_valor:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    fd, ruta = tempfile.mkstemp(suffix=".sav")
    os.close(fd)
    try:
        pyreadstat.write_sav(
            df,
            ruta,
            column_labels=[etiquetas[c] for c in df.columns],
            variable_value_labels=etiquetas_valor,
            variable_measure=medida,
        )
        with open(ruta, "rb") as f:
            return f.read()
    finally:
        os.remove(ruta)
