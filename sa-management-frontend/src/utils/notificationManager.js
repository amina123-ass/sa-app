
// src/utils/notificationManager.js - Gestionnaire centralisé

class NotificationManager {
  constructor() {
    this.activeHooks = new Set();
    this.isPolling = false;
    this.pollInterval = null;
  }
  
  // Enregistrer un hook
  registerHook(hookId) {
    this.activeHooks.add(hookId);
    console.log(`📝 Hook notifications enregistré: ${hookId}`);
    
    // Démarrer le polling global s'il n'est pas actif
    if (!this.isPolling && this.activeHooks.size === 1) {
      this.startGlobalPolling();
    }
  }
  
  // Désenregistrer un hook
  unregisterHook(hookId) {
    this.activeHooks.delete(hookId);
    console.log(`🗑️ Hook notifications désenregistré: ${hookId}`);
    
    // Arrêter le polling si plus de hooks actifs
    if (this.activeHooks.size === 0) {
      this.stopGlobalPolling();
    }
  }
  
  // Démarrer le polling global
  startGlobalPolling() {
    if (this.isPolling) return;
    
    console.log('🔄 Démarrage polling global notifications');
    this.isPolling = true;
    
    // Pas de polling automatique - seulement sur demande
    // this.pollInterval = setInterval(() => {
    //   this.fetchNotifications();
    // }, 30000);
  }
  
  // Arrêter le polling global
  stopGlobalPolling() {
    console.log('⏹️ Arrêt polling global notifications');
    this.isPolling = false;
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
  
  // Nettoyer tous les hooks
  cleanup() {
    this.activeHooks.clear();
    this.stopGlobalPolling();
    console.log('🧹 Gestionnaire notifications nettoyé');
  }
}

export const notificationManager = new NotificationManager();

// Nettoyage au déchargement de la page
window.addEventListener('beforeunload', () => {
  notificationManager.cleanup();
});