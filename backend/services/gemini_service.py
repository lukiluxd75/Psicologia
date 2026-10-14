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