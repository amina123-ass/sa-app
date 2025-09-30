export const validators = {
  // Validation email
  isValidEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Validation téléphone
  isValidPhone: (phone) => {
    const re = /^[0-9+\-\s()]{10,}$/;
    return re.test(phone);
  },

  // Validation CIN
  isValidCIN: (cin) => {
    if (!cin) return true; // CIN optionnel
    const re = /^[A-Z]{1,2}[0-9]{1,8}$/i;
    return re.test(cin);
  },

  // Validation date
  isValidDate: (date) => {
    if (!date) return false;
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  },

  // Validation âge minimum
  isMinimumAge: (dateNaissance, minAge = 0) => {
    if (!dateNaissance) return false;
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= minAge;
  },

  // Validation montant
  isValidAmount: (amount) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= 0;
  },

  // Validation champ requis
  isRequired: (value) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined && value !== '';
  }
};