// ===================================================
// SERVICE BÉNÉFICIAIRES COMPLET - VERSION CORRIGÉE
// ===================================================

import axiosClient from './axiosClient';

class BeneficiereService {
  constructor() {
    this.baseURL = '/upas';
    this.apiVersion = 'v1';
  }

  /**
   * ✅ VALIDATION D'IMPORT CORRIGÉE (SANS SAUVEGARDE)
   * Cette méthode valide UNIQUEMENT le fichier sans enregistrer en base
   */
  async validateImportFile(formData) {
    try {
      console.log('🔄 === VALIDATION SEULEMENT (AUCUNE SAUVEGARDE) ===', {
        hasFile: formData.has('file'),
        hasCampagneId: formData.has('campagne_id'),
        campagneId: formData.get('campagne_id'),
        timestamp: new Date().toISOString()
      });

      // Vérifications préalables
      if (!formData.has('file')) {
        throw new Error('Aucun fichier fourni');
      }

      if (!formData.has('campagne_id')) {
        throw new Error('ID campagne manquant');
      }

      const file = formData.get('file');
      console.log('📁 Fichier à valider (MODE VALIDATION UNIQUEMENT):', {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2)
      });

      // ✅ APPEL DE VALIDATION SEULEMENT (ENDPOINT /validate)
      const response = await axiosClient.post(`${this.baseURL}/beneficiaires/import/validate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 1 minute
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log('✅ Validation terminée (AUCUNE DONNÉE SAUVEGARDÉE):', {
        success: response.data.success,
        totalRows: response.data.data?.total_rows,
        validRows: response.data.data?.valid_rows,
        invalidRows: response.data.data?.invalid_rows,
        canImport: response.data.data?.can_import
      });

      return response;

    } catch (error) {
      console.error('❌ Erreur validation fichier:', error);
      
      // Enrichir l'erreur avec plus d'informations
      if (error.response) {
        const enhancedError = new Error(error.response.data?.message || 'Erreur serveur');
        enhancedError.response = error.response;
        enhancedError.status = error.response.status;
        enhancedError.data = error.response.data;
        throw enhancedError;
      } else if (error.request) {
        const networkError = new Error('Problème de connexion réseau');
        networkError.code = 'NETWORK_ERROR';
        networkError.request = error.request;
        throw networkError;
      } else {
        throw error;
      }
    }
  }

  /**
   * ✅ IMPORT RÉEL CORRIGÉ (AVEC SAUVEGARDE EN BASE)
   * Cette méthode SAUVEGARDE réellement les données en base
   */
  async importBeneficiaires(formData, onProgress = null) {
    try {
      console.log('🚀 === IMPORT RÉEL AVEC SAUVEGARDE EN BASE ===', {
        hasFile: formData.has('file'),
        campagneId: formData.get('campagne_id'),
        ignoreDoublons: formData.get('ignore_doublons'),
        forceImport: formData.get('force_import'),
        timestamp: new Date().toISOString()
      });

      // Vérifications préalables
      if (!formData.has('file')) {
        throw new Error('Aucun fichier fourni pour l\'import');
      }

      if (!formData.has('campagne_id')) {
        throw new Error('ID campagne manquant pour l\'import');
      }

      const file = formData.get('file');
      console.log('📁 Fichier à importer (MODE SAUVEGARDE RÉELLE):', {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2)
      });

      // ✅ APPEL D'IMPORT RÉEL (ENDPOINT /import)
      const response = await axiosClient.post(`${this.baseURL}/beneficiaires/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📊 Progression upload: ${percentCompleted}%`);
            onProgress(percentCompleted);
          }
        },
      });

      console.log('✅ === IMPORT RÉEL TERMINÉ (DONNÉES SAUVEGARDÉES) ===', {
        success: response.data.success,
        importedCount: response.data.data?.imported_count,
        errorCount: response.data.data?.error_count,
        totalProcessed: response.data.data?.total_processed,
        message: response.data.message
      });

      return response;

    } catch (error) {
      console.error('❌ Erreur import réel:', error);
      
      // Enrichir l'erreur pour l'interface
      if (error.response) {
        const enhancedError = new Error(error.response.data?.message || 'Erreur durant l\'import');
        enhancedError.response = error.response;
        enhancedError.status = error.response.status;
        enhancedError.data = error.response.data;
        throw enhancedError;
      }
      
      throw error;
    }
  }

  /**
   * ✅ VALIDATION AVEC RETRY AUTOMATIQUE
   */
  async validateImportFileWithRetry(formData, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentative de validation ${attempt}/${maxRetries}`);
        return await this.validateImportFile(formData);
      } catch (error) {
        lastError = error;
        
        console.warn(`⚠️ Tentative ${attempt} échouée:`, error.message);
        
        // Ne pas retry sur les erreurs 4xx (erreurs client)
        if (error.status >= 400 && error.status < 500) {
          console.log('❌ Erreur client, pas de retry');
          break;
        }
        
        // Attendre avant de réessayer (backoff exponentiel)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
          console.log(`⏳ Attente ${delay}ms avant retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('❌ Toutes les tentatives de validation ont échoué');
    throw lastError;
  }

  /**
   * ✅ GESTION DES BÉNÉFICIAIRES
   */
  async getBeneficiaires(params = {}) {
    try {
      const queryParams = this.buildQueryParams(params);
      console.log('📋 Récupération bénéficiaires:', queryParams);
      
      return await axiosClient.get(`${this.baseURL}/beneficiaires`, { 
        params: queryParams 
      });
    } catch (error) {
      console.error('❌ Erreur récupération bénéficiaires:', error);
      throw this.enhanceError(error);
    }
  }

  async getBeneficiaire(id) {
    try {
      return await axiosClient.get(`${this.baseURL}/beneficiaires/${id}`);
    } catch (error) {
      console.error(`❌ Erreur récupération bénéficiaire ${id}:`, error);
      throw this.enhanceError(error);
    }
  }

  async createBeneficiaire(data) {
    try {
      console.log('➕ Création bénéficiaire:', data);
      return await axiosClient.post(`${this.baseURL}/beneficiaires`, data);
    } catch (error) {
      console.error('❌ Erreur création bénéficiaire:', error);
      throw this.enhanceError(error);
    }
  }

  async updateBeneficiaire(id, data) {
    try {
      console.log(`✏️ Modification bénéficiaire ${id}:`, data);
      return await axiosClient.put(`${this.baseURL}/beneficiaires/${id}`, data);
    } catch (error) {
      console.error(`❌ Erreur modification bénéficiaire ${id}:`, error);
      throw this.enhanceError(error);
    }
  }

  async deleteBeneficiaire(id) {
    try {
      console.log(`🗑️ Suppression bénéficiaire ${id}`);
      return await axiosClient.delete(`${this.baseURL}/beneficiaires/${id}`);
    } catch (error) {
      console.error(`❌ Erreur suppression bénéficiaire ${id}:`, error);
      throw this.enhanceError(error);
    }
  }

  async restoreBeneficiaire(id) {
    try {
      console.log(`♻️ Restauration bénéficiaire ${id}`);
      return await axiosClient.post(`${this.baseURL}/beneficiaires/${id}/restore`);
    } catch (error) {
      console.error(`❌ Erreur restauration bénéficiaire ${id}:`, error);
      throw this.enhanceError(error);
    }
  }

  /**
   * ✅ ACTIONS EN MASSE
   */
  async actionMasseBeneficiaires(data) {
    try {
      console.log('📊 Action masse bénéficiaires:', data);
      return await axiosClient.post(`${this.baseURL}/beneficiaires/batch-action`, data);
    } catch (error) {
      console.error('❌ Erreur action masse:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * ✅ GESTION DES CAMPAGNES
   */
  async getCampagnes(params = {}) {
    try {
      const queryParams = this.buildQueryParams(params);
      return await axiosClient.get(`${this.baseURL}/campagnes`, { params: queryParams });
    } catch (error) {
      console.error('❌ Erreur récupération campagnes:', error);
      throw this.enhanceError(error);
    }
  }

  async getCampagnesForSelect() {
    try {
      return await axiosClient.get(`${this.baseURL}/campagnes/for-select`);
    } catch (error) {
      console.error('❌ Erreur récupération campagnes select:', error);
      throw this.enhanceError(error);
    }
  }

  async getCampagne(id) {
    try {
      return await axiosClient.get(`${this.baseURL}/campagnes/${id}`);
    } catch (error) {
      console.error(`❌ Erreur récupération campagne ${id}:`, error);
      throw this.enhanceError(error);
    }
  }

  async storeCampagne(data) {
    try {
      console.log('➕ Création campagne:', data);
      return await axiosClient.post(`${this.baseURL}/campagnes`, data);
    } catch (error) {
      console.error('❌ Erreur création campagne:', error);
      throw this.enhanceError(error);
    }
  }

  async updateCampagne(id, data) {
    try {
      console.log(`✏️ Modification campagne ${id}:`, data);
      return await axiosClient.put(`${this.baseURL}/campagnes/${id}`, data);
    } catch (error) {
      console.error(`❌ Erreur modification campagne ${id}:`, error);
      throw this.enhanceError(error);
    }
  }

  async deleteCampagne(id) {
    try {
      console.log(`🗑️ Suppression campagne ${id}`);
      return await axiosClient.delete(`${this.baseURL}/campagnes/${id}`);
    } catch (error) {
      console.error(`❌ Erreur suppression campagne ${id}:`, error);
      throw this.enhanceError(error);
    }
  }

  /**
   * ✅ TYPES D'ASSISTANCE
   */
  async getTypesAssistance() {
    try {
      return await axiosClient.get(`${this.baseURL}/types-assistance`);
    } catch (error) {
      console.error('❌ Erreur récupération types assistance:', error);
      throw this.enhanceError(error);
    }
  }

  async getTypesAssistanceSimple() {
    try {
      return await axiosClient.get(`${this.baseURL}/types-assistance/simple`);
    } catch (error) {
      console.error('❌ Erreur récupération types assistance simple:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * ✅ STATISTIQUES
   */
  async getStatistiquesBeneficiaires(params = {}) {
    try {
      const queryParams = this.buildQueryParams(params);
      return await axiosClient.get(`${this.baseURL}/beneficiaires/statistiques`, { 
        params: queryParams 
      });
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      throw this.enhanceError(error);
    }
  }

  async getDashboard() {
    try {
      return await axiosClient.get(`${this.baseURL}/dashboard`);
    } catch (error) {
      console.error('❌ Erreur récupération dashboard:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * ✅ EXPORT/IMPORT
   */
  async exportBeneficiaires(params = {}) {
    try {
      const queryParams = this.buildQueryParams(params);
      console.log('📤 Export bénéficiaires:', queryParams);
      
      const response = await axiosClient.get(`${this.baseURL}/beneficiaires/export`, {
        params: queryParams,
        responseType: 'blob',
        timeout: 120000 // 2 minutes pour l'export
      });
      
      return this.downloadFile(response, 'beneficiaires_export.xlsx');
    } catch (error) {
      console.error('❌ Erreur export bénéficiaires:', error);
      throw this.enhanceError(error);
    }
  }

  async getImportTemplate(campagneId) {
    try {
      return await axiosClient.get(`${this.baseURL}/export/template/${campagneId}`);
    } catch (error) {
      console.error(`❌ Erreur récupération template ${campagneId}:`, error);
      throw this.enhanceError(error);
    }
  }

  /**
   * ✅ TESTS ET DIAGNOSTIQUES
   */
  async testConnection() {
    try {
      return await axiosClient.get(`${this.baseURL}/test-connection`);
    } catch (error) {
      console.error('❌ Erreur test connexion:', error);
      throw this.enhanceError(error);
    }
  }

  async getDiagnosticComplete() {
    try {
      return await axiosClient.get(`${this.baseURL}/diagnostic/complete`);
    } catch (error) {
      console.error('❌ Erreur diagnostic complet:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * ✅ MÉTHODES UTILITAIRES
   */
  buildQueryParams(params) {
    const filteredParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        filteredParams[key] = params[key];
      }
    });
    return filteredParams;
  }

  enhanceError(error) {
    if (error.response) {
      // Erreur du serveur avec réponse
      const enhancedError = new Error(
        error.response.data?.message || 
        `Erreur serveur (${error.response.status})`
      );
      enhancedError.response = error.response;
      enhancedError.status = error.response.status;
      enhancedError.data = error.response.data;
      enhancedError.originalError = error;
      return enhancedError;
    } else if (error.request) {
      // Erreur réseau
      const networkError = new Error('Problème de connexion réseau');
      networkError.code = 'NETWORK_ERROR';
      networkError.request = error.request;
      networkError.originalError = error;
      return networkError;
    } else {
      // Autre erreur
      return error;
    }
  }

  downloadFile(response, defaultFilename = 'download') {
    try {
      if (!response.data) {
        throw new Error('Aucune donnée à télécharger');
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extraire le nom du fichier de l'en-tête Content-Disposition
      let filename = defaultFilename;
      const contentDisposition = response.headers['content-disposition'];
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Ajouter une extension si manquante
      if (!filename.includes('.')) {
        const contentType = response.headers['content-type'];
        if (contentType?.includes('excel') || contentType?.includes('spreadsheet')) {
          filename += '.xlsx';
        } else if (contentType?.includes('csv')) {
          filename += '.csv';
        } else if (contentType?.includes('pdf')) {
          filename += '.pdf';
        }
      }
      
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log('✅ Fichier téléchargé:', filename);
      return filename;
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      throw new Error('Impossible de télécharger le fichier');
    }
  }

  /**
   * ✅ VALIDATION CLIENT AVANT ENVOI
   */
  validateFileBeforeUpload(file, campagneId) {
    const errors = [];
    const warnings = [];

    // Validation taille
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum: 10 MB`);
    }

    // Validation type
    const allowedExtensions = ['xlsx', 'xls', 'csv'];
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`Type de fichier non supporté: .${fileExtension}. Utilisez Excel (.xlsx, .xls) ou CSV (.csv)`);
    }

    // Validation nom
    if (file.name.length > 255) {
      errors.push('Nom de fichier trop long (maximum 255 caractères)');
    }

    // Validation campagne
    if (!campagneId || isNaN(parseInt(campagneId)) || parseInt(campagneId) <= 0) {
      errors.push('ID de campagne invalide');
    }

    // Avertissements
    if (file.size > 5 * 1024 * 1024) { // > 5MB
      warnings.push('Fichier volumineux, l\'import pourrait prendre du temps');
    }

    if (fileExtension === 'csv') {
      warnings.push('Format CSV détecté, assurez-vous de l\'encodage UTF-8');
    }

    if (file.name.includes(' ')) {
      warnings.push('Le nom de fichier contient des espaces');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * ✅ VÉRIFICATION DE CONNECTIVITÉ
   */
  async checkConnectivity() {
    try {
      await axiosClient.get('/test', { timeout: 5000 });
      return true;
    } catch (error) {
      console.warn('❌ Pas de connectivité:', error.message);
      return false;
    }
  }

  /**
   * ✅ RETRY AVEC BACKOFF EXPONENTIEL
   */
  async executeWithRetry(requestFn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Ne pas retry sur les erreurs 4xx (sauf 408, 429)
        if (error.status >= 400 && error.status < 500) {
          if (![408, 429].includes(error.status)) {
            throw error;
          }
        }
        
        // Attendre avant de réessayer
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retry ${attempt}/${maxRetries} dans ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * ✅ MÉTHODES SPÉCIFIQUES POUR DEBUG
   */
  async debugImportStatus(campagneId) {
    try {
      console.log('🔧 Debug statut import pour campagne:', campagneId);
      return await axiosClient.get(`${this.baseURL}/beneficiaires/diagnostic/${campagneId}`);
    } catch (error) {
      console.error('❌ Erreur debug import:', error);
      throw this.enhanceError(error);
    }
  }

  async getImportStats(campagneId) {
    try {
      console.log('📊 Récupération statistiques import pour campagne:', campagneId);
      return await axiosClient.get(`${this.baseURL}/beneficiaires/import-stats/${campagneId}`);
    } catch (error) {
      console.error('❌ Erreur stats import:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * ✅ NETTOYAGE DES DONNÉES IMPORT
   */
  async cleanImportData(campagneId, action, confirm = false) {
    try {
      console.log('🧹 Nettoyage données import:', { campagneId, action, confirm });
      return await axiosClient.post(`${this.baseURL}/beneficiaires/${campagneId}/clean`, {
        action,
        confirm
      });
    } catch (error) {
      console.error('❌ Erreur nettoyage import:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * ✅ HELPER POUR CRÉER UN FORMDATA COMPLET
   */
  createImportFormData(file, campagneId, options = {}) {
    const formData = new FormData();
    
    // Fichier obligatoire
    formData.append('file', file);
    
    // Campagne obligatoire
    formData.append('campagne_id', campagneId.toString());
    
    // Options par défaut
    const defaultOptions = {
      ignore_doublons: true,
      force_import: false
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    // Ajouter les options
    Object.keys(finalOptions).forEach(key => {
      formData.append(key, finalOptions[key].toString());
    });
    
    console.log('📋 FormData créé:', {
      fileName: file.name,
      fileSize: file.size,
      campagneId,
      options: finalOptions
    });
    
    return formData;
  }

  /**
   * ✅ WORKFLOW COMPLET D'IMPORT
   */
  async performCompleteImport(file, campagneId, options = {}, callbacks = {}) {
    try {
      const {
        onValidationStart = () => {},
        onValidationComplete = () => {},
        onImportStart = () => {},
        onImportProgress = () => {},
        onImportComplete = () => {},
        onError = () => {}
      } = callbacks;

      console.log('🚀 === DÉBUT WORKFLOW COMPLET D\'IMPORT ===');
      
      // ✅ ÉTAPE 1: VALIDATION CLIENT
      const clientValidation = this.validateFileBeforeUpload(file, campagneId);
      if (!clientValidation.isValid) {
        throw new Error('Validation client échouée: ' + clientValidation.errors.join(', '));
      }

      // ✅ ÉTAPE 2: CRÉATION FORMDATA
      const formData = this.createImportFormData(file, campagneId, options);

      // ✅ ÉTAPE 3: VALIDATION SERVEUR
      onValidationStart();
      console.log('🔍 Étape 1/2: Validation serveur...');
      
      const validationResponse = await this.validateImportFile(formData);
      onValidationComplete(validationResponse.data);
      
      if (!validationResponse.data.success) {
        throw new Error('Validation serveur échouée: ' + validationResponse.data.message);
      }

      // Vérifier si l'import peut continuer
      if (!validationResponse.data.data.can_import && !options.force_import) {
        const error = new Error('Import impossible sans force_import');
        error.validationData = validationResponse.data.data;
        throw error;
      }

      // ✅ ÉTAPE 4: IMPORT RÉEL
      onImportStart();
      console.log('💾 Étape 2/2: Import réel en base...');
      
      const importResponse = await this.importBeneficiaires(formData, onImportProgress);
      onImportComplete(importResponse.data);

      console.log('✅ === WORKFLOW COMPLET D\'IMPORT TERMINÉ ===');
      
      return {
        success: true,
        validation: validationResponse.data,
        import: importResponse.data,
        summary: {
          totalProcessed: importResponse.data.data.total_processed,
          imported: importResponse.data.data.imported_count,
          errors: importResponse.data.data.error_count,
          skipped: importResponse.data.data.skipped_count
        }
      };

    } catch (error) {
      console.error('❌ Erreur workflow import:', error);
      onError(error);
      throw error;
    }
  }
}

// ===================================================
// INSTANCE SINGLETON DU SERVICE
// ===================================================

const upasAPI = new BeneficiereService();

// ===================================================
// EXPORTS
// ===================================================

export { upasAPI };
export default upasAPI;