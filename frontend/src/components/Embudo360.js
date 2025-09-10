import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Embudo360 = ({ onNavigate }) => {
  const [embudoData, setEmbudoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    responsable: ''
  });

  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Cargar datos del embudo
  const cargarEmbudoData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params.append(key, filtros[key]);
      });
      
      const response = await axios.get(`${API}/api/embudo-360?${params}`);
      setEmbudoData(response.data);
    } catch (error) {
      console.error('Error cargando datos del embudo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarEmbudoData();
  }, []);

  // Aplicar filtros
  const aplicarFiltros = () => {
    cargarEmbudoData();
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      fecha_inicio: '',
      fecha_fin: '',
      responsable: ''
    });
    setTimeout(() => cargarEmbudoData(), 100);
  };

  // Exportar datos
  const exportarDatos = async (formato = 'csv') => {
    try {
      const params = new URLSearchParams();
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params.append(key, filtros[key]);
      });
      params.append('formato', formato);
      
      const response = await axios.get(`${API}/embudo-360/export?${params}`);
      
      // Crear y descargar archivo
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `embudo-360-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('¡Datos exportados exitosamente!');
    } catch (error) {
      console.error('Error exportando datos:', error);
      alert('Error al exportar los datos');
    }
  };

  // Obtener color de la etapa
  const getEtapaColor = (etapa, index) => {
    const colors = [
      '#3b82f6', // Azul - Prospectos
      '#f59e0b', // Amarillo - Cotizaciones
      '#10b981', // Verde - Pedidos
      '#8b5cf6', // Púrpura - Fabricación
      '#ef4444', // Rojo - Instalación
      '#06b6d4', // Cian - Entrega
      '#84cc16'  // Lima - Postventa
    ];
    return colors[index] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="embudo-loading">
        <div className="loading-spinner-embudo"></div>
        <p>Cargando análisis del embudo...</p>
      </div>
    );
  }

  if (!embudoData) {
    return (
      <div className="embudo-error">
        <h3>Error cargando datos del embudo</h3>
        <button className="btn-primary" onClick={cargarEmbudoData}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="embudo-360">
      {/* Header */}
      <div className="embudo-header">
        <div className="embudo-title">
          <h2>📈 Embudo 360° - Análisis de Conversiones</h2>
          <p>Seguimiento completo del ciclo comercial y operativo Sundeck</p>
        </div>
        
        <div className="embudo-actions">
          <button 
            className="btn-export"
            onClick={() => exportarDatos('csv')}
          >
            📊 Exportar CSV
          </button>
          <button 
            className="btn-export"
            onClick={() => exportarDatos('excel')}
          >
            📋 Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="embudo-filtros">
        <div className="filtros-grid">
          <div className="filtro-item">
            <label htmlFor="fecha_inicio">Fecha Inicio</label>
            <input
              type="date"
              id="fecha_inicio"
              value={filtros.fecha_inicio}
              onChange={(e) => setFiltros({...filtros, fecha_inicio: e.target.value})}
            />
          </div>
          
          <div className="filtro-item">
            <label htmlFor="fecha_fin">Fecha Fin</label>
            <input
              type="date"
              id="fecha_fin"
              value={filtros.fecha_fin}
              onChange={(e) => setFiltros({...filtros, fecha_fin: e.target.value})}
            />
          </div>
          
          <div className="filtro-item">
            <label htmlFor="responsable">Responsable</label>
            <input
              type="text"
              id="responsable"
              value={filtros.responsable}
              onChange={(e) => setFiltros({...filtros, responsable: e.target.value})}
              placeholder="Filtrar por responsable..."
            />
          </div>
          
          <div className="filtros-acciones">
            <button className="btn-primary" onClick={aplicarFiltros}>
              Aplicar
            </button>
            <button className="btn-secondary" onClick={limpiarFiltros}>
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Métricas Generales */}
      <div className="metricas-generales">
        <div className="metricas-grid">
          <div className="metrica-card primary">
            <div className="metrica-icon">🎯</div>
            <div className="metrica-content">
              <div className="metrica-number">{embudoData.metricas.total_prospectos}</div>
              <div className="metrica-label">Total Prospectos</div>
            </div>
          </div>
          
          <div className="metrica-card active">
            <div className="metrica-icon">⚡</div>
            <div className="metrica-content">
              <div className="metrica-number">{embudoData.metricas.prospectos_activos}</div>
              <div className="metrica-label">Prospectos Activos</div>
            </div>
          </div>
          
          <div className="metrica-card conversion">
            <div className="metrica-icon">📊</div>
            <div className="metrica-content">
              <div className="metrica-number">{embudoData.metricas.tasa_conversion_general}%</div>
              <div className="metrica-label">Conversión General</div>
            </div>
          </div>
          
          <div className="metrica-card success">
            <div className="metrica-icon">✅</div>
            <div className="metrica-content">
              <div className="metrica-number">{embudoData.metricas.postventas_abiertas}</div>
              <div className="metrica-label">Servicios Completados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Embudo Visual */}
      <div className="embudo-visual">
        <h3>🔄 Flujo del Embudo</h3>
        <div className="embudo-etapas">
          {embudoData.embudo.etapas.map((etapa, index) => {
            const count = embudoData.embudo.contadores[etapa];
            const tiempo = embudoData.embudo.tiempos_promedio[etapa];
            const width = Math.max((count / embudoData.metricas.total_prospectos) * 100, 5);
            
            return (
              <div key={etapa} className="etapa-embudo" style={{ '--width': `${width}%` }}>
                <div 
                  className="etapa-barra"
                  style={{ 
                    backgroundColor: getEtapaColor(etapa, index),
                    width: `${width}%`
                  }}
                >
                  <div className="etapa-info">
                    <div className="etapa-nombre">{etapa}</div>
                    <div className="etapa-stats">
                      <span className="etapa-count">{count}</span>
                      <span className="etapa-tiempo">{tiempo} días promedio</span>
                    </div>
                  </div>
                </div>
                
                {index < embudoData.embudo.etapas.length - 1 && (
                  <div className="conversion-arrow">
                    <div className="arrow-content">
                      {embudoData.embudo.conversiones[index]?.tasa || 0}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla de Conversiones */}
      <div className="conversiones-tabla">
        <h3>📈 Tasas de Conversión</h3>
        <div className="tabla-conversiones">
          <div className="tabla-header">
            <div className="tabla-col">Desde</div>
            <div className="tabla-col">Hacia</div>
            <div className="tabla-col">Tasa de Conversión</div>
            <div className="tabla-col">Estado</div>
          </div>
          
          {embudoData.embudo.conversiones.map((conversion, index) => (
            <div key={index} className="tabla-row">
              <div className="tabla-col">
                <span className="etapa-badge">{conversion.desde}</span>
              </div>
              <div className="tabla-col">
                <span className="etapa-badge">{conversion.hacia}</span>
              </div>
              <div className="tabla-col">
                <span className={`conversion-rate ${conversion.tasa >= 70 ? 'high' : conversion.tasa >= 40 ? 'medium' : 'low'}`}>
                  {conversion.tasa}%
                </span>
              </div>
              <div className="tabla-col">
                <span className={`conversion-status ${conversion.tasa >= 70 ? 'excellent' : conversion.tasa >= 40 ? 'good' : 'needs-attention'}`}>
                  {conversion.tasa >= 70 ? '🟢 Excelente' : conversion.tasa >= 40 ? '🟡 Buena' : '🔴 Requiere Atención'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navegación */}
      <div className="embudo-navigation">
        <button 
          className="btn-secondary"
          onClick={() => onNavigate('sundeck360')}
        >
          ← Volver al Kanban 360
        </button>
      </div>
    </div>
  );
};

export default Embudo360;