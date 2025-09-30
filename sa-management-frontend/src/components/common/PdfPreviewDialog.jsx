import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
} from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';

const PdfPreviewDialog = ({ open, onClose, pdfUrl, title = 'Aperçu PDF' }) => {
  const [loadError, setLoadError] = useState(false);

  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleIframeError = () => {
    setLoadError(true);
  };

  const handleIframeLoad = () => {
    setLoadError(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title}
        <Box>
          <IconButton onClick={handleOpenInNewTab} title="Ouvrir dans un nouvel onglet">
            <OpenInNew />
          </IconButton>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {loadError ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Impossible d'afficher l'aperçu du PDF dans cette fenêtre.
            </Alert>
            <Button
              variant="contained"
              onClick={handleOpenInNewTab}
              startIcon={<OpenInNew />}
            >
              Ouvrir dans un nouvel onglet
            </Button>
          </Box>
        ) : (
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              minHeight: '500px'
            }}
            onError={handleIframeError}
            onLoad={handleIframeLoad}
            title="Aperçu PDF"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button variant="contained" onClick={handleOpenInNewTab} startIcon={<OpenInNew />}>
          Ouvrir dans un nouvel onglet
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PdfPreviewDialog;
