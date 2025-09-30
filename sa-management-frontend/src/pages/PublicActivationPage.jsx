// src/pages/PublicActivationPage.jsx - Page d'activation publique
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Avatar,
  Chip,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  AccountCircle,
  Assignment,
  CheckCircle,
  Security,
  Email,
  Person,
  AdminPanelSettings,
  Warning,
  Login
} from '@mui/icons-material';
import axios from '../config/axios'; // Utiliser directement axios

const PublicActivationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Paramètres de l'URL
  const userId = searchParams.get('user_id');
  const token = searchParams.get('token');
  const userEmail = searchParams.get('email');
  const userName = searchParams.get('name');

  // État du composant
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [activationComplete, setActivationComplete] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  useEffect(() => {
    // Vérifier les paramètres requis
    if (!userId || !token || !userEmail) {
      setError('Paramètres d\'activation manquants ou invalides.');
      setLoading(false);
      return;
    }

    loadRoles();
  }, [userId, token, userEmail]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      
      // Charger les rôles disponibles (API publique)
      const response = await axios.get('/form-options');
      
      if (response.data.success && response.data.data.roles) {
        setRoles(response.data.data.roles);
      } else {
        setError('Impossible de charger les rôles disponibles.');
      }
    } catch (error) {
      console.error('Erreur chargement rôles:', error);
      setError('Erreur lors du chargement des rôles disponibles.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivation = async () => {
    if (!selectedRoleId) {
      setError('Veuillez sélectionner un rôle');
      return;
    }

    try {
      setActivating(true);
      setError('');

      console.log('🚀 Début activation publique:', { userId, token, roleId: selectedRoleId });

      // Appel à l'API publique d'activation
      const response = await axios.post(`/users/${userId}/activate-with-token`, {
        token: token,
        role_id: selectedRoleId
      });

      console.log('✅ Activation réussie:', response.data);

      if (response.data.success) {
        setSuccess(response.data.message);
        setActivationComplete(true);
        
        // Stocker les identifiants générés s'ils existent
        if (response.data.generated_credentials) {
          setGeneratedCredentials(response.data.generated_credentials);
        }
        
        setConfirmDialog(false);
      }
    } catch (error) {
      console.error('❌ Erreur activation:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Erreur lors de l\'activation du compte';
      
      setError(errorMessage);
    } finally {
      setActivating(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login', {
      state: {
        message: 'Votre compte a été activé avec succès ! Vous pouvez maintenant vous connecter.',
        type: 'success',
        credentials: generatedCredentials
      }
    });
  };

  // Écran de chargement
  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6">
            Préparation de l'activation...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Chargement des informations nécessaires
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Écran d'erreur initiale
  if (error && !roles.length) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Warning sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="error">
            Erreur d'activation
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/login')}
            startIcon={<Login />}
          >
            Retour à la connexion
          </Button>
        </Paper>
      </Container>
    );
  }

  // Écran de succès
  if (activationComplete) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={6} sx={{ p: 4, textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CheckCircle sx={{ fontSize: 80, mb: 3, color: 'success.light' }} />
          <Typography variant="h3" gutterBottom fontWeight="bold">
            Compte activé !
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            {success}
          </Typography>
        </Paper>

        {generatedCredentials && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Security sx={{ mr: 1 }} />
                Vos identifiants de connexion
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Un email contenant ces informations vous a également été envoyé.
              </Alert>
              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Email :</Typography>
                <Typography variant="body1" fontWeight="bold">{generatedCredentials.email}</Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Mot de passe temporaire :</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                  {generatedCredentials.temporary_password || generatedCredentials.password}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Rôle assigné :</Typography>
                <Typography variant="body1" fontWeight="bold">{generatedCredentials.role}</Typography>
              </Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Important :</strong> Changez votre mot de passe lors de votre première connexion.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleLoginRedirect}
            startIcon={<Login />}
            sx={{ 
              px: 4, 
              py: 1.5,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
            }}
          >
            Se connecter maintenant
          </Button>
        </Box>
      </Container>
    );
  }

  // Interface principale d'activation
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ textAlign: 'center' }}>
          <AdminPanelSettings sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Activation de votre compte UPAS
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
            Dernière étape avant l'accès au système
          </Typography>
        </Box>
      </Paper>

      {/* Stepper */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={1} alternativeLabel>
          <Step completed>
            <StepLabel>Email vérifié</StepLabel>
          </Step>
          <Step>
            <StepLabel>Sélection du rôle</StepLabel>
          </Step>
          <Step>
            <StepLabel>Compte activé</StepLabel>
          </Step>
        </Stepper>
      </Paper>

      {/* Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Informations utilisateur */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}>
              <AccountCircle sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" gutterBottom>
                {userName || 'Utilisateur'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {userEmail}
                </Typography>
              </Box>
              <Chip 
                icon={<CheckCircle />} 
                label="Email vérifié" 
                color="success" 
                size="small" 
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Sélection du rôle */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Assignment sx={{ mr: 1 }} />
            Sélection de votre rôle
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Veuillez sélectionner le rôle qui correspond à votre fonction dans l'organisation. 
              Ce rôle déterminera vos permissions d'accès au système UPAS.
            </Typography>
          </Alert>

          <FormControl fullWidth required sx={{ mb: 3 }}>
            <InputLabel>Choisissez votre rôle</InputLabel>
            <Select
              value={selectedRoleId}
              label="Choisissez votre rôle"
              onChange={(e) => setSelectedRoleId(e.target.value)}
              startAdornment={<Security sx={{ mr: 1, color: 'text.secondary' }} />}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  <Box>
                    <Typography variant="body1">{role.libelle}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Sélectionnez le rôle correspondant à votre fonction
            </FormHelperText>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={() => setConfirmDialog(true)}
              disabled={!selectedRoleId || activating}
              startIcon={activating ? <CircularProgress size={20} /> : <CheckCircle />}
              sx={{ px: 4 }}
            >
              {activating ? 'Activation en cours...' : 'Activer mon compte'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Dialog de confirmation */}
      <Dialog
        open={confirmDialog}
        onClose={() => !activating && setConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <Assignment color="success" sx={{ mr: 1 }} />
          Confirmer l'activation
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Vous êtes sur le point d'activer votre compte avec le rôle :{' '}
            <strong>{roles.find(r => r.id === selectedRoleId)?.libelle}</strong>
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Une fois activé, vous recevrez un email de confirmation avec vos identifiants 
              de connexion si nécessaire.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} disabled={activating}>
            Annuler
          </Button>
          <Button
            onClick={handleActivation}
            color="success"
            variant="contained"
            disabled={activating}
            startIcon={activating ? <CircularProgress size={20} /> : <CheckCircle />}
            autoFocus
          >
            {activating ? 'Activation...' : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PublicActivationPage;