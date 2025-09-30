import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Alert,
  Tabs,
  Tab,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Grid,
  Card,
  CardContent,
  Fab
} from '@mui/material';
import { 
  Edit, 
  Delete, 
  Add as AddIcon, 
  Security,
  Person,
  AdminPanelSettings,
  SupervisorAccount,
  Assignment,
  People
} from '@mui/icons-material';
import AdminLayout from '../../components/Layout/AdminLayout';
import { adminService } from '../../services/adminService';
import { useNotification } from '../../hooks/useNotification';

const RolesManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    libelle: '',
    description: ''
  });
  const { notification, showNotification, hideNotification } = useNotification();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, rolesData] = await Promise.all([
        adminService.getUsers(),
        adminService.getRoles()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      showNotification('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getUsersByRole = (roleId) => {
    return users.filter(user => user.role_id === roleId);
  };

  const getRoleColor = (roleLibelle) => {
    switch (roleLibelle) {
      case 'Administrateur Informatique':
        return 'primary';
      case 'Responsable UPAS':
        return 'success';
      case 'Reception':
        return 'warning';
      case 'Gestionnaire de Stock':
        return 'info';
      case 'Bénéficiaire':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getRoleIcon = (roleLibelle) => {
    switch (roleLibelle) {
      case 'Administrateur Informatique':
        return <AdminPanelSettings />;
      case 'Responsable UPAS':
        return <SupervisorAccount />;
      case 'Reception':
        return <Assignment />;
      case 'Gestionnaire de Stock':
        return <Security />;
      case 'Bénéficiaire':
        return <Person />;
      default:
        return <People />;
    }
  };

  const handleOpenRoleDialog = (role = null) => {
    if (role) {
      setSelectedRole(role);
      setFormData({
        libelle: role.libelle,
        description: role.description || ''
      });
    } else {
      setSelectedRole(null);
      setFormData({
        libelle: '',
        description: ''
      });
    }
    setOpenRoleDialog(true);
  };

  const handleCloseRoleDialog = () => {
    setOpenRoleDialog(false);
    setSelectedRole(null);
    setFormData({
      libelle: '',
      description: ''
    });
  };

  const handleSubmitRole = async () => {
    try {
      if (selectedRole) {
        // Modification d'un rôle existant
        await adminService.updateRole(selectedRole.id, formData);
        showNotification('Rôle modifié avec succès', 'success');
      } else {
        // Création d'un nouveau rôle
        await adminService.createRole(formData);
        showNotification('Rôle créé avec succès', 'success');
      }
      
      loadData();
      handleCloseRoleDialog();
    } catch (error) {
      showNotification(
        error.response?.data?.message || 'Erreur lors de la sauvegarde', 
        'error'
      );
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce rôle ? Cette action est irréversible.')) {
      try {
        await adminService.deleteRole(roleId);
        showNotification('Rôle supprimé avec succès', 'success');
        loadData();
      } catch (error) {
        showNotification('Erreur lors de la suppression', 'error');
      }
    }
  };

  const canDeleteRole = (role) => {
    // Empêcher la suppression des rôles système critiques
    const systemRoles = ['Administrateur Informatique'];
    return !systemRoles.includes(role.libelle) && getUsersByRole(role.id).length === 0;
  };

  if (loading) {
    return (
      <AdminLayout>
        <Typography>Chargement...</Typography>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Gestion des Rôles
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenRoleDialog()}
        >
          Ajouter un rôle
        </Button>
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

      {/* Vue d'ensemble des rôles */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {roles.map((role) => (
          <Grid item xs={12} sm={6} md={4} key={role.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: `${getRoleColor(role.libelle)}.main`, mr: 2 }}>
                    {getRoleIcon(role.libelle)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" noWrap>
                      {role.libelle}
                    </Typography>
                    <Chip 
                      label={`${getUsersByRole(role.id).length} utilisateur(s)`}
                      size="small"
                      color={getRoleColor(role.libelle)}
                      variant="outlined"
                    />
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {role.description || 'Aucune description'}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  
                  
                  {canDeleteRole(role) && (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteRole(role.id)}
                    >
                      Supprimer
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tableau détaillé des rôles */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Liste détaillée des rôles
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rôle</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Nombre d'utilisateurs</TableCell>
                  <TableCell>Date de création</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: `${getRoleColor(role.libelle)}.main`, mr: 2, width: 32, height: 32 }}>
                          {getRoleIcon(role.libelle)}
                        </Avatar>
                        <Chip 
                          label={role.libelle} 
                          color={getRoleColor(role.libelle)}
                          variant="outlined" 
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {role.description || 'Aucune description'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getUsersByRole(role.id).length}
                        size="small"
                        color={getUsersByRole(role.id).length > 0 ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(role.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        
                        
                        {canDeleteRole(role) && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRole(role.id)}
                          >
                            <Delete />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Utilisateurs par rôle */}
      <Paper>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
        >
          {roles.map((role, index) => (
            <Tab 
              key={role.id} 
              label={`${role.libelle} (${getUsersByRole(role.id).length})`}
              icon={getRoleIcon(role.libelle)}
            />
          ))}
        </Tabs>

        {roles.map((role, index) => (
          <Box 
            key={role.id}
            sx={{ 
              display: tabValue === index ? 'block' : 'none',
              p: 2 
            }}
          >
            <Typography variant="h6" gutterBottom>
              Utilisateurs avec le rôle: {role.libelle}
            </Typography>
            
            {role.description && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Description du rôle:</strong> {role.description}
              </Alert>
            )}
            
            {getUsersByRole(role.id).length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                Aucun utilisateur assigné à ce rôle.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Utilisateur</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Date de création</TableCell>
                      <TableCell>Dernière connexion</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getUsersByRole(role.id).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              {user.prenom_user[0]}{user.nom_user[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">
                                {user.prenom_user} {user.nom_user}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                ID: {user.id}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.activer_compte && user.email_verified_at ? (
                            <Chip label="Actif" color="success" size="small" />
                          ) : !user.email_verified_at ? (
                            <Chip label="Email non vérifié" color="warning" size="small" />
                          ) : (
                            <Chip label="Inactif" color="error" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          {user.updated_at ? 
                            new Date(user.updated_at).toLocaleDateString('fr-FR') : 
                            'Jamais connecté'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ))}
      </Paper>

      {/* Dialog pour ajouter/modifier un rôle */}
      <Dialog open={openRoleDialog} onClose={handleCloseRoleDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedRole ? 'Modifier le rôle' : 'Ajouter un nouveau rôle'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="libelle"
            label="Nom du rôle"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.libelle}
            onChange={(e) => setFormData(prev => ({ ...prev, libelle: e.target.value }))}
            required
            helperText="Nom unique du rôle (ex: Gestionnaire de Campagne)"
          />
          <TextField
            margin="dense"
            id="description"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            helperText="Description détaillée des responsabilités du rôle"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoleDialog}>Annuler</Button>
          <Button 
            onClick={handleSubmitRole} 
            variant="contained"
            disabled={!formData.libelle.trim()}
          >
            {selectedRole ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bouton flottant pour ajouter rapidement */}
      <Fab
        color="primary"
        aria-label="add role"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => handleOpenRoleDialog()}
      >
        <AddIcon />
      </Fab>
    </AdminLayout>
  );
};

export default RolesManagement;