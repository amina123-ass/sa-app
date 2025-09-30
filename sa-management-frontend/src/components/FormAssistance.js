// components/FormAssistance.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Typography,
  Divider
} from '@mui/material';
import { ASSISTANCE_CONSTANTS } from '../../services/upasAPI';

const FormAssistance = ({ assistance, referenceData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    beneficiaire_nom: '',
    beneficiaire_prenom: '',
    beneficiaire_cin: '',
    beneficiaire_telephone: '',
    beneficiaire_adresse: '',
    type_assistance_id: '',
    details_type_assistance: '',
    campagne_id: '',
    date_assistance: new Date().toISOString().slice(0, 10),
    priorite: 'Normale',
    montant: '',
    description: '',
    ...assistance
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.beneficiaire_nom.trim()) {
      newErrors.beneficiaire_nom = 'Le nom du bénéficiaire est obligatoire';
    }
    
    if (!formData.beneficiaire_prenom.trim()) {
      newErrors.beneficiaire_prenom = 'Le prénom du bénéficiaire est obligatoire';
    }
    
    if (!formData.beneficiaire_telephone.trim()) {
      newErrors.beneficiaire_telephone = 'Le téléphone est obligatoire';
    }
    
    if (!formData.type_assistance_id) {
      newErrors.type_assistance_id = 'Le type d\'assistance est obligatoire';
    }
    
    if (!formData.date_assistance) {
      newErrors.date_assistance = 'La date d\'assistance est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Informations du bénéficiaire
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Nom"
            value={formData.beneficiaire_nom}
            onChange={(e) => handleChange('beneficiaire_nom', e.target.value)}
            error={!!errors.beneficiaire_nom}
            helperText={errors.beneficiaire_nom}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Prénom"
            value={formData.beneficiaire_prenom}
            onChange={(e) => handleChange('beneficiaire_prenom', e.target.value)}
            error={!!errors.beneficiaire_prenom}
            helperText={errors.beneficiaire_prenom}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="CIN"
            value={formData.beneficiaire_cin}
            onChange={(e) => handleChange('beneficiaire_cin', e.target.value)}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Téléphone"
            value={formData.beneficiaire_telephone}
            onChange={(e) => handleChange('beneficiaire_telephone', e.target.value)}
            error={!!errors.beneficiaire_telephone}
            helperText={errors.beneficiaire_telephone}
            required
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Adresse"
            multiline
            rows={2}
            value={formData.beneficiaire_adresse}
            onChange={(e) => handleChange('beneficiaire_adresse', e.target.value)}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>
        Détails de l'assistance
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={!!errors.type_assistance_id}>
            <InputLabel>Type d'assistance *</InputLabel>
            <Select
              value={formData.type_assistance_id}
              onChange={(e) => handleChange('type_assistance_id', e.target.value)}
              label="Type d'assistance *"
            >
              {referenceData.types_assistance?.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.libelle}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Campagne</InputLabel>
            <Select
              value={formData.campagne_id}
              onChange={(e) => handleChange('campagne_id', e.target.value)}
              label="Campagne"
            >
              <MenuItem value="">Aucune campagne</MenuItem>
              {referenceData.campagnes?.map((campagne) => (
                <MenuItem key={campagne.id} value={campagne.id}>
                  {campagne.nom}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="Date d'assistance"
            value={formData.date_assistance}
            onChange={(e) => handleChange('date_assistance', e.target.value)}
            error={!!errors.date_assistance}
            helperText={errors.date_assistance}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Priorité</InputLabel>
            <Select
              value={formData.priorite}
              onChange={(e) => handleChange('priorite', e.target.value)}
              label="Priorité"
            >
              {ASSISTANCE_CONSTANTS.PRIORITES.map((priorite) => (
                <MenuItem key={priorite.value} value={priorite.value}>
                  {priorite.icon} {priorite.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Montant (DH)"
            value={formData.montant}
            onChange={(e) => handleChange('montant', e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Détails du type d'assistance"
            value={formData.details_type_assistance}
            onChange={(e) => handleChange('details_type_assistance', e.target.value)}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description / Remarques"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button 
          variant="outlined" 
          onClick={onCancel}
          type="button"
        >
          Annuler
        </Button>
        <Button 
          variant="contained" 
          type="submit"
        >
          {assistance ? 'Modifier' : 'Créer'}
        </Button>
      </Box>
    </Box>
  );
};

export default FormAssistance;