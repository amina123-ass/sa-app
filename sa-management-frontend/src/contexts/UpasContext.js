// src/contexts/UpasContext.js
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { upasAPI } from '../services/upasAPI';
import { useNotification } from './NotificationContext';

const UpasContext = createContext();

// État initial
const initialState = {
  // Dashboard
  dashboardData: null,
  loading: false,
  
  // Campagnes
  campagnes: [],
  campagneActive: null,
  campagnesPagination: null,
  
  // Bénéficiaires
  beneficiaires: [],
  beneficiairesPagination: null,
  
  // Types d'assistance
  typesAssistance: [],
  
  // Kafalas
  kafalas: [],
  kafalasPagination: null,
  
  // Participants
  participants: [],
  participantsPagination: null,
  
  // Assistances médicales
  assistances: [],
  assistancesPagination: null,
  
  // Statistiques
  statistiques: null,
  statistiquesTempsReel: null,
  
  // Options de formulaires
  formOptions: null,
  
  // États de chargement spécifiques
  loadingStates: {
    dashboard: false,
    campagnes: false,
    beneficiaires: false,
    kafalas: false,
    participants: false,
    assistances: false,
    import: false,
    export: false,
    statistiques: false
  },
  
  // Erreurs
  errors: {}
};

// Actions
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_LOADING_STATE: 'SET_LOADING_STATE',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Dashboard
  SET_DASHBOARD_DATA: 'SET_DASHBOARD_DATA',
  
  // Campagnes
  SET_CAMPAGNES: 'SET_CAMPAGNES',
  ADD_CAMPAGNE: 'ADD_CAMPAGNE',
  UPDATE_CAMPAGNE: 'UPDATE_CAMPAGNE',
  DELETE_CAMPAGNE: 'DELETE_CAMPAGNE',
  SET_CAMPAGNE_ACTIVE: 'SET_CAMPAGNE_ACTIVE',
  
  // Bénéficiaires
  SET_BENEFICIAIRES: 'SET_BENEFICIAIRES',
  ADD_BENEFICIAIRE: 'ADD_BENEFICIAIRE',
  UPDATE_BENEFICIAIRE: 'UPDATE_BENEFICIAIRE',
  DELETE_BENEFICIAIRE: 'DELETE_BENEFICIAIRE',
  
  // Types d'assistance
  SET_TYPES_ASSISTANCE: 'SET_TYPES_ASSISTANCE',
  ADD_TYPE_ASSISTANCE: 'ADD_TYPE_ASSISTANCE',
  UPDATE_TYPE_ASSISTANCE: 'UPDATE_TYPE_ASSISTANCE',
  DELETE_TYPE_ASSISTANCE: 'DELETE_TYPE_ASSISTANCE',
  
  // Kafalas
  SET_KAFALAS: 'SET_KAFALAS',
  ADD_KAFALA: 'ADD_KAFALA',
  UPDATE_KAFALA: 'UPDATE_KAFALA',
  DELETE_KAFALA: 'DELETE_KAFALA',
  
  // Participants
  SET_PARTICIPANTS: 'SET_PARTICIPANTS',
  UPDATE_PARTICIPANT_STATUT: 'UPDATE_PARTICIPANT_STATUT',
  
  // Assistances
  SET_ASSISTANCES: 'SET_ASSISTANCES',
  ADD_ASSISTANCE: 'ADD_ASSISTANCE',
  
  // Statistiques
  SET_STATISTIQUES: 'SET_STATISTIQUES',
  SET_STATISTIQUES_TEMPS_REEL: 'SET_STATISTIQUES_TEMPS_REEL',
  
  // Options
  SET_FORM_OPTIONS: 'SET_FORM_OPTIONS'
};

// Reducer
const upasReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
      
    case ACTIONS.SET_LOADING_STATE:
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
          [action.key]: action.payload
        }
      };
      
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.key]: action.payload
        }
      };
      
    case ACTIONS.CLEAR_ERROR:
      const newErrors = { ...state.errors };
      delete newErrors[action.key];
      return {
        ...state,
        errors: newErrors
      };
      
    case ACTIONS.SET_DASHBOARD_DATA:
      return {
        ...state,
        dashboardData: action.payload
      };
      
    case ACTIONS.SET_CAMPAGNES:
      return {
        ...state,
        campagnes: action.payload.data || action.payload,
        campagnesPagination: action.payload.data ? action.payload : null
      };
      
    case ACTIONS.ADD_CAMPAGNE:
      return {
        ...state,
        campagnes: [action.payload, ...state.campagnes]
      };
      
    case ACTIONS.UPDATE_CAMPAGNE:
      return {
        ...state,
        campagnes: state.campagnes.map(c => 
          c.id === action.payload.id ? action.payload : c
        )
      };
      
    case ACTIONS.DELETE_CAMPAGNE:
      return {
        ...state,
        campagnes: state.campagnes.filter(c => c.id !== action.payload)
      };
      
    case ACTIONS.SET_CAMPAGNE_ACTIVE:
      return {
        ...state,
        campagneActive: action.payload
      };
      
    case ACTIONS.SET_BENEFICIAIRES:
      return {
        ...state,
        beneficiaires: action.payload.data || action.payload,
        beneficiairesPagination: action.payload.data ? action.payload : null
      };
      
    case ACTIONS.ADD_BENEFICIAIRE:
      return {
        ...state,
        beneficiaires: [action.payload, ...state.beneficiaires]
      };
      
    case ACTIONS.UPDATE_BENEFICIAIRE:
      return {
        ...state,
        beneficiaires: state.beneficiaires.map(b => 
          b.id === action.payload.id ? action.payload : b
        )
      };
      
    case ACTIONS.DELETE_BENEFICIAIRE:
      return {
        ...state,
        beneficiaires: state.beneficiaires.filter(b => b.id !== action.payload)
      };
      
    case ACTIONS.SET_TYPES_ASSISTANCE:
      return {
        ...state,
        typesAssistance: action.payload
      };
      
    case ACTIONS.ADD_TYPE_ASSISTANCE:
      return {
        ...state,
        typesAssistance: [...state.typesAssistance, action.payload]
      };
      
    case ACTIONS.UPDATE_TYPE_ASSISTANCE:
      return {
        ...state,
        typesAssistance: state.typesAssistance.map(t => 
          t.id === action.payload.id ? action.payload : t
        )
      };
      
    case ACTIONS.DELETE_TYPE_ASSISTANCE:
      return {
        ...state,
        typesAssistance: state.typesAssistance.filter(t => t.id !== action.payload)
      };
      
    case ACTIONS.SET_KAFALAS:
      return {
        ...state,
        kafalas: action.payload.data || action.payload,
        kafalasPagination: action.payload.data ? action.payload : null
      };
      
    case ACTIONS.ADD_KAFALA:
      return {
        ...state,
        kafalas: [action.payload, ...state.kafalas]
      };
      
    case ACTIONS.UPDATE_KAFALA:
      return {
        ...state,
        kafalas: state.kafalas.map(k => 
          k.id === action.payload.id ? action.payload : k
        )
      };
      
    case ACTIONS.DELETE_KAFALA:
      return {
        ...state,
        kafalas: state.kafalas.filter(k => k.id !== action.payload)
      };
      
    case ACTIONS.SET_PARTICIPANTS:
      return {
        ...state,
        participants: action.payload.data || action.payload,
        participantsPagination: action.payload.data ? action.payload : null
      };
      
    case ACTIONS.UPDATE_PARTICIPANT_STATUT:
      return {
        ...state,
        participants: state.participants.map(p => 
          p.id === action.payload.id ? action.payload : p
        )
      };
      
    case ACTIONS.SET_ASSISTANCES:
      return {
        ...state,
        assistances: action.payload.data || action.payload,
        assistancesPagination: action.payload.data ? action.payload : null
      };
      
    case ACTIONS.ADD_ASSISTANCE:
      return {
        ...state,
        assistances: [action.payload, ...state.assistances]
      };
      
    case ACTIONS.SET_STATISTIQUES:
      return {
        ...state,
        statistiques: action.payload
      };
      
    case ACTIONS.SET_STATISTIQUES_TEMPS_REEL:
      return {
        ...state,
        statistiquesTempsReel: action.payload
      };
      
    case ACTIONS.SET_FORM_OPTIONS:
      return {
        ...state,
        formOptions: action.payload
      };
      
    default:
      return state;
  }
};

// Provider Component
export const UpasProvider = ({ children }) => {
  const [state, dispatch] = useReducer(upasReducer, initialState);
  const { showNotification } = useNotification();
  
  // Fonction utilitaire pour gérer les erreurs
  const handleError = useCallback((error, key = 'general') => {
    console.error(`Erreur UPAS (${key}):`, error);
    
    const message = error.response?.data?.message || 
                   error.message || 
                   'Une erreur est survenue';
    
    dispatch({
      type: ACTIONS.SET_ERROR,
      key,
      payload: message
    });
    
    showNotification(message, 'error');
  }, [showNotification]);
  
  // Fonction utilitaire pour définir l'état de chargement
  const setLoadingState = useCallback((key, loading) => {
    dispatch({
      type: ACTIONS.SET_LOADING_STATE,
      key,
      payload: loading
    });
  }, []);
  
  // Dashboard
  const loadDashboardData = useCallback(async () => {
    setLoadingState('dashboard', true);
    try {
      const response = await upasAPI.getDashboard();
      dispatch({
        type: ACTIONS.SET_DASHBOARD_DATA,
        payload: response.data.data
      });
    } catch (error) {
      handleError(error, 'dashboard');
    } finally {
      setLoadingState('dashboard', false);
    }
  }, [handleError, setLoadingState]);
  
  // Campagnes
  const loadCampagnes = useCallback(async (filters = {}) => {
    setLoadingState('campagnes', true);
    try {
      const response = await upasAPI.getCampagnes(filters);
      dispatch({
        type: ACTIONS.SET_CAMPAGNES,
        payload: response.data
      });
    } catch (error) {
      handleError(error, 'campagnes');
    } finally {
      setLoadingState('campagnes', false);
    }
  }, [handleError, setLoadingState]);
  
  const createCampagne = useCallback(async (data) => {
    setLoadingState('campagnes', true);
    try {
      const response = await upasAPI.createCampagne(data);
      dispatch({
        type: ACTIONS.ADD_CAMPAGNE,
        payload: response.data.data
      });
      showNotification(response.data.message || 'Campagne créée avec succès', 'success');
      return response.data.data;
    } catch (error) {
      handleError(error, 'campagnes');
      throw error;
    } finally {
      setLoadingState('campagnes', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  const updateCampagne = useCallback(async (id, data) => {
    setLoadingState('campagnes', true);
    try {
      const response = await upasAPI.updateCampagne(id, data);
      dispatch({
        type: ACTIONS.UPDATE_CAMPAGNE,
        payload: response.data.data
      });
      showNotification(response.data.message || 'Campagne mise à jour avec succès', 'success');
      return response.data.data;
    } catch (error) {
      handleError(error, 'campagnes');
      throw error;
    } finally {
      setLoadingState('campagnes', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  const deleteCampagne = useCallback(async (id) => {
    setLoadingState('campagnes', true);
    try {
      const response = await upasAPI.deleteCampagne(id);
      dispatch({
        type: ACTIONS.DELETE_CAMPAGNE,
        payload: id
      });
      showNotification(response.data.message || 'Campagne supprimée avec succès', 'success');
    } catch (error) {
      handleError(error, 'campagnes');
      throw error;
    } finally {
      setLoadingState('campagnes', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  // Bénéficiaires
  const loadBeneficiaires = useCallback(async (filters = {}) => {
    setLoadingState('beneficiaires', true);
    try {
      const response = await upasAPI.getBeneficiaires(filters);
      dispatch({
        type: ACTIONS.SET_BENEFICIAIRES,
        payload: response.data
      });
    } catch (error) {
      handleError(error, 'beneficiaires');
    } finally {
      setLoadingState('beneficiaires', false);
    }
  }, [handleError, setLoadingState]);
  
  const createBeneficiaire = useCallback(async (data) => {
    setLoadingState('beneficiaires', true);
    try {
      const response = await upasAPI.createBeneficiaire(data);
      dispatch({
        type: ACTIONS.ADD_BENEFICIAIRE,
        payload: response.data.data
      });
      showNotification(response.data.message || 'Bénéficiaire créé avec succès', 'success');
      return response.data.data;
    } catch (error) {
      handleError(error, 'beneficiaires');
      throw error;
    } finally {
      setLoadingState('beneficiaires', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  const updateBeneficiaire = useCallback(async (id, data) => {
    setLoadingState('beneficiaires', true);
    try {
      const response = await upasAPI.updateBeneficiaire(id, data);
      dispatch({
        type: ACTIONS.UPDATE_BENEFICIAIRE,
        payload: response.data.data
      });
      showNotification(response.data.message || 'Bénéficiaire mis à jour avec succès', 'success');
      return response.data.data;
    } catch (error) {
      handleError(error, 'beneficiaires');
      throw error;
    } finally {
      setLoadingState('beneficiaires', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  const deleteBeneficiaire = useCallback(async (id) => {
    setLoadingState('beneficiaires', true);
    try {
      const response = await upasAPI.deleteBeneficiaire(id);
      dispatch({
        type: ACTIONS.DELETE_BENEFICIAIRE,
        payload: id
      });
      showNotification(response.data.message || 'Bénéficiaire supprimé avec succès', 'success');
    } catch (error) {
      handleError(error, 'beneficiaires');
      throw error;
    } finally {
      setLoadingState('beneficiaires', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  const importBeneficiaires = useCallback(async (file, campagneId) => {
    setLoadingState('import', true);
    try {
      const response = await upasAPI.importBeneficiaires(file, campagneId);
      showNotification(response.data.message || 'Import terminé avec succès', 'success');
      
      // Recharger les bénéficiaires
      await loadBeneficiaires();
      
      return response.data;
    } catch (error) {
      handleError(error, 'import');
      throw error;
    } finally {
      setLoadingState('import', false);
    }
  }, [handleError, setLoadingState, showNotification, loadBeneficiaires]);
  
  const actionMasseBeneficiaires = useCallback(async (data) => {
    setLoadingState('beneficiaires', true);
    try {
      const response = await upasAPI.actionMasseBeneficiaires(data);
      showNotification(response.data.message || 'Action réalisée avec succès', 'success');
      
      // Recharger les bénéficiaires
      await loadBeneficiaires();
      
      return response.data;
    } catch (error) {
      handleError(error, 'beneficiaires');
      throw error;
    } finally {
      setLoadingState('beneficiaires', false);
    }
  }, [handleError, setLoadingState, showNotification, loadBeneficiaires]);
  
  // Types d'assistance
  const loadTypesAssistance = useCallback(async () => {
    try {
      const response = await upasAPI.getTypesAssistance();
      dispatch({
        type: ACTIONS.SET_TYPES_ASSISTANCE,
        payload: response.data.data
      });
    } catch (error) {
      handleError(error, 'typesAssistance');
    }
  }, [handleError]);
  
  const createTypeAssistance = useCallback(async (data) => {
    try {
      const response = await upasAPI.createTypeAssistance(data);
      dispatch({
        type: ACTIONS.ADD_TYPE_ASSISTANCE,
        payload: response.data.data
      });
      showNotification(response.data.message || 'Type d\'assistance créé avec succès', 'success');
      return response.data.data;
    } catch (error) {
      handleError(error, 'typesAssistance');
      throw error;
    }
  }, [handleError, showNotification]);
  
  const updateTypeAssistance = useCallback(async (id, data) => {
    try {
      const response = await upasAPI.updateTypeAssistance(id, data);
      dispatch({
        type: ACTIONS.UPDATE_TYPE_ASSISTANCE,
        payload: response.data.data
      });
      showNotification(response.data.message || 'Type d\'assistance mis à jour avec succès', 'success');
      return response.data.data;
    } catch (error) {
      handleError(error, 'typesAssistance');
      throw error;
    }
  }, [handleError, showNotification]);
  
  const deleteTypeAssistance = useCallback(async (id) => {
    try {
      const response = await upasAPI.deleteTypeAssistance(id);
      dispatch({
        type: ACTIONS.DELETE_TYPE_ASSISTANCE,
        payload: id
      });
      showNotification(response.data.message || 'Type d\'assistance supprimé avec succès', 'success');
    } catch (error) {
      handleError(error, 'typesAssistance');
      throw error;
    }
  }, [handleError, showNotification]);
  
  // Kafalas
  const loadKafalas = useCallback(async (filters = {}) => {
    setLoadingState('kafalas', true);
    try {
      const response = await upasAPI.getKafalas(filters);
      dispatch({
        type: ACTIONS.SET_KAFALAS,
        payload: response.data
      });
    } catch (error) {
      handleError(error, 'kafalas');
    } finally {
      setLoadingState('kafalas', false);
    }
  }, [handleError, setLoadingState]);
  
  const createKafala = useCallback(async (data) => {
    setLoadingState('kafalas', true);
    try {
      const response = await upasAPI.createKafala(data);
      dispatch({
        type: ACTIONS.ADD_KAFALA,
        payload: response.data.data
      });
      showNotification(response.data.message || 'Kafala créée avec succès', 'success');
      return response.data.data;
    } catch (error) {
      handleError(error, 'kafalas');
      throw error;
    } finally {
      setLoadingState('kafalas', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  const updateKafala = useCallback(async (id, data) => {
    setLoadingState('kafalas', true);
    try {
      const response = await upasAPI.updateKafala(id, data);
      dispatch({
        type: ACTIONS.UPDATE_KAFALA,
        payload: response.data.data
      });
      showNotification(response.data.message || 'Kafala mise à jour avec succès', 'success');
      return response.data.data;
    } catch (error) {
      handleError(error, 'kafalas');
      throw error;
    } finally {
      setLoadingState('kafalas', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  const deleteKafala = useCallback(async (id) => {
    setLoadingState('kafalas', true);
    try {
      const response = await upasAPI.deleteKafala(id);
      dispatch({
        type: ACTIONS.DELETE_KAFALA,
        payload: id
      });
      showNotification(response.data.message || 'Kafala supprimée avec succès', 'success');
    } catch (error) {
      handleError(error, 'kafalas');
      throw error;
    } finally {
      setLoadingState('kafalas', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  // Participants
  const loadParticipants = useCallback(async (campagneId, filters = {}) => {
    setLoadingState('participants', true);
    try {
      const response = await upasAPI.getParticipants(campagneId, filters);
      dispatch({
        type: ACTIONS.SET_PARTICIPANTS,
        payload: response.data
      });
    } catch (error) {
      handleError(error, 'participants');
    } finally {
      setLoadingState('participants', false);
    }
  }, [handleError, setLoadingState]);
  
  const changerStatutParticipant = useCallback(async (id, statut, commentaire = '') => {
    setLoadingState('participants', true);
    try {
      const response = await upasAPI.changerStatutParticipant(id, statut, commentaire);
      dispatch({
        type: ACTIONS.UPDATE_PARTICIPANT_STATUT,
        payload: response.data.data
      });
      showNotification(response.data.message || 'Statut du participant mis à jour', 'success');
      return response.data.data;
    } catch (error) {
      handleError(error, 'participants');
      throw error;
    } finally {
      setLoadingState('participants', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  const importParticipants = useCallback(async (file, campagneId) => {
    setLoadingState('import', true);
    try {
      const response = await upasAPI.importParticipants(file, campagneId);
      showNotification(response.data.message || 'Import terminé avec succès', 'success');
      
      // Recharger les participants
      await loadParticipants(campagneId);
      
      return response.data;
    } catch (error) {
      handleError(error, 'import');
      throw error;
    } finally {
      setLoadingState('import', false);
    }
  }, [handleError, setLoadingState, showNotification, loadParticipants]);
  
  // Assistances médicales
  const loadAssistances = useCallback(async (filters = {}) => {
    setLoadingState('assistances', true);
    try {
      const response = await upasAPI.getAssistances(filters);
      dispatch({
        type: ACTIONS.SET_ASSISTANCES,
        payload: response.data
      });
    } catch (error) {
      handleError(error, 'assistances');
    } finally {
      setLoadingState('assistances', false);
    }
  }, [handleError, setLoadingState]);
  
  const createAssistance = useCallback(async (data) => {
    setLoadingState('assistances', true);
    try {
      const response = await upasAPI.createAssistance(data);
      dispatch({
        type: ACTIONS.ADD_ASSISTANCE,
        payload: response.data.data
      });
      showNotification(response.data.message || 'Assistance médicale enregistrée avec succès', 'success');
      return response.data.data;
    } catch (error) {
      handleError(error, 'assistances');
      throw error;
    } finally {
      setLoadingState('assistances', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  // Statistiques
  const loadStatistiques = useCallback(async (periode = 'annee_courante') => {
    setLoadingState('statistiques', true);
    try {
      const response = await upasAPI.getStatistiques(periode);
      dispatch({
        type: ACTIONS.SET_STATISTIQUES,
        payload: response.data.data
      });
    } catch (error) {
      handleError(error, 'statistiques');
    } finally {
      setLoadingState('statistiques', false);
    }
  }, [handleError, setLoadingState]);
  
  const loadStatistiquesTempsReel = useCallback(async () => {
    try {
      const response = await upasAPI.getStatistiquesTempsReel();
      dispatch({
        type: ACTIONS.SET_STATISTIQUES_TEMPS_REEL,
        payload: response.data.data
      });
    } catch (error) {
      handleError(error, 'statistiques');
    }
  }, [handleError]);
  
  // Options de formulaire
  const loadFormOptions = useCallback(async () => {
    try {
      const response = await upasAPI.getFormOptions();
      dispatch({
        type: ACTIONS.SET_FORM_OPTIONS,
        payload: response.data.data
      });
    } catch (error) {
      handleError(error, 'formOptions');
    }
  }, [handleError]);
  
  // Export de données
  const exportData = useCallback(async (type, format, filters = {}) => {
    setLoadingState('export', true);
    try {
      const response = await upasAPI.exportData(type, format, filters);
      showNotification(response.data.message || 'Export généré avec succès', 'success');
      return response.data;
    } catch (error) {
      handleError(error, 'export');
      throw error;
    } finally {
      setLoadingState('export', false);
    }
  }, [handleError, setLoadingState, showNotification]);
  
  // Recherche globale
  const rechercheGlobale = useCallback(async (terme) => {
    try {
      const response = await upasAPI.rechercheGlobale(terme);
      return response.data.data;
    } catch (error) {
      handleError(error, 'recherche');
      throw error;
    }
  }, [handleError]);
  
  // Validation de campagne
  const validerCampagne = useCallback(async (data) => {
    try {
      const response = await upasAPI.validerCampagne(data);
      return response.data.data;
    } catch (error) {
      handleError(error, 'validation');
      throw error;
    }
  }, [handleError]);
  
  // Vérification d'existence de bénéficiaire
  const verifierExistenceBeneficiaire = useCallback(async (data) => {
    try {
      const response = await upasAPI.verifierExistenceBeneficiaire(data);
      return response.data;
    } catch (error) {
      handleError(error, 'verification');
      throw error;
    }
  }, [handleError]);
  
  // Clear error
  const clearError = useCallback((key) => {
    dispatch({
      type: ACTIONS.CLEAR_ERROR,
      key
    });
  }, []);
  
  // Valeur du contexte
  const value = {
    // État
    ...state,
    
    // Actions Dashboard
    loadDashboardData,
    
    // Actions Campagnes
    loadCampagnes,
    createCampagne,
    updateCampagne,
    deleteCampagne,
    validerCampagne,
    
    // Actions Bénéficiaires
    loadBeneficiaires,
    createBeneficiaire,
    updateBeneficiaire,
    deleteBeneficiaire,
    importBeneficiaires,
    actionMasseBeneficiaires,
    verifierExistenceBeneficiaire,
    
    // Actions Types d'assistance
    loadTypesAssistance,
    createTypeAssistance,
    updateTypeAssistance,
    deleteTypeAssistance,
    
    // Actions Kafalas
    loadKafalas,
    createKafala,
    updateKafala,
    deleteKafala,
    
    // Actions Participants
    loadParticipants,
    changerStatutParticipant,
    importParticipants,
    
    // Actions Assistances
    loadAssistances,
    createAssistance,
    
    // Actions Statistiques
    loadStatistiques,
    loadStatistiquesTempsReel,
    
    // Actions Options
    loadFormOptions,
    
    // Actions Utilitaires
    exportData,
    rechercheGlobale,
    clearError
  };
  
  return (
    <UpasContext.Provider value={value}>
      {children}
    </UpasContext.Provider>
  );
}