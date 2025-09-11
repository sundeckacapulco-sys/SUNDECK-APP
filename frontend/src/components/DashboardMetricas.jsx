import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DashboardMetricas = ({ onNavigate }) => {
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState('semanal');
  const [fechaCustom, setFechaCustom] = useState({
    inicio: '',
    fin: ''
  });

  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Cargar métricas
  const cargarMetricas = async (periodoSeleccionado = periodo) => {
    try {
      setLoading(true);
      let url = `${API}/api/recordatorios/metricas/avanzadas?periodo=${periodoSeleccionado}`;
      
      if (periodoSeleccionado === 'custom' && fechaCustom.inicio && fechaCustom.fin) {
        url += `&fecha_inicio=${fechaCustom.inicio}&fecha_fin=${fechaCustom.fin}`;
      }
      
      const response = await axios.get(url);
      setMetricas(response.data);
    } catch (error) {
      console.error('Error cargando métricas:', error);
      alert('❌ Error cargando métricas avanzadas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMetricas();
  }, []);

  // Función de navegación
  const navegarAlDashboard = () => {
    if (onNavigate && typeof onNavigate === 'function') {
      onNavigate('dashboard');
    } else {
      window.location.href = '/';
    }
  };

  // Componente de tarjeta KPI
  const TarjetaKPI = ({ titulo, valor, unidad, color, icono }) => (
    <div style={{
      background: 'white',
      border: `3px solid ${color}`,
      borderRadius: '16px',
      padding: '1.5rem',
      textAlign: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      minWidth: '180px'
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icono}</div>
      <div style={{ 
        fontSize: '2.5rem', 
        fontWeight: 'bold', 
        color: color,
        marginBottom: '0.5rem'
      }}>
        {valor}{unidad}
      </div>
      <div style={{ 
        fontSize: '0.9rem', 
        color: '#6b7280',
        fontWeight: '600'
      }}>
        {titulo}
      </div>
    </div>
  );

  // Componente de gráfico de pastel simple
  const GraficoPastel = ({ datos, titulo }) => {
    const total = datos.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        border: '2px solid #e5e7eb'
      }}>
        <h3 style={{ 
          margin: '0 0 1.5rem 0', 
          color: '#1f2937',
          fontSize: '1.25rem',
          fontWeight: '600'
        }}>
          {titulo}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {datos.map((item, index) => {
            const porcentaje = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  backgroundColor: item.color,
                  flexShrink: 0
                }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                      {item.name}
                    </span>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: '#6b7280',
                      fontWeight: '600'
                    }}>
                      {item.value} ({porcentaje}%)
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginTop: '0.25rem'
                  }}>
                    <div style={{
                      width: `${porcentaje}%`,
                      height: '100%',
                      backgroundColor: item.color,
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Componente de métricas de conversión
  const MetricasConversion = ({ conversion }) => (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      border: '2px solid #e5e7eb'
    }}>
      <h3 style={{ 
        margin: '0 0 1.5rem 0', 
        color: '#1f2937',
        fontSize: '1.25rem',
        fontWeight: '600'
      }}>
        📈 Conversiones Empresariales
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '500' }}>📋 Cotización Revisada</span>
          <span style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold',
            color: '#3b82f6'
          }}>
            {conversion.cotizacion_revisada}%
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '500' }}>🛒 Pedido Generado</span>
          <span style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold',
            color: '#10b981'
          }}>
            {conversion.pedido_generado}%
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '500' }}>🏠 Instalación Confirmada</span>
          <span style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold',
            color: '#f59e0b'
          }}>
            {conversion.instalacion_confirmada}%
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '1.2rem',
        color: '#6b7280'
      }}>
        📊 Cargando métricas avanzadas...
      </div>
    );
  }

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
            📊 Dashboard de Métricas Avanzadas
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#6b7280',
            fontSize: '1.1rem'
          }}>
            KPIs y análisis de rendimiento del sistema de recordatorios
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

      {/* Selector de período */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '2px solid #e5e7eb'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
          🗓 Período de Análisis
        </h3>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {['diario', 'semanal', 'mensual', 'custom'].map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriodo(p);
                if (p !== 'custom') {
                  cargarMetricas(p);
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                border: `2px solid ${periodo === p ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '8px',
                backgroundColor: periodo === p ? '#3b82f6' : 'white',
                color: periodo === p ? 'white' : '#6b7280',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {p === 'custom' ? 'Personalizado' : p}
            </button>
          ))}
          
          {periodo === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="date"
                value={fechaCustom.inicio}
                onChange={(e) => setFechaCustom({...fechaCustom, inicio: e.target.value})}
                style={{
                  padding: '0.5rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}
              />
              <span>→</span>
              <input
                type="date"
                value={fechaCustom.fin}
                onChange={(e) => setFechaCustom({...fechaCustom, fin: e.target.value})}
                style={{
                  padding: '0.5rem',
                  border: '2px solid #e5e7eb', 
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}
              />
              <button
                onClick={() => cargarMetricas('custom')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      {metricas && (
        <>
          {/* KPIs Principales */}
          <div style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            <TarjetaKPI
              titulo="Total Recordatorios"
              valor={metricas.metricas_generales.total_recordatorios}
              unidad=""
              color="#3b82f6"
              icono="📋"
            />
            <TarjetaKPI
              titulo="Tasa Cumplimiento"
              valor={metricas.metricas_generales.tasa_cumplimiento}
              unidad="%"
              color="#10b981"
              icono="✅"
            />
            <TarjetaKPI
              titulo="Vencidos"
              valor={metricas.metricas_generales.vencidos}
              unidad=""
              color="#ef4444"
              icono="⚠️"
            />
            <TarjetaKPI
              titulo="Escalados"
              valor={metricas.metricas_generales.escalados}
              unidad=""
              color="#8b5cf6"
              icono="🚨"
            />
            <TarjetaKPI
              titulo="Reprogramados"
              valor={metricas.metricas_generales.reprogramados}
              unidad=""
              color="#f59e0b"
              icono="🔄"
            />
          </div>

          {/* Gráficos y Métricas */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            <GraficoPastel
              datos={metricas.graficas.estados_para_pastel}
              titulo="📊 Distribución por Estado"
            />
            
            <MetricasConversion
              conversion={metricas.metricas_conversion}
            />
          </div>

          {/* Métricas por Usuario */}
          {Object.keys(metricas.metricas_usuarios).length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              border: '2px solid #e5e7eb'
            }}>
              <h3 style={{ 
                margin: '0 0 1.5rem 0', 
                color: '#1f2937',
                fontSize: '1.25rem',
                fontWeight: '600'
              }}>
                👥 Rendimiento por Usuario
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1rem'
              }}>
                {Object.entries(metricas.metricas_usuarios).map(([usuario, datos]) => (
                  <div key={usuario} style={{
                    padding: '1rem',
                    border: '2px solid #f3f4f6',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      👤 {usuario}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                      Total: {datos.total} | Completados: {datos.completados}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                      Cumplimiento: <span style={{ fontWeight: '600', color: '#10b981' }}>
                        {datos.tasa_cumplimiento.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardMetricas;