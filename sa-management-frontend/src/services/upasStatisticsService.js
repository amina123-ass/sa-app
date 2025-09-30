// services/upasStatisticsService.js

// Configuration du client API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Client HTTP simple avec gestion d'erreurs
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('auth_token'); // Ajustez selon votre système d'auth
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Service de statistiques UPAS corrigé
class UpasStatisticsService {
  constructor() {
    this.apiClient = new ApiClient(API_BASE_URL);
    this.baseURL = '/api/upas';
  }

  /**
   * Test de connectivité avec l'API
   */
  async testConnection() {
    try {
      const response = await this.apiClient.get(`${this.baseURL}/test-connection`);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Test de connexion échoué:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Récupère la liste des campagnes disponibles pour les statistiques
   */
  async getCampaigns() {
    try {
      const response = await this.apiClient.get(`${this.baseURL}/statistics/campaigns`);
      return {
        success: true,
        data: response.data || response // Adaptation selon la structure de réponse
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des campagnes:', error);
      
      // Fallback vers l'endpoint des campagnes principales si les stats ne fonctionnent pas
      try {
        const fallbackResponse = await this.apiClient.get(`${this.baseURL}/campagnes`);
        return {
          success: true,
          data: fallbackResponse.data || fallbackResponse
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `Erreur API: ${error.message}`
        };
      }
    }
  }

  /**
   * Récupère les statistiques complètes d'une campagne
   */
  async getCampaignStatistics(campaignId) {
    try {
      const response = await this.apiClient.get(`${this.baseURL}/statistics/campaigns/${campaignId}/stats`);
      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      
      // Fallback : essayer de construire les stats à partir des endpoints individuels
      try {
        const fallbackStats = await this.buildStatisticsFromSeparateEndpoints(campaignId);
        return {
          success: true,
          data: fallbackStats,
          warning: 'Données récupérées via endpoints de fallback'
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `Erreur statistiques: ${error.message}`
        };
      }
    }
  }

  /**
   * Méthode de fallback pour construire les statistiques à partir d'endpoints séparés
   */
  async buildStatisticsFromSeparateEndpoints(campaignId) {
    try {
      // Récupérer les données de base de la campagne
      const [
        campaignData,
        participantsData,
        beneficiairesData
      ] = await Promise.allSettled([
        this.apiClient.get(`${this.baseURL}/campagnes/${campaignId}`),
        this.apiClient.get(`${this.baseURL}/participants?campagne_id=${campaignId}`),
        this.apiClient.get(`${this.baseURL}/beneficiaires?campagne_id=${campaignId}`)
      ]);

      // Traiter les résultats
      const campaign = campaignData.status === 'fulfilled' ? campaignData.value : null;
      const participants = participantsData.status === 'fulfilled' ? participantsData.value.data || [] : [];
      const beneficiaires = beneficiairesData.status === 'fulfilled' ? beneficiairesData.value.data || [] : [];

      // Calculer les statistiques manuellement
      const stats = this.calculateStatisticsFromRawData(campaign, participants, beneficiaires);
      
      return stats;
    } catch (error) {
      throw new Error(`Impossible de construire les statistiques: ${error.message}`);
    }
  }

  /**
   * Calcule les statistiques à partir de données brutes
   */
  calculateStatisticsFromRawData(campaign, participants, beneficiaires) {
    // Statistiques des participants
    const participantsStats = {
      total: participants.length,
      par_sexe: this.groupBySex(participants),
      par_age: this.groupByAge(participants)
    };

    // Statistiques des bénéficiaires
    const beneficiairesStats = {
      total: beneficiaires.length,
      par_sexe: this.groupBySex(beneficiaires),
      par_age: this.groupByAge(beneficiaires),
      enfants_scolarises: this.countScolarises(beneficiaires),
      en_attente: beneficiaires.filter(b => b.statut === 'en_attente' || b.decision === 'en_attente').length
    };

    // Statistiques spécifiques aux appareils auditifs
    let auditifs = null;
    if (campaign?.type_assistance === 'appareils_auditifs') {
      auditifs = {
        par_cote: this.groupByCote(beneficiaires)
      };
    }

    return {
      campaign: campaign,
      participants: participantsStats,
      beneficiaires: beneficiairesStats,
      auditifs: auditifs
    };
  }

  /**
   * Groupe les données par sexe
   */
  groupBySex(data) {
    const result = { M: 0, F: 0 };
    data.forEach(item => {
      if (item.sexe === 'M' || item.sexe === 'Masculin') result.M++;
      else if (item.sexe === 'F' || item.sexe === 'Féminin') result.F++;
    });
    return result;
  }

  /**
   * Groupe les données par tranche d'âge
   */
  groupByAge(data) {
    const result = {
      '<15': { M: 0, F: 0, total: 0 },
      '15-64': { M: 0, F: 0, total: 0 },
      '≥65': { M: 0, F: 0, total: 0 }
    };

    data.forEach(item => {
      const age = this.calculateAge(item.date_naissance);
      let tranche;
      
      if (age < 15) tranche = '<15';
      else if (age >= 65) tranche = '≥65';
      else tranche = '15-64';

      const sexe = (item.sexe === 'M' || item.sexe === 'Masculin') ? 'M' : 'F';
      
      result[tranche][sexe]++;
      result[tranche].total++;
    });

    return result;
  }

  /**
   * Calcule l'âge à partir de la date de naissance
   */
  calculateAge(dateNaissance) {
    if (!dateNaissance) return 0;
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Compte les enfants scolarisés
   */
  countScolarises(beneficiaires) {
    const scolarises = beneficiaires.filter(b => 
      b.scolarise === true || 
      b.scolarise === 1 || 
      b.statut_scolarisation === 'scolarise'
    );
    
    const result = { M: 0, F: 0, total: scolarises.length };
    
    scolarises.forEach(item => {
      if (item.sexe === 'M' || item.sexe === 'Masculin') result.M++;
      else result.F++;
    });
    
    return result;
  }

  /**
   * Groupe par côté affecté (pour appareils auditifs)
   */
  groupByCote(beneficiaires) {
    const result = { unilateral: 0, bilateral: 0 };
    
    beneficiaires.forEach(item => {
      if (item.cote_affecte === 'unilateral' || item.cote === 'unilateral') {
        result.unilateral++;
      } else if (item.cote_affecte === 'bilateral' || item.cote === 'bilateral') {
        result.bilateral++;
      }
    });
    
    return result;
  }

  /**
   * Diagnostic complet du système
   */
  async diagnosticComplete() {
    try {
      const response = await this.apiClient.get(`${this.baseURL}/diagnostic/complete`);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Récupère les options de formulaire nécessaires
   */
  async getFormOptions() {
    try {
      const response = await this.apiClient.get(`${this.baseURL}/form-options`);
      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calcule les indicateurs dérivés
   */
  calculateDerivedIndicators(data) {
    const { participants, beneficiaires } = data;
    const totalParticipants = participants?.total || 0;
    const totalBeneficiaires = beneficiaires?.total || 0;
    
    const tauxCouverture = totalParticipants > 0 
      ? Math.round((totalBeneficiaires / totalParticipants) * 100 * 100) / 100
      : 0;

    const backlog = Math.max(0, totalParticipants - totalBeneficiaires);
    const totalEnfantsScolarises = beneficiaires?.enfants_scolarises?.total || 0;
    const pourcentageEnfantsScolarises = totalBeneficiaires > 0
      ? Math.round((totalEnfantsScolarises / totalBeneficiaires) * 100 * 100) / 100
      : 0;

    return {
      tauxCouverture,
      backlog,
      pourcentageEnfantsScolarises,
      totalParticipants,
      totalBeneficiaires,
      totalEnfantsScolarises,
      enAttente: beneficiaires?.en_attente || 0
    };
  }

  /**
   * Export des statistiques
   */
  async exportStatistics(campaignId, format = 'excel') {
    try {
      const response = await fetch(
        `${this.apiClient.baseURL}${this.baseURL}/statistics/campaigns/${campaignId}/export?format=${format}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      return {
        success: true,
        data: blob,
        headers: response.headers
      };
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Méthode utilitaire pour télécharger un blob
   */
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Formatage des nombres
   */
  formatNumber(number) {
    return new Intl.NumberFormat('fr-FR').format(number);
  }

  /**
   * Formatage des pourcentages
   */
  formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Méthode principale pour récupérer toutes les statistiques
   */
  async getCompleteCampaignStatistics(campaignId) {
    try {
      // Test de connexion d'abord
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        return {
          success: false,
          error: 'Impossible de se connecter à l\'API UPAS'
        };
      }

      // Récupération des statistiques
      const statsResult = await this.getCampaignStatistics(campaignId);
      
      if (!statsResult.success) {
        return statsResult;
      }

      const rawData = statsResult.data;
      const indicators = this.calculateDerivedIndicators(rawData);
      
      return {
        success: true,
        data: {
          campaign: rawData.campaign,
          participants: rawData.participants,
          beneficiaires: rawData.beneficiaires,
          auditifs: rawData.auditifs,
          indicators,
          rawData
        },
        warning: statsResult.warning
      };
    } catch (error) {
      console.error('Erreur lors de la récupération complète:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des statistiques complètes'
      };
    }
  }
}

// Export singleton
const upasStatisticsService = new UpasStatisticsService();
export default upasStatisticsService;

// Export de la classe pour les tests
export { UpasStatisticsService };