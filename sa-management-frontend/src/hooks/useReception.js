// src/hooks/useReception.js
import { useState, useCallback } from 'react';
import { receptionService } from '../services/receptionService';
import { useNotificationContext } from '../contexts/NotificationContext';

export const useReception = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showNotification } = useNotificationContext();

  const executeWithLoading = useCallback(async (operation, successMessage = null, showErrorNotification = true) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      
      if (successMessage) {
        showNotification(successMessage, 'success');
      }
      
      return result;
    } catch (error) {
      console.error('Erreur dans useReception:', error);
      setError(error);
      
      if (showErrorNotification) {
        const errorMessage = error.message || 'Une erreur est survenue';
        showNotification(errorMessage, 'error');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Méthodes spécialisées
  const getDashboard = useCallback(() => {
    return executeWithLoading(() => receptionService.getDashboard());
  }, [executeWithLoading]);

  const getCampagnes = useCallback(() => {
    return executeWithLoading(() => receptionService.getCampagnes());
  }, [executeWithLoading]);

  const getParticipants = useCallback((campagneId) => {
    return executeWithLoading(() => receptionService.getParticipantsByCampagne(campagneId));
  }, [executeWithLoading]);

  const addParticipant = useCallback((campagneId, data) => {
    return executeWithLoading(
      () => receptionService.addParticipant(campagneId, data),
      'Participant ajouté avec succès'
    );
  }, [executeWithLoading]);

  const updateParticipant = useCallback((id, data) => {
    return executeWithLoading(
      () => receptionService.updateParticipant(id, data),
      'Participant modifié avec succès'
    );
  }, [executeWithLoading]);

  const deleteParticipant = useCallback((id) => {
    return executeWithLoading(
      () => receptionService.deleteParticipant(id),
      'Participant supprimé avec succès'
    );
  }, [executeWithLoading]);

  const getDemandesRecentes = useCallback((params = {}) => {
    return executeWithLoading(() => receptionService.getDemandesRecentes(params));
  }, [executeWithLoading]);

  const rechercheAvancee = useCallback((filters) => {
    return executeWithLoading(() => receptionService.rechercheAvancee(filters));
  }, [executeWithLoading]);

  const getFormData = useCallback(() => {
    return executeWithLoading(() => receptionService.getFormData());
  }, [executeWithLoading]);

  const exportParticipants = useCallback((campagneId = null) => {
    return executeWithLoading(
      () => receptionService.exportParticipants(campagneId),
      'Export généré avec succès'
    );
  }, [executeWithLoading]);

  return {
    loading,
    error,
    executeWithLoading,
    
    // Méthodes spécialisées
    getDashboard,
    getCampagnes,
    getParticipants,
    addParticipant,
    updateParticipant,
    deleteParticipant,
    getDemandesRecentes,
    rechercheAvancee,
    getFormData,
    exportParticipants,
  };
};