// src/components/upas/ImportDialog.js
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CloudUpload,
  GetApp,
  CheckCircle,
  Error,
  Info
} from '@mui/icons-material';
import { useUpas } from '../../contexts/UpasContext';
import { useNotification } from '../../contexts/NotificationContext';

const ImportDialog = ({ open, onClose }) => {
  const { formData, importExcel, downloadTemplateExcel } = useUpas();
  const { showNotification } = useNotification();

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCampagne, setSelectedCampagne] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Vérifier l'extension
      const allowedExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        showNotification('Seuls les fichiers Excel (.xlsx, .xls) sont autorisés', 'error');
        return;
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showNotification('Le fichier ne doit pas dépasser 10MB', 'error');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplateExcel();
      showNotification('Template téléchargé avec succès', 'success');
    } catch (error) {
      showNotification('Erreur lors du téléchargement du template', 'error');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showNotification('Veuillez sélectionner un fichier', 'error');
      return;
    }

    if (!selectedCampagne) {
      showNotification('Veuillez sélectionner une campagne', 'error');
      return;
    }

    setImporting(true);
    try {
      const result = await importExcel(selectedFile, selectedCampagne);
      setImportResult(result);
      showNotification('Import terminé avec succès', 'success');
    } catch (error) {
      showNotification('Erreur lors de l\'import', 'error');
      setImportResult(null);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setSelectedFile(null);
      setSelectedCampagne('');
      setImportResult(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CloudUpload />
          Import des Bénéficiaires
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Instructions */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Importez une liste de bénéficiaires à partir d'un fichier Excel. 
            Assurez-vous que votre fichier respecte le format du template.
          </Typography>
        </Alert>

        {/* Template download */}
        <Box sx={{ mb: 3, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            1. Télécharger le template
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Téléchargez le template Excel avec les colonnes requises et les exemples de données.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={handleDownloadTemplate}
          >
            Télécharger le template Excel
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Campagne selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            2. Sélectionner la campagne
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Campagne de destination *</InputLabel>
            <Select
              value={selectedCampagne}
              onChange={(e) => setSelectedCampagne(e.target.value)}
              disabled={importing}
            >
              {formData?.campagnes_actives?.map((campagne) => (
                <MenuItem key={campagne.id} value={campagne.id}>
                  {campagne.nom} - {campagne.type_assistance?.libelle}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* File upload */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            3. Sélectionner le fichier
          </Typography>
          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              backgroundColor: selectedFile ? '#f5f5f5' : 'transparent',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f9f9f9'
              }
            }}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={importing}
            />
            
            {selectedFile ? (
              <Box>
                <CheckCircle color="success" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body1" fontWeight="bold">
                  {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
            ) : (
              <Box>
                <CloudUpload sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                <Typography variant="body1">
                  Cliquez pour sélectionner un fichier Excel
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Formats acceptés: .xlsx, .xls (max 10MB)
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Progress */}
        {importing && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Import en cours...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {/* Results */}
        {importResult && (
          <Box sx={{ mb: 3 }}>
            <Alert 
              severity={importResult.erreurs?.length > 0 ? "warning" : "success"}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                Import terminé: {importResult.traites} bénéficiaires traités sur {importResult.total}
              </Typography>
            </Alert>

            {importResult.erreurs?.length > 0 && (
              <Box>
                <Typography variant="h6" color="error" gutterBottom>
                  Erreurs rencontrées:
                </Typography>
                <List dense>
                  {importResult.erreurs.slice(0, 10).map((erreur, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Error color="error" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={erreur}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                  {importResult.erreurs.length > 10 && (
                    <ListItem>
                      <ListItemIcon>
                        <Info color="info" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`... et ${importResult.erreurs.length - 10} autres erreurs`}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}
          </Box>
        )}

        {/* Instructions détaillées */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Instructions importantes:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="• Les colonnes obligatoires sont: Nom, Prénom, Téléphone"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="• Le format de date doit être: JJ/MM/AAAA"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="• Le sexe doit être 'M' ou 'F'"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="• Les doublons (même téléphone) seront ignorés"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="• Maximum 1000 lignes par import"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!selectedFile || !selectedCampagne || importing}
          startIcon={importing ? <LinearProgress size={20} /> : <CloudUpload />}
        >
          {importing ? 'Import en cours...' : 'Importer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;