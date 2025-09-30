import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  CircularProgress
} from '@mui/material';
import { 
  Save, 
  Email, 
  Lock, 
  Visibility, 
  VisibilityOff,
  CheckCircle,
  Error,
  Warning,
  Info,
  Security,
  Palette,
  Language,
  Schedule,
  Person,
  Settings,
  Shield,
  Notifications,
  VpnKey,
  AccountCircle
} from '@mui/icons-material';
import AdminLayout from '../../components/Layout/AdminLayout';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../contexts/AuthContext';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    systemName: 'SA Management',
    language: 'fr',
    theme: 'light',
    sessionTimeout: 30,
    passwordPolicy: 'standard',
    emailNotifications: true
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailStep, setEmailStep] = useState(0);
  const { notification, showNotification, hideNotification } = useNotification();
  const { user } = useAuth();

  // Validation des emails
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation de la force du mot de passe
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  // Validation des paramètres
  const validateSettings = () => {
    const errors = {};
    
    if (!settings.systemName.trim()) {
      errors.systemName = 'Le nom du système est requis';
    } else if (settings.systemName.length < 3) {
      errors.systemName = 'Le nom doit contenir au moins 3 caractères';
    }
    
    if (settings.sessionTimeout < 5 || settings.sessionTimeout > 120) {
      errors.sessionTimeout = 'Le délai doit être entre 5 et 120 minutes';
    }
    
    return errors;
  };

  // Validation du changement d'email
  const validateEmailChange = () => {
    const errors = {};
    
    if (!newEmail.trim()) {
      errors.newEmail = 'La nouvelle adresse email est requise';
    } else if (!validateEmail(newEmail)) {
      errors.newEmail = 'Format d\'email invalide';
    } else if (newEmail === user?.email) {
      errors.newEmail = 'La nouvelle adresse doit être différente de l\'actuelle';
    }
    
    if (!confirmEmail.trim()) {
      errors.confirmEmail = 'Veuillez confirmer l\'adresse email';
    } else if (newEmail !== confirmEmail) {
      errors.confirmEmail = 'Les adresses email ne correspondent pas';
    }
    
    return errors;
  };

  // Validation du changement de mot de passe
  const validatePasswordChange = () => {
    const errors = {};
    
    if (!currentPassword.trim()) {
      errors.currentPassword = 'Le mot de passe actuel est requis';
    }
    
    if (!newPassword.trim()) {
      errors.newPassword = 'Le nouveau mot de passe est requis';
    } else {
      const strength = calculatePasswordStrength(newPassword);
      const requiredStrength = settings.passwordPolicy === 'basic' ? 2 : 
                              settings.passwordPolicy === 'standard' ? 4 : 5;
      
      if (strength < requiredStrength) {
        errors.newPassword = `Le mot de passe ne respecte pas la politique ${settings.passwordPolicy}`;
      }
    }
    
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Veuillez confirmer le nouveau mot de passe';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    if (newPassword === currentPassword) {
      errors.newPassword = 'Le nouveau mot de passe doit être différent de l\'actuel';
    }
    
    return errors;
  };

  // Mise à jour de la force du mot de passe
  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(calculatePasswordStrength(newPassword));
    } else {
      setPasswordStrength(0);
    }
  }, [newPassword]);

  // Vérifier si les paramètres ont changé
  useEffect(() => {
    const originalSettings = {
      systemName: 'SA Management',
      language: 'fr',
      theme: 'light',
      sessionTimeout: 30,
      passwordPolicy: 'standard',
      emailNotifications: true
    };
    
    const hasChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setSettingsChanged(hasChanged);
  }, [settings]);

  const handleSettingsChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Validation en temps réel
    const errors = validateSettings();
    setValidationErrors(errors);
  };

  const handleSaveSettings = async () => {
    const errors = validateSettings();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showNotification('Veuillez corriger les erreurs avant de sauvegarder', 'error');
      return;
    }

    setConfirmAction({
      title: 'Sauvegarder les paramètres',
      message: 'Êtes-vous sûr de vouloir sauvegarder ces paramètres ? Certains changements nécessiteront une reconnexion.',
      action: async () => {
        setSaving(true);
        try {
          // Simuler la sauvegarde
          await new Promise(resolve => setTimeout(resolve, 2000));
          showNotification('Paramètres sauvegardés avec succès', 'success');
          setSettingsChanged(false);
        } catch (error) {
          showNotification('Erreur lors de la sauvegarde', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
    setOpenConfirmDialog(true);
  };

  const handleChangeEmail = async () => {
    const errors = validateEmailChange();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setEmailStep(1);
    try {
      // Simuler l'envoi de l'email de confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setEmailStep(2);
      showNotification('Email de confirmation envoyé. Vérifiez votre nouvelle adresse.', 'info');
      
      setTimeout(() => {
        setOpenEmailDialog(false);
        setNewEmail('');
        setConfirmEmail('');
        setEmailStep(0);
        setValidationErrors({});
      }, 3000);
    } catch (error) {
      setEmailStep(0);
      showNotification('Erreur lors de l\'envoi de l\'email', 'error');
    }
  };

  const handleChangePassword = async () => {
    const errors = validatePasswordChange();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setConfirmAction({
      title: 'Changer le mot de passe',
      message: 'Êtes-vous sûr de vouloir changer votre mot de passe ? Vous devrez vous reconnecter.',
      action: async () => {
        try {
          // Simuler le changement de mot de passe
          await new Promise(resolve => setTimeout(resolve, 1500));
          showNotification('Mot de passe modifié avec succès', 'success');
          setOpenPasswordDialog(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setValidationErrors({});
        } catch (error) {
          showNotification('Erreur lors du changement de mot de passe', 'error');
        }
      }
    });
    setOpenConfirmDialog(true);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'error';
    if (passwordStrength <= 4) return 'warning';
    return 'success';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Faible';
    if (passwordStrength <= 4) return 'Moyen';
    return 'Fort';
  };

  const getPasswordPolicyDescription = (policy) => {
    const descriptions = {
      basic: 'Minimum 8 caractères',
      standard: '8+ caractères, 1 majuscule, 1 chiffre',
      strong: '10+ caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 symbole'
    };
    return descriptions[policy] || '';
  };

  return (
    <AdminLayout>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Paramètres du système
        </Typography>
        {settingsChanged && (
          <Chip 
            label="Modifications non sauvegardées" 
            color="warning" 
            icon={<Warning />}
          />
        )}
      </Box>

      {notification.open && (
        <Alert 
          severity={notification.severity} 
          sx={{ mb: 2 }}
          onClose={hideNotification}
        >
          {notification.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Paramètres système */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <Settings />
              </Avatar>
              <Typography variant="h6">
                Configuration générale
              </Typography>
            </Box>
            
            <TextField
              fullWidth
              label="Nom du système"
              value={settings.systemName}
              onChange={(e) => handleSettingsChange('systemName', e.target.value)}
              margin="normal"
              error={!!validationErrors.systemName}
              helperText={validationErrors.systemName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Langue</InputLabel>
              <Select
                value={settings.language}
                onChange={(e) => handleSettingsChange('language', e.target.value)}
                label="Langue"
                startAdornment={<Language sx={{ mr: 1 }} />}
              >
                <MenuItem value="fr">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    🇫🇷 Français
                  </Box>
                </MenuItem>
                <MenuItem value="ar">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    🇩🇿 العربية
                  </Box>
                </MenuItem>
                <MenuItem value="en">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    🇺🇸 English
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Thème</InputLabel>
              <Select
                value={settings.theme}
                onChange={(e) => handleSettingsChange('theme', e.target.value)}
                label="Thème"
                startAdornment={<Palette sx={{ mr: 1 }} />}
              >
                <MenuItem value="light">☀️ Clair</MenuItem>
                <MenuItem value="dark">🌙 Sombre</MenuItem>
                <MenuItem value="auto">⚡ Automatique</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Délai d'expiration de session (minutes)"
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => handleSettingsChange('sessionTimeout', parseInt(e.target.value))}
              margin="normal"
              inputProps={{ min: 5, max: 120 }}
              error={!!validationErrors.sessionTimeout}
              helperText={validationErrors.sessionTimeout || "Entre 5 et 120 minutes"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Schedule />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Politique de mot de passe</InputLabel>
              <Select
                value={settings.passwordPolicy}
                onChange={(e) => handleSettingsChange('passwordPolicy', e.target.value)}
                label="Politique de mot de passe"
                startAdornment={<Shield sx={{ mr: 1 }} />}
              >
                <MenuItem value="basic">
                  <Box>
                    <Typography>Basique</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getPasswordPolicyDescription('basic')}
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="standard">
                  <Box>
                    <Typography>Standard</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getPasswordPolicyDescription('standard')}
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="strong">
                  <Box>
                    <Typography>Renforcé</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getPasswordPolicyDescription('strong')}
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingsChange('emailNotifications', e.target.checked)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Notifications sx={{ mr: 1 }} />
                  Notifications par email
                </Box>
              }
              sx={{ mt: 2 }}
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSaveSettings}
                disabled={!settingsChanged || saving || Object.keys(validationErrors).length > 0}
              >
                {saving ? 'Sauvegarde...' : 'Enregistrer les paramètres'}
              </Button>
              
              {settingsChanged && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSettings({
                      systemName: 'SA Management',
                      language: 'fr',
                      theme: 'light',
                      sessionTimeout: 30,
                      passwordPolicy: 'standard',
                      emailNotifications: true
                    });
                    setValidationErrors({});
                  }}
                >
                  Annuler les modifications
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Paramètres utilisateur */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            {/* Profil utilisateur */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                      <Person />
                    </Avatar>
                    <Typography variant="h6">
                      Profil utilisateur
                    </Typography>
                  </Box>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <AccountCircle />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Nom complet"
                        secondary={`${user?.prenom_user} ${user?.nom_user}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Email />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Email"
                        secondary={user?.email}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Security />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Rôle"
                        secondary={user?.role?.libelle}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Actions de sécurité */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                      <VpnKey />
                    </Avatar>
                    <Typography variant="h6">
                      Sécurité
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Email />}
                      onClick={() => setOpenEmailDialog(true)}
                      sx={{ mb: 1 }}
                    >
                      Modifier l'email
                    </Button>
                    
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Lock />}
                      onClick={() => setOpenPasswordDialog(true)}
                    >
                      Changer le mot de passe
                    </Button>
                  </Box>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="caption">
                      Compte créé le {new Date(user?.created_at).toLocaleDateString('fr-FR')}
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Dialog changement email */}
      <Dialog open={openEmailDialog} onClose={() => setOpenEmailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Email sx={{ mr: 1 }} />
            Modifier l'adresse email
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={emailStep} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>Saisie</StepLabel>
            </Step>
            <Step>
              <StepLabel>Envoi</StepLabel>
            </Step>
            <Step>
              <StepLabel>Confirmation</StepLabel>
            </Step>
          </Stepper>

          {emailStep === 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Envoi en cours...</Typography>
            </Box>
          )}

          {emailStep === 2 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography>
                Email de confirmation envoyé ! Vérifiez votre boîte de réception.
              </Typography>
            </Alert>
          )}

          {emailStep === 0 && (
            <>
              <TextField
                fullWidth
                label="Adresse email actuelle"
                value={user?.email}
                disabled
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Nouvelle adresse email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                margin="normal"
                required
                error={!!validationErrors.newEmail}
                helperText={validationErrors.newEmail}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Confirmer la nouvelle adresse"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                margin="normal"
                required
                error={!!validationErrors.confirmEmail}
                helperText={validationErrors.confirmEmail}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenEmailDialog(false);
            setEmailStep(0);
            setNewEmail('');
            setConfirmEmail('');
            setValidationErrors({});
          }}>
            {emailStep === 2 ? 'Fermer' : 'Annuler'}
          </Button>
          {emailStep === 0 && (
            <Button 
              onClick={handleChangeEmail} 
              variant="contained"
              disabled={!newEmail || !confirmEmail}
            >
              Confirmer
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog changement mot de passe */}
      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Lock sx={{ mr: 1 }} />
            Changer le mot de passe
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Politique actuelle: {getPasswordPolicyDescription(settings.passwordPolicy)}
            </Typography>
          </Alert>

          <TextField
            fullWidth
            label="Mot de passe actuel"
            type={showPassword.current ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
            required
            error={!!validationErrors.currentPassword}
            helperText={validationErrors.currentPassword}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(prev => ({...prev, current: !prev.current}))}
                    edge="end"
                  >
                    {showPassword.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Nouveau mot de passe"
            type={showPassword.new ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            required
            error={!!validationErrors.newPassword}
            helperText={validationErrors.newPassword}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <VpnKey />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(prev => ({...prev, new: !prev.new}))}
                    edge="end"
                  >
                    {showPassword.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {newPassword && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  Force du mot de passe:
                </Typography>
                <Chip 
                  label={getPasswordStrengthText()} 
                  color={getPasswordStrengthColor()}
                  size="small"
                />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(passwordStrength / 6) * 100}
                color={getPasswordStrengthColor()}
              />
            </Box>
          )}

          <TextField
            fullWidth
            label="Confirmer le nouveau mot de passe"
            type={showPassword.confirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
            error={!!validationErrors.confirmPassword}
            helperText={validationErrors.confirmPassword}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <VpnKey />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(prev => ({...prev, confirm: !prev.confirm}))}
                    edge="end"
                  >
                    {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenPasswordDialog(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setValidationErrors({});
          }}>
            Annuler
          </Button>
          <Button 
            onClick={handleChangePassword} 
            variant="contained"
            disabled={!currentPassword || !newPassword || !confirmPassword || Object.keys(validationErrors).length > 0}
          >
            Modifier
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <Warning color="warning" sx={{ mr: 1 }} />
          {confirmAction?.title}
        </DialogTitle>
        <DialogContent>
          <Typography id="confirm-dialog-description">
            {confirmAction?.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={async () => {
              setOpenConfirmDialog(false);
              if (confirmAction?.action) {
                await confirmAction.action();
              }
              setConfirmAction(null);
            }} 
            color="warning" 
            variant="contained"
            autoFocus
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default SettingsPage;