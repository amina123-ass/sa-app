// src/config/queryClient.js - VERSION MISE À JOUR AVEC OPTIMISATIONS
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache pendant 5 minutes
      staleTime: 5 * 60 * 1000,
      // Garde en cache pendant 30 minutes après inactivité
      cacheTime: 30 * 60 * 1000,
      // Retry 3 fois en cas d'erreur
      retry: (failureCount, error) => {
        // Ne pas retry les erreurs 4xx (sauf 408, 429)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          if (![408, 429].includes(error.response.status)) {
            return false;
          }
        }
        return failureCount < 3;
      },
      // Délai entre les retries (exponentiel)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch automatique
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      // Logs pour debugging (seulement en dev)
      onSuccess: process.env.NODE_ENV === 'development' ? 
        (data, query) => console.log(`✅ Query ${query.queryKey.join('.')} successful`) : 
        undefined,
      onError: process.env.NODE_ENV === 'development' ? 
        (error, query) => console.error(`❌ Query ${query.queryKey.join('.')} failed:`, error) : 
        undefined,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Retry les erreurs réseau et serveur uniquement
        if (error?.response?.status >= 500 || error?.code === 'NETWORK_ERROR') {
          return failureCount < 2;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Logs pour debugging (seulement en dev)
      onSuccess: process.env.NODE_ENV === 'development' ? 
        (data, variables, context) => console.log('✅ Mutation successful:', { data, variables }) : 
        undefined,
      onError: process.env.NODE_ENV === 'development' ? 
        (error, variables, context) => console.error('❌ Mutation failed:', { error, variables }) : 
        undefined,
    },
  },
});

// Clés de requête centralisées - VERSION OPTIMISÉE
export const queryKeys = {
  // Test de connexion
  connection: ['connection', 'test'],
  
  // Données du dictionnaire - OPTIMISÉ
  dictionary: {
    all: ['dictionary', 'all'], // 🎯 CLÉ PRINCIPALE pour l'endpoint /dictionary/all
    situations: ['dictionary', 'situations'],
    natureDones: ['dictionary', 'natureDones'],
    typeAssistances: ['dictionary', 'typeAssistances'],
    detailsTypeAssistances: ['dictionary', 'detailsTypeAssistances'],
    detailsByType: (typeId) => ['dictionary', 'detailsTypeAssistances', 'by-type', typeId],
    etatDones: ['dictionary', 'etatDones'],
    securityQuestions: ['dictionary', 'securityQuestions'],
    typeBudgets: ['dictionary', 'typeBudgets'],
    budgets: ['dictionary', 'budgets'],
  },
  
  // Pour les futures pages UPAS (prêt à l'emploi)
  upas: {
    all: ['upas'],
    beneficiaires: ['upas', 'beneficiaires'],
    campagnes: ['upas', 'campagnes'],
    kafalas: ['upas', 'kafalas'],
    assistances: ['upas', 'assistances'],
    statistics: ['upas', 'statistics'],
  },
  
  // Pour les futures pages Reception
  reception: {
    all: ['reception'],
    participants: ['reception', 'participants'],
    campagnes: ['reception', 'campagnes'],
    imports: ['reception', 'imports'],
  },
  
  // Pour les futures pages Admin (autres que dictionary)
  admin: {
    all: ['admin'],
    users: ['admin', 'users'],
    roles: ['admin', 'roles'],
    settings: ['admin', 'settings'],
    notifications: ['admin', 'notifications'],
  },
};

// Utilitaires pour le cache - VERSION AMÉLIORÉE
export const cacheUtils = {
  // Invalider tout le dictionnaire - OPTIMISÉ
  invalidateDictionary: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
    
    // Optionnel: invalider aussi les clés individuelles pour compatibilité
    Object.keys(queryKeys.dictionary).forEach(category => {
      if (category !== 'all' && category !== 'detailsByType') {
        queryClient.invalidateQueries({ queryKey: queryKeys.dictionary[category] });
      }
    });
    
    console.log('🗑️ Cache du dictionnaire invalidé');
  },
  
  // Invalider une catégorie spécifique
  invalidateCategory: (category) => {
    const queryKey = queryKeys.dictionary[category];
    if (queryKey) {
      queryClient.invalidateQueries({ queryKey });
      // Invalider aussi le cache global pour cohérence
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      console.log(`🗑️ Cache de ${category} invalidé`);
    }
  },
  
  // Clear tout le cache
  clearAll: () => {
    queryClient.clear();
    console.log('🗑️ Tout le cache React Query vidé');
  },
  
  // Précharger les données du dictionnaire - OPTIMISÉ
  prefetchDictionary: async () => {
    try {
      console.log('🔄 Préchargement du dictionnaire...');
      
      // Utiliser l'endpoint optimisé /dictionary/all
      await queryClient.prefetchQuery({
        queryKey: queryKeys.dictionary.all,
        queryFn: async () => {
          // Utiliser le service optimisé si disponible
          if (window.dictionaryService?.loadAllDictionaryData) {
            return window.dictionaryService.loadAllDictionaryData();
          }
          
          // Fallback vers axios
          const response = await fetch('/api/dictionary/all');
          if (!response.ok) throw new Error('Failed to fetch dictionary');
          return response.json();
        },
        staleTime: 10 * 60 * 1000, // 10 minutes pour prefetch
      });
      
      console.log('✅ Dictionnaire préchargé avec succès');
    } catch (error) {
      console.warn('⚠️ Erreur lors du préchargement du dictionnaire:', error.message);
    }
  },
  
  // Obtenir le statut du cache pour debugging - AMÉLIORÉ
  getCacheStatus: () => {
    const cache = queryClient.getQueryCache();
    const allQueries = cache.getAll();
    
    const status = {
      totalQueries: allQueries.length,
      activeQueries: allQueries.filter(q => q.state.fetchStatus === 'fetching').length,
      staleQueries: allQueries.filter(q => q.isStale()).length,
      errorQueries: allQueries.filter(q => q.state.status === 'error').length,
      successQueries: allQueries.filter(q => q.state.status === 'success').length,
      
      // Statut spécifique du dictionnaire
      dictionary: {
        globalCache: !!cache.find(queryKeys.dictionary.all),
        individualCaches: Object.keys(queryKeys.dictionary)
          .filter(key => key !== 'all' && key !== 'detailsByType')
          .map(key => ({
            category: key,
            cached: !!cache.find(queryKeys.dictionary[key]),
            stale: cache.find(queryKeys.dictionary[key])?.isStale() || false
          }))
      }
    };
    
    console.table(status.dictionary.individualCaches);
    return status;
  },
  
  // Nouvelle fonction: Forcer le rechargement optimisé du dictionnaire
  refreshDictionary: async () => {
    try {
      console.log('🔄 Rechargement forcé du dictionnaire...');
      
      // Invalider d'abord
      cacheUtils.invalidateDictionary();
      
      // Puis refetch
      await queryClient.refetchQueries({ 
        queryKey: queryKeys.dictionary.all,
        type: 'active' 
      });
      
      console.log('✅ Dictionnaire rechargé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du rechargement:', error);
    }
  },
  
  // Nouvelle fonction: Vérifier la cohérence du cache
  validateCacheConsistency: () => {
    const cache = queryClient.getQueryCache();
    const globalQuery = cache.find(queryKeys.dictionary.all);
    
    if (!globalQuery) {
      console.warn('⚠️ Cache global du dictionnaire manquant');
      return false;
    }
    
    if (globalQuery.isStale()) {
      console.warn('⚠️ Cache global du dictionnaire obsolète');
      return false;
    }
    
    if (globalQuery.state.status === 'error') {
      console.error('❌ Erreur dans le cache global du dictionnaire');
      return false;
    }
    
    console.log('✅ Cache du dictionnaire cohérent');
    return true;
  },
  
  // Nouvelle fonction: Statistiques détaillées
  getDictionaryStats: () => {
    const cache = queryClient.getQueryCache();
    const globalQuery = cache.find(queryKeys.dictionary.all);
    
    if (!globalQuery?.state?.data) {
      return { error: 'Aucune donnée en cache' };
    }
    
    const data = globalQuery.state.data.success ? 
      globalQuery.state.data.data : 
      globalQuery.state.data;
    
    if (!data) {
      return { error: 'Format de données invalide' };
    }
    
    const stats = Object.entries(data).map(([category, items]) => ({
      category,
      count: Array.isArray(items) ? items.length : 0,
      hasData: Array.isArray(items) && items.length > 0
    }));
    
    return {
      lastUpdated: globalQuery.state.dataUpdatedAt,
      totalCategories: stats.length,
      totalItems: stats.reduce((sum, s) => sum + s.count, 0),
      categoriesWithData: stats.filter(s => s.hasData).length,
      details: stats
    };
  }
};