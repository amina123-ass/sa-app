// src/services/axiosClient.js - Version améliorée
import axios from 'axios';

// Configuration de base
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.45:8000/api';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Créer une instance Axios
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Variable pour suivre les tentatives de refresh token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Intercepteur pour ajouter le token d'authentification
axiosClient.interceptors.request.use(
  (config) => {
    // Récupérer le token depuis le localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ajouter un timestamp pour éviter le cache
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    // Log pour debug (seulement en développement)
    if (IS_DEVELOPMENT) {
      console.log(`🔄 ${config.method?.toUpperCase()} ${config.url}`);
      if (config.data && config.headers['Content-Type'] !== 'multipart/form-data') {
        console.log('📤 Data:', config.data);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur dans la requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses
axiosClient.interceptors.response.use(
  (response) => {
    // Log pour debug (seulement en développement)
    if (IS_DEVELOPMENT) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
      if (response.data && typeof response.data === 'object') {
        console.log('📥 Response:', response.data);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (IS_DEVELOPMENT) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
      if (error.response?.data) {
        console.error('📥 Error Response:', error.response.data);
      }
    }
    
    // Gestion des erreurs d'authentification avec refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si un refresh est déjà en cours, mettre en file d'attente
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Tentative de refresh du token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/refresh-token`, {
            refresh_token: refreshToken
          });
          
          const { access_token } = response.data;
          localStorage.setItem('auth_token', access_token);
          
          processQueue(null, access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          
          return axiosClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Si pas de refresh token ou échec du refresh, logout
    if (error.response?.status === 401) {
      handleLogout();
    }
    
    // Gestion des erreurs de serveur
    if (error.response?.status >= 500) {
      console.error('❌ Erreur serveur:', error.response?.data);
      
      // Notification d'erreur serveur (optionnel)
      if (window.showErrorNotification) {
        window.showErrorNotification('Erreur serveur. Veuillez réessayer plus tard.');
      }
    }
    
    // Gestion des erreurs de réseau
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      console.error('❌ Erreur réseau:', error.message);
      
      if (window.showErrorNotification) {
        window.showErrorNotification('Problème de connexion. Vérifiez votre réseau.');
      }
    }
    
    // Gestion du timeout
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Timeout de la requête');
      
      if (window.showErrorNotification) {
        window.showErrorNotification('La requête a pris trop de temps. Veuillez réessayer.');
      }
    }
    
    return Promise.reject(error);
  }
);

// Fonction pour gérer la déconnexion
const handleLogout = () => {
  // Nettoyer le localStorage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  
  // Rediriger vers la page de connexion
  if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/auth')) {
    window.location.href = '/login?expired=true';
  }
};

// Fonction utilitaire pour gérer les erreurs avec plus de détails
export const handleApiError = (error) => {
  // Erreur de réseau
  if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    return 'Problème de connexion. Vérifiez votre réseau internet.';
  }
  
  // Timeout
  if (error.code === 'ECONNABORTED') {
    return 'La requête a pris trop de temps. Veuillez réessayer.';
  }
  
  // Erreur de validation Laravel
  if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    if (typeof errors === 'object') {
      const firstError = Object.values(errors)[0];
      return Array.isArray(firstError) ? firstError[0] : firstError;
    }
    return errors;
  }
  
  // Message d'erreur du serveur
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Erreurs par code de statut
  switch (error.response?.status) {
    case 400:
      return 'Requête invalide. Vérifiez les données envoyées.';
    case 401:
      return 'Session expirée. Veuillez vous reconnecter.';
    case 403:
      return 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
    case 404:
      return 'Ressource non trouvée.';
    case 422:
      return 'Données invalides. Vérifiez votre saisie.';
    case 429:
      return 'Trop de requêtes. Veuillez patienter avant de réessayer.';
    case 500:
      return 'Erreur serveur. Veuillez réessayer plus tard.';
    case 502:
      return 'Service temporairement indisponible.';
    case 503:
      return 'Service en maintenance. Veuillez réessayer plus tard.';
    default:
      return error.message || 'Une erreur est survenue';
  }
};

// Fonction utilitaire pour télécharger des fichiers (améliorée)
export const downloadFile = (response, defaultFilename = 'download') => {
  try {
    // Vérifier que la réponse contient des données
    if (!response.data) {
      throw new Error('Aucune donnée à télécharger');
    }
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extraire le nom du fichier de l'en-tête Content-Disposition
    let filename = defaultFilename;
    const contentDisposition = response.headers['content-disposition'];
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }
    
    // Ajouter une extension si manquante
    if (!filename.includes('.')) {
      const contentType = response.headers['content-type'];
      if (contentType?.includes('excel') || contentType?.includes('spreadsheet')) {
        filename += '.xlsx';
      } else if (contentType?.includes('csv')) {
        filename += '.csv';
      } else if (contentType?.includes('pdf')) {
        filename += '.pdf';
      }
    }
    
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Nettoyer
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    return filename;
  } catch (error) {
    console.error('❌ Erreur lors du téléchargement:', error);
    throw new Error('Impossible de télécharger le fichier');
  }
};

// Fonction utilitaire pour uploader des fichiers avec progress
export const uploadFileWithProgress = (url, file, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Ajouter les champs additionnels
  Object.keys(options.fields || {}).forEach(key => {
    formData.append(key, options.fields[key]);
  });
  
  return axiosClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: options.timeout || 300000, // 5 minutes par défaut
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      if (options.onProgress) {
        options.onProgress(percentCompleted);
      }
    },
  });
};

// Fonction utilitaire pour les requêtes avec retry automatique
export const requestWithRetry = async (requestFunction, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFunction();
    } catch (error) {
      lastError = error;
      
      // Ne pas retry sur les erreurs 4xx (sauf 408, 429)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        if (![408, 429].includes(error.response.status)) {
          throw error;
        }
      }
      
      // Attendre avant de réessayer
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
};

// Fonction utilitaire pour vérifier la connectivité
export const checkConnectivity = async () => {
  try {
    await axiosClient.get('/test', { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
};

// Export des configurations pour tests
export const config = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  isDevelopment: IS_DEVELOPMENT
};

export default axiosClient;