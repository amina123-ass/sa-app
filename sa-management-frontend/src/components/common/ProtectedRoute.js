// src/components/common/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useUpasAuth } from '../../contexts/UpasContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useUpasAuth();
  const location = useLocation();

  // Affichage du loader pendant la vérification d'authentification
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Vérification de l'authentification...
        </Typography>
      </Box>
    );
  }

  // Redirection vers login si non authentifié
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Affichage du contenu protégé
  return children;
};

export default ProtectedRoute;