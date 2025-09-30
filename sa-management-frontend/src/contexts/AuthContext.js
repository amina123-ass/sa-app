import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      try {
        const savedUser = authService.getCurrentUser();
        const token = localStorage.getItem('auth_token');
        
        if (savedUser && token) {
          setUser(savedUser);
        }
      } catch (error) {
        console.error('Erreur d\'initialisation auth:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  const register = async (userData) => {
    return await authService.register(userData);
  };

  const setupSecurity = async (securityData) => {
    return await authService.setupSecurity(securityData);
  };

  const value = {
    user,
    login,
    logout,
    register,
    setupSecurity,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role?.libelle === 'Administrateur Informatique'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};