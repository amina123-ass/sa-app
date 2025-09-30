import React, { useState, useEffect } from 'react';
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
  Checkbox,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Menu,
  ListItemIcon,
  Stack,
  Avatar,
  TextField,
  InputAdornment,
  TablePagination,
  alpha,
  useTheme,
  Divider,
  Snackbar
} from '@mui/material';
import {
  Print,
  CheckCircle,
  Group,
  FileDownload,
  TableChart,
  MoreVert,
  Search,
  Refresh,
  TrendingUp,
  Assignment,
  Person,
  Phone,
  Email,
  LocationOn,
  AccessTime,
  VerifiedUser,
  Download,
  BusinessCenter,
  Close,
  LocalHospital,
  MedicalServices,
  HealthAndSafety,
  EventAvailable,
  ListAlt,
  PictureAsPdf
} from '@mui/icons-material';
import ReceptionLayout from '../../components/Layout/ReceptionLayout';
import { ReceptionProvider, useReception } from '../../contexts/ReceptionContext';
import { receptionApi } from '../../services/receptionApi';

// Pas besoin d'import externe - utilisation de l'API native du navigateur

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

// Composant de génération PDF HTML/CSS - NOUVELLE APPROCHE
const generateMedicalPDF = (participant, campagne) => {
  // Créer le contenu HTML pour le PDF
  const pdfContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Convocation Médicale - ${participant?.prenom} ${participant?.nom}</title>
      <style>
        @media print {
          @page { 
            margin: 10mm; 
            size: A4;
          }
          body { 
            margin: 0; 
            padding: 0;
            font-family: 'Arial', sans-serif;
            font-size: 10px;
            line-height: 1.3;
            color: #333;
          }
        }
        
        body {
          font-family: 'Arial', sans-serif;
          font-size: 10px;
          line-height: 1.3;
          color: #333;
          margin: 0;
          padding: 10mm;
          background: white;
        }
        
        .header-medical {
          text-align: center;
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
          color: white;
          padding: 10px;
          margin-bottom: 15px;
          border-radius: 5px;
        }
        
        .header-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .header-subtitle {
          font-size: 12px;
          margin-bottom: 3px;
        }
        
        .convocation-title {
          text-align: center;
          background: #ebf3fd;
          border: 2px solid #3498db;
          padding: 10px;
          margin: 15px 0;
          border-radius: 5px;
        }
        
        .convocation-title h2 {
          margin: 0;
          color: #2980b9;
          font-size: 18px;
        }
        
        .convocation-subtitle {
          text-align: center;
          color: #7f8c8d;
          margin-bottom: 20px;
        }
        
        .campaign-info {
          background: #ebf3fd;
          border-left: 4px solid #3498db;
          padding: 15px;
          margin: 15px 0;
          border-radius: 3px;
        }
        
        .campaign-title {
          color: #3498db;
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 8px;
        }
        
        .campaign-details {
          font-size: 9px;
          margin-bottom: 3px;
        }
        
        .status-confirmed {
          text-align: center;
          background: #3498db;
          color: white;
          padding: 12px;
          margin: 15px 0;
          border-radius: 5px;
          font-weight: bold;
          font-size: 14px;
        }
        
        .section-title {
          color: #2980b9;
          font-weight: bold;
          font-size: 12px;
          margin: 15px 0 10px 0;
          border-bottom: 2px solid #3498db;
          padding-bottom: 3px;
        }
        
        .patient-info {
          background: #fafafa;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 15px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .info-item {
          margin-bottom: 8px;
        }
        
        .info-label {
          font-weight: bold;
          color: #2980b9;
          font-size: 9px;
        }
        
        .info-value {
          color: #3498db;
          font-weight: 500;
          font-size: 9px;
        }
        
        .medical-details {
          background: #ebf3fd;
          border: 1px solid #3498db;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        
        .reference-number {
          text-align: center;
          margin: 20px 0;
        }
        
        .reference-box {
          background: #ebf3fd;
          border: 2px solid #3498db;
          padding: 8px 15px;
          border-radius: 5px;
          display: inline-block;
          font-weight: bold;
          color: #3498db;
          font-size: 12px;
        }
        
        .instructions {
          background: #fff3e0;
          border: 2px solid #ff9800;
          border-radius: 5px;
          padding: 15px;
          margin: 20px 0;
        }
        
        .instructions-title {
          color: #e65100;
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 8px;
        }
        
        .instructions-list {
          color: #bf360c;
          font-size: 9px;
          line-height: 1.4;
        }
        
        .signatures {
          margin-top: 25px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        
        .signature-box {
          text-align: center;
        }
        
        .signature-title {
          font-weight: bold;
          color: #3498db;
          font-size: 10px;
          margin-bottom: 20px;
        }
        
        .signature-line {
          border-top: 1px solid #3498db;
          margin-top: 25px;
          padding-top: 5px;
          font-size: 9px;
        }
        
        .footer {
          margin-top: 25px;
          text-align: center;
          border-top: 2px solid #3498db;
          padding-top: 10px;
        }
        
        .footer-title {
          color: #3498db;
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 5px;
        }
        
        .footer-details {
          color: #7f8c8d;
          font-size: 8px;
          margin-bottom: 3px;
        }
      </style>
    </head>
    <body>
      <!-- Header médical -->
      <div class="header-medical">
        <div class="header-title">DELEGATION PROVINCIALE DE SANTE - SEFROU</div>
        <div class="header-subtitle">Service de Santé Publique</div>
      </div>
      
      <!-- Titre de convocation -->
      <div class="convocation-title">
        <h2>CONVOCATION MEDICALE</h2>
      </div>
      <div class="convocation-subtitle">Campagne de Dépistage Préventif</div>
      
      <!-- Informations campagne -->
      <div class="campaign-info">
        <div class="campaign-title">🩺 ${campagne?.nom || 'Campagne de Dépistage Médical'}</div>
        <div class="campaign-details">📅 Période : ${
          campagne?.date_debut ? new Date(campagne.date_debut).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')
        } → ${
          campagne?.date_fin ? new Date(campagne.date_fin).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')
        }</div>
        <div class="campaign-details">📍 Lieu : ${campagne?.lieu || 'Centre de Santé - Délégation Provinciale Sefrou'}</div>
      </div>
      
      <!-- Statut confirmé -->
      <div class="status-confirmed">
        ✅ INSCRIPTION MEDICALE VALIDEE
      </div>
      
      <!-- Section informations patient -->
      <div class="section-title">👤 INFORMATIONS PATIENT</div>
      <div class="patient-info">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Nom complet :</div>
            <div class="info-value">${participant?.prenom || ''} ${participant?.nom || ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">N° Téléphone :</div>
            <div class="info-value">${participant?.telephone || 'Non précisé'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Adresse :</div>
            <div class="info-value">${participant?.adresse || 'Non précisé'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email :</div>
            <div class="info-value">${participant?.email || 'Non précisé'}</div>
          </div>
        </div>
      </div>
      
      <!-- Détails médicaux -->
      <div class="medical-details">
        <div class="campaign-title">📋 DETAILS MEDICAUX</div>
        <div class="info-item">
          <div class="info-label">Date de naissance :</div>
          <div class="info-value">${
            participant?.date_naissance ? 
            new Date(participant.date_naissance).toLocaleDateString('fr-FR') : 
            'Non précisé'
          }</div>
        </div>
        <div class="info-item">
          <div class="info-label">CIN :</div>
          <div class="info-value">${participant?.cin || 'Non précisé'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date de confirmation :</div>
          <div class="info-value">${
            participant?.date_appel ? 
            new Date(participant.date_appel).toLocaleDateString('fr-FR') + ' à ' + 
            new Date(participant.date_appel).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) :
            new Date().toLocaleDateString('fr-FR') + ' à ' + 
            new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          }</div>
        </div>
      </div>
      
      <!-- Numéro de référence -->
      <div class="reference-number">
        <strong>N° DOSSIER MEDICAL :</strong><br>
        <div class="reference-box">MED-${String(participant?.id || '000').padStart(6, '0')}</div>
      </div>
      
      <!-- Instructions préalables -->
      
      
      <!-- Zone signatures -->
      <div class="signatures">
        <div class="signature-box">
          <div class="signature-title">PATIENT</div>
          <div class="signature-line">Signature et date</div>
        </div>
        <div class="signature-box">
          <div class="signature-title">SERVICE MEDICAL</div>
          <div class="signature-line">Signature et cachet</div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <div class="footer-title">🏥 DOCUMENT MEDICAL OFFICIEL - A CONSERVER</div>
        <div class="footer-details">Délégation Provinciale de Santé - Sefrou | Tél: 05 35 66 XX XX</div>
        <div class="footer-details">Émis le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </body>
    </html>
  `;

  // Créer une nouvelle fenêtre pour l'impression
  const printWindow = window.open('', '_blank');
  printWindow.document.write(pdfContent);
  printWindow.document.close();

  // Attendre que le contenu se charge puis déclencher l'impression
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
      // Fermer la fenêtre après impression (optionnel)
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
  };
};

// Composant de dialog PDF - MODIFIÉ
const PDFGenerationDialog = ({ open, onClose, participant, campagne, onGenerate }) => {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      // Simuler un délai pour l'effet visuel
      await new Promise(resolve => setTimeout(resolve, 1000));
      generateMedicalPDF(participant, campagne);
      onGenerate?.('PDF généré avec succès', 'success');
      onClose();
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      onGenerate?.('Erreur lors de la génération du PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ bgcolor: '#3498db' }}>
            <PictureAsPdf />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Génération PDF
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Convocation médicale
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 3 }}>
          {generating ? (
            <Stack alignItems="center" spacing={3}>
              <CircularProgress size={60} sx={{ color: '#3498db' }} />
              <Typography variant="h6" color="#3498db">
                Génération du PDF en cours...
              </Typography>
              <Typography color="text.secondary">
                Création de la convocation médicale
              </Typography>
            </Stack>
          ) : (
            <Stack alignItems="center" spacing={3}>
              <Avatar sx={{ bgcolor: alpha('#3498db', 0.1), width: 80, height: 80 }}>
                <PictureAsPdf sx={{ fontSize: 40, color: '#3498db' }} />
              </Avatar>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Générer la convocation médicale PDF
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Pour : {participant?.prenom} {participant?.nom}
                </Typography>
                <Chip
                  icon={<LocalHospital />}
                  label="Document médical officiel"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Stack>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <Button
          onClick={onClose}
          disabled={generating}
          color="inherit"
        >
          Annuler
        </Button>
        <Button
          onClick={handleGeneratePDF}
          variant="contained"
          disabled={generating}
          startIcon={generating ? <CircularProgress size={20} /> : <PictureAsPdf />}
          sx={{
            backgroundColor: '#3498db',
            '&:hover': { backgroundColor: '#2980b9' }
          }}
        >
          {generating ? 'Génération...' : 'Générer PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const BeneficiairesOuiContent = () => {
  const theme = useTheme();
  const { campagnes } = useReception();
  
  // État pour les notifications
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
  
  const [selectedCampagne, setSelectedCampagne] = useState('');
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // État pour la dialog PDF - MODIFIÉ
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedParticipantForPDF, setSelectedParticipantForPDF] = useState(null);

  // Charger les participants ayant répondu OUI
  const loadParticipantsOui = async (campagneId) => {
    if (!campagneId) return;
    
    setLoading(true);
    try {
      const response = await receptionApi.getParticipants({
        campagne_id: campagneId,
        statut: 'oui'
      });
      const data = response.data.data || response.data;
      setParticipants(data);
      setFilteredParticipants(data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      showNotification('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      loadParticipantsOui(selectedCampagne);
    }
  }, [selectedCampagne]);

  // Fonction pour ouvrir la dialog PDF - MODIFIÉE
  const handleGenererPDF = (participant) => {
    setSelectedParticipantForPDF(participant);
    setPdfDialogOpen(true);
  };

  // Fonction pour convertir les données en CSV bien formaté (COLONNES SUPPRIMÉES)
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    // Headers simplifiés - colonnes supprimées : 'Statut médical', 'Heure de confirmation', 'Date de confirmation'
    const headers = [
      'Nom',
      'Prénom', 
      'Téléphone',
      'Email',
      'Adresse'
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
      // Données simplifiées - colonnes supprimées
      const row = [
        escapeCSV(participant.nom),
        escapeCSV(participant.prenom),
        escapeCSV(participant.telephone),
        escapeCSV(participant.email || ''),
        escapeCSV(participant.adresse || '')
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
      const response = await receptionApi.exportCSV({
        campagne_id: selectedCampagne,
        statut: 'oui'
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
      const filename = `participants_confirmes_${campagne?.nom.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification('Export CSV généré avec succès', 'success');
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
      const filename = `participants_confirmes_${campagne?.nom.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification('Export CSV généré avec succès', 'success');
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    if (!selectedCampagne) {
      showNotification('Veuillez sélectionner une campagne', 'warning');
      return;
    }

    try {
      const response = await receptionApi.exportExcel({
        campagne_id: selectedCampagne,
        statut: 'oui'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const campagne = campagnes.find(c => c.id === parseInt(selectedCampagne));
      const filename = `participants_confirmes_${campagne?.nom.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification('Export Excel généré avec succès', 'success');
    } catch (error) {
      showNotification('Export Excel non disponible, utilisez CSV', 'warning');
      handleExportCSV();
    }
  };

  // Sélection des participants
  const handleSelectParticipant = (participantId) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleSelectAll = () => {
    if (selectedParticipants.length === filteredParticipants.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(filteredParticipants.map(p => p.id));
    }
  };

  // Gestion du menu d'export
  const handleExportMenuClick = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
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
      p: { xs: 2, md: 4 }, 
      backgroundColor: '#f0f8ff', 
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Composant de notification */}
      <SimpleNotification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleCloseNotification}
      />

      {/* Background Pattern Médical */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
          opacity: 0.05,
          borderRadius: '0 0 24px 24px',
          zIndex: 0
        }}
      />

      {/* Header Médical Professionnel */}
      <Box sx={{ mb: 5, position: 'relative', zIndex: 1 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 3,
          p: 4,
          backgroundColor: 'white',
          borderRadius: 3,
          boxShadow: '0 4px 25px rgba(52, 152, 219, 0.15)',
          border: '1px solid rgba(52, 152, 219, 0.1)',
          borderLeft: '6px solid #3498db'
        }}>
          <Box sx={{ 
            background: 'linear-gradient(135deg, #3498db 0%, #3498db 100%)',
            borderRadius: 3,
            p: 3,
            mr: 4,
            boxShadow: '0 8px 32px rgba(52, 152, 219, 0.3)'
          }}>
            <LocalHospital sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: '#3498db',
                mb: 1,
                fontSize: { xs: '1.8rem', md: '2.2rem' }
              }}
            >
              Participants Confirmés
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#3498db',
                fontSize: '1.1rem',
                fontWeight: 500,
                mb: 1
              }}
            >
              Gestion des participants ayant confirmé leur participation médicale
            </Typography>
            
          </Box>
        </Box>
      </Box>

      {/* Panneau de contrôle médical */}
      <Card 
        elevation={0} 
        sx={{ 
          mb: 4, 
          borderRadius: 3,
          border: '1px solid rgba(52, 152, 219, 0.1)',
          background: 'linear-gradient(135deg, #ffffff 0%, #fbfdff 100%)',
          boxShadow: '0 4px 25px rgba(52, 152, 219, 0.08)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <Box sx={{
          background: 'linear-gradient(90deg, #3498db 0%, #3498db 100%)',
          height: 5
        }} />
        
        <CardContent sx={{ p: 4 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 3, 
              fontWeight: 700,
              color: '#3498db',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}
          >
            <MedicalServices sx={{ color: '#3498db' }} />
            Configuration Médicale
          </Typography>

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} lg={5}>
              <FormControl fullWidth variant="outlined">
                <InputLabel 
                  sx={{ 
                    fontWeight: 600,
                    '&.Mui-focused': { color: '#3498db' }
                  }}
                >
                  Sélectionner une campagne médicale
                </InputLabel>
                <Select
                  value={selectedCampagne}
                  onChange={(e) => setSelectedCampagne(e.target.value)}
                  label="Sélectionner une campagne médicale"
                  sx={{ 
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(52, 152, 219, 0.2)'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3498db'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3498db'
                    }
                  }}
                >
                  {campagnes.map((campagne) => (
                    <MenuItem key={campagne.id} value={campagne.id}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: '#3498db', width: 32, height: 32 }}>
                          <LocalHospital fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600} color="#3498db">{campagne.nom}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Campagne médicale
                          </Typography>
                        </Box>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<FileDownload />}
                  onClick={handleExportMenuClick}
                  disabled={!selectedCampagne || participants.length === 0}
                  sx={{
                    borderColor: '#3498db',
                    color: '#3498db',
                    fontWeight: 600,
                    borderWidth: 2,
                    '&:hover': {
                      borderColor: '#2980b9',
                      backgroundColor: alpha('#3498db', 0.08)
                    }
                  }}
                >
                  Exporter les données
                </Button>
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={handleExportMenuClose}
                >
                  <MenuItem onClick={() => { handleExportCSV(); handleExportMenuClose(); }}>
                    <ListItemIcon>
                      <TableChart fontSize="small" />
                    </ListItemIcon>
                    Export CSV
                  </MenuItem>
                  <MenuItem onClick={() => { handleExportExcel(); handleExportMenuClose(); }}>
                    <ListItemIcon>
                      <FileDownload fontSize="small" />
                    </ListItemIcon>
                    Export Excel
                  </MenuItem>
                </Menu>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={3}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={() => selectedCampagne && loadParticipantsOui(selectedCampagne)}
                disabled={!selectedCampagne || loading}
                sx={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#2980b9'
                  }
                }}
                fullWidth
              >
                Actualiser
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tableau de bord médical des statistiques */}
      {selectedCampagne && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={0} 
              sx={{ 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(52, 152, 219, 0.3)'
              }}
            >
              <Box sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)'
              }} />
              <CardContent sx={{ p: 3, position: 'relative' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    <HealthAndSafety sx={{ fontSize: 28, color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h3" fontWeight="bold">
                      {participants.length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                      Patients confirmés
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Dépistage médical
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
                borderRadius: 3,
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(39, 174, 96, 0.3)'
              }}
            >
              <Box sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)'
              }} />
              <CardContent sx={{ p: 3, position: 'relative' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    <CheckCircle sx={{ fontSize: 28, color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h3" fontWeight="bold">
                      100%
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                      Taux de confirmation
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Participants actifs
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
                borderRadius: 3,
                background: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(142, 68, 173, 0.3)'
              }}
            >
              <Box sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)'
              }} />
              <CardContent sx={{ p: 3, position: 'relative' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    <MedicalServices sx={{ fontSize: 28, color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {selectedCampagneData?.nom?.substring(0, 12) || 'N/A'}
                      {selectedCampagneData?.nom?.length > 12 && '...'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                      Campagne active
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Service médical
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Table médicale des participants */}
      {selectedCampagne && (
        <Card 
          elevation={0} 
          sx={{ 
            borderRadius: 3,
            border: '1px solid rgba(52, 152, 219, 0.1)',
            background: 'linear-gradient(135deg, #ffffff 0%, #fbfdff 100%)',
            boxShadow: '0 4px 25px rgba(52, 152, 219, 0.08)',
            overflow: 'hidden'
          }}
        >
          <CardContent sx={{ p: 0 }}>
            {/* Header médical avec recherche */}
            <Box sx={{ 
              p: 4, 
              background: 'linear-gradient(135deg, #fbfdff 0%, #ffffff 100%)',
              borderBottom: '2px solid rgba(52, 152, 219, 0.1)',
              borderLeft: '4px solid #3498db'
            }}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                justifyContent="space-between" 
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={3}
              >
                <Box>
                  <Typography 
                    variant="h5" 
                    fontWeight="700"
                    sx={{ 
                      color: '#2980b9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mb: 1
                    }}
                  >
                    <LocalHospital sx={{ color: '#3498db', fontSize: 28 }} />
                    Patients Confirmés ({filteredParticipants.length})
                  </Typography>
                  <Typography variant="body1" color="#3498db" sx={{ fontWeight: 500, mb: 1 }}>
                    Liste médicale des participants ayant accepté le dépistage
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      icon={<VerifiedUser />}
                      label="Confirmations validées"
                      size="small"
                      sx={{
                        backgroundColor: '#ebf3fd',
                        color: '#2980b9',
                        fontWeight: 600,
                        '& .MuiChip-icon': { color: '#3498db' }
                      }}
                    />
                  </Stack>
                </Box>
                
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="Rechercher un patient..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: '#3498db' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      minWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        borderRadius: 2,
                        border: '2px solid #ebf3fd',
                        '&:hover fieldset': {
                          borderColor: '#3498db'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3498db'
                        }
                      }
                    }}
                  />
                </Stack>
              </Stack>
            </Box>

            {loading ? (
              <Box display="flex" justifyContent="center" py={10}>
                <Stack alignItems="center" spacing={3}>
                  <CircularProgress size={60} sx={{ color: '#3498db' }} />
                  <Typography color="#3498db" fontWeight={600} variant="h6">
                    Chargement des données médicales...
                  </Typography>
                  <Typography color="text.secondary">
                    Récupération des participants confirmés
                  </Typography>
                </Stack>
              </Box>
            ) : filteredParticipants.length === 0 ? (
              <Box sx={{ p: 10, textAlign: 'center' }}>
                <Avatar sx={{ 
                  bgcolor: alpha('#3498db', 0.1), 
                  width: 100, 
                  height: 100, 
                  mx: 'auto', 
                  mb: 4 
                }}>
                  <LocalHospital fontSize="large" sx={{ color: '#3498db', fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom fontWeight={700} color="#2980b9">
                  {participants.length === 0 
                    ? "Aucun patient confirmé" 
                    : "Aucun résultat médical trouvé"
                  }
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', fontSize: '1.1rem' }}>
                  {participants.length === 0 
                    ? "Aucun patient n'a encore confirmé sa participation pour cette campagne médicale." 
                    : "Aucun patient ne correspond à votre recherche médicale. Vérifiez les critères de recherche."
                  }
                </Typography>
                <Box sx={{ mt: 4 }}>
                  <Chip
                    icon={<MedicalServices />}
                    label="Service de Dépistage"
                    sx={{
                      backgroundColor: '#ebf3fd',
                      color: '#2980b9',
                      fontWeight: 600,
                      px: 2,
                      py: 1
                    }}
                  />
                </Box>
              </Box>
            ) : (
              <>
                <Alert 
                  severity="success" 
                  sx={{ 
                    m: 4, 
                    mb: 0,
                    borderRadius: 3,
                    backgroundColor: '#ebf3fd',
                    border: '2px solid #3498db',
                    '& .MuiAlert-icon': { color: '#3498db', fontSize: 28 },
                    fontWeight: 600,
                    py: 2
                  }}
                  icon={<LocalHospital />}
                >
                  <Typography fontWeight={700} variant="h6" color="#2980b9">
                    {filteredParticipants.length} patient(s) confirmé(s) pour le dépistage médical
                  </Typography>
                  <Typography color="#3498db" sx={{ mt: 1 }}>
                    Ces patients ont validé leur participation. Vous pouvez générer leurs convocations médicales PDF.
                  </Typography>
                </Alert>
                
                <TableContainer sx={{ maxHeight: 650 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        
                        {[
                          { label: 'Patient', icon: <Person fontSize="small" /> },
                          { label: 'Contact Médical', icon: <Phone fontSize="small" /> },
                          { label: 'Adresse', icon: <LocationOn fontSize="small" /> },
                          { label: 'Statut Médical', icon: <HealthAndSafety fontSize="small" /> },
                          { label: 'Actions', icon: <PictureAsPdf fontSize="small" /> }
                        ].map((column, index) => (
                          <TableCell 
                            key={index}
                            sx={{ 
                              fontWeight: 700,
                              fontSize: '1rem',
                              color: '#2980b9',
                              backgroundColor: '#ebf3fd',
                              borderBottom: '3px solid #3498db',
                              py: 3
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {React.cloneElement(column.icon, { sx: { color: '#3498db' } })}
                              {column.label}
                            </Stack>
                          </TableCell>
                        ))}
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
                            '&:hover': { 
                              backgroundColor: alpha('#3498db', 0.04),
                              transform: 'scale(1.001)',
                              transition: 'all 0.2s ease'
                            },
                            opacity: selectedParticipants.includes(participant.id) ? 0.9 : 1,
                            backgroundColor: selectedParticipants.includes(participant.id) 
                              ? alpha('#3498db', 0.06) 
                              : 'transparent',
                            borderLeft: selectedParticipants.includes(participant.id) 
                              ? '5px solid #3498db' 
                              : '5px solid transparent',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Avatar sx={{ 
                                bgcolor: '#3498db', 
                                width: 48, 
                                height: 48,
                                boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)'
                              }}>
                                <Person fontSize="small" />
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight="700" color="#2980b9">
                                  {participant.prenom} {participant.nom}
                                </Typography>
                                {participant.email && (
                                  <Typography 
                                    variant="caption" 
                                    color="#3498db"
                                    sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 0.5,
                                      mt: 0.5,
                                      fontWeight: 500
                                    }}
                                  >
                                    <Email fontSize="inherit" />
                                    {participant.email}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<Phone fontSize="small" />}
                              label={participant.telephone}
                              variant="outlined"
                              size="small"
                              sx={{
                                borderColor: '#3498db',
                                color: '#3498db',
                                fontWeight: 600,
                                borderWidth: 2,
                                '& .MuiChip-icon': { color: '#3498db' }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                maxWidth: 200,
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                color: '#2980b9',
                                fontWeight: 500
                              }}
                            >
                              <LocationOn fontSize="small" sx={{ color: '#3498db' }} />
                              {participant.adresse || 'Non précisé'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<HealthAndSafety />}
                              label="Confirmé"
                              sx={{
                                backgroundColor: '#3498db',
                                color: 'white',
                                fontWeight: 700,
                                boxShadow: '0 3px 10px rgba(52, 152, 219, 0.4)',
                                '& .MuiChip-icon': { color: 'white' }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Générer PDF médical" arrow>
                              <IconButton
                                size="medium"
                                onClick={() => handleGenererPDF(participant)}
                                sx={{ 
                                  backgroundColor: alpha('#e74c3c', 0.1),
                                  color: '#e74c3c',
                                  borderRadius: 2,
                                  border: '2px solid #e74c3c',
                                  '&:hover': { 
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                    transform: 'scale(1.1)',
                                    boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)'
                                  },
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <PictureAsPdf />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ 
                  borderTop: '2px solid rgba(52, 152, 219, 0.1)',
                  backgroundColor: '#ebf3fd'
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
                      '& .MuiTablePagination-select': {
                        borderRadius: 2,
                        border: '1px solid #3498db'
                      },
                      '& .MuiTablePagination-actions button': {
                        borderRadius: 2,
                        border: '1px solid #3498db',
                        color: '#3498db',
                        '&:hover': {
                          backgroundColor: alpha('#3498db', 0.08)
                        }
                      },
                      '& .MuiTablePagination-displayedRows': {
                        color: '#2980b9',
                        fontWeight: 600
                      }
                    }}
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de génération PDF médical */}
      <PDFGenerationDialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        participant={selectedParticipantForPDF}
        campagne={selectedCampagneData}
        onGenerate={showNotification}
      />
    </Box>
  );
};

const BeneficiairesOui = () => {
  return (
    <ReceptionProvider>
      <ReceptionLayout>
        <BeneficiairesOuiContent />
      </ReceptionLayout>
    </ReceptionProvider>
  );
};

export default BeneficiairesOui;