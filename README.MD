# PsicoMetric AI — Sistema de Corrección Psicométrica Automatizada

Plataforma web clínica automatizada para psicólogos que procesa, califica y almacena los resultados de tres pruebas psicométricas físicas a partir de fotografías tomadas con la cámara o celular:

1. **Test AUDIT (OMS)**: Identificación de trastornos por consumo de alcohol (10 ítems, 1 imagen).
2. **Test BRIEF**: Evaluación conductual de la función ejecutiva en adultos (75 ítems, 2 imágenes, 9 escalas clínicas y controles de validez N, I, F).
3. **Escala PASS**: Detección de ansiedad perinatal (31 ítems, 2 imágenes, 4 subescalas, punto de corte 26, severidad y alerta fobia Ítem 7).

Incluye persistencia automática en **Google Sheets** y un módulo de **Historial Clínico** local persistente en el navegador para consultar resultados con nombre y edad.

---

## 🚀 Arquitectura Tecnológica

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS v4 + Lucide Icons.
- **Backend**: FastAPI (Python 3.11) + Uvicorn + Pydantic v2.
- **OCR / Visión por Computadora**: Google Gemini Flash API (`google-generativeai`).
- **Almacenamiento en la Nube**: Google Sheets API (`gspread` + `google-auth`).

---

## 🛠️ Variables de Entorno

### Backend (`backend/.env`)

```ini
# Clave de Gemini AI (https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=tu_gemini_api_key

# ID de Google Sheets (https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit)
SPREADSHEET_ID=tu_spreadsheet_id

# (Opcional) En despliegues cloud puedes inyectar el JSON de credenciales de Google
# sin necesidad de subir el archivo credentials.json:
# GOOGLE_CREDENTIALS_JSON={"type": "service_account", ...}

# Puerto del servidor (por defecto 8000)
PORT=8000
```

### Frontend (`frontend/.env`)

```ini
# Solo necesario si frontend y backend se despliegan en dominios distintos (ej. Vercel + Railway):
# VITE_API_URL=https://tu-backend.railway.app
# En despliegue unificado o local, déjalo vacío.
VITE_API_URL=
```

---

## 💻 Ejecución en Desarrollo Local

### 1. Backend
```bash
cd backend
python -m venv venv
# En Windows:
.\venv\Scripts\activate
# En Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
El backend estará disponible en `http://localhost:8000`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

---

## 🐳 Despliegue con Docker (Recomendado para Producción)

El proyecto incluye un `Dockerfile` multi-etapa que compila el frontend y lo sirve directamente a través de FastAPI en un único contenedor ligero y optimizado:

```bash
# Construir y levantar con Docker Compose
docker compose up --build -d
```

La aplicación completa estará corriendo en `http://localhost:8000` con el frontend servido en la raíz y la API en `/api/*`.

---

## ☁️ Despliegue en la Nube

### Opción A: Despliegue Unificado (Railway / Render / Fly.io)
1. Conecta el repositorio a Railway o Render.
2. Define las variables de entorno:
   - `GEMINI_API_KEY`
   - `SPREADSHEET_ID`
   - `GOOGLE_CREDENTIALS_JSON` (contenido del JSON de la cuenta de servicio de Google)
3. En el comando de inicio (`Start Command`):
   ```bash
   uvicorn main:app --app-dir backend --host 0.0.0.0 --port $PORT
   ```
4. El backend servirá automáticamente la carpeta `frontend/dist` compilada.

### Opción B: Despliegue Desacoplado (Frontend en Vercel + Backend en Render/Railway)
1. **Backend**: Despliega la carpeta `backend` en Render/Railway y obtén su URL pública (ej. `https://psico-api.onrender.com`).
2. **Frontend**: Despliega la carpeta `frontend` en Vercel/Netlify y configura la variable de entorno:
   ```ini
   VITE_API_URL=https://psico-api.onrender.com
   ```

---

## 📋 Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del backend, Gemini y Google Sheets |
| `POST` | `/api/upload/audit` | OCR y corrección de Test AUDIT (1 imagen) |
| `POST` | `/api/upload/brief` | OCR y corrección de Test BRIEF (2 imágenes) |
| `POST` | `/api/upload/pass` | OCR y corrección de Test PASS (2 imágenes) |
| `POST` | `/api/test/audit/manual` | Cálculo manual/simulador de Test AUDIT |
| `POST` | `/api/test/brief/manual` | Cálculo manual/simulador de Test BRIEF |
| `POST` | `/api/test/pass/manual` | Cálculo manual/simulador de Test PASS |
