/**
 * Utilitaires pour la gestion du dictionnaire
 * Fonctions helper pour optimiser les performances et éviter les timeouts
 */

// Configuration par défaut
export const DEFAULT_CONFIG = {
  timeout: 15000, // 15 secondes
  maxRetries: 3,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  batchSize: 50, // Taille des lots pour les opérations en masse
  debounceDelay: 300 // Délai pour la recherche
};

/**
 * Gestionnaire d'erreurs spécialisé pour le dictionnaire
 */
export class DictionaryErrorHandler {
  static formatError(error) {
    if (!error) return 'Erreur inconnue';

    // Erreurs réseau
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return 'Problème de connexion réseau. Vérifiez votre connexion internet.';
    }

    // Timeout
    if (error.message === 'Timeout' || error.code === 'ECONNABORTED') {
      return 'La requête a pris trop de temps. Le serveur semble surchargé.';
    }

    // Erreurs 5xx
    if (error.response?.status >= 500) {
      return 'Erreur serveur. Veuillez réessayer dans quelques instants.';
    }

    // Erreurs 4xx
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return error.response?.data?.message || 'Erreur de requête.';
    }

    // Erreurs de validation Laravel
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      if (typeof errors === 'object') {
        const firstError = Object.values(errors)[0];
        return Array.isArray(firstError) ? firstError[0] : firstError;
      }
    }

    return error.message || 'Une erreur est survenue';
  }

  static shouldRetry(error, attempt, maxRetries) {
    if (attempt >= maxRetries) return false;
    
    // Ne pas retry sur les erreurs 4xx (sauf 408, 429)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return [408, 429].includes(error.response.status);
    }

    // Retry sur les erreurs réseau et timeout
    return error.code === 'NETWORK_ERROR' || 
           error.message === 'Timeout' ||
           error.response?.status >= 500;
  }
}

/**
 * Gestionnaire de cache optimisé
 */
export class DictionaryCache {
  constructor(ttl = DEFAULT_CONFIG.cacheTimeout) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Vérifier l'expiration
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    item.hits++;
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    const stats = {
      size: this.cache.size,
      totalHits: 0,
      items: []
    };

    this.cache.forEach((item, key) => {
      stats.totalHits += item.hits;
      stats.items.push({
        key,
        hits: item.hits,
        age: Date.now() - item.timestamp,
        expired: Date.now() - item.timestamp > this.ttl
      });
    });

    return stats;
  }

  // Nettoyage automatique des éléments expirés
  cleanup() {
    const now = Date.now();
    const toDelete = [];

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > this.ttl) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.cache.delete(key));
    return toDelete.length;
  }
}

/**
 * Gestionnaire de requêtes avec retry et circuit breaker
 */
export class DictionaryRequestManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || DEFAULT_CONFIG.maxRetries;
    this.timeout = options.timeout || DEFAULT_CONFIG.timeout;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
    
    // État du circuit breaker
    this.failures = 0;
    this.lastFailureTime = 0;
    this.circuitOpen = false;
    this.circuitOpenDuration = 30000; // 30 secondes
  }

  async execute(requestFunction, retryCount = 0) {
    // Vérifier le circuit breaker
    if (this.isCircuitOpen()) {
      throw new Error('Service temporairement indisponible (circuit breaker ouvert)');
    }

    try {
      const result = await Promise.race([
        requestFunction(),
        this.createTimeoutPromise()
      ]);

      // Réinitialiser les échecs en cas de succès
      this.failures = 0;
      this.circuitOpen = false;

      return result;
    } catch (error) {
      this.recordFailure();

      // Vérifier si on doit retry
      if (DictionaryErrorHandler.shouldRetry(error, retryCount, this.maxRetries)) {
        const delay = this.calculateRetryDelay(retryCount);
        await this.sleep(delay);
        return this.execute(requestFunction, retryCount + 1);
      }

      throw error;
    }
  }

  createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), this.timeout);
    });
  }

  calculateRetryDelay(attempt) {
    // Backoff exponentiel avec jitter
    const baseDelay = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 10000); // Max 10 secondes
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.circuitBreakerThreshold) {
      this.circuitOpen = true;
    }
  }

  isCircuitOpen() {
    if (!this.circuitOpen) return false;

    // Vérifier si le circuit peut être réouvert
    if (Date.now() - this.lastFailureTime > this.circuitOpenDuration) {
      this.circuitOpen = false;
      this.failures = 0;
      return false;
    }

    return true;
  }

  getStats() {
    return {
      failures: this.failures,
      circuitOpen: this.circuitOpen,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Utilitaires de validation
 */
export const ValidationUtils = {
  // Validation du libellé
  validateLibelle: (value, minLength = 2, maxLength = 255) => {
    const errors = [];
    
    if (!value || value.trim().length === 0) {
      errors.push('Le libellé est requis');
    } else {
      const trimmed = value.trim();
      if (trimmed.length < minLength) {
        errors.push(`Le libellé doit contenir au moins ${minLength} caractères`);
      }
      if (trimmed.length > maxLength) {
        errors.push(`Le libellé ne peut pas dépasser ${maxLength} caractères`);
      }
    }
    
    return errors;
  },

  // Validation des nombres
  validateNumber: (value, min = null, max = null, required = false) => {
    const errors = [];
    
    if (required && (value === null || value === undefined || value === '')) {
      errors.push('Cette valeur est requise');
      return errors;
    }

    if (value !== null && value !== undefined && value !== '') {
      const num = parseFloat(value);
      
      if (isNaN(num)) {
        errors.push('Doit être un nombre valide');
      } else {
        if (min !== null && num < min) {
          errors.push(`Doit être supérieur ou égal à ${min}`);
        }
        if (max !== null && num > max) {
          errors.push(`Doit être inférieur ou égal à ${max}`);
        }
      }
    }
    
    return errors;
  },

  // Validation des années
  validateYear: (value, required = false) => {
    const currentYear = new Date().getFullYear();
    return ValidationUtils.validateNumber(value, 2000, currentYear + 10, required);
  },

  // Validation des questions de sécurité
  validateSecurityQuestion: (value) => {
    const errors = [];
    
    if (!value || value.trim().length === 0) {
      errors.push('La question est requise');
    } else {
      const trimmed = value.trim();
      if (trimmed.length < 10) {
        errors.push('La question doit contenir au moins 10 caractères');
      }
      if (trimmed.length > 500) {
        errors.push('La question ne peut pas dépasser 500 caractères');
      }
      if (!trimmed.includes('?')) {
        errors.push('La question doit se terminer par un point d\'interrogation');
      }
    }
    
    return errors;
  }
};

/**
 * Utilitaires de formatage
 */
export const FormatUtils = {
  // Formatage des montants
  formatAmount: (amount, currency = '€') => {
    if (amount === null || amount === undefined) return 'N/A';
    
    const num = parseFloat(amount);
    if (isNaN(num)) return 'N/A';
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === '€' ? 'EUR' : 'MAD'
    }).format(num);
  },

  // Formatage des dates
  formatDate: (date) => {
    if (!date) return 'N/A';
    
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(date));
    } catch {
      return 'Date invalide';
    }
  },

  // Formatage des statuts
  formatStatus: (status) => {
    const statusMap = {
      'true': 'Actif',
      'false': 'Inactif',
      '1': 'Actif',
      '0': 'Inactif',
      'active': 'Actif',
      'inactive': 'Inactif'
    };
    
    return statusMap[status?.toString()] || status || 'N/A';
  }
};

/**
 * Debounce pour optimiser les recherches
 */
export const debounce = (func, delay = DEFAULT_CONFIG.debounceDelay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * Throttle pour limiter les requêtes
 */
export const throttle = (func, limit = 1000) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Gestionnaire de notifications
 */
export class NotificationManager {
  static notifications = [];
  static listeners = [];

  static addNotification(type, message, duration = 5000) {
    const id = Date.now().toString();
    const notification = {
      id,
      type, // success, error, warning, info
      message,
      timestamp: new Date(),
      duration
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto-suppression
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, duration);
    }

    return id;
  }

  static removeNotification(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  static clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  static subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  static notifyListeners() {
    this.listeners.forEach(callback => callback(this.notifications));
  }

  // Méthodes utilitaires
  static success(message) {
    return this.addNotification('success', message);
  }

  static error(message) {
    return this.addNotification('error', message, 8000);
  }

  static warning(message) {
    return this.addNotification('warning', message);
  }

  static info(message) {
    return this.addNotification('info', message);
  }
}

/**
 * Utilitaires d'export/import
 */
export const ExportUtils = {
  // Export CSV
  exportToCSV: (data, filename = 'export.csv') => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  // Export JSON
  exportToJSON: (data, filename = 'export.json') => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }
};

/**
 * Fonction utilitaire pour nettoyer les données avant envoi
 */
export const sanitizeData = (data) => {
  const cleaned = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      // Nettoyer les chaînes
      if (typeof value === 'string') {
        cleaned[key] = value.trim();
      }
      // Convertir les nombres
      else if (typeof value === 'number' || (typeof value === 'string' && !isNaN(value) && value !== '')) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          cleaned[key] = num;
        }
      }
      // Conserver les autres types
      else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
};

// Instances par défaut
export const defaultCache = new DictionaryCache();
export const defaultRequestManager = new DictionaryRequestManager();