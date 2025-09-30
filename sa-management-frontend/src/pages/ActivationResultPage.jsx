// src/pages/ActivationResultPage.jsx - Page de résultat d'activation
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Info,
  Login,
  Email,
  Security,
  Person,
  Celebration,
  AdminPanelSettings
} from '@mui/icons-material';

const ActivationResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  // Récupérer les paramètres de l'URL
  const status = searchParams.get('status');
  const message = searchParams.get('message');
  const userName = searchParams.get('user_name');
  const userEmail = searchParams.get('email');
  const userRole = searchParams.get('role');
  const emailSent = searchParams.get('email_sent') === 'true';
  const passwordGenerated = searchParams.get('password_generated') === 'true';
  const redirectTo = searchParams.get('redirect_to');

  useEffect(() => {
    // Démarrer le compte à rebours pour la redirection automatique
    if (status === 'success' && redirectTo === 'login') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/login', {
              state: {
                message: 'Votre compte a été activé ! Vous pouvez maintenant vous connecter.',
                type: 'success'
              }
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, redirectTo, navigate]);

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle sx={{ fontSize: 80, color: 'success.main' }} />,
          title: 'Compte activé avec succès !',
          color: 'success.main',
          severity: 'success',
          backgroundGradient: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)'
        };
      case 'already_active':
        return {
          icon: <Info sx={{ fontSize: 80, color: 'info.main' }} />,
          title: 'Compte déjà activé',
          color: 'info.main',
          severity: 'info',
          backgroundGradient: 'linear-gradient(135deg, #2196f3 0%, #03a9f4 100%)'
        };
      case 'error':
        return {
          icon: <Error sx={{ fontSize: 80, color: 'error.main' }} />,
          title: 'Erreur d\'activation',
          color: 'error.main',
          severity: 'error',
          backgroundGradient: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)'
        };
      default:
        return {
          icon: <Info sx={{ fontSize: 80, color: 'warning.main' }} />,
          title: 'Statut d\'activation',
          color: 'warning.main',
          severity: 'warning',
          backgroundGradient: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)'
        };
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login', {
      state: {
        message: 'Votre compte a été activé ! Vous pouvez maintenant vous connecter.',
        type: 'success'
      }
    });
  };

  const statusConfig = getStatusConfig();

  return (
    <Container maxWidth="md" sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      py: 4
    }}>
      {/* Header avec animation */}
      <Box sx={{ width: '100%' }}>
        <Paper 
          elevation={8} 
          sx={{ 
            p: 4, 
            textAlign: 'center', 
            borderRadius: 3,
            background: statusConfig.backgroundGradient,
            color: 'white',
            mb: 3
          }}
        >
          <Box sx={{ position: 'relative' }}>
            {status === 'success' && (
              <Celebration 
                sx={{ 
                  position: 'absolute', 
                  top: -20, 
                  right: -20, 
                  fontSize: 40,
                  animation: 'bounce 2s infinite'
                }} 
              />
            )}
            
            {statusConfig.icon}
            
            <Typography 
              variant="h3" 
              gutterBottom 
              sx={{ 
                fontWeight: 'bold',
                mt: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              {statusConfig.title}
            </Typography>
            
            {userName && (
              <Typography variant="h5" sx={{ opacity: 0.9, mb: 2 }}>
                Bienvenue, {userName} !
              </Typography>
            )}
          </Box>
        </Paper>

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

        {/* Informations détaillées pour succès */}
        {status === 'success' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AdminPanelSettings sx={{ mr: 1, color: 'success.main' }} />
                Détails de l'activation
              </Typography>
              
              <Box sx={{ display: 'grid', gap: 2, mt: 2 }}>
                {userEmail && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Email sx={{ mr: 2, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Adresse email
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {userEmail}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {userRole && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Security sx={{ mr: 2, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Rôle assigné
                      </Typography>
                      <Chip 
                        icon={<Security />}
                        label={userRole}
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Informations sur l'email et mot de passe */}
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom color="success.main">
                  🎉 Étapes suivantes
                </Typography>
                
                {emailSent && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      📧 Un email de confirmation avec vos identifiants de connexion vous a été envoyé à <strong>{userEmail}</strong>
                    </Typography>
                  </Alert>
                )}

                {passwordGenerated && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      🔐 Un mot de passe temporaire a été généré. <strong>Changez-le lors de votre première connexion</strong> pour sécuriser votre compte.
                    </Typography>
                  </Alert>
                )}

                <Typography variant="body2" color="text.secondary">
                  ✅ Votre compte est maintenant actif et prêt à être utilisé !
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
          {status === 'success' || status === 'already_active' ? (
            <Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<Login />}
                onClick={handleLoginRedirect}
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  mb: 2
                }}
              >
                Se connecter maintenant
              </Button>

              {status === 'success' && countdown > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Redirection automatique dans {countdown} secondes...
                </Typography>
              )}
            </Box>
          ) : (
            <Box>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{ mr: 2 }}
              >
                Retour à la connexion
              </Button>
              
              <Button
                variant="contained"
                size="large"
                onClick={() => window.location.reload()}
              >
                Réessayer
              </Button>
            </Box>
          )}
        </Paper>

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Système de gestion UPAS - Activation automatique
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Besoin d'aide ? Contactez l'équipe support
          </Typography>
        </Box>
      </Box>

      {/* Styles pour l'animation */}
      <style>
        {`
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-10px);
            }
            60% {
              transform: translateY(-5px);
            }
          }
        `}
      </style>
    </Container>
  );
};

export default ActivationResultPage;