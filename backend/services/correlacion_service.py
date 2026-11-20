"""
Estudio correlacional AUDIT–BRIEF por semestre.

Empareja el AUDIT y el BRIEF de cada estudiante por nombre (el BRIEF no trae DNI) y calcula,
para cada semestre y para la muestra total, la correlación entre el puntaje AUDIT y el BRIEF.
Además compara las medias de ambos tests entre los dos semestres elegidos (por defecto 1.º y 8.º).

Las p se calculan sin SciPy (la t de Student vía la beta incompleta regularizada) para no
sumar dependencias al despliegue.
"""
import csv
import difflib
import io
import math
import re
import statistics
import unicodedata
from typing import Any

from services.analytics_service import ESQUEMAS, _a_numero, _valor_columna

ESCALAS_BRIEF = [
    (cab, snake, etiqueta)
    for cab, snake, etiqueta, *_ in ESQUEMAS["BRIEF"]["numericas"]
    if snake != "edad"
]

ORDINALES = {
    "primer": 1, "primero": 1, "segundo": 2, "tercer": 3, "tercero": 3, "cuarto": 4, "quinto": 5,
    "sexto": 6, "septimo": 7, "setimo": 7, "octavo": 8, "noveno": 9, "decimo": 10,
}

# Dominios del AUDIT (Babor et al., 2001, OMS): ítems que suma cada uno.
DOMINIOS_AUDIT = [
    ("audit_consumo_riesgo", "AUDIT: Consumo de riesgo", (1, 2, 3)),
    ("audit_dependencia", "AUDIT: Síntomas de dependencia", (4, 5, 6)),
    ("audit_consumo_perjudicial", "AUDIT: Consumo perjudicial", (7, 8, 9, 10)),
]

# Índices del BRIEF-A (Roth et al., 2005): suma de sus escalas clínicas.
INDICES_BRIEF = [
    ("indice_regulacion_conductual", "BRIEF-A: Índice de Regulación Conductual (BRI)",
     ("inhibicion", "flexibilidad", "control_emocional", "automonitoreo")),
    ("indice_metacognicion", "BRIEF-A: Índice de Metacognición (MI)",
     ("iniciativa", "memoria_trabajo", "planificacion_organizacion", "monitoreo_tareas", "organizacion_materiales")),
]

# Por debajo de este parecido dos nombres se consideran personas distintas.
SIMILITUD_MINIMA = 0.88


# ---------------------------------------------------------------------------
# Normalización
# ---------------------------------------------------------------------------

def _sin_tildes(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()


def clave_nombre(nombre: Any) -> str:
    """
    'Zurita Fajardo, Óscar Diego' y 'oscar diego zurita fajardo' dan la misma clave:
    sin tildes, en minúsculas y con las palabras ordenadas (el AUDIT pide apellidos primero
    y el BRIEF suele traer el nombre primero).
    """
    palabras = re.findall(r"[a-z0-9]+", _sin_tildes(str(nombre or "")).lower())
    return " ".join(sorted(palabras))


def parsear_semestre(valor: Any) -> int | None:
    """'8', '8vo', '8.º', 'Octavo', 'VIII' → 8."""
    if valor is None:
        return None
    texto = _sin_tildes(str(valor)).strip().lower()
    if not texto:
        return None
    m = re.search(r"\d+", texto)
    if m:
        n = int(m.group())
        return n if 1 <= n <= 12 else None
    for palabra, n in ORDINALES.items():
        if re.search(rf"\b{palabra}\b", texto):
            return n
    romanos = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "ix": 9, "x": 10}
    return romanos.get(re.sub(r"[^ivx]", "", texto))


# ---------------------------------------------------------------------------
# Distribuciones (sin SciPy)
# ---------------------------------------------------------------------------

def _beta_cf(a: float, b: float, x: float) -> float:
    """Fracción continua de la beta incompleta (Numerical Recipes, betacf)."""
    tiny = 1e-300

    def no_cero(v: float) -> float:
        return v if abs(v) > tiny else tiny

    qab, qap, qam = a + b, a + 1, a - 1
    c, d = 1.0, 1 / no_cero(1 - qab * x / qap)
    h = d
    for m in range(1, 300):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 / no_cero(1 + aa * d)
        c = no_cero(1 + aa / c)
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 / no_cero(1 + aa * d)
        c = no_cero(1 + aa / c)
        delta = d * c
        h *= delta
        if abs(delta - 1) < 1e-12:
            break
    return h


def _beta_inc(a: float, b: float, x: float) -> float:
    """Beta incompleta regularizada I_x(a, b)."""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    ln_bt = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1 - x)
    if x < (a + 1) / (a + b + 2):
        return math.exp(ln_bt) * _beta_cf(a, b, x) / a
    return 1 - math.exp(ln_bt) * _beta_cf(b, a, 1 - x) / b


def p_t_bilateral(t: float, gl: float) -> float:
    if gl <= 0 or math.isnan(t):
        return float("nan")
    if math.isinf(t):
        return 0.0
    return _beta_inc(gl / 2, 0.5, gl / (gl + t * t))


def p_normal_bilateral(z: float) -> float:
    return math.erfc(abs(z) / math.sqrt(2))


# ---------------------------------------------------------------------------
# Estadísticos
# ---------------------------------------------------------------------------

def _rangos(valores: list[float]) -> list[float]:
    """Rangos promedio para empates (como R y Jamovi)."""
    orden = sorted(range(len(valores)), key=lambda i: valores[i])
    rangos = [0.0] * len(valores)
    i = 0
    while i < len(orden):
        j = i
        while j + 1 < len(orden) and valores[orden[j + 1]] == valores[orden[i]]:
            j += 1
        for k in range(i, j + 1):
            rangos[orden[k]] = (i + j) / 2 + 1
        i = j + 1
    return rangos


def _pearson_r(x: list[float], y: list[float]) -> float | None:
    n = len(x)
    if n < 3:
        return None
    mx, my = statistics.fmean(x), statistics.fmean(y)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    sxx = sum((a - mx) ** 2 for a in x)
    syy = sum((b - my) ** 2 for b in y)
    if sxx == 0 or syy == 0:
        return None
    return max(-1.0, min(1.0, sxy / math.sqrt(sxx * syy)))


def _p_de_r(r: float, n: int) -> float:
    if abs(r) >= 1:
        return 0.0
    gl = n - 2
    return p_t_bilateral(r * math.sqrt(gl / (1 - r * r)), gl)


def interpretar_r(r: float | None) -> str:
    """Magnitud según Cohen (1988)."""
    if r is None:
        return "—"
    a = abs(r)
    if a < 0.1:
        magnitud = "Nula"
    elif a < 0.3:
        magnitud = "Débil"
    elif a < 0.5:
        magnitud = "Moderada"
    else:
        magnitud = "Fuerte"
    if magnitud == "Nula":
        return magnitud
    return f"{magnitud} {'positiva' if r > 0 else 'negativa'}"


def correlacion(x: list[float], y: list[float]) -> dict:
    n = len(x)
    r = _pearson_r(x, y)
    rho = _pearson_r(_rangos(x), _rangos(y)) if n >= 3 else None
    base: dict[str, Any] = {"n": n, "r": None, "p": None, "ic95": None, "rho": None, "p_rho": None,
                            "pendiente": None, "intercepto": None, "interpretacion": interpretar_r(r)}
    if r is not None:
        base["r"] = round(r, 3)
        base["p"] = _p_de_r(r, n)
        if n > 3 and abs(r) < 1:
            z, se = math.atanh(r), 1 / math.sqrt(n - 3)
            base["ic95"] = [round(math.tanh(z - 1.96 * se), 3), round(math.tanh(z + 1.96 * se), 3)]
        mx, my = statistics.fmean(x), statistics.fmean(y)
        pendiente = r * statistics.stdev(y) / statistics.stdev(x)
        base["pendiente"] = pendiente
        base["intercepto"] = my - pendiente * mx
    if rho is not None:
        base["rho"] = round(rho, 3)
        base["p_rho"] = _p_de_r(rho, n)
    return base


def descriptivas(valores: list[float]) -> dict:
    n = len(valores)
    if n == 0:
        return {"n": 0, "media": None, "de": None, "mediana": None, "minimo": None, "maximo": None}
    return {
        "n": n,
        "media": round(statistics.fmean(valores), 2),
        "de": round(statistics.stdev(valores), 2) if n > 1 else 0.0,
        "mediana": round(statistics.median(valores), 2),
        "minimo": min(valores),
        "maximo": max(valores),
    }


def _p_exacta_u(u: float, n1: int, n2: int) -> float:
    """
    p bilateral exacta de la U de Mann-Whitney (sin empates), como `wilcox.test` de R.
    cuentas[k] = de cuántas formas se obtiene U = k, por la recurrencia f(m, n) = f(m−1, n) + f(m, n−1).
    """
    # tabla[m][n] = lista de frecuencias de U para tamaños m y n
    tabla = [[None] * (n2 + 1) for _ in range(n1 + 1)]
    for m in range(n1 + 1):
        for n in range(n2 + 1):
            if m == 0 or n == 0:
                tabla[m][n] = [1]
                continue
            a, b = tabla[m - 1][n], tabla[m][n - 1]
            cuentas = [0] * (m * n + 1)
            for k, c in enumerate(a):
                cuentas[k + n] += c  # el último elemento del primer grupo supera a los n del segundo
            for k, c in enumerate(b):
                cuentas[k] += c
            tabla[m][n] = cuentas
    cuentas = tabla[n1][n2]
    total = sum(cuentas)
    k = int(round(u))
    if u > n1 * n2 / 2:
        p = sum(cuentas[k:]) / total
    else:
        p = sum(cuentas[: k + 1]) / total
    return min(1.0, 2 * p)


def mann_whitney(a: list[float], b: list[float]) -> dict | None:
    """
    U de Mann-Whitney del primer grupo (la W que informan R y Jamovi). p exacta si no hay empates
    y ambos grupos tienen menos de 50 casos; si no, aproximación normal con corrección por empates
    y por continuidad (los valores por defecto de `wilcox.test`).
    """
    n1, n2 = len(a), len(b)
    if n1 == 0 or n2 == 0:
        return None
    rangos = _rangos(a + b)
    u = sum(rangos[:n1]) - n1 * (n1 + 1) / 2
    hay_empates = len(set(a + b)) < n1 + n2
    if not hay_empates and n1 < 50 and n2 < 50:
        return {"u": round(u, 1), "p_u": _p_exacta_u(u, n1, n2), "metodo_u": "exacta"}
    n = n1 + n2
    repeticiones: dict[float, int] = {}
    for v in a + b:
        repeticiones[v] = repeticiones.get(v, 0) + 1
    empates = sum(t ** 3 - t for t in repeticiones.values())
    sigma = math.sqrt(n1 * n2 / 12 * ((n + 1) - empates / (n * (n - 1))))
    if sigma == 0:
        return {"u": round(u, 1), "p_u": None, "metodo_u": "aproximación normal"}
    z = u - n1 * n2 / 2
    z = (z - math.copysign(0.5, z) if z else 0.0) / sigma
    return {"u": round(u, 1), "p_u": p_normal_bilateral(z), "metodo_u": "aproximación normal"}


def comparar_grupos(a: list[float], b: list[float]) -> dict | None:
    """
    Compara dos grupos independientes como la prueba t para muestras independientes de Jamovi:
    t de Student (varianzas iguales), t de Welch, U de Mann-Whitney y d de Cohen.
    """
    if len(a) < 2 or len(b) < 2:
        return None
    ma, mb = statistics.fmean(a), statistics.fmean(b)
    va, vb = statistics.variance(a), statistics.variance(b)
    na, nb = len(a), len(b)
    salida: dict[str, Any] = {"diferencia": round(ma - mb, 2), "t": None, "gl": None, "p": None,
                              "t_welch": None, "gl_welch": None, "p_welch": None, "d": None}

    de_comb = math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2))
    if de_comb:
        t = (ma - mb) / (de_comb * math.sqrt(1 / na + 1 / nb))
        gl = na + nb - 2
        salida.update(t=round(t, 3), gl=gl, p=p_t_bilateral(t, gl), d=round((ma - mb) / de_comb, 2))

    se2 = va / na + vb / nb
    if se2:
        t_w = (ma - mb) / math.sqrt(se2)
        gl_w = se2 ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1))
        salida.update(t_welch=round(t_w, 3), gl_welch=round(gl_w, 2), p_welch=p_t_bilateral(t_w, gl_w))

    salida.update(mann_whitney(a, b) or {"u": None, "p_u": None, "metodo_u": None})
    return salida


def comparar_correlaciones(r1: float | None, n1: int, r2: float | None, n2: int) -> dict | None:
    """z de Fisher para dos correlaciones de grupos independientes."""
    if r1 is None or r2 is None or n1 < 4 or n2 < 4 or abs(r1) >= 1 or abs(r2) >= 1:
        return None
    z = (math.atanh(r1) - math.atanh(r2)) / math.sqrt(1 / (n1 - 3) + 1 / (n2 - 3))
    return {"z": round(z, 3), "p": p_normal_bilateral(z)}


def promediar_correlaciones(grupos: list[tuple[str, float | None, int]]) -> dict | None:
    """
    Correlación promedio de varios grupos por z de Fisher, ponderada por n − 3 (efecto fijo).
    A diferencia de juntar a todos, no se infla cuando los grupos difieren en su nivel medio.
    Incluye la Q de Cochran: si es significativa, las correlaciones de los grupos difieren
    y el promedio resume mal a cada uno.
    """
    validos = [(et, r, n) for et, r, n in grupos if r is not None and n >= 4 and abs(r) < 1]
    if len(validos) < 2:
        return None
    pesos = [n - 3 for _, _, n in validos]
    zs = [math.atanh(r) for _, r, _ in validos]
    suma = sum(pesos)
    z_medio = sum(w * z for w, z in zip(pesos, zs)) / suma
    se = 1 / math.sqrt(suma)
    r = math.tanh(z_medio)
    q = sum(w * (z - z_medio) ** 2 for w, z in zip(pesos, zs))
    gl_q = len(validos) - 1
    return {
        "grupos": [et for et, _, _ in validos],
        "n": sum(n for _, _, n in validos),
        "r": round(r, 3),
        "ic95": [round(math.tanh(z_medio - 1.96 * se), 3), round(math.tanh(z_medio + 1.96 * se), 3)],
        "z": round(z_medio / se, 3),
        "p": p_normal_bilateral(z_medio / se),
        "interpretacion": interpretar_r(r),
        "q": round(q, 3),
        "gl_q": gl_q,
        "p_q": _p_chi2(q, gl_q),
    }


def _p_chi2(x: float, gl: int) -> float:
    """P(χ² ≥ x) con gl grados de libertad (gamma incompleta regularizada, serie/fracción continua)."""
    if x <= 0:
        return 1.0
    a, x2 = gl / 2, x / 2
    if x2 < a + 1:
        termino = suma = 1 / a
        k = a
        for _ in range(500):
            k += 1
            termino *= x2 / k
            suma += termino
            if abs(termino) < abs(suma) * 1e-14:
                break
        return 1 - suma * math.exp(-x2 + a * math.log(x2) - math.lgamma(a))
    tiny = 1e-300
    b = x2 + 1 - a
    c, d = 1 / tiny, 1 / b
    h = d
    for i in range(1, 500):
        an = -i * (i - a)
        b += 2
        d = an * d + b
        d = 1 / (d if abs(d) > tiny else tiny)
        c = b + an / c
        c = c if abs(c) > tiny else tiny
        h *= d * c
        if abs(d * c - 1) < 1e-14:
            break
    return math.exp(-x2 + a * math.log(x2) - math.lgamma(a)) * h


# ---------------------------------------------------------------------------
# Emparejamiento
# ---------------------------------------------------------------------------

def _registros(filas: list[dict], tipo: str) -> list[dict]:
    salida = []
    for fila in filas:
        if not isinstance(fila, dict):
            continue
        nombre = str(_valor_columna(fila, "Nombre") or "").strip()
        clave = clave_nombre(nombre)
        if not clave:
            continue
        reg = {
            "nombre": nombre,
            "clave": clave,
            "semestre": parsear_semestre(_valor_columna(fila, "Semestre")),
            "edad": _a_numero(_valor_columna(fila, "Edad")) or None,
            "genero": str(_valor_columna(fila, "Género") or "").strip(),
        }
        if tipo == "AUDIT":
            reg["audit"] = _a_numero(_valor_columna(fila, "Puntaje Total"))
            reg["diagnostico"] = str(_valor_columna(fila, "Diagnóstico") or "").strip()
            if reg["audit"] is None:
                continue
            # El dominio solo se calcula si están todos sus ítems (filas antiguas no los guardaban).
            for snake, _, items in DOMINIOS_AUDIT:
                valores = [_a_numero(_valor_columna(fila, f"Ítem {i}")) for i in items]
                reg[snake] = None if any(v is None for v in valores) else sum(valores)
        else:
            for cab, snake, _ in ESCALAS_BRIEF:
                reg[snake] = _a_numero(_valor_columna(fila, cab))
            for snake, _, escalas in INDICES_BRIEF:
                valores = [reg[e] for e in escalas]
                reg[snake] = None if any(v is None for v in valores) else sum(valores)
            reg["alerta_entrevista"] = str(_valor_columna(fila, "Alerta Entrevista") or "").strip()
            if reg["total_general"] is None:
                continue
        salida.append(reg)
    return salida


def _ultimo_por_clave(registros: list[dict]) -> dict[str, dict]:
    """Si una persona tiene el mismo test más de una vez, vale el último registrado."""
    por_clave: dict[str, dict] = {}
    for r in registros:
        por_clave[r["clave"]] = r
    return por_clave


def emparejar(filas_audit: list[dict], filas_brief: list[dict]) -> dict:
    audits = _ultimo_por_clave(_registros(filas_audit, "AUDIT"))
    briefs = _ultimo_por_clave(_registros(filas_brief, "BRIEF"))

    pares: list[tuple[dict, dict, str]] = []
    libres_brief = dict(briefs)
    pendientes_audit = []
    for clave, a in audits.items():
        if clave in libres_brief:
            pares.append((a, libres_brief.pop(clave), "exacto"))
        else:
            pendientes_audit.append(a)

    # Segundo intento por parecido, para errores de lectura del OCR ("Quiroga" / "Quiroqa").
    # Solo se acepta si el mejor candidato es claro y no hay otro casi igual de parecido.
    sin_pareja_audit = []
    for a in pendientes_audit:
        candidatos = sorted(
            ((difflib.SequenceMatcher(None, a["clave"], k).ratio(), k) for k in libres_brief),
            reverse=True,
        )
        if candidatos and candidatos[0][0] >= SIMILITUD_MINIMA and (
            len(candidatos) == 1 or candidatos[0][0] - candidatos[1][0] >= 0.05
        ):
            pares.append((a, libres_brief.pop(candidatos[0][1]), "similar"))
        else:
            sin_pareja_audit.append(a)

    personas = []
    for a, b, metodo in pares:
        sem_a, sem_b = a["semestre"], b["semestre"]
        persona = {
            "nombre": a["nombre"] or b["nombre"],
            "nombre_brief": b["nombre"],
            "emparejado_por": metodo,
            "semestre": sem_a if sem_a is not None else sem_b,
            "semestre_conflicto": sem_a is not None and sem_b is not None and sem_a != sem_b,
            "edad": a["edad"] or b["edad"],
            "genero": a["genero"] or b["genero"],
            "audit": a["audit"],
            "diagnostico": a["diagnostico"],
            "alerta_entrevista": b["alerta_entrevista"],
        }
        for snake, _, _ in DOMINIOS_AUDIT:
            persona[snake] = a[snake]
        for _, snake, _ in ESCALAS_BRIEF:
            persona[snake] = b[snake]
        for snake, _, _ in INDICES_BRIEF:
            persona[snake] = b[snake]
        personas.append(persona)
    personas.sort(key=lambda p: (p["semestre"] or 99, p["nombre"].lower()))

    return {
        "personas": personas,
        "solo_audit": [a["nombre"] for a in sin_pareja_audit],
        "solo_brief": [b["nombre"] for b in libres_brief.values()],
    }


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------

def _limpiar_p(d: dict | None) -> dict | None:
    """Redondea las p y quita NaN para que el JSON sea válido."""
    if d is None:
        return None
    salida = {}
    for k, v in d.items():
        if isinstance(v, float) and math.isnan(v):
            v = None
        elif k.startswith("p") and isinstance(v, float):
            v = round(v, 4)
        salida[k] = v
    return salida


def _analizar_grupo(personas: list[dict], etiqueta: str, semestre: int | None) -> dict:
    x = [p["audit"] for p in personas]
    y = [p["total_general"] for p in personas]
    escalas = []
    # Los subtotales por página no son escalas clínicas: solo las 9 escalas y el total.
    for _, snake, nombre in ESCALAS_BRIEF:
        if snake.startswith("subtotal"):
            continue
        pares = [(p["audit"], p[snake]) for p in personas if p[snake] is not None]
        c = correlacion([a for a, _ in pares], [b for _, b in pares])
        escalas.append({"escala": snake, "etiqueta": nombre, **_limpiar_p(c)})
    return {
        "semestre": semestre,
        "etiqueta": etiqueta,
        "n": len(personas),
        "audit": descriptivas(x),
        "brief": descriptivas(y),
        "correlacion": _limpiar_p(correlacion(x, y)),
        "correlacion_escalas": escalas,
    }


def variables_matriz() -> list[tuple[str, str, str]]:
    """(snake, etiqueta, test) en el orden de la matriz: primero el AUDIT y después el BRIEF-A."""
    escalas = [(snake, f"BRIEF-A: {nombre}", "BRIEF") for _, snake, nombre in ESCALAS_BRIEF
               if not snake.startswith("subtotal") and snake != "total_general"]
    return [
        ("audit", "AUDIT: Puntaje total", "AUDIT"),
        *[(snake, et, "AUDIT") for snake, et, _ in DOMINIOS_AUDIT],
        *escalas,
        *[(snake, et, "BRIEF") for snake, et, _ in INDICES_BRIEF],
        ("total_general", "BRIEF-A: Índice Global (GEC, Total General)", "BRIEF"),
    ]


def matriz_correlacion(personas: list[dict], etiqueta: str, semestre: int | None) -> dict:
    """
    Matriz de correlaciones de Pearson entre todas las variables del AUDIT y del BRIEF-A
    (como Jamovi: Regresión → Matriz de correlación). Cada par usa los casos que tienen
    los dos valores (eliminación por pares), por eso cada celda lleva su propio n.
    """
    variables = []
    for snake, nombre, test in variables_matriz():
        valores = [p[snake] for p in personas if p.get(snake) is not None]
        variables.append({"clave": snake, "etiqueta": nombre, "test": test, **descriptivas(valores)})
    # Una variable sin datos (p. ej. dominios del AUDIT cuando no se guardaron los ítems) no entra.
    variables = [v for v in variables if v["n"] > 0]

    celdas = []
    for i, vi in enumerate(variables):
        fila = []
        for j, vj in enumerate(variables[:i]):
            pares = [(p[vi["clave"]], p[vj["clave"]]) for p in personas
                     if p.get(vi["clave"]) is not None and p.get(vj["clave"]) is not None]
            n = len(pares)
            x, y = [a for a, _ in pares], [b for _, b in pares]
            r = _pearson_r(x, y)
            rho = _pearson_r(_rangos(x), _rangos(y)) if n >= 3 else None
            fila.append({
                "n": n,
                "r": None if r is None else round(r, 3),
                "p": None if r is None else round(_p_de_r(r, n), 4),
                "rho": None if rho is None else round(rho, 3),
                "p_rho": None if rho is None else round(_p_de_r(rho, n), 4),
            })
        celdas.append(fila)
    return {"semestre": semestre, "etiqueta": etiqueta, "n": len(personas), "variables": variables, "celdas": celdas}


def generar_correlacion(filas_audit: list[dict], filas_brief: list[dict], semestre_a: int = 1, semestre_b: int = 8) -> dict:
    emp = emparejar(filas_audit, filas_brief)
    personas = emp["personas"]
    con_semestre = [p for p in personas if p["semestre"] is not None]

    semestres = sorted({p["semestre"] for p in con_semestre})
    grupos = [
        _analizar_grupo([p for p in con_semestre if p["semestre"] == s], f"{s}.º semestre", s)
        for s in semestres
    ]
    total = _analizar_grupo(personas, "Muestra total", None)
    matrices = [
        matriz_correlacion([p for p in con_semestre if p["semestre"] == s], f"{s}.º semestre", s)
        for s in semestres
    ] + [matriz_correlacion(personas, "Muestra total", None)]

    ga = [p for p in con_semestre if p["semestre"] == semestre_a]
    gb = [p for p in con_semestre if p["semestre"] == semestre_b]
    corr_a = correlacion([p["audit"] for p in ga], [p["total_general"] for p in ga])
    corr_b = correlacion([p["audit"] for p in gb], [p["total_general"] for p in gb])
    comparacion = {
        "semestre_a": semestre_a,
        "semestre_b": semestre_b,
        "n_a": len(ga),
        "n_b": len(gb),
        "audit": _limpiar_p(comparar_grupos([p["audit"] for p in ga], [p["audit"] for p in gb])),
        "brief": _limpiar_p(comparar_grupos([p["total_general"] for p in ga], [p["total_general"] for p in gb])),
        "correlaciones": _limpiar_p(comparar_correlaciones(corr_a["r"], len(ga), corr_b["r"], len(gb))),
    }

    return {
        "total_audit": len({r["clave"] for r in _registros(filas_audit, "AUDIT")}),
        "total_brief": len({r["clave"] for r in _registros(filas_brief, "BRIEF")}),
        "personas": personas,
        "sin_semestre": [p["nombre"] for p in personas if p["semestre"] is None],
        "semestre_conflicto": [p["nombre"] for p in personas if p["semestre_conflicto"]],
        "emparejados_por_similitud": [
            {"audit": p["nombre"], "brief": p["nombre_brief"]} for p in personas if p["emparejado_por"] == "similar"
        ],
        "solo_audit": emp["solo_audit"],
        "solo_brief": emp["solo_brief"],
        "semestres": semestres,
        "grupos": grupos,
        "total": total,
        "matrices": matrices,
        "promedio_semestres": _limpiar_p(promediar_correlaciones(
            [(g["etiqueta"], g["correlacion"]["r"], g["n"]) for g in grupos]
        )),
        "comparacion": comparacion,
    }


def generar_csv_correlacion(filas_audit: list[dict], filas_brief: list[dict], incluir_nombres: bool = False) -> str:
    """Una fila por estudiante con su AUDIT y su BRIEF, lista para Jamovi (Regresión → Matriz de correlación)."""
    personas = emparejar(filas_audit, filas_brief)["personas"]
    columnas = ["id_caso"] + (["nombre"] if incluir_nombres else []) + [
        "semestre", "edad", "genero", "audit_total", "audit_diagnostico",
    ] + [snake for snake, _, _ in DOMINIOS_AUDIT] + [snake for _, snake, _ in ESCALAS_BRIEF] + [
        snake for snake, _, _ in INDICES_BRIEF
    ] + ["brief_alerta_entrevista"]

    buffer = io.StringIO()
    escritor = csv.writer(buffer, lineterminator="\n")
    escritor.writerow(columnas)
    for i, p in enumerate(personas, start=1):
        valores = {
            "id_caso": i,
            "nombre": p["nombre"],
            "semestre": p["semestre"],
            "edad": p["edad"],
            "genero": p["genero"],
            "audit_total": p["audit"],
            "audit_diagnostico": p["diagnostico"],
            "brief_alerta_entrevista": p["alerta_entrevista"],
            **{snake: p[snake] for _, snake, _ in ESCALAS_BRIEF},
            **{snake: p[snake] for snake, _, _ in DOMINIOS_AUDIT},
            **{snake: p[snake] for snake, _, _ in INDICES_BRIEF},
        }
        fila = []
        for col in columnas:
            v = valores.get(col)
            if isinstance(v, float) and v.is_integer():
                v = int(v)
            fila.append("" if v is None else v)
        escritor.writerow(fila)
    return "﻿" + buffer.getvalue()
