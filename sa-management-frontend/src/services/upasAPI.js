// src/services/upasAPI.js - Version complète avec participants et présélection corrigée
import axiosClient from './axiosClient';
import React from 'react';

// ===== CONSTANTES UPAS ÉTENDUES =====
export const UPAS_CONSTANTS = {
  DECISIONS: [
    { value: 'accepté', label: 'Accepté', color: 'success', icon: '✅' },
    { value: 'en_attente', label: 'En attente', color: 'warning', icon: '⏳' },
    { value: 'preselection_oui', label: 'Présélection - Oui', color: 'info', icon: '🎯' },
    { value: 'preselection_non', label: 'Présélection - Non', color: 'secondary', icon: '🎯' },
    { value: 'refusé', label: 'Refusé', color: 'danger', icon: '❌' },
    { value: 'admin a list principal', label: 'Liste Principale', color: 'primary', icon: '👑' },
    { value: 'admin a list d\'attente', label: 'Liste d\'Attente', color: 'info', icon: '⏸️' },
    { value: 'annule', label: 'Annulé', color: 'dark', icon: '🚫' }
  ],
  
  // ✅ STATUTS PRÉSÉLECTION (COMME RÉCEPTION)
  STATUTS_PRESELECTION: [
    { value: 'répondu', label: 'A répondu', color: 'success', icon: '✅' },
    { value: 'ne repond pas', label: 'Ne répond pas', color: 'error', icon: '❌' },
    { value: 'non contacté', label: 'Non contacté', color: 'warning', icon: '⏳' },
    { value: 'en_attente', label: 'En attente', color: 'info', icon: '⏸️' }
  ],
  
  // ✅ NOUVEAUX STATUTS PARTICIPANTS COMPLETS
  STATUTS_PARTICIPANTS: [
    { value: 'répondu', label: 'A répondu', color: 'success', icon: '✅', description: 'Le participant a répondu positivement' },
    { value: 'ne repond pas', label: 'Ne répond pas', color: 'danger', icon: '❌', description: 'Le participant ne répond pas aux appels' },
    { value: 'non contacté', label: 'Non contacté', color: 'warning', icon: '⏳', description: 'Le participant n\'a pas encore été contacté' },
    { value: 'en_attente', label: 'En attente', color: 'info', icon: '⏸️', description: 'En attente de contact' },
    { value: 'oui', label: 'Oui (confirmé)', color: 'success', icon: '✅', description: 'Le participant confirme sa participation' },
    { value: 'non', label: 'Non (décliné)', color: 'danger', icon: '❌', description: 'Le participant décline sa participation' },
    { value: 'refuse', label: 'Refusé', color: 'danger', icon: '🚫', description: 'Le participant a refusé explicitement' },
    { value: 'annule', label: 'Annulé', color: 'dark', icon: '🚫', description: 'Participation annulée' }
  ],
  
  SEXES: [
    { value: 'M', label: 'Masculin' },
    { value: 'F', label: 'Féminin' }
  ],
  
  PRIORITES: [
    { value: 'Normale', label: 'Normale' },
    { value: 'Urgente', label: 'Urgente' },
    { value: 'Très urgente', label: 'Très urgente' }
  ],
  
  COTES: [
    { value: 'unilatéral', label: 'Unilatéral' },
    { value: 'bilatéral', label: 'Bilatéral' }
  ],
  
  PRIX_UNITAIRES: {
    lunettes: 190,
    auditifs: 2050
  }
};

// ===== CONSTANTES ASSISTANCE ÉTENDUES =====
export const ASSISTANCE_CONSTANTS = {
  TYPES: [
    { value: 1, label: 'Lunettes', libelle: 'Lunettes', color: 'primary', icon: '👓' },
    { value: 2, label: 'Appareils Auditifs', libelle: 'Appareils Auditifs', color: 'info', icon: '🦻' },
    { value: 3, label: 'Fauteuils Roulants', libelle: 'Fauteuils Roulants', color: 'warning', icon: '♿' },
    { value: 4, label: 'Cannes Blanches', libelle: 'Cannes Blanches', color: 'dark', icon: '🦯' },
    { value: 5, label: 'Prothèses', libelle: 'Prothèses', color: 'secondary', icon: '🦾' }
  ],
  
  STATUTS: [
    { value: 'active', label: 'Active', color: 'success', icon: '✅' },
    { value: 'inactive', label: 'Inactive', color: 'secondary', icon: '⏸️' },
    { value: 'archivee', label: 'Archivée', color: 'dark', icon: '📦' }
  ],
  
  PRIORITES: [
    { value: 'basse', label: 'Basse', color: 'success' },
    { value: 'normale', label: 'Normale', color: 'primary' },
    { value: 'haute', label: 'Haute', color: 'warning' },
    { value: 'urgente', label: 'Urgente', color: 'danger' }
  ],
  
  ETATS_DON: [
    { value: 'neuf', label: 'Neuf', color: 'success' },
    { value: 'occasion_bon', label: 'Occasion - Bon état', color: 'info' },
    { value: 'occasion_moyen', label: 'Occasion - État moyen', color: 'warning' },
    { value: 'a_reparer', label: 'À réparer', color: 'danger' }
  ],
  
  NATURES_DON: [
    { value: 'don', label: 'Don', color: 'success' },
    { value: 'pret', label: 'Prêt', color: 'info' },
    { value: 'achat', label: 'Achat', color: 'primary' },
    { value: 'subvention', label: 'Subvention', color: 'warning' }
  ],
  
  DUREES_STANDARDS: [
    { value: 7, label: '1 semaine' },
    { value: 14, label: '2 semaines' },
    { value: 30, label: '1 mois' },
    { value: 60, label: '2 mois' },
    { value: 90, label: '3 mois' },
    { value: 180, label: '6 mois' },
    { value: 365, label: '1 an' }
  ]
};

// ===== CACHE LOCAL POUR LES CAMPAGNES =====
class CampagnesCache {
  constructor() {
    this.cache = new Map();
    this.lastFetch = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.cacheDuration;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear() {
    this.cache.clear();
    this.lastFetch = null;
  }
  
  isRecentFetch() {
    return this.lastFetch && (Date.now() - this.lastFetch) < this.cacheDuration;
  }
  
  setLastFetch() {
    this.lastFetch = Date.now();
  }
}

const campagnesCache = new CampagnesCache();

// ===== FONCTIONS UTILITAIRES DE NORMALISATION =====

// Fonction utilitaire pour normaliser les statuts réception
const normalizeReceptionStatus = (statut) => {
  if (!statut) return 'non contacté';
  const normalized = statut.toString().toLowerCase().trim();
  
  const statusMapping = {
    'repondu': 'répondu',
    'répondu': 'répondu',
    'a_repondu': 'répondu',
    'responded': 'répondu',
    'oui': 'répondu',
    'yes': 'répondu',
    
    'ne_repond_pas': 'ne repond pas',
    'ne repond pas': 'ne repond pas',
    'no_response': 'ne repond pas',
    'not_responding': 'ne repond pas',
    'non': 'ne repond pas',
    'no': 'ne repond pas',
    
    'non_contacté': 'non contacté',
    'non contacté': 'non contacté',
    'not_contacted': 'non contacté',
    'pending': 'non contacté',
    
    'en_attente': 'en_attente',
    'waiting': 'en_attente',
    'on_hold': 'en_attente'
  };
  
  return statusMapping[normalized] || 'non contacté';
};

// Fonction utilitaire pour normaliser les statuts présélection
const normalizePreselectionStatus = (statut) => {
  if (!statut) return 'non contacté';
  const normalized = statut.toString().toLowerCase().trim();
  
  const statusMapping = {
    'repondu': 'répondu',
    'répondu': 'répondu',
    'a_repondu': 'répondu',
    'oui': 'répondu',
    'ne_repond_pas': 'ne repond pas',
    'ne repond pas': 'ne repond pas',
    'no_response': 'ne repond pas',
    'non': 'ne repond pas',
    'non_contacté': 'non contacté',
    'non contacté': 'non contacté',
    'not_contacted': 'non contacté',
    'en_attente': 'en_attente',
    'waiting': 'en_attente',
    'pending': 'en_attente'
  };
  
  return statusMapping[normalized] || normalized;
};

// ===== FONCTIONS DE CONSTRUCTION DES LISTES =====

// ✅ FONCTION CORRIGÉE: Construction manuelle des listes de présélection
const constructPreselectionListsManually = async (campagneId) => {
  try {
    console.log('🔧 Construction manuelle des listes de présélection pour campagne', campagneId);
    
    // 1. Récupérer TOUS les participants présélectionnés de cette campagne
    console.log('📡 Chargement des participants présélectionnés...');
    
    let allParticipants = [];
    
    // STRATÉGIE 1: Essayer d'abord avec filtre décision présélection
    try {
      console.log('🎯 Tentative 1: Filtrer par décision présélection');
      const beneficiairesRes = await upasAPI.getBeneficiaires({ 
        campagne_id: campagneId,
        per_page: 1000,
        decision: 'preselection_oui,preselection_non'
      });
      
      if (beneficiairesRes.data?.success && beneficiairesRes.data?.data?.length > 0) {
        allParticipants = beneficiairesRes.data.data;
        console.log('✅ Participants trouvés via filtre décision:', allParticipants.length);
      } else {
        throw new Error('Pas de participants via filtre décision');
      }
    } catch (filterError) {
      console.warn('⚠️ Filtre décision échoué, tentative récupération complète');
      
      // STRATÉGIE 2: Récupérer tous les bénéficiaires et filtrer côté client
      try {
        const allBeneficiairesRes = await upasAPI.getBeneficiaires({ 
          campagne_id: campagneId,
          per_page: 1000
        });
        
        if (allBeneficiairesRes.data?.success) {
          const allBeneficiaires = allBeneficiairesRes.data.data || [];
          
          // Filtrer côté client les participants de présélection
          allParticipants = allBeneficiaires.filter(b => 
            b.decision === 'preselection_oui' || 
            b.decision === 'preselection_non' ||
            // ✅ AJOUT: Inclure aussi ceux avec statuts présélection mais sans décision explicite
            (b.statut_preselection && ['répondu', 'ne repond pas', 'non contacté', 'en_attente'].includes(b.statut_preselection))
          );
          
          console.log('✅ Participants trouvés via filtrage client:', allParticipants.length);
        }
      } catch (allError) {
        console.error('❌ Impossible de charger les bénéficiaires:', allError);
        
        // STRATÉGIE 3: Fallback via API réception si disponible
        try {
          console.log('🎯 Tentative 3: Fallback via API réception');
          const { receptionApi } = await import('./receptionApi');
          
          const receptionResponse = await receptionApi.getParticipants({
            campagne_id: campagneId,
            per_page: 1000
          });
          
          if (receptionResponse.success && receptionResponse.data) {
            // Transformer les participants réception en format UPAS
            allParticipants = receptionResponse.data.map(participant => ({
              ...participant,
              decision: participant.statut === 'répondu' ? 'preselection_oui' : 
                       participant.statut === 'ne repond pas' ? 'preselection_non' : 
                       'preselection_oui',
              statut_preselection: normalizeReceptionStatus(participant.statut),
              date_contact: participant.date_appel || participant.updated_at,
              campagne_id: campagneId
            }));
            
            console.log('✅ Participants trouvés via API réception:', allParticipants.length);
          }
        } catch (receptionError) {
          console.warn('⚠️ API réception non disponible ou échouée:', receptionError.message);
          throw new Error('Impossible de charger les participants de présélection');
        }
      }
    }

    console.log('📊 Total participants présélection récupérés:', allParticipants.length);

    if (allParticipants.length === 0) {
      console.warn('⚠️ Aucun participant de présélection trouvé');
      return {
        data: {
          success: true,
          data: createEmptyPreselectionLists(campagneId)
        }
      };
    }

    // 2. Récupérer les infos de la campagne
    let campagneInfo = null;
    try {
      console.log('📡 Chargement des informations de campagne...');
      const campagneRes = await upasAPI.getCampagne(campagneId);
      campagneInfo = campagneRes.data?.success ? campagneRes.data.data : null;
      console.log('✅ Infos campagne chargées:', campagneInfo?.nom || 'Nom non disponible');
    } catch (campagneError) {
      console.warn('⚠️ Erreur chargement infos campagne:', campagneError.message);
      campagneInfo = { 
        id: campagneId, 
        nom: `Campagne ${campagneId}`,
        type_assistance: 'Non défini',
        statut: 'Active'
      };
    }

    // 3. ✅ CLASSIFICATION DÉTAILLÉE CORRIGÉE PAR DÉCISION ET STATUT DE CONTACT
    console.log('📊 Classification des participants par statut...');
    
    // ✅ PRÉSÉLECTION OUI - Classification par statut de contact
    const preselection_oui_base = allParticipants.filter(p => {
      return p.decision === 'preselection_oui' || 
             (p.statut_preselection === 'répondu') ||
             (!p.decision && p.statut_preselection);
    });
    
    const preselection_oui_repondu = preselection_oui_base.filter(p => {
      const statut = normalizePreselectionStatus(p.statut_preselection);
      return statut === 'répondu';
    });
    
    const preselection_oui_ne_repond_pas = preselection_oui_base.filter(p => {
      const statut = normalizePreselectionStatus(p.statut_preselection);
      return statut === 'ne repond pas';
    });
    
    const preselection_oui_non_contacte = preselection_oui_base.filter(p => {
      const statut = normalizePreselectionStatus(p.statut_preselection);
      return statut === 'non contacté' || !p.statut_preselection;
    });
    
    const preselection_oui_en_attente = preselection_oui_base.filter(p => {
      const statut = normalizePreselectionStatus(p.statut_preselection);
      return statut === 'en_attente';
    });

    // ✅ PRÉSÉLECTION NON - Classification par statut de contact
    const preselection_non_base = allParticipants.filter(p => {
      return p.decision === 'preselection_non' ||
             (p.statut_preselection === 'ne repond pas');
    });
    
    const preselection_non_repondu = preselection_non_base.filter(p => {
      const statut = normalizePreselectionStatus(p.statut_preselection);
      return statut === 'répondu';
    });
    
    const preselection_non_ne_repond_pas = preselection_non_base.filter(p => {
      const statut = normalizePreselectionStatus(p.statut_preselection);
      return statut === 'ne repond pas';
    });
    
    const preselection_non_non_contacte = preselection_non_base.filter(p => {
      const statut = normalizePreselectionStatus(p.statut_preselection);
      return statut === 'non contacté' || !p.statut_preselection;
    });
    
    const preselection_non_en_attente = preselection_non_base.filter(p => {
      const statut = normalizePreselectionStatus(p.statut_preselection);
      return statut === 'en_attente';
    });

    console.log('📊 Classification terminée:', {
      'Total participants': allParticipants.length,
      'Présélection OUI base': preselection_oui_base.length,
      'Présélection OUI - A répondu': preselection_oui_repondu.length,
      'Présélection OUI - Ne répond pas': preselection_oui_ne_repond_pas.length,
      'Présélection OUI - Non contacté': preselection_oui_non_contacte.length,
      'Présélection OUI - En attente': preselection_oui_en_attente.length,
      'Présélection NON base': preselection_non_base.length,
      'Présélection NON - A répondu': preselection_non_repondu.length,
      'Présélection NON - Ne répond pas': preselection_non_ne_repond_pas.length,
      'Présélection NON - Non contacté': preselection_non_non_contacte.length,
      'Présélection NON - En attente': preselection_non_en_attente.length
    });

    // 4. ✅ CALCUL DES STATISTIQUES DÉTAILLÉES
    const totalPreselectionOui = preselection_oui_base.length;
    const totalPreselectionNon = preselection_non_base.length;
    const totalGeneral = allParticipants.length;

    // Statistiques par statut de contact (tous confondus)
    const totalRepondu = preselection_oui_repondu.length + preselection_non_repondu.length;
    const totalNeRepondPas = preselection_oui_ne_repond_pas.length + preselection_non_ne_repond_pas.length;
    const totalNonContacte = preselection_oui_non_contacte.length + preselection_non_non_contacte.length;
    const totalEnAttente = preselection_oui_en_attente.length + preselection_non_en_attente.length;

    // Calcul des taux
    const tauxReponseGlobal = totalGeneral > 0 ? 
      Math.round((totalRepondu / totalGeneral) * 100) : 0;
      
    const tauxReponseOui = totalPreselectionOui > 0 ? 
      Math.round((preselection_oui_repondu.length / totalPreselectionOui) * 100) : 0;
      
    const tauxReponseNon = totalPreselectionNon > 0 ? 
      Math.round((preselection_non_repondu.length / totalPreselectionNon) * 100) : 0;

    const statistics = {
      // Totaux généraux
      total_preselection: totalGeneral,
      total_preselection_oui: totalPreselectionOui,
      total_preselection_non: totalPreselectionNon,

      // Statistiques détaillées présélection OUI
      preselection_oui_stats: {
        total: totalPreselectionOui,
        repondu: preselection_oui_repondu.length,
        ne_repond_pas: preselection_oui_ne_repond_pas.length,
        non_contacte: preselection_oui_non_contacte.length,
        en_attente: preselection_oui_en_attente.length,
        taux_reponse: tauxReponseOui
      },

      // Statistiques détaillées présélection NON
      preselection_non_stats: {
        total: totalPreselectionNon,
        repondu: preselection_non_repondu.length,
        ne_repond_pas: preselection_non_ne_repond_pas.length,
        non_contacte: preselection_non_non_contacte.length,
        en_attente: preselection_non_en_attente.length,
        taux_reponse: tauxReponseNon
      },

      // Statistiques globales par statut
      totaux_par_statut: {
        total_repondu: totalRepondu,
        total_ne_repond_pas: totalNeRepondPas,
        total_non_contacte: totalNonContacte,
        total_en_attente: totalEnAttente
      },

      // Taux globaux
      taux: {
        taux_reponse_global: tauxReponseGlobal,
        taux_preselection_oui: totalGeneral > 0 ? 
          Math.round((totalPreselectionOui / totalGeneral) * 100) : 0,
        taux_preselection_non: totalGeneral > 0 ? 
          Math.round((totalPreselectionNon / totalGeneral) * 100) : 0
      },

      // Métadonnées
      metadata: {
        campagne_id: campagneId,
        generated_at: new Date().toISOString(),
        method: 'manual_construction_corrected',
        source_participants: allParticipants.length,
        strategies_used: [
          allParticipants.length > 0 ? 'upas_filter' : null,
          'client_side_filter',
          'reception_api_fallback'
        ].filter(Boolean)
      }
    };

    // 5. ✅ CONSTRUCTION DE LA RÉPONSE FINALE
    const constructedData = {
      campagne: campagneInfo,
      
      // Listes présélection OUI
      preselection_oui_repondu: preselection_oui_repondu,
      preselection_oui_ne_repond_pas: preselection_oui_ne_repond_pas,
      preselection_oui_non_contacte: preselection_oui_non_contacte,
      preselection_oui_en_attente: preselection_oui_en_attente,
      
      // Listes présélection NON
      preselection_non_repondu: preselection_non_repondu,
      preselection_non_ne_repond_pas: preselection_non_ne_repond_pas,
      preselection_non_non_contacte: preselection_non_non_contacte,
      preselection_non_en_attente: preselection_non_en_attente,
      
      // Statistiques complètes
      statistics: statistics
    };

    console.log('✅ Construction des listes de présélection terminée avec succès');
    console.log('📊 Résumé final:', {
      campagne: campagneInfo?.nom,
      total_participants: totalGeneral,
      preselection_oui: totalPreselectionOui,
      preselection_non: totalPreselectionNon,
      total_repondu: totalRepondu,
      total_ne_repond_pas: totalNeRepondPas,
      taux_reponse_global: `${tauxReponseGlobal}%`
    });

    return {
      data: {
        success: true,
        data: constructedData
      }
    };

  } catch (error) {
    console.error('❌ Erreur construction listes présélection:', error);
    
    // Retourner des données d'urgence en cas d'erreur
    return {
      data: {
        success: false,
        data: createEmptyPreselectionLists(campagneId),
        error: error.message,
        fallback_mode: true
      }
    };
  }
};

// ✅ FONCTION UTILITAIRE: Créer des listes vides
const createEmptyPreselectionLists = (campagneId) => {
  return {
    campagne: { 
      id: campagneId, 
      nom: `Campagne ${campagneId}`,
      type_assistance: 'Non défini',
      statut: 'Inconnue'
    },
    
    // Listes vides
    preselection_oui_repondu: [],
    preselection_oui_ne_repond_pas: [],
    preselection_oui_non_contacte: [],
    preselection_oui_en_attente: [],
    
    preselection_non_repondu: [],
    preselection_non_ne_repond_pas: [],
    preselection_non_non_contacte: [],
    preselection_non_en_attente: [],
    
    // Statistiques vides
    statistics: {
      total_preselection: 0,
      total_preselection_oui: 0,
      total_preselection_non: 0,
      
      preselection_oui_stats: {
        total: 0,
        repondu: 0,
        ne_repond_pas: 0,
        non_contacte: 0,
        en_attente: 0,
        taux_reponse: 0
      },
      
      preselection_non_stats: {
        total: 0,
        repondu: 0,
        ne_repond_pas: 0,
        non_contacte: 0,
        en_attente: 0,
        taux_reponse: 0
      },
      
      totaux_par_statut: {
        total_repondu: 0,
        total_ne_repond_pas: 0,
        total_non_contacte: 0,
        total_en_attente: 0
      },
      
      taux: {
        taux_reponse_global: 0,
        taux_preselection_oui: 0,
        taux_preselection_non: 0
      },
      
      metadata: {
        campagne_id: campagneId,
        generated_at: new Date().toISOString(),
        method: 'empty_fallback',
        error_mode: true
      }
    }
  };
};

// ===== SERVICE API UPAS ÉTENDU =====
export const upasAPI = {
  // ===== DIAGNOSTIC ET INITIALISATION =====
  
  quickStart: async () => {
    try {
      console.log('🚀 Initialisation rapide du système UPAS étendu');
      const response = await axiosClient.post('/upas/quick-start');
      
      if (response.data.success) {
        campagnesCache.clear();
        console.log('✅ Quick start réussi, cache vidé');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Quick start échoué:', error);
      throw error;
    }
  },
  
  testConnection: () => axiosClient.get('/upas/test-connection'),
  getDashboard: () => axiosClient.get('/upas/dashboard'),
  
  diagnoseCampagnesIssue: async () => {
    try {
      const response = await axiosClient.get('/upas/diagnose-campagnes-issue');
      return response;
    } catch (error) {
      console.error('❌ Diagnostic campagnes échoué:', error);
      throw error;
    }
  },
  
  fixCampagnesIssue: async () => {
    try {
      const response = await axiosClient.post('/upas/fix-campagnes-issue');
      if (response.data.success) {
        campagnesCache.clear();
        console.log('✅ Problèmes corrigés, cache vidé');
      }
      return response;
    } catch (error) {
      console.error('❌ Correction campagnes échouée:', error);
      throw error;
    }
  },
  
  createTestData: async () => {
    try {
      console.log('🏗️ Création de données de test');
      const response = await axiosClient.post('/upas/test/create-test-data');
      
      if (response.data.success) {
        campagnesCache.clear();
        console.log('✅ Données de test créées, cache vidé');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Erreur création données test:', error);
      throw error;
    }
  },

  // ===== CHARGEMENT ROBUSTE DES CAMPAGNES =====
  
  getCampagnesUltraRobust: async (params = {}, useCache = true) => {
    const cacheKey = `campagnes_${JSON.stringify(params)}`;
    
    if (useCache) {
      const cached = campagnesCache.get(cacheKey);
      if (cached) {
        console.log('✅ Campagnes chargées depuis le cache');
        return { data: cached };
      }
    }
    
    const strategies = [
      async () => {
        console.log('🎯 Stratégie 1: Route spécialisée pour select');
        const response = await axiosClient.get('/upas/campagnes/for-select', { params });
        if (response.data.success && response.data.data?.length > 0) {
          return response.data;
        }
        throw new Error('Pas de données dans la route spécialisée');
      },
      
      async () => {
        console.log('🎯 Stratégie 2: Route standard');
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            searchParams.append(key, params[key]);
          }
        });
        const response = await axiosClient.get(`/upas/campagnes?${searchParams.toString()}`);
        if (response.data.success && response.data.data?.length > 0) {
          return {
            success: true,
            data: response.data.data,
            metadata: {
              total: response.data.total,
              current_page: response.data.current_page,
              per_page: response.data.per_page,
              last_page: response.data.last_page
            }
          };
        }
        throw new Error('Pas de données dans la route standard');
      },
      
      async () => {
        console.log('🎯 Stratégie 3: Campagnes actives seulement');
        const response = await axiosClient.get('/upas/campagnes/actives');
        if (response.data.success && response.data.data?.length > 0) {
          return response.data;
        }
        throw new Error('Pas de campagnes actives');
      },
      
      async () => {
        console.log('🎯 Stratégie 4: Création automatique');
        await upasAPI.createTestData();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await axiosClient.get('/upas/campagnes/for-select');
        if (response.data.success && response.data.data?.length > 0) {
          return response.data;
        }
        throw new Error('Échec après création automatique');
      }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        const result = await strategies[i]();
        console.log(`✅ Stratégie ${i + 1} réussie`);
        
        campagnesCache.set(cacheKey, result);
        campagnesCache.setLastFetch();
        
        return { data: result };
      } catch (error) {
        console.warn(`⚠️ Stratégie ${i + 1} échouée:`, error.message);
        
        if (i === strategies.length - 1) {
          console.warn('🆘 Toutes les stratégies ont échoué, utilisation des données d\'urgence');
        }
      }
    }
    
    const emergencyData = upasAPI.getEmergencyCampagnesData();
    campagnesCache.set(cacheKey, emergencyData);
    
    return { data: emergencyData };
  },
  
  getCampagnesSimple: async (activesOnly = false) => {
    try {
      const params = activesOnly ? { actives_only: true } : {};
      const response = await upasAPI.getCampagnesUltraRobust(params);
      
      let campagnes = response.data.data || [];
      
      if (activesOnly && !params.actives_only) {
        campagnes = campagnes.filter(c => 
          c.statut === 'Active' || 
          c.statut === 'En cours' || 
          c.is_active === true
        );
      }
      
      return campagnes;
    } catch (error) {
      console.error('❌ Erreur getCampagnesSimple:', error);
      return upasAPI.getEmergencyCampagnes();
    }
  },
  
  // ===== NOUVEAUX PARTICIPANTS RÉCEPTION-STYLE =====
  
  getParticipantsReception: async (campagneId, params = {}) => {
    try {
      console.log('👥 Chargement participants réception pour campagne:', campagneId);
      
      try {
        const allParams = { ...params, campagne_id: campagneId };
        const response = await axiosClient.get('/upas/participants', { params: allParams });
        
        if (response.data.success) {
          console.log('✅ Participants chargés via route UPAS participants');
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route UPAS participants échouée, tentative bénéficiaires');
      }
      
      const beneficiairesParams = {
        ...params,
        campagne_id: campagneId,
        per_page: params.per_page || 50
      };
      
      const response = await upasAPI.getBeneficiaires(beneficiairesParams);
      
      if (response.data.success) {
        const participants = (response.data.data || []).map(beneficiaire => ({
          ...beneficiaire,
          statut: beneficiaire.statut_preselection || beneficiaire.decision || 'non contacté',
          commentaire: beneficiaire.commentaire_preselection || beneficiaire.commentaire || '',
          date_appel: beneficiaire.date_contact || beneficiaire.updated_at,
          nom_complet: `${beneficiaire.prenom || ''} ${beneficiaire.nom || ''}`.trim(),
          campagne_nom: beneficiaire.campagne?.nom || 'N/A'
        }));
        
        return {
          data: {
            success: true,
            data: participants,
            pagination: response.data.pagination || {
              current_page: 1,
              per_page: participants.length,
              total: participants.length,
              last_page: 1
            }
          }
        };
      }
      
      throw new Error('Impossible de charger les participants');
      
    } catch (error) {
      console.error('❌ Erreur chargement participants réception:', error);
      throw error;
    }
  },

  getParticipantReception: async (participantId) => {
    try {
      console.log('👤 Chargement participant réception:', participantId);
      
      try {
        const response = await axiosClient.get(`/upas/participants/${participantId}`);
        if (response.data.success) {
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route UPAS participant échouée, tentative bénéficiaire');
      }
      
      const response = await upasAPI.getBeneficiaire(participantId);
      
      if (response.data.success) {
        const beneficiaire = response.data.data;
        
        const participant = {
          ...beneficiaire,
          statut: beneficiaire.statut_preselection || beneficiaire.decision || 'non contacté',
          commentaire: beneficiaire.commentaire_preselection || beneficiaire.commentaire || '',
          date_appel: beneficiaire.date_contact || beneficiaire.updated_at,
          nom_complet: `${beneficiaire.prenom || ''} ${beneficiaire.nom || ''}`.trim(),
          campagne_nom: beneficiaire.campagne?.nom || 'N/A',
          log_appels: beneficiaire.logs_contact || []
        };
        
        return {
          data: {
            success: true,
            data: participant
          }
        };
      }
      
      throw new Error('Participant non trouvé');
      
    } catch (error) {
      console.error('❌ Erreur chargement participant:', error);
      throw error;
    }
  },

  updateStatutParticipant: async (participantId, statutData) => {
    try {
      console.log('📝 Mise à jour statut participant:', participantId, statutData);
      
      try {
        const response = await axiosClient.put(`/upas/participants/${participantId}/statut`, statutData);
        if (response.data.success) {
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route UPAS statut participant échouée, tentative bénéficiaire');
      }
      
      const updateData = {
        statut_preselection: statutData.statut,
        commentaire_preselection: statutData.commentaire,
        date_contact: new Date().toISOString().split('T')[0],
        heure_contact: new Date().toTimeString().split(' ')[0].substring(0, 5),
        notes_contact: statutData.commentaire
      };
      
      const response = await upasAPI.updateBeneficiaire(participantId, updateData);
      return response;
      
    } catch (error) {
      console.error('❌ Erreur mise à jour statut participant:', error);
      throw error;
    }
  },

  importParticipantsExcel: async (file, campagneId, options = {}) => {
    try {
      console.log('📥 Import Excel participants pour campagne:', campagneId);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('campagne_id', campagneId);
      formData.append('import_type', 'participants');
      
      try {
        const response = await axiosClient.post('/upas/participants/import-excel', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 300000,
          onUploadProgress: options.onProgress || null,
        });
        
        if (response.data.success) {
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route UPAS import participants échouée, tentative bénéficiaires');
      }
      
      const response = await upasAPI.importBeneficiaires(file, campagneId, options);
      return response;
      
    } catch (error) {
      console.error('❌ Erreur import participants Excel:', error);
      throw error;
    }
  },

  exportParticipantsCSV: async (params = {}) => {
    try {
      console.log('📤 Export CSV participants:', params);
      
      try {
        const response = await axiosClient.get('/upas/participants/export-csv', {
          params,
          responseType: 'blob',
          timeout: 120000
        });
        return response;
      } catch (specializedError) {
        console.warn('⚠️ Route UPAS export participants échouée, tentative bénéficiaires');
      }
      
      const response = await upasAPI.exportBeneficiaires(params);
      return response;
      
    } catch (error) {
      console.error('❌ Erreur export participants CSV:', error);
      throw error;
    }
  },

  supprimerParticipant: async (participantId) => {
    try {
      console.log('🗑️ Suppression participant:', participantId);
      
      try {
        const response = await axiosClient.delete(`/upas/participants/${participantId}`);
        if (response.data.success) {
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route UPAS suppression participant échouée, tentative bénéficiaire');
      }
      
      const response = await upasAPI.deleteBeneficiaire(participantId);
      return response;
      
    } catch (error) {
      console.error('❌ Erreur suppression participant:', error);
      throw error;
    }
  },

  getStatistiquesParticipants: async (campagneId) => {
    try {
      console.log('📊 Chargement statistiques participants pour campagne:', campagneId);
      
      try {
        const response = await axiosClient.get(`/upas/campagnes/${campagneId}/participants/statistiques`);
        if (response.data.success) {
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route UPAS stats participants échouée, calcul manuel');
      }
      
      const participantsResponse = await upasAPI.getParticipantsReception(campagneId, { per_page: 1000 });
      
      if (participantsResponse.data.success) {
        const participants = participantsResponse.data.data || [];
        
        const stats = upasUtils.calculateParticipantsStatistics(participants);
        
        return {
          data: {
            success: true,
            data: stats
          }
        };
      }
      
      throw new Error('Impossible de calculer les statistiques participants');
      
    } catch (error) {
      console.error('❌ Erreur statistiques participants:', error);
      throw error;
    }
  },

  // ===== GESTION PRÉSÉLECTION ÉTENDUE =====
  
  getPreselectionParticipants: async (campagneId, params = {}) => {
    try {
      console.log('🎯 Chargement participants présélection pour campagne:', campagneId);
      
      try {
        const response = await axiosClient.get(`/upas/campagnes/${campagneId}/preselection-participants`, { params });
        if (response.data.success) {
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route spécialisée présélection échouée, fallback manuel');
      }
      
      const allParams = {
        ...params,
        campagne_id: campagneId,
        decision: 'preselection_oui,preselection_non',
        per_page: 1000
      };
      
      const response = await upasAPI.getBeneficiaires(allParams);
      
      if (response.data.success) {
        let participants = response.data.data || [];
        
        if (params.exclude_cancelled) {
          participants = participants.filter(p => p.decision !== 'annule');
        }
        
        return {
          data: {
            success: true,
            data: participants,
            metadata: {
              total: participants.length,
              campagne_id: campagneId,
              preselection_mode: true
            }
          }
        };
      }
      
      throw new Error('Impossible de charger les participants présélection');
      
    } catch (error) {
      console.error('❌ Erreur chargement participants présélection:', error);
      throw error;
    }
  },

  annulerPreselection: async (participantIds, raisonAnnulation = '') => {
    try {
      console.log('🚫 Annulation présélection participants:', participantIds);
      
      const ids = Array.isArray(participantIds) ? participantIds : [participantIds];
      
      try {
        const response = await axiosClient.post('/upas/participants/annuler-preselection', {
          participant_ids: ids,
          raison_annulation: raisonAnnulation,
          date_annulation: new Date().toISOString()
        });
        
        if (response.data.success) {
          console.log('✅ Présélection annulée avec succès');
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route spécialisée annulation échouée, fallback action masse');
      }
      
      const response = await upasAPI.actionMasseBeneficiaires({
        beneficiaire_ids: ids,
        action: 'change_decision',
        decision: 'annule',
        commentaire: raisonAnnulation || 'Présélection annulée',
        date_annulation: new Date().toISOString()
      });
      
      if (response.data.success) {
        console.log('✅ Présélection annulée via action masse');
        return response;
      }
      
      throw new Error('Échec de l\'annulation de présélection');
      
    } catch (error) {
      console.error('❌ Erreur annulation présélection:', error);
      throw error;
    }
  },

  restaurerPreselection: async (participantIds, nouvelleDecision = 'preselection_oui') => {
    try {
      console.log('🔄 Restauration présélection participants:', participantIds);
      
      const ids = Array.isArray(participantIds) ? participantIds : [participantIds];
      
      try {
        const response = await axiosClient.post('/upas/participants/restaurer-preselection', {
          participant_ids: ids,
          nouvelle_decision: nouvelleDecision,
          date_restauration: new Date().toISOString()
        });
        
        if (response.data.success) {
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route spécialisée restauration échouée, fallback action masse');
      }
      
      const response = await upasAPI.actionMasseBeneficiaires({
        beneficiaire_ids: ids,
        action: 'change_decision',
        decision: nouvelleDecision,
        commentaire: 'Présélection restaurée',
        date_restauration: new Date().toISOString()
      });
      
      return response;
      
    } catch (error) {
      console.error('❌ Erreur restauration présélection:', error);
      throw error;
    }
  },

  getParticipantsAnnules: async (campagneId, params = {}) => {
    try {
      console.log('🚫 Chargement participants annulés pour campagne:', campagneId);
      
      const allParams = {
        ...params,
        campagne_id: campagneId,
        decision: 'annule',
        per_page: params.per_page || 100
      };
      
      const response = await upasAPI.getBeneficiaires(allParams);
      
      if (response.data.success) {
        const participantsAnnules = (response.data.data || []).map(participant => ({
          ...participant,
          date_annulation_formatee: upasUtils.formatDate(participant.date_annulation),
          peut_etre_restaure: true
        }));
        
        return {
          data: {
            success: true,
            data: participantsAnnules,
            pagination: response.data.pagination
          }
        };
      }
      
      throw new Error('Impossible de charger les participants annulés');
      
    } catch (error) {
      console.error('❌ Erreur chargement participants annulés:', error);
      throw error;
    }
  },

  updatePreselectionStatus: async (participantId, statusData) => {
    try {
      console.log('🎯 Mise à jour statut présélection participant:', participantId, statusData);
      
      if (statusData.statut_preselection === 'annule' || statusData.action === 'annuler') {
        return await upasAPI.annulerPreselection(participantId, statusData.raison_annulation || statusData.commentaire_preselection);
      }
      
      try {
        const response = await axiosClient.put(`/upas/participants/${participantId}/preselection-status`, statusData);
        if (response.data.success) {
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route spécialisée présélection échouée, tentative route bénéficiaire');
      }
      
      const updateData = {
        statut_preselection: statusData.statut_preselection,
        commentaire_preselection: statusData.commentaire_preselection,
        date_contact: statusData.date_contact,
        heure_contact: statusData.heure_contact,
        notes_contact: statusData.notes_contact
      };
      
      const response = await axiosClient.put(`/upas/beneficiaires/${participantId}`, updateData);
      return response;
      
    } catch (error) {
      console.error('❌ Erreur mise à jour statut présélection:', error);
      throw error;
    }
  },

  updateMassPreselectionStatus: async (participantIds, statusData) => {
    try {
      console.log('🎯 Mise à jour en masse statuts présélection:', participantIds.length, statusData);
      
      if (statusData.statut_preselection === 'annule' || statusData.action === 'annuler') {
        return await upasAPI.annulerPreselection(participantIds, statusData.raison_annulation || statusData.commentaire_preselection);
      }
      
      try {
        const response = await axiosClient.post('/upas/participants/mass-preselection-status', {
          participant_ids: participantIds,
          ...statusData
        });
        if (response.data.success) {
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route spécialisée masse présélection échouée, fallback action masse');
      }
      
      const actionData = {
        beneficiaire_ids: participantIds,
        action: 'update_preselection_status',
        statut_preselection: statusData.statut_preselection,
        commentaire_preselection: statusData.commentaire_preselection,
        date_contact: statusData.date_contact,
        heure_contact: statusData.heure_contact,
        notes_contact: statusData.notes_contact
      };
      
      const response = await upasAPI.actionMasseBeneficiaires(actionData);
      return response;
      
    } catch (error) {
      console.error('❌ Erreur mise à jour masse statuts présélection:', error);
      throw error;
    }
  },

  getPreselectionStatistics: async (campagneId) => {
    try {
      console.log('📊 Chargement statistiques présélection pour campagne:', campagneId);
      
      try {
        const response = await axiosClient.get(`/upas/campagnes/${campagneId}/preselection-statistics`);
        if (response.data.success) {
          return response;
        }
      } catch (specializedError) {
        console.warn('⚠️ Route spécialisée stats présélection échouée, calcul manuel');
      }
      
      const participantsResponse = await upasAPI.getPreselectionParticipants(campagneId);
      const participantsAnnulesResponse = await upasAPI.getParticipantsAnnules(campagneId);
      
      if (participantsResponse.data?.success) {
        const participants = participantsResponse.data.data || [];
        const participantsAnnules = participantsAnnulesResponse.data?.data || [];
        
        const stats = {
          total_preselection: participants.length,
          total_annules: participantsAnnules.length,
          total_actifs: participants.length - participantsAnnules.length,
          
          preselection_oui: participants.filter(p => p.decision === 'preselection_oui' && p.decision !== 'annule').length,
          preselection_non: participants.filter(p => p.decision === 'preselection_non' && p.decision !== 'annule').length,
          
          repondu: participants.filter(p => p.statut_preselection === 'répondu' && p.decision !== 'annule').length,
          ne_repond_pas: participants.filter(p => p.statut_preselection === 'ne repond pas' && p.decision !== 'annule').length,
          non_contacte: participants.filter(p => (!p.statut_preselection || p.statut_preselection === 'non contacté') && p.decision !== 'annule').length,
          en_attente: participants.filter(p => p.statut_preselection === 'en_attente' && p.decision !== 'annule').length,
          
          taux_annulation: participants.length > 0 ? Math.round((participantsAnnules.length / participants.length) * 100) : 0,
          taux_reponse_actifs: (() => {
            const actifsContacetes = participants.filter(p => p.decision !== 'annule' && p.statut_preselection && p.statut_preselection !== 'non contacté').length;
            const actifsRepondu = participants.filter(p => p.decision !== 'annule' && p.statut_preselection === 'répondu').length;
            return actifsContacetes > 0 ? Math.round((actifsRepondu / actifsContacetes) * 100) : 0;
          })()
        };
        
        return {
          data: {
            success: true,
            data: stats
          }
        };
      }
      
      throw new Error('Impossible de calculer les statistiques présélection');
      
    } catch (error) {
      console.error('❌ Erreur statistiques présélection:', error);
      throw error;
    }
  },

  exportPreselectionParticipants: async (campagneId, params = {}) => {
    try {
      console.log('📊 Export participants présélection pour campagne:', campagneId);
      
      try {
        const response = await axiosClient.post(`/upas/campagnes/${campagneId}/export-preselection`, params, {
          responseType: 'blob',
          timeout: 120000
        });
        return response;
      } catch (specializedError) {
        console.warn('⚠️ Route spécialisée export présélection échouée, fallback export général');
      }
      
      const exportParams = {
        ...params,
        campagne_id: campagneId,
        decision: params.include_cancelled ? 
          'preselection_oui,preselection_non,annule' : 
          'preselection_oui,preselection_non'
      };
      
      const response = await upasAPI.exportBeneficiaires(exportParams);
      return response;
      
    } catch (error) {
      console.error('❌ Erreur export participants présélection:', error);
      throw error;
    }
  },

  // ===== MÉTHODES DE COMPATIBILITÉ ET EXISTANTES =====
  
  getCampagnes: async (params = {}) => {
    const response = await upasAPI.getCampagnesUltraRobust(params);
    return {
      data: {
        success: true,
        data: response.data.data || [],
        current_page: response.data.metadata?.current_page || 1,
        per_page: response.data.metadata?.per_page || 15,
        total: response.data.metadata?.total || (response.data.data?.length || 0),
        last_page: response.data.metadata?.last_page || 1
      }
    };
  },
  
  getCampagnesForSelect: async (params = {}) => {
    const response = await upasAPI.getCampagnesUltraRobust(params);
    return {
      data: {
        success: true,
        data: response.data.data || [],
        count: response.data.data?.length || 0
      }
    };
  },
  
  getCampagnesActives: async () => {
    const campagnes = await upasAPI.getCampagnesSimple(true);
    return {
      data: {
        success: true,
        data: campagnes,
        count: campagnes.length
      }
    };
  },
  
  // ===== DONNÉES D'URGENCE =====
  
  getEmergencyCampagnesData: () => ({
    success: true,
    data: [
      {
        id: 1,
        value: 1,
        label: 'Campagne d\'urgence - Lunettes',
        nom: 'Campagne d\'urgence - Lunettes',
        description: 'Campagne créée automatiquement par le système de secours',
        statut: 'Active',
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type_assistance_id: 1,
        type_assistance: 'Lunettes',
        lieu: 'Centre de secours - Fès',
        budget: 100000,
        nombre_participants_prevu: 100,
        is_active: true,
        est_active: true,
        est_terminee: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        value: 2,
        label: 'Campagne d\'urgence - Appareils Auditifs',
        nom: 'Campagne d\'urgence - Appareils Auditifs',
        description: 'Campagne de secours pour appareils auditifs',
        statut: 'En cours',
        date_debut: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date_fin: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type_assistance_id: 2,
        type_assistance: 'Appareils Auditifs',
        lieu: 'Centre de secours - Rabat',
        budget: 200000,
        nombre_participants_prevu: 50,
        is_active: true,
        est_active: true,
        est_terminee: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    count: 2,
    metadata: {
      total: 2,
      emergency_mode: true,
      generated_at: new Date().toISOString()
    }
  }),
  
  getEmergencyCampagnes: () => {
    const data = upasAPI.getEmergencyCampagnesData();
    return data.data;
  },
  
  // ===== FORM OPTIONS ROBUSTE ÉTENDU =====
  
  getFormOptions: async () => {
    try {
      console.log('🔄 Chargement des options de formulaire étendues');
      
      try {
        const response = await axiosClient.get('/upas/form-options');
        if (response.data && response.data.success) {
          console.log('✅ Options chargées via route principale');
          return response;
        }
      } catch (error) {
        console.warn('⚠️ Route principale échouée, chargement séparé');
      }
      
      const result = await upasAPI.getAllReferenceDataSeparately();
      return { data: result };
      
    } catch (error) {
      console.error('❌ Erreur critique getFormOptions:', error);
      return { data: upasAPI.getEmergencyFormOptions() };
    }
  },
  
  getAllReferenceDataSeparately: async () => {
    try {
      console.log('🔄 Chargement séparé des données de référence étendues');
      
      const results = await Promise.allSettled([
        upasAPI.getCampagnesUltraRobust(),
        upasAPI.getTypesAssistanceRobust(),
        upasAPI.getEtatDonesRobust(),
        upasAPI.getNatureDonesRobust(),
        upasAPI.getSituationsRobust()
      ]);
      
      const [campagnesResult, typesResult, etatDonesResult, natureDonesResult, situationsResult] = results;
      
      let campagnes = [];
      let campagnes_actives = [];
      let campagnes_terminees = [];
      if (campagnesResult.status === 'fulfilled' && campagnesResult.value.data.success) {
        campagnes = campagnesResult.value.data.data || [];
        campagnes_actives = campagnes.filter(c => 
          c.statut === 'Active' || c.statut === 'En cours' || c.is_active || c.est_active
        );
        campagnes_terminees = campagnes.filter(c => 
          c.est_terminee === true || c.est_terminee === 1 || c.statut === 'Terminée'
        );
        console.log('✅ Campagnes chargées séparément:', campagnes.length);
      } else {
        console.warn('⚠️ Échec chargement campagnes, utilisation secours');
        campagnes = upasAPI.getEmergencyCampagnes();
        campagnes_actives = campagnes;
        campagnes_terminees = [];
      }
      
      let types_assistance = [];
      if (typesResult.status === 'fulfilled' && typesResult.value.data?.success) {
        types_assistance = typesResult.value.data.data || [];
        console.log('✅ Types assistance chargés séparément:', types_assistance.length);
      } else {
        console.warn('⚠️ Échec chargement types, utilisation secours');
        types_assistance = upasAPI.getEmergencyTypesAssistance();
      }
      
      const etat_dones = etatDonesResult.status === 'fulfilled' && etatDonesResult.value.data?.success ? 
        etatDonesResult.value.data.data || [] : [];
      const nature_dones = natureDonesResult.status === 'fulfilled' && natureDonesResult.value.data?.success ? 
        natureDonesResult.value.data.data || [] : [];
      const situations = situationsResult.status === 'fulfilled' && situationsResult.value.data?.success ? 
        situationsResult.value.data.data || [] : [];
      
      const data = {
        campagnes: campagnes,
        campagnes_actives: campagnes_actives,
        campagnes_terminees: campagnes_terminees,
        types_assistance: types_assistance,
        etat_dones: etat_dones,
        nature_dones: nature_dones,
        situations: situations,
        ...upasAPI.getStaticFormOptions()
      };
      
      console.log('✅ Données séparées chargées avec succès:', {
        campagnes: data.campagnes.length,
        campagnes_actives: data.campagnes_actives.length,
        campagnes_terminees: data.campagnes_terminees.length,
        types_assistance: data.types_assistance.length
      });
      
      return {
        success: true,
        data: data
      };
      
    } catch (error) {
      console.error('❌ Erreur chargement séparé:', error);
      return {
        success: false,
        data: upasAPI.getEmergencyFormOptions().data
      };
    }
  },
  
  // ===== CHARGEURS ROBUSTES POUR CHAQUE TYPE DE DONNÉES =====
  
  getTypesAssistanceRobust: async () => {
    try {
      const response = await axiosClient.get('/upas/types-assistance');
      return response;
    } catch (error) {
      console.warn('⚠️ Erreur types assistance:', error);
      return {
        data: {
          success: true,
          data: upasAPI.getEmergencyTypesAssistance()
        }
      };
    }
  },
  
  getEtatDonesRobust: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/etat-dones');
      return response;
    } catch (error) {
      return { data: { success: true, data: [] } };
    }
  },
  
  getNatureDonesRobust: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/nature-dones');
      return response;
    } catch (error) {
      return { data: { success: true, data: [] } };
    }
  },
  
  getSituationsRobust: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/situations');
      return response;
    } catch (error) {
      return { data: { success: true, data: [] } };
    }
  },
  
  // ===== OPTIONS STATIQUES ÉTENDUES =====
  
  getStaticFormOptions: () => ({
    sexes: UPAS_CONSTANTS.SEXES,
    priorites: UPAS_CONSTANTS.PRIORITES,
    decisions: UPAS_CONSTANTS.DECISIONS,
    cotes: UPAS_CONSTANTS.COTES,
    statuts_preselection: UPAS_CONSTANTS.STATUTS_PRESELECTION,
    statuts_participants: UPAS_CONSTANTS.STATUTS_PARTICIPANTS
  }),
  
  getEmergencyFormOptions: () => ({
    success: true,
    data: {
      campagnes: upasAPI.getEmergencyCampagnes(),
      campagnes_actives: upasAPI.getEmergencyCampagnes(),
      campagnes_terminees: [],
      types_assistance: upasAPI.getEmergencyTypesAssistance(),
      etat_dones: [],
      nature_dones: [],
      situations: [],
      ...upasAPI.getStaticFormOptions()
    }
  }),
  
  getEmergencyTypesAssistance: () => [
    { id: 1, value: 1, label: 'Lunettes', libelle: 'Lunettes', description: 'Lunettes de vue et solaires' },
    { id: 2, value: 2, label: 'Appareils Auditifs', libelle: 'Appareils Auditifs', description: 'Appareils auditifs et prothèses' },
    { id: 3, value: 3, label: 'Fauteuils Roulants', libelle: 'Fauteuils Roulants', description: 'Fauteuils roulants manuels et électriques' },
    { id: 4, value: 4, label: 'Cannes Blanches', libelle: 'Cannes Blanches', description: 'Cannes blanches pour aveugles et malvoyants' }
  ],
  
  // ===== MÉTHODES ORIGINALES CONSERVÉES =====
  
  // Campagnes CRUD
  getCampagne: (id) => axiosClient.get(`/upas/campagnes/${id}`),
  createCampagne: async (data) => {
    const response = await axiosClient.post('/upas/campagnes', data);
    if (response.data.success) {
      campagnesCache.clear();
    }
    return response;
  },
  updateCampagne: async (id, data) => {
    const response = await axiosClient.put(`/upas/campagnes/${id}`, data);
    if (response.data.success) {
      campagnesCache.clear();
    }
    return response;
  },
  deleteCampagne: async (id) => {
    const response = await axiosClient.delete(`/upas/campagnes/${id}`);
    if (response.data.success) {
      campagnesCache.clear();
    }
    return response;
  },
  getStatistiquesCampagne: (id) => axiosClient.get(`/upas/campagnes/${id}/statistiques`),
  validerCampagne: (data) => axiosClient.post('/upas/campagnes/valider', data),
  
  // Bénéficiaires
  getBeneficiaires: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });
    return axiosClient.get(`/upas/beneficiaires?${searchParams.toString()}`);
  },
  
  getBeneficiaire: (id) => axiosClient.get(`/upas/beneficiaires/${id}`),
  createBeneficiaire: (data) => axiosClient.post('/upas/beneficiaires', data),
  updateBeneficiaire: (id, data) => axiosClient.put(`/upas/beneficiaires/${id}`, data),
  deleteBeneficiaire: (id) => axiosClient.delete(`/upas/beneficiaires/${id}`),
  actionMasseBeneficiaires: (data) => axiosClient.post('/upas/beneficiaires/actions-masse', data),

  // ===== LISTES GROUPÉES - FONCTIONS CORRIGÉES =====
  
  getCampaignLists: async (campagneId) => {
    try {
      console.log('🔄 getCampaignLists: Chargement des listes pour campagne', campagneId);
      
      const strategies = [
        async () => {
          console.log('🎯 Stratégie 1: Route listes groupées spécialisée');
          const response = await axiosClient.get(`/upas/campagnes/${campagneId}/listes-groupees`);
          if (response.data.success) {
            return response.data;
          }
          throw new Error('Route listes groupées non disponible');
        },
        
        async () => {
          console.log('🎯 Stratégie 2: Route listes standard');
          const response = await axiosClient.get(`/upas/campagnes/${campagneId}/listes`);
          if (response.data.success) {
            return response.data;
          }
          throw new Error('Route listes standard non disponible');
        },
        
        async () => {
          console.log('🎯 Stratégie 3: Route bénéficiaires groupés');
          const response = await axiosClient.get(`/upas/beneficiaires/campagne/${campagneId}/grouped-lists`);
          if (response.data.success) {
            return response.data;
          }
          throw new Error('Route bénéficiaires groupés non disponible');
        },
        
        async () => {
          console.log('🎯 Stratégie 4: Construction manuelle des listes');
          return await upasAPI.buildCampaignListsManually(campagneId);
        }
      ];
      
      for (let i = 0; i < strategies.length; i++) {
        try {
          const result = await strategies[i]();
          console.log(`✅ getCampaignLists: Stratégie ${i + 1} réussie`);
          return { data: result };
        } catch (error) {
          console.warn(`⚠️ getCampaignLists: Stratégie ${i + 1} échouée:`, error.message);
        }
      }
      
      console.warn('🆘 getCampaignLists: Toutes les stratégies ont échoué, données d\'urgence');
      return { 
        data: upasAPI.getEmergencyCampaignLists(campagneId) 
      };
      
    } catch (error) {
      console.error('❌ getCampaignLists: Erreur critique:', error);
      return { 
        data: upasAPI.getEmergencyCampaignLists(campagneId) 
      };
    }
  },
  
  buildCampaignListsManually: async (campagneId) => {
    try {
      console.log('🔧 Construction manuelle des listes pour campagne', campagneId);
      
      const beneficiairesResponse = await upasAPI.getBeneficiaires({ 
        campagne_id: campagneId,
        per_page: 1000
      });
      
      if (!beneficiairesResponse.data.success) {
        throw new Error('Impossible de charger les bénéficiaires');
      }
      
      const beneficiaires = beneficiairesResponse.data.data || [];
      
      let campagne = null;
      try {
        const campagneResponse = await upasAPI.getCampagne(campagneId);
        if (campagneResponse.data.success) {
          campagne = campagneResponse.data.data;
        }
      } catch (error) {
        console.warn('⚠️ Impossible de charger les infos campagne:', error);
      }
      
      const listes = upasAPI.groupBeneficiairesByDecision(beneficiaires);
      const statistics = upasAPI.calculateCampaignStatistics(beneficiaires, listes);
      
      const result = {
        success: true,
        data: {
          campagne: campagne,
          liste_principale: listes.liste_principale,
          liste_attente: listes.liste_attente,
          participants_oui: listes.participants_oui,
          participants_annules: listes.participants_annules || [],
          statistics: statistics,
          metadata: {
            total_beneficiaires: beneficiaires.length,
            manually_built: true,
            built_at: new Date().toISOString()
          }
        }
      };
      
      console.log('✅ Listes construites manuellement:', {
        principale: listes.liste_principale.length,
        attente: listes.liste_attente.length,
        participants: listes.participants_oui.length,
        annules: listes.participants_annules?.length || 0
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Erreur construction manuelle:', error);
      throw error;
    }
  },
  
  groupBeneficiairesByDecision: (beneficiaires) => {
    const listes = {
      liste_principale: [],
      liste_attente: [],
      participants_oui: [],
      participants_annules: [],
      sans_decision: []
    };
    
    beneficiaires.forEach(beneficiaire => {
      const decision = (beneficiaire.decision || '').toLowerCase();
      
      if (decision === 'annule') {
        listes.participants_annules.push(beneficiaire);
        return;
      }
      
      switch (decision) {
        case 'accepté':
        case 'accepte':
        case 'admin a list principal':
          listes.liste_principale.push(beneficiaire);
          break;
          
        case 'en_attente':
        case 'en attente':
        case 'admin a list d\'attente':
        case 'admin a list attente':
          listes.liste_attente.push(beneficiaire);
          break;
          
        case 'participant_oui':
        case 'oui':
        case 'confirme':
          listes.participants_oui.push(beneficiaire);
          break;
          
        default:
          listes.sans_decision.push(beneficiaire);
          break;
      }
      
      if (beneficiaire.a_beneficie && !listes.participants_oui.find(p => p.id === beneficiaire.id)) {
        listes.participants_oui.push(beneficiaire);
      }
    });
    
    return listes;
  },
  
  calculateCampaignStatistics: (beneficiaires, listes) => {
    const stats = {
      total_beneficiaires: beneficiaires.length,
      total_liste_principale: listes.liste_principale.length,
      total_liste_attente: listes.liste_attente.length,
      total_participants_oui: listes.participants_oui.length,
      total_participants_annules: listes.participants_annules?.length || 0,
      total_sans_decision: listes.sans_decision?.length || 0,
      total_actifs: beneficiaires.length - (listes.participants_annules?.length || 0),
      
      par_sexe: {
        hommes: beneficiaires.filter(b => b.sexe === 'M' && b.decision !== 'annule').length,
        femmes: beneficiaires.filter(b => b.sexe === 'F' && b.decision !== 'annule').length
      },
      
      par_age: {
        moins_18: 0,
        entre_18_65: 0,
        plus_65: 0,
        non_defini: 0
      },
      
      credit_estime: {
        liste_principale: 0,
        liste_attente: 0,
        total: 0
      },
      
      taux_acceptation: stats.total_actifs > 0 ? 
        Math.round((listes.liste_principale.length / stats.total_actifs) * 100) : 0,
      taux_attente: stats.total_actifs > 0 ? 
        Math.round((listes.liste_attente.length / stats.total_actifs) * 100) : 0,
      taux_participation: stats.total_actifs > 0 ? 
        Math.round((listes.participants_oui.length / stats.total_actifs) * 100) : 0,
      taux_annulation: beneficiaires.length > 0 ? 
        Math.round(((listes.participants_annules?.length || 0) / beneficiaires.length) * 100) : 0
    };
    
    beneficiaires.filter(b => b.decision !== 'annule').forEach(b => {
      const age = upasUtils.calculateAge(b.date_naissance);
      if (age === null) {
        stats.par_age.non_defini++;
      } else if (age < 18) {
        stats.par_age.moins_18++;
      } else if (age <= 65) {
        stats.par_age.entre_18_65++;
      } else {
        stats.par_age.plus_65++;
      }
    });
    
    const prixMoyenEstime = 1000;
    stats.credit_estime.liste_principale = listes.liste_principale.length * prixMoyenEstime;
    stats.credit_estime.liste_attente = listes.liste_attente.length * prixMoyenEstime;
    stats.credit_estime.total = stats.credit_estime.liste_principale + stats.credit_estime.liste_attente;
    
    return stats;
  },
  
  getEmergencyCampaignLists: (campagneId) => {
    return {
      success: true,
      data: {
        campagne: {
          id: campagneId,
          nom: 'Campagne de secours',
          type_assistance: 'Type non défini',
          statut: 'Active',
          date_debut: new Date().toISOString().split('T')[0],
          date_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          emergency_mode: true
        },
        liste_principale: [],
        liste_attente: [],
        participants_oui: [],
        participants_annules: [],
        statistics: {
          total_beneficiaires: 0,
          total_liste_principale: 0,
          total_liste_attente: 0,
          total_participants_oui: 0,
          total_participants_annules: 0,
          total_actifs: 0,
          taux_acceptation: 0,
          taux_attente: 0,
          taux_participation: 0,
          taux_annulation: 0,
          emergency_mode: true,
          generated_at: new Date().toISOString()
        },
        metadata: {
          emergency_mode: true,
          message: 'Données d\'urgence - aucune liste disponible',
          campagne_id: campagneId
        }
      }
    };
  },

  // ===== FONCTION PRINCIPALE PRÉSÉLECTION =====
  constructPreselectionListsManually: constructPreselectionListsManually,
  
  // ===== ALIASES ET COMPATIBILITÉ =====
  
  getCampagneLists: (campagneId) => upasAPI.getCampaignLists(campagneId),
  getGroupedListsByCampagne: (campagneId) => upasAPI.getCampaignLists(campagneId),
  
  updateDecisionsByCampagne: (campagneId, data) => 
    axiosClient.post(`/upas/beneficiaires/campagne/${campagneId}/update-decisions`, data),
  
  // ===== IMPORT/EXPORT =====
  
  importBeneficiaires: (file, campagneId, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campagne_id', campagneId);
    
    return axiosClient.post('/upas/beneficiaires/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
      onUploadProgress: options.onProgress || null,
    });
  },
  
  validateImportFile: (file, campagneId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campagne_id', campagneId);
    
    return axiosClient.post('/upas/beneficiaires/import/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  
  exportBeneficiaires: (params = {}) => {
    return axiosClient.post('/upas/beneficiaires/export', params, {
      responseType: 'blob',
      timeout: 120000,
    });
  },
  
  // Templates
  getImportTemplate: (campagneId) => axiosClient.get(`/upas/templates/campagne/${campagneId}`),
  getTemplateLunettes: () => axiosClient.get('/upas/templates/lunettes'),
  getTemplateAuditifs: () => axiosClient.get('/upas/templates/appareils-auditifs'),
  
  // Participants (routes originales)
  getParticipants: (campagneId, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });
    return axiosClient.get(`/upas/campagnes/${campagneId}/participants?${searchParams.toString()}`);
  },
  
  changerStatutParticipant: (id, statut, commentaire = '') =>
    axiosClient.put(`/upas/participants/${id}/statut`, { statut, commentaire }),
  
  // Kafalas
  getKafalas: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });
    return axiosClient.get(`/upas/kafalas?${searchParams.toString()}`);
  },
  
  getKafala: (id) => axiosClient.get(`/upas/kafalas/${id}`),
  
  createKafala: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return axiosClient.post('/upas/kafalas', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  updateKafala: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return axiosClient.put(`/upas/kafalas/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  deleteKafala: (id) => axiosClient.delete(`/upas/kafalas/${id}`),

  // PDF Kafala
  checkKafalaPdfExists: async (kafalaId) => {
    try {
      const response = await axiosClient.get(`/upas/kafalas/${kafalaId}/pdf-exists`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la vérification du PDF:', error);
      throw error;
    }
  },

  getKafalaPdfUrl: (kafalaId) => {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://192.168.1.45:8000';
    return `${baseUrl}/api/upas/kafalas/${kafalaId}/pdf`;
  },

  fetchKafalaPdfBlob: async (kafalaId) => {
    try {
      const response = await axiosClient.get(`/upas/kafalas/${kafalaId}/pdf`, {
        responseType: 'blob',
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du PDF:', error);
      throw error;
    }
  },

  // Assistances médicales
  getAssistancesMedicales: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });
    return axiosClient.get(`/upas/assistances?${searchParams.toString()}`);
  },
  
  getAssistances: function(params = {}) {
    return this.getAssistancesMedicales(params);
  },
  
  getAssistance: (id) => axiosClient.get(`/upas/assistances/${id}`),
  createAssistanceMedicale: (data) => axiosClient.post('/upas/assistances', data),
  createAssistance: function(data) {
    return this.createAssistanceMedicale(data);
  },
  updateAssistance: (id, data) => axiosClient.put(`/upas/assistances/${id}`, data),
  deleteAssistance: (id) => axiosClient.delete(`/upas/assistances/${id}`),
  
  // Types d'assistance
  getTypesAssistance: () => axiosClient.get('/upas/types-assistance'),
  createTypeAssistance: (data) => axiosClient.post('/upas/types-assistance', data),
  updateTypeAssistance: (id, data) => axiosClient.put(`/upas/types-assistance/${id}`, data),
  deleteTypeAssistance: (id) => axiosClient.delete(`/upas/types-assistance/${id}`),

  // Données dictionnaire
  getEtatDones: () => axiosClient.get('/admin/dictionary/etat-dones'),
  getNatureDones: () => axiosClient.get('/admin/dictionary/nature-dones'),
  getSituations: () => axiosClient.get('/admin/dictionary/situations'),
  getDetailsTypeAssistance: (typeId) => axiosClient.get(`/admin/dictionary/details-type-assistance/${typeId}`),

  // Recherche
  rechercheGlobale: (terme) => axiosClient.post('/upas/recherche', { terme }),

  // Statistiques
  getStatistiquesLunettes: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });
    return axiosClient.get(`/upas/statistiques/lunettes?${searchParams.toString()}`);
  },
  
  getCreditConsomme: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });
    return axiosClient.get(`/upas/statistiques/credit-consomme?${searchParams.toString()}`);
  },

  // Validation
  validateHeaders: (headers, typeAssistance, campagneId) => 
    axiosClient.post('/upas/validation/headers', { headers, type_assistance: typeAssistance, campagne_id: campagneId }),
  
  getReglesValidation: (type) => axiosClient.get(`/upas/validation/regles/${type}`),

  // Maintenance
  synchroniserDonnees: () => axiosClient.post('/upas/synchroniser'),
  verifierIntegrite: () => axiosClient.get('/upas/verifier-integrite'),
  nettoyageAutomatique: () => axiosClient.post('/upas/nettoyage'),

  // Actions masse décisions
  actionMasseDecisions: (beneficiaireIds, decision, commentaire = '') => 
    axiosClient.post('/upas/beneficiaires/actions-masse', {
      beneficiaire_ids: beneficiaireIds,
      action: 'change_decision',
      decision: decision,
      commentaire: commentaire
    }),

  // Rapports
  getRapportCampagne: (campagneId) => axiosClient.get(`/upas/rapports/${campagneId}`),
  getRapportComparatif: (params) => axiosClient.post('/upas/rapports/comparatif', params),
  exportRapport: (params) => axiosClient.post('/upas/rapports/export', params, {
    responseType: 'blob',
    timeout: 120000
  })
};

// ===== KAFALA API SPÉCIALISÉ =====
export const kafalaAPI = {
  checkPdfExists: async (kafalaId) => {
    try {
      const response = await axiosClient.get(`/upas/kafalas/${kafalaId}/pdf-exists`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la vérification du PDF:', error);
      throw error;
    }
  },

  getPdfUrl: (kafalaId) => {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://192.168.1.45:8000';
    return `${baseUrl}/api/upas/kafalas/${kafalaId}/pdf`;
  },

  fetchPdfBlob: async (kafalaId) => {
    try {
      const response = await axiosClient.get(`/upas/kafalas/${kafalaId}/pdf`, {
        responseType: 'blob',
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du PDF:', error);
      throw error;
    }
  },

  openPdfInNewTab: (kafalaId) => {
    const url = kafalaAPI.getPdfUrl(kafalaId);
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  downloadPdf: async (kafalaId, filename = null) => {
    try {
      const blob = await kafalaAPI.fetchPdfBlob(kafalaId);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `kafala_${kafalaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      throw error;
    }
  }
};

// ===== UTILITAIRES MÉTIER ÉTENDUS =====
export const upasUtils = {
  calculateAge: (dateNaissance) => {
    if (!dateNaissance) return null;
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  },

  isChild: (dateNaissance, ageLimit = 18) => {
    const age = upasUtils.calculateAge(dateNaissance);
    return age !== null && age < ageLimit;
  },

  getAgeGroup: (dateNaissance) => {
    const age = upasUtils.calculateAge(dateNaissance);
    if (age === null) return 'Non définie';
    if (age < 15) return 'Moins de 15 ans';
    if (age <= 64) return '15-64 ans';
    return '65 ans et plus';
  },

  calculateCredit: (beneficiaires, typeAssistance) => {
    let prixUnitaire = 0;
    const typeLibelle = typeAssistance?.toLowerCase() || '';
    
    if (typeLibelle.includes('lunette')) {
      prixUnitaire = UPAS_CONSTANTS.PRIX_UNITAIRES.lunettes;
    } else if (typeLibelle.includes('auditif')) {
      prixUnitaire = UPAS_CONSTANTS.PRIX_UNITAIRES.auditifs;
    }
    
    const ayantBeneficie = Array.isArray(beneficiaires) 
      ? beneficiaires.filter(b => b.a_beneficie && b.decision !== 'annule').length
      : 0;
    
    return ayantBeneficie * prixUnitaire;
  },

  getDecisionInfo: (decision) => {
    const decisionObj = UPAS_CONSTANTS.DECISIONS.find(d => d.value === decision);
    return decisionObj || { value: decision, label: 'Non défini', color: 'secondary', icon: '❓' };
  },

  getPreselectionStatusInfo: (statut) => {
    const statutObj = UPAS_CONSTANTS.STATUTS_PRESELECTION.find(s => s.value === statut);
    return statutObj || { value: statut, label: 'Non défini', color: 'secondary', icon: '❓' };
  },

  getParticipantStatusInfo: (statut) => {
    const statutObj = UPAS_CONSTANTS.STATUTS_PARTICIPANTS.find(s => s.value === statut);
    return statutObj || { value: statut, label: 'Non défini', color: 'secondary', icon: '❓' };
  },

  formatDate: (date, format = 'short') => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const options = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      long: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' },
      time: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    };
    
    return d.toLocaleDateString('fr-FR', options[format] || options.short);
  },

  formatMontant: (montant) => {
    if (montant === null || montant === undefined) return '0 DHS';
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0
    }).format(montant).replace('MAD', 'DHS');
  },

  formatBeneficiaireForDisplay: (beneficiaire) => {
    const age = upasUtils.calculateAge(beneficiaire.date_naissance);
    const decisionInfo = upasUtils.getDecisionInfo(beneficiaire.decision);
    const preselectionStatusInfo = upasUtils.getPreselectionStatusInfo(beneficiaire.statut_preselection);
    
    return {
      ...beneficiaire,
      age: age,
      age_libelle: age ? `${age} ans` : 'Non défini',
      tranche_age: upasUtils.getAgeGroup(beneficiaire.date_naissance),
      sexe_libelle: beneficiaire.sexe === 'M' ? 'Masculin' : 'Féminin',
      enfants_scolarises_libelle: beneficiaire.enfants_scolarises === true ? 'Oui' : 
                                   beneficiaire.enfants_scolarises === false ? 'Non' : 'N/A',
      a_beneficie_libelle: beneficiaire.a_beneficie ? 'A bénéficié' : 'En attente',
      decision_libelle: decisionInfo.label,
      decision_icon: decisionInfo.icon,
      decision_color: decisionInfo.color,
      statut_preselection_libelle: preselectionStatusInfo.label,
      statut_preselection_icon: preselectionStatusInfo.icon,
      statut_preselection_color: preselectionStatusInfo.color,
      is_preselection_participant: beneficiaire.decision === 'preselection_oui' || beneficiaire.decision === 'preselection_non',
      is_cancelled: beneficiaire.decision === 'annule',
      date_naissance_formatee: upasUtils.formatDate(beneficiaire.date_naissance),
      date_creation_formatee: upasUtils.formatDate(beneficiaire.created_at),
      date_contact_formatee: upasUtils.formatDate(beneficiaire.date_contact),
      date_annulation_formatee: upasUtils.formatDate(beneficiaire.date_annulation),
      est_enfant: age !== null && age < 18
    };
  },

  formatParticipantForDisplay: (participant) => {
    const age = upasUtils.calculateAge(participant.date_naissance);
    const statutInfo = upasUtils.getParticipantStatusInfo(participant.statut);
    
    return {
      ...participant,
      age: age,
      age_libelle: age ? `${age} ans` : 'Non défini',
      tranche_age: upasUtils.getAgeGroup(participant.date_naissance),
      sexe_libelle: participant.sexe === 'M' ? 'Masculin' : 'Féminin',
      statut_libelle: statutInfo.label,
      statut_icon: statutInfo.icon,
      statut_color: statutInfo.color,
      nom_complet: `${participant.prenom || ''} ${participant.nom || ''}`.trim(),
      derniere_interaction: participant.date_appel ? 
        upasUtils.formatDate(participant.date_appel, 'time') : 
        'Jamais contacté',
      a_repondu: participant.statut === 'répondu' || participant.statut === 'oui',
      ne_repond_pas: participant.statut === 'ne repond pas' || participant.statut === 'non',
      non_contacte: !participant.statut || participant.statut === 'non contacté',
      est_annule: participant.statut === 'annule',
      date_appel_formatee: upasUtils.formatDate(participant.date_appel),
      date_creation_formatee: upasUtils.formatDate(participant.created_at),
      est_enfant: age !== null && age < 18
    };
  },

  calculateParticipantsStatistics: (participants) => {
    if (!Array.isArray(participants) || participants.length === 0) {
      return {
        total: 0,
        repondu: 0,
        ne_repond_pas: 0,
        non_contacte: 0,
        en_attente: 0,
        oui: 0,
        non: 0,
        refuse: 0,
        annule: 0,
        total_actifs: 0,
        taux_reponse: 0,
        taux_annulation: 0,
        temps_moyen_reponse: null
      };
    }

    const stats = {
      total: participants.length,
      repondu: participants.filter(p => p.statut === 'répondu').length,
      ne_repond_pas: participants.filter(p => p.statut === 'ne repond pas').length,
      non_contacte: participants.filter(p => !p.statut || p.statut === 'non contacté').length,
      en_attente: participants.filter(p => p.statut === 'en_attente').length,
      oui: participants.filter(p => p.statut === 'oui').length,
      non: participants.filter(p => p.statut === 'non').length,
      refuse: participants.filter(p => p.statut === 'refuse').length,
      annule: participants.filter(p => p.statut === 'annule').length
    };

    stats.total_actifs = stats.total - stats.annule;

    const contactes = stats.total_actifs - stats.non_contacte;
    stats.taux_reponse = contactes > 0 ? Math.round(((stats.repondu + stats.oui) / contactes) * 100) : 0;

    stats.taux_annulation = stats.total > 0 ? Math.round((stats.annule / stats.total) * 100) : 0;

    const participantsAvecReponse = participants.filter(p => 
      (p.statut === 'répondu' || p.statut === 'oui') && 
      p.date_appel && p.created_at &&
      p.statut !== 'annule'
    );
    
    if (participantsAvecReponse.length > 0) {
      const totalJours = participantsAvecReponse.reduce((sum, p) => {
        const dateCreation = new Date(p.created_at);
        const dateAppel = new Date(p.date_appel);
        const joursReponse = Math.floor((dateAppel - dateCreation) / (1000 * 60 * 60 * 24));
        return sum + Math.max(0, joursReponse);
      }, 0);
      
      stats.temps_moyen_reponse = Math.round(totalJours / participantsAvecReponse.length);
    }

    return stats;
  },

  groupParticipantsByStatus: (participants) => {
    const groups = {
      repondu: [],
      ne_repond_pas: [],
      non_contacte: [],
      en_attente: [],
      oui: [],
      non: [],
      refuse: [],
      annule: []
    };

    participants.forEach(participant => {
      const statut = participant.statut;
      
      if (groups.hasOwnProperty(statut)) {
        groups[statut].push(participant);
      } else {
        groups.non_contacte.push(participant);
      }
    });

    return groups;
  },

  validateBeneficiaire: (beneficiaire, typeAssistance) => {
    const errors = {};
    const warnings = [];
    
    if (!beneficiaire.nom || beneficiaire.nom.length < 2) {
      errors.nom = 'Le nom doit contenir au moins 2 caractères';
    }
    
    if (!beneficiaire.prenom || beneficiaire.prenom.length < 2) {
      errors.prenom = 'Le prénom doit contenir au moins 2 caractères';
    }
    
    if (!beneficiaire.sexe || !['M', 'F'].includes(beneficiaire.sexe)) {
      errors.sexe = 'Le sexe est obligatoire (M ou F)';
    }
    
    if (!beneficiaire.date_naissance) {
      errors.date_naissance = 'La date de naissance est obligatoire';
    } else {
      const age = upasUtils.calculateAge(beneficiaire.date_naissance);
      if (age === null || age < 0 || age > 120) {
        errors.date_naissance = 'Date de naissance invalide';
      }
    }
    
    if (!beneficiaire.telephone || beneficiaire.telephone.length < 10) {
      errors.telephone = 'Le téléphone doit contenir au moins 10 chiffres';
    }
    
    if (!beneficiaire.adresse || beneficiaire.adresse.length < 10) {
      errors.adresse = 'L\'adresse doit contenir au moins 10 caractères';
    }
    
    const typeLibelle = typeAssistance?.toLowerCase() || '';
    const age = upasUtils.calculateAge(beneficiaire.date_naissance);
    
    if ((typeLibelle.includes('lunette') || typeLibelle.includes('auditif')) && age && age < 18) {
      if (beneficiaire.enfants_scolarises === null || beneficiaire.enfants_scolarises === undefined) {
        errors.enfants_scolarises = 'Le champ "enfants scolarisés" est obligatoire pour les mineurs';
      }
    }
    
    if (typeLibelle.includes('auditif')) {
      if (!beneficiaire.cote || !['unilatéral', 'bilatéral'].includes(beneficiaire.cote)) {
        errors.cote = 'Le côté est obligatoire pour les appareils auditifs (unilatéral/bilatéral)';
      }
    }
    
    if (beneficiaire.decision === 'preselection_oui' || beneficiaire.decision === 'preselection_non') {
      if (beneficiaire.statut_preselection && 
          !UPAS_CONSTANTS.STATUTS_PRESELECTION.find(s => s.value === beneficiaire.statut_preselection)) {
        errors.statut_preselection = 'Statut de présélection invalide';
      }
      
      if (beneficiaire.date_contact) {
        const contactDate = new Date(beneficiaire.date_contact);
        const today = new Date();
        if (contactDate > today) {
          errors.date_contact = 'La date de contact ne peut pas être dans le futur';
        }
      }
    }

    if (beneficiaire.decision === 'annule') {
      if (!beneficiaire.raison_annulation && !beneficiaire.commentaire) {
        warnings.push('Aucune raison d\'annulation spécifiée');
      }
      
      if (beneficiaire.date_annulation) {
        const annulationDate = new Date(beneficiaire.date_annulation);
        const today = new Date();
        if (annulationDate > today) {
          errors.date_annulation = 'La date d\'annulation ne peut pas être dans le futur';
        }
      }
    }
    
    if (!beneficiaire.email) {
      warnings.push('Aucun email renseigné');
    }
    
    if (!beneficiaire.cin) {
      warnings.push('Aucun CIN renseigné');
    }
    
    if (!beneficiaire.decision) {
      warnings.push('Aucune décision définie');
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  },

  validateParticipant: (participant) => {
    const errors = {};
    const warnings = [];
    
    if (!participant.nom || participant.nom.length < 2) {
      errors.nom = 'Le nom doit contenir au moins 2 caractères';
    }
    
    if (!participant.prenom || participant.prenom.length < 2) {
      errors.prenom = 'Le prénom doit contenir au moins 2 caractères';
    }
    
    if (!participant.telephone || participant.telephone.length < 10) {
      errors.telephone = 'Le téléphone doit contenir au moins 10 chiffres';
    }
    
    if (!participant.adresse || participant.adresse.length < 10) {
      errors.adresse = 'L\'adresse doit contenir au moins 10 caractères';
    }
    
    if (participant.statut && !UPAS_CONSTANTS.STATUTS_PARTICIPANTS.find(s => s.value === participant.statut)) {
      errors.statut = 'Statut de participant invalide';
    }
    
    if (participant.date_appel) {
      const appelDate = new Date(participant.date_appel);
      const today = new Date();
      if (appelDate > today) {
        errors.date_appel = 'La date d\'appel ne peut pas être dans le futur';
      }
    }
    
    if (participant.statut === 'annule') {
      if (!participant.commentaire && !participant.raison_annulation) {
        warnings.push('Aucune raison d\'annulation spécifiée');
      }
    }
    
    if (!participant.email) {
      warnings.push('Aucun email renseigné');
    }
    
    if (!participant.cin) {
      warnings.push('Aucun CIN renseigné');
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  },

  filterBeneficiaires: (beneficiaires, filters) => {
    return beneficiaires.filter(beneficiaire => {
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const fullName = `${beneficiaire.nom} ${beneficiaire.prenom}`.toLowerCase();
        const telephone = (beneficiaire.telephone || '').toLowerCase();
        
        if (!fullName.includes(searchTerm) && !telephone.includes(searchTerm)) {
          return false;
        }
      }
      
      if (filters.sexe && beneficiaire.sexe !== filters.sexe) {
        return false;
      }
      
      if (filters.decision && beneficiaire.decision !== filters.decision) {
        return false;
      }
      
      if (filters.statut_preselection && beneficiaire.statut_preselection !== filters.statut_preselection) {
        return false;
      }
      
      if (filters.type_assistance_id && beneficiaire.type_assistance_id != filters.type_assistance_id) {
        return false;
      }
      
      if (filters.campagne_id && beneficiaire.campagne_id != filters.campagne_id) {
        return false;
      }

      if (filters.exclude_cancelled && beneficiaire.decision === 'annule') {
        return false;
      }

      if (filters.only_cancelled && beneficiaire.decision !== 'annule') {
        return false;
      }
      
      if (filters.age_min || filters.age_max) {
        const age = upasUtils.calculateAge(beneficiaire.date_naissance);
        if (age === null) return false;
        
        if (filters.age_min && age < filters.age_min) return false;
        if (filters.age_max && age > filters.age_max) return false;
      }
      
      return true;
    });
  },

  filterParticipants: (participants, filters) => {
    return participants.filter(participant => {
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const fullName = `${participant.nom} ${participant.prenom}`.toLowerCase();
        const telephone = (participant.telephone || '').toLowerCase();
        
        if (!fullName.includes(searchTerm) && !telephone.includes(searchTerm)) {
          return false;
        }
      }
      
      if (filters.statut && participant.statut !== filters.statut) {
        return false;
      }
      
      if (filters.sexe && participant.sexe !== filters.sexe) {
        return false;
      }
      
      if (filters.campagne_id && participant.campagne_id != filters.campagne_id) {
        return false;
      }

      if (filters.exclude_cancelled !== false && participant.statut === 'annule') {
        return false;
      }

      if (filters.only_cancelled && participant.statut !== 'annule') {
        return false;
      }
      
      if (filters.age_min || filters.age_max) {
        const age = upasUtils.calculateAge(participant.date_naissance);
        if (age === null) return false;
        
        if (filters.age_min && age < filters.age_min) return false;
        if (filters.age_max && age > filters.age_max) return false;
      }
      
      return true;
    });
  },

  formatPreselectionParticipantForDisplay: (participant) => {
    const baseFormatted = upasUtils.formatBeneficiaireForDisplay(participant);
    
    return {
      ...baseFormatted,
      derniere_interaction: participant.date_contact ? 
        `${upasUtils.formatDate(participant.date_contact)}${participant.heure_contact ? ' à ' + participant.heure_contact : ''}` : 
        'Jamais contacté',
      a_repondu: participant.statut_preselection === 'répondu',
      ne_repond_pas: participant.statut_preselection === 'ne repond pas',
      non_contacte: !participant.statut_preselection || participant.statut_preselection === 'non contacté',
      est_annule: participant.decision === 'annule',
      peut_etre_restaure: participant.decision === 'annule',
      jours_depuis_contact: participant.date_contact ? 
        Math.floor((new Date() - new Date(participant.date_contact)) / (1000 * 60 * 60 * 24)) : null
    };
  },

  calculatePreselectionStatistics: (participants) => {
    if (!Array.isArray(participants) || participants.length === 0) {
      return {
        total: 0,
        preselection_oui: 0,
        preselection_non: 0,
        repondu: 0,
        ne_repond_pas: 0,
        non_contacte: 0,
        en_attente: 0,
        annule: 0,
        total_actifs: 0,
        taux_reponse: 0,
        taux_annulation: 0,
        temps_moyen_reponse: null
      };
    }

    const stats = {
      total: participants.length,
      preselection_oui: participants.filter(p => p.decision === 'preselection_oui').length,
      preselection_non: participants.filter(p => p.decision === 'preselection_non').length,
      repondu: participants.filter(p => p.statut_preselection === 'répondu').length,
      ne_repond_pas: participants.filter(p => p.statut_preselection === 'ne repond pas').length,
      non_contacte: participants.filter(p => !p.statut_preselection || p.statut_preselection === 'non contacté').length,
      en_attente: participants.filter(p => p.statut_preselection === 'en_attente').length,
      annule: participants.filter(p => p.decision === 'annule').length
    };

    stats.total_actifs = stats.total - stats.annule;

    const contactes = stats.total_actifs - stats.non_contacte;
    stats.taux_reponse = contactes > 0 ? Math.round((stats.repondu / contactes) * 100) : 0;

    stats.taux_annulation = stats.total > 0 ? Math.round((stats.annule / stats.total) * 100) : 0;

    const participantsAvecReponse = participants.filter(p => 
      p.statut_preselection === 'répondu' && 
      p.date_contact && p.created_at &&
      p.decision !== 'annule'
    );
    
    if (participantsAvecReponse.length > 0) {
      const totalJours = participantsAvecReponse.reduce((sum, p) => {
        const dateCreation = new Date(p.created_at);
        const dateContact = new Date(p.date_contact);
        const joursReponse = Math.floor((dateContact - dateCreation) / (1000 * 60 * 60 * 24));
        return sum + Math.max(0, joursReponse);
      }, 0);
      
      stats.temps_moyen_reponse = Math.round(totalJours / participantsAvecReponse.length);
    }

    return stats;
  },

  groupPreselectionParticipantsByStatus: (participants) => {
    const groups = {
      repondu: [],
      ne_repond_pas: [],
      non_contacte: [],
      en_attente: [],
      annule: []
    };

    participants.forEach(participant => {
      if (participant.decision === 'annule') {
        groups.annule.push(participant);
        return;
      }

      const statut = participant.statut_preselection;
      
      if (statut === 'répondu') {
        groups.repondu.push(participant);
      } else if (statut === 'ne repond pas') {
        groups.ne_repond_pas.push(participant);
      } else if (statut === 'en_attente') {
        groups.en_attente.push(participant);
      } else {
        groups.non_contacte.push(participant);
      }
    });

    return groups;
  },

  validatePreselectionStatus: (statusData) => {
    const errors = {};
    
    if (statusData.action === 'annuler' || statusData.statut_preselection === 'annule') {
      if (!statusData.raison_annulation && !statusData.commentaire_preselection) {
        errors.raison_annulation = 'Une raison d\'annulation est requise';
      }
      
      if (statusData.date_annulation) {
        const annulationDate = new Date(statusData.date_annulation);
        const today = new Date();
        
        if (isNaN(annulationDate.getTime())) {
          errors.date_annulation = 'Date d\'annulation invalide';
        } else if (annulationDate > today) {
          errors.date_annulation = 'La date d\'annulation ne peut pas être dans le futur';
        }
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    }
    
    if (!statusData.statut_preselection) {
      errors.statut_preselection = 'Le statut de présélection est obligatoire';
    } else {
      const validStatuts = UPAS_CONSTANTS.STATUTS_PRESELECTION.map(s => s.value);
      if (!validStatuts.includes(statusData.statut_preselection)) {
        errors.statut_preselection = 'Statut de présélection invalide';
      }
    }
    
    if (statusData.date_contact) {
      const contactDate = new Date(statusData.date_contact);
      const today = new Date();
      
      if (isNaN(contactDate.getTime())) {
        errors.date_contact = 'Date de contact invalide';
      } else if (contactDate > today) {
        errors.date_contact = 'La date de contact ne peut pas être dans le futur';
      }
    }
    
    if (statusData.heure_contact) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(statusData.heure_contact)) {
        errors.heure_contact = 'Format d\'heure invalide (HH:MM)';
      }
    }
    
    if (statusData.commentaire_preselection && statusData.commentaire_preselection.length > 500) {
      errors.commentaire_preselection = 'Le commentaire ne peut pas dépasser 500 caractères';
    }
    
    if (statusData.notes_contact && statusData.notes_contact.length > 1000) {
      errors.notes_contact = 'Les notes ne peuvent pas dépasser 1000 caractères';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  validateCancellationData: (cancellationData) => {
    const errors = {};
    
    if (!cancellationData.raison_annulation && !cancellationData.commentaire) {
      errors.raison_annulation = 'Une raison d\'annulation est requise';
    }
    
    if (cancellationData.raison_annulation && cancellationData.raison_annulation.length > 500) {
      errors.raison_annulation = 'La raison d\'annulation ne peut pas dépasser 500 caractères';
    }
    
    if (cancellationData.date_annulation) {
      const annulationDate = new Date(cancellationData.date_annulation);
      const today = new Date();
      
      if (isNaN(annulationDate.getTime())) {
        errors.date_annulation = 'Date d\'annulation invalide';
      } else if (annulationDate > today) {
        errors.date_annulation = 'La date d\'annulation ne peut pas être dans le futur';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// ===== UTILITAIRES ASSISTANCE ÉTENDUS =====
export const assistanceUtils = {
  formatTypeAssistanceForDisplay: (typeAssistance) => {
    const typeInfo = ASSISTANCE_CONSTANTS.TYPES.find(t => t.value === typeAssistance.id || t.label === typeAssistance.libelle);
    return {
      ...typeAssistance,
      color: typeInfo?.color || 'secondary',
      icon: typeInfo?.icon || '❓',
      statut_color: typeAssistance.statut === 'active' ? 'success' : 
                   typeAssistance.statut === 'inactive' ? 'secondary' : 'dark'
    };
  },

  getTypeAssistanceIcon: (typeId) => {
    const type = ASSISTANCE_CONSTANTS.TYPES.find(t => t.value === typeId);
    return type?.icon || '❓';
  },

  getTypeAssistanceColor: (typeId) => {
    const type = ASSISTANCE_CONSTANTS.TYPES.find(t => t.value === typeId);
    return type?.color || 'secondary';
  },

  formatStatutDisplay: (statut) => {
    const statutInfo = ASSISTANCE_CONSTANTS.STATUTS.find(s => s.value === statut);
    return statutInfo || { value: statut, label: 'Non défini', color: 'secondary', icon: '❓' };
  },

  validateTypeAssistance: (typeAssistance) => {
    const errors = {};
    const warnings = [];

    if (!typeAssistance.libelle || typeAssistance.libelle.length < 2) {
      errors.libelle = 'Le libellé doit contenir au moins 2 caractères';
    }

    if (!typeAssistance.description || typeAssistance.description.length < 5) {
      errors.description = 'La description doit contenir au moins 5 caractères';
    }

    if (!typeAssistance.statut) {
      errors.statut = 'Le statut est obligatoire';
    } else if (!ASSISTANCE_CONSTANTS.STATUTS.find(s => s.value === typeAssistance.statut)) {
      errors.statut = 'Statut invalide';
    }

    if (typeAssistance.prix_unitaire && typeAssistance.prix_unitaire < 0) {
      errors.prix_unitaire = 'Le prix unitaire ne peut pas être négatif';
    }

    if (!typeAssistance.couleur) {
      warnings.push('Aucune couleur définie pour l\'affichage');
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  },

  generateTypeCode: (libelle) => {
    if (!libelle) return '';
    return libelle
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 10);
  },

  calculateMontantTotal: (typesAssistance, beneficiaires = []) => {
    let total = 0;
    
    typesAssistance.forEach(type => {
      const beneficiairesType = beneficiaires.filter(b => 
        b.type_assistance_id === type.id && 
        b.a_beneficie && 
        b.decision !== 'annule'
      );
      
      if (type.prix_unitaire) {
        total += beneficiairesType.length * type.prix_unitaire;
      }
    });
    
    return total;
  },

  getStatistiquesTypes: (typesAssistance, beneficiaires = []) => {
    return typesAssistance.map(type => {
      const beneficiairesType = beneficiaires.filter(b => 
        b.type_assistance_id === type.id && 
        b.decision !== 'annule'
      );
      const ayantBeneficie = beneficiairesType.filter(b => b.a_beneficie);
      
      return {
        ...type,
        nombre_beneficiaires: beneficiairesType.length,
        nombre_ayant_beneficie: ayantBeneficie.length,
        montant_total: type.prix_unitaire ? ayantBeneficie.length * type.prix_unitaire : 0,
        taux_reussite: beneficiairesType.length > 0 ? 
          Math.round((ayantBeneficie.length / beneficiairesType.length) * 100) : 0
      };
    });
  },

  calculateStatistics: (assistances, typesAssistance = []) => {
    if (!Array.isArray(assistances)) {
      return {
        total: 0,
        par_type: {},
        par_statut: {},
        montant_total: 0,
        taux_completion: 0
      };
    }

    const stats = {
      total: assistances.length,
      par_type: {},
      par_statut: {
        active: 0,
        inactive: 0,
        archivee: 0,
        terminee: 0,
        en_cours: 0,
        annule: 0
      },
      montant_total: 0,
      montant_moyen: 0,
      taux_completion: 0,
      taux_annulation: 0,
      assistances_terminees: 0,
      assistances_en_cours: 0,
      assistances_annulees: 0,
      duree_moyenne: 0
    };

    let somme_durees = 0;
    let nb_durees = 0;

    typesAssistance.forEach(type => {
      stats.par_type[type.id] = {
        id: type.id,
        nom: type.libelle || type.label,
        count: 0,
        montant_total: 0,
        taux_completion: 0,
        taux_annulation: 0,
        color: type.color || 'secondary',
        icon: type.icon || '❓'
      };
    });

    assistances.forEach(assistance => {
      const typeId = assistance.type_assistance_id;
      if (stats.par_type[typeId]) {
        stats.par_type[typeId].count++;
        
        if (assistance.montant && assistance.statut !== 'annule') {
          stats.par_type[typeId].montant_total += assistance.montant;
        }
      }

      const statut = assistance.statut || 'en_cours';
      if (stats.par_statut.hasOwnProperty(statut)) {
        stats.par_statut[statut]++;
      } else {
        stats.par_statut[statut] = 1;
      }

      if (assistance.montant && !isNaN(assistance.montant) && assistance.statut !== 'annule') {
        stats.montant_total += parseFloat(assistance.montant);
      }

      if (assistance.statut === 'annule') {
        stats.assistances_annulees++;
      } else if (assistance.assistance_terminee || assistance.statut === 'terminee') {
        stats.assistances_terminees++;
      } else {
        stats.assistances_en_cours++;
      }

      if (assistance.date_debut && assistance.date_fin && assistance.statut !== 'annule') {
        const debut = new Date(assistance.date_debut);
        const fin = new Date(assistance.date_fin);
        const duree = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));
        
        if (duree > 0) {
          somme_durees += duree;
          nb_durees++;
        }
      }
    });

    const totalActif = stats.total - stats.assistances_annulees;
    if (totalActif > 0) {
      stats.montant_moyen = Math.round(stats.montant_total / totalActif);
      stats.taux_completion = Math.round((stats.assistances_terminees / totalActif) * 100);
    }

    if (stats.total > 0) {
      stats.taux_annulation = Math.round((stats.assistances_annulees / stats.total) * 100);
    }

    if (nb_durees > 0) {
      stats.duree_moyenne = Math.round(somme_durees / nb_durees);
    }

    Object.values(stats.par_type).forEach(typeStats => {
      if (typeStats.count > 0) {
        const termineesType = assistances.filter(a => 
          a.type_assistance_id === typeStats.id && 
          (a.assistance_terminee || a.statut === 'terminee')
        ).length;
        
        const annuleesType = assistances.filter(a => 
          a.type_assistance_id === typeStats.id && 
          a.statut === 'annule'
        ).length;
        
        const actifType = typeStats.count - annuleesType;
        
        typeStats.taux_completion = actifType > 0 ? Math.round((termineesType / actifType) * 100) : 0;
        typeStats.taux_annulation = typeStats.count > 0 ? Math.round((annuleesType / typeStats.count) * 100) : 0;
      }
    });

    stats.par_type_array = Object.values(stats.par_type).filter(type => type.count > 0);

    return stats;
  }
};

// ===== HOOKS REACT PERSONNALISÉS ÉTENDUS =====
export const upasHooks = {
  useCampagnes: (options = {}) => {
    const { 
      activesOnly = false, 
      autoLoad = true, 
      useCache = true,
      onError = null
    } = options;
    
    const [campagnes, setCampagnes] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [lastUpdate, setLastUpdate] = React.useState(null);
    
    const loadCampagnes = React.useCallback(async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 Hook useCampagnes: Chargement des campagnes');
        
        const toutes = await upasAPI.getCampagnesSimple(false);
        const actives = toutes.filter(c => 
          c.statut === 'Active' || 
          c.statut === 'En cours' || 
          c.is_active === true
        );
        
        setCampagnes(activesOnly ? actives : toutes);
        setLastUpdate(new Date().toISOString());
        
        console.log('✅ Hook useCampagnes: Campagnes chargées', {
          total: toutes.length,
          actives: actives.length,
          affichees: activesOnly ? actives.length : toutes.length
        });
        
      } catch (err) {
        console.error('❌ Hook useCampagnes: Erreur', err);
        setError(err.message);
        
        const emergency = upasAPI.getEmergencyCampagnes();
        setCampagnes(emergency);
        
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    }, [activesOnly, onError]);
    
    React.useEffect(() => {
      if (autoLoad) {
        loadCampagnes();
      }
    }, [autoLoad, loadCampagnes]);
    
    return {
      campagnes,
      loading,
      error,
      lastUpdate,
      reload: loadCampagnes,
      clearCache: () => campagnesCache.clear(),
      isEmpty: campagnes.length === 0,
      hasData: campagnes.length > 0,
      count: campagnes.length
    };
  },

  useParticipants: (campagneId, options = {}) => {
    const { 
      autoLoad = true,
      excludeCancelled = true,
      onError = null 
    } = options;
    
    const [participants, setParticipants] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [statistics, setStatistics] = React.useState(null);
    const [lastUpdate, setLastUpdate] = React.useState(null);
    
    const loadParticipants = React.useCallback(async () => {
      if (!campagneId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 Hook useParticipants: Chargement participants campagne', campagneId);
        
        const params = { 
          exclude_cancelled: excludeCancelled,
          per_page: 1000 
        };
        
        const response = await upasAPI.getParticipantsReception(campagneId, params);
        
        if (response.data.success) {
          const participantsData = response.data.data || [];
          const participantsFormatted = participantsData.map(p => 
            upasUtils.formatParticipantForDisplay(p)
          );
          
          setParticipants(participantsFormatted);
          
          const stats = upasUtils.calculateParticipantsStatistics(participantsFormatted);
          setStatistics(stats);
          
          setLastUpdate(new Date().toISOString());
          
          console.log('✅ Hook useParticipants: Participants chargés', {
            campagne: campagneId,
            total: participantsFormatted.length,
            actifs: stats.total_actifs,
            annules: stats.annule
          });
        } else {
          throw new Error('Réponse invalide du serveur');
        }
        
      } catch (err) {
        console.error('❌ Hook useParticipants: Erreur', err);
        setError(err.message);
        
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    }, [campagneId, excludeCancelled, onError]);
    
    React.useEffect(() => {
      if (autoLoad && campagneId) {
        loadParticipants();
      }
    }, [autoLoad, loadParticipants]);
    
    const updateParticipantStatus = React.useCallback(async (participantId, statusData) => {
      try {
        await upasAPI.updateStatutParticipant(participantId, statusData);
        await loadParticipants();
        return true;
      } catch (error) {
        console.error('❌ Erreur mise à jour statut participant:', error);
        setError(error.message);
        return false;
      }
    }, [loadParticipants]);

    const cancelParticipants = React.useCallback(async (participantIds, reason) => {
      try {
        await upasAPI.annulerPreselection(participantIds, reason);
        await loadParticipants();
        return true;
      } catch (error) {
        console.error('❌ Erreur annulation participants:', error);
        setError(error.message);
        return false;
      }
    }, [loadParticipants]);

    const restoreParticipants = React.useCallback(async (participantIds, newDecision = 'preselection_oui') => {
      try {
        await upasAPI.restaurerPreselection(participantIds, newDecision);
        await loadParticipants();
        return true;
      } catch (error) {
        console.error('❌ Erreur restauration participants:', error);
        setError(error.message);
        return false;
      }
    }, [loadParticipants]);
    
    return {
      participants,
      statistics,
      loading,
      error,
      lastUpdate,
      reload: loadParticipants,
      updateParticipantStatus,
      cancelParticipants,
      restoreParticipants,
      isEmpty: participants.length === 0,
      hasData: participants.length > 0,
      count: participants.length,
      getByStatus: (statut) => participants.filter(p => p.statut === statut),
      getActive: () => participants.filter(p => !p.est_annule),
      getCancelled: () => participants.filter(p => p.est_annule),
      getResponded: () => participants.filter(p => p.a_repondu),
      getNonResponded: () => participants.filter(p => p.ne_repond_pas),
      getNonContacted: () => participants.filter(p => p.non_contacte)
    };
  },

  useTypesAssistance: (options = {}) => {
    const { autoLoad = true, onError = null } = options;
    
    const [typesAssistance, setTypesAssistance] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [lastUpdate, setLastUpdate] = React.useState(null);
    
    const loadTypesAssistance = React.useCallback(async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 Hook useTypesAssistance: Chargement des types');
        
        const response = await upasAPI.getTypesAssistance();
        
        if (response.data.success) {
          const typesFormatted = response.data.data.map(type => 
            assistanceUtils.formatTypeAssistanceForDisplay(type)
          );
          setTypesAssistance(typesFormatted);
          setLastUpdate(new Date().toISOString());
          
          console.log('✅ Hook useTypesAssistance: Types chargés', {
            count: typesFormatted.length
          });
        } else {
          throw new Error('Réponse invalide du serveur');
        }
        
      } catch (err) {
        console.error('❌ Hook useTypesAssistance: Erreur', err);
        setError(err.message);
        
        const emergency = upasAPI.getEmergencyTypesAssistance().map(type => 
          assistanceUtils.formatTypeAssistanceForDisplay(type)
        );
        setTypesAssistance(emergency);
        
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    }, [onError]);
    
    React.useEffect(() => {
      if (autoLoad) {
        loadTypesAssistance();
      }
    }, [autoLoad, loadTypesAssistance]);
    
    return {
      typesAssistance,
      loading,
      error,
      lastUpdate,
      reload: loadTypesAssistance,
      isEmpty: typesAssistance.length === 0,
      hasData: typesAssistance.length > 0,
      count: typesAssistance.length,
      getByStatut: (statut) => typesAssistance.filter(t => t.statut === statut),
      getActifs: () => typesAssistance.filter(t => t.statut === 'active'),
      getInactifs: () => typesAssistance.filter(t => t.statut === 'inactive')
    };
  },

  useAssistanceActions: () => {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    
    const createAssistance = React.useCallback(async (data) => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await upasAPI.createAssistance(data);
        if (response.data.success) {
          console.log('✅ Assistance créée avec succès');
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Erreur lors de la création');
        }
      } catch (err) {
        console.error('❌ Erreur création assistance:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []);
    
    const updateAssistance = React.useCallback(async (id, data) => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await upasAPI.updateAssistance(id, data);
        if (response.data.success) {
          console.log('✅ Assistance mise à jour avec succès');
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Erreur lors de la mise à jour');
        }
      } catch (err) {
        console.error('❌ Erreur mise à jour assistance:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []);
    
    const deleteAssistance = React.useCallback(async (id) => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await upasAPI.deleteAssistance(id);
        if (response.data.success) {
          console.log('✅ Assistance supprimée avec succès');
          return true;
        } else {
          throw new Error(response.data.message || 'Erreur lors de la suppression');
        }
      } catch (err) {
        console.error('❌ Erreur suppression assistance:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []);
    
    const clearError = React.useCallback(() => {
      setError(null);
    }, []);
    
    return {
      loading,
      error,
      clearError,
      createAssistance,
      updateAssistance,
      deleteAssistance,
      create: createAssistance,
      update: updateAssistance,
      delete: deleteAssistance
    };
  }
};

// ===== FONCTIONS DE TEST ET DEBUGGING ÉTENDUES =====

export const testCampaignLists = async (campagneId = 1) => {
  try {
    console.log('🧪 Test getCampaignLists avec campagne:', campagneId);
    
    const result = await upasAPI.getCampaignLists(campagneId);
    
    console.log('✅ Test réussi:', {
      success: result.data.success,
      campagne: result.data.data?.campagne?.nom,
      liste_principale: result.data.data?.liste_principale?.length || 0,
      liste_attente: result.data.data?.liste_attente?.length || 0,
      participants_oui: result.data.data?.participants_oui?.length || 0,
      participants_annules: result.data.data?.participants_annules?.length || 0
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Test échoué:', error);
    throw error;
  }
};

export const testPreselectionLists = async (campagneId = 1) => {
  try {
    console.log('🧪 Test présélection avec campagne:', campagneId);
    
    const participantsResult = await upasAPI.getPreselectionParticipants(campagneId);
    const statsResult = await upasAPI.getPreselectionStatistics(campagneId);
    const participantsAnnulesResult = await upasAPI.getParticipantsAnnules(campagneId);
    
    console.log('✅ Test présélection réussi:', {
      participants: participantsResult.data?.data?.length || 0,
      participants_annules: participantsAnnulesResult.data?.data?.length || 0,
      statistiques: statsResult.data?.data || {},
      success: participantsResult.data?.success && statsResult.data?.success
    });
    
    return {
      participants: participantsResult,
      participants_annules: participantsAnnulesResult,
      statistics: statsResult
    };
    
  } catch (error) {
    console.error('❌ Test présélection échoué:', error);
    throw error;
  }
};

export const testCancellationFunctions = async (campagneId = 1) => {
  try {
    console.log('🧪 Test fonctions d\'annulation pour campagne:', campagneId);
    
    const functions = [
      'annulerPreselection',
      'restaurerPreselection',
      'getParticipantsAnnules',
      'updatePreselectionStatus',
      'updateMassPreselectionStatus'
    ];
    
    const results = {};
    
    functions.forEach(funcName => {
      const exists = typeof upasAPI[funcName] === 'function';
      results[funcName] = {
        exists,
        status: exists ? '✅ Disponible' : '❌ Manquante'
      };
      console.log(`${exists ? '✅' : '❌'} upasAPI.${funcName}: ${exists ? 'Disponible' : 'Manquante'}`);
    });
    
    const utilsFunctions = [
      'validateCancellationData',
      'calculateParticipantsStatistics',
      'formatParticipantForDisplay',
      'filterParticipants'
    ];
    
    console.log('\n🛠️ Fonctions utilitaires:');
    utilsFunctions.forEach(funcName => {
      const exists = typeof upasUtils[funcName] === 'function';
      results[`utils_${funcName}`] = {
        exists,
        status: exists ? '✅ Disponible' : '❌ Manquante'
      };
      console.log(`${exists ? '✅' : '❌'} upasUtils.${funcName}: ${exists ? 'Disponible' : 'Manquante'}`);
    });
    
    const allApiAvailable = functions.every(funcName => typeof upasAPI[funcName] === 'function');
    const allUtilsAvailable = utilsFunctions.every(funcName => typeof upasUtils[funcName] === 'function');
    
    console.log('\n📊 Résumé du test:');
    console.log(`API: ${allApiAvailable ? '✅' : '❌'} ${allApiAvailable ? 'Toutes disponibles' : 'Fonctions manquantes'}`);
    console.log(`Utils: ${allUtilsAvailable ? '✅' : '❌'} ${allUtilsAvailable ? 'Toutes disponibles' : 'Fonctions manquantes'}`);
    console.log(`Global: ${allApiAvailable && allUtilsAvailable ? '✅ PRÊT' : '❌ INCOMPLET'}`);
    
    return {
      results,
      summary: {
        api_ready: allApiAvailable,
        utils_ready: allUtilsAvailable,
        overall_ready: allApiAvailable && allUtilsAvailable
      }
      };
    
  } catch (error) {
    console.error('❌ Test fonctions annulation échoué:', error);
    throw error;
  }
};

// Fonction de diagnostic pour vérifier toutes les fonctions de listes
export const diagnoseCampaignListsFunctions = () => {
  const functions = [
    'getCampaignLists',
    'getCampagneLists', 
    'getGroupedListsByCampagne',
    'buildCampaignListsManually',
    'groupBeneficiairesByDecision',
    'calculateCampaignStatistics',
    'getEmergencyCampaignLists',
    // ✅ FONCTIONS PRÉSÉLECTION
    'getPreselectionParticipants',
    'updatePreselectionStatus',
    'updateMassPreselectionStatus',
    'getPreselectionStatistics',
    'exportPreselectionParticipants',
    // ✅ NOUVELLES FONCTIONS PARTICIPANTS
    'getParticipantsReception',
    'getParticipantReception',
    'updateStatutParticipant',
    'importParticipantsExcel',
    'exportParticipantsCSV',
    'supprimerParticipant',
    'getStatistiquesParticipants',
    // ✅ NOUVELLES FONCTIONS ANNULATION
    'annulerPreselection',
    'restaurerPreselection',
    'getParticipantsAnnules'
  ];
  
  console.log('🔍 Diagnostic des fonctions de listes de campagne, participants et présélection:');
  
  functions.forEach(funcName => {
    const exists = typeof upasAPI[funcName] === 'function';
    console.log(`${exists ? '✅' : '❌'} upasAPI.${funcName}: ${exists ? 'Disponible' : 'Manquante'}`);
  });
  
  return {
    allFunctionsAvailable: functions.every(funcName => typeof upasAPI[funcName] === 'function'),
    availableFunctions: functions.filter(funcName => typeof upasAPI[funcName] === 'function'),
    missingFunctions: functions.filter(funcName => typeof upasAPI[funcName] !== 'function')
  };
};

// ✅ DIAGNOSTIC COMPLET PRÉSÉLECTION ET PARTICIPANTS
export const diagnoseParticipantsFunctions = () => {
  const participantsFunctions = [
    'getParticipantsReception',
    'getParticipantReception', 
    'updateStatutParticipant',
    'importParticipantsExcel',
    'exportParticipantsCSV',
    'supprimerParticipant',
    'getStatistiquesParticipants'
  ];

  const preselectionFunctions = [
    'updatePreselectionStatus',
    'getPreselectionParticipants',
    'updateMassPreselectionStatus',
    'getPreselectionStatistics',
    'exportPreselectionParticipants',
    'annulerPreselection',
    'restaurerPreselection',
    'getParticipantsAnnules'
  ];

  const utilsFunctions = [
    'formatParticipantForDisplay',
    'calculateParticipantsStatistics',
    'groupParticipantsByStatus',
    'validateParticipant',
    'filterParticipants',
    'formatPreselectionParticipantForDisplay',
    'calculatePreselectionStatistics',
    'groupPreselectionParticipantsByStatus',
    'validatePreselectionStatus',
    'validateCancellationData',
    'getParticipantStatusInfo',
    'getPreselectionStatusInfo'
  ];

  console.log('🎯 Diagnostic complet des fonctions participants et présélection:');
  
  console.log('\n👥 Fonctions Participants API:');
  participantsFunctions.forEach(funcName => {
    const exists = typeof upasAPI[funcName] === 'function';
    console.log(`${exists ? '✅' : '❌'} upasAPI.${funcName}: ${exists ? 'Disponible' : 'Manquante'}`);
  });

  console.log('\n🎯 Fonctions Présélection API:');
  preselectionFunctions.forEach(funcName => {
    const exists = typeof upasAPI[funcName] === 'function';
    console.log(`${exists ? '✅' : '❌'} upasAPI.${funcName}: ${exists ? 'Disponible' : 'Manquante'}`);
  });

  console.log('\n🛠️ Fonctions utilitaires:');
  utilsFunctions.forEach(funcName => {
    const exists = typeof upasUtils[funcName] === 'function';
    console.log(`${exists ? '✅' : '❌'} upasUtils.${funcName}: ${exists ? 'Disponible' : 'Manquante'}`);
  });

  const allParticipantsAvailable = participantsFunctions.every(funcName => typeof upasAPI[funcName] === 'function');
  const allPreselectionAvailable = preselectionFunctions.every(funcName => typeof upasAPI[funcName] === 'function');
  const allUtilsAvailable = utilsFunctions.every(funcName => typeof upasUtils[funcName] === 'function');

  console.log('\n📊 Résumé du diagnostic:');
  console.log(`Participants API: ${allParticipantsAvailable ? '✅ Complètes' : '❌ Incomplètes'} (${participantsFunctions.filter(f => typeof upasAPI[f] === 'function').length}/${participantsFunctions.length})`);
  console.log(`Présélection API: ${allPreselectionAvailable ? '✅ Complètes' : '❌ Incomplètes'} (${preselectionFunctions.filter(f => typeof upasAPI[f] === 'function').length}/${preselectionFunctions.length})`);
  console.log(`Utils: ${allUtilsAvailable ? '✅ Complètes' : '❌ Incomplètes'} (${utilsFunctions.filter(f => typeof upasUtils[f] === 'function').length}/${utilsFunctions.length})`);

  return {
    participants: {
      allAvailable: allParticipantsAvailable,
      available: participantsFunctions.filter(funcName => typeof upasAPI[funcName] === 'function'),
      missing: participantsFunctions.filter(funcName => typeof upasAPI[funcName] !== 'function')
    },
    preselection: {
      allAvailable: allPreselectionAvailable,
      available: preselectionFunctions.filter(funcName => typeof upasAPI[funcName] === 'function'),
      missing: preselectionFunctions.filter(funcName => typeof upasAPI[funcName] !== 'function')
    },
    utils: {
      allAvailable: allUtilsAvailable,
      available: utilsFunctions.filter(funcName => typeof upasUtils[funcName] === 'function'),
      missing: utilsFunctions.filter(funcName => typeof upasUtils[funcName] !== 'function')
    },
    overall: {
      allAvailable: allParticipantsAvailable && allPreselectionAvailable && allUtilsAvailable,
      readyForProduction: allParticipantsAvailable && allPreselectionAvailable && allUtilsAvailable,
      score: Math.round(((participantsFunctions.filter(f => typeof upasAPI[f] === 'function').length + 
                        preselectionFunctions.filter(f => typeof upasAPI[f] === 'function').length + 
                        utilsFunctions.filter(f => typeof upasUtils[f] === 'function').length) / 
                       (participantsFunctions.length + preselectionFunctions.length + utilsFunctions.length)) * 100)
    }
  };
};

// ===== EXPORT DE COMPATIBILITÉ ÉTENDU =====

// S'assurer que toutes les fonctions sont bien exportées
const safeUpasAPI = {
  ...upasAPI,
  // S'assurer que getCampaignLists existe toujours
  getCampaignLists: upasAPI.getCampaignLists || upasAPI.getCampagneLists || upasAPI.getGroupedListsByCampagne,
  
  // ✅ S'assurer que les fonctions participants existent
  getParticipantsReception: upasAPI.getParticipantsReception,
  getParticipantReception: upasAPI.getParticipantReception,
  updateStatutParticipant: upasAPI.updateStatutParticipant,
  importParticipantsExcel: upasAPI.importParticipantsExcel,
  exportParticipantsCSV: upasAPI.exportParticipantsCSV,
  supprimerParticipant: upasAPI.supprimerParticipant,
  getStatistiquesParticipants: upasAPI.getStatistiquesParticipants,
  
  // ✅ S'assurer que les fonctions présélection existent
  updatePreselectionStatus: upasAPI.updatePreselectionStatus,
  getPreselectionParticipants: upasAPI.getPreselectionParticipants,
  updateMassPreselectionStatus: upasAPI.updateMassPreselectionStatus,
  getPreselectionStatistics: upasAPI.getPreselectionStatistics,
  exportPreselectionParticipants: upasAPI.exportPreselectionParticipants,
  
  // ✅ S'assurer que les fonctions d'annulation existent
  annulerPreselection: upasAPI.annulerPreselection,
  restaurerPreselection: upasAPI.restaurerPreselection,
  getParticipantsAnnules: upasAPI.getParticipantsAnnules,
  
  // Fonctions de test étendues
  test: {
    testCampaignLists,
    testPreselectionLists,
    testCancellationFunctions,
    diagnoseCampaignListsFunctions,
    diagnoseParticipantsFunctions
  }
};

// ✅ NOUVELLES FONCTIONS UTILITAIRES GLOBALES

/**
 * Fonction utilitaire pour calculer le numéro de semaine
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * ✅ NOUVELLE FONCTION: Utilitaire de formatage de listes pour affichage
 */
export const formatListsForDisplay = (lists, options = {}) => {
  const { includeStatistics = true, includeCancelled = true } = options;
  
  const formatted = {
    liste_principale: (lists.liste_principale || []).map(item => 
      upasUtils.formatBeneficiaireForDisplay(item)
    ),
    liste_attente: (lists.liste_attente || []).map(item => 
      upasUtils.formatBeneficiaireForDisplay(item)
    ),
    participants_oui: (lists.participants_oui || []).map(item => 
      upasUtils.formatBeneficiaireForDisplay(item)
    )
  };
  
  // ✅ NOUVEAU: Inclure les annulés si demandé
  if (includeCancelled && lists.participants_annules) {
    formatted.participants_annules = lists.participants_annules.map(item => 
      upasUtils.formatBeneficiaireForDisplay(item)
    );
  }
  
  // Inclure les statistiques si demandé
  if (includeStatistics && lists.statistics) {
    formatted.statistics = lists.statistics;
  }
  
  // Ajouter des métadonnées utiles
  formatted.metadata = {
    total_liste_principale: formatted.liste_principale.length,
    total_liste_attente: formatted.liste_attente.length,
    total_participants_oui: formatted.participants_oui.length,
    total_participants_annules: formatted.participants_annules?.length || 0,
    total_global: formatted.liste_principale.length + 
                  formatted.liste_attente.length + 
                  formatted.participants_oui.length + 
                  (formatted.participants_annules?.length || 0),
    formatted_at: new Date().toISOString()
  };
  
  return formatted;
};

/**
 * ✅ NOUVELLE FONCTION: Créer un résumé exécutif des listes
 */
export const createListsSummary = (lists, campagne = null) => {
  const summary = {
    campagne: campagne ? {
      id: campagne.id,
      nom: campagne.nom,
      type_assistance: campagne.type_assistance,
      statut: campagne.statut
    } : null,
    
    totaux: {
      liste_principale: (lists.liste_principale || []).length,
      liste_attente: (lists.liste_attente || []).length,
      participants_oui: (lists.participants_oui || []).length,
      participants_annules: (lists.participants_annules || []).length,
      total_beneficiaires: 0,
      total_actifs: 0
    },
    
    statistiques: {
      taux_acceptation: 0,
      taux_participation: 0,
      taux_annulation: 0,
      credit_estime: 0
    },
    
    alertes: [],
    
    generated_at: new Date().toISOString()
  };
  
  // Calculer les totaux
  summary.totaux.total_beneficiaires = summary.totaux.liste_principale + 
                                        summary.totaux.liste_attente + 
                                        summary.totaux.participants_oui + 
                                        summary.totaux.participants_annules;
  
  summary.totaux.total_actifs = summary.totaux.total_beneficiaires - summary.totaux.participants_annules;
  
  // Calculer les taux
  if (summary.totaux.total_actifs > 0) {
    summary.statistiques.taux_acceptation = Math.round((summary.totaux.liste_principale / summary.totaux.total_actifs) * 100);
    summary.statistiques.taux_participation = Math.round((summary.totaux.participants_oui / summary.totaux.total_actifs) * 100);
  }
  
  if (summary.totaux.total_beneficiaires > 0) {
    summary.statistiques.taux_annulation = Math.round((summary.totaux.participants_annules / summary.totaux.total_beneficiaires) * 100);
  }
  
  // Créer des alertes basées sur les données
  if (summary.statistiques.taux_annulation > 20) {
    summary.alertes.push({
      type: 'warning',
      message: `Taux d'annulation élevé: ${summary.statistiques.taux_annulation}%`,
      action: 'Analyser les raisons des annulations'
    });
  }
  
  if (summary.totaux.liste_attente > summary.totaux.liste_principale) {
    summary.alertes.push({
      type: 'info',
      message: 'Plus de participants en liste d\'attente qu\'en liste principale',
      action: 'Considérer l\'augmentation de la capacité'
    });
  }
  
  if (summary.totaux.total_actifs === 0) {
    summary.alertes.push({
      type: 'error',
      message: 'Aucun participant actif trouvé',
      action: 'Vérifier les données de la campagne'
    });
  }
  
  return summary;
};

/**
 * ✅ NOUVELLE FONCTION: Exporter des données au format CSV
 */
export const exportToCsv = (data, filename, columns = null) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }
  
  // Déterminer les colonnes à inclure
  const columnsToUse = columns || Object.keys(data[0]);
  
  // Créer les en-têtes CSV
  const headers = columnsToUse.join(',');
  
  // Créer les lignes de données
  const rows = data.map(item => {
    return columnsToUse.map(column => {
      let value = item[column];
      
      // Gérer les valeurs null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Gérer les objets et tableaux
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      // Échapper les guillemets et encapsuler si nécessaire
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      
      return value;
    }).join(',');
  });
  
  // Combiner headers et rows
  const csv = [headers, ...rows].join('\n');
  
  // Créer et télécharger le fichier
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * ✅ NOUVELLE FONCTION: Utilitaire de recherche avancée
 */
export const advancedSearch = (items, searchTerm, searchFields = []) => {
  if (!searchTerm || !Array.isArray(items)) {
    return items;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  return items.filter(item => {
    // Si pas de champs spécifiés, rechercher dans tous les champs texte
    if (searchFields.length === 0) {
      const itemString = JSON.stringify(item).toLowerCase();
      return itemString.includes(term);
    }
    
    // Rechercher dans les champs spécifiés
    return searchFields.some(field => {
      const fieldValue = getNestedValue(item, field);
      if (fieldValue === null || fieldValue === undefined) {
        return false;
      }
      
      const valueString = String(fieldValue).toLowerCase();
      return valueString.includes(term);
    });
  });
};

/**
 * Utilitaire pour obtenir une valeur imbriquée d'un objet
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

// ===== CONSTANTES DE COMPATIBILITÉ =====

// ✅ CONSTANTES ÉTENDUES POUR COMPATIBILITÉ AVEC LES COMPOSANTS
export const PARTICIPANT_STATUS_COLORS = {
  'répondu': 'success',
  'ne repond pas': 'danger', 
  'non contacté': 'warning',
  'en_attente': 'info',
  'oui': 'success',
  'non': 'danger',
  'refuse': 'danger',
  'annule': 'dark'
};

export const PARTICIPANT_STATUS_ICONS = {
  'répondu': '✅',
  'ne repond pas': '❌',
  'non contacté': '⏳',
  'en_attente': '⏸️',
  'oui': '✅',
  'non': '❌', 
  'refuse': '🚫',
  'annule': '🚫'
};

// ✅ NOUVELLES CONSTANTES D'ACTIONS
export const PARTICIPANT_ACTIONS = {
  UPDATE_STATUS: 'update_status',
  CANCEL: 'cancel',
  RESTORE: 'restore',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import'
};

export const BULK_ACTIONS = {
  UPDATE_STATUS: 'bulk_update_status',
  CANCEL: 'bulk_cancel',
  RESTORE: 'bulk_restore',
  DELETE: 'bulk_delete',
  EXPORT: 'bulk_export',
  ASSIGN_CAMPAIGN: 'bulk_assign_campaign'
};

// ===== FONCTIONS PRÉSÉLECTION LISTES ÉTENDUES =====

/**
 * ✅ NOUVELLE FONCTION: Obtenir toutes les listes de présélection d'une campagne
 */
export const getPreselectionLists = async (campagneId) => {
  try {
    console.log('🎯 Chargement des listes de présélection pour campagne:', campagneId);
    
    const strategies = [
      async () => {
        console.log('🎯 Stratégie 1: Route listes présélection spécialisée');
        const response = await axiosClient.get(`/upas/campagnes/${campagneId}/preselection-lists`);
        if (response.data.success) {
          return response.data;
        }
        throw new Error('Route listes présélection non disponible');
      },
      
      async () => {
        console.log('🎯 Stratégie 2: Construction manuelle des listes présélection');
        return await constructPreselectionListsManually(campagneId);
      }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        const result = await strategies[i]();
        console.log(`✅ getPreselectionLists: Stratégie ${i + 1} réussie`);
        return { data: result };
      } catch (error) {
        console.warn(`⚠️ getPreselectionLists: Stratégie ${i + 1} échouée:`, error.message);
      }
    }
    
    console.warn('🆘 getPreselectionLists: Toutes les stratégies ont échoué, données d\'urgence');
    return { 
      data: createEmptyPreselectionLists(campagneId) 
    };
    
  } catch (error) {
    console.error('❌ getPreselectionLists: Erreur critique:', error);
    return { 
      data: createEmptyPreselectionLists(campagneId) 
    };
  }
};

/**
 * ✅ NOUVELLE FONCTION: Calculer les statistiques complètes d'une campagne avec présélection
 */
export const calculateCompleteCampaignStats = async (campagneId) => {
  try {
    console.log('📊 Calcul des statistiques complètes pour campagne:', campagneId);
    
    const [
      listsResult,
      preselectionResult,
      participantsResult
    ] = await Promise.allSettled([
      upasAPI.getCampaignLists(campagneId),
      getPreselectionLists(campagneId),
      upasAPI.getParticipantsReception(campagneId, { per_page: 1000 })
    ]);
    
    const stats = {
      campagne_id: campagneId,
      generated_at: new Date().toISOString(),
      
      // Statistiques générales
      lists: {
        available: listsResult.status === 'fulfilled',
        data: listsResult.status === 'fulfilled' ? listsResult.value.data.data : null
      },
      
      // Statistiques présélection
      preselection: {
        available: preselectionResult.status === 'fulfilled',
        data: preselectionResult.status === 'fulfilled' ? preselectionResult.value.data.data : null
      },
      
      // Statistiques participants
      participants: {
        available: participantsResult.status === 'fulfilled',
        data: participantsResult.status === 'fulfilled' ? 
          upasUtils.calculateParticipantsStatistics(participantsResult.value.data.data || []) : null
      },
      
      // Résumé global
      summary: {
        total_beneficiaires: 0,
        total_preselection: 0,
        total_participants: 0,
        total_actifs: 0,
        total_annules: 0,
        taux_progression: 0, // Progression bénéficiaires -> présélection -> participants
        taux_reussite: 0     // Participants confirmés / Total présélection
      },
      
      // Alertes et recommandations
      alerts: [],
      recommendations: []
    };
    
    // Calculer le résumé global
    if (stats.lists.available && stats.lists.data?.statistics) {
      stats.summary.total_beneficiaires = stats.lists.data.statistics.total_beneficiaires || 0;
    }
    
    if (stats.preselection.available && stats.preselection.data?.statistics) {
      stats.summary.total_preselection = stats.preselection.data.statistics.total_preselection || 0;
      stats.summary.total_annules += stats.preselection.data.statistics.total_participants_annules || 0;
    }
    
    if (stats.participants.available && stats.participants.data) {
      stats.summary.total_participants = stats.participants.data.total || 0;
      stats.summary.total_annules += stats.participants.data.annule || 0;
    }
    
    stats.summary.total_actifs = stats.summary.total_beneficiaires - stats.summary.total_annules;
    
    // Calculer les taux
    if (stats.summary.total_beneficiaires > 0) {
      stats.summary.taux_progression = stats.summary.total_preselection > 0 ? 
        Math.round((stats.summary.total_preselection / stats.summary.total_beneficiaires) * 100) : 0;
    }
    
    if (stats.summary.total_preselection > 0) {
      stats.summary.taux_reussite = stats.summary.total_participants > 0 ? 
        Math.round((stats.summary.total_participants / stats.summary.total_preselection) * 100) : 0;
    }
    
    // Générer des alertes
    if (stats.summary.taux_progression < 30) {
      stats.alerts.push({
        level: 'warning',
        message: 'Faible taux de progression vers la présélection',
        value: `${stats.summary.taux_progression}%`
      });
    }
    
    if (stats.summary.taux_reussite < 50) {
      stats.alerts.push({
        level: 'warning', 
        message: 'Faible taux de réussite des participants',
        value: `${stats.summary.taux_reussite}%`
      });
    }
    
    // Générer des recommandations
    if (stats.summary.total_annules > (stats.summary.total_beneficiaires * 0.1)) {
      stats.recommendations.push({
        priority: 'high',
        action: 'Analyser les causes d\'annulation',
        reason: 'Taux d\'annulation supérieur à 10%'
      });
    }
    
    if (stats.summary.taux_progression > 80) {
      stats.recommendations.push({
        priority: 'medium',
        action: 'Optimiser la capacité de présélection',
        reason: 'Forte demande détectée'
      });
    }
    
    console.log('✅ Statistiques complètes calculées:', {
      beneficiaires: stats.summary.total_beneficiaires,
      preselection: stats.summary.total_preselection,
      participants: stats.summary.total_participants,
      progression: `${stats.summary.taux_progression}%`,
      reussite: `${stats.summary.taux_reussite}%`
    });
    
    return {
      success: true,
      data: stats
    };
    
  } catch (error) {
    console.error('❌ Erreur calcul statistiques complètes:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

// ===== EXPORT FINAL =====

export { safeUpasAPI };

// Export par défaut pour compatibilité
export default {
  upasAPI: safeUpasAPI,
  kafalaAPI,
  upasUtils,
  assistanceUtils,
  upasHooks,
  // ✅ NOUVELLES EXPORTATIONS
  UPAS_CONSTANTS,
  ASSISTANCE_CONSTANTS,
  PARTICIPANT_STATUS_COLORS,
  PARTICIPANT_STATUS_ICONS,
  PARTICIPANT_ACTIONS,
  BULK_ACTIONS,
  formatListsForDisplay,
  createListsSummary,
  exportToCsv,
  advancedSearch,
  getPreselectionLists,
  calculateCompleteCampaignStats,
  constructPreselectionListsManually,
  // Tests et diagnostics
  testCampaignLists,
  testPreselectionLists,
  testCancellationFunctions,
  diagnoseCampaignListsFunctions,
  diagnoseParticipantsFunctions
};