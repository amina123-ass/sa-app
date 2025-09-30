import React from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';
import { Refresh } from '@mui/icons-material';

const ErrorMessage = ({ 
  title = 'Une erreur est survenue',
  message,
  onRetry,
  severity = 'error',
  showRetry = true
}) => {
  return (
    <Alert 
      severity={severity}
      action={
        showRetry && onRetry && (
          <Button
            color="inherit"
            size="small"
            onClick={onRetry}
            startIcon={<Refresh />}
          >
            Réessayer
          </Button>
        )
      }
    >
      <AlertTitle>{title}</AlertTitle>
      {message}
    </Alert>
  );
};

export default ErrorMessage;
