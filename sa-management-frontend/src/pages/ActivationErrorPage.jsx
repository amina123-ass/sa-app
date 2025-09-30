// src/pages/ActivationErrorPage.jsx - Page d'erreur pour l'activation
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Alert,
  Chip
} from '@mui/material';
import {
  Error,
  Warning,
  Info,
  Login,
  Email,
  AdminPanelSettings,
  Refresh
} from '@mui/icons-material';

const ActivationErrorPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Récupérer les paramètres de l'URL
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  const getErrorConfig = () => {
    switch (error) {
      case 'email_not_verified':
        return {
          icon: <Email sx={{ fontSize: 64, color: 'warning.main' }} />,
          title: 'Email non vérifié',
          severity: 'warning',
          color: 'warning.main',
          suggestion: 'Vérifiez votre email avant de procéder à l\'activation.'
        };
      case 'user_not_found':
        return {
          icon: <Error sx={{ fontSize: 64, color: 'error.main' }} />,
          title: 'Utilisateur non trouvé',
          severity: 'error',
          color: 'error.main',
          suggestion: 'Vérifiez le lien d\'activation ou contactez l\'administrateur.'
        };
      case 'invalid_token':
        return {
          icon: <Warning sx={{ fontSize: 64, color: 'error.main' }} />,
          title: 'Lien invalide ou expiré',
          severity: 'error',
          color: 'error.main',
          suggestion: 'Demandez un nouveau lien d\'activation à l\'administrateur.'
        };
      case 'server_error':
        return {
          icon: <Error sx={{ fontSize: 64, color: 'error.main' }} />,
          title: 'Erreur serveur',
          severity: 'error',
          color: 'error.main',
          suggestion: 'Réessayez dans quelques instants ou contactez le support.'
        };
      default:
        return {
          icon: <Info sx={{ fontSize: 64, color: 'info.main' }} />,
          title: 'Problème d\'activation',
          severity: 'info',
          color: 'info.main',
          suggestion: 'Contactez l\'administrateur pour assistance.'
        };
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleLoginRedirect = () => {
    navigate('/login', {
      state: {
        message: 'Vous pouvez essayer de vous connecter si votre compte est déjà activé.',
        type: 'info'
      }
    });
  };

  const handleContactAdmin = () => {
    // Logique pour contacter l'admin (email, formulaire, etc.)
    // Pour l'instant, on peut afficher les informations de contact
    alert('Contactez l\'administrateur à : admin@upas.ma');
  };

  const errorConfig = getErrorConfig();

  return (
    <Container maxWidth="sm" sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      py: 4
    }}>
      <Paper elevation={6} sx={{ 
        p: 4, 
        textAlign: 'center', 
        width: '100%',
        borderRadius: 3,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        {/* Icône d'erreur */}
        <Box sx={{ mb: 3 }}>
          {errorConfig.icon}
        </Box>

        {/* Titre */}
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            color: errorConfig.color,
            fontWeight: 'bold',
            mb: 2
          }}
        >
          {errorConfig.title}
        </Typography>

        {/* Message d'erreur */}
        {message && (
          <Alert 
            severity={errorConfig.severity} 
            sx={{ 
              mb: 3,
              '& .MuiAlert-message': {
                fontSize: '1.1rem'
              }
            }}
          >
            {message}
          </Alert>
        )}

        {/* Suggestion */}
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            mb: 3, 
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AdminPanelSettings sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" color="primary.main" fontWeight="bold">
              Que faire maintenant ?
            </Typography>
          </Box>
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            {errorConfig.suggestion}
          </Typography>
          
          <Chip 
            icon={<Email />}
            label="Support disponible"
            color="primary"
            variant="outlined"
            sx={{ mb: 1 }}
          />
        </Paper>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {error === 'server_error' && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<Refresh />}
              onClick={handleRetry}
              sx={{ minWidth: 150 }}
            >
              Réessayer
            </Button>
          )}
          
          <Button
            variant="outlined"
            size="large"
            startIcon={<Login />}
            onClick={handleLoginRedirect}
            sx={{ minWidth: 150 }}
          >
            Connexion
          </Button>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<AdminPanelSettings />}
            onClick={handleContactAdmin}
            sx={{ 
              minWidth: 150,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
            }}
          >
            Contacter Admin
          </Button>
        </Box>

        {/* Informations supplémentaires */}
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Code d'erreur : {error || 'UNKNOWN'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Si le problème persiste, notez ce code lors de votre demande d'assistance.
          </Typography>
        </Box>

        {/* Conseils supplémentaires selon le type d'erreur */}
        {error === 'email_not_verified' && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Conseil :</strong> Vérifiez votre boîte email (y compris les spams) 
                pour le lien de vérification d'email.
              </Typography>
            </Alert>
          </Box>
        )}

        {error === 'invalid_token' && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Note :</strong> Les liens d'activation ont une durée de validité limitée 
                pour des raisons de sécurité.
              </Typography>
            </Alert>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ActivationErrorPage;