import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import { 
  People, 
  PersonAdd, 
  Security, 
  CheckCircle,
  Info,
  Warning,
  Error as ErrorIcon,
  Assignment
} from '@mui/icons-material';
import AdminLayout from '../../components/Layout/AdminLayout';
import { adminService } from '../../services/adminService';
import { useNotification } from '../../hooks/useNotification';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activationDialog, setActivationDialog] = useState({
    open: false,
    user: null,
    selectedRoleId: ''
  });
  const { notification, showNotification } = useNotification();

  useEffect(() => {
    loadDashboardData();
    loadRoles();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('Chargement du dashboard...');
      const data = await adminService.getDashboard();
      console.log('Données reçues:', data);
      setDashboardData(data);
    } catch (error) {
      console.error('Erreur complète:', error);
      if (error.response?.status === 401) {
        showNotification('Session expirée, veuillez vous reconnecter', 'error');
      } else if (error.response?.status === 403) {
        showNotification('Accès refusé', 'error');
      } else {
        showNotification('Erreur lors du chargement du tableau de bord', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const rolesData = await adminService.getRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
    }
  };

  const handleOpenActivationDialog = (user) => {
    setActivationDialog({
      open: true,
      user,
      selectedRoleId: ''
    });
  };

  const handleCloseActivationDialog = () => {
    setActivationDialog({
      open: false,
      user: null,
      selectedRoleId: ''
    });
  };

  const handleRoleSelection = (roleId) => {
    setActivationDialog(prev => ({
      ...prev,
      selectedRoleId: roleId
    }));
  };

  const confirmActivation = async () => {
    try {
      await adminService.activateUser(activationDialog.user.id, {
        role_id: activationDialog.selectedRoleId
      });
      showNotification('Utilisateur activé avec rôle assigné avec succès', 'success');
      loadDashboardData();
      handleCloseActivationDialog();
    } catch (error) {
      showNotification('Erreur lors de l\'activation', 'error');
      handleCloseActivationDialog();
    }
  };

  const getStatusChip = (user) => {
    if (!user.email_verified_at) {
      return <Chip label="Email non vérifié" color="warning" size="small" />;
    }
    if (!user.activer_compte) {
      return <Chip label="Inactif" color="error" size="small" />;
    }
    if (!user.role_id) {
      return <Chip label="Aucun rôle" color="default" size="small" />;
    }
    return <Chip label="Actif" color="success" size="small" />;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Skeleton pour les cartes de statistiques
  const StatCardSkeleton = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Skeleton pour le tableau
  const TableSkeleton = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Utilisateur</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(5)].map((_, index) => (
            <TableRow key={index}>
              <TableCell><Skeleton variant="text" /></TableCell>
              <TableCell><Skeleton variant="text" /></TableCell>
              <TableCell><Skeleton variant="text" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Empty state pour les activités récentes
  const EmptyActivitiesState = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Info sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Aucune activité récente
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Les nouvelles activités apparaîtront ici
      </Typography>
    </Box>
  );

  return (
    <AdminLayout>
      <Typography variant="h4" gutterBottom>
        Tableau de bord
      </Typography>

      {notification.open && (
        <Alert severity={notification.severity} sx={{ mb: 2 }}>
          {notification.message}
        </Alert>
      )}

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <StatCardSkeleton />
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Nombre total d'utilisateurs inscrits">
                    <People color="primary" sx={{ mr: 2 }} />
                  </Tooltip>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Utilisateurs
                    </Typography>
                    <Typography variant="h5">
                      {dashboardData?.stats.total_users || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <StatCardSkeleton />
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Utilisateurs en attente d'activation par l'administrateur">
                    <PersonAdd color="warning" sx={{ mr: 2 }} />
                  </Tooltip>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      En attente d'activation
                    </Typography>
                    <Typography variant="h5">
                      {dashboardData?.stats.pending_activations || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <StatCardSkeleton />
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Utilisateurs avec compte activé et rôle assigné">
                    <CheckCircle color="success" sx={{ mr: 2 }} />
                  </Tooltip>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Utilisateurs actifs
                    </Typography>
                    <Typography variant="h5">
                      {dashboardData?.stats.active_users || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <StatCardSkeleton />
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Nombre de rôles configurés dans le système">
                    <Security color="info" sx={{ mr: 2 }} />
                  </Tooltip>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Rôles configurés
                    </Typography>
                    <Typography variant="h5">
                      {dashboardData?.stats.roles_count || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Activités récentes */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activités récentes
              </Typography>
              {loading ? (
                <TableSkeleton />
              ) : dashboardData?.recent_users?.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Utilisateur</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.recent_users.slice(0, 5).map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            {user.prenom_user} {user.nom_user}
                          </TableCell>
                          <TableCell>Compte créé</TableCell>
                          <TableCell>
                            {formatDateTime(user.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <EmptyActivitiesState />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Utilisateurs non actifs
              </Typography>
              {loading ? (
                <Box>
                  {[...Array(3)].map((_, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Skeleton variant="text" width="70%" />
                      <Skeleton variant="text" width="90%" />
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                        <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 3 }} />
                        <Skeleton variant="rectangular" width={60} height={32} sx={{ ml: 1, borderRadius: 1 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : dashboardData?.recent_users?.filter(user => !user.activer_compte).length > 0 ? (
                dashboardData.recent_users.filter(user => !user.activer_compte).map((user) => (
                  <Box key={user.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="subtitle2">
                      {user.prenom_user} {user.nom_user}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {getStatusChip(user)}
                      {user.email_verified_at && !user.activer_compte && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          sx={{ ml: 1 }}
                          startIcon={<Assignment />}
                          onClick={() => handleOpenActivationDialog(user)}
                        >
                          Activer & Assigner rôle
                        </Button>
                      )}
                    </Box>
                  </Box>
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Tous les utilisateurs sont actifs
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog d'activation avec sélection de rôle */}
      <Dialog
        open={activationDialog.open}
        onClose={handleCloseActivationDialog}
        aria-labelledby="activation-dialog-title"
        aria-describedby="activation-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="activation-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <Assignment color="success" sx={{ mr: 1 }} />
          Activer l'utilisateur et assigner un rôle
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="activation-dialog-description" sx={{ mb: 3 }}>
            Vous êtes sur le point d'activer le compte de{' '}
            <strong>{activationDialog.user?.prenom_user} {activationDialog.user?.nom_user}</strong>{' '}
            ({activationDialog.user?.email}).
          </DialogContentText>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              L'activation du compte nécessite l'assignation d'un rôle. 
              Veuillez sélectionner le rôle approprié pour cet utilisateur.
            </Typography>
          </Alert>

          <FormControl fullWidth required>
            <InputLabel>Sélectionner un rôle</InputLabel>
            <Select
              value={activationDialog.selectedRoleId}
              label="Sélectionner un rôle"
              onChange={(e) => handleRoleSelection(e.target.value)}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActivationDialog} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={confirmActivation} 
            color="success" 
            variant="contained" 
            disabled={!activationDialog.selectedRoleId}
            startIcon={<CheckCircle />}
            autoFocus
          >
            Activer avec ce rôle
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDashboard;