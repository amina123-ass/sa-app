// src/components/NotificationDebugTest.js
import React from 'react';
import { Box, Typography, Button, Alert, Paper } from '@mui/material';
import { useNotificationDebug } from '../contexts/NotificationContext';

const NotificationDebugTest = () => {
  console.log('🧪 NotificationDebugTest: Composant de test chargé');
  
  const debugInfo = useNotificationDebug();
  
  console.log('🧪 Informations de débogage:', debugInfo);

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h6" gutterBottom color="primary">
        🧪 Test de Diagnostic - NotificationProvider
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          État du Provider:
        </Typography>
        
        {debugInfo.available ? (
          <Alert severity="success">
            ✅ NotificationProvider est disponible !
            <br />
            Méthodes disponibles: {debugInfo.keys.join(', ')}
          </Alert>
        ) : (
          <Alert severity="error">
            ❌ NotificationProvider NON disponible
            {debugInfo.error && (
              <>
                <br />
                Erreur: {debugInfo.error}
              </>
            )}
          </Alert>
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Informations de l'arbre React:
        </Typography>
        <Typography variant="body2" component="pre" sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
          {JSON.stringify(debugInfo, null, 2)}
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Ce composant teste si le NotificationProvider est correctement configuré.
        Si vous voyez une erreur, le provider n'enveloppe pas ce composant.
      </Typography>
    </Paper>
  );
};

export default NotificationDebugTest;