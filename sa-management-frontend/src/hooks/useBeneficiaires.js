// src/hooks/useBeneficiaires.js
import { useState, useEffect, useCallback } from 'react';
import { receptionService } from '../services/receptionService';

export const useBeneficiaires = (campagneId = null, options = {}) => {
  const {
    autoLoad = true,
    onError = (error) => console.error('Erreur bénéficiaires:', error),
    onSuccess = () => {},
    initialFilters = {}
  } = options;

  // États
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0
  });

  // Charger les bénéficiaires
  const loadBeneficiaires = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = { ...filters, ...customFilters };
      
      let response;
      if (campagneId) {
        response = await receptionService.getBeneficiairesByCampagne(campagneId);
        setBeneficiaires(response.beneficiaires || []);
        setPagination({
          current_page: 1,
          last_page: 1,
          per_page: response.beneficiaires?.length || 0,
          total: response.total_beneficiaires || 0
        });
      } else {
        response = await receptionService.getAllBeneficiaires(params);
        setBeneficiaires(response.data || []);
        setPagination({
          current_page: response.current_page || 1,
          last_page: response.last_page || 1,
          per_page: response.per_page || 20,
          total: response.total || 0
        });
      }

      onSuccess(response);
    } catch (err) {
      setError(err.message);
      setBeneficiaires([]);
      onError(err);
    } finally {
      setLoading(false);
    }
  }, [campagneId, filters, onError, onSuccess]);

  // Ajouter un bénéficiaire
  const addBeneficiaire = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (campagneId) {
        response = await receptionService.addBeneficiaireToCampagne(campagneId, data);
      } else {
        throw new Error('Impossible d\'ajouter un bénéficiaire sans campagne');
      }

      // Recharger la liste
      await loadBeneficiaires();
      
      return response;
    } catch (err) {
      setError(err.message);
      onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campagneId, loadBeneficiaires, onError]);

  // Modifier un bénéficiaire
  const updateBeneficiaire = useCallback(async (beneficiaireId, data) => {
    try {
      setLoading(true);
      setError(null);

      const response = await receptionService.updateBeneficiaire(beneficiaireId, data);

      // Mettre à jour localement
      setBeneficiaires(prev => 
        prev.map(b => 
          b.id === beneficiaireId 
            ? { ...b, ...response.beneficiaire }
            : b
        )
      );

      return response;
    } catch (err) {
      setError(err.message);
      onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Supprimer un bénéficiaire
  const deleteBeneficiaire = useCallback(async (beneficiaireId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await receptionService.deleteBeneficiaire(beneficiaireId);

      // Retirer de la liste locale
      setBeneficiaires(prev => prev.filter(b => b.id !== beneficiaireId));

      return response;
    } catch (err) {
      setError(err.message);
      onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Rechercher des bénéficiaires
  const searchBeneficiaires = useCallback(async (searchTerm) => {
    return await loadBeneficiaires({ search: searchTerm });
  }, [loadBeneficiaires]);

  // Appliquer des filtres
  const applyFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Réinitialiser les filtres
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Rafraîchir
  const refresh = useCallback(() => {
    return loadBeneficiaires();
  }, [loadBeneficiaires]);

  // Obtenir un bénéficiaire par ID
  const getBeneficiaire = useCallback((beneficiaireId) => {
    return beneficiaires.find(b => b.id === beneficiaireId);
  }, [beneficiaires]);

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadBeneficiaires();
    }
  }, [autoLoad, loadBeneficiaires]);

  // Recharger quand les filtres changent
  useEffect(() => {
    if (autoLoad) {
      loadBeneficiaires();
    }
  }, [filters, autoLoad, loadBeneficiaires]);

  return {
    // États
    beneficiaires,
    loading,
    error,
    pagination,
    filters,

    // Actions
    loadBeneficiaires,
    addBeneficiaire,
    updateBeneficiaire,
    deleteBeneficiaire,
    searchBeneficiaires,
    applyFilters,
    clearFilters,
    refresh,
    getBeneficiaire,

    // Utilitaires
    isEmpty: beneficiaires.length === 0,
    hasError: !!error,
    isLoading: loading,
    totalCount: pagination.total
  };
};

// Hook pour un bénéficiaire spécifique
export const useBeneficiaire = (beneficiaireId, options = {}) => {
  const {
    autoLoad = true,
    onError = (error) => console.error('Erreur bénéficiaire:', error),
    onSuccess = () => {}
  } = options;

  const [beneficiaire, setBeneficiaire] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadBeneficiaire = useCallback(async () => {
    if (!beneficiaireId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await receptionService.getBeneficiaire(beneficiaireId);
      setBeneficiaire(response.beneficiaire);
      onSuccess(response);
    } catch (err) {
      setError(err.message);
      setBeneficiaire(null);
      onError(err);
    } finally {
      setLoading(false);
    }
  }, [beneficiaireId, onError, onSuccess]);

  const updateBeneficiaire = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);

      const response = await receptionService.updateBeneficiaire(beneficiaireId, data);
      setBeneficiaire(response.beneficiaire);
      
      return response;
    } catch (err) {
      setError(err.message);
      onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [beneficiaireId, onError]);

  useEffect(() => {
    if (autoLoad && beneficiaireId) {
      loadBeneficiaire();
    }
  }, [autoLoad, beneficiaireId, loadBeneficiaire]);

  return {
    beneficiaire,
    loading,
    error,
    loadBeneficiaire,
    updateBeneficiaire,
    refresh: loadBeneficiaire,
    isLoading: loading,
    hasError: !!error,
    notFound: !loading && !beneficiaire && !error
  };
};

export default useBeneficiaires;