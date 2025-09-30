import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  CircularProgress,
} from '@mui/material';

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirmer l\'action',
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmColor = 'primary',
  loading = false,
  dangerous = false,
}) => {
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color={dangerous ? 'error' : confirmColor}
          variant={dangerous ? 'contained' : 'text'}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
