import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TareasPendientes = ({ onNavigate }) => {
  const [recordatorios, setRecordatorios] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [loading, setLoading] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [mensajeExpandido, setMensajeExpandido] = useState(null);

  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Cargar recordatorios
  const cargarRecordatorios = async (filtro = null) => {
    try {
      setLoading(true);
      let url = `${API}/api/recordatorios`;
      
      if (filtro === 'vencidos') {
        url += '?vencidos_solo=true';
      } else if (filtro === 'pendientes') {
        url += '?estado=pendiente';
      }
      
      const response = await axios.get(url);
      setRecordatorios(response.data.recordatorios || []);
      setEstadisticas(response.data.estadisticas || {});
    } catch (error) {
      console.error('Error cargando recordatorios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar recordatorio como completado
  const completarRecordatorio = async (recordatorioId, notas = '') => {
    try {
      await axios.patch(`${API}/api/recordatorios/${recordatorioId}/completar`, null, {
        params: { notas }
      });
      
      // Recargar recordatorios
      cargarRecordatorios(filtroActivo === 'todos' ? null : filtroActivo);
      
      alert('✅ Recordatorio marcado como completado');
    } catch (error) {
      console.error('Error completando recordatorio:', error);
      alert('❌ Error al completar recordatorio');
    }
  };

  // Generar mensaje de WhatsApp personalizado
  const enviarWhatsApp = async (recordatorio) => {
    try {
      // Por ahora usar el mensaje del recordatorio directamente
      const mensaje = recordatorio.mensaje_sugerido;
      const telefono = recordatorio.prospecto_telefono?.replace(/[^0-9]/g, '') || '';
      
      if (telefono.length >= 10) {
        let cleanPhone = telefono;
        if (cleanPhone.startsWith('52')) {
          cleanPhone = cleanPhone.substring(2);
        }
        if (cleanPhone.length === 10) {
          const whatsappUrl = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
          window.open(whatsappUrl, '_blank');
          
          // Preguntar si se completó el seguimiento
          setTimeout(() => {
            if (window.confirm('¿Ya realizó el seguimiento? ¿Marcar como completado?')) {
              completarRecordatorio(recordatorio.id, 'Seguimiento realizado vía WhatsApp');
            }
          }, 2000);
        } else {
          alert('❌ Número de teléfono inválido');
        }
      } else {
        alert('❌ No hay número de teléfono válido para este prospecto');
      }
    } catch (error) {
      console.error('Error enviando WhatsApp:', error);
    }
  };

  // Formatear fecha
  const formatearFecha = (fechaStr) => {
    try {
      const fecha = new Date(fechaStr);
      const ahora = new Date();
      const diffMs = fecha.getTime() - ahora.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      const fechaFormato = fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      if (diffDays < 0) {
        return `${fechaFormato} (Vencido ${Math.abs(diffDays)} días)`;
      } else if (diffDays === 0) {
        return `${fechaFormato} (Hoy)`;
      } else if (diffDays === 1) {
        return `${fechaFormato} (Mañana)`;
      } else {
        return `${fechaFormato} (En ${diffDays} días)`;
      }
    } catch {
      return fechaStr;
    }
  };

  // Obtener color de urgencia
  const getColorUrgencia = (fechaLimite) => {
    try {
      const fecha = new Date(fechaLimite);
      const ahora = new Date();
      const diffMs = fecha.getTime() - ahora.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'red';      // Vencido
      if (diffDays === 0) return 'orange'; // Hoy
      if (diffDays <= 1) return 'yellow';  // Mañana
      return 'green';                      // Futuro
    } catch {
      return 'gray';
    }
  };

  // Obtener descripción del tipo de recordatorio
  const getTipoDescripcion = (tipo) => {
    const tipos = {
      'cotizacion_24h': '📋 Enviar Cotización (24h)',
      'primer_seguimiento': '📞 Primer Seguimiento',
      'segundo_seguimiento': '📞 Segundo Seguimiento (3 días)',
      'tercer_seguimiento': '📞 Tercer Seguimiento (7 días)',
      'recontacto_sin_respuesta': '🔄 Recontacto sin Respuesta',
      'cobro_anticipo': '💰 Recordar Anticipo'
    };
    return tipos[tipo] || tipo;
  };

  useEffect(() => {
    cargarRecordatorios();
  }, []);

  const aplicarFiltro = (filtro) => {
    setFiltroActivo(filtro);
    cargarRecordatorios(filtro === 'todos' ? null : filtro);
  };

  if (loading) {
    return (
      <div className="tareas-loading">
        <div className="loading-spinner"></div>
        <p>Cargando tareas pendientes...</p>
      </div>
    );
  }

  return (
    <div className="tareas-pendientes">
      {/* Header con estadísticas */}
      <div className="tareas-header">
        <div className="tareas-title">
          <h2>📋 Tareas Pendientes - Centro de Seguimiento</h2>
          <p>Gestión automática de recordatorios y seguimientos de prospectos</p>
        </div>
        
        <div className="tareas-stats">
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{estadisticas.pendientes || 0}</div>
              <div className="stat-label">Pendientes</div>
            </div>
          </div>
          
          <div className="stat-card overdue">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <div className="stat-number">{estadisticas.vencidos || 0}</div>
              <div className="stat-label">Vencidos</div>
            </div>
          </div>
          
          <div className="stat-card completed">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{estadisticas.completados || 0}</div>
              <div className="stat-label">Completados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="tareas-filtros">
        <div className="filtros-tabs">
          <button 
            className={`tab-filter ${filtroActivo === 'todos' ? 'active' : ''}`}
            onClick={() => aplicarFiltro('todos')}
          >
            📋 Todos ({estadisticas.total || 0})
          </button>
          <button 
            className={`tab-filter ${filtroActivo === 'pendientes' ? 'active' : ''}`}
            onClick={() => aplicarFiltro('pendientes')}
          >
            ⏳ Pendientes ({estadisticas.pendientes || 0})
          </button>
          <button 
            className={`tab-filter ${filtroActivo === 'vencidos' ? 'active' : ''}`}
            onClick={() => aplicarFiltro('vencidos')}
          >
            🚨 Vencidos ({estadisticas.vencidos || 0})
          </button>
        </div>
      </div>

      {/* Lista de recordatorios */}
      <div className="tareas-lista">
        {recordatorios.length === 0 ? (
          <div className="tareas-empty">
            <div className="empty-icon">🎉</div>
            <h3>¡No hay tareas pendientes!</h3>
            <p>Excelente trabajo manteniendo el seguimiento al día.</p>
          </div>
        ) : (
          recordatorios.map(recordatorio => (
            <div 
              key={recordatorio.id} 
              className={`recordatorio-card ${getColorUrgencia(recordatorio.fecha_limite)}`}
            >
              <div className="recordatorio-header">
                <div className="recordatorio-tipo">
                  {getTipoDescripcion(recordatorio.tipo)}
                </div>
                <div className="recordatorio-urgencia">
                  {formatearFecha(recordatorio.fecha_limite)}
                </div>
              </div>
              
              <div className="recordatorio-prospecto">
                <div className="prospecto-info">
                  <h4>{recordatorio.prospecto_nombre}</h4>
                  <p>{recordatorio.prospecto_producto}</p>
                  <span className="prospecto-telefono">{recordatorio.prospecto_telefono}</span>
                </div>
              </div>
              
              <div className="recordatorio-mensaje">
                <p>"{recordatorio.mensaje_sugerido}"</p>
              </div>
              
              <div className="recordatorio-acciones">
                <button 
                  className="btn-whatsapp"
                  onClick={() => enviarWhatsApp(recordatorio)}
                  title="Enviar mensaje por WhatsApp"
                >
                  💬 WhatsApp
                </button>
                
                <button 
                  className="btn-completar"
                  onClick={() => completarRecordatorio(recordatorio.id)}
                  title="Marcar como completado"
                >
                  ✅ Completar
                </button>
                
                <button 
                  className="btn-ver-prospecto"
                  onClick={() => {
                    // Aquí podrías navegar al detalle del prospecto
                    console.log('Ver prospecto:', recordatorio.prospecto_id);
                  }}
                  title="Ver detalles del prospecto"
                >
                  👁️ Ver
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Navegación */}
      <div className="tareas-navigation">
        <button 
          className="btn-secondary"
          onClick={() => onNavigate('dashboard')}
        >
          ← Volver al Dashboard
        </button>
      </div>
    </div>
  );
};

export default TareasPendientes;