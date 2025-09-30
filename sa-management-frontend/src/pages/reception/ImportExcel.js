/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useRef, useEffect } from 'react';
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
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
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
  FilePresent,
  Visibility,
  GetApp,
  Cancel,
  PlayArrow,
  PersonAdd,
  PersonRemove,
  PersonOff
} from '@mui/icons-material';

// Import du service réel
import { receptionService, NOUVEAUX_STATUTS, STATUTS_PARTICIPANTS } from '../../services/receptionService';

// Hook de notification personnalisé si useNotification n'est pas disponible
const useCustomNotification = () => {
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const NotificationComponent = () => (
    <Snackbar
      open={notification.open}
      autoHideDuration={6000}
      onClose={hideNotification}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert onClose={hideNotification} severity={notification.severity} sx={{ width: '100%' }}>
        {notification.message}
      </Alert>
    </Snackbar>
  );

  return { showNotification, NotificationComponent };
};

// Hook de notification sécurisé
const useSafeNotification = () => {
  try {
    // Tentative d'import du contexte de notification réel
    const { useNotification } = require('../../contexts/NotificationContext');
    const context = useNotification();
    
    if (context && typeof context.showNotification === 'function') {
      return { ...context, NotificationComponent: () => null };
    }
  } catch (error) {
    console.log('Contexte de notification non disponible, utilisation du hook personnalisé');
  }
  
  // Fallback vers le hook personnalisé
  return useCustomNotification();
};

// Composant pour les instructions d'import AVEC NOUVEAUX STATUTS
const ImportInstructions = () => {
  const [expanded, setExpanded] = useState(false);

  const downloadTemplate = () => {
    // Template CSV VIDE avec seulement les en-têtes - pas de données d'exemple
    const headers = ['nom', 'prenom', 'telephone', 'adresse', 'email', 'date_naissance', 'sexe', 'cin', 'statut'];
    
    // Seulement les en-têtes, pas de données d'exemple
    const csvContent = headers.join(';');
    
    // Création du fichier avec BOM UTF-8 pour Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_participants_vide.csv';
    link.click();
    
    // Nettoyage de l'URL après téléchargement
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 100);
  };

};

// Composant pour afficher les résultats AVEC NOUVEAUX STATUTS
const ImportResults = ({ results, onNewImport, onViewDetails }) => {
  if (!results) return null;

  const hasErrors = results.errors && results.errors.length > 0;
  
  // Support des nouveaux statuts dans les résultats
  const reponduCount = results.repondu_count || 0;
  const neRepondPasCount = results.ne_repond_pas_count || 0;
  const nonContacteCount = results.non_contacte_count || 0;
  
  // Fallback pour l'ancien format
  const totalTraite = results.total_traite || (reponduCount + neRepondPasCount + nonContacteCount) || 
                     ((results.inserted || 0) + (results.updated || 0) + (results.skipped || 0));

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircle sx={{ mr: 1 }} />
          Import terminé avec les nouveaux statuts
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
      
      {/* Statistiques par nouveaux statuts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
            <PersonAdd sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4">
              {reponduCount}
            </Typography>
            <Typography variant="body2">A répondu</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'error.main', color: 'white' }}>
            <PersonRemove sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4">
              {neRepondPasCount}
            </Typography>
            <Typography variant="body2">Ne répond pas</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'white' }}>
            <PersonOff sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4">
              {nonContacteCount}
            </Typography>
            <Typography variant="body2">Non contacté</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: hasErrors ? 'error.light' : 'grey.400', color: 'white' }}>
            <Error sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4">
              {results.errors?.length || 0}
            </Typography>
            <Typography variant="body2">Erreurs</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Résumé de l'import */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" gutterBottom>
          📊 Résumé de l'import
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body1">
              <strong>Campagne :</strong> {results.campagne}
            </Typography>
            <Typography variant="body2">
              Total traité : {totalTraite} participants
            </Typography>
            <Typography variant="body2">
              Nouveau créés : {results.nouveau_crees || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              Mis à jour : {results.mis_a_jour || 'N/A'}
            </Typography>
            {results.processed_at && (
              <Typography variant="body2">
                Traité le {new Date(results.processed_at).toLocaleString('fr-FR')}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Boutons d'action */}
      <Box display="flex" gap={2} sx={{ mb: 2 }}>
        {onViewDetails && (
          <Button
            variant="contained"
            color="primary"
            onClick={onViewDetails}
            size="small"
          >
            Voir détails des participants
          </Button>
        )}
        {(reponduCount > 0 || neRepondPasCount > 0 || nonContacteCount > 0) && (
          <Button
            variant="outlined"
            onClick={() => {
              // Logique pour afficher les listes par statut
              console.log('Affichage des listes par statut');
            }}
            size="small"
          >
            Voir par statut
          </Button>
        )}
      </Box>

      {/* Erreurs détaillées */}
      {hasErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>{results.errors.length} erreur(s) rencontrée(s) :</strong>
          </Typography>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Ligne</strong></TableCell>
                  <TableCell><strong>Erreur</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.errors.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>{error.line || 'N/A'}</TableCell>
                    <TableCell>{error.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Alert>
      )}
    </Box>
  );
};

// Composant principal ImportExcel MIS À JOUR
const ImportExcel = () => {
  // États
  const [campagnes, setCampagnes] = useState([]);
  const [loadingCampagnes, setLoadingCampagnes] = useState(true);
  const [selectedCampagne, setSelectedCampagne] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef();
  const { showNotification, NotificationComponent } = useSafeNotification();

  // Charger les campagnes depuis la base de données
  useEffect(() => {
    loadCampagnes();
  }, []);

  const loadCampagnes = async () => {
    try {
      setLoadingCampagnes(true);
      setError(null);
      
      console.log('📡 Chargement des campagnes depuis la base de données...');
      const response = await receptionService.getCampagnes();
      
      if (response.success) {
        setCampagnes(response.data || []);
        console.log('✅ Campagnes chargées:', response.data);
        
        if (response.data.length === 0) {
          setError('Aucune campagne disponible dans la base de données');
        }
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des campagnes');
      }
    } catch (err) {
      console.error('❌ Erreur chargement campagnes:', err);
      setError(`Impossible de charger les campagnes : ${err.message}`);
      setCampagnes([]);
    } finally {
      setLoadingCampagnes(false);
    }
  };

  // Validation du fichier avec les nouveaux statuts
  const validateFile = (file) => {
    const validationError = receptionService.validateImportFile(file);
    return validationError;
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        showNotification(validationError, 'error');
        return;
      }
      setSelectedFile(file);
      setResults(null);
      setError(null);
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
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        showNotification(validationError, 'error');
        return;
      }
      setSelectedFile(file);
      setResults(null);
      setError(null);
    }
  };

  // Import avec support des nouveaux statuts
  const handleImport = async () => {
    if (!selectedCampagne || !selectedFile) {
      const errorMsg = 'Veuillez sélectionner une campagne et un fichier';
      setError(errorMsg);
      showNotification(errorMsg, 'warning');
      return;
    }

    setLoading(true);
    setResults(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('campagne_id', selectedCampagne);

      console.log('📤 Import avec nouveaux statuts vers la base de données:', {
        campagne_id: selectedCampagne,
        file_name: selectedFile.name,
        file_size: selectedFile.size
      });

      // Utilisation du service mis à jour avec nouveaux statuts
      const response = await receptionService.importExcelNouveauxStatuts(formData);
      
      console.log('📥 Réponse API import avec nouveaux statuts:', response);

      if (response.success !== false) {
        // Format de réponse attendu avec les nouveaux statuts
        const importResults = {
          success: true,
          // Nouveaux compteurs par statut
          repondu_count: response.repondu_count || 0,
          ne_repond_pas_count: response.ne_repond_pas_count || 0,
          non_contacte_count: response.non_contacte_count || 0,
          
          // Informations complémentaires
          total_traite: response.total_traite || 0,
          nouveau_crees: response.nouveau_crees || 0,
          mis_a_jour: response.mis_a_jour || 0,
          errors: response.erreurs || [],
          
          // Détails campagne
          campagne: response.campagne?.nom || 
                   campagnes.find(c => c.id.toString() === selectedCampagne)?.nom || 
                   'Campagne inconnue',
          processed_at: response.processed_at || new Date().toISOString(),
          
          // Listes de participants (optionnel)
          listes: response.listes || null
        };

        setResults(importResults);
        
        // Notifications selon les résultats avec nouveaux statuts
        if (importResults.errors.length === 0) {
          showNotification(
            `🎉 Import réussi ! ${importResults.repondu_count} participants ont répondu, ` +
            `${importResults.ne_repond_pas_count} ne répondent pas, ` +
            `${importResults.non_contacte_count} non contactés`,
            'success'
          );
        } else {
          showNotification(
            `⚠️ Import partiel : ${importResults.total_traite} participants traités, ${importResults.errors.length} erreurs`,
            'warning'
          );
        }

        console.log('✅ Import avec nouveaux statuts terminé:', importResults);

      } else {
        throw new Error(response.message || 'Erreur lors de l\'import');
      }

    } catch (err) {
      console.error('❌ Erreur import avec nouveaux statuts:', err);
      
      // Gestion détaillée des erreurs
      let errorMessage = 'Erreur lors de l\'import avec les nouveaux statuts';
      
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        if (validationErrors && typeof validationErrors === 'object') {
          errorMessage = Object.values(validationErrors).flat().join('\n');
        } else {
          errorMessage = 'Erreur de validation des données du fichier (vérifiez la colonne statut)';
        }
      } else if (err.response?.status === 413) {
        errorMessage = 'Fichier trop volumineux (maximum 10MB)';
      } else if (err.response?.status === 404) {
        errorMessage = 'Route d\'import non trouvée - Vérifiez que la méthode importExcel est mise à jour dans ReceptionController';
      } else if (err.response?.status === 500) {
        errorMessage = 'Erreur serveur - Consultez les logs Laravel pour plus de détails';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedCampagne('');
    setResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const retryLoadCampagnes = () => {
    setError(null);
    loadCampagnes();
  };

  const handleViewDetails = () => {
    if (results && selectedCampagne) {
      // Navigation vers la page de détails de la campagne
      console.log('Navigation vers détails campagne:', selectedCampagne);
      // Vous pouvez utiliser votre système de navigation ici
      // par exemple: navigate(`/reception/campagnes/${selectedCampagne}/participants`);
    }
  };

  return (
    <Box p={3}>
      <NotificationComponent />
      
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
        📂 Import Excel avec Nouveaux Statuts
      </Typography>

      {/* Indicateur de connexion à la base de données */}
      <Alert 
        severity={loadingCampagnes ? 'info' : campagnes.length > 0 ? 'success' : 'error'} 
        sx={{ mb: 3 }}
        action={
          campagnes.length === 0 && !loadingCampagnes ? (
            <Button color="inherit" size="small" onClick={retryLoadCampagnes}>
              Réessayer
            </Button>
          ) : null
        }
      >
        {loadingCampagnes ? (
          <>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            Connexion à la base de données en cours...
          </>
        ) : campagnes.length > 0 ? (
          `✅ Connecté - ${campagnes.length} campagne(s) disponible(s) | Support des nouveaux statuts activé`
        ) : (
          '❌ Aucune campagne trouvée dans la base de données'
        )}
      </Alert>

      {/* Affichage des nouveaux statuts supportés */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          <strong>🆕 Nouveaux statuts de participants supportés :</strong>
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
          {STATUTS_PARTICIPANTS && STATUTS_PARTICIPANTS.map((statut) => {
            const info = receptionService.getStatutInfo ? receptionService.getStatutInfo(statut.value) : { icon: '📋', color: 'default' };
            return (
              <Chip
                key={statut.value}
                label={`${info.icon} ${statut.label}`}
                color={statut.color}
                size="small"
                variant="outlined"
              />
            );
          })}
        </Box>
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          Ces statuts permettent une meilleure répartition et suivi des participants
        </Typography>
      </Alert>

      {/* Affichage des erreurs */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <Box>
            <Typography variant="body2" component="div">
              {error}
            </Typography>
            {error.includes('Route') && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                💡 Vérifiez que la méthode importExcel est mise à jour dans ReceptionController.php avec support des nouveaux statuts
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      <ImportInstructions />

      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CloudUpload sx={{ mr: 1 }} />
            Sélection et import avec nouveaux statuts
          </Typography>

          {/* Sélection de la campagne */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Campagne médicale *</InputLabel>
            <Select
              value={selectedCampagne}
              onChange={(e) => setSelectedCampagne(e.target.value)}
              label="Campagne médicale *"
              disabled={loadingCampagnes || campagnes.length === 0}
            >
              {loadingCampagnes ? (
                <MenuItem disabled>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Chargement...
                </MenuItem>
              ) : campagnes.length === 0 ? (
                <MenuItem disabled>Aucune campagne disponible</MenuItem>
              ) : (
                campagnes.map((campagne) => (
                  <MenuItem key={campagne.id} value={campagne.id}>
                    <Box>
                      <Typography variant="body1">
                        {campagne.nom}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Du {new Date(campagne.date_debut).toLocaleDateString('fr-FR')} 
                        au {new Date(campagne.date_fin).toLocaleDateString('fr-FR')}
                        {campagne.statut && ` - ${campagne.statut}`}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
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
                borderColor: dragOver ? 'primary.main' : selectedFile ? 'success.main' : 'transparent',
                bgcolor: dragOver ? 'primary.lighter' : selectedFile ? 'success.lighter' : 'grey.50',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: selectedFile ? 'success.lighter' : 'grey.100'
                }
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
                        label={receptionService.formatFileSize ? receptionService.formatFileSize(selectedFile.size) : `${Math.round(selectedFile.size / 1024)} KB`} 
                        size="small" 
                        color="info" 
                      />
                      <Chip 
                        label={selectedFile.type.includes('sheet') || selectedFile.name.includes('.xlsx') || selectedFile.name.includes('.xls') ? 'Excel' : 'CSV'} 
                        size="small" 
                        color="success" 
                      />
                      <Chip 
                        label="✨ Nouveaux statuts" 
                        size="small" 
                        color="primary" 
                      />
                    </Box>
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Button variant="outlined" size="small" onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}>
                        <Visibility sx={{ mr: 0.5 }} /> Aperçu
                      </Button>
                      <Button variant="outlined" size="small">
                        Changer de fichier
                      </Button>
                    </Box>
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
                    <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 1 }}>
                      ✨ Avec support des nouveaux statuts de participants
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
                Import en cours avec traitement des nouveaux statuts...
              </Typography>
            </Box>
          )}

          {/* Boutons d'action */}
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!selectedCampagne || !selectedFile || loading || campagnes.length === 0}
              fullWidth
              size="large"
              sx={{ py: 1.5 }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
            >
              {loading ? 'Import avec nouveaux statuts...' : 'Lancer l\'import'}
            </Button>
            
            {(selectedFile || selectedCampagne) && !loading && (
              <Button
                variant="outlined"
                onClick={resetForm}
                size="large"
                sx={{ py: 1.5, minWidth: 120 }}
                startIcon={<Cancel />}
              >
                Réinitialiser
              </Button>
            )}
          </Box>

          {/* Résultats de l'import avec nouveaux statuts */}
          <ImportResults 
            results={results} 
            onNewImport={resetForm}
            onViewDetails={handleViewDetails}
          />
        </CardContent>
      </Card>

      {/* Dialog de prévisualisation */}
      {showPreview && selectedFile && (
        <Dialog open={true} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <Visibility sx={{ mr: 1 }} />
              Aperçu du fichier avec nouveaux statuts
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                La colonne "statut" sera automatiquement traitée lors de l'import.
                Valeurs acceptées : repondu, ne_repond_pas, non_contacte
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Prévisualisation disponible uniquement pour les fichiers CSV. 
              Les fichiers Excel seront traités lors de l'import.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPreview(false)}>Fermer</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default ImportExcel;