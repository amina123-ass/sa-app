import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Tooltip,
  InputAdornment,
  TablePagination,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Divider,
  FormHelperText,
  Stack,
  Fab,
  Switch,
  FormControlLabel,
  CircularProgress,
  LinearProgress,
  Backdrop
} from '@mui/material';
import { 
  Edit, 
  Delete, 
  Add, 
  Search,
  Warning,
  Info,
  BookmarkBorder,
  AttachMoney,
  Schedule,
  Category,
  Description,
  CalendarToday,
  AccountBalance,
  AddCircle,
  PlaylistAdd,
  Security,
  CheckCircle,
  Block,
  Refresh,
  Error,
  CardGiftcard,
  AccessTime,
  ListAlt,
  AssignmentTurnedIn,
  Restore,
  CloudDownload,
  DataUsage,
  Assignment
} from '@mui/icons-material';
import AdminLayout from '../../components/Layout/AdminLayout';
import { dictionaryService } from '../../services/dictionaryService';
import { useNotification } from '../../hooks/useNotification';

// Composant de chargement principal
const LoadingPage = ({ progress = 0, currentTask = '' }) => {
  return (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(255, 255, 255, 0.9)'
      }}
      open={true}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100%',
          textAlign: 'center'
        }}
      >
        {/* Logo ou icône principale */}
        <Box sx={{ mb: 4 }}>
          <DataUsage 
            sx={{ 
              fontSize: 80, 
              color: 'primary.main',
              animation: 'pulse 2s infinite'
            }} 
          />
        </Box>

        {/* Titre de chargement */}
        <Typography variant="h4" sx={{ mb: 2, color: 'text.primary' }}>
          Chargement des données
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', maxWidth: 400 }}>
          Nous préparons votre dictionnaire de données. Cela peut prendre quelques instants...
        </Typography>

        {/* Barre de progression */}
        <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
          <LinearProgress 
            variant={progress > 0 ? "determinate" : "indeterminate"}
            value={progress}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              }
            }}
          />
          {progress > 0 && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              {Math.round(progress)}% terminé
            </Typography>
          )}
        </Box>

        {/* Tâche actuelle */}
        {currentTask && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            p: 2,
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            borderRadius: 2,
            border: '1px solid rgba(25, 118, 210, 0.2)'
          }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="primary">
              {currentTask}
            </Typography>
          </Box>
        )}

        {/* Animation CSS */}
        <style jsx>{`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.7;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </Box>
    </Backdrop>
  );
};

// Composant de chargement léger pour les recharges
const ReloadingIndicator = () => {
  return (
    <Box sx={{ 
      position: 'fixed', 
      top: 16, 
      right: 16, 
      zIndex: 1300,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      backgroundColor: 'primary.main',
      color: 'white',
      px: 2,
      py: 1,
      borderRadius: 2,
      boxShadow: 2
    }}>
      <CircularProgress size={16} sx={{ color: 'white' }} />
      <Typography variant="caption">
        Actualisation...
      </Typography>
    </Box>
  );
};

const DictionaryPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [data, setData] = useState({
    situations: [],
    natureDones: [],
    typeAssistances: [],
    detailsTypeAssistances: [],
    etatDones: [],
    securityQuestions: [],
    typeBudgets: [],
    budgets: []
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [currentCategory, setCurrentCategory] = useState('situations');
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentLoadingTask, setCurrentLoadingTask] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [connectionError, setConnectionError] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const { notification, showNotification, hideNotification } = useNotification();

  const categories = [
    {
      key: 'situations',
      label: 'État Dossier',
      service: 'situations',
      icon: <Assignment />,
      description: 'États des dossiers des bénéficiaires',
      addButtonText: 'Nouvel État de Dossier',
      examples: ['En attente', 'En cours de traitement', 'Approuvé', 'Rejeté', 'Clos']
    },
    {
      key: 'natureDones',
      label: 'Nature Done',
      service: 'natureDones',
      icon: <CardGiftcard />,
      description: 'Types de nature des dons (ex: Don individuel, Don d\'entreprise...)',
      addButtonText: 'Nouvelle Nature de Don',
      examples: ['Don individuel', 'Don d\'entreprise', 'Don d\'association', 'Don gouvernemental']
    },
    {
      key: 'typeAssistances',
      label: 'Type Assistance',
      service: 'typeAssistances',
      icon: <Description />,
      description: 'Types d\'assistance fournie (ex: Aide médicale, Aide sociale...)',
      addButtonText: 'Nouveau Type d\'Assistance',
      examples: ['Aide médicale', 'Aide sociale', 'Assistance éducative', 'Aide d\'urgence']
    },
    {
      key: 'detailsTypeAssistances',
      label: 'Détails Type Assistance',
      service: 'detailsTypeAssistances',
      icon: <ListAlt />,
      description: 'Détails spécifiques pour chaque type d\'assistance (consultations, médicaments, etc.)',
      addButtonText: 'Nouveau Détail d\'Assistance',
      examples: ['Consultation médicale', 'Médicaments essentiels', 'Aide alimentaire', 'Fournitures scolaires']
    },
    {
      key: 'etatDones',
      label: 'État de Don',
      service: 'etatDones',
      icon: <Info />,
      description: 'États des dons (ex: En attente, Validé, Refusé...)',
      addButtonText: 'Nouvel État',
      examples: ['En attente', 'Validé', 'Refusé', 'En cours de traitement']
    },
    {
      key: 'securityQuestions',
      label: 'Questions de Sécurité',
      service: 'securityQuestions',
      icon: <Security />,
      description: 'Questions de sécurité pour la récupération de mot de passe',
      addButtonText: 'Nouvelle Question',
      examples: [
        'Quel est le nom de votre premier animal de compagnie ?',
        'Dans quelle ville êtes-vous né(e) ?',
        'Quel est le nom de jeune fille de votre mère ?',
        'Quel était le nom de votre école primaire ?',
        'Quelle est votre couleur préférée ?'
      ]
    },
    {
      key: 'typeBudgets',
      label: 'Type Budget',
      service: 'typeBudgets',
      icon: <AccountBalance />,
      description: 'Types de budgets (ex: Budget principal, Budget secondaire...)',
      addButtonText: 'Nouveau Type de Budget',
      examples: ['Budget principal', 'Budget d\'urgence', 'Budget spécial', 'Fonds de réserve']
    },
    {
      key: 'budgets',
      label: 'Budget',
      service: 'budgets',
      icon: <AttachMoney />,
      description: 'Budgets annuels avec montants et types',
      addButtonText: 'Nouveau Budget',
      examples: []
    }
  ];

  useEffect(() => {
    loadAllData();
  }, []);

  // Test de connectivité au démarrage
  const testConnection = async () => {
    try {
      setCurrentLoadingTask('Test de la connexion API...');
      console.log('Test de connexion API...');
      await dictionaryService.testConnection();
      setConnectionError(false);
      console.log('Connexion API réussie');
      setLoadingProgress(10);
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setConnectionError(true);
      throw error;
    }
  };

  // Fonction pour vérifier si le type de budget sélectionné est "DON"
  const isDonTypeBudget = () => {
    if (!formData.type_budget_id) return false;
    const selectedTypeBudget = data.typeBudgets.find(type => type.id === formData.type_budget_id);
    return selectedTypeBudget?.libelle?.toUpperCase().includes('DON');
  };

  // Effet pour vider le montant quand on sélectionne un type DON
  useEffect(() => {
    if (isDonTypeBudget() && formData.montant) {
      setFormData(prev => ({ ...prev, montant: '' }));
    }
  }, [formData.type_budget_id]);

  const loadAllData = async (isReload = false) => {
    try {
      if (isReload) {
        setReloading(true);
      } else {
        setLoading(true);
        setLoadingProgress(0);
      }
      setLoadingError(null);
      
      console.log('Début du chargement des données...');
      
      // Test de connexion d'abord
      await testConnection();
      
      if (!isReload) {
        setCurrentLoadingTask('Chargement des données...');
      }

      // Chargement sécurisé de chaque catégorie avec progression
      const services = [
        { key: 'situations', name: 'États de dossier' },
        { key: 'natureDones', name: 'Natures de dons' },
        { key: 'typeAssistances', name: 'Types d\'assistance' },
        { key: 'detailsTypeAssistances', name: 'Détails des assistances' },
        { key: 'etatDones', name: 'États des dons' },
        { key: 'securityQuestions', name: 'Questions de sécurité' },
        { key: 'typeBudgets', name: 'Types de budget' },
        { key: 'budgets', name: 'Budgets' }
      ];

      const results = [];
      
      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        if (!isReload) {
          setCurrentLoadingTask(`Chargement de ${service.name}...`);
          setLoadingProgress(10 + (i / services.length) * 80);
        }
        
        try {
          const result = await dictionaryService.safeLoad(service.key);
          results.push({ status: 'fulfilled', value: result });
          
          // Petit délai pour permettre à l'utilisateur de voir la progression
          if (!isReload) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`Erreur lors du chargement de ${service.name}:`, error);
          results.push({ status: 'rejected', reason: error });
        }
      }

      const newData = {
        situations: results[0].status === 'fulfilled' ? results[0].value : [],
        natureDones: results[1].status === 'fulfilled' ? results[1].value : [],
        typeAssistances: results[2].status === 'fulfilled' ? results[2].value : [],
        detailsTypeAssistances: results[3].status === 'fulfilled' ? results[3].value : [],
        etatDones: results[4].status === 'fulfilled' ? results[4].value : [],
        securityQuestions: results[5].status === 'fulfilled' ? results[5].value : [],
        typeBudgets: results[6].status === 'fulfilled' ? results[6].value : [],
        budgets: results[7].status === 'fulfilled' ? results[7].value : []
      };

      // Vérifier s'il y a des erreurs
      const errors = results.filter(result => result.status === 'rejected');
      if (errors.length > 0) {
        console.warn('Certaines données n\'ont pas pu être chargées:', errors);
        
        // Afficher une alerte pour les tables manquantes
        const missingTables = errors.filter(error => 
          error.reason?.message?.includes('Table') || 
          error.reason?.response?.data?.message?.includes('Table')
        );
        
        if (missingTables.length > 0) {
          setLoadingError('Certaines tables de base de données sont manquantes. Veuillez contacter l\'administrateur.');
        } else {
          setLoadingError('Erreur lors du chargement de certaines données.');
        }
      }

      if (!isReload) {
        setCurrentLoadingTask('Finalisation...');
        setLoadingProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setData(newData);
      console.log('Données chargées:', newData);
      
      if (errors.length === 0) {
        showNotification('Données chargées avec succès', 'success');
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setLoadingError(error.message || 'Erreur lors du chargement des données');
      if (!isReload) {
        setCurrentLoadingTask('Erreur de chargement');
      }
      showNotification('Erreur lors du chargement des données', 'error');
    } finally {
      if (isReload) {
        setReloading(false);
      } else {
        setLoading(false);
        setLoadingProgress(0);
        setCurrentLoadingTask('');
      }
    }
  };

  // Fonction de rechargement
  const handleReload = () => {
    loadAllData(true);
  };

  // Filtrage et pagination des données
  const filteredData = useMemo(() => {
    const currentData = data[currentCategory] || [];
    if (!searchTerm) return currentData;
    
    return currentData.filter(item => {
      if (currentCategory === 'securityQuestions') {
        return item.question?.toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      if (currentCategory === 'detailsTypeAssistances') {
        return item.libelle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (item.montant && item.montant.toString().includes(searchTerm)) ||
               (item.typeAssistance && item.typeAssistance.libelle?.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      
      return item.libelle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (item.montant && item.montant.toString().includes(searchTerm)) ||
             (item.annee_exercice && item.annee_exercice.toString().includes(searchTerm)) ||
             (item.duree && item.duree.toString().includes(searchTerm));
    });
  }, [data, currentCategory, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const validateForm = () => {
    const errors = {};
    
    if (currentCategory === 'securityQuestions') {
      if (!formData.question?.trim()) {
        errors.question = 'La question est requise';
      } else if (formData.question.length < 10) {
        errors.question = 'La question doit contenir au moins 10 caractères';
      } else if (formData.question.length > 500) {
        errors.question = 'La question ne peut pas dépasser 500 caractères';
      }
    } else if (currentCategory === 'detailsTypeAssistances') {
      if (!formData.libelle?.trim()) {
        errors.libelle = 'Le libellé est requis';
      }
      if (!formData.type_assistance_id) {
        errors.type_assistance_id = 'Le type d\'assistance est requis';
      }
      if (formData.montant && formData.montant < 0) {
        errors.montant = 'Le montant ne peut pas être négatif';
      }
    } else {
      if (!formData.libelle?.trim()) {
        errors.libelle = 'Le libellé est requis';
      }
    }
    
    if (currentCategory === 'natureDones' && formData.duree && formData.duree < 0) {
      errors.duree = 'La durée ne peut pas être négative';
    }
    
    if (currentCategory === 'budgets') {
      if (!formData.annee_exercice) {
        errors.annee_exercice = 'L\'année d\'exercice est requise';
      } else if (formData.annee_exercice < 2000 || formData.annee_exercice > 2100) {
        errors.annee_exercice = 'Année invalide (2000-2100)';
      }
      
      if (!formData.type_budget_id) {
        errors.type_budget_id = 'Le type de budget est requis';
      }
      
      if (!isDonTypeBudget() && formData.montant && formData.montant < 0) {
        errors.montant = 'Le montant ne peut pas être négatif';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setCurrentCategory(categories[newValue].key);
    setSearchTerm('');
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (item = null) => {
    setSelectedItem(item);
    
    if (item) {
      if (currentCategory === 'securityQuestions') {
        setFormData({ 
          question: item.question || '',
          active: item.active !== undefined ? item.active : true
        });
      } else if (currentCategory === 'detailsTypeAssistances') {
        setFormData({
          type_assistance_id: item.type_assistance_id || '',
          libelle: item.libelle || '',
          description: item.description || '',
          montant: item.montant || ''
        });
      } else {
        setFormData({ ...item });
      }
    } else {
      let defaultData = {};
      
      if (currentCategory === 'securityQuestions') {
        defaultData = { 
          question: '',
          active: true
        };
      } else if (currentCategory === 'natureDones') {
        defaultData = { 
          libelle: '',
          duree: ''
        };
      } else if (currentCategory === 'detailsTypeAssistances') {
        defaultData = {
          type_assistance_id: '',
          libelle: '',
          description: '',
          montant: ''
        };
      } else if (currentCategory === 'budgets') {
        defaultData = {
          libelle: '',
          montant: '',
          annee_exercice: new Date().getFullYear(),
          type_budget_id: ''
        };
      } else {
        defaultData = { libelle: '' };
      }
      
      setFormData(defaultData);
    }
    
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
    setFormData({});
    setFormErrors({});
  };

  const handleOpenDeleteDialog = (item) => {
    setItemToDelete(item);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setItemToDelete(null);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (selectedItem) {
        if (currentCategory === 'securityQuestions') {
          await dictionaryService.updateSecurityQuestion(selectedItem.id, formData);
        } else if (currentCategory === 'situations') {
          await dictionaryService.updateSituation(selectedItem.id, formData);
        } else if (currentCategory === 'natureDones') {
          await dictionaryService.updateNatureDone(selectedItem.id, formData);
        } else if (currentCategory === 'typeAssistances') {
          await dictionaryService.updateTypeAssistance(selectedItem.id, formData);
        } else if (currentCategory === 'detailsTypeAssistances') {
          await dictionaryService.updateDetailsTypeAssistance(selectedItem.id, formData);
        } else if (currentCategory === 'etatDones') {
          await dictionaryService.updateEtatDone(selectedItem.id, formData);
        } else if (currentCategory === 'typeBudgets') {
          await dictionaryService.updateTypeBudget(selectedItem.id, formData);
        } else if (currentCategory === 'budgets') {
          await dictionaryService.updateBudget(selectedItem.id, formData);
        }
        showNotification('Élément modifié avec succès', 'success');
      } else {
        if (currentCategory === 'securityQuestions') {
          await dictionaryService.createSecurityQuestion(formData);
        } else if (currentCategory === 'situations') {
          await dictionaryService.createSituation(formData);
        } else if (currentCategory === 'natureDones') {
          await dictionaryService.createNatureDone(formData);
        } else if (currentCategory === 'typeAssistances') {
          await dictionaryService.createTypeAssistance(formData);
        } else if (currentCategory === 'detailsTypeAssistances') {
          await dictionaryService.createDetailsTypeAssistance(formData);
        } else if (currentCategory === 'etatDones') {
          await dictionaryService.createEtatDone(formData);
        } else if (currentCategory === 'typeBudgets') {
          await dictionaryService.createTypeBudget(formData);
        } else if (currentCategory === 'budgets') {
          await dictionaryService.createBudget(formData);
        }
        showNotification('Élément créé avec succès', 'success');
      }
      
      await loadAllData(true);
      handleCloseDialog();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showNotification(error.response?.data?.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      if (currentCategory === 'securityQuestions') {
        await dictionaryService.deleteSecurityQuestion(itemToDelete.id);
      } else if (currentCategory === 'situations') {
        await dictionaryService.deleteSituation(itemToDelete.id);
      } else if (currentCategory === 'natureDones') {
        await dictionaryService.deleteNatureDone(itemToDelete.id);
      } else if (currentCategory === 'typeAssistances') {
        await dictionaryService.deleteTypeAssistance(itemToDelete.id);
      } else if (currentCategory === 'detailsTypeAssistances') {
        await dictionaryService.deleteDetailsTypeAssistance(itemToDelete.id);
      } else if (currentCategory === 'etatDones') {
        await dictionaryService.deleteEtatDone(itemToDelete.id);
      } else if (currentCategory === 'typeBudgets') {
        await dictionaryService.deleteTypeBudget(itemToDelete.id);
      } else if (currentCategory === 'budgets') {
        await dictionaryService.deleteBudget(itemToDelete.id);
      }
      
      showNotification('Élément supprimé avec succès', 'success');
      await loadAllData(true);
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showNotification('Erreur lors de la suppression', 'error');
      handleCloseDeleteDialog();
    }
  };

  // Skeleton Components
  const TableSkeleton = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Libellé</TableCell>
            {currentCategory === 'natureDones' && <TableCell>Durée</TableCell>}
            {currentCategory === 'detailsTypeAssistances' && (
              <>
                <TableCell>Type Assistance</TableCell>
                <TableCell>Montant</TableCell>
              </>
            )}
            {currentCategory === 'budgets' && (
              <>
                <TableCell>Montant</TableCell>
                <TableCell>Année</TableCell>
                <TableCell>Type</TableCell>
              </>
            )}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(5)].map((_, index) => (
            <TableRow key={index}>
              <TableCell><Skeleton variant="text" /></TableCell>
              <TableCell><Skeleton variant="text" /></TableCell>
              {currentCategory === 'natureDones' && (
                <TableCell><Skeleton variant="text" /></TableCell>
              )}
              {currentCategory === 'detailsTypeAssistances' && (
                <>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                </>
              )}
              {currentCategory === 'budgets' && (
                <>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                </>
              )}
              <TableCell><Skeleton variant="text" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const StatsSkeleton = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {categories.map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {categories.map((category, index) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={category.key}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              bgcolor: tabValue === index ? 'primary.50' : 'background.paper',
              border: tabValue === index ? 2 : 1,
              borderColor: tabValue === index ? 'primary.main' : 'divider',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-2px)'
              }
            }}
            onClick={() => handleTabChange(null, index)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  sx={{ 
                    bgcolor: tabValue === index ? 'primary.main' : 'grey.400',
                    mr: 2 
                  }}
                >
                  {category.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontSize="0.9rem">
                    {category.label}
                  </Typography>
                  <Chip 
                    label={`${data[category.key]?.length || 0} éléments`}
                    size="small"
                    color={tabValue === index ? 'primary' : 'default'}
                  />
                </Box>
              </Box>
              
              {/* Bouton d'ajout rapide sur chaque carte */}
              <Tooltip title={`Ajouter ${category.addButtonText}`}>
                <IconButton
                  size="small"
                  sx={{ 
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTabValue(index);
                    setCurrentCategory(category.key);
                    handleOpenDialog();
                  }}
                >
                  <AddCircle sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
   const renderTable = () => {
    const currentCategoryInfo = categories[tabValue];
    
    if (filteredData.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          {currentCategoryInfo.icon && React.cloneElement(currentCategoryInfo.icon, { 
            sx: { fontSize: 64, color: 'grey.400', mb: 2 } 
          })}
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'Aucun résultat trouvé' : `Aucun élément dans ${currentCategoryInfo.label}`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchTerm 
              ? 'Essayez de modifier votre recherche'
              : `Commencez par ajouter des éléments à ${currentCategoryInfo.label}`
            }
          </Typography>
          
          {!searchTerm && currentCategoryInfo.examples.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Exemples d'éléments que vous pouvez ajouter :
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                {currentCategoryInfo.examples.map((example, index) => (
                  <Chip 
                    key={index} 
                    label={example} 
                    variant="outlined" 
                    size="small"
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Box>
          )}
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ mt: 2 }}
            size="large"
          >
            {currentCategoryInfo.addButtonText}
          </Button>
        </Box>
      );
    }

    return (
      <>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>
                  {currentCategory === 'securityQuestions' ? 'Question' : 'Libellé'}
                </TableCell>
                {currentCategory === 'natureDones' && (
                  <TableCell>Durée (jours)</TableCell>
                )}
                {currentCategory === 'detailsTypeAssistances' && (
                  <>
                    <TableCell>Type d'Assistance</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Montant</TableCell>
                  </>
                )}
                {currentCategory === 'budgets' && (
                  <>
                    <TableCell>Montant</TableCell>
                    <TableCell>Année</TableCell>
                    <TableCell>Type de Budget</TableCell>
                  </>
                )}
                {currentCategory === 'securityQuestions' && (
                  <TableCell>Statut</TableCell>
                )}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>
                    {currentCategory === 'securityQuestions' 
                      ? item.question 
                      : item.libelle
                    }
                  </TableCell>
                  {currentCategory === 'natureDones' && (
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {item.duree ? (
                          <Chip 
                            label={`${item.duree} jours`} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        ) : (
                          <Chip 
                            label="Non définie" 
                            size="small" 
                            color="default" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                  )}
                  {currentCategory === 'detailsTypeAssistances' && (
                    <>
                      <TableCell>
                        <Chip 
                          label={item.typeAssistance?.libelle || 'Non défini'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.description || 'Aucune description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.montant 
                          ? new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'MAD'
                            }).format(item.montant)
                          : 'Non défini'
                        }
                      </TableCell>
                    </>
                  )}
                  {currentCategory === 'budgets' && (
                    <>
                      <TableCell>
                        {item.montant 
                          ? new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'MAD'
                            }).format(item.montant)
                          : 'Non défini'
                        }
                      </TableCell>
                      <TableCell>{item.annee_exercice}</TableCell>
                      <TableCell>
                        <Chip 
                          label={item.typeBudget?.libelle || 'Non défini'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                    </>
                  )}
                  {currentCategory === 'securityQuestions' && (
                    <TableCell>
                      <Chip 
                        label={item.active ? 'Active' : 'Inactive'}
                        size="small"
                        color={item.active ? 'success' : 'default'}
                        icon={item.active ? <CheckCircle /> : <Block />}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Modifier">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(item)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDeleteDialog(item)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                      {currentCategory === 'detailsTypeAssistances' && item.date_suppression && (
                        <Tooltip title="Restaurer">
                          <IconButton
                            size="small"
                            onClick={() => handleRestore(item)}
                            color="success"
                          >
                            <Restore />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredData.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Lignes par page:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
          }
        />
      </>
    );
  };
  const handleRestore = async (item) => {
    try {
      if (currentCategory === 'detailsTypeAssistances') {
        await dictionaryService.restoreDetailsTypeAssistance(item.id);
        showNotification('Élément restauré avec succès', 'success');
        await loadAllData(true);
      }
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);
      showNotification('Erreur lors de la restauration', 'error');
    }
  };
  
   const renderFormDialog = () => {
    const currentCategoryInfo = categories[tabValue];
    
    return (
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedItem 
            ? `Modifier ${currentCategoryInfo.label}`
            : currentCategoryInfo.addButtonText
          }
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Formulaire pour Questions de Sécurité */}
            {currentCategory === 'securityQuestions' && (
              <>
                <TextField
                  fullWidth
                  label="Question de sécurité"
                  multiline
                  rows={3}
                  value={formData.question || ''}
                  onChange={(e) => setFormData({...formData, question: e.target.value})}
                  error={!!formErrors.question}
                  helperText={formErrors.question}
                  sx={{ mb: 2 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active !== false}
                      onChange={(e) => setFormData({...formData, active: e.target.checked})}
                    />
                  }
                  label="Question active"
                />
              </>
            )}

            {/* Formulaire pour Nature Done */}
            {currentCategory === 'natureDones' && (
              <>
                <TextField
                  fullWidth
                  label="Libellé de la nature de don"
                  value={formData.libelle || ''}
                  onChange={(e) => setFormData({...formData, libelle: e.target.value})}
                  error={!!formErrors.libelle}
                  helperText={formErrors.libelle || "Ex: Don individuel, Don d'entreprise..."}
                  sx={{ mb: 2 }}
                  placeholder="Saisissez le type de don"
                />
                <TextField
                  fullWidth
                  label="Durée de validité (en jours)"
                  type="number"
                  value={formData.duree || ''}
                  onChange={(e) => setFormData({...formData, duree: e.target.value})}
                  error={!!formErrors.duree}
                  helperText={formErrors.duree || "Durée optionnelle de validité du don en jours"}
                  inputProps={{ min: 0 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><AccessTime /></InputAdornment>
                  }}
                  placeholder="Ex: 30, 365..."
                />
                {formData.duree && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Cette nature de don aura une validité de <strong>{formData.duree} jours</strong> après réception.
                    </Typography>
                  </Alert>
                )}
              </>
            )}

            {/* Formulaire pour Détails Type Assistance */}
            {currentCategory === 'detailsTypeAssistances' && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }} error={!!formErrors.type_assistance_id}>
                  <InputLabel>Type d'Assistance</InputLabel>
                  <Select
                    value={formData.type_assistance_id || ''}
                    onChange={(e) => setFormData({...formData, type_assistance_id: e.target.value})}
                    label="Type d'Assistance"
                  >
                    {data.typeAssistances.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Description sx={{ fontSize: 16 }} />
                          {type.libelle}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.type_assistance_id && (
                    <FormHelperText>{formErrors.type_assistance_id}</FormHelperText>
                  )}
                </FormControl>

                <TextField
                  fullWidth
                  label="Libellé du détail"
                  value={formData.libelle || ''}
                  onChange={(e) => setFormData({...formData, libelle: e.target.value})}
                  error={!!formErrors.libelle}
                  helperText={formErrors.libelle || "Ex: Consultation médicale, Médicaments essentiels..."}
                  sx={{ mb: 2 }}
                  placeholder="Saisissez le détail de l'assistance"
                />

                <TextField
                  fullWidth
                  label="Description (optionnelle)"
                  multiline
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  helperText="Description détaillée de ce type d'assistance"
                  sx={{ mb: 2 }}
                  placeholder="Décrivez en détail ce type d'assistance..."
                />

                <TextField
                  fullWidth
                  label="Montant (optionnel)"
                  type="number"
                  value={formData.montant || ''}
                  onChange={(e) => setFormData({...formData, montant: e.target.value})}
                  error={!!formErrors.montant}
                  helperText={formErrors.montant || "Coût estimé ou montant de l'assistance"}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">MAD</InputAdornment>
                  }}
                  placeholder="Ex: 50.00"
                />

                {formData.type_assistance_id && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Ce détail sera associé au type d'assistance: <strong>
                        {data.typeAssistances.find(t => t.id == formData.type_assistance_id)?.libelle}
                      </strong>
                    </Typography>
                  </Alert>
                )}
              </>
            )}

            {/* Formulaire pour Budget */}
            {currentCategory === 'budgets' && (
              <>
                <TextField
                  fullWidth
                  label="Libellé du budget"
                  value={formData.libelle || ''}
                  onChange={(e) => setFormData({...formData, libelle: e.target.value})}
                  error={!!formErrors.libelle}
                  helperText={formErrors.libelle}
                  sx={{ mb: 2 }}
                />
                
                <FormControl fullWidth sx={{ mb: 2 }} error={!!formErrors.type_budget_id}>
                  <InputLabel>Type de Budget</InputLabel>
                  <Select
                    value={formData.type_budget_id || ''}
                    onChange={(e) => setFormData({...formData, type_budget_id: e.target.value})}
                    label="Type de Budget"
                  >
                    {data.typeBudgets.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.libelle}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.type_budget_id && (
                    <FormHelperText>{formErrors.type_budget_id}</FormHelperText>
                  )}
                </FormControl>

                <TextField
                  fullWidth
                  label="Année d'exercice"
                  type="number"
                  value={formData.annee_exercice || new Date().getFullYear()}
                  onChange={(e) => setFormData({...formData, annee_exercice: parseInt(e.target.value)})}
                  error={!!formErrors.annee_exercice}
                  helperText={formErrors.annee_exercice}
                  inputProps={{ min: 2000, max: 2100 }}
                  sx={{ mb: 2 }}
                />

                {!isDonTypeBudget() && (
                  <TextField
                    fullWidth
                    label="Montant"
                    type="number"
                    value={formData.montant || ''}
                    onChange={(e) => setFormData({...formData, montant: e.target.value})}
                    error={!!formErrors.montant}
                    helperText={formErrors.montant || "Montant en dirhams"}
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">MAD</InputAdornment>
                    }}
                  />
                )}

                {isDonTypeBudget() && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Pour les budgets de type "DON", le montant est calculé automatiquement 
                    en fonction des dons reçus.
                  </Alert>
                )}
              </>
            )}

            {/* Formulaire pour État Dossier (anciennement situations) */}
            {currentCategory === 'situations' && (
              <TextField
                fullWidth
                label="Libellé de l'état du dossier"
                value={formData.libelle || ''}
                onChange={(e) => setFormData({...formData, libelle: e.target.value})}
                error={!!formErrors.libelle}
                helperText={formErrors.libelle || "Ex: En attente, Approuvé, Rejeté..."}
                placeholder="Saisissez l'état du dossier"
              />
            )}

            {/* Formulaire standard pour autres catégories */}
            {!['securityQuestions', 'natureDones', 'detailsTypeAssistances', 'budgets', 'situations'].includes(currentCategory) && (
              <TextField
                fullWidth
                label="Libellé"
                value={formData.libelle || ''}
                onChange={(e) => setFormData({...formData, libelle: e.target.value})}
                error={!!formErrors.libelle}
                helperText={formErrors.libelle}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={Object.keys(formErrors).length > 0}
          >
            {selectedItem ? 'Modifier' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Si c'est le chargement initial, afficher la page de chargement complète
  if (loading) {
    return <LoadingPage progress={loadingProgress} currentTask={currentLoadingTask} />;
  }

  return (
    <AdminLayout>
      {/* Indicateur de rechargement */}
      {reloading && <ReloadingIndicator />}
      
      <Box sx={{ p: 3 }}>
        {/* En-tête avec titre et actions */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3 
        }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Dictionnaire de Données
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gérez les données de référence du système
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Actualiser les données">
              <IconButton 
                onClick={handleReload}
                disabled={reloading}
                color="primary"
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              disabled={reloading}
            >
              Ajouter
            </Button>
          </Box>
        </Box>

        {/* Alertes d'erreur */}
        {connectionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2">Erreur de connexion</Typography>
                <Typography variant="body2">
                  Impossible de se connecter à l'API. Vérifiez votre connexion.
                </Typography>
              </Box>
              <Button size="small" onClick={testConnection}>
                Réessayer
              </Button>
            </Box>
          </Alert>
        )}

        {loadingError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Attention</Typography>
            <Typography variant="body2">{loadingError}</Typography>
          </Alert>
        )}

        {/* Notifications */}
        {notification && (
          <Alert 
            severity={notification.type} 
            onClose={hideNotification}
            sx={{ mb: 2 }}
          >
            {notification.message}
          </Alert>
        )}

        {/* Cartes de statistiques */}
        {renderStatsCards()}

        {/* Onglets de navigation */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {categories.map((category, index) => (
              <Tab
                key={category.key}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {category.icon}
                    <span>{category.label}</span>
                    <Chip 
                      label={data[category.key]?.length || 0} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                }
              />
            ))}
          </Tabs>

          {/* Description de la catégorie actuelle */}
          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" color="text.secondary">
              {categories[tabValue]?.description}
            </Typography>
          </Box>
        </Paper>

        {/* Barre de recherche */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder={`Rechercher dans ${categories[tabValue]?.label}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />
        </Paper>

        {/* Contenu principal */}
        {renderTable()}

        {/* Dialogues */}
        {renderFormDialog()}

        {/* Dialogue de confirmation de suppression */}
        <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
          <DialogTitle>
            Confirmer la suppression
          </DialogTitle>
          <DialogContent>
            <Typography>
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
            </Typography>
            {itemToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {currentCategory === 'securityQuestions' 
                    ? itemToDelete.question 
                    : itemToDelete.libelle
                  }
                </Typography>
                {currentCategory === 'natureDones' && itemToDelete.duree && (
                  <Typography variant="body2" color="text.secondary">
                    Durée: {itemToDelete.duree} jours
                  </Typography>
                )}
                {currentCategory === 'detailsTypeAssistances' && (
                  <>
                    {itemToDelete.description && (
                      <Typography variant="body2" color="text.secondary">
                        Description: {itemToDelete.description}
                      </Typography>
                    )}
                    {itemToDelete.montant && (
                      <Typography variant="body2" color="text.secondary">
                        Montant: {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'MAD'
                        }).format(itemToDelete.montant)}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>
              Annuler
            </Button>
            <Button 
              onClick={handleDelete} 
              color="error" 
              variant="contained"
            >
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bouton flottant d'ajout rapide */}
        <Fab
          color="primary"
          sx={{ 
            position: 'fixed',
            bottom: 16,
            right: 16
          }}
          onClick={() => handleOpenDialog()}
          disabled={reloading}
        >
          <Add />
        </Fab>
      </Box>
    </AdminLayout>
  );
};

export default DictionaryPage;