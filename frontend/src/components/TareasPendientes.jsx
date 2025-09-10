import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TareasPendientes = ({ onNavigate, onNavigateToProspecto }) => {
  const [recordatorios, setRecordatorios] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [loading, setLoading] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [mensajeExpandido, setMensajeExpandido] = useState(null);
  const [gruposColapsados, setGruposColapsados] = useState({});
  const [modalReprogramar, setModalReprogramar] = useState(null);
  const [fechaReprogramacion, setFechaReprogramacion] = useState('');
  const [motivoReprogramacion, setMotivoReprogramacion] = useState('');
  const [notasReprogramacion, setNotasReprogramacion] = useState('');

  // Función de navegación aislada
  const navegarAlDashboard = () => {
    console.log('=== NAVEGACIÓN AL DASHBOARD ===');
    console.log('onNavigate disponible:', !!onNavigate);
    console.log('Tipo de onNavigate:', typeof onNavigate);
    
    if (onNavigate && typeof onNavigate === 'function') {
      console.log('Llamando onNavigate("dashboard")');
      onNavigate('dashboard');
    } else {
      console.log('Navegación directa via URL');
      window.location.href = '/';
    }
  };

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

  // Reprogramar recordatorio
  const reprogramarRecordatorio = async (recordatorioId, nuevaFecha, motivo, notas = '') => {
    try {
      const response = await axios.post(`${API}/api/recordatorios/${recordatorioId}/reprogramar`, {
        nueva_fecha: nuevaFecha,
        motivo: motivo,
        notas: notas
      });
      
      // Recargar recordatorios
      cargarRecordatorios(filtroActivo === 'todos' ? null : filtroActivo);
      
      // Cerrar modal y limpiar estado
      setModalReprogramar(null);
      setFechaReprogramacion('');
      setMotivoReprogramacion('');
      setNotasReprogramacion('');
      
      if (response.data.fecha_ajustada) {
        alert('✅ Recordatorio reprogramado exitosamente.\n📅 Fecha ajustada a día hábil.');
      } else {
        alert('✅ Recordatorio reprogramado exitosamente');
      }
    } catch (error) {
      console.error('Error reprogramando recordatorio:', error);
      alert('❌ Error al reprogramar recordatorio: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Abrir modal de reprogramación
  const abrirModalReprogramar = (recordatorio) => {
    // Calcular fecha mínima (hoy + 1 día hábil)
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    
    // Formatear para input datetime-local
    const fechaMinima = mañana.toISOString().slice(0, 16);
    
    setModalReprogramar(recordatorio);
    setFechaReprogramacion(fechaMinima);
    setMotivoReprogramacion('cliente_no_disponible');
    setNotasReprogramacion('');
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

  // Toggle colapso de grupos
  const toggleGrupo = (nombreGrupo) => {
    setGruposColapsados(prev => ({
      ...prev,
      [nombreGrupo]: !prev[nombreGrupo]
    }));
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
              ⏳ Pendientes: <span className="badge-number">{estadisticas.pendientes || 0}</span>
            </span>
            <span className="stat-badge overdue">
              🚨 Vencidos: <span className="badge-number">{estadisticas.vencidos || 0}</span>
            </span>
            <span className="stat-badge completed">
              ✅ Completados: <span className="badge-number">{estadisticas.completados || 0}</span>
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
                  <div className="segmento-contenedor vencidas" style={{
                    background: 'white',
                    border: '3px solid #ef4444',
                    borderRadius: '16px',
                    marginBottom: '3rem',
                    overflow: 'hidden',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)'
                  }}>
                    <h3 
                      className={`segmento-titulo vencidas ${gruposColapsados.vencidas ? 'collapsed' : ''}`}
                      onClick={() => toggleGrupo('vencidas')}
                    >
                      <span>🔴 Vencidas ({grupos.vencidas.length})</span>
                      <span className="toggle-icon">▼</span>
                    </h3>
                    <div className={`segmento-contenido ${gruposColapsados.vencidas ? 'collapsed' : ''}`}>
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
                  </div>
                )}

                {grupos.hoy.length > 0 && (
                  <div className="segmento-contenedor hoy" style={{
                    background: 'white',
                    border: '3px solid #f59e0b',
                    borderRadius: '16px',
                    marginBottom: '3rem',
                    overflow: 'hidden',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)'
                  }}>
                    <h3 
                      className={`segmento-titulo hoy ${gruposColapsados.hoy ? 'collapsed' : ''}`}
                      onClick={() => toggleGrupo('hoy')}
                    >
                      <span>🟡 Hoy ({grupos.hoy.length})</span>
                      <span className="toggle-icon">▼</span>
                    </h3>
                    <div className={`segmento-contenido ${gruposColapsados.hoy ? 'collapsed' : ''}`}>
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
                  </div>
                )}

                {grupos.mañana.length > 0 && (
                  <div className="segmento-contenedor manana" style={{
                    background: 'white',
                    border: '3px solid #10b981',
                    borderRadius: '16px',
                    marginBottom: '3rem',
                    overflow: 'hidden',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)'
                  }}>
                    <h3 
                      className={`segmento-titulo manana ${gruposColapsados.mañana ? 'collapsed' : ''}`}
                      onClick={() => toggleGrupo('mañana')}
                    >
                      <span>🟢 Mañana ({grupos.mañana.length})</span>
                      <span className="toggle-icon">▼</span>
                    </h3>
                    <div className={`segmento-contenido ${gruposColapsados.mañana ? 'collapsed' : ''}`}>
                      {grupos.mañana.map(recordatorio => (
                        <TareaCompacta 
                          key={recordatorio.id} 
                          recordatorio={recordatorio}
                          onCompletar={completarRecordatorio}
                          onReprogramar={abrirModalReprogramar}
                          onExpandir={setMensajeExpandido}
                          expandido={mensajeExpandido === recordatorio.id}
                          getAccionDescripcion={getAccionDescripcion}
                          formatearFechaCompacta={formatearFechaCompacta}
                          getExtractoMensaje={getExtractoMensaje}
                          onNavigateToProspecto={onNavigateToProspecto}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {grupos.futuro.length > 0 && (
                  <div className="segmento-contenedor futuras" style={{
                    background: 'white',
                    border: '3px solid #3b82f6',
                    borderRadius: '16px',
                    marginBottom: '3rem',
                    overflow: 'hidden',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)'
                  }}>
                    <h3 
                      className={`segmento-titulo futuras ${gruposColapsados.futuro ? 'collapsed' : ''}`}
                      onClick={() => toggleGrupo('futuro')}
                    >
                      <span>📅 Futuras ({grupos.futuro.length})</span>
                      <span className="toggle-icon">▼</span>
                    </h3>
                    <div className={`segmento-contenido ${gruposColapsados.futuro ? 'collapsed' : ''}`}>
                      {grupos.futuro.map(recordatorio => (
                        <TareaCompacta 
                          key={recordatorio.id} 
                          recordatorio={recordatorio}
                          onCompletar={completarRecordatorio}
                          onReprogramar={abrirModalReprogramar}
                          onExpandir={setMensajeExpandido}
                          expandido={mensajeExpandido === recordatorio.id}
                          getAccionDescripcion={getAccionDescripcion}
                          formatearFechaCompacta={formatearFechaCompacta}
                          getExtractoMensaje={getExtractoMensaje}
                          onNavigateToProspecto={onNavigateToProspecto}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()
        )}
      </div>

      {/* Navegación */}
      <div className="tareas-navigation" style={{ marginTop: '3rem', textAlign: 'center' }}>
        <button 
          className="btn-secondary"
          style={{
            background: 'white',
            color: '#0F172A',
            border: '2px solid #0F172A',
            padding: '0.75rem 2rem',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navegarAlDashboard();
          }}
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

  // Obtener estado de urgencia local
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

  // Determinar clase de estado para la tarjeta
  const getEstadoClase = (fechaLimite) => {
    const estado = getEstadoUrgencia(fechaLimite);
    switch(estado) {
      case 'vencido': return 'vencida';
      case 'hoy': return 'hoy';
      case 'mañana': return 'manana';
      default: return 'futura';
    }
  };

  return (
    <div 
      className={`tarea-individual ${getEstadoClase(recordatorio.fecha_limite)}`}
      style={{
        background: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1rem'
      }}
    >
      <div className="tarea-info-estructurada">
        <div className="linea-cliente">
          👤 <strong>{recordatorio.prospecto_nombre}</strong> – {recordatorio.prospecto_producto}
        </div>
        <div className="linea-accion">
          📌 {getAccionDescripcion(recordatorio.tipo)}
        </div>
        <div className="linea-fecha">
          🗓 Fecha límite: <span className="fecha-destacada">{formatearFechaCompacta(recordatorio.fecha_limite)}</span>
        </div>
      </div>
      
      <div className="botones-fila">
        <button 
          className="btn-compacto whatsapp"
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
          💬 WhatsApp
        </button>
        <button 
          className="btn-compacto completar"
          onClick={() => onCompletar(recordatorio.id)}
          title="Marcar como completado"
        >
          ✔ Completar
        </button>
        <button 
          className="btn-compacto ver"
          onClick={() => {
            if (onNavigateToProspecto) {
              onNavigateToProspecto(recordatorio.prospecto_id);
            } else {
              console.log(`Ver ${tipoVista.label.toLowerCase()}:`, recordatorio.prospecto_id);
            }
          }}
          title={`Ir a ${tipoVista.label}`}
        >
          📂 Ver {tipoVista.label}
        </button>
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
  );
};

export default TareasPendientes;