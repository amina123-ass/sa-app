// src/components/upas/BeneficiaireForm.js
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
  FormControlLabel,
  Switch,
  Chip
} from '@mui/material';
import {
  Person,
  Save,
  Cancel
} from '@mui/icons-material';
import { useUpas } from '../../contexts/UpasContext';
import { useNotification } from '../../contexts/NotificationContext';

const BeneficiaireForm = ({ open, onClose, beneficiaire = null }) => {
  const { formData, createBeneficiaire, updateBeneficiaire, loadBeneficiaires } = useUpas();
  const { showNotification } = useNotification();

  const [formValues, setFormValues] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    date_naissance: '',
    sexe: '',
    cin: '',
    campagne_id: '',
    type_assistance_id: '',
    hors_campagne: false,
    commentaire: '',
    statut: 'en_attente'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialiser le formulaire
  useEffect(() => {
    if (beneficiaire) {
      setFormValues({
        nom: beneficiaire.nom || '',
        prenom: beneficiaire.prenom || '',
        telephone: beneficiaire.telephone || '',
        email: beneficiaire.email || '',
        adresse: beneficiaire.adresse || '',
        date_naissance: beneficiaire.date_naissance ? beneficiaire.date_naissance.split('T')[0] : '',
        sexe: beneficiaire.sexe || '',
        cin: beneficiaire.cin || '',
        campagne_id: beneficiaire.campagne_id || '',
        type_assistance_id: beneficiaire.type_assistance_id || '',
        hors_campagne: beneficiaire.hors_campagne || false,
        commentaire: beneficiaire.commentaire || '',
        statut: beneficiaire.statut || 'en_attente'
      });
    } else {
      // Reset pour nouveau bénéficiaire
      setFormValues({
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        adresse: '',
        date_naissance: '',
        sexe: '',
        cin: '',
        campagne_id: '',
        type_assistance_id: '',
        hors_campagne: false,
        commentaire: '',
        statut: 'en_attente'
      });
    }
    setErrors({});
  }, [beneficiaire, open]);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formValues.nom.trim()) {
      newErrors.nom = 'Le nom est obligatoire';
    }

    if (!formValues.prenom.trim()) {
      newErrors.prenom = 'Le prénom est obligatoire';
    }

    if (!formValues.telephone.trim()) {
      newErrors.telephone = 'Le téléphone est obligatoire';
    } else if (!/^[0-9+\-\s()]+$/.test(formValues.telephone)) {
      newErrors.telephone = 'Format de téléphone invalide';
    }

    if (formValues.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formValues.sexe) {
      newErrors.sexe = 'Le sexe est obligatoire';
    }

    if (!formValues.hors_campagne && !formValues.campagne_id) {
      newErrors.campagne_id = 'La campagne est obligatoire (ou cochez "Hors campagne")';
    }

    if (!formValues.type_assistance_id) {
      newErrors.type_assistance_id = 'Le type d\'assistance est obligatoire';
    }

    // Vérification de cohérence campagne/type assistance
    if (formValues.campagne_id && formValues.type_assistance_id) {
      const campagne = formData?.campagnes_actives?.find(c => c.id == formValues.campagne_id);
      if (campagne && campagne.type_assistance_id != formValues.type_assistance_id) {
        newErrors.type_assistance_id = 'Le type d\'assistance doit correspondre à celui de la campagne';
      }
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

    // Logique spéciale pour hors_campagne
    if (field === 'hors_campagne' && value) {
      setFormValues(prev => ({
        ...prev,
        campagne_id: '',
        hors_campagne: true
      }));
    }

    // Auto-sélection du type d'assistance selon la campagne
    if (field === 'campagne_id' && value) {
      const campagne = formData?.campagnes_actives?.find(c => c.id == value);
      if (campagne) {
        setFormValues(prev => ({
          ...prev,
          campagne_id: value,
          type_assistance_id: campagne.type_assistance_id,
          hors_campagne: false
        }));
      }
    }

    // Réinitialiser campagne si type d'assistance change
    if (field === 'type_assistance_id' && value) {
      const campagnesCompatibles = formData?.campagnes_actives?.filter(c => c.type_assistance_id == value);
      if (campagnesCompatibles?.length === 0 && formValues.campagne_id) {
        setFormValues(prev => ({
          ...prev,
          type_assistance_id: value,
          campagne_id: ''
        }));
      }
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
      
      // Nettoyer les données
      if (data.hors_campagne) {
        data.campagne_id = null;
      }
      
      if (!data.email.trim()) {
        data.email = null;
      }
      
      if (!data.date_naissance) {
        data.date_naissance = null;
      }

      if (beneficiaire) {
        await updateBeneficiaire(beneficiaire.id, data);
        showNotification('Bénéficiaire modifié avec succès', 'success');
      } else {
        await createBeneficiaire(data);
        showNotification('Bénéficiaire créé avec succès', 'success');
      }

      // Recharger la liste
      await loadBeneficiaires();
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

  // Filtrer les campagnes selon le type d'assistance sélectionné
  const campagnesDisponibles = formValues.type_assistance_id 
    ? formData?.campagnes_actives?.filter(c => c.type_assistance_id == formValues.type_assistance_id)
    : formData?.campagnes_actives || [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Person />
          {beneficiaire ? 'Modifier le bénéficiaire' : 'Nouveau bénéficiaire'}
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Informations personnelles */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Informations personnelles
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nom *"
                value={formValues.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                error={!!errors.nom}
                helperText={errors.nom}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Prénom *"
                value={formValues.prenom}
                onChange={(e) => handleChange('prenom', e.target.value)}
                error={!!errors.prenom}
                helperText={errors.prenom}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Téléphone *"
                value={formValues.telephone}
                onChange={(e) => handleChange('telephone', e.target.value)}
                error={!!errors.telephone}
                helperText={errors.telephone}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formValues.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date de naissance"
                type="date"
                value={formValues.date_naissance}
                onChange={(e) => handleChange('date_naissance', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.sexe}>
                <InputLabel>Sexe *</InputLabel>
                <Select
                  value={formValues.sexe}
                  onChange={(e) => handleChange('sexe', e.target.value)}
                  disabled={loading}
                >
                  {formData?.sexes?.map((sexe) => (
                    <MenuItem key={sexe.value} value={sexe.value}>
                      {sexe.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.sexe && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.sexe}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="CIN"
                value={formValues.cin}
                onChange={(e) => handleChange('cin', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adresse"
                multiline
                rows={2}
                value={formValues.adresse}
                onChange={(e) => handleChange('adresse', e.target.value)}
                disabled={loading}
              />
            </Grid>

            {/* Assistance et campagne */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Assistance et campagne
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.type_assistance_id}>
                <InputLabel>Type d'assistance *</InputLabel>
                <Select
                  value={formValues.type_assistance_id}
                  onChange={(e) => handleChange('type_assistance_id', e.target.value)}
                  disabled={loading}
                >
                  {formData?.types_assistance?.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.libelle}
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

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formValues.hors_campagne}
                    onChange={(e) => handleChange('hors_campagne', e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Hors campagne"
              />
            </Grid>

            {!formValues.hors_campagne && (
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.campagne_id}>
                  <InputLabel>Campagne *</InputLabel>
                  <Select
                    value={formValues.campagne_id}
                    onChange={(e) => handleChange('campagne_id', e.target.value)}
                    disabled={loading || formValues.hors_campagne}
                  >
                    {campagnesDisponibles.map((campagne) => (
                      <MenuItem key={campagne.id} value={campagne.id}>
                        <Box>
                          <Typography variant="body2">
                            {campagne.nom}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {campagne.date_debut} - {campagne.date_fin}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.campagne_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {errors.campagne_id}
                    </Typography>
                  )}
                </FormControl>
                
                {formValues.type_assistance_id && campagnesDisponibles.length === 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Aucune campagne active disponible pour ce type d'assistance. 
                    Vous pouvez cocher "Hors campagne" ou changer le type d'assistance.
                  </Alert>
                )}
              </Grid>
            )}

            {/* Statut et commentaire */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Statut et commentaire
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={formValues.statut}
                  onChange={(e) => handleChange('statut', e.target.value)}
                  disabled={loading}
                >
                  {formData?.statuts_beneficiaires?.map((statut) => (
                    <MenuItem key={statut.value} value={statut.value}>
                      {statut.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Commentaire"
                multiline
                rows={3}
                value={formValues.commentaire}
                onChange={(e) => handleChange('commentaire', e.target.value)}
                disabled={loading}
                placeholder="Notes, observations, motif de refus, etc."
              />
            </Grid>

            {/* Aperçu des données */}
            {(formValues.nom || formValues.prenom) && (
              <Grid item xs={12}>
                <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Aperçu:</strong>
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip 
                      label={`${formValues.nom} ${formValues.prenom}`.trim()} 
                      size="small" 
                    />
                    {formValues.telephone && (
                      <Chip label={formValues.telephone} size="small" variant="outlined" />
                    )}
                    {formValues.sexe && (
                      <Chip 
                        label={formData?.sexes?.find(s => s.value === formValues.sexe)?.label} 
                        size="small" 
                        variant="outlined" 
                      />
                    )}
                    {formValues.type_assistance_id && (
                      <Chip 
                        label={formData?.types_assistance?.find(t => t.id == formValues.type_assistance_id)?.libelle} 
                        size="small" 
                        color="primary" 
                      />
                    )}
                    {formValues.hors_campagne ? (
                      <Chip label="Hors campagne" size="small" color="default" />
                    ) : formValues.campagne_id && (
                      <Chip 
                        label={formData?.campagnes_actives?.find(c => c.id == formValues.campagne_id)?.nom} 
                        size="small" 
                        color="secondary" 
                      />
                    )}
                  </Box>
                </Box>
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
            {loading ? 'Sauvegarde...' : (beneficiaire ? 'Modifier' : 'Créer')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BeneficiaireForm;