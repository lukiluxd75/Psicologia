import json
from typing import List
from fastapi import UploadFile
import google.generativeai as genai
from config import GEMINI_API_KEY

# Configurar la API de Gemini
genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAMES = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-3.8-flash"
]

def _obtener_modelo():
    for m in MODEL_NAMES:
        try:
            return genai.GenerativeModel(m)
        except Exception:
            continue
    return genai.GenerativeModel("gemini-3.5-flash")

model = _obtener_modelo()


import re

def _parsear_json_seguro(texto: str) -> dict:
    if not texto:
        raise ValueError("La respuesta de Gemini está vacía.")
    # Limpiar posibles bloques de código markdown
    texto_limpio = re.sub(r"^```(?:json)?\s*", "", texto.strip(), flags=re.MULTILINE)
    texto_limpio = re.sub(r"```\s*$", "", texto_limpio.strip(), flags=re.MULTILINE)
    
    # Intentar parsear directo
    try:
        return json.loads(texto_limpio)
    except Exception:
        pass

    # Buscar bloque {...}
    match = re.search(r"\{[\s\S]*\}", texto)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception as e:
            raise ValueError(f"No se pudo parsear el JSON extraído: {e}. Texto recibido: {texto[:200]}")

    raise ValueError(f"No se encontró un objeto JSON válido en la respuesta del modelo: {texto[:200]}")


def _generar_contenido_seguro(partes) -> str:
    errores = []
    for nombre in MODEL_NAMES:
        try:
            m = genai.GenerativeModel(nombre)
            resp = m.generate_content(partes)
            if resp and resp.text:
                return resp.text
        except Exception as e:
            print(f"[Gemini] Intento con {nombre} falló: {e}")
            errores.append(f"{nombre}: {e}")
            continue
    detalle = "; ".join(errores[:2]) if errores else "Sin respuesta del modelo"
    raise RuntimeError(f"Error al procesar con Gemini ({detalle})")


async def extraer_datos_test(file: UploadFile, tipo_test: str) -> dict:
    """
    Lee una sola imagen (Test AUDIT) y extrae los datos del paciente.
    """
    image_bytes = await file.read()
    content_type = file.content_type if file.content_type and "image" in file.content_type else "image/png"
    imagen_gemini = {
        "mime_type": content_type,
        "data": image_bytes
    }

    prompt = """
    Eres un asistente de extracción de datos médicos. Analiza la imagen adjunta que corresponde al test AUDIT de consumo de alcohol.
    Extrae los siguientes datos y devuelve ÚNICAMENTE un objeto JSON válido, sin formato markdown ni texto adicional:
    1. "nombre": Nombre del paciente.
    2. "genero": "M" o "F".
    3. "edad": Edad en números.
    4. "respuestas": Un arreglo (array) de exactamente 10 números enteros correspondientes a las respuestas marcadas (0, 1, 2, 3 o 4). Si una respuesta está ilegible, asume 0.
    Ejemplo de salida exacto: {"nombre": "Juan Perez", "genero": "M", "edad": 25, "respuestas": [0, 1, 2, 0, 3, 1, 0, 2, 1, 0]}
    """

    texto_respuesta = _generar_contenido_seguro([prompt, imagen_gemini])
    datos = _parsear_json_seguro(texto_respuesta)

    # Asegurar exactamente 10 respuestas para AUDIT
    respuestas = [int(r) for r in datos.get("respuestas", []) if isinstance(r, (int, float, str)) and str(r).isdigit()]
    if len(respuestas) < 10:
        respuestas = respuestas + [0] * (10 - len(respuestas))
    elif len(respuestas) > 10:
        respuestas = respuestas[:10]
    datos["respuestas"] = respuestas

    return datos


async def extraer_datos_brief_multiple(files: List[UploadFile]) -> dict:
    """
    Lee una lista de imágenes (página 1 y página 2) y extrae los 75 ítems.
    """
    imagenes_gemini = []

    for file in files:
        image_bytes = await file.read()
        content_type = file.content_type if file.content_type and "image" in file.content_type else "image/png"
        imagenes_gemini.append({
            "mime_type": content_type,
            "data": image_bytes
        })

    prompt = """
    Eres un asistente de extracción de datos médicos. Analiza las DOS imágenes adjuntas que corresponden a las páginas 1 y 2 del mismo test psicométrico BRIEF de un solo paciente.
    Extrae los siguientes datos y devuelve ÚNICAMENTE un objeto JSON válido, sin formato markdown ni texto adicional:
    1. "nombre": Nombre del paciente (ubicado en la primera página).
    2. "genero": "M" o "F".
    3. "edad": Edad en números.
    4. "respuestas": Un arreglo (array) de exactamente 75 números enteros del ítem 1 al 75 convirtiendo la letra encerrada en círculo según esta regla estricta: N = 1, A = 2, F = 3. Si en una fila hay una letra tachada/borroneada y otra encerrada limpiamente en un círculo, toma únicamente la letra limpia. Si una respuesta está ilegible, asume 1.
    Ejemplo de salida exacto: {"nombre": "Juan Perez", "genero": "M", "edad": 25, "respuestas": [1, 2, 3, 1, 1, 1]}
    """

    texto_respuesta = _generar_contenido_seguro([prompt, *imagenes_gemini])
    datos = _parsear_json_seguro(texto_respuesta)

    # Asegurar exactamente 75 respuestas para BRIEF
    respuestas = [int(r) for r in datos.get("respuestas", []) if isinstance(r, (int, float, str)) and str(r).isdigit()]
    if len(respuestas) < 75:
        respuestas = respuestas + [1] * (75 - len(respuestas))
    elif len(respuestas) > 75:
        respuestas = respuestas[:75]
    datos["respuestas"] = respuestas

    return datos


async def extraer_datos_pass_multiple(files: List[UploadFile]) -> dict:
    """
    Lee las 2 páginas de la Escala de Detección de Ansiedad Perinatal (PASS) y extrae los 31 ítems.
    """
    imagenes_gemini = []
    for file in files:
        image_bytes = await file.read()
        content_type = file.content_type if file.content_type and "image" in file.content_type else "image/png"
        imagenes_gemini.append({
            "mime_type": content_type,
            "data": image_bytes
        })

    prompt = """
    Eres un asistente experto en extracción de datos médicos. Analiza las DOS imágenes adjuntas que corresponden a la Página 1 (ítems 1 al 18) y Página 2 (ítems 19 al 31) de la Escala de Detección de Ansiedad Perinatal (PASS).
    Extrae los siguientes datos y devuelve ÚNICAMENTE un objeto JSON válido, sin formato markdown ni texto adicional:
    1. "nombre": Nombre de la paciente (frecuentemente escrito a mano en el margen superior de la página 1, ej. "Faran Miranda"). Si no aparece, pon "No especificado".
    2. "edad": Edad en números enteros (busca junto al nombre en el margen superior, ej. "21 años" -> 21). Si no aparece, pon 0.
    3. "ocupacion": Ocupación o notas escritas junto al nombre en el margen superior (ej. "Estudiante, Música"). Si no hay, pon "".
    4. "etapa_perinatal": "Prenatal" si Semanas de embarazo > 0 o está marcado PRENATAL, de lo contrario "Posnatal".
    5. "semanas_embarazo": Número entero escrito dentro del paréntesis de "Semanas de embarazo ( )" (ej. 31). Si está vacío, pon 0.
    6. "edad_bebe": Número entero escrito dentro del paréntesis de "Edad del bebé ( )" (ej. 0). Si está vacío, pon 0.
    7. "fecha": Fecha escrita en "FECHA:" (ej. "28/09/26").
    8. "respuestas": Un arreglo (array) de exactamente 31 números enteros (0, 1, 2 o 3) correspondientes al valor encerrado en círculo en cada fila del ítem 1 al 31 (Nunca=0, Algunas veces=1, A menudo=2, Casi siempre=3).
    REGLA CRÍTICA PARA TACHONES Y ANULACIONES: Si en una fila hay un número tachado o con una 'X' al lado (por ejemplo, '0' con una 'X' a la derecha) y otro número encerrado limpiamente en un círculo en esa misma fila (ej. '3'), ignora el número tachado/con X y toma ÚNICAMENTE el número válido encerrado en círculo. Si algún ítem (especialmente en la página 2) está completamente en blanco sin ninguna marca, asigna 0.
    Ejemplo de salida:
    {"nombre": "Faran Miranda", "edad": 21, "ocupacion": "Estudiante, Música", "etapa_perinatal": "Prenatal", "semanas_embarazo": 31, "edad_bebe": 0, "fecha": "28/09/26", "respuestas": [2, 3, 3, 0, 3, 1, 3, 1, 1, 3, 3, 1, 2, 0, 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
    """

    texto_respuesta = _generar_contenido_seguro([prompt, *imagenes_gemini])
    datos = _parsear_json_seguro(texto_respuesta)

    # Asegurar exactamente 31 respuestas para PASS
    respuestas = [int(r) for r in datos.get("respuestas", []) if isinstance(r, (int, float, str)) and str(r).isdigit()]
    if len(respuestas) < 31:
        respuestas = respuestas + [0] * (31 - len(respuestas))
    elif len(respuestas) > 31:
        respuestas = respuestas[:31]
    datos["respuestas"] = respuestas

    return datos


async def extraer_datos_psicosocial_multiple(files: List[UploadFile]) -> dict:
    """
    Lee de 1 a 8 archivos (imágenes o PDF) del Cuestionario Sociodemográfico y Psicosocial en Mujeres Gestantes.
    Extrae los datos sociodemográficos (ítems 1 al 10) y las respuestas Likert (11-37 y 43-47).
    """
    archivos_gemini = []
    for file in files:
        file_bytes = await file.read()
        ct = (file.content_type or "").lower()
        fn = (file.filename or "").lower()
        if "pdf" in ct or fn.endswith(".pdf"):
            mime = "application/pdf"
        elif "png" in ct or fn.endswith(".png"):
            mime = "image/png"
        elif "webp" in ct or fn.endswith(".webp"):
            mime = "image/webp"
        else:
            mime = "image/jpeg"

        archivos_gemini.append({
            "mime_type": mime,
            "data": file_bytes
        })

    prompt = """
    Eres un asistente clínico experto en extracción de datos psicométricos y médicos.
    Analiza los documentos/imágenes adjuntos que corresponden al:
    "CUESTIONARIO SOCIODEMOGRÁFICO Y DE FACTORES PSICOSOCIALES EN MUJERES GESTANTES".

    Extrae con extrema precisión los siguientes datos y devuelve ÚNICAMENTE un objeto JSON válido, sin formato markdown ni texto adicional:

    ESTRUCTURA EXACTA DEL JSON:
    {
      "sociodemografico": {
        "nombre": "Nombre completo o 'Anónima / No especificado'",
        "fecha": "Fecha de aplicación o ''",
        "edad": 25,
        "ocupacion": "Ama de casa",
        "grado_instruccion": "Secundaria",
        "estado_civil": "Concubinato / unión libre",
        "zona_vivienda": "Zona Sur",
        "semanas_gestacion": 28,
        "hijos_anteriores": "Ninguno",
        "recibe_subsidio": "Sí",
        "embarazo_planificado": "Sí",
        "perdida_significativa": "No"
      },
      "respuestas": {
        "11": 4, "12": 4, "13": 3, "14": 4, "15": 3, "16": 4,
        "17": 5, "18": 4, "19": 4, "20": 4, "21": 3, "22": 4,
        "23": 3, "24": 4, "25": 3, "26": 4, "27": 3,
        "28": 3, "29": 2, "30": 3, "31": 3, "32": 4,
        "33": 3, "34": 3, "35": 2, "36": 3, "37": 3,
        "43": 4, "44": 5, "45": 4, "46": 4, "47": 4
      }
    }

    REGLAS CLÍNICAS Y DE EXTRACCIÓN:
    1. Datos sociodemográficos (Ítems 1 al 10):
       - "nombre": Si está vacío o ilegible, pon "Anónima / No especificado".
       - "fecha": Fecha anotada en el documento.
       - "edad": Número entero en años (ej. 24). Si no figura, pon 0.
       - "semanas_gestacion": Número entero de semanas (ej. 32). Si no figura, pon 0.
       - "ocupacion": "Ama de casa", "Estudiante", "Trabajadora independiente", "Trabajadora dependiente", "Comerciante", "Profesional", u "Otra: ...".
       - "grado_instruccion": "Sin estudios", "Primaria", "Secundaria", "Técnico medio", "Técnico superior", o "Universitario".
       - "estado_civil": "Soltera", "Casada", "Concubinato / unión libre", "Divorciada", "Separada", o "Viuda".
       - "zona_vivienda": "Zona Sur", "Cercado", "La Cancha (zona del mercado)", "Av. Petrolera, Villa Coronilla", "Lacma, Pacata, Guadalquivir", u "Otra: ...".
       - "hijos_anteriores": "Ninguno", "1", "2", "3", o "4 o más".
       - "recibe_subsidio": "Sí", "No", o "No sabe / no está segura".
       - "embarazo_planificado": "Sí", "No", o "Parcialmente / no estaba segura".
       - "perdida_significativa": "Sí" o "No".
    2. Escalas Likert (Ítems 11 al 37 y 43 al 47):
       - Cada ítem evalúa del 1 al 5 según la columna marcada:
         1 = Nunca, 2 = Casi nunca, 3 = Algunas veces, 4 = Casi siempre, 5 = Siempre.
       - A. Relación de Pareja: Ítems 11 al 16.
       - B. Apoyo y Relaciones Familiares: Ítems 17 al 22.
       - C. Amistades y Red de Apoyo Social: Ítems 23 al 27.
       - D. Participación e Integración en el Entorno: Ítems 28 al 32.
       - E. Situación Económica: Ítems 33 al 37.
       - G. Planificación y Vivencia del Embarazo: Ítems 43 al 47. (Nota: en el formulario no hay ítems 38-42).
       - REGLA DE CORRECCIÓN: Si hay una casilla tachada o con 'X' y otra marcada limpiamente, toma únicamente la válida.
       - Si algún ítem no tiene ninguna marca visible o está ilegible, coloca 3.
    """

    texto_respuesta = _generar_contenido_seguro([prompt, *archivos_gemini])
    datos = _parsear_json_seguro(texto_respuesta)

    # Validar y normalizar sociodemográfico
    socio_raw = datos.get("sociodemografico", {})
    if not isinstance(socio_raw, dict):
        socio_raw = {}

    try:
        edad_num = int(socio_raw.get("edad", 0))
    except (ValueError, TypeError):
        edad_num = 0

    try:
        semanas_num = int(socio_raw.get("semanas_gestacion", 0))
    except (ValueError, TypeError):
        semanas_num = 0

    socio = {
        "nombre": str(socio_raw.get("nombre") or "Anónima / No especificado").strip(),
        "fecha": str(socio_raw.get("fecha") or "").strip(),
        "edad": max(0, edad_num),
        "ocupacion": str(socio_raw.get("ocupacion") or "").strip(),
        "grado_instruccion": str(socio_raw.get("grado_instruccion") or "").strip(),
        "estado_civil": str(socio_raw.get("estado_civil") or "").strip(),
        "zona_vivienda": str(socio_raw.get("zona_vivienda") or "").strip(),
        "semanas_gestacion": max(0, semanas_num),
        "hijos_anteriores": str(socio_raw.get("hijos_anteriores") or "").strip(),
        "recibe_subsidio": str(socio_raw.get("recibe_subsidio") or "").strip(),
        "embarazo_planificado": str(socio_raw.get("embarazo_planificado") or "").strip(),
        "perdida_significativa": str(socio_raw.get("perdida_significativa") or "").strip(),
    }

    # Validar y normalizar respuestas de ítems (11..37 y 43..47)
    resp_raw = datos.get("respuestas", {})
    if not isinstance(resp_raw, dict):
        resp_raw = {}

    items_requeridos = [
        *range(11, 38),  # 11 al 37
        *range(43, 48),  # 43 al 47
    ]
    respuestas_limpias = {}
    for num in items_requeridos:
        val = resp_raw.get(str(num), resp_raw.get(num, 3))
        try:
            val_int = int(val)
            val_limpio = max(1, min(5, val_int))
        except (ValueError, TypeError):
            val_limpio = 3
        respuestas_limpias[str(num)] = val_limpio

    return {
        "sociodemografico": socio,
        "respuestas": respuestas_limpias
    }