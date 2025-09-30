// src/hooks/usePrefetch.js
import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../config/queryClient';

// Hook pour prefetch au survol des liens
export const usePrefetchOnHover = () => {
  const queryClient = useQueryClient();
  const timeoutRef = useRef(null);

  const prefetchPage = useCallback(async (page, params = {}) => {
    const prefetchMap = {
      '/admin/users': () => prefetchUsersData(),
      '/admin/dictionary': () => prefetchDictionaryData(),
      '/admin/dashboard': () => prefetchDashboardData(),
      '/upas/campagnes': () => prefetchCampagnesData(),
      '/upas/beneficiaires': () => prefetchBeneficiairesData(),
      '/reception/dashboard': () => prefetchReceptionData(),
    };

    const prefetchFn = prefetchMap[page];
    if (prefetchFn) {
      try {
        await prefetchFn(params);
        console.log(`✅ Prefetch réussi pour ${page}`);
      } catch (error) {
        console.warn(`⚠️ Erreur prefetch ${page}:`, error);
      }
    }
  }, [queryClient]);

  const prefetchUsersData = useCallback(async (params = {}) => {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.USERS.LIST(params),
        queryFn: () => import('../services/userService').then(m => m.getUsers(params)),
        staleTime: 1000 * 60 * 5, // 5 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.USERS.ROLES,
        queryFn: () => import('../services/userService').then(m => m.getRoles()),
        staleTime: 1000 * 60 * 15, // 15 minutes
      }),
    ]);
  }, [queryClient]);

  const prefetchDictionaryData = useCallback(async () => {
    const dictionaryService = await import('../services/dictionaryService');
    
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.DICTIONARY.SITUATIONS,
        queryFn: () => dictionaryService.dictionaryService.getSituations(),
        staleTime: 1000 * 60 * 30,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.DICTIONARY.NATURE_DONES,
        queryFn: () => dictionaryService.dictionaryService.getNatureDones(),
        staleTime: 1000 * 60 * 30,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.DICTIONARY.TYPE_ASSISTANCES,
        queryFn: () => dictionaryService.dictionaryService.getTypeAssistances(),
        staleTime: 1000 * 60 * 30,
      }),
    ]);
  }, [queryClient]);

  const prefetchDashboardData = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.DASHBOARD.STATS,
      queryFn: () => import('../services/dashboardService').then(m => m.getAdminStats()),
      staleTime: 1000 * 60 * 2, // 2 minutes pour les stats
    });
  }, [queryClient]);

  const prefetchCampagnesData = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.UPAS.CAMPAGNES,
      queryFn: () => import('../services/upasService').then(m => m.getCampagnes()),
      staleTime: 1000 * 60 * 5,
    });
  }, [queryClient]);

  const prefetchBeneficiairesData = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.UPAS.BENEFICIAIRES,
      queryFn: () => import('../services/upasService').then(m => m.getBeneficiaires()),
      staleTime: 1000 * 60 * 5,
    });
  }, [queryClient]);

  const prefetchReceptionData = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ['reception', 'dashboard'],
      queryFn: () => import('../services/receptionService').then(m => m.getDashboardData()),
      staleTime: 1000 * 60 * 2,
    });
  }, [queryClient]);

  // Fonction principale pour déclencher le prefetch avec délai
  const handleHover = useCallback((page, params = {}) => {
    // Nettoyer le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Déclencher le prefetch après 200ms de survol
    timeoutRef.current = setTimeout(() => {
      prefetchPage(page, params);
    }, 200);
  }, [prefetchPage]);

  const handleHoverEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { handleHover, handleHoverEnd };
};

// Hook pour gestion optimisée des queries avec cache
export const useOptimizedQuery = (key, queryFn, options = {}) => {
  const queryClient = useQueryClient();

  const defaultOptions = {
    staleTime: 1000 * 60 * 5, // 5 minutes par défaut
    cacheTime: 1000 * 60 * 30, // 30 minutes par défaut
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  };

  return useQuery({
    queryKey: key,
    queryFn,
    ...defaultOptions,
  });
};

// Hook pour gestion des mutations avec optimistic updates
export const useOptimizedMutation = (mutationFn, options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Optimistic update si configuré
      if (options.optimisticUpdate) {
        const { queryKey, updater } = options.optimisticUpdate;
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData(queryKey);
        
        queryClient.setQueryData(queryKey, (old) => updater(old, variables));
        
        return { previousData, queryKey };
      }
    },
    onError: (error, variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      options.onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      // Invalider les queries liées
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      options.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

// Composant wrapper pour liens avec prefetch
export const PrefetchLink = ({ 
  to, 
  children, 
  prefetchParams = {}, 
  component: Component = 'a',
  ...props 
}) => {
  const { handleHover, handleHoverEnd } = usePrefetchOnHover();

  return (
    <Component
      {...props}
      onMouseEnter={() => handleHover(to, prefetchParams)}
      onMouseLeave={handleHoverEnd}
      onFocus={() => handleHover(to, prefetchParams)}
      onBlur={handleHoverEnd}
    >
      {children}
    </Component>
  );
};

// Hook pour background sync (synchronisation en arrière-plan)
export const useBackgroundSync = () => {
  const queryClient = useQueryClient();

  const syncCriticalData = useCallback(async () => {
    const criticalQueries = [
      QUERY_KEYS.DICTIONARY.SITUATIONS,
      QUERY_KEYS.DICTIONARY.NATURE_DONES,
      QUERY_KEYS.DICTIONARY.TYPE_ASSISTANCES,
      QUERY_KEYS.DICTIONARY.DETAILS_TYPE_ASSISTANCES,
    ];

    const promises = criticalQueries.map(queryKey => 
      queryClient.invalidateQueries({ 
        queryKey, 
        refetchType: 'inactive' // Refetch même si la query n'est pas active
      })
    );

    try {
      await Promise.allSettled(promises);
      console.log('✅ Synchronisation en arrière-plan terminée');
    } catch (error) {
      console.warn('⚠️ Erreur lors de la synchronisation:', error);
    }
  }, [queryClient]);

  const syncUserSpecificData = useCallback(async () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user?.role?.libelle) return;

    const queries = [];

    switch (user.role.libelle) {
      case 'Administrateur Informatique':
        queries.push(
          QUERY_KEYS.USERS.LIST({}),
          QUERY_KEYS.DASHBOARD.STATS
        );
        break;
      case 'Responsable UPAS':
        queries.push(
          QUERY_KEYS.UPAS.CAMPAGNES,
          QUERY_KEYS.UPAS.BENEFICIAIRES
        );
        break;
    }

    if (queries.length > 0) {
      const promises = queries.map(queryKey =>
        queryClient.invalidateQueries({ queryKey, refetchType: 'inactive' })
      );

      try {
        await Promise.allSettled(promises);
        console.log('✅ Données utilisateur synchronisées');
      } catch (error) {
        console.warn('⚠️ Erreur sync données utilisateur:', error);
      }
    }
  }, [queryClient]);

  return { syncCriticalData, syncUserSpecificData };
};

// Hook pour monitoring des performances des queries
export const useQueryPerformance = () => {
  const queryClient = useQueryClient();

  const getQueryStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    const stats = {
      total: queries.length,
      fresh: queries.filter(q => q.state.dataUpdateCount > 0 && !q.isStale()).length,
      stale: queries.filter(q => q.isStale()).length,
      loading: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      error: queries.filter(q => q.state.status === 'error').length,
      inactive: queries.filter(q => !q.hasObservers()).length,
    };

    return stats;
  }, [queryClient]);

  const getSlowQueries = useCallback((threshold = 2000) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    return queries
      .filter(q => {
        const lastFetch = q.state.dataUpdatedAt;
        const lastStart = q.state.fetchFailureReason?.timestamp || lastFetch;
        return lastFetch && lastStart && (lastFetch - lastStart) > threshold;
      })
      .map(q => ({
        queryKey: q.queryKey,
        duration: q.state.dataUpdatedAt - (q.state.fetchFailureReason?.timestamp || 0),
        status: q.state.status,
      }));
  }, [queryClient]);

  const getCacheSize = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Estimation approximative de la taille du cache
    const totalSize = queries.reduce((acc, query) => {
      try {
        const dataSize = JSON.stringify(query.state.data || {}).length;
        return acc + dataSize;
      } catch {
        return acc;
      }
    }, 0);

    return {
      queries: queries.length,
      estimatedSize: totalSize,
      formattedSize: formatBytes(totalSize),
    };
  }, [queryClient]);

  const clearStaleQueries = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const staleQueries = cache.getAll().filter(q => q.isStale() && !q.hasObservers());
    
    staleQueries.forEach(query => {
      cache.remove(query);
    });

    console.log(`🧹 Supprimé ${staleQueries.length} queries obsolètes`);
    return staleQueries.length;
  }, [queryClient]);

  return {
    getQueryStats,
    getSlowQueries,
    getCacheSize,
    clearStaleQueries,
  };
};

// Fonction utilitaire pour formater les bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Export des hooks et composants
export { useOptimizedQuery, useOptimizedMutation, useBackgroundSync, useQueryPerformance };
