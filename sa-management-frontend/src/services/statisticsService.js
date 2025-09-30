// services/statisticsService.js
import apiClient from './axiosClient';

class StatisticsService {
  constructor() {
    this.baseUrl = '/upas/statistiques';
  }

  // ===== STATISTIQUES DASHBOARD =====
  
  /**
   * Obtenir les statistiques principales du dashboard
   */
  async getDashboardStatistics() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/dashboard`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les métriques en temps réel
   */
  async getRealTimeMetrics() {
    try {
      const response = await apiClient.get('/upas/analytics/real-time');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== STATISTIQUES PAR CAMPAGNE =====
  
  /**
   * Obtenir les statistiques d'une campagne spécifique
   * @param {number} campaignId - ID de la campagne
   */
  async getCampaignStatistics(campaignId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/campagne/${campaignId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir le résumé de toutes les campagnes
   */
  async getCampaignsResume() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/campagnes/resume`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir l'évolution des campagnes dans le temps
   * @param {Object} filters - Filtres (dateDebut, dateFin, etc.)
   */
  async getCampaignsEvolution(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/campagnes/evolution?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== STATISTIQUES PAR TYPE D'ASSISTANCE =====
  
  /**
   * Obtenir les statistiques des lunettes
   */
  async getGlassesStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/lunettes?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les statistiques détaillées des lunettes
   */
  async getDetailedGlassesStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/lunettes/detaillees?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les statistiques des appareils auditifs
   */
  async getHearingAidsStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/appareils-auditifs?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les statistiques détaillées des appareils auditifs
   */
  async getDetailedHearingAidsStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/appareils-auditifs/detaillees?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les statistiques par type d'assistance
   * @param {number} typeId - ID du type d'assistance
   */
  async getAssistanceTypeStatistics(typeId, filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/type-assistance/${typeId}?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== STATISTIQUES FINANCIÈRES =====
  
  /**
   * Obtenir le crédit consommé avec filtres
   */
  async getConsumedCredit(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/credit-consomme?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir la répartition budgétaire
   */
  async getBudgetDistribution(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/budget/repartition?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir l'évolution des coûts
   */
  async getCostsEvolution(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/couts/evolution?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les prévisions budgétaires
   */
  async getBudgetForecasts(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/budget/previsions?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== STATISTIQUES DÉMOGRAPHIQUES =====
  
  /**
   * Obtenir les statistiques démographiques
   */
  async getDemographicStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/demographiques?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les statistiques géographiques
   */
  async getGeographicStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/geographiques?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir l'analyse des profils bénéficiaires
   */
  async getBeneficiaryProfiles(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/profils-beneficiaires?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== STATISTIQUES DE PERFORMANCE =====
  
  /**
   * Obtenir les statistiques de performance
   */
  async getPerformanceStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/performance?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les statistiques des délais
   */
  async getDelayStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/delais?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les taux de réussite
   */
  async getSuccessRates(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/taux-reussite?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== STATISTIQUES TEMPORELLES =====
  
  /**
   * Obtenir les statistiques par période
   */
  async getPeriodStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/periode?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir l'analyse des tendances
   */
  async getTrendsAnalysis(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/tendances?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir la comparaison année sur année
   */
  async getYearOverYearComparison(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/comparaison-annuelle?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== ANALYTICS AVANCÉES =====
  
  /**
   * Obtenir l'analyse prédictive
   */
  async getPredictiveAnalysis(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/predictive?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les KPI
   */
  async getKPI(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/kpi?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir l'analyse de cohortes
   */
  async getCohortAnalysis(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/cohortes?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir la segmentation des bénéficiaires
   */
  async getBeneficiarySegmentation(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`${this.baseUrl}/segmentation?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== DONNÉES POUR GRAPHIQUES =====
  
  /**
   * Obtenir les données pour graphiques dynamiques
   */
  async getChartsData(chartType, filters = {}) {
    try {
      const params = new URLSearchParams({
        type: chartType,
        ...filters
      }).toString();
      
      const response = await apiClient.get(`/upas/analytics/charts-data?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les données pour widgets dashboard
   */
  async getWidgetsData(widgets = []) {
    try {
      const params = new URLSearchParams({
        widgets: widgets.join(',')
      }).toString();
      
      const response = await apiClient.get(`/upas/analytics/widgets?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== RAPPORTS =====
  
  /**
   * Obtenir un rapport comparatif entre campagnes
   * @param {Array} campaignIds - IDs des campagnes à comparer
   */
  async getComparativeReport(campaignIds) {
    try {
      const response = await apiClient.post('/upas/rapports/comparatif-campagnes', {
        campagne_ids: campaignIds
      });
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir un rapport de performance par période
   */
  async getPerformanceReport(filters = {}) {
    try {
      const response = await apiClient.post('/upas/rapports/performance-periode', filters);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir un rapport financier détaillé
   */
  async getFinancialReport(filters = {}) {
    try {
      const response = await apiClient.post('/upas/rapports/financier', filters);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir un rapport d'activité
   */
  async getActivityReport(filters = {}) {
    try {
      const response = await apiClient.post('/upas/rapports/activite', filters);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir un rapport exécutif
   */
  async getExecutiveReport(filters = {}) {
    try {
      const response = await apiClient.post('/upas/rapports/executif', filters);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Générer un rapport personnalisé
   */
  async generateCustomReport(config) {
    try {
      const response = await apiClient.post('/upas/rapports/personnalise', config);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== EXPORT =====
  
  /**
   * Exporter des statistiques générales
   */
  async exportStatistics(exportConfig) {
    try {
      const response = await apiClient.post('/upas/export/statistiques', exportConfig, {
        responseType: 'blob'
      });
      
      return {
        success: true,
        data: response.data,
        filename: this.getFilenameFromResponse(response)
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Exporter les statistiques d'une campagne
   */
  async exportCampaignStatistics(campaignId, exportConfig) {
    try {
      const response = await apiClient.post(`/upas/export/campagne/${campaignId}/statistiques`, exportConfig, {
        responseType: 'blob'
      });
      
      return {
        success: true,
        data: response.data,
        filename: this.getFilenameFromResponse(response)
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Exporter le dashboard
   */
  async exportDashboard(exportConfig) {
    try {
      const response = await apiClient.post('/upas/export/dashboard', exportConfig, {
        responseType: 'blob'
      });
      
      return {
        success: true,
        data: response.data,
        filename: this.getFilenameFromResponse(response)
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== UTILITAIRES =====
  
  /**
   * Valider les filtres de statistiques
   */
  async validateFilters(filters) {
    try {
      const response = await apiClient.post('/upas/statistiques/validate-filters', filters);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir des suggestions de filtres intelligents
   */
  async getSuggestedFilters(context = {}) {
    try {
      const params = new URLSearchParams(context).toString();
      const response = await apiClient.get(`/upas/statistiques/suggested-filters?${params}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== CACHE MANAGEMENT =====
  
  /**
   * Vider le cache des statistiques
   */
  async clearStatisticsCache() {
    try {
      const response = await apiClient.post('/upas/cache/clear-statistics');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Préchauffer le cache des statistiques
   */
  async warmUpStatisticsCache() {
    try {
      const response = await apiClient.post('/upas/cache/warm-up-statistics');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir le statut du cache des statistiques
   */
  async getStatisticsCacheStatus() {
    try {
      const response = await apiClient.get('/upas/cache/statistics-status');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== MÉTHODES PRIVÉES =====
  
  /**
   * Gérer les erreurs des requêtes API
   */
  handleError(error) {
    let message = 'Une erreur est survenue';
    let details = null;

    if (error.response) {
      message = error.response.data?.message || `Erreur ${error.response.status}`;
      details = error.response.data;
    } else if (error.request) {
      message = 'Erreur de connexion au serveur';
    } else {
      message = error.message || 'Erreur inconnue';
    }

    console.error('Statistics Service Error:', {
      message,
      details,
      error
    });

    return {
      success: false,
      error: true,
      message,
      details
    };
  }

  /**
   * Extraire le nom de fichier de la réponse
   */
  getFilenameFromResponse(response) {
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches != null && matches[1]) {
        return matches[1].replace(/['"]/g, '');
      }
    }
    return `statistiques_${new Date().toISOString().split('T')[0]}.csv`;
  }

  // ===== MÉTHODES COMPOSÉES (COMBINAISONS UTILES) =====
  
  /**
   * Obtenir toutes les données nécessaires pour un dashboard complet
   */
  async getDashboardData() {
    try {
      const [
        dashboardStats,
        realTimeMetrics,
        campaignsResume,
        kpi
      ] = await Promise.all([
        this.getDashboardStatistics(),
        this.getRealTimeMetrics(),
        this.getCampaignsResume(),
        this.getKPI()
      ]);

      return {
        success: true,
        data: {
          dashboard: dashboardStats.data,
          realTime: realTimeMetrics.data,
          campaigns: campaignsResume.data,
          kpi: kpi.data
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir les données financières complètes
   */
  async getFinancialData(filters = {}) {
    try {
      const [
        consumedCredit,
        budgetDistribution,
        costsEvolution,
        budgetForecasts
      ] = await Promise.all([
        this.getConsumedCredit(filters),
        this.getBudgetDistribution(filters),
        this.getCostsEvolution(filters),
        this.getBudgetForecasts(filters)
      ]);

      return {
        success: true,
        data: {
          consumedCredit: consumedCredit.data,
          budgetDistribution: budgetDistribution.data,
          costsEvolution: costsEvolution.data,
          budgetForecasts: budgetForecasts.data
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Obtenir un aperçu complet d'une campagne
   */
  async getCampaignOverview(campaignId) {
    try {
      const [
        campaignStats,
        performanceStats,
        financialData
      ] = await Promise.all([
        this.getCampaignStatistics(campaignId),
        this.getPerformanceStatistics({ campagne_id: campaignId }),
        this.getConsumedCredit({ campagne_id: campaignId })
      ]);

      return {
        success: true,
        data: {
          statistics: campaignStats.data,
          performance: performanceStats.data,
          financial: financialData.data
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Export de l'instance unique (singleton)
const statisticsService = new StatisticsService();
export default statisticsService;