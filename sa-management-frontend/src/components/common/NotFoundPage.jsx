import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Paper,
  Divider,
  Chip,
  Alert,
  Breadcrumbs,
  Link,
  Tooltip,
  Fade,
  Zoom,
  Slide
} from '@mui/material';
import {
  Home,
  ArrowBack,
  Search,
  Refresh,
  Help,
  ContactSupport,
  BugReport,
  NavigateNext,
  Error,
  Warning,
  Info,
  LocationOn,
  Schedule,
  Phone,
  Email,
  Support,
  TrendingUp,
  Dashboard,
  Settings,
  Person,
  Security,
  Analytics
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAnimation, setShowAnimation] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setShowAnimation(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Animation pour le code d'erreur 404
  const [animatedNumber, setAnimatedNumber] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedNumber(prev => {
        if (prev >= 404) {
          clearInterval(interval);
          return 404;
        }
        return prev + Math.floor(Math.random() * 50) + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Suggestions de pages populaires
  const popularPages = [
    { label: 'Tableau de bord', icon: <Dashboard />, path: '/admin/dashboard', color: 'primary' },
    { label: 'Gestion des utilisateurs', icon: <Person />, path: '/admin/users', color: 'secondary' },
    { label: 'Statistiques', icon: <Analytics />, path: '/admin/statistics', color: 'success' },
    { label: 'Paramètres', icon: <Settings />, path: '/admin/settings', color: 'warning' },
    { label: 'Sécurité', icon: <Security />, path: '/admin/security', color: 'error' }
  ];

  // Actions rapides
  const quickActions = [
    {
      title: 'Retour à l\'accueil',
      description: 'Retourner à la page principale',
      icon: <Home />,
      action: () => navigate('/'),
      color: 'primary'
    },
    {
      title: 'Page précédente',
      description: 'Revenir à la page précédente',
      icon: <ArrowBack />,
      action: () => navigate(-1),
      color: 'secondary'
    },
    {
      title: 'Rechercher',
      description: 'Rechercher du contenu',
      icon: <Search />,
      action: () => navigate('/search'),
      color: 'info'
    },
    {
      title: 'Actualiser',
      description: 'Recharger la page actuelle',
      icon: <Refresh />,
      action: () => window.location.reload(),
      color: 'success'
    }
  ];

  const ErrorAnimation = () => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px',
        position: 'relative',
        mb: 4
      }}
    >
      {/* Cercles d'arrière-plan animés */}
      <Box
        sx={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
          opacity: 0.1,
          animation: 'pulse 2s infinite'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          border: '2px solid',
          borderColor: 'primary.main',
          opacity: 0.2,
          animation: 'rotate 20s linear infinite'
        }}
      />
      
      {/* Code d'erreur 404 */}
      <Zoom in={showAnimation} timeout={1000}>
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '6rem', md: '8rem' },
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center',
            textShadow: '0 0 30px rgba(102, 126, 234, 0.5)',
            position: 'relative',
            zIndex: 1
          }}
        >
          {animatedNumber === 404 ? '404' : animatedNumber}
        </Typography>
      </Zoom>
      
      {/* Styles pour les animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4
      }}
    >
      <Container maxWidth="lg">
        {/* En-tête avec breadcrumbs */}
        <Fade in={showAnimation} timeout={800}>
          <Paper sx={{ p: 2, mb: 4, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Breadcrumbs separator={<NavigateNext fontSize="small" />} aria-label="breadcrumb">
                <Link
                  color="inherit"
                  href="/"
                  onClick={(e) => { e.preventDefault(); navigate('/'); }}
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                >
                  <Home sx={{ mr: 0.5 }} fontSize="inherit" />
                  UPAS
                </Link>
                <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Error sx={{ mr: 0.5 }} fontSize="inherit" />
                  Page non trouvée
                </Typography>
              </Breadcrumbs>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {currentTime.toLocaleTimeString('fr-FR')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Fade>

        <Grid container spacing={4}>
          {/* Section principale avec l'erreur 404 */}
          <Grid item xs={12} lg={8}>
            <Slide direction="up" in={showAnimation} timeout={1000}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 4,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                  <ErrorAnimation />
                  
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography
                      variant="h3"
                      gutterBottom
                      sx={{
                        fontWeight: 'bold',
                        color: 'text.primary',
                        mb: 2
                      }}
                    >
                      Page non trouvée
                    </Typography>
                    
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{ mb: 3, maxWidth: '600px', mx: 'auto' }}
                    >
                      Oups ! La page que vous recherchez semble avoir disparu dans les méandres du cyberespace.
                    </Typography>

                    <Alert severity="info" sx={{ mb: 3, maxWidth: '500px', mx: 'auto' }}>
                      <Typography variant="body2">
                        <strong>URL demandée :</strong> {location.pathname}
                      </Typography>
                    </Alert>
                  </Box>

                  {/* Actions rapides */}
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                    Que souhaitez-vous faire ?
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    {quickActions.map((action, index) => (
                      <Grid item xs={12} sm={6} md={3} key={index}>
                        <Fade in={showAnimation} timeout={1200 + index * 200}>
                          <Card
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-8px)',
                                boxShadow: 4
                              },
                              height: '100%'
                            }}
                            onClick={action.action}
                          >
                            <CardContent sx={{ textAlign: 'center', p: 3 }}>
                              <IconButton
                                color={action.color}
                                sx={{
                                  mb: 2,
                                  bgcolor: `${action.color}.main`,
                                  color: 'white',
                                  '&:hover': { bgcolor: `${action.color}.dark` }
                                }}
                              >
                                {action.icon}
                              </IconButton>
                              <Typography variant="h6" gutterBottom>
                                {action.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {action.description}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Fade>
                      </Grid>
                    ))}
                  </Grid>

                  <Divider sx={{ my: 4 }} />

                  {/* Pages populaires */}
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                    Pages populaires
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                    {popularPages.map((page, index) => (
                      <Fade in={showAnimation} timeout={1500 + index * 100} key={index}>
                        <Tooltip title={`Aller à ${page.label}`}>
                          <Chip
                            icon={page.icon}
                            label={page.label}
                            color={page.color}
                            clickable
                            onClick={() => navigate(page.path)}
                            sx={{
                              m: 0.5,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: 2
                              }
                            }}
                          />
                        </Tooltip>
                      </Fade>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Slide>
          </Grid>

          {/* Sidebar avec aide et contact */}
          <Grid item xs={12} lg={4}>
            <Slide direction="left" in={showAnimation} timeout={1200}>
              <Box>
                {/* Carte d'aide */}
                <Card sx={{ mb: 3, borderRadius: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Help color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        Besoin d'aide ?
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Si vous continuez à rencontrer des problèmes, voici quelques suggestions :
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<ContactSupport />}
                        sx={{ mb: 1, justifyContent: 'flex-start' }}
                      >
                        Contacter le support
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<BugReport />}
                        sx={{ mb: 1, justifyContent: 'flex-start' }}
                      >
                        Signaler un problème
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Info />}
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        Consulter l'aide
                      </Button>
                    </Box>
                  </CardContent>
                </Card>

                {/* Carte de contact */}
                <Card sx={{ mb: 3, borderRadius: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Support color="secondary" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        Contact support
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Email fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">support@upas.ma</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">+212 5 XX XX XX XX</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Schedule fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">Lun-Ven: 9h-17h</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Statistiques système */}
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TrendingUp color="success" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        État du système
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Statut :</Typography>
                        <Chip label="Opérationnel" color="success" size="small" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Temps de réponse :</Typography>
                        <Typography variant="body2" color="success.main"> 200ms</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Disponibilité :</Typography>
                        <Typography variant="body2" color="success.main">99.9%</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Slide>
          </Grid>
        </Grid>

        {/* Footer */}
        <Fade in={showAnimation} timeout={1800}>
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body2" color="rgba(255, 255, 255, 0.8)">
              © 2024 UPAS - Unité de Prise en charge et d'Assistance Sociale
            </Typography>
            <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
              Si le problème persiste, contactez l'administrateur système
            </Typography>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default NotFoundPage;