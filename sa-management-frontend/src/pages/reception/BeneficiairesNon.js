import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Stack,
  Avatar,
  TablePagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  RadioGroup,
  Radio,
  Divider,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Snackbar
} from '@mui/material';
import {
  GetApp,
  Cancel,
  Phone,
  CheckCircle,
  FileDownload,
  Search,
  Refresh,
  ErrorOutline,
  Assignment,
  Person,
  Email,
  LocationOn,
  AccessTime,
  LocalHospital,
  MedicalServices,
  HealthAndSafety,
  PhoneInTalk,
  Close,
  Schedule,
  PhoneCallback
} from '@mui/icons-material';
import ReceptionLayout from '../../components/Layout/ReceptionLayout';
import { ReceptionProvider, useReception } from '../../contexts/ReceptionContext';
import { receptionApi } from '../../services/receptionApi';

// =====================================
// DIALOG STATUT MÉDICAL
// =====================================
const StatutDialog = ({ open, onClose, participant, onUpdate }) => {
  const [statut, setStatut] = useState(participant?.statut || 'en_attente');
  const [commentaire, setCommentaire] = useState(participant?.commentaire || '');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    if (participant) {
      setStatut(participant.statut || 'en_attente');
      setCommentaire(participant.commentaire || '');
    }
  }, [participant]);

  const handleSave = async () => {
    if (!participant) return;

    setLoading(true);
    try {
      await receptionApi.updateStatutParticipant(participant.id, {
        statut,
        commentaire
      });
      
      onUpdate();
      onClose();
      // Notification supprimée pour éviter l'erreur
      console.log('Statut patient mis à jour avec succès');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de la mise à jour';
      console.error('Erreur:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatutDetails = (statusValue) => {
    const details = {
      'oui': { 
        icon: <CheckCircle />, 
        label: 'Patient contacté et accepté',
        color: 'success.main',
        bgColor: alpha(theme.palette.success.main, 0.1)
      },
      'non': { 
        icon: <Cancel />, 
        label: 'Patient non-joignable',
        color: 'error.main',
        bgColor: alpha(theme.palette.error.main, 0.1)
      },
      'refuse': { 
        icon: <Cancel />, 
        label: 'Patient a refusé',
        color: 'warning.main',
        bgColor: alpha(theme.palette.warning.main, 0.1)
      },
      'en_attente': { 
        icon: <Schedule />, 
        label: 'En attente de contact',
        color: 'info.main',
        bgColor: alpha(theme.palette.info.main, 0.1)
      }
    };
    return details[statusValue] || details['en_attente'];
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: theme.shadows[20]
        }
      }}
    >
      <DialogTitle sx={{ 
        backgroundColor: '#e3f2fd', 
        color: '#0d47a1',
        borderBottom: '2px solid #bbdefb',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <MedicalServices />
        Contact Patient - Suivi Médical
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {participant && (
          <>
            {/* Carte patient */}
            <Card sx={{ 
              mb: 3, 
              border: '2px solid #e3f2fd',
              borderRadius: 2,
              background: 'linear-gradient(135deg, #ffffff 0%, #f5f9ff 100%)'
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Avatar 
                    sx={{ 
                      bgcolor: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                      width: 56,
                      height: 56,
                      fontSize: '1.5rem',
                      boxShadow: '0 4px 12px rgba(21, 101, 192, 0.3)'
                    }}
                  >
                    {participant.prenom?.[0]}{participant.nom?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#0d47a1', fontWeight: 700 }}>
                      {participant.prenom} {participant.nom}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Patient ID #{participant.id}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Phone fontSize="small" sx={{ color: '#1565c0' }} />
                      <Typography variant="body2" fontWeight="500">
                        {participant.telephone}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocalHospital fontSize="small" sx={{ color: '#1565c0' }} />
                      <Typography variant="body2">
                        Campagne médicale
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocationOn fontSize="small" sx={{ color: '#1565c0' }} />
                      <Typography variant="body2" color="text.secondary">
                        {participant.adresse}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Sélection du statut */}
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, color: '#0d47a1' }}>
              🏥 Résultat du contact médical
            </Typography>
            
            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <RadioGroup
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
              >
                {Object.entries({
                  'oui': 'Patient contacté et accepté',
                  'non': 'Patient non-joignable',
                  'refuse': 'Patient a refusé',
                  'en_attente': 'Reporter le contact'
                }).map(([value, label]) => {
                  const details = getStatutDetails(value);
                  return (
                    <FormControlLabel 
                      key={value}
                      value={value} 
                      control={<Radio />} 
                      label={
                        <Box 
                          display="flex" 
                          alignItems="center" 
                          gap={2}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: statut === value ? details.bgColor : 'transparent',
                            border: `2px solid ${statut === value ? details.color : 'transparent'}`,
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <Box sx={{ color: details.color }}>
                            {details.icon}
                          </Box>
                          <Typography 
                            variant="body2" 
                            fontWeight={statut === value ? 600 : 400}
                            color={statut === value ? details.color : 'text.primary'}
                          >
                            {label}
                          </Typography>
                        </Box>
                      }
                      sx={{ 
                        m: 0, 
                        width: '100%',
                        mb: 1,
                        '& .MuiFormControlLabel-label': { width: '100%' }
                      }}
                    />
                  );
                })}
              </RadioGroup>
            </FormControl>

            {/* Commentaire médical */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="📋 Observations médicales"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder={
                statut === 'oui' ? 'Ex: Patient motivé, rendez-vous confirmé pour dépistage...' :
                statut === 'non' ? 'Ex: Aucune réponse après 3 tentatives, laisser message...' :
                statut === 'refuse' ? 'Ex: Patient refuse pour raisons personnelles...' :
                'Ex: Rappeler en fin de journée, patient préfère être contacté après 17h...'
              }
              helperText="Ces observations seront ajoutées au dossier médical du patient"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />

            {/* Alertes selon le statut */}
            <Fade in timeout={500}>
              <Box mt={2}>
                {statut === 'oui' && (
                  <Alert 
                    severity="success" 
                    icon={<CheckCircle />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" fontWeight="500">
                      ✅ Excellent ! Ce patient sera inclus dans le suivi médical de la campagne.
                    </Typography>
                  </Alert>
                )}
                {statut === 'refuse' && (
                  <Alert 
                    severity="warning"
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" fontWeight="500">
                      ⚠️ Ce patient ne participera pas à cette campagne médicale.
                    </Typography>
                  </Alert>
                )}
                {statut === 'en_attente' && (
                  <Alert 
                    severity="info"
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" fontWeight="500">
                      📅 Le contact sera reporté selon vos instructions.
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Fade>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, borderTop: '2px solid #e3f2fd' }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          startIcon={<Close />}
          sx={{ borderRadius: 2 }}
        >
          Annuler
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <PhoneCallback />}
          sx={{ 
            borderRadius: 2,
            minWidth: 160,
            background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
            boxShadow: '0 6px 20px rgba(21, 101, 192, 0.4)'
          }}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer le contact'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =====================================
// COMPOSANT PRINCIPAL
// =====================================
const BeneficiairesNonContent = () => {
  const { campagnes } = useReception();
  const theme = useTheme();
  
  const [selectedCampagne, setSelectedCampagne] = useState('');
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [statutDialogOpen, setStatutDialogOpen] = useState(false);

  // Debug: Afficher les campagnes dans la console
  useEffect(() => {
    console.log('Campagnes disponibles:', campagnes);
    if (campagnes && campagnes.length > 0) {
      console.log('Première campagne:', campagnes[0]);
    }
  }, [campagnes]);

  // Charger les participants n'ayant pas répondu
  const loadParticipantsNon = useCallback(async (campagneId) => {
    if (!campagneId) return;
    
    setLoading(true);
    try {
      const response = await receptionApi.getParticipants({
        campagne_id: campagneId,
        statut: 'non'
      });
      const data = response.data.data || response.data;
      setParticipants(data);
      setFilteredParticipants(data);
    } catch (error) {
      console.error('Erreur lors du chargement des données médicales');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrage des participants
  useEffect(() => {
    if (!searchTerm) {
      setFilteredParticipants(participants);
      return;
    }

    const filtered = participants.filter(participant =>
      `${participant.prenom} ${participant.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.telephone.includes(searchTerm) ||
      (participant.email && participant.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredParticipants(filtered);
    setPage(0);
  }, [searchTerm, participants]);

  useEffect(() => {
    if (selectedCampagne) {
      loadParticipantsNon(selectedCampagne);
    }
  }, [selectedCampagne, loadParticipantsNon]);

  // Fonction pour convertir les données en CSV médical
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    const headers = [
      'Nom du patient',
      'Prénom', 
      'Téléphone',
      'Email',
      'Adresse',
      'Date dernière tentative',
      'Heure dernière tentative',
      'Statut médical',
      'Observations'
    ];

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      
      const stringValue = String(value);
      const cleanValue = stringValue.replace(/[\r\n]/g, ' ');
      
      if (cleanValue.includes(';') || cleanValue.includes('"') || cleanValue.includes(',')) {
        return '"' + cleanValue.replace(/"/g, '""') + '"';
      }
      
      return cleanValue;
    };

    const separator = ';';
    let csvContent = headers.join(separator) + '\n';

    data.forEach(participant => {
      const dateAppel = participant.date_appel ? new Date(participant.date_appel) : null;
      
      const row = [
        escapeCSV(participant.nom),
        escapeCSV(participant.prenom),
        escapeCSV(participant.telephone),
        escapeCSV(participant.email || ''),
        escapeCSV(participant.adresse || ''),
        dateAppel ? dateAppel.toLocaleDateString('fr-FR') : '',
        dateAppel ? dateAppel.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '',
        escapeCSV('PATIENT NON CONTACTÉ'),
        escapeCSV(participant.commentaire || 'Aucune observation')
      ];
      
      csvContent += row.join(separator) + '\n';
    });

    return csvContent;
  };

  // Export CSV médical
  const handleExportCSV = async () => {
    if (!selectedCampagne) return;

    try {
      const response = await receptionApi.exportCSV({
        campagne_id: selectedCampagne,
        statut: 'non'
      });
      
      let csvContent = response.data;
      
      if (typeof csvContent === 'object' || !csvContent.includes(';')) {
        csvContent = convertToCSV(participants);
      }
      
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      
      const blob = new Blob([csvWithBOM], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const campagne = campagnes.find(c => c.id === parseInt(selectedCampagne));
      const filename = `patients_non_contactes_${campagne?.nom_campagne?.replace(/[^a-z0-9]/gi, '_') || 'campagne'}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('Export des données patients généré avec succès');
    } catch (error) {
      console.error('Erreur API, génération CSV locale:', error);
      
      const csvContent = convertToCSV(participants);
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      
      const blob = new Blob([csvWithBOM], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const campagne = campagnes.find(c => c.id === parseInt(selectedCampagne));
      const filename = `patients_non_contactes_${campagne?.nom_campagne?.replace(/[^a-z0-9]/gi, '_') || 'campagne'}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('Export des données patients généré avec succès');
    }
  };

  // Gestion des actions
  const handleEditStatut = (participant) => {
    setSelectedParticipant(participant);
    setStatutDialogOpen(true);
  };

  const handleStatutUpdate = () => {
    loadParticipantsNon(selectedCampagne);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const selectedCampagneData = campagnes.find(c => c.id === parseInt(selectedCampagne));

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: '#f8fafb', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafb 0%, #e8f2f7 100%)'
    }}>
      {/* Header médical professionnel */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 2 }}>
          <Avatar sx={{ 
            bgcolor: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',  
            width: 64, 
            height: 64,
            boxShadow: '0 8px 32px rgba(21, 101, 192, 0.3)'
          }}>
            <MedicalServices fontSize="large" />
          </Avatar>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: '#0d47a1',
                mb: 0.5,
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
              }}
            >
              Patients Non-Contactés
            </Typography>
            <Typography variant="h6" sx={{ color: '#37474f', fontWeight: 500 }}>
              Centre Médical - Suivi des Campagnes Sanitaires
            </Typography>
          </Box>
        </Stack>
        <Typography variant="body1" sx={{ color: '#546e7a', fontSize: '1.1rem' }}>
          Gestion et suivi des patients n'ayant pas répondu aux campagnes de dépistage médical
        </Typography>
      </Box>

      {/* Sélection de campagne avec style médical */}
      <Card 
        elevation={0} 
        sx={{ 
          mb: 3, 
          border: '2px solid #e3f2fd',
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #ffffff 0%, #f5f9ff 100%)',
          boxShadow: '0 4px 20px rgba(21, 101, 192, 0.08)'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel sx={{ color: '#1565c0', fontWeight: 600 }}>
                  Sélectionner une campagne médicale
                </InputLabel>
                <Select
                  value={selectedCampagne}
                  onChange={(e) => setSelectedCampagne(e.target.value)}
                  label="Sélectionner une campagne médicale"
                  sx={{ 
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1565c0',
                      borderWidth: 2
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#0d47a1'
                    },
                    '& .MuiSelect-select': {
                      color: '#212121',
                      fontWeight: 600,
                      fontSize: '1rem'
                    }
                  }}
                >
                  {campagnes && campagnes.length > 0 ? (
                    campagnes.map((campagne) => (
                      <MenuItem 
                        key={campagne.id} 
                        value={campagne.id}
                        sx={{
                          py: 2,
                          '&:hover': {
                            backgroundColor: '#e3f2fd'
                          }
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <LocalHospital sx={{ color: '#1565c0' }} />
                          <Typography sx={{ 
                            fontWeight: 600,
                            color: '#212121',
                            fontSize: '1rem'
                          }}>
                            {campagne.nom_campagne || campagne.nom || `Campagne ${campagne.id}`}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>
                      <Typography sx={{ color: '#666', fontStyle: 'italic' }}>
                        Aucune campagne disponible
                      </Typography>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            {selectedCampagne && (
              <>
                <Grid item xs={6} md={3}>
                  <Tooltip title="Actualiser les données patients">
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={() => loadParticipantsNon(selectedCampagne)}
                      disabled={loading}
                      fullWidth
                      sx={{ 
                        borderColor: '#1565c0',
                        color: '#1565c0',
                        borderWidth: 2,
                        borderRadius: 2,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': { 
                          borderColor: '#0d47a1', 
                          backgroundColor: '#e3f2fd',
                          transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Actualiser
                    </Button>
                  </Tooltip>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Tooltip title="Exporter la liste des patients">
                    <Button
                      variant="contained"
                      startIcon={<FileDownload />}
                      onClick={handleExportCSV}
                      disabled={loading || participants.length === 0}
                      fullWidth
                      sx={{ 
                        background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                        borderRadius: 2,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 600,
                        boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                        '&:hover': { 
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(76, 175, 80, 0.5)'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Export CSV
                    </Button>
                  </Tooltip>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Statistiques médicales */}
      {selectedCampagne && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={0} 
              sx={{ 
                border: '2px solid #ffcdd2',
                borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #ffebee 100%)',
                boxShadow: '0 4px 20px rgba(244, 67, 54, 0.08)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={3}>
                  <Avatar sx={{ 
                    bgcolor: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)', 
                    width: 56, 
                    height: 56,
                    boxShadow: '0 6px 20px rgba(244, 67, 54, 0.3)'
                  }}>
                    <ErrorOutline fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                      {participants.length}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#37474f', fontWeight: 500 }}>
                      Patients non-contactés
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={0} 
              sx={{ 
                border: '2px solid #c8e6c9',
                borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f1f8e9 100%)',
                boxShadow: '0 4px 20px rgba(76, 175, 80, 0.08)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={3}>
                  <Avatar sx={{ 
                    bgcolor: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)', 
                    width: 56, 
                    height: 56,
                    boxShadow: '0 6px 20px rgba(76, 175, 80, 0.3)'
                  }}>
                    <HealthAndSafety fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: '#388e3c' }}>
                      {selectedCampagneData?.nom_campagne || selectedCampagneData?.nom || 'Campagne'}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#37474f', fontWeight: 500 }}>
                      Campagne active
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={0} 
              sx={{ 
                border: '2px solid #bbdefb',
                borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)',
                boxShadow: '0 4px 20px rgba(33, 150, 243, 0.08)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={3}>
                  <Avatar sx={{ 
                    bgcolor: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)', 
                    width: 56, 
                    height: 56,
                    boxShadow: '0 6px 20px rgba(33, 150, 243, 0.3)'
                  }}>
                    <Assignment fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
                      {filteredParticipants.length}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#37474f', fontWeight: 500 }}>
                      Résultats affichés
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Liste des patients avec design médical */}
      {selectedCampagne && (
        <Card 
          elevation={0} 
          sx={{ 
            border: '2px solid #e3f2fd',
            borderRadius: 3,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafb 100%)',
            boxShadow: '0 8px 32px rgba(21, 101, 192, 0.12)'
          }}
        >
          <CardContent sx={{ p: 0 }}>
            {/* Header avec recherche */}
            <Box sx={{ 
              p: 4, 
              borderBottom: '2px solid #e3f2fd',
              background: 'linear-gradient(135deg, #ffffff 0%, #f5f9ff 100%)'
            }}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                justifyContent="space-between" 
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={3}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <LocalHospital sx={{ color: '#1565c0', fontSize: 32 }} />
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#0d47a1' }}>
                    Dossiers Patients Non-Contactés ({filteredParticipants.length})
                  </Typography>
                </Stack>
                
                <TextField
                  size="medium"
                  placeholder="Rechercher un patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: '#1565c0' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    minWidth: 300,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'white',
                      '& fieldset': {
                        borderColor: '#1565c0',
                        borderWidth: 2
                      },
                      '&:hover fieldset': {
                        borderColor: '#0d47a1'
                      }
                    }
                  }}
                />
              </Stack>
            </Box>

            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 10 }}>
                <Stack alignItems="center" spacing={3}>
                  <CircularProgress size={60} sx={{ color: '#1565c0' }} />
                  <Typography variant="h6" sx={{ color: '#37474f' }}>
                    Chargement des dossiers patients...
                  </Typography>
                </Stack>
              </Box>
            ) : filteredParticipants.length === 0 ? (
              <Box sx={{ p: 8, textAlign: 'center' }}>
                <Avatar sx={{ 
                  bgcolor: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)', 
                  width: 100, 
                  height: 100, 
                  mx: 'auto', 
                  mb: 3,
                  boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)'
                }}>
                  <CheckCircle fontSize="large" />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#388e3c', mb: 2 }}>
                  Excellent suivi médical !
                </Typography>
                <Typography variant="h6" sx={{ color: '#546e7a' }}>
                  {participants.length === 0 
                    ? "Tous les patients de cette campagne ont été contactés avec succès." 
                    : "Aucun patient ne correspond à votre recherche."
                  }
                </Typography>
              </Box>
            ) : (
              <>
                <Alert 
                  severity="warning" 
                  icon={<MedicalServices />}
                  sx={{ 
                    m: 4, 
                    mb: 0,
                    borderRadius: 2,
                    backgroundColor: '#fff3e0',
                    border: '2px solid #ffb74d',
                    '& .MuiAlert-message': {
                      fontSize: '1.1rem',
                      fontWeight: 500
                    }
                  }}
                >
                  <strong>Suivi Médical Requis:</strong> Ces patients n'ont pas été contactés dans le cadre de la campagne de dépistage. 
                  Un suivi téléphonique est recommandé pour assurer la continuité des soins.
                </Alert>
                
                <TableContainer sx={{ maxHeight: 700 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-head': { 
                        backgroundColor: '#e3f2fd', 
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        color: '#0d47a1',
                        borderBottom: '2px solid #1565c0'
                      }}}>
                        <TableCell>Patient</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Adresse</TableCell>
                        <TableCell>Dernière tentative</TableCell>
                        <TableCell>Statut médical</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredParticipants
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((participant, index) => (
                        <TableRow 
                          key={participant.id} 
                          hover 
                          sx={{ 
                            '&:hover': { backgroundColor: '#f5f9ff' },
                            '& .MuiTableCell-root': {
                              borderBottom: '1px solid #e3f2fd',
                              py: 2
                            }
                          }}
                        >
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={3}>
                              <Avatar sx={{ 
                                bgcolor: `linear-gradient(135deg, ${index % 2 === 0 ? '#1565c0' : '#f44336'} 0%, ${index % 2 === 0 ? '#0d47a1' : '#d32f2f'} 100%)`, 
                                width: 48, 
                                height: 48,
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                              }}>
                                <Person />
                              </Avatar>
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#0d47a1' }}>
                                  {participant.prenom} {participant.nom}
                                </Typography>
                                {participant.email && (
                                  <Typography variant="body2" sx={{ color: '#546e7a', display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Email fontSize="small" />
                                    {participant.email}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body1" sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              fontWeight: 500,
                              color: '#37474f'
                            }}>
                              <Phone sx={{ color: '#1565c0' }} />
                              {participant.telephone}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body1" sx={{ 
                              maxWidth: 250, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              color: '#546e7a'
                            }}>
                              <LocationOn sx={{ color: '#1565c0' }} />
                              {participant.adresse || 'Non renseignée'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body1" sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              color: '#546e7a'
                            }}>
                              <AccessTime sx={{ color: '#1565c0' }} />
                              {participant.date_appel ? 
                                new Date(participant.date_appel).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                                : 'Jamais contacté'
                              }
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<Cancel />}
                              label="Patient non-contacté"
                              color="error"
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                px: 2,
                                background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                                boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Contacter le patient">
                              <IconButton
                                onClick={() => handleEditStatut(participant)}
                                sx={{ 
                                  color: '#1565c0',
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': { 
                                    backgroundColor: '#bbdefb',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.3s ease'
                                }}
                              >
                                <PhoneInTalk />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ 
                  borderTop: '2px solid #e3f2fd',
                  backgroundColor: '#f5f9ff'
                }}>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={filteredParticipants.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Patients par page:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count} patients`}
                    sx={{
                      '& .MuiTablePagination-toolbar': {
                        fontSize: '1rem',
                        fontWeight: 500
                      }
                    }}
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de gestion du statut */}
      <StatutDialog
        open={statutDialogOpen}
        onClose={() => setStatutDialogOpen(false)}
        participant={selectedParticipant}
        onUpdate={handleStatutUpdate}
      />
    </Box>
  );
};

const BeneficiairesNon = () => {
  return (
    <ReceptionProvider>
      <ReceptionLayout>
        <BeneficiairesNonContent />
      </ReceptionLayout>
    </ReceptionProvider>
  );
};

export default BeneficiairesNon;