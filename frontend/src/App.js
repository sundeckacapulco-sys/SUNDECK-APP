import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

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
    { id: 'citas', label: 'Citas Hoy', icon: '📅' }
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
    fecha_cita: ''
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
      await axios.post(`${API}/prospectos`, {
        ...formData,
        fecha_cita: new Date(formData.fecha_cita).toISOString()
      });
      
      setFormData({
        nombre: '',
        telefono: '',
        producto_solicitado: '',
        fecha_cita: ''
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

  return (
    <div className="registro-prospecto">
      <div className="form-container">
        <h2>Nuevo Prospecto</h2>
        
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
            <select
              id="producto_solicitado"
              name="producto_solicitado"
              value={formData.producto_solicitado}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione un producto</option>
              <option value="Deck Residencial">Deck Residencial</option>
              <option value="Deck Comercial">Deck Comercial</option>
              <option value="Pergola">Pergola</option>
              <option value="Gazebo">Gazebo</option>
              <option value="Techo Solar">Techo Solar</option>
              <option value="Mantenimiento">Mantenimiento</option>
            </select>
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
                <button className="btn-outline">
                  <span>📞</span>
                  Llamar
                </button>
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
          <button className="modal-close" onClick={onClose}>×</button>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('nombre_etapa', formData.nombre_etapa);
      formDataToSend.append('comentario', formData.comentario);
      
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

  return (
    <div className="modal-overlay">
      <div className="modal-content small-modal">
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
              <option value="Visita Inicial">Visita Inicial</option>
              <option value="Medición y Diseño">Medición y Diseño</option>
              <option value="Cotización Aprobada">Cotización Aprobada</option>
              <option value="Preparación del Sitio">Preparación del Sitio</option>
              <option value="Instalación de Estructura">Instalación de Estructura</option>
              <option value="Instalación de Deck">Instalación de Deck</option>
              <option value="Acabados Finales">Acabados Finales</option>
              <option value="Entrega Final">Entrega Final</option>
              <option value="Postventa - Revisión">Postventa - Revisión</option>
              <option value="Postventa - Mantenimiento">Postventa - Mantenimiento</option>
              <option value="Postventa - Garantía">Postventa - Garantía</option>
            </select>
          </div>

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

export default App;