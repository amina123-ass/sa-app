// services/dictionaryService.js - Service amélioré avec gestion d'erreur robuste
import axiosClient from './axiosClient';

export const dictionaryService = {
  // ===== TEST DE CONNEXION =====
  testConnection: async () => {
    try {
      const response = await axiosClient.get('/test');
      return response.data;
    } catch (error) {
      console.error('Test de connexion échoué:', error);
      throw error;
    }
  },

  // ===== CHARGEMENT SÉCURISÉ AMÉLIORÉ =====
  safeLoad: async (category) => {
    try {
      console.log(`🔄 Chargement sécurisé de ${category}...`);
      
      switch (category) {
        case 'situations':
          return await dictionaryService.getSituations();
        case 'natureDones':
          return await dictionaryService.getNatureDones();
        case 'typeAssistances':
          return await dictionaryService.getTypeAssistances();
        case 'detailsTypeAssistances':
          return await dictionaryService.getDetailsTypeAssistances();
        case 'etatDones':
          return await dictionaryService.getEtatDones();
        case 'securityQuestions':
          return await dictionaryService.getSecurityQuestions();
        case 'typeBudgets':
          return await dictionaryService.getTypeBudgets();
        case 'budgets':
          return await dictionaryService.getBudgets();
        default:
          console.warn(`Catégorie inconnue: ${category}`);
          return [];
      }
    } catch (error) {
      console.error(`Erreur lors du chargement de ${category}:`, error);
      // Retourner les données par défaut en cas d'erreur
      return dictionaryService.getDefaultData(category);
    }
  },

  // ===== DONNÉES PAR DÉFAUT =====
  getDefaultData: (category) => {
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
        },
        { 
          id: 3, 
          type_assistance_id: 2, 
          libelle: 'Aide alimentaire', 
          description: 'Distribution de colis alimentaires',
          montant: 30.00,
          typeAssistance: { libelle: 'Aide sociale' }
        },
        { 
          id: 4, 
          type_assistance_id: 3, 
          libelle: 'Fournitures scolaires', 
          description: 'Kit de fournitures pour l\'école',
          montant: 40.00,
          typeAssistance: { libelle: 'Assistance éducative' }
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

    return defaultData[category] || [];
  },

  // ===== SITUATIONS =====
  getSituations: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/situations');
      return response.data.data || response.data || [];
    } catch (error) {
      console.warn('Erreur chargement situations, fallback...', error.message);
      return dictionaryService.getDefaultData('situations');
    }
  },

  createSituation: async (data) => {
    const response = await axiosClient.post('/admin/dictionary/situations', data);
    return response.data;
  },

  updateSituation: async (id, data) => {
    const response = await axiosClient.put(`/admin/dictionary/situations/${id}`, data);
    return response.data;
  },

  deleteSituation: async (id) => {
    const response = await axiosClient.delete(`/admin/dictionary/situations/${id}`);
    return response.data;
  },

  // ===== NATURES DE DON =====
  getNatureDones: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/nature-dones');
      const data = response.data.data || response.data || [];
      console.log('✅ Natures de don chargées depuis l\'API:', data.length);
      return data;
    } catch (error) {
      console.warn('⚠️ Erreur chargement natures done, utilisation des données par défaut...', error.message);
      const defaultData = dictionaryService.getDefaultData('natureDones');
      console.log('📋 Données par défaut natures de don:', defaultData.length);
      return defaultData;
    }
  },

  createNatureDone: async (data) => {
    const response = await axiosClient.post('/admin/dictionary/nature-dones', data);
    return response.data;
  },

  updateNatureDone: async (id, data) => {
    const response = await axiosClient.put(`/admin/dictionary/nature-dones/${id}`, data);
    return response.data;
  },

  deleteNatureDone: async (id) => {
    const response = await axiosClient.delete(`/admin/dictionary/nature-dones/${id}`);
    return response.data;
  },

  // ===== TYPES D'ASSISTANCE =====
  getTypeAssistances: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/type-assistances');
      return response.data.data || response.data || [];
    } catch (error) {
      console.warn('Erreur chargement types assistance, fallback...', error.message);
      return dictionaryService.getDefaultData('typeAssistances');
    }
  },

  createTypeAssistance: async (data) => {
    const response = await axiosClient.post('/admin/dictionary/type-assistances', data);
    return response.data;
  },

  updateTypeAssistance: async (id, data) => {
    const response = await axiosClient.put(`/admin/dictionary/type-assistances/${id}`, data);
    return response.data;
  },

  deleteTypeAssistance: async (id) => {
    const response = await axiosClient.delete(`/admin/dictionary/type-assistances/${id}`);
    return response.data;
  },

  // ===== DÉTAILS TYPES D'ASSISTANCE =====
  getDetailsTypeAssistances: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/details-type-assistances');
      const data = response.data.data || response.data || [];
      console.log('✅ Détails types assistance chargés depuis l\'API:', data.length);
      return data;
    } catch (error) {
      console.warn('⚠️ Erreur chargement détails types assistance, utilisation des données par défaut...', error.message);
      const defaultData = dictionaryService.getDefaultData('detailsTypeAssistances');
      console.log('📋 Données par défaut détails types assistance:', defaultData.length);
      return defaultData;
    }
  },

  getDetailsTypeAssistancesByType: async (typeAssistanceId) => {
    try {
      const response = await axiosClient.get(`/admin/dictionary/details-type-assistances/by-type/${typeAssistanceId}`);
      const data = response.data.data || response.data || [];
      console.log(`✅ Détails pour type assistance ${typeAssistanceId} chargés:`, data.length);
      return data;
    } catch (error) {
      console.warn(`⚠️ Erreur chargement détails pour type ${typeAssistanceId}:`, error.message);
      // Retourner les détails par défaut filtrés par type
      const defaultData = dictionaryService.getDefaultData('detailsTypeAssistances');
      return defaultData.filter(detail => detail.type_assistance_id == typeAssistanceId);
    }
  },

  createDetailsTypeAssistance: async (data) => {
    const response = await axiosClient.post('/admin/dictionary/details-type-assistances', data);
    return response.data;
  },

  updateDetailsTypeAssistance: async (id, data) => {
    const response = await axiosClient.put(`/admin/dictionary/details-type-assistances/${id}`, data);
    return response.data;
  },

  deleteDetailsTypeAssistance: async (id) => {
    const response = await axiosClient.delete(`/admin/dictionary/details-type-assistances/${id}`);
    return response.data;
  },

  restoreDetailsTypeAssistance: async (id) => {
    const response = await axiosClient.post(`/admin/dictionary/details-type-assistances/${id}/restore`);
    return response.data;
  },

  // ===== ÉTATS DE DON =====
  getEtatDones: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/etat-dones');
      const data = response.data.data || response.data || [];
      console.log('✅ États de don chargés depuis l\'API:', data.length);
      return data;
    } catch (error) {
      console.warn('⚠️ Erreur chargement états done, utilisation des données par défaut...', error.message);
      const defaultData = dictionaryService.getDefaultData('etatDones');
      console.log('📋 Données par défaut états de don:', defaultData.length);
      return defaultData;
    }
  },

  createEtatDone: async (data) => {
    const response = await axiosClient.post('/admin/dictionary/etat-dones', data);
    return response.data;
  },

  updateEtatDone: async (id, data) => {
    const response = await axiosClient.put(`/admin/dictionary/etat-dones/${id}`, data);
    return response.data;
  },

  deleteEtatDone: async (id) => {
    const response = await axiosClient.delete(`/admin/dictionary/etat-dones/${id}`);
    return response.data;
  },

  // ===== QUESTIONS DE SÉCURITÉ =====
  getSecurityQuestions: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/security-questions');
      return response.data.data || response.data || [];
    } catch (error) {
      console.warn('Erreur chargement questions sécurité, fallback...', error.message);
      return dictionaryService.getDefaultData('securityQuestions');
    }
  },

  createSecurityQuestion: async (data) => {
    const response = await axiosClient.post('/admin/dictionary/security-questions', data);
    return response.data;
  },

  updateSecurityQuestion: async (id, data) => {
    const response = await axiosClient.put(`/admin/dictionary/security-questions/${id}`, data);
    return response.data;
  },

  deleteSecurityQuestion: async (id) => {
    const response = await axiosClient.delete(`/admin/dictionary/security-questions/${id}`);
    return response.data;
  },

  // ===== TYPES DE BUDGET =====
  getTypeBudgets: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/type-budgets');
      return response.data.data || response.data || [];
    } catch (error) {
      console.warn('Erreur chargement types budget, fallback...', error.message);
      return dictionaryService.getDefaultData('typeBudgets');
    }
  },

  createTypeBudget: async (data) => {
    const response = await axiosClient.post('/admin/dictionary/type-budgets', data);
    return response.data;
  },

  updateTypeBudget: async (id, data) => {
    const response = await axiosClient.put(`/admin/dictionary/type-budgets/${id}`, data);
    return response.data;
  },

  deleteTypeBudget: async (id) => {
    const response = await axiosClient.delete(`/admin/dictionary/type-budgets/${id}`);
    return response.data;
  },

  // ===== BUDGETS =====
  getBudgets: async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/budgets');
      return response.data.data || response.data || [];
    } catch (error) {
      console.warn('Erreur chargement budgets, fallback...', error.message);
      return dictionaryService.getDefaultData('budgets');
    }
  },

  createBudget: async (data) => {
    const response = await axiosClient.post('/admin/dictionary/budgets', data);
    return response.data;
  },

  updateBudget: async (id, data) => {
    const response = await axiosClient.put(`/admin/dictionary/budgets/${id}`, data);
    return response.data;
  },

  deleteBudget: async (id) => {
    const response = await axiosClient.delete(`/admin/dictionary/budgets/${id}`);
    return response.data;
  },

  // ===== UTILITAIRES AMÉLIORÉS =====
  
  // Charger toutes les données en une fois avec gestion d'erreur améliorée
  loadAllData: async () => {
    try {
      console.log('🔄 Chargement de toutes les données du dictionnaire...');
      
      const categories = [
        'situations',
        'natureDones', 
        'typeAssistances',
        'detailsTypeAssistances',
        'etatDones',
        'securityQuestions',
        'typeBudgets',
        'budgets'
      ];

      const results = await Promise.allSettled(
        categories.map(category => dictionaryService.safeLoad(category))
      );

      const data = {};
      const errors = [];
      const warnings = [];

      results.forEach((result, index) => {
        const category = categories[index];
        if (result.status === 'fulfilled') {
          data[category] = result.value || [];
          // Vérifier si on utilise des données par défaut
          if (result.value && result.value.length > 0 && result.value[0].id) {
            console.log(`✅ ${category}: ${result.value.length} éléments chargés`);
          } else {
            warnings.push(`${category}: Utilisation de données par défaut`);
          }
        } else {
          data[category] = dictionaryService.getDefaultData(category);
          errors.push(`${category}: ${result.reason?.message || 'Erreur inconnue'}`);
        }
      });

      const stats = {
        situations: data.situations.length,
        natureDones: data.natureDones.length,
        typeAssistances: data.typeAssistances.length,
        detailsTypeAssistances: data.detailsTypeAssistances.length,
        etatDones: data.etatDones.length,
        securityQuestions: data.securityQuestions.length,
        typeBudgets: data.typeBudgets.length,
        budgets: data.budgets.length,
        errors: errors.length,
        warnings: warnings.length
      };

      console.log('📊 Résumé du chargement:', stats);
      
      if (errors.length > 0) {
        console.warn('⚠️ Erreurs détectées:', errors);
      }
      
      if (warnings.length > 0) {
        console.warn('⚠️ Avertissements:', warnings);
      }

      return {
        success: true,
        data,
        stats,
        errors,
        warnings
      };

    } catch (error) {
      console.error('❌ Erreur lors du chargement complet:', error);
      
      // En cas d'erreur totale, retourner toutes les données par défaut
      const categories = ['situations', 'natureDones', 'typeAssistances', 'detailsTypeAssistances', 'etatDones', 'securityQuestions', 'typeBudgets', 'budgets'];
      const fallbackData = {};
      
      categories.forEach(category => {
        fallbackData[category] = dictionaryService.getDefaultData(category);
      });

      return {
        success: false,
        data: fallbackData,
        error: error.message,
        fallback: true
      };
    }
  },

  // Validation des données améliorée
  validateData: (category, data) => {
    const errors = {};
    
    switch (category) {
      case 'securityQuestions':
        if (!data.question?.trim()) {
          errors.question = 'La question est requise';
        } else if (data.question.length < 10) {
          errors.question = 'La question doit contenir au moins 10 caractères';
        } else if (data.question.length > 500) {
          errors.question = 'La question ne peut pas dépasser 500 caractères';
        }
        break;
        
      case 'budgets':
        if (!data.libelle?.trim()) {
          errors.libelle = 'Le libellé est requis';
        }
        if (!data.annee_exercice) {
          errors.annee_exercice = 'L\'année d\'exercice est requise';
        } else if (data.annee_exercice < 2000 || data.annee_exercice > 2100) {
          errors.annee_exercice = 'Année invalide (2000-2100)';
        }
        if (!data.type_budget_id) {
          errors.type_budget_id = 'Le type de budget est requis';
        }
        if (data.montant && data.montant < 0) {
          errors.montant = 'Le montant ne peut pas être négatif';
        }
        break;
        
      case 'natureDones':
        if (!data.libelle?.trim()) {
          errors.libelle = 'Le libellé est requis';
        }
        if (data.duree && data.duree < 0) {
          errors.duree = 'La durée ne peut pas être négative';
        }
        break;
        
      case 'detailsTypeAssistances':
        if (!data.libelle?.trim()) {
          errors.libelle = 'Le libellé est requis';
        }
        if (!data.type_assistance_id) {
          errors.type_assistance_id = 'Le type d\'assistance est requis';
        }
        if (data.montant && data.montant < 0) {
          errors.montant = 'Le montant ne peut pas être négatif';
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
  },

  // Recherche dans les données
  searchData: (data, searchTerm, category) => {
    if (!searchTerm) return data;
    
    const term = searchTerm.toLowerCase();
    
    return data.filter(item => {
      if (category === 'securityQuestions') {
        return item.question?.toLowerCase().includes(term);
      }
      
      if (category === 'detailsTypeAssistances') {
        return item.libelle?.toLowerCase().includes(term) ||
               item.description?.toLowerCase().includes(term) ||
               (item.montant && item.montant.toString().includes(searchTerm)) ||
               (item.typeAssistance && item.typeAssistance.libelle?.toLowerCase().includes(term));
      }
      
      return item.libelle?.toLowerCase().includes(term) ||
             (item.montant && item.montant.toString().includes(searchTerm)) ||
             (item.annee_exercice && item.annee_exercice.toString().includes(searchTerm)) ||
             (item.description && item.description.toLowerCase().includes(term));
    });
  },

  // Statistiques détaillées
  getStats: (data) => {
    return {
      total: Object.values(data).reduce((sum, items) => sum + items.length, 0),
      byCategory: Object.entries(data).map(([key, items]) => ({
        category: key,
        count: items.length,
        hasData: items.length > 0
      })),
      missingTables: Object.entries(data)
        .filter(([key, items]) => items.length === 0)
        .map(([key]) => key),
      healthScore: Object.values(data).filter(items => items.length > 0).length / Object.keys(data).length * 100
    };
  },

  // Test de connectivité pour chaque endpoint
  testAllEndpoints: async () => {
    const endpoints = [
      { name: 'Situations', url: '/admin/dictionary/situations' },
      { name: 'Nature Dons', url: '/admin/dictionary/nature-dones' },
      { name: 'Type Assistances', url: '/admin/dictionary/type-assistances' },
      { name: 'Details Type Assistances', url: '/admin/dictionary/details-type-assistances' },
      { name: 'Etat Dons', url: '/admin/dictionary/etat-dones' },
      { name: 'Security Questions', url: '/admin/dictionary/security-questions' },
      { name: 'Type Budgets', url: '/admin/dictionary/type-budgets' },
      { name: 'Budgets', url: '/admin/dictionary/budgets' }
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        try {
          const response = await axiosClient.get(endpoint.url);
          return {
            name: endpoint.name,
            url: endpoint.url,
            status: 'success',
            statusCode: response.status,
            dataCount: (response.data.data || response.data || []).length
          };
        } catch (error) {
          return {
            name: endpoint.name,
            url: endpoint.url,
            status: 'error',
            statusCode: error.response?.status || 0,
            error: error.message
          };
        }
      })
    );

    return results.map((result, index) => ({
      ...endpoints[index],
      ...result.value
    }));
  }
};

// Export par défaut pour compatibilité
export default dictionaryService;

// Export nommé pour les autres modules
export { dictionaryService as service };

// Types pour TypeScript (optionnel)
export const DICTIONARY_CATEGORIES = {
  SITUATIONS: 'situations',
  NATURE_DONES: 'natureDones',
  TYPE_ASSISTANCES: 'typeAssistances',
  DETAILS_TYPE_ASSISTANCES: 'detailsTypeAssistances',
  ETAT_DONES: 'etatDones',
  SECURITY_QUESTIONS: 'securityQuestions',
  TYPE_BUDGETS: 'typeBudgets',
  BUDGETS: 'budgets'
};

// Utilitaires pour les formulaires
export const getFormConfig = (category) => {
  const configs = {
    situations: {
      fields: ['libelle'],
      required: ['libelle'],
      title: 'Situation'
    },
    natureDones: {
      fields: ['libelle', 'duree'],
      required: ['libelle'],
      title: 'Nature de Don'
    },
    typeAssistances: {
      fields: ['libelle', 'description', 'prix_unitaire'],
      required: ['libelle'],
      title: 'Type d\'Assistance'
    },
    detailsTypeAssistances: {
      fields: ['type_assistance_id', 'libelle', 'description', 'montant'],
      required: ['type_assistance_id', 'libelle'],
      title: 'Détail Type d\'Assistance'
    },
    etatDones: {
      fields: ['libelle'],
      required: ['libelle'],
      title: 'État de Don'
    },
    securityQuestions: {
      fields: ['question', 'active'],
      required: ['question'],
      title: 'Question de Sécurité'
    },
    typeBudgets: {
      fields: ['libelle'],
      required: ['libelle'],
      title: 'Type de Budget'
    },
    budgets: {
      fields: ['libelle', 'montant', 'annee_exercice', 'type_budget_id'],
      required: ['libelle', 'annee_exercice', 'type_budget_id'],
      title: 'Budget'
    }
  };
  
  return configs[category] || { fields: ['libelle'], required: ['libelle'], title: 'Élément' };
};