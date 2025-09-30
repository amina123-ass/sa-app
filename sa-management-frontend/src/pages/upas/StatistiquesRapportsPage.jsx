import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://http://192.168.1.45::8000/api';

// Client API simplifié
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('auth_token');
    
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
}

// Service UPAS corrigé avec URLs fixes
class UpasStatisticsService {
  constructor() {
    this.apiClient = new ApiClient(API_BASE_URL);
    this.baseURL = '/upas'; // FIXÉ: supprimé le double /api
  }

  async testConnection() {
    try {
      const response = await this.apiClient.get(`${this.baseURL}/test-connection`);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCampaigns() {
    try {
      // Essayer l'endpoint de statistiques d'abord
      const response = await this.apiClient.get(`${this.baseURL}/statistics/campaigns`);
      return { success: true, data: response.data || response };
    } catch (error) {
      // Fallback vers l'endpoint principal des campagnes
      try {
        const fallbackResponse = await this.apiClient.get(`${this.baseURL}/campagnes`);
        return { success: true, data: fallbackResponse.data || fallbackResponse };
      } catch (fallbackError) {
        return { success: false, error: `Erreur API: ${error.message}` };
      }
    }
  }

  async getCampaignStatistics(campaignId) {
    try {
      const response = await this.apiClient.get(`${this.baseURL}/statistics/campaigns/${campaignId}/stats`);
      return { success: true, data: response.data || response };
    } catch (error) {
      // Fallback : construire les stats à partir d'endpoints séparés
      try {
        const fallbackStats = await this.buildStatisticsFromSeparateEndpoints(campaignId);
        return {
          success: true,
          data: fallbackStats,
          warning: 'Données récupérées via endpoints de fallback'
        };
      } catch (fallbackError) {
        return { success: false, error: `Erreur statistiques: ${error.message}` };
      }
    }
  }

  async buildStatisticsFromSeparateEndpoints(campaignId) {
    try {
      const [campaignData, participantsData, beneficiairesData] = await Promise.allSettled([
        this.apiClient.get(`${this.baseURL}/campagnes/${campaignId}`),
        this.apiClient.get(`${this.baseURL}/participants?campagne_id=${campaignId}`),
        this.apiClient.get(`${this.baseURL}/beneficiaires?campagne_id=${campaignId}`)
      ]);

      const campaign = campaignData.status === 'fulfilled' ? campaignData.value : null;
      const participants = participantsData.status === 'fulfilled' ? participantsData.value.data || [] : [];
      const beneficiaires = beneficiairesData.status === 'fulfilled' ? beneficiairesData.value.data || [] : [];

      return this.calculateStatisticsFromRawData(campaign, participants, beneficiaires);
    } catch (error) {
      throw new Error(`Impossible de construire les statistiques: ${error.message}`);
    }
  }

  calculateStatisticsFromRawData(campaign, participants, beneficiaires) {
    const participantsStats = {
      total: participants.length,
      par_sexe: this.groupBySex(participants),
      par_age: this.groupByAge(participants)
    };

    const beneficiairesStats = {
      total: beneficiaires.length,
      par_sexe: this.groupBySex(beneficiaires),
      par_age: this.groupByAge(beneficiaires),
      enfants_scolarises: this.countScolarises(beneficiaires),
      en_attente: beneficiaires.filter(b => b.statut === 'en_attente' || b.decision === 'en_attente').length
    };

    let auditifs = null;
    if (campaign?.type_assistance === 'appareils_auditifs') {
      auditifs = { par_cote: this.groupByCote(beneficiaires) };
    }

    return {
      campaign: campaign,
      participants: participantsStats,
      beneficiaires: beneficiairesStats,
      auditifs: auditifs
    };
  }

  groupBySex(data) {
    const result = { M: 0, F: 0 };
    data.forEach(item => {
      if (item.sexe === 'M' || item.sexe === 'Masculin') result.M++;
      else if (item.sexe === 'F' || item.sexe === 'Féminin') result.F++;
    });
    return result;
  }

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

  countScolarises(beneficiaires) {
    const scolarises = beneficiaires.filter(b => 
      b.scolarise === true || b.scolarise === 1 || b.statut_scolarisation === 'scolarise'
    );
    
    const result = { M: 0, F: 0, total: scolarises.length };
    
    scolarises.forEach(item => {
      if (item.sexe === 'M' || item.sexe === 'Masculin') result.M++;
      else result.F++;
    });
    
    return result;
  }

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

  formatNumber(number) {
    return new Intl.NumberFormat('fr-FR').format(number);
  }

  formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
  }
}

// Composants UI
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="p-6 pb-3">{children}</div>
);

const CardContent = ({ children }) => (
  <div className="p-6 pt-3">{children}</div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-800 ${className}`}>{children}</h3>
);

const Alert = ({ children, variant = 'default' }) => (
  <div className={`p-4 rounded-xl border-l-4 ${
    variant === 'destructive' 
      ? 'bg-red-50 border-red-400 text-red-800' 
      : variant === 'warning'
      ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
      : variant === 'info'
      ? 'bg-blue-50 border-blue-400 text-blue-800'
      : 'bg-gray-50 border-gray-400 text-gray-800'
  }`}>
    {children}
  </div>
);

// Icônes
const Icons = {
  Users: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  UserCheck: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  Wifi: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
  Target: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  GraduationCap: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

// Composant principal
const UpasStatisticsDashboard = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [debugInfo, setDebugInfo] = useState(null);

  const service = new UpasStatisticsService();

  useEffect(() => {
    checkConnection();
    loadCampaigns();
  }, []);

  const checkConnection = async () => {
    try {
      const result = await service.testConnection();
      if (result.success) {
        setConnectionStatus('connected');
        setDebugInfo(result.data);
        setError('');
      } else {
        setConnectionStatus('disconnected');
        setError(`Erreur de connexion: ${result.error}`);
      }
    } catch (err) {
      setConnectionStatus('error');
      setError('Impossible de se connecter à l\'API UPAS');
    }
  };

  const loadCampaigns = async () => {
    try {
      const result = await service.getCampaigns();
      if (result.success && Array.isArray(result.data)) {
        setCampaigns(result.data);
        if (result.data.length > 0 && !selectedCampaign) {
          // Auto-sélectionner la première campagne
          setSelectedCampaign(result.data[0].id.toString());
          loadStatistics(result.data[0].id);
        }
      } else {
        setError(result.error || 'Format de données inattendu pour les campagnes');
      }
    } catch (err) {
      setError('Erreur lors du chargement des campagnes');
    }
  };

  const loadStatistics = async (campaignId) => {
    if (!campaignId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await service.getCampaignStatistics(campaignId);
      if (result.success) {
        const indicators = service.calculateDerivedIndicators(result.data);
        setStatistics({
          ...result.data,
          indicators
        });
        
        
      } else {
        setError(result.error);
        setStatistics(null);
      }
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignChange = (e) => {
    const campaignId = e.target.value;
    setSelectedCampaign(campaignId);
    setStatistics(null);
    if (campaignId) {
      loadStatistics(campaignId);
    }
  };

  // Composant carte de statistique
  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => (
    <Card className="hover:shadow-xl transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
          <Icon />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {typeof value === 'number' ? service.formatNumber(value) : value}
        </div>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  // Graphique en barres
  const ModernBarChart = ({ data, title }) => {
    const chartData = [
      {
        tranche: '<15 ans',
        Hommes: data?.['<15']?.M || 0,
        Femmes: data?.['<15']?.F || 0
      },
      {
        tranche: '15-64 ans',
        Hommes: data?.['15-64']?.M || 0,
        Femmes: data?.['15-64']?.F || 0
      },
      {
        tranche: '≥65 ans',
        Hommes: data?.['≥65']?.M || 0,
        Femmes: data?.['≥65']?.F || 0
      }
    ];

    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tranche" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Hommes" fill="#3b82f6" />
              <Bar dataKey="Femmes" fill="#ec4899" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  // Graphique en secteurs
  const ModernPieChart = ({ data, title }) => {
    const chartData = [
      { name: 'Unilatéral', value: data?.unilateral || 0, fill: '#8b5cf6' },
      { name: 'Bilatéral', value: data?.bilateral || 0, fill: '#06b6d4' }
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={100}
                dataKey="value"
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const selectedCampaignData = campaigns.find(c => c.id.toString() === selectedCampaign);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header avec statut de connexion */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Statistiques UPAS</h1>
              <p className="text-gray-600 mt-2">Analyse des participants et bénéficiaires</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                connectionStatus === 'disconnected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                <Icons.Wifi />
                <span className="text-sm font-medium">
                  {connectionStatus === 'connected' ? 'Connecté' :
                   connectionStatus === 'disconnected' ? 'Déconnecté' :
                   'Vérification...'}
                </span>
              </div>
              {connectionStatus !== 'connected' && (
                <button 
                  onClick={checkConnection}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Réessayer
                </button>
              )}
            </div>
          </div>

          {/* Information sur les URLs générées */}
          

          {/* Sélection de campagne */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélection de campagne *
              </label>
              <select
                value={selectedCampaign}
                onChange={handleCampaignChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={campaigns.length === 0}
              >
                <option value="">
                  {campaigns.length === 0 ? 'Aucune campagne disponible...' : 'Choisir une campagne...'}
                </option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id.toString()}>
                    {campaign.nom || campaign.name || `Campagne ${campaign.id}`}
                  </option>
                ))}
              </select>
            </div>
            {selectedCampaignData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Informations campagne
                </label>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-semibold text-gray-800">
                    {selectedCampaignData.type_assistance?.replace('_', ' ') || 'Type non spécifié'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Statut: {selectedCampaignData.statut || 'Non défini'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages d'erreur et d'avertissement */}
        {error && (
          <Alert variant={error.includes('Avertissement') ? 'warning' : 'destructive'}>
            <div className="flex items-center gap-2">
              <Icons.AlertTriangle />
              <span>{error}</span>
            </div>
          </Alert>
        )}

        {/* Informations de debug si nécessaire */}
        

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Chargement des statistiques...</span>
          </div>
        )}

        {/* Statistiques */}
        {statistics && !loading && (
          <div className="space-y-8">
            {/* Indicateurs de performance */}
            

            {/* Section Participants */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Population Cible - Participants</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total participants"
                  value={statistics.participants?.total || 0}
                  subtitle="Personnes nécessitant une correction"
                  icon={Icons.Users}
                  color="blue"
                />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Répartition par sexe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-600">Hommes</span>
                        <span className="font-semibold">{service.formatNumber(statistics.participants?.par_sexe?.M || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-pink-600">Femmes</span>
                        <span className="font-semibold">{service.formatNumber(statistics.participants?.par_sexe?.F || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Répartition par âge</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">&lt;15 ans</span>
                        <span className="font-semibold">{service.formatNumber(statistics.participants?.par_age?.['<15']?.total || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">15-64 ans</span>
                        <span className="font-semibold">{service.formatNumber(statistics.participants?.par_age?.['15-64']?.total || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">≥65 ans</span>
                        <span className="font-semibold">{service.formatNumber(statistics.participants?.par_age?.['≥65']?.total || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
              </div>

              <ModernBarChart 
                data={statistics.participants?.par_age} 
                title="Répartition des participants par tranche d'âge et sexe"
              />
            </div>

            {/* Section Bénéficiaires */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Population Servie - Bénéficiaires</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total bénéficiaires"
                  value={statistics.beneficiaires?.total || 0}
                  subtitle="Cas ayant bénéficié de l'assistance"
                  icon={Icons.UserCheck}
                  color="green"
                />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Répartition par sexe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-green-600">Hommes</span>
                        <span className="font-semibold">{service.formatNumber(statistics.beneficiaires?.par_sexe?.M || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-600">Femmes</span>
                        <span className="font-semibold">{service.formatNumber(statistics.beneficiaires?.par_sexe?.F || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <StatCard
                  title="En liste d'attente"
                  value={statistics.beneficiaires?.en_attente || 0}
                  subtitle="Cas en attente de traitement"
                  icon={Icons.Clock}
                  color="yellow"
                />
              </div>

              {/* Cas spécial - Appareils auditifs */}
              {selectedCampaignData?.type_assistance === 'Appareils Auditifs' && statistics.auditifs && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Répartition par côté affecté</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                          <span className="text-purple-600">Unilatéral</span>
                          <span className="font-semibold">{service.formatNumber(statistics.auditifs?.par_cote?.unilateral || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-cyan-50 rounded">
                          <span className="text-cyan-600">Bilatéral</span>
                          <span className="font-semibold">{service.formatNumber(statistics.auditifs?.par_cote?.bilateral || 0)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <ModernPieChart 
                    data={statistics.auditifs?.par_cote} 
                    title="Visualisation - Côté affecté"
                  />
                </div>
              )}

              <ModernBarChart 
                data={statistics.beneficiaires?.par_age} 
                title="Répartition des bénéficiaires par tranche d'âge et sexe"
              />
            </div>

            
          </div>
        )}

        {/* Message si pas de campagne sélectionnée */}
        {!selectedCampaign && !loading && campaigns.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <Icons.Users />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-4">Sélectionnez une campagne</h3>
            <p className="text-gray-600 mt-2">Choisissez une campagne dans la liste ci-dessus pour afficher ses statistiques.</p>
          </div>
        )}

        {/* Message si pas de campagnes */}
        {campaigns.length === 0 && !loading && connectionStatus === 'connected' && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <Icons.AlertTriangle />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-4">Aucune campagne trouvée</h3>
            <p className="text-gray-600 mt-2">Il n'y a actuellement aucune campagne disponible dans le système.</p>
          </div>
        )}

        {/* Message si problème de connexion */}
        {campaigns.length === 0 && !loading && connectionStatus !== 'connected' && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <Icons.Wifi />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-4">Problème de connexion</h3>
            <p className="text-gray-600 mt-2">
              Impossible de se connecter à l'API UPAS. Vérifiez que le serveur est démarré sur{' '}
              <code className="bg-gray-100 px-1 rounded text-sm">localhost:8000</code>.
            </p>
            <button 
              onClick={checkConnection}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Réessayer la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpasStatisticsDashboard;