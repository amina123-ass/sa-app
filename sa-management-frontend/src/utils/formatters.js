// src/utils/formatters.js
export const formatters = {
  // Formatage des devises (Dirham marocain)
  formatCurrency: (amount) => {
    if (amount == null || isNaN(amount)) return '0,00 MAD';
    
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount));
  },

  // Formatage des dates
  formatDate: (dateString) => {
    if (!dateString) return 'Non définie';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-MA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Date invalide';
    }
  },

  // Formatage des dates avec heure
  formatDateTime: (dateString) => {
    if (!dateString) return 'Non définie';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-MA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Date invalide';
    }
  },

  // Formatage des numéros de téléphone marocains
  formatPhone: (phoneNumber) => {
    if (!phoneNumber) return 'Non défini';
    
    // Nettoyer le numéro
    const cleaned = phoneNumber.toString().replace(/\D/g, '');
    
    // Format marocain standard: +212 6XX XX XX XX
    if (cleaned.length === 12 && cleaned.startsWith('212')) {
      return `+212 ${cleaned.substr(3, 1)} ${cleaned.substr(4, 2)} ${cleaned.substr(6, 2)} ${cleaned.substr(8, 2)} ${cleaned.substr(10, 2)}`;
    }
    
    // Format local: 06XX XX XX XX
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return `${cleaned.substr(0, 4)} ${cleaned.substr(4, 2)} ${cleaned.substr(6, 2)} ${cleaned.substr(8, 2)}`;
    }
    
    // Retourner tel quel si format non reconnu
    return phoneNumber;
  },

  // Calculer l'âge à partir de la date de naissance
  calculateAge: (birthDate) => {
    if (!birthDate) return 'Non défini';
    
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return `${age} ans`;
    } catch (error) {
      return 'Âge invalide';
    }
  },

  // Tronquer un texte avec ellipses
  truncateText: (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  // Formatage des nombres avec séparateurs de milliers
  formatNumber: (number) => {
    if (number == null || isNaN(number)) return '0';
    
    return new Intl.NumberFormat('fr-MA').format(Number(number));
  },

  // Formatage des pourcentages
  formatPercentage: (value, decimals = 1) => {
    if (value == null || isNaN(value)) return '0%';
    
    return new Intl.NumberFormat('fr-MA', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(Number(value) / 100);
  },

  // Formatage des statuts avec couleurs (pour Chips)
  getStatutColor: (statut) => {
    const colors = {
      // Statuts généraux
      'actif': 'success',
      'inactif': 'default',
      'en_attente': 'warning',
      'valide': 'success',
      'refuse': 'error',
      'annule': 'error',
      
      // Statuts campagnes
      'planifiee': 'info',
      'en_cours': 'success',
      'terminee': 'default',
      'annulee': 'error',
      
      // Statuts stock
      'disponible': 'success',
      'rupture': 'error',
      'alerte': 'warning',
      'critique': 'error',
      
      // Statuts assistances
      'accordee': 'success',
      'en_cours': 'warning',
      'completee': 'success',
      'rejetee': 'error'
    };
    
    return colors[statut?.toLowerCase()] || 'default';
  },

  // Formater une durée en minutes vers heures:minutes
  formatDuration: (minutes) => {
    if (!minutes || minutes < 0) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  },

  // Formatage de la taille de fichier
  formatFileSize: (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(1);
    
    return `${size} ${sizes[i]}`;
  },

  // Validation et formatage de l'email
  formatEmail: (email) => {
    if (!email) return 'Non défini';
    return email.toLowerCase().trim();
  },

  // Formatage du nom complet
  formatFullName: (prenom, nom) => {
    const prenomFormatted = prenom ? prenom.trim() : '';
    const nomFormatted = nom ? nom.trim().toUpperCase() : '';
    
    if (!prenomFormatted && !nomFormatted) return 'Non défini';
    if (!prenomFormatted) return nomFormatted;
    if (!nomFormatted) return prenomFormatted;
    
    return `${prenomFormatted} ${nomFormatted}`;
  },

  // Formatage d'adresse
  formatAddress: (adresse, ville, codePostal) => {
    const parts = [adresse, ville, codePostal].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Non définie';
  },

  // Formatage pour l'affichage dans les tableaux
  formatTableCell: (value, type = 'text') => {
    switch (type) {
      case 'currency':
        return formatters.formatCurrency(value);
      case 'date':
        return formatters.formatDate(value);
      case 'datetime':
        return formatters.formatDateTime(value);
      case 'phone':
        return formatters.formatPhone(value);
      case 'number':
        return formatters.formatNumber(value);
      case 'percentage':
        return formatters.formatPercentage(value);
      default:
        return value || 'Non défini';
    }
  }
};