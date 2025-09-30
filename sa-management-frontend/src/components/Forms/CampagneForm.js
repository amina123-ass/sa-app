// src/components/Forms/CampagneForm.js
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
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { useUpas } from '../../contexts/UpasContext';
import { useNotification } from '../../contexts/NotificationContext';

const CampagneForm = ({ open, onClose, campagne = null, onSuccess }) => {
  const { createCampagne, updateCampagne, formOptions, loadingStates, errors } = useUpas();
  const { showNotification } = useNotification();
  const isEdit = Boolean(campagne);
  
  const [formData, setFormData] = useState({
    nom: '',
    type_assistance_id: '',
    date_debut: null,
    date_fin: null,
    budget: '',
    nombre_participants_prevu: '',
    lieu: '',
    description: '',
    prix_unitaire: '',
    statut: 'Active'
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Charger les données de la campagne en mode édition
  useEffect(() => {
    if (isEdit && campagne) {
      setFormData({
        nom: campagne.nom || '',
        type_assistance_id: campagne.type_assistance_id || '',
        date_debut: campagne.date_debut ? new Date(campagne.date_debut) : null,
        date_fin: campagne.date_fin ? new Date(campagne.date_fin) : null,
        budget: campagne.budget || '',
        nombre_participants_prevu: campagne.nombre_participants_prevu || '',
        lieu: campagne.lieu || '',
        description: campagne.description || '',
        prix_unitaire: campagne.prix_unitaire || '',
        statut: campagne.statut || 'Active'
      });
    } else {
      // Reset form for new campagne
      setFormData({
        nom: '',
        type_assistance_id: '',
        date_debut: null,
        date_fin: null,
        budget: '',
        nombre_participants_prevu: '',
        lieu: '',
        description: '',
        prix_unitaire: '',
        statut: 'Active'
      });
    }
    setFormErrors({});
  }, [isEdit, campagne, open]);
  
  // Validation du formulaire
  const validateForm = () => {
    const errors = {};
    
    if (!formData.nom.trim()) {
      errors.nom = 'Le nom est obligatoire';
    }
    
    if (!formData.type_assistance_id) {
      errors.type_assistance_id = 'Le type d\'assistance est obligatoire';
    }
    
    if (!formData.date_debut) {
      errors.date_debut = 'La date de début est obligatoire';
    }
    
    if (!formData.date_fin) {
      errors.date_fin = 'La date de fin est obligatoire';
    }
    
    if (formData.date_debut && formData.date_fin && formData.date_debut >= formData.date_fin) {
      errors.date_fin = 'La date de fin doit être après la date de début';
    }
    
    if (formData.budget && isNaN(formData.budget)) {
      errors.budget = 'Le budget doit être un nombre';
    }
    
    if (formData.nombre_participants_prevu && isNaN(formData.nombre_participants_prevu)) {
      errors.nombre_participants_prevu = 'Le nombre de participants doit être un nombre';
    }
    
    if (formData.prix_unitaire && isNaN(formData.prix_unitaire)) {
      errors.prix_unitaire = 'Le prix unitaire doit être un nombre';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Gérer les changements de champs
  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };
  
  const handleDateChange = (field) => (date) => {
    setFormData(prev => ({
      ...prev,
      [field]: date
    }));
    
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };
  
  // Soumission du formulaire
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        date_debut: formData.date_debut ? formData.date_debut.toISOString().split('T')[0] : null,
        date_fin: formData.date_fin ? formData.date_fin.toISOString().split('T')[0] : null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        nombre_participants_prevu: formData.nombre_participants_prevu ? parseInt(formData.nombre_participants_prevu) : null,
        prix_unitaire: formData.prix_unitaire ? parseFloat(formData.prix_unitaire) : null,
      };
      
      if (isEdit) {
        await updateCampagne(campagne.id, submitData);
        showNotification('Campagne mise à jour avec succès', 'success');
      } else {
        await createCampagne(submitData);
        showNotification('Campagne créée avec succès', 'success');
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showNotification('Erreur lors de la sauvegarde', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {isEdit ? 'Modifier la campagne' : 'Nouvelle campagne médicale'}
          </Typography>
        </DialogTitle>
        
        <DialogContent dividers>
          {errors.campagnes && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.campagnes}
            </Alert>
          )}
          
          <Grid container spacing={3}>
            {/* Informations de base */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                Informations générales
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nom de la campagne"
                value={formData.nom}
                onChange={handleChange('nom')}
                error={!!formErrors.nom}
                helperText={formErrors.nom}
                placeholder="Ex: Campagne chirurgie cardiaque Mars 2024"
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth error={!!formErrors.type_assistance_id}>
                <InputLabel required>Type d'assistance</InputLabel>
                <Select
                  value={formData.type_assistance_id}
                  label="Type d'assistance"
                  onChange={handleChange('type_assistance_id')}
                >
                  {formOptions?.types_assistance?.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.libelle}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.type_assistance_id && (
                  <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                    {formErrors.type_assistance_id}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date de début"
                value={formData.date_debut}
                onChange={handleDateChange('date_debut')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                    error={!!formErrors.date_debut}
                    helperText={formErrors.date_debut}
                  />
                )}
                minDate={new Date()}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date de fin"
                value={formData.date_fin}
                onChange={handleDateChange('date_fin')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                    error={!!formErrors.date_fin}
                    helperText={formErrors.date_fin}
                  />
                )}
                minDate={formData.date_debut || new Date()}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Lieu"
                value={formData.lieu}
                onChange={handleChange('lieu')}
                placeholder="Ex: Hôpital Mohamed V, Rabat"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
                multiline
                rows={3}
                placeholder="Description détaillée de la campagne..."
              />
            </Grid>
            
            {/* Paramètres financiers */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                Paramètres financiers et participants
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Budget alloué"
                value={formData.budget}
                onChange={handleChange('budget')}
                error={!!formErrors.budget}
                helperText={formErrors.budget}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">DH</InputAdornment>,
                }}
                placeholder="0"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Prix unitaire"
                value={formData.prix_unitaire}
                onChange={handleChange('prix_unitaire')}
                error={!!formErrors.prix_unitaire}
                helperText={formErrors.prix_unitaire}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">DH</InputAdornment>,
                }}
                placeholder="0"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Participants prévus"
                value={formData.nombre_participants_prevu}
                onChange={handleChange('nombre_participants_prevu')}
                error={!!formErrors.nombre_participants_prevu}
                helperText={formErrors.nombre_participants_prevu}
                type="number"
                placeholder="0"
              />
            </Grid>
            
            {/* Affichage du besoin en crédit calculé */}
            {formData.prix_unitaire && formData.nombre_participants_prevu && (
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'info.lighter', 
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'info.main'
                  }}
                >
                  <Typography variant="body2" color="info.main" sx={{ fontWeight: 600 }}>
                    💡 Besoin en crédit estimé: {' '}
                    {(parseFloat(formData.prix_unitaire) * parseInt(formData.nombre_participants_prevu)).toLocaleString()} DH
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Calculé automatiquement : Prix unitaire × Nombre de participants
                  </Typography>
                </Box>
              </Grid>
            )}
            
            {/* Statut (en mode édition uniquement) */}
            {isEdit && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    Statut de la campagne
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={formData.statut}
                      label="Statut"
                      onChange={handleChange('statut')}
                    >
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                      <MenuItem value="En cours">En cours</MenuItem>
                      <MenuItem value="Terminée">Terminée</MenuItem>
                      <MenuItem value="Annulée">Annulée</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            color="inherit"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Sauvegarde...' : isEdit ? 'Mettre à jour' : 'Créer la campagne'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CampagneForm;