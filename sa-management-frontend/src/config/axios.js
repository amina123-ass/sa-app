// src/config/axios.js - Configuration Axios corrigée
import axios from 'axios';

// Configuration de base
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Intercepteur de requête
axiosInstance.interceptors.request.use(
  (config) => {
    // Ajouter le token d'authentification
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log des requêtes en développement
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Requête API:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        params: config.params,
        data: config.data ? Object.keys(config.data) : undefined
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Erreur configuration requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur de réponse
axiosInstance.interceptors.response.use(
  (response) => {
    // Log des réponses en développement
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Réponse API:', {
        status: response.status,
        url: response.config.url,
        data: response.data ? (typeof response.data === 'object' ? Object.keys(response.data) : 'blob/text') : undefined
      });
    }

    return response;
  },
  (error) => {
    // Log des erreurs
    console.error('❌ Erreur API:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });

    // ⚠️ NOUVEAU: Éviter la redirection automatique pour certaines routes
    const isBackendCompatibilityCheck = error.config?.url?.includes('debug/test-nouveaux-statuts');
    const isOnSecuritySetupPage = window.location.pathname.includes('/security-setup');
    const isOnVerificationPage = window.location.pathname.includes('/email-verification');

    // Gestion spécifique des erreurs d'authentification
    if (error.response?.status === 401) {
      console.warn('🔐 Session expirée');
      
      // Ne pas rediriger si on est sur une page de configuration ou si c'est un test de compatibilité
      if (!isBackendCompatibilityCheck && !isOnSecuritySetupPage && !isOnVerificationPage) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // Éviter la redirection en boucle
        if (!window.location.pathname.includes('/login')) {
          console.warn('🔐 Redirection vers login');
          window.location.href = '/login';
        }
      }
      
      return Promise.reject(new Error('Session expirée, veuillez vous reconnecter'));
    }

    // Gestion des erreurs réseau
    if (!error.response) {
      return Promise.reject(new Error('Erreur de connexion - Vérifiez votre connexion internet'));
    }

    // Gestion des erreurs serveur
    if (error.response.status >= 500) {
      return Promise.reject(new Error('Erreur serveur - Veuillez réessayer plus tard'));
    }

    // Gestion des erreurs de validation (422)
    if (error.response.status === 422) {
      const validationErrors = error.response.data.errors || {};
      const firstError = Object.values(validationErrors)[0];
      const errorMessage = Array.isArray(firstError) ? firstError[0] : 'Données invalides';
      return Promise.reject(new Error(errorMessage));
    }

    // Gestion des erreurs 404
    if (error.response.status === 404) {
      return Promise.reject(new Error('Ressource non trouvée'));
    }

    // Gestion des erreurs 403
    if (error.response.status === 403) {
      return Promise.reject(new Error('Accès interdit - Permissions insuffisantes'));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;