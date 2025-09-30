import React from 'react';
import { Alert, AlertTitle, Button, Box, Paper } from '@mui/material';
import { Refresh, Warning } from '@mui/icons-material';

export const ErrorAlert = ({ 
  error, 
  onRetry, 
  title = 'Une erreur est survenue',
  showIcon = true 
}) => {
  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Alert
        severity="error"
        icon={showIcon ? <Warning /> : false}
        action={
          onRetry && (
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              startIcon={<Refresh />}
              variant="outlined"
            >
              Réessayer
            </Button>
          )
        }
      >
        <AlertTitle sx={{ fontWeight: 'bold' }}>{title}</AlertTitle>
        <Box component="div" sx={{ mt: 1 }}>
          {typeof error === 'string' ? error : 'Une erreur inattendue est survenue'}
        </Box>
      </Alert>
    </Paper>
  );
};