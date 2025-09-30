// src/services/optimizedDictionaryService.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../config/queryClient';
import enhancedAxiosClient from './enhancedAxiosClient';

// Service de base pour les appels API
const dictionaryApi = {
  // Situations
  getSituations: () => enhancedAxiosClient.get('/admin/dictionary/situations').then(res => res.data.data || res.data || []),
  createSituation: (data) => enhancedAxiosClient.post('/admin/dictionary/situations', data).then(res => res.data),
  updateSituation: (id, data) => enhancedAxiosClient.put(`/admin/dictionary/situations/${id}`, data).then(res => res.data),
  deleteSituation: (id) => enhancedAxiosClient.delete(`/admin/dictionary/situations/${id}`).then(res => res.data),

  // Natures de Don
  getNatureDones: () => enhancedAxiosClient.get('/admin/dictionary/nature-dones').then(res => res.data.data || res.data || []),
  createNatureDone: (data) => enhancedAxiosClient.post('/admin/dictionary/nature-dones', data).then(res => res.data),
  updateNatureDone: (id, data) => enhancedAxiosClient.put(`/admin/dictionary/nature-dones/${id}`, data).then(res => res.data),
  deleteNatureDone: (id) => enhancedAxiosClient.delete(`/admin/dictionary/nature-dones/${id}`).then(res => res.data),

  // Types d'Assistance
  getTypeAssistances: () => enhancedAxiosClient.get('/admin/dictionary/type-assistances').then(res => res.data.data || res.data || []),
  createTypeAssistance: (data) => enhancedAxiosClient.post('/admin/dictionary/type-assistances', data).then(res => res.data),
  updateTypeAssistance: (id, data) => enhancedAxiosClient.put(`/admin/dictionary/type-assistances/${id}`, data).then(res => res.data),
  deleteTypeAssistance: (id) => enhancedAxiosClient.delete(`/admin/dictionary/type-assistances/${id}`).then(res => res.data),

  // Détails Types d'Assistance
  getDetailsTypeAssistances: () => enhancedAxiosClient.get('/admin/dictionary/details-type-assistances').then(res => res.data.data || res.data || []),
  getDetailsTypeAssistancesByType: (typeId) => enhancedAxiosClient.get(`/admin/dictionary/details-type-assistances/by-type/${typeId}`).then(res => res.data.data || res.data || []),
  createDetailsTypeAssistance: (data) => enhancedAxiosClient.post('/admin/dictionary/details-type-assistances', data).then(res => res.data),
  updateDetailsTypeAssistance: (id, data) => enhancedAxiosClient.put(`/admin/dictionary/details-type-assistances/${id}`, data).then(res => res.data),
  deleteDetailsTypeAssistance: (id) => enhancedAxiosClient.delete(`/admin/dictionary/details-type-assistances/${id}`).then(res => res.data),

  // États de Don
  getEtatDones: () => enhancedAxiosClient.get('/admin/dictionary/etat-dones').then(res => res.data.data || res.data || []),
  createEtatDone: (data) => enhancedAxiosClient.post('/admin/dictionary/etat-dones', data).then(res => res.data),
  updateEtatDone: (id, data) => enhancedAxiosClient.put(`/admin/dictionary/etat-dones/${id}`, data).then(res => res.data),
  deleteEtatDone: (id) => enhancedAxiosClient.delete(`/admin/dictionary/etat-dones/${id}`).then(res => res.data),

  // Questions de Sécurité
  getSecurityQuestions: () => enhancedAxiosClient.get('/admin/dictionary/security-questions').then(res => res.data.data || res.data || []),
  createSecurityQuestion: (data) => enhancedAxiosClient.post('/admin/dictionary/security-questions', data).then(res => res.data),
  updateSecurityQuestion: (id, data) => enhancedAxiosClient.put(`/admin/dictionary/security-questions/${id}`, data).then(res => res.data),
  deleteSecurityQuestion: (id) => enhancedAxiosClient.delete(`/admin/dictionary/security-questions/${id}`).then(res => res.data),

  // Types de Budget
  getTypeBudgets: () => enhancedAxiosClient.get('/admin/dictionary/type-budgets').then(res => res.data.data || res.data || []),
  createTypeBudget: (data) => enhancedAxiosClient.post('/admin/dictionary/type-budgets', data).then(res => res.data),
  updateTypeBudget: (id, data) => enhancedAxiosClient.put(`/admin/dictionary/type-budgets/${id}`, data).then(res => res.data),
  deleteTypeBudget: (id) => enhancedAxiosClient.delete(`/admin/dictionary/type-budgets/${id}`).then(res => res.data),

  // Budgets
  getBudgets: () => enhancedAxiosClient.get('/admin/dictionary/budgets').then(res => res.data.data || res.data || []),
  createBudget: (data) => enhancedAxiosClient.post('/admin/dictionary/budgets', data).then(res => res.data),
  updateBudget: (id, data) => enhancedAxiosClient.put(`/admin/dictionary/budgets/${id}`, data).then(res => res.data),
  deleteBudget: (id) => enhancedAxiosClient.delete(`/admin/dictionary/budgets/${id}`).then(res => res.data),
};

// Données par défaut (fallback)
const defaultData = {
  situations: [
    { id: 1, libelle: 'Situation précaire' },
    { id: 2, libelle: 'Famille nombreuse' },
    { id: 3, libelle: 'Personne âgée' },
    { id: 4, libelle: 'Personne handicapée' },
    { id: 5, libelle: 'Situation d\'urgence' }
  ],
  natureDones: [
    { id: 1, libelle: 'Don individuel', duree: null },
    { id: 2, libelle: 'Don d\'entreprise', duree: 12 },
    { id: 3, libelle: 'Don d\'association', duree: 6 },
    { id: 4, libelle: 'Don gouvernemental', duree: 24 }
  ],
  typeAssistances: [
    { id: 1, libelle: 'Aide médicale', description: 'Assistance médicale d\'urgence' },
    { id: 2, libelle: 'Aide sociale', description: 'Support social et familial' },
    { id: 3, libelle: 'Assistance éducative', description: 'Aide à l\'éducation' },
    { id: 4, libelle: 'Aide d\'urgence', description: 'Assistance d\'urgence' }
  ],
  detailsTypeAssistances: [
    { 
      id: 1, 
      type_assistance_id: 1, 
      libelle: 'Consultation médicale', 
      description: 'Consultation chez un médecin généraliste',
      montant: 50.00,
      typeAssistance: { libelle: 'Aide médicale' }
    },
    { 
      id: 2, 
      type_assistance_id: 1, 
      libelle: 'Médicaments essentiels', 
      description: 'Provision de médicaments de base',
      montant: 25.00,
      typeAssistance: { libelle: 'Aide médicale' }
    }
  ],
  etatDones: [
    { id: 1, libelle: 'En attente' },
    { id: 2, libelle: 'Validé' },
    { id: 3, libelle: 'Rejeté' },
    { id: 4, libelle: 'En cours' },
    { id: 5, libelle: 'Terminé' }
  ],
  securityQuestions: [
    { id: 1, question: 'Quel est le nom de votre premier animal de compagnie ?', active: true },
    { id: 2, question: 'Dans quelle ville êtes-vous né(e) ?', active: true },
    { id: 3, question: 'Quel est le nom de jeune fille de votre mère ?', active: true },
    { id: 4, question: 'Quel était le nom de votre école primaire ?', active: true },
    { id: 5, question: 'Quelle est votre couleur préférée ?', active: true }
  ],
  typeBudgets: [
    { id: 1, libelle: 'Budget principal' },
    { id: 2, libelle: 'Budget d\'urgence' },
    { id: 3, libelle: 'Budget spécial' },
    { id: 4, libelle: 'Fonds de réserve' },
    { id: 5, libelle: 'Budget DON' }
  ],
  budgets: [
    { 
      id: 1, 
      libelle: 'Budget 2024 Principal', 
      montant: 100000, 
      annee_exercice: 2024,
      type_budget_id: 1,
      typeBudget: { libelle: 'Budget principal' }
    },
    { 
      id: 2, 
      libelle: 'Budget 2024 Urgence', 
      montant: 25000, 
      annee_exercice: 2024,
      type_budget_id: 2,
      typeBudget: { libelle: 'Budget d\'urgence' }
    }
  ]
};

// HOOKS REACT QUERY OPTIMISÉS

// Hook pour charger toutes les données du dictionnaire
export const useDictionaryData = () => {
  const queryClient = useQueryClient();

  const situations = useQuery({
    queryKey: QUERY_KEYS.DICTIONARY.SITUATIONS,
    queryFn: dictionaryApi.getSituations,
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60, // 1 heure
    placeholderData: defaultData.situations,
    onError: (error) => {
      console.warn('Erreur chargement situations:', error);
    }
  });

  const natureDones = useQuery({
    queryKey: QUERY_KEYS.DICTIONARY.NATURE_DONES,
    queryFn: dictionaryApi.getNatureDones,
    staleTime: 1000 * 60 * 30,
    cacheTime: 1000 * 60 * 60,
    placeholderData: defaultData.natureDones,
  });

  const typeAssistances = useQuery({
    queryKey: QUERY_KEYS.DICTIONARY.TYPE_ASSISTANCES,
    queryFn: dictionaryApi.getTypeAssistances,
    staleTime: 1000 * 60 * 30,
    cacheTime: 1000 * 60 * 60,
    placeholderData: defaultData.typeAssistances,
  });

  const detailsTypeAssistances = useQuery({
    queryKey: QUERY_KEYS.DICTIONARY.DETAILS_TYPE_ASSISTANCES,
    queryFn: dictionaryApi.getDetailsTypeAssistances,
    staleTime: 1000 * 60 * 15, // Plus court car plus susceptible de changer
    cacheTime: 1000 * 60 * 60,
    placeholderData: defaultData.detailsTypeAssistances,
  });

  const etatDones = useQuery({
    queryKey: QUERY_KEYS.DICTIONARY.ETAT_DONES,
    queryFn: dictionaryApi.getEtatDones,
    staleTime: 1000 * 60 * 30,
    cacheTime: 1000 * 60 * 60,
    placeholderData: defaultData.etatDones,
  });

  const securityQuestions = useQuery({
    queryKey: QUERY_KEYS.DICTIONARY.SECURITY_QUESTIONS,
    queryFn: dictionaryApi.getSecurityQuestions,
    staleTime: 1000 * 60 * 30,
    cacheTime: 1000 * 60 * 60,
    placeholderData: defaultData.securityQuestions,
  });

  const typeBudgets = useQuery({
    queryKey: QUERY_KEYS.DICTIONARY.TYPE_BUDGETS,
    queryFn: dictionaryApi.getTypeBudgets,
    staleTime: 1000 * 60 * 30,
    cacheTime: 1000 * 60 * 60,
    placeholderData: defaultData.typeBudgets,
  });

  const budgets = useQuery({
    queryKey: QUERY_KEYS.DICTIONARY.BUDGETS,
    queryFn: dictionaryApi.getBudgets,
    staleTime: 1000 * 60 * 5, // Plus court car peut changer plus souvent
    cacheTime: 1000 * 60 * 30,
    placeholderData: defaultData.budgets,
  });

  // Fonction pour recharger toutes les données
  const refetchAll = async () => {
    await Promise.allSettled([
      situations.refetch(),
      natureDones.refetch(),
      typeAssistances.refetch(),
      detailsTypeAssistances.refetch(),
      etatDones.refetch(),
      securityQuestions.refetch(),
      typeBudgets.refetch(),
      budgets.refetch(),
    ]);
  };

  // Fonction pour précharger toutes les données
  const prefetchAll = async () => {
    const promises = [
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.DICTIONARY.SITUATIONS,
        queryFn: dictionaryApi.getSituations,
        staleTime: 1000 * 60 * 30,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.DICTIONARY.NATURE_DONES,
        queryFn: dictionaryApi.getNatureDones,
        staleTime: 1000 * 60 * 30,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.DICTIONARY.TYPE_ASSISTANCES,
        queryFn: dictionaryApi.getTypeAssistances,
        staleTime: 1000 * 60 * 30,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.DICTIONARY.DETAILS_TYPE_ASSISTANCES,
        queryFn: dictionaryApi.getDetailsTypeAssistances,
        staleTime: 1000 * 60 * 15,
      }),
    ];

    await Promise.allSettled(promises);
  };

  const isLoading = [
    situations.isLoading,
    natureDones.isLoading,
    typeAssistances.isLoading,
    detailsTypeAssistances.isLoading,
    etatDones.isLoading,
    securityQuestions.isLoading,
    typeBudgets.isLoading,
    budgets.isLoading,
  ].some(Boolean);

  const isError = [
    situations.isError,
    natureDones.isError,
    typeAssistances.isError,
    detailsTypeAssistances.isError,
    etatDones.isError,
    securityQuestions.isError,
    typeBudgets.isError,
    budgets.isError,
  ].some(Boolean);

  return {
    data: {
      situations: situations.data || defaultData.situations,
      natureDones: natureDones.data || defaultData.natureDones,
      typeAssistances: typeAssistances.data || defaultData.typeAssistances,
      detailsTypeAssistances: detailsTypeAssistances.data || defaultData.detailsTypeAssistances,
      etatDones: etatDones.data || defaultData.etatDones,
      securityQuestions: securityQuestions.data || defaultData.securityQuestions,
      typeBudgets: typeBudgets.data || defaultData.typeBudgets,
      budgets: budgets.data || defaultData.budgets,
    },
    isLoading,
    isError,
    refetchAll,
    prefetchAll,
    queries: {
      situations,
      natureDones,
      typeAssistances,
      detailsTypeAssistances,
      etatDones,
      securityQuestions,
      typeBudgets,
      budgets,
    }
  };
};

// HOOKS POUR LES MUTATIONS OPTIMISÉES

// Hook pour les situations
export const useSituationMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: dictionaryApi.createSituation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DICTIONARY.SITUATIONS });
    },
    onError: (error) => {
      console.error('Erreur création situation:', error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => dictionaryApi.updateSituation(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.DICTIONARY.SITUATIONS });
      const previousData = queryClient.getQueryData(QUERY_KEYS.DICTIONARY.SITUATIONS);
      
      queryClient.setQueryData(QUERY_KEYS.DICTIONARY.SITUATIONS, (old) => 
        old?.map(item => item.id === id ? { ...item, ...data } : item) || []
      );
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.DICTIONARY.SITUATIONS, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DICTIONARY.SITUATIONS });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dictionaryApi.deleteSituation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.DICTIONARY.SITUATIONS });
      const previousData = queryClient.getQueryData(QUERY_KEYS.DICTIONARY.SITUATIONS);
      
      queryClient.setQueryData(QUERY_KEYS.DICTIONARY.SITUATIONS, (old) => 
        old?.filter(item => item.id !== id) || []
      );
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.DICTIONARY.SITUATIONS, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DICTIONARY.SITUATIONS });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
};

// Hook pour les natures de don
export const useNatureDoneMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: dictionaryApi.createNatureDone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DICTIONARY.NATURE_DONES });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => dictionaryApi.updateNatureDone(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.DICTIONARY.NATURE_DONES });
      const previousData = queryClient.getQueryData(QUERY_KEYS.DICTIONARY.NATURE_DONES);
      
      queryClient.setQueryData(QUERY_KEYS.DICTIONARY.NATURE_DONES, (old) => 
        old?.map(item => item.id === id ? { ...item, ...data } : item) || []
      );
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.DICTIONARY.NATURE_DONES, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DICTIONARY.NATURE_DONES });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dictionaryApi.deleteNatureDone,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.DICTIONARY.NATURE_DONES });
      const previousData = queryClient.getQueryData(QUERY_KEYS.DICTIONARY.NATURE_DONES);
      
      queryClient.setQueryData(QUERY_KEYS.DICTIONARY.NATURE_DONES, (old) => 
        old?.filter(item => item.id !== id) || []
      );
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.DICTIONARY.NATURE_DONES, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DICTIONARY.NATURE_DONES });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
};

// Hook pour les budgets avec logique spéciale pour DON
export const useBudgetMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: dictionaryApi.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DICTIONARY.BUDGETS });
      // Invalider aussi les types de budget car ils peuvent être liés
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DICTIONARY.TYPE_BUDGETS });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => dictionaryApi.updateBudget(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.DICTIONARY.BUDGETS });
      const previousData = queryClient.getQueryData(QUERY_KEYS.DICTIONARY.BUDGETS);
      
      queryClient.setQueryData(QUERY_KEYS.DICTIONARY.BUDGETS, (old) => 
        old?.map(item => item.id === id ? { ...item, ...data } : item) || []
      );
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.DICTIONARY.BUDGETS, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DICTIONARY.BUDGETS });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dictionaryApi.deleteBudget,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.DICTIONARY.BUDGETS });
      const previousData = queryClient.getQueryData(QUERY_KEYS.DICTIONARY.BUDGETS);
      
      queryClient.setQueryData(QUERY_KEYS.DICTIONARY.BUDGETS, (old) => 
        old?.filter(item => item.id !== id) || []
      );
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.DICTIONARY.BUDGETS, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DICTIONARY.BUDGETS });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
};

// Hook générique pour toutes les mutations du dictionnaire
export const useDictionaryMutations = () => {
  const situations = useSituationMutations();
  const natureDones = useNatureDoneMutations();
  const budgets = useBudgetMutations();

  return {
    situations,
    natureDones,
    budgets,
    // Ajouter d'autres mutations selon les besoins
  };
};

// Hook pour gérer les détails par type d'assistance avec cache intelligent
export const useDetailsTypeAssistancesByType = (typeAssistanceId) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.DICTIONARY.DETAILS_TYPE_ASSISTANCES, 'byType', typeAssistanceId],
    queryFn: () => dictionaryApi.getDetailsTypeAssistancesByType(typeAssistanceId),
    enabled: !!typeAssistanceId,
    staleTime: 1000 * 60 * 15,
    placeholderData: () => {
      // Utiliser les données du cache global comme placeholder
      const allDetails = queryClient.getQueryData(QUERY_KEYS.DICTIONARY.DETAILS_TYPE_ASSISTANCES);
      return allDetails?.filter(detail => detail.type_assistance_id == typeAssistanceId) || [];
    },
  });
};

// Fonction utilitaire pour validation
export const validateDictionaryData = (category, data) => {
  const errors = {};
  
  switch (category) {
    case 'securityQuestions':
      if (!data.question?.trim()) {
        errors.question = 'La question est requise';
      } else if (data.question.length < 10) {
        errors.question = 'La question doit contenir au moins 10 caractères';
      }
      break;
      
    case 'budgets':
      if (!data.libelle?.trim()) {
        errors.libelle = 'Le libellé est requis';
      }
      if (!data.annee_exercice) {
        errors.annee_exercice = 'L\'année d\'exercice est requise';
      }
      if (!data.type_budget_id) {
        errors.type_budget_id = 'Le type de budget est requis';
      }
      break;
      
    default:
      if (!data.libelle?.trim()) {
        errors.libelle = 'Le libellé est requis';
      }
      break;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export default {
  useDictionaryData,
  useDictionaryMutations,
  useSituationMutations,
  useNatureDoneMutations,
  useBudgetMutations,
  useDetailsTypeAssistancesByType,
  validateDictionaryData,
};