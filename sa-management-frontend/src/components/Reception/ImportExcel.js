import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Chip,
  Grid,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error,
  Info,
  Warning,
  Description,
  ExpandMore,
  ExpandLess,
  Download,
  Refresh,
  FilePresent
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useReception } from '../../contexts/ReceptionContext';
import { receptionApi } from '../../services/receptionApi';
import { useNotification } from '../../contexts/NotificationContext';

// Composant pour les instructions d'import
const ImportInstructions = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
            <Description sx={{ mr: 1 }} />
            Instructions d'import
          </Typography>
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Format requis :</strong> Fichier Excel (.xlsx, .xls) ou CSV avec les colonnes suivantes
          </Typography>
        </Alert>

        <Collapse in={expanded}>
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" component="div">
                  <strong>📋 Colonnes obligatoires :</strong>
                  <List dense>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <Typography variant="body2" color="error.main">•</Typography>
                      </ListItemIcon>
                      <ListItemText primary="nom" secondary="Nom de famille du participant" />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <Typography variant="body2" color="error.main">•</Typography>
                      </ListItemIcon>
                      <ListItemText primary="prenom" secondary="Prénom du participant" />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <Typography variant="body2" color="error.main">•</Typography>
                      </ListItemIcon>
                      <ListItemText primary="telephone" secondary="Numéro de téléphone" />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <Typography variant="body2" color="error.main">•</Typography>
                      </ListItemIcon>
                      <ListItemText primary="adresse" secondary="Adresse complète" />
                    </ListItem>
                  </List>
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" component="div">
                  <strong>📝 Colonnes optionnelles :</strong>
                  <List dense>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <Typography variant="body2" color="info.main">•</Typography>
                      </ListItemIcon>
                      <ListItemText primary="email" secondary="Adresse email" />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <Typography variant="body2" color="info.main">•</Typography>
                      </ListItemIcon>
                      <ListItemText primary="date_naissance" secondary="Format: DD/MM/YYYY" />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <Typography variant="body2" color="info.main">•</Typography>
                      </ListItemIcon>
                      <ListItemText primary="sexe" secondary="M (Masculin) ou F (Féminin)" />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <Typography variant="body2" color="info.main">•</Typography>
                      </ListItemIcon>
                      <ListItemText primary="cin" secondary="Numéro de carte d'identité" />
                    </ListItem>
                  </List>
                </Typography>
              </Grid>
            </Grid>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>⚠️ Important :</strong> Les en-têtes de colonnes doivent correspondre exactement aux noms indiqués.
                Taille maximum : 10MB. Formats supportés : .xlsx, .xls, .csv
              </Typography>
            </Alert>
          </Paper>
        </Collapse>
      </CardContent>
    </Card>
  );
};

// Composant pour afficher les détails des résultats
const ImportResults = ({ results, onNewImport }) => {
  if (!results) return null;

  const hasErrors = results.errors && results.errors.length > 0;
  const hasWarnings = results.warnings && results.warnings.length > 0;

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircle sx={{ mr: 1 }} />
          Import terminé
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onNewImport}
          size="small"
        >
          Nouvel import
        </Button>
      </Box>
      
      {/* Statistiques principales */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.lighter' }}>
            <Typography variant="h4" color="success.main">
              {results.inserted || 0}
            </Typography>
            <Typography variant="body2">Ajoutés</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'info.lighter' }}>
            <Typography variant="h4" color="info.main">
              {results.updated || 0}
            </Typography>
            <Typography variant="body2">Mis à jour</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.lighter' }}>
            <Typography variant="h4" color="warning.main">
              {results.skipped || 0}
            </Typography>
            <Typography variant="body2">Ignorés</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'error.lighter' }}>
            <Typography variant="h4" color="error.main">
              {results.errors?.length || 0}
            </Typography>
            <Typography variant="body2">Erreurs</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Détails de la campagne */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'primary.lighter' }}>
        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
          <Info sx={{ mr: 1 }} color="primary" />
          <strong>Campagne :</strong> {results.campagne}
        </Typography>
        {results.processed_at && (
          <Typography variant="body2" color="text.secondary">
            Traité le {format(new Date(results.processed_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
          </Typography>
        )}
      </Paper>

      {/* Erreurs */}
      {hasErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Erreurs rencontrées :</strong>
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ligne</TableCell>
                  <TableCell>Erreur</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.errors.slice(0, 10).map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>{error.line || 'N/A'}</TableCell>
                    <TableCell>{error.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {results.errors.length > 10 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              ... et {results.errors.length - 10} autres erreurs
            </Typography>
          )}
        </Alert>
      )}

      {/* Avertissements */}
      {hasWarnings && (
        <Alert severity="warning">
          <Typography variant="body2" gutterBottom>
            <strong>Avertissements :</strong>
          </Typography>
          <List dense>
            {results.warnings.slice(0, 5).map((warning, index) => (
              <ListItem key={index} disablePadding>
                <ListItemText primary={warning} />
              </ListItem>
            ))}
          </List>
          {results.warnings.length > 5 && (
            <Typography variant="caption" color="text.secondary">
              ... et {results.warnings.length - 5} autres avertissements
            </Typography>
          )}
        </Alert>
      )}
    </Box>
  );
};

const ImportExcel = () => {
  const { campagnes } = useReception();
  const { showNotification } = useNotification();
  const fileInputRef = useRef();
  
  const [selectedCampagne, setSelectedCampagne] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Validation du fichier
  const validateFile = (file) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Format de fichier non supporté. Utilisez Excel (.xlsx, .xls) ou CSV.';
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      return 'Le fichier est trop volumineux (maximum 10MB)';
    }

    return null;
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        showNotification(error, 'error');
        return;
      }
      setSelectedFile(file);
      setResults(null); // Reset results when new file selected
    }
  };

  // Gestion du drag & drop
  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        showNotification(error, 'error');
        return;
      }
      setSelectedFile(file);
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!selectedCampagne || !selectedFile) {
      showNotification('Veuillez sélectionner une campagne et un fichier', 'warning');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('campagne_id', selectedCampagne);

      const response = await receptionApi.importExcel(formData);
      
      setResults(response.data);
      
      // Message de succès personnalisé
      const { inserted = 0, updated = 0, errors = [] } = response.data;
      if (errors.length === 0) {
        showNotification(
          `Import réussi : ${inserted} ajoutés, ${updated} mis à jour`,
          'success'
        );
      } else {
        showNotification(
          `Import partiel : ${inserted} ajoutés, ${updated} mis à jour, ${errors.length} erreurs`,
          'warning'
        );
      }

    } catch (error) {
      let message = 'Erreur lors de l\'import';
      
      if (error.response?.data?.errors) {
        // Si l'API retourne un objet d'erreurs détaillées
        const errors = error.response.data.errors;
        if (typeof errors === 'object') {
          message = Object.values(errors).flat().join('\n');
        } else if (Array.isArray(errors)) {
          message = errors.join('\n');
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      
      showNotification(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedCampagne('');
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        📂 Import Excel des Participants
      </Typography>

      <ImportInstructions />

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CloudUpload sx={{ mr: 1 }} />
            Sélection et import
          </Typography>

          {/* Sélection de la campagne */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Campagne médicale *</InputLabel>
            <Select
              value={selectedCampagne}
              onChange={(e) => setSelectedCampagne(e.target.value)}
              label="Campagne médicale *"
            >
              {campagnes.map((campagne) => (
                <MenuItem key={campagne.id} value={campagne.id}>
                  <Box>
                    <Typography variant="body1">
                      {campagne.nom_campagne}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Du {format(new Date(campagne.date_debut), 'dd/MM/yyyy', { locale: fr })} au {format(new Date(campagne.date_fin), 'dd/MM/yyyy', { locale: fr })}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Zone de dépôt de fichier */}
          <Box sx={{ mb: 3 }}>
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            
            <Paper
              elevation={dragOver ? 4 : 1}
              sx={{
                p: 3,
                border: dragOver ? '2px dashed' : '2px solid transparent',
                borderColor: dragOver ? 'primary.main' : 'transparent',
                bgcolor: dragOver ? 'primary.lighter' : selectedFile ? 'success.lighter' : 'grey.50',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Box textAlign="center">
                {selectedFile ? (
                  <>
                    <FilePresent sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      {selectedFile.name}
                    </Typography>
                    <Box display="flex" justifyContent="center" gap={1} mb={2}>
                      <Chip 
                        label={formatFileSize(selectedFile.size)} 
                        size="small" 
                        color="info" 
                      />
                      <Chip 
                        label={selectedFile.type.includes('sheet') ? 'Excel' : 'CSV'} 
                        size="small" 
                        color="success" 
                      />
                    </Box>
                    <Button variant="outlined" size="small">
                      Changer de fichier
                    </Button>
                  </>
                ) : (
                  <>
                    <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Glissez votre fichier ici
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      ou cliquez pour sélectionner
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Formats acceptés : .xlsx, .xls, .csv (max 10MB)
                    </Typography>
                  </>
                )}
              </Box>
            </Paper>
          </Box>

          {/* Barre de progression */}
          {loading && (
            <Box sx={{ mb: 3 }}>
              <LinearProgress />
              <Typography variant="body2" textAlign="center" sx={{ mt: 1 }}>
                Import en cours, veuillez patienter...
              </Typography>
            </Box>
          )}

          {/* Boutons d'action */}
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!selectedCampagne || !selectedFile || loading}
              fullWidth
              size="large"
              sx={{ py: 1.5 }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
            >
              {loading ? 'Import en cours...' : 'Lancer l\'import'}
            </Button>
            
            {(selectedFile || selectedCampagne) && !loading && (
              <Button
                variant="outlined"
                onClick={resetForm}
                size="large"
                sx={{ py: 1.5, minWidth: 120 }}
              >
                Réinitialiser
              </Button>
            )}
          </Box>

          {/* Résultats de l'import */}
          <ImportResults 
            results={results} 
            onNewImport={resetForm}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default ImportExcel;