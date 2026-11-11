# Mapeo exacto de las 9 escalas (70 ítems clínicos)
# Calibrado contra las plantillas físicas del psicólogo
MAPEO_ESCALAS = {
    "inhibicion": [5, 16, 29, 36, 43, 55, 58, 73],
    "flexibilidad": [8, 22, 32, 44, 61, 67],
    "control_emocional": [1, 12, 19, 28, 33, 42, 51, 57, 69, 72],  # 69 en vez de 64
    "automonitoreo": [13, 23, 37, 50, 64, 70],
    "iniciativa": [6, 14, 20, 25, 45, 49, 53, 62],
    "memoria_trabajo": [4, 11, 17, 26, 35, 46, 56, 68],
    "planificacion_organizacion": [9, 15, 21, 34, 39, 47, 54, 63, 66, 71],
    "monitoreo_tareas": [2, 18, 24, 41, 52, 75],  # Se agregó el ítem 24
    "organizacion_materiales": [3, 7, 30, 31, 40, 60, 65, 74]
}

# Reglas de Validez según los recuadros de la plantilla del psicólogo
# Negatividad (N): Se activa cuando el paciente marca 3 (F = Frecuentemente)
INDICADORES_N = [1, 8, 19, 21, 22, 23, 29, 36, 39, 40]

# Infrecuencia (F): Ítems 10 y 38 se activan con 3 (F). Ítems 27, 48 y 59 se activan con 1 (N).
INDICADORES_F_VALOR_3 = [10, 38]
INDICADORES_F_VALOR_1 = [27, 48, 59]

# Inconsistencia (I): Ítems marcados con (I) en la plantilla
INDICADORES_I = [2, 25, 28, 33, 34, 41, 42, 44, 46, 49, 52, 56, 60, 61, 63, 64, 70, 72, 74, 75]


def calificar_audit(puntaje_total: int, genero: str) -> str:
    """
    Devuelve el diagnóstico del Test AUDIT según el puntaje y el género.
    Reglas según la sección 5.1 del README.
    """
    genero = genero.upper()

    if genero in ['M', 'MASCULINO', 'HOMBRE']:
        if puntaje_total <= 4:
            return "Consumo de bajo riesgo"
        elif 5 <= puntaje_total <= 15:
            return "Consumo de riesgo"
        else:
            return "Posible dependencia"
    elif genero in ['F', 'FEMENINO', 'MUJER']:
        if puntaje_total <= 3:
            return "Consumo de bajo riesgo"
        elif 4 <= puntaje_total <= 15:
            return "Consumo de riesgo"
        else:
            return "Posible dependencia"
    else:
        return "Error: Género no definido correctamente"


def procesar_test_brief(respuestas_paciente: list) -> dict:
    """
    Recibe el array de 75 respuestas [1, 2, 3...] y devuelve los puntajes por área
    y los indicadores de validez.
    Conversión directa sin inversión: N=1, A=2, F=3.
    Los recuadros [1] y [3] de la plantilla NO invierten puntaje clínico,
    solo indican qué respuesta activa la alerta de validez (Negatividad o Infrecuencia).
    """
    if len(respuestas_paciente) != 75:
        raise ValueError("El test BRIEF debe tener exactamente 75 respuestas.")

    # 1. Sumar puntuaciones por escala y subtotales (1-38 y 39-75)
    # NO se aplica inversión: N=1, A=2, F=3 directo
    resultados_escalas = {clave: 0 for clave in MAPEO_ESCALAS.keys()}
    subtotal_1_38 = 0
    subtotal_39_75 = 0

    for escala, items in MAPEO_ESCALAS.items():
        for num_item in items:
            valor = respuestas_paciente[num_item - 1]
            resultados_escalas[escala] += valor
            if num_item <= 38:
                subtotal_1_38 += valor
            else:
                subtotal_39_75 += valor

    puntuacion_total = subtotal_1_38 + subtotal_39_75

    # 2. Calcular Indicadores de Validez (N y F) según los recuadros de la plantilla
    # Negatividad: suma 1 si el paciente respondió F (3) en estos ítems
    conteo_n = sum(1 for item in INDICADORES_N if respuestas_paciente[item - 1] == 3)

    # Infrecuencia: ítems 10, 38 se activan con 3; ítems 27, 48, 59 se activan con 1
    conteo_f = (
        sum(1 for item in INDICADORES_F_VALOR_3 if respuestas_paciente[item - 1] == 3) +
        sum(1 for item in INDICADORES_F_VALOR_1 if respuestas_paciente[item - 1] == 1)
    )

    # Inconsistencia: conteo informativo
    conteo_i = sum(1 for item in INDICADORES_I if respuestas_paciente[item - 1] == 3)

    # Regla de negocio: Si hay 3+ en N o 2+ en F, marcamos alerta para entrevista
    requiere_entrevista = bool(conteo_n >= 3 or conteo_f >= 2)

    return {
        "escalas": resultados_escalas,
        "subtotal_1_38": subtotal_1_38,
        "subtotal_39_75": subtotal_39_75,
        "total": puntuacion_total,
        "validez": {
            "negatividad_N": conteo_n,
            "inconsistencia_I": conteo_i,
            "infrecuencia_F": conteo_f,
            "alerta_entrevista": requiere_entrevista
        }
    }


MAPEO_PASS = {
    "escala_1_preocupacion_miedos": list(range(1, 11)),       # Ítems 1-10 (Máx 30)
    "escala_2_perfeccionismo_trauma": list(range(11, 19)),    # Ítems 11-18 (Máx 24)
    "escala_3_ansiedad_social": list(range(19, 24)),          # Ítems 19-23 (Máx 15)
    "escala_4_ansiedad_aguda_ajuste": list(range(24, 32)),    # Ítems 24-31 (Máx 24)
}

def procesar_test_pass(respuestas_paciente: list) -> dict:
    """
    Recibe una lista de 31 enteros (0, 1, 2 o 3) y calcula las 4 subescalas,
    el puntaje global (0-93), el punto de corte (26), la severidad y la alerta de fobia del ítem 7.
    """
    if len(respuestas_paciente) != 31:
        raise ValueError(f"El test PASS requiere exactamente 31 respuestas, se recibieron {len(respuestas_paciente)}.")

    # Validar rango 0-3
    respuestas = [max(0, min(3, int(v))) for v in respuestas_paciente]

    escala_1 = sum(respuestas[0:10])
    escala_2 = sum(respuestas[10:18])
    escala_3 = sum(respuestas[18:23])
    escala_4 = sum(respuestas[23:31])

    puntaje_total = escala_1 + escala_2 + escala_3 + escala_4

    if puntaje_total <= 20:
        severidad = "Asintomático"
    elif puntaje_total <= 41:
        severidad = "Síntomas leves-moderados"
    else:
        severidad = "Síntomas severos"

    riesgo_trastorno = "Alto riesgo" if puntaje_total >= 26 else "Bajo riesgo"
    puntaje_item_7 = respuestas[6]  # Ítem 7 (índice 6)
    alerta_fobia = bool(puntaje_item_7 >= 2)

    return {
        "subescalas": {
            "escala_1_preocupacion_miedos": escala_1,
            "escala_2_perfeccionismo_trauma": escala_2,
            "escala_3_ansiedad_social": escala_3,
            "escala_4_ansiedad_aguda_ajuste": escala_4,
        },
        "maximos": {
            "escala_1_preocupacion_miedos": 30,
            "escala_2_perfeccionismo_trauma": 24,
            "escala_3_ansiedad_social": 15,
            "escala_4_ansiedad_aguda_ajuste": 24,
            "total": 93
        },
        "total": puntaje_total,
        "corte_riesgo": 26,
        "riesgo_trastorno": riesgo_trastorno,
        "severidad": severidad,
        "item_7_fobia": {
            "puntaje": puntaje_item_7,
            "alerta_fobia": alerta_fobia
        },
        "respuestas": respuestas
    }


INTERPRETACIONES_PSICOSOCIAL = {
    "relacion_pareja": {
        "titulo": "A. Relación de Pareja",
        "maximo": 30,
        "items": [11, 12, 13, 14, 15, 16],
        "textos": {
            "Muy bajo": "Refleja un apoyo muy limitado por parte de la pareja.",
            "Bajo": "Indica un acompañamiento insuficiente ante las necesidades emocionales de la gestante.",
            "Moderado": "Existe apoyo de la pareja, aunque puede ser irregular en determinadas situaciones.",
            "Alto": "Se percibe un acompañamiento frecuente y favorable por parte de la pareja.",
            "Muy alto": "Dispone de una red social sólida, con personas de confianza a quienes puede acudir cuando lo necesita."
        }
    },
    "apoyo_familiar": {
        "titulo": "B. Apoyo y Relaciones Familiares",
        "maximo": 30,
        "items": [17, 18, 19, 20, 21, 22],
        "textos": {
            "Muy bajo": "Existe un respaldo familiar muy limitado y poca disponibilidad de acompañamiento emocional.",
            "Bajo": "El apoyo familiar resulta insuficiente para atender algunas necesidades emocionales o prácticas.",
            "Moderado": "La gestante cuenta con apoyo familiar, aunque este puede ser irregular o parcial.",
            "Alto": "Dispone de acompañamiento familiar frecuente y ayuda cuando la necesita.",
            "Muy alto": "Cuenta con una familia cercana, colaboradora y disponible durante el embarazo."
        }
    },
    "red_apoyo_social": {
        "titulo": "C. Amistades y Red de Apoyo Social",
        "maximo": 25,
        "items": [23, 24, 25, 26, 27],
        "textos": {
            "Muy bajo": "Dispone de pocas personas de confianza a quienes recurrir en busca de ayuda.",
            "Bajo": "Su red social es limitada y el acompañamiento de amistades u otras personas es escaso.",
            "Moderado": "Cuenta con algunas fuentes de apoyo, aunque su disponibilidad puede variar.",
            "Alto": "Mantiene vínculos sociales que favorecen el acompañamiento y la comunicación.",
            "Muy alto": "Dispone de una red de apoyo sólida y de personas de confianza para afrontar dificultades."
        }
    },
    "integracion_entorno": {
        "titulo": "D. Participación e Integración en el Entorno",
        "maximo": 25,
        "items": [28, 29, 30, 31, 32],
        "textos": {
            "Muy bajo": "Presenta poca participación en su entorno y escasas oportunidades de integración.",
            "Bajo": "Mantiene una participación reducida en espacios sociales o comunitarios.",
            "Moderado": "Se integra en algunos espacios, aunque su participación puede ser ocasional.",
            "Alto": "Participa frecuentemente en su entorno y mantiene vínculos favorables con otras personas.",
            "Muy alto": "Presenta una integración activa y cuenta con oportunidades de participación y apoyo en su entorno."
        }
    },
    "situacion_economica": {
        "titulo": "E. Situación Económica",
        "maximo": 25,
        "items": [33, 34, 35, 36, 37],
        "textos": {
            "Muy bajo": "Presenta dificultades económicas importantes para cubrir sus necesidades durante el embarazo.",
            "Bajo": "Sus recursos económicas son limitados y pueden dificultar la atención de algunas necesidades.",
            "Moderado": "Puede cubrir parte de sus necesidades, aunque mantiene ciertas limitaciones económicas.",
            "Alto": "Cuenta con recursos generalmente suficientes para atender sus necesidades durante el embarazo.",
            "Muy alto": "Percibe estabilidad económica y capacidad para cubrir las necesidades evaluadas."
        }
    },
    "vivencia_embarazo": {
        "titulo": "G. Planificación y Vivencia del Embarazo",
        "maximo": 25,
        "items": [43, 44, 45, 46, 47],
        "textos": {
            "Muy bajo": "Refleja poca preparación percibida y dificultades para afrontar los cambios del embarazo.",
            "Bajo": "Presenta dificultades para sentirse preparada y contar con el apoyo necesario durante esta etapa.",
            "Moderado": "Manifiesta una preparación parcial y dispone de algunos recursos para afrontar el embarazo.",
            "Alto": "Se siente preparada para los cambios del embarazo y percibe apoyo para asumir esta etapa.",
            "Muy alto": "Manifiesta una preparación favorable y confianza para afrontar el embarazo y la maternidad."
        }
    }
}

def _clasificar_nivel_30(puntaje: int) -> str:
    if puntaje <= 10: return "Muy bajo"
    if puntaje <= 15: return "Bajo"
    if puntaje <= 20: return "Moderado"
    if puntaje <= 25: return "Alto"
    return "Muy alto"

def _clasificar_nivel_25(puntaje: int) -> str:
    if puntaje <= 8: return "Muy bajo"
    if puntaje <= 12: return "Bajo"
    if puntaje <= 16: return "Moderado"
    if puntaje <= 20: return "Alto"
    return "Muy alto"

def procesar_test_psicosocial(respuestas_items: dict) -> dict:
    """
    respuestas_items: diccionario cuyas claves son los números de ítem ("11".."37", "43".."47")
    y valores enteros de 1 a 5.
    """
    dimensiones_resultado = {}
    respuestas_limpias = {}
    puntaje_global = 0
    maximo_global = 160  # 30 + 30 + 25 + 25 + 25 + 25

    for clave, config in INTERPRETACIONES_PSICOSOCIAL.items():
        suma = 0
        for num_item in config["items"]:
            val = respuestas_items.get(str(num_item), respuestas_items.get(num_item, 1))
            try:
                val_limpio = max(1, min(5, int(val)))
            except (ValueError, TypeError):
                val_limpio = 1
            suma += val_limpio
            respuestas_limpias[str(num_item)] = val_limpio

        nivel = _clasificar_nivel_30(suma) if config["maximo"] == 30 else _clasificar_nivel_25(suma)
        dimensiones_resultado[clave] = {
            "titulo": config["titulo"],
            "puntaje": suma,
            "maximo": config["maximo"],
            "nivel": nivel,
            "interpretacion": config["textos"][nivel]
        }
        puntaje_global += suma

    return {
        "dimensiones": dimensiones_resultado,
        "puntaje_global": puntaje_global,
        "maximo_global": maximo_global,
        "respuestas": respuestas_limpias
    }