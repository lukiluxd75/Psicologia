def calcular_audit(datos: dict) -> dict:
    # 'datos' es un diccionario que Gemini nos devolverá. 
    # Esperamos que tenga: 'sexo' y 'respuestas' (lista de 10 enteros)
    
    puntaje_total = sum(datos.get('respuestas', []))
    sexo = datos.get('sexo', '').upper()
    
    nivel_riesgo = ""
    
    if sexo in ['M', 'MASCULINO', 'HOMBRE']:
        if puntaje_total <= 4:
            nivel_riesgo = "Consumo de bajo riesgo"
        elif 5 <= puntaje_total <= 15:
            nivel_riesgo = "Consumo de riesgo"
        else:
             nivel_riesgo = "Posible consumo problema o dependencia"
             
    elif sexo in ['F', 'FEMENINO', 'MUJER']:
        if puntaje_total <= 3:
            nivel_riesgo = "Consumo de bajo riesgo"
        elif 4 <= puntaje_total <= 15:
            nivel_riesgo = "Consumo de riesgo"
        else:
             nivel_riesgo = "Posible consumo problema o dependencia"
    else:
        nivel_riesgo = "Error: Sexo no definido correctamente"
        
    datos['puntaje_total'] = puntaje_total
    datos['nivel_riesgo'] = nivel_riesgo
    
    return datos