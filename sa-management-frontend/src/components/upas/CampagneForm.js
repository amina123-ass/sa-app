// src/components/upas/CampagneForm.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Campaign,
  Save,
  Cancel,
  CalendarToday,
  LocationOn,
  Euro,
  Group,
  Description
} from '@mui/icons-material';
import { useUpas } from '../../contexts/UpasContext';
import { useNotification } from '../../contexts/NotificationContext';

const CampagneForm = ({ open, onClose, campagne = null }) => {
  const { formData, createCampagne, updateCampagne, loadCampagnes } = useUpas();
  const { showNotification } = useNotification();

  const [formValues, setFormValues] = useState({
    nom: '',
    description: '',
    type_assistance_id: '',
    date_debut: '',
    date_fin: '',
    lieu: '',
    budget: '',
    nombre_participants_prevu: '',
    statut: 'active',
    objectifs: '',
    criteres_eligibilite: '',
    contact_responsable: '',
    telephone_contact: '',
    email_contact: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialiser le formulaire
  useEffect(() => {
    if (campagne) {
      setFormValues({
        nom: campagne.nom || '',
        description: campagne.description || '',
        type_assistance_id: campagne.type_assistance_id || '',
        date_debut: campagne.date_debut ? campagne.date_debut.split('T')[0] : '',
        date_fin: campagne.date_fin ? campagne.date_fin.split('T')[0] : '',
        lieu: campagne.lieu || '',
        budget: campagne.budget || '',
        nombre_participants_prevu: campagne.nombre_participants_prevu || '',
        statut: campagne.statut || 'active',
        objectifs: campagne.objectifs || '',
        criteres_eligibilite: campagne.criteres_eligibilite || '',
        contact_responsable: campagne.contact_responsable || '',
        telephone_contact: campagne.telephone_contact || '',
        email_contact: campagne.email_contact || ''
      });
    } else {
      // Reset pour nouvelle campagne
      setFormValues({
        nom: '',
        description: '',
        type_assistance_id: '',
        date_debut: '',
        date_fin: '',
        lieu: '',
        budget: '',
        nombre_participants_prevu: '',
        statut: 'active',
        objectifs: '',
        criteres_eligibilite: '',
        contact_responsable: '',
        telephone_contact: '',
        email_contact: ''
      });
    }
    setErrors({});
  }, [campagne, open]);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formValues.nom.trim()) {
      newErrors.nom = 'Le nom est obligatoire';
    }

    if (!formValues.type_assistance_id) {
      newErrors.type_assistance_id = 'Le type d\'assistance est obligatoire';
    }

    if (!formValues.date_debut) {
      newErrors.date_debut = 'La date de début est obligatoire';
    }

    if (!formValues.date_fin) {
      newErrors.date_fin = 'La date de fin est obligatoire';
    }

    if (formValues.date_debut && formValues.date_fin && formValues.date_debut >= formValues.date_fin) {
      newErrors.date_fin = 'La date de fin doit être postérieure à la date de début';
    }

    if (formValues.budget && (isNaN(formValues.budget) || parseFloat(formValues.budget) < 0)) {
      newErrors.budget = 'Le budget doit être un nombre positif';
    }

    if (formValues.nombre_participants_prevu && (isNaN(formValues.nombre_participants_prevu) || parseInt(formValues.nombre_participants_prevu) < 1)) {
      newErrors.nombre_participants_prevu = 'Le nombre de participants doit être un entier positif';
    }

    if (formValues.email_contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email_contact)) {
      newErrors.email_contact = 'Format d\'email invalide';
    }

    if (formValues.telephone_contact && !/^[0-9+\-\s()]+$/.test(formValues.telephone_contact)) {
      newErrors.telephone_contact = 'Format de téléphone invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Gestion des changements
  const handleChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));

    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = { ...formValues };
      
      // Convertir les valeurs numériques
      if (data.budget) {
        data.budget = parseFloat(data.budget);
      }
      
      if (data.nombre_participants_prevu) {
        data.nombre_participants_prevu = parseInt(data.nombre_participants_prevu);
      }

      // Nettoyer les champs vides
      Object.keys(data).forEach(key => {
        if (data[key] === '') {
          data[key] = null;
        }
      });

      if (campagne) {
        await updateCampagne(campagne.id, data);
        showNotification('Campagne modifiée avec succès', 'success');
      } else {
        await createCampagne(data);
        showNotification('Campagne créée avec succès', 'success');
      }

      // Recharger la liste
      await loadCampagnes();
      handleClose();

    } catch (error) {
      showNotification(
        error.response?.data?.message || 'Erreur lors de la sauvegarde',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Calculer la durée de la campagne
  const getDuree = () => {
    if (formValues.date_debut && formValues.date_fin) {
      const debut = new Date(formValues.date_debut);
      const fin = new Date(formValues.date_fin);
      const diff = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));
      return diff > 0 ? `${diff} jour(s)` : '';
    }
    return '';
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Campaign />
          {campagne ? 'Modifier la campagne' : 'Nouvelle campagne'}
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Informations générales */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Informations générales
              </Typography>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nom de la campagne *"
                value={formValues.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                error={!!errors.nom}
                helperText={errors.nom}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Campaign />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth error={!!errors.statut}>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={formValues.statut}
                  onChange={(e) => handleChange('statut', e.target.value)}
                  disabled={loading}
                >
                  {formData?.statuts_campagnes?.map((statut) => (
                    <MenuItem key={statut.value} value={statut.value}>
                      {statut.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.statut && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.statut}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formValues.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Description />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.type_assistance_id}>
                <InputLabel>Type d'assistance *</InputLabel>
                <Select
                  value={formValues.type_assistance_id}
                  onChange={(e) => handleChange('type_assistance_id', e.target.value)}
                  disabled={loading}
                >
                  {formData?.types_assistance?.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      <Box>
                        <Typography variant="body2">
                          {type.libelle}
                        </Typography>
                        {type.description && (
                          <Typography variant="caption" color="textSecondary">
                            {type.description}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.type_assistance_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.type_assistance_id}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Dates et lieu */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Planning et localisation
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Date de début *"
                type="date"
                value={formValues.date_debut}
                onChange={(e) => handleChange('date_debut', e.target.value)}
                error={!!errors.date_debut}
                helperText={errors.date_debut}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Date de fin *"
                type="date"
                value={formValues.date_fin}
                onChange={(e) => handleChange('date_fin', e.target.value)}
                error={!!errors.date_fin}
                helperText={errors.date_fin}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" height="100%">
                {getDuree() && (
                  <Chip
                    label={`Durée: ${getDuree()}`}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Lieu de la campagne"
                value={formValues.lieu}
                onChange={(e) => handleChange('lieu', e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Budget et participants */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Budget et objectifs
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Budget prévisionnel"
                type="number"
                value={formValues.budget}
                onChange={(e) => handleChange('budget', e.target.value)}
                error={!!errors.budget}
                helperText={errors.budget}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Euro />
                    </InputAdornment>
                  ),
                  endAdornment: <InputAdornment position="end">DH</InputAdornment>
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre de participants prévu"
                type="number"
                value={formValues.nombre_participants_prevu}
                onChange={(e) => handleChange('nombre_participants_prevu', e.target.value)}
                error={!!errors.nombre_participants_prevu}
                helperText={errors.nombre_participants_prevu}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Group />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Objectifs de la campagne"
                multiline
                rows={3}
                value={formValues.objectifs}
                onChange={(e) => handleChange('objectifs', e.target.value)}
                disabled={loading}
                placeholder="Décrivez les objectifs principaux de cette campagne..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Critères d'éligibilité"
                multiline
                rows={3}
                value={formValues.criteres_eligibilite}
                onChange={(e) => handleChange('criteres_eligibilite', e.target.value)}
                disabled={loading}
                placeholder="Définissez les critères d'éligibilité des bénéficiaires..."
              />
            </Grid>

            {/* Contact responsable */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Responsable de la campagne
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Nom du responsable"
                value={formValues.contact_responsable}
                onChange={(e) => handleChange('contact_responsable', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Téléphone de contact"
                value={formValues.telephone_contact}
                onChange={(e) => handleChange('telephone_contact', e.target.value)}
                error={!!errors.telephone_contact}
                helperText={errors.telephone_contact}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Email de contact"
                type="email"
                value={formValues.email_contact}
                onChange={(e) => handleChange('email_contact', e.target.value)}
                error={!!errors.email_contact}
                helperText={errors.email_contact}
                disabled={loading}
              />
            </Grid>

            {/* Aperçu */}
            {(formValues.nom || formValues.type_assistance_id) && (
              <Grid item xs={12}>
                <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Aperçu:</strong>
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {formValues.nom && (
                      <Chip label={formValues.nom} size="small" color="primary" />
                    )}
                    {formValues.type_assistance_id && (
                      <Chip 
                        label={formData?.types_assistance?.find(t => t.id == formValues.type_assistance_id)?.libelle} 
                        size="small" 
                        variant="outlined" 
                      />
                    )}
                    {formValues.statut && (
                      <Chip 
                        label={formData?.statuts_campagnes?.find(s => s.value === formValues.statut)?.label} 
                        size="small" 
                        color={formValues.statut === 'active' ? 'success' : 'default'} 
                      />
                    )}
                    {getDuree() && (
                      <Chip label={getDuree()} size="small" color="info" />
                    )}
                    {formValues.lieu && (
                      <Chip label={formValues.lieu} size="small" variant="outlined" />
                    )}
                    {formValues.nombre_participants_prevu && (
                      <Chip 
                        label={`${formValues.nombre_participants_prevu} participants`} 
                        size="small" 
                        variant="outlined" 
                      />
                    )}
                  </Box>
                </Box>
              </Grid>
            )}

            {/* Validation des dates */}
            {formValues.date_debut && formValues.date_fin && formValues.date_debut >= formValues.date_fin && (
              <Grid item xs={12}>
                <Alert severity="error">
                  La date de fin doit être postérieure à la date de début.
                </Alert>
              </Grid>
            )}

            {/* Avertissement modification */}
            {campagne && campagne.stats?.total_beneficiaires > 0 && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  Cette campagne contient {campagne.stats.total_beneficiaires} bénéficiaire(s). 
                  Certaines modifications peuvent affecter les participants existants.
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <div>⏳</div> : <Save />}
          >
            {loading ? 'Sauvegarde...' : (campagne ? 'Modifier' : 'Créer')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CampagneForm;