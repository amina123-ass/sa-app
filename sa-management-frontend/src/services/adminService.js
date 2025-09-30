// src/services/adminService.js - Service Admin avec route d'activation corrigée

import axios from '../config/axios';

class AdminService {
  constructor() {
    this.baseURL = '/admin';
  }

  // ===== DASHBOARD =====
  async getDashboard() {
    try {
      const response = await axios.get(`${this.baseURL}/dashboard`);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors du chargement du dashboard: ${error.message}`);
    }
  }

  // ===== GESTION DES UTILISATEURS =====
  async getUsers() {
    try {
      const response = await axios.get(`${this.baseURL}/users`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Erreur lors du chargement des utilisateurs: ${error.message}`);
    }
  }

  async createUser(userData) {
    try {
      const response = await axios.post(`${this.baseURL}/users`, userData);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la création de l'utilisateur: ${error.message}`);
    }
  }

  async updateUser(userId, userData) {
    try {
      const response = await axios.put(`${this.baseURL}/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour de l'utilisateur: ${error.message}`);
    }
  }

  async deleteUser(userId) {
    try {
      const response = await axios.delete(`${this.baseURL}/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
    }
  }

  async deactivateUser(userId) {
    try {
      const response = await axios.put(`${this.baseURL}/users/${userId}/deactivate`);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la désactivation de l'utilisateur: ${error.message}`);
    }
  }

  // ✅ FONCTION D'ACTIVATION CORRIGÉE - UTILISE LA ROUTE ADMIN
  async activateUser(userId, activationData) {
    try {
      console.log('🔄 AdminService: Activation utilisateur', { userId, activationData });

      // ✅ CORRECTION: Utiliser la route admin d'activation avec PUT
      const response = await axios.put(`${this.baseURL}/users/${userId}/activate`, activationData);

      console.log('✅ AdminService: Activation réussie', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ AdminService: Erreur activation', {
        userId,
        error: error.response?.data || error.message,
        status: error.response?.status,
        url: `${this.baseURL}/users/${userId}/activate`
      });

      // Gestion détaillée des erreurs
      if (error.response?.status === 422) {
        const validationErrors = error.response.data.errors || {};
        const firstError = Object.values(validationErrors)[0];
        const errorMessage = Array.isArray(firstError) ? firstError[0] : 'Données de validation invalides';
        throw new Error(errorMessage);
      } else if (error.response?.status === 404) {
        throw new Error('Utilisateur non trouvé');
      } else if (error.response?.status === 405) {
        throw new Error('Méthode non autorisée. Vérifiez la configuration des routes API.');
      } else if (error.response?.status === 500) {
        throw new Error('Erreur serveur lors de l\'activation. Vérifiez la configuration de l\'email.');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error(`Erreur lors de l'activation de l'utilisateur: ${error.message}`);
      }
    }
  }

  async resetUserPassword(userId) {
    try {
      const response = await axios.post(`${this.baseURL}/users/${userId}/reset-password`);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la réinitialisation du mot de passe: ${error.message}`);
    }
  }

  async assignRole(userId, roleData) {
    try {
      const response = await axios.put(`${this.baseURL}/users/${userId}/assign-role`, roleData);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de l'assignation du rôle: ${error.message}`);
    }
  }

  // ===== GESTION DES RÔLES =====
  async getRoles() {
    try {
      const response = await axios.get(`${this.baseURL}/roles`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Erreur lors du chargement des rôles: ${error.message}`);
    }
  }

  async createRole(roleData) {
    try {
      const response = await axios.post(`${this.baseURL}/roles`, roleData);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la création du rôle: ${error.message}`);
    }
  }

  async updateRole(roleId, roleData) {
    try {
      const response = await axios.put(`${this.baseURL}/roles/${roleId}`, roleData);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour du rôle: ${error.message}`);
    }
  }

  async deleteRole(roleId) {
    try {
      const response = await axios.delete(`${this.baseURL}/roles/${roleId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression du rôle: ${error.message}`);
    }
  }

  // ===== DICTIONNAIRE =====
  async getSecurityQuestions() {
    try {
      const response = await axios.get(`${this.baseURL}/dictionary/security-questions`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Erreur lors du chargement des questions de sécurité: ${error.message}`);
    }
  }

  async createSecurityQuestion(questionData) {
    try {
      const response = await axios.post(`${this.baseURL}/dictionary/security-questions`, questionData);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la création de la question de sécurité: ${error.message}`);
    }
  }

  async updateSecurityQuestion(questionId, questionData) {
    try {
      const response = await axios.put(`${this.baseURL}/dictionary/security-questions/${questionId}`, questionData);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour de la question de sécurité: ${error.message}`);
    }
  }

  async deleteSecurityQuestion(questionId) {
    try {
      const response = await axios.delete(`${this.baseURL}/dictionary/security-questions/${questionId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de la question de sécurité: ${error.message}`);
    }
  }

  // ===== AUTRES ÉLÉMENTS DU DICTIONNAIRE =====
  async getSituations() {
    try {
      const response = await axios.get(`${this.baseURL}/dictionary/situations`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Erreur lors du chargement des situations: ${error.message}`);
    }
  }

  async getNatureDones() {
    try {
      const response = await axios.get(`${this.baseURL}/dictionary/nature-dones`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Erreur lors du chargement des natures de dons: ${error.message}`);
    }
  }

  async getTypeAssistances() {
    try {
      const response = await axios.get(`${this.baseURL}/dictionary/type-assistances`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Erreur lors du chargement des types d'assistance: ${error.message}`);
    }
  }

  async getEtatDones() {
    try {
      const response = await axios.get(`${this.baseURL}/dictionary/etat-dones`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Erreur lors du chargement des états de dons: ${error.message}`);
    }
  }

  async getTypeBudgets() {
    try {
      const response = await axios.get(`${this.baseURL}/dictionary/type-budgets`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Erreur lors du chargement des types de budgets: ${error.message}`);
    }
  }

  async getBudgets() {
    try {
      const response = await axios.get(`${this.baseURL}/dictionary/budgets`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Erreur lors du chargement des budgets: ${error.message}`);
    }
  }

  // ===== MÉTHODES UTILITAIRES =====
  async testConnection() {
    try {
      const response = await axios.get('/test');
      return {
        success: true,
        message: 'Connexion à l\'API réussie',
        data: response.data
      };
    } catch (error) {
      throw new Error(`Erreur de connexion à l'API: ${error.message}`);
    }
  }

  // ===== STATISTIQUES =====
  async getStatistics() {
    try {
      const dashboard = await this.getDashboard();
      return dashboard.stats || {};
    } catch (error) {
      throw new Error(`Erreur lors du chargement des statistiques: ${error.message}`);
    }
  }

  // ===== VALIDATION =====
  validateUserData(userData) {
    const errors = {};

    if (!userData.nom_user || userData.nom_user.trim().length < 2) {
      errors.nom_user = 'Le nom est requis (minimum 2 caractères)';
    }

    if (!userData.prenom_user || userData.prenom_user.trim().length < 2) {
      errors.prenom_user = 'Le prénom est requis (minimum 2 caractères)';
    }

    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.email = 'Email valide requis';
    }

    if (!userData.tel_user || userData.tel_user.trim().length < 8) {
      errors.tel_user = 'Numéro de téléphone valide requis';
    }

    if (!userData.adresse_user || userData.adresse_user.trim().length < 5) {
      errors.adresse_user = 'Adresse requise (minimum 5 caractères)';
    }

    if (userData.password && userData.password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateRoleData(roleData) {
    const errors = {};

    if (!roleData.libelle || roleData.libelle.trim().length < 2) {
      errors.libelle = 'Le libellé du rôle est requis (minimum 2 caractères)';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Créer une instance unique
const adminService = new AdminService();

// Export pour utilisation dans les composants
export { adminService };
export default adminService;