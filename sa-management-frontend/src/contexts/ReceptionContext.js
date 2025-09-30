// src/contexts/ReceptionContext.js - Contexte complet pour le module Réception
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { receptionApi } from '../services/receptionApi';

// ===== ÉTATS INITIAUX =====
const initialState = {
  // Dashboard
  dashboardStats: null,
  dashboardLoading: false,
  dashboardError: null,

  // Campagnes
  campagnes: [],
  campagnesLoading: false,
  campagnesError: null,
  selectedCampagne: null,

  // Participants
  participants: [],
  participantsLoading: false,
  participantsError: null,
  participantsPagination: null,

  // Types d'assistance
  typesAssistance: [],
  typesAssistanceLoading: false,
  typesAssistanceError: null,

  // Import/Export
  importLoading: false,
  importError: null,
  importResults: null,

  // États généraux
  loading: false,
  error: null,
  lastUpdate: null,
  initialized: false
};

// ===== TYPES D'ACTIONS =====
const actionTypes = {
  // Dashboard
  SET_DASHBOARD_LOADING: 'SET_DASHBOARD_LOADING',
  SET_DASHBOARD_SUCCESS: 'SET_DASHBOARD_SUCCESS',
  SET_DASHBOARD_ERROR: 'SET_DASHBOARD_ERROR',

  // Campagnes
  SET_CAMPAGNES_LOADING: 'SET_CAMPAGNES_LOADING',
  SET_CAMPAGNES_SUCCESS: 'SET_CAMPAGNES_SUCCESS',
  SET_CAMPAGNES_ERROR: 'SET_CAMPAGNES_ERROR',
  SET_SELECTED_CAMPAGNE: 'SET_SELECTED_CAMPAGNE',
  ADD_CAMPAGNE: 'ADD_CAMPAGNE',
  UPDATE_CAMPAGNE: 'UPDATE_CAMPAGNE',
  REMOVE_CAMPAGNE: 'REMOVE_CAMPAGNE',

  // Participants
  SET_PARTICIPANTS_LOADING: 'SET_PARTICIPANTS_LOADING',
  SET_PARTICIPANTS_SUCCESS: 'SET_PARTICIPANTS_SUCCESS',
  SET_PARTICIPANTS_ERROR: 'SET_PARTICIPANTS_ERROR',
  ADD_PARTICIPANT: 'ADD_PARTICIPANT',
  UPDATE_PARTICIPANT: 'UPDATE_PARTICIPANT',
  REMOVE_PARTICIPANT: 'REMOVE_PARTICIPANT',

  // Types d'assistance
  SET_TYPES_ASSISTANCE_LOADING: 'SET_TYPES_ASSISTANCE_LOADING',
  SET_TYPES_ASSISTANCE_SUCCESS: 'SET_TYPES_ASSISTANCE_SUCCESS',
  SET_TYPES_ASSISTANCE_ERROR: 'SET_TYPES_ASSISTANCE_ERROR',

  // Import/Export
  SET_IMPORT_LOADING: 'SET_IMPORT_LOADING',
  SET_IMPORT_SUCCESS: 'SET_IMPORT_SUCCESS',
  SET_IMPORT_ERROR: 'SET_IMPORT_ERROR',

  // Actions générales
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_INITIALIZED: 'SET_INITIALIZED',
  RESET_STATE: 'RESET_STATE'
};

// ===== REDUCER =====
const receptionReducer = (state, action) => {
  switch (action.type) {
    // Dashboard
    case actionTypes.SET_DASHBOARD_LOADING:
      return {
        ...state,
        dashboardLoading: action.payload,
        dashboardError: action.payload ? null : state.dashboardError
      };

    case actionTypes.SET_DASHBOARD_SUCCESS:
      return {
        ...state,
        dashboardStats: action.payload,
        dashboardLoading: false,
        dashboardError: null,
        lastUpdate: new Date().toISOString()
      };

    case actionTypes.SET_DASHBOARD_ERROR:
      return {
        ...state,
        dashboardError: action.payload,
        dashboardLoading: false
      };

    // Campagnes
    case actionTypes.SET_CAMPAGNES_LOADING:
      return {
        ...state,
        campagnesLoading: action.payload,
        campagnesError: action.payload ? null : state.campagnesError
      };

    case actionTypes.SET_CAMPAGNES_SUCCESS:
      return {
        ...state,
        campagnes: Array.isArray(action.payload) ? action.payload : [],
        campagnesLoading: false,
        campagnesError: null,
        lastUpdate: new Date().toISOString()
      };

    case actionTypes.SET_CAMPAGNES_ERROR:
      return {
        ...state,
        campagnesError: action.payload,
        campagnesLoading: false,
        campagnes: [] // Garder un tableau vide en cas d'erreur
      };

    case actionTypes.SET_SELECTED_CAMPAGNE:
      return {
        ...state,
        selectedCampagne: action.payload
      };

    case actionTypes.ADD_CAMPAGNE:
      return {
        ...state,
        campagnes: [...state.campagnes, action.payload]
      };

    case actionTypes.UPDATE_CAMPAGNE:
      return {
        ...state,
        campagnes: state.campagnes.map(c => 
          c.id === action.payload.id ? action.payload : c
        )
      };

    case actionTypes.REMOVE_CAMPAGNE:
      return {
        ...state,
        campagnes: state.campagnes.filter(c => c.id !== action.payload)
      };

    // Participants
    case actionTypes.SET_PARTICIPANTS_LOADING:
      return {
        ...state,
        participantsLoading: action.payload,
        participantsError: action.payload ? null : state.participantsError
      };

    case actionTypes.SET_PARTICIPANTS_SUCCESS:
      const participantsData = action.payload;
      return {
        ...state,
        participants: Array.isArray(participantsData.data) ? participantsData.data : 
                    Array.isArray(participantsData) ? participantsData : [],
        participantsPagination: participantsData.pagination || null,
        participantsLoading: false,
        participantsError: null
      };

    case actionTypes.SET_PARTICIPANTS_ERROR:
      return {
        ...state,
        participantsError: action.payload,
        participantsLoading: false,
        participants: [] // Garder un tableau vide en cas d'erreur
      };

    case actionTypes.ADD_PARTICIPANT:
      return {
        ...state,
        participants: [...state.participants, action.payload]
      };

    case actionTypes.UPDATE_PARTICIPANT:
      return {
        ...state,
        participants: state.participants.map(p => 
          p.id === action.payload.id ? action.payload : p
        )
      };

    case actionTypes.REMOVE_PARTICIPANT:
      return {
        ...state,
        participants: state.participants.filter(p => p.id !== action.payload)
      };

    // Types d'assistance
    case actionTypes.SET_TYPES_ASSISTANCE_LOADING:
      return {
        ...state,
        typesAssistanceLoading: action.payload
      };

    case actionTypes.SET_TYPES_ASSISTANCE_SUCCESS:
      return {
        ...state,
        typesAssistance: Array.isArray(action.payload) ? action.payload : [],
        typesAssistanceLoading: false,
        typesAssistanceError: null
      };

    case actionTypes.SET_TYPES_ASSISTANCE_ERROR:
      return {
        ...state,
        typesAssistanceError: action.payload,
        typesAssistanceLoading: false,
        typesAssistance: []
      };

    // Import/Export
    case actionTypes.SET_IMPORT_LOADING:
      return {
        ...state,
        importLoading: action.payload,
        importError: action.payload ? null : state.importError
      };

    case actionTypes.SET_IMPORT_SUCCESS:
      return {
        ...state,
        importResults: action.payload,
        importLoading: false,
        importError: null
      };

    case actionTypes.SET_IMPORT_ERROR:
      return {
        ...state,
        importError: action.payload,
        importLoading: false
      };

    // Actions générales
    case actionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case actionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case actionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        dashboardError: null,
        campagnesError: null,
        participantsError: null,
        typesAssistanceError: null,
        importError: null
      };

    case actionTypes.SET_INITIALIZED:
      return {
        ...state,
        initialized: action.payload
      };

    case actionTypes.RESET_STATE:
      return {
        ...initialState,
        initialized: false
      };

    default:
      return state;
  }
};

// ===== CONTEXTE =====
const ReceptionContext = createContext(undefined);

// ===== PROVIDER =====
export const ReceptionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(receptionReducer, initialState);

  // ===== ACTIONS DASHBOARD =====
  const loadDashboard = useCallback(async () => {
    try {
      console.log('🔄 Chargement dashboard réception...');
      dispatch({ type: actionTypes.SET_DASHBOARD_LOADING, payload: true });

      const response = await receptionApi.getDashboard();
      
      if (response.success) {
        dispatch({ type: actionTypes.SET_DASHBOARD_SUCCESS, payload: response });
        console.log('✅ Dashboard chargé avec succès');
      } else {
        throw new Error(response.message || 'Erreur lors du chargement du dashboard');
      }
    } catch (error) {
      console.error('❌ Erreur chargement dashboard:', error);
      dispatch({ 
        type: actionTypes.SET_DASHBOARD_ERROR, 
        payload: error.message || 'Erreur lors du chargement du dashboard'
      });
      throw error;
    }
  }, []);

  // ===== ACTIONS CAMPAGNES =====
  const loadCampagnes = useCallback(async () => {
    try {
      console.log('🔄 Chargement campagnes...');
      dispatch({ type: actionTypes.SET_CAMPAGNES_LOADING, payload: true });

      const response = await receptionApi.getCampagnes();
      
      if (response.success) {
        dispatch({ 
          type: actionTypes.SET_CAMPAGNES_SUCCESS, 
          payload: response.data || []
        });
        console.log('✅ Campagnes chargées:', response.data?.length || 0);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des campagnes');
      }
    } catch (error) {
      console.error('❌ Erreur chargement campagnes:', error);
      dispatch({ 
        type: actionTypes.SET_CAMPAGNES_ERROR, 
        payload: error.message || 'Erreur lors du chargement des campagnes'
      });
      // Ne pas throw l'erreur pour continuer le fonctionnement avec tableau vide
    }
  }, []);

  const createCampagne = useCallback(async (data) => {
    try {
      const response = await receptionApi.createCampagne(data);
      if (response.success) {
        dispatch({ type: actionTypes.ADD_CAMPAGNE, payload: response.data });
        return response.data;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('❌ Erreur création campagne:', error);
      throw error;
    }
  }, []);

  const updateCampagne = useCallback(async (id, data) => {
    try {
      const response = await receptionApi.updateCampagne(id, data);
      if (response.success) {
        dispatch({ type: actionTypes.UPDATE_CAMPAGNE, payload: response.data });
        return response.data;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('❌ Erreur modification campagne:', error);
      throw error;
    }
  }, []);

  const deleteCampagne = useCallback(async (id) => {
    try {
      const response = await receptionApi.deleteCampagne(id);
      if (response.success) {
        dispatch({ type: actionTypes.REMOVE_CAMPAGNE, payload: id });
        return true;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('❌ Erreur suppression campagne:', error);
      throw error;
    }
  }, []);

  const selectCampagne = useCallback((campagne) => {
    console.log('📌 Sélection campagne:', campagne?.id);
    dispatch({ type: actionTypes.SET_SELECTED_CAMPAGNE, payload: campagne });
  }, []);

  // ===== ACTIONS PARTICIPANTS =====
  const loadParticipants = useCallback(async (params = {}) => {
    try {
      console.log('🔄 Chargement participants avec params:', params);
      dispatch({ type: actionTypes.SET_PARTICIPANTS_LOADING, payload: true });

      const response = await receptionApi.getParticipants(params);
      
      if (response.success) {
        dispatch({ 
          type: actionTypes.SET_PARTICIPANTS_SUCCESS, 
          payload: response
        });
        console.log('✅ Participants chargés:', response.data?.length || 0);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des participants');
      }
    } catch (error) {
      console.error('❌ Erreur chargement participants:', error);
      dispatch({ 
        type: actionTypes.SET_PARTICIPANTS_ERROR, 
        payload: error.message || 'Erreur lors du chargement des participants'
      });
      // Ne pas throw l'erreur pour continuer le fonctionnement
    }
  }, []);

  const createParticipant = useCallback(async (data) => {
    try {
      const response = await receptionApi.createParticipant(data);
      if (response.success) {
        dispatch({ type: actionTypes.ADD_PARTICIPANT, payload: response.data });
        return response.data;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('❌ Erreur création participant:', error);
      throw error;
    }
  }, []);

  const updateParticipant = useCallback(async (id, data) => {
    try {
      const response = await receptionApi.updateStatutParticipant(id, data);
      if (response.success) {
        dispatch({ type: actionTypes.UPDATE_PARTICIPANT, payload: response.data });
        return response.data;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('❌ Erreur modification participant:', error);
      throw error;
    }
  }, []);

  const deleteParticipant = useCallback(async (id) => {
    try {
      const response = await receptionApi.supprimerParticipant(id);
      if (response.success) {
        dispatch({ type: actionTypes.REMOVE_PARTICIPANT, payload: id });
        return true;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('❌ Erreur suppression participant:', error);
      throw error;
    }
  }, []);

  // ===== ACTIONS TYPES D'ASSISTANCE =====
  const loadTypesAssistance = useCallback(async () => {
    try {
      console.log('🔄 Chargement types assistance...');
      dispatch({ type: actionTypes.SET_TYPES_ASSISTANCE_LOADING, payload: true });

      const response = await receptionApi.getTypesAssistance();
      
      if (response.success) {
        dispatch({ 
          type: actionTypes.SET_TYPES_ASSISTANCE_SUCCESS, 
          payload: response.data || []
        });
        console.log('✅ Types assistance chargés:', response.data?.length || 0);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des types d\'assistance');
      }
    } catch (error) {
      console.error('❌ Erreur chargement types assistance:', error);
      dispatch({ 
        type: actionTypes.SET_TYPES_ASSISTANCE_ERROR, 
        payload: error.message || 'Erreur lors du chargement des types d\'assistance'
      });
      // Ne pas throw pour continuer avec tableau vide
    }
  }, []);

  // ===== ACTIONS IMPORT/EXPORT =====
  const importExcel = useCallback(async (formData) => {
    try {
      console.log('📤 Import Excel...');
      dispatch({ type: actionTypes.SET_IMPORT_LOADING, payload: true });

      const response = await receptionApi.importExcel(formData);
      
      if (response.success) {
        dispatch({ type: actionTypes.SET_IMPORT_SUCCESS, payload: response });
        console.log('✅ Import Excel réussi');
        return response;
      } else {
        throw new Error(response.message || 'Erreur lors de l\'import');
      }
    } catch (error) {
      console.error('❌ Erreur import Excel:', error);
      dispatch({ 
        type: actionTypes.SET_IMPORT_ERROR, 
        payload: error.message || 'Erreur lors de l\'import'
      });
      throw error;
    }
  }, []);

  // ===== ACTIONS GÉNÉRALES =====
  const clearError = useCallback(() => {
    dispatch({ type: actionTypes.CLEAR_ERROR });
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch({ type: actionTypes.SET_LOADING, payload: loading });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: actionTypes.RESET_STATE });
  }, []);

  // ===== INITIALISATION =====
  const initializeData = useCallback(async () => {
    if (state.initialized) {
      console.log('📋 Données déjà initialisées');
      return;
    }

    try {
      console.log('🚀 Initialisation des données réception...');
      setLoading(true);

      // Charger les données de base en parallèle
      await Promise.allSettled([
        loadCampagnes(),
        loadTypesAssistance()
      ]);

      dispatch({ type: actionTypes.SET_INITIALIZED, payload: true });
      console.log('✅ Initialisation réception terminée');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
    } finally {
      setLoading(false);
    }
  }, [state.initialized, loadCampagnes, loadTypesAssistance, setLoading]);

  // Initialisation automatique
  useEffect(() => {
    if (!state.initialized) {
      initializeData();
    }
  }, [state.initialized, initializeData]);

  // ===== GETTERS CALCULÉS =====
  const totalCampagnes = state.campagnes.length;
  const totalParticipants = state.participants.length;
  const hasError = !!(
    state.error || 
    state.dashboardError || 
    state.campagnesError || 
    state.participantsError ||
    state.typesAssistanceError ||
    state.importError
  );
  const isLoading = !!(
    state.loading || 
    state.dashboardLoading || 
    state.campagnesLoading || 
    state.participantsLoading ||
    state.typesAssistanceLoading ||
    state.importLoading
  );

  // ===== VALEUR DU CONTEXTE =====
  const value = {
    // État
    ...state,
    
    // Actions Dashboard
    loadDashboard,
    
    // Actions Campagnes
    loadCampagnes,
    createCampagne,
    updateCampagne,
    deleteCampagne,
    selectCampagne,
    
    // Actions Participants  
    loadParticipants,
    createParticipant,
    updateParticipant,
    deleteParticipant,
    
    // Actions Types Assistance
    loadTypesAssistance,
    
    // Actions Import/Export
    importExcel,
    
    // Actions générales
    clearError,
    setLoading,
    resetState,
    initializeData,

    // Getters calculés
    totalCampagnes,
    totalParticipants,
    hasError,
    isLoading,

    // Helpers
    isInitialized: state.initialized
  };

  return (
    <ReceptionContext.Provider value={value}>
      {children}
    </ReceptionContext.Provider>
  );
};

// ===== HOOK PERSONNALISÉ =====
export const useReception = () => {
  const context = useContext(ReceptionContext);
  if (context === undefined) {
    throw new Error('useReception doit être utilisé dans un ReceptionProvider');
  }
  return context;
};

// ===== EXPORT PAR DÉFAUT =====
export default ReceptionContext;

// ===== UTILITAIRES POUR DEBUG =====
export const receptionDebugUtils = {
  // Vérifier l'état du contexte
  checkState: (context) => {
    console.log('🔍 État ReceptionContext:', {
      initialized: context.initialized,
      campagnes: context.campagnes.length,
      participants: context.participants.length,
      typesAssistance: context.typesAssistance.length,
      loading: context.isLoading,
      errors: context.hasError
    });
  },

  // Simuler des données pour tests
  mockData: {
    campagne: {
      id: Date.now(),
      nom: 'Campagne Test',
      description: 'Campagne de test pour développement',
      date_debut: new Date().toISOString().split('T')[0],
      date_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lieu: 'Centre Test',
      statut: 'active',
      budget: 10000,
      nombre_participants_prevu: 100
    },
    participant: {
      id: Date.now(),
      nom: 'Test',
      prenom: 'Participant',
      telephone: '0123456789',
      email: 'test@example.com',
      adresse: '123 Rue Test',
      statut: 'en_attente',
      campagne_id: 1
    }
  }
};

// Log en mode développement
if (process.env.NODE_ENV === 'development') {
  console.log('📋 ReceptionContext chargé avec succès');
  window.receptionDebugUtils = receptionDebugUtils;
}