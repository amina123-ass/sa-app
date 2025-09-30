// hooks/useReferenceData.js - Hook spécialisé pour charger toutes les données de référence
import { useState, useEffect, useCallback } from 'react';
import { upasAPI } from '../services/upasAPI';

export const useReferenceData = (options = {}) => {
  const {
    autoLoad = true,
    enableCache = true,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    onError = null
  } = options;

  const [data, setData] = useState({
    campagnes: [],
    types_assistance: [],
    etat_dones: [],
    nature_dones: [],
    situations: [],
    details_type_assistances: [],
    roles: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastLoaded, setLastLoaded] = useState(null);

  // Cache en localStorage si activé
  const getCacheKey = () => 'upas_reference_data';
  const getCacheTimestampKey = () => 'upas_reference_data_timestamp';

  const isDataCached = useCallback(() => {
    if (!enableCache) return false;
    
    try {
      const timestamp = localStorage.getItem(getCacheTimestampKey());
      if (!timestamp) return false;
      
      const age = Date.now() - parseInt(timestamp);
      return age < cacheTimeout;
    } catch (error) {
      return false;
    }
  }, [enableCache, cacheTimeout]);

  const getCachedData = useCallback(() => {
    if (!enableCache || !isDataCached()) return null;
    
    try {
      const cachedData = localStorage.getItem(getCacheKey());
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.warn('Erreur lecture cache:', error);
      return null;
    }
  }, [enableCache, isDataCached]);

  const setCachedData = useCallback((newData) => {
    if (!enableCache) return;
    
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify(newData));
      localStorage.setItem(getCacheTimestampKey(), Date.now().toString());
    } catch (error) {
      console.warn('Erreur sauvegarde cache:', error);
    }
  }, [enableCache]);

  const loadAllReferenceData = useCallback(async (forceReload = false) => {
    // Vérifier le cache d'abord
    if (!forceReload) {
      const cachedData = getCachedData();
      if (cachedData) {
        console.log('📋 Données de référence chargées depuis le cache');
        setData(cachedData);
        setLastLoaded(new Date());
        return cachedData;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Chargement des données de référence depuis l\'API...');

      // Charger toutes les données en parallèle avec gestion d'erreur individuelle
      const promises = [
        // Campagnes actives
        upasAPI.getCampagnes({ statut: 'Active' }).catch(err => {
          console.warn('⚠️ Erreur chargement campagnes:', err.message);
          return { data: { success: true, data: [] } };
        }),

        // Types d'assistance
        upasAPI.getTypesAssistance().catch(err => {
          console.warn('⚠️ Erreur chargement types assistance:', err.message);
          return { data: { success: true, data: [] } };
        }),

        // États des dons - Route spécifique dictionary
        upasAPI.getEtatDones().catch(err => {
          console.warn('⚠️ Erreur chargement états done:', err.message);
          return { data: { success: true, data: [] } };
        }),

        // Natures des dons - Route spécifique dictionary  
        upasAPI.getNatureDones().catch(err => {
          console.warn('⚠️ Erreur chargement natures done:', err.message);
          return { data: { success: true, data: [] } };
        }),

        // Situations - Route spécifique dictionary
        upasAPI.getSituations().catch(err => {
          console.warn('⚠️ Erreur chargement situations:', err.message);
          return { data: { success: true, data: [] } };
        }),

        // Form options comme fallback
        upasAPI.getFormOptions().catch(err => {
          console.warn('⚠️ Erreur chargement form options:', err.message);
          return { data: { success: true, data: {} } };
        }),

        // Rôles pour admin
        upasAPI.get?.('/admin/roles').catch(err => {
          console.warn('⚠️ Erreur chargement rôles:', err.message);
          return { data: [] };
        })
      ];

      const results = await Promise.allSettled(promises);

      // Traitement des résultats
      const [
        campagnesResult,
        typesAssistanceResult, 
        etatDonesResult,
        natureDonesResult,
        situationsResult,
        formOptionsResult,
        rolesResult
      ] = results;

      const newData = {
        campagnes: [],
        types_assistance: [],
        etat_dones: [],
        nature_dones: [], 
        situations: [],
        details_type_assistances: [],
        roles: []
      };

      // Traitement campagnes
      if (campagnesResult.status === 'fulfilled') {
        const response = campagnesResult.value;
        if (response.data?.success) {
          newData.campagnes = response.data.data || response.data.campagnes || [];
        }
      }

      // Traitement types assistance
      if (typesAssistanceResult.status === 'fulfilled') {
        const response = typesAssistanceResult.value;
        if (response.data?.success) {
          newData.types_assistance = response.data.data || response.data.types_assistance || [];
        }
      }

      // Traitement états done
      if (etatDonesResult.status === 'fulfilled') {
        const response = etatDonesResult.value;
        if (response.data?.success) {
          newData.etat_dones = response.data.data || response.data.etat_dones || [];
        }
      }

      // Traitement natures done
      if (natureDonesResult.status === 'fulfilled') {
        const response = natureDonesResult.value;
        if (response.data?.success) {
          newData.nature_dones = response.data.data || response.data.nature_dones || [];
        }
      }

      // Traitement situations
      if (situationsResult.status === 'fulfilled') {
        const response = situationsResult.value;
        if (response.data?.success) {
          newData.situations = response.data.data || response.data.situations || [];
        }
      }

      // Traitement rôles
      if (rolesResult.status === 'fulfilled') {
        const response = rolesResult.value;
        newData.roles = response.data || [];
      }

      // Utiliser form-options comme fallback pour les données manquantes
      if (formOptionsResult.status === 'fulfilled') {
        const formOptions = formOptionsResult.value.data?.data || formOptionsResult.value.data || {};
        
        // Fallback pour campagnes
        if (newData.campagnes.length === 0 && formOptions.campagnes_actives) {
          newData.campagnes = formOptions.campagnes_actives;
          console.log('📋 Utilisation campagnes du fallback form-options');
        }

        // Fallback pour types assistance
        if (newData.types_assistance.length === 0 && formOptions.types_assistance) {
          newData.types_assistance = formOptions.types_assistance;
          console.log('📋 Utilisation types assistance du fallback form-options');
        }

        // Récupérer autres données de form-options si disponibles
        if (formOptions.etat_dones && newData.etat_dones.length === 0) {
          newData.etat_dones = formOptions.etat_dones;
        }
        if (formOptions.nature_dones && newData.nature_dones.length === 0) {
          newData.nature_dones = formOptions.nature_dones;
        }
        if (formOptions.situations && newData.situations.length === 0) {
          newData.situations = formOptions.situations;
        }
      }

      // Log des résultats
      console.log('✅ Données de référence chargées:', {
        campagnes: newData.campagnes.length,
        types_assistance: newData.types_assistance.length,
        etat_dones: newData.etat_dones.length,
        nature_dones: newData.nature_dones.length,
        situations: newData.situations.length,
        roles: newData.roles.length
      });

      // Si certaines données sont toujours manquantes, essayer les routes spécifiques
      if (newData.etat_dones.length === 0) {
        try {
          console.log('🔄 Tentative chargement états done via route admin...');
          const response = await fetch('/api/admin/dictionary/etat-dones', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Accept': 'application/json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            newData.etat_dones = data.data || data || [];
            console.log('✅ États done chargés via route admin:', newData.etat_dones.length);
          }
        } catch (error) {
          console.warn('⚠️ Erreur route admin etat-dones:', error.message);
        }
      }

      if (newData.nature_dones.length === 0) {
        try {
          console.log('🔄 Tentative chargement natures done via route admin...');
          const response = await fetch('/api/admin/dictionary/nature-dones', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Accept': 'application/json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            newData.nature_dones = data.data || data || [];
            console.log('✅ Natures done chargées via route admin:', newData.nature_dones.length);
          }
        } catch (error) {
          console.warn('⚠️ Erreur route admin nature-dones:', error.message);
        }
      }

      if (newData.situations.length === 0) {
        try {
          console.log('🔄 Tentative chargement situations via route admin...');
          const response = await fetch('/api/admin/dictionary/situations', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Accept': 'application/json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            newData.situations = data.data || data || [];
            console.log('✅ Situations chargées via route admin:', newData.situations.length);
          }
        } catch (error) {
          console.warn('⚠️ Erreur route admin situations:', error.message);
        }
      }

      // Sauvegarder en cache
      setCachedData(newData);
      
      // Mettre à jour l'état
      setData(newData);
      setLastLoaded(new Date());

      return newData;

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      console.error('❌ Erreur lors du chargement des données de référence:', errorMessage);
      
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }

      // En cas d'erreur, retourner des données par défaut
      const defaultData = {
        campagnes: [],
        types_assistance: [],
        etat_dones: [
          { id: 1, libelle: 'Neuf' },
          { id: 2, libelle: 'Bon état' },
          { id: 3, libelle: 'Usagé' }
        ],
        nature_dones: [
          { id: 1, libelle: 'Don individuel' },
          { id: 2, libelle: 'Don d\'entreprise' },
          { id: 3, libelle: 'Don d\'association' }
        ],
        situations: [
          { id: 1, libelle: 'Situation précaire' },
          { id: 2, libelle: 'Famille nombreuse' },
          { id: 3, libelle: 'Personne âgée' },
          { id: 4, libelle: 'Personne handicapée' }
        ],
        details_type_assistances: [],
        roles: []
      };

      setData(defaultData);
      return defaultData;

    } finally {
      setLoading(false);
    }
  }, [getCachedData, setCachedData, onError]);

  // Fonction pour recharger une catégorie spécifique
  const reloadCategory = useCallback(async (category) => {
    try {
      setLoading(true);
      
      let response;
      switch (category) {
        case 'etat_dones':
          response = await upasAPI.getEtatDones();
          break;
        case 'nature_dones':
          response = await upasAPI.getNatureDones();
          break;
        case 'situations':
          response = await upasAPI.getSituations();
          break;
        case 'campagnes':
          response = await upasAPI.getCampagnes({ statut: 'Active' });
          break;
        case 'types_assistance':
          response = await upasAPI.getTypesAssistance();
          break;
        default:
          throw new Error(`Catégorie inconnue: ${category}`);
      }

      const newItems = response.data?.data || response.data || [];
      
      setData(prev => ({
        ...prev,
        [category]: newItems
      }));

      // Mettre à jour le cache
      const updatedData = { ...data, [category]: newItems };
      setCachedData(updatedData);

      console.log(`✅ ${category} rechargé:`, newItems.length, 'éléments');
      
      return newItems;

    } catch (error) {
      console.error(`❌ Erreur rechargement ${category}:`, error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [data, setCachedData]);

  // Fonction pour vider le cache
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(getCacheKey());
      localStorage.removeItem(getCacheTimestampKey());
      console.log('🗑️ Cache des données de référence vidé');
    } catch (error) {
      console.warn('⚠️ Erreur lors du vidage du cache:', error);
    }
  }, []);

  // Fonction pour obtenir les options formatées pour les select
  const getSelectOptions = useCallback((category, options = {}) => {
    const {
      includeEmpty = true,
      emptyLabel = 'Sélectionner...',
      valueField = 'id',
      labelField = 'libelle'
    } = options;

    const items = data[category] || [];
    const selectOptions = items.map(item => ({
      value: item[valueField],
      label: item[labelField] || item.nom || item.libelle
    }));

    if (includeEmpty) {
      selectOptions.unshift({ value: '', label: emptyLabel });
    }

    return selectOptions;
  }, [data]);

  // Charger automatiquement au montage si activé
  useEffect(() => {
    if (autoLoad) {
      loadAllReferenceData();
    }
  }, [autoLoad, loadAllReferenceData]);

  return {
    data,
    loading,
    error,
    lastLoaded,
    
    // Actions
    loadData: loadAllReferenceData,
    reloadCategory,
    clearCache,
    
    // Utilitaires
    getSelectOptions,
    isDataStale: lastLoaded ? (Date.now() - lastLoaded.getTime()) > cacheTimeout : true,
    
    // État des données
    hasData: Object.values(data).some(arr => Array.isArray(arr) && arr.length > 0),
    isEmpty: Object.values(data).every(arr => !Array.isArray(arr) || arr.length === 0)
  };
};

// Service helper pour initialiser les données au démarrage de l'app
export const initializeReferenceData = async () => {
  try {
    console.log('🚀 Initialisation des données de référence...');
    
    // Vérifier la connexion API d'abord
    const connectionTest = await upasAPI.testConnection();
    if (!connectionTest.data?.success) {
      throw new Error('Connexion API impossible');
    }

    // Charger toutes les données
    const results = await Promise.allSettled([
      upasAPI.getCampagnes({ statut: 'Active' }),
      upasAPI.getTypesAssistance(),
      fetch('/api/admin/dictionary/etat-dones', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      }).then(r => r.json()),
      fetch('/api/admin/dictionary/nature-dones', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      }).then(r => r.json()),
      fetch('/api/admin/dictionary/situations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      }).then(r => r.json())
    ]);

    const loadedData = {
      campagnes: [],
      types_assistance: [],
      etat_dones: [],
      nature_dones: [],
      situations: []
    };

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value.data || result.value;
        switch (index) {
          case 0: loadedData.campagnes = data.data || data.campagnes || []; break;
          case 1: loadedData.types_assistance = data.data || data.types_assistance || []; break;
          case 2: loadedData.etat_dones = data.data || data || []; break;
          case 3: loadedData.nature_dones = data.data || data || []; break;
          case 4: loadedData.situations = data.data || data || []; break;
        }
      }
    });

    console.log('✅ Données de référence initialisées:', {
      campagnes: loadedData.campagnes.length,
      types_assistance: loadedData.types_assistance.length,
      etat_dones: loadedData.etat_dones.length,
      nature_dones: loadedData.nature_dones.length,
      situations: loadedData.situations.length
    });

    return {
      success: true,
      data: loadedData
    };

  } catch (error) {
    console.error('❌ Erreur initialisation données de référence:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default useReferenceData;