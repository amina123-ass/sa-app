import api from './api';

export const authService = {
  // Inscription
  register: async (userData) => {
    const response = await api.post('/register', userData);
    return response.data;
  },

  // Configuration sécurité
  setupSecurity: async (securityData) => {
    const response = await api.post('/setup-security', securityData);
    return response.data;
  },

  // Connexion
  login: async (credentials) => {
    const response = await api.post('/login', credentials);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Déconnexion
  logout: async () => {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },

  // Questions de sécurité
  getSecurityQuestions: async () => {
    const response = await api.get('/security-questions');
    return response.data;
  },

  // Mot de passe oublié
  forgotPassword: async (email, method) => {
    const response = await api.post('/forgot-password', { email, method });
    return response.data;
  },

  // Vérifier réponses sécurité
  verifySecurityAnswers: async (email, answers) => {
    const response = await api.post('/verify-security-answers', { email, answers });
    return response.data;
  },

  // ✅ NOUVEAU : Réinitialiser mot de passe avec token email
  resetPasswordWithToken: async (email, token, password, password_confirmation) => {
    const response = await api.post('/reset-password-with-token', { 
      email, 
      token, 
      password, 
      password_confirmation 
    });
    return response.data;
  },

  // Réinitialiser mot de passe (méthode questions sécurité)
  resetPassword: async (password, password_confirmation) => {
    const response = await api.post('/reset-password', { 
      password, 
      password_confirmation 
    });
    return response.data;
  },

  // Obtenir utilisateur actuel
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Vérifier si utilisateur connecté
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },

  // Vérifier si admin
  isAdmin: () => {
    const user = authService.getCurrentUser();
    return user?.role?.libelle === 'Administrateur Informatique';
  }
};