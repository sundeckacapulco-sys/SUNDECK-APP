import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GestionEscalaciones = ({ onNavigate }) => {
  const [escalaciones, setEscalaciones] = useState(null);
  const [loading, setLoading] = useState(false);

  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Cargar datos de escalaciones
  const cargarEscalaciones = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/recordatorios/vencidos/gestionar`);
      setEscalaciones(response.data);
    } catch (error) {
      console.error('Error cargando escalaciones:', error);
      alert('❌ Error cargando sistema de escalaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEscalaciones();
  }, []);

  // Función de navegación
  const navegarAlDashboard = () => {
    if (onNavigate && typeof onNavigate === 'function') {
      onNavigate('dashboard');
    } else {
      window.location.href = '/';
    }
  };

  // Componente de tarjeta de estadísticas
  const TarjetaEstadistica = ({ titulo, valor, color, icono, descripcion }) => (
    <div style={{
      background: 'white',
      border: `3px solid ${color}`,
      borderRadius: '16px',
      padding: '1.5rem',
      textAlign: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      minWidth: '200px'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{icono}</div>
      <div style={{ 
        fontSize: '2.5rem', 
        fontWeight: 'bold', 
        color: color,
        marginBottom: '0.5rem'
      }}>
        {valor}
      </div>
      <div style={{ 
        fontSize: '1rem', 
        color: '#1f2937',
        fontWeight: '600',
        marginBottom: '0.25rem'
      }}>
        {titulo}
      </div>
      <div style={{ 
        fontSize: '0.8rem', 
        color: '#6b7280'
      }}>
        {descripcion}
      </div>
    </div>
  );

  // Componente de distribución por nivel
  const DistribucionNiveles = ({ porNivel }) => (
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
        🎯 Distribución por Nivel de Prioridad
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Nivel Normal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #22c55e',
          backgroundColor: '#f0fdf4'
        }}>
          <div style={{ 
            fontSize: '2rem', 
            marginRight: '1rem',
            width: '50px',
            textAlign: 'center'
          }}>
            🟢
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#166534' }}>
              Normal (1-2 días vencido)
            </div>
            <div style={{ color: '#16a34a', fontSize: '0.9rem' }}>
              Recordatorio urgente al vendedor
            </div>
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#22c55e',
            minWidth: '60px',
            textAlign: 'center'
          }}>
            {porNivel.normal || 0}
          </div>
        </div>

        {/* Nivel Urgente */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #f59e0b',
          backgroundColor: '#fffbef'
        }}>
          <div style={{ 
            fontSize: '2rem', 
            marginRight: '1rem',
            width: '50px',
            textAlign: 'center'
          }}>
            🟡
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#92400e' }}>
              Urgente (3-6 días vencido)
            </div>
            <div style={{ color: '#d97706', fontSize: '0.9rem' }}>
              Escalado a Coordinadora Abigail
            </div>
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#f59e0b',
            minWidth: '60px',
            textAlign: 'center'
          }}>
            {porNivel.urgente || 0}
          </div>
        </div>

        {/* Nivel Crítico */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #ef4444',
          backgroundColor: '#fef2f2'
        }}>
          <div style={{ 
            fontSize: '2rem', 
            marginRight: '1rem',
            width: '50px',
            textAlign: 'center'
          }}>
            🔴
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#991b1b' }}>
              Crítico (7+ días vencido)
            </div>
            <div style={{ color: '#dc2626', fontSize: '0.9rem' }}>
              Escalado a Admin/CEO
            </div>
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#ef4444',
            minWidth: '60px',
            textAlign: 'center'
          }}>
            {porNivel.critico || 0}
          </div>
        </div>
      </div>
    </div>
  );

  // Componente de acciones de escalación
  const AccionesEscalacion = ({ acciones }) => (
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
        ⚡ Acciones Ejecutadas
      </h3>
      
      {acciones && acciones.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {acciones.map((accion, index) => {
            const getAccionInfo = (accion) => {
              switch(accion) {
                case 'recordatorio_urgente':
                  return { texto: 'Recordatorio Urgente', icono: '📢', color: '#22c55e' };
                case 'escalado_coordinadora':
                  return { texto: 'Escalado a Coordinadora', icono: '👩‍💼', color: '#f59e0b' };
                case 'escalado_admin_ceo':
                  return { texto: 'Escalado a Admin/CEO', icono: '👔', color: '#ef4444' };
                default:
                  return { texto: accion, icono: '⚡', color: '#6b7280' };
              }
            };
            
            const info = getAccionInfo(accion);
            
            return (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                borderRadius: '8px',
                border: `2px solid ${info.color}30`,
                backgroundColor: `${info.color}10`
              }}>
                <div style={{ fontSize: '1.5rem', marginRight: '1rem' }}>
                  {info.icono}
                </div>
                <div style={{ 
                  fontWeight: '600', 
                  color: info.color,
                  fontSize: '1rem'
                }}>
                  {info.texto}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          color: '#6b7280',
          fontSize: '1rem',
          padding: '2rem'
        }}>
          ✅ No hay acciones de escalación recientes
        </div>
      )}
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
        🚨 Cargando sistema de escalaciones...
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
            🚨 Gestión de Escalaciones
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#6b7280',
            fontSize: '1.1rem'
          }}>
            Sistema automático de escalación por prioridades
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={cargarEscalaciones}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            🔄 Actualizar
          </button>
          
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
      </div>

      {escalaciones && (
        <>
          {/* Estadísticas Principales */}
          <div style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            <TarjetaEstadistica
              titulo="Recordatorios Vencidos"
              valor={escalaciones.recordatorios_vencidos}
              color="#ef4444" 
              icono="⏰"
              descripcion="Total encontrados"
            />
            
            <TarjetaEstadistica
              titulo="Escalaciones Creadas"
              valor={escalaciones.escalaciones_creadas}
              color="#8b5cf6"
              icono="🚨"
              descripcion="Nuevas escalaciones"
            />
            
            <TarjetaEstadistica
              titulo="Notificaciones Enviadas"
              valor={escalaciones.notificaciones_enviadas}
              color="#10b981"
              icono="📧"
              descripcion="Supervisores notificados"
            />
          </div>

          {/* Distribución por Niveles */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            <DistribucionNiveles porNivel={escalaciones.por_nivel} />
            <AccionesEscalacion acciones={escalaciones.acciones} />
          </div>

          {/* Información del Sistema */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '2rem',
            color: 'white'
          }}>
            <h3 style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              💡 Cómo Funciona el Sistema de Escalación
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1.5rem'
            }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                  🟢 Nivel Normal (1-2 días)
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  Recordatorio urgente enviado al vendedor responsable
                </div>
              </div>
              
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                  🟡 Nivel Urgente (3-6 días)
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  Escalación automática a Coordinadora Abigail
                </div>
              </div>
              
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                  🔴 Nivel Crítico (7+ días)
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  Escalación directa a Admin/CEO para intervención
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GestionEscalaciones;