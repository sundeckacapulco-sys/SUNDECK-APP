import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TareasPendientes = ({ onNavigate, onNavigateToProspecto }) => {
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



  // Formatear fecha compacta
  const formatearFechaCompacta = (fechaStr) => {
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }) + ' – ' + fecha.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fechaStr;
    }
  };

  // Obtener estado de urgencia (vencido, hoy, mañana, futuro)
  const getEstadoUrgencia = (fechaLimite) => {
    try {
      const fecha = new Date(fechaLimite);
      const ahora = new Date();
      const diffMs = fecha.getTime() - ahora.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'vencido';
      if (diffDays === 0) return 'hoy';
      if (diffDays === 1) return 'mañana';
      return 'futuro';
    } catch {
      return 'futuro';
    }
  };

  // Agrupar tareas por urgencia
  const agruparTareasPorUrgencia = (tareas) => {
    const grupos = {
      vencidas: [],
      hoy: [],
      mañana: [],
      futuro: []
    };
    
    tareas.forEach(tarea => {
      const estado = getEstadoUrgencia(tarea.fecha_limite);
      if (estado === 'vencido') grupos.vencidas.push(tarea);
      else if (estado === 'hoy') grupos.hoy.push(tarea);
      else if (estado === 'mañana') grupos.mañana.push(tarea);
      else grupos.futuro.push(tarea);
    });
    
    return grupos;
  };

  // Obtener descripción de acción compacta
  const getAccionDescripcion = (tipo) => {
    const acciones = {
      'cotizacion_24h': 'Enviar Cotización',
      'primer_seguimiento': 'Primer Seguimiento',
      'segundo_seguimiento': 'Segundo Seguimiento',
      'tercer_seguimiento': 'Tercer Seguimiento',
      'recontacto_sin_respuesta': 'Recontacto sin Respuesta',
      'cobro_anticipo': 'Confirmar Anticipo'
    };
    return acciones[tipo] || tipo;
  };

  // Obtener extracto del mensaje (primera línea)
  const getExtractoMensaje = (mensaje) => {
    if (!mensaje) return '';
    const primeraLinea = mensaje.split('\n')[0];
    return primeraLinea.length > 80 ? primeraLinea.substring(0, 77) + '...' : primeraLinea;
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
      {/* Header compacto con badges */}
      <div className="tareas-header-compacto">
        <div className="tareas-title-compacto">
          <h2>📋 Centro de Seguimiento</h2>
          <div className="stats-badges">
            <span className="stat-badge pending">
              ⏳ Pendientes: {estadisticas.pendientes || 0}
            </span>
            <span className="stat-badge overdue">
              🚨 Vencidos: {estadisticas.vencidos || 0}
            </span>
            <span className="stat-badge completed">
              ✅ Completados: {estadisticas.completados || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Filtros compactos */}
      <div className="filtros-compactos">
        <button 
          className={`filtro-btn ${filtroActivo === 'todos' ? 'active' : ''}`}
          onClick={() => aplicarFiltro('todos')}
        >
          Todos ({estadisticas.total || 0})
        </button>
        <button 
          className={`filtro-btn ${filtroActivo === 'pendientes' ? 'active' : ''}`}
          onClick={() => aplicarFiltro('pendientes')}
        >
          Pendientes ({estadisticas.pendientes || 0})
        </button>
        <button 
          className={`filtro-btn ${filtroActivo === 'vencidos' ? 'active' : ''}`}
          onClick={() => aplicarFiltro('vencidos')}
        >
          Vencidos ({estadisticas.vencidos || 0})
        </button>
      </div>

      {/* Lista de recordatorios agrupados */}
      <div className="tareas-lista">
        {recordatorios.length === 0 ? (
          <div className="tareas-empty">
            <div className="empty-icon">🎉</div>
            <h3>¡No hay tareas pendientes!</h3>
            <p>Excelente trabajo manteniendo el seguimiento al día.</p>
          </div>
        ) : (
          (() => {
            const grupos = agruparTareasPorUrgencia(recordatorios);
            return (
              <>
                {grupos.vencidas.length > 0 && (
                  <div className="grupo-urgencia">
                    <h3 className="grupo-titulo vencido">🔴 Vencidas ({grupos.vencidas.length})</h3>
                    {grupos.vencidas.map(recordatorio => (
                      <TareaCompacta 
                        key={recordatorio.id} 
                        recordatorio={recordatorio}
                        onCompletar={completarRecordatorio}
                        onExpandir={setMensajeExpandido}
                        expandido={mensajeExpandido === recordatorio.id}
                        getAccionDescripcion={getAccionDescripcion}
                        formatearFechaCompacta={formatearFechaCompacta}
                        getExtractoMensaje={getExtractoMensaje}
                        onNavigateToProspecto={onNavigateToProspecto}
                      />
                    ))}
                  </div>
                )}

                {grupos.hoy.length > 0 && (
                  <div className="grupo-urgencia">
                    <h3 className="grupo-titulo hoy">🟡 Hoy ({grupos.hoy.length})</h3>
                    {grupos.hoy.map(recordatorio => (
                      <TareaCompacta 
                        key={recordatorio.id} 
                        recordatorio={recordatorio}
                        onCompletar={completarRecordatorio}
                        onExpandir={setMensajeExpandido}
                        expandido={mensajeExpandido === recordatorio.id}
                        getAccionDescripcion={getAccionDescripcion}
                        formatearFechaCompacta={formatearFechaCompacta}
                        getExtractoMensaje={getExtractoMensaje}
                        onNavigateToProspecto={onNavigateToProspecto}
                      />
                    ))}
                  </div>
                )}

                {grupos.mañana.length > 0 && (
                  <div className="grupo-urgencia">
                    <h3 className="grupo-titulo mañana">🟢 Mañana ({grupos.mañana.length})</h3>
                    {grupos.mañana.map(recordatorio => (
                      <TareaCompacta 
                        key={recordatorio.id} 
                        recordatorio={recordatorio}
                        onCompletar={completarRecordatorio}
                        onExpandir={setMensajeExpandido}
                        expandido={mensajeExpandido === recordatorio.id}
                        getAccionDescripcion={getAccionDescripcion}
                        formatearFechaCompacta={formatearFechaCompacta}
                        getExtractoMensaje={getExtractoMensaje}
                        onNavigateToProspecto={onNavigateToProspecto}
                      />
                    ))}
                  </div>
                )}

                {grupos.futuro.length > 0 && (
                  <div className="grupo-urgencia">
                    <h3 className="grupo-titulo futuro">⏳ Próximas ({grupos.futuro.length})</h3>
                    {grupos.futuro.map(recordatorio => (
                      <TareaCompacta 
                        key={recordatorio.id} 
                        recordatorio={recordatorio}
                        onCompletar={completarRecordatorio}
                        onExpandir={setMensajeExpandido}
                        expandido={mensajeExpandido === recordatorio.id}
                        getAccionDescripcion={getAccionDescripcion}
                        formatearFechaCompacta={formatearFechaCompacta}
                        getExtractoMensaje={getExtractoMensaje}
                        onNavigateToProspecto={onNavigateToProspecto}
                      />
                    ))}
                  </div>
                )}
              </>
            );
          })()
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

// Componente para una tarea compacta
const TareaCompacta = ({ 
  recordatorio, 
  onCompletar, 
  onExpandir, 
  expandido,
  getAccionDescripcion,
  formatearFechaCompacta,
  getExtractoMensaje,
  onNavigateToProspecto
}) => {
  // Determinar el tipo de vista según el tipo de recordatorio
  const getTipoVista = (tipo) => {
    const tiposProspecto = ['cotizacion_24h', 'primer_seguimiento', 'segundo_seguimiento', 'tercer_seguimiento', 'recontacto_sin_respuesta'];
    const tiposPedido = ['cobro_anticipo', 'confirmacion_instalacion', 'entrega_final'];
    
    if (tiposProspecto.includes(tipo)) {
      return { label: 'Prospecto', icon: '👤' };
    } else if (tiposPedido.includes(tipo)) {
      return { label: 'Pedido', icon: '📋' };
    }
    return { label: 'Prospecto', icon: '👤' }; // Default
  };

  const tipoVista = getTipoVista(recordatorio.tipo);

  return (
    <div className="tarea-compacta">
      <div className="tarea-info">
        <div className="cliente-principal">
          <strong>Cliente: {recordatorio.prospecto_nombre}</strong> – {recordatorio.prospecto_producto}
        </div>
        <div className="accion-principal">
          <span className="accion-label">Acción:</span> {getAccionDescripcion(recordatorio.tipo)}
        </div>
        <div className="fecha-principal">
          <span className="fecha-label">Fecha límite:</span> {formatearFechaCompacta(recordatorio.fecha_limite)}
        </div>
        {expandido && (
          <div className="mensaje-completo">
            <div className="mensaje-preview">
              <strong>Mensaje WhatsApp:</strong>
              <p>"{recordatorio.mensaje_sugerido}"</p>
            </div>
          </div>
        )}
        {recordatorio.mensaje_sugerido && recordatorio.mensaje_sugerido.length > 80 && (
          <button 
            className="btn-expandir-mensaje"
            onClick={() => onExpandir(expandido ? null : recordatorio.id)}
          >
            {expandido ? '▲ Ocultar mensaje' : '▼ Ver mensaje completo'}
          </button>
        )}
      </div>
      
      <div className="tarea-acciones">
        <button 
          className="btn-accion-small whatsapp"
          onClick={() => {
            // Generar WhatsApp directamente con plantilla
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
              } else {
                alert('❌ Número de teléfono inválido');
              }
            } else {
              alert('❌ No hay número de teléfono válido');
            }
          }}
          title="Enviar mensaje por WhatsApp"
        >
          WhatsApp
        </button>
        <button 
          className="btn-accion-small completar"
          onClick={() => onCompletar(recordatorio.id)}
          title="Marcar como completado"
        >
          ✓
        </button>
        <button 
          className="btn-accion-small ver"
          onClick={() => {
            if (onNavigateToProspecto) {
              onNavigateToProspecto(recordatorio.prospecto_id);
            } else {
              console.log(`Ver ${tipoVista.label.toLowerCase()}:`, recordatorio.prospecto_id);
            }
          }}
          title={`Ir a ${tipoVista.label}`}
        >
          {tipoVista.label}
        </button>
      </div>
    </div>
  );
};

export default TareasPendientes;