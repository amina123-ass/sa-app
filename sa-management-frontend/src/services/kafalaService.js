// services/kafalaService.js
import axios from 'axios';

// Configuration de base pour les appels API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const KAFALA_ENDPOINT = `${API_BASE_URL}/upas/kafalas`;

// Instance Axios avec configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 secondes
});

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse pour gérer les erreurs globalement
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Service de gestion des Kafalas
 */
class KafalaService {
  
  /**
   * Récupérer la liste des kafalas avec filtres et pagination
   * @param {Object} params - Paramètres de filtrage et pagination
   * @returns {Promise<Object>} Liste paginée des kafalas
   */
  async getKafalas(params = {}) {
    try {
      console.log('🔍 Envoi des paramètres:', params);
      const response = await apiClient.get('/upas/kafalas', { params });
      return response.data;
    } catch (error) {
      this.handleError('Erreur lors de la récupération des kafalas', error);
      throw error;
    }
  }

  /**
   * Récupérer une kafala spécifique par ID
   */
  async getKafala(id) {
    try {
      const response = await apiClient.get(`/upas/kafalas/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(`Erreur lors de la récupération de la kafala ${id}`, error);
      throw error;
    }
  }

  /**
   * Créer une nouvelle kafala
   */
  async createKafala(kafalaData) {
    try {
      const response = await apiClient.post('/upas/kafalas', kafalaData);
      return response.data;
    } catch (error) {
      this.handleError('Erreur lors de la création de la kafala', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une kafala existante
   */
  async updateKafala(id, kafalaData) {
    try {
      const response = await apiClient.put(`/upas/kafalas/${id}`, kafalaData);
      return response.data;
    } catch (error) {
      this.handleError(`Erreur lors de la mise à jour de la kafala ${id}`, error);
      throw error;
    }
  }

  /**
   * Supprimer une kafala (suppression logique)
   */
  async deleteKafala(id) {
    try {
      const response = await apiClient.delete(`/upas/kafalas/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(`Erreur lors de la suppression de la kafala ${id}`, error);
      throw error;
    }
  }

  /**
   * Upload d'un fichier PDF pour une kafala
   */
  async uploadPdf(id, file, onProgress = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }

      const response = await apiClient.post(`/upas/kafalas/${id}/pdf`, formData, config);
      return response.data;
    } catch (error) {
      this.handleError(`Erreur lors de l'upload du PDF pour la kafala ${id}`, error);
      throw error;
    }
  }

  /**
   * Vérifier l'existence d'un PDF pour une kafala
   */
  async checkPdfExists(id) {
    try {
      const response = await apiClient.get(`/upas/kafalas/${id}/pdf/exists`);
      return response.data;
    } catch (error) {
      this.handleError(`Erreur lors de la vérification du PDF pour la kafala ${id}`, error);
      throw error;
    }
  }

  /**
   * Obtenir l'URL pour visualiser le PDF
   */
  getPdfViewUrl(id) {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    return `${KAFALA_ENDPOINT}/${id}/pdf?token=${token}`;
  }

  /**
   * Obtenir l'URL pour télécharger le PDF
   */
  getPdfDownloadUrl(id) {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    return `${KAFALA_ENDPOINT}/${id}/pdf/download?token=${token}`;
  }

  /**
   * Télécharger le PDF d'une kafala
   */
  async downloadPdf(id, filename = null) {
    try {
      const response = await apiClient.get(`/upas/kafalas/${id}/pdf/download`, {
        responseType: 'blob',
      });

      // Créer un lien de téléchargement temporaire
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `kafala_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      this.handleError(`Erreur lors du téléchargement du PDF pour la kafala ${id}`, error);
      throw error;
    }
  }

  /**
   * Supprimer le PDF d'une kafala
   */
  async deletePdf(id) {
    try {
      const response = await apiClient.delete(`/upas/kafalas/${id}/pdf`);
      return response.data;
    } catch (error) {
      this.handleError(`Erreur lors de la suppression du PDF pour la kafala ${id}`, error);
      throw error;
    }
  }

  /**
   * Recherche globale dans les kafalas
   */
  async searchKafalas(query, limit = 20) {
    try {
      const response = await apiClient.get('/upas/kafalas/search', {
        params: { query, limit },
      });
      return response.data;
    } catch (error) {
      this.handleError('Erreur lors de la recherche de kafalas', error);
      throw error;
    }
  }

  /**
   * Construire les paramètres de filtre pour la liste des kafalas
   * 🔧 VERSION CORRIGÉE - gestion correcte des paramètres
   */
  buildFilterParams(filters) {
    const params = {};

    // Paramètres texte
    if (filters.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }

    if (filters.sexe_enfant && filters.sexe_enfant.trim()) {
      params.sexe_enfant = filters.sexe_enfant;
    }

    // Paramètres de date
    if (filters.date_mariage_from && filters.date_mariage_from.trim()) {
      params.date_mariage_from = filters.date_mariage_from;
    }

    if (filters.date_mariage_to && filters.date_mariage_to.trim()) {
      params.date_mariage_to = filters.date_mariage_to;
    }

    // 🎯 CORRECTION PRINCIPALE: Gestion du paramètre avec_pdf
    if (filters.avec_pdf !== undefined && filters.avec_pdf !== null && filters.avec_pdf !== '') {
      // Convertir en booléen si c'est une string
      if (typeof filters.avec_pdf === 'string') {
        if (filters.avec_pdf === 'true') {
          params.avec_pdf = true;
        } else if (filters.avec_pdf === 'false') {
          params.avec_pdf = false;
        }
        // Si c'est une string vide ou autre, on ne l'envoie pas
      } else if (typeof filters.avec_pdf === 'boolean') {
        params.avec_pdf = filters.avec_pdf;
      }
    }

    // Paramètres de tri
    if (filters.sort_by && filters.sort_by.trim()) {
      params.sort_by = filters.sort_by;
    } else {
      params.sort_by = 'created_at'; // Valeur par défaut
    }

    if (filters.sort_dir && filters.sort_dir.trim()) {
      params.sort_dir = filters.sort_dir;
    } else {
      params.sort_dir = 'desc'; // Valeur par défaut
    }

    // Paramètres de pagination
    if (filters.page && filters.page > 0) {
      params.page = filters.page;
    }

    if (filters.per_page && filters.per_page > 0) {
      params.per_page = filters.per_page;
    }

    console.log('🔧 Paramètres construits:', params);
    return params;
  }

  /**
   * Récupérer les statistiques des kafalas
   */
  async getStatistics() {
    try {
      const response = await apiClient.get('/upas/kafalas/statistics');
      return response.data;
    } catch (error) {
      this.handleError('Erreur lors de la récupération des statistiques', error);
      throw error;
    }
  }

  /**
   * Valider les données d'une kafala avant sauvegarde
   */
  async validateKafalaData(kafalaData) {
    try {
      const response = await apiClient.post('/upas/kafalas/validate', kafalaData);
      return response.data;
    } catch (error) {
      this.handleError('Erreur lors de la validation des données', error);
      throw error;
    }
  }

  /**
   * Validation côté client des données kafala
   */
  validateClientSide(data) {
    const errors = {};
    const warnings = [];

    // Validation des champs obligatoires
    const requiredFields = [
      'nom_pere', 'prenom_pere', 'nom_mere', 'prenom_mere',
      'nom_enfant', 'prenom_enfant', 'sexe_enfant', 'telephone', 'email', 'adresse'
    ];

    requiredFields.forEach(field => {
      if (!data[field] || data[field].toString().trim() === '') {
        errors[field] = 'Ce champ est obligatoire';
      }
    });

    // Validation de l'email
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Format d\'email invalide';
    }

    // Validation du téléphone
    if (data.telephone && !/^[0-9+\-\s\(\)]{10,15}$/.test(data.telephone)) {
      errors.telephone = 'Format de téléphone invalide';
    }

    // Validation du sexe
    if (data.sexe_enfant && !['M', 'F'].includes(data.sexe_enfant)) {
      errors.sexe_enfant = 'Le sexe doit être M ou F';
    }

    // Validation des dates
    if (data.date_mariage && new Date(data.date_mariage) > new Date()) {
      warnings.push('La date de mariage est dans le futur');
    }

    if (data.date_naissance_enfant && new Date(data.date_naissance_enfant) > new Date()) {
      errors.date_naissance_enfant = 'La date de naissance ne peut pas être dans le futur';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  /**
   * Formater les données de kafala pour l'affichage
   */
  formatKafalaForDisplay(kafala) {
    if (!kafala) return null;

    return {
      ...kafala,
      nom_complet_pere: `${kafala.prenom_pere || ''} ${kafala.nom_pere || ''}`.trim(),
      nom_complet_mere: `${kafala.prenom_mere || ''} ${kafala.nom_mere || ''}`.trim(),
      nom_complet_enfant: `${kafala.prenom_enfant || ''} ${kafala.nom_enfant || ''}`.trim(),
      sexe_enfant_libelle: kafala.sexe_enfant === 'M' ? 'Masculin' : 'Féminin',
      date_mariage_formatted: kafala.date_mariage ? 
        new Date(kafala.date_mariage).toLocaleDateString('fr-FR') : null,
      date_naissance_formatted: kafala.date_naissance_enfant ? 
        new Date(kafala.date_naissance_enfant).toLocaleDateString('fr-FR') : null,
      age_enfant: kafala.date_naissance_enfant ? 
        this.calculateAge(kafala.date_naissance_enfant) : null,
    };
  }

  /**
   * Calculer l'âge à partir d'une date de naissance
   */
  calculateAge(dateNaissance) {
    if (!dateNaissance) return null;
    
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  }

  /**
   * Générer un numéro de référence pour une nouvelle kafala
   */
  generateReference() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `KAF-${year}-${timestamp}`;
  }

  /**
   * Gestion centralisée des erreurs
   */
  handleError(message, error) {
    console.error(message, error);
    
    // Log détaillé pour debug
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
      
      if (error.response.data?.message) {
        console.error('Détail de l\'erreur API:', error.response.data.message);
      }
      
      if (error.response.data?.errors) {
        console.error('Erreurs de validation:', error.response.data.errors);
      }
    } else if (error.request) {
      console.error('Pas de réponse reçue:', error.request);
    } else {
      console.error('Erreur de configuration:', error.message);
    }
  }

  /**
   * Tester la connexion à l'API des kafalas
   */
  async testConnection() {
    try {
      const response = await apiClient.get('/upas/kafalas/test-connection');
      return response.data;
    } catch (error) {
      this.handleError('Erreur lors du test de connexion', error);
      throw error;
    }
  }
  /**
   * Créer une nouvelle kafala avec fichier PDF
   * @param {FormData} formData - Données du formulaire incluant le fichier
   * @param {Function} onProgress - Callback pour le suivi de progression
   * @returns {Promise<Object>}
   */
  async createKafalaWithFile(formData, onProgress = null) {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }

      const response = await apiClient.post('/upas/kafalas', formData, config);
      return response.data;
    } catch (error) {
      this.handleError('Erreur lors de la création de la kafala avec fichier', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une kafala avec fichier PDF
   * @param {number} id - ID de la kafala
   * @param {FormData} formData - Données du formulaire incluant le fichier
   * @param {Function} onProgress - Callback pour le suivi de progression
   * @returns {Promise<Object>}
   */
  async updateKafalaWithFile(id, formData, onProgress = null) {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }

      // Utiliser POST avec _method=PUT pour Laravel si nécessaire
      formData.append('_method', 'PUT');
      
      const response = await apiClient.post(`/upas/kafalas/${id}`, formData, config);
      return response.data;
    } catch (error) {
      this.handleError(`Erreur lors de la mise à jour de la kafala ${id} avec fichier`, error);
      throw error;
    }
  }
  /**
   * Méthode de debug pour tester les paramètres
   */
  debugParams(filters) {
    const params = this.buildFilterParams(filters);
    console.log('🐛 Debug des paramètres:');
    console.log('Filtres d\'entrée:', filters);
    console.log('Paramètres construits:', params);
    console.log('URL qui sera appelée:', `${API_BASE_URL}/upas/kafalas?${new URLSearchParams(params).toString()}`);
    return params;
  }
}

// Export d'une instance unique du service
const kafalaService = new KafalaService();
export default kafalaService;

// Export de la classe pour les tests ou instanciations multiples
export { KafalaService };