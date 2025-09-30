import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Tooltip,
  TablePagination,
  CircularProgress,
  Alert,
  Grid,
  Avatar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  Edit,
  Delete,
  Phone,
  Email,
  LocationOn,
  Person,
  Add,
  GetApp
} from '@mui/icons-material';
import { useReception } from '../../contexts/ReceptionContext';
import { receptionApi } from '../../services/receptionApi';
import { useNotification } from '../../contexts/NotificationContext';

// Composant pour le statut du participant
const ParticipantStatusChip = ({ statut }) => {
  const getStatusProps = (statut) => {
    switch (statut) {
      case 'oui':
        return { 
          label: 'Confirmé', 
          color: 'success',
          icon: '✓'
        };
      case 'non':
        return { 
          label: 'Non-répondant', 
          color: 'error',
          icon: '✗'
        };
      case 'en_attente':
        return { 
          label: 'En attente', 
          color: 'warning',
          icon: '⏳'
        };
      case 'refuse':
        return { 
          label: 'Refusé', 
          color: 'default',
          icon: '🚫'
        };
      default:
        return { label: statut, color: 'default', icon: '?' };
    }
  };

  const props = getStatusProps(statut);
  
  return (
    <Chip
      label={`${props.icon} ${props.label}`}
      color={props.color}
      size="small"
      sx={{ fontWeight: 500 }}
    />
  );
};

// Dialog pour créer/modifier un participant
const ParticipantDialog = ({ open, onClose, onSave, participant = null, campagnes = [] }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    date_naissance: '',
    sexe: '',
    cin: '',
    campagne_id: '',
    commentaire: ''
  });
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (participant) {
      setFormData({
        nom: participant.nom || '',
        prenom: participant.prenom || '',
        telephone: participant.telephone || '',
        email: participant.email || '',
        adresse: participant.adresse || '',
        date_naissance: participant.date_naissance || '',
        sexe: participant.sexe || '',
        cin: participant.cin || '',
        campagne_id: participant.campagne_id || '',
        commentaire: participant.commentaire || ''
      });
    } else {
      setFormData({
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        adresse: '',
        date_naissance: '',
        sexe: '',
        cin: '',
        campagne_id: '',
        commentaire: ''
      });
    }
  }, [participant, open]);

  const handleSubmit = async () => {
    if (!formData.nom || !formData.prenom || !formData.telephone || !formData.campagne_id) {
      showNotification('Veuillez remplir les champs obligatoires', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (participant) {
        await receptionApi.updateParticipant(participant.id, formData);
        showNotification('Participant modifié avec succès', 'success');
      } else {
        await receptionApi.createParticipant(formData);
        showNotification('Participant créé avec succès', 'success');
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde participant:', error);
      showNotification('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {participant ? '✏️ Modifier le participant' : '👤 Nouveau participant'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nom *"
              value={formData.nom}
              onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Prénom *"
              value={formData.prenom}
              onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Téléphone *"
              value={formData.telephone}
              onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Adresse *"
              value={formData.adresse}
              onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Date de naissance"
              type="date"
              value={formData.date_naissance}
              onChange={(e) => setFormData(prev => ({ ...prev, date_naissance: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Sexe</InputLabel>
              <Select
                value={formData.sexe}
                onChange={(e) => setFormData(prev => ({ ...prev, sexe: e.target.value }))}
                label="Sexe"
              >
                <MenuItem value="M">Masculin</MenuItem>
                <MenuItem value="F">Féminin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="CIN"
              value={formData.cin}
              onChange={(e) => setFormData(prev => ({ ...prev, cin: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Campagne *</InputLabel>
              <Select
                value={formData.campagne_id}
                onChange={(e) => setFormData(prev => ({ ...prev, campagne_id: e.target.value }))}
                label="Campagne *"
              >
                {campagnes.map((campagne) => (
                  <MenuItem key={campagne.id} value={campagne.id}>
                    {campagne.nom}
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
              value={formData.commentaire}
              onChange={(e) => setFormData(prev => ({ ...prev, commentaire: e.target.value }))}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Annuler</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <Person />}
        >
          {participant ? 'Modifier' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Composant principal
const ParticipantsList = () => {
  const { 
    participants, 
    participantsLoading, 
    participantsError,
    loadParticipants,
    campagnes,
    loadCampagnes
  } = useReception();
  
  const { showNotification } = useNotification();

  // États locaux
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campagneFilter, setCampagneFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  // Chargement initial
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          loadCampagnes(),
          loadParticipants()
        ]);
      } catch (error) {
        console.error('Erreur initialisation participants:', error);
      }
    };
    init();
  }, [loadCampagnes, loadParticipants]);

  // Filtrage des participants
  const filteredParticipants = useMemo(() => {
    let filtered = participants;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        `${p.prenom} ${p.nom}`.toLowerCase().includes(search) ||
        p.telephone.includes(search) ||
        (p.email && p.email.toLowerCase().includes(search))
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(p => p.statut === statusFilter);
    }

    if (campagneFilter) {
      filtered = filtered.filter(p => p.campagne_id === parseInt(campagneFilter));
    }

    return filtered;
  }, [participants, searchTerm, statusFilter, campagneFilter]);

  // Pagination
  const paginatedParticipants = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredParticipants.slice(start, start + rowsPerPage);
  }, [filteredParticipants, page, rowsPerPage]);

  // Handlers
  const handleRefresh = async () => {
    try {
      await loadParticipants();
      showNotification('Données actualisées', 'success');
    } catch (error) {
      showNotification('Erreur lors de l\'actualisation', 'error');
    }
  };

  const handleEdit = (participant) => {
    setSelectedParticipant(participant);
    setDialogOpen(true);
  };

  const handleDelete = async (participant) => {
    if (window.confirm(`Supprimer ${participant.prenom} ${participant.nom} ?`)) {
      try {
        await receptionApi.supprimerParticipant(participant.id);
        showNotification('Participant supprimé', 'success');
        loadParticipants();
      } catch (error) {
        showNotification('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleSave = () => {
    loadParticipants();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (participantsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button onClick={handleRefresh}>Réessayer</Button>
        }>
          {participantsError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          👥 Gestion des Participants
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={() => {/* TODO: Export */}}
          >
            Exporter
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedParticipant(null);
              setDialogOpen(true);
            }}
          >
            Nouveau
          </Button>
        </Stack>
      </Box>

      {/* Filtres */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Rechercher un participant..."
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
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="oui">Confirmé</MenuItem>
                  <MenuItem value="non">Non-répondant</MenuItem>
                  <MenuItem value="en_attente">En attente</MenuItem>
                  <MenuItem value="refuse">Refusé</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Campagne</InputLabel>
                <Select
                  value={campagneFilter}
                  onChange={(e) => setCampagneFilter(e.target.value)}
                  label="Campagne"
                >
                  <MenuItem value="">Toutes</MenuItem>
                  {campagnes.map((campagne) => (
                    <MenuItem key={campagne.id} value={campagne.id}>
                      {campagne.nom}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={participantsLoading}
              >
                Actualiser
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {participantsLoading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress size={48} />
            </Box>
          ) : filteredParticipants.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucun participant trouvé
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {participants.length === 0 
                  ? "Aucun participant enregistré" 
                  : "Aucun participant ne correspond aux critères"
                }
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Participant</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Campagne</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Statut</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date appel</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedParticipants.map((participant) => (
                      <TableRow key={participant.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                              <Person fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {participant.prenom} {participant.nom}
                              </Typography>
                              {participant.cin && (
                                <Typography variant="caption" color="text.secondary">
                                  CIN: {participant.cin}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Phone fontSize="small" color="action" />
                              {participant.telephone}
                            </Typography>
                            {participant.email && (
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Email fontSize="inherit" color="action" />
                                {participant.email}
                              </Typography>
                            )}
                            {participant.adresse && (
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationOn fontSize="inherit" color="action" />
                                {participant.adresse.substring(0, 30)}...
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {participant.campagne_nom || 'Non définie'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <ParticipantStatusChip statut={participant.statut} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {participant.date_appel ? 
                              new Date(participant.date_appel).toLocaleDateString('fr-FR')
                              : 'Pas d\'appel'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Modifier">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEdit(participant)}
                                color="primary"
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton 
                                size="small" 
                                onClick={() => handleDelete(participant)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={filteredParticipants.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Lignes par page:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <ParticipantDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedParticipant(null);
        }}
        onSave={handleSave}
        participant={selectedParticipant}
        campagnes={campagnes}
      />
    </Box>
  );
};

export default ParticipantsList;