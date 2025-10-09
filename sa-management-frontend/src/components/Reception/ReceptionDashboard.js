import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Skeleton,
  Chip,
  Avatar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress
} from '@mui/material';
import {
  Groups,
  Phone,
  CheckCircle,
  Cancel,
  Schedule,
  Refresh,
  TrendingUp,
  Assessment,
  Visibility,
  FilterList
} from '@mui/icons-material';
import { useReception } from '../../contexts/ReceptionContext';
import { useNotification } from '../../contexts/NotificationContext';

// Constantes de couleurs
const COLORS = {
  PRIMARY: "#3b82f6",
  SUCCESS: "#10b981", 
  DANGER: "#ef4444",
  WARNING: "#f59e0b",
  INFO: "#06b6d4",
  BACKGROUND: "#f9fafb"
};

// Composant StatCard amélioré avec animations
const StatCard = ({ title, value, icon, color, trend, loading = false, delay = 0 }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (loading) {
    return (
      <Card sx={{ height: '100%', p: 2 }}>
        <Skeleton variant="rectangular" height={120} />
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'all 0.3s ease',
        transform: animate ? 'translateY(0)' : 'translateY(20px)',
        opacity: animate ? 1 : 0,
        '&:hover': { 
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
        },
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderRadius: 3
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box flex={1}>
            <Typography 
              variant="overline" 
              sx={{ 
                fontWeight: 700,
                color: 'text.secondary',
                letterSpacing: 1.2,
                fontSize: '0.75rem'
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h3" 
              sx={{ 
                color: color,
                fontWeight: 800,
                fontSize: { xs: '1.8rem', sm: '2.2rem' },
                mt: 1,
                mb: 0.5
              }}
            >
              {value?.toLocaleString() || 0}
            </Typography>
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUp sx={{ fontSize: 16, color: COLORS.SUCCESS, mr: 0.5 }} />
                <Typography variant="caption" sx={{ color: COLORS.SUCCESS, fontWeight: 700 }}>
                  {trend}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}20`,
              color: color,
              width: 64,
              height: 64,
              boxShadow: `0 4px 12px ${color}40`
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

// Composant graphique donut CSS/SVG
const DonutChart = ({ stats }) => {
  const total = stats.participants_oui + stats.participants_non + stats.participants_en_attente;
  
  if (total === 0) {
    return (
      <Card sx={{ 
        height: '100%', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderRadius: 3 
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment color="primary" />
            Répartition des Participants
          </Typography>
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ height: 300 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Aucune donnée disponible
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aucun participant trouvé pour le moment
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const confirmesPercentage = (stats.participants_oui / total) * 100;
  const refusesPercentage = (stats.participants_non / total) * 100;
  const attentePercentage = (stats.participants_en_attente / total) * 100;

  // Calculs pour les arcs SVG
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  
  const confirmesOffset = 0;
  const refusesOffset = (confirmesPercentage / 100) * circumference;
  const attenteOffset = ((confirmesPercentage + refusesPercentage) / 100) * circumference;

  return (
    <Card sx={{ 
      height: '100%', 
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      borderRadius: 3 
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color="primary" />
          Répartition des Participants
        </Typography>
        
        <Box display="flex" flexDirection="column" alignItems="center">
          {/* Graphique donut SVG */}
          <Box position="relative" sx={{ mb: 3 }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              {/* Cercle de fond */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="20"
              />
              
              {/* Arc confirmés */}
              {confirmesPercentage > 0 && (
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={COLORS.SUCCESS}
                  strokeWidth="20"
                  strokeDasharray={`${(confirmesPercentage / 100) * circumference} ${circumference}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 100 100)"
                  sx={{
                    transition: 'stroke-dasharray 1s ease-in-out'
                  }}
                />
              )}
              
              {/* Arc refusés */}
              {refusesPercentage > 0 && (
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={COLORS.DANGER}
                  strokeWidth="20"
                  strokeDasharray={`${(refusesPercentage / 100) * circumference} ${circumference}`}
                  strokeDashoffset={`-${refusesOffset}`}
                  transform="rotate(-90 100 100)"
                  sx={{
                    transition: 'stroke-dasharray 1s ease-in-out'
                  }}
                />
              )}
              
              {/* Arc en attente */}
              {attentePercentage > 0 && (
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={COLORS.WARNING}
                  strokeWidth="20"
                  strokeDasharray={`${(attentePercentage / 100) * circumference} ${circumference}`}
                  strokeDashoffset={`-${attenteOffset}`}
                  transform="rotate(-90 100 100)"
                  sx={{
                    transition: 'stroke-dasharray 1s ease-in-out'
                  }}
                />
              )}
            </svg>
            
            {/* Centre du donut avec total */}
            <Box
              position="absolute"
              top="50%"
              left="50%"
              sx={{
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}
            >
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                {total.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total
              </Typography>
            </Box>
          </Box>

          {/* Légende avec barres de progression */}
          <Box sx={{ width: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: COLORS.SUCCESS 
                    }} 
                  />
                  <Typography variant="body2" fontWeight={600}>
                    Confirmés
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold" sx={{ color: COLORS.SUCCESS }}>
                  {stats.participants_oui} ({confirmesPercentage.toFixed(1)}%)
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={confirmesPercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#f3f4f6',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: COLORS.SUCCESS,
                    borderRadius: 4
                  }
                }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: COLORS.DANGER 
                    }} 
                  />
                  <Typography variant="body2" fontWeight={600}>
                    Refusés
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold" sx={{ color: COLORS.DANGER }}>
                  {stats.participants_non} ({refusesPercentage.toFixed(1)}%)
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={refusesPercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#f3f4f6',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: COLORS.DANGER,
                    borderRadius: 4
                  }
                }}
              />
            </Box>

            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: COLORS.WARNING 
                    }} 
                  />
                  <Typography variant="body2" fontWeight={600}>
                    En attente
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold" sx={{ color: COLORS.WARNING }}>
                  {stats.participants_en_attente} ({attentePercentage.toFixed(1)}%)
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={attentePercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#f3f4f6',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: COLORS.WARNING,
                    borderRadius: 4
                  }
                }}
              />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Composant principal Dashboard
const ReceptionDashboard = () => {
  const { 
    dashboardStats, 
    dashboardLoading, 
    dashboardError,
    loadDashboard,
    campagnes,
    loadCampagnes
  } = useReception();
  
  const { showNotification } = useNotification();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCampagne, setSelectedCampagne] = useState('all');

  // Chargement initial
  useEffect(() => {
    const initDashboard = async () => {
      try {
        await Promise.all([
          loadDashboard(),
          loadCampagnes()
        ]);
      } catch (error) {
        console.error('❌ Erreur initialisation dashboard:', error);
      }
    };

    initDashboard();
  }, [loadDashboard, loadCampagnes]);

  // Actualisation automatique toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('🔄 Actualisation automatique des données');
      try {
        await loadDashboard();
      } catch (error) {
        console.error('❌ Erreur actualisation automatique:', error);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  // Actualisation manuelle
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
      showNotification('Données actualisées avec succès', 'success');
    } catch (error) {
      showNotification('Erreur lors de l\'actualisation', 'error');
      console.error('❌ Erreur actualisation manuelle:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculs des statistiques
  const stats = useMemo(() => {
    if (!dashboardStats?.stats) {
      return {
        total_campagnes: 0,
        total_participants: 0,
        participants_oui: 0,
        participants_non: 0,
        participants_en_attente: 0
      };
    }
    return dashboardStats.stats;
  }, [dashboardStats]);

  const getStatutChip = (statut) => {
    const configs = {
      active: { color: COLORS.SUCCESS, label: 'Active' },
      planifiee: { color: COLORS.WARNING, label: 'Planifiée' },
      terminee: { color: COLORS.INFO, label: 'Terminée' },
      en_cours: { color: COLORS.PRIMARY, label: 'En cours' }
    };
    
    const config = configs[statut] || { color: COLORS.PRIMARY, label: statut };
    
    return (
      <Chip 
        label={config.label}
        size="small"
        sx={{
          backgroundColor: `${config.color}20`,
          color: config.color,
          fontWeight: 600,
          borderRadius: 2
        }}
      />
    );
  };

  // Campagnes filtrées
  const filteredCampagnes = useMemo(() => {
    if (!dashboardStats?.campagnes_recentes) return [];
    
    if (selectedCampagne === 'all') {
      return dashboardStats.campagnes_recentes;
    }
    
    return dashboardStats.campagnes_recentes.filter(c => c.id.toString() === selectedCampagne);
  }, [dashboardStats, selectedCampagne]);

  // Gestion des erreurs
  if (dashboardError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button onClick={handleRefresh} disabled={refreshing}>
              Réessayer
            </Button>
          }
        >
          Erreur de chargement: {dashboardError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, backgroundColor: COLORS.BACKGROUND, minHeight: '100vh' }}>
      {/* Header avec animations */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box sx={{ 
          opacity: dashboardLoading ? 0 : 1,
          transform: dashboardLoading ? 'translateY(-20px)' : 'translateY(0)',
          transition: 'all 0.6s ease'
        }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 800,
              color: COLORS.PRIMARY,
              mb: 1,
              background: `linear-gradient(135deg, ${COLORS.PRIMARY} 0%, ${COLORS.INFO} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Dashboard Réception
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
            Vue d'ensemble des campagnes et participants • Mise à jour en temps réel
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          {/* Filtre par campagne */}
          {dashboardStats?.campagnes_recentes?.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filtrer par campagne</InputLabel>
              <Select
                value={selectedCampagne}
                onChange={(e) => setSelectedCampagne(e.target.value)}
                label="Filtrer par campagne"
                startAdornment={<FilterList sx={{ mr: 1, color: 'text.secondary' }} />}
              >
                <MenuItem value="all">Toutes les campagnes</MenuItem>
                {dashboardStats.campagnes_recentes.map(c => (
                  <MenuItem key={c.id} value={c.id.toString()}>
                    {c.nom}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          
        </Box>
      </Box>

      {/* Statistiques principales avec animations échelonnées */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard
            title="Total Campagnes"
            value={stats.total_campagnes}
            icon={<Groups />}
            color={COLORS.PRIMARY}
            trend="+5% ce mois"
            loading={dashboardLoading}
            delay={0}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard
            title="Total Participants"
            value={stats.total_participants}
            icon={<Phone />}
            color={COLORS.INFO}
            trend="+12% ce mois"
            loading={dashboardLoading}
            delay={100}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard
            title="Confirmés (OUI)"
            value={stats.participants_oui}
            icon={<CheckCircle />}
            color={COLORS.SUCCESS}
            trend="+18% ce mois"
            loading={dashboardLoading}
            delay={200}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard
            title="Non-répondants"
            value={stats.participants_non}
            icon={<Cancel />}
            color={COLORS.DANGER}
            loading={dashboardLoading}
            delay={300}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard
            title="En Attente"
            value={stats.participants_en_attente}
            icon={<Schedule />}
            color={COLORS.WARNING}
            loading={dashboardLoading}
            delay={400}
          />
        </Grid>
      </Grid>

      {/* Graphiques et tableaux */}
      <Grid container spacing={3}>
        {/* Graphique des statistiques */}
        <Grid item xs={12} lg={4}>
          {dashboardLoading ? (
            <Card sx={{ height: 400 }}>
              <Skeleton variant="rectangular" height={400} />
            </Card>
          ) : (
            <DonutChart stats={stats} />
          )}
        </Grid>

        {/* Campagnes récentes */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden'
          }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ 
                p: 3, 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: COLORS.PRIMARY
                }}>
                  <Assessment color="primary" />
                  Campagnes {selectedCampagne === 'all' ? 'Récentes' : 'Filtrées'}
                  <Chip 
                    label={`${filteredCampagnes.length} campagne(s)`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Typography>
              </Box>
              
              {dashboardLoading ? (
                <Box sx={{ p: 3 }}>
                  {[...Array(5)].map((_, index) => (
                    <Skeleton key={index} height={60} sx={{ mb: 1 }} />
                  ))}
                </Box>
              ) : !filteredCampagnes.length ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Aucune campagne trouvée
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Créez votre première campagne pour commencer
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Campagne</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Date début</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Lieu</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Participants</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: COLORS.PRIMARY }}>Type</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredCampagnes.map((campagne, index) => (
                        <TableRow 
                          key={campagne.id} 
                          hover
                          sx={{
                            '&:hover': {
                              backgroundColor: '#f1f5f9',
                              transform: 'scale(1.01)',
                              transition: 'all 0.2s ease'
                            },
                            backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} color={COLORS.PRIMARY}>
                              {campagne.nom}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {campagne.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {new Date(campagne.date_debut).toLocaleDateString('fr-FR')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {campagne.lieu || 'Non défini'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`${campagne.nombre_participants || 0} participants`}
                              size="small"
                              sx={{
                                backgroundColor: `${COLORS.INFO}20`,
                                color: COLORS.INFO,
                                fontWeight: 600
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {campagne.type_assistance || 'Non défini'}
                            </Typography>
                          </TableCell>
                          
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReceptionDashboard;