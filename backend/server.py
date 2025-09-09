from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import cloudinary
import cloudinary.uploader

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Gestión de Prospectos - Sundeck", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class Prospecto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    telefono: str
    producto_solicitado: str
    fecha_cita: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    etapas: List[dict] = Field(default_factory=list)

class ProspectoCreate(BaseModel):
    nombre: str
    telefono: str
    producto_solicitado: str
    fecha_cita: datetime

class EtapaCreate(BaseModel):
    nombre_etapa: str
    comentario: str

class Etapa(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre_etapa: str
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    comentario: str
    fotos: List[str] = Field(default_factory=list)

# Cloudinary service functions
def upload_to_cloudinary(file_content, filename: str):
    """Upload file to Cloudinary"""
    try:
        result = cloudinary.uploader.upload(
            file_content,
            public_id=f"prospectos/{filename}",
            folder="prospectos",
            resource_type="auto"
        )
        return {
            'url': result['secure_url'],
            'public_id': result['public_id']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading to Cloudinary: {str(e)}")

def generate_thumbnail(public_id: str):
    """Generate thumbnail URL"""
    return cloudinary.utils.cloudinary_url(
        public_id,
        width=300,
        height=300,
        crop='fill',
        quality='auto:good'
    )[0]

# Routes
@api_router.get("/")
async def root():
    return {"message": "API Gestión de Prospectos Sundeck", "status": "running"}

@api_router.post("/prospectos", response_model=Prospecto)
async def crear_prospecto(prospecto_data: ProspectoCreate):
    """Crear nuevo prospecto"""
    try:
        prospecto_dict = prospecto_data.dict()
        prospecto_dict['id'] = str(uuid.uuid4())
        prospecto_dict['created_at'] = datetime.now(timezone.utc)
        prospecto_dict['etapas'] = []
        
        # Convert datetime to ISO string for MongoDB
        if isinstance(prospecto_dict['fecha_cita'], datetime):
            prospecto_dict['fecha_cita'] = prospecto_dict['fecha_cita'].isoformat()
        if isinstance(prospecto_dict['created_at'], datetime):
            prospecto_dict['created_at'] = prospecto_dict['created_at'].isoformat()
        
        result = await db.prospectos.insert_one(prospecto_dict)
        
        # Retrieve the created document
        created_doc = await db.prospectos.find_one({"_id": result.inserted_id})
        
        # Convert back to datetime objects for response
        if isinstance(created_doc['fecha_cita'], str):
            created_doc['fecha_cita'] = datetime.fromisoformat(created_doc['fecha_cita'])
        if isinstance(created_doc['created_at'], str):
            created_doc['created_at'] = datetime.fromisoformat(created_doc['created_at'])
            
        return Prospecto(**created_doc)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating prospecto: {str(e)}")

@api_router.get("/prospectos", response_model=List[Prospecto])
async def obtener_prospectos():
    """Obtener todos los prospectos"""
    try:
        prospectos = await db.prospectos.find().to_list(length=None)
        
        # Convert string dates back to datetime objects
        for prospecto in prospectos:
            if isinstance(prospecto.get('fecha_cita'), str):
                prospecto['fecha_cita'] = datetime.fromisoformat(prospecto['fecha_cita'])
            if isinstance(prospecto.get('created_at'), str):
                prospecto['created_at'] = datetime.fromisoformat(prospecto['created_at'])
                
            # Process etapas dates
            for etapa in prospecto.get('etapas', []):
                if isinstance(etapa.get('fecha'), str):
                    etapa['fecha'] = datetime.fromisoformat(etapa['fecha'])
        
        return [Prospecto(**prospecto) for prospecto in prospectos]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving prospectos: {str(e)}")

@api_router.get("/prospectos/{prospecto_id}")
async def obtener_prospecto(prospecto_id: str):
    """Obtener prospecto por ID"""
    try:
        prospecto = await db.prospectos.find_one({"id": prospecto_id})
        
        if not prospecto:
            raise HTTPException(status_code=404, detail="Prospecto not found")
        
        # Convert string dates back to datetime objects
        if isinstance(prospecto.get('fecha_cita'), str):
            prospecto['fecha_cita'] = datetime.fromisoformat(prospecto['fecha_cita'])
        if isinstance(prospecto.get('created_at'), str):
            prospecto['created_at'] = datetime.fromisoformat(prospecto['created_at'])
            
        # Process etapas dates
        for etapa in prospecto.get('etapas', []):
            if isinstance(etapa.get('fecha'), str):
                etapa['fecha'] = datetime.fromisoformat(etapa['fecha'])
        
        return Prospecto(**prospecto)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving prospecto: {str(e)}")

@api_router.post("/prospectos/{prospecto_id}/etapas")
async def agregar_etapa(
    prospecto_id: str,
    etapa_data: EtapaCreate = Depends(),
    fotos: List[UploadFile] = File(default=[])
):
    """Agregar nueva etapa a un prospecto con fotos"""
    try:
        # Check if prospecto exists
        prospecto = await db.prospectos.find_one({"id": prospecto_id})
        if not prospecto:
            raise HTTPException(status_code=404, detail="Prospecto not found")
        
        # Upload photos to Cloudinary
        foto_urls = []
        for foto in fotos:
            if foto.filename and foto.size > 0:
                content = await foto.read()
                filename = f"{prospecto_id}_{etapa_data.nombre_etapa}_{foto.filename}"
                upload_result = upload_to_cloudinary(content, filename)
                foto_urls.append(upload_result['url'])
        
        # Create new etapa
        nueva_etapa = {
            "id": str(uuid.uuid4()),
            "nombre_etapa": etapa_data.nombre_etapa,
            "fecha": datetime.now(timezone.utc).isoformat(),
            "comentario": etapa_data.comentario,
            "fotos": foto_urls
        }
        
        # Add etapa to prospecto
        await db.prospectos.update_one(
            {"id": prospecto_id},
            {"$push": {"etapas": nueva_etapa}}
        )
        
        return {"message": "Etapa agregada correctamente", "etapa": nueva_etapa}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding etapa: {str(e)}")

@api_router.get("/citas-hoy")
async def obtener_citas_hoy():
    """Obtener prospectos con cita para hoy"""
    try:
        hoy = datetime.now(timezone.utc).date()
        
        # Get all prospectos and filter by date
        prospectos = await db.prospectos.find().to_list(length=None)
        citas_hoy = []
        
        for prospecto in prospectos:
            fecha_cita = prospecto.get('fecha_cita')
            if isinstance(fecha_cita, str):
                fecha_cita = datetime.fromisoformat(fecha_cita)
            
            if fecha_cita and fecha_cita.date() == hoy:
                # Convert dates for response
                if isinstance(prospecto.get('created_at'), str):
                    prospecto['created_at'] = datetime.fromisoformat(prospecto['created_at'])
                
                prospecto['fecha_cita'] = fecha_cita
                citas_hoy.append(Prospecto(**prospecto))
        
        return citas_hoy
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving today's appointments: {str(e)}")

@api_router.delete("/prospectos/{prospecto_id}")
async def eliminar_prospecto(prospecto_id: str):
    """Eliminar prospecto"""
    try:
        result = await db.prospectos.delete_one({"id": prospecto_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Prospecto not found")
        
        return {"message": "Prospecto eliminado correctamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting prospecto: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()