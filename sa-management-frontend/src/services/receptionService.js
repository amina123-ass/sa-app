// src/services/receptionService.js - VERSION MISE À JOUR AVEC NOUVEAUX STATUTS
import axios from '../config/axios';

export const receptionService = {
  // ===== DASHBOARD =====
  getDashboard: async () => {
    try {
      const response = await axios.get('/reception/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement du dashboard');
    }
  },

  getStatistiquesAvancees: async (params = {}) => {
    try {
      const response = await axios.get('/reception/statistiques-avancees', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement des statistiques avancées');
    }
  },

  // ===== CAMPAGNES =====
  getCampagnes: async () => {
    try {
      const response = await axios.get('/reception/campagnes');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement des campagnes');
    }
  },

  getCampagne: async (campagneId) => {
    try {
      const response = await axios.get(`/reception/campagnes/${campagneId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement de la campagne');
    }
  },

  // ===== NOUVEAUX STATUTS - STATISTIQUES =====
  
  /**
   * Obtenir les statistiques détaillées d'une campagne avec les nouveaux statuts
   */
  getStatistiquesDetailleesNouveauxStatuts: async (campagneId) => {
    try {
      const response = await axios.get(`/reception/campagnes/${campagneId}/statistiques-detaillees`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement des statistiques détaillées');
    }
  },

  /**
   * Obtenir les participants par statut (répondu, ne repond pas, non contacté)
   */
  getParticipantsParStatut: async (campagneId, statut, params = {}) => {
    try {
      const response = await axios.get(`/reception/campagnes/${campagneId}/participants-par-statut`, {
        params: { statut, ...params }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement des participants');
    }
  },

  // ===== IMPORT EXCEL AVEC NOUVEAUX STATUTS =====
  
  /**
   * Import Excel avec support des nouveaux statuts
   */
  importExcelNouveauxStatuts: async (formData) => {
    try {
      console.log('📤 Import Excel avec nouveaux statuts...');
      
      const response = await axios.post('/reception/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Timeout plus long pour les gros fichiers
        timeout: 120000, // 2 minutes
      });
      
      console.log('✅ Import Excel réussi:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur import Excel:', error);
      throw error;
    }
  },

  // ===== EXPORT CSV PAR STATUT =====
  
  /**
   * Export CSV filtré par statut
   */
  exportCSVParStatut: async (campagneId, statut) => {
    try {
      const response = await axios.get('/reception/export-csv-par-statut', {
        params: { campagne_id: campagneId, statut },
        responseType: 'blob'
      });
      
      // Créer le nom du fichier
      const filename = `participants_${statut.replace(' ', '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
      
      // Créer et déclencher le téléchargement
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors de l\'export CSV');
    }
  },

  // ===== PARTICIPANTS =====
  getParticipants: async (params = {}) => {
    try {
      const response = await axios.get('/reception/participants', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement des participants');
    }
  },

  getParticipant: async (participantId) => {
    try {
      const response = await axios.get(`/reception/participants/${participantId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement du participant');
    }
  },

  /**
   * Mettre à jour le statut d'un participant (nouveaux statuts)
   */
  updateStatutParticipant: async (participantId, statut, commentaire = '') => {
    try {
      const response = await axios.put(`/reception/participants/${participantId}/statut`, {
        statut,
        commentaire
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors de la mise à jour du statut');
    }
  },

  /**
   * Actions en masse sur les participants
   */
  actionsMasseParticipants: async (participantIds, action, data = {}) => {
    try {
      const response = await axios.post('/reception/participants/actions-masse', {
        participant_ids: participantIds,
        action,
        ...data
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors de l\'action en masse');
    }
  },

  // ===== CONVERSION EN BÉNÉFICIAIRES =====
  getParticipantsEligibles: async (campagneId) => {
    try {
      const response = await axios.get('/reception/participants-eligibles', {
        params: { campagne_id: campagneId }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement des participants éligibles');
    }
  },

  convertirEnBeneficiaire: async (participantIds) => {
    try {
      const response = await axios.post('/reception/convertir-beneficiaires', {
        participant_ids: participantIds
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors de la conversion');
    }
  },

  // ===== DONNÉES UTILITAIRES =====
  getFormData: async () => {
    try {
      const response = await axios.get('/reception/form-data');
      return response.data;
    } catch (error) {
      console.error('❌ Erreur form data API:', error);
      
      // Fallback avec données vides
      if (error.response?.status >= 500) {
        return {
          campagnes_actives: [],
          situations: [],
          types_assistance: [],
          etats_don: []
        };
      }
      
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement des données');
    }
  },

  getTypesAssistance: async () => {
    try {
      const response = await axios.get('/reception/types-assistance');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement des types d\'assistance');
    }
  },

  // ===== STATISTIQUES =====
  getStatistiques: async (params = {}) => {
    try {
      const response = await axios.get('/reception/statistiques', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement des statistiques');
    }
  },

  // ===== EXPORTS =====
  exportParticipants: async (campagneId = null, statut = null) => {
    try {
      const params = {};
      if (campagneId) params.campagne_id = campagneId;
      if (statut) params.statut = statut;
      
      const response = await axios.get('/reception/export-csv', { 
        params,
        responseType: 'blob'
      });
      
      // Générer le nom du fichier
      let filename = 'participants';
      if (statut) filename += `_${statut.replace(' ', '_')}`;
      filename += `_${new Date().toISOString().slice(0, 10)}.csv`;
      
      // Télécharger le fichier
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors de l\'export');
    }
  },

  // ===== UTILITAIRES =====
  
  /**
   * Mapper les anciens statuts vers les nouveaux (pour compatibilité)
   */
  mapperStatut: (ancienStatut) => {
    const mapping = {
      'en_attente': 'non contacté',
      'oui': 'répondu',
      'non': 'ne repond pas',
      'refuse': 'ne repond pas'
    };
    return mapping[ancienStatut] || ancienStatut;
  },

  /**
   * Obtenir les informations de couleur pour un statut
   */
  getStatutInfo: (statut) => {
    const statutsInfo = {
      'répondu': {
        label: 'A répondu',
        color: 'success',
        icon: '✅',
        description: 'Participant ayant donné une réponse positive'
      },
      'ne repond pas': {
        label: 'Ne répond pas',
        color: 'error',
        icon: '❌',
        description: 'Participant contacté mais qui ne répond pas'
      },
      'non contacté': {
        label: 'Non contacté',
        color: 'warning',
        icon: '⏳',
        description: 'Participant pas encore contacté'
      },
      // Anciens statuts pour compatibilité
      'en_attente': {
        label: 'En attente',
        color: 'info',
        icon: '⏳',
        description: 'En attente de contact'
      },
      'oui': {
        label: 'A répondu (OUI)',
        color: 'success',
        icon: '✅',
        description: 'Réponse positive'
      },
      'non': {
        label: 'N\'a pas répondu',
        color: 'secondary',
        icon: '⚫',
        description: 'Pas de réponse'
      },
      'refuse': {
        label: 'A refusé',
        color: 'error',
        icon: '❌',
        description: 'Réponse négative'
      }
    };
    
    return statutsInfo[statut] || {
      label: statut,
      color: 'default',
      icon: '❓',
      description: 'Statut inconnu'
    };
  },

  /**
   * Valider un fichier d'import
   */
  validateImportFile: (file) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return 'Format de fichier non supporté. Utilisez Excel (.xlsx, .xls) ou CSV.';
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      return 'Le fichier est trop volumineux (maximum 10MB)';
    }

    return null;
  },

  /**
   * Formater la taille d'un fichier
   */
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // ===== MÉTHODES DE TEST ET DEBUG =====
  testConnection: async () => {
    try {
      const response = await axios.get('/test');
      return response.data;
    } catch (error) {
      throw new Error('Erreur de connexion à l\'API');
    }
  }
};

// ===== CONSTANTES UTILES =====
export const NOUVEAUX_STATUTS = {
  REPONDU: 'répondu',
  NE_REPOND_PAS: 'ne repond pas',
  NON_CONTACTE: 'non contacté'
};

export const STATUTS_PARTICIPANTS = [
  { value: 'répondu', label: 'A répondu', color: 'success' },
  { value: 'ne repond pas', label: 'Ne répond pas', color: 'error' },
  { value: 'non contacté', label: 'Non contacté', color: 'warning' }
];

// Export par défaut
export default receptionService;