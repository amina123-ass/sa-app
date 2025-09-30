import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { upasAPI } from '../../services/upasAPI';
import { handleApiError } from '../../services/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import * as XLSX from 'xlsx';
import './BeneficiairesPage.css';
// ✅ IMPORT DES COMPOSANTS
import BeneficiaireForm from '../../components/BeneficiaireForm';
import ImportExcelForm from '../../components/ImportExcelForm';

const BeneficiairesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // États principaux
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  
  // États pour les listes groupées ET présélection
  const [campaignLists, setCampaignLists] = useState(null);
  const [preselectionLists, setPreselectionLists] = useState(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingPreselection, setLoadingPreselection] = useState(false);
  
  // ✅ ÉTATS POUR PARTICIPANTS RÉCEPTION OPTIMISÉS
  const [participantsReception, setParticipantsReception] = useState([]);
  const [loadingParticipantsReception, setLoadingParticipantsReception] = useState(false);
  const [participantsCampagneInfo, setParticipantsCampagneInfo] = useState(null);
  
  // ✅ NOUVEAUX ÉTATS POUR LES QUATRE LISTES AVEC PARTICIPANTS OPTIMISÉS
  const [listesDecisions, setListesDecisions] = useState({
    liste_participants: [],     // Participants réception avec colonnes conditionnelles
    liste_principale: [],       // Décision "accepte"
    liste_attente: [],          // Décision "en_attente" 
    liste_rejetes: []          // Décision "refuse"
  });
  const [loadingListesDecisions, setLoadingListesDecisions] = useState(false);
  const [showCampaignListsView, setShowCampaignListsView] = useState(false);
  const [activeListFilter, setActiveListFilter] = useState('liste_participants');
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    sexe: searchParams.get('sexe') || '',
    type_assistance_id: searchParams.get('type_assistance_id') || '',
    campagne_id: searchParams.get('campagne_id') || '',
    hors_campagne: searchParams.get('hors_campagne') || '',
    a_beneficie: searchParams.get('a_beneficie') || '',
    enfants_scolarises: searchParams.get('enfants_scolarises') || '',
    cote: searchParams.get('cote') || '',
    decision: searchParams.get('decision') || '',
    statut_preselection: searchParams.get('statut_preselection') || '',
    page: parseInt(searchParams.get('page')) || 1,
    per_page: parseInt(searchParams.get('per_page')) || 15,
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_dir: searchParams.get('sort_dir') || 'desc'
  });
  
  // ✅ OPTIONS CORRIGÉES AVEC VALEURS SERVEUR
  const [formOptions, setFormOptions] = useState({
    types_assistance: [],
    campagnes: [],
    campagnes_actives: [],
    campagnes_terminees: [],
    sexes: [
      { value: 'M', label: 'Masculin' },
      { value: 'F', label: 'Féminin' }
    ],
    // ✅ DÉCISIONS CORRIGÉES - Utiliser les valeurs exactes du serveur
    decisions: [
      { value: 'accepte', label: '✅ Accepté' },           // SANS accent !
      { value: 'en_attente', label: '⏳ En attente' },
      { value: 'refuse', label: '❌ Refusé' }              // SANS accent !
    ],
    // ✅ STATUTS PARTICIPANTS RÉCEPTION OPTIMISÉS
    statuts_reception: [
      { value: 'en_attente', label: '⏳ En attente', color: 'warning', icon: '⏳' },
      { value: 'oui', label: '✅ Oui - Confirmé', color: 'success', icon: '✅' },
      { value: 'non', label: '❌ Non - Refusé', color: 'danger', icon: '❌' },
      { value: 'refuse', label: '🚫 Refusé', color: 'danger', icon: '🚫' },
      { value: 'répondu', label: '📞 A répondu', color: 'info', icon: '📞' },
      { value: 'ne repond pas', label: '📵 Ne répond pas', color: 'secondary', icon: '📵' },
      { value: 'non contacté', label: '📋 Non contacté', color: 'info', icon: '📋' }
    ],
    statuts_preselection: [
      { value: 'repondu', label: '✅ A répondu', color: 'success', icon: '✅' },
      { value: 'ne_repond_pas', label: '❌ Ne répond pas', color: 'error', icon: '❌' },
      { value: 'non_contacte', label: '⏳ Non contacté', color: 'warning', icon: '⏳' },
      { value: 'en_attente', label: '⏸️ En attente', color: 'info', icon: '⏸️' }
    ],
    // ✅ MAPPING CORRIGÉ POUR AFFICHAGE - Gère toutes les variantes
    decisions_display: {
      'accepte': { icon: '✅', label: 'Accepté', class: 'badge-accepted' },
      'accepté': { icon: '✅', label: 'Accepté', class: 'badge-accepted' }, // Avec accent pour affichage
      'en_attente': { icon: '⏳', label: 'En attente', class: 'badge-pending' },
      'preselection_oui': { icon: '🎯', label: 'Présélection - Oui', class: 'badge-preselection-oui' },
      'preselection_non': { icon: '🎯', label: 'Présélection - Non', class: 'badge-preselection-non' },
      'refuse': { icon: '❌', label: 'Refusé', class: 'badge-refused' },
      'refusé': { icon: '❌', label: 'Refusé', class: 'badge-refused' }, // Avec accent pour affichage
      'null': { icon: '❓', label: 'Non défini', class: 'badge-undefined' },
      'undefined': { icon: '❓', label: 'Non défini', class: 'badge-undefined' },
      '': { icon: '❓', label: 'Non défini', class: 'badge-undefined' }
    },
    statuts_preselection_display: {
      'repondu': { icon: '✅', label: 'A répondu', class: 'badge-responded' },
      'ne_repond_pas': { icon: '❌', label: 'Ne répond pas', class: 'badge-no-response' },
      'non_contacte': { icon: '⏳', label: 'Non contacté', class: 'badge-not-contacted' },
      'en_attente': { icon: '⏸️', label: 'En attente', class: 'badge-waiting' },
      'null': { icon: '❓', label: 'Non défini', class: 'badge-undefined' },
      'undefined': { icon: '❓', label: 'Non défini', class: 'badge-undefined' },
      '': { icon: '❓', label: 'Non défini', class: 'badge-undefined' }
    },
    // ✅ STATUTS RÉCEPTION DISPLAY OPTIMISÉS
    statuts_reception_display: {
      'en_attente': { icon: '⏳', label: 'En attente', class: 'badge-waiting' },
      'oui': { icon: '✅', label: 'Oui - Confirmé', class: 'badge-confirmed' },
      'non': { icon: '❌', label: 'Non - Refusé', class: 'badge-declined' },
      'refuse': { icon: '🚫', label: 'Refusé', class: 'badge-refused' },
      'répondu': { icon: '📞', label: 'A répondu', class: 'badge-responded' },
      'ne repond pas': { icon: '📵', label: 'Ne répond pas', class: 'badge-no-response' },
      'non contacté': { icon: '📋', label: 'Non contacté', class: 'badge-not-contacted' },
      'null': { icon: '❓', label: 'Non défini', class: 'badge-undefined' },
      'undefined': { icon: '❓', label: 'Non défini', class: 'badge-undefined' },
      '': { icon: '❓', label: 'Non défini', class: 'badge-undefined' }
    }
  });
  
  // États pour les modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMassActionModal, setShowMassActionModal] = useState(false);
  const [showPreselectionModal, setShowPreselectionModal] = useState(false);
  const [showExportPreviewModal, setShowExportPreviewModal] = useState(false);
  const [selectedBeneficiaire, setSelectedBeneficiaire] = useState(null);
  
  // ✅ ÉTATS POUR LE FORMULAIRE - AJOUTÉS
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // États pour l'import
  const [importFile, setImportFile] = useState(null);
  const [importCampagne, setImportCampagne] = useState('');
  const [importValidation, setImportValidation] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  // État pour la campagne sélectionnée
  const [selectedCampagneInfo, setSelectedCampagneInfo] = useState(null);

  // États pour les actions en masse
  const [massAction, setMassAction] = useState('');
  const [massActionData, setMassActionData] = useState({});

  // États pour les détails du bénéficiaire
  const [detailsBeneficiaire, setDetailsBeneficiaire] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // États pour présélection
  const [selectedPreselectionParticipant, setSelectedPreselectionParticipant] = useState(null);
  const [preselectionFormData, setPreselectionFormData] = useState({});
  const [preselectionFormErrors, setPreselectionFormErrors] = useState({});
  const [preselectionSubmitting, setPreselectionSubmitting] = useState(false);

  // États pour participants réception
  const [selectedParticipantReception, setSelectedParticipantReception] = useState(null);
  const [receptionFormData, setReceptionFormData] = useState({});
  const [receptionFormErrors, setReceptionFormErrors] = useState({});
  const [receptionSubmitting, setReceptionSubmitting] = useState(false);

  // ✅ FONCTIONS DÉCISIONS CORRIGÉES
  const getDecisionDisplay = (decision) => {
    if (!decision || decision === null || decision === undefined || decision === '') {
      return formOptions.decisions_display['null'];
    }
    
    const decisionKey = decision.toString().toLowerCase().trim();
    return formOptions.decisions_display[decisionKey] || formOptions.decisions_display['null'];
  };

  // ✅ NORMALISATION DES DÉCISIONS POUR LE SERVEUR
  const normalizeDecisionForServer = (decision) => {
    if (!decision) return '';
    
    const normalized = decision.toString().toLowerCase().trim();
    
    // Mapping pour convertir les accents vers les valeurs serveur
    const decisionMapping = {
      'accepté': 'accepte',      // IMPORTANT: enlever l'accent
      'accepte': 'accepte',      // Déjà correct
      'refusé': 'refuse',        // IMPORTANT: enlever l'accent  
      'refuse': 'refuse',        // Déjà correct
      'en_attente': 'en_attente',
      'preselection_oui': 'preselection_oui',
      'preselection_non': 'preselection_non'
    };
    
    return decisionMapping[normalized] || normalized;
  };

  // ✅ NORMALISATION POUR L'AFFICHAGE (inverse)
  const normalizeDecisionForDisplay = (decision) => {
    if (!decision) return '';
    
    const normalized = decision.toString().toLowerCase().trim();
    
    // Mapping pour l'affichage (ajouter les accents si nécessaire)
    const displayMapping = {
      'accepte': 'accepté',      // Ajouter l'accent pour l'affichage
      'refuse': 'refusé',        // Ajouter l'accent pour l'affichage
      'en_attente': 'en_attente',
      'preselection_oui': 'preselection_oui',
      'preselection_non': 'preselection_non'
    };
    
    return displayMapping[normalized] || normalized;
  };

  // Fonctions statuts présélection
  const getPreselectionStatusDisplay = (statut) => {
    if (!statut || statut === null || statut === undefined || statut === '') {
      return formOptions.statuts_preselection_display['null'];
    }
    
    const statutKey = statut.toString().toLowerCase().trim();
    return formOptions.statuts_preselection_display[statutKey] || formOptions.statuts_preselection_display['null'];
  };

  // ✅ FONCTIONS STATUTS RÉCEPTION OPTIMISÉES
  const getReceptionStatusDisplay = (statut) => {
    if (!statut || statut === null || statut === undefined || statut === '') {
      return formOptions.statuts_reception_display['null'];
    }
    
    const statutKey = statut.toString().toLowerCase().trim();
    return formOptions.statuts_reception_display[statutKey] || formOptions.statuts_reception_display['null'];
  };

  const getDecisionBadgeClass = (decision) => {
    return getDecisionDisplay(decision).class;
  };

  const getDecisionLabel = (decision) => {
    return getDecisionDisplay(decision).label;
  };

  const getDecisionIcon = (decision) => {
    return getDecisionDisplay(decision).icon;
  };

  const getPreselectionStatusBadgeClass = (statut) => {
    return getPreselectionStatusDisplay(statut).class;
  };

  const getPreselectionStatusLabel = (statut) => {
    return getPreselectionStatusDisplay(statut).label;
  };

  const getPreselectionStatusIcon = (statut) => {
    return getPreselectionStatusDisplay(statut).icon;
  };

  const getReceptionStatusBadgeClass = (statut) => {
    return getReceptionStatusDisplay(statut).class;
  };

  const getReceptionStatusLabel = (statut) => {
    return getReceptionStatusDisplay(statut).label;
  };

  const getReceptionStatusIcon = (statut) => {
    return getReceptionStatusDisplay(statut).icon;
  };

  // ✅ FONCTION OPTIMISÉE: Charger participants réception avec colonnes conditionnelles
  const loadParticipantsReception = useCallback(async (campagneId) => {
    if (!campagneId) {
      setParticipantsReception([]);
      setParticipantsCampagneInfo(null);
      return [];
    }

    try {
      setLoadingParticipantsReception(true);
      console.log('🔄 === CHARGEMENT PARTICIPANTS RÉCEPTION OPTIMISÉ ===', campagneId);
      
      // ✅ UTILISER L'API PARTICIPANTS AVEC COLONNES CONDITIONNELLES
      const response = await upasAPI.getParticipantsReception(campagneId, { 
        per_page: 1000,
        include_campagne_info: true 
      });
      
      if (response.data?.success) {
        const participantsData = response.data.data || [];
        const campagneInfo = response.data.campagne_info;
        
        console.log('✅ Participants réception chargés avec info campagne:', {
          participants: participantsData.length,
          campagne: campagneInfo
        });
        
        // ✅ ENRICHIR LES DONNÉES PARTICIPANTS AVEC COLONNES CONDITIONNELLES
        const participantsEnriched = participantsData.map(participant => ({
          ...participant,
          id: participant.id,
          nom: participant.nom,
          prenom: participant.prenom,
          nom_complet: participant.nom_complet || `${participant.prenom || ''} ${participant.nom || ''}`.trim(),
          telephone: participant.telephone,
          email: participant.email || null,
          adresse: participant.adresse,
          date_naissance: participant.date_naissance,
          sexe: participant.sexe,
          cin: participant.cin || null,
          statut: participant.statut || 'non contacté',
          commentaire: participant.commentaire || '',
          date_appel: participant.date_appel,
          campagne_id: participant.campagne_id,
          campagne_nom: participant.campagne_nom || campagneInfo?.nom || 'N/A',
          type_assistance: participant.type_assistance || campagneInfo?.type_assistance || 'Non défini',
          age: participant.age || calculateAge(participant.date_naissance),
          sexe_libelle: participant.sexe === 'M' ? 'Masculin' : 'Féminin',
          statut_display: getReceptionStatusDisplay(participant.statut),
          statut_libelle: participant.statut_libelle || getReceptionStatusLabel(participant.statut),
          statut_couleur: participant.statut_couleur || 'secondary',
          statut_icone: participant.statut_icone || getReceptionStatusIcon(participant.statut),
          est_participant_reception: true,
          source: 'upas_participants_optimise',
          date_appel_formatee: participant.date_appel_formatee || (participant.date_appel ? formatDate(participant.date_appel) : null),
          date_creation_formatee: participant.date_creation_formatee || formatDate(participant.created_at),
          derniere_activite: participant.derniere_activite || null,
          liste_type: 'liste_participants',
          type_liste: 'Participants Réception',
          // ✅ COLONNES CONDITIONNELLES SELON LE TYPE DE CAMPAGNE
          decision: participant.decision || '',
          enfants_scolarises: participant.enfants_scolarises || null,
          // Colonne 'cote' uniquement pour les campagnes auditives
          ...(campagneInfo?.is_auditive && { cote: participant.cote || '' }),
          is_campagne_auditive: campagneInfo?.is_auditive || false
        }));
        
        setParticipantsReception(participantsEnriched);
        setParticipantsCampagneInfo(campagneInfo);
        
        console.log('✅ Participants réception enrichis:', {
          total: participantsEnriched.length,
          is_auditive: campagneInfo?.is_auditive,
          colonnes_conditionnelles: campagneInfo?.is_auditive ? ['decision', 'enfants_scolarises', 'cote'] : ['decision', 'enfants_scolarises']
        });
        
        return participantsEnriched;
        
      } else {
        throw new Error(response.data?.message || 'Erreur lors du chargement des participants');
      }
      
    } catch (err) {
      console.error('❌ ERREUR participants réception optimisé:', err);
      setParticipantsReception([]);
      setParticipantsCampagneInfo(null);
      return [];
    } finally {
      setLoadingParticipantsReception(false);
    }
  }, []);

  const loadAllCampaignLists = useCallback(async (campagneId) => {
    if (!campagneId) {
      setListesDecisions({
        liste_participants: [],
        liste_principale: [],
        liste_attente: [],
        liste_rejetes: []
      });
      return;
    }

    try {
      setLoadingListesDecisions(true);
      console.log('🔄 === CHARGEMENT DES 4 LISTES DE LA CAMPAGNE OPTIMISÉ ===', campagneId);
      
      // ✅ 1. CHARGER PARTICIPANTS RÉCEPTION OPTIMISÉS AVEC COLONNES CONDITIONNELLES
      console.log('📞 1/4 - Chargement participants réception optimisés...');
      const participantsReceptionData = await loadParticipantsReception(campagneId);
      
      // 2. Charger tous les bénéficiaires de la campagne
      console.log('🏥 2/4 - Chargement tous bénéficiaires de la campagne...');
      const response = await upasAPI.getBeneficiaires({
        campagne_id: campagneId,
        per_page: 1000
      });
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du chargement des bénéficiaires');
      }
      
      const allBeneficiaires = response.data.data || [];
      console.log('✅ Tous bénéficiaires chargés:', allBeneficiaires.length);
      
      // 3. Récupérer les IDs des participants réception pour éviter les doublons
      const participantsReceptionIds = participantsReceptionData.map(p => p.id).filter(id => id);
      console.log('🔗 3/4 - IDs participants pour exclusion:', participantsReceptionIds.length);
      
      // ✅ 4. CLASSIFICATION INTELLIGENTE PAR DÉCISION AVEC RÈGLES AUTOMATIQUES
      console.log('📋 4/4 - Classification intelligente par décision avec règles automatiques...');
      const beneficiairesFiltered = allBeneficiaires.filter(b => 
        !participantsReceptionIds.includes(b.id)
      );
      
      // ✅ PARTICIPANTS RÉCEPTION "EN ATTENTE" → AJOUT AUTOMATIQUE À LA LISTE D'ATTENTE
      console.log('⚡ Analyse des participants réception "en attente" pour ajout automatique...');
      
      const participantsEnAttente = participantsReceptionData.filter(p => 
        p.statut && p.statut.toLowerCase().trim() === 'en_attente'
      );
      
      console.log(`📝 ${participantsEnAttente.length} participants réception avec statut "en_attente" trouvés`);
      
      // Conversion des participants en attente vers des entrées pour la liste d'attente
      const participantsConvertisEnAttente = participantsEnAttente.map(participant => ({
        ...participant,
        // ✅ FORCER LA DÉCISION À "en_attente" POUR CES PARTICIPANTS
        decision: 'en_attente',
        decision_originale: participant.decision || null,
        decision_display: getDecisionDisplay('en_attente'),
        age: calculateAge(participant.date_naissance),
        sexe_libelle: participant.sexe === 'M' ? 'Masculin' : 'Féminin',
        date_creation_formatee: formatDate(participant.created_at),
        date_modification_formatee: participant.updated_at !== participant.created_at ? 
          formatDate(participant.updated_at) : null,
        est_mineur: calculateAge(participant.date_naissance) < 18,
        a_beneficie_libelle: participant.a_beneficie ? 'A bénéficié' : 'En attente',
        source: 'upas_participants_auto_converted', // Source spéciale pour traçabilité
        liste_type: 'liste_attente',
        type_liste: 'Liste d\'Attente (Auto-Converti)',
        est_participant_reception: false, // Plus un participant réception
        conversion_automatique: true,
        statut_reception_original: participant.statut,
        raison_conversion: 'Statut réception "en_attente" → Classification automatique'
      }));
      
      if (participantsConvertisEnAttente.length > 0) {
        console.log(`✅ ${participantsConvertisEnAttente.length} participants convertis automatiquement vers Liste d'Attente`);
      }
      
      const classification = {
        // ✅ PARTICIPANTS RÉCEPTION AVEC COLONNES CONDITIONNELLES (SANS CEUX "EN ATTENTE")
        liste_participants: participantsReceptionData.filter(p => 
          !(p.statut && p.statut.toLowerCase().trim() === 'en_attente')
        ),
        
        // ✅ LISTE PRINCIPALE - Bénéficiaires avec decision = "accepte"
        liste_principale: beneficiairesFiltered.filter(b => {
          const decision = normalizeDecisionForServer(b.decision);
          return decision === 'accepte';
        }).map(beneficiaire => ({
          ...beneficiaire,
          age: calculateAge(beneficiaire.date_naissance),
          sexe_libelle: beneficiaire.sexe === 'M' ? 'Masculin' : 'Féminin',
          decision_display: getDecisionDisplay(beneficiaire.decision),
          date_creation_formatee: formatDate(beneficiaire.created_at),
          date_modification_formatee: beneficiaire.updated_at !== beneficiaire.created_at ? 
            formatDate(beneficiaire.updated_at) : null,
          est_mineur: calculateAge(beneficiaire.date_naissance) < 18,
          a_beneficie_libelle: beneficiaire.a_beneficie ? 'A bénéficié' : 'En attente',
          source: 'upas_decisions',
          liste_type: 'liste_principale',
          type_liste: 'Liste Principale',
          est_participant_reception: false
        })),
        
        // ✅ LISTE D'ATTENTE - Bénéficiaires + Participants réception "en_attente" convertis
        liste_attente: [
          // Bénéficiaires avec decision = "en_attente"
          ...beneficiairesFiltered.filter(b => {
            const decision = normalizeDecisionForServer(b.decision);
            return decision === 'en_attente';
          }).map(beneficiaire => ({
            ...beneficiaire,
            age: calculateAge(beneficiaire.date_naissance),
            sexe_libelle: beneficiaire.sexe === 'M' ? 'Masculin' : 'Féminin',
            decision_display: getDecisionDisplay(beneficiaire.decision),
            date_creation_formatee: formatDate(beneficiaire.created_at),
            date_modification_formatee: beneficiaire.updated_at !== beneficiaire.created_at ? 
              formatDate(beneficiaire.updated_at) : null,
            est_mineur: calculateAge(beneficiaire.date_naissance) < 18,
            a_beneficie_libelle: beneficiaire.a_beneficie ? 'A bénéficié' : 'En attente',
            source: 'upas_decisions',
            liste_type: 'liste_attente',
            type_liste: 'Liste d\'Attente',
            est_participant_reception: false
          })),
          // ✅ AJOUTER LES PARTICIPANTS RÉCEPTION "EN ATTENTE" CONVERTIS
          ...participantsConvertisEnAttente
        ],
        
        liste_rejetes: beneficiairesFiltered.filter(b => {
          const decision = normalizeDecisionForServer(b.decision);
          return decision === 'refuse';
        }).map(beneficiaire => ({
          ...beneficiaire,
          age: calculateAge(beneficiaire.date_naissance),
          sexe_libelle: beneficiaire.sexe === 'M' ? 'Masculin' : 'Féminin',
          decision_display: getDecisionDisplay(beneficiaire.decision),
          date_creation_formatee: formatDate(beneficiaire.created_at),
          date_modification_formatee: beneficiaire.updated_at !== beneficiaire.created_at ? 
            formatDate(beneficiaire.updated_at) : null,
          est_mineur: calculateAge(beneficiaire.date_naissance) < 18,
          a_beneficie_libelle: beneficiaire.a_beneficie ? 'A bénéficié' : 'En attente',
          source: 'upas_decisions',
          liste_type: 'liste_rejetes',
          type_liste: 'Rejetés',
          est_participant_reception: false
        }))
      };
      
      setListesDecisions(classification);
      
      const totalListes = classification.liste_participants.length + 
                         classification.liste_principale.length + 
                         classification.liste_attente.length + 
                         classification.liste_rejetes.length;
      
      console.log('✅ === TOUTES LES LISTES CHARGÉES AVEC SUCCÈS (OPTIMISÉ) ===', {
        liste_participants: classification.liste_participants.length,
        liste_principale: classification.liste_principale.length,
        liste_attente: classification.liste_attente.length,
        liste_rejetes: classification.liste_rejetes.length,
        total_listes: totalListes,
        exclus_doublons: participantsReceptionIds.length,
        participants_avec_colonnes_conditionnelles: participantsReceptionData.length,
        campagne_auditive: participantsCampagneInfo?.is_auditive || false
      });
      
    } catch (err) {
      console.error('❌ ERREUR CRITIQUE lors du chargement des listes optimisé:', err);
      setListesDecisions({
        liste_participants: [],
        liste_principale: [],
        liste_attente: [],
        liste_rejetes: []
      });
      setParticipantsReception([]);
    } finally {
      setLoadingListesDecisions(false);
    }
  }, [loadParticipantsReception]);

  // ✅ FONCTION POUR BASCULER L'AFFICHAGE DES LISTES DE CAMPAGNE
  const toggleCampaignListsView = () => {
    setShowCampaignListsView(!showCampaignListsView);
    if (!showCampaignListsView && activeListFilter === '') {
      setActiveListFilter('liste_participants'); // Filtre par défaut
    }
  };

  // FONCTION PRINCIPALE: Charger TOUTES les campagnes (actives + terminées)
  const loadFormOptions = useCallback(async () => {
    try {
      console.log('🔄 === DÉBUT CHARGEMENT TOUTES LES CAMPAGNES ===');
      
      console.log('📡 Chargement de TOUTES les campagnes (actives + terminées)');
      
      let allCampagnes = [];
      let campagnesActives = [];
      let campagnesTerminees = [];
      
      try {
        console.log('🎯 Tentative 1: Route pour toutes les campagnes');
        const allCampagnesResponse = await upasAPI.getCampagnes({ 
          per_page: 1000, 
          include_terminated: true,
          all_status: true 
        });
        
        if (allCampagnesResponse.data?.success && allCampagnesResponse.data?.data) {
          allCampagnes = allCampagnesResponse.data.data;
          console.log('✅ Toutes campagnes chargées via route principale:', allCampagnes.length);
        } else {
          throw new Error('Pas de données dans la route principale');
        }
      } catch (error) {
        console.warn('⚠️ Route principale échouée, tentative route secondaire');
        
        try {
          const promises = [
            upasAPI.getCampagnes({ per_page: 1000 }).catch(e => ({ error: e.message })),
            upasAPI.getCampagnesActives().catch(e => ({ error: e.message })),
          ];
          
          const results = await Promise.allSettled(promises);
          
          const campagnesStandard = results[0].status === 'fulfilled' && results[0].value.data?.success 
            ? results[0].value.data.data || [] : [];
          const campagnesActivesOnly = results[1].status === 'fulfilled' && results[1].value.data?.success 
            ? results[1].value.data.data || [] : [];
          
          const campagnesMap = new Map();
          
          [...campagnesStandard, ...campagnesActivesOnly].forEach(campagne => {
            if (campagne && campagne.id) {
              campagnesMap.set(campagne.id, campagne);
            }
          });
          
          allCampagnes = Array.from(campagnesMap.values());
          console.log('✅ Campagnes combinées:', allCampagnes.length);
          
        } catch (fallbackError) {
          console.warn('⚠️ Routes secondaires échouées, utilisation données d\'urgence');
          allCampagnes = [];
        }
      }
      
      // CLASSIFICATION DES CAMPAGNES PAR STATUT
      console.log('📊 Classification des campagnes par statut');
      
      const now = new Date();
      
      allCampagnes.forEach(campagne => {
        let statutReel = campagne.statut;
        
        if (campagne.date_fin) {
          const dateFin = new Date(campagne.date_fin);
          if (dateFin < now && (!statutReel || statutReel === 'Active' || statutReel === 'En cours')) {
            statutReel = 'Terminée';
          }
        }
        
        campagne.statut_reel = statutReel;
        campagne.est_terminee = statutReel === 'Terminée' || statutReel === 'Archivée' || statutReel === 'Fermée';
        campagne.est_active = !campagne.est_terminee && (statutReel === 'Active' || statutReel === 'En cours');
        
        if (campagne.est_active) {
          campagnesActives.push(campagne);
        } else if (campagne.est_terminee) {
          campagnesTerminees.push(campagne);
        }
      });
      
      console.log('📈 Résultats classification:', {
        total: allCampagnes.length,
        actives: campagnesActives.length,
        terminees: campagnesTerminees.length
      });
      
      // CHARGEMENT DES TYPES D'ASSISTANCE
      let typesAssistance = [];
      try {
        console.log('📡 Chargement des types d\'assistance');
        const typesResponse = await upasAPI.getTypesAssistance();
        if (typesResponse.data?.success) {
          typesAssistance = typesResponse.data.data || [];
          console.log('✅ Types assistance chargés:', typesAssistance.length);
        }
      } catch (typesError) {
        console.warn('⚠️ Erreur types assistance, utilisation données secours');
        typesAssistance = [];
      }
      
      const newFormOptions = {
        ...formOptions,
        campagnes: allCampagnes,
        campagnes_actives: campagnesActives,
        campagnes_terminees: campagnesTerminees,
        types_assistance: typesAssistance
      };

      setFormOptions(newFormOptions);

      console.log('✅ === OPTIONS CHARGÉES AVEC SUCCÈS ===', {
        campagnes_totales: newFormOptions.campagnes.length,
        campagnes_actives: newFormOptions.campagnes_actives.length,
        campagnes_terminees: newFormOptions.campagnes_terminees.length,
        types_assistance: newFormOptions.types_assistance.length,
        decisions: newFormOptions.decisions.length,
        statuts_preselection: newFormOptions.statuts_preselection.length,
        statuts_reception: newFormOptions.statuts_reception.length
      });

    } catch (err) {
      console.error('❌ ERREUR CRITIQUE lors du chargement des options:', err);
      
      setFormOptions(prev => ({
        ...prev,
        campagnes: [],
        campagnes_actives: [],
        campagnes_terminees: [],
        types_assistance: []
      }));
    }
  }, []);

  // Charger les informations de la campagne sélectionnée
  const loadCampagneInfo = useCallback(async (campagneId) => {
    if (!campagneId) {
      setSelectedCampagneInfo(null);
      return;
    }

    try {
      console.log('🔄 Chargement info campagne:', campagneId);
      
      const campagneFromList = formOptions.campagnes.find(c => c.id === parseInt(campagneId));
      if (campagneFromList) {
        console.log('✅ Info campagne trouvée dans la liste:', campagneFromList);
        setSelectedCampagneInfo(campagneFromList);
        return;
      }

      const response = await upasAPI.getCampagne(campagneId);
      
      if (response.data && response.data.success) {
        console.log('✅ Info campagne chargée via API:', response.data.data);
        setSelectedCampagneInfo(response.data.data);
      } else {
        console.warn('⚠️ Campagne non trouvée via API');
        setSelectedCampagneInfo(null);
      }
    } catch (err) {
      console.error('❌ Erreur chargement info campagne:', err);
      setSelectedCampagneInfo(null);
    }
  }, [formOptions.campagnes]);

  // Obtenir le badge de statut de campagne
  const getCampagneStatusBadge = (campagne) => {
    if (!campagne) return null;
    
    const statut = campagne.statut_reel || campagne.statut;
    const now = new Date();
    const dateFin = campagne.date_fin ? new Date(campagne.date_fin) : null;
    
    let badgeClass = 'badge-secondary';
    let badgeText = statut || 'Non défini';
    let badgeIcon = '🏥';
    
    if (campagne.est_terminee || (dateFin && dateFin < now)) {
      badgeClass = 'badge-completed';
      badgeText = 'Terminée';
      badgeIcon = '✅';
    } else if (campagne.est_active || statut === 'Active' || statut === 'En cours') {
      badgeClass = 'badge-active';
      badgeText = 'Active';
      badgeIcon = '🩺';
    } else if (statut === 'Planifiée' || statut === 'En préparation') {
      badgeClass = 'badge-planned';
      badgeText = 'Planifiée';
      badgeIcon = '📋';
    } else if (statut === 'Suspendue') {
      badgeClass = 'badge-suspended';
      badgeText = 'Suspendue';
      badgeIcon = '⏸️';
    }
    
    return { badgeClass, badgeText, badgeIcon };
  };

  // Formater l'affichage des campagnes dans le select
  const formatCampagneForSelect = (campagne) => {
    const statusBadge = getCampagneStatusBadge(campagne);
    const typeAssistance = campagne.type_assistance || campagne.libelle || 'Type non défini';
    const dateFin = campagne.date_fin ? new Date(campagne.date_fin).toLocaleDateString('fr-FR') : '';
    
    let displayText = `${campagne.nom} (${typeAssistance})`;
    
    if (campagne.est_terminee) {
      displayText += ` - Terminée ${dateFin ? 'le ' + dateFin : ''}`;
    } else if (campagne.est_active) {
      displayText += ' - En cours';
    }
    
    return {
      ...campagne,
      displayText,
      statusBadge
    };
  };

  // ✅ FONCTIONS DE FORMULAIRE
  const initializeForm = useCallback((beneficiaire = null) => {
    const defaultData = {
      nom: '',
      prenom: '',
      sexe: '',
      date_naissance: '',
      adresse: '',
      telephone: '',
      email: '',
      cin: '',
      type_assistance_id: '',
      campagne_id: filters.campagne_id || '',
      hors_campagne: false,
      a_beneficie: false,
      commentaire: '',
      enfants_scolarises: null,
      cote: '',
      lateralite: '',
      decision: '',
      statut_preselection: '',
      commentaire_preselection: '',
      date_contact: '',
      heure_contact: '',
      notes_contact: ''
    };

    if (beneficiaire) {
      setFormData({
        ...defaultData,
        ...beneficiaire,
        hors_campagne: Boolean(beneficiaire.hors_campagne),
        a_beneficie: Boolean(beneficiaire.a_beneficie),
        enfants_scolarises: beneficiaire.enfants_scolarises === null ? null : Boolean(beneficiaire.enfants_scolarises),
        decision: beneficiaire.decision || '',
        statut_preselection: beneficiaire.statut_preselection || '',
        commentaire_preselection: beneficiaire.commentaire_preselection || '',
        date_contact: beneficiaire.date_contact || '',
        heure_contact: beneficiaire.heure_contact || '',
        notes_contact: beneficiaire.notes_contact || ''
      });
    } else {
      setFormData(defaultData);
    }

    setFormErrors({});
  }, [filters.campagne_id]);

  // ✅ FONCTION DE VALIDATION CORRIGÉE
  const validateForm = useCallback((data) => {
    const errors = {};

    if (!data.nom || typeof data.nom !== 'string' || data.nom.trim().length < 2) {
      errors.nom = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!data.prenom || typeof data.prenom !== 'string' || data.prenom.trim().length < 2) {
      errors.prenom = 'Le prénom doit contenir au moins 2 caractères';
    }

    if (!data.sexe || !['M', 'F'].includes(data.sexe)) {
      errors.sexe = 'Le sexe est obligatoire (M ou F)';
    }

    if (!data.date_naissance) {
      errors.date_naissance = 'La date de naissance est obligatoire';
    } else {
      const birthDate = new Date(data.date_naissance);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (isNaN(birthDate.getTime())) {
        errors.date_naissance = 'Date de naissance invalide';
      } else if (age < 0 || age > 120) {
        errors.date_naissance = 'Date de naissance non réaliste';
      }
    }

    if (!data.telephone || typeof data.telephone !== 'string' || data.telephone.trim().length < 8) {
      errors.telephone = 'Le téléphone doit contenir au moins 8 chiffres';
    } else {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(data.telephone.trim())) {
        errors.telephone = 'Le téléphone contient des caractères invalides';
      }
    }

    if (!data.adresse || typeof data.adresse !== 'string' || data.adresse.trim().length === 0) {
      errors.adresse = 'L\'adresse est obligatoire';
    } else if (data.adresse.trim().length > 500) {
      errors.adresse = 'L\'adresse ne peut pas dépasser 500 caractères';
    }

    if (!data.type_assistance_id) {
      errors.type_assistance_id = 'Le type d\'assistance est obligatoire';
    } else {
      const typeId = parseInt(data.type_assistance_id);
      if (isNaN(typeId) || typeId <= 0) {
        errors.type_assistance_id = 'Type d\'assistance invalide';
      }
    }

    if (data.email && data.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.email = 'Format d\'email invalide';
      }
    }

    if (!data.hors_campagne && data.campagne_id) {
      const campagneId = parseInt(data.campagne_id);
      if (isNaN(campagneId) || campagneId <= 0) {
        errors.campagne_id = 'Campagne invalide';
      }
    }

    // ✅ VALIDATION DÉCISION CORRIGÉE
    if (data.decision && data.decision !== '') {
      const validDecisions = ['accepte', 'en_attente', 'preselection_oui', 'preselection_non', 'refuse'];
      const normalizedDecision = normalizeDecisionForServer(data.decision);
      if (!validDecisions.includes(normalizedDecision)) {
        errors.decision = `Décision invalide. Valeurs acceptées: ${validDecisions.join(', ')}`;
      }
    }

    if (data.statut_preselection && data.statut_preselection !== '') {
      const validStatuts = ['repondu', 'ne_repond_pas', 'non_contacte', 'en_attente'];
      if (!validStatuts.includes(data.statut_preselection)) {
        errors.statut_preselection = `Statut présélection invalide. Valeurs acceptées: ${validStatuts.join(', ')}`;
      }
    }

    if (data.statut_preselection && data.statut_preselection !== '' && data.date_contact) {
      const contactDate = new Date(data.date_contact);
      const today = new Date();
      
      if (isNaN(contactDate.getTime())) {
        errors.date_contact = 'Date de contact invalide';
      } else if (contactDate > today) {
        errors.date_contact = 'La date de contact ne peut pas être dans le futur';
      }
    }

    if (data.type_assistance_id && data.date_naissance) {
      const typeAssistance = formOptions.types_assistance.find(t => t.id == data.type_assistance_id);
      const birthDate = new Date(data.date_naissance);
      const age = new Date().getFullYear() - birthDate.getFullYear();

      if (typeAssistance) {
        const typeLibelle = typeAssistance.libelle?.toLowerCase() || '';

        if ((typeLibelle.includes('lunette') || typeLibelle.includes('auditif')) && age < 18) {
          if (data.enfants_scolarises === null || data.enfants_scolarises === undefined) {
            errors.enfants_scolarises = 'Le champ "enfants scolarisés" est obligatoire pour les mineurs';
          }
        }

        if (typeLibelle.includes('auditif') && !data.cote) {
          errors.cote = 'Le côté est obligatoire pour les appareils auditifs';
        }
      }
    }

    return errors;
  }, [formOptions.types_assistance]);

  // ✅ FONCTION DE SOUMISSION CORRIGÉE
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ NORMALISER LES DONNÉES AVANT VALIDATION
    const normalizedData = {
      ...formData,
      decision: formData.decision ? normalizeDecisionForServer(formData.decision) : ''
    };
    
    const errors = validateForm(normalizedData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      alert('❌ Veuillez corriger les erreurs dans le formulaire');
      console.log('❌ Erreurs de validation:', errors);
      return;
    }

    setFormSubmitting(true);

    try {
      console.log('📤 Soumission formulaire:', {
        mode: selectedBeneficiaire ? 'modification' : 'création',
        data: normalizedData
      });

      let response;
      
      if (selectedBeneficiaire) {
        // Modification
        response = await upasAPI.updateBeneficiaire(selectedBeneficiaire.id, normalizedData);
      } else {
        // Création
        response = await upasAPI.createBeneficiaire(normalizedData);
      }

      if (response.data?.success) {
        const action = selectedBeneficiaire ? 'modifié' : 'créé';
        alert(`✅ Bénéficiaire ${action} avec succès!`);
        
        // Fermer le modal
        closeModals();
        
        // Recharger les données
        await loadBeneficiaires();
        
        // Recharger les listes de campagne si nécessaire
        if (filters.campagne_id) {
          await loadAllCampaignLists(filters.campagne_id);
        }
      } else {
        throw new Error(response.data?.message || 'Erreur lors de la sauvegarde');
      }

    } catch (err) {
      console.error('❌ Erreur soumission formulaire:', err);
      const errorMessage = handleApiError(err);
      alert(`❌ Erreur: ${errorMessage}`);
      
      // Afficher les erreurs spécifiques si disponibles
      if (err.response?.data?.errors) {
        console.log('❌ Erreurs serveur détaillées:', err.response.data.errors);
        setFormErrors(err.response.data.errors);
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Charger les bénéficiaires
  const loadBeneficiaires = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Chargement des bénéficiaires...', { filters });
      
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => 
          value !== '' && value !== null && value !== undefined
        )
      );
      
      const response = await upasAPI.getBeneficiaires(cleanFilters);
      
      if (response.data && response.data.success) {
        const beneficiaires = response.data.data || [];
        setBeneficiaires(beneficiaires);
        
        const paginationData = response.data.pagination || response.data;
        setPagination({
          current_page: paginationData.current_page || 1,
          per_page: paginationData.per_page || cleanFilters.per_page || 15,
          total: paginationData.total || beneficiaires.length,
          last_page: paginationData.last_page || Math.ceil((paginationData.total || beneficiaires.length) / (paginationData.per_page || 15))
        });

        console.log('✅ Bénéficiaires chargés:', beneficiaires.length);
      } else {
        const errorMessage = response.data?.message || 'Erreur lors du chargement des bénéficiaires';
        setError(errorMessage);
        setBeneficiaires([]);
      }
    } catch (err) {
      console.error('❌ Erreur bénéficiaires:', err);
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      setBeneficiaires([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ✅ FONCTION: Gérer le succès de l'import
  const handleImportSuccess = useCallback(async (importResult) => {
    console.log('✅ Import réussi:', importResult);
    
    try {
      // Recharger les bénéficiaires
      await loadBeneficiaires();
      
      // Si une campagne est sélectionnée, recharger ses listes
      if (filters.campagne_id) {
        await loadAllCampaignLists(filters.campagne_id);
      }
      
      // Afficher une notification de succès détaillée
      const notification = `✅ Import terminé avec succès!\n\n` +
        `📊 Statistiques:\n` +
        `• ${importResult.imported_count || 0} bénéficiaires importés\n` +
        `• ${importResult.skipped_count || 0} doublons ignorés\n` +
        `• ${importResult.error_count || 0} erreurs\n\n` +
        `🏥 Campagne: ${formOptions.campagnes?.find(c => c.id == importCampagne)?.nom || 'Hors campagne'}\n` +
        `📅 Date: ${new Date().toLocaleDateString('fr-FR')}`;
      
      alert(notification);
      
    } catch (error) {
      console.error('❌ Erreur lors du rechargement après import:', error);
      alert('⚠️ Import réussi mais erreur lors du rechargement des données. Veuillez actualiser la page.');
    }
  }, [loadBeneficiaires, loadAllCampaignLists, filters.campagne_id, formOptions.campagnes, importCampagne]);

  // ✅ FONCTION: Réinitialiser les états d'import
  const resetImportStates = useCallback(() => {
    setImportFile(null);
    setImportCampagne(filters.campagne_id || ''); // Garder la campagne actuelle par défaut
    setImportValidation(null);
    setImportError(null);
    setImportProgress(null);
    setIsImporting(false);
  }, [filters.campagne_id]);

  // ✅ FONCTION: Initialiser la campagne d'import
  const handleOpenImportModal = () => {
    // Pré-sélectionner la campagne courante si elle existe
    if (filters.campagne_id) {
      setImportCampagne(filters.campagne_id);
    }
    setShowImportModal(true);
  };

  // ✅ FONCTIONS D'EXPORT - AJOUTÉES
  
  // Fonction utilitaire pour convertir en CSV
  const convertToCSV = (data) => {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header] || '';
        // Échapper les guillemets et encapsuler si nécessaire
        return typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const BOM = '\uFEFF'; // BOM pour UTF-8
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // ✅ FONCTION: Vérifier si c'est une campagne d'appareils auditifs
  const isCampagneAppareilsAuditifs = (participantsCampagneInfo, selectedCampagneInfo) => {
    const typeAssistance = participantsCampagneInfo?.type_assistance || 
                           selectedCampagneInfo?.type_assistance || 
                           selectedCampagneInfo?.libelle || '';
    
    const isAppareilsAuditifs = typeAssistance.toLowerCase().includes('appareils auditifs') ||
                                typeAssistance.toLowerCase().includes('appareil auditif') ||
                                typeAssistance.toLowerCase().includes('auditif');
    
    return isAppareilsAuditifs;
  };

  // ✅ FONCTION: Export participants avec statut "OUI" avec aperçu
  const handleExportParticipantsOuiWithPreview = () => {
    if (!filters.campagne_id) {
      alert('❌ Veuillez d\'abord sélectionner une campagne.');
      return;
    }

    if (listesDecisions.liste_participants.length === 0) {
      alert('❌ Aucun participant trouvé dans cette campagne.');
      return;
    }

    setShowExportPreviewModal(true);
  };

  // ✅ FONCTION: Export participants avec statut "OUI" 
  const exportParticipantsOui = async () => {
    try {
      if (!filters.campagne_id) {
        alert('❌ Veuillez d\'abord sélectionner une campagne.');
        return;
      }

      if (listesDecisions.liste_participants.length === 0) {
        alert('❌ Aucun participant trouvé dans cette campagne.');
        return;
      }

      // Filtrer les participants avec statut "oui"
      const participantsOui = listesDecisions.liste_participants.filter(participant => 
        participant.statut && participant.statut.toLowerCase() === 'oui'
      );

      if (participantsOui.length === 0) {
        alert('❌ Aucun participant avec statut "OUI" trouvé dans cette campagne.');
        return;
      }

      // ✅ VÉRIFIER SI C'EST UNE CAMPAGNE D'APPAREILS AUDITIFS
      const isAppareilsAuditifs = isCampagneAppareilsAuditifs(participantsCampagneInfo, selectedCampagneInfo);

      // Confirmer l'export avec indication du type de campagne
      const campaignTypeInfo = isAppareilsAuditifs ? 
        '\n🔹 Campagne Appareils Auditifs - Colonne "Côté" incluse' : 
        '\n🔹 Campagne Standard - Pas de colonne "Côté"';

      const confirmed = window.confirm(
        `Exporter ${participantsOui.length} participant(s) avec statut "OUI" ?\n\n` +
        `Campagne: ${selectedCampagneInfo?.nom || 'Non définie'}\n` +
        `Type: ${participantsCampagneInfo?.type_assistance || selectedCampagneInfo?.type_assistance || 'Non défini'}` +
        campaignTypeInfo +
        `\nDate: ${new Date().toLocaleDateString('fr-FR')}`
      );

      if (!confirmed) return;

      // Préparer les données pour l'export
      const dataToExport = participantsOui.map((participant, index) => {
        const age = calculateAge(participant.date_naissance);
        const exportRow = {
          'Nom': participant.nom || '',
          'Prenom': participant.prenom || '',
          'Sexe': participant.sexe === 'M' ? 'M' : 'F',
          'Date Naissance': participant.date_naissance ? new Date(participant.date_naissance).toLocaleDateString('fr-FR') : '',
          
          'Telephone': participant.telephone || '',
          'Email': participant.email || '',
          'Adresse': participant.adresse || '',
          'CIN': participant.cin || '',
          'Commentaire': participant.commentaire || '',
          'Decision': getDecisionLabel(participant.decision),
          'enfants_scolarises': participant.enfants_scolarises === true ? 'Oui' : 
                               participant.enfants_scolarises === false ? 'Non' : '',
        };

        // ✅ AJOUTER LA COLONNE "CÔTÉ" UNIQUEMENT POUR LES CAMPAGNES D'APPAREILS AUDITIFS
        if (isAppareilsAuditifs) {
          exportRow['cote'] = participant.cote || '';
          console.log(`✅ Participant ${participant.nom}: Côté = "${participant.cote || ''}"`);
        }

        return exportRow;
      });

      // Créer le nom du fichier avec indication du type
      const typeIndicator = isAppareilsAuditifs ? '_AppareilsAuditifs' : '_Standard';
      const campaignName = selectedCampagneInfo?.nom?.replace(/[^a-zA-Z0-9]/g, '_') || 'Campagne';
      const date = new Date().toISOString().split('T')[0];
      const fileName = `Participants_OUI${typeIndicator}_${campaignName}_${date}.xlsx`;

      // Utiliser SheetJS pour créer l'Excel
      if (typeof XLSX !== 'undefined') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        
        // Ajuster la largeur des colonnes
        const baseColumns = [
          { wch: 15 },  // Nom
          { wch: 15 },  // Prénom
          { wch: 10 },  // Sexe
          { wch: 12 },  // Date Naissance
          { wch: 15 },  // Téléphone
          { wch: 25 },  // Email
          { wch: 30 },  // Adresse
          { wch: 12 },  // CIN
          { wch: 30 },  // Commentaire
          { wch: 15 },  // Décision
          { wch: 15 },  // Enfants Scolarisés
        ];

        // Ajouter colonne côté si campagne auditive
        if (isAppareilsAuditifs) {
          baseColumns.push({ wch: 10 }); // Côté
        }

        ws['!cols'] = baseColumns;

        // ✅ MISE EN FORME DU TABLEAU EXCEL
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // Style pour l'en-tête
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: 0, c: C });
          if (!ws[address]) continue;
          
          ws[address].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "28A745" } }, // Vert pour statut OUI
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        }

        // ✅ STYLE POUR LES DONNÉES (ALTERNANCE DE COULEURS)
        for (let R = 1; R <= range.e.r; ++R) {
          const isEvenRow = R % 2 === 0;
          const fillColor = isEvenRow ? "F8FFF8" : "FFFFFF"; // Légère teinte verte
          
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[address]) continue;
            
            ws[address].s = {
              fill: { fgColor: { rgb: fillColor } },
              alignment: { 
                horizontal: C === 0 ? "center" : "left", // N° centré, reste à gauche
                vertical: "center" 
              },
              border: {
                top: { style: "thin", color: { rgb: "D0D0D0" } },
                bottom: { style: "thin", color: { rgb: "D0D0D0" } },
                left: { style: "thin", color: { rgb: "D0D0D0" } },
                right: { style: "thin", color: { rgb: "D0D0D0" } }
              }
            };
          }
        }

        XLSX.utils.book_append_sheet(wb, ws, "Participants OUI");

        // ✅ AJOUTER UNE FEUILLE AVEC INFORMATIONS CAMPAGNE
        const campagneInfo = [
          ['Informations Export - Participants OUI'],
          [''],
          ['Nom de la Campagne', selectedCampagneInfo?.nom || 'Non définie'],
          ['Type d\'Assistance', selectedCampagneInfo?.type_assistance || 'Non défini'],
          ['Date de Début', selectedCampagneInfo?.date_debut ? 
            new Date(selectedCampagneInfo.date_debut).toLocaleDateString('fr-FR') : ''],
          ['Date de Fin', selectedCampagneInfo?.date_fin ? 
            new Date(selectedCampagneInfo.date_fin).toLocaleDateString('fr-FR') : ''],
          ['Statut Campagne', selectedCampagneInfo?.statut || 'Non défini'],
          ['Type de Campagne', isAppareilsAuditifs ? 'Appareils Auditifs' : 'Standard'],
          [''],
          ['Statistiques Export'],
          [''],
          ['Total Participants avec Statut OUI', participantsOui.length],
          ['Total Participants dans la Campagne', listesDecisions.liste_participants.length],
          ['Date d\'Export', new Date().toLocaleDateString('fr-FR')],
          ['Heure d\'Export', new Date().toLocaleTimeString('fr-FR')],
          [''],
          ['Colonnes Incluses'],
          [''],
          ...Object.keys(dataToExport[0] || {}).map(col => [col]),
          [''],
          ['Critères d\'Export'],
          [''],
          ['Statut Réception = "OUI"'],
          ['Campagne = ' + (selectedCampagneInfo?.nom || 'Non définie')],
          ['Type d\'Assistance = ' + (selectedCampagneInfo?.type_assistance || 'Non défini')]
        ];

        const wsInfo = XLSX.utils.aoa_to_sheet(campagneInfo);
        wsInfo['!cols'] = [{ wch: 25 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsInfo, "Informations");

        // ✅ TÉLÉCHARGER LE FICHIER
        XLSX.writeFile(wb, fileName);
        
        // ✅ MESSAGE DE SUCCÈS DÉTAILLÉ
        const coteInfo = isAppareilsAuditifs ? 
          '\n✅ Colonne "Côté" incluse (Appareils Auditifs)' : 
          '\nℹ️ Colonne "Côté" non incluse (pas d\'Appareils Auditifs)';
        
        alert(
          `✅ Export Excel réussi !\n\n` +
          `📁 Fichier: ${fileName}\n` +
          `📊 ${participantsOui.length} participant(s) avec statut "OUI"\n` +
          `🏥 Campagne: ${selectedCampagneInfo?.nom || 'Non définie'}\n` +
          `📅 Date: ${new Date().toLocaleDateString('fr-FR')}\n\n` +
          `✨ Tableau Excel formaté avec:\n` +
          `• En-têtes stylés en vert\n` +
          `• Alternance de couleurs\n` +
          `• Bordures et alignement\n` +
          `• Feuille d'informations incluse` +
          coteInfo
        );

      } else {
        // ✅ FALLBACK CSV SI XLSX N'EST PAS DISPONIBLE
        const csvContent = convertToCSV(dataToExport);
        const csvFileName = `Participants_OUI_${campaignName}_${date}.csv`;
        downloadCSV(csvContent, csvFileName);
        
        alert(
          `✅ Export CSV réussi !\n\n` +
          `📁 Fichier: ${csvFileName}\n` +
          `📊 ${participantsOui.length} participant(s) avec statut "OUI"\n` +
          `⚠️ Export en format CSV (Excel non disponible)`
        );
      }

    } catch (error) {
      console.error('❌ Erreur lors de l\'export des participants OUI:', error);
      alert('❌ Erreur lors de l\'export. Veuillez réessayer.\n\nDétails: ' + error.message);
    }
  };

  // ✅ FONCTION: Export de tous les bénéficiaires de la campagne actuelle
  const exportAllBeneficiaires = async () => {
    try {
      if (beneficiaires.length === 0) {
        alert('❌ Aucun bénéficiaire à exporter.');
        return;
      }

      const confirmed = window.confirm(
        `Exporter tous les bénéficiaires affichés ?\n\n` +
        `• Total : ${beneficiaires.length} bénéficiaires\n` +
        `• Campagne : ${selectedCampagneInfo?.nom || 'Toutes campagnes'}\n` +
        `• Filtres appliqués : ${Object.values(filters).filter(v => v !== '' && v !== null).length > 2 ? 'Oui' : 'Non'}`
      );

      if (!confirmed) return;

      // Préparer les données
      const dataToExport = beneficiaires.map((beneficiaire, index) => {
        const age = calculateAge(beneficiaire.date_naissance);
        return {
          'N°': index + 1,
          'Nom': beneficiaire.nom || '',
          'Prénom': beneficiaire.prenom || '',
          'Sexe': beneficiaire.sexe === 'M' ? 'Masculin' : 'Féminin',
          'Date Naissance': beneficiaire.date_naissance ? 
            new Date(beneficiaire.date_naissance).toLocaleDateString('fr-FR') : '',
          'Âge': age || '',
          'Téléphone': beneficiaire.telephone || '',
          'Email': beneficiaire.email || '',
          'Adresse': beneficiaire.adresse || '',
          'CIN': beneficiaire.cin || '',
          'Type Assistance': beneficiaire.type_assistance || '',
          'Campagne': beneficiaire.hors_campagne ? 'Hors campagne' : (beneficiaire.campagne_nom || ''),
          'Décision': getDecisionLabel(beneficiaire.decision),
          'A Bénéficié': beneficiaire.a_beneficie ? 'Oui' : 'Non',
          'enfants_scolarises': beneficiaire.enfants_scolarises === true ? 'Oui' : 
                               beneficiaire.enfants_scolarises === false ? 'Non' : '',
          'cote': beneficiaire.cote || '',
          'Latéralité': beneficiaire.lateralite || '',
          'Commentaire': beneficiaire.commentaire || '',
          'Date Création': formatDate(beneficiaire.created_at),
          'Date Modification': beneficiaire.updated_at !== beneficiaire.created_at ? 
            formatDate(beneficiaire.updated_at) : ''
        };
      });

      // Nom du fichier
      const campaignName = selectedCampagneInfo?.nom?.replace(/[^a-zA-Z0-9]/g, '_') || 'Tous_Beneficiaires';
      const date = new Date().toISOString().split('T')[0];
      const fileName = `Export_Beneficiaires_${campaignName}_${date}.xlsx`;

      if (typeof XLSX !== 'undefined') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        
        // Largeur des colonnes
        ws['!cols'] = [
          { wch: 5 },   // N°
          { wch: 15 },  // Nom
          { wch: 15 },  // Prénom
          { wch: 10 },  // Sexe
          { wch: 12 },  // Date Naissance
          { wch: 8 },   // Âge
          { wch: 15 },  // Téléphone
          { wch: 25 },  // Email
          { wch: 30 },  // Adresse
          { wch: 12 },  // CIN
          { wch: 20 },  // Type Assistance
          { wch: 20 },  // Campagne
          { wch: 15 },  // Décision
          { wch: 12 },  // A Bénéficié
          { wch: 15 },  // Enfants Scolarisés
          { wch: 10 },  // Côté
          { wch: 12 },  // Latéralité
          { wch: 30 },  // Commentaire
          { wch: 12 },  // Date Création
          { wch: 12 }   // Date Modification
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Bénéficiaires");
        XLSX.writeFile(wb, fileName);
        
        alert(
          `✅ Export Excel réussi !\n\n` +
          `📁 Fichier: ${fileName}\n` +
          `📊 ${beneficiaires.length} bénéficiaire(s) exporté(s)\n` +
          `📅 Date: ${new Date().toLocaleDateString('fr-FR')}`
        );

      } else {
        const csvContent = convertToCSV(dataToExport);
        const csvFileName = `Export_Beneficiaires_${campaignName}_${date}.csv`;
        downloadCSV(csvContent, csvFileName);
        
        alert(`✅ Export CSV réussi !\n${beneficiaires.length} bénéficiaire(s) exporté(s).`);
      }

    } catch (error) {
      console.error('❌ Erreur lors de l\'export:', error);
      alert('❌ Erreur lors de l\'export. Veuillez réessayer.');
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce bénéficiaire ?')) return;
    
    try {
      const response = await upasAPI.deleteBeneficiaire(id);
      if (response.data && response.data.success) {
        await loadBeneficiaires();
        if (filters.campagne_id) {
          await loadAllCampaignLists(filters.campagne_id);
        }
        alert('Bénéficiaire supprimé avec succès');
      } else {
        alert(response.data?.message || 'Erreur lors de la suppression');
      }
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  // Fonction pour basculer le statut "A bénéficié" d'un bénéficiaire
  const handleToggleBeneficiaireStatus = async (beneficiaire) => {
    const newStatus = !beneficiaire.a_beneficie;
    const statusText = newStatus ? 'A bénéficié' : 'En attente';
    
    const confirmed = window.confirm(
      `Changer le statut de ${beneficiaire.nom} ${beneficiaire.prenom} vers "${statusText}" ?`
    );
    
    if (!confirmed) return;
    
    try {
      console.log('🔄 Changement statut bénéficiaire:', {
        id: beneficiaire.id,
        ancien_statut: beneficiaire.a_beneficie,
        nouveau_statut: newStatus
      });

      const response = await upasAPI.updateBeneficiaire(beneficiaire.id, {
        ...beneficiaire,
        a_beneficie: newStatus
      });

      if (response.data?.success) {
        const action = newStatus ? 'marqué comme ayant bénéficié' : 'remis en attente';
        alert(`✅ ${beneficiaire.nom} ${beneficiaire.prenom} ${action} avec succès !`);
        
        // Recharger les données
        await loadBeneficiaires();
        
        // Recharger les listes de campagne si nécessaire
        if (filters.campagne_id) {
          await loadAllCampaignLists(filters.campagne_id);
        }
      } else {
        throw new Error(response.data?.message || 'Erreur lors de la mise à jour du statut');
      }

    } catch (err) {
      console.error('❌ Erreur changement statut:', err);
      const errorMessage = handleApiError(err);
      alert(`❌ Erreur lors du changement de statut: ${errorMessage}`);
    }
  };
  const loadBeneficiaireDetails = useCallback(async (beneficiaireId) => {
    try {
      setLoadingDetails(true);
      console.log('🔄 Chargement détails bénéficiaire:', beneficiaireId);
      
      const response = await upasAPI.getBeneficiaire(beneficiaireId);
      
      if (response.data && response.data.success) {
        const beneficiaireData = response.data.data;
        console.log('✅ Détails bénéficiaire chargés:', beneficiaireData);
        setDetailsBeneficiaire(beneficiaireData);
      } else {
        throw new Error(response.data?.message || 'Erreur lors du chargement des détails');
      }
    } catch (err) {
      console.error('❌ Erreur chargement détails:', err);
      const errorMessage = handleApiError(err);
      alert(`Erreur lors du chargement des détails: ${errorMessage}`);
      setDetailsBeneficiaire(null);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Fonction pour afficher les détails
  const handleViewDetails = async (beneficiaire) => {
    setSelectedBeneficiaire(beneficiaire);
    setShowDetailsModal(true);
    await loadBeneficiaireDetails(beneficiaire.id);
  };

  // EFFETS PRINCIPAUX
  useEffect(() => {
    console.log('🚀 === INITIALISATION COMPOSANT ===');
    loadFormOptions();
  }, [loadFormOptions]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadBeneficiaires();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [loadBeneficiaires]);

  // ✅ EFFET PRINCIPAL: Charger toutes les listes lorsqu'une campagne est sélectionnée
  useEffect(() => {
    if (filters.campagne_id) {
      loadAllCampaignLists(filters.campagne_id);
      setShowCampaignListsView(true); // Activer automatiquement la vue des listes
    } else {
      setListesDecisions({
        liste_participants: [],
        liste_principale: [],
        liste_attente: [],
        liste_rejetes: []
      });
      setParticipantsReception([]);
      setShowCampaignListsView(false);
    }
  }, [filters.campagne_id, loadAllCampaignLists]);

  useEffect(() => {
    console.log('🔄 Effet chargement campagne info:', {
      campagne_id: filters.campagne_id,
      campagnes_disponibles: formOptions.campagnes?.length || 0
    });
    
    if (filters.campagne_id && formOptions.campagnes?.length > 0) {
      loadCampagneInfo(filters.campagne_id);
    } else if (!filters.campagne_id) {
      setSelectedCampagneInfo(null);
    }
  }, [filters.campagne_id, formOptions.campagnes, loadCampagneInfo]);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.set(key, value.toString());
      }
    });
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // FONCTIONS UTILITAIRES
  const handleFilterChange = (key, value) => {
    console.log('🔄 Changement filtre:', key, '=', value);
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const calculateAge = (dateNaissance) => {
    if (!dateNaissance) return null;
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const navigateToParticipantsReception = () => {
    if (filters.campagne_id) {
      navigate(`/reception/campagnes/${filters.campagne_id}/participants`);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(
      selectedItems.length === beneficiaires.length 
        ? [] 
        : beneficiaires.map(b => b.id)
    );
  };

  const handlePageChange = (newPage) => {
    handleFilterChange('page', newPage);
  };

  const handleCreate = () => {
    initializeForm();
    setShowCreateModal(true);
  };

  const handleEdit = (beneficiaire) => {
    setSelectedBeneficiaire(beneficiaire);
    initializeForm(beneficiaire);
    setShowEditModal(true);
  };

  

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDetailsModal(false);
    setShowImportModal(false);
    setShowMassActionModal(false);
    setShowPreselectionModal(false);
    setSelectedBeneficiaire(null);
    setSelectedPreselectionParticipant(null);
    setSelectedParticipantReception(null);
    setDetailsBeneficiaire(null);
    setFormData({});
    setFormErrors({});
    setPreselectionFormData({});
    setPreselectionFormErrors({});
    setReceptionFormData({});
    setReceptionFormErrors({});
    setMassAction('');
    setMassActionData({});
    setFormSubmitting(false);
    
    // ✅ AJOUTER LA RÉINITIALISATION DES ÉTATS D'IMPORT
    resetImportStates();
  };

  // AFFICHAGE PENDANT LE CHARGEMENT INITIAL
  if (loading && beneficiaires.length === 0) {
    return (
      <div className="medical-page">
        <div className="medical-loading">
          <div className="medical-spinner"></div>
          <p>Chargement des dossiers médicaux...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="medical-page">
      {/* En-tête médical professionnel */}
      <div className="medical-header">
        <div className="medical-title-section">
          <div className="medical-icon">🏥</div>
          <div className="medical-title-content">
            <h1 className="medical-main-title">Gestion des Bénéficiaires</h1>
            <p className="medical-subtitle">Système UPAS avec intégration base de données Réception optimisée</p>
          </div>
          
          
        </div>
        
        {/* Actions principales */}
        <div className="medical-actions">
          
          
          {/* ✅ BOUTONS D'EXPORT AMÉLIORÉS */}
        
          
          
          <button 
            className="medical-btn medical-btn-import"
            onClick={handleOpenImportModal}
          >
            <span className="btn-icon">📥</span>
            Importer Excel
          </button>
          <button 
            className="medical-btn medical-btn-primary"
            onClick={handleCreate}
          >
            <span className="btn-icon">👤</span>
            Nouveau Patient
          </button>
        </div>
      </div>

      {/* Sélecteur de campagne médical */}
      <div className="medical-campaign-section">
        <div className="medical-campaign-selector">
          <label className="medical-label">
            <span className="label-icon">🏥</span>
            Sélectionner une campagne médicale (toutes statuts)
          </label>
          <select
            value={filters.campagne_id}
            onChange={(e) => {
              console.log('🔄 Sélection campagne:', e.target.value);
              handleFilterChange('campagne_id', e.target.value);
            }}
            className="medical-select"
          >
            <option value="">Toutes les campagnes</option>
            
            {/* Groupe des campagnes actives */}
            {formOptions.campagnes_actives?.length > 0 && (
              <optgroup label="🩺 Campagnes Actives">
                {formOptions.campagnes_actives.map(campagne => {
                  const formatted = formatCampagneForSelect(campagne);
                  return (
                    <option key={`active-${campagne.id}`} value={campagne.id}>
                      {formatted.displayText}
                    </option>
                  );
                })}
              </optgroup>
            )}
            
            {/* Groupe des campagnes terminées */}
            {formOptions.campagnes_terminees?.length > 0 && (
              <optgroup label="✅ Campagnes Terminées">
                {formOptions.campagnes_terminees.map(campagne => {
                  const formatted = formatCampagneForSelect(campagne);
                  return (
                    <option key={`terminated-${campagne.id}`} value={campagne.id}>
                      {formatted.displayText}
                    </option>
                  );
                })}
              </optgroup>
            )}
            
            {/* Autres campagnes (ni actives ni terminées) */}
            {formOptions.campagnes?.filter(c => !c.est_active && !c.est_terminee).length > 0 && (
              <optgroup label="⚪ Autres Campagnes">
                {formOptions.campagnes
                  .filter(c => !c.est_active && !c.est_terminee)
                  .map(campagne => {
                    const formatted = formatCampagneForSelect(campagne);
                    return (
                      <option key={`other-${campagne.id}`} value={campagne.id}>
                        {formatted.displayText}
                      </option>
                    );
                  })}
              </optgroup>
            )}
          </select>
          
          {/* Statut de chargement simplifié */}
          <div className="campagne-status" style={{ fontSize: '12px', marginTop: '5px' }}>
            {formOptions.campagnes?.length === 0 ? (
              <span style={{ color: 'red' }}>❌ Aucune campagne disponible</span>
            ) : (
              <span style={{ color: 'green' }}>
                ✅ {formOptions.campagnes?.length || 0} campagnes disponibles 
                ({formOptions.campagnes_actives?.length || 0} actives, {formOptions.campagnes_terminees?.length || 0} terminées)
              </span>
            )}
          </div>
        </div>
        
        {/* ✅ BOUTON POUR BASCULER L'AFFICHAGE DES 4 LISTES */}
        
        
        {/* Informations de la campagne sélectionnée */}
        {selectedCampagneInfo && (
          <div className="medical-campaign-info">
            <div className="campaign-details">
              <h3 className="campaign-name">
                {selectedCampagneInfo.nom}
                {(() => {
                  const statusBadge = getCampagneStatusBadge(selectedCampagneInfo);
                  return statusBadge ? (
                    <span className={`medical-badge ${statusBadge.badgeClass}`}>
                      {statusBadge.badgeIcon} {statusBadge.badgeText}
                    </span>
                  ) : null;
                })()}
              </h3>
              <div className="campaign-meta">
                <span className="meta-item">
                  <span className="meta-icon">🏥</span>
                  {selectedCampagneInfo.type_assistance || 'Type non défini'}
                </span>
                <span className="meta-item">
                  <span className="meta-icon">📅</span>
                  {formatDate(selectedCampagneInfo.date_debut)} - {formatDate(selectedCampagneInfo.date_fin)}
                </span>
                {/* ✅ INDICATEUR TYPE DE CAMPAGNE OPTIMISÉ */}
                {participantsCampagneInfo?.is_auditive && (
                  <span className="medical-badge badge-auditive">
                    👂 Campagne Auditive
                  </span>
                )}
                {selectedCampagneInfo.est_terminee && (
                  <span className="medical-badge badge-completed">
                    🏁 Campagne terminée
                  </span>
                )}
                {selectedCampagneInfo.est_active && (
                  <span className="medical-badge badge-active">
                    ✅ Campagne active
                  </span>
                )}
              </div>
              {selectedCampagneInfo.description && (
                <p className="campaign-description">{selectedCampagneInfo.description}</p>
              )}
            </div>
            
            
          </div>
        )}
        
        {/* Message si campagne sélectionnée mais pas trouvée */}
        {filters.campagne_id && !selectedCampagneInfo && !loadingListesDecisions && (
          <div className="campagne-not-found">
            <p style={{ color: 'orange' }}>⚠️ Informations de la campagne non disponibles</p>
            <small>ID campagne: {filters.campagne_id}</small>
            <button 
              className="medical-btn medical-btn-secondary" 
              onClick={() => loadCampagneInfo(filters.campagne_id)}
              style={{ marginLeft: '10px' }}
            >
              🔄 Recharger
            </button>
          </div>
        )}
      </div>

      {/* ✅ AFFICHAGE CONDITIONNEL - Vue des 4 listes optimisées ou Vue normale */}
      {showCampaignListsView && filters.campagne_id ? (
        <QuatreListes4ViewOptimisee
          listesDecisions={listesDecisions}
          loading={loadingListesDecisions}
          activeFilter={activeListFilter}
          setActiveFilter={setActiveListFilter}
          onRefresh={() => loadAllCampaignLists(filters.campagne_id)}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onUpdateStatus={(item) => console.log('Update status:', item)}
          onExportParticipantsOui={exportParticipantsOui}
          getDecisionDisplay={getDecisionDisplay}
          getDecisionLabel={getDecisionLabel}
          getDecisionIcon={getDecisionIcon}
          getDecisionBadgeClass={getDecisionBadgeClass}
          getReceptionStatusDisplay={getReceptionStatusDisplay}
          getReceptionStatusLabel={getReceptionStatusLabel}
          getReceptionStatusIcon={getReceptionStatusIcon}
          getReceptionStatusBadgeClass={getReceptionStatusBadgeClass}
          formatDate={formatDate}
          calculateAge={calculateAge}
          selectedCampagneInfo={selectedCampagneInfo}
          participantsCampagneInfo={participantsCampagneInfo}
        />
      ) : (
        <>
          {/* Filtres médicaux avec campagne */}
<div className="medical-filters">
  <div className="filters-grid">
    <div className="filter-group">
      <label className="medical-label">
        <span className="label-icon">🔍</span>
        Recherche
      </label>
      <input
        type="text"
        className="medical-input"
        placeholder="Nom, prénom, téléphone..."
        value={filters.search}
        onChange={(e) => handleFilterChange('search', e.target.value)}
      />
    </div>

    {/* NOUVEAU FILTRE CAMPAGNE */}
    <div className="filter-group">
      <label className="medical-label">
        <span className="label-icon">🏥</span>
        Campagne
      </label>
      <select
        value={filters.campagne_id}
        onChange={(e) => handleFilterChange('campagne_id', e.target.value)}
        className="medical-select"
      >
        <option value="">Toutes les campagnes</option>
        
        {formOptions.campagnes_actives?.length > 0 && (
          <optgroup label="🩺 Campagnes Actives">
            {formOptions.campagnes_actives.map(campagne => {
              const formatted = formatCampagneForSelect(campagne);
              return (
                <option key={`active-${campagne.id}`} value={campagne.id}>
                  {formatted.displayText}
                </option>
              );
            })}
          </optgroup>
        )}
        
        {formOptions.campagnes_terminees?.length > 0 && (
          <optgroup label="✅ Campagnes Terminées">
            {formOptions.campagnes_terminees.map(campagne => {
              const formatted = formatCampagneForSelect(campagne);
              return (
                <option key={`terminated-${campagne.id}`} value={campagne.id}>
                  {formatted.displayText}
                </option>
              );
            })}
          </optgroup>
        )}
      </select>
    </div>

    <div className="filter-group">
      <label className="medical-label">
        <span className="label-icon">👥</span>
        Sexe
      </label>
      <select
        value={filters.sexe}
        onChange={(e) => handleFilterChange('sexe', e.target.value)}
        className="medical-select"
      >
        <option value="">Tous</option>
        {formOptions.sexes?.map(sexe => (
          <option key={sexe.value} value={sexe.value}>
            {sexe.label}
          </option>
        ))}
      </select>
    </div>

    <div className="filter-group">
      <label className="medical-label">
        <span className="label-icon">🩺</span>
        Type d'assistance
      </label>
      <select
        value={filters.type_assistance_id}
        onChange={(e) => handleFilterChange('type_assistance_id', e.target.value)}
        className="medical-select"
      >
        <option value="">Tous types</option>
        {formOptions.types_assistance?.map(type => (
          <option key={type.id} value={type.id}>
            {type.libelle}
          </option>
        ))}
      </select>
    </div>

    <div className="filter-group">
      <label className="medical-label">
        <span className="label-icon">✅</span>
        Décision
      </label>
      <select
        value={filters.decision}
        onChange={(e) => handleFilterChange('decision', e.target.value)}
        className="medical-select"
      >
        <option value="">Toutes décisions</option>
        {formOptions.decisions?.map(decision => (
          <option key={decision.value} value={decision.value}>
            {decision.label}
          </option>
        ))}
      </select>
    </div>

    {/* FILTRE STATUT BÉNÉFICIAIRE */}
    <div className="filter-group">
      <label className="medical-label">
        <span className="label-icon">📊</span>
        Statut bénéficiaire
      </label>
      <select
        value={filters.a_beneficie}
        onChange={(e) => handleFilterChange('a_beneficie', e.target.value)}
        className="medical-select"
      >
        <option value="">Tous statuts</option>
        <option value="true">✅ A bénéficié</option>
        <option value="false">⏳ En attente</option>
      </select>
    </div>

    {/* FILTRE HORS CAMPAGNE */}
    <div className="filter-group">
      <label className="medical-label">
        <span className="label-icon">⚠️</span>
        Hors campagne
      </label>
      <select
        value={filters.hors_campagne}
        onChange={(e) => handleFilterChange('hors_campagne', e.target.value)}
        className="medical-select"
      >
        <option value="">Tous</option>
        <option value="true">⚠️ Hors campagne</option>
        <option value="false">🏥 Dans une campagne</option>
      </select>
    </div>
  </div>
  
  <div className="filters-actions">
    <button
      className="medical-btn medical-btn-reset"
      onClick={() => {
        setFilters({
          search: '', 
          sexe: '', 
          type_assistance_id: '',
          campagne_id: '',  // Reset aussi la campagne
          hors_campagne: '', 
          a_beneficie: '', 
          enfants_scolarises: '',
          cote: '', 
          decision: '', 
          statut_preselection: '',
          page: 1, 
          per_page: 15,
          sort_by: 'created_at', 
          sort_dir: 'desc'
        });
      }}
    >
      <span className="btn-icon">🔄</span>
      Réinitialiser
    </button>

    <button
      className="medical-btn medical-btn-secondary"
      onClick={() => {
        console.log('Filtres appliqués:', filters);
      }}
    >
      <span className="btn-icon">📊</span>
      Afficher résumé filtres
    </button>
  </div>

  {/* Indicateur des filtres actifs */}
  {(filters.search || filters.sexe || filters.type_assistance_id || filters.campagne_id || 
    filters.decision || filters.a_beneficie || filters.hors_campagne) && (
    <div className="active-filters-indicator">
      <div className="filters-summary">
        <span className="summary-title">Filtres actifs:</span>
        {filters.search && (
          <span className="filter-tag">
            🔍 "{filters.search}"
          </span>
        )}
        {filters.campagne_id && (
          <span className="filter-tag">
            🏥 {formOptions.campagnes?.find(c => c.id == filters.campagne_id)?.nom || 'Campagne sélectionnée'}
          </span>
        )}
        {filters.sexe && (
          <span className="filter-tag">
            👥 {formOptions.sexes?.find(s => s.value === filters.sexe)?.label || filters.sexe}
          </span>
        )}
        {filters.type_assistance_id && (
          <span className="filter-tag">
            🩺 {formOptions.types_assistance?.find(t => t.id == filters.type_assistance_id)?.libelle || 'Type sélectionné'}
          </span>
        )}
        {filters.decision && (
          <span className="filter-tag">
            ✅ {formOptions.decisions?.find(d => d.value === filters.decision)?.label || filters.decision}
          </span>
        )}
        {filters.a_beneficie && (
          <span className="filter-tag">
            📊 {filters.a_beneficie === 'true' ? 'A bénéficié' : 'En attente'}
          </span>
        )}
        {filters.hors_campagne && (
          <span className="filter-tag">
            {filters.hors_campagne === 'true' ? '⚠️ Hors campagne' : '🏥 Dans campagne'}
          </span>
        )}
      </div>
    </div>
  )}
</div>

          {/* Affichage des erreurs */}
          {error && (
            <div className="medical-error">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <h3>Erreur de chargement</h3>
                <p>{error}</p>
                <button className="medical-btn medical-btn-retry" onClick={loadBeneficiaires}>
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {/* Tableau médical professionnel ÉTENDU */}
          {!loading && !error && (
            <>
              <div className="medical-table-container">
                <div className="medical-table-header">
                  <h2 className="table-title">
                    <span className="title-icon">📋</span>
                    Dossiers Patients
                  </h2>
                  
                </div>
                
                <div className="medical-table-wrapper">
                  <table className="medical-table">
                    <thead>
                      <tr>
                        
                        <th className="col-patient">
                          <span className="col-icon">👤</span>
                          Patient
                        </th>
                        <th className="col-contact">
                          <span className="col-icon">📞</span>
                          Contact
                        </th>
                        <th className="col-assistance">
                          <span className="col-icon">🩺</span>
                          Assistance
                        </th>
                        <th className="col-campagne">
                          <span className="col-icon">🏥</span>
                          Campagne
                        </th>
                        <th className="col-status">
                          <span className="col-icon">📊</span>
                          Statut
                        </th>
                        <th className="col-decision">
                          <span className="col-icon">✅</span>
                          Décision
                        </th>
                        <th className="col-date">
                          <span className="col-icon">📅</span>
                          Date
                        </th>
                        <th className="col-actions">
                          <span className="col-icon">⚙️</span>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaires.map((beneficiaire) => {
                        const age = calculateAge(beneficiaire.date_naissance);
                        const isSelected = selectedItems.includes(beneficiaire.id);
                        const decisionDisplay = getDecisionDisplay(beneficiaire.decision);
                        const preselectionStatusDisplay = getPreselectionStatusDisplay(beneficiaire.statut_preselection);
                        
                        const isPreselectionParticipant = beneficiaire.decision === 'preselection_oui' || 
                                                         beneficiaire.decision === 'preselection_non';
                        
                        return (
                          <tr key={beneficiaire.id} className={isSelected ? 'selected' : ''}>
                            
                            
                            <td className="col-patient">
                              <div className="patient-info">
                                <div className="patient-name">
                                  <strong>{beneficiaire.nom} {beneficiaire.prenom}</strong>
                                  {isPreselectionParticipant && (
                                    <span className="medical-badge badge-preselection-participant">
                                      🎯 Participant
                                    </span>
                                  )}
                                </div>
                                <div className="patient-details">
                                  <span className="patient-gender">
                                    {beneficiaire.sexe === 'M' ? '👨 Homme' : '👩 Femme'}
                                  </span>
                                  {age && (
                                    <span className="patient-age">
                                      {age} ans
                                      {age < 18 && <span className="minor-badge">👶 Mineur</span>}
                                    </span>
                                  )}
                                </div>
                                {beneficiaire.cin && (
                                  <div className="patient-cin">
                                    <span className="cin-icon">🆔</span>
                                    {beneficiaire.cin}
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            <td className="col-contact">
                              <div className="contact-info">
                                {beneficiaire.telephone && (
                                  <div className="contact-item">
                                    <span className="contact-icon">📞</span>
                                    <span className="contact-value">{beneficiaire.telephone}</span>
                                  </div>
                                )}
                                {beneficiaire.email && (
                                  <div className="contact-item">
                                    <span className="contact-icon">✉️</span>
                                    <span className="contact-value">{beneficiaire.email}</span>
                                  </div>
                                )}
                                {beneficiaire.adresse && (
                                  <div className="address-item">
                                    <span className="contact-icon">📍</span>
                                    <span className="address-text">{beneficiaire.adresse}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            <td className="col-assistance">
                              <div className="assistance-info">
                                <div className="assistance-type">
                                  {beneficiaire.type_assistance || 'Non défini'}
                                </div>
                                <div className="assistance-specifics">
                                  {beneficiaire.enfants_scolarises !== null && (
                                    <span className={`medical-badge ${beneficiaire.enfants_scolarises ? 'badge-yes' : 'badge-no'}`}>
                                      Scolarisé: {beneficiaire.enfants_scolarises ? 'Oui' : 'Non'}
                                    </span>
                                  )}
                                  {beneficiaire.cote && (
                                    <span className="medical-badge badge-info">
                                      {beneficiaire.cote}
                                    </span>
                                  )}
                                  {beneficiaire.lateralite && (
                                    <span className="medical-badge badge-secondary">
                                      {beneficiaire.lateralite}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            <td className="col-campagne">
                              <div className="campagne-info">
                                {beneficiaire.hors_campagne ? (
                                  <span className="medical-badge badge-warning">
                                    <span className="badge-icon">⚠️</span>
                                    Hors campagne
                                  </span>
                                ) : (
                                  <div className="campagne-name">
                                    {beneficiaire.campagne_nom || 'Non assigné'}
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            <td className="col-status">
                              <div className="status-info">
                                <span className={`medical-badge ${beneficiaire.a_beneficie ? 'badge-benefited' : 'badge-waiting'}`}>
                                  <span className="badge-icon">
                                    {beneficiaire.a_beneficie ? '✅' : '⏳'}
                                  </span>
                                  {beneficiaire.a_beneficie ? 'A bénéficié' : 'En attente'}
                                </span>
                              </div>
                            </td>
                            
                            <td className="col-decision">
                              <div className="decision-info">
                                <span className={`medical-badge ${decisionDisplay.class}`}>
                                  <span className="badge-icon">{decisionDisplay.icon}</span>
                                  {decisionDisplay.label}
                                </span>
                              </div>
                            </td>
                            
                            
                            
                            <td className="col-date">
                              <div className="date-info">
                                <div className="creation-date">
                                  {formatDate(beneficiaire.created_at)}
                                </div>
                                {beneficiaire.updated_at && beneficiaire.updated_at !== beneficiaire.created_at && (
                                  <div className="update-date">
                                    <small>Modifié: {formatDate(beneficiaire.updated_at)}</small>
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            <td className="col-actions">
                              <div className="action-buttons">
                                <button
                                  className="medical-action-btn edit-btn"
                                  onClick={() => handleEdit(beneficiaire)}
                                  title="Modifier le dossier"
                                >
                                  <span className="btn-icon">✏️</span>
                                </button>
                                <button
                                  className="medical-action-btn view-btn"
                                  onClick={() => handleViewDetails(beneficiaire)}
                                  title="Voir le dossier complet"
                                >
                                  <span className="btn-icon">👁️</span>
                                </button>
                                <button
                                  className={`medical-action-btn status-btn ${beneficiaire.a_beneficie ? 'benefited' : 'pending'}`}
                                  onClick={() => handleToggleBeneficiaireStatus(beneficiaire)}
                                  title={beneficiaire.a_beneficie ? "Marquer comme 'En attente'" : "Marquer comme 'A bénéficié'"}
                                >
                                  <span className="btn-icon">{beneficiaire.a_beneficie ? '⏳' : '✅'}</span>
                                </button>
                                {isPreselectionParticipant && (
                                  <button
                                    className="medical-action-btn preselection-btn"
                                    onClick={() => console.log('Preselection:', beneficiaire)}
                                    title="Mettre à jour statut présélection"
                                  >
                                    <span className="btn-icon">🎯</span>
                                  </button>
                                )}
                                <button
                                  className="medical-action-btn delete-btn"
                                  onClick={() => handleDelete(beneficiaire.id)}
                                  title="Supprimer le dossier"
                                >
                                  <span className="btn-icon">🗑️</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {beneficiaires.length === 0 && (
                    <div className="medical-empty-state">
                      <div className="empty-icon">🏥</div>
                      <h3>Aucun patient trouvé</h3>
                      <p>Aucun bénéficiaire ne correspond aux critères de recherche actuels.</p>
                      <button className="medical-btn medical-btn-primary" onClick={handleCreate}>
                        <span className="btn-icon">👤</span>
                        Ajouter un nouveau patient
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination médicale */}
              {pagination && pagination.last_page > 1 && (
                <Pagination
                  currentPage={pagination.current_page}
                  lastPage={pagination.last_page}
                  total={pagination.total}
                  perPage={pagination.per_page}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </>
      )}

      {/* ✅ MODALS PRINCIPAUX */}
      
      {/* ✅ Modal Nouveau Patient AVEC FORMULAIRE */}
      {showCreateModal && (
        <Modal
          title={
            <div className="modal-medical-title">
              <span className="modal-icon">👤</span>
              Nouveau Patient
            </div>
          }
          onClose={closeModals}
          className="medical-modal medical-modal-large"
        >
          <BeneficiaireForm
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            setFormErrors={setFormErrors}
            formSubmitting={formSubmitting}
            onSubmit={handleFormSubmit}
            onCancel={closeModals}
            formOptions={formOptions}
            selectedBeneficiaire={null}
            isEdit={false}
          />
        </Modal>
      )}

      {/* ✅ Modal Modifier Patient AVEC FORMULAIRE */}
      {showEditModal && selectedBeneficiaire && (
        <Modal
          title={
            <div className="modal-medical-title">
              <span className="modal-icon">✏️</span>
              Modifier Patient: {selectedBeneficiaire.nom} {selectedBeneficiaire.prenom}
            </div>
          }
          onClose={closeModals}
          className="medical-modal medical-modal-large"
        >
          <BeneficiaireForm
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            setFormErrors={setFormErrors}
            formSubmitting={formSubmitting}
            onSubmit={handleFormSubmit}
            onCancel={closeModals}
            formOptions={formOptions}
            selectedBeneficiaire={selectedBeneficiaire}
            isEdit={true}
          />
        </Modal>
      )}

      {/* ✅ Modal Import Excel AVEC COMPOSANT COMPLET */}
      {showImportModal && (
        <Modal
          title={
            <div className="modal-medical-title">
              <span className="modal-icon">📥</span>
              Import Excel/CSV - Bénéficiaires
            </div>
          }
          onClose={closeModals}
          className="medical-modal medical-modal-extra-large"
        >
          <ImportExcelForm
            importFile={importFile}
            setImportFile={setImportFile}
            importCampagne={importCampagne}
            setImportCampagne={setImportCampagne}
            importValidation={importValidation}
            setImportValidation={setImportValidation}
            importProgress={importProgress}
            setImportProgress={setImportProgress}
            isImporting={isImporting}
            setIsImporting={setIsImporting}
            importError={importError}
            setImportError={setImportError}
            formOptions={formOptions}
            onImportSuccess={handleImportSuccess}
            onClose={closeModals}
          />
        </Modal>
      )}

      {/* Modal Détails Patient */}
      {showDetailsModal && selectedBeneficiaire && (
        <Modal
          title={
            <div className="modal-medical-title">
              <span className="modal-icon">👁️</span>
              Dossier Complet: {selectedBeneficiaire.nom} {selectedBeneficiaire.prenom}
            </div>
          }
          onClose={closeModals}
          className="medical-modal medical-modal-large"
        >
          <div className="details-placeholder">
            <p>👁️ Composant BeneficiaireDetails à implémenter ici</p>
            <p>Affichage complet des informations du bénéficiaire</p>
            {loadingDetails && <p>⏳ Chargement des détails...</p>}
            {detailsBeneficiaire && (
              <div className="beneficiaire-details-preview">
                <h4>Aperçu des détails chargés :</h4>
                <pre>{JSON.stringify(detailsBeneficiaire, null, 2)}</pre>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Actions en masse */}
      {showMassActionModal && (
        <Modal
          title={
            <div className="modal-medical-title">
              <span className="modal-icon">⚙️</span>
              Actions Groupées ({selectedItems.length} éléments)
            </div>
          }
          onClose={closeModals}
          className="medical-modal"
        >
          <div className="mass-actions-placeholder">
            <p>⚙️ Composant MassActions à implémenter ici</p>
            <p>Actions groupées sur {selectedItems.length} bénéficiaires sélectionnés</p>
            <div className="selected-items-preview">
              <h4>Éléments sélectionnés :</h4>
              <ul>
                {selectedItems.map(id => {
                  const beneficiaire = beneficiaires.find(b => b.id === id);
                  return beneficiaire ? (
                    <li key={id}>{beneficiaire.nom} {beneficiaire.prenom}</li>
                  ) : null;
                })}
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ===== ✅ COMPOSANT: Vue des 4 listes optimisée =====
const QuatreListes4ViewOptimisee = ({ 
  listesDecisions, 
  loading, 
  activeFilter,
  setActiveFilter,
  onRefresh,
  onViewDetails,
  onEdit,
  onUpdateStatus,
  onExportParticipantsOui,
  getDecisionDisplay,
  getDecisionLabel,
  getDecisionIcon,
  getDecisionBadgeClass,
  getReceptionStatusDisplay,
  getReceptionStatusLabel,
  getReceptionStatusIcon,
  getReceptionStatusBadgeClass,
  formatDate,
  calculateAge,
  selectedCampagneInfo,
  participantsCampagneInfo
}) => {

  // ✅ FONCTIONS UTILITAIRES
  const isCampagneAppareilsAuditifs = (participantsCampagneInfo, selectedCampagneInfo) => {
    const typeAssistance = participantsCampagneInfo?.type_assistance || 
                           selectedCampagneInfo?.type_assistance || 
                           selectedCampagneInfo?.libelle || '';
    
    const isAppareilsAuditifs = typeAssistance.toLowerCase().includes('appareils auditifs') ||
                                typeAssistance.toLowerCase().includes('appareil auditif') ||
                                typeAssistance.toLowerCase().includes('auditif');
    
    return isAppareilsAuditifs;
  };

  // ✅ ÉTAT DE CHARGEMENT
  if (loading) {
    return (
      <div className="quatre-listes-loading">
        <div className="medical-loading">
          <div className="medical-spinner"></div>
          <p>Chargement des 4 listes de la campagne optimisées...</p>
        </div>
      </div>
    );
  }

  const totalElements = listesDecisions.liste_participants.length + 
                        listesDecisions.liste_principale.length + 
                        listesDecisions.liste_attente.length + 
                        listesDecisions.liste_rejetes.length;

  // ✅ ÉTAT VIDE
  if (totalElements === 0) {
    return (
      <div className="quatre-listes-empty">
        <div className="medical-empty-state">
          <div className="empty-icon">📋</div>
          <h3>Aucun élément trouvé dans les listes</h3>
          <p>Aucun participant, bénéficiaire ou décision n'est disponible pour cette campagne.</p>
          <button className="medical-btn medical-btn-retry" onClick={onRefresh}>
            🔄 Recharger
          </button>
        </div>
      </div>
    );
  }

  // ✅ FONCTIONS: Obtenir les données de la liste active
  const getActiveListData = () => {
    switch (activeFilter) {
      case 'liste_participants':
        return listesDecisions.liste_participants || [];
      case 'liste_principale':
        return listesDecisions.liste_principale || [];
      case 'liste_attente':
        return listesDecisions.liste_attente || [];
      case 'liste_rejetes':
        return listesDecisions.liste_rejetes || [];
      default:
        return listesDecisions.liste_participants || [];
    }
  };

  const getActiveListTitle = () => {
    switch (activeFilter) {
      case 'liste_participants':
        return '📞 Participants Réception Optimisés';
      case 'liste_principale':
        return '✅ Liste Principale (Acceptés)';
      case 'liste_attente':
        return '⏳ Liste d\'Attente';
      case 'liste_rejetes':
        return '❌ Liste des Rejetés';
      default:
        return '📞 Participants Réception';
    }
  };

  const isParticipantsReceptionList = () => {
    return activeFilter === 'liste_participants';
  };

  const isCampagneAuditive = () => {
    return isCampagneAppareilsAuditifs(participantsCampagneInfo, selectedCampagneInfo);
  };

  // ✅ UTILISER LES VARIABLES CALCULÉES
  const activeListData = getActiveListData();
  const activeListTitle = getActiveListTitle();
  const isReceptionList = isParticipantsReceptionList();
  const isAuditive = isCampagneAuditive();

  return (
    <div className="quatre-listes-view optimisee">
      {/* En-tête des listes */}
      <div className="listes-header">
        <div className="listes-title">
          <h2>📋 4 Listes de la Campagne - {selectedCampagneInfo?.nom}</h2>
          <p className="listes-subtitle">
            Participants Réception (optimisés) • Liste Principale • Liste d'Attente • Rejetés
          </p>
          {/* ✅ INDICATEUR CAMPAGNE APPAREILS AUDITIFS */}
          {isCampagneAppareilsAuditifs(participantsCampagneInfo, selectedCampagneInfo) && (
            <div className="campagne-type-indicator">
              <span className="medical-badge badge-auditive">
                👂 Campagne Appareils Auditifs - Colonne "Côté" activée
              </span>
            </div>
          )}
        </div>
        
        {/* Statistiques globales des 4 listes */}
        <div className="global-statistics">
          
          <div className="medical-stat-card participants">
            <div className="stat-number">{listesDecisions.liste_participants.length}</div>
            <div className="stat-label">Participants Optimisés</div>
          </div>
          <div className="medical-stat-card principale">
            <div className="stat-number">{listesDecisions.liste_principale.length}</div>
            <div className="stat-label">Liste Principale</div>
          </div>
          <div className="medical-stat-card attente">
            <div className="stat-number">{listesDecisions.liste_attente.length}</div>
            <div className="stat-label">Liste d'Attente</div>
          </div>
          <div className="medical-stat-card rejetes">
            <div className="stat-number">{listesDecisions.liste_rejetes.length}</div>
            <div className="stat-label">Rejetés</div>
          </div>
        </div>

        <div className="listes-actions">
          <button className="medical-btn medical-btn-secondary" onClick={onRefresh}>
            🔄 Actualiser toutes les listes
          </button>
          
          <button 
            className="medical-btn medical-btn-success export-oui"
            onClick={() => {
              // Utiliser la fonction d'export passée en props
              if (onExportParticipantsOui) {
                onExportParticipantsOui();
              } else {
                console.log('Export participants OUI - fonction non disponible');
              }
            }}
            title="Exporter uniquement les participants avec statut OUI"
          >
            ✅ Exporter Participants OUI
          </button>
        </div>
      </div>

      {/* Filtres par liste */}
      <div className="listes-filters">
        <button 
          className={`filter-btn participants ${activeFilter === 'liste_participants' ? 'active' : ''}`}
          onClick={() => setActiveFilter('liste_participants')}
        >
          📞 Participants Optimisés ({listesDecisions.liste_participants.length})
          {isAuditive && <span className="auditive-indicator">👂</span>}
        </button>
        <button 
          className={`filter-btn principale ${activeFilter === 'liste_principale' ? 'active' : ''}`}
          onClick={() => setActiveFilter('liste_principale')}
        >
          ✅ Liste Principale ({listesDecisions.liste_principale.length})
        </button>
        <button 
          className={`filter-btn attente ${activeFilter === 'liste_attente' ? 'active' : ''}`}
          onClick={() => setActiveFilter('liste_attente')}
        >
          ⏳ Liste d'Attente ({listesDecisions.liste_attente.length})
        </button>
        <button 
          className={`filter-btn rejetes ${activeFilter === 'liste_rejetes' ? 'active' : ''}`}
          onClick={() => setActiveFilter('liste_rejetes')}
        >
          ❌ Rejetés ({listesDecisions.liste_rejetes.length})
        </button>
      </div>

      {/* ✅ TABLEAU UNIFIÉ OPTIMISÉ POUR LES 4 LISTES */}
      <div className="listes-table-container">
        <div className="medical-table-header">
          <h3 className="table-title">
            <span className="title-icon">
              {activeFilter === 'liste_participants' ? '📞' : 
               activeFilter === 'liste_principale' ? '✅' :
               activeFilter === 'liste_attente' ? '⏳' : '❌'}
            </span>
            {activeListTitle} ({activeListData.length})
          </h3>
          <div className="table-info">
            
          </div>
        </div>
        
        <div className="medical-table-wrapper">
          <table className="medical-table listes-optimisees">
            <thead>
              <tr>
                {/* Colonnes de base pour tous */}
                <th className="col-patient">
                  <span className="col-icon">👤</span>
                  Patient
                </th>
                <th className="col-contact">
                  <span className="col-icon">📞</span>
                  Contact
                </th>
                <th className="col-assistance">
                  <span className="col-icon">🩺</span>
                  Assistance
                </th>
                
                {/* ✅ COLONNES CONDITIONNELLES SELON LE TYPE DE LISTE */}
                {isReceptionList ? (
                  // Colonnes spécifiques pour les participants réception
                  <>
                    <th className="col-statut-reception">
                      <span className="col-icon">📞</span>
                      Statut Réception
                    </th>
                    <th className="col-date-appel">
                      <span className="col-icon">📅</span>
                      Date Appel
                    </th>
                    
                  </>
                ) : (
                  // Colonnes pour les listes de décisions
                  <>
                    <th className="col-campagne">
                      <span className="col-icon">🏥</span>
                      Campagne
                    </th>
                    <th className="col-decision">
                      <span className="col-icon">✅</span>
                      Décision
                    </th>
                    <th className="col-status">
                      <span className="col-icon">📊</span>
                      Statut
                    </th>
                    <th className="col-enfants">
                      <span className="col-icon">👶</span>
                      Enfants Scolarisés
                    </th>
                  </>
                )}
                
                <th className="col-date">
                  <span className="col-icon">📅</span>
                  Date Création
                </th>
                <th className="col-actions">
                  <span className="col-icon">⚙️</span>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {activeListData.map((item) => {
                const age = calculateAge(item.date_naissance);
                const nomComplet = item.nom_complet || `${item.prenom || ''} ${item.nom || ''}`.trim();
                
                return (
                  <tr key={`${item.id}-${item.source || 'default'}`} className={`row-${activeFilter}`}>
                    {/* Colonne Patient */}
                    <td className="col-patient">
                      <div className="patient-info">
                        <div className="patient-name">
                          <strong>{nomComplet}</strong>
                          {isReceptionList && (
                            <span className="medical-badge badge-reception">
                              📞 Participant
                            </span>
                          )}
                        </div>
                        <div className="patient-details">
                          <span className="patient-gender">
                            {item.sexe === 'M' ? '👨 Homme' : '👩 Femme'}
                          </span>
                          {age && (
                            <span className="patient-age">
                              {age} ans
                              {age < 18 && <span className="minor-badge">👶</span>}
                            </span>
                          )}
                        </div>
                        {item.cin && (
                          <div className="patient-cin">
                            <span className="cin-icon">🆔</span>
                            {item.cin}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Colonne Contact */}
                    <td className="col-contact">
                      <div className="contact-info">
                        {item.telephone && (
                          <div className="contact-item">
                            <span className="contact-icon">📞</span>
                            <span className="contact-value">{item.telephone}</span>
                          </div>
                        )}
                        {item.email && (
                          <div className="contact-item">
                            <span className="contact-icon">✉️</span>
                            <span className="contact-value">{item.email}</span>
                          </div>
                        )}
                        {item.adresse && (
                          <div className="address-item">
                            <span className="contact-icon">📍</span>
                            <span className="address-text">{item.adresse}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Colonne Assistance */}
                    <td className="col-assistance">
                      <div className="assistance-info">
                        <div className="assistance-type">
                          {item.type_assistance || 'Non défini'}
                        </div>
                        {item.lateralite && (
                          <span className="medical-badge badge-secondary">
                            {item.lateralite}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* ✅ COLONNES CONDITIONNELLES */}
                    {isReceptionList ? (
                      // Colonnes spécifiques participants réception
                      <>
                        {/* Statut Réception */}
                        <td className="col-statut-reception">
                          <div className="statut-reception-info">
                            {(() => {
                              const statutDisplay = getReceptionStatusDisplay(item.statut);
                              return (
                                <span className={`medical-badge ${statutDisplay.class}`}>
                                  <span className="badge-icon">{statutDisplay.icon}</span>
                                  {statutDisplay.label}
                                </span>
                              );
                            })()}
                            {item.commentaire && (
                              <small className="commentaire-text">
                                💬 {item.commentaire}
                              </small>
                            )}
                          </div>
                        </td>
                        
                        {/* Date Appel */}
                        <td className="col-date-appel">
                          <div className="date-appel-info">
                            {item.date_appel_formatee || item.date_appel ? (
                              <div className="appel-date">
                                📅 {item.date_appel_formatee || formatDate(item.date_appel)}
                              </div>
                            ) : (
                              <span className="no-appel">Pas d'appel</span>
                            )}
                            {item.derniere_activite && (
                              <small className="derniere-activite">
                                🕒 {item.derniere_activite}
                              </small>
                            )}
                          </div>
                        </td>
                        
                        
                      </>
                    ) : (
                      // Colonnes pour les listes de décisions
                      <>
                        {/* Campagne */}
                        <td className="col-campagne">
                          <div className="campagne-info">
                            {item.hors_campagne ? (
                              <span className="medical-badge badge-warning">
                                <span className="badge-icon">⚠️</span>
                                Hors campagne
                              </span>
                            ) : (
                              <div className="campagne-name">
                                {item.campagne_nom || selectedCampagneInfo?.nom || 'Non assigné'}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* Décision */}
                        <td className="col-decision">
                          <div className="decision-info">
                            {(() => {
                              const decisionDisplay = getDecisionDisplay(item.decision);
                              return (
                                <span className={`medical-badge ${decisionDisplay.class}`}>
                                  <span className="badge-icon">{decisionDisplay.icon}</span>
                                  {decisionDisplay.label}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        
                        {/* Statut */}
                        <td className="col-status">
                          <div className="status-info">
                            <span className={`medical-badge ${item.a_beneficie ? 'badge-benefited' : 'badge-waiting'}`}>
                              <span className="badge-icon">
                                {item.a_beneficie ? '✅' : '⏳'}
                              </span>
                              {item.a_beneficie_libelle || (item.a_beneficie ? 'A bénéficié' : 'En attente')}
                            </span>
                          </div>
                        </td>
                        
                        {/* Enfants Scolarisés */}
                        <td className="col-enfants">
                          <div className="enfants-info">
                            {item.enfants_scolarises !== null && item.enfants_scolarises !== undefined ? (
                              <span className={`medical-badge ${item.enfants_scolarises ? 'badge-yes' : 'badge-no'}`}>
                                {item.enfants_scolarises ? '✅ Oui' : '❌ Non'}
                              </span>
                            ) : (
                              <span className="medical-badge badge-not-applicable">
                                ❓ Non renseigné
                              </span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    
                    {/* Date Création */}
                    <td className="col-date">
                      <div className="date-info">
                        <div className="creation-date">
                          {item.date_creation_formatee || formatDate(item.created_at)}
                        </div>
                        {item.date_modification_formatee && (
                          <div className="update-date">
                            <small>Modifié: {item.date_modification_formatee}</small>
                          </div>
                        )}
                        {isReceptionList && item.type_liste && (
                          <small className="type-liste">
                            📋 {item.type_liste}
                          </small>
                        )}
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="col-actions">
                      <div className="action-buttons">
                        <button
                          className="medical-action-btn edit-btn"
                          onClick={() => onEdit(item)}
                          title="Modifier le dossier"
                        >
                          <span className="btn-icon">✏️</span>
                        </button>
                        <button
                          className="medical-action-btn view-btn"
                          onClick={() => onViewDetails(item)}
                          title="Voir le dossier complet"
                        >
                          <span className="btn-icon">👁️</span>
                        </button>
                        
                        {!isReceptionList && (item.decision === 'preselection_oui' || item.decision === 'preselection_non') && (
                          <button
                            className="medical-action-btn preselection-btn"
                            onClick={() => onUpdateStatus(item)}
                            title="Mettre à jour statut présélection"
                          >
                            <span className="btn-icon">🎯</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          
        </div>

        
      </div>
    </div>
  );
};

export default BeneficiairesPage;

/* ✅ STYLES CSS SUPPLÉMENTAIRES POUR LES EXPORTS */
const exportStyles = `
  .medical-btn-success {
    background: #28a745;
    color: white;
    border: 1px solid #28a745;
  }

  .medical-btn-success:hover:not(:disabled) {
    background: #218838;
    border-color: #1e7e34;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
  }

  .medical-btn-export {
    background: #17a2b8;
    color: white;
    border: 1px solid #17a2b8;
  }

  .medical-btn-export:hover:not(:disabled) {
    background: #138496;
    border-color: #117a8b;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(23, 162, 184, 0.3);
  }

  .export-oui {
    position: relative;
    overflow: hidden;
  }

  .export-oui::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }

  .export-oui:hover::before {
    left: 100%;
  }

  .medical-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .medical-actions .medical-btn {
    white-space: nowrap;
    min-height: 40px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
  }

  .table-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .table-actions .medical-btn {
    font-size: 14px;
    padding: 8px 12px;
  }

  .listes-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
  }

  .listes-actions .medical-btn {
    font-size: 14px;
    padding: 10px 16px;
    border-radius: 6px;
  }

  /* Animation pour les boutons d'export */
  @keyframes export-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .medical-btn-success:active,
  .medical-btn-export:active {
    animation: export-pulse 0.3s ease;
  }

  /* Responsive design pour les actions */
  @media (max-width: 768px) {
    .medical-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .medical-actions .medical-btn {
      width: 100%;
      justify-content: center;
      margin-bottom: 8px;
    }

    .table-actions {
      flex-direction: column;
      gap: 8px;
    }

    .table-actions .medical-btn {
      width: 100%;
      justify-content: center;
    }

    .listes-actions {
      flex-direction: column;
      gap: 8px;
    }

    .listes-actions .medical-btn {
      width: 100%;
      justify-content: center;
    }
  }

  /* Styles pour les badges de statut dans les exports */
  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
  }

  .status-indicator.success {
    color: #28a745;
  }

  .status-indicator.warning {
    color: #ffc107;
  }

  .status-indicator.danger {
    color: #dc3545;
  }

  /* Amélioration des tooltips pour les boutons */
  .medical-btn[title]:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
    margin-bottom: 5px;
  }

  .medical-btn[title]:hover::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.8);
    z-index: 1000;
    margin-bottom: 1px;
  }

  .medical-btn {
    position: relative;
  }

  /* Animation de chargement pour les exports */
  .export-loading {
    position: relative;
    pointer-events: none;
  }

  .export-loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .export-success {
    background: #d4edda !important;
    border-color: #c3e6cb !important;
    color: #155724 !important;
  }

  .export-error {
    background: #f8d7da !important;
    border-color: #f5c6cb !important;
    color: #721c24 !important;
  }

  /* Styles pour les notifications d'export */
  .export-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 15px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1050;
    max-width: 350px;
    animation: slideInRight 0.3s ease;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .export-notification.success {
    border-left: 4px solid #28a745;
  }

  .export-notification.error {
    border-left: 4px solid #dc3545;
  }

  .export-notification .notification-title {
    font-weight: 600;
    margin-bottom: 5px;
  }

  .export-notification .notification-message {
    font-size: 14px;
    color: #6c757d;
  }

  /* Amélioration des icônes dans les boutons */
  .btn-icon {
    font-size: 16px;
    line-height: 1;
  }

  .medical-btn .btn-icon {
    transition: transform 0.2s ease;
  }

  .medical-btn:hover .btn-icon {
    transform: scale(1.1);
  }

  /* Styles pour les compteurs dans les boutons */
  .btn-counter {
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
  }

  .medical-btn-success .btn-counter {
    background: rgba(255, 255, 255, 0.3);
  }

  .medical-btn-export .btn-counter {
    background: rgba(255, 255, 255, 0.3);
  }
`;