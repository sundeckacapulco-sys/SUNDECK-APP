import React, { useState } from 'react';
import axios from 'axios';

const ReporteSupervision = ({ onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    incluir_reagendamientos: true,
    incluir_comentarios: true,
    formato: 'excel'
  });

  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Función de navegación al dashboard
  const navegarAlDashboard = () => {
    if (onNavigate && typeof onNavigate === 'function') {
      onNavigate('dashboard');
    } else {
      window.location.href = '/';
    }
  };

  // Generar reporte
  const generarReporte = async () => {
    if (!filtros.fecha_inicio || !filtros.fecha_fin) {
      alert('⚠️ Debe seleccionar las fechas de inicio y fin');
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        fecha_inicio: new Date(filtros.fecha_inicio + 'T00:00:00Z').toISOString(),
        fecha_fin: new Date(filtros.fecha_fin + 'T23:59:59Z').toISOString(),
        incluir_reagendamientos: filtros.incluir_reagendamientos,
        incluir_comentarios: filtros.incluir_comentarios,
        formato: filtros.formato
      };

      const response = await axios.post(`${API}/api/reportes/supervision-diario`, requestData);

      // Crear y descargar archivo
      const byteCharacters = atob(response.data.archivo_base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: response.data.content_type });
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.data.nombre_archivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`✅ Reporte generado exitosamente\n📄 ${response.data.nombre_archivo}\n📊 ${response.data.total_registros} registros`);

    } catch (error) {
      console.error('Error generando reporte:', error);
      if (error.response?.status === 404) {
        alert('⚠️ No se encontraron datos para el período seleccionado');
      } else {
        alert('❌ Error generando reporte: ' + (error.response?.data?.detail || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Establecer filtros rápidos
  const aplicarFiltroRapido = (tipo) => {
    const hoy = new Date();
    let fechaInicio = new Date();
    
    switch(tipo) {
      case 'hoy':
        fechaInicio = hoy;
        break;
      case 'ayer':
        fechaInicio.setDate(hoy.getDate() - 1);
        hoy.setDate(hoy.getDate() - 1);
        break;
      case 'semana':
        fechaInicio.setDate(hoy.getDate() - 7);
        break;
      case 'mes':
        fechaInicio.setMonth(hoy.getMonth() - 1);
        break;
      default:
        return;
    }
    
    setFiltros(prev => ({
      ...prev,
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: hoy.toISOString().split('T')[0]
    }));
  };

  return (
    <div style={{ 
      padding: '2rem',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ 
            margin: '0 0 0.5rem 0', 
            color: '#1f2937',
            fontSize: '2rem',
            fontWeight: '700'
          }}>
            📊 Reportes de Supervisión
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#6b7280',
            fontSize: '1.1rem'
          }}>
            Reportes diarios con reagendamientos y comentarios de supervisión
          </p>
        </div>
        
        <button 
          onClick={navegarAlDashboard}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#d97706'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#f59e0b'}
        >
          ← Volver al Dashboard
        </button>
      </div>

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        '@media (max-width: 768px)': {
          gridTemplateColumns: '1fr'
        }
      }}>
        {/* Panel de Configuración */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '2px solid #e5e7eb',
          height: 'fit-content'
        }}>
          <h2 style={{ 
            margin: '0 0 1.5rem 0', 
            color: '#1f2937',
            fontSize: '1.5rem',
            fontWeight: '600'
          }}>
            🎯 Configurar Reporte
          </h2>

          {/* Filtros Rápidos */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              color: '#374151'
            }}>
              ⚡ Filtros Rápidos:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { key: 'hoy', label: 'Hoy' },
                { key: 'ayer', label: 'Ayer' },
                { key: 'semana', label: 'Última Semana' },
                { key: 'mes', label: 'Último Mes' }
              ].map((filtro) => (
                <button
                  key={filtro.key}
                  onClick={() => aplicarFiltroRapido(filtro.key)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.color = '#3b82f6';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.color = '#6b7280';
                  }}
                >
                  {filtro.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rango de Fechas */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              color: '#374151'
            }}>
              📅 Período del Reporte:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="date"
                value={filtros.fecha_inicio}
                onChange={(e) => setFiltros({...filtros, fecha_inicio: e.target.value})}
                style={{
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  flex: 1
                }}
              />
              <span style={{ color: '#6b7280' }}>→</span>
              <input
                type="date"
                value={filtros.fecha_fin}
                onChange={(e) => setFiltros({...filtros, fecha_fin: e.target.value})}
                style={{
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  flex: 1
                }}
              />
            </div>
          </div>

          {/* Formato de Archivo */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              color: '#374151'
            }}>
              📄 Formato de Archivo:
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="formato"
                  value="excel"
                  checked={filtros.formato === 'excel'}
                  onChange={(e) => setFiltros({...filtros, formato: e.target.value})}
                />
                <span>📊 Excel (.xlsx)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="formato"
                  value="csv"
                  checked={filtros.formato === 'csv'}
                  onChange={(e) => setFiltros({...filtros, formato: e.target.value})}
                />
                <span>📝 CSV (.csv)</span>
              </label>
            </div>
          </div>

          {/* Opciones de Contenido */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              color: '#374151'
            }}>
              📋 Incluir en el Reporte:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={filtros.incluir_reagendamientos}
                  onChange={(e) => setFiltros({...filtros, incluir_reagendamientos: e.target.checked})}
                />
                <span>🔄 Reagendamientos de citas</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={filtros.incluir_comentarios}
                  onChange={(e) => setFiltros({...filtros, incluir_comentarios: e.target.checked})}
                />
                <span>💬 Comentarios de supervisión</span>
              </label>
            </div>
          </div>

          {/* Botón de Generar Reporte */}
          <button
            onClick={generarReporte}
            disabled={loading || !filtros.fecha_inicio || !filtros.fecha_fin}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: loading || !filtros.fecha_inicio || !filtros.fecha_fin ? '#9ca3af' : '#10b981',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading || !filtros.fecha_inicio || !filtros.fecha_fin ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (!loading && filtros.fecha_inicio && filtros.fecha_fin) {
                e.target.style.backgroundColor = '#059669';
              }
            }}
            onMouseOut={(e) => {
              if (!loading && filtros.fecha_inicio && filtros.fecha_fin) {
                e.target.style.backgroundColor = '#10b981';
              }
            }}
          >
            {loading ? '⏳ Generando Reporte...' : '📊 Generar Reporte de Supervisión'}
          </button>
        </div>

        {/* Panel de Información */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '2px solid #e5e7eb',
          height: 'fit-content'
        }}>
          <h2 style={{ 
            margin: '0 0 1.5rem 0', 
            color: '#1f2937',
            fontSize: '1.5rem',
            fontWeight: '600'
          }}>
            📋 Información del Reporte
          </h2>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ 
              margin: '0 0 1rem 0',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#374151'
            }}>
              🔄 Campos de Reagendamientos:
            </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '1.5rem',
              fontSize: '0.9rem',
              color: '#6b7280'
            }}>
              <li>Cliente y datos de contacto</li>
              <li>Producto solicitado</li>
              <li>Fecha de cita original</li>
              <li>Fecha de cita reprogramada</li>
              <li>Motivo del cambio</li>
              <li>Usuario que reagendó</li>
              <li>Fecha y hora del reagendamiento</li>
              <li>Comentarios adicionales</li>
            </ul>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ 
              margin: '0 0 1rem 0',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#374151'
            }}>
              💬 Campos de Comentarios:
            </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '1.5rem',
              fontSize: '0.9rem',
              color: '#6b7280'
            }}>
              <li>Cliente y datos de contacto</li>
              <li>Fecha de cita actual</li>
              <li>Tipo de comentario (puntualidad, calidad, general)</li>
              <li>Contenido del comentario</li>
              <li>Usuario que comentó</li>
              <li>Fecha y hora del comentario</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: 'white'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
              💡 Usos del Reporte
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Mesa de Control:</strong> Supervisión de cambios y actividad diaria
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Auditorías:</strong> Evidencia clara de quién cambió qué y cuándo
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Análisis de Puntualidad:</strong> Seguimiento de comportamiento de clientes
              </li>
              <li>
                <strong>Gestión de Recursos:</strong> Optimización de calendarios y personal
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteSupervision;