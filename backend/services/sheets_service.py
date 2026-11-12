import gspread
from google.oauth2.service_account import Credentials
from config import SPREADSHEET_ID

# Configuración de credenciales de Google
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

import os
import json

def obtener_cliente_sheets():
    # 1. Intentar desde variable de entorno (ideal para despliegue en la nube)
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        try:
            info = json.loads(creds_json)
            creds = Credentials.from_service_account_info(info, scopes=SCOPES)
            return gspread.authorize(creds)
        except Exception as e:
            print(f"[Sheets] Error al cargar credenciales desde GOOGLE_CREDENTIALS_JSON: {e}")

    # 2. Intentar desde archivo físico credentials.json
    posibles_rutas = [
        "credentials.json",
        os.path.join(os.path.dirname(__file__), "..", "credentials.json"),
        os.path.join(os.path.dirname(__file__), "..", "..", "credentials.json")
    ]
    ruta_encontrada = next((p for p in posibles_rutas if os.path.exists(p)), None)
    if not ruta_encontrada:
        raise FileNotFoundError("No se encontró credentials.json ni la variable GOOGLE_CREDENTIALS_JSON.")

    creds = Credentials.from_service_account_file(ruta_encontrada, scopes=SCOPES)
    return gspread.authorize(creds)

AUDIT_HEADERS = ["Nombre", "Edad", "Género", "Puntaje Total", "Diagnóstico"]
BRIEF_HEADERS = [
    "Nombre", "Edad", "Género",
    "Inhibición", "Flexibilidad", "Control Emocional", "Automonitoreo",
    "Iniciativa", "Memoria de Trabajo", "Planificación/Organización",
    "Monitoreo de Tareas", "Organización de Materiales",
    "Subtotal (1-38)", "Subtotal (39-75)", "Total General", "Alerta Entrevista"
]

PASS_HEADERS = [
    "Nombre", "Edad", "Ocupación", "Etapa Perinatal", "Semanas Embarazo", "Edad Bebé", "Fecha",
    "Escala 1: Preocupación y Miedos (0-30)",
    "Escala 2: Perfeccionismo y Trauma (0-24)",
    "Escala 3: Ansiedad Social (0-15)",
    "Escala 4: Ansiedad Aguda y Ajuste (0-24)",
    "Puntaje Global (0-93)", "Severidad", "Nivel de Riesgo (Corte 26)", "Alerta Fobia (Ítem 7)"
]

PSICOSOCIAL_HEADERS = [
    "Nombre", "Fecha", "Edad", "Ocupación", "Grado Instrucción", "Estado Civil",
    "Zona Vivienda", "Semanas Gestación", "Hijos Anteriores", "Recibe Subsidio",
    "Embarazo Planificado", "Pérdida Significativa",
    "A. Relación Pareja (6-30)", "Nivel Pareja",
    "B. Apoyo Familiar (6-30)", "Nivel Familia",
    "C. Red Apoyo Social (5-25)", "Nivel Red Social",
    "D. Integración Entorno (5-25)", "Nivel Entorno",
    "E. Situación Económica (5-25)", "Nivel Economía",
    "G. Vivencia Embarazo (5-25)", "Nivel Vivencia",
    "Puntaje Global (32-160)"
]

# Respuestas ítem por ítem (para análisis de fiabilidad en Jamovi). Van al final de cada fila.
ITEMS_POR_TEST = {
    "AUDIT": list(range(1, 11)),
    "BRIEF": list(range(1, 76)),
    "PASS": list(range(1, 32)),
    "PSICOSOCIAL": [*range(11, 38), *range(43, 48)],
}

CABECERAS_BASE = {
    "AUDIT": AUDIT_HEADERS,
    "BRIEF": BRIEF_HEADERS,
    "PASS": PASS_HEADERS,
    "PSICOSOCIAL": PSICOSOCIAL_HEADERS,
}


# Columnas agregadas después de los ítems: las hojas antiguas las reciben a la derecha
# sin desordenar lo ya guardado.
CABECERAS_EXTRA = {
    "AUDIT": ["Semestre"],
    "BRIEF": ["Semestre"],
}


def cabecera_item(numero: int) -> str:
    return f"Ítem {numero}"


def cabeceras_completas(tipo_test: str) -> list:
    base = CABECERAS_BASE.get(tipo_test, ["Datos"])
    items = [cabecera_item(n) for n in ITEMS_POR_TEST.get(tipo_test, [])]
    return base + items + CABECERAS_EXTRA.get(tipo_test, [])


def columnas_items(tipo_test: str, respuestas) -> list:
    """Respuestas en el orden de ITEMS_POR_TEST. Acepta lista (ítem 1 en índice 0) o dict {"11": 4, ...}."""
    numeros = ITEMS_POR_TEST.get(tipo_test, [])
    if isinstance(respuestas, dict):
        return [respuestas.get(str(n), respuestas.get(n, "")) for n in numeros]
    lista = list(respuestas or [])
    return [lista[n - 1] if n - 1 < len(lista) else "" for n in numeros]


def _asegurar_cabeceras(hoja, headers: list):
    """Agrega a la derecha las cabeceras que falten (p. ej. columnas de ítems en hojas antiguas)."""
    actuales = hoja.row_values(1)
    if len(actuales) >= len(headers):
        return
    if hoja.col_count < len(headers):
        hoja.add_cols(len(headers) - hoja.col_count)
    faltantes = headers[len(actuales):]
    celda = gspread.utils.rowcol_to_a1(1, len(actuales) + 1)
    hoja.update(values=[faltantes], range_name=celda)


def _obtener_o_crear_hoja(documento, tipo_test: str):
    headers = cabeceras_completas(tipo_test)
    try:
        hoja = documento.worksheet(tipo_test)
        _asegurar_cabeceras(hoja, headers)
        return hoja
    except gspread.exceptions.WorksheetNotFound:
        nueva_hoja = documento.add_worksheet(title=tipo_test, rows=200, cols=max(len(headers) + 2, 20))
        nueva_hoja.append_row(headers)
        return nueva_hoja

def guardar_resultado_excel(tipo_test: str, datos_fila: list, items=None, extras: dict | None = None):
    """
    Inserta una nueva fila en la pestaña del test. Si se pasan `items` (respuestas ítem por ítem),
    se agregan al final, alineados con las cabeceras "Ítem N". `extras` llena las columnas de
    CABECERAS_EXTRA (p. ej. {"Semestre": "8"}).
    """
    try:
        if not SPREADSHEET_ID:
            print("SPREADSHEET_ID no está configurado.")
            return False
            
        cliente = obtener_cliente_sheets()
        documento = cliente.open_by_key(SPREADSHEET_ID)
        
        # Selecciona o crea la pestaña (hoja) según el test
        hoja = _obtener_o_crear_hoja(documento, tipo_test)
        
        fila = list(datos_fila)
        if items is not None:
            base = CABECERAS_BASE.get(tipo_test, [])
            fila += [""] * (len(base) - len(fila))
            fila += columnas_items(tipo_test, items)
        if extras:
            base = CABECERAS_BASE.get(tipo_test, [])
            fila += [""] * (len(base) + len(ITEMS_POR_TEST.get(tipo_test, [])) - len(fila))
            fila += [extras.get(h, "") for h in CABECERAS_EXTRA.get(tipo_test, [])]

        # Inserta la fila al final del documento
        hoja.append_row(fila)
        return True
    except Exception as e:
        print(f"Error al guardar en Sheets: {e}")
        return False

def guardar_filas_dict(tipo_test: str, filas: list[dict]) -> int:
    """
    Agrega varias filas ya armadas como {cabecera: valor} (p. ej. desde el historial local del navegador).
    Las columnas se ordenan según las cabeceras de la hoja. Devuelve cuántas filas se guardaron.
    """
    if not SPREADSHEET_ID:
        raise RuntimeError("SPREADSHEET_ID no está configurado.")
    if not filas:
        return 0
    documento = obtener_cliente_sheets().open_by_key(SPREADSHEET_ID)
    hoja = _obtener_o_crear_hoja(documento, tipo_test)
    headers = cabeceras_completas(tipo_test)

    def celda(valor):
        if valor is None:
            return ""
        if isinstance(valor, (dict, list)):
            return json.dumps(valor, ensure_ascii=False)
        return valor

    hoja.append_rows([[celda(f.get(h)) for h in headers] for f in filas])
    return len(filas)


def obtener_registros_hoja(tipo_test: str) -> list[dict]:
    """
    Devuelve todas las filas de la pestaña indicada como lista de diccionarios
    (clave = cabecera de la hoja). Si la pestaña no existe o no hay conexión, devuelve [].
    """
    try:
        if not SPREADSHEET_ID:
            return []
        cliente = obtener_cliente_sheets()
        documento = cliente.open_by_key(SPREADSHEET_ID)
        hoja = documento.worksheet(tipo_test.upper())
        return hoja.get_all_records()
    except Exception as e:
        print(f"Aviso al leer hoja {tipo_test} en Sheets: {e}")
        return []
