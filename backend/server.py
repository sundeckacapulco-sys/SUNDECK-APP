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
from enum import Enum

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

# Definir roles del sistema
class UserRole(str, Enum):
    ADMIN = "admin"
    VENTAS = "ventas" 
    OPERACIONES = "operaciones"
    POSTVENTA = "postventa"

# Permisos por rol
ROLE_PERMISSIONS = {
    UserRole.ADMIN: {
        "create_prospect": True,
        "edit_prospect": True,
        "delete_prospect": True,
        "view_all_prospects": True,
        "move_to_any_stage": True,
        "view_analytics": True,
        "manage_users": True,
        "export_data": True
    },
    UserRole.VENTAS: {
        "create_prospect": True,
        "edit_prospect": True,
        "delete_prospect": False,
        "view_all_prospects": True,
        "move_to_any_stage": False,
        "view_analytics": True,
        "manage_users": False,
        "export_data": True,
        "allowed_stages": ["Visita Inicial / Medición", "Cotización Aprobada", "Pedido"]
    },
    UserRole.OPERACIONES: {
        "create_prospect": False,
        "edit_prospect": True,
        "delete_prospect": False,
        "view_all_prospects": True,
        "move_to_any_stage": False,
        "view_analytics": False,
        "manage_users": False,
        "export_data": False,
        "allowed_stages": ["Fabricación", "Instalación en Proceso", "Entrega Final"]
    },
    UserRole.POSTVENTA: {
        "create_prospect": False,
        "edit_prospect": True,
        "delete_prospect": False,
        "view_all_prospects": True,
        "move_to_any_stage": False,
        "view_analytics": False,
        "manage_users": False,
        "export_data": False,
        "allowed_stages": ["Postventa"]
    }
}

# Modelo de Usuario
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    email: str
    telefono: Optional[str] = None
    role: UserRole = UserRole.VENTAS
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    nombre: str
    email: str
    telefono: Optional[str] = None
    role: UserRole = UserRole.VENTAS

# Modelo de Log de Actividad
class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    action: str  # "create_prospect", "move_stage", "edit_prospect", etc.
    target_type: str  # "prospect", "stage", "user", etc.
    target_id: str
    description: str
    metadata: Optional[dict] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityLogCreate(BaseModel):
    user_id: str
    user_name: str
    action: str
    target_type: str
    target_id: str
    description: str
    metadata: Optional[dict] = Field(default_factory=dict)

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
# Modelos para Sistema de Recordatorios
class TipoRecordatorio(str, Enum):
    COTIZACION_24H = "cotizacion_24h"
    PRIMER_SEGUIMIENTO = "primer_seguimiento"
    SEGUNDO_SEGUIMIENTO = "segundo_seguimiento"
    TERCER_SEGUIMIENTO = "tercer_seguimiento"
    RECONTACTO_SIN_RESPUESTA = "recontacto_sin_respuesta"
    COBRO_ANTICIPO = "cobro_anticipo"

class EstadoRecordatorio(str, Enum):
    PENDIENTE = "pendiente"
    COMPLETADO = "completado"
    VENCIDO = "vencido"

class Recordatorio(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prospecto_id: str
    tipo: TipoRecordatorio
    fecha_limite: datetime
    estado: EstadoRecordatorio = EstadoRecordatorio.PENDIENTE
    mensaje_sugerido: str
    etapa_relacionada: str
    usuario_asignado: Optional[str] = None
    fecha_completado: Optional[datetime] = None
    notas_seguimiento: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecordatorioCreate(BaseModel):
    prospecto_id: str
    tipo: TipoRecordatorio
    fecha_limite: datetime
    mensaje_sugerido: str
    etapa_relacionada: str
    usuario_asignado: Optional[str] = None

# Modelos para Plantillas WhatsApp
class TipoTemplate(str, Enum):
    CONFIRMACION_RECEPCION = "confirmacion_recepcion"
    SEGUIMIENTO_3_DIAS = "seguimiento_3_dias"
    SEGUIMIENTO_CIERRE = "seguimiento_cierre"
    RECONTACTO_SIN_RESPUESTA = "recontacto_sin_respuesta"
    COBRO_ANTICIPO = "cobro_anticipo"

class TemplateWhatsApp(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: TipoTemplate
    nombre: str
    mensaje: str
    variables: List[str] = Field(default_factory=list)  # [{nombre}, {producto}, etc.]
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TemplateWhatsAppCreate(BaseModel):
    tipo: TipoTemplate
    nombre: str
    mensaje: str
    variables: List[str] = Field(default_factory=list)
    activo: bool = True

class TemplateWhatsAppUpdate(BaseModel):
    nombre: Optional[str] = None
    mensaje: Optional[str] = None
    variables: Optional[List[str]] = None
    activo: Optional[bool] = None
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

# Funciones helper para Sistema de Recordatorios
def calcular_dias_habiles(fecha_inicio: datetime, dias: int) -> datetime:
    """Calcular fecha después de N días hábiles (lunes a viernes)"""
    fecha_actual = fecha_inicio
    dias_agregados = 0
    
    while dias_agregados < dias:
        fecha_actual += timedelta(days=1)
        # 0 = lunes, 6 = domingo
        if fecha_actual.weekday() < 5:  # lunes a viernes
            dias_agregados += 1
    
    return fecha_actual

def obtener_template_mensaje(tipo: TipoTemplate, prospecto: dict) -> str:
    """Obtener mensaje de template con variables reemplazadas"""
    templates_default = {
        TipoTemplate.CONFIRMACION_RECEPCION: "Hola {nombre}, le compartimos la cotización de {producto} con Sundeck. ¿Tuvo oportunidad de revisarla? Estoy disponible para resolver cualquier duda y ayudarle a tomar la mejor decisión.",
        TipoTemplate.SEGUIMIENTO_3_DIAS: "Hola {nombre}, hace unos días le compartimos la propuesta de Sundeck para {producto}. Muchos clientes en su misma situación ya están disfrutando el cambio. ¿Quiere que agendemos una visita de demostración o un ajuste en la propuesta?",
        TipoTemplate.SEGUIMIENTO_CIERRE: "Hola {nombre}, queremos ayudarle a concretar su proyecto con Sundeck. Si confirma esta semana, podemos garantizarle fecha de instalación y aplicar la promoción vigente. ¿Desea que avancemos con su pedido?",
        TipoTemplate.RECONTACTO_SIN_RESPUESTA: "Hola {nombre}, seguimos interesados en apoyarle con su proyecto de {producto}. Queremos asegurarnos de que no pierda la oportunidad de aprovechar nuestra propuesta. ¿Desea que retomemos la conversación?",
        TipoTemplate.COBRO_ANTICIPO: "Hola {nombre}, para avanzar con la instalación de {producto}, necesitamos confirmar su pedido con el anticipo correspondiente. ¿Podemos ayudarle a procesar su pago hoy mismo y asegurar su lugar en la agenda de instalación?"
    }
    
    mensaje = templates_default.get(tipo, "Mensaje no encontrado")
    
    # Reemplazar variables
    mensaje = mensaje.replace("{nombre}", prospecto.get("nombre", ""))
    mensaje = mensaje.replace("{producto}", prospecto.get("producto_solicitado", ""))
    
    # Formatear fecha si está disponible
    if "{fecha}" in mensaje and prospecto.get("fecha_cita"):
        try:
            fecha_cita = datetime.fromisoformat(prospecto["fecha_cita"]) if isinstance(prospecto["fecha_cita"], str) else prospecto["fecha_cita"]
            fecha_formateada = fecha_cita.strftime("%d de %B de %Y")
            mensaje = mensaje.replace("{fecha}", fecha_formateada)
        except:
            mensaje = mensaje.replace("{fecha}", "fecha programada")
    
    if "{hora}" in mensaje and prospecto.get("fecha_cita"):
        try:
            fecha_cita = datetime.fromisoformat(prospecto["fecha_cita"]) if isinstance(prospecto["fecha_cita"], str) else prospecto["fecha_cita"]
            hora_formateada = fecha_cita.strftime("%H:%M")
            mensaje = mensaje.replace("{hora}", hora_formateada)
        except:
            mensaje = mensaje.replace("{hora}", "hora programada")
    
    return mensaje

async def crear_recordatorios_automaticos(prospecto_id: str, etapa_nombre: str):
    """Crear recordatorios automáticos basados en la etapa"""
    try:
        # Obtener prospecto para información adicional
        prospecto = await db.prospectos.find_one({"id": prospecto_id})
        if not prospecto:
            return
        
        fecha_actual = datetime.now(timezone.utc)
        recordatorios_crear = []
        
        if etapa_nombre == "Visita Inicial / Medición":
            # Recordatorio para crear cotización en 24 horas
            fecha_limite = fecha_actual + timedelta(hours=24)
            recordatorios_crear.append({
                "prospecto_id": prospecto_id,
                "tipo": TipoRecordatorio.COTIZACION_24H,
                "fecha_limite": fecha_limite.isoformat(),
                "mensaje_sugerido": obtener_template_mensaje(TipoTemplate.CONFIRMACION_RECEPCION, prospecto),
                "etapa_relacionada": etapa_nombre,
                "estado": EstadoRecordatorio.PENDIENTE,
                "created_at": fecha_actual.isoformat(),
                "updated_at": fecha_actual.isoformat()
            })
        
        elif etapa_nombre == "Cotización Aprobada":
            # Primer seguimiento: inmediato
            recordatorios_crear.append({
                "prospecto_id": prospecto_id,
                "tipo": TipoRecordatorio.PRIMER_SEGUIMIENTO,
                "fecha_limite": fecha_actual.isoformat(),
                "mensaje_sugerido": obtener_template_mensaje(TipoTemplate.CONFIRMACION_RECEPCION, prospecto),
                "etapa_relacionada": etapa_nombre,
                "estado": EstadoRecordatorio.PENDIENTE,
                "created_at": fecha_actual.isoformat(),
                "updated_at": fecha_actual.isoformat()
            })
            
            # Segundo seguimiento: 3 días hábiles
            fecha_segundo = calcular_dias_habiles(fecha_actual, 3)
            recordatorios_crear.append({
                "prospecto_id": prospecto_id,
                "tipo": TipoRecordatorio.SEGUNDO_SEGUIMIENTO,
                "fecha_limite": fecha_segundo.isoformat(),
                "mensaje_sugerido": obtener_template_mensaje(TipoTemplate.SEGUIMIENTO_3_DIAS, prospecto),
                "etapa_relacionada": etapa_nombre,
                "estado": EstadoRecordatorio.PENDIENTE,
                "created_at": fecha_actual.isoformat(),
                "updated_at": fecha_actual.isoformat()
            })
            
            # Tercer seguimiento: 7 días hábiles
            fecha_tercer = calcular_dias_habiles(fecha_actual, 7)
            recordatorios_crear.append({
                "prospecto_id": prospecto_id,
                "tipo": TipoRecordatorio.TERCER_SEGUIMIENTO,
                "fecha_limite": fecha_tercer.isoformat(),
                "mensaje_sugerido": obtener_template_mensaje(TipoTemplate.SEGUIMIENTO_CIERRE, prospecto),
                "etapa_relacionada": etapa_nombre,
                "estado": EstadoRecordatorio.PENDIENTE,
                "created_at": fecha_actual.isoformat(),
                "updated_at": fecha_actual.isoformat()
            })
        
        # Insertar recordatorios en lote
        if recordatorios_crear:
            for recordatorio in recordatorios_crear:
                recordatorio["id"] = str(uuid.uuid4())
            await db.recordatorios.insert_many(recordatorios_crear)
            print(f"✅ Creados {len(recordatorios_crear)} recordatorios para prospecto {prospecto_id}")
    
    except Exception as e:
        print(f"❌ Error creando recordatorios automáticos: {str(e)}")

async def inicializar_templates_whatsapp():
    """Inicializar plantillas WhatsApp por defecto"""
    try:
        # Verificar si ya existen templates
        count = await db.templates_whatsapp.count_documents({})
        if count > 0:
            return  # Ya están inicializados
        
        templates_default = [
            {
                "id": str(uuid.uuid4()),
                "tipo": TipoTemplate.CONFIRMACION_RECEPCION,
                "nombre": "Confirmación de Recepción",
                "mensaje": "Hola {nombre}, le compartimos la cotización de {producto} con Sundeck. ¿Tuvo oportunidad de revisarla? Estoy disponible para resolver cualquier duda y ayudarle a tomar la mejor decisión.",
                "variables": ["nombre", "producto"],
                "activo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "tipo": TipoTemplate.SEGUIMIENTO_3_DIAS,
                "nombre": "Seguimiento a 3 Días",
                "mensaje": "Hola {nombre}, hace unos días le compartimos la propuesta de Sundeck para {producto}. Muchos clientes en su misma situación ya están disfrutando el cambio. ¿Quiere que agendemos una visita de demostración o un ajuste en la propuesta?",
                "variables": ["nombre", "producto"],
                "activo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "tipo": TipoTemplate.SEGUIMIENTO_CIERRE,
                "nombre": "Seguimiento de Cierre",
                "mensaje": "Hola {nombre}, queremos ayudarle a concretar su proyecto con Sundeck. Si confirma esta semana, podemos garantizarle fecha de instalación y aplicar la promoción vigente. ¿Desea que avancemos con su pedido?",
                "variables": ["nombre"],
                "activo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "tipo": TipoTemplate.RECONTACTO_SIN_RESPUESTA,
                "nombre": "Recontacto por Falta de Respuesta",
                "mensaje": "Hola {nombre}, seguimos interesados en apoyarle con su proyecto de {producto}. Queremos asegurarnos de que no pierda la oportunidad de aprovechar nuestra propuesta. ¿Desea que retomemos la conversación?",
                "variables": ["nombre", "producto"],
                "activo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "tipo": TipoTemplate.COBRO_ANTICIPO,
                "nombre": "Cobro de Anticipo",
                "mensaje": "Hola {nombre}, para avanzar con la instalación de {producto}, necesitamos confirmar su pedido con el anticipo correspondiente. ¿Podemos ayudarle a procesar su pago hoy mismo y asegurar su lugar en la agenda de instalación?",
                "variables": ["nombre", "producto"],
                "activo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        await db.templates_whatsapp.insert_many(templates_default)
        print("✅ Templates WhatsApp inicializados correctamente")
        
    except Exception as e:
        print(f"❌ Error inicializando templates WhatsApp: {str(e)}")

# Importar timedelta para los cálculos de fechas
from datetime import timedelta
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
        
        # Crear recordatorios automáticos basados en la etapa
        await crear_recordatorios_automaticos(prospecto_id, etapa_data.nombre_etapa)
        
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

# Helper function to check permissions
def check_permission(user_role: UserRole, permission: str) -> bool:
    """Verificar si un rol tiene un permiso específico"""
    return ROLE_PERMISSIONS.get(user_role, {}).get(permission, False)

def check_stage_permission(user_role: UserRole, stage: str) -> bool:
    """Verificar si un rol puede mover a una etapa específica"""
    if user_role == UserRole.ADMIN:
        return True
    
    allowed_stages = ROLE_PERMISSIONS.get(user_role, {}).get("allowed_stages", [])
    return stage in allowed_stages

# Función para registrar actividad
async def log_activity(activity_data: ActivityLogCreate):
    """Registrar actividad en el sistema"""
    try:
        activity_dict = activity_data.dict()
        activity_dict["timestamp"] = datetime.now(timezone.utc).isoformat()
        activity_dict["id"] = str(uuid.uuid4())
        
        await db.activity_logs.insert_one(activity_dict)
        return activity_dict
    except Exception as e:
        print(f"Error logging activity: {str(e)}")

# ENDPOINTS DE USUARIOS
@api_router.post("/usuarios", response_model=User)
async def crear_usuario(user_data: UserCreate):
    """Crear nuevo usuario"""
    try:
        # Verificar si ya existe el email
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="El email ya está registrado")
        
        # Crear usuario
        usuario_dict = user_data.dict()
        usuario_dict["id"] = str(uuid.uuid4())
        usuario_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        usuario_dict["activo"] = True
        
        await db.users.insert_one(usuario_dict)
        
        # Registrar actividad
        await log_activity(ActivityLogCreate(
            user_id="system",
            user_name="Sistema",
            action="create_user",
            target_type="user",
            target_id=usuario_dict["id"],
            description=f"Usuario creado: {user_data.nombre} ({user_data.role})",
            metadata={"email": user_data.email, "role": user_data.role}
        ))
        
        return User(**usuario_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@api_router.get("/usuarios", response_model=List[User])
async def obtener_usuarios():
    """Obtener todos los usuarios"""
    try:
        users = await db.users.find({"activo": True}).to_list(length=None)
        
        # Convert dates
        for user in users:
            if isinstance(user.get('created_at'), str):
                user['created_at'] = datetime.fromisoformat(user['created_at'])
            if isinstance(user.get('last_login'), str):
                user['last_login'] = datetime.fromisoformat(user['last_login'])
        
        return [User(**user) for user in users]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving users: {str(e)}")

@api_router.get("/usuarios/{user_id}", response_model=User)
async def obtener_usuario(user_id: str):
    """Obtener usuario por ID"""
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Convert dates
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        if isinstance(user.get('last_login'), str):
            user['last_login'] = datetime.fromisoformat(user['last_login'])
        
        return User(**user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user: {str(e)}")

@api_router.put("/usuarios/{user_id}", response_model=User)
async def actualizar_usuario(user_id: str, user_data: UserCreate):
    """Actualizar usuario"""
    try:
        # Verificar que el usuario existe
        existing_user = await db.users.find_one({"id": user_id})
        if not existing_user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Actualizar usuario
        update_dict = user_data.dict()
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_dict}
        )
        
        # Obtener usuario actualizado
        updated_user = await db.users.find_one({"id": user_id})
        
        # Registrar actividad
        await log_activity(ActivityLogCreate(
            user_id="system",
            user_name="Sistema",
            action="update_user",
            target_type="user",
            target_id=user_id,
            description=f"Usuario actualizado: {user_data.nombre}",
            metadata={"changes": update_dict}
        ))
        
        return User(**updated_user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

@api_router.get("/roles")
async def obtener_roles():
    """Obtener roles disponibles y sus permisos"""
    return {
        "roles": [role.value for role in UserRole],
        "permissions": ROLE_PERMISSIONS
    }

# ENDPOINTS DE LOGS DE ACTIVIDAD
@api_router.get("/activity-logs")
async def obtener_activity_logs(
    limit: int = 50,
    user_id: str = None,
    action: str = None,
    target_type: str = None
):
    """Obtener logs de actividad con filtros opcionales"""
    try:
        # Construir filtro
        filter_dict = {}
        if user_id:
            filter_dict["user_id"] = user_id
        if action:
            filter_dict["action"] = action
        if target_type:
            filter_dict["target_type"] = target_type
        
        # Obtener logs
        logs = await db.activity_logs.find(filter_dict).sort("timestamp", -1).limit(limit).to_list(length=None)
        
        # Convert dates
        for log in logs:
            if isinstance(log.get('timestamp'), str):
                log['timestamp'] = datetime.fromisoformat(log['timestamp'])
        
        return {"logs": logs}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving activity logs: {str(e)}")

@api_router.post("/activity-logs")
async def crear_activity_log(log_data: ActivityLogCreate):
    """Crear nuevo log de actividad"""
    try:
        log_dict = await log_activity(log_data)
        return {"message": "Activity logged successfully", "log": log_dict}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating activity log: {str(e)}")

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
        await db.logs_actividad.insert_one(log_actividad.copy())
        
        # Return clean response without any MongoDB objects
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
        logs_raw = await db.logs_actividad.find(
            {"prospecto_id": prospecto_id}
        ).sort("fecha", -1).to_list(length=50)
        
        # Clean up ObjectIds from logs
        logs = []
        for log in logs_raw:
            if '_id' in log:
                del log['_id']  # Remove MongoDB ObjectId
            logs.append(log)
        
        return {"logs": logs}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {str(e)}")

@api_router.get("/embudo-360")
async def obtener_embudo_data(
    fecha_inicio: str = None,
    fecha_fin: str = None,
    responsable: str = None
):
    """Obtener datos del embudo de ventas y conversiones"""
    try:
        # Construir filtro de fechas
        date_filter = {}
        if fecha_inicio:
            date_filter["$gte"] = fecha_inicio
        if fecha_fin:
            date_filter["$lte"] = fecha_fin
        
        # Filtro base
        base_filter = {}
        if date_filter:
            base_filter["created_at"] = date_filter
        if responsable:
            base_filter["responsable"] = responsable
        
        # Obtener todos los prospectos con filtros
        prospectos = await db.prospectos.find(base_filter).to_list(length=None)
        
        # Definir etapas del embudo en orden
        etapas_embudo = [
            "Prospectos Nuevos",
            "Cotizaciones Activas", 
            "Pedidos",
            "Fabricación",
            "Instalación",
            "Entrega",
            "Postventa"
        ]
        
        # Mapeo de etapas a embudo
        mapeo_etapas = {
            "Visita Inicial / Medición": "Prospectos Nuevos",
            "Cotización Aprobada": "Cotizaciones Activas",
            "Pedido": "Pedidos", 
            "Fabricación": "Fabricación",
            "Instalación en Proceso": "Instalación",
            "Entrega Final": "Entrega",
            "Postventa": "Postventa"
        }
        
        # Contadores por etapa
        contadores = {etapa: 0 for etapa in etapas_embudo}
        prospectos_por_etapa = {etapa: [] for etapa in etapas_embudo}
        
        # Clasificar prospectos por etapa actual
        for prospecto in prospectos:
            if prospecto.get('etapas') and len(prospecto['etapas']) > 0:
                ultima_etapa = prospecto['etapas'][-1]['nombre_etapa']
                etapa_embudo = mapeo_etapas.get(ultima_etapa, "Prospectos Nuevos")
            else:
                etapa_embudo = "Prospectos Nuevos"
            
            contadores[etapa_embudo] += 1
            prospectos_por_etapa[etapa_embudo].append(prospecto)
        
        # Calcular tasas de conversión
        conversiones = []
        for i in range(len(etapas_embudo) - 1):
            etapa_actual = etapas_embudo[i]
            etapa_siguiente = etapas_embudo[i + 1]
            
            total_actual = contadores[etapa_actual]
            total_siguiente = sum(contadores[etapa] for etapa in etapas_embudo[i+1:])
            
            if total_actual > 0:
                tasa_conversion = (total_siguiente / total_actual) * 100
            else:
                tasa_conversion = 0
            
            conversiones.append({
                "desde": etapa_actual,
                "hacia": etapa_siguiente,
                "tasa": round(tasa_conversion, 2)
            })
        
        # Calcular tiempo promedio por etapa
        tiempos_promedio = {}
        for etapa in etapas_embudo:
            prospectos_etapa = prospectos_por_etapa[etapa]
            if prospectos_etapa:
                tiempos = []
                for prospecto in prospectos_etapa:
                    if prospecto.get('etapas') and len(prospecto['etapas']) > 0:
                        fecha_primera = prospecto['etapas'][0].get('fecha')
                        fecha_ultima = prospecto['etapas'][-1].get('fecha')
                        
                        if fecha_primera and fecha_ultima:
                            if isinstance(fecha_primera, str):
                                fecha_primera = datetime.fromisoformat(fecha_primera)
                            if isinstance(fecha_ultima, str):
                                fecha_ultima = datetime.fromisoformat(fecha_ultima)
                            
                            diferencia = (fecha_ultima - fecha_primera).days
                            tiempos.append(diferencia)
                
                if tiempos:
                    tiempos_promedio[etapa] = round(sum(tiempos) / len(tiempos), 1)
                else:
                    tiempos_promedio[etapa] = 0
            else:
                tiempos_promedio[etapa] = 0
        
        # Calcular métricas generales
        total_prospectos = len(prospectos)
        prospectos_activos = sum(contadores[etapa] for etapa in etapas_embudo[:-1])  # Excluir Postventa
        tasa_conversion_general = (contadores["Postventa"] / total_prospectos * 100) if total_prospectos > 0 else 0
        
        return {
            "embudo": {
                "etapas": etapas_embudo,
                "contadores": contadores,
                "conversiones": conversiones,
                "tiempos_promedio": tiempos_promedio
            },
            "metricas": {
                "total_prospectos": total_prospectos,
                "prospectos_activos": prospectos_activos,
                "tasa_conversion_general": round(tasa_conversion_general, 2),
                "cotizaciones_activas": contadores["Cotizaciones Activas"],
                "pedidos_abiertos": contadores["Pedidos"] + contadores["Fabricación"],
                "instalaciones_proceso": contadores["Instalación"],
                "postventas_abiertas": contadores["Postventa"]
            },
            "filtros_aplicados": {
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
                "responsable": responsable
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving embudo data: {str(e)}")

@api_router.get("/embudo-360/export")
async def exportar_embudo_data(
    fecha_inicio: str = None,
    fecha_fin: str = None,
    responsable: str = None,
    formato: str = "csv"
):
    """Exportar datos del embudo en CSV/Excel"""
    try:
        # Obtener datos del embudo
        embudo_response = await obtener_embudo_data(fecha_inicio, fecha_fin, responsable)
        embudo_data = embudo_response
        
        # Preparar datos para exportación
        export_data = []
        
        # Datos por etapa
        for etapa in embudo_data["embudo"]["etapas"]:
            export_data.append({
                "Etapa": etapa,
                "Cantidad": embudo_data["embudo"]["contadores"][etapa],
                "Tiempo_Promedio_Dias": embudo_data["embudo"]["tiempos_promedio"][etapa]
            })
        
        # Datos de conversiones
        conversion_data = []
        for conversion in embudo_data["embudo"]["conversiones"]:
            conversion_data.append({
                "Desde": conversion["desde"],
                "Hacia": conversion["hacia"], 
                "Tasa_Conversion_%": conversion["tasa"]
            })
        
        return {
            "datos_etapas": export_data,
            "datos_conversiones": conversion_data,
            "metricas_generales": embudo_data["metricas"],
            "formato": formato,
            "fecha_generacion": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting embudo data: {str(e)}")

@api_router.get("/whatsapp-templates")
async def obtener_whatsapp_templates():
    """Obtener plantillas de WhatsApp actuales"""
    try:
        import json
        import os
        
        templates_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'whatsappTemplates.json')
        
        if os.path.exists(templates_path):
            with open(templates_path, 'r', encoding='utf-8') as f:
                templates = json.load(f)
            return {"templates": templates}
        else:
            # Plantillas por defecto si no existe el archivo
            default_templates = {
                "prospecto": "Hola {nombre}, gracias por su interés en Sundeck. Queremos acompañarle en su proyecto de decoración. ¿Cuándo sería un buen momento para agendar una visita?",
                "cita": "Hola {nombre}, le confirmamos su cita con Sundeck el {fecha} a las {hora}. ¿Se mantiene la cita programada?",
                "instalacion": "Hola {nombre}, su instalación de {producto} está programada para el {fecha} a las {hora}. Nuestro equipo acudirá puntualmente. ¡Gracias por confiar en Sundeck!",
                "postventa": "Hola {nombre}, esperamos que disfrute su nueva instalación de Sundeck. Queremos asegurarnos de que todo esté funcionando perfectamente. ¿Podría confirmarnos su satisfacción o si requiere algún ajuste?"
            }
            return {"templates": default_templates}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving WhatsApp templates: {str(e)}")

@api_router.put("/whatsapp-templates")
async def actualizar_whatsapp_templates(templates: dict):
    """Actualizar plantillas de WhatsApp"""
    try:
        import json
        import os
        
        templates_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'whatsappTemplates.json')
        
        # Validar que las claves requeridas estén presentes
        required_keys = ["prospecto", "cita", "instalacion", "postventa"]
        for key in required_keys:
            if key not in templates:
                raise HTTPException(status_code=400, detail=f"Missing required template: {key}")
        
        # Guardar las plantillas actualizadas
        with open(templates_path, 'w', encoding='utf-8') as f:
            json.dump(templates, f, ensure_ascii=False, indent=2)
        
        return {
            "message": "Plantillas de WhatsApp actualizadas correctamente",
            "templates": templates
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating WhatsApp templates: {str(e)}")

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

# ==========================================
# ENDPOINTS SISTEMA DE RECORDATORIOS
# ==========================================

@api_router.get("/recordatorios", response_model=dict)
async def obtener_recordatorios(
    estado: str = None,
    prospecto_id: str = None,
    tipo: str = None,
    vencidos_solo: bool = False
):
    """Obtener recordatorios con filtros"""
    try:
        filtro = {}
        
        if estado:
            filtro["estado"] = estado
        
        if prospecto_id:
            filtro["prospecto_id"] = prospecto_id
            
        if tipo:
            filtro["tipo"] = tipo
        
        # Si solo queremos vencidos
        if vencidos_solo:
            fecha_actual = datetime.now(timezone.utc).isoformat()
            filtro["fecha_limite"] = {"$lt": fecha_actual}
            filtro["estado"] = EstadoRecordatorio.PENDIENTE
        
        recordatorios = await db.recordatorios.find(filtro).sort("fecha_limite", 1).to_list(length=None)
        
        # Enriquecer con datos del prospecto
        for recordatorio in recordatorios:
            prospecto = await db.prospectos.find_one({"id": recordatorio["prospecto_id"]})
            if prospecto:
                recordatorio["prospecto_nombre"] = prospecto.get("nombre", "")
                recordatorio["prospecto_telefono"] = prospecto.get("telefono", "")
                recordatorio["prospecto_producto"] = prospecto.get("producto_solicitado", "")
        
        # Calcular estadísticas
        total_recordatorios = len(recordatorios)
        pendientes = len([r for r in recordatorios if r.get("estado") == EstadoRecordatorio.PENDIENTE])
        vencidos = len([r for r in recordatorios if r.get("estado") == EstadoRecordatorio.PENDIENTE and r.get("fecha_limite", "") < datetime.now(timezone.utc).isoformat()])
        
        return {
            "recordatorios": recordatorios,
            "estadisticas": {
                "total": total_recordatorios,
                "pendientes": pendientes,
                "vencidos": vencidos,
                "completados": total_recordatorios - pendientes
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving recordatorios: {str(e)}")

@api_router.post("/recordatorios", response_model=Recordatorio)
async def crear_recordatorio(recordatorio_data: RecordatorioCreate):
    """Crear nuevo recordatorio manual"""
    try:
        recordatorio_dict = recordatorio_data.dict()
        recordatorio_dict['id'] = str(uuid.uuid4())
        recordatorio_dict['estado'] = EstadoRecordatorio.PENDIENTE
        recordatorio_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        recordatorio_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Convert datetime to ISO string for MongoDB
        if isinstance(recordatorio_dict['fecha_limite'], datetime):
            recordatorio_dict['fecha_limite'] = recordatorio_dict['fecha_limite'].isoformat()
        
        result = await db.recordatorios.insert_one(recordatorio_dict)
        
        # Retrieve the created document
        created_doc = await db.recordatorios.find_one({"_id": result.inserted_id})
        
        # Convert back to datetime objects for response
        if isinstance(created_doc['fecha_limite'], str):
            created_doc['fecha_limite'] = datetime.fromisoformat(created_doc['fecha_limite'])
        if isinstance(created_doc['created_at'], str):
            created_doc['created_at'] = datetime.fromisoformat(created_doc['created_at'])
        if isinstance(created_doc['updated_at'], str):
            created_doc['updated_at'] = datetime.fromisoformat(created_doc['updated_at'])
            
        return Recordatorio(**created_doc)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating recordatorio: {str(e)}")

@api_router.patch("/recordatorios/{recordatorio_id}/completar")
async def completar_recordatorio(recordatorio_id: str, notas: str = None):
    """Marcar recordatorio como completado"""
    try:
        update_data = {
            "estado": EstadoRecordatorio.COMPLETADO,
            "fecha_completado": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if notas:
            update_data["notas_seguimiento"] = notas
        
        result = await db.recordatorios.update_one(
            {"id": recordatorio_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Recordatorio not found")
        
        return {"message": "Recordatorio marcado como completado", "id": recordatorio_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error completing recordatorio: {str(e)}")

@api_router.get("/recordatorios/dashboard", response_model=dict)
async def obtener_dashboard_recordatorios():
    """Obtener resumen de recordatorios para dashboard"""
    try:
        fecha_actual = datetime.now(timezone.utc).isoformat()
        
        # Recordatorios pendientes
        pendientes = await db.recordatorios.find({
            "estado": EstadoRecordatorio.PENDIENTE
        }).to_list(length=None)
        
        # Recordatorios vencidos
        vencidos = await db.recordatorios.find({
            "estado": EstadoRecordatorio.PENDIENTE,
            "fecha_limite": {"$lt": fecha_actual}
        }).to_list(length=None)
        
        # Recordatorios de hoy
        fecha_inicio_hoy = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        fecha_fin_hoy = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        
        hoy = await db.recordatorios.find({
            "estado": EstadoRecordatorio.PENDIENTE,
            "fecha_limite": {
                "$gte": fecha_inicio_hoy,
                "$lte": fecha_fin_hoy
            }
        }).to_list(length=None)
        
        # Enriquecer con datos de prospectos
        for recordatorio in pendientes + vencidos + hoy:
            prospecto = await db.prospectos.find_one({"id": recordatorio["prospecto_id"]})
            if prospecto:
                recordatorio["prospecto_nombre"] = prospecto.get("nombre", "")
                recordatorio["prospecto_telefono"] = prospecto.get("telefono", "")
                recordatorio["prospecto_producto"] = prospecto.get("producto_solicitado", "")
        
        return {
            "total_pendientes": len(pendientes),
            "total_vencidos": len(vencidos),
            "total_hoy": len(hoy),
            "recordatorios_urgentes": vencidos[:5],  # Top 5 más urgentes
            "recordatorios_hoy": hoy
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving dashboard recordatorios: {str(e)}")

# ==========================================
# ENDPOINTS PLANTILLAS WHATSAPP
# ==========================================

@api_router.get("/templates-whatsapp", response_model=List[TemplateWhatsApp])
async def obtener_templates_whatsapp(activo: bool = None):
    """Obtener plantillas WhatsApp"""
    try:
        filtro = {}
        if activo is not None:
            filtro["activo"] = activo
        
        templates = await db.templates_whatsapp.find(filtro).to_list(length=None)
        
        # Convert datetime strings back to datetime objects
        for template in templates:
            if isinstance(template.get('created_at'), str):
                template['created_at'] = datetime.fromisoformat(template['created_at'])
            if isinstance(template.get('updated_at'), str):
                template['updated_at'] = datetime.fromisoformat(template['updated_at'])
        
        return [TemplateWhatsApp(**template) for template in templates]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving templates: {str(e)}")

@api_router.post("/templates-whatsapp", response_model=TemplateWhatsApp)
async def crear_template_whatsapp(template_data: TemplateWhatsAppCreate):
    """Crear nueva plantilla WhatsApp"""
    try:
        template_dict = template_data.dict()
        template_dict['id'] = str(uuid.uuid4())
        template_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        template_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = await db.templates_whatsapp.insert_one(template_dict)
        
        # Retrieve the created document
        created_doc = await db.templates_whatsapp.find_one({"_id": result.inserted_id})
        
        # Convert back to datetime objects for response
        if isinstance(created_doc['created_at'], str):
            created_doc['created_at'] = datetime.fromisoformat(created_doc['created_at'])
        if isinstance(created_doc['updated_at'], str):
            created_doc['updated_at'] = datetime.fromisoformat(created_doc['updated_at'])
            
        return TemplateWhatsApp(**created_doc)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating template: {str(e)}")

@api_router.put("/templates-whatsapp/{template_id}", response_model=TemplateWhatsApp)
async def actualizar_template_whatsapp(template_id: str, template_data: TemplateWhatsAppUpdate):
    """Actualizar plantilla WhatsApp"""
    try:
        update_data = {k: v for k, v in template_data.dict().items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = await db.templates_whatsapp.update_one(
            {"id": template_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Retrieve updated document
        updated_doc = await db.templates_whatsapp.find_one({"id": template_id})
        
        # Convert back to datetime objects for response
        if isinstance(updated_doc['created_at'], str):
            updated_doc['created_at'] = datetime.fromisoformat(updated_doc['created_at'])
        if isinstance(updated_doc['updated_at'], str):
            updated_doc['updated_at'] = datetime.fromisoformat(updated_doc['updated_at'])
            
        return TemplateWhatsApp(**updated_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating template: {str(e)}")

@api_router.get("/templates-whatsapp/{template_id}/mensaje")
async def generar_mensaje_template(template_id: str, prospecto_id: str):
    """Generar mensaje personalizado usando template y datos del prospecto"""
    try:
        # Obtener template
        template = await db.templates_whatsapp.find_one({"id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Obtener prospecto
        prospecto = await db.prospectos.find_one({"id": prospecto_id})
        if not prospecto:
            raise HTTPException(status_code=404, detail="Prospecto not found")
        
        # Generar mensaje personalizado
        mensaje = template["mensaje"]
        
        # Reemplazar variables
        mensaje = mensaje.replace("{nombre}", prospecto.get("nombre", ""))
        mensaje = mensaje.replace("{producto}", prospecto.get("producto_solicitado", ""))
        
        # Formatear fecha si está disponible
        if "{fecha}" in mensaje and prospecto.get("fecha_cita"):
            try:
                fecha_cita = datetime.fromisoformat(prospecto["fecha_cita"]) if isinstance(prospecto["fecha_cita"], str) else prospecto["fecha_cita"]
                fecha_formateada = fecha_cita.strftime("%d de %B de %Y")
                mensaje = mensaje.replace("{fecha}", fecha_formateada)
            except:
                mensaje = mensaje.replace("{fecha}", "fecha programada")
        
        if "{hora}" in mensaje and prospecto.get("fecha_cita"):
            try:
                fecha_cita = datetime.fromisoformat(prospecto["fecha_cita"]) if isinstance(prospecto["fecha_cita"], str) else prospecto["fecha_cita"]
                hora_formateada = fecha_cita.strftime("%H:%M")
                mensaje = mensaje.replace("{hora}", hora_formateada)
            except:
                mensaje = mensaje.replace("{hora}", "hora programada")
        
        # Generar URL de WhatsApp
        telefono = prospecto.get("telefono", "")
        # Limpiar número de teléfono (formato México)
        clean_phone = telefono.replace("+", "").replace("-", "").replace(" ", "")
        if clean_phone.startswith("52"):
            clean_phone = clean_phone[2:]
        if len(clean_phone) == 10:
            whatsapp_url = f"https://wa.me/52{clean_phone}?text={mensaje.replace(' ', '%20')}"
        else:
            whatsapp_url = None
        
        return {
            "mensaje": mensaje,
            "whatsapp_url": whatsapp_url,
            "template_nombre": template["nombre"],
            "prospecto_nombre": prospecto.get("nombre", ""),
            "prospecto_telefono": telefono
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating message: {str(e)}")

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