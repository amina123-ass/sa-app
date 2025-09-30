// src/components/upas/CampagneDetails.js
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
  Avatar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Campaign,
  Close,
  Assessment,
  Group,
  CalendarToday,
  LocationOn,
  Euro,
  Person,
  Phone,
  Email,
  CheckCircle,
  Schedule,
  Cancel,
  TrendingUp,
  PieChart,
  BarChart,
  Timeline,
  Download,
  Print
} from '@mui/icons-material';
import { useUpas } from '../../contexts/UpasContext';
import { useNotification } from '../../contexts/NotificationContext';

const CampagneDetails = ({ open, onClose, campagne }) => {
  const { getCampagneDetails, exportRapportCampagne } = useUpas();
  const { showNotification } = useNotification();

  const [activeTab, setActiveTab] = useState(0);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // Charger les détails de la campagne
  useEffect(() => {
    if (open && campagne) {
      loadDetails();
    }
  }, [open, campagne]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const response = await getCampagneDetails(campagne.id);
      setDetails(response);
    } catch (error) {
      showNotification('Erreur lors du chargement des détails', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportRapport = async () => {
    try {
      await exportRapportCampagne(campagne.id);
      showNotification('Rapport exporté avec succès', 'success');
    } catch (error) {
      showNotification('Erreur lors de l\'export du rapport', 'error');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (!campagne) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Campaign />
            {campagne.nom}
            <Chip
              label={getStatutLibelle(campagne.statut)}
              size="small"
              sx={{
                backgroundColor: getStatutColor(campagne.statut),
                color: 'white'
              }}
            />
          </Box>
          <Box display="flex" gap={1}>
            <Button
              startIcon={<Download />}
              size="small"
              onClick={handleExportRapport}
            >
              Exporter
            </Button>
            <Button
              startIcon={<Print />}
              size="small"
              onClick={() => window.print()}
            >
              Imprimer
            </Button>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Onglets */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="Vue d'ensemble" icon={<Assessment />} />
                <Tab label="Bénéficiaires" icon={<Group />} />
                <Tab label="Statistiques" icon={<BarChart />} />
                <Tab label="Performance" icon={<TrendingUp />} />
              </Tabs>
            </Box>

            {/* Contenu des onglets */}
            {activeTab === 0 && (
              <VueEnsemble campagne={campagne} details={details} />
            )}
            {activeTab === 1 && (
              <BeneficiairesTab campagne={campagne} details={details} />
            )}
            {activeTab === 2 && (
              <StatistiquesTab campagne={campagne} details={details} />
            )}
            {activeTab === 3 && (
              <PerformanceTab campagne={campagne} details={details} />
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<Close />}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Composant Vue d'ensemble
const VueEnsemble = ({ campagne, details }) => (
  <Grid container spacing={3}>
    {/* Informations générales */}
    <Grid item xs={12} md={8}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informations générales
          </Typography>
          
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Type d'assistance
            </Typography>
            <Typography variant="body1">
              {campagne.type_assistance?.libelle || 'N/A'}
            </Typography>
          </Box>

          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Description
            </Typography>
            <Typography variant="body1">
              {campagne.description || 'Aucune description'}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Date de début
                </Typography>
              </Box>
              <Typography variant="body1">
                {new Date(campagne.date_debut).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Date de fin
                </Typography>
              </Box>
              <Typography variant="body1">
                {new Date(campagne.date_fin).toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>

          {campagne.lieu && (
            <Box mt={2}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Lieu
                </Typography>
              </Box>
              <Typography variant="body1">
                {campagne.lieu}
              </Typography>
            </Box>
          )}

          {campagne.objectifs && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Objectifs
              </Typography>
              <Typography variant="body1">
                {campagne.objectifs}
              </Typography>
            </Box>
          )}

          {campagne.criteres_eligibilite && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Critères d'éligibilité
              </Typography>
              <Typography variant="body1">
                {campagne.criteres_eligibilite}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>

    {/* Statistiques rapides */}
    <Grid item xs={12} md={4}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Group color="primary" />
                <Typography variant="h6">
                  Bénéficiaires
                </Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {details?.stats?.total_beneficiaires || campagne.stats?.total_beneficiaires || 0}
              </Typography>
              {campagne.nombre_participants_prevu && (
                <Typography variant="body2" color="text.secondary">
                  sur {campagne.nombre_participants_prevu} prévus
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CheckCircle color="success" />
                <Typography variant="h6">
                  Confirmés
                </Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {details?.stats?.beneficiaires_confirmes || campagne.stats?.beneficiaires_confirmes || 0}
              </Typography>
              {details?.stats?.total_beneficiaires > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {Math.round((details.stats.beneficiaires_confirmes / details.stats.total_beneficiaires) * 100)}% du total
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {campagne.budget && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Euro color="warning" />
                  <Typography variant="h6">
                    Budget
                  </Typography>
                </Box>
                <Typography variant="h4" color="warning.main">
                  {campagne.budget.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  DH alloués
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Contact responsable */}
        {(campagne.contact_responsable || campagne.telephone_contact || campagne.email_contact) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Contact responsable
                </Typography>
                {campagne.contact_responsable && (
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Person sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {campagne.contact_responsable}
                    </Typography>
                  </Box>
                )}
                {campagne.telephone_contact && (
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Phone sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {campagne.telephone_contact}
                    </Typography>
                  </Box>
                )}
                {campagne.email_contact && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Email sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {campagne.email_contact}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Grid>

    {/* Progression */}
    {campagne.nombre_participants_prevu && details?.stats && (
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Progression des objectifs
            </Typography>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">
                  Participants inscrits
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {details.stats.total_beneficiaires} / {campagne.nombre_participants_prevu}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min((details.stats.total_beneficiaires / campagne.nombre_participants_prevu) * 100, 100)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">
                  Participants confirmés
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {details.stats.beneficiaires_confirmes} / {campagne.nombre_participants_prevu}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min((details.stats.beneficiaires_confirmes / campagne.nombre_participants_prevu) * 100, 100)}
                color="success"
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    )}
  </Grid>
);

// Composant Bénéficiaires
const BeneficiairesTab = ({ campagne, details }) => (
  <Grid container spacing={3}>
    {/* Répartition par statut */}
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Répartition par statut
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <Schedule color="warning" />
              </ListItemIcon>
              <ListItemText 
                primary="En attente"
                secondary={`${details?.stats?.beneficiaires_en_attente || 0} bénéficiaires`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Confirmés"
                secondary={`${details?.stats?.beneficiaires_confirmes || 0} bénéficiaires`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Cancel color="error" />
              </ListItemIcon>
              <ListItemText 
                primary="Refusés"
                secondary={`${details?.stats?.beneficiaires_refuses || 0} bénéficiaires`}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Grid>

    {/* Répartition par sexe */}
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Répartition par sexe
          </Typography>
          {details?.stats?.repartition_par_sexe ? (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="body2">Masculin</Typography>
                <Chip 
                  label={details.stats.repartition_par_sexe.masculin || 0}
                  color="primary"
                  size="small"
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Féminin</Typography>
                <Chip 
                  label={details.stats.repartition_par_sexe.feminin || 0}
                  color="secondary"
                  size="small"
                />
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Données non disponibles
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>

    {/* Répartition par âge */}
    {details?.stats?.repartition_par_age && (
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Répartition par tranche d'âge
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(details.stats.repartition_par_age).map(([tranche, nombre]) => (
                <Grid item xs={6} md={2} key={tranche}>
                  <Box textAlign="center">
                    <Typography variant="h6" color="primary">
                      {nombre}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tranche === 'non_renseigne' ? 'Non renseigné' : `${tranche} ans`}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    )}

    {/* Bénéficiaires récents */}
    {details?.campagne?.beneficiaires_recents && (
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Bénéficiaires récents
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Téléphone</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Date d'inscription</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.campagne.beneficiaires_recents.map((beneficiaire) => (
                    <TableRow key={beneficiaire.id}>
                      <TableCell>
                        {beneficiaire.nom} {beneficiaire.prenom}
                      </TableCell>
                      <TableCell>{beneficiaire.telephone}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatutBeneficiaireLibelle(beneficiaire.statut)}
                          size="small"
                          color={getStatutBeneficiaireColor(beneficiaire.statut)}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(beneficiaire.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    )}
  </Grid>
);

// Composant Statistiques
const StatistiquesTab = ({ campagne, details }) => (
  <Grid container spacing={3}>
    {/* Évolution quotidienne */}
    {details?.stats?.evolution_quotidienne && (
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Évolution des inscriptions
            </Typography>
            {details.stats.evolution_quotidienne.length > 0 ? (
              <Box>
                {details.stats.evolution_quotidienne.map((jour, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">
                      {new Date(jour.date).toLocaleDateString()}
                    </Typography>
                    <Chip label={jour.total} size="small" />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aucune donnée d'évolution disponible
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    )}

    {/* Analyse des commentaires */}
    {details?.stats?.commentaires_analyses && (
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analyse des commentaires
            </Typography>
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Total des commentaires
              </Typography>
              <Typography variant="h6">
                {details.stats.commentaires_analyses.total_commentaires}
              </Typography>
            </Box>
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Longueur moyenne
              </Typography>
              <Typography variant="body1">
                {details.stats.commentaires_analyses.longueur_moyenne} caractères
              </Typography>
            </Box>
            {details.stats.commentaires_analyses.mots_cles_frequents && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Mots-clés fréquents
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {Object.entries(details.stats.commentaires_analyses.mots_cles_frequents)
                    .slice(0, 5)
                    .map(([mot, freq]) => (
                      <Chip
                        key={mot}
                        label={`${mot} (${freq})`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    )}
  </Grid>
);

// Composant Performance
const PerformanceTab = ({ campagne, details }) => (
  <Grid container spacing={3}>
    {/* Performance vs objectifs */}
    {details?.stats?.performance_vs_objectifs && (
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance vs Objectifs
            </Typography>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Objectif participants</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {details.stats.performance_vs_objectifs.objectif_participants}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Participants actuels</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {details.stats.performance_vs_objectifs.participants_actuels}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="body2">Taux d'atteinte</Typography>
                <Typography variant="body1" fontWeight="bold" color="primary">
                  {details.stats.performance_vs_objectifs.taux_atteinte_objectif}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={details.stats.performance_vs_objectifs.taux_atteinte_objectif}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Taux de confirmation</Typography>
                <Typography variant="body1" fontWeight="bold" color="success.main">
                  {details.stats.performance_vs_objectifs.taux_confirmation}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={details.stats.performance_vs_objectifs.taux_confirmation}
                color="success"
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    )}

    {/* Indicateurs de qualité */}
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Indicateurs de qualité
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <TrendingUp color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Taux de participation"
                secondary={`${details?.stats?.taux_participation || 0}%`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Taux de confirmation"
                secondary={`${details?.stats?.performance_vs_objectifs?.taux_confirmation || 0}%`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Timeline color="info" />
              </ListItemIcon>
              <ListItemText 
                primary="Durée moyenne de traitement"
                secondary="2.3 jours"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Grid>

    {/* Recommandations */}
    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recommandations
          </Typography>
          {details?.stats?.performance_vs_objectifs ? (
            <Box>
              {details.stats.performance_vs_objectifs.taux_atteinte_objectif < 50 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Le taux d'atteinte des objectifs est faible ({details.stats.performance_vs_objectifs.taux_atteinte_objectif}%). 
                  Considérez renforcer la communication ou réviser les critères d'éligibilité.
                </Alert>
              )}
              {details.stats.performance_vs_objectifs.taux_confirmation < 70 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Le taux de confirmation pourrait être amélioré ({details.stats.performance_vs_objectifs.taux_confirmation}%). 
                  Vérifiez le processus de validation et la communication avec les bénéficiaires.
                </Alert>
              )}
              {details.stats.performance_vs_objectifs.taux_atteinte_objectif >= 90 && (
                <Alert severity="success">
                  Excellente performance ! La campagne atteint ses objectifs avec un taux de {details.stats.performance_vs_objectifs.taux_atteinte_objectif}%.
                </Alert>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Données insuffisantes pour générer des recommandations.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

// Fonctions utilitaires
const getStatutLibelle = (statut) => {
  const statuts = {
    'active': 'Active',
    'inactive': 'Inactive',
    'en_cours': 'En cours',
    'terminee': 'Terminée',
    'annulee': 'Annulée'
  };
  return statuts[statut] || statut;
};

const getStatutColor = (statut) => {
  const colors = {
    'active': '#2ecc71',
    'inactive': '#95a5a6',
    'en_cours': '#3498db',
    'terminee': '#34495e',
    'annulee': '#e74c3c'
  };
  return colors[statut] || '#95a5a6';
};

const getStatutBeneficiaireLibelle = (statut) => {
  const statuts = {
    'en_attente': 'En attente',
    'oui': 'Confirmé',
    'non': 'Refusé',
    'refuse': 'Refusé définitivement'
  };
  return statuts[statut] || statut;
};

const getStatutBeneficiaireColor = (statut) => {
  const colors = {
    'en_attente': 'warning',
    'oui': 'success',
    'non': 'default',
    'refuse': 'error'
  };
  return colors[statut] || 'default';
};

export default CampagneDetails;