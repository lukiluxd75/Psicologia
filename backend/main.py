import config  # Carga .env antes que todo
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from services import gemini_service, scoring_service, sheets_service
from typing import List, Optional

app = FastAPI(title="API Corrector Psicométrico")

from fastapi.responses import JSONResponse

# Configuración de CORS para permitir que React (Frontend) se conecte sin bloqueos
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "error": exc.detail}
        )
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "error": str(exc)}
    )


class AuditManualRequest(BaseModel):
    nombre: str = Field(..., example="Paciente Demo")
    edad: int = Field(..., example=30)
    genero: str = Field(..., example="M")
    respuestas: List[int] = Field(..., min_items=10, max_items=10, example=[0, 1, 2, 0, 3, 1, 0, 2, 1, 0])
    guardar_sheets: Optional[bool] = False


class BriefManualRequest(BaseModel):
    nombre: str = Field(..., example="Paciente Demo")
    edad: int = Field(..., example=28)
    genero: str = Field(..., example="F")
    respuestas: List[int] = Field(..., min_items=75, max_items=75)
    guardar_sheets: Optional[bool] = False


class SolicitudPassManual(BaseModel):
    nombre: str
    edad: int = 0
    ocupacion: Optional[str] = ""
    etapa_perinatal: str = "Prenatal"
    semanas_embarazo: int = 0
    edad_bebe: int = 0
    fecha: Optional[str] = ""
    respuestas: List[int]
    guardar_en_sheets: bool = False


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "gemini_configurado": bool(config.GEMINI_API_KEY),
        "spreadsheet_id_configurado": bool(config.SPREADSHEET_ID)
    }


@app.post("/api/upload/audit")
async def procesar_test_audit(file: UploadFile = File(...)):
    # 1. Extraer datos con Gemini
    datos_extraidos = await gemini_service.extraer_datos_test(file, "AUDIT")
    
    # 2. Calcular puntaje (sumar las 10 respuestas)
    respuestas = datos_extraidos.get("respuestas", [])
    if len(respuestas) != 10:
        raise HTTPException(
            status_code=400, 
            detail=f"El test AUDIT extraído debe contener exactamente 10 respuestas (se obtuvieron {len(respuestas)})."
        )
    
    puntaje_total = sum(respuestas)
    nombre = datos_extraidos.get("nombre", "Paciente Anónimo")
    edad = datos_extraidos.get("edad", 0)
    genero = datos_extraidos.get("genero", "M")
    
    # 3. Obtener diagnóstico
    diagnostico = scoring_service.calificar_audit(puntaje_total, str(genero))
    
    # 4. Preparar datos para Excel (Columnas: Nombre, Edad, Género, Puntaje, Diagnóstico)
    fila_excel = [
        nombre,
        edad,
        genero,
        puntaje_total,
        diagnostico
    ]
    
    # 5. Guardar en Google Sheets
    guardado = sheets_service.guardar_resultado_excel("AUDIT", fila_excel)
    
    return {
        "mensaje": "Test AUDIT procesado y guardado correctamente" if guardado else "Test AUDIT procesado (Sheets no sincronizado)",
        "paciente": nombre,
        "edad": edad,
        "genero": genero,
        "respuestas": respuestas,
        "puntaje": puntaje_total,
        "diagnostico": diagnostico,
        "guardado_en_sheets": guardado
    }


@app.post("/api/upload/brief")
async def procesar_test_brief(files: List[UploadFile] = File(...)):
    # Verificación de seguridad
    if len(files) != 2:
        raise HTTPException(status_code=400, detail="Se requieren exactamente 2 imágenes para el test BRIEF (Página 1 y Página 2).")

    # 1. Extraer datos enviando la lista completa a Gemini
    datos_extraidos = await gemini_service.extraer_datos_brief_multiple(files)
    
    respuestas = datos_extraidos.get("respuestas", [])
    if len(respuestas) != 75:
        raise HTTPException(
            status_code=400, 
            detail=f"El test BRIEF debe contener exactamente 75 respuestas (se obtuvieron {len(respuestas)})."
        )

    # 2. Calcular todo usando el mapeo
    resultados = scoring_service.procesar_test_brief(respuestas)
    nombre = datos_extraidos.get("nombre", "Paciente Anónimo")
    edad = datos_extraidos.get("edad", 0)
    genero = datos_extraidos.get("genero", "M")
    
    # 3. Preparar datos para Excel
    fila_excel = [
        nombre,
        edad,
        genero,
        resultados["escalas"]["inhibicion"],
        resultados["escalas"]["flexibilidad"],
        resultados["escalas"]["control_emocional"],
        resultados["escalas"]["automonitoreo"],
        resultados["escalas"]["iniciativa"],
        resultados["escalas"]["memoria_trabajo"],
        resultados["escalas"]["planificacion_organizacion"],
        resultados["escalas"]["monitoreo_tareas"],
        resultados["escalas"]["organizacion_materiales"],
        resultados["subtotal_1_38"],
        resultados["subtotal_39_75"],
        resultados["total"],
        "SÍ" if resultados["validez"]["alerta_entrevista"] else "NO"
    ]
    
    # 4. Guardar en Google Sheets
    guardado = sheets_service.guardar_resultado_excel("BRIEF", fila_excel)
    
    return {
        "mensaje": "Test BRIEF procesado y guardado correctamente" if guardado else "Test BRIEF procesado (Sheets no sincronizado)",
        "paciente": nombre,
        "edad": edad,
        "genero": genero,
        "respuestas": respuestas,
        "resultados": resultados,
        "guardado_en_sheets": guardado
    }


@app.post("/api/test/audit/manual")
def procesar_test_audit_manual(req: AuditManualRequest):
    puntaje_total = sum(req.respuestas)
    diagnostico = scoring_service.calificar_audit(puntaje_total, req.genero)
    guardado = False

    if req.guardar_sheets:
        fila_excel = [
            req.nombre,
            req.edad,
            req.genero,
            puntaje_total,
            diagnostico
        ]
        guardado = sheets_service.guardar_resultado_excel("AUDIT", fila_excel)

    return {
        "mensaje": "Test AUDIT calculado con éxito",
        "paciente": req.nombre,
        "edad": req.edad,
        "genero": req.genero,
        "respuestas": req.respuestas,
        "puntaje": puntaje_total,
        "diagnostico": diagnostico,
        "guardado_en_sheets": guardado
    }


@app.post("/api/test/brief/manual")
def procesar_test_brief_manual(req: BriefManualRequest):
    resultados = scoring_service.procesar_test_brief(req.respuestas)
    guardado = False

    if req.guardar_sheets:
        fila_excel = [
            req.nombre,
            req.edad,
            req.genero,
            resultados["escalas"]["inhibicion"],
            resultados["escalas"]["flexibilidad"],
            resultados["escalas"]["control_emocional"],
            resultados["escalas"]["automonitoreo"],
            resultados["escalas"]["iniciativa"],
            resultados["escalas"]["memoria_trabajo"],
            resultados["escalas"]["planificacion_organizacion"],
            resultados["escalas"]["monitoreo_tareas"],
            resultados["escalas"]["organizacion_materiales"],
            resultados["subtotal_1_38"],
            resultados["subtotal_39_75"],
            resultados["total"],
            "SÍ" if resultados["validez"]["alerta_entrevista"] else "NO"
        ]
        guardado = sheets_service.guardar_resultado_excel("BRIEF", fila_excel)

    return {
        "mensaje": "Test BRIEF calculado con éxito",
        "paciente": req.nombre,
        "edad": req.edad,
        "genero": req.genero,
        "respuestas": req.respuestas,
        "resultados": resultados,
        "guardado_en_sheets": guardado
    }


@app.post("/api/upload/pass")
async def procesar_test_pass_ocr(files: List[UploadFile] = File(...)):
    if len(files) != 2:
        raise HTTPException(status_code=400, detail="Se requieren exactamente 2 imágenes (Página 1 y Página 2) para el test PASS.")

    datos_extraidos = await gemini_service.extraer_datos_pass_multiple(files)
    resultados = scoring_service.procesar_test_pass(datos_extraidos["respuestas"])

    fila_excel = [
        datos_extraidos.get("nombre", "No especificado"),
        datos_extraidos.get("edad", 0),
        datos_extraidos.get("ocupacion", ""),
        datos_extraidos.get("etapa_perinatal", "Prenatal"),
        datos_extraidos.get("semanas_embarazo", 0),
        datos_extraidos.get("edad_bebe", 0),
        datos_extraidos.get("fecha", ""),
        resultados["subescalas"]["escala_1_preocupacion_miedos"],
        resultados["subescalas"]["escala_2_perfeccionismo_trauma"],
        resultados["subescalas"]["escala_3_ansiedad_social"],
        resultados["subescalas"]["escala_4_ansiedad_aguda_ajuste"],
        resultados["total"],
        resultados["severidad"],
        resultados["riesgo_trastorno"],
        f"SÍ (Pts: {resultados['item_7_fobia']['puntaje']})" if resultados["item_7_fobia"]["alerta_fobia"] else f"NO (Pts: {resultados['item_7_fobia']['puntaje']})"
    ]

    guardado = sheets_service.guardar_resultado_excel("PASS", fila_excel)

    return {
        "mensaje": "Test PASS procesado correctamente",
        "guardado_en_sheets": guardado,
        "paciente": {
            "nombre": datos_extraidos.get("nombre", "No especificado"),
            "edad": datos_extraidos.get("edad", 0),
            "ocupacion": datos_extraidos.get("ocupacion", ""),
            "etapa_perinatal": datos_extraidos.get("etapa_perinatal", "Prenatal"),
            "semanas_embarazo": datos_extraidos.get("semanas_embarazo", 0),
            "edad_bebe": datos_extraidos.get("edad_bebe", 0),
            "fecha": datos_extraidos.get("fecha", "")
        },
        "resultados": resultados
    }


@app.post("/api/test/pass/manual")
async def procesar_test_pass_manual(payload: SolicitudPassManual):
    resultados = scoring_service.procesar_test_pass(payload.respuestas)
    guardado = False

    if payload.guardar_en_sheets:
        fila_excel = [
            payload.nombre,
            payload.edad,
            payload.ocupacion or "",
            payload.etapa_perinatal,
            payload.semanas_embarazo,
            payload.edad_bebe,
            payload.fecha or "",
            resultados["subescalas"]["escala_1_preocupacion_miedos"],
            resultados["subescalas"]["escala_2_perfeccionismo_trauma"],
            resultados["subescalas"]["escala_3_ansiedad_social"],
            resultados["subescalas"]["escala_4_ansiedad_aguda_ajuste"],
            resultados["total"],
            resultados["severidad"],
            resultados["riesgo_trastorno"],
            f"SÍ (Pts: {resultados['item_7_fobia']['puntaje']})" if resultados["item_7_fobia"]["alerta_fobia"] else f"NO (Pts: {resultados['item_7_fobia']['puntaje']})"
        ]
        guardado = sheets_service.guardar_resultado_excel("PASS", fila_excel)

    return {
        "mensaje": "Test PASS evaluado manualmente",
        "guardado_en_sheets": guardado,
        "paciente": {
            "nombre": payload.nombre,
            "edad": payload.edad,
            "ocupacion": payload.ocupacion,
            "etapa_perinatal": payload.etapa_perinatal,
            "semanas_embarazo": payload.semanas_embarazo,
            "edad_bebe": payload.edad_bebe,
            "fecha": payload.fecha
        },
        "resultados": resultados
    }


# Configuración para Despliegue en Producción (servir frontend compilado si existe)
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    @app.middleware("http")
    async def spa_fallback_middleware(request, call_next):
        response = await call_next(request)
        if response.status_code == 404 and not request.url.path.startswith("/api"):
            index_file = os.path.join(FRONTEND_DIST, "index.html")
            if os.path.exists(index_file):
                return FileResponse(index_file)
        return response

    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)