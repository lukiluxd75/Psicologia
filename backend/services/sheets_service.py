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

def _obtener_o_crear_hoja(documento, tipo_test: str):
    try:
        return documento.worksheet(tipo_test)
    except Exception:
        if tipo_test == "AUDIT":
            headers = AUDIT_HEADERS
        elif tipo_test == "BRIEF":
            headers = BRIEF_HEADERS
        elif tipo_test == "PASS":
            headers = PASS_HEADERS
        else:
            headers = ["Datos"]
        nueva_hoja = documento.add_worksheet(title=tipo_test, rows=200, cols=max(len(headers) + 2, 20))
        nueva_hoja.append_row(headers)
        return nueva_hoja

def guardar_resultado_excel(tipo_test: str, datos_fila: list):
    """
    Inserta una nueva fila en la pestaña correspondiente (AUDIT o BRIEF).
    """
    try:
        if not SPREADSHEET_ID:
            print("SPREADSHEET_ID no está configurado.")
            return False
            
        cliente = obtener_cliente_sheets()
        documento = cliente.open_by_key(SPREADSHEET_ID)
        
        # Selecciona o crea la pestaña (hoja) según el test
        hoja = _obtener_o_crear_hoja(documento, tipo_test)
        
        # Inserta la fila al final del documento
        hoja.append_row(datos_fila)
        return True
    except Exception as e:
        print(f"Error al guardar en Sheets: {e}")
        return False