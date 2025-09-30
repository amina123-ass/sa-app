import React from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

export const LoadingScreen = ({ message = 'Chargement...', size = 60 }) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="400px"
      gap={3}
    >
      <Paper 
        elevation={2} 
        sx={{ 
          p: 4, 
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <CircularProgress size={size} thickness={4} />
        <Typography variant="h6" color="textSecondary" textAlign="center">
          {message}
        </Typography>
      </Paper>
    </Box>
  );
};