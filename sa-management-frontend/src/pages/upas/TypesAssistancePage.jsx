import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  Pagination,
  Alert,
  Skeleton,
  Tooltip,
  Badge,
  Fab,
  Snackbar,
  CircularProgress,
  Divider,
  Stack,
  Container,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  ListItemIcon,
  ListItemText,
  ButtonGroup,
  Avatar,
  CardHeader,
  List,
  ListItem,
  ListItemAvatar,
  Tabs,
  Tab,
  LinearProgress,
  Collapse,
  TableSortLabel,
  Backdrop
} from '@mui/material';
import {
  Add,
  FilterList,
  Download,
  Print,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Refresh,
  Search,
  Clear,
  Warning,
  CheckCircle,
  Schedule,
  AttachMoney,
  Person,
  Campaign,
  MedicalServices,
  Assessment,
  Today,
  AccessTime,
  PersonPin,
  CalendarMonth,
  Assignment,
  Phone,
  LocationOn,
  Undo,
  Check,
  GetApp,
  TableChart,
  PictureAsPdf,
  DeleteForever,
  PrintDisabled,
  FileDownload,
  Close,
  ContactPage,
  EventNote,
  Description,
  MonetizationOn,
  Category,
  InfoOutlined,
  Save,
  Cancel,
  History,
  Badge as BadgeIcon,
  Home,
  Email,
  AccountBox,
  Update,
  Business,
  Handshake,
  AccountBalance,
  Repeat,
  CardGiftcard,
  Payments,
  LocalHospital,
  FileCopy,
  Archive,
  Restore,
  Receipt,
  PendingActions,
  Done,
  Error,
  Pending,
  Settings,
  Build,
  HelpOutline,
  Info,
  Alarm,
  AlarmOff,
  HourglassEmpty,
  HourglassFull,
  TrendingDown,
  TrendingUp,
  Timer,
  TimerOff,
  CalendarToday,
  PriorityHigh,
  ExpandMore,
  ExpandLess,
  Sort,
  ViewColumn,
  FilterListOff,
  Cached,
  ZoomIn,
  ErrorOutline,
  RefreshOutlined
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { format, isAfter, isBefore, parseISO, differenceInDays, addDays, isValid as isValidDate } from 'date-fns';
import axiosClient from '../../services/axiosClient';

const AssistancesPage = () => {
  // ===== ÉTATS DU CYCLE DE VIE =====
  const [assistances, setAssistances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // État pour les statistiques
  const [stats, setStats] = useState({
    total: 0,
    prets_actifs: 0,
    prets_en_retard: 0,
    prets_retournes: 0,
    dons_simples: 0,
    montant_total: 0,
    montant_moyen: 0,
    prochaines_echeances: 0
  });

  // États pour la pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 15,
    total: 0,
    lastPage: 1
  });
const validateAssistanceData = (assistance, refData) => {
  const errors = [];
  
  // Vérifications de base seulement
  if (!assistance || !assistance.id) {
    errors.push('Données d\'assistance invalides');
    return { valid: false, errors };
  }
  
  // SUPPRIMER toute la validation stricte des IDs
  return { valid: true, errors: [] }; // Toujours valide pour l'édition
};
  // États pour les filtres
  const [filters, setFilters] = useState({
    search: '',
    type_assistance_id: '',
    campagne_id: '',
    nature_done_id: '',
    date_min: null,
    date_max: null,
    statut_pret: 'tous',
    moi_meme: '',
    priorite: ''
  });

  // États pour les données de référence
  const [referenceData, setReferenceData] = useState({
    types_assistance: [],
    beneficiaires: [],
    campagnes: [],
    nature_dones: [],
    etat_dones: [],
    situations: [],
    details_type_assistance: []
  });

  const [referenceDataLoading, setReferenceDataLoading] = useState({
    types_assistance: false,
    beneficiaires: false,
    nature_dones: false,
    etat_dones: false,
    situations: false,
    details_type_assistance: false
  });

  // États pour les modals et actions
  const [openFormModal, setOpenFormModal] = useState(false);
  const [selectedAssistance, setSelectedAssistance] = useState(null);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [assistanceToDelete, setAssistanceToDelete] = useState(null);

  // États pour l'action VOIR
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedAssistanceView, setSelectedAssistanceView] = useState(null);

  // États pour l'accusé de réception
  const [openAccuseDialog, setOpenAccuseDialog] = useState(false);
  const [selectedAssistanceAccuse, setSelectedAssistanceAccuse] = useState(null);

  // États pour le retour effectué
  const [openRetourDialog, setOpenRetourDialog] = useState(false);
  const [selectedAssistanceRetour, setSelectedAssistanceRetour] = useState(null);
  const [retourData, setRetourData] = useState({
    date_retour: new Date().toISOString().split('T')[0],
    observation: '',
    etat_materiel: 'bon',
    observation_retour: '',
    etat_retour: 'bon'
  });
  const [loadingRetour, setLoadingRetour] = useState(false);

  // États pour les notifications
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // États pour les colonnes visibles
  const [visibleColumns, setVisibleColumns] = useState({
    beneficiaire: true,
    telephone: true,
    type_assistance: true,
    details_assistance: true,
    nature_don: true,
    etat_don: true,
    situation: true,
    date_assistance: true,
    duree: true,
    date_retour_prevue: true,
    montant: true,
    priorite: true,
    moi_meme: true,
    observations: true,
    commentaire_interne: false,
    statut: true,
    actions: true
  });

  // États pour le tri
  const [orderBy, setOrderBy] = useState('date_assistance');
  const [order, setOrder] = useState('desc');

  // États pour le formulaire d'assistance
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingDetailsType, setLoadingDetailsType] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [dataErrors, setDataErrors] = useState({});

  // État du formulaire - INITIAL STATE
  const getInitialFormData = () => ({
    type_assistance_id: '',
    details_type_assistance_id: '',
    beneficiaire_id: '',
    etat_don_id: '',
    situation_id: '',
    nature_done_id: '',
    date_assistance: new Date(),
    montant: '',
    priorite: 'Normale',
    moi_meme: false,
    observations: '',
    commentaire_interne: '',
    duree_utilisation: '',
    date_retour_prevue: null,
    est_pret: false,
    retour_effectue: false
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // État pour savoir si on doit afficher les champs de prêt
  const [showDureeFields, setShowDureeFields] = useState(false);
  const [selectedNatureDon, setSelectedNatureDon] = useState(null);

  const [appState, setAppState] = useState('boot'); // 'boot' | 'ready' | 'error'
  const [bootError, setBootError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false); // Loader pour refresh manuel
  
  // Flag pour éviter les doubles chargements
  const bootCompleted = useRef(false);
  const isCurrentlyLoading = useRef(false);

  // ===== FONCTIONS UTILITAIRES =====
  // REMPLACER cette fonction vers la ligne 320
const fillFormFromAssistanceSecure = (assistance, refData) => {
  console.log('Pré-remplissage sécurisé pour:', assistance.id);
  
  // Conversion sécurisée avec fallbacks
  const type_assistance_id = assistance.type_assistance_id ? 
    String(assistance.type_assistance_id) : '';
    
  const beneficiaire_id = assistance.beneficiaire_id ? 
    String(assistance.beneficiaire_id) : '';
    
  const nature_done_id = assistance.nature_done_id ? 
    String(assistance.nature_done_id) : '';
    
  const etat_don_id = (assistance.etat_done_id || assistance.etat_don_id) ? 
    String(assistance.etat_done_id || assistance.etat_don_id) : '';
  
  const isActuallyPret = isAssistancePret(assistance);
  
  return {
    type_assistance_id,
    details_type_assistance_id: assistance.details_type_assistance_id ? 
      String(assistance.details_type_assistance_id) : '',
    beneficiaire_id,
    etat_don_id,
    situation_id: assistance.situation_id ? String(assistance.situation_id) : '',
    nature_done_id,
    date_assistance: parseDate(assistance.date_assistance) || new Date(),
    montant: assistance.montant ? String(assistance.montant) : '',
    priorite: assistance.priorite || 'Normale',
    moi_meme: Boolean(assistance.moi_meme),
    observations: assistance.observations || '',
    commentaire_interne: assistance.commentaire_interne || '',
    duree_utilisation: isActuallyPret ? 
      String(assistance.duree_utilisation || assistance.duree || '') : '',
    date_retour_prevue: isActuallyPret ? 
      parseDate(assistance.date_retour_prevue || assistance.date_fin_prevue) : null,
    est_pret: isActuallyPret,
    retour_effectue: Boolean(assistance.retour_effectue)
  };
};
  // Fonction parseDate améliorée
  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    
    try {
      // Si c'est déjà un objet Date valide, le retourner
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        return dateValue;
      }
      
      // Si c'est une chaîne, essayer de la parser
      if (typeof dateValue === 'string') {
        const cleanDateString = dateValue.trim();
        if (!cleanDateString) return null;
        
        // Essayer parseISO d'abord (format ISO standard)
        const parsedDate = parseISO(cleanDateString);
        if (isValidDate(parsedDate)) {
          return parsedDate;
        }
        
        // Fallback avec le constructeur Date
        const fallbackDate = new Date(cleanDateString);
        if (isValidDate(fallbackDate)) {
          return fallbackDate;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Erreur parsing date:', dateValue, error);
      return null;
    }
  };

  const formatDateSafe = (dateValue, formatString = 'dd/MM/yyyy') => {
    try {
      const parsedDate = parseDate(dateValue);
      if (!parsedDate) return '';
      
      return format(parsedDate, formatString, { locale: fr });
    } catch (error) {
      console.warn('Erreur formatage date:', dateValue, error);
      return '';
    }
  };

  const isAssistancePret = (assistance) => {
    return Boolean(
      assistance.est_pret || 
      assistance.duree_utilisation || 
      assistance.date_fin_prevue ||
      assistance.date_retour_prevue ||
      assistance.nature_done_id === 3 ||
      (assistance.nature_done && assistance.nature_done.libelle && 
       assistance.nature_done.libelle.toLowerCase().includes('prêt'))
    );
  };

  // ===== FONCTION calculateAdvancedStats DÉFINIE ICI (AVANT loadAssistances) =====
  const calculateAdvancedStats = useCallback((assistancesList) => {
    if (!Array.isArray(assistancesList) || assistancesList.length === 0) {
      return {
        total: 0,
        prets_actifs: 0,
        prets_en_retard: 0,
        prets_retournes: 0,
        dons_simples: 0,
        montant_total: 0,
        montant_moyen: 0,
        prochaines_echeances: 0
      };
    }

    let stats = {
      total: assistancesList.length,
      prets_actifs: 0,
      prets_en_retard: 0,
      prets_retournes: 0,
      dons_simples: 0,
      montant_total: 0,
      montant_moyen: 0,
      prochaines_echeances: 0
    };

    let totalMontant = 0;
    let countMontant = 0;
    const today = new Date();

    assistancesList.forEach(assistance => {
      const montant = parseFloat(assistance.montant) || 0;
      if (montant > 0) {
        totalMontant += montant;
        countMontant++;
      }

      const estPret = isAssistancePret(assistance);
      
      if (estPret) {
        if (assistance.retour_effectue || assistance.date_retour) {
          stats.prets_retournes++;
        } else {
          const dateFinPrevue = parseDate(assistance.date_fin_prevue || assistance.date_retour_prevue);
          if (dateFinPrevue && isBefore(dateFinPrevue, today)) {
            stats.prets_en_retard++;
          } else {
            stats.prets_actifs++;
          }
          
          if (dateFinPrevue && differenceInDays(dateFinPrevue, today) <= 7 && differenceInDays(dateFinPrevue, today) >= 0) {
            stats.prochaines_echeances++;
          }
        }
      } else {
        stats.dons_simples++;
      }
    });

    stats.montant_total = Math.round(totalMontant * 100) / 100;
    stats.montant_moyen = countMontant > 0 ? Math.round((totalMontant / countMontant) * 100) / 100 : 0;

    return stats;
  }, []);
  const showNotification = useCallback((message, severity = 'success') => {
  setNotification({ 
    open: true, 
    message: typeof message === 'string' ? message : 'Erreur inconnue',
    severity 
  });
  
  if (severity === 'error') {
    console.error('Notification d\'erreur:', message);
  }
}, []);

// REMPLACER cette fonction vers la ligne 450
const handleEditAssistance = useCallback(async (assistance) => {
  console.log('=== DEBUT EDITION ===');
  console.log('Assistance à éditer:', assistance.id);
  
  try {
    if (!assistance || !assistance.id) {
      showNotification('Erreur: données d\'assistance invalides', 'error');
      return;
    }
    
    setLoadingSubmit(true);
    
    // S'assurer que les données de référence sont chargées
    let refData = referenceData;
    const needsReload = 
      referenceData.beneficiaires.length === 0 || 
      referenceData.types_assistance.length === 0 || 
      referenceData.nature_dones.length === 0 ||
      referenceData.etat_dones.length === 0;
    
    if (needsReload) {
      console.log('Rechargement des données de référence...');
      refData = await loadReferenceData();
      setReferenceData(refData);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Charger les détails du type si nécessaire
    if (assistance.type_assistance_id) {
      await loadDetailsTypeAssistance(assistance.type_assistance_id);
    }
    
    // Pré-remplir directement
    const filledData = fillFormFromAssistanceSecure(assistance, refData);
    
    // Appliquer tous les changements
    setSelectedAssistance(assistance);
    setFormData(filledData);
    setShowDureeFields(isAssistancePret(assistance));
    
    // Ouvrir le modal après stabilisation
    await new Promise(resolve => setTimeout(resolve, 200));
    setOpenFormModal(true);
    
    console.log('=== EDITION TERMINEE ===');
    
  } catch (error) {
    console.error('Erreur pendant l\'édition:', error);
    showNotification(`Erreur lors de l'ouverture du formulaire: ${error.message}`, 'error');
  } finally {
    setLoadingSubmit(false);
  }
}, [referenceData, showNotification]);
  // ===== FONCTION loadAssistances MAINTENANT DÉFINIE APRÈS calculateAdvancedStats =====
  const loadAssistances = useCallback(async (forceRefresh = false) => {
    // Éviter les rechargements multiples sauf si forcé
    if (!isInitialized && initialLoading && !forceRefresh) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 Chargement assistances...', forceRefresh ? '(Forcé)' : '');
      
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
        with: 'type_assistance,nature_done,beneficiaire,etat_done,situation',
        ...filters,
        // Ajouter un timestamp pour éviter le cache
        _t: Date.now()
      };

      // APPEL RÉEL À L'API
      const response = await axiosClient.get('/upas/assistances', { params });
      
      if (response.data && response.data.success !== false) {
        const assistancesList = response.data.data || [];
        
        console.log(`✅ Assistances chargées depuis l'API: ${assistancesList.length}`);
        setAssistances(assistancesList);
        
        setPagination({
          currentPage: response.data.current_page || 1,
          perPage: response.data.per_page || 15,
          total: response.data.total || 0,
          lastPage: response.data.last_page || 1
        });
        
        const calculatedStats = calculateAdvancedStats(assistancesList);
        setStats(calculatedStats);
        
        return;
      }
    } catch (error) {
      console.error('❌ Erreur chargement assistances:', error);
      setError('Erreur lors du chargement des assistances: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, initialLoading, pagination.currentPage, pagination.perPage, filters, calculateAdvancedStats]);

  // ===== FONCTIONS DE FORMATAGE =====
  
  const formatBeneficiaireName = (assistance) => {
    if (!assistance) return '';

    if (assistance.beneficiaire_display && assistance.beneficiaire_display.trim() !== '') {
      return assistance.beneficiaire_display.trim();
    }
    
    if (assistance.beneficiaire && typeof assistance.beneficiaire === 'object') {
      const nom = assistance.beneficiaire.nom || '';
      const prenom = assistance.beneficiaire.prenom || '';
      const fullName = `${prenom} ${nom}`.trim();
      if (fullName) return fullName;
    }
    
    if (assistance.beneficiaire_nom || assistance.beneficiaire_prenom) {
      const nom = assistance.beneficiaire_nom || '';
      const prenom = assistance.beneficiaire_prenom || '';
      const fullName = `${prenom} ${nom}`.trim();
      if (fullName) return fullName;
    }
    
    if (assistance.nom || assistance.prenom) {
      const nom = assistance.nom || '';
      const prenom = assistance.prenom || '';
      const fullName = `${prenom} ${nom}`.trim();
      if (fullName) return fullName;
    }

    if (assistance.beneficiaire_id && referenceData.beneficiaires.length > 0) {
      const beneficiaireFound = referenceData.beneficiaires.find(b => b.id == assistance.beneficiaire_id);
      if (beneficiaireFound) {
        const nom = beneficiaireFound.nom || '';
        const prenom = beneficiaireFound.prenom || '';
        const fullName = `${prenom} ${nom}`.trim();
        if (fullName) return fullName;
      }
    }

    return assistance.beneficiaire_id ? `Bénéficiaire #${assistance.beneficiaire_id}` : '';
  };

  const formatTypeAssistance = (assistance) => {
    if (!assistance) return 'Non défini';

    if (assistance.type_assistance_libelle && assistance.type_assistance_libelle.trim()) {
      return assistance.type_assistance_libelle.trim();
    }
    
    if (assistance.type_assistance && typeof assistance.type_assistance === 'object' && assistance.type_assistance.libelle) {
      return assistance.type_assistance.libelle;
    }

    if (assistance.type_assistance && typeof assistance.type_assistance === 'string' && assistance.type_assistance.trim()) {
      return assistance.type_assistance.trim();
    }

    if (assistance.type_assistance_id && referenceData.types_assistance.length > 0) {
      const typeFound = referenceData.types_assistance.find(t => t.id == assistance.type_assistance_id);
      if (typeFound && typeFound.libelle) {
        return typeFound.libelle;
      }
    }
    
    const typeMapping = {
      1: 'Assistance Médicale',
      2: 'Assistance Matérielle', 
      3: 'Assistance Financière',
      4: 'Assistance Sociale',
      5: 'Appareillage Auditif',
      6: 'Lunettes de Vue',
      7: 'Aide à la Mobilité',
      8: 'Prothèses et Orthèses'
    };
    
    if (assistance.type_assistance_id && typeMapping[assistance.type_assistance_id]) {
      return typeMapping[assistance.type_assistance_id];
    }
    
    return assistance.type_assistance_id ? `Type #${assistance.type_assistance_id}` : 'Non défini';
  };

  const formatNatureDon = (assistance) => {
    if (!assistance) return 'Non défini';

    if (assistance.nature_done_libelle && assistance.nature_done_libelle.trim()) {
      return assistance.nature_done_libelle.trim();
    }

    if (assistance.nature_done && typeof assistance.nature_done === 'object' && assistance.nature_done.libelle) {
      return assistance.nature_done.libelle;
    }

    if (assistance.nature_done && typeof assistance.nature_done === 'string' && assistance.nature_done.trim()) {
      return assistance.nature_done.trim();
    }

    if (assistance.nature_done_id && referenceData.nature_dones.length > 0) {
      const natureFound = referenceData.nature_dones.find(n => n.id == assistance.nature_done_id);
      if (natureFound && natureFound.libelle) {
        return natureFound.libelle;
      }
    }
    
    const natureMapping = {
      1: 'Don individuel',
      2: 'Don d\'entreprise',
      3: 'Don d\'association',
      4: 'Don gouvernemental',
      5: 'Prêt temporaire',
      6: 'Don en nature',
      7: 'Don financier',
      8: 'Aide d\'urgence'
    };
    
    if (assistance.nature_done_id && natureMapping[assistance.nature_done_id]) {
      return natureMapping[assistance.nature_done_id];
    }
    
    if (assistance.nature_done_id) {
      return `Nature #${assistance.nature_done_id}`;
    }
    
    return 'Non défini';
  };

  const formatMontant = (assistance) => {
    if (!assistance) return '';

    if (assistance.montant_formatted && assistance.montant_formatted.trim()) {
      return assistance.montant_formatted.trim();
    } else if (assistance.montant) {
      const montant = parseFloat(assistance.montant);
      if (!isNaN(montant) && montant > 0) {
        return `${montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
      }
    }
    return '';
  };

  const getStatutPret = (assistance) => {
    if (!isAssistancePret(assistance)) {
      return 'don';
    }

    if (assistance.retour_effectue || assistance.date_retour) {
      return 'retourne';
    }

    const dateFinPrevue = parseDate(assistance.date_fin_prevue || assistance.date_retour_prevue);
    if (!dateFinPrevue) {
      return 'en_cours';
    }

    const today = new Date();
    if (isBefore(dateFinPrevue, today)) {
      return 'en_retard';
    } else {
      return 'en_cours';
    }
  };

  const getJoursRestants = (assistance) => {
    if (!isAssistancePret(assistance) || assistance.retour_effectue || assistance.date_retour) {
      return null;
    }

    const dateFinPrevue = parseDate(assistance.date_fin_prevue || assistance.date_retour_prevue);
    if (!dateFinPrevue) return null;

    const jours = differenceInDays(dateFinPrevue, new Date());
    return jours;
  };

  const renderStatutPretBadge = (assistance) => {
    const statut = getStatutPret(assistance);
    const joursRestants = getJoursRestants(assistance);

    switch (statut) {
      case 'retourne':
        return (
          <Chip
            icon={<CheckCircle />}
            label="Retourné"
            color="success"
            size="small"
            variant="filled"
            sx={{ fontWeight: 'bold' }}
          />
        );

      case 'en_retard':
        const joursRetard = Math.abs(joursRestants || 0);
        return (
          <Tooltip title={`En retard de ${joursRetard} jour${joursRetard > 1 ? 's' : ''}`}>
            <Chip
              icon={<Error />}
              label={`En retard (${joursRetard}j)`}
              color="error"
              size="small"
              variant="filled"
              sx={{ fontWeight: 'bold' }}
            />
          </Tooltip>
        );

      case 'en_cours':
        const joursRestantsText = joursRestants !== null ? 
          (joursRestants > 0 ? `${joursRestants}j restants` : 'Échéance aujourd\'hui') : 
          'En cours';
        
        const isUrgent = joursRestants !== null && joursRestants <= 3 && joursRestants >= 0;
        
        return (
          <Chip
            icon={isUrgent ? <Alarm /> : <Schedule />}
            label={joursRestantsText}
            color={isUrgent ? "warning" : "info"}
            size="small"
            variant="filled"
            sx={{ fontWeight: 'bold' }}
          />
        );

      case 'don':
      default:
        return (
          <Chip
            icon={<CardGiftcard />}
            label="Don"
            color="default"
            size="small"
            variant="outlined"
          />
        );
    }
  };

  // ===== FONCTIONS DE CHARGEMENT DES DONNÉES =====
  const loadReferenceData = async () => {
    const results = {
      types_assistance: [],
      beneficiaires: [],
      nature_dones: [],
      etat_dones: [],
      situations: [],
      details_type_assistance: []
    };

    const promises = [
      loadTypesAssistance().then(data => results.types_assistance = data).catch(() => {}),
      loadBeneficiaires().then(data => results.beneficiaires = data).catch(() => {}),
      loadNatureDones().then(data => results.nature_dones = data).catch(() => {}),
      loadEtatDones().then(data => results.etat_dones = data).catch(() => {}),
      loadSituations().then(data => results.situations = data).catch(() => {})
    ];

    await Promise.allSettled(promises);
    return results;
  };

  const loadTypesAssistance = async () => {
    try {
      const response = await axiosClient.get('/upas/types-assistance');
      return response.data?.data || [];
    } catch (error) {
      console.warn('Erreur chargement types assistance:', error);
      return [
        { id: 1, libelle: "Assistance Médicale" },
        { id: 2, libelle: "Assistance Sociale" },
        { id: 3, libelle: "Assistance Matérielle" }
      ];
    }
  };

  const loadBeneficiaires = async () => {
    try {
      const response = await axiosClient.get('/upas/beneficiaires?per_page=1000');
      return response.data?.data || [];
    } catch (error) {
      console.warn('Erreur chargement bénéficiaires:', error);
      return [
        { id: 1, nom: "Alami", prenom: "Ahmed", telephone: "0661234567" },
        { id: 2, nom: "Benali", prenom: "Fatima", telephone: "0672345678" }
      ];
    }
  };

  const loadNatureDones = async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/nature-dones');
      const processedNatureDones = (response.data?.data || []).map(nature => ({
        ...nature,
        is_loan: Boolean(
          nature.duree || 
          nature.libelle?.toLowerCase().includes('prêt') ||
          nature.libelle?.toLowerCase().includes('temporaire')
        )
      }));
      return processedNatureDones;
    } catch (error) {
      console.warn('Erreur chargement natures done:', error);
      return [
        { id: 1, libelle: "Don simple", is_loan: false },
        { id: 2, libelle: "Don matériel", is_loan: false },
        { id: 3, libelle: "Prêt temporaire", is_loan: true, duree: 30 }
      ];
    }
  };

  const loadEtatDones = async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/etat-dones');
      return response.data?.data || [];
    } catch (error) {
      return [
        { id: 1, libelle: "Neuf" },
        { id: 2, libelle: "Occasion - Bon état" },
        { id: 3, libelle: "Occasion - État moyen" }
      ];
    }
  };

  const loadSituations = async () => {
    try {
      const response = await axiosClient.get('/admin/dictionary/situations');
      return response.data?.data || [];
    } catch (error) {
      return [
        { id: 1, libelle: "En attente" },
        { id: 2, libelle: "En cours" },
        { id: 3, libelle: "Terminée" }
      ];
    }
  };

  const loadDetailsTypeAssistance = async (typeAssistanceId) => {
    setLoadingDetailsType(true);
    
    try {
      const response = await axiosClient.get(`/admin/dictionary/details-type-assistances/type/${typeAssistanceId}`);
      const details = (response.data?.data || []).filter(detail => 
        !detail.date_suppression && 
        detail.type_assistance_id == typeAssistanceId
      );
      setReferenceData(prev => ({ ...prev, details_type_assistance: details }));
    } catch (error) {
      const detailsMapping = {
        1: [
          { id: 1, libelle: "Consultation générale", type_assistance_id: 1 },
          { id: 2, libelle: "Consultation spécialisée", type_assistance_id: 1 }
        ]
      };
      
      const details = detailsMapping[typeAssistanceId] || [];
      setReferenceData(prev => ({ ...prev, details_type_assistance: details }));
    } finally {
      setLoadingDetailsType(false);
    }
  };

  // ===== FONCTIONS FORMULAIRE CORRIGÉES =====
  
  // Fonction pour pré-remplir le formulaire à partir d'une assistance
  const fillFormFromAssistance = useCallback((assistance) => {
  if (!assistance) {
    return getInitialFormData();
  }

  console.log('🔧 Pré-remplissage avec:', assistance);
  console.log('📚 Données de référence disponibles:', {
    beneficiaires: referenceData.beneficiaires.length,
    types_assistance: referenceData.types_assistance.length,
    nature_dones: referenceData.nature_dones.length
  });

  const isActuallyPret = isAssistancePret(assistance);
  
  // CONVERSION STRICTE EN STRING pour les Select/Autocomplete
  const filledData = {
    type_assistance_id: assistance.type_assistance_id ? String(assistance.type_assistance_id) : '',
    details_type_assistance_id: assistance.details_type_assistance_id ? String(assistance.details_type_assistance_id) : '',
    beneficiaire_id: assistance.beneficiaire_id ? String(assistance.beneficiaire_id) : '',
    etat_don_id: assistance.etat_done_id || assistance.etat_don_id ? String(assistance.etat_done_id || assistance.etat_don_id) : '',
    situation_id: assistance.situation_id ? String(assistance.situation_id) : '',
    nature_done_id: assistance.nature_done_id ? String(assistance.nature_done_id) : '',
    date_assistance: assistance.date_assistance ? parseDate(assistance.date_assistance) : new Date(),
    montant: assistance.montant ? String(assistance.montant) : '',
    priorite: assistance.priorite || 'Normale',
    moi_meme: Boolean(assistance.moi_meme),
    observations: assistance.observations || '',
    commentaire_interne: assistance.commentaire_interne || '',
    duree_utilisation: isActuallyPret ? String(assistance.duree_utilisation || assistance.duree || '') : '',
    date_retour_prevue: isActuallyPret ? parseDate(assistance.date_retour_prevue || assistance.date_fin_prevue) : null,
    est_pret: isActuallyPret,
    retour_effectue: Boolean(assistance.retour_effectue)
  };

  console.log('✅ Données pré-remplies:', filledData);
  return filledData;
}, [referenceData]);


  const handleInputChange = (field, value) => {
  console.log(`🔧 Changement champ ${field}:`, value);
  setFormData(prev => ({ ...prev, [field]: value }));
  
  if (formErrors[field]) {
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  }
};

  // REMPLACER cette fonction vers la ligne 650
const validateForm = () => {
  const newErrors = {};

  if (!formData.type_assistance_id || formData.type_assistance_id === '0') {
    newErrors.type_assistance_id = 'Le type d\'assistance est obligatoire';
  }

  if (!formData.beneficiaire_id || formData.beneficiaire_id === '0') {
    newErrors.beneficiaire_id = 'Le bénéficiaire est obligatoire';
  }

  if (!formData.nature_done_id || formData.nature_done_id === '0') {
    newErrors.nature_done_id = 'La nature du don est obligatoire';
  }

  if (!formData.date_assistance) {
    newErrors.date_assistance = 'La date d\'assistance est obligatoire';
  }

  if (formData.montant && formData.montant !== '') {
    const montant = parseFloat(formData.montant);
    if (isNaN(montant) || montant < 0) {
      newErrors.montant = 'Le montant doit être un nombre positif';
    }
  }

  if (showDureeFields && formData.est_pret) {
    if (!formData.duree_utilisation || formData.duree_utilisation === '') {
      newErrors.duree_utilisation = 'La durée d\'utilisation est obligatoire pour un prêt';
    }
    if (!formData.date_retour_prevue) {
      newErrors.date_retour_prevue = 'La date de retour prévue est obligatoire pour un prêt';
    }
  }

  setFormErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
  // ===== FONCTIONS DE GESTION DU FORMULAIRE CORRIGÉES =====
  

// 3. FONCTION DE PRE-REMPLISSAGE SECURISEE


// 5. AJOUTER UN BOUTON DE DEBUG (optionnel pour le développement)
const DebugDataButton = () => (
  process.env.NODE_ENV === 'development' && (
    <Button 
      onClick={() => {
        console.group('🔍 DEBUG DONNÉES');
        console.log('referenceData:', referenceData);
        console.log('assistances:', assistances);
        console.log('selectedAssistance:', selectedAssistance);
        console.log('formData:', formData);
        console.groupEnd();
      }} 
      variant="outlined" 
      size="small"
      sx={{ ml: 1 }}
    >
      Debug Données
    </Button>
  )
);
  


  const handleCloseFormModal = useCallback(() => {
    setSelectedAssistance(null);
    setOpenFormModal(false);
    setFormErrors({});
    setShowDureeFields(false);
    // Reset du formulaire sera géré par le useEffect
  }, []);

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoadingSubmit(true);

      // Vérifier si la nature sélectionnée est un prêt
      const selectedNature = referenceData.nature_dones.find(
        nature => nature.id == formData.nature_done_id
      );
      
      const isNaturePret = selectedNature?.is_loan || 
        selectedNature?.libelle?.toLowerCase().includes('prêt') ||
        selectedNature?.libelle?.toLowerCase().includes('pret') ||
        selectedNature?.libelle?.toLowerCase().includes('temporaire');

      // En mode édition, vérifier si la nature était déjà un prêt
      const wasOriginallyPret = selectedAssistance ? isAssistancePret(selectedAssistance) : false;

      // Construire l'objet de soumission
      const submitData = {
        type_assistance_id: parseInt(formData.type_assistance_id),
        details_type_assistance_id: formData.details_type_assistance_id ? parseInt(formData.details_type_assistance_id) : null,
        beneficiaire_id: parseInt(formData.beneficiaire_id),
        etat_don_id: parseInt(formData.etat_don_id),
        situation_id: formData.situation_id ? parseInt(formData.situation_id) : null,
        nature_done_id: parseInt(formData.nature_done_id),
        date_assistance: formData.date_assistance?.toISOString().split('T')[0],
        montant: formData.montant ? parseFloat(formData.montant) : null,
        priorite: formData.priorite,
        moi_meme: Boolean(formData.moi_meme),
        observations: formData.observations || null,
        commentaire_interne: formData.commentaire_interne || null,
        retour_effectue: Boolean(formData.retour_effectue)
      };

      // N'inclure les champs de prêt QUE si la nature est un prêt
      if (isNaturePret && showDureeFields) {
        submitData.est_pret = true;
        submitData.duree_utilisation = formData.duree_utilisation ? parseInt(formData.duree_utilisation) : null;
        submitData.date_retour_prevue = formData.date_retour_prevue ? 
          formData.date_retour_prevue.toISOString().split('T')[0] : null;
      } else {
        // Si ce n'est plus un prêt, on force les valeurs à null
        submitData.est_pret = false;
        submitData.duree_utilisation = null;
        submitData.date_retour_prevue = null;
      }

      // Validation côté client : interdire la modification de durée si ce n'est pas un prêt
      if (selectedAssistance && formData.duree_utilisation && !isNaturePret) {
        showNotification(
          'La modification de la durée d\'utilisation n\'est autorisée que pour les assistances à titre de prêt',
          'error'
        );
        return;
      }

      console.log('Soumission données:', submitData);

      let response;
      if (selectedAssistance) {
        response = await axiosClient.put(`/upas/assistances/${selectedAssistance.id}`, submitData);
      } else {
        response = await axiosClient.post('/upas/assistances', submitData);
      }
      
      if (response.data && response.data.success !== false) {
        const message = selectedAssistance ? 'Assistance modifiée avec succès' : 'Assistance créée avec succès';
        
        handleCloseFormModal();
        showNotification(message, 'success');
        await loadAssistances(true);
        
      } else {
        throw new Error(response.data?.message || 'Erreur lors de l\'enregistrement');
      }
      
    } catch (error) {
      console.error('Erreur soumission:', error);
      
      let errorMessage = 'Erreur lors de l\'enregistrement';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        // Afficher les erreurs de validation de manière lisible
        if (validationErrors.duree_utilisation) {
          errorMessage = validationErrors.duree_utilisation[0];
        } else {
          errorMessage = Object.values(validationErrors).flat().join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setLoadingSubmit(false);
    }
  };
// AJOUTER après les autres fonctions utilitaires vers la ligne 1100
const debugFormState = () => {
  console.group('DEBUG FORMULAIRE');
  console.log('selectedAssistance:', selectedAssistance);
  console.log('formData:', formData);
  console.log('referenceData lengths:', {
    beneficiaires: referenceData.beneficiaires.length,
    types_assistance: referenceData.types_assistance.length
  });
  console.log('Modal states:', { openFormModal, loadingSubmit, formErrors });
  console.groupEnd();
};
  // ===== AUTRES FONCTIONS =====
  
  const handleConfirmerRetour = async () => {
    if (!selectedAssistanceRetour) return;

    setLoadingRetour(true);
    
    try {
      const retourPayload = {
        retour_effectue: true,
        observations: `${selectedAssistanceRetour.observations || ''}\n[RETOUR ${retourData.date_retour}] État: ${retourData.etat_materiel}. ${retourData.observation}`.trim(),
        commentaire_interne: `${selectedAssistanceRetour.commentaire_interne || ''}\n[RETOUR CONFIRMÉ] Date: ${retourData.date_retour}, État: ${retourData.etat_materiel}`.trim()
      };

      const response = await axiosClient.put(`/upas/assistances/${selectedAssistanceRetour.id}`, retourPayload);
      
      if (response.data && response.data.success !== false) {
        showNotification('Retour confirmé avec succès', 'success');
        handleCloseRetourDialog();
        await loadAssistances(true);
      } else {
        throw new Error(response.data?.message || 'Erreur lors de la confirmation du retour');
      }
        
    } catch (error) {
      console.error('Erreur confirmation retour:', error);
      showNotification('Erreur lors de la confirmation du retour: ' + error.message, 'error');
    } finally {
      setLoadingRetour(false);
    }
  };

  const handleDeleteAssistance = async () => {
    if (!assistanceToDelete) return;

    try {
      const response = await axiosClient.delete(`/upas/assistances/${assistanceToDelete.id}`);
      
      if (response.data && response.data.success !== false) {
        showNotification('Assistance supprimée avec succès', 'success');
        setOpenConfirmDelete(false);
        setAssistanceToDelete(null);
        await loadAssistances(true);
      } else {
        throw new Error(response.data?.message || 'Erreur lors de la suppression');
      }
      
    } catch (error) {
      console.error('Erreur suppression:', error);
      showNotification(`Erreur lors de la suppression: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  // GESTION RETOUR
  const handleOpenRetourDialog = (assistance) => {
    setSelectedAssistanceRetour(assistance);
    setRetourData({
      date_retour: new Date().toISOString().split('T')[0],
      observation: '',
      etat_materiel: 'bon',
      observation_retour: '',
      etat_retour: 'bon'
    });
    setOpenRetourDialog(true);
  };

  const handleCloseRetourDialog = () => {
    setSelectedAssistanceRetour(null);
    setRetourData({
      date_retour: new Date().toISOString().split('T')[0],
      observation: '',
      etat_materiel: 'bon',
      observation_retour: '',
      etat_retour: 'bon'
    });
    setOpenRetourDialog(false);
  };

  const renderRetourButton = (assistance) => {
    if (!isAssistancePret(assistance) || assistance.retour_effectue || assistance.date_retour) {
      return null;
    }

    const statut = getStatutPret(assistance);
    
    return (
      <Tooltip title="Marquer comme retourné">
        <IconButton
          size="small"
          onClick={() => handleOpenRetourDialog(assistance)}
          sx={{
            bgcolor: statut === 'en_retard' ? 'error.light' : 'warning.light',
            color: statut === 'en_retard' ? 'error.dark' : 'warning.dark',
            '&:hover': {
              bgcolor: statut === 'en_retard' ? 'error.main' : 'warning.main',
              color: 'white'
            }
          }}
        >
          <Undo />
        </IconButton>
      </Tooltip>
    );
  };

  // GESTION ACCUSÉ DE RÉCEPTION
  const handleOpenAccuseDialog = (assistance) => {
    setSelectedAssistanceAccuse(assistance);
    setOpenAccuseDialog(true);
  };

  const handleCloseAccuseDialog = () => {
    setSelectedAssistanceAccuse(null);
    setOpenAccuseDialog(false);
  };

  const handlePrintAccuseReception = () => {
    if (!selectedAssistanceAccuse) return;

    const assistance = selectedAssistanceAccuse;
    
    const assistanceProfit = assistance.moi_meme 
      ? "cette assistance au profit de moi-même" 
      : "cette assistance au profit d'une tierce personne";
    
    const accuseContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Accusé de Réception</title>
        <style>
          @page { size: A4; margin: 2cm; }
          body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; }
          .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
          .title { text-align: center; font-size: 24px; font-weight: bold; margin: 40px 0; }
          .content { margin: 30px 0; line-height: 2; }
          .field { margin: 15px 0; }
          .signature { margin-top: 60px; text-align: right; }
          .profit-text { font-style: italic; color: #333; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ROYAUME DU MAROC</h1>
          <h2>Ministère de la Santé et de la Protection Sociale</h2>
          <h3>Délégation de Sefrou</h3>
          <p>UNITE D'ASSISTANCE SOCIALE</p>
        </div>
        <div class="title">Accusé de réception</div>
        <div class="content">
          <div class="field">
            <strong>Je soussigné :</strong> ${formatBeneficiaireName(assistance)}
          </div>
          <div class="field">
            <strong>Certifie avoir reçu ce jour :</strong> ${formatTypeAssistance(assistance)}
          </div>
          <div class="field">
            <strong>Nature :</strong> ${formatNatureDon(assistance)}
          </div>
          <div class="field">
            <strong>Date :</strong> ${formatDateSafe(assistance.date_assistance)}
          </div>
          <div class="field profit-text">
            <strong>Cette assistance concerne :</strong> ${assistanceProfit}
          </div>
          ${isAssistancePret(assistance) ? `
          <div class="field">
            <strong>Type :</strong> Prêt temporaire
          </div>
          <div class="field">
            <strong>Durée prévue :</strong> ${assistance.duree_utilisation || 'Non spécifiée'} jours
          </div>
          <div class="field">
            <strong>Date de retour prévue :</strong> ${formatDateSafe(assistance.date_retour_prevue || assistance.date_fin_prevue)}
          </div>
          ` : ''}
        </div>
        <div class="signature">
          <p><strong>Séfrou, le</strong> ${formatDateSafe(new Date())}</p>
          <br><br>
          <p><strong>Signature du bénéficiaire</strong></p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(accuseContent);
    printWindow.document.close();
    
    printWindow.onload = function() {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = function() {
        printWindow.close();
      };
    };

    handleCloseAccuseDialog();
    showNotification('Accusé de réception envoyé vers l\'imprimante', 'success');
  };

  // ===== FONCTION DE BOOT PRINCIPALE =====
  const performBoot = useCallback(async () => {
    if (bootCompleted.current || isCurrentlyLoading.current) {
      return;
    }

    isCurrentlyLoading.current = true;
    setAppState('boot');
    setBootError(null);

    try {
      console.log('🚀 Démarrage du boot...');
      
      const refData = await loadReferenceData();
      setReferenceData(refData);
      
      await loadAssistances(true);

      bootCompleted.current = true;
      setAppState('ready');
      
      console.log('✅ Boot terminé avec succès');
      
    } catch (error) {
      console.error('❌ Erreur durant le boot:', error);
      setBootError(error.message || 'Erreur lors du chargement initial');
      setAppState('error');
    } finally {
      isCurrentlyLoading.current = false;
    }
  }, []);

  // ===== FONCTIONS DE RECHARGEMENT MANUEL =====
  const handleManualRefresh = useCallback(async () => {
    console.log('🔄 Actualisation manuelle...');
    
    setIsRefreshing(true);
    try {
      await loadAssistances(true);
      showNotification('Données actualisées avec succès', 'success');
    } catch (error) {
      console.error('Erreur actualisation:', error);
      showNotification('Erreur lors de l\'actualisation: ' + error.message, 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAssistances]);

  const handlePageChange = useCallback(async (event, newPage) => {
    if (isCurrentlyLoading.current) return;

    isCurrentlyLoading.current = true;
    setIsRefreshing(true);

    try {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      await loadAssistances(true);
    } catch (error) {
      console.error('Erreur changement page:', error);
      showNotification('Erreur lors du changement de page: ' + error.message, 'error');
    } finally {
      setIsRefreshing(false);
      isCurrentlyLoading.current = false;
    }
  }, [loadAssistances]);

  // FONCTIONS UTILITAIRES
 

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const retryBoot = () => {
    bootCompleted.current = false;
    performBoot();
  };
const TypeAssistanceSelect = () => (
  <FormControl fullWidth error={Boolean(formErrors.type_assistance_id)} required>
    <InputLabel>Type d'assistance</InputLabel>
    <Select
      value={formData.type_assistance_id || ''}
      label="Type d'assistance"
      onChange={(e) => {
        console.log('🎯 Type assistance sélectionné:', e.target.value);
        handleInputChange('type_assistance_id', e.target.value);
      }}
    >
      {referenceData.types_assistance.map(type => (
        <MenuItem key={type.id} value={String(type.id)}>
          {type.libelle}
        </MenuItem>
      ))}
    </Select>
    {formErrors.type_assistance_id && (
      <Typography variant="caption" color="error">
        {formErrors.type_assistance_id}
      </Typography>
    )}
  </FormControl>
);

// Autocomplete Bénéficiaire optimisé
const BeneficiaireAutocomplete = () => {
  // Calculer la valeur sélectionnée de manière robuste
  const selectedBeneficiaire = useMemo(() => {
    if (!formData.beneficiaire_id || !referenceData.beneficiaires.length) {
      return null;
    }
    
    const found = referenceData.beneficiaires.find(
      b => String(b.id) === String(formData.beneficiaire_id)
    );
    
    console.log('🔍 Bénéficiaire recherché:', formData.beneficiaire_id, 'trouvé:', found);
    return found || null;
  }, [formData.beneficiaire_id, referenceData.beneficiaires]);

  return (
    <Autocomplete
      options={referenceData.beneficiaires}
      getOptionLabel={(option) => {
        if (!option) return '';
        return `${option.prenom || ''} ${option.nom || ''}`.trim() + 
               (option.telephone ? ` - ${option.telephone}` : '');
      }}
      value={selectedBeneficiaire}
      onChange={(event, newValue) => {
        console.log('🎯 Bénéficiaire sélectionné via Autocomplete:', newValue);
        const newId = newValue ? String(newValue.id) : '';
        handleInputChange('beneficiaire_id', newId);
      }}
      isOptionEqualToValue={(option, value) => {
        if (!option || !value) return false;
        return String(option.id) === String(value.id);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Bénéficiaire"
          required
          error={Boolean(formErrors.beneficiaire_id)}
          helperText={formErrors.beneficiaire_id}
        />
      )}
      // Options pour améliorer les performances
      filterOptions={(options, params) => {
        const { inputValue } = params;
        if (!inputValue) return options;
        
        return options.filter(option => {
          const fullName = `${option.prenom || ''} ${option.nom || ''}`.toLowerCase();
          const telephone = (option.telephone || '').toLowerCase();
          const search = inputValue.toLowerCase();
          
          return fullName.includes(search) || telephone.includes(search);
        });
      }}
    />
  );
};

// DatePicker avec gestion d'erreur
const AssistanceDatePicker = () => (
  <DatePicker
    label="Date d'assistance"
    value={formData.date_assistance}
    onChange={(newValue) => {
      console.log('📅 Date sélectionnée:', newValue);
      handleInputChange('date_assistance', newValue);
    }}
    renderInput={(params) => (
      <TextField
        {...params}
        fullWidth
        required
        error={Boolean(formErrors.date_assistance)}
        helperText={formErrors.date_assistance}
        onError={(error) => {
          console.warn('❌ Erreur DatePicker:', error);
        }}
      />
    )}
    // Paramètres pour améliorer la compatibilité
    inputFormat="dd/MM/yyyy"
    mask="__/__/____"
  />
);

const DebugButton = () => (
  process.env.NODE_ENV === 'development' && (
    <Button onClick={debugFormState} variant="outlined" size="small">
      Debug Form
    </Button>
  )
);

// 6. VÉRIFICATION DES DONNÉES DE L'API
const validateApiData = (assistance) => {
  const issues = [];
  
  if (!assistance.beneficiaire_id) issues.push('beneficiaire_id manquant');
  if (!assistance.type_assistance_id) issues.push('type_assistance_id manquant');
  if (!assistance.nature_done_id) issues.push('nature_done_id manquant');
  
  // Vérifier la cohérence des IDs avec les données de référence
  if (assistance.beneficiaire_id) {
    const beneficiaireExists = referenceData.beneficiaires.some(
      b => b.id == assistance.beneficiaire_id
    );
    if (!beneficiaireExists) issues.push('Bénéficiaire inexistant dans les données de référence');
  }
  
  if (issues.length > 0) {
    console.warn('⚠️ Problèmes détectés dans les données API:', issues);
  }
  
  return issues.length === 0;
};
  // ===== EFFECT HOOKS =====
  
  // Effect principal - boot unique
  useEffect(() => {
    if (!bootCompleted.current) {
      performBoot();
    }
  }, [performBoot]);

  // Effect pour la gestion de la durée et prêts UNIQUEMENT basé sur nature_done_id
  useEffect(() => {
    const selectedNature = referenceData.nature_dones.find(
      nature => nature.id == formData.nature_done_id
    );
    
    if (selectedNature) {
      setSelectedNatureDon(selectedNature);
      
      const libelleNature = selectedNature.libelle?.toLowerCase() || '';
      
      const shouldShowDuree = 
        selectedNature.is_loan ||
        libelleNature.includes('prêt') || 
        libelleNature.includes('pret') ||
        libelleNature.includes('durée') ||
        libelleNature.includes('duree') ||
        libelleNature.includes('temporaire') ||
        libelleNature.includes('retour') ||
        (selectedNature.duree && selectedNature.duree > 0);
      
      setShowDureeFields(shouldShowDuree);
      
      setFormData(prev => ({
        ...prev,
        est_pret: shouldShowDuree,
        duree_utilisation: shouldShowDuree ? (selectedNature.duree || prev.duree_utilisation) : '',
        retour_effectue: false,
        ...(shouldShowDuree ? {} : {
          date_retour_prevue: null
        })
      }));
      
    } else {
      setSelectedNatureDon(null);
      setShowDureeFields(false);
      setFormData(prev => ({
        ...prev,
        est_pret: false,
        duree_utilisation: '',
        date_retour_prevue: null,
        retour_effectue: false
      }));
    }
  }, [formData.nature_done_id, referenceData.nature_dones]);

  // Effect pour charger les détails du type d'assistance
  useEffect(() => {
    if (formData.type_assistance_id) {
      loadDetailsTypeAssistance(formData.type_assistance_id);
    } else {
      setReferenceData(prev => ({ ...prev, details_type_assistance: [] }));
      setFormData(prev => ({ ...prev, details_type_assistance_id: '' }));
    }
  }, [formData.type_assistance_id]);

  // Effect pour calcul automatique de la date de retour basé sur la durée
  useEffect(() => {
    if (formData.duree_utilisation && formData.date_assistance && showDureeFields) {
      const dureeJours = parseInt(formData.duree_utilisation);
      if (!isNaN(dureeJours) && dureeJours > 0) {
        const dateRetour = addDays(new Date(formData.date_assistance), dureeJours);
        setFormData(prev => ({
          ...prev,
          date_retour_prevue: dateRetour
        }));
      }
    }
  }, [formData.duree_utilisation, formData.date_assistance, showDureeFields]);

  // ===== EFFECT CRUCIAL POUR LE PRÉ-REMPLISSAGE DU FORMULAIRE =====
  useEffect(() => {
  // Réinitialiser le formulaire quand on ferme le modal
  if (!openFormModal) {
    setFormData(getInitialFormData());
    setShowDureeFields(false);
    setSelectedAssistance(null);
    setFormErrors({});
  }
}, [openFormModal]);
const BeneficiaireAutocompleteDebug = () => {
  const selectedBeneficiaire = useMemo(() => {
    if (!formData.beneficiaire_id) {
      console.log('Pas de beneficiaire_id dans formData');
      return null;
    }
    
    if (referenceData.beneficiaires.length === 0) {
      console.log('Aucun bénéficiaire dans referenceData');
      return null;
    }
    
    const found = referenceData.beneficiaires.find(b => 
      String(b.id) === String(formData.beneficiaire_id)
    );
    
    console.log('Recherche bénéficiaire:', {
      recherche: formData.beneficiaire_id,
      trouve: found?.id,
      nom: found ? `${found.prenom} ${found.nom}` : 'Non trouvé',
      totalDisponible: referenceData.beneficiaires.length
    });
    
    return found || null;
  }, [formData.beneficiaire_id, referenceData.beneficiaires]);
  
  return (
    // REMPLACER l'Autocomplete bénéficiaire vers la ligne 1600
<Grid item xs={12} md={6}>
  <Autocomplete
    options={referenceData.beneficiaires}
    getOptionLabel={(option) => `${option.prenom || ''} ${option.nom || ''} - ${option.telephone || ''}`}
    value={
      formData.beneficiaire_id ? 
      referenceData.beneficiaires.find(b => String(b.id) === String(formData.beneficiaire_id)) || null : 
      null
    }
    onChange={(event, newValue) => {
      console.log('Bénéficiaire sélectionné:', newValue);
      handleInputChange('beneficiaire_id', newValue ? String(newValue.id) : '');
    }}
    isOptionEqualToValue={(option, value) => option && value && String(option.id) === String(value.id)}
    renderInput={(params) => (
      <TextField
        {...params}
        label="Bénéficiaire"
        required
        error={Boolean(formErrors.beneficiaire_id)}
        helperText={formErrors.beneficiaire_id}
      />
    )}
    key={`beneficiaire-${formData.beneficiaire_id}-${referenceData.beneficiaires.length}`}
  />
</Grid>
  );
};

// 6. FONCTION DE RESET COMPLETE
const resetFormCompletely = useCallback(() => {
  console.log('Reset complet du formulaire');
  setFormData(getInitialFormData());
  setSelectedAssistance(null);
  setShowDureeFields(false);
  setFormErrors({});
  setOpenFormModal(false);
}, []);

// 7. GESTION D'ERREUR POUR LE CHARGEMENT
const handleEditWithErrorHandling = useCallback(async (assistance) => {
  try {
    await handleEditAssistance(assistance);
  } catch (error) {
    console.error('Erreur critique lors de l\'édition:', error);
    resetFormCompletely();
    showNotification('Erreur: impossible d\'ouvrir le formulaire', 'error');
  }
}, [handleEditAssistance, resetFormCompletely, showNotification]);

  // ===== EFFECT PRINCIPAL (UN SEUL) =====
  useEffect(() => {
    if (!bootCompleted.current) {
      performBoot();
    }
  }, []); // Dépendances vides = boot unique

   // ===== RENDU CONDITIONNEL SELON L'ÉTAT =====
  if (appState === 'boot') {
    return (
      <Box sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'background.default',
        zIndex: 9999
      }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6" gutterBottom>
          Chargement des données...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Veuillez patienter pendant l'initialisation
        </Typography>
      </Box>
    );
  }

  if (appState === 'error') {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Erreur de chargement
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {bootError || 'Une erreur est survenue lors du chargement des données.'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshOutlined />}
              onClick={retryBoot}
              sx={{ mt: 2 }}
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // ===== RENDU PRINCIPAL (ÉTAT READY) =====
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Container maxWidth={false} sx={{ py: 3 }}>
        {/* Backdrop de loading pour les refresh manuels */}
        <Backdrop open={isRefreshing} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <CircularProgress color="inherit" />
        </Backdrop>

        {/* En-tête */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Gestion des Assistances
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setSelectedAssistance(null);
                  setOpenFormModal(true);
                }}
                sx={{ minWidth: 180 }}
              >
                Nouvelle Assistance
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                color="primary"
              >
                Actualiser
              </Button>
            </Box>
          </Box>

          {/* Statistiques */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Assistances
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                    {stats.prets_actifs}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Prêts Actifs
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                    {stats.prets_en_retard}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Prêts en Retard
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                    {stats.montant_total.toLocaleString('fr-FR')} DH
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Montant Total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Tableau principal */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {assistances.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Aucune assistance trouvée
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Essayez de modifier les filtres ou créez une nouvelle assistance
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>Bénéficiaire</TableCell>
                        <TableCell>Téléphone</TableCell>
                        <TableCell>Type Assistance</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Durée</TableCell>
                        <TableCell align="right">Montant</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assistances.map((assistance) => (
                        <TableRow
                          key={assistance.id}
                          hover
                          sx={{
                            '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                            '&:hover': { bgcolor: 'primary.50' }
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                {formatBeneficiaireName(assistance).charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {formatBeneficiaireName(assistance) || 'Bénéficiaire non défini'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {assistance.id}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2">
                              {assistance.telephone || '-'}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2">
                              {formatTypeAssistance(assistance)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2">
                              {formatDateSafe(assistance.date_assistance)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2">
                              {assistance.duree_utilisation ? `${assistance.duree_utilisation} jours` : '-'}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatMontant(assistance) || '-'}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            {renderStatutPretBadge(assistance)}
                          </TableCell>
                          
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Tooltip title="Voir détails">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedAssistanceView(assistance);
                                    setOpenViewDialog(true);
                                  }}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              
                              
                              
                              <Tooltip title="Accusé de réception">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenAccuseDialog(assistance)}
                                  color="secondary"
                                >
                                  <Receipt />
                                </IconButton>
                              </Tooltip>
                              
                              {renderRetourButton(assistance)}
                              
                              <Tooltip title="Supprimer">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setAssistanceToDelete(assistance);
                                    setOpenConfirmDelete(true);
                                  }}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary">
                    Affichage de {((pagination.currentPage - 1) * pagination.perPage) + 1} à{' '}
                    {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} sur{' '}
                    {pagination.total} assistances
                  </Typography>
                  
                  <Pagination
                    count={pagination.lastPage}
                    page={pagination.currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                    disabled={isRefreshing}
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal Formulaire d'Assistance */}
        <Dialog 
          open={openFormModal} 
          onClose={handleCloseFormModal} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: { maxHeight: '90vh' }
          }}
        >
          <DialogTitle>
            {selectedAssistance ? 'Modifier l\'assistance' : 'Nouvelle assistance'}
            {/* DEBUG INFO - À supprimer en production */}
            {process.env.NODE_ENV === 'development' && (
              <Typography variant="caption" color="text.secondary" display="block">
                Debug: selectedAssistance={selectedAssistance?.id}, formData.beneficiaire_id={formData.beneficiaire_id}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handleSubmitForm} sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* Type d'assistance */}
                <Grid item xs={12} md={6}>
  <FormControl 
    fullWidth 
    error={Boolean(formErrors.type_assistance_id)}
    required
  >
    <InputLabel>Type d'assistance</InputLabel>
    <Select
      value={formData.type_assistance_id || ''}
      label="Type d'assistance"
      onChange={(e) => handleInputChange('type_assistance_id', e.target.value)}
    >
      {referenceData.types_assistance.map(type => (
        <MenuItem key={type.id} value={String(type.id)}>
          {type.libelle}
        </MenuItem>
      ))}
    </Select>
    {formErrors.type_assistance_id && (
      <Typography variant="caption" color="error">
        {formErrors.type_assistance_id}
      </Typography>
    )}
  </FormControl>
</Grid>

                {/* Détails type assistance */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Détails assistance</InputLabel>
                    <Select
                      value={formData.details_type_assistance_id}
                      label="Détails assistance"
                      onChange={(e) => handleInputChange('details_type_assistance_id', e.target.value)}
                      disabled={loadingDetailsType || !formData.type_assistance_id}
                    >
                      <MenuItem value="">Aucun détail spécifique</MenuItem>
                      {referenceData.details_type_assistance.map(detail => (
                        <MenuItem key={detail.id} value={detail.id}>
                          {detail.libelle}
                        </MenuItem>
                      ))}
                    </Select>
                    {loadingDetailsType && (
                      <LinearProgress sx={{ mt: 1 }} />
                    )}
                  </FormControl>
                </Grid>

                {/* Bénéficiaire - AUTOCOMPLETE CORRIGÉ */}
                <Grid item xs={12} md={6}>
  <Autocomplete
    options={referenceData.beneficiaires.sort((a, b) => {
      const nameA = `${a.prenom || ''} ${a.nom || ''}`.trim().toLowerCase();
      const nameB = `${b.prenom || ''} ${b.nom || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
    })}
    getOptionLabel={(option) => `${option.prenom || ''} ${option.nom || ''} - ${option.telephone || ''}`}
    value={
      formData.beneficiaire_id ? 
      referenceData.beneficiaires.find(b => String(b.id) === String(formData.beneficiaire_id)) || null : 
      null
    }
    onChange={(event, newValue) => {
      console.log('🎯 Bénéficiaire sélectionné:', newValue);
      handleInputChange('beneficiaire_id', newValue ? String(newValue.id) : '');
    }}
    isOptionEqualToValue={(option, value) => option && value && String(option.id) === String(value.id)}
    renderInput={(params) => (
      <TextField
        {...params}
        label="Bénéficiaire"
        required
        error={Boolean(formErrors.beneficiaire_id)}
        helperText={formErrors.beneficiaire_id}
      />
    )}
  />
</Grid>

                {/* Nature du don */}
                <Grid item xs={12} md={6}>
  <FormControl 
    fullWidth 
    error={Boolean(formErrors.nature_done_id)}
    required
  >
    <InputLabel>Nature du don</InputLabel>
    <Select
      value={formData.nature_done_id || ''}
      label="Nature du don"
      onChange={(e) => handleInputChange('nature_done_id', e.target.value)}
    >
      {referenceData.nature_dones.map(nature => (
        <MenuItem key={nature.id} value={String(nature.id)}>
          {nature.libelle}
          {nature.is_loan && (
            <Chip 
              label="Prêt" 
              size="small" 
              color="warning" 
              sx={{ ml: 1 }} 
            />
          )}
        </MenuItem>
      ))}
    </Select>
    {formErrors.nature_done_id && (
      <Typography variant="caption" color="error">
        {formErrors.nature_done_id}
      </Typography>
    )}
  </FormControl>
</Grid>

                {/* État du don */}
                <Grid item xs={12} md={6}>
  <FormControl 
    fullWidth 
    error={Boolean(formErrors.etat_don_id)}
    required
  >
    <InputLabel>État du don</InputLabel>
    <Select
      value={formData.etat_don_id || ''}
      label="État du don"
      onChange={(e) => handleInputChange('etat_don_id', e.target.value)}
    >
      {referenceData.etat_dones.map(etat => (
        <MenuItem key={etat.id} value={String(etat.id)}>
          {etat.libelle}
        </MenuItem>
      ))}
    </Select>
    {formErrors.etat_don_id && (
      <Typography variant="caption" color="error">
        {formErrors.etat_don_id}
      </Typography>
    )}
  </FormControl>
</Grid>

                {/* Situation */}
                <Grid item xs={12} md={6}>
  <FormControl fullWidth>
    <InputLabel>État dossier</InputLabel>
    <Select
      value={formData.situation_id || ''}
      label="Situation"
      onChange={(e) => handleInputChange('situation_id', e.target.value)}
    >
      <MenuItem value="">Aucune situation spécifiée</MenuItem>
      {referenceData.situations.map(situation => (
        <MenuItem key={situation.id} value={String(situation.id)}>
          {situation.libelle}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Grid>

                {/* Date d'assistance */}
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Date d'assistance"
                    value={formData.date_assistance}
                    onChange={(newValue) => handleInputChange('date_assistance', newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        required
                        error={Boolean(formErrors.date_assistance)}
                        helperText={formErrors.date_assistance}
                      />
                    )}
                  />
                </Grid>

                {/* Montant */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Montant (DH)"
                    type="number"
                    value={formData.montant}
                    onChange={(e) => handleInputChange('montant', e.target.value)}
                    error={Boolean(formErrors.montant)}
                    helperText={formErrors.montant}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          DH
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Champs spécifiques aux prêts */}
                {showDureeFields && (
                  <>
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          Cette assistance est considérée comme un prêt. Veuillez spécifier la durée et la date de retour.
                        </Typography>
                      </Alert>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Durée d'utilisation (jours)"
                        type="number"
                        value={formData.duree_utilisation}
                        onChange={(e) => handleInputChange('duree_utilisation', e.target.value)}
                        error={Boolean(formErrors.duree_utilisation)}
                        helperText={formErrors.duree_utilisation}
                        required={showDureeFields}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <DatePicker
                        label="Date de retour prévue"
                        value={formData.date_retour_prevue}
                        onChange={(newValue) => handleInputChange('date_retour_prevue', newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            required={showDureeFields}
                            error={Boolean(formErrors.date_retour_prevue)}
                            helperText={formErrors.date_retour_prevue}
                          />
                        )}
                      />
                    </Grid>
                  </>
                )}

                {/* Case à cocher Moi-même */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.moi_meme}
                        onChange={(e) => handleInputChange('moi_meme', e.target.checked)}
                      />
                    }
                    label="OUI, Cette assistance au profit de moi-même"
                  />
                </Grid>

                {/* Observations */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observations"
                    multiline
                    rows={3}
                    value={formData.observations}
                    onChange={(e) => handleInputChange('observations', e.target.value)}
                    placeholder="Observations sur l'assistance..."
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseFormModal}>Annuler</Button>
            <Button 
              variant="contained" 
              onClick={handleSubmitForm}
              disabled={loadingSubmit}
              startIcon={loadingSubmit ? <CircularProgress size={20} /> : <Save />}
            >
              {loadingSubmit ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Confirmation Suppression */}
        <Dialog open={openConfirmDelete} onClose={() => setOpenConfirmDelete(false)}>
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogContent>
            <Typography>
              Êtes-vous sûr de vouloir supprimer cette assistance ? Cette action est irréversible.
            </Typography>
            {assistanceToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Bénéficiaire:</strong> {formatBeneficiaireName(assistanceToDelete)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Type:</strong> {formatTypeAssistance(assistanceToDelete)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Date:</strong> {formatDateSafe(assistanceToDelete.date_assistance)}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenConfirmDelete(false)}>Annuler</Button>
            <Button 
              color="error" 
              variant="contained"
              onClick={handleDeleteAssistance}
              startIcon={<Delete />}
            >
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Accusé de Réception */}
        <Dialog open={openAccuseDialog} onClose={handleCloseAccuseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Accusé de réception</DialogTitle>
          <DialogContent>
            {selectedAssistanceAccuse && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Génération de l'accusé de réception pour :
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Bénéficiaire:</strong> {formatBeneficiaireName(selectedAssistanceAccuse)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Type d'assistance:</strong> {formatTypeAssistance(selectedAssistanceAccuse)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nature:</strong> {formatNatureDon(selectedAssistanceAccuse)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Date:</strong> {formatDateSafe(selectedAssistanceAccuse.date_assistance)}
                  </Typography>
                  {isAssistancePret(selectedAssistanceAccuse) && (
                    <>
                      <Typography variant="body2">
                        <strong>Durée:</strong> {selectedAssistanceAccuse.duree_utilisation || 'Non spécifiée'} jours
                      </Typography>
                      <Typography variant="body2">
                        <strong>Date retour prévue:</strong> {formatDateSafe(selectedAssistanceAccuse.date_retour_prevue)}
                      </Typography>
                    </>
                  )}
                </Box>
                <Alert severity="info">
                  L'accusé de réception sera imprimé avec les informations officielles de la délégation.
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAccuseDialog}>Annuler</Button>
            <Button
              variant="contained"
              startIcon={<Print />}
              onClick={handlePrintAccuseReception}
            >
              Imprimer l'accusé
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Marquer comme Retourné */}
        <Dialog open={openRetourDialog} onClose={handleCloseRetourDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Confirmer le retour</DialogTitle>
          <DialogContent>
            {selectedAssistanceRetour && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Confirmer le retour du prêt pour :
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Bénéficiaire:</strong> {formatBeneficiaireName(selectedAssistanceRetour)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Assistance:</strong> {formatTypeAssistance(selectedAssistanceRetour)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nature:</strong> {formatNatureDon(selectedAssistanceRetour)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Date retour prévue:</strong> {formatDateSafe(selectedAssistanceRetour.date_retour_prevue)}
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Date de retour"
                      type="date"
                      value={retourData.date_retour}
                      onChange={(e) => setRetourData(prev => ({ ...prev, date_retour: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Observation sur le retour"
                      multiline
                      rows={3}
                      value={retourData.observation}
                      onChange={(e) => setRetourData(prev => ({ ...prev, observation: e.target.value }))}
                      placeholder="Commentaires sur l'état du matériel ou les conditions de retour..."
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseRetourDialog}>Annuler</Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleConfirmerRetour}
              disabled={loadingRetour}
              startIcon={loadingRetour ? <CircularProgress size={20} /> : <Check />}
            >
              {loadingRetour ? 'Confirmation...' : 'Confirmer le retour'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Détails */}
        <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Détails de l'assistance</DialogTitle>
          <DialogContent>
            {selectedAssistanceView && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6">
                    {formatBeneficiaireName(selectedAssistanceView)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatTypeAssistance(selectedAssistanceView)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Date:</strong> {formatDateSafe(selectedAssistanceView.date_assistance)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Montant:</strong> {formatMontant(selectedAssistanceView) || 'Non spécifié'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Nature:</strong> {formatNatureDon(selectedAssistanceView)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Priorité:</strong> {selectedAssistanceView.priorite || 'Normale'}
                  </Typography>
                </Grid>
                {isAssistancePret(selectedAssistanceView) && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Date retour prévue:</strong> {formatDateSafe(selectedAssistanceView.date_retour_prevue)}
                      </Typography>
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <Typography variant="body2">
                    <strong>Observations:</strong> {selectedAssistanceView.observations || 'Aucune'}
                  </Typography>
                </Grid>
                {selectedAssistanceView.commentaire_interne && (
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Commentaire interne:</strong> {selectedAssistanceView.commentaire_interne}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenViewDialog(false)}>Fermer</Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar notifications */}
        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
};

export default AssistancesPage;