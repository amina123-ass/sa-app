// src/components/NotificationTest.js - Composant de test
import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { Button, Box } from '@mui/material';

const NotificationTest = () => {
  const { showNotification } = useNotification();

  const testNotifications = () => {
    showNotification('Test de notification success', 'success', 'Succès');
    
    setTimeout(() => {
      showNotification('Test de notification info', 'info', 'Information');
    }, 1000);
    
    setTimeout(() => {
      showNotification('Test de notification warning', 'warning', 'Attention');
    }, 2000);
    
    setTimeout(() => {
      showNotification('Test de notification error', 'error', 'Erreur');
    }, 3000);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button 
        variant="contained" 
        onClick={testNotifications}
        sx={{ mb: 2 }}
      >
        Tester les notifications
      </Button>
      <div>
        <p>Si vous voyez ce composant sans erreur, le NotificationProvider fonctionne !</p>
      </div>
    </Box>
  );
};

export default NotificationTest;