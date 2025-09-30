// hooks/useAuth.js
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import apiClient from '../services/apiClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Vérifier la validité du token en récupérant le profil
      const profile = await authService.getProfile();
      setUser(profile.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Erreur lors de la vérification du statut d\'authentification:', error);
      // Token invalide, nettoyer le stockage local
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      
      if (response.success !== false) {
        // Stocker le token
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Configurer le token par défaut pour les requêtes API
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
        
        setUser(response.user);
        setIsAuthenticated(true);
        
        return response;
      } else {
        throw new Error(response.message || 'Erreur de connexion');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      // Nettoyer le stockage local et l'état
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete apiClient.defaults.headers.common['Authorization'];
      
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      return response;
    } catch (error) {
      console.error('Erreur de mise à jour du profil:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile.data);
      localStorage.setItem('user', JSON.stringify(profile.data));
      return profile.data;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement de l\'utilisateur:', error);
      throw error;
    }
  };

  // Vérifications d'autorisation
  const hasRole = (roleName) => {
    return user?.role?.libelle === roleName;
  };

  const hasAnyRole = (roleNames) => {
    return roleNames.includes(user?.role?.libelle);
  };

  const isAdmin = () => {
    return hasRole('Administrateur Informatique');
  };

  const isUPAS = () => {
    return hasAnyRole([
      'Responsable UPAS',
      'Administrateur UPAS',
      'Coordinateur UPAS',
      'Agent UPAS'
    ]);
  };

  const isReception = () => {
    return hasAnyRole([
      'Réceptionniste',
      'Agent d\'accueil',
      'Responsable Réception'
    ]);
  };

  const canAccess = (requiredRoles = []) => {
    if (requiredRoles.length === 0) return isAuthenticated;
    return isAuthenticated && hasAnyRole(requiredRoles);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    register,
    updateProfile,
    refreshUser,
    hasRole,
    hasAnyRole,
    isAdmin,
    isUPAS,
    isReception,
    canAccess,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;