import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton,
  Tooltip, TextField, FormControl, InputLabel, Select, MenuItem, Stack,
  Avatar, Alert, CircularProgress, TablePagination, InputAdornment,
  LinearProgress, Badge, Snackbar, Dialog, DialogTitle, DialogContent
} from '@mui/material';
import {
  Visibility, CalendarToday, LocationOn, People, Search, Refresh,
  TrendingUp, Assessment, PendingActions, CheckCircle
} from '@mui/icons-material';
import { useReception } from '../../contexts/ReceptionContext';
import { receptionApi } from '../../services/receptionApi';
import { useNotification } from '../../contexts/NotificationContext';
import { upasAPI } from '../../services/upasAPI';
import * as XLSX from 'xlsx';

// ===== CONSTANTES =====
const COLORS = {
  PRIMARY: "#3b82f6",
  SUCCESS: "#10b981", 
  DANGER: "#ef4444",
  WARNING: "#f59e0b",
  INFO: "#06b6d4",
  BACKGROUND: "#f9fafb",
  PURPLE: "#8b5cf6"
};

// ===== FONCTION DE GÉNÉRATION EXCEL =====
const generateExcelFile = (participants, typeAssistance, campagneNom, metadata, shouldDownloadEmpty = false, filePrefix = 'participants') => {
  try {
    console.log('Génération Excel:', participants.length, 'participants');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${filePrefix}_attente_${typeAssistance?.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;
    
    const maxPerFile = 20000;
    const shouldSplit = participants.length > maxPerFile;
    
    if (shouldSplit) {
      const totalFiles = Math.ceil(participants.length / maxPerFile);
      const files = [];
      
      for (let fileIndex = 0; fileIndex < totalFiles; fileIndex++) {
        const start = fileIndex * maxPerFile;
        const end = Math.min(start + maxPerFile, participants.length);
        const chunk = participants.slice(start, end);
        
        const chunkFileName = `${filePrefix}_attente_${typeAssistance?.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}_part${fileIndex + 1}.xlsx`;
        const workbook = createWorkbook(chunk, typeAssistance, campagneNom, metadata, shouldDownloadEmpty, fileIndex + 1, totalFiles);
        
        XLSX.writeFile(workbook, chunkFileName);
        files.push({ fileName: chunkFileName, count: chunk.length });
      }
      
      return { success: true, files, totalCount: participants.length, split: true };
    } else {
      const workbook = createWorkbook(participants, typeAssistance, campagneNom, metadata, shouldDownloadEmpty);
      XLSX.writeFile(workbook, fileName);
      
      return { success: true, fileName, count: participants.length, split: false };
    }
  } catch (error) {
    console.error('Erreur génération Excel:', error);
    return { success: false, error: error.message };
  }
};

const createWorkbook = (participants, typeAssistance, campagneNom, metadata, shouldDownloadEmpty = false, partNumber = null, totalParts = null) => {
  const wb = XLSX.utils.book_new();

  // ===== FEUILLE 1: DONNÉES =====
  let donnees;
  
  if (participants.length === 0 && shouldDownloadEmpty) {
    donnees = [{
      'nom': '', 'prenom': '', 'date_naissance': '', 'telephone': '', 'email': '',
      'sexe': '', 'adresse': '', 'cin': '', 'statut': 'en_attente', 'date_appel': '',
      
    }];
  } else {
    donnees = participants.map((p) => {
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          return !isNaN(date.getTime()) ? date.toLocaleDateString('fr-FR') : '';
        } catch { return ''; }
      };

      const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          return !isNaN(date.getTime()) ? date.toLocaleString('fr-FR') : '';
        } catch { return ''; }
      };

      return {
        'nom': p.nom || '',
        'prenom': p.prenom || '',
        'date_naissance': formatDate(p.date_naissance),
        'telephone': p.telephone ? `'${p.telephone}` : '',
        'email': p.email || '',
        'sexe': p.sexe === 'M' ? 'M' : p.sexe === 'F' ? 'F' : '',
        'adresse': p.adresse || '',
        'cin': p.cin ? `'${p.cin}` : '',
        'statut': p.statut || 'en_attente',
        'date_appel': formatDateTime(p.date_appel),
      };
    });
  }

  const wsDonnees = XLSX.utils.json_to_sheet(donnees);
  wsDonnees['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
    { wch: 8 }, { wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 20 }
  ];

  const sheetName = partNumber ? `Données Part ${partNumber}` : 'Données';
  XLSX.utils.book_append_sheet(wb, wsDonnees, sheetName);

  // ===== FEUILLE 2: RAPPORT =====
  const rapportData = [
    [partNumber ? `RAPPORT RÉCUPÉRATION - PARTIE ${partNumber}/${totalParts}` : 'RAPPORT RÉCUPÉRATION PARTICIPANTS'],
    [''],
    ['Informations générales'],
    ['Campagne destinataire', campagneNom || 'Non définie'],
    ['Type d\'assistance', typeAssistance || 'Non défini'],
    ['Date de génération', new Date().toLocaleDateString('fr-FR')],
    ['Heure de génération', new Date().toLocaleTimeString('fr-FR')],
    [''],
    ['Statistiques'],
    ['Participants dans cette partie', participants.length],
    ['Total participants trouvés', metadata?.totalParticipantsEnAttente || participants.length],
    [''],
    ['Campagne source'],
    ['Nom', metadata?.derniere_campagne?.nom || 'N/A'],
    ['ID', metadata?.derniere_campagne?.id || 'N/A'],
    ['Date fin', metadata?.derniere_campagne?.date_fin ? 
      new Date(metadata.derniere_campagne.date_fin).toLocaleDateString('fr-FR') : 'N/A']
  ];

  if (participants.length === 0) {
    rapportData.splice(10, 0, 
      ['ATTENTION: Aucun participant trouvé'],
      ['Raison', metadata?.message || 'Aucune donnée disponible']
    );
  }

  const wsRapport = XLSX.utils.aoa_to_sheet(rapportData);
  wsRapport['!cols'] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsRapport, 'Rapport');

  // ===== FEUILLE 3: SUIVI =====
  const suiviData = [
    ['FEUILLE DE SUIVI - À COMPLÉTER'],
    [''],
    ['Instructions: Mettez à jour les statuts après contact'],
    [''],
    ['ID', 'Nom', 'Prénom', 'Téléphone', 'Statut Initial', 'Nouveau Statut', 'Date Appel', 'Commentaire']
  ];

  if (participants.length === 0) {
    suiviData.push(['', '', '', '', 'en_attente', '', '', '']);
  } else {
    suiviData.push(...participants.slice(0, Math.min(50, participants.length)).map((p, index) => [
      p.id || index + 1,
      p.nom || '',
      p.prenom || '',
      p.telephone ? `'${p.telephone}` : '',
      p.statut || 'en_attente',
      '',
      '',
      ''
    ]));
  }

  const wsSuivi = XLSX.utils.aoa_to_sheet(suiviData);
  wsSuivi['!cols'] = [
    { wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(wb, wsSuivi, 'Feuille de Suivi');

  return wb;
};

// ===== MODAL DE PROGRESSION =====
const ProgressModal = ({ open, progress, message }) => (
  <Dialog open={open} disableEscapeKeyDown maxWidth="sm" fullWidth>
    <DialogTitle>
      <Stack direction="row" alignItems="center" spacing={2}>
        <CircularProgress size={24} />
        <Typography variant="h6">Récupération en cours...</Typography>
      </Stack>
    </DialogTitle>
    <DialogContent>
      <Stack spacing={3}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {message}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4, mt: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {progress}%
          </Typography>
        </Box>
      </Stack>
    </DialogContent>
  </Dialog>
);

// ===== ✅ BOUTON PARTICIPANTS EN ATTENTE (VERSION API) =====
const WaitingParticipantsButton = ({ campagne, typesAssistance, onNotification }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [waitingCount, setWaitingCount] = useState(0);
  const [progressModal, setProgressModal] = useState({ open: false, progress: 0, message: '' });

  const handleRecupererParticipants = async () => {
    setIsLoading(true);
    setProgressModal({ open: true, progress: 0, message: 'Initialisation...' });
    
    try {
      const typeAssistanceId = campagne.type_assistance_id || campagne.type_assistance?.id;
      
      if (!typeAssistanceId) {
        onNotification('Type d\'assistance non défini pour cette campagne', 'error');
        return;
      }

      setProgressModal({ open: true, progress: 20, message: 'Connexion à l\'API...' });

      // ✅ UTILISATION DE LA NOUVELLE API
      const result = await receptionApi.getParticipantsEnAttenteLastCampagne(
        campagne.id,
        typeAssistanceId
      );

      setProgressModal({ open: true, progress: 60, message: 'Traitement des données...' });
      
      const typeAssistance = typesAssistance.find(t => t.id == typeAssistanceId);
      const typeAssistanceLibelle = typeAssistance?.libelle || 
                                   campagne.type_assistance_libelle ||
                                   `Type ${typeAssistanceId}`;
      
      if (result.success && result.data && result.data.length > 0) {
        setWaitingCount(result.data.length);
        
        setProgressModal({ open: true, progress: 80, message: 'Génération du fichier Excel...' });

        const metadata = {
          derniere_campagne: result.derniere_campagne,
          type_assistance: result.type_assistance,
          totalParticipantsEnAttente: result.data.length,
          message: result.message
        };

        const downloadResult = generateExcelFile(
          result.data,
          typeAssistanceLibelle,
          campagne.nom,
          metadata,
          false,
          'participants'
        );
        
        if (downloadResult.success) {
          setProgressModal({ open: true, progress: 100, message: 'Terminé!' });
          
          const message = downloadResult.split
            ? [
                `${downloadResult.totalCount} participants en attente récupérés!`,
                ``,
                `Fichiers générés (${downloadResult.files.length} parties):`,
                ...downloadResult.files.map(f => `• ${f.fileName} (${f.count} participants)`),
                ``,
                `Campagne source: ${result.derniere_campagne?.nom || 'N/A'}`,
                `Campagne destinataire: ${campagne.nom}`
              ].join('\n')
            : [
                `${result.data.length} participants en attente récupérés avec succès!`,
                ``,
                `Fichier: ${downloadResult.fileName}`,
                `Campagne source: ${result.derniere_campagne?.nom || 'N/A'}`,
                `Campagne destinataire: ${campagne.nom}`,
                ``,
                `3 feuilles: Données, Rapport, Feuille de suivi`
              ].join('\n');
          
          setTimeout(() => {
            onNotification(message, 'success');
          }, 500);
        }
      } else if (result.success && result.data.length === 0) {
        const downloadResult = generateExcelFile(
          [],
          typeAssistanceLibelle,
          campagne.nom,
          { 
            derniere_campagne: result.derniere_campagne,
            message: result.message
          },
          true,
          'participants'
        );
        
        if (downloadResult.success) {
          onNotification(
            [
              `Fichier modèle téléchargé!`,
              ``,
              `Raison: ${result.message}`,
              `Campagne destinataire: ${campagne.nom}`,
              ``,
              `Le fichier contient la structure pour saisie manuelle.`
            ].join('\n'),
            'info'
          );
        }
      } else {
        onNotification(result.message || 'Aucun participant en attente trouvé', 'warning');
      }
    } catch (error) {
      console.error('Erreur récupération participants:', error);
      onNotification('Erreur lors de la récupération: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setProgressModal({ open: false, progress: 0, message: '' });
      }, 1000);
    }
  };

  if (!campagne.nom || campagne.nom.trim() === '') {
    return null;
  }

  const typeAssistanceLibelle = () => {
    const typeId = campagne.type_assistance_id || campagne.type_assistance?.id;
    const type = typesAssistance.find(t => t.id == typeId);
    return type?.libelle || campagne.type_assistance_libelle || 'Type non défini';
  };

  return (
    <>
      <Tooltip title={`Récupérer les participants en attente - ${typeAssistanceLibelle()}`}>
        <IconButton
          size="small"
          onClick={handleRecupererParticipants}
          disabled={isLoading}
          sx={{
            color: COLORS.PURPLE,
            '&:hover': {
              backgroundColor: `${COLORS.PURPLE}20`,
              transform: 'scale(1.1)'
            }
          }}
        >
          {isLoading ? (
            <CircularProgress size={16} sx={{ color: COLORS.PURPLE }} />
          ) : waitingCount > 0 ? (
            <Badge badgeContent={waitingCount} color="secondary" max={999}>
              <PendingActions fontSize="small" />
            </Badge>
          ) : (
            <PendingActions fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
      
      <ProgressModal 
        open={progressModal.open}
        progress={progressModal.progress}
        message={progressModal.message}
      />
    </>
  );
};

// ===== COMPOSANTS UI =====
const StatusChip = ({ status }) => {
  const getStatusProps = (status) => {
    switch (status) {
      case 'en_cours':
        return { label: 'En cours', color: COLORS.SUCCESS, bgColor: `${COLORS.SUCCESS}20`, icon: '🟢' };
      case 'planifiee':
        return { label: 'Planifiée', color: COLORS.WARNING, bgColor: `${COLORS.WARNING}20`, icon: '🟡' };
      case 'terminee':
        return { label: 'Terminée', color: COLORS.INFO, bgColor: `${COLORS.INFO}20`, icon: '🔵' };
      default:
        return { label: status, color: '#6b7280', bgColor: '#6b728020', icon: '⚪' };
    }
  };

  const props = getStatusProps(status);
  
  return (
    <Chip
      label={`${props.icon} ${props.label}`}
      size="small"
      sx={{ 
        fontWeight: 600,
        backgroundColor: props.bgColor,
        color: props.color,
        border: `1px solid ${props.color}30`
      }}
    />
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card sx={{ 
    textAlign: 'center',
    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
    background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
    border: `1px solid ${color}30`,
    borderRadius: 3
  }}>
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} mb={1}>
        <Avatar sx={{ bgcolor: `${color}20`, color: color, width: 48, height: 48 }}>
          <Icon />
        </Avatar>
      </Stack>
      <Typography variant="h4" sx={{ color: color, fontWeight: 800, mb: 0.5 }}>
        {value?.toLocaleString() || 0}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {title}
      </Typography>
    </CardContent>
  </Card>
);

// ===== COMPOSANT PRINCIPAL =====
const CampaignsManager = () => {
  const { 
    campagnes, 
    campagnesLoading, 
    campagnesError, 
    loadCampagnes,
    typesAssistance,
    loadTypesAssistance
  } = useReception();
  
  const { showNotification } = useNotification();
  const [localTypesAssistance, setLocalTypesAssistance] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const safeShowNotification = (message, type = 'info') => {
    if (showNotification && typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      setNotification({ open: true, message, severity: type });
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const finalTypesAssistance = useMemo(() => {
    if (typesAssistance && typesAssistance.length > 0) return typesAssistance;
    return localTypesAssistance;
  }, [typesAssistance, localTypesAssistance]);

  useEffect(() => {
    const init = async () => {
      try {
        await loadCampagnes();
        if (loadTypesAssistance) await loadTypesAssistance();
        if (!typesAssistance || typesAssistance.length === 0) {
          await loadTypesAssistanceDirectly();
        }
      } catch (error) {
        console.error('Erreur initialisation:', error);
      }
    };
    init();
  }, []);

  const loadTypesAssistanceDirectly = async () => {
    setTypesLoading(true);
    try {
      let typesResponse;
      try {
        typesResponse = await upasAPI.getTypesAssistance();
      } catch {
        typesResponse = await receptionApi.getTypesAssistance();
      }

      if (typesResponse.data?.success && typesResponse.data?.data) {
        setLocalTypesAssistance(Array.isArray(typesResponse.data.data) ? typesResponse.data.data : []);
      } else {
        setLocalTypesAssistance([
          { id: 1, libelle: 'Lunettes' },
          { id: 2, libelle: 'Appareils Auditifs' },
          { id: 3, libelle: 'Fauteuils Roulants' }
        ]);
      }
    } catch (error) {
      console.error('Erreur chargement types:', error);
      setLocalTypesAssistance([
        { id: 1, libelle: 'Lunettes' },
        { id: 2, libelle: 'Appareils Auditifs' }
      ]);
    } finally {
      setTypesLoading(false);
    }
  };

  const calculateStatus = (dateDebut, dateFin) => {
    const now = new Date();
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    
    if (now < debut) return 'planifiee';
    if (now > fin) return 'terminee';
    return 'en_cours';
  };

  const filteredCampagnes = useMemo(() => {
    let filtered = campagnes
      .map(campagne => ({
        ...campagne,
        statut_calcule: calculateStatus(campagne.date_debut, campagne.date_fin)
      }))
      .filter(campagne => campagne.statut_calcule !== 'terminee');

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.nom.toLowerCase().includes(search) ||
        (c.lieu && c.lieu.toLowerCase().includes(search))
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(c => c.statut_calcule === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(c => 
        c.type_assistance_id == typeFilter || c.type_assistance?.id == typeFilter
      );
    }

    return filtered.sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut));
  }, [campagnes, searchTerm, statusFilter, typeFilter]);

  const paginatedCampagnes = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredCampagnes.slice(start, start + rowsPerPage);
  }, [filteredCampagnes, page, rowsPerPage]);

  const stats = useMemo(() => {
    const campagnesActives = campagnes.filter(c => calculateStatus(c.date_debut, c.date_fin) !== 'terminee');
    
    return {
      total: campagnesActives.length,
      enCours: campagnesActives.filter(c => calculateStatus(c.date_debut, c.date_fin) === 'en_cours').length,
      planifiees: campagnesActives.filter(c => calculateStatus(c.date_debut, c.date_fin) === 'planifiee').length,
      totalParticipants: campagnesActives.reduce((sum, c) => sum + (c.total_participants || 0), 0)
    };
  }, [campagnes]);

  const handleRefresh = async () => {
    try {
      await loadCampagnes();
      await loadTypesAssistanceDirectly();
      safeShowNotification('Données actualisées', 'success');
    } catch (error) {
      safeShowNotification('Erreur actualisation', 'error');
    }
  };

  if (campagnesError) {
    return (
      <Box sx={{ p: 3, backgroundColor: COLORS.BACKGROUND, minHeight: '100vh' }}>
        <Alert severity="error" action={<Button onClick={handleRefresh}>Réessayer</Button>}>
          {campagnesError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, backgroundColor: COLORS.BACKGROUND, minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 800, color: COLORS.PRIMARY, mb: 1,
            background: `linear-gradient(135deg, ${COLORS.PRIMARY} 0%, ${COLORS.INFO} 100%)`,
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Gestion des Campagnes
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
            Récupérez les participants en attente des campagnes terminées
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={campagnesLoading || typesLoading}
          sx={{ borderRadius: 2, '&:hover': { transform: 'translateY(-1px)' } }}
        >
          Actualiser
        </Button>
      </Box>

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard title="Total Actives" value={stats.total} icon={Assessment} color={COLORS.PRIMARY} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="En cours" value={stats.enCours} icon={TrendingUp} color={COLORS.SUCCESS} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Planifiées" value={stats.planifiees} icon={CalendarToday} color={COLORS.WARNING} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Participants" value={stats.totalParticipants} icon={People} color={COLORS.INFO} />
        </Grid>
      </Grid>

      {/* Filtres */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Statut" sx={{ borderRadius: 2 }}>
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="planifiee">Planifiée</MenuItem>
                  <MenuItem value="en_cours">En cours</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} label="Type" sx={{ borderRadius: 2 }} disabled={typesLoading}>
                  <MenuItem value="">Tous</MenuItem>
                  {finalTypesAssistance.map((type) => (
                    <MenuItem key={type.id} value={type.id}>{type.libelle}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {filteredCampagnes.length} résultat(s)
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          {campagnesLoading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress size={48} />
            </Box>
          ) : filteredCampagnes.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucune campagne active trouvée
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {campagnes.filter(c => calculateStatus(c.date_debut, c.date_fin) !== 'terminee').length === 0 
                  ? "Aucune campagne active disponible" 
                  : "Aucune campagne ne correspond aux critères"
                }
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Campagne</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Période</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Lieu</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Participants</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Statut</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedCampagnes.map((campagne, index) => (
                      <TableRow 
                        key={campagne.id} 
                        hover
                        sx={{
                          '&:hover': { backgroundColor: '#f1f5f9' },
                          backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                        }}
                      >
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight={700} color={COLORS.PRIMARY}>
                              {campagne.nom}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(() => {
                                const typeId = campagne.type_assistance_id || campagne.type_assistance?.id;
                                const type = finalTypesAssistance.find(t => t.id == typeId);
                                return type?.libelle || campagne.type_assistance_libelle || 'Type non défini';
                              })()}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight={600}>
                              {new Date(campagne.date_debut).toLocaleDateString('fr-FR')} - {new Date(campagne.date_fin).toLocaleDateString('fr-FR')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {Math.ceil((new Date(campagne.date_fin) - new Date(campagne.date_debut)) / (1000 * 60 * 60 * 24))} jours
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LocationOn fontSize="small" color="action" />
                            <Typography variant="body2">{campagne.lieu || 'Non spécifié'}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight={600}>
                              {campagne.total_participants || 0} total
                            </Typography>
                            {campagne.participants_oui > 0 && (
                              <Chip
                                label={`${campagne.participants_oui} confirmés`}
                                size="small"
                                sx={{
                                  backgroundColor: `${COLORS.SUCCESS}20`,
                                  color: COLORS.SUCCESS,
                                  fontWeight: 600
                                }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={campagne.statut_calcule} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <WaitingParticipantsButton 
                              campagne={campagne}
                              typesAssistance={finalTypesAssistance}
                              onNotification={safeShowNotification}
                            />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={filteredCampagnes.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Lignes par page:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
                sx={{ borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={8000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%', maxWidth: 600 }}
          variant="filled"
        >
          <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
            {notification.message}
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CampaignsManager;