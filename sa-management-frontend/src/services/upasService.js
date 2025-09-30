// src/services/upasService.js - Version corrigée avec gestion d'erreurs améliorée
import { upasApi } from './api';

class UpasService {
  constructor() {
    this.authCallbacks = new Set();
    this.isOnline = navigator.onLine;
    this.setupNetworkListeners();
  }

  // Écouter les changements de connexion réseau
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Connexion réseau rétablie');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.warn('Connexion réseau perdue');
    });
  }

  // Méthode pour s'abonner aux événements d'authentification
  onAuthError(callback) {
    this.authCallbacks.add(callback);
    return () => this.authCallbacks.delete(callback);
  }

  // Notifier les composants d'une erreur d'authentification
  notifyAuthError() {
    this.authCallbacks.forEach(callback => callback());
  }

  // Wrapper générique pour les appels API avec retry et fallback
  async makeApiCall(apiFunction, fallbackData = null, retries = 2) {
    if (!this.isOnline) {
      throw new Error('Pas de connexion internet. Veuillez vérifier votre connexion.');
    }

    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await apiFunction();
        return response.data;
      } catch (error) {
        lastError = error;
        console.warn(`Tentative ${attempt + 1} échouée:`, error.message);
        
        // Si c'est une erreur de réseau et qu'on a des tentatives restantes
        if (attempt < retries && this.isNetworkError(error)) {
          await this.delay(1000 * (attempt + 1)); // Délai progressif
          continue;
        }
        
        // Si c'est une erreur d'authentification, notifier
        if (error.message.includes('Session expirée')) {
          this.notifyAuthError();
        }
        
        break;
      }
    }

    // Si on a des données de fallback, les utiliser
    if (fallbackData !== null) {
      console.warn('Utilisation des données de fallback pour:', apiFunction.name);
      return fallbackData;
    }

    throw this.handleError(lastError);
  }

  // Vérifier si c'est une erreur réseau
  isNetworkError(error) {
    return error.message.includes('Erreur de connexion') || 
           error.message.includes('réseau') ||
           error.message.includes('timeout') ||
           error.code === 'ECONNABORTED' ||
           error.code === 'ERR_NETWORK';
  }

  // Délai pour les tentatives
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== DASHBOARD =====
  async getDashboard() {
    const fallbackData = {
      stats: {
        total_beneficiaires: 0,
        beneficiaires_confirmes: 0,
        beneficiaires_en_attente: 0,
        beneficiaires_refuses: 0,
        campagnes_actives: 0,
        campagnes_terminees: 0
      },
      recent_activities: [],
      alerts: []
    };

    return this.makeApiCall(
      () => upasApi.getDashboard(),
      fallbackData
    );
  }

  // ===== FORM DATA =====
  async getFormData() {
    const fallbackData = {
      campagnes_actives: [],
      types_assistance: [
        {
          id: 1,
          libelle: 'Assistance médicale',
          description: 'Aide médicale générale'
        },
        {
          id: 2,
          libelle: 'Assistance alimentaire',
          description: 'Distribution de produits alimentaires'
        }
      ],
      statuts_beneficiaires: [
        { value: 'en_attente', label: 'En attente' },
        { value: 'oui', label: 'Confirmé' },
        { value: 'non', label: 'Refusé' },
        { value: 'refuse', label: 'Refusé définitivement' }
      ],
      statuts_campagnes: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'en_cours', label: 'En cours' },
        { value: 'terminee', label: 'Terminée' },
        { value: 'annulee', label: 'Annulée' }
      ],
      sexes: [
        { value: 'M', label: 'Masculin' },
        { value: 'F', label: 'Féminin' }
      ],
      alertes_stock: []
    };

    return this.makeApiCall(
      () => upasApi.getFormData(),
      fallbackData
    );
  }

  // ===== BÉNÉFICIAIRES =====
  async getBeneficiaires(params = {}) {
    const fallbackData = {
      data: [],
      total: 0,
      current_page: 1,
      last_page: 1,
      per_page: 15,
      from: 0,
      to: 0
    };

    return this.makeApiCall(
      () => upasApi.getBeneficiaires(params),
      fallbackData
    );
  }

  async getBeneficiaire(id) {
    return this.makeApiCall(
      () => upasApi.getBeneficiaire(id)
    );
  }

  async createBeneficiaire(data) {
    return this.makeApiCall(
      () => upasApi.createBeneficiaire(data)
    );
  }

  async updateBeneficiaire(id, data) {
    return this.makeApiCall(
      () => upasApi.updateBeneficiaire(id, data)
    );
  }

  async deleteBeneficiaire(id) {
    return this.makeApiCall(
      () => upasApi.deleteBeneficiaire(id)
    );
  }

  // Actions spéciales sur bénéficiaires
  async confirmerBeneficiaire(id, commentaire = null) {
    return this.makeApiCall(
      () => upasApi.confirmerBeneficiaire(id, commentaire)
    );
  }

  async refuserBeneficiaire(id, commentaire = null) {
    return this.makeApiCall(
      () => upasApi.refuserBeneficiaire(id, commentaire)
    );
  }

  // ===== CAMPAGNES =====
  async getCampagnes(params = {}) {
    const fallbackData = {
      data: [],
      total: 0,
      current_page: 1,
      last_page: 1,
      per_page: 15,
      from: 0,
      to: 0
    };

    return this.makeApiCall(
      () => upasApi.getCampagnes(params),
      fallbackData
    );
  }

  async getCampagne(id) {
    return this.makeApiCall(
      () => upasApi.getCampagne(id)
    );
  }

  async createCampagne(data) {
    return this.makeApiCall(
      () => upasApi.createCampagne(data)
    );
  }

  async updateCampagne(id, data) {
    return this.makeApiCall(
      () => upasApi.updateCampagne(id, data)
    );
  }

  async deleteCampagne(id) {
    return this.makeApiCall(
      () => upasApi.deleteCampagne(id)
    );
  }

  async getCampagneRapport(id) {
    return this.makeApiCall(
      () => upasApi.getCampagneRapport(id)
    );
  }

  // ===== TYPES D'ASSISTANCE =====
  async getTypesAssistance(params = {}) {
    const fallbackData = {
      data: [
        {
          id: 1,
          libelle: 'Assistance médicale',
          description: 'Aide médicale générale',
          actif: true
        },
        {
          id: 2,
          libelle: 'Assistance alimentaire', 
          description: 'Distribution alimentaire',
          actif: true
        }
      ],
      total: 2
    };

    return this.makeApiCall(
      () => upasApi.getTypesAssistance(params),
      fallbackData
    );
  }

  async getTypeAssistance(id) {
    return this.makeApiCall(
      () => upasApi.getTypeAssistance(id)
    );
  }

  async createTypeAssistance(data) {
    return this.makeApiCall(
      () => upasApi.createTypeAssistance(data)
    );
  }

  async updateTypeAssistance(id, data) {
    return this.makeApiCall(
      () => upasApi.updateTypeAssistance(id, data)
    );
  }

  async deleteTypeAssistance(id) {
    return this.makeApiCall(
      () => upasApi.deleteTypeAssistance(id)
    );
  }

  // ===== IMPORT/EXPORT =====
  async importExcel(file, campagneId) {
    return this.makeApiCall(
      () => upasApi.importExcel(file, campagneId)
    );
  }

  async exportBeneficiaires(filters = {}) {
    return this.makeApiCall(
      () => upasApi.exportBeneficiaires(filters)
    );
  }

  // ===== ACTIONS EN MASSE =====
  async actionsMasseBeneficiaires(action, beneficiairesIds, params = {}) {
    return this.makeApiCall(
      () => upasApi.actionsMasseBeneficiaires(action, beneficiairesIds, params)
    );
  }

  // ===== STATISTIQUES =====
  async getStatistiques(params = {}) {
    const fallbackData = {
      total_beneficiaires: 0,
      beneficiaires_confirmes: 0,
      beneficiaires_en_attente: 0,
      beneficiaires_refuses: 0,
      campagnes_actives: 0,
      evolution: []
    };

    return this.makeApiCall(
      () => upasApi.getStatistiques('globales', params),
      fallbackData
    );
  }

  // ===== GESTION DES ERREURS =====
  handleError(error) {
    if (error.response) {
      // Erreur de réponse du serveur
      const { status, data } = error.response;
      
      if (status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        this.notifyAuthError();
        return new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      if (status === 403) {
        return new Error('Accès refusé. Vous n\'avez pas les permissions nécessaires.');
      }
      
      if (status === 422) {
        const errors = data.errors || data.details || {};
        const errorMessages = Object.values(errors).flat();
        return new Error(errorMessages.join(', ') || 'Données invalides');
      }
      
      if (status === 404) {
        return new Error('Ressource non trouvée');
      }
      
      if (status >= 500) {
        return new Error('Erreur serveur. Veuillez réessayer plus tard.');
      }
      
      return new Error(data.message || data.error || 'Erreur inconnue');
    } else if (error.request) {
      return new Error('Erreur de connexion. Vérifiez que le serveur backend est démarré et accessible.');
    } else {
      return new Error(error.message || 'Erreur inattendue');
    }
  }

  // ===== UTILITAIRES =====
  downloadFile(response, filename) {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  generateFilename(prefix, extension = 'xlsx') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `${prefix}_${timestamp}.${extension}`;
  }

  // ===== FORMATAGE DES DONNÉES =====
  formatBeneficiaire(beneficiaire) {
    return {
      ...beneficiaire,
      nom_complet: `${beneficiaire.nom} ${beneficiaire.prenom}`,
      age: beneficiaire.date_naissance ? 
        new Date().getFullYear() - new Date(beneficiaire.date_naissance).getFullYear() : null,
      statut_libelle: this.getStatutLibelle(beneficiaire.statut),
      type_assistance_libelle: beneficiaire.type_assistance?.libelle || '',
      campagne_nom: beneficiaire.campagne?.nom || 'Hors campagne'
    };
  }

  formatCampagne(campagne) {
    return {
      ...campagne,
      duree: campagne.date_debut && campagne.date_fin ? 
        Math.ceil((new Date(campagne.date_fin) - new Date(campagne.date_debut)) / (1000 * 60 * 60 * 24)) : 0,
      statut_libelle: this.getStatutCampagneLibelle(campagne.statut),
      type_assistance_libelle: campagne.type_assistance?.libelle || '',
      taux_participation: campagne.stats?.taux_participation || 0
    };
  }

  getStatutLibelle(statut) {
    const statuts = {
      'en_attente': 'En attente',
      'oui': 'Confirmé',
      'non': 'Refusé',
      'refuse': 'Refusé définitivement'
    };
    return statuts[statut] || statut;
  }

  getStatutCampagneLibelle(statut) {
    const statuts = {
      'active': 'Active',
      'inactive': 'Inactive',
      'en_cours': 'En cours',
      'terminee': 'Terminée',
      'annulee': 'Annulée'
    };
    return statuts[statut] || statut;
  }

  getStatutColor(statut) {
    const colors = {
      'en_attente': '#f39c12',
      'oui': '#2ecc71',
      'non': '#95a5a6',
      'refuse': '#e74c3c'
    };
    return colors[statut] || '#95a5a6';
  }

  getStatutCampagneColor(statut) {
    const colors = {
      'active': '#2ecc71',
      'inactive': '#95a5a6',
      'en_cours': '#3498db',
      'terminee': '#34495e',
      'annulee': '#e74c3c'
    };
    return colors[statut] || '#95a5a6';
  }

  // ===== VALIDATION DES DONNÉES =====
  validateBeneficiaire(data) {
    const errors = {};

    if (!data.nom?.trim()) {
      errors.nom = 'Le nom est obligatoire';
    }

    if (!data.prenom?.trim()) {
      errors.prenom = 'Le prénom est obligatoire';
    }

    if (!data.telephone?.trim()) {
      errors.telephone = 'Le téléphone est obligatoire';
    } else if (!/^[0-9+\-\s\(\)]{10,20}$/.test(data.telephone)) {
      errors.telephone = 'Format de téléphone invalide';
    }

    if (!data.type_assistance_id) {
      errors.type_assistance_id = 'Le type d\'assistance est obligatoire';
    }

    if (!data.sexe) {
      errors.sexe = 'Le sexe est obligatoire';
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Format d\'email invalide';
    }

    if (data.date_naissance && new Date(data.date_naissance) > new Date()) {
      errors.date_naissance = 'La date de naissance ne peut pas être dans le futur';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  }

  validateCampagne(data) {
    const errors = {};

    if (!data.nom?.trim()) {
      errors.nom = 'Le nom de la campagne est obligatoire';
    }

    if (!data.type_assistance_id) {
      errors.type_assistance_id = 'Le type d\'assistance est obligatoire';
    }

    if (!data.date_debut) {
      errors.date_debut = 'La date de début est obligatoire';
    }

    if (!data.date_fin) {
      errors.date_fin = 'La date de fin est obligatoire';
    }

    if (data.date_debut && data.date_fin && new Date(data.date_fin) <= new Date(data.date_debut)) {
      errors.date_fin = 'La date de fin doit être après la date de début';
    }

    if (!data.statut) {
      errors.statut = 'Le statut est obligatoire';
    }

    if (data.budget && (isNaN(data.budget) || data.budget < 0)) {
      errors.budget = 'Le budget doit être un nombre positif';
    }

    if (data.nombre_participants_prevu && (isNaN(data.nombre_participants_prevu) || data.nombre_participants_prevu < 1)) {
      errors.nombre_participants_prevu = 'Le nombre de participants doit être un nombre positif';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  }

  validateTypeAssistance(data) {
    const errors = {};

    if (!data.libelle?.trim()) {
      errors.libelle = 'Le libellé est obligatoire';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  }

  // ===== TEST DE CONNEXION =====
  async testApiConnection() {
    try {
      const result = await upasApi.getDashboard();
      return { success: true, message: 'Connexion à l\'API réussie' };
    } catch (error) {
      return { 
        success: false, 
        message: `Échec de connexion à l'API: ${error.message}`,
        details: error
      };
    }
  }

  // ===== MÉTHODES POUR LE DÉVELOPPEMENT/MOCK =====
  getMockFormData() {
    return {
      campagnes_actives: [
        {
          id: 1,
          nom: 'Campagne Test 1',
          type_assistance_id: 1,
          date_debut: '2025-01-01',
          date_fin: '2025-01-31',
          statut: 'active'
        },
        {
          id: 2,
          nom: 'Campagne Test 2',
          type_assistance_id: 2,
          date_debut: '2025-02-01',
          date_fin: '2025-02-28',
          statut: 'active'
        }
      ],
      types_assistance: [
        {
          id: 1,
          libelle: 'Assistance médicale',
          description: 'Aide médicale générale'
        },
        {
          id: 2,
          libelle: 'Assistance alimentaire',
          description: 'Distribution de produits alimentaires'
        }
      ],
      statuts_beneficiaires: [
        { value: 'en_attente', label: 'En attente' },
        { value: 'oui', label: 'Confirmé' },
        { value: 'non', label: 'Refusé' },
        { value: 'refuse', label: 'Refusé définitivement' }
      ],
      statuts_campagnes: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'en_cours', label: 'En cours' },
        { value: 'terminee', label: 'Terminée' },
        { value: 'annulee', label: 'Annulée' }
      ],
      sexes: [
        { value: 'M', label: 'Masculin' },
        { value: 'F', label: 'Féminin' }
      ],
      alertes_stock: []
    };
  }

  // Méthode de fallback pour les données de formulaire
  async getFormDataWithFallback() {
    try {
      return await this.getFormData();
    } catch (error) {
      console.warn('API non disponible, utilisation des données mock:', error.message);
      return this.getMockFormData();
    }
  }
}

export default new UpasService();