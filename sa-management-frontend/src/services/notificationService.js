/* eslint-disable react-hooks/rules-of-hooks */
// src/services/notificationService.js - VERSION CORRIGÉE
import { useEffect, useRef } from 'react';

// Service global de notifications - SIMPLIFIÉ
export const notificationService = {
  // Fonction pour afficher des notifications toast/snackbar
  showNotification: (message, type = 'info', duration = 5000) => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Si window.showGlobalNotification existe (défini dans le contexte), l'utiliser
    if (typeof window !== 'undefined' && window.showGlobalNotification) {
      window.showGlobalNotification(message, type, duration);
    }
    
    // Fallback: notification navigateur si disponible
    if (typeof window !== 'undefined' && Notification && Notification.permission === 'granted') {
      new Notification('SA Management', {
        body: message,
        icon: '/favicon.ico'
      });
    }
  },

  // Fonctions spécialisées
  showError: (message, duration = 7000) => {
    notificationService.showNotification(message, 'error', duration);
  },

  showSuccess: (message, duration = 4000) => {
    notificationService.showNotification(message, 'success', duration);
  },

  showWarning: (message, duration = 5000) => {
    notificationService.showNotification(message, 'warning', duration);
  },

  showInfo: (message, duration = 4000) => {
    notificationService.showNotification(message, 'info', duration);
  }
};

// Hook pour utiliser les notifications admin - VERSION SIMPLIFIÉE
export const useAdminNotificationService = (apiUrl) => {
  // Vérifier si le contexte NotificationContext est disponible
  let contextData = null;
  
  try {
    // Tentative d'import dynamique du contexte
    const { useNotification } = require('../contexts/NotificationContext');
    contextData = useNotification();
  } catch (error) {
    console.warn('NotificationContext non disponible, utilisation du mode fallback');
    contextData = {
      isConnected: false,
      notifications: [],
      error: null
    };
  }

  const { isConnected = false, notifications = [] } = contextData;
  const prevNotificationCount = useRef(0);

  useEffect(() => {
    // Surveiller les nouvelles notifications et afficher des toasts
    if (notifications.length > prevNotificationCount.current && prevNotificationCount.current > 0) {
      const newNotifications = notifications.slice(0, notifications.length - prevNotificationCount.current);
      
      newNotifications.forEach(notification => {
        let type = 'info';
        let duration = 5000;

        // Déterminer le type de notification toast basé sur le type
        switch (notification.type) {
          case 'user_registered':
            type = 'info';
            duration = 6000;
            break;
          case 'user_activated':
            type = 'success';
            duration = 4000;
            break;
          case 'role_assigned':
            type = 'warning';
            duration = 5000;
            break;
          case 'user_deactivated':
            type = 'error';
            duration = 5000;
            break;
          case 'password_reset':
            type = 'info';
            duration = 4000;
            break;
          default:
            type = 'info';
        }

        // Afficher la notification toast
        notificationService.showNotification(
          `${notification.title}: ${notification.message}`,
          type,
          duration
        );
      });
    }

    prevNotificationCount.current = notifications.length;
  }, [notifications]);

  useEffect(() => {
    // Afficher l'état de connexion
    if (isConnected) {
      notificationService.showSuccess('Notifications en temps réel activées', 3000);
    }
  }, [isConnected]);

  return {
    isConnected,
    showNotification: notificationService.showNotification,
    showError: notificationService.showError,
    showSuccess: notificationService.showSuccess,
    showWarning: notificationService.showWarning,
    showInfo: notificationService.showInfo
  };
};

// Export global pour faciliter l'utilisation
if (typeof window !== 'undefined') {
  window.showNotification = notificationService.showNotification;
  window.showError = notificationService.showError;
  window.showSuccess = notificationService.showSuccess;
  window.showWarning = notificationService.showWarning;
  window.showInfo = notificationService.showInfo;
}

// Exports individuels
export const showNotification = notificationService.showNotification;
export const showError = notificationService.showError;
export const showSuccess = notificationService.showSuccess;
export const showWarning = notificationService.showWarning;
export const showInfo = notificationService.showInfo;

export default notificationService;