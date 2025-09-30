// src/services/enhancedAxiosClient.js
import axios from 'axios';
import axiosRetry from 'axios-retry';

// Configuration de base
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Créer une instance Axios avec configuration optimisée
const enhancedAxiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 secondes
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  // Optimisations réseau
  maxRedirects: 3,
  validateStatus: (status) => status >= 200 && status < 500, // Accepter 4xx pour gestion custom
});

// Map pour suivre les requêtes en cours (pour annulation)
const activeRequests = new Map();

// Configuration d'axios-retry
axiosRetry(enhancedAxiosClient, {
  retries: 3,
  retryDelay: (retryCount, error) => {
    // Backoff exponentiel avec jitter
    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
    const jitter = Math.random() * 1000;
    return delay + jitter;
  },
  retryCondition: (error) => {
    // Retry conditions
    return (
      // Erreurs réseau
      axiosRetry.isNetworkError(error) ||
      // Timeout
      error.code === 'ECONNABORTED' ||
      // Erreurs serveur 5xx
      (error.response && error.response.status >= 500) ||
      // Rate limiting
      (error.response && error.response.status === 429)
    );
  },
  shouldResetTimeout: true,
  onRetry: (retryCount, error, requestConfig) => {
    if (IS_DEVELOPMENT) {
      console.log(`🔄 Retry ${retryCount} for ${requestConfig.url}:`, error.message);
    }
  },
});

// Fonction pour générer une clé unique de requête
const generateRequestKey = (config) => {
  return `${config.method}_${config.url}_${JSON.stringify(config.params || {})}_${JSON.stringify(config.data || {})}`;
};

// Intercepteur pour ajouter le token et gérer les annulations
enhancedAxiosClient.interceptors.request.use(
  (config) => {
    // Ajouter le token d'authentification
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Créer un AbortController pour cette requête
    const abortController = new AbortController();
    config.signal = abortController.signal;
    
    // Stocker la référence pour pouvoir l'annuler
    const requestKey = generateRequestKey(config);
    activeRequests.set(requestKey, abortController);
    
    // Nettoyer à la fin de la requête
    config.metadata = { requestKey, startTime: Date.now() };
    
    // Ajouter timestamp pour éviter le cache
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    if (IS_DEVELOPMENT) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur dans la requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses
enhancedAxiosClient.interceptors.response.use(
  (response) => {
    // Nettoyer la requête de la map
    const requestKey = response.config.metadata?.requestKey;
    if (requestKey) {
      activeRequests.delete(requestKey);
    }
    
    if (IS_DEVELOPMENT) {
      const duration = Date.now() - (response.config.metadata?.startTime || 0);
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`);
    }
    
    return response;
  },
  async (error) => {
    // Nettoyer la requête de la map
    const requestKey = error.config?.metadata?.requestKey;
    if (requestKey) {
      activeRequests.delete(requestKey);
    }
    
    const originalRequest = error.config;
    
    if (IS_DEVELOPMENT) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
    }
    
    // Gestion spéciale pour les erreurs d'authentification
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Tentative de refresh du token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/refresh-token`, {
            refresh_token: refreshToken
          });
          
          const { access_token } = response.data;
          localStorage.setItem('auth_token', access_token);
          
          // Retry la requête originale avec le nouveau token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return enhancedAxiosClient(originalRequest);
        }
      } catch (refreshError) {
        // Rediriger vers login
        handleLogout();
        return Promise.reject(refreshError);
      }
    }
    
    // Gestion des autres erreurs
    handleApiError(error);
    
    return Promise.reject(error);
  }
);

// Fonction pour annuler toutes les requêtes en cours
export const cancelAllRequests = (reason = 'Navigation') => {
  if (IS_DEVELOPMENT) {
    console.log(`🛑 Annulation de ${activeRequests.size} requêtes (${reason})`);
  }
  
  activeRequests.forEach((abortController, requestKey) => {
    try {
      abortController.abort(reason);
    } catch (error) {
      // Ignorer les erreurs d'annulation
    }
  });
  
  activeRequests.clear();
};

// Fonction pour annuler des requêtes spécifiques
export const cancelRequestsByPattern = (pattern) => {
  const toCancel = [];
  
  activeRequests.forEach((abortController, requestKey) => {
    if (requestKey.includes(pattern)) {
      toCancel.push({ abortController, requestKey });
    }
  });
  
  toCancel.forEach(({ abortController, requestKey }) => {
    try {
      abortController.abort(`Pattern: ${pattern}`);
      activeRequests.delete(requestKey);
    } catch (error) {
      // Ignorer les erreurs d'annulation
    }
  });
  
  if (IS_DEVELOPMENT && toCancel.length > 0) {
    console.log(`🛑 Annulé ${toCancel.length} requêtes pour pattern: ${pattern}`);
  }
};

// Fonction pour gérer la déconnexion
const handleLogout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?expired=true';
  }
};

// Fonction améliorée pour gérer les erreurs avec plus de détails
const handleApiError = (error) => {
  // Ignorer les erreurs d'annulation
  if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
    return;
  }
  
  // Log détaillé pour debug
  if (IS_DEVELOPMENT) {
    console.group(`❌ API Error: ${error.config?.url}`);
    console.log('Status:', error.response?.status);
    console.log('Message:', error.message);
    console.log('Data:', error.response?.data);
    console.groupEnd();
  }
  
  // Notifications pour l'utilisateur (optionnel)
  if (window.showErrorNotification) {
    const userMessage = getUserFriendlyErrorMessage(error);
    window.showErrorNotification(userMessage);
  }
};

// Messages d'erreur conviviaux
const getUserFriendlyErrorMessage = (error) => {
  if (error.name === 'AbortError') {
    return null; // Pas de message pour les annulations
  }
  
  if (error.code === 'ECONNABORTED') {
    return 'La requête a pris trop de temps. Veuillez réessayer.';
  }
  
  if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    return 'Problème de connexion. Vérifiez votre réseau.';
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  switch (error.response?.status) {
    case 400:
      return 'Requête invalide. Vérifiez les données envoyées.';
    case 401:
      return 'Session expirée. Reconnexion en cours...';
    case 403:
      return 'Accès refusé.';
    case 404:
      return 'Ressource non trouvée.';
    case 422:
      return 'Données invalides.';
    case 429:
      return 'Trop de requêtes. Veuillez patienter.';
    case 500:
      return 'Erreur serveur. Veuillez réessayer.';
    default:
      return 'Une erreur est survenue. Veuillez réessayer.';
  }
};

// Fonctions utilitaires pour les requêtes groupées
export const createBatchRequest = (requests) => {
  return Promise.allSettled(
    requests.map(request => {
      if (typeof request === 'function') {
        return request();
      }
      return enhancedAxiosClient(request);
    })
  );
};

// Wrapper pour requêtes avec retry personnalisé
export const requestWithCustomRetry = async (requestFn, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    shouldRetry = (error) => error.response?.status >= 500
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      const delayTime = delay * Math.pow(backoff, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delayTime));
      
      if (IS_DEVELOPMENT) {
        console.log(`🔄 Retry ${attempt}/${maxRetries} after ${delayTime}ms`);
      }
    }
  }
  
  throw lastError;
};

// Hook pour React Navigation (à utiliser avec React Router)
export const useRequestCancellation = () => {
  React.useEffect(() => {
    return () => {
      // Annuler toutes les requêtes en cours lors du démontage
      cancelAllRequests('Component unmount');
    };
  }, []);
};

// Fonction pour monitorer les performances
export const getRequestStats = () => {
  return {
    activeRequests: activeRequests.size,
    activeRequestKeys: Array.from(activeRequests.keys()),
  };
};

export default enhancedAxiosClient;