import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Context para gestión de usuarios y roles
const UserContext = createContext();

// Hook personalizado para usar el contexto
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Provider del contexto de usuario
export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);

  // URL del backend
  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api';

  // Simular usuario actual (Admin por defecto para desarrollo)
  // En producción esto vendría del sistema de autenticación
  useEffect(() => {
    const defaultUser = {
      id: 'default-admin',
      nombre: 'Administrador Sundeck',
      email: 'admin@sundeck.mx',
      telefono: '+52 744 216 8915',
      role: 'admin',
      activo: true,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };
    
    setCurrentUser(defaultUser);
  }, []);

  // Cargar roles y permisos
  useEffect(() => {
    const loadRolesAndPermissions = async () => {
      try {
        const response = await axios.get(`${API}/roles`);
        setRoles(response.data.roles);
        setPermissions(response.data.permissions);
      } catch (error) {
        console.error('Error cargando roles:', error);
      }
    };

    loadRolesAndPermissions();
  }, [API]);

  // Cargar usuarios
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/usuarios`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Crear usuario
  const createUser = async (userData) => {
    try {
      const response = await axios.post(`${API}/usuarios`, userData);
      await loadUsers(); // Recargar lista
      return response.data;
    } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
  };

  // Actualizar usuario
  const updateUser = async (userId, userData) => {
    try {
      const response = await axios.put(`${API}/usuarios/${userId}`, userData);
      await loadUsers(); // Recargar lista
      return response.data;
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  };

  // Verificar si el usuario actual tiene un permiso específico
  const hasPermission = (permission) => {
    if (!currentUser || !permissions[currentUser.role]) return false;
    return permissions[currentUser.role][permission] || false;
  };

  // Verificar si el usuario puede mover a una etapa específica
  const canMoveToStage = (stage) => {
    if (!currentUser || !permissions[currentUser.role]) return false;
    
    // Admin puede mover a cualquier etapa
    if (currentUser.role === 'admin') return true;
    
    // Verificar etapas permitidas para el rol
    const allowedStages = permissions[currentUser.role].allowed_stages || [];
    return allowedStages.includes(stage);
  };

  // Registrar actividad
  const logActivity = async (action, targetType, targetId, description, metadata = {}) => {
    if (!currentUser) return;
    
    try {
      await axios.post(`${API}/activity-logs`, {
        user_id: currentUser.id,
        user_name: currentUser.nombre,
        action,
        target_type: targetType,
        target_id: targetId,
        description,
        metadata
      });
    } catch (error) {
      console.error('Error registrando actividad:', error);
    }
  };

  // Obtener logs de actividad
  const getActivityLogs = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      
      const response = await axios.get(`${API}/activity-logs?${params}`);
      return response.data.logs;
    } catch (error) {
      console.error('Error obteniendo logs:', error);
      return [];
    }
  };

  // Cambiar usuario actual (para testing/desarrollo)
  const switchUser = (user) => {
    setCurrentUser(user);
  };

  // Obtener descripción del rol
  const getRoleDescription = (role) => {
    const descriptions = {
      admin: 'Administrador - Acceso total al sistema',
      ventas: 'Ventas - Gestión de prospectos, cotizaciones y pedidos',
      operaciones: 'Operaciones - Fabricación, instalación y entrega',
      postventa: 'Postventa - Seguimiento y cierre de servicios'
    };
    return descriptions[role] || 'Rol no definido';
  };

  // Obtener color del rol para UI
  const getRoleColor = (role) => {
    const colors = {
      admin: '#dc2626',      // Rojo
      ventas: '#d97706',     // Naranja
      operaciones: '#2563eb', // Azul
      postventa: '#059669'   // Verde
    };
    return colors[role] || '#6b7280';
  };

  const value = {
    // Estados
    currentUser,
    users,
    roles,
    permissions,
    loading,
    
    // Funciones de usuarios
    loadUsers,
    createUser,
    updateUser,
    switchUser,
    
    // Funciones de permisos
    hasPermission,
    canMoveToStage,
    
    // Funciones de actividad
    logActivity,
    getActivityLogs,
    
    // Utilidades
    getRoleDescription,
    getRoleColor
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};