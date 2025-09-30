import React, { useState } from 'react';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { CloudUpload, Delete, Description, Add } from '@mui/icons-material';
import { upasService } from '../services/upasService';

const DocumentUploader = ({ assistanceId, documents = [], onDocumentsChange }) => {
  const [uploading, setUploading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newDocument, setNewDocument] = useState({
    file: null,
    nom_document: '',
    type_document: 'autre',
    obligatoire: false
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setNewDocument(prev => ({
        ...prev,
        file,
        nom_document: file.name
      }));
      setOpenDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!newDocument.file) return;

    setUploading(true);
    try {
      const response = await upasService.uploadDocument(assistanceId, newDocument);
      onDocumentsChange([...documents, response.document]);
      setOpenDialog(false);
      setNewDocument({
        file: null,
        nom_document: '',
        type_document: 'autre',
        obligatoire: false
      });
    } catch (error) {
      console.error('Erreur upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    try {
      await upasService.deleteDocument(assistanceId, documentId);
      onDocumentsChange(documents.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Erreur suppression:', error);
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Documents attachés</Typography>
        <input
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          style={{ display: 'none' }}
          id="file-upload"
          type="file"
          onChange={handleFileSelect}
        />
        <label htmlFor="file-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<CloudUpload />}
            disabled={uploading}
          >
            Ajouter un document
          </Button>
        </label>
      </Box>

      {uploading && <LinearProgress sx={{ mb: 2 }} />}

      {documents.length === 0 ? (
        <Alert severity="info">Aucun document attaché</Alert>
      ) : (
        <List>
          {documents.map((doc) => (
            <ListItem key={doc.id} divider>
              <Description sx={{ mr: 2, color: 'primary.main' }} />
              <ListItemText
                primary={doc.nom_document}
                secondary={`${doc.type_document} • ${formatFileSize(doc.taille_fichier)} • ${doc.extension.toUpperCase()}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => handleDelete(doc.id)}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Dialog pour configurer le document */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configurer le document</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nom du document"
            value={newDocument.nom_document}
            onChange={(e) => setNewDocument(prev => ({ ...prev, nom_document: e.target.value }))}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Type de document</InputLabel>
            <Select
              value={newDocument.type_document}
              onChange={(e) => setNewDocument(prev => ({ ...prev, type_document: e.target.value }))}
              label="Type de document"
            >
              <MenuItem value="medical">Médical</MenuItem>
              <MenuItem value="identite">Identité</MenuItem>
              <MenuItem value="justificatif">Justificatif</MenuItem>
              <MenuItem value="autre">Autre</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button onClick={handleUpload} variant="contained" disabled={uploading}>
            {uploading ? 'Upload...' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentUploader;