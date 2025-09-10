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
    direccion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    etapas: List[dict] = Field(default_factory=list)

class ProspectoCreate(BaseModel):
    nombre: str
    telefono: str
    producto_solicitado: str
    fecha_cita: datetime
    direccion: Optional[str] = None

class PiezaMedicion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ubicacion: str
    ancho: float
    alto: float
    producto_tela: str
    color_acabado: str
    observaciones: Optional[str] = ""
    fotos: List[str] = Field(default_factory=list)
    notas_video_url: Optional[str] = ""
    metros_cuadrados: Optional[float] = None  # Calculado automáticamente
    precio_m2: Optional[float] = None  # Precio manual por m²
    total_pieza: Optional[float] = None  # Total calculado de la pieza

class EtapaCreate(BaseModel):
    nombre_etapa: str
    comentario: str
    # Campos específicos para Visita Inicial / Medición
    piezas_medicion: Optional[List[dict]] = None
    precio_m2_general: Optional[float] = None  # Precio general por m²
    total_m2: Optional[float] = None  # Total m² calculado
    total_estimado: Optional[float] = None  # Total estimado de la cotización
    unidad_medida: Optional[str] = "m"  # 'm' o 'cm'
    # Campos específicos para Pedido
    monto_total: Optional[float] = None
    anticipo_recibido: Optional[float] = None
    saldo_pendiente: Optional[float] = None
    forma_pago: Optional[str] = None
    fecha_vencimiento_saldo: Optional[str] = None
    # Datos heredados de medición para pedido
    cotizacion_url: Optional[str] = None
    archivo_levantamiento_url: Optional[str] = None

class Etapa(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre_etapa: str
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    comentario: str
    fotos: List[str] = Field(default_factory=list)
    piezas_medicion: Optional[List[dict]] = Field(default_factory=list)
    precio_m2_general: Optional[float] = None
    total_m2: Optional[float] = None
    total_estimado: Optional[float] = None
    unidad_medida: Optional[str] = "m"
    # Campos específicos para Pedido
    monto_total: Optional[float] = None
    anticipo_recibido: Optional[float] = None
    saldo_pendiente: Optional[float] = None
    forma_pago: Optional[str] = None
    fecha_vencimiento_saldo: Optional[str] = None
    cotizacion_url: Optional[str] = None
    archivo_levantamiento_url: Optional[str] = None

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

@api_router.get("/prospectos", response_model=dict)
async def obtener_prospectos(
    page: int = 1,
    limit: int = 12,
    search: str = None,
    etapa_filter: str = None,
    fecha_inicio: str = None,
    fecha_fin: str = None
):
    """Obtener prospectos con paginación, búsqueda y filtros"""
    try:
        # Calcular skip para paginación
        skip = (page - 1) * limit
        
        # Construir filtro de búsqueda
        search_filter = {}
        
        # Búsqueda por nombre o teléfono
        if search and search.strip():
            search_filter["$or"] = [
                {"nombre": {"$regex": search.strip(), "$options": "i"}},
                {"telefono": {"$regex": search.strip(), "$options": "i"}}
            ]
        
        # Filtro por etapa (buscar en la última etapa)
        if etapa_filter and etapa_filter.strip():
            # Necesitamos usar aggregation para filtrar por última etapa
            pass
        
        # Filtro por fecha de cita
        if fecha_inicio or fecha_fin:
            date_filter = {}
            if fecha_inicio:
                date_filter["$gte"] = fecha_inicio
            if fecha_fin:
                date_filter["$lte"] = fecha_fin
            if date_filter:
                search_filter["fecha_cita"] = date_filter
        
        # Si tenemos filtro de etapa, usar aggregation pipeline
        if etapa_filter and etapa_filter.strip():
            pipeline = [
                {"$match": search_filter},
                {
                    "$addFields": {
                        "ultima_etapa": {
                            "$cond": {
                                "if": {"$gt": [{"$size": "$etapas"}, 0]},
                                "then": {"$arrayElemAt": ["$etapas.nombre_etapa", -1]},
                                "else": None
                            }
                        }
                    }
                },
                {"$match": {"ultima_etapa": etapa_filter}},
                {"$sort": {"created_at": -1}},
                {"$skip": skip},
                {"$limit": limit}
            ]
            
            prospectos_cursor = db.prospectos.aggregate(pipeline)
            prospectos = await prospectos_cursor.to_list(length=None)
            
            # Contar total con filtros
            count_pipeline = [
                {"$match": search_filter},
                {
                    "$addFields": {
                        "ultima_etapa": {
                            "$cond": {
                                "if": {"$gt": [{"$size": "$etapas"}, 0]},
                                "then": {"$arrayElemAt": ["$etapas.nombre_etapa", -1]},
                                "else": None
                            }
                        }
                    }
                },
                {"$match": {"ultima_etapa": etapa_filter}},
                {"$count": "total"}
            ]
            
            count_result = await db.prospectos.aggregate(count_pipeline).to_list(length=1)
            total_count = count_result[0]["total"] if count_result else 0
            
        else:
            # Consulta simple sin filtro de etapa
            prospectos = await db.prospectos.find(search_filter).sort("created_at", -1).skip(skip).limit(limit).to_list(length=None)
            total_count = await db.prospectos.count_documents(search_filter)
        
        # Convertir dates back to datetime objects
        for prospecto in prospectos:
            if isinstance(prospecto.get('fecha_cita'), str):
                prospecto['fecha_cita'] = datetime.fromisoformat(prospecto['fecha_cita'])
            if isinstance(prospecto.get('created_at'), str):
                prospecto['created_at'] = datetime.fromisoformat(prospecto['created_at'])
                
            # Process etapas dates
            for etapa in prospecto.get('etapas', []):
                if isinstance(etapa.get('fecha'), str):
                    etapa['fecha'] = datetime.fromisoformat(etapa['fecha'])
        
        # Calcular metadatos de paginación
        total_pages = (total_count + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1
        
        return {
            "prospectos": [Prospecto(**prospecto) for prospecto in prospectos],
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_count": total_count,
                "page_size": limit,
                "has_next": has_next,
                "has_prev": has_prev
            }
        }
        
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
    """Agregar nueva etapa a un prospecto con fotos y mediciones"""
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
            "fotos": foto_urls,
            "piezas_medicion": etapa_data.piezas_medicion if etapa_data.piezas_medicion else []
        }
        
        # Agregar campos específicos según el tipo de etapa
        if etapa_data.nombre_etapa == 'Visita Inicial / Medición':
            nueva_etapa.update({
                "precio_m2_general": etapa_data.precio_m2_general,
                "total_m2": etapa_data.total_m2,
                "total_estimado": etapa_data.total_estimado,
                "unidad_medida": etapa_data.unidad_medida or "m"
            })
        elif etapa_data.nombre_etapa == 'Pedido':
            nueva_etapa.update({
                "piezas_medicion": etapa_data.piezas_medicion or [],
                "precio_m2_general": etapa_data.precio_m2_general,
                "total_m2": etapa_data.total_m2,
                "total_estimado": etapa_data.total_estimado,
                "unidad_medida": etapa_data.unidad_medida or "m",
                "monto_total": etapa_data.monto_total,
                "anticipo_recibido": etapa_data.anticipo_recibido or 0,
                "saldo_pendiente": etapa_data.saldo_pendiente,
                "forma_pago": etapa_data.forma_pago or "",
                "fecha_vencimiento_saldo": etapa_data.fecha_vencimiento_saldo or "",
                "cotizacion_url": etapa_data.cotizacion_url or "",
                "archivo_levantamiento_url": etapa_data.archivo_levantamiento_url or ""
            })
        
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

@api_router.post("/prospectos/{prospecto_id}/etapas-json")
async def agregar_etapa_json(prospecto_id: str, etapa_data: EtapaCreate):
    """Agregar nueva etapa usando JSON (para testing con datos complejos)"""
    try:
        # Check if prospecto exists
        prospecto = await db.prospectos.find_one({"id": prospecto_id})
        if not prospecto:
            raise HTTPException(status_code=404, detail="Prospecto not found")
        
        # Create new etapa
        nueva_etapa = {
            "id": str(uuid.uuid4()),
            "nombre_etapa": etapa_data.nombre_etapa,
            "fecha": datetime.now(timezone.utc).isoformat(),
            "comentario": etapa_data.comentario,
            "fotos": [],  # No photos in JSON endpoint
            "piezas_medicion": etapa_data.piezas_medicion if etapa_data.piezas_medicion else []
        }
        
        # Agregar campos específicos según el tipo de etapa
        if etapa_data.nombre_etapa == 'Visita Inicial / Medición':
            nueva_etapa.update({
                "precio_m2_general": etapa_data.precio_m2_general,
                "total_m2": etapa_data.total_m2,
                "total_estimado": etapa_data.total_estimado,
                "unidad_medida": etapa_data.unidad_medida or "m"
            })
        elif etapa_data.nombre_etapa == 'Pedido':
            nueva_etapa.update({
                "piezas_medicion": etapa_data.piezas_medicion or [],
                "precio_m2_general": etapa_data.precio_m2_general,
                "total_m2": etapa_data.total_m2,
                "total_estimado": etapa_data.total_estimado,
                "unidad_medida": etapa_data.unidad_medida or "m",
                "monto_total": etapa_data.monto_total,
                "anticipo_recibido": etapa_data.anticipo_recibido or 0,
                "saldo_pendiente": etapa_data.saldo_pendiente,
                "forma_pago": etapa_data.forma_pago or "",
                "fecha_vencimiento_saldo": etapa_data.fecha_vencimiento_saldo or "",
                "cotizacion_url": etapa_data.cotizacion_url or "",
                "archivo_levantamiento_url": etapa_data.archivo_levantamiento_url or ""
            })
        
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

@api_router.get("/prospectos/{prospecto_id}/medicion/export")
async def exportar_medicion(prospecto_id: str):
    """Exportar medición de un prospecto"""
    try:
        prospecto = await db.prospectos.find_one({"id": prospecto_id})
        if not prospecto:
            raise HTTPException(status_code=404, detail="Prospecto not found")
        
        # Buscar etapa de medición
        etapa_medicion = None
        for etapa in prospecto.get('etapas', []):
            if etapa.get('nombre_etapa') == 'Visita Inicial / Medición':
                etapa_medicion = etapa
                break
        
        if not etapa_medicion or not etapa_medicion.get('piezas_medicion'):
            raise HTTPException(status_code=404, detail="No se encontraron mediciones para este prospecto")
        
        return {
            "prospecto": {
                "nombre": prospecto["nombre"],
                "telefono": prospecto["telefono"],
                "producto_solicitado": prospecto["producto_solicitado"],
                "fecha_cita": prospecto["fecha_cita"],
                "direccion": prospecto.get("direccion", "")
            },
            "medicion": {
                "fecha": etapa_medicion["fecha"],
                "comentario": etapa_medicion["comentario"],
                "piezas": etapa_medicion["piezas_medicion"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting medicion: {str(e)}")

@api_router.post("/prospectos/{prospecto_id}/generar-pedido")
async def generar_pedido_desde_medicion(prospecto_id: str):
    """Generar pedido automáticamente desde la etapa de medición"""
    try:
        # Buscar el prospecto
        prospecto = await db.prospectos.find_one({"id": prospecto_id})
        if not prospecto:
            raise HTTPException(status_code=404, detail="Prospecto not found")
        
        # Buscar la etapa de medición
        etapa_medicion = None
        for etapa in prospecto.get('etapas', []):
            if etapa.get('nombre_etapa') == 'Visita Inicial / Medición':
                etapa_medicion = etapa
                break
        
        if not etapa_medicion:
            raise HTTPException(status_code=400, detail="No se encontró etapa de medición para generar pedido")
        
        if not etapa_medicion.get('piezas_medicion'):
            raise HTTPException(status_code=400, detail="La etapa de medición no tiene piezas registradas")
        
        # Calcular totales aplicando regla mínimo 1 m²
        total_m2_real = 0
        total_m2_comercial = 0
        total_estimado = 0
        
        piezas_procesadas = []
        precio_general = etapa_medicion.get('precio_m2_general', 0)
        unidad_medida = etapa_medicion.get('unidad_medida', 'm')
        
        for pieza in etapa_medicion['piezas_medicion']:
            # Calcular m² real
            ancho = float(pieza.get('ancho', 0))
            alto = float(pieza.get('alto', 0))
            
            if unidad_medida == 'm':
                m2_real = ancho * alto
            else:  # cm
                m2_real = (ancho / 100) * (alto / 100)
            
            # Aplicar regla mínimo 1 m² para cálculo comercial
            m2_comercial = max(m2_real, 1.0)
            
            # Calcular precio
            precio_aplicado = float(pieza.get('precio_m2', 0)) or precio_general
            subtotal = m2_comercial * precio_aplicado
            
            # Agregar información comercial a la pieza
            pieza_procesada = pieza.copy()
            pieza_procesada['m2_real'] = round(m2_real, 2)
            pieza_procesada['m2_comercial'] = round(m2_comercial, 2)
            pieza_procesada['precio_aplicado'] = precio_aplicado
            pieza_procesada['subtotal'] = round(subtotal, 2)
            
            piezas_procesadas.append(pieza_procesada)
            
            total_m2_real += m2_real
            total_m2_comercial += m2_comercial
            if precio_aplicado > 0:
                total_estimado += subtotal
        
        # Crear la nueva etapa de pedido
        nueva_etapa = {
            "id": str(uuid.uuid4()),
            "nombre_etapa": "Pedido",
            "fecha": datetime.now(timezone.utc).isoformat(),
            "comentario": f"Pedido generado automáticamente desde medición. Total: {len(piezas_procesadas)} piezas, {round(total_m2_comercial, 2)} m² comerciales.",
            "fotos": etapa_medicion.get('fotos', []).copy(),  # Copiar fotos de medición
            "piezas_medicion": piezas_procesadas,
            "precio_m2_general": precio_general,
            "total_m2": round(total_m2_comercial, 2),  # Usar m² comercial para totales
            "total_m2_real": round(total_m2_real, 2),  # Guardar también el real
            "total_estimado": round(total_estimado, 2),
            "unidad_medida": unidad_medida,
            # Campos de pedido inicializados
            "monto_total": round(total_estimado, 2),
            "anticipo_recibido": 0,
            "saldo_pendiente": round(total_estimado, 2),
            "forma_pago": "",
            "fecha_vencimiento_saldo": "",
            "cotizacion_url": "",
            "archivo_levantamiento_url": ""
        }
        
        # Verificar que no existe ya una etapa de pedido
        etapa_pedido_existente = any(
            etapa.get('nombre_etapa') == 'Pedido' 
            for etapa in prospecto.get('etapas', [])
        )
        
        if etapa_pedido_existente:
            raise HTTPException(status_code=400, detail="Ya existe una etapa de pedido para este prospecto")
        
        # Agregar etapa de pedido al prospecto
        await db.prospectos.update_one(
            {"id": prospecto_id},
            {"$push": {"etapas": nueva_etapa}}
        )
        
        return {
            "message": "Pedido generado correctamente",
            "etapa": nueva_etapa,
            "resumen": {
                "total_piezas": len(piezas_procesadas),
                "total_m2_real": round(total_m2_real, 2),
                "total_m2_comercial": round(total_m2_comercial, 2),
                "total_estimado": round(total_estimado, 2),
                "regla_minimo_aplicada": total_m2_comercial > total_m2_real
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando pedido: {str(e)}")

@api_router.get("/kanban")
async def obtener_kanban_data():
    """Obtener datos organizados por columnas para vista Kanban"""
    try:
        # Definir las columnas del Kanban en orden
        columnas_kanban = [
            "Prospectos Nuevos",
            "Cotizaciones Activas", 
            "Pedidos",
            "Fabricación",
            "Instalación",
            "Entrega",
            "Postventa"
        ]
        
        # Mapeo de etapas a columnas Kanban
        mapeo_etapas = {
            "Visita Inicial / Medición": "Prospectos Nuevos",
            "Cotización Aprobada": "Cotizaciones Activas",
            "Pedido": "Pedidos", 
            "Fabricación": "Fabricación",
            "Instalación en Proceso": "Instalación",
            "Entrega Final": "Entrega",
            "Postventa": "Postventa"
        }
        
        # Obtener todos los prospectos
        prospectos_raw = await db.prospectos.find().to_list(length=None)
        
        # Convertir ObjectIds y procesar fechas
        prospectos = []
        for prospecto in prospectos_raw:
            # Convertir _id a string y crear campo id si no existe
            if '_id' in prospecto:
                del prospecto['_id']  # Remover _id de MongoDB
            
            # Procesar fechas
            if isinstance(prospecto.get('fecha_cita'), str):
                prospecto['fecha_cita'] = datetime.fromisoformat(prospecto['fecha_cita'])
            if isinstance(prospecto.get('created_at'), str):
                prospecto['created_at'] = datetime.fromisoformat(prospecto['created_at'])
                
            # Procesar etapas
            for etapa in prospecto.get('etapas', []):
                if isinstance(etapa.get('fecha'), str):
                    etapa['fecha'] = datetime.fromisoformat(etapa['fecha'])
            
            prospectos.append(prospecto)
        
        # Organizar prospectos por columnas
        kanban_data = {}
        kpis = {}
        
        for columna in columnas_kanban:
            kanban_data[columna] = []
            kpis[columna] = 0
        
        # Clasificar prospectos
        for prospecto in prospectos:
            # Determinar columna basada en la última etapa
            ultima_etapa_nombre = None
            if prospecto.get('etapas') and len(prospecto['etapas']) > 0:
                ultima_etapa_nombre = prospecto['etapas'][-1]['nombre_etapa']
                columna = mapeo_etapas.get(ultima_etapa_nombre, "Prospectos Nuevos")
            else:
                columna = "Prospectos Nuevos"
            
            # Enriquecer prospecto con metadata para Kanban
            urgencia = calcular_urgencia_prospecto(prospecto)
            fecha_proxima = calcular_fecha_proxima_accion(prospecto)
            
            prospecto_kanban = {
                "id": prospecto.get('id', ''),
                "nombre": prospecto.get('nombre', ''),
                "telefono": prospecto.get('telefono', ''),
                "producto_solicitado": prospecto.get('producto_solicitado', ''),
                "fecha_cita": prospecto.get('fecha_cita').isoformat() if prospecto.get('fecha_cita') else None,
                "created_at": prospecto.get('created_at').isoformat() if prospecto.get('created_at') else None,
                "etapas": prospecto.get('etapas', []),
                "columna_actual": columna,
                "ultima_etapa": ultima_etapa_nombre,
                "fecha_ultima_etapa": prospecto['etapas'][-1]['fecha'].isoformat() if prospecto.get('etapas') and len(prospecto['etapas']) > 0 else None,
                "total_etapas": len(prospecto.get('etapas', [])),
                "urgencia": urgencia,
                "fecha_proxima_accion": fecha_proxima.isoformat() if fecha_proxima else None
            }
            
            kanban_data[columna].append(prospecto_kanban)
            kpis[columna] += 1
        
        # Ordenar cada columna por urgencia y fecha
        for columna in kanban_data:
            kanban_data[columna].sort(key=lambda x: (
                x['urgencia'], 
                x['fecha_proxima_accion'] or datetime.now(timezone.utc).isoformat()
            ), reverse=True)
        
        return {
            "kanban": kanban_data,
            "kpis": kpis,
            "columnas": columnas_kanban,
            "total_prospectos": len(prospectos)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving Kanban data: {str(e)}")

def calcular_urgencia_prospecto(prospecto):
    """Calcular nivel de urgencia: 0=verde, 1=amarillo, 2=rojo"""
    try:
        fecha_cita = prospecto.get('fecha_cita')
        if not fecha_cita:
            return 0
            
        if isinstance(fecha_cita, str):
            fecha_cita = datetime.fromisoformat(fecha_cita)
        
        hoy = datetime.now(timezone.utc).date()
        fecha_cita_date = fecha_cita.date()
        
        if fecha_cita_date < hoy:
            return 2  # Rojo - vencida
        elif fecha_cita_date == hoy:
            return 1  # Amarillo - hoy
        else:
            return 0  # Verde - futuro
            
    except:
        return 0

def calcular_fecha_proxima_accion(prospecto):
    """Calcular la próxima fecha de acción relevante"""
    try:
        # Priorizar fecha de cita si está en el futuro
        fecha_cita = prospecto.get('fecha_cita')
        if fecha_cita:
            if isinstance(fecha_cita, str):
                fecha_cita = datetime.fromisoformat(fecha_cita)
            if fecha_cita.date() >= datetime.now(timezone.utc).date():
                return fecha_cita
        
        # Si no hay cita futura, usar fecha de última etapa
        if prospecto.get('etapas') and len(prospecto['etapas']) > 0:
            ultima_fecha = prospecto['etapas'][-1].get('fecha')
            if ultima_fecha:
                if isinstance(ultima_fecha, str):
                    return datetime.fromisoformat(ultima_fecha)
                return ultima_fecha
        
        # Fallback a fecha de creación
        created_at = prospecto.get('created_at')
        if created_at:
            if isinstance(created_at, str):
                return datetime.fromisoformat(created_at)
            return created_at
        
        return datetime.now(timezone.utc)
        
    except:
        return datetime.now(timezone.utc)

@api_router.post("/mover-etapa")
async def mover_prospecto_etapa(request: dict):
    """Mover prospecto entre etapas/columnas del Kanban"""
    try:
        prospecto_id = request.get('prospecto_id')
        nueva_etapa = request.get('nueva_etapa')
        comentario = request.get('comentario', '')
        
        if not prospecto_id or not nueva_etapa:
            raise HTTPException(status_code=400, detail="prospecto_id y nueva_etapa son requeridos")
        
        # Buscar prospecto
        prospecto = await db.prospectos.find_one({"id": prospecto_id})
        if not prospecto:
            raise HTTPException(status_code=404, detail="Prospecto no encontrado")
        
        # Mapeo inverso de columnas Kanban a etapas
        mapeo_columnas = {
            "Prospectos Nuevos": "Visita Inicial / Medición",
            "Cotizaciones Activas": "Cotización Aprobada",
            "Pedidos": "Pedido",
            "Fabricación": "Fabricación", 
            "Instalación": "Instalación en Proceso",
            "Entrega": "Entrega Final",
            "Postventa": "Postventa"
        }
        
        etapa_nombre = mapeo_columnas.get(nueva_etapa, nueva_etapa)
        
        # Crear nueva etapa
        nueva_etapa_obj = {
            "id": str(uuid.uuid4()),
            "nombre_etapa": etapa_nombre,
            "fecha": datetime.now(timezone.utc).isoformat(),
            "comentario": comentario or f"Movido a {etapa_nombre} desde Kanban",
            "fotos": []
        }
        
        # Agregar la nueva etapa
        await db.prospectos.update_one(
            {"id": prospecto_id},
            {"$push": {"etapas": nueva_etapa_obj}}
        )
        
        # Registrar log de actividad
        etapa_anterior = "Nuevo"
        if prospecto.get('etapas') and len(prospecto['etapas']) > 0:
            etapa_anterior = prospecto['etapas'][-1].get('nombre_etapa', 'Desconocida')
        
        log_actividad = {
            "id": str(uuid.uuid4()),
            "prospecto_id": prospecto_id,
            "accion": "mover_etapa",
            "descripcion": f"Movido a {etapa_nombre}",
            "etapa_anterior": etapa_anterior,
            "etapa_nueva": etapa_nombre,
            "fecha": datetime.now(timezone.utc).isoformat(),
            "comentario": comentario
        }
        
        # Guardar log en colección separada
        await db.logs_actividad.insert_one(log_actividad)
        
        return {
            "message": "Prospecto movido exitosamente",
            "nueva_etapa": nueva_etapa_obj,
            "log": log_actividad
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error moviendo prospecto: {str(e)}")

@api_router.get("/logs-actividad/{prospecto_id}")
async def obtener_logs_prospecto(prospecto_id: str):
    """Obtener logs de actividad de un prospecto específico"""
    try:
        logs = await db.logs_actividad.find(
            {"prospecto_id": prospecto_id}
        ).sort("fecha", -1).to_list(length=50)
        
        return {"logs": logs}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {str(e)}")

@api_router.get("/etapas-disponibles")
async def obtener_etapas_disponibles():
    """Obtener lista de etapas disponibles para filtros"""
    return {
        "etapas": [
            "Visita Inicial / Medición",
            "Cotización Aprobada", 
            "Pedido",
            "Fabricación",
            "Instalación en Proceso",
            "Entrega Final",
            "Postventa"
        ]
    }

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