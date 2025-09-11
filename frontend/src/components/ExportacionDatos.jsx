import React, { useState } from 'react';
import axios from 'axios';

const ExportacionDatos = ({ onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    formato: 'excel',
    fecha_inicio: '',
    fecha_fin: '',
    estado_filtro: '',
    usuario_filtro: ''
  });

  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Función de navegación
  const navegarAlDashboard = () => {
    if (onNavigate && typeof onNavigate === 'function') {
      onNavigate('dashboard');
    } else {
      window.location.href = '/';
    }
  };

  // Exportar datos
  const exportarDatos = async () => {
    try {
      setLoading(true);
      
      // Preparar datos para la exportación
      const datosExportacion = {
        formato: filtros.formato,
        fecha_inicio: filtros.fecha_inicio || null,
        fecha_fin: filtros.fecha_fin || null,
        estado_filtro: filtros.estado_filtro || null,
        usuario_filtro: filtros.usuario_filtro || null
      };

      // Convertir fechas a formato ISO si están presentes
      if (datosExportacion.fecha_inicio) {
        datosExportacion.fecha_inicio = new Date(datosExportacion.fecha_inicio + 'T00:00:00Z').toISOString();
      }
      if (datosExportacion.fecha_fin) {
        datosExportacion.fecha_fin = new Date(datosExportacion.fecha_fin + 'T23:59:59Z').toISOString();
      }

      const response = await axios.post(`${API}/api/recordatorios/exportar`, datosExportacion);
      
      // Crear y descargar el archivo
      const archivo = response.data;
      const byteCharacters = atob(archivo.archivo_base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: archivo.content_type });
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = archivo.nombre_archivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert(`✅ Archivo exportado exitosamente\n📄 ${archivo.nombre_archivo}\n📊 ${archivo.total_registros} registros`);
      
    } catch (error) {
      console.error('Error exportando datos:', error);
      if (error.response?.status === 404) {
        alert('⚠️ No se encontraron recordatorios para exportar con los filtros seleccionados');
      } else {
        alert('❌ Error exportando datos: ' + (error.response?.data?.detail || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      formato: 'excel',
      fecha_inicio: '',
      fecha_fin: '',
      estado_filtro: '',
      usuario_filtro: ''
    });
  };

  // Establecer filtros rápidos
  const aplicarFiltroRapido = (tipo) => {
    const hoy = new Date();
    let fechaInicio = new Date();
    
    switch(tipo) {
      case 'hoy':
        fechaInicio = hoy;
        break;
      case 'semana':
        fechaInicio.setDate(hoy.getDate() - 7);
        break;
      case 'mes':
        fechaInicio.setMonth(hoy.getMonth() - 1);
        break;
      case 'trimestre':
        fechaInicio.setMonth(hoy.getMonth() - 3);
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
            📋 Mesa de Control - Exportación
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#6b7280',
            fontSize: '1.1rem'
          }}>
            Exportar recordatorios y seguimientos para reportes administrativos
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
        {/* Panel de Filtros */}
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
            🎯 Configurar Exportación
          </h2>

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
                { key: 'semana', label: 'Última Semana' },
                { key: 'mes', label: 'Último Mes' },
                { key: 'trimestre', label: 'Último Trimestre' }
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
              📅 Rango de Fechas (opcional):
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

          {/* Filtro por Estado */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              color: '#374151'
            }}>
              📊 Filtrar por Estado (opcional):
            </label>
            <select
              value={filtros.estado_filtro}
              onChange={(e) => setFiltros({...filtros, estado_filtro: e.target.value})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>

          {/* Filtro por Usuario */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              color: '#374151'
            }}>
              👤 Filtrar por Responsable (opcional):
            </label>
            <input
              type="text"
              placeholder="Nombre del vendedor o responsable"
              value={filtros.usuario_filtro}
              onChange={(e) => setFiltros({...filtros, usuario_filtro: e.target.value})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={limpiarFiltros}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: 'white',
                color: '#6b7280',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.borderColor = '#d1d5db';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.borderColor = '#e5e7eb';
              }}
            >
              🗑 Limpiar
            </button>
            
            <button
              onClick={exportarDatos}
              disabled={loading}
              style={{
                flex: 2,
                padding: '0.75rem',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: loading ? '#9ca3af' : '#10b981',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!loading) e.target.style.backgroundColor = '#059669';
              }}
              onMouseOut={(e) => {
                if (!loading) e.target.style.backgroundColor = '#10b981';
              }}
            >
              {loading ? '⏳ Exportando...' : '📥 Exportar Datos'}
            </button>
          </div>
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
            📋 Campos Incluidos en la Exportación
          </h2>

          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {[
              'ID Recordatorio',
              'Cliente',
              'Teléfono',
              'Producto',
              'Acción',
              'Fecha Límite',
              'Estado',
              'Responsable',
              'Etapa Relacionada',
              'Fecha Creación',
              'Días Vencido',
              'Nivel Escalación',
              'Supervisor Notificado',
              'Motivo Reprogramación',
              'Notas'
            ].map((campo, index) => (
              <div key={index} style={{
                padding: '0.75rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                ✓ {campo}
              </div>
            ))}
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: 'white'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
              💡 Información Importante
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Los archivos Excel incluyen formato profesional y ajuste automático de columnas
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Los archivos CSV utilizan codificación UTF-8 para compatibilidad con Excel
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Los datos se enriquecen automáticamente con información del prospecto
              </li>
              <li>
                Ideal para reportes administrativos, auditorías y análisis de Mesa de Control
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportacionDatos;