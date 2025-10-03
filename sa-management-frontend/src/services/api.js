// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.45:8000/api';

// Configuration de base d'Axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Intercepteur de requête pour ajouter le token d'authentification
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse pour gérer les erreurs globalement
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Gestion des erreurs d'authentification
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expirée. Veuillez vous reconnecter.'));
    }

    // Gestion des erreurs de validation (422)
    if (error.response?.status === 422) {
      const validationErrors = error.response.data.errors || {};
      const firstError = Object.values(validationErrors)[0]?.[0] || 'Erreur de validation';
      return Promise.reject(new Error(firstError));
    }

    // Gestion des erreurs serveur
    if (error.response?.status >= 500) {
      return Promise.reject(new Error('Erreur serveur. Veuillez réessayer plus tard.'));
    }

    // Gestion des erreurs réseau
    if (!error.response) {
      return Promise.reject(new Error('Erreur de connexion. Vérifiez votre connexion internet.'));
    }

    // Autres erreurs
    const message = error.response.data?.message || error.response.data?.error || 'Une erreur est survenue';
    return Promise.reject(new Error(message));
  }
);

// Service API principal
export const api = {
  // Méthodes HTTP de base
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data = {}, config = {}) => apiClient.post(url, data, config),
  put: (url, data = {}, config = {}) => apiClient.put(url, data, config),
  patch: (url, data = {}, config = {}) => apiClient.patch(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),

  // Méthodes spécialisées
  upload: (url, formData, onUploadProgress = null) => {
    return apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },

  download: (url, params = {}, filename = null) => {
    return apiClient.get(url, {
      params,
      responseType: 'blob',
    }).then(response => {
      // Créer un lien de téléchargement
      const blob = new Blob([response.data]);
      const url_download = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url_download;
      
      // Essayer de récupérer le nom du fichier depuis les headers
      const contentDisposition = response.headers['content-disposition'];
      if (filename) {
        link.download = filename;
      } else if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        link.download = match ? match[1] : 'download';
      } else {
        link.download = 'download';
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url_download);
      
      return response;
    });
  },
};

// Services spécialisés pour UPAS
export const upasApi = {
  // Dashboard
  getDashboard: () => api.get('/upas/dashboard'),
  getFormData: () => api.get('/upas/form-data'),
  getStatistiques: (type = 'globales', params = {}) => 
    api.get('/upas/statistiques', { params: { type, ...params } }),

  // Campagnes
  getCampagnes: (params = {}) => api.get('/upas/campagnes', { params }),
  getCampagne: (id) => api.get(`/upas/campagnes/${id}`),
  createCampagne: (data) => api.post('/upas/campagnes', data),
  updateCampagne: (id, data) => api.put(`/upas/campagnes/${id}`, data),
  deleteCampagne: (id) => api.delete(`/upas/campagnes/${id}`),
  getCampagneRapport: (id) => api.get(`/upas/campagnes/${id}/rapport`),
  demarrerCampagne: (id) => api.post(`/upas/campagnes/${id}/demarrer`),
  terminerCampagne: (id) => api.post(`/upas/campagnes/${id}/terminer`),
  annulerCampagne: (id) => api.post(`/upas/campagnes/${id}/annuler`),

  // Bénéficiaires
  getBeneficiaires: (params = {}) => api.get('/upas/beneficiaires', { params }),
  getBeneficiaire: (id) => api.get(`/upas/beneficiaires/${id}`),
  createBeneficiaire: (data) => api.post('/upas/beneficiaires', data),
  updateBeneficiaire: (id, data) => api.put(`/upas/beneficiaires/${id}`, data),
  deleteBeneficiaire: (id) => api.delete(`/upas/beneficiaires/${id}`),
  confirmerBeneficiaire: (id, commentaire = '') => 
    api.post(`/upas/beneficiaires/${id}/confirmer`, { commentaire }),
  refuserBeneficiaire: (id, commentaire = '') => 
    api.post(`/upas/beneficiaires/${id}/refuser`, { commentaire }),
  mettreEnAttenteBeneficiaire: (id, commentaire = '') => 
    api.post(`/upas/beneficiaires/${id}/mettre-en-attente`, { commentaire }),
  changerTypeAssistance: (id, typeAssistanceId) => 
    api.post(`/upas/beneficiaires/${id}/changer-type-assistance`, { type_assistance_id: typeAssistanceId }),
  associerCampagne: (id, campagneId) => 
    api.post(`/upas/beneficiaires/${id}/associer-campagne`, { campagne_id: campagneId }),
  retirerCampagne: (id) => 
    api.post(`/upas/beneficiaires/${id}/retirer-campagne`),

  // Recherche avancée
  rechercheAvancee: (criteres) => 
    api.get('/upas/beneficiaires/recherche-avancee', { params: criteres }),

  // Import/Export
  importExcel: (file, campagneId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campagne_id', campagneId);
    return api.upload('/upas/beneficiaires/import', formData);
  },
  exportBeneficiaires: (filters = {}) => 
    api.download('/upas/beneficiaires/export', filters, 'beneficiaires.xlsx'),
  downloadTemplateExcel: () => 
    api.download('/upas/beneficiaires/template-excel', {}, 'template_beneficiaires.xlsx'),

  // Types d'assistance
  getTypesAssistance: (params = {}) => api.get('/upas/types-assistance', { params }),
  getTypeAssistance: (id) => api.get(`/upas/types-assistance/${id}`),
  createTypeAssistance: (data) => api.post('/upas/types-assistance', data),
  updateTypeAssistance: (id, data) => api.put(`/upas/types-assistance/${id}`, data),
  deleteTypeAssistance: (id) => api.delete(`/upas/types-assistance/${id}`),
  activerTypeAssistance: (id) => api.post(`/upas/types-assistance/${id}/activer`),
  desactiverTypeAssistance: (id) => api.post(`/upas/types-assistance/${id}/desactiver`),

  // Assistances médicales
  getAssistances: (params = {}) => api.get('/upas/assistances', { params }),
  getAssistance: (id) => api.get(`/upas/assistances/${id}`),
  createAssistance: (data) => api.post('/upas/assistances', data),
  updateAssistance: (id, data) => api.put(`/upas/assistances/${id}`, data),
  deleteAssistance: (id) => api.delete(`/upas/assistances/${id}`),
  approuverAssistance: (id, commentaire = '') => 
    api.post(`/upas/assistances/${id}/approuver`, { commentaire }),
  terminerAssistance: (id, commentaire = '') => 
    api.post(`/upas/assistances/${id}/terminer`, { commentaire }),
  annulerAssistance: (id, commentaire = '') => 
    api.post(`/upas/assistances/${id}/annuler`, { commentaire }),

  // Stock
  getStock: (params = {}) => api.get('/upas/stock', { params }),
  synchroniserStock: (typeAssistanceId = null, force = false) => {
    const data = { force };
    if (typeAssistanceId) {
      data.type_assistance_id = typeAssistanceId;
    }
    return api.post('/upas/stock/synchroniser', data);
  },

  // Actions en masse
  actionsMasseBeneficiaires: (action, beneficiairesIds, params = {}) => {
    const payload = {
      action,
      beneficiaires_ids: beneficiairesIds,
      ...params
    };
    return api.post('/upas/actions-masse/beneficiaires', payload);
  },
  confirmerBeneficiaires: (beneficiairesIds, commentaire = '') =>
    api.post('/upas/actions-masse/confirmer-beneficiaires', {
      beneficiaires_ids: beneficiairesIds,
      commentaire
    }),
  refuserBeneficiaires: (beneficiairesIds, commentaire = '') =>
    api.post('/upas/actions-masse/refuser-beneficiaires', {
      beneficiaires_ids: beneficiairesIds,
      commentaire
    }),
  changerTypeAssistanceMasse: (beneficiairesIds, typeAssistanceId) =>
    api.post('/upas/actions-masse/changer-type-assistance', {
      beneficiaires_ids: beneficiairesIds,
      type_assistance_id: typeAssistanceId
    }),
  associerCampagneMasse: (beneficiairesIds, campagneId) =>
    api.post('/upas/actions-masse/associer-campagne', {
      beneficiaires_ids: beneficiairesIds,
      campagne_id: campagneId
    }),

  // Statistiques détaillées
  getStatistiquesGlobales: (dateDebut, dateFin) =>
    api.get('/upas/statistiques/globales', {
      params: { date_debut: dateDebut, date_fin: dateFin }
    }),
  getStatistiquesPeriode: (dateDebut, dateFin) =>
    api.get('/upas/statistiques/periode', {
      params: { date_debut: dateDebut, date_fin: dateFin }
    }),
  getStatistiquesCampagne: (campagneId) =>
    api.get(`/upas/statistiques/campagne/${campagneId}`),
  getStatistiquesTypeAssistance: (typeAssistanceId) =>
    api.get(`/upas/statistiques/type-assistance/${typeAssistanceId}`),

  // Utilitaires
  verifierApiExterne: () => api.get('/upas/utilitaires/verifier-api-externe'),
  nettoyerDonnees: () => api.post('/upas/utilitaires/nettoyer-donnees'),
  recalculerStatistiques: () => api.post('/upas/utilitaires/recalculer-statistiques'),
};

// Services pour les autres modules (si nécessaire)
export const authApi = {
  login: (credentials) => api.post('/login', credentials),
  logout: () => api.post('/logout'),
  register: (userData) => api.post('/register', userData),
  forgotPassword: (email) => api.post('/forgot-password', { email }),
  resetPassword: (data) => api.post('/reset-password', data),
  setupSecurity: (data) => api.post('/setup-security', data),
  verifySecurityAnswers: (data) => api.post('/verify-security-answers', data),
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  activateUser: (id, roleId) => api.put(`/admin/users/${id}/activate`, { role_id: roleId }),
  deactivateUser: (id) => api.put(`/admin/users/${id}/deactivate`),
  resetUserPassword: (id) => api.post(`/admin/users/${id}/reset-password`),
  
  getRoles: () => api.get('/admin/roles'),
  createRole: (roleData) => api.post('/admin/roles', roleData),
  updateRole: (id, roleData) => api.put(`/admin/roles/${id}`, roleData),
  deleteRole: (id) => api.delete(`/admin/roles/${id}`),
};

export const receptionApi = {
  getDashboard: () => api.get('/reception/dashboard'),
  getCampagnes: () => api.get('/reception/campagnes'),
  getCampagne: (id) => api.get(`/reception/campagnes/${id}`),
  createCampagne: (data) => api.post('/reception/campagnes', data),
  
  getParticipants: (params = {}) => api.get('/reception/participants', { params }),
  getParticipant: (id) => api.get(`/reception/participants/${id}`),
  createParticipant: (data) => api.post('/reception/participants', data),
  updateStatutParticipant: (id, statut) => 
    api.put(`/reception/participants/${id}/statut`, { statut }),
  
  importExcel: (file, campagneId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campagne_id', campagneId);
    return api.upload('/reception/import-excel', formData);
  },
  
  exportCSV: (params = {}) => 
    api.download('/reception/export-csv', params, 'participants.csv'),
  
  genererRecu: (participantId) => 
    api.download(`/reception/participants/${participantId}/recu-pdf`, {}, 'recu.pdf'),
  
  getParticipantsEligibles: () => api.get('/reception/participants-eligibles'),
  convertirEnBeneficiaire: (participantIds) => 
    api.post('/reception/convertir-beneficiaires', { participant_ids: participantIds }),
  
  getStats: (campagneId) => api.get(`/reception/stats/${campagneId}`),
};

// Export par défaut de l'API principale
export default api;