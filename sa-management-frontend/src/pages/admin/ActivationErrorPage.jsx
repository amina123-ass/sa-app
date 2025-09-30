// ActivationErrorPage.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  Paper
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning,
  AdminPanelSettings,
  Home,
  Refresh
} from '@mui/icons-material';

const ActivationErrorPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorInfo, setErrorInfo] = useState({
    type: 'unknown',
    message: 'Une erreur inconnue s\'est produite.'
  });

  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    const errorTypes = {
      'email_not_verified': {
        type: 'warning',
        title: 'Email non vérifié',
        message: message || 'L\'utilisateur doit d\'abord vérifier son adresse email avant que le compte puisse être activé.',
        icon: <Warning sx={{ fontSize: 64, color: 'warning.main' }} />
      },
      'user_not_found': {
        type: 'error',
        title: 'Utilisateur non trouvé',
        message: message || 'L\'utilisateur demandé n\'existe pas ou a été supprimé.',
        icon: <ErrorIcon sx={{ fontSize: 64, color: 'error.main' }} />
      },
      'server_error': {
        type: 'error',
        title: 'Erreur serveur',
        message: message || 'Une erreur serveur s\'est produite. Veuillez réessayer plus tard.',
        icon: <ErrorIcon sx={{ fontSize: 64, color: 'error.main' }} />
      },
      'unknown': {
        type: 'error',
        title: 'Erreur inconnue',
        message: message || 'Une erreur inconnue s\'est produite.',
        icon: <ErrorIcon sx={{ fontSize: 64, color: 'error.main' }} />
      }
    };

    setErrorInfo(errorTypes[error] || errorTypes['unknown']);
  }, [searchParams]);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoToAdmin = () => {
    navigate('/admin/users');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AdminPanelSettings sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" component="h1">
              Erreur d'activation
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Système de gestion UPAS - Interface Administrateur
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Contenu de l'erreur */}
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {errorInfo.icon}
            
            <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
              {errorInfo.title}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
              {errorInfo.message}
            </Typography>

            <Alert severity={errorInfo.type} sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                {errorInfo.type === 'warning' ? (
                  <>
                    <strong>Action recommandée :</strong> Demandez à l'utilisateur de vérifier son email 
                    en consultant sa boîte de réception et en cliquant sur le lien de vérification.
                  </>
                ) : (
                  <>
                    <strong>Que faire :</strong> Vous pouvez essayer de rafraîchir la page ou 
                    retourner à la liste des utilisateurs pour réessayer.
                  </>
                )}
              </Typography>
            </Alert>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleRetry}
                startIcon={<Refresh />}
              >
                Réessayer
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                onClick={handleGoToAdmin}
                startIcon={<AdminPanelSettings />}
              >
                Gestion des utilisateurs
              </Button>
              
              <Button
                variant="text"
                onClick={handleGoHome}
                startIcon={<Home />}
              >
                Accueil
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Informations d'aide */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Besoin d'aide ?
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Si le problème persiste, voici quelques étapes que vous pouvez suivre :
          </Typography>
          
          <Box component="ul" sx={{ pl: 3, mb: 0 }}>
            <li>
              <Typography variant="body2" color="text.secondary">
                Vérifiez que l'utilisateur a bien reçu et cliqué sur le lien de vérification d'email
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Consultez les logs du système pour plus de détails sur l'erreur
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Contactez l'équipe technique si le problème persiste
              </Typography>
            </li>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ActivationErrorPage;