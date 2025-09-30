/**
 * Utilitaires de formatage pour l'application
 */

/**
 * Formate une date au format français
 * @param {string|Date} date 
 * @param {string} fallback 
 * @returns {string}
 */
export const formatDate = (date, fallback = '-') => {
  if (!date) return fallback;
  
  try {
    return new Date(date).toLocaleDateString('fr-FR');
  } catch (error) {
    return fallback;
  }
};

/**
 * Formate une date et heure au format français
 * @param {string|Date} datetime 
 * @param {string} fallback 
 * @returns {string}
 */
export const formatDateTime = (datetime, fallback = '-') => {
  if (!datetime) return fallback;
  
  try {
    return new Date(datetime).toLocaleString('fr-FR');
  } catch (error) {
    return fallback;
  }
};

/**
 * Formate une taille de fichier en octets vers une unité lisible
 * @param {number} bytes 
 * @param {number} decimals 
 * @returns {string}
 */
export const formatFileSize = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Formate un numéro de téléphone
 * @param {string} phone 
 * @returns {string}
 */
export const formatPhone = (phone) => {
  if (!phone) return '-';
  
  // Simple formatage pour les numéros marocains
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  
  return phone;
};

/**
 * Capitalise la première lettre de chaque mot
 * @param {string} str 
 * @returns {string}
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  
  return str.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
};

/**
 * Tronque un texte à une longueur donnée
 * @param {string} text 
 * @param {number} maxLength 
 * @param {string} suffix 
 * @returns {string}
 */
export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text || text.length <= maxLength) return text || '';
  
  return text.substring(0, maxLength - suffix.length) + suffix;
};