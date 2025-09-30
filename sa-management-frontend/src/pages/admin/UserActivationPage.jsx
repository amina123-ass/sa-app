// UserActivationPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Divider,
  Chip,
  Avatar,
  Paper,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  LocationOn,
  Security,
  CheckCircle,
  Assignment,
  AccountCircle,
  AdminPanelSettings,
  Warning,
  CalendarToday
} from '@mui/icons-material';
import { adminService } from '../../services/adminService';

const UserActivationPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => {
    loadUserAndRoles();
  }, [userId]);

  const loadUserAndRoles = async () => {
    try {
      setLoading(true);
      
      // Charger les informations de l'utilisateur et les rôles en parallèle
      const [userData, rolesData] = await Promise.all([
        adminService.getUsers().then(users => users.find(u => u.id === parseInt(userId))),
        adminService.getRoles()
      ]);

      if (!userData) {
        setError('Utilisateur non trouvé');
        return;
      }

      setUser(userData);
      setRoles(rolesData);

      // Si l'utilisateur est déjà activé
      if (userData.activer_compte) {
        setSuccess('Cet utilisateur est déjà activé avec le rôle : ' + (userData.role?.libelle || 'Non défini'));
      }

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setError('Erreur lors du chargement des données');
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

      const response = await adminService.activateUser(userId, {
        role_id: selectedRoleId
      });

      console.log('Réponse activation:', response);

      setSuccess('Utilisateur activé avec succès ! Un email de confirmation a été envoyé.');
      
      // Recharger les données de l'utilisateur
      await loadUserAndRoles();
      
      setConfirmDialog(false);

    } catch (error) {
      console.error('Erreur activation:', error);
      setError('Erreur lors de l\'activation : ' + (error.response?.data?.message || error.message));
    } finally {
      setActivating(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Non défini';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (user) => {
    if (!user.email_verified_at) {
      return {
        status: 'Email non vérifié',
        color: 'warning',
        icon: <Warning />,
        canActivate: false
      };
    }
    if (user.activer_compte) {
      return {
        status: 'Compte activé',
        color: 'success',
        icon: <CheckCircle />,
        canActivate: false
      };
    }
    return {
      status: 'En attente d\'activation',
      color: 'error',
      icon: <Assignment />,
      canActivate: true
    };
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Chargement des informations...
        </Typography>
      </Container>
    );
  }

  if (error && !user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/admin/users')}>
          Retour à la liste des utilisateurs
        </Button>
      </Container>
    );
  }

  const statusInfo = getStatusInfo(user);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AdminPanelSettings sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" component="h1">
              Activation de compte utilisateur
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Système de gestion UPAS - Interface Administrateur
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Informations utilisateur */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}>
              <AccountCircle sx={{ fontSize: 40 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" gutterBottom>
                {user.prenom_user} {user.nom_user}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Chip
                  icon={statusInfo.icon}
                  label={statusInfo.status}
                  color={statusInfo.color}
                  size="small"
                />
                {user.role && (
                  <Chip
                    icon={<Security />}
                    label={user.role.libelle}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Détails utilisateur */}
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Person sx={{ mr: 1 }} />
            Détails de l'utilisateur
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Email sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Adresse email
                </Typography>
                <Typography variant="body1">
                  {user.email}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Phone sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Téléphone
                </Typography>
                <Typography variant="body1">
                  {user.tel_user || 'Non renseigné'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Adresse
                </Typography>
                <Typography variant="body1">
                  {user.adresse_user || 'Non renseignée'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Date d'inscription
                </Typography>
                <Typography variant="body1">
                  {formatDateTime(user.created_at)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Statut de vérification */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              Statut de vérification
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle 
                  sx={{ mr: 1, color: user.email_verified_at ? 'success.main' : 'grey.400' }} 
                />
                <Typography variant="body2">
                  Email vérifié : {user.email_verified_at ? formatDateTime(user.email_verified_at) : 'Non vérifié'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle 
                  sx={{ mr: 1, color: user.activer_compte ? 'success.main' : 'grey.400' }} 
                />
                <Typography variant="body2">
                  Compte activé : {user.activer_compte ? 'Oui' : 'Non'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </CardContent>
      </Card>

      {/* Section d'activation */}
      {statusInfo.canActivate && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Assignment sx={{ mr: 1 }} />
              Activation du compte
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Pour activer ce compte, vous devez assigner un rôle à l'utilisateur. 
                Le rôle détermine les permissions et l'accès dans le système.
              </Typography>
            </Alert>

            <FormControl fullWidth required sx={{ mb: 3 }}>
              <InputLabel>Sélectionner un rôle</InputLabel>
              <Select
                value={selectedRoleId}
                label="Sélectionner un rôle"
                onChange={(e) => setSelectedRoleId(e.target.value)}
                startAdornment={<Security sx={{ mr: 1, color: 'text.secondary' }} />}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    <Box>
                      <Typography variant="body1">{role.libelle}</Typography>
                      {role.description && (
                        <Typography variant="body2" color="text.secondary">
                          {role.description}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Le rôle détermine les permissions et l'accès de l'utilisateur dans le système
              </FormHelperText>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/admin/users')}
                disabled={activating}
              >
                Annuler
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => setConfirmDialog(true)}
                disabled={!selectedRoleId || activating}
                startIcon={activating ? <CircularProgress size={20} /> : <CheckCircle />}
              >
                {activating ? 'Activation en cours...' : 'Activer le compte'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Utilisateur déjà activé */}
      {user.activer_compte && (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Compte déjà activé
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Cet utilisateur a déjà un compte activé avec le rôle :{' '}
                <strong>{user.role?.libelle || 'Non défini'}</strong>
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate('/admin/users')}
                sx={{ mt: 2 }}
              >
                Retour à la liste des utilisateurs
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmation */}
      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        aria-labelledby="confirmation-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="confirmation-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <Assignment color="success" sx={{ mr: 1 }} />
          Confirmer l'activation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vous êtes sur le point d'activer le compte de{' '}
            <strong>{user.prenom_user} {user.nom_user}</strong> avec le rôle{' '}
            <strong>{roles.find(r => r.id === selectedRoleId)?.libelle}</strong>.
          </DialogContentText>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Un email de confirmation sera automatiquement envoyé à l'utilisateur 
              avec ses identifiants de connexion si nécessaire.
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
            {activating ? 'Activation...' : 'Confirmer l\'activation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserActivationPage;