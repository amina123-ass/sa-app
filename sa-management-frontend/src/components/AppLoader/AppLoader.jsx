// src/components/AppLoader/AppLoader.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  Fade,
  Alert,
  Button,
  Avatar,
  Chip,
} from '@mui/material';
import { 
  Refresh, 
  CheckCircle, 
  Error as ErrorIcon,
  Cloud,
  Storage,
  Security 
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { prefetchCriticalData, backgroundDataLoader, QUERY_KEYS } from '../../config/queryClient';

const AppLoader = ({ children, onLoadingComplete }) => {
  const [loadingStage, setLoadingStage] = useState('initializing');
  const [progress, setProgress] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState([]);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Étapes de chargement
  const steps = [
    { id: 'auth', label: 'Vérification authentification', icon: <Security />, weight: 10 },
    { id: 'cache', label: 'Initialisation du cache', icon: <Storage />, weight: 15 },
    { id: 'dictionary', label: 'Chargement dictionnaire', icon: <Cloud />, weight: 30 },
    { id: 'user-data', label: 'Données utilisateur', icon: <Cloud />, weight: 25 },
    { id: 'finalization', label: 'Finalisation', icon: <CheckCircle />, weight: 20 },
  ];

  // Hook pour surveiller l'état des requêtes critiques
  const dictionaryQueries = [
    useQuery({
      queryKey: QUERY_KEYS.DICTIONARY.SITUATIONS,
      queryFn: () => import('../../services/dictionaryService').then(m => m.dictionaryService.getSituations()),
      staleTime: 1000 * 60 * 30,
      enabled: loadingStage !== 'initializing',
    }),
    useQuery({
      queryKey: QUERY_KEYS.DICTIONARY.NATURE_DONES,
      queryFn: () => import('../../services/dictionaryService').then(m => m.dictionaryService.getNatureDones()),
      staleTime: 1000 * 60 * 30,
      enabled: loadingStage !== 'initializing',
    }),
    useQuery({
      queryKey: QUERY_KEYS.DICTIONARY.TYPE_ASSISTANCES,
      queryFn: () => import('../../services/dictionaryService').then(m => m.dictionaryService.getTypeAssistances()),
      staleTime: 1000 * 60 * 30,
      enabled: loadingStage !== 'initializing',
    }),
  ];

  // Fonction principale de chargement
  const loadApplication = async () => {
    try {
      setError(null);
      setProgress(0);
      
      // Étape 1: Vérification authentification
      setLoadingStage('auth');
      updateStepStatus('auth', 'loading');
      await simulateDelay(500);
      
      const token = localStorage.getItem('auth_token');
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      
      if (!token || !user) {
        throw new Error('NON_AUTHENTICATED');
      }
      
      updateStepStatus('auth', 'completed');
      setProgress(10);

      // Étape 2: Initialisation du cache
      setLoadingStage('cache');
      updateStepStatus('cache', 'loading');
      await simulateDelay(300);
      
      // Vérifier si le cache est déjà initialisé
      const cacheExists = localStorage.getItem('REACT_QUERY_CACHE');
      updateStepStatus('cache', 'completed');
      setProgress(25);

      // Étape 3: Chargement du dictionnaire
      setLoadingStage('dictionary');
      updateStepStatus('dictionary', 'loading');
      
      try {
        await prefetchCriticalData();
        updateStepStatus('dictionary', 'completed');
      } catch (dictError) {
        console.warn('Erreur chargement dictionnaire:', dictError);
        updateStepStatus('dictionary', 'warning');
      }
      setProgress(55);

      // Étape 4: Données utilisateur spécifiques
      setLoadingStage('user-data');
      updateStepStatus('user-data', 'loading');
      
      try {
        await backgroundDataLoader.loadUserData();
        updateStepStatus('user-data', 'completed');
      } catch (userError) {
        console.warn('Erreur chargement données utilisateur:', userError);
        updateStepStatus('user-data', 'warning');
      }
      setProgress(80);

      // Étape 5: Finalisation
      setLoadingStage('finalization');
      updateStepStatus('finalization', 'loading');
      await simulateDelay(500);
      
      updateStepStatus('finalization', 'completed');
      setProgress(100);

      // Attendre un peu pour l'effet visuel
      await simulateDelay(800);
      
      setLoadingStage('completed');
      onLoadingComplete?.(true);

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setError(error);
      setLoadingStage('error');
      
      // Marquer l'étape courante comme erreur
      const currentStepId = getCurrentStepId();
      if (currentStepId) {
        updateStepStatus(currentStepId, 'error');
      }
    }
  };

  // Fonction utilitaire pour obtenir l'ID de l'étape courante
  const getCurrentStepId = () => {
    switch (loadingStage) {
      case 'auth': return 'auth';
      case 'cache': return 'cache';
      case 'dictionary': return 'dictionary';
      case 'user-data': return 'user-data';
      case 'finalization': return 'finalization';
      default: return null;
    }
  };

  // Fonction pour mettre à jour le statut d'une étape
  const updateStepStatus = (stepId, status) => {
    setLoadingSteps(prev => {
      const exists = prev.find(step => step.id === stepId);
      if (exists) {
        return prev.map(step => 
          step.id === stepId ? { ...step, status } : step
        );
      } else {
        return [...prev, { id: stepId, status }];
      }
    });
  };

  // Fonction pour simuler un délai
  const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Fonction de retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setLoadingSteps([]);
    setError(null);
    loadApplication();
  };

  // Démarrer le chargement au montage
  useEffect(() => {
    loadApplication();
  }, []);

  // Si chargement terminé, afficher l'application
  if (loadingStage === 'completed') {
    return (
      <Fade in={true} timeout={500}>
        <div>{children}</div>
      </Fade>
    );
  }

  // Si erreur d'authentification, ne pas afficher le loader
  if (error?.message === 'NON_AUTHENTICATED') {
    return children;
  }

  // Rendu du splash screen
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <Card 
        sx={{ 
          maxWidth: 500, 
          width: '90%',
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 4,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* En-tête avec logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                margin: '0 auto 16px',
                bgcolor: '#3498db',
                fontSize: '2rem',
                fontWeight: 'bold',
              }}
            >
              SA
            </Avatar>
            <Typography variant="h4" sx={{ color: '#2c3e50', fontWeight: 600 }}>
              SA Management
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Chargement de l'application...
            </Typography>
          </Box>

          {/* Barre de progression principale */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {getLoadingMessage()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #3498db, #2ecc71)',
                }
              }} 
            />
          </Box>

          {/* Liste des étapes */}
          <Box sx={{ mb: 3 }}>
            {steps.map((step) => {
              const stepStatus = loadingSteps.find(s => s.id === step.id);
              const isActive = loadingStage === step.id;
              
              return (
                <Box 
                  key={step.id}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2,
                    opacity: stepStatus ? 1 : 0.5,
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    {getStepIcon(stepStatus?.status, isActive, step.icon)}
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      flex: 1,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'primary.main' : 'text.secondary'
                    }}
                  >
                    {step.label}
                  </Typography>
                  {stepStatus && (
                    <Chip 
                      size="small" 
                      label={getStatusLabel(stepStatus.status)}
                      color={getStatusColor(stepStatus.status)}
                      variant="outlined"
                    />
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Gestion des erreurs */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleRetry}
                  startIcon={<Refresh />}
                >
                  Réessayer
                </Button>
              }
            >
              <Typography variant="subtitle2">
                Erreur de chargement
              </Typography>
              <Typography variant="body2">
                {getErrorMessage(error)}
              </Typography>
              {retryCount > 0 && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Tentative {retryCount + 1}
                </Typography>
              )}
            </Alert>
          )}

          {/* Informations de debug (development uniquement) */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" display="block">
                Debug: {loadingStage} | Queries: {dictionaryQueries.filter(q => q.isSuccess).length}/{dictionaryQueries.length}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  // Fonction pour obtenir le message de chargement
  function getLoadingMessage() {
    switch (loadingStage) {
      case 'auth': return 'Vérification des permissions...';
      case 'cache': return 'Initialisation du cache local...';
      case 'dictionary': return 'Chargement des données de référence...';
      case 'user-data': return 'Chargement de vos données...';
      case 'finalization': return 'Finalisation du chargement...';
      case 'error': return 'Erreur lors du chargement';
      default: return 'Initialisation...';
    }
  }

  // Fonction pour obtenir l'icône d'une étape
  function getStepIcon(status, isActive, defaultIcon) {
    if (isActive && !status) {
      return <CircularProgress size={20} />;
    }
    
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'loading':
        return <CircularProgress size={20} />;
      case 'warning':
        return <ErrorIcon sx={{ color: 'warning.main' }} />;
      default:
        return React.cloneElement(defaultIcon, { 
          sx: { color: isActive ? 'primary.main' : 'text.disabled' } 
        });
    }
  }

  // Fonction pour obtenir le label du statut
  function getStatusLabel(status) {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'loading': return 'En cours';
      case 'error': return 'Erreur';
      case 'warning': return 'Attention';
      default: return 'En attente';
    }
  }

  // Fonction pour obtenir la couleur du statut
  function getStatusColor(status) {
    switch (status) {
      case 'completed': return 'success';
      case 'loading': return 'primary';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  }

  // Fonction pour obtenir le message d'erreur convivial
  function getErrorMessage(error) {
    if (error.message === 'NON_AUTHENTICATED') {
      return 'Session expirée. Veuillez vous reconnecter.';
    }
    
    if (error.code === 'NETWORK_ERROR') {
      return 'Problème de connexion réseau. Vérifiez votre connexion internet.';
    }
    
    if (error.response?.status >= 500) {
      return 'Erreur serveur temporaire. Veuillez réessayer dans quelques instants.';
    }
    
    return error.message || 'Une erreur inattendue est survenue.';
  }
};
export default AppLoader;