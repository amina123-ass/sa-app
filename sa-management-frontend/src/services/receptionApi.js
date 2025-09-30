// src/services/receptionApi.js - Version complète avec participants en attente
import axios from '../config/axios';

const API_BASE = '/reception';

// ===== NOUVEAUX STATUTS - CONSTANTES =====
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

// ===== SERVICE API RÉCEPTION =====
export const receptionApi = {
  // ===== TEST DE CONNEXION =====
  testConnection: async () => {
    try {
      console.log('🔧 Test de connexion API...');
      const response = await axios.get('/test');
      console.log('✅ Connexion API OK');
      return {
        success: true,
        message: 'Connexion réussie',
        data: response.data
      };
    } catch (error) {
      console.error('❌ Test connexion échoué:', error);
      throw new Error('Erreur de connexion à l\'API');
    }
  },

  // ===== DASHBOARD =====
  getDashboard: async () => {
    try {
      console.log('📡 Appel API Dashboard...');
      const response = await axios.get(`${API_BASE}/dashboard`);
      
      if (response.data.success !== false) {
        console.log('✅ Dashboard data reçue:', response.data);
        return {
          success: true,
          stats: response.data.stats || {},
          campagnes_recentes: response.data.campagnes_recentes || [],
          tables_info: response.data.tables_info || {}
        };
      } else {
        throw new Error(response.data.message || 'Erreur dashboard');
      }
    } catch (error) {
      console.error('❌ Erreur Dashboard API:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erreur de connexion',
        stats: {
          total_campagnes: 0,
          total_participants: 0,
          participants_oui: 0,
          participants_non: 0,
          participants_en_attente: 0,
          participants_refuse: 0,
          repondu_count: 0,
          ne_repond_pas_count: 0,
          non_contacte_count: 0
        },
        campagnes_recentes: []
      };
    }
  },

  // ===== CAMPAGNES =====
  getCampagnes: async () => {
    try {
      console.log('📡 Appel API Campagnes...');
      const response = await axios.get(`${API_BASE}/campagnes`);
      
      if (response.data.success !== false) {
        console.log('✅ Campagnes data reçue:', response.data);
        return {
          success: true,
          data: response.data.data || response.data || [],
          total: response.data.total || 0
        };
      } else {
        throw new Error(response.data.message || 'Erreur chargement campagnes');
      }
    } catch (error) {
      console.error('❌ Erreur Campagnes API:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: []
      };
    }
  },

  getCampagne: async (id) => {
    try {
      console.log('📡 Appel API Campagne ID:', id);
      const response = await axios.get(`${API_BASE}/campagnes/${id}`);
      
      if (response.data.success !== false) {
        console.log('✅ Campagne data reçue:', response.data);
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        throw new Error(response.data.message || 'Campagne non trouvée');
      }
    } catch (error) {
      console.error('❌ Erreur Campagne API:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  createCampagne: async (data) => {
    try {
      console.log('📡 Création campagne:', data);
      const response = await axios.post(`${API_BASE}/campagnes`, data);
      
      if (response.data.success !== false) {
        console.log('✅ Campagne créée:', response.data);
        return {
          success: true,
          data: response.data.data || response.data.campagne,
          message: response.data.message || 'Campagne créée avec succès'
        };
      } else {
        throw new Error(response.data.message || 'Erreur création campagne');
      }
    } catch (error) {
      console.error('❌ Erreur création campagne:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateCampagne: async (id, data) => {
    try {
      console.log('📡 Modification campagne ID:', id, 'Data:', data);
      const response = await axios.put(`${API_BASE}/campagnes/${id}`, data);
      
      if (response.data.success !== false) {
        console.log('✅ Campagne modifiée:', response.data);
        return {
          success: true,
          data: response.data.data || response.data.campagne,
          message: response.data.message || 'Campagne modifiée avec succès'
        };
      } else {
        throw new Error(response.data.message || 'Erreur modification campagne');
      }
    } catch (error) {
      console.error('❌ Erreur modification campagne:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteCampagne: async (id) => {
    try {
      console.log('📡 Suppression campagne ID:', id);
      const response = await axios.delete(`${API_BASE}/campagnes/${id}`);
      
      if (response.data.success !== false) {
        console.log('✅ Campagne supprimée:', response.data);
        return {
          success: true,
          message: response.data.message || 'Campagne supprimée avec succès'
        };
      } else {
        throw new Error(response.data.message || 'Erreur suppression campagne');
      }
    } catch (error) {
      console.error('❌ Erreur suppression campagne:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // ===== PARTICIPANTS =====
  getParticipants: async (params = {}) => {
    try {
      console.log('📡 Appel API Participants avec params:', params);
      const response = await axios.get(`${API_BASE}/participants`, { params });
      
      if (response.data.success !== false) {
        console.log('✅ Participants data reçue:', response.data);
        return {
          success: true,
          data: response.data.data || response.data || [],
          pagination: {
            current_page: response.data.current_page || 1,
            per_page: response.data.per_page || 15,
            total: response.data.total || 0,
            last_page: response.data.last_page || 1
          }
        };
      } else {
        throw new Error(response.data.message || 'Erreur chargement participants');
      }
    } catch (error) {
      console.error('❌ Erreur Participants API:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: [],
        pagination: { current_page: 1, per_page: 15, total: 0, last_page: 1 }
      };
    }
  },

  getParticipant: async (id) => {
    try {
      console.log('📡 Appel API Participant ID:', id);
      const response = await axios.get(`${API_BASE}/participants/${id}`);
      
      if (response.data.success !== false) {
        console.log('✅ Participant data reçue:', response.data);
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        throw new Error(response.data.message || 'Participant non trouvé');
      }
    } catch (error) {
      console.error('❌ Erreur Participant API:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  createParticipant: async (data) => {
    try {
      console.log('📡 Création participant:', data);
      const response = await axios.post(`${API_BASE}/participants`, data);
      
      if (response.data.success !== false) {
        console.log('✅ Participant créé:', response.data);
        return {
          success: true,
          data: response.data.data || response.data.participant,
          message: response.data.message || 'Participant créé avec succès',
          action: response.data.action || 'created'
        };
      } else {
        throw new Error(response.data.message || 'Erreur création participant');
      }
    } catch (error) {
      console.error('❌ Erreur création participant:', error);
      
      if (error.response?.status === 409) {
        return {
          success: false,
          message: error.response.data.message || 'Participant déjà existant',
          action: 'exists',
          data: error.response.data.participant || null
        };
      }
      
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateStatutParticipant: async (id, data) => {
    try {
      console.log('📡 Mise à jour statut participant ID:', id, 'Data:', data);
      const response = await axios.put(`${API_BASE}/participants/${id}/statut`, data);
      
      if (response.data.success !== false) {
        console.log('✅ Statut participant mis à jour:', response.data);
        return {
          success: true,
          data: response.data.data || response.data.participant,
          message: response.data.message || 'Statut mis à jour avec succès'
        };
      } else {
        throw new Error(response.data.message || 'Erreur mise à jour statut');
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour statut:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  supprimerParticipant: async (id) => {
    try {
      console.log('📡 Suppression participant ID:', id);
      const response = await axios.delete(`${API_BASE}/participants/${id}`);
      
      if (response.data.success !== false) {
        console.log('✅ Participant supprimé:', response.data);
        return {
          success: true,
          message: response.data.message || 'Participant supprimé avec succès'
        };
      } else {
        throw new Error(response.data.message || 'Erreur suppression participant');
      }
    } catch (error) {
      console.error('❌ Erreur suppression participant:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // ===== BÉNÉFICIAIRES EN ATTENTE =====
  getBeneficiairesEnAttenteLastCampagne: async (campagneId, typeAssistanceId) => {
    try {
      console.log('📡 Récupération bénéficiaires en attente dernière campagne:', {
        campagneId,
        typeAssistanceId
      });

      const response = await axios.get(`${API_BASE}/beneficiaires-en-attente-last-campagne`, {
        params: {
          campagne_id: campagneId,
          type_assistance_id: typeAssistanceId
        }
      });

      if (response.data.success !== false) {
        console.log('✅ Bénéficiaires en attente reçus:', response.data);
        return {
          success: true,
          data: response.data.data || [],
          derniere_campagne: response.data.derniere_campagne,
          type_assistance: response.data.type_assistance,
          message: response.data.message
        };
      } else {
        throw new Error(response.data.message || 'Erreur récupération bénéficiaires');
      }
    } catch (error) {
      console.error('❌ Erreur récupération bénéficiaires en attente:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: []
      };
    }
  },

  // ===== ✅ NOUVELLE MÉTHODE: PARTICIPANTS EN ATTENTE =====
  getParticipantsEnAttenteLastCampagne: async (campagneId, typeAssistanceId) => {
    try {
      console.log('📡 Récupération participants en attente dernière campagne:', {
        campagneId,
        typeAssistanceId
      });

      const response = await axios.get(`${API_BASE}/participants-en-attente-last-campagne`, {
        params: {
          campagne_id: campagneId,
          type_assistance_id: typeAssistanceId
        }
      });

      if (response.data.success !== false) {
        console.log('✅ Participants en attente reçus:', response.data);
        return {
          success: true,
          data: response.data.data || [],
          derniere_campagne: response.data.derniere_campagne,
          type_assistance: response.data.type_assistance,
          message: response.data.message
        };
      } else {
        throw new Error(response.data.message || 'Erreur récupération participants');
      }
    } catch (error) {
      console.error('❌ Erreur récupération participants en attente:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: []
      };
    }
  },

  // ===== IMPORT/EXPORT =====
  importExcel: async (formData) => {
    try {
      console.log('📡 Import Excel...');
      
      for (let pair of formData.entries()) {
        if (pair[1] instanceof File) {
          console.log('📂 Fichier:', {
            name: pair[1].name,
            size: pair[1].size,
            type: pair[1].type
          });
        } else {
          console.log('📝 Paramètre:', pair[0], '=', pair[1]);
        }
      }
      
      const response = await axios.post(`${API_BASE}/import-excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`📤 Upload progress: ${percentCompleted}%`);
        }
      });
      
      console.log('📥 Réponse brute import:', response.data);
      
      if (response.data.success !== false) {
        console.log('✅ Import Excel réussi:', response.data);
        return {
          success: true,
          repondu_count: response.data.repondu_count || 0,
          ne_repond_pas_count: response.data.ne_repond_pas_count || 0,
          non_contacte_count: response.data.non_contacte_count || 0,
          inserted: response.data.inserted || response.data.nouveau_crees || 0,
          updated: response.data.updated || response.data.mis_a_jour || 0,
          total_traite: response.data.total_traite || 0,
          nouveau_crees: response.data.nouveau_crees || 0,
          mis_a_jour: response.data.mis_a_jour || 0,
          errors: response.data.erreurs || response.data.errors || [],
          diagnostic: response.data.diagnostic || null,
          campagne: response.data.campagne || '',
          message: response.data.message || 'Import réalisé avec succès',
          processed_at: response.data.processed_at || new Date().toISOString()
        };
      } else {
        throw new Error(response.data.message || 'Erreur lors de l\'import');
      }
    } catch (error) {
      console.error('❌ Erreur Import Excel détaillée:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      });
      
      if (error.response?.status === 422) {
        return {
          success: false,
          message: 'Erreurs de validation du fichier',
          errors: error.response.data.errors || [],
          details: error.response.data.message || 'Vérifiez le format de votre fichier'
        };
      } else if (error.response?.status === 413) {
        throw new Error('Fichier trop volumineux (maximum 10MB)');
      } else if (error.response?.status === 500) {
        throw new Error('Erreur serveur lors de l\'import. Vérifiez les logs Laravel.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Temps d\'attente dépassé. Le fichier est peut-être trop volumineux.');
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Erreur inconnue lors de l\'import');
    }
  },

  exportCSV: async (params) => {
    try {
      console.log('📡 Export CSV avec params:', params);
      const response = await axios.get(`${API_BASE}/export-csv`, { 
        params,
        responseType: 'blob'
      });
      
      console.log('✅ Export CSV réussi');
      return response;
    } catch (error) {
      console.error('❌ Erreur Export CSV:', error);
      throw new Error(error.response?.data?.message || 'Erreur lors de l\'export CSV');
    }
  },

  // ===== TYPES D'ASSISTANCE =====
  getTypesAssistance: async () => {
    try {
      console.log('📡 Chargement types assistance...');
      const response = await axios.get(`${API_BASE}/types-assistance`);
      
      if (response.data.success !== false) {
        console.log('✅ Types assistance reçus:', response.data);
        return {
          success: true,
          data: response.data.data || response.data || []
        };
      } else {
        throw new Error(response.data.message || 'Erreur chargement types assistance');
      }
    } catch (error) {
      console.error('❌ Erreur types assistance:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: []
      };
    }
  },

  // ===== DONNÉES INITIALES =====
  getInitialData: async () => {
    try {
      console.log('📡 Chargement données initiales...');
      const response = await axios.get(`${API_BASE}/initial-data`);
      
      if (response.data.success !== false) {
        console.log('✅ Données initiales reçues:', response.data);
        return {
          success: true,
          data: {
            campagnes: response.data.data?.campagnes || [],
            types_assistance: response.data.data?.types_assistance || [],
            statuts_participant: STATUTS_PARTICIPANTS
          }
        };
      } else {
        throw new Error(response.data.message || 'Erreur chargement données initiales');
      }
    } catch (error) {
      console.error('❌ Erreur données initiales:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: {
          campagnes: [],
          types_assistance: [],
          statuts_participant: STATUTS_PARTICIPANTS
        }
      };
    }
  },

  // ===== UTILITAIRES =====
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

  downloadBlob: (blob, filename) => {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Fichier téléchargé:', filename);
    } catch (error) {
      console.error('❌ Erreur téléchargement fichier:', error);
      throw new Error('Erreur lors du téléchargement du fichier');
    }
  }
};

// ===== LOG EN MODE DÉVELOPPEMENT =====
if (process.env.NODE_ENV === 'development') {
  console.log('📡 ReceptionApi chargé avec succès - Version complète');
  console.log('🆕 Nouveaux statuts supportés:', NOUVEAUX_STATUTS);
  console.log('✅ Méthodes disponibles:', Object.keys(receptionApi));
  console.log('🎯 Nouvelle méthode ajoutée: getParticipantsEnAttenteLastCampagne');
  window.receptionApi = receptionApi;
}

export default receptionApi;