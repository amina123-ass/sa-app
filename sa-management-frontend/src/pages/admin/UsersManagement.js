import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  IconButton,
  Grid,
  Alert,
  Skeleton,
  Tooltip,
  InputAdornment,
  TablePagination,
  Avatar,
  FormHelperText,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { 
  Edit, 
  Delete, 
  PersonAdd, 
  Search,
  Email,
  Phone,
  LocationOn,
  Security,
  Person,
  Warning,
  CheckCircle,
  Cancel,
  Block,
  AccountCircle,
  Save,
  Close
} from '@mui/icons-material';
import AdminLayout from '../../components/Layout/AdminLayout';
import { adminService } from '../../services/adminService';
import { useNotification } from '../../hooks/useNotification';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // État pour gérer les modifications de rôles en attente
  const [pendingRoleChanges, setPendingRoleChanges] = useState({});
  
  const [formData, setFormData] = useState({
    nom_user: '',
    prenom_user: '',
    email: '',
    tel_user: '',
    adresse_user: '',
    password: '',
    role_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const { notification, showNotification, hideNotification } = useNotification();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, tabValue, searchTerm]);

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

  const filterUsers = () => {
    let filtered = users;
    
    // Filtrage par onglet
    switch (tabValue) {
      case 1: // Actifs
        filtered = users.filter(user => user.activer_compte && user.email_verified_at);
        break;
      case 2: // Inactifs
        filtered = users.filter(user => !user.activer_compte || !user.email_verified_at);
        break;
      default: // Tous
        break;
    }

    // Filtrage par recherche
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.prenom_user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.nom_user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.tel_user && user.tel_user.includes(searchTerm))
      );
    }
    
    setFilteredUsers(filtered);
    setPage(0); // Reset to first page when filtering
  };

  // Pagination des utilisateurs
  const paginatedUsers = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredUsers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.prenom_user.trim()) {
      errors.prenom_user = 'Le prénom est requis';
    }
    
    if (!formData.nom_user.trim()) {
      errors.nom_user = 'Le nom est requis';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Format d\'email invalide';
    }
    
    if (!selectedUser && !formData.password.trim()) {
      errors.password = 'Le mot de passe est requis pour un nouvel utilisateur';
    } else if (!selectedUser && formData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (!formData.role_id) {
      errors.role_id = 'Un rôle doit être sélectionné';
    }
    
    if (formData.tel_user && !/^[0-9+\-\s()]+$/.test(formData.tel_user)) {
      errors.tel_user = 'Format de téléphone invalide';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        nom_user: user.nom_user,
        prenom_user: user.prenom_user,
        email: user.email,
        tel_user: user.tel_user || '',
        adresse_user: user.adresse_user || '',
        password: '',
        role_id: user.role_id || ''
      });
    } else {
      setSelectedUser(null);
      setFormData({
        nom_user: '',
        prenom_user: '',
        email: '',
        tel_user: '',
        adresse_user: '',
        password: '',
        role_id: ''
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormErrors({});
  };

  const handleOpenDeleteDialog = (user) => {
    setUserToDelete(user);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setUserToDelete(null);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (selectedUser) {
        await adminService.updateUser(selectedUser.id, formData);
        showNotification('Utilisateur modifié avec succès', 'success');
      } else {
        await adminService.createUser(formData);
        showNotification('Utilisateur créé avec succès', 'success');
      }
      loadData();
      handleCloseDialog();
    } catch (error) {
      showNotification(error.response?.data?.message || error.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleActivateUser = async (userId) => {
    try {
      // Récupérer l'utilisateur pour obtenir son role_id actuel
      const user = users.find(u => u.id === userId);
      
      // Passer un objet avec les données d'activation incluant le role_id
      const activationData = {
        activer_compte: true,
        activation_admin: true
      };
      
      // Ajouter le role_id s'il existe déjà
      if (user && user.role_id) {
        activationData.role_id = user.role_id;
      }
      
      await adminService.activateUser(userId, activationData);
      showNotification('Utilisateur activé avec succès', 'success');
      loadData();
    } catch (error) {
      showNotification(error.message || 'Erreur lors de l\'activation', 'error');
    }
  };

  const handleDeactivateUser = async (userId) => {
    try {
      await adminService.deactivateUser(userId);
      showNotification('Utilisateur désactivé avec succès', 'success');
      loadData();
    } catch (error) {
      showNotification(error.message || 'Erreur lors de la désactivation', 'error');
    }
  };

  // Fonction pour gérer le changement de rôle temporaire
  const handleRoleChange = (userId, newRoleId) => {
    setPendingRoleChanges(prev => ({
      ...prev,
      [userId]: newRoleId
    }));
  };

  // CORRECTION: Fonction pour sauvegarder le changement de rôle
  const handleSaveRoleChange = async (userId) => {
    const newRoleId = pendingRoleChanges[userId];
    if (newRoleId === undefined) return;

    try {
      // CORRECTION: Passer un objet roleData au lieu de l'ID directement
      const roleData = {
        role_id: newRoleId
      };
      
      await adminService.assignRole(userId, roleData);
      showNotification('Rôle assigné avec succès', 'success');
      
      // Supprimer le changement en attente
      setPendingRoleChanges(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      
      loadData();
    } catch (error) {
      console.error('Erreur lors de l\'assignation du rôle:', error);
      showNotification(error.message || 'Erreur lors de l\'assignation du rôle', 'error');
    }
  };

  // Fonction pour annuler le changement de rôle
  const handleCancelRoleChange = (userId) => {
    setPendingRoleChanges(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  };

  // Fonction pour obtenir le rôle actuel (avec changements en attente)
  const getCurrentRoleId = (user) => {
    return pendingRoleChanges[user.id] !== undefined 
      ? pendingRoleChanges[user.id] 
      : user.role_id || '';
  };

  // Fonction pour vérifier s'il y a un changement en attente
  const hasPendingChange = (userId) => {
    return pendingRoleChanges[userId] !== undefined;
  };

  const handleDeleteUser = async () => {
    try {
      await adminService.deleteUser(userToDelete.id);
      showNotification('Utilisateur supprimé avec succès', 'success');
      loadData();
      handleCloseDeleteDialog();
    } catch (error) {
      showNotification(error.message || 'Erreur lors de la suppression', 'error');
      handleCloseDeleteDialog();
    }
  };

  const getStatusChip = (user) => {
    if (!user.email_verified_at) {
      return (
        <Tooltip title="L'utilisateur n'a pas encore vérifié son email">
          <Chip 
            label="Email non vérifié" 
            color="warning" 
            size="small" 
            icon={<Email />}
          />
        </Tooltip>
      );
    }
    if (!user.activer_compte) {
      return (
        <Tooltip title="Compte désactivé par l'administrateur">
          <Chip 
            label="Inactif" 
            color="error" 
            size="small" 
            icon={<Block />}
          />
        </Tooltip>
      );
    }
    if (!user.role_id) {
      return (
        <Tooltip title="Aucun rôle assigné">
          <Chip 
            label="Aucun rôle" 
            color="default" 
            size="small" 
            icon={<Security />}
          />
        </Tooltip>
      );
    }
    return (
      <Tooltip title="Utilisateur actif avec rôle assigné">
        <Chip 
          label="Actif" 
          color="success" 
          size="small" 
          icon={<CheckCircle />}
        />
      </Tooltip>
    );
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.libelle : 'Aucun rôle';
  };

  // Skeletons pour le chargement
  const TableSkeleton = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Rôle</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Date création</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(5)].map((_, index) => (
            <TableRow key={index}>
              <TableCell><Skeleton variant="text" /></TableCell>
              <TableCell><Skeleton variant="text" /></TableCell>
              <TableCell><Skeleton variant="text" /></TableCell>
              <TableCell><Skeleton variant="text" /></TableCell>
              <TableCell><Skeleton variant="text" /></TableCell>
              <TableCell><Skeleton variant="text" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const StatsSkeleton = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {[...Array(3)].map((_, index) => (
        <Grid item xs={12} sm={4} key={index}>
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
        </Grid>
      ))}
    </Grid>
  );

  if (loading) {
    return (
      <AdminLayout>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="rectangular" width={200} height={36} />
        </Box>
        
        <StatsSkeleton />
        
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Skeleton variant="text" width="100%" height={48} />
          </Box>
          <TableSkeleton />
        </Paper>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Gestion des Utilisateurs
        </Typography>
        <Tooltip title="Ajouter un nouvel utilisateur">
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => handleOpenDialog()}
          >
            Ajouter un utilisateur
          </Button>
        </Tooltip>
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

      {/* Statistiques rapides */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Person />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Utilisateurs
                  </Typography>
                  <Typography variant="h5">
                    {users.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Utilisateurs Actifs
                  </Typography>
                  <Typography variant="h5">
                    {users.filter(u => u.activer_compte && u.email_verified_at).length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Warning />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    En Attente
                  </Typography>
                  <Typography variant="h5">
                    {users.filter(u => !u.activer_compte || !u.email_verified_at).length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Barre de recherche */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher par nom, prénom, email ou téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        {searchTerm && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {filteredUsers.length} résultat(s) trouvé(s) pour "{searchTerm}"
          </Typography>
        )}
      </Paper>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`Tous (${users.length})`} />
          <Tab label={`Actifs (${users.filter(u => u.activer_compte && u.email_verified_at).length})`} />
          <Tab label={`Inactifs (${users.filter(u => !u.activer_compte || !u.email_verified_at).length})`} />
        </Tabs>

        {filteredUsers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AccountCircle sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchTerm ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur dans cette catégorie'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm 
                ? 'Essayez de modifier votre recherche'
                : 'Les utilisateurs apparaîtront ici une fois ajoutés'
              }
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Utilisateur</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Date création</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Tooltip title={`${user.prenom_user} ${user.nom_user}`}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              {user.prenom_user[0]}{user.nom_user[0]}
                            </Avatar>
                          </Tooltip>
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
                      <TableCell>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Email sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">{user.email}</Typography>
                          </Box>
                          {user.tel_user && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Phone sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2">{user.tel_user}</Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                              value={getCurrentRoleId(user)}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              displayEmpty
                              variant={hasPendingChange(user.id) ? 'outlined' : 'standard'}
                              sx={{
                                bgcolor: hasPendingChange(user.id) ? 'warning.light' : 'transparent',
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: hasPendingChange(user.id) ? 'warning.main' : undefined,
                                }
                              }}
                            >
                              <MenuItem value="">
                                <em>Aucun rôle</em>
                              </MenuItem>
                              {roles.map((role) => (
                                <MenuItem key={role.id} value={role.id}>
                                  {role.libelle}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          
                          {hasPendingChange(user.id) && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Enregistrer le changement de rôle">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleSaveRoleChange(user.id)}
                                >
                                  <Save fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Annuler le changement">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleCancelRoleChange(user.id)}
                                >
                                  <Close fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                        
                        {hasPendingChange(user.id) && (
                          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                            Changement en attente
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusChip(user)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(user.created_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          
                          
                          {user.activer_compte ? (
                            <Tooltip title="Désactiver le compte">
                              <Button
                                size="small"
                                color="warning"
                                onClick={() => handleDeactivateUser(user.id)}
                                startIcon={<Block />}
                              >
                                Désactiver
                              </Button>
                            </Tooltip>
                          ) : (
                            <Tooltip title={!user.email_verified_at ? "L'email doit être vérifié avant l'activation" : "Activer le compte"}>
                              <span>
                                <Button
                                  size="small"
                                  color="success"
                                  onClick={() => handleActivateUser(user.id)}
                                  disabled={!user.email_verified_at}
                                  startIcon={<CheckCircle />}
                                >
                                  Activer
                                </Button>
                              </span>
                            </Tooltip>
                          )}
                          
                          <Tooltip title="Supprimer définitivement">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteDialog(user)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            <TablePagination
              component="div"
              count={filteredUsers.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Lignes par page:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
              }
            />
          </>
        )}
      </Paper>

      {/* Dialog pour ajouter/modifier un utilisateur */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Modifier l\'utilisateur' : 'Ajouter un nouvel utilisateur'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prénom"
                value={formData.prenom_user}
                onChange={(e) => setFormData(prev => ({ ...prev, prenom_user: e.target.value }))}
                required
                error={!!formErrors.prenom_user}
                helperText={formErrors.prenom_user}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom"
                value={formData.nom_user}
                onChange={(e) => setFormData(prev => ({ ...prev, nom_user: e.target.value }))}
                required
                error={!!formErrors.nom_user}
                helperText={formErrors.nom_user}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                error={!!formErrors.email}
                helperText={formErrors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Téléphone"
                value={formData.tel_user}
                onChange={(e) => setFormData(prev => ({ ...prev, tel_user: e.target.value }))}
                error={!!formErrors.tel_user}
                helperText={formErrors.tel_user || "Format: +212 6 XX XX XX XX"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl 
                fullWidth 
                required
                error={!!formErrors.role_id}
              >
                <InputLabel>Rôle</InputLabel>
                <Select
                  value={formData.role_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, role_id: e.target.value }))}
                  label="Rôle"
                  startAdornment={<Security sx={{ mr: 1 }} />}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.libelle}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.role_id && (
                  <FormHelperText>{formErrors.role_id}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adresse"
                multiline
                rows={3}
                value={formData.adresse_user}
                onChange={(e) => setFormData(prev => ({ ...prev, adresse_user: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            {!selectedUser && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mot de passe"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  error={!!formErrors.password}
                  helperText={formErrors.password || "Minimum 6 caractères"}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={Object.keys(formErrors).length > 0}
          >
            {selectedUser ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <Warning color="error" sx={{ mr: 1 }} />
          Confirmer la suppression
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Attention !</strong> Cette action est irréversible.
          </Alert>
          <Typography id="delete-dialog-description">
            Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
            <strong>
              {userToDelete?.prenom_user} {userToDelete?.nom_user}
            </strong>{' '}
            ({userToDelete?.email}) ?
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Toutes les données associées à cet utilisateur seront définitivement perdues.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={handleDeleteUser} 
            color="error" 
            variant="contained"
            startIcon={<Delete />}
            autoFocus
          >
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default UsersManagement;