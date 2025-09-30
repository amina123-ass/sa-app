// src/components/upas/ActionsMasseDialog.js
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Group,
  CheckCircle,
  Cancel,
  SwapHoriz,
  Link as LinkIcon,
  Delete
} from '@mui/icons-material';
import { useUpas } from '../../contexts/UpasContext';
import { useNotification } from '../../contexts/NotificationContext';

const ActionsMasseDialog = ({ open, onClose, selectedIds, onSuccess }) => {
  const { formData, actionsMasseBeneficiaires, loadBeneficiaires } = useUpas();
  const { showNotification } = useNotification();

  const [action, setAction] = useState('');
  const [typeAssistanceId, setTypeAssistanceId] = useState('');
  const [campagneId, setCampagneId] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const actions = [
    { value: 'confirmer', label: 'Confirmer les bénéficiaires', icon: <CheckCircle />, color: 'success' },
    { value: 'refuser', label: 'Refuser les bénéficiaires', icon: <Cancel />, color: 'error' },
    { value: 'changer_type', label: 'Changer le type d\'assistance', icon: <SwapHoriz />, color: 'info' },
    { value: 'associer_campagne', label: 'Associer à une campagne', icon: <LinkIcon />, color: 'primary' },
    { value: 'supprimer', label: 'Supprimer les bénéficiaires', icon: <Delete />, color: 'error' }
  ];

  const handleSubmit = async () => {
    if (!action) {
      showNotification('Veuillez sélectionner une action', 'error');
      return;
    }

    if (action === 'changer_type' && !typeAssistanceId) {
      showNotification('Veuillez sélectionner un type d\'assistance', 'error');
      return;
    }

    if (action === 'associer_campagne' && !campagneId) {
      showNotification('Veuillez sélectionner une campagne', 'error');
      return;
    }

    // Confirmation pour les actions critiques
    if (action === 'supprimer') {
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir supprimer ${selectedIds.length} bénéficiaire(s) ? Cette action est irréversible.`
      );
      if (!confirmed) return;
    }

    if (action === 'refuser') {
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir refuser ${selectedIds.length} bénéficiaire(s) ?`
      );
      if (!confirmed) return;
    }

    setProcessing(true);
    try {
      const requestData = {
        action,
        beneficiaires_ids: selectedIds,
        commentaire
      };

      if (action === 'changer_type') {
        requestData.type_assistance_id = typeAssistanceId;
      }

      if (action === 'associer_campagne') {
        requestData.campagne_id = campagneId;
      }

      const response = await actionsMasseBeneficiaires(requestData);
      setResult(response);
      
      // Recharger la liste des bénéficiaires
      await loadBeneficiaires();
      
      showNotification(
        `${response.traites} bénéficiaire(s) traité(s) avec succès`,
        response.erreurs?.length > 0 ? 'warning' : 'success'
      );

      if (response.erreurs?.length === 0) {
        // Fermer automatiquement si pas d'erreurs
        setTimeout(() => {
          handleClose();
        }, 2000);
      }

    } catch (error) {
      showNotification('Erreur lors du traitement en masse', 'error');
      setResult(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setAction('');
      setTypeAssistanceId('');
      setCampagneId('');
      setCommentaire('');
      setResult(null);
      onClose();
      if (result?.traites > 0) {
        onSuccess?.();
      }
    }
  };

  const selectedAction = actions.find(a => a.value === action);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Group />
          Actions en masse
          <Chip 
            label={`${selectedIds.length} sélectionné(s)`}
            size="small"
            color="primary"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Sélection de l'action */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Action à effectuer *</InputLabel>
            <Select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              disabled={processing}
            >
              {actions.map((actionItem) => (
                <MenuItem key={actionItem.value} value={actionItem.value}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {actionItem.icon}
                    {actionItem.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Aperçu de l'action */}
        {selectedAction && (
          <Alert 
            severity={selectedAction.color === 'error' ? 'warning' : 'info'}
            sx={{ mb: 3 }}
          >
            <Typography variant="body2">
              <strong>{selectedAction.label}</strong> sera appliquée à {selectedIds.length} bénéficiaire(s).
            </Typography>
          </Alert>
        )}

        {/* Champs spécifiques selon l'action */}
        {action === 'changer_type' && (
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Nouveau type d'assistance *</InputLabel>
              <Select
                value={typeAssistanceId}
                onChange={(e) => setTypeAssistanceId(e.target.value)}
                disabled={processing}
              >
                {formData?.types_assistance?.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.libelle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {action === 'associer_campagne' && (
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Campagne de destination *</InputLabel>
              <Select
                value={campagneId}
                onChange={(e) => setCampagneId(e.target.value)}
                disabled={processing}
              >
                {formData?.campagnes_actives?.map((campagne) => (
                  <MenuItem key={campagne.id} value={campagne.id}>
                    {campagne.nom} - {campagne.type_assistance?.libelle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Note: Seuls les bénéficiaires avec un type d'assistance compatible seront associés.
            </Typography>
          </Box>
        )}

        {/* Commentaire optionnel */}
        {(action === 'confirmer' || action === 'refuser') && (
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label={`Commentaire ${action === 'refuser' ? '(motif du refus)' : '(optionnel)'}`}
              multiline
              rows={3}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              disabled={processing}
              placeholder={
                action === 'refuser' 
                  ? 'Indiquez le motif du refus...'
                  : 'Commentaire optionnel...'
              }
            />
          </Box>
        )}

        {/* Progress */}
        {processing && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Traitement en cours...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {/* Résultats */}
        {result && (
          <Box sx={{ mb: 3 }}>
            <Alert 
              severity={result.erreurs?.length > 0 ? "warning" : "success"}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                <strong>Résultat:</strong> {result.traites} bénéficiaire(s) traité(s) sur {result.total}
              </Typography>
            </Alert>

            {result.erreurs?.length > 0 && (
              <Box>
                <Typography variant="h6" color="error" gutterBottom>
                  Erreurs rencontrées ({result.erreurs.length}):
                </Typography>
                <Box 
                  sx={{ 
                    maxHeight: 200, 
                    overflow: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    p: 1
                  }}
                >
                  <List dense>
                    {result.erreurs.map((erreur, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemText 
                          primary={erreur}
                          primaryTypographyProps={{ 
                            variant: 'body2',
                            color: 'error'
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Avertissements */}
        {action === 'supprimer' && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Attention:</strong> La suppression est irréversible. 
              Les bénéficiaires seront définitivement supprimés de la base de données.
            </Typography>
          </Alert>
        )}

        {action === 'associer_campagne' && campagneId && (
          <Box sx={{ mb: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="textSecondary">
              <strong>Campagne sélectionnée:</strong>
            </Typography>
            {formData?.campagnes_actives?.find(c => c.id == campagneId) && (
              <Box sx={{ mt: 1, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2">
                  {formData.campagnes_actives.find(c => c.id == campagneId).nom}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Type: {formData.campagnes_actives.find(c => c.id == campagneId).type_assistance?.libelle}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Période: {formData.campagnes_actives.find(c => c.id == campagneId).date_debut} - {formData.campagnes_actives.find(c => c.id == campagneId).date_fin}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={processing}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!action || processing}
          color={selectedAction?.color || 'primary'}
          startIcon={processing ? <LinearProgress size={20} /> : selectedAction?.icon}
        >
          {processing ? 'Traitement...' : `Appliquer (${selectedIds.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActionsMasseDialog;