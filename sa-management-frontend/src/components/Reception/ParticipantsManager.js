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
  TablePagination,
  Paper,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  RadioGroup,
  Radio,
  CircularProgress,
  Alert,
  Avatar,
  Badge,
  Collapse,
  Stack,
  Divider,
  LinearProgress,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Snackbar,
  Menu,
  ListItemIcon
} from '@mui/material';
import {
  Edit,
  GetApp,
  Search,
  Phone,
  CheckCircle,
  Cancel,
  Schedule,
  PersonAdd,
  Refresh,
  FilterList,
  Clear,
  KeyboardArrowDown,
  KeyboardArrowUp,
  PhoneCallback,
  Email,
  LocationOn,
  CalendarToday,
  Group,
  TrendingUp,
  CloudUpload,
  Edit as EditIcon,
  FileUpload,
  Timeline,
  Info,
  Visibility,
  PhoneInTalk,
  Assessment,
  Close,
  CheckBox,
  Dashboard,
  TableChart,
  FileDownload,
  Warning
} from '@mui/icons-material';
import { useReception } from '../../contexts/ReceptionContext';
import { receptionApi } from '../../services/receptionApi';

// Composant de notification simple
const SimpleNotification = ({ open, message, severity, onClose }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

// =====================================
// STYLES PERSONNALISÉS
// =====================================
const StyledCard = ({ children, elevation = 1, ...props }) => {
  const theme = useTheme();
  return (
    <Card
      elevation={elevation}
      sx={{
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-2px)'
        },
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

const GradientHeader = ({ children, color = 'primary' }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].dark} 100%)`,
        color: 'white',
        p: 3,
        borderRadius: '16px 16px 0 0',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.3
        }
      }}
    >
      <Box position="relative" zIndex={1}>
        {children}
      </Box>
    </Box>
  );
};

const AnimatedChip = ({ children, ...props }) => (
  <Zoom in timeout={300}>
    <Chip
      sx={{
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'scale(1.05)',
        }
      }}
      {...props}
    >
      {children}
    </Chip>
  </Zoom>
);

// =====================================
// COMPOSANT STATISTIQUES AMÉLIORÉ
// =====================================
const StatsCard = ({ title, value, icon, color, subtitle, trend }) => {
  const theme = useTheme();
  return (
    <Fade in timeout={500}>
      <StyledCard>
        <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
          <Box display="flex" justifyContent="center" mb={1.5}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette[color].main, 0.1),
                color: theme.palette[color].main,
                width: 48,
                height: 48
              }}
            >
              {icon}
            </Avatar>
          </Box>
          <Typography
            variant="h4"
            fontWeight="bold"
            color={`${color}.main`}
            sx={{ mb: 0.5 }}
          >
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box display="flex" alignItems="center" justifyContent="center" mt={1}>
              <TrendingUp fontSize="small" color={trend > 0 ? 'success' : 'error'} />
              <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
                {trend > 0 ? '+' : ''}{trend}%
              </Typography>
            </Box>
          )}
        </CardContent>
      </StyledCard>
    </Fade>
  );
};

// =====================================
// COMPOSANT SÉLECTION DE CAMPAGNE
// =====================================
const CampagneSelector = ({ campagnes, selectedCampagne, onSelect, loading }) => {
  const theme = useTheme();
  
  return (
    <StyledCard sx={{ mb: 4, overflow: 'hidden' }}>
      <GradientHeader color="secondary">
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <Group fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Sélection de la campagne
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Choisissez une campagne pour afficher les participants
            </Typography>
          </Box>
        </Box>
      </GradientHeader>
      
      <CardContent sx={{ p: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <FormControl fullWidth size="large">
              <InputLabel sx={{ fontSize: '1.1rem', fontWeight: 500 }}>
                Sélectionnez une campagne *
              </InputLabel>
              <Select
                value={selectedCampagne}
                onChange={(e) => onSelect(e.target.value)}
                label="Sélectionnez une campagne *"
                disabled={loading}
                sx={{ 
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 2
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'secondary.main'
                  }
                }}
              >
                <MenuItem value="">
                  <em>-- Choisir une campagne --</em>
                </MenuItem>
                {campagnes.map((campagne) => (
                  <MenuItem key={campagne.id} value={campagne.id}>
                    <Box sx={{ width: '100%' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body1" fontWeight={600}>
                          {campagne.nom}
                        </Typography>
                        <Chip
                          label={campagne.statut}
                          color={campagne.statut === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Du {new Date(campagne.date_debut).toLocaleDateString('fr-FR')} 
                        au {new Date(campagne.date_fin).toLocaleDateString('fr-FR')}
                      </Typography>
                      {campagne.description && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {campagne.description}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            {selectedCampagne && (
              <Fade in timeout={500}>
                <Alert 
                  severity="success" 
                  icon={<CheckBox />}
                  sx={{ borderRadius: 2 }}
                >
                  <Typography variant="body2" fontWeight="500">
                    Campagne sélectionnée ! 
                    <br />
                    Les participants vont s'afficher.
                  </Typography>
                </Alert>
              </Fade>
            )}
            {!selectedCampagne && (
              <Alert 
                severity="warning" 
                icon={<Warning />}
                sx={{ borderRadius: 2 }}
              >
                <Typography variant="body2" fontWeight="500">
                  Veuillez sélectionner une campagne pour continuer
                </Typography>
              </Alert>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </StyledCard>
  );
};

// =====================================
// COMPOSANT DIALOG STATUT AMÉLIORÉ
// =====================================
const StatutDialog = ({ open, onClose, participant, onUpdate, showNotification }) => {
  const [statut, setStatut] = useState(participant?.statut || 'en_attente');
  const [commentaire, setCommentaire] = useState(participant?.commentaire || '');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    if (participant) {
      setStatut(participant.statut);
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
      showNotification('Statut mis à jour avec succès', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de la mise à jour';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatutDetails = (statusValue) => {
    const details = {
      'oui': { 
        icon: <CheckCircle />, 
        label: 'A répondu et accepté (OUI)',
        color: 'success.main',
        bgColor: alpha(theme.palette.success.main, 0.1)
      },
      'non': { 
        icon: <Cancel />, 
        label: 'N\'a pas répondu',
        color: 'error.main',
        bgColor: alpha(theme.palette.error.main, 0.1)
      },
      'refuse': { 
        icon: <Cancel />, 
        label: 'A refusé',
        color: 'warning.main',
        bgColor: alpha(theme.palette.warning.main, 0.1)
      },
      'en_attente': { 
        icon: <Schedule />, 
        label: 'En attente d\'appel',
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
      <GradientHeader>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
            <PhoneInTalk />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Gestion de l'appel
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Mise à jour du statut du participant
            </Typography>
          </Box>
        </Box>
      </GradientHeader>
      
      <DialogContent sx={{ p: 3 }}>
        {participant && (
          <>
            {/* Carte participant */}
            <StyledCard sx={{ mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Avatar 
                    sx={{ 
                      bgcolor: 'primary.main',
                      width: 56,
                      height: 56,
                      fontSize: '1.5rem'
                    }}
                  >
                    {participant.prenom?.[0]}{participant.nom?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {participant.prenom} {participant.nom}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Participant #{participant.id}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Phone fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight="500">
                        {participant.telephone}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Group fontSize="small" color="primary" />
                      <Typography variant="body2">
                        {participant.campagne_nom}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocationOn fontSize="small" color="primary" />
                      <Typography variant="body2" color="text.secondary">
                        {participant.adresse}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>

            {/* Sélection du statut */}
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Résultat de l'appel
            </Typography>
            
            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <RadioGroup
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
              >
                {Object.entries({
                  'oui': 'A répondu et accepté (OUI)',
                  'non': 'N\'a pas répondu',
                  'refuse': 'A refusé',
                  'en_attente': 'Reporter l\'appel'
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

            {/* Commentaire */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Commentaire détaillé"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder={
                statut === 'oui' ? 'Ex: Participant très motivé, confirmé pour le rendez-vous du...' :
                statut === 'non' ? 'Ex: Pas de réponse après 3 tentatives, voicemail laissé...' :
                statut === 'refuse' ? 'Ex: Ne souhaite pas participer pour raisons familiales...' :
                'Ex: Rappeler demain matin, préfère être contacté en fin de journée...'
              }
              helperText="Ce commentaire sera visible dans l'historique des appels"
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
                    icon={<CheckBox />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" fontWeight="500">
                      Excellent ! Ce participant pourra être converti en bénéficiaire.
                    </Typography>
                  </Alert>
                )}
                {statut === 'refuse' && (
                  <Alert 
                    severity="warning"
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" fontWeight="500">
                      Ce participant ne participera pas à cette campagne.
                    </Typography>
                  </Alert>
                )}
                {statut === 'en_attente' && (
                  <Alert 
                    severity="info"
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" fontWeight="500">
                      L'appel sera reporté selon vos instructions.
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Fade>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
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
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
          }}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer l\'appel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =====================================
// COMPOSANT PRINCIPAL AMÉLIORÉ
// =====================================
const ParticipantsManager = () => {
  const { campagnes, loading: contextLoading } = useReception();
  const theme = useTheme();
  
  // États pour les notifications
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Fonction pour afficher les notifications
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // États locaux
  const [selectedCampagne, setSelectedCampagne] = useState('');
  const [filters, setFilters] = useState({
    statut: '',
    search: '',
    source_import: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [statutDialogOpen, setStatutDialogOpen] = useState(false);
  const [localParticipants, setLocalParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    en_attente: 0,
    oui: 0,
    non: 0,
    refuse: 0,
    imported: 0,
    manual: 0
  });

  // Charger les participants pour la campagne sélectionnée
  const loadData = useCallback(async () => {
    if (!selectedCampagne) {
      setLocalParticipants([]);
      setTotalCount(0);
      setStats({
        total: 0,
        en_attente: 0,
        oui: 0,
        non: 0,
        refuse: 0,
        imported: 0,
        manual: 0
      });
      return;
    }

    setLoading(true);
    try {
      const params = {
        campagne_id: selectedCampagne,
        ...filters,
        page: page + 1,
        per_page: rowsPerPage
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await receptionApi.getParticipants(params);
      const data = response.data;
      
      setLocalParticipants(data.data || data);
      setTotalCount(data.total || (data.data || data).length);

      if (data.data) {
        const participants = data.data || data;
        const statsCalc = {
          total: data.total || participants.length,
          en_attente: participants.filter(p => p.statut === 'en_attente').length,
          oui: participants.filter(p => p.statut === 'oui').length,
          non: participants.filter(p => p.statut === 'non').length,
          refuse: participants.filter(p => p.statut === 'refuse').length,
          imported: participants.filter(p => p.source_import === 'excel').length,
          manual: participants.filter(p => p.source_import === 'manuel' || !p.source_import).length
        };
        setStats(statsCalc);
      }
    } catch (error) {
      console.error('Erreur chargement participants:', error);
      showNotification('Erreur lors du chargement des participants', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCampagne, filters, page, rowsPerPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sélection de campagne
  const handleCampagneSelect = (campagneId) => {
    setSelectedCampagne(campagneId);
    setPage(0);
    setFilters({ statut: '', search: '', source_import: '' });
  };

  // Refresh des données
  const handleRefresh = async () => {
    if (!selectedCampagne) return;
    
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    showNotification('Données mises à jour', 'success');
  };

  // Gestion des filtres
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ statut: '', search: '', source_import: '' });
    setPage(0);
  };

  // Gestion du statut
  const handleEditStatut = (participant) => {
    setSelectedParticipant(participant);
    setStatutDialogOpen(true);
  };

  const handleStatutUpdate = () => {
    loadData();
  };

  // Fonction pour convertir les données en CSV bien formaté
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    const headers = [
      'Nom',
      'Prénom', 
      'Téléphone',
      'Email',
      'Adresse',
      'Statut',
      'Campagne',
      'Source Import',
      'Date Import'
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
      const row = [
        escapeCSV(participant.nom),
        escapeCSV(participant.prenom),
        escapeCSV(participant.telephone),
        escapeCSV(participant.email || ''),
        escapeCSV(participant.adresse || ''),
        escapeCSV(participant.statut),
        escapeCSV(participant.campagne_nom),
        escapeCSV(participant.source_import || ''),
        escapeCSV(participant.date_import ? new Date(participant.date_import).toLocaleDateString('fr-FR') : '')
      ];
      
      csvContent += row.join(separator) + '\n';
    });

    return csvContent;
  };

  // Export CSV
  const handleExportCSV = async () => {
    if (!selectedCampagne) {
      showNotification('Veuillez sélectionner une campagne', 'warning');
      return;
    }

    try {
      const params = { 
        campagne_id: selectedCampagne,
        ...filters 
      };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await receptionApi.exportCSV(params);
      
      let csvContent = response.data;
      
      if (typeof csvContent === 'object' || !csvContent.includes(';')) {
        csvContent = convertToCSV(localParticipants);
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
      const filename = `participants_${campagne?.nom || 'campagne'}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification('Export CSV généré avec succès', 'success');
    } catch (error) {
      console.error('Erreur export CSV:', error);
      
      const csvContent = convertToCSV(localParticipants);
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      
      const blob = new Blob([csvWithBOM], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const campagne = campagnes.find(c => c.id === parseInt(selectedCampagne));
      const filename = `participants_${campagne?.nom || 'campagne'}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification('Export CSV généré avec succès', 'success');
    }
  };

  // Gestion du menu d'export
  const handleExportMenuClick = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  // Fonction pour obtenir la couleur du statut
  const getStatutColor = (statut) => {
    switch (statut) {
      case 'oui': return 'success';
      case 'non': return 'error';
      case 'refuse': return 'warning';
      default: return 'info';
    }
  };

  // Fonction pour obtenir l'icône du statut
  const getStatutIcon = (statut) => {
    switch (statut) {
      case 'oui': return <CheckCircle fontSize="small" />;
      case 'non': return <Cancel fontSize="small" />;
      case 'refuse': return <Cancel fontSize="small" />;
      default: return <Schedule fontSize="small" />;
    }
  };

  // Fonction pour obtenir l'icône de la source
  const getSourceIcon = (source) => {
    switch (source) {
      case 'excel': return <FileUpload fontSize="small" color="info" />;
      case 'manuel': return <EditIcon fontSize="small" color="primary" />;
      default: return <PersonAdd fontSize="small" color="action" />;
    }
  };

  // Formatage de la date
  const formatDateTime = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  };

  const hasActiveFilters = filters.statut || filters.search || filters.source_import;

  return (
    <Box sx={{ p: 3, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`, minHeight: '100vh' }}>
      {/* Composant de notification */}
      <SimpleNotification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleCloseNotification}
      />

      {/* En-tête principal avec gradient */}
      <StyledCard sx={{ mb: 4, overflow: 'hidden' }}>
        <GradientHeader>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Gestion des Participants
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Suivi et gestion des appels par campagne
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={2}>
              <Tooltip title="Actualiser les données" arrow>
                <IconButton 
                  onClick={handleRefresh} 
                  disabled={refreshing || !selectedCampagne}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                    '&:disabled': { opacity: 0.5 }
                  }}
                >
                  <Refresh className={refreshing ? 'rotating' : ''} />
                </IconButton>
              </Tooltip>
              
              {selectedCampagne && (
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  endIcon={expandedFilters ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                  onClick={() => setExpandedFilters(!expandedFilters)}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  Filtres avancés
                  {hasActiveFilters && (
                    <Badge 
                      color="warning" 
                      variant="dot" 
                      sx={{ ml: 1, '& .MuiBadge-dot': { bgcolor: '#ff9800' } }}
                    />
                  )}
                </Button>
              )}
            </Stack>
          </Box>
        </GradientHeader>

        {/* Barre de progression du refresh */}
        {refreshing && (
          <LinearProgress 
            sx={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0,
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #ff9800, #ffc107)'
              }
            }} 
          />
        )}
      </StyledCard>

      {/* Sélection de campagne obligatoire */}
      <CampagneSelector 
        campagnes={campagnes}
        selectedCampagne={selectedCampagne}
        onSelect={handleCampagneSelect}
        loading={contextLoading}
      />

      {/* Statistiques modernes - Affichées seulement si une campagne est sélectionnée */}
      {selectedCampagne && stats.total > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={4} lg={2}>
            <StatsCard
              title="Total Participants"
              value={stats.total}
              icon={<Group />}
              color="primary"
              subtitle="Cette campagne"
            />
          </Grid>
          <Grid item xs={6} sm={4} lg={2}>
            <StatsCard
              title="Ont accepté"
              value={stats.oui}
              icon={<CheckCircle />}
              color="success"
              subtitle="Réponses positives"
            />
          </Grid>
          <Grid item xs={6} sm={4} lg={2}>
            <StatsCard
              title="En attente"
              value={stats.en_attente}
              icon={<Schedule />}
              color="info"
              subtitle="À rappeler"
            />
          </Grid>
          <Grid item xs={6} sm={4} lg={2}>
            <StatsCard
              title="Pas de réponse"
              value={stats.non}
              icon={<Cancel />}
              color="error"
              subtitle="Non joignables"
            />
          </Grid>
          <Grid item xs={6} sm={4} lg={2}>
            <StatsCard
              title="Ont refusé"
              value={stats.refuse}
              icon={<Cancel />}
              color="warning"
              subtitle="Refus explicites"
            />
          </Grid>
          <Grid item xs={6} sm={4} lg={2}>
            <StatsCard
              title="Importés"
              value={stats.imported}
              icon={<CloudUpload />}
              color="secondary"
              subtitle="Via fichiers"
            />
          </Grid>
        </Grid>
      )}

      {/* Section Filtres améliorée - Affichée seulement si une campagne est sélectionnée */}
      {selectedCampagne && (
        <Collapse in={expandedFilters}>
          <StyledCard sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Search />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      Filtres et recherche avancée
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Affinez vos critères de recherche pour cette campagne
                    </Typography>
                  </Box>
                </Box>
                
                {hasActiveFilters && (
                  <Button
                    variant="outlined"
                    startIcon={<Clear />}
                    onClick={clearFilters}
                    color="secondary"
                    sx={{ borderRadius: 2 }}
                  >
                    Réinitialiser
                  </Button>
                )}
              </Box>
              
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={filters.statut}
                      onChange={(e) => handleFilterChange('statut', e.target.value)}
                      label="Statut"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">
                        <em>Tous les statuts</em>
                      </MenuItem>
                      <MenuItem value="en_attente">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Schedule fontSize="small" color="info" />
                          En attente d'appel
                        </Box>
                      </MenuItem>
                      <MenuItem value="oui">
                        <Box display="flex" alignItems="center" gap={1}>
                          <CheckCircle fontSize="small" color="success" />
                          A accepté (OUI)
                        </Box>
                      </MenuItem>
                      <MenuItem value="non">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Cancel fontSize="small" color="error" />
                          Pas de réponse
                        </Box>
                      </MenuItem>
                      <MenuItem value="refuse">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Cancel fontSize="small" color="warning" />
                          A refusé
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Rechercher nom, téléphone, adresse..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2 
                      } 
                    }}
                  />
                </Grid>

                
              </Grid>
            </CardContent>
          </StyledCard>
        </Collapse>
      )}

      {/* Tableau moderne des participants - Affiché seulement si une campagne est sélectionnée */}
      {selectedCampagne && (
        <StyledCard elevation={2}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Assessment />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Participants de la campagne
                    </Typography>
                    {totalCount > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {totalCount} participant{totalCount > 1 ? 's' : ''} trouvé{totalCount > 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                {stats.en_attente > 0 && (
                  <Alert 
                    severity="info" 
                    sx={{ 
                      py: 0.5,
                      borderRadius: 2,
                      '& .MuiAlert-icon': { fontSize: '1.2rem' }
                    }}
                  >
                    <Typography variant="body2" fontWeight="500">
                      {stats.en_attente} appel{stats.en_attente > 1 ? 's' : ''} en attente
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Box>

            {contextLoading || loading ? (
              <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" py={8}>
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Chargement des participants...
                </Typography>
              </Box>
            ) : localParticipants.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Avatar 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    margin: '0 auto 24px',
                    color: 'primary.main'
                  }}
                >
                  <Group fontSize="large" />
                </Avatar>
                <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="600">
                  Aucun participant trouvé
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                  {hasActiveFilters 
                    ? 'Aucun participant ne correspond aux critères de filtrage sélectionnés dans cette campagne.' 
                    : 'Cette campagne ne contient pas encore de participants. Commencez par importer ou ajouter des participants.'
                  }
                </Typography>
                {hasActiveFilters && (
                  <Button 
                    variant="contained" 
                    onClick={clearFilters} 
                    startIcon={<Clear />}
                    sx={{ borderRadius: 2 }}
                  >
                    Effacer les filtres
                  </Button>
                )}
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          Participant
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          Contact
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          Statut
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          Chronologie
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {localParticipants.map((participant, index) => (
                        <TableRow 
                          key={participant.id} 
                          hover
                          sx={{
                            '&:hover': { 
                              bgcolor: alpha(theme.palette.primary.main, 0.04),
                              transform: 'translateY(-1px)',
                              transition: 'all 0.2s ease'
                            },
                            borderLeft: `4px solid ${
                              participant.statut === 'oui' ? theme.palette.success.main :
                              participant.statut === 'non' ? theme.palette.error.main :
                              participant.statut === 'refuse' ? theme.palette.warning.main :
                              theme.palette.info.main
                            }`,
                            animation: `fadeInUp 0.5s ease ${index * 0.1}s both`
                          }}
                        >
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar 
                                sx={{ 
                                  bgcolor: participant.sexe === 'M' ? 'primary.main' : 'secondary.main',
                                  width: 48,
                                  height: 48,
                                  fontWeight: 'bold',
                                  fontSize: '1.1rem'
                                }}
                              >
                                {participant.prenom?.[0]}{participant.nom?.[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                                  {participant.prenom} {participant.nom}
                                </Typography>
                                {participant.date_naissance && (
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(participant.date_naissance).toLocaleDateString('fr-FR')}
                                  </Typography>
                                )}
                                {participant.cin && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    CIN: {participant.cin}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Stack spacing={1}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Phone fontSize="small" color="primary" />
                                <Typography variant="body2" fontFamily="monospace" fontWeight="500">
                                  {participant.telephone}
                                </Typography>
                              </Box>
                              {participant.email && (
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Email fontSize="small" color="action" />
                                  <Typography variant="caption" color="text.secondary">
                                    {participant.email}
                                  </Typography>
                                </Box>
                              )}
                              <Box display="flex" alignItems="center" gap={1}>
                                <LocationOn fontSize="small" color="action" />
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    maxWidth: 180, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {participant.adresse}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          
                          
                          
                          <TableCell>
                            <AnimatedChip
                              icon={getStatutIcon(participant.statut)}
                              label={
                                participant.statut === 'oui' ? 'A accepté (OUI)' :
                                participant.statut === 'non' ? 'Pas de réponse' :
                                participant.statut === 'refuse' ? 'A refusé' :
                                'En attente'
                              }
                              color={getStatutColor(participant.statut)}
                              variant="filled"
                              sx={{ fontWeight: 'bold' }}
                            />
                          </TableCell>
                          
                          <TableCell>
                            <Stack spacing={1}>
                              {participant.date_import && (
                                <Typography variant="caption" color="text.secondary">
                                  Import: {new Date(participant.date_import).toLocaleDateString('fr-FR')}
                                </Typography>
                              )}
                              {participant.date_appel ? (
                                <Typography variant="caption" color="primary.main" fontWeight="500">
                                  Appelé: {formatDateTime(participant.date_appel)}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="warning.main" fontWeight="500">
                                  Aucun appel
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.secondary">
                                Modifié: {new Date(participant.updated_at).toLocaleDateString('fr-FR')}
                              </Typography>
                            </Stack>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Tooltip title="Gérer l'appel" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleEditStatut(participant)}
                                sx={{
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  color: 'primary.main',
                                  '&:hover': { 
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <PhoneInTalk fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination moderne */}
                <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                  <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={(event, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                      setRowsPerPage(parseInt(event.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="Lignes par page:"
                    labelDisplayedRows={({ from, to, count }) => 
                      `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
                    }
                    sx={{
                      '& .MuiTablePagination-toolbar': {
                        paddingLeft: 3,
                        paddingRight: 3
                      },
                      '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                        fontWeight: 500
                      }
                    }}
                  />
                </Box>
              </>
            )}
          </CardContent>
        </StyledCard>
      )}

      {/* Dialog de gestion du statut */}
      <StatutDialog
        open={statutDialogOpen}
        onClose={() => setStatutDialogOpen(false)}
        participant={selectedParticipant}
        onUpdate={handleStatutUpdate}
        showNotification={showNotification}
      />

      {/* Styles CSS pour les animations */}
      <style jsx>{`
        .rotating {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Box>
  );
};

export default ParticipantsManager;