// src/components/Details/CampagneDetails.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Campaign as CampagneIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  AccountBalance as BudgetIcon,
  TrendingUp as ProgressIcon,
  Assignment as ReportIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useUpas } from '../../contexts/UpasContext';

const CampagneDetails = ({ open, onClose, campagne }) => {
  const { loadingStates, errors } = useUpas();
  const [activeTab, setActiveTab] = useState('general');
  const [statistiques, setStatistiques] = useState(null);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [participants, setParticipants] = useState([]);
  
  // Charger les données détaillées quand la dialog s'ouvre
  useEffect(() => {
    if (open && campagne) {
      // Ici on pourrait charger les statistiques spécifiques à la campagne
      // loadCampagneStatistiques(campagne.id);
      // loadCampagneBeneficiaires(campagne.id);
      // loadCampagneParticipants(campagne.id);
    }
  }, [open, campagne]);
  
  if (!campagne) {
    return null;
  }
  
  // Calculer la progression temporelle
  const getProgression = () => {
    if (!campagne.date_debut || !campagne.date_fin) return 0;
    
    const debut = new Date(campagne.date_debut);
    const fin = new Date(campagne.date_fin);
    const maintenant = new Date();
    
    if (maintenant < debut) return 0;
    if (maintenant > fin) return 100;
    
    const totalDuree = fin.getTime() - debut.getTime();
    const dureeEcoulee = maintenant.getTime() - debut.getTime();
    
    return Math.round((dureeEcoulee / totalDuree) * 100);
  };
  
  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (statut) => {
    switch (statut) {
      case 'Active': return 'success';
      case 'En cours': return 'primary';
      case 'Terminée': return 'default';
      case 'Inactive': return 'warning';
      case 'Annulée': return 'error';
      default: return 'default';
    }
  };
  
  // Calculer le taux de consommation budgétaire
  const getTauxConsommation = () => {
    if (!campagne.budget || campagne.budget === 0) return 0;
    return Math.round((campagne.credit_consomme / campagne.budget) * 100);
  };
  
  // Statistiques rapides
  const stats = [
    {
      title: 'Participants',
      value: campagne.participants_count || 0,
      icon: <PeopleIcon />,
      color: '#3498db'
    },
    {
      title: 'Budget alloué',
      value: `${(campagne.budget || 0).toLocaleString()} DH`,
      icon: <BudgetIcon />,
      color: '#2ecc71'
    },
    {
      title: 'Budget consommé',
      value: `${(campagne.credit_consomme || 0).toLocaleString()} DH`,
      icon: <ProgressIcon />,
      color: '#e74c3c'
    },
    {
      title: 'Progression',
      value: `${getProgression()}%`,
      icon: <ProgressIcon />,
      color: '#f39c12'
    }
  ];
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CampagneIcon color="primary" />
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                {campagne.nom}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {campagne.type_assistance?.libelle}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={campagne.statut}
              color={getStatusColor(campagne.statut)}
              size="small"
            />
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loadingStates.campagnes ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Statistiques rapides */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                {stats.map((stat, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Card sx={{ bgcolor: `${stat.color}10`, border: `1px solid ${stat.color}30` }}>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Box sx={{ color: stat.color, mb: 1 }}>
                          {stat.icon}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: stat.color }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stat.title}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            {/* Informations générales */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Informations générales
                  </Typography>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CalendarIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Période"
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Du {format(new Date(campagne.date_debut), 'dd MMMM yyyy', { locale: fr })}
                            </Typography>
                            <Typography variant="body2">
                              Au {format(new Date(campagne.date_fin), 'dd MMMM yyyy', { locale: fr })}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    
                    {campagne.lieu && (
                      <ListItem>
                        <ListItemIcon>
                          <LocationIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Lieu"
                          secondary={campagne.lieu}
                        />
                      </ListItem>
                    )}
                    
                    <ListItem>
                      <ListItemIcon>
                        <PeopleIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Participants prévus"
                        secondary={`${campagne.nombre_participants_prevu || 0} personnes`}
                      />
                    </ListItem>
                    
                    {campagne.prix_unitaire && (
                      <ListItem>
                        <ListItemIcon>
                          <BudgetIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Prix unitaire"
                          secondary={`${campagne.prix_unitaire.toLocaleString()} DH`}
                        />
                      </ListItem>
                    )}
                  </List>
                  
                  {campagne.description && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Description
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {campagne.description}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Progression et budget */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Progression et budget
                  </Typography>
                  
                  {/* Progression temporelle */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Progression temporelle
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getProgression()}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getProgression()}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  
                  {/* Consommation budgétaire */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Consommation budgétaire
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getTauxConsommation()}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getTauxConsommation()}
                      color={getTauxConsommation() > 100 ? 'error' : 'primary'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Consommé: {(campagne.credit_consomme || 0).toLocaleString()} DH
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Budget: {(campagne.budget || 0).toLocaleString()} DH
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Alertes budgétaires */}
                  {getTauxConsommation() > 100 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      ⚠️ Budget dépassé de {getTauxConsommation() - 100}%
                    </Alert>
                  )}
                  
                  {getTauxConsommation() > 80 && getTauxConsommation() <= 100 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      ⚠️ Budget bientôt épuisé ({getTauxConsommation()}%)
                    </Alert>
                  )}
                  
                  {/* Besoin en crédit estimé */}
                  {campagne.prix_unitaire && campagne.nombre_participants_prevu && (
                    <Box 
                      sx={{ 
                        p: 2, 
                        bgcolor: 'info.lighter', 
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'info.main'
                      }}
                    >
                      <Typography variant="body2" color="info.main" sx={{ fontWeight: 600 }}>
                        💡 Besoin estimé: {' '}
                        {(campagne.prix_unitaire * campagne.nombre_participants_prevu).toLocaleString()} DH
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Basé sur le prix unitaire et le nombre de participants prévus
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Historique et logs */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Informations système
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Date de création
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {format(new Date(campagne.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Dernière modification
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {format(new Date(campagne.updated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </Typography>
                    </Grid>
                    
                    {campagne.created_by && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Créée par
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {campagne.created_by.nom_user} {campagne.created_by.prenom_user}
                        </Typography>
                      </Grid>
                    )}
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Identifiant
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                        #{campagne.id}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          startIcon={<ReportIcon />}
          variant="outlined"
          onClick={() => {
            // Générer rapport de campagne
            console.log('Générer rapport pour campagne:', campagne.id);
          }}
        >
          Rapport
        </Button>
        
        <Button
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={() => {
            // Export données campagne
            console.log('Export campagne:', campagne.id);
          }}
        >
          Exporter
        </Button>
        
        <Button
          startIcon={<EditIcon />}
          variant="contained"
          onClick={() => {
            // Ouvrir formulaire d'édition
            onClose();
            // Ici on pourrait déclencher l'ouverture du formulaire d'édition
          }}
        >
          Modifier
        </Button>
        
        <Button onClick={onClose} color="inherit">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampagneDetails;