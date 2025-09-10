import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

// Plantillas de mensajes de WhatsApp (México)
const WHATSAPP_TEMPLATES = {
  prospecto: "Hola {nombre}, gracias por su interés en Sundeck. Somos especialistas en {producto}. ¿Podríamos agendar una cita para platicarle sobre nuestros servicios?",
  confirmacion_cita: "Hola {nombre}, le confirmamos su instalación de {producto} el {fecha}. ¿Se mantiene la cita programada?",
  instalacion: "Hola {nombre}, somos de Sundeck. Nos comunicamos para coordinar la instalación de su {producto}. ¿Está disponible para la fecha programada?",
  postventa: "Hola {nombre}, ¿cómo le fue con su instalación de {producto}? Queremos asegurarnos de que quedó completamente satisfecho con nuestro servicio.",
  general: "Hola {nombre}, le escribo de Sundeck para darle seguimiento. ¿En qué podemos ayudarle?"
};

// Función para generar URL de WhatsApp (formato México)
const generateWhatsAppURL = (telefono, mensaje) => {
  if (!telefono) return null;
  
  // Limpiar el número de teléfono (solo números)
  let cleanPhone = telefono.replace(/[^\d]/g, '');
  
  // Remover cualquier código de país existente si está presente
  if (cleanPhone.startsWith('52')) {
    cleanPhone = cleanPhone.substring(2);
  } else if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
    cleanPhone = cleanPhone.substring(1);
  }
  
  // Asegurar que tengamos exactamente 10 dígitos
  if (cleanPhone.length === 10) {
    // Anteponer 521 (código de México + 1 para celular)
    const phoneWithCountryCode = `521${cleanPhone}`;
    
    // Codificar el mensaje para URL
    const encodedMessage = encodeURIComponent(mensaje);
    
    return `https://wa.me/${phoneWithCountryCode}?text=${encodedMessage}`;
  }
  
  return null; // Número inválido
};

// Función para generar mensaje personalizado
const generateWhatsAppMessage = (prospecto, tipo = 'general') => {
  const template = WHATSAPP_TEMPLATES[tipo] || WHATSAPP_TEMPLATES.general;
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return template
    .replace('{nombre}', prospecto.nombre)
    .replace('{producto}', prospecto.producto_solicitado)
    .replace('{fecha}', formatDate(prospecto.fecha_cita));
};

// Componente Botón WhatsApp
const WhatsAppButton = ({ prospecto, tipo = 'general', className = '', size = 'normal' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Validar si el número es válido para México
  const isValidMexicanNumber = (telefono) => {
    if (!telefono) return false;
    const cleanPhone = telefono.replace(/[^\d]/g, '');
    // Debe tener 10 dígitos después de limpiar códigos de país
    let digits = cleanPhone;
    if (digits.startsWith('52')) digits = digits.substring(2);
    if (digits.startsWith('1') && digits.length === 11) digits = digits.substring(1);
    return digits.length === 10;
  };
  
  const isValid = isValidMexicanNumber(prospecto.telefono);
  
  if (!prospecto.telefono || !isValid) {
    return (
      <div className="relative">
        <button 
          className={`btn-whatsapp disabled ${className} ${size === 'small' ? 'small' : ''}`}
          disabled
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="whatsapp-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.485 3.287"/>
            </svg>
          </span>
          WhatsApp
        </button>
        {showTooltip && (
          <div className="tooltip">
            {!prospecto.telefono ? 
              'No hay número de teléfono registrado' : 
              'Número de teléfono inválido (debe ser 10 dígitos)'
            }
          </div>
        )}
      </div>
    );
  }
  
  const mensaje = generateWhatsAppMessage(prospecto, tipo);
  const whatsappURL = generateWhatsAppURL(prospecto.telefono, mensaje);
  
  const handleWhatsAppClick = () => {
    if (whatsappURL) {
      window.open(whatsappURL, '_blank');
    }
  };
  
  return (
    <button 
      className={`btn-whatsapp ${className} ${size === 'small' ? 'small' : ''}`}
      onClick={handleWhatsAppClick}
      title={`Enviar WhatsApp a ${prospecto.nombre}`}
    >
      <span className="whatsapp-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.485 3.287"/>
        </svg>
      </span>
      WhatsApp
    </button>
  );
};

// Función para determinar el tipo de mensaje WhatsApp según las etapas
const determinarTipoWhatsApp = (prospecto) => {
  if (!prospecto.etapas || prospecto.etapas.length === 0) {
    return 'prospecto'; // Sin etapas = prospecto nuevo
  }
  
  // Obtener la última etapa
  const ultimaEtapa = prospecto.etapas[prospecto.etapas.length - 1];
  const nombreEtapa = ultimaEtapa.nombre_etapa;
  
  // Determinar tipo según la última etapa
  if (nombreEtapa === 'Visita Inicial / Medición') {
    return 'confirmacion_cita'; // Siguiente paso: confirmar cotización
  } else if (nombreEtapa === 'Pedido') {
    return 'confirmacion_cita'; // Confirmar detalles del pedido
  } else if (nombreEtapa === 'Cotización Aprobada' || nombreEtapa === 'Fabricación') {
    return 'instalacion'; // En proceso de fabricación/instalación
  } else if (nombreEtapa === 'Instalación en Proceso' || nombreEtapa === 'Entrega Final') {
    return 'postventa'; // Ya instalado, seguimiento
  } else if (nombreEtapa === 'Postventa') {
    return 'postventa'; // Seguimiento postventa
  }
  
  return 'general'; // Fallback
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Componente principal
function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [prospectos, setProspectos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar prospectos al iniciar
  useEffect(() => {
    cargarProspectos();
  }, []);

  const cargarProspectos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/prospectos`);
      setProspectos(response.data);
    } catch (error) {
      console.error('Error cargando prospectos:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard prospectos={prospectos} onUpdate={cargarProspectos} onNavigate={setCurrentView} />;
      case 'registro':
        return <RegistroProspecto onUpdate={cargarProspectos} onNavigate={setCurrentView} />;
      case 'citas':
        return <CitasHoy onNavigate={setCurrentView} />;
      case 'mapa':
        return <MapaView prospectos={prospectos} onNavigate={setCurrentView} />;
      default:
        return <Dashboard prospectos={prospectos} onUpdate={cargarProspectos} onNavigate={setCurrentView} />;
    }
  };

  if (loading && prospectos.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <Header currentView={currentView} onNavigate={setCurrentView} />
      <main className="main-content">
        {renderCurrentView()}
      </main>
    </div>
  );
}

// Componente Header
const Header = ({ currentView, onNavigate }) => {
    const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'registro', label: 'Nuevo Prospecto', icon: '➕' },
    { id: 'citas', label: 'Citas Hoy', icon: '📅' },
    { id: 'mapa', label: 'Mapa', icon: '🗺️' }
  ];

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>Sundeck Prospectos</h1>
          <span className="tagline">Gestión Profesional</span>
        </div>
        <nav className="navigation">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-button ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

// Componente Dashboard
const Dashboard = ({ prospectos, onUpdate, onNavigate }) => {
  const [selectedProspecto, setSelectedProspecto] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard de Prospectos</h2>
        <div className="stats">
          <div className="stat-card">
            <div className="stat-number">{prospectos.length}</div>
            <div className="stat-label">Total Prospectos</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {prospectos.filter(p => {
                const today = new Date().toDateString();
                const citaDate = new Date(p.fecha_cita).toDateString();
                return today === citaDate;
              }).length}
            </div>
            <div className="stat-label">Citas Hoy</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {prospectos.reduce((sum, p) => sum + (p.etapas?.length || 0), 0)}
            </div>
            <div className="stat-label">Total Etapas</div>
          </div>
        </div>
      </div>

      <div className="prospectos-grid">
        {prospectos.map(prospecto => (
          <div key={prospecto.id} className="prospecto-card">
            <div className="card-header">
              <h3>{prospecto.nombre}</h3>
              <div className="card-status">
                <span className="etapas-count">{prospecto.etapas?.length || 0} etapas</span>
              </div>
            </div>
            
            <div className="card-info">
              <div className="info-row">
                <span className="info-icon">📱</span>
                <span>{prospecto.telefono}</span>
              </div>
              <div className="info-row">
                <span className="info-icon">🏗️</span>
                <span>{prospecto.producto_solicitado}</span>
              </div>
              <div className="info-row">
                <span className="info-icon">📅</span>
                <span>{formatDate(prospecto.fecha_cita)} - {formatTime(prospecto.fecha_cita)}</span>
              </div>
            </div>

            {prospecto.etapas && prospecto.etapas.length > 0 && (
              <div className="timeline-preview">
                <h4>Últimas Etapas:</h4>
                {prospecto.etapas.slice(-2).map(etapa => (
                  <div key={etapa.id} className="timeline-item-preview">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <span className="etapa-name">{etapa.nombre_etapa}</span>
                      <span className="etapa-date">{formatDate(etapa.fecha)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card-actions">
              <WhatsAppButton 
                prospecto={prospecto} 
                tipo={determinarTipoWhatsApp(prospecto)} 
                className="btn-outline"
                size="small"
              />
              <button
                className="btn-primary"
                onClick={() => setSelectedProspecto(prospecto)}
              >
                Ver Detalles
              </button>
            </div>
          </div>
        ))}
      </div>

      {prospectos.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No hay prospectos registrados</h3>
          <p>Comienza agregando tu primer prospecto</p>
          <button
            className="btn-primary"
            onClick={() => onNavigate('registro')}
          >
            Agregar Prospecto
          </button>
        </div>
      )}

      {selectedProspecto && (
        <ProspectoModal
          prospecto={selectedProspecto}
          onClose={() => setSelectedProspecto(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

// Catálogo editable y persistido
const DEFAULT_PRODUCTOS = [
  'Persianas Enrollables Blackout',
  'Persianas Sheer Elegance', 
  'Persianas de Malla (Screen)',
  'Persianas Verticales PVC',
  'Cortinas Tradicionales',
  'Toldo de Caída Vertical',
  'Toldo de Proyección',
  'Toldo de Palillería',
  'Motorización de Persianas',
  'Tapicería',
  'Alfombras',
  'Pisos Laminados',
  'Pisos Vinílicos',
  'Sombrillas',
  'Puertas Plegables',
  'Mantenimiento',
];

// Componente Registro de Prospecto
const RegistroProspecto = ({ onUpdate, onNavigate }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    producto_solicitado: '',
    fecha_cita: '',
    direccion: ''
  });
  const [loading, setLoading] = useState(false);

  // Estado del catálogo de productos
  const [catalogoProductos, setCatalogoProductos] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('catalogo_productos')) || DEFAULT_PRODUCTOS; 
    } catch { 
      return DEFAULT_PRODUCTOS; 
    }
  });

  // Persistir catálogo en localStorage
  useEffect(() => {
    localStorage.setItem('catalogo_productos', JSON.stringify(catalogoProductos));
  }, [catalogoProductos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Aprendizaje del producto al guardar
      const prodTrim = (formData.producto_solicitado || '').trim();
      if (prodTrim) {
        const existe = catalogoProductos.some(p => p.toLowerCase() === prodTrim.toLowerCase());
        if (!existe) {
          setCatalogoProductos(prev => [...prev, prodTrim].sort((a,b) => a.localeCompare(b, 'es')));
        }
      }

      await axios.post(`${API}/prospectos`, {
        ...formData,
        producto_solicitado: prodTrim,
        fecha_cita: new Date(formData.fecha_cita).toISOString()
      });
      
      setFormData({
        nombre: '',
        telefono: '',
        producto_solicitado: '',
        fecha_cita: '',
        direccion: ''
      });
      
      await onUpdate();
      onNavigate('dashboard');
    } catch (error) {
      console.error('Error creando prospecto:', error);
      alert('Error al crear el prospecto');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const agregarProductoAlCatalogo = () => {
    const nuevo = prompt('Agregar nuevo producto al catálogo:');
    if (!nuevo) return;
    const t = nuevo.trim();
    if (!t) return;
    if (catalogoProductos.some(p => p.toLowerCase() === t.toLowerCase())) {
      alert('Ese producto ya existe en el catálogo.');
      return;
    }
    setCatalogoProductos(prev => [...prev, t].sort((a,b) => a.localeCompare(b, 'es')));
    alert('Producto agregado al catálogo exitosamente.');
  };

  const restablecerCatalogo = () => {
    if (window.confirm('¿Restablecer catálogo a valores por defecto?')) {
      setCatalogoProductos(DEFAULT_PRODUCTOS);
      alert('Catálogo restablecido.');
    }
  };

  return (
    <div className="registro-prospecto">
      <div className="form-container">
        <h2>Nuevo Prospecto</h2>
        
        {/* Acciones rápidas sobre el catálogo */}
        <div className="catalog-actions" style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
          <button
            type="button"
            className="btn-secondary"
            onClick={agregarProductoAlCatalogo}
            style={{fontSize: '0.9rem', padding: '0.5rem 1rem'}}
          >
            + Producto al catálogo
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={restablecerCatalogo}
            style={{fontSize: '0.9rem', padding: '0.5rem 1rem'}}
          >
            Restablecer catálogo
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="prospecto-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              placeholder="Ingrese el nombre completo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono</label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              required
              placeholder="Ingrese el número de teléfono"
            />
          </div>

          <div className="form-group">
            <label htmlFor="producto_solicitado">Producto Solicitado</label>
            <input
              list="lista-productos"
              type="text"
              id="producto_solicitado"
              name="producto_solicitado"
              placeholder="Producto solicitado (escribe o selecciona)"
              value={formData.producto_solicitado}
              onChange={handleChange}
              required
            />
            <datalist id="lista-productos">
              {catalogoProductos.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label htmlFor="direccion">Dirección (Opcional)</label>
            <input
              type="text"
              id="direccion"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Ingrese la dirección para mostrar en el mapa"
            />
          </div>

          <div className="form-group">
            <label htmlFor="fecha_cita">Fecha y Hora de Cita</label>
            <input
              type="datetime-local"
              id="fecha_cita"
              name="fecha_cita"
              value={formData.fecha_cita}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('dashboard')}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Crear Prospecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Mapa
const MapaView = ({ prospectos, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProspectos, setFilteredProspectos] = useState([]);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Filtrar prospectos
  useEffect(() => {
    const filtered = prospectos.filter(prospecto => {
      if (!searchTerm) return true;
      return prospecto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
             prospecto.producto_solicitado.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (prospecto.direccion && prospecto.direccion.toLowerCase().includes(searchTerm.toLowerCase()));
    });
    setFilteredProspectos(filtered);
  }, [prospectos, searchTerm]);

  // Cargar Google Maps API
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'DEMO_KEY'}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        setError('Error cargando Google Maps');
        setLoading(false);
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current) return;

      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: -33.4489, lng: -70.6693 }, // Santiago, Chile por defecto
          zoom: 11,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry.fill',
              stylers: [{ color: '#f8fafc' }]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#14B8A6' }]
            }
          ]
        });

        mapInstanceRef.current = map;
        addMarkersToMap(map);
        setLoading(false);
      } catch (err) {
        setError('Error inicializando el mapa');
        setLoading(false);
      }
    };

    loadGoogleMaps();

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => {
        if (marker.setMap) marker.setMap(null);
      });
      markersRef.current = [];
    };
  }, []);

  // Actualizar marcadores cuando cambien los prospectos filtrados
  useEffect(() => {
    if (mapInstanceRef.current) {
      addMarkersToMap(mapInstanceRef.current);
    }
  }, [filteredProspectos]);

  const addMarkersToMap = (map) => {
    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => {
      if (marker.setMap) marker.setMap(null);
    });
    markersRef.current = [];

    // Crear nuevos marcadores para prospectos con dirección
    const prospectsWithAddress = filteredProspectos.filter(p => p.direccion);
    
    if (prospectsWithAddress.length === 0) return;

    // Si tenemos coordenadas, usarlas; si no, geocodificar direcciones
    prospectsWithAddress.forEach((prospecto, index) => {
      if (prospecto.latitud && prospecto.longitud) {
        createMarker(map, prospecto, { lat: prospecto.latitud, lng: prospecto.longitud });
      } else if (prospecto.direccion) {
        // Geocodificar dirección (simulado con coordenadas aleatorias cerca de Santiago)
        const randomLat = -33.4489 + (Math.random() - 0.5) * 0.1;
        const randomLng = -70.6693 + (Math.random() - 0.5) * 0.1;
        createMarker(map, prospecto, { lat: randomLat, lng: randomLng });
      }
    });

    // Ajustar vista para mostrar todos los marcadores
    if (markersRef.current.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      map.fitBounds(bounds);
    }
  };

  const createMarker = (map, prospecto, position) => {
    const marker = new window.google.maps.Marker({
      position,
      map,
      title: prospecto.nombre,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#D4AF37',
        fillOpacity: 1,
        stroke: '#0F172A',
        strokeWeight: 2,
        scale: 8
      }
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 10px; max-width: 250px;">
          <h3 style="margin: 0 0 8px 0; color: #0F172A; font-size: 16px;">${prospecto.nombre}</h3>
          <p style="margin: 4px 0; color: #334155; font-size: 14px;">
            <strong>📱 Teléfono:</strong> ${prospecto.telefono}
          </p>
          <p style="margin: 4px 0; color: #334155; font-size: 14px;">
            <strong>🏗️ Producto:</strong> ${prospecto.producto_solicitado}
          </p>
          <p style="margin: 4px 0; color: #334155; font-size: 14px;">
            <strong>📅 Cita:</strong> ${new Date(prospecto.fecha_cita).toLocaleDateString('es-ES')}
          </p>
          ${prospecto.direccion ? `
            <p style="margin: 4px 0; color: #334155; font-size: 14px;">
              <strong>📍 Dirección:</strong> ${prospecto.direccion}
            </p>
          ` : ''}
          <div style="margin-top: 10px;">
            <button onclick="window.parent.postMessage({type: 'viewProspect', id: '${prospecto.id}'}, '*')" 
                    style="background: #D4AF37; color: #0F172A; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
              Ver Detalles
            </button>
          </div>
        </div>
      `
    });

    marker.addListener('click', () => {
      // Cerrar otras info windows
      markersRef.current.forEach(m => {
        if (m.infoWindow) m.infoWindow.close();
      });
      infoWindow.open(map, marker);
    });

    marker.infoWindow = infoWindow;
    markersRef.current.push(marker);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (error) {
    return (
      <div className="mapa-view">
        <div className="mapa-header">
          <h2>Mapa de Prospectos</h2>
        </div>
        <div className="error-state">
          <div className="error-icon">🗺️</div>
          <h3>Error cargando el mapa</h3>
          <p>{error}</p>
          <p className="error-help">
            Para usar la funcionalidad de mapa, necesitas configurar una API key de Google Maps en las variables de entorno.
          </p>
          <button
            className="btn-primary"
            onClick={() => onNavigate('dashboard')}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mapa-view">
      <div className="mapa-header">
        <h2>Mapa de Prospectos</h2>
        <div className="mapa-stats">
          <div className="stat-item">
            <span className="stat-number">{prospectos.length}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{filteredProspectos.filter(p => p.direccion).length}</span>
            <span className="stat-label">Con Dirección</span>
          </div>
        </div>
      </div>

      <div className="mapa-controls">
        <div className="search-control">
          <input
            type="text"
            placeholder="Buscar prospectos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <div className="map-actions">
          <button
            className="btn-outline"
            onClick={() => {
              if (mapInstanceRef.current && markersRef.current.length > 0) {
                const bounds = new window.google.maps.LatLngBounds();
                markersRef.current.forEach(marker => {
                  bounds.extend(marker.getPosition());
                });
                mapInstanceRef.current.fitBounds(bounds);
              }
            }}
          >
            📍 Centrar Mapa
          </button>
        </div>
      </div>

      <div className="mapa-container">
        <div className="map-wrapper">
          <div 
            ref={mapRef} 
            className="google-map"
            style={{ width: '100%', height: '500px', borderRadius: '12px' }}
          />
          {loading && (
            <div className="map-loading">
              <div className="loading-spinner"></div>
              <p>Cargando mapa...</p>
            </div>
          )}
        </div>

        <div className="prospects-sidebar">
          <h3>Prospectos ({filteredProspectos.length})</h3>
          <div className="prospects-list">
            {filteredProspectos.length === 0 ? (
              <div className="empty-prospects">
                <p>No se encontraron prospectos</p>
                {searchTerm && (
                  <button 
                    className="btn-secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              filteredProspectos.map(prospecto => (
                <div key={prospecto.id} className="prospect-item">
                  <div className="prospect-info">
                    <h4>{prospecto.nombre}</h4>
                    <p className="prospect-detail">📱 {prospecto.telefono}</p>
                    <p className="prospect-detail">🏗️ {prospecto.producto_solicitado}</p>
                    <p className="prospect-detail">📅 {formatDate(prospecto.fecha_cita)}</p>
                    {prospecto.direccion && (
                      <p className="prospect-detail">📍 {prospecto.direccion}</p>
                    )}
                    {!prospecto.direccion && (
                      <p className="prospect-warning">⚠️ Sin dirección</p>
                    )}
                  </div>
                  <div className="prospect-actions">
                    <WhatsAppButton 
                      prospecto={prospecto} 
                      tipo={determinarTipoWhatsApp(prospecto)} 
                      className="btn-whatsapp-small"
                      size="small"
                    />
                    <button 
                      className="btn-primary small"
                      onClick={() => {
                        // Encontrar y abrir marker
                        const marker = markersRef.current.find(m => 
                          m.title === prospecto.nombre
                        );
                        if (marker && mapInstanceRef.current) {
                          mapInstanceRef.current.setCenter(marker.getPosition());
                          mapInstanceRef.current.setZoom(15);
                          if (marker.infoWindow) {
                            marker.infoWindow.open(mapInstanceRef.current, marker);
                          }
                        }
                      }}
                      disabled={!prospecto.direccion}
                    >
                      Ver en Mapa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {prospectos.filter(p => !p.direccion).length > 0 && (
        <div className="mapa-notice">
          <div className="notice-content">
            <span className="notice-icon">💡</span>
            <div>
              <strong>Tip:</strong> {prospectos.filter(p => !p.direccion).length} prospectos no tienen dirección. 
              Agrega direcciones para verlos en el mapa.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Citas de Hoy
const CitasHoy = ({ onNavigate }) => {
  const [citasHoy, setCitasHoy] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCitasHoy();
  }, []);

  const cargarCitasHoy = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/citas-hoy`);
      setCitasHoy(response.data);
    } catch (error) {
      console.error('Error cargando citas de hoy:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando citas...</p>
      </div>
    );
  }

  return (
    <div className="citas-hoy">
      <div className="citas-header">
        <h2>Citas de Hoy</h2>
        <div className="fecha-actual">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {citasHoy.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No hay citas programadas para hoy</h3>
          <p>¡Perfecto día para ponerse al día con otras tareas!</p>
          <button
            className="btn-primary"
            onClick={() => onNavigate('dashboard')}
          >
            Ver Dashboard
          </button>
        </div>
      ) : (
        <div className="citas-list">
          {citasHoy.map(cita => (
            <div key={cita.id} className="cita-card">
              <div className="cita-time">
                <div className="time-display">{formatTime(cita.fecha_cita)}</div>
              </div>
              
              <div className="cita-details">
                <h3>{cita.nombre}</h3>
                <div className="detail-row">
                  <span className="detail-icon">📱</span>
                  <span>{cita.telefono}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-icon">🏗️</span>
                  <span>{cita.producto_solicitado}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-icon">📋</span>
                  <span>{cita.etapas?.length || 0} etapas completadas</span>
                </div>
              </div>

              <div className="cita-actions">
                <WhatsAppButton 
                  prospecto={cita} 
                  tipo="confirmacion_cita" 
                  className="btn-outline"
                  size="small"
                />
                <button 
                  className="btn-primary"
                  onClick={() => onNavigate('dashboard')}
                >
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Modal de Detalles del Prospecto
const ProspectoModal = ({ prospecto, onClose, onUpdate }) => {
  const [showAgregarEtapa, setShowAgregarEtapa] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{prospecto.nombre}</h2>
          <div className="modal-actions">
            <WhatsAppButton 
              prospecto={prospecto} 
              tipo={determinarTipoWhatsApp(prospecto)} 
              className="btn-whatsapp-header"
              size="small"
            />
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="prospecto-info">
            <div className="info-section">
              <h3>Información General</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Teléfono:</span>
                  <span className="info-value">{prospecto.telefono}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Producto:</span>
                  <span className="info-value">{prospecto.producto_solicitado}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Fecha de Cita:</span>
                  <span className="info-value">
                    {new Date(prospecto.fecha_cita).toLocaleString('es-ES')}
                  </span>
                </div>
              </div>
            </div>

            <div className="etapas-section">
              <div className="section-header">
                <h3>Timeline de Instalación</h3>
                <button
                  className="btn-primary"
                  onClick={() => setShowAgregarEtapa(true)}
                >
                  + Agregar Etapa
                </button>
              </div>

              {prospecto.etapas && prospecto.etapas.length > 0 ? (
                <div className="timeline">
                  {prospecto.etapas.map((etapa, index) => (
                    <TimelineItem key={etapa.id} etapa={etapa} isLast={index === prospecto.etapas.length - 1} />
                  ))}
                </div>
              ) : (
                <div className="empty-timeline">
                  <p>No hay etapas registradas aún</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showAgregarEtapa && (
          <AgregarEtapaModal
            prospectoId={prospecto.id}
            onClose={() => setShowAgregarEtapa(false)}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  );
};

// Componente Timeline Item
const TimelineItem = ({ etapa, isLast }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="timeline-item">
      <div className="timeline-marker">
        <div className="timeline-dot"></div>
        {!isLast && <div className="timeline-line"></div>}
      </div>
      
      <div className="timeline-content">
        <div className="timeline-header">
          <h4>{etapa.nombre_etapa}</h4>
          <span className="timeline-date">{formatDate(etapa.fecha)}</span>
        </div>
        
        <p className="timeline-comment">{etapa.comentario}</p>
        
        {etapa.fotos && etapa.fotos.length > 0 && (
          <div className="timeline-gallery">
            <h5>Fotos ({etapa.fotos.length})</h5>
            <div className="gallery-grid">
              {etapa.fotos.map((foto, index) => (
                <img
                  key={index}
                  src={foto}
                  alt={`${etapa.nombre_etapa} - Foto ${index + 1}`}
                  className="gallery-thumbnail"
                  onClick={() => window.open(foto, '_blank')}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Modal para Agregar Etapa
const AgregarEtapaModal = ({ prospectoId, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    nombre_etapa: '',
    comentario: ''
  });
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [piezasMedicion, setPiezasMedicion] = useState([]);
  const [precioM2General, setPrecioM2General] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('m'); // 'm' o 'cm'
  
  // Estados específicos para etapa Pedido
  const [camposPedido, setCamposPedido] = useState({
    monto_total: '',
    anticipo_recibido: '',
    saldo_pendiente: '',
    forma_pago: '',
    fecha_vencimiento_saldo: '',
    cotizacion_url: '',
    archivo_levantamiento_url: ''
  });
  
  // Estado para saber si hay una medición disponible para generar pedido
  const [tieneMedicion, setTieneMedicion] = useState(false);
  
  // Verificar si existe medición disponible al abrir el modal
  useEffect(() => {
    const verificarMedicion = async () => {
      if (prospectoId) {
        try {
          const response = await axios.get(`${API}/prospectos/${prospectoId}`);
          const prospecto = response.data;
          const medicion = prospecto.etapas.find(e => e.nombre_etapa === 'Visita Inicial / Medición');
          setTieneMedicion(medicion && medicion.piezas_medicion && medicion.piezas_medicion.length > 0);
        } catch (error) {
          console.error('Error verificando medición:', error);
        }
      }
    };
    verificarMedicion();
  }, [prospectoId]);

  // Función para obtener descripción de cada etapa
  const getEtapaDescription = (etapa) => {
    const descriptions = {
      "Visita Inicial / Medición": "Captación del prospecto y levantamiento de medidas. Documentar medidas, necesidades y especificaciones.",
      "Pedido": "Formalización del pedido con datos de medición y términos de pago. Registrar anticipo, saldo pendiente y forma de pago.",
      "Cotización Aprobada": "Cliente confirma cotización y deja anticipo. Registrar detalles del acuerdo y forma de pago.",
      "Fabricación": "Pedido subido al sistema y en producción/taller. Adjuntar fotos del taller o confirmación de materiales.",
      "Instalación en Proceso": "Preparación del sitio, montaje, ajustes y acabados. Documentar todo el proceso con fotos.",
      "Entrega Final": "Instalación concluida, cliente firma conformidad, se liquida saldo. Fotos finales y documentos.",
      "Postventa": "Revisión, mantenimiento o garantía. Usar comentarios para especificar el tipo de seguimiento."
    };
    
    return descriptions[etapa] ? (
      <div className="etapa-hint">
        <span className="hint-icon">💡</span>
        <span className="hint-text">{descriptions[etapa]}</span>
      </div>
    ) : null;
  };

  // Agregar nueva pieza a la tabla
  const agregarPieza = () => {
    const nuevaPieza = {
      id: Date.now().toString(),
      ubicacion: '',
      ancho: '',
      alto: '',
      producto_tela: '',
      color_acabado: '',
      observaciones: '',
      fotos: [],
      notas_video_url: '',
      precio_m2: null
    };
    setPiezasMedicion([...piezasMedicion, nuevaPieza]);
  };

  // Eliminar pieza
  const eliminarPieza = (id) => {
    setPiezasMedicion(piezasMedicion.filter(p => p.id !== id));
  };

  // Actualizar pieza
  const actualizarPieza = (id, campo, valor) => {
    setPiezasMedicion(piezasMedicion.map(p => 
      p.id === id ? { ...p, [campo]: valor } : p
    ));
  };

  // Subir foto para una pieza específica
  const subirFotoPieza = async (piezaId, files) => {
    // Por ahora simular URLs de fotos (integración real con Cloudinary pendiente)
    const nuevasFotos = Array.from(files).map(file => ({
      name: file.name,
      url: URL.createObjectURL(file), // URL temporal para demo
      file: file
    }));
    
    const piezaActualizada = piezasMedicion.find(p => p.id === piezaId);
    if (piezaActualizada) {
      actualizarPieza(piezaId, 'fotos', [...piezaActualizada.fotos, ...nuevasFotos]);
    }
  };

  // Normalizar entrada de precio
  const normalizarPrecio = (valor) => {
    if (typeof valor === 'string') {
      return valor.replace(',', '.');
    }
    return valor;
  };

  // Calcular m² para una pieza con validaciones
  const calcularM2Pieza = (pieza) => {
    let ancho = parseFloat(pieza.ancho) || 0;
    let alto = parseFloat(pieza.alto) || 0;
    
    if (ancho <= 0 || alto <= 0) return 0;
    
    if (unidadMedida === 'm') {
      return ancho * alto; // Directo en metros
    } else { // cm
      return (ancho / 100) * (alto / 100); // Convertir cm a m²
    }
  };

  // Calcular m² comercial (con regla mínimo 1 m²)
  const calcularM2Comercial = (pieza) => {
    const m2Real = calcularM2Pieza(pieza);
    return Math.max(m2Real, 1.0); // Mínimo 1 m²
  };

  // Generar pedido desde medición
  const generarPedidoDesdeMedicion = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/prospectos/${prospectoId}/generar-pedido`);
      
      if (response.data.etapa) {
        // Cargar los datos del pedido generado en el formulario
        const pedido = response.data.etapa;
        setFormData({
          nombre_etapa: 'Pedido',
          comentario: pedido.comentario
        });
        
        setCamposPedido({
          monto_total: pedido.monto_total || '',
          anticipo_recibido: pedido.anticipo_recibido || '',
          saldo_pendiente: pedido.saldo_pendiente || '',
          forma_pago: pedido.forma_pago || '',
          fecha_vencimiento_saldo: pedido.fecha_vencimiento_saldo || '',
          cotizacion_url: pedido.cotizacion_url || '',
          archivo_levantamiento_url: pedido.archivo_levantamiento_url || ''
        });
        
        setPiezasMedicion(pedido.piezas_medicion || []);
        setPrecioM2General(pedido.precio_m2_general || '');
        setUnidadMedida(pedido.unidad_medida || 'm');
        
        alert(`¡Pedido generado exitosamente!\n\nResumen:\n- ${response.data.resumen.total_piezas} piezas\n- ${response.data.resumen.total_m2_real} m² reales\n- ${response.data.resumen.total_m2_comercial} m² comerciales\n- $${response.data.resumen.total_estimado.toLocaleString('es-MX', {minimumFractionDigits: 2})} total estimado`);
      }
      
      await onUpdate();
      onClose();
    } catch (error) {
      console.error('Error generando pedido:', error);
      alert(error.response?.data?.detail || 'Error al generar el pedido');
    } finally {
      setLoading(false);
    }
  };

  // Calcular totales corregidos (con opción de usar m² comercial)
  const calcularTotales = (usarComercial = false) => {
    let totalM2Real = 0;
    let totalM2Comercial = 0;
    let totalEstimado = 0;
    let piezasConPrecio = 0;
    
    piezasMedicion.forEach(pieza => {
      const m2Real = calcularM2Pieza(pieza);
      const m2Comercial = calcularM2Comercial(pieza);
      
      totalM2Real += m2Real;
      totalM2Comercial += m2Comercial;
      
      const precioIndividual = parseFloat(pieza.precio_m2) || 0;
      const precioGeneral = parseFloat(precioM2General) || 0;
      const precioAplicado = precioIndividual || precioGeneral;
      
      if (precioAplicado > 0) {
        // Usar m² comercial para cálculo de precios
        const m2ParaCalculo = usarComercial ? m2Comercial : m2Real;
        totalEstimado += m2ParaCalculo * precioAplicado;
        piezasConPrecio++;
      }
    });
    
    const totalM2Final = usarComercial ? totalM2Comercial : totalM2Real;
    const precioPromedio = totalM2Final > 0 ? totalEstimado / totalM2Final : 0;
    
    return { 
      totalM2: totalM2Final,
      totalM2Real: totalM2Real,
      totalM2Comercial: totalM2Comercial,
      totalEstimado: totalEstimado,
      precioPromedio: precioPromedio,
      piezasConPrecio: piezasConPrecio,
      totalPiezas: piezasMedicion.length
    };
  };

  const totales = calcularTotales();
  const hayPrecio = totales.piezasConPrecio > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('nombre_etapa', formData.nombre_etapa);
      formDataToSend.append('comentario', formData.comentario);
      
      // Para Visita Inicial / Medición, incluir piezas y cálculos
      if (formData.nombre_etapa === 'Visita Inicial / Medición') {
        formDataToSend.append('piezas_medicion', JSON.stringify(piezasMedicion));
        formDataToSend.append('precio_m2_general', precioM2General || 0);
        formDataToSend.append('total_m2', totales.totalM2);
        formDataToSend.append('total_estimado', totales.totalEstimado);
        formDataToSend.append('unidad_medida', unidadMedida);
      }
      
      fotos.forEach((foto, index) => {
        formDataToSend.append('fotos', foto);
      });

      await axios.post(
        `${API}/prospectos/${prospectoId}/etapas`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      await onUpdate();
      onClose();
    } catch (error) {
      console.error('Error agregando etapa:', error);
      alert('Error al agregar la etapa');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFotos(files);
  };

  const exportarMedicion = async () => {
    try {
      const response = await axios.get(`${API}/prospectos/${prospectoId}/medicion/export`);
      const data = response.data;
      
      // Generar Excel (implementación simplificada)
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      
      const wsData = [
        ['LEVANTAMIENTO DE MEDIDAS - SUNDECK'],
        [''],
        ['Cliente:', data.prospecto.nombre],
        ['Teléfono:', data.prospecto.telefono],
        ['Producto:', data.prospecto.producto_solicitado],
        ['Fecha Medición:', new Date(data.medicion.fecha).toLocaleDateString('es-MX')],
        ['Dirección:', data.prospecto.direccion || 'No especificada'],
        ['Unidad de medida:', unidadMedida === 'm' ? 'Metros' : 'Centímetros'],
        [''],
        ['PIEZAS MEDIDAS:'],
        ['Ubicación', `Ancho (${unidadMedida})`, `Alto (${unidadMedida})`, 'Producto/Tela', 'Color/Acabado', 'm²', 'Precio/m²', 'Subtotal', 'Observaciones', 'Fotos', 'Notas/Video']
      ];
      
      piezasMedicion.forEach(pieza => {
        const m2 = calcularM2Pieza(pieza);
        const precioAplicado = parseFloat(pieza.precio_m2) || parseFloat(precioM2General) || 0;
        const subtotal = m2 * precioAplicado;
        
        wsData.push([
          pieza.ubicacion,
          pieza.ancho,
          pieza.alto,
          pieza.producto_tela,
          pieza.color_acabado,
          m2.toFixed(2),
          precioAplicado > 0 ? `$${precioAplicado.toFixed(2)}` : 'Sin precio',
          precioAplicado > 0 ? `$${subtotal.toFixed(2)}` : 'Sin precio',
          pieza.observaciones,
          pieza.fotos.length + ' foto(s)',
          pieza.notas_video_url || 'Sin notas'
        ]);
      });
      
      // Agregar totales corregidos
      wsData.push([]);
      wsData.push(['TOTALES:']);
      wsData.push(['Total m²:', totales.totalM2.toFixed(2)]);
      if (hayPrecio) {
        wsData.push(['Precio promedio por m²:', `$${totales.precioPromedio.toFixed(2)}`]);
        wsData.push(['TOTAL ESTIMADO:', `$${totales.totalEstimado.toLocaleString('es-MX', {minimumFractionDigits: 2})}`]);
      }
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Medición');
      XLSX.writeFile(wb, `Medicion_${data.prospecto.nombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
    } catch (error) {
      console.error('Error exportando medición:', error);
      alert('Error al exportar medición');
    }
  };

  const generarCotizacion = async () => {
    if (!hayPrecio) {
      alert('Debe agregar un precio por m² para generar la cotización');
      return;
    }

    try {
      // Importar jsPDF dinámicamente
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      // Header con branding Sundeck
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42); // Color primario Sundeck
      doc.text('SUNDECK', 20, 25);
      
      doc.setFontSize(16);
      doc.setTextColor(212, 175, 55); // Color secundario Sundeck
      doc.text('COTIZACIÓN', 20, 35);
      
      // Información del cliente
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Cliente: ${formData.cliente || 'Cliente de Prueba'}`, 20, 50);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 20, 60);
      doc.text(`Unidad de medida: ${unidadMedida === 'm' ? 'Metros' : 'Centímetros'}`, 20, 70);
      
      // Tabla de piezas con cálculos corregidos
      const tableData = piezasMedicion.map(pieza => {
        const m2 = calcularM2Pieza(pieza);
        const precioAplicado = parseFloat(pieza.precio_m2) || parseFloat(precioM2General) || 0;
        const subtotal = m2 * precioAplicado;
        
        return [
          pieza.ubicacion,
          `${pieza.ancho} × ${pieza.alto} ${unidadMedida}`,
          pieza.producto_tela,
          pieza.color_acabado,
          m2.toFixed(2),
          precioAplicado > 0 ? `$${precioAplicado.toFixed(2)}` : 'Sin precio',
          precioAplicado > 0 ? `$${subtotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}` : 'Sin precio'
        ];
      });
      
      doc.autoTable({
        head: [['Ubicación', 'Medidas', 'Producto', 'Color', 'm²', 'Precio/m²', 'Subtotal']],
        body: tableData,
        startY: 80,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [212, 175, 55] }
      });
      
      // Totales corregidos
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text(`Total m²: ${totales.totalM2.toFixed(2)}`, 20, finalY);
      doc.text(`Precio promedio: $${totales.precioPromedio.toFixed(2)}/m²`, 20, finalY + 10);
      
      doc.setFontSize(14);
      doc.setTextColor(212, 175, 55);
      doc.text(`TOTAL ESTIMADO: $${totales.totalEstimado.toLocaleString('es-MX', {minimumFractionDigits: 2})}`, 20, finalY + 25);
      
      // Términos y condiciones
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Cotización sujeta a confirmación y condiciones de pago.', 20, finalY + 40);
      doc.text('Válida por 30 días. Precios pueden variar según especificaciones finales.', 20, finalY + 50);
      
      // Descargar PDF
      doc.save(`Cotizacion_Sundeck_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generando cotización:', error);
      alert('Error al generar la cotización');
    }
  };

  const esMedicion = formData.nombre_etapa === 'Visita Inicial / Medición';

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${esMedicion ? 'modal-large' : 'small-modal'}`}>
        <div className="modal-header">
          <h3>Agregar Nueva Etapa</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="etapa-form">
          <div className="form-group">
            <label htmlFor="nombre_etapa">Nombre de la Etapa</label>
            <select
              id="nombre_etapa"
              value={formData.nombre_etapa}
              onChange={(e) => setFormData({...formData, nombre_etapa: e.target.value})}
              required
            >
              <option value="">Seleccione una etapa</option>
              <option value="Visita Inicial / Medición">Visita Inicial / Medición</option>
              <option value="Pedido">Pedido</option>
              <option value="Cotización Aprobada">Cotización Aprobada</option>
              <option value="Fabricación">Fabricación</option>
              <option value="Instalación en Proceso">Instalación en Proceso</option>
              <option value="Entrega Final">Entrega Final</option>
              <option value="Postventa">Postventa</option>
            </select>
            <div className="etapa-description">
              {getEtapaDescription(formData.nombre_etapa)}
            </div>
          </div>

          {esMedicion && (
            <div className="medicion-section">
              <div className="medicion-header">
                <div className="medicion-title">
                  <h4>📏 Levantamiento de Medidas</h4>
                  {piezasMedicion.length > 0 && (
                    <div className="medicion-summary">
                      <span className="summary-item">
                        📐 {totales.totalM2.toFixed(2)} m² total
                      </span>
                      {hayPrecio && (
                        <span className="summary-item total-money">
                          💰 ${totales.totalEstimado.toLocaleString('es-MX', {minimumFractionDigits: 2})}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="medicion-controls">
                  {/* Toggle de unidades */}
                  <div className="unit-toggle">
                    <label>Unidad:</label>
                    <div className="toggle-buttons">
                      <button
                        type="button"
                        className={`toggle-btn ${unidadMedida === 'm' ? 'active' : ''}`}
                        onClick={() => setUnidadMedida('m')}
                      >
                        m
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${unidadMedida === 'cm' ? 'active' : ''}`}
                        onClick={() => setUnidadMedida('cm')}
                      >
                        cm
                      </button>
                    </div>
                  </div>
                  
                  <div className="medicion-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={agregarPieza}
                    >
                      + Agregar Pieza
                    </button>
                    {piezasMedicion.length > 0 && (
                      <>
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={exportarMedicion}
                        >
                          📄 Descargar Levantamiento
                        </button>
                        {hayPrecio && (
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={generarCotizacion}
                          >
                            💰 Generar Cotización
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Campo de precio general */}
              {piezasMedicion.length > 0 && (
                <div className="precio-general">
                  <div className="form-group">
                    <label htmlFor="precio_m2_general">Precio General por m² (MXN)</label>
                    <input
                      type="text"
                      id="precio_m2_general"
                      value={precioM2General}
                      onChange={(e) => setPrecioM2General(normalizarPrecio(e.target.value))}
                      placeholder="750.00"
                    />
                    <small className="field-help">
                      Precio base aplicable a todas las piezas (opcional). 
                      {hayPrecio && ` ${totales.piezasConPrecio}/${totales.totalPiezas} piezas con precio`}
                    </small>
                  </div>
                </div>
              )}

              {piezasMedicion.length === 0 ? (
                <div className="empty-medicion">
                  <p>No hay piezas agregadas. Haga clic en "Agregar Pieza" para comenzar.</p>
                </div>
              ) : (
                <div className="medicion-table">
                  {piezasMedicion.map((pieza, index) => (
                    <TablaPieza
                      key={pieza.id}
                      pieza={pieza}
                      index={index}
                      onUpdate={(campo, valor) => actualizarPieza(pieza.id, campo, valor)}
                      onDelete={() => eliminarPieza(pieza.id)}
                      onUploadFoto={(files) => subirFotoPieza(pieza.id, files)}
                      precioM2General={precioM2General}
                      unidadMedida={unidadMedida}
                    />
                  ))}
                  
                  {/* Totales corregidos */}
                  <div className="totales-section">
                    <h4>Resumen de Medición</h4>
                    <div className="totales-grid">
                      <div className="total-item">
                        <span className="total-label">Total m²:</span>
                        <span className="total-value">{totales.totalM2.toFixed(2)} m²</span>
                      </div>
                      {hayPrecio && (
                        <>
                          <div className="total-item">
                            <span className="total-label">Precio promedio:</span>
                            <span className="total-value">${totales.precioPromedio.toFixed(2)}/m²</span>
                          </div>
                          <div className="total-item primary">
                            <span className="total-label">TOTAL ESTIMADO:</span>
                            <span className="total-value">${totales.totalEstimado.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
                          </div>
                        </>
                      )}
                      {totales.piezasConPrecio < totales.totalPiezas && (
                        <div className="total-item warning">
                          <span className="total-label">Sin precio:</span>
                          <span className="total-value">{totales.totalPiezas - totales.piezasConPrecio} pieza(s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="comentario">Comentarios</label>
            <textarea
              id="comentario"
              value={formData.comentario}
              onChange={(e) => setFormData({...formData, comentario: e.target.value})}
              required
              rows="4"
              placeholder="Describe los detalles de esta etapa..."
            />
          </div>

          {!esMedicion && (
            <div className="form-group">
              <label htmlFor="fotos">Fotos (Opcional)</label>
              <input
                type="file"
                id="fotos"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="file-input"
              />
              {fotos.length > 0 && (
                <div className="selected-files">
                  <p>{fotos.length} archivo(s) seleccionado(s)</p>
                </div>
              )}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Agregar Etapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente para cada pieza en la tabla de medición
const TablaPieza = ({ pieza, index, onUpdate, onDelete, onUploadFoto, precioM2General, unidadMedida }) => {
  const [showFotos, setShowFotos] = useState(false);

  const handleInputChange = (campo, valor) => {
    // Normalizar entrada: reemplazar coma por punto
    if (campo === 'ancho' || campo === 'alto' || campo === 'precio_m2') {
      if (typeof valor === 'string') {
        valor = valor.replace(',', '.');
      }
    }
    onUpdate(campo, valor);
  };

  // Calcular m² automáticamente con validaciones
  const calcularM2 = () => {
    let ancho = parseFloat(pieza.ancho) || 0;
    let alto = parseFloat(pieza.alto) || 0;
    
    // Validar rangos razonables
    if (unidadMedida === 'm') {
      if (ancho > 10 || alto > 10) {
        console.warn('Medidas muy grandes para metros:', ancho, alto);
      }
      if (ancho > 0 && alto > 0) {
        return ancho * alto; // Directo en metros
      }
    } else { // cm
      if (ancho > 1000 || alto > 1000) {
        console.warn('Medidas muy grandes para centímetros:', ancho, alto);
      }
      if (ancho > 0 && alto > 0) {
        return (ancho / 100) * (alto / 100); // Convertir cm a m²
      }
    }
    return 0;
  };

  // Obtener precio aplicado (individual o general)
  const obtenerPrecioAplicado = () => {
    return parseFloat(pieza.precio_m2) || parseFloat(precioM2General) || 0;
  };

  // Calcular subtotal de la pieza
  const calcularSubtotalPieza = () => {
    const m2 = calcularM2();
    const precio = obtenerPrecioAplicado();
    return m2 * precio;
  };

  const metrosCuadrados = calcularM2();
  const precioAplicado = obtenerPrecioAplicado();
  const subtotalPieza = calcularSubtotalPieza();

  // Validaciones visuales
  const anchoNum = parseFloat(pieza.ancho) || 0;
  const altoNum = parseFloat(pieza.alto) || 0;
  const fueraDeRango = unidadMedida === 'm' ? (anchoNum > 10 || altoNum > 10) : (anchoNum > 1000 || altoNum > 1000);

  return (
    <div className="pieza-card">
      <div className="pieza-header">
        <h5>Pieza #{index + 1}</h5>
        <div className="pieza-stats">
          <span className={`m2-display ${fueraDeRango ? 'warning' : ''}`}>
            {metrosCuadrados.toFixed(2)} m²
            {fueraDeRango && <span className="warning-icon">⚠️</span>}
          </span>
          {precioAplicado > 0 ? (
            <span className="total-display">
              ${subtotalPieza.toLocaleString('es-MX', {minimumFractionDigits: 2})}
            </span>
          ) : (
            <span className="no-price-display">Falta precio</span>
          )}
        </div>
        <button
          type="button"
          className="btn-delete"
          onClick={onDelete}
          title="Eliminar pieza"
        >
          🗑️
        </button>
      </div>

      <div className="pieza-grid">
        <div className="form-group">
          <label>Ubicación</label>
          <input
            type="text"
            value={pieza.ubicacion}
            onChange={(e) => handleInputChange('ubicacion', e.target.value)}
            placeholder="Ej: Sala, Recámara, Terraza"
          />
        </div>

        <div className="form-group">
          <label>Ancho ({unidadMedida})</label>
          <input
            type="text"
            value={pieza.ancho}
            onChange={(e) => handleInputChange('ancho', e.target.value)}
            placeholder={unidadMedida === 'm' ? '2.50' : '250'}
            className={fueraDeRango ? 'input-warning' : ''}
          />
          {fueraDeRango && (
            <small className="field-warning">
              Valor muy grande para {unidadMedida === 'm' ? 'metros' : 'centímetros'}
            </small>
          )}
        </div>

        <div className="form-group">
          <label>Alto ({unidadMedida})</label>
          <input
            type="text"
            value={pieza.alto}
            onChange={(e) => handleInputChange('alto', e.target.value)}
            placeholder={unidadMedida === 'm' ? '3.20' : '320'}
            className={fueraDeRango ? 'input-warning' : ''}
          />
        </div>

        <div className="form-group">
          <label>Producto / Tela</label>
          <input
            type="text"
            value={pieza.producto_tela}
            onChange={(e) => handleInputChange('producto_tela', e.target.value)}
            placeholder="Tipo de producto o tela"
          />
        </div>

        <div className="form-group">
          <label>Color / Acabado</label>
          <input
            type="text"
            value={pieza.color_acabado}
            onChange={(e) => handleInputChange('color_acabado', e.target.value)}
            placeholder="Color o acabado"
          />
        </div>

        <div className="form-group">
          <label>Precio por m² (Opcional)</label>
          <input
            type="text"
            value={pieza.precio_m2 || ''}
            onChange={(e) => handleInputChange('precio_m2', e.target.value)}
            placeholder={`$${precioM2General || '0.00'}`}
          />
          <small className="field-help">
            {precioAplicado > 0 ? 
              `Usando: $${precioAplicado.toFixed(2)}/m²` : 
              'Deja vacío para usar precio general'
            }
          </small>
        </div>

        <div className="form-group span-2">
          <label>Observaciones</label>
          <textarea
            value={pieza.observaciones}
            onChange={(e) => handleInputChange('observaciones', e.target.value)}
            placeholder="Observaciones adicionales..."
            rows="2"
          />
        </div>

        <div className="form-group">
          <label>Fotos</label>
          <div className="foto-upload">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFotoUpload}
              className="file-input-small"
              id={`fotos-${pieza.id}`}
            />
            <label htmlFor={`fotos-${pieza.id}`} className="upload-label">
              📷 Subir Fotos ({pieza.fotos.length})
            </label>
            {pieza.fotos.length > 0 && (
              <button
                type="button"
                className="btn-view-fotos"
                onClick={() => setShowFotos(!showFotos)}
              >
                {showFotos ? '👁️ Ocultar' : '👁️ Ver'}
              </button>
            )}
          </div>
          
          {showFotos && pieza.fotos.length > 0 && (
            <div className="fotos-preview">
              {pieza.fotos.map((foto, i) => (
                <img
                  key={i}
                  src={foto.url}
                  alt={`Foto ${i + 1}`}
                  className="foto-thumbnail"
                  onClick={() => window.open(foto.url, '_blank')}
                />
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Notas / Video URL</label>
          <input
            type="url"
            value={pieza.notas_video_url}
            onChange={(e) => handleInputChange('notas_video_url', e.target.value)}
            placeholder="Link de Drive, Dropbox, video, etc."
          />
        </div>
      </div>
    </div>
  );

  function handleFotoUpload(e) {
    const files = e.target.files;
    if (files.length > 0) {
      onUploadFoto(files);
    }
  }
};

export default App;