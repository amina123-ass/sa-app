// src/pages/EmailVerificationPage.jsx - Page de résultat de vérification d'email
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Info,
  Warning,
  Login,
  AdminPanelSettings,
  Mail
} from '@mui/icons-material';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Récupérer les paramètres de l'URL
  const status = searchParams.get('status');
  const message = searchParams.get('message');
  const userId = searchParams.get('user_id');
  const showAdminMessage = searchParams.get('show_admin_message');

  useEffect(() => {
    // Simuler un court délai pour l'affichage
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle sx={{ fontSize: 64, color: 'success.main' }} />,
          title: 'Email vérifié avec succès !',
          severity: 'success',
          color: 'success.main'
        };
      case 'already_verified':
        return {
          icon: <Info sx={{ fontSize: 64, color: 'info.main' }} />,
          title: 'Email déjà vérifié',
          severity: 'info',
          color: 'info.main'
        };
      case 'error':
        return {
          icon: <Error sx={{ fontSize: 64, color: 'error.main' }} />,
          title: 'Erreur de vérification',
          severity: 'error',
          color: 'error.main'
        };
      default:
        return {
          icon: <Warning sx={{ fontSize: 64, color: 'warning.main' }} />,
          title: 'Statut inconnu',
          severity: 'warning',
          color: 'warning.main'
        };
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login', {
      state: {
        message: 'Vous pouvez maintenant vous connecter une fois votre compte activé.',
        type: 'info'
      }
    });
  };

  const handleRetryVerification = () => {
    navigate('/register', {
      state: {
        message: 'Veuillez réessayer la procédure d\'inscription.',
        type: 'warning'
      }
    });
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', width: '100%' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6">
            Vérification en cours...
          </Typography>
        </Paper>
      </Container>
    );
  }

  const statusConfig = getStatusConfig();

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
        {/* Icône de statut */}
        <Box sx={{ mb: 3 }}>
          {statusConfig.icon}
        </Box>

        {/* Titre */}
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            color: statusConfig.color,
            fontWeight: 'bold',
            mb: 2
          }}
        >
          {statusConfig.title}
        </Typography>

        {/* Message principal */}
        {message && (
          <Alert 
            severity={statusConfig.severity} 
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

        {/* Message spécial pour l'activation */}
        {showAdminMessage === 'true' && (
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              mb: 3, 
              bgcolor: 'background.default',
              border: '2px solid',
              borderColor: 'primary.main'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AdminPanelSettings sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" color="primary.main" fontWeight="bold">
                Prochaine étape
              </Typography>
            </Box>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              Votre email a été vérifié avec succès ! Un administrateur doit maintenant 
              activer votre compte pour que vous puissiez vous connecter.
            </Typography>
            
            <Chip 
              icon={<Mail />}
              label="Vous recevrez un email dès l'activation de votre compte"
              color="primary"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <Typography variant="body2" color="text.secondary">
              Cette étape garantit la sécurité et la validation de tous les comptes utilisateurs.
            </Typography>
          </Paper>
        )}

        {/* Informations utilisateur */}
        {userId && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              ID utilisateur : {userId}
            </Typography>
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {status === 'success' || status === 'already_verified' ? (
            <>
              <Button
                variant="contained"
                size="large"
                startIcon={<Login />}
                onClick={handleLoginRedirect}
                sx={{ 
                  minWidth: 200,
                  py: 1.5,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
                }}
              >
                Aller à la connexion
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                size="large"
                onClick={handleRetryVerification}
                sx={{ minWidth: 150 }}
              >
                Réessayer
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<Login />}
                onClick={handleLoginRedirect}
                sx={{ minWidth: 150 }}
              >
                Connexion
              </Button>
            </>
          )}
        </Box>

        {/* Aide */}
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Besoin d'aide ?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contactez l'administrateur du système si vous rencontrez des problèmes.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default EmailVerificationPage;