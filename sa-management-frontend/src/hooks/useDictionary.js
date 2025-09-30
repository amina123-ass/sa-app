// hooks/useDictionary.js - VERSION ADAPTÉE À VOTRE STRUCTURE EXISTANTE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dictionaryService } from '../services/dictionaryService';
import { queryKeys } from '../config/queryClient';
import React from 'react';

// Hook de notification adapté à votre système
const useNotification = () => {
  const showNotification = (message, type = 'info') => {
    // Implémenter selon votre système de notification
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Si vous utilisez Material-UI Snackbar ou autre
    if (window.showSuccessNotification && type === 'success') {
      window.showSuccessNotification(message);
    } else if (window.showErrorNotification && type === 'error') {
      window.showErrorNotification(message);
    }
  };
  return { showNotification };
};

// ===== HOOK PRINCIPAL OPTIMISÉ POUR TOUTES LES DONNÉES =====
export const useDictionaryData = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.dictionary.all,
    queryFn: ({ signal }) => {
      if (signal?.aborted) {
        throw new Error('Query was cancelled');
      }
      return dictionaryService.loadAllDictionaryData(options.forceRefresh);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (réduit pour plus de réactivité)
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data) => {
      // Transformation pour avoir un format uniforme
      if (data?.success && data?.data) {
        return data.data;
      }
      // Fallback vers données par défaut
      return dictionaryService.getFallbackDictionaryData();
    },
    onError: (error) => {
      console.warn('Erreur chargement dictionnaire, utilisation des données par défaut:', error.message);
      // Ne pas afficher d'erreur utilisateur car on a les données par défaut
    },
    ...options
  });
};

// ===== HOOKS INDIVIDUELS OPTIMISÉS =====

// Hook pour obtenir une catégorie spécifique du dictionnaire global
const useDictionaryCategory = (category, options = {}) => {
  const dictionaryQuery = useDictionaryData(options);
  
  return {
    ...dictionaryQuery,
    data: dictionaryQuery.data?.[category] || dictionaryService.getDefaultData(category),
    isLoading: dictionaryQuery.isLoading,
    error: dictionaryQuery.error
  };
};

// Situations - VERSION OPTIMISÉE
export const useSituations = (options = {}) => {
  // Utiliser le dictionnaire global si possible
  if (options.useGlobalCache !== false) {
    return useDictionaryCategory('situations', options);
  }
  
  // Sinon, utiliser l'ancien système
  return useQuery({
    queryKey: queryKeys.dictionary.situations,
    queryFn: dictionaryService.getSituations,
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data : data?.data || [],
    ...options
  });
};

export const useCreateSituation = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.createSituation,
    onSuccess: (data) => {
      // Invalider TOUS les caches pertinents
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.situations });
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      
      // Vider le cache local du service
      dictionaryService.clearCache?.();
      
      showNotification('Situation créée avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur création situation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useUpdateSituation = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }) => dictionaryService.updateSituation(id, data),
    onSuccess: (data, variables) => {
      // Optimistic update
      queryClient.setQueryData(queryKeys.dictionary.situations, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map(item => 
          item.id === variables.id ? { ...item, ...variables.data } : item
        );
      });
      
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      
      showNotification('Situation modifiée avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur modification situation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useDeleteSituation = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.deleteSituation,
    onSuccess: (data, deletedId) => {
      // Optimistic update - retirer de la liste
      queryClient.setQueryData(queryKeys.dictionary.situations, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter(item => item.id !== deletedId);
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      
      showNotification('Situation supprimée avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur suppression situation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
    }
  });
};

// Nature Dons - VERSION OPTIMISÉE
export const useNatureDones = (options = {}) => {
  if (options.useGlobalCache !== false) {
    return useDictionaryCategory('natureDones', options);
  }
  
  return useQuery({
    queryKey: queryKeys.dictionary.natureDones,
    queryFn: dictionaryService.getNatureDones,
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data : data?.data || [],
    ...options
  });
};

export const useCreateNatureDone = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.createNatureDone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.natureDones });
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Nature de don créée avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur création nature don:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useUpdateNatureDone = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }) => dictionaryService.updateNatureDone(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.dictionary.natureDones, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map(item => 
          item.id === variables.id ? { ...item, ...variables.data } : item
        );
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Nature de don modifiée avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur modification nature don:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useDeleteNatureDone = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.deleteNatureDone,
    onSuccess: (data, deletedId) => {
      queryClient.setQueryData(queryKeys.dictionary.natureDones, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter(item => item.id !== deletedId);
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Nature de don supprimée avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur suppression nature don:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
    }
  });
};

// Type Assistances - VERSION OPTIMISÉE
export const useTypeAssistances = (options = {}) => {
  if (options.useGlobalCache !== false) {
    return useDictionaryCategory('typeAssistances', options);
  }
  
  return useQuery({
    queryKey: queryKeys.dictionary.typeAssistances,
    queryFn: dictionaryService.getTypeAssistances,
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data : data?.data || [],
    ...options
  });
};

export const useCreateTypeAssistance = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.createTypeAssistance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.typeAssistances });
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Type d\'assistance créé avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur création type assistance:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useUpdateTypeAssistance = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }) => dictionaryService.updateTypeAssistance(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.dictionary.typeAssistances, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map(item => 
          item.id === variables.id ? { ...item, ...variables.data } : item
        );
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Type d\'assistance modifié avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur modification type assistance:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useDeleteTypeAssistance = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.deleteTypeAssistance,
    onSuccess: (data, deletedId) => {
      queryClient.setQueryData(queryKeys.dictionary.typeAssistances, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter(item => item.id !== deletedId);
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Type d\'assistance supprimé avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur suppression type assistance:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
    }
  });
};

// Details Type Assistances - VERSION OPTIMISÉE
export const useDetailsTypeAssistances = (options = {}) => {
  if (options.useGlobalCache !== false) {
    return useDictionaryCategory('detailsTypeAssistances', options);
  }
  
  return useQuery({
    queryKey: queryKeys.dictionary.detailsTypeAssistances,
    queryFn: dictionaryService.getDetailsTypeAssistances,
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data : data?.data || [],
    ...options
  });
};

export const useDetailsTypeAssistancesByType = (typeId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.dictionary.detailsByType(typeId),
    queryFn: () => dictionaryService.getDetailsTypeAssistancesByType(typeId),
    staleTime: 5 * 60 * 1000,
    enabled: !!typeId, // Ne s'exécute que si typeId est défini
    select: (data) => Array.isArray(data) ? data : data?.data || [],
    ...options
  });
};

export const useCreateDetailsTypeAssistance = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.createDetailsTypeAssistance,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.detailsTypeAssistances });
      // Invalider aussi le cache par type
      if (data?.type_assistance_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.dictionary.detailsByType(data.type_assistance_id) 
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Détail d\'assistance créé avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur création détail assistance:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useUpdateDetailsTypeAssistance = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }) => dictionaryService.updateDetailsTypeAssistance(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.dictionary.detailsTypeAssistances, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map(item => 
          item.id === variables.id ? { ...item, ...variables.data } : item
        );
      });
      
      // Invalider les caches par type
      if (variables.data.type_assistance_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.dictionary.detailsByType(variables.data.type_assistance_id) 
        });
      }
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Détail d\'assistance modifié avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur modification détail assistance:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useDeleteDetailsTypeAssistance = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.deleteDetailsTypeAssistance,
    onSuccess: (data, deletedId) => {
      queryClient.setQueryData(queryKeys.dictionary.detailsTypeAssistances, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter(item => item.id !== deletedId);
      });
      
      // Invalider tous les caches par type
      queryClient.invalidateQueries({ 
        queryKey: ['dictionary', 'detailsTypeAssistances', 'by-type'],
        exact: false 
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Détail d\'assistance supprimé avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur suppression détail assistance:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useRestoreDetailsTypeAssistance = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.restoreDetailsTypeAssistance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.detailsTypeAssistances });
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Détail d\'assistance restauré avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur restauration détail assistance:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la restauration';
      showNotification(errorMessage, 'error');
    }
  });
};

// États de Don - VERSION OPTIMISÉE
export const useEtatDones = (options = {}) => {
  if (options.useGlobalCache !== false) {
    return useDictionaryCategory('etatDones', options);
  }
  
  return useQuery({
    queryKey: queryKeys.dictionary.etatDones,
    queryFn: dictionaryService.getEtatDones,
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data : data?.data || [],
    ...options
  });
};

export const useCreateEtatDone = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.createEtatDone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.etatDones });
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('État de don créé avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur création état don:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useUpdateEtatDone = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }) => dictionaryService.updateEtatDone(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.dictionary.etatDones, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map(item => 
          item.id === variables.id ? { ...item, ...variables.data } : item
        );
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('État de don modifié avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur modification état don:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useDeleteEtatDone = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.deleteEtatDone,
    onSuccess: (data, deletedId) => {
      queryClient.setQueryData(queryKeys.dictionary.etatDones, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter(item => item.id !== deletedId);
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('État de don supprimé avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur suppression état don:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
    }
  });
};

// Questions de Sécurité - VERSION OPTIMISÉE
export const useSecurityQuestions = (options = {}) => {
  if (options.useGlobalCache !== false) {
    return useDictionaryCategory('securityQuestions', options);
  }
  
  return useQuery({
    queryKey: queryKeys.dictionary.securityQuestions,
    queryFn: dictionaryService.getSecurityQuestions,
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data : data?.data || [],
    ...options
  });
};

export const useCreateSecurityQuestion = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.createSecurityQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.securityQuestions });
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Question de sécurité créée avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur création question sécurité:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useUpdateSecurityQuestion = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }) => dictionaryService.updateSecurityQuestion(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.dictionary.securityQuestions, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map(item => 
          item.id === variables.id ? { ...item, ...variables.data } : item
        );
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Question de sécurité modifiée avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur modification question sécurité:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useDeleteSecurityQuestion = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.deleteSecurityQuestion,
    onSuccess: (data, deletedId) => {
      queryClient.setQueryData(queryKeys.dictionary.securityQuestions, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter(item => item.id !== deletedId);
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Question de sécurité supprimée avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur suppression question sécurité:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
    }
  });
};

// Types de Budget - VERSION OPTIMISÉE
export const useTypeBudgets = (options = {}) => {
  if (options.useGlobalCache !== false) {
    return useDictionaryCategory('typeBudgets', options);
  }
  
  return useQuery({
    queryKey: queryKeys.dictionary.typeBudgets,
    queryFn: dictionaryService.getTypeBudgets,
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data : data?.data || [],
    ...options
  });
};

export const useCreateTypeBudget = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.createTypeBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.typeBudgets });
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Type de budget créé avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur création type budget:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useUpdateTypeBudget = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }) => dictionaryService.updateTypeBudget(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.dictionary.typeBudgets, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map(item => 
          item.id === variables.id ? { ...item, ...variables.data } : item
        );
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Type de budget modifié avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur modification type budget:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useDeleteTypeBudget = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.deleteTypeBudget,
    onSuccess: (data, deletedId) => {
      queryClient.setQueryData(queryKeys.dictionary.typeBudgets, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter(item => item.id !== deletedId);
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Type de budget supprimé avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur suppression type budget:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
    }
  });
};

// Budgets - VERSION OPTIMISÉE
export const useBudgets = (options = {}) => {
  if (options.useGlobalCache !== false) {
    return useDictionaryCategory('budgets', options);
  }
  
  return useQuery({
    queryKey: queryKeys.dictionary.budgets,
    queryFn: dictionaryService.getBudgets,
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data : data?.data || [],
    ...options
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.budgets });
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Budget créé avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur création budget:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }) => dictionaryService.updateBudget(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.dictionary.budgets, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map(item => 
          item.id === variables.id ? { ...item, ...variables.data } : item
        );
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Budget modifié avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur modification budget:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification';
      showNotification(errorMessage, 'error');
    }
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: dictionaryService.deleteBudget,
    onSuccess: (data, deletedId) => {
      queryClient.setQueryData(queryKeys.dictionary.budgets, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter(item => item.id !== deletedId);
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
      dictionaryService.clearCache?.();
      showNotification('Budget supprimé avec succès', 'success');
    },
    onError: (error) => {
      console.error('Erreur suppression budget:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
    }
  });
};

// ===== HOOK POUR TEST DE CONNECTIVITÉ =====
export const useConnectionTest = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.connection,
    queryFn: dictionaryService.testConnection,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Retry une seule fois pour les tests de connexion
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: false, // Ne se déclenche que manuellement
    ...options
  });
};

// ===== HOOKS UTILITAIRES ADAPTÉS =====

// Hook pour invalider toutes les données du dictionnaire
export const useInvalidateDictionary = () => {
  const queryClient = useQueryClient();
  
  return React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
    dictionaryService.clearCache?.();
  }, [queryClient]);
};

// Hook pour précharger les données - VERSION OPTIMISÉE
export const usePrefetchDictionary = () => {
  const queryClient = useQueryClient();
  
  const prefetchAll = React.useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.dictionary.all,
      queryFn: () => dictionaryService.loadAllDictionaryData(),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);
  
  const prefetchCategory = React.useCallback((category) => {
    const queryKey = queryKeys.dictionary[category];
    const queryFn = dictionaryService[`get${category.charAt(0).toUpperCase()}${category.slice(1)}`];
    
    if (queryKey && queryFn) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [queryClient]);
  
  return { prefetchAll, prefetchCategory };
};

// Hook pour obtenir le statut du cache - AMÉLIORÉ
export const useDictionaryStatus = () => {
  const queryClient = useQueryClient();
  
  const getQueryState = React.useCallback((queryKey) => {
    const query = queryClient.getQueryState(queryKey);
    return {
      isLoading: query?.status === 'loading',
      isError: query?.status === 'error',
      isSuccess: query?.status === 'success',
      dataUpdatedAt: query?.dataUpdatedAt,
      error: query?.error,
      fetchStatus: query?.fetchStatus,
    };
  }, [queryClient]);
  
  return React.useMemo(() => ({
    all: getQueryState(queryKeys.dictionary.all),
    situations: getQueryState(queryKeys.dictionary.situations),
    natureDones: getQueryState(queryKeys.dictionary.natureDones),
    typeAssistances: getQueryState(queryKeys.dictionary.typeAssistances),
    detailsTypeAssistances: getQueryState(queryKeys.dictionary.detailsTypeAssistances),
    etatDones: getQueryState(queryKeys.dictionary.etatDones),
    securityQuestions: getQueryState(queryKeys.dictionary.securityQuestions),
    typeBudgets: getQueryState(queryKeys.dictionary.typeBudgets),
    budgets: getQueryState(queryKeys.dictionary.budgets),
  }), [getQueryState]);
};

// Hook pour forcer le rechargement d'une catégorie - AMÉLIORÉ
export const useRefreshDictionary = () => {
  const queryClient = useQueryClient();
  
  const refreshCategory = React.useCallback(async (category) => {
    const queryKey = queryKeys.dictionary[category];
    if (queryKey) {
      // Vider le cache local d'abord
      dictionaryService.clearCache?.();
      
      await queryClient.invalidateQueries({ queryKey });
      return queryClient.refetchQueries({ queryKey });
    }
  }, [queryClient]);
  
  const refreshAll = React.useCallback(async () => {
    // Vider le cache local d'abord
    dictionaryService.clearCache?.();
    
    await queryClient.invalidateQueries({ queryKey: queryKeys.dictionary.all });
    return queryClient.refetchQueries({ queryKey: queryKeys.dictionary.all });
  }, [queryClient]);
  
  return { refreshCategory, refreshAll };
};

// ===== HOOKS NOUVEAUX POUR L'OPTIMISATION =====

/**
 * Hook pour obtenir les statistiques du dictionnaire
 */
export const useDictionaryStats = () => {
  const dictionaryQuery = useDictionaryData();
  
  const stats = React.useMemo(() => {
    if (!dictionaryQuery.data) return null;
    
    return dictionaryService.getStats?.(dictionaryQuery.data) || {
      total: Object.values(dictionaryQuery.data).reduce((sum, items) => sum + (items?.length || 0), 0),
      byCategory: Object.entries(dictionaryQuery.data).map(([key, items]) => ({
        category: key,
        count: items?.length || 0,
        hasData: (items?.length || 0) > 0
      }))
    };
  }, [dictionaryQuery.data]);
  
  return {
    stats,
    isLoading: dictionaryQuery.isLoading,
    error: dictionaryQuery.error
  };
};

/**
 * Hook de recherche dans le dictionnaire
 */
export const useDictionarySearch = (category, searchTerm) => {
  const categoryData = useDictionaryCategory(category);
  
  const filteredData = React.useMemo(() => {
    if (!categoryData.data || !searchTerm) {
      return categoryData.data || [];
    }
    
    return dictionaryService.searchData?.(categoryData.data, searchTerm, category) || 
           categoryData.data.filter(item => 
             item.libelle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             item.question?.toLowerCase().includes(searchTerm.toLowerCase())
           );
  }, [categoryData.data, searchTerm, category]);
  
  return {
    data: filteredData,
    isLoading: categoryData.isLoading,
    error: categoryData.error,
    originalData: categoryData.data,
    resultsCount: filteredData.length,
    hasResults: filteredData.length > 0
  };
};

/**
 * Hook pour la validation des données
 */
export const useDictionaryValidation = () => {
  const validateItem = React.useCallback((category, data) => {
    if (dictionaryService.validateData) {
      return dictionaryService.validateData(category, data);
    }
    
    // Validation basique par défaut
    const errors = {};
    if (category === 'securityQuestions') {
      if (!data.question?.trim()) errors.question = 'La question est requise';
    } else {
      if (!data.libelle?.trim()) errors.libelle = 'Le libellé est requis';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, []);

  return { validateItem };
};

/**
 * Hook pour gérer le cache et la persistence
 */
export const useDictionaryCache = () => {
  const queryClient = useQueryClient();
  
  const clearAllCache = React.useCallback(() => {
    // Vider le cache React Query
    queryClient.removeQueries({ queryKey: queryKeys.dictionary.all });
    
    // Vider le cache local du service
    dictionaryService.clearCache?.();
    
    console.log('Cache complet du dictionnaire vidé');
  }, [queryClient]);

  const getCacheInfo = React.useCallback(() => {
    const reactQueryCache = queryClient.getQueryCache().findAll({ queryKey: queryKeys.dictionary.all });
    const serviceCache = dictionaryService.getCacheStatus?.() || { cached: false };
    
    return {
      reactQuery: {
        queriesCount: reactQueryCache.length,
        queries: reactQueryCache.map(query => ({
          queryKey: query.queryKey,
          state: query.state.status,
          dataUpdatedAt: query.state.dataUpdatedAt,
          errorUpdatedAt: query.state.errorUpdatedAt
        }))
      },
      service: serviceCache
    };
  }, [queryClient]);

  const preloadDictionary = React.useCallback(async () => {
    try {
      console.log('Préchargement du dictionnaire...');
      await queryClient.prefetchQuery({
        queryKey: queryKeys.dictionary.all,
        queryFn: () => dictionaryService.loadAllDictionaryData?.() || dictionaryService.loadAllData(),
        staleTime: 5 * 60 * 1000
      });
      console.log('Dictionnaire préchargé avec succès');
    } catch (error) {
      console.error('Erreur lors du préchargement:', error);
    }
  }, [queryClient]);

  return {
    clearAllCache,
    getCacheInfo,
    preloadDictionary
  };
};

/**
 * Hook global pour initialiser le dictionnaire
 */
export const useDictionaryInitialization = () => {
  const dictionaryQuery = useDictionaryData();
  const { preloadDictionary } = useDictionaryCache();
  
  // Précharger automatiquement au montage
  React.useEffect(() => {
    if (!dictionaryQuery.data && !dictionaryQuery.isFetching) {
      preloadDictionary();
    }
  }, [dictionaryQuery.data, dictionaryQuery.isFetching, preloadDictionary]);
  
  return {
    isInitialized: !!dictionaryQuery.data,
    isLoading: dictionaryQuery.isLoading,
    error: dictionaryQuery.error,
    data: dictionaryQuery.data
  };
};