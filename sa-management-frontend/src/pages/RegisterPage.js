import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Grid,
  Link,
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const steps = ['Informations personnelles', 'Vérification email', 'Configuration sécurité'];

const RegisterPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    nom_user: '',
    prenom_user: '',
    email: '',
    tel_user: '',
    adresse_user: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      setSuccess('Compte créé avec succès ! Veuillez vérifier votre email pour continuer.');
      setActiveStep(1);
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerified = () => {
    navigate('/security-setup', { state: { email: formData.email } });
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 2
        }}
      >
        <Paper elevation={3} sx={{ padding: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              SA Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Création d'un nouveau compte utilisateur
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {activeStep === 0 && (
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="prenom_user"
                    label="Prénom"
                    name="prenom_user"
                    autoComplete="given-name"
                    value={formData.prenom_user}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="nom_user"
                    label="Nom"
                    name="nom_user"
                    autoComplete="family-name"
                    value={formData.nom_user}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="Email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="tel_user"
                    label="Téléphone"
                    name="tel_user"
                    type="tel"
                    autoComplete="tel"
                    value={formData.tel_user}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="adresse_user"
                    label="Adresse"
                    name="adresse_user"
                    multiline
                    rows={3}
                    value={formData.adresse_user}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  fullWidth
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Créer le compte'}
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Vérification de votre email
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Un email de vérification a été envoyé à <strong>{formData.email}</strong>.
                Cliquez sur le lien dans l'email pour continuer.
              </Typography>
              
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;