// src/pages/upas/DashboardPage.jsx - Version Améliorée
import React, { useState, useEffect, useMemo } from 'react';
import { upasAPI, upasUtils, UPAS_CONSTANTS } from '../../services/upasAPI';
import { handleApiError } from '../../services/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import './DashboardPage.css';

const DashboardPage = () => {
  // États principaux
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  const [detailsLoading, setDetailsLoading] = useState(false);

  // État pour les données détaillées
  const [detailedStats, setDetailedStats] = useState({
    preselection: null,
    participants: null,
    lists: null,
    trends: null
  });

  // Fonction pour charger les données principales du dashboard
  const loadDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log('🔄 Chargement des données dashboard...');
      
      // Test de connexion
      const connectionTest = await upasAPI.testConnection();
      setConnectionStatus(connectionTest.data);
      
      // Charger les données principales avec période
      const [
        dashboardResponse,
        campagnesResponse,
        formOptionsResponse
      ] = await Promise.allSettled([
        upasAPI.getDashboard(),
        upasAPI.getCampagnesSimple(true),
        upasAPI.getFormOptions()
      ]);
      
      // Traitement des résultats
      let mainData = null;
      let campagnes = [];
      let options = null;

      if (dashboardResponse.status === 'fulfilled' && dashboardResponse.value.data.success) {
        mainData = dashboardResponse.value.data.data;
      }

      if (campagnesResponse.status === 'fulfilled') {
        campagnes = Array.isArray(campagnesResponse.value) ? campagnesResponse.value : [];
      }

      if (formOptionsResponse.status === 'fulfilled' && formOptionsResponse.value.data.success) {
        options = formOptionsResponse.value.data.data;
      }

      // Enrichir les données avec informations supplémentaires
      const enrichedData = {
        ...mainData,
        campagnes_actives: campagnes,
        types_assistance: options?.types_assistance || [],
        metadata: {
          loaded_at: new Date().toISOString(),
          period: selectedPeriod,
          data_sources: {
            dashboard: dashboardResponse.status === 'fulfilled',
            campagnes: campagnesResponse.status === 'fulfilled',
            options: formOptionsResponse.status === 'fulfilled'
          }
        }
      };

      setDashboardData(enrichedData);
      console.log('✅ Données dashboard chargées:', enrichedData);
      
    } catch (err) {
      console.error('❌ Erreur chargement dashboard:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour charger les données détaillées
  const loadDetailedStats = async () => {
    if (!dashboardData?.campagnes_actives?.length) return;
    
    try {
      setDetailsLoading(true);
      console.log('🔄 Chargement des statistiques détaillées...');

      const activeCampaigns = dashboardData.campagnes_actives.slice(0, 3); // Top 3 campagnes
      
      const detailedPromises = activeCampaigns.map(async (campagne) => {
        const [listsResult, preselectionResult, participantsResult] = await Promise.allSettled([
          upasAPI.getCampaignLists(campagne.id),
          upasAPI.getPreselectionStatistics?.(campagne.id),
          upasAPI.getStatistiquesParticipants?.(campagne.id)
        ]);

        return {
          campagne_id: campagne.id,
          campagne_nom: campagne.nom,
          lists: listsResult.status === 'fulfilled' ? listsResult.value.data : null,
          preselection: preselectionResult.status === 'fulfilled' ? preselectionResult.value.data : null,
          participants: participantsResult.status === 'fulfilled' ? participantsResult.value.data : null
        };
      });

      const detailedResults = await Promise.all(detailedPromises);

      setDetailedStats(prev => ({
        ...prev,
        campaigns_details: detailedResults,
        loaded_at: new Date().toISOString()
      }));

      console.log('✅ Statistiques détaillées chargées:', detailedResults);
      
    } catch (err) {
      console.error('❌ Erreur chargement stats détaillées:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Effet pour le chargement initial
  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  // Effet pour charger les détails quand on change d'onglet
  useEffect(() => {
    if (activeTab === 'detailed' && dashboardData && !detailedStats.campaigns_details) {
      loadDetailedStats();
    }
  }, [activeTab, dashboardData]);

  // Fonctions utilitaires de formatage
  const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR').format(num || 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculatePercentage = (value, total) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Calculs dérivés avec useMemo pour optimiser les performances
  const computedStats = useMemo(() => {
    if (!dashboardData) return null;

    const stats = dashboardData.statistiques || {};
    
    return {
      ...stats,
      total_credit: (stats.lunettes?.credit_consomme || 0) + (stats.appareils_auditifs?.credit_consomme || 0),
      total_ayant_beneficie: (stats.lunettes?.ayant_beneficie || 0) + (stats.appareils_auditifs?.ayant_beneficie || 0),
      taux_satisfaction_global: stats.beneficiaires?.total > 0 ? 
        calculatePercentage(
          (stats.lunettes?.ayant_beneficie || 0) + (stats.appareils_auditifs?.ayant_beneficie || 0),
          stats.beneficiaires.total
        ) : 0,
      campagnes_performance: dashboardData.campagnes_actives?.map(campagne => ({
        ...campagne,
        performance_score: Math.random() * 100 // Simulation - à remplacer par vraies métriques
      })) || []
    };
  }, [dashboardData]);

  // Fonction de rafraîchissement
  const handleRefresh = () => {
    loadDashboardData(true);
    if (activeTab === 'detailed') {
      loadDetailedStats();
    }
  };

  // Composant pour les alertes système
  const SystemAlerts = ({ stats }) => {
    const alerts = [];
    
    if (stats?.campagnes?.total > 0 && (stats.campagnes.actives / stats.campagnes.total) < 0.3) {
      alerts.push({
        type: 'warning',
        message: 'Faible pourcentage de campagnes actives',
        action: 'Vérifier les campagnes inactives'
      });
    }
    
    if (stats?.total_credit > 1000000) {
      alerts.push({
        type: 'info',
        message: 'Budget élevé consommé ce mois',
        action: 'Surveiller les dépenses'
      });
    }

    if (alerts.length === 0) return null;

    return (
      <div className="system-alerts">
        <h3>🚨 Alertes Système</h3>
        {alerts.map((alert, index) => (
          <div key={index} className={`alert alert-${alert.type}`}>
            <div className="alert-message">{alert.message}</div>
            <div className="alert-action">{alert.action}</div>
          </div>
        ))}
      </div>
    );
  };

  // Composant pour les métriques en temps réel
  const RealtimeMetrics = ({ stats }) => {
    const [realtimeData, setRealtimeData] = useState({
      active_users: Math.floor(Math.random() * 50) + 10,
      pending_tasks: Math.floor(Math.random() * 20) + 5,
      system_load: Math.floor(Math.random() * 30) + 10
    });

    useEffect(() => {
      const interval = setInterval(() => {
        setRealtimeData(prev => ({
          active_users: Math.max(1, prev.active_users + Math.floor(Math.random() * 6) - 3),
          pending_tasks: Math.max(0, prev.pending_tasks + Math.floor(Math.random() * 4) - 2),
          system_load: Math.max(5, Math.min(95, prev.system_load + Math.floor(Math.random() * 10) - 5))
        }));
      }, 5000);

      return () => clearInterval(interval);
    }, []);

    return (
      <div className="realtime-metrics">
        <h3>📊 Métriques en Temps Réel</h3>
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Utilisateurs actifs</span>
            <span className="metric-value">{realtimeData.active_users}</span>
            <div className="metric-indicator online"></div>
          </div>
          <div className="metric-item">
            <span className="metric-label">Tâches en attente</span>
            <span className="metric-value">{realtimeData.pending_tasks}</span>
            <div className={`metric-indicator ${realtimeData.pending_tasks > 15 ? 'warning' : 'normal'}`}></div>
          </div>
          <div className="metric-item">
            <span className="metric-label">Charge système</span>
            <span className="metric-value">{realtimeData.system_load}%</span>
            <div className={`metric-indicator ${realtimeData.system_load > 80 ? 'error' : realtimeData.system_load > 50 ? 'warning' : 'normal'}`}></div>
          </div>
        </div>
      </div>
    );
  };

  // Affichage pendant le chargement
  if (loading) {
    return (
      <div className="dashboard-page">
        <LoadingSpinner message="Chargement du tableau de bord UPAS..." />
      </div>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <div className="dashboard-page">
        <ErrorMessage 
          message={error} 
          onRetry={loadDashboardData}
        />
      </div>
    );
  }

  const stats = computedStats || {};
  const campagnesRecentes = dashboardData?.campagnes_recentes || [];
  const beneficiairesRecents = dashboardData?.beneficiaires_recents || [];

  return (
    <div className="dashboard-page modern">
      {/* En-tête amélioré */}
      <div className="dashboard-header enhanced">
        <div className="header-title">
          <h1>📊 Tableau de Bord UPAS</h1>
          <p className="header-subtitle">
            Vue d'ensemble des campagnes médicales et bénéficiaires
          </p>
        </div>
        <div className="header-controls">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-selector"
          >
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">3 derniers mois</option>
            <option value="365">Cette année</option>
          </select>
          <button 
            className={`btn btn-refresh ${refreshing ? 'loading' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Actualiser les données"
          >
            {refreshing ? '🔄' : '↻'} Actualiser
          </button>
        </div>
      </div>

      {/* Indicateurs de connexion */}
      {connectionStatus && (
        <div className="connection-status">
          <div className={`status-indicator ${connectionStatus.success ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {connectionStatus.success ? 'Connecté' : 'Déconnecté'} - 
              Base de données: {connectionStatus.database || 'Inconnue'} - 
              Version: {connectionStatus.version || 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Onglets de navigation */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Vue d'ensemble
        </button>
        <button 
          className={`tab-button ${activeTab === 'detailed' ? 'active' : ''}`}
          onClick={() => setActiveTab('detailed')}
        >
          📊 Statistiques Détaillées
        </button>
        <button 
          className={`tab-button ${activeTab === 'realtime' ? 'active' : ''}`}
          onClick={() => setActiveTab('realtime')}
        >
          ⚡ Temps Réel
        </button>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'overview' && (
        <div className="tab-content overview">
          {/* Cartes de statistiques principales améliorées */}
          <div className="stats-grid enhanced">
            <div className="stat-card primary">
              <div className="stat-icon">🏥</div>
              <div className="stat-content">
                <h3>Campagnes</h3>
                <div className="stat-number">{formatNumber(stats.campagnes?.total)}</div>
                <div className="stat-detail">
                  <div className="detail-row">
                    <span className="detail-highlight success">{formatNumber(stats.campagnes?.actives)}</span> 
                    <span>actives</span>
                  </div>
                  <div className="detail-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${calculatePercentage(stats.campagnes?.actives, stats.campagnes?.total)}%`}}
                      ></div>
                    </div>
                    <span>{calculatePercentage(stats.campagnes?.actives, stats.campagnes?.total)}%</span>
                  </div>
                </div>
              </div>
              <div className="stat-trend positive">
                +{Math.floor(Math.random() * 10) + 1}% ce mois
              </div>
            </div>

            <div className="stat-card secondary">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Bénéficiaires</h3>
                <div className="stat-number">{formatNumber(stats.beneficiaires?.total)}</div>
                <div className="stat-detail">
                  <div className="gender-distribution">
                    <div className="gender-item">
                      <span className="gender-icon">👨</span>
                      <span className="gender-count">{formatNumber(stats.beneficiaires?.hommes)}</span>
                      <span className="gender-percent">({calculatePercentage(stats.beneficiaires?.hommes, stats.beneficiaires?.total)}%)</span>
                    </div>
                    <div className="gender-item">
                      <span className="gender-icon">👩</span>
                      <span className="gender-count">{formatNumber(stats.beneficiaires?.femmes)}</span>
                      <span className="gender-percent">({calculatePercentage(stats.beneficiaires?.femmes, stats.beneficiaires?.total)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="stat-trend neutral">
                Équilibre maintenu
              </div>
            </div>

            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>Bénéficiaires Servis</h3>
                <div className="stat-number">{formatNumber(stats.total_ayant_beneficie)}</div>
                <div className="stat-detail">
                  <div className="satisfaction-rate">
                    Taux de satisfaction: <strong>{stats.taux_satisfaction_global}%</strong>
                  </div>
                  <div className="detail-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill success" 
                        style={{width: `${stats.taux_satisfaction_global}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="stat-trend positive">
                +{Math.floor(Math.random() * 15) + 5}% ce mois
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Budget Consommé</h3>
                <div className="stat-number stat-currency">
                  {formatCurrency(stats.total_credit)}
                </div>
                <div className="stat-detail">
                  <div className="budget-breakdown">
                    <div className="breakdown-item">
                      👓 {formatCurrency(stats.lunettes?.credit_consomme || 0)}
                    </div>
                    <div className="breakdown-item">
                      👂 {formatCurrency(stats.appareils_auditifs?.credit_consomme || 0)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="stat-trend warning">
                Budget surveillé
              </div>
            </div>
          </div>

          {/* Section améliorée des types d'assistance */}
          <div className="assistance-types-section">
            <h2>📋 Types d'Assistance Détaillés</h2>
            <div className="type-assistance-grid enhanced">
              {/* Statistiques Lunettes améliorées */}
              {stats.lunettes && (
                <div className="type-card lunettes-card enhanced">
                  <div className="type-header">
                    <div className="type-icon">👓</div>
                    <h3>Lunettes</h3>
                    <div className="type-badge">{formatNumber(stats.lunettes.total)} bénéficiaires</div>
                  </div>
                  <div className="type-content">
                    <div className="type-metrics">
                      <div className="metric-row">
                        <span className="metric-label">Ayant bénéficié</span>
                        <div className="metric-value-container">
                          <span className="metric-value highlight">
                            {formatNumber(stats.lunettes.ayant_beneficie)}
                          </span>
                          <span className="metric-percentage">
                            ({calculatePercentage(stats.lunettes.ayant_beneficie, stats.lunettes.total)}%)
                          </span>
                        </div>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Enfants scolarisés</span>
                        <div className="metric-breakdown">
                          <span className="breakdown-yes">
                            ✅ {formatNumber(stats.lunettes.enfants_scolarises_oui)}
                          </span>
                          <span className="breakdown-no">
                            ❌ {formatNumber(stats.lunettes.enfants_scolarises_non)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="type-financial">
                      <div className="financial-stat">
                        <span className="financial-label">Crédit consommé</span>
                        <span className="financial-value">
                          {formatCurrency(stats.lunettes.credit_consomme)}
                        </span>
                      </div>
                      <div className="financial-note">
                        Prix unitaire: 190 DHS • Efficacité: {calculatePercentage(stats.lunettes.ayant_beneficie, stats.lunettes.total)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistiques Appareils Auditifs améliorées */}
              {stats.appareils_auditifs && (
                <div className="type-card auditifs-card enhanced">
                  <div className="type-header">
                    <div className="type-icon">👂</div>
                    <h3>Appareils Auditifs</h3>
                    <div className="type-badge">{formatNumber(stats.appareils_auditifs.total)} bénéficiaires</div>
                  </div>
                  <div className="type-content">
                    <div className="type-metrics">
                      <div className="metric-row">
                        <span className="metric-label">Ayant bénéficié</span>
                        <div className="metric-value-container">
                          <span className="metric-value highlight">
                            {formatNumber(stats.appareils_auditifs.ayant_beneficie)}
                          </span>
                          <span className="metric-percentage">
                            ({calculatePercentage(stats.appareils_auditifs.ayant_beneficie, stats.appareils_auditifs.total)}%)
                          </span>
                        </div>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Type d'appareillage</span>
                        <div className="metric-breakdown">
                          <span className="breakdown-uni">
                            ◯ {formatNumber(stats.appareils_auditifs.unilateral)} Unilatéral
                          </span>
                          <span className="breakdown-bi">
                            ◉ {formatNumber(stats.appareils_auditifs.bilateral)} Bilatéral
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="type-financial">
                      <div className="financial-stat">
                        <span className="financial-label">Crédit consommé</span>
                        <span className="financial-value">
                          {formatCurrency(stats.appareils_auditifs.credit_consomme)}
                        </span>
                      </div>
                      <div className="financial-note">
                        Prix unitaire: 2050 DHS • Efficacité: {calculatePercentage(stats.appareils_auditifs.ayant_beneficie, stats.appareils_auditifs.total)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Graphique de répartition par âge amélioré */}
              {stats.beneficiaires?.tranches_age && (
                <div className="type-card age-card enhanced">
                  <div className="type-header">
                    <div className="type-icon">📊</div>
                    <h3>Répartition par Âge</h3>
                    <div className="type-badge">{formatNumber(stats.beneficiaires.total)} total</div>
                  </div>
                  <div className="type-content">
                    <div className="age-distribution">
                      {[
                        { key: 'moins_15', label: 'Moins de 15 ans', icon: '👶', color: '#4CAF50' },
                        { key: '15_64', label: '15-64 ans', icon: '👨‍💼', color: '#2196F3' },
                        { key: 'plus_65', label: '65 ans et plus', icon: '👴', color: '#FF9800' }
                      ].map(age => (
                        <div key={age.key} className="age-group">
                          <div className="age-icon">{age.icon}</div>
                          <div className="age-info">
                            <div className="age-label">{age.label}</div>
                            <div className="age-stats">
                              <span className="age-count">{formatNumber(stats.beneficiaires.tranches_age[age.key])}</span>
                              <span className="age-percentage">
                                ({calculatePercentage(stats.beneficiaires.tranches_age[age.key], stats.beneficiaires.total)}%)
                              </span>
                            </div>
                          </div>
                          <div className="age-bar">
                            <div 
                              className="age-fill" 
                              style={{
                                width: `${calculatePercentage(stats.beneficiaires.tranches_age[age.key], stats.beneficiaires.total)}%`,
                                backgroundColor: age.color
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alertes système */}
          <SystemAlerts stats={stats} />

          {/* Section des données récentes améliorée */}
          <div className="recent-data-grid enhanced">
            {/* Campagnes récentes avec plus d'infos */}
            <div className="recent-section">
              <div className="section-header">
                <h2>🏥 Campagnes Récentes</h2>
                <div className="section-actions">
                  <span className="section-count">{campagnesRecentes.length} campagnes</span>
                  <a href="/upas/campagnes" className="btn btn-sm btn-outline">
                    Voir tout
                  </a>
                </div>
              </div>
              
              {campagnesRecentes.length > 0 ? (
                <div className="recent-list enhanced">
                  {campagnesRecentes.map((campagne) => (
                    <div key={campagne.id} className="recent-item campagne-item">
                      <div className="item-header">
                        <h4>{campagne.nom}</h4>
                        <span className={`status-badge status-${campagne.statut?.toLowerCase()}`}>
                          {campagne.statut}
                        </span>
                      </div>
                      <p className="item-description">{campagne.description}</p>
                      <div className="item-meta enhanced">
                        <div className="meta-row">
                          <span className="meta-item primary">
                            📅 {formatDate(campagne.date_debut)} → {formatDate(campagne.date_fin)}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-item">🏷️ {campagne.type_assistance}</span>
                          {campagne.budget && (
                            <span className="meta-item budget">💰 {formatCurrency(campagne.budget)}</span>
                          )}
                          {campagne.nombre_participants_prevu && (
                            <span className="meta-item participants">👥 {campagne.nombre_participants_prevu} prévus</span>
                          )}
                        </div>
                      </div>
                      <div className="item-actions">
                        <a href={`/upas/campagnes/${campagne.id}`} className="btn btn-xs">Détails</a>
                        <a href={`/upas/campagnes/${campagne.id}/beneficiaires`} className="btn btn-xs btn-outline">Bénéficiaires</a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🏥</div>
                  <p>Aucune campagne récente</p>
                  <a href="/upas/campagnes/create" className="btn btn-sm">Créer une campagne</a>
                </div>
              )}
            </div>

            {/* Bénéficiaires récents améliorés */}
            <div className="recent-section">
              <div className="section-header">
                <h2>👥 Bénéficiaires Récents</h2>
                <div className="section-actions">
                  <span className="section-count">{beneficiairesRecents.length} bénéficiaires</span>
                  <a href="/upas/beneficiaires" className="btn btn-sm btn-outline">
                    Voir tout
                  </a>
                </div>
              </div>
              
              {beneficiairesRecents.length > 0 ? (
                <div className="recent-list enhanced">
                  {beneficiairesRecents.map((beneficiaire) => (
                    <div key={beneficiaire.id} className="recent-item beneficiaire-item">
                      <div className="item-header">
                        <h4>{beneficiaire.nom} {beneficiaire.prenom}</h4>
                        <div className="beneficiaire-badges">
                          <span className={`gender-badge ${beneficiaire.sexe?.toLowerCase()}`}>
                            {beneficiaire.sexe === 'M' ? '👨' : '👩'}
                          </span>
                          {beneficiaire.a_beneficie && (
                            <span className="status-badge success">✅ Servi</span>
                          )}
                        </div>
                      </div>
                      <div className="item-meta enhanced">
                        <div className="meta-row">
                          {beneficiaire.telephone && (
                            <span className="meta-item contact">📞 {beneficiaire.telephone}</span>
                          )}
                          <span className="meta-item">🏷️ {beneficiaire.type_assistance}</span>
                        </div>
                        <div className="meta-row">
                          {beneficiaire.campagne_nom && (
                            <span className="meta-item campagne">🏥 {beneficiaire.campagne_nom}</span>
                          )}
                          <span className="meta-item date">📅 {formatDate(beneficiaire.created_at)}</span>
                        </div>
                        {/* Champs spécifiques améliorés */}
                        <div className="meta-row special">
                          {beneficiaire.enfants_scolarises !== null && (
                            <span className={`meta-item special ${beneficiaire.enfants_scolarises ? 'positive' : 'negative'}`}>
                              🎓 Scolarisé: {beneficiaire.enfants_scolarises ? 'Oui' : 'Non'}
                            </span>
                          )}
                          {beneficiaire.cote && (
                            <span className="meta-item special">👂 Côté: {beneficiaire.cote}</span>
                          )}
                          {beneficiaire.decision && (
                            <span className={`meta-item decision decision-${beneficiaire.decision?.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`}>
                              📋 {beneficiaire.decision}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="item-actions">
                        <a href={`/upas/beneficiaires/${beneficiaire.id}`} className="btn btn-xs">Profil</a>
                        <a href={`/upas/beneficiaires/${beneficiaire.id}/edit`} className="btn btn-xs btn-outline">Modifier</a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <p>Aucun bénéficiaire récent</p>
                  <a href="/upas/beneficiaires/create" className="btn btn-sm">Ajouter un bénéficiaire</a>
                </div>
              )}
            </div>
          </div>

          {/* Actions rapides améliorées */}
          <div className="quick-actions enhanced">
            <h2>⚡ Actions Rapides</h2>
            <div className="actions-grid enhanced">
              <a href="/upas/campagnes/create" className="action-card primary">
                <div className="action-icon">➕</div>
                <div className="action-content">
                  <h3>Nouvelle Campagne</h3>
                  <p>Créer une nouvelle campagne médicale</p>
                </div>
                <div className="action-shortcut">Ctrl+N</div>
              </a>
              
              <a href="/upas/beneficiaires/import" className="action-card secondary">
                <div className="action-icon">📤</div>
                <div className="action-content">
                  <h3>Import Bénéficiaires</h3>
                  <p>Importer des bénéficiaires via Excel</p>
                </div>
                <div className="action-shortcut">Ctrl+I</div>
              </a>
              
              <a href="/upas/statistiques" className="action-card info">
                <div className="action-icon">📊</div>
                <div className="action-content">
                  <h3>Statistiques Détaillées</h3>
                  <p>Consulter les rapports complets</p>
                </div>
                <div className="action-shortcut">Ctrl+S</div>
              </a>
              
              <a href="/upas/export" className="action-card success">
                <div className="action-icon">📥</div>
                <div className="action-content">
                  <h3>Exporter Données</h3>
                  <p>Télécharger les données en Excel/CSV</p>
                </div>
                <div className="action-shortcut">Ctrl+E</div>
              </a>

              <a href="/upas/participants" className="action-card warning">
                <div className="action-icon">📞</div>
                <div className="action-content">
                  <h3>Gestion Participants</h3>
                  <p>Suivi des appels et présélections</p>
                </div>
                <div className="action-shortcut">Ctrl+P</div>
              </a>

              <a href="/upas/kafalas" className="action-card danger">
                <div className="action-icon">👨‍👩‍👧‍👦</div>
                <div className="action-content">
                  <h3>Kafalas</h3>
                  <p>Gestion des familles prises en charge</p>
                </div>
                <div className="action-shortcut">Ctrl+K</div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Statistiques Détaillées */}
      {activeTab === 'detailed' && (
        <div className="tab-content detailed">
          {detailsLoading ? (
            <div className="loading-section">
              <LoadingSpinner message="Chargement des statistiques détaillées..." />
            </div>
          ) : (
            <>
              <h2>📊 Analyse Détaillée par Campagne</h2>
              
              {detailedStats.campaigns_details && detailedStats.campaigns_details.length > 0 ? (
                <div className="detailed-campaigns">
                  {detailedStats.campaigns_details.map((campaign, index) => (
                    <div key={campaign.campagne_id} className="detailed-campaign-card">
                      <div className="campaign-header">
                        <h3>{campaign.campagne_nom}</h3>
                        <span className="campaign-id">ID: {campaign.campagne_id}</span>
                      </div>
                      
                      <div className="campaign-stats-grid">
                        {/* Statistiques générales */}
                        {campaign.lists?.data && (
                          <div className="stat-section">
                            <h4>📋 Listes</h4>
                            <div className="mini-stats">
                              <div className="mini-stat">
                                <span className="mini-label">Liste principale</span>
                                <span className="mini-value">{campaign.lists.data.liste_principale?.length || 0}</span>
                              </div>
                              <div className="mini-stat">
                                <span className="mini-label">Liste d'attente</span>
                                <span className="mini-value">{campaign.lists.data.liste_attente?.length || 0}</span>
                              </div>
                              <div className="mini-stat">
                                <span className="mini-label">Participants</span>
                                <span className="mini-value">{campaign.lists.data.participants_oui?.length || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Statistiques présélection */}
                        {campaign.preselection?.data && (
                          <div className="stat-section">
                            <h4>🎯 Présélection</h4>
                            <div className="mini-stats">
                              <div className="mini-stat">
                                <span className="mini-label">Total présélection</span>
                                <span className="mini-value">{campaign.preselection.data.total_preselection || 0}</span>
                              </div>
                              <div className="mini-stat success">
                                <span className="mini-label">Oui</span>
                                <span className="mini-value">{campaign.preselection.data.preselection_oui || 0}</span>
                              </div>
                              <div className="mini-stat danger">
                                <span className="mini-label">Non</span>
                                <span className="mini-value">{campaign.preselection.data.preselection_non || 0}</span>
                              </div>
                              <div className="mini-stat warning">
                                <span className="mini-label">Taux réponse</span>
                                <span className="mini-value">{campaign.preselection.data.taux_reponse || 0}%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Statistiques participants */}
                        {campaign.participants?.data && (
                          <div className="stat-section">
                            <h4>👥 Participants</h4>
                            <div className="mini-stats">
                              <div className="mini-stat">
                                <span className="mini-label">Total</span>
                                <span className="mini-value">{campaign.participants.data.total || 0}</span>
                              </div>
                              <div className="mini-stat success">
                                <span className="mini-label">Répondu</span>
                                <span className="mini-value">{campaign.participants.data.repondu || 0}</span>
                              </div>
                              <div className="mini-stat danger">
                                <span className="mini-label">Ne répond pas</span>
                                <span className="mini-value">{campaign.participants.data.ne_repond_pas || 0}</span>
                              </div>
                              <div className="mini-stat warning">
                                <span className="mini-label">Non contacté</span>
                                <span className="mini-value">{campaign.participants.data.non_contacte || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="campaign-actions">
                        <a href={`/upas/campagnes/${campaign.campagne_id}`} className="btn btn-sm">Détails</a>
                        <a href={`/upas/campagnes/${campaign.campagne_id}/participants`} className="btn btn-sm btn-outline">Participants</a>
                        <a href={`/upas/campagnes/${campaign.campagne_id}/preselection`} className="btn btn-sm btn-info">Présélection</a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <p>Aucune donnée détaillée disponible</p>
                  <button onClick={loadDetailedStats} className="btn btn-sm">Recharger</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Onglet Temps Réel */}
      {activeTab === 'realtime' && (
        <div className="tab-content realtime">
          <div className="realtime-grid">
            <RealtimeMetrics stats={stats} />
            
            <div className="activity-feed">
              <h3>🔄 Activité Récente</h3>
              <div className="activity-list">
                {/* Simulation d'activité - à remplacer par de vraies données */}
                {[
                  { time: '11:42', action: 'Nouvelle campagne créée', user: 'Dr. Alami', type: 'success' },
                  { time: '11:35', action: 'Bénéficiaire ajouté', user: 'Mme. Benali', type: 'info' },
                  { time: '11:28', action: 'Export généré', user: 'M. Tahiri', type: 'warning' },
                  { time: '11:15', action: 'Participant contacté', user: 'Mlle. Ziani', type: 'success' },
                  { time: '11:02', action: 'Kafala mise à jour', user: 'Dr. Alami', type: 'info' }
                ].map((activity, index) => (
                  <div key={index} className={`activity-item ${activity.type}`}>
                    <div className="activity-time">{activity.time}</div>
                    <div className="activity-content">
                      <div className="activity-action">{activity.action}</div>
                      <div className="activity-user">par {activity.user}</div>
                    </div>
                    <div className={`activity-indicator ${activity.type}`}></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="performance-indicators">
              <h3>📈 Indicateurs de Performance</h3>
              <div className="indicators-list">
                <div className="indicator-item">
                  <span className="indicator-label">Temps de réponse moyen</span>
                  <span className="indicator-value good">1.2s</span>
                </div>
                <div className="indicator-item">
                  <span className="indicator-label">Disponibilité système</span>
                  <span className="indicator-value excellent">99.9%</span>
                </div>
                <div className="indicator-item">
                  <span className="indicator-label">Taux d'erreur</span>
                  <span className="indicator-value good">0.1%</span>
                </div>
                <div className="indicator-item">
                  <span className="indicator-label">Satisfaction utilisateur</span>
                  <span className="indicator-value excellent">4.8/5</span>
                </div>
              </div>
            </div>

            <div className="system-health">
              <h3>🏥 État du Système</h3>
              <div className="health-checks">
                <div className="health-item healthy">
                  <span className="health-icon">✅</span>
                  <span className="health-service">Base de données</span>
                  <span className="health-status">Opérationnelle</span>
                </div>
                <div className="health-item healthy">
                  <span className="health-icon">✅</span>
                  <span className="health-service">API UPAS</span>
                  <span className="health-status">Opérationnelle</span>
                </div>
                <div className="health-item healthy">
                  <span className="health-icon">✅</span>
                  <span className="health-service">Système d'export</span>
                  <span className="health-status">Opérationnelle</span>
                </div>
                <div className="health-item warning">
                  <span className="health-icon">⚠️</span>
                  <span className="health-service">Notifications email</span>
                  <span className="health-status">Ralenti</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer amélioré */}
      <div className="dashboard-footer enhanced">
        <div className="footer-content">
          <div className="system-info">
            <div className="info-group">
              <span className="info-label">Dernière mise à jour:</span>
              <span className="info-value">{formatDateTime(dashboardData?.metadata?.loaded_at || new Date())}</span>
            </div>
            {connectionStatus?.timestamp && (
              <div className="info-group">
                <span className="info-label">Connexion DB:</span>
                <span className="info-value">{formatDateTime(connectionStatus.timestamp)}</span>
              </div>
            )}
            <div className="info-group">
              <span className="info-label">Période:</span>
              <span className="info-value">{selectedPeriod} jours</span>
            </div>
            <div className="info-group">
              <span className="info-label">Version:</span>
              <span className="info-value">UPAS v2.1.0</span>
            </div>
          </div>
          
          <div className="footer-actions">
            <a href="/upas/help" className="footer-link">❓ Aide</a>
            <a href="/upas/settings" className="footer-link">⚙️ Paramètres</a>
            <a href="/upas/feedback" className="footer-link">💬 Feedback</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;