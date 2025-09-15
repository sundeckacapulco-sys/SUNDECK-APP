# SUNDECK-APP

Sistema de gestión de prospectos, instalaciones y postventa.

## Requisitos previos

- Python 3.10 o superior.
- Node.js 18 o superior (incluye npm).
- Una instancia de MongoDB accesible localmente (por ejemplo, mediante Docker o una instalación local).
- Una clave de API de OpenAI para las funcionalidades asistidas por IA.

## Configuración del backend (FastAPI)

1. Ve al directorio del backend:
   ```bash
   cd backend
   ```
2. (Opcional) Crea y activa un entorno virtual:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # En Windows usa .venv\Scripts\activate
   ```
3. Instala las dependencias necesarias:
   ```bash
   pip install -r requirements.txt
   ```
4. Copia el archivo de variables de entorno de ejemplo y completa los valores necesarios:
   ```bash
   cp .env.example .env
   ```
5. Asegúrate de que MongoDB esté en ejecución. Puedes levantar una instancia rápida con Docker:
   ```bash
   docker run -d --name mongodb -p 27017:27017 mongo:7
   ```
6. Inicia el servidor de desarrollo de FastAPI:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

El backend quedará disponible en `http://localhost:8000` y expone la documentación interactiva en `http://localhost:8000/docs`.

## Configuración del frontend (Vite + React)

1. Abre una nueva terminal y navega al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias de Node:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```

El frontend quedará disponible en `http://localhost:5173` y consumirá automáticamente la API del backend en `http://localhost:8000`.

## Uso de la aplicación

1. Abre el navegador en `http://localhost:5173`.
2. Crea prospectos y gestiona su flujo a través del tablero Kanban.
3. Consulta métricas, escalaciones, materiales de capacitación y plantillas a través de las distintas pestañas de la interfaz.

Con estos pasos deberías poder ejecutar SUNDECK-APP localmente sin depender de servicios externos.
