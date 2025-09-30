// pages/KafalaPage.jsx - VERSION ARABE STYLE MÉDICAL PROFESSIONNEL
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  Skeleton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Container,
  FormHelperText,
  Divider,
  Stack,
} from '@mui/material';
import {
  PictureAsPdf,
  CloudUpload,
  Download,
  Visibility,
  Edit,
  Delete,
  Refresh,
  Search,
  Add,
  Close,
  ErrorOutline,
  Info,
  Save,
  ClearAll,
  LocalHospital,
  Groups,
  Person,
  Badge,
  ContactPhone,
  Home,
  CalendarToday,
  ChildCare,
} from '@mui/icons-material';

import kafalaService from '../../services/kafalaService';

// Thème médical personnalisé
const medicalTheme = {
  colors: {
    primary: '#1976d2', // Bleu médical
    secondary: '#f50057', // Rose médical
    success: '#2e7d32', // Vert médical
    warning: '#ed6c02', // Orange médical
    error: '#d32f2f', // Rouge médical
    info: '#0288d1', // Cyan médical
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    }
  }
};

const KafalaPage = () => {
  // États principaux
  const [kafalas, setKafalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // États pour la pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  // États pour les filtres
  const [filters, setFilters] = useState({
    search: '',
    sexe_enfant: '',
    date_mariage_from: '',
    date_mariage_to: '',
    avec_pdf: '',
    sort_by: 'created_at',
    sort_dir: 'desc'
  });

  // États pour les statistiques
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // États pour les notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // États pour les dialogs
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    kafala: null
  });

  // État pour le modal kafala
  const [kafalaModal, setKafalaModal] = useState({
    open: false,
    mode: 'create',
    kafala: null,
    loading: false
  });

  // États pour le formulaire kafala
  const initialFormState = useMemo(() => ({
    reference: '',
    nom_pere: '',
    prenom_pere: '',
    cin_pere: '',
    nom_mere: '',
    prenom_mere: '',
    cin_mere: '',
    telephone: '',
    email: '',
    adresse: '',
    date_mariage: '',
    nom_enfant: '',
    prenom_enfant: '',
    sexe_enfant: '',
    date_naissance_enfant: '',
    cin_enfant: '',
    commentaires: ''
  }), []);

  const [kafalaForm, setKafalaForm] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [formWarnings, setFormWarnings] = useState([]);

  // États pour l'upload PDF
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploadProgress, setPdfUploadProgress] = useState(0);
  const [pdfUploading, setPdfUploading] = useState(false);

  // État pour le chargement des PDF
  const [pdfLoading, setPdfLoading] = useState({});

  // Refs pour le focus
  const firstInputRef = useRef(null);

  // Fonction utilitaire pour mettre à jour le modal
  const updateKafalaModal = useCallback((updates) => {
    setKafalaModal(prev => ({ ...prev, ...updates }));
  }, []);

  // Charger les kafalas
  const loadKafalas = useCallback(async (currentPage = page, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const params = kafalaService.buildFilterParams({
        ...filters,
        page: currentPage + 1,
        per_page: rowsPerPage
      });

      const response = await kafalaService.getKafalas(params);

      if (response.success) {
        const formattedKafalas = response.data.map(kafala => 
          kafalaService.formatKafalaForDisplay(kafala)
        );
        
        setKafalas(formattedKafalas);
        setTotalCount(response.meta.total);
        setError(null);
      } else {
        setError(response.message || 'خطأ في التحميل');
        showSnackbar(response.message || 'خطأ في التحميل', 'error');
      }
    } catch (error) {
      const errorMessage = 'خطأ في الاتصال بالخادم';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
      console.error('خطأ تحميل الكفالات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, page, rowsPerPage]);

  // Charger les statistiques
  const loadStatistics = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await kafalaService.getStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('خطأ تحميل الإحصائيات:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Effet initial
  useEffect(() => {
    loadKafalas();
    loadStatistics();
  }, []);

  // Effet pour les filtres avec debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(0);
      loadKafalas(0);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // Focus automatique quand le modal s'ouvre
  useEffect(() => {
    if (kafalaModal.open && kafalaModal.mode !== 'view' && firstInputRef.current) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [kafalaModal.open, kafalaModal.mode]);

  // Gestionnaire de notification
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // Gestionnaires des filtres
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      search: '',
      sexe_enfant: '',
      date_mariage_from: '',
      date_mariage_to: '',
      avec_pdf: '',
      sort_by: 'created_at',
      sort_dir: 'desc'
    });
  }, []);

  // Gestionnaires de pagination
  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
    loadKafalas(newPage);
  }, [loadKafalas]);

  const handleChangeRowsPerPage = useCallback((event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  // Réinitialiser le formulaire
  const resetForm = useCallback(() => {
    setKafalaForm(initialFormState);
    setFormErrors({});
    setFormWarnings([]);
    setPdfFile(null);
    setPdfUploadProgress(0);
    setPdfUploading(false);
  }, [initialFormState]);

  // Charger les données dans le formulaire
  const loadFormData = useCallback((kafala) => {
    setKafalaForm({
      reference: kafala?.reference || '',
      nom_pere: kafala?.nom_pere || '',
      prenom_pere: kafala?.prenom_pere || '',
      cin_pere: kafala?.cin_pere || '',
      nom_mere: kafala?.nom_mere || '',
      prenom_mere: kafala?.prenom_mere || '',
      cin_mere: kafala?.cin_mere || '',
      telephone: kafala?.telephone || '',
      email: kafala?.email || '',
      adresse: kafala?.adresse || '',
      date_mariage: kafala?.date_mariage || '',
      nom_enfant: kafala?.nom_enfant || '',
      prenom_enfant: kafala?.prenom_enfant || '',
      sexe_enfant: kafala?.sexe_enfant || '',
      date_naissance_enfant: kafala?.date_naissance_enfant || '',
      cin_enfant: kafala?.cin_enfant || '',
      commentaires: kafala?.commentaires || ''
    });
  }, []);

  // Gestionnaires CRUD
  const handleCreate = useCallback(() => {
    resetForm();
    updateKafalaModal({
      open: true,
      mode: 'create',
      kafala: null,
      loading: false
    });
  }, [resetForm, updateKafalaModal]);

  const handleEdit = useCallback((kafala) => {
    loadFormData(kafala);
    updateKafalaModal({
      open: true,
      mode: 'edit',
      kafala,
      loading: false
    });
  }, [loadFormData, updateKafalaModal]);

  const handleView = useCallback((kafala) => {
    loadFormData(kafala);
    updateKafalaModal({
      open: true,
      mode: 'view',
      kafala,
      loading: false
    });
  }, [loadFormData, updateKafalaModal]);

  const handleDelete = useCallback((kafala) => {
    setDeleteDialog({
      open: true,
      kafala
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      const response = await kafalaService.deleteKafala(deleteDialog.kafala.id);
      if (response.success) {
        showSnackbar('تم حذف الكفالة بنجاح', 'success');
        loadKafalas(page, false);
        loadStatistics();
      } else {
        showSnackbar(response.message || 'خطأ في الحذف', 'error');
      }
    } catch (error) {
      showSnackbar('خطأ في الحذف', 'error');
    } finally {
      setDeleteDialog({ open: false, kafala: null });
    }
  }, [deleteDialog.kafala, showSnackbar, loadKafalas, page, loadStatistics]);

  // Gestionnaire du formulaire
  const handleFormChange = useCallback((field, value) => {
    setKafalaForm(prev => ({ ...prev, [field]: value }));
    
    // Supprimer l'erreur pour ce champ si elle existe
    setFormErrors(prev => {
      if (prev[field]) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return prev;
    });
  }, []);

  // Gestionnaire de fichier PDF
  const handlePdfFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showSnackbar('يُسمح فقط بملفات PDF', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showSnackbar('الملف كبير جداً (الحد الأقصى 10MB)', 'error');
        return;
      }
      setPdfFile(file);
    }
  }, [showSnackbar]);

  const handleRemovePdfFile = useCallback(() => {
    setPdfFile(null);
    setPdfUploadProgress(0);
  }, []);

  // Validation du formulaire - MISE À JOUR
  const validateForm = useCallback(() => {
    const errors = {};
    const warnings = [];

    // Validations requises - CHAMPS OBLIGATOIRES UNIQUEMENT
    if (!kafalaForm.nom_pere.trim()) errors.nom_pere = 'مطلوب';
    if (!kafalaForm.prenom_pere.trim()) errors.prenom_pere = 'مطلوب';
    if (!kafalaForm.nom_mere.trim()) errors.nom_mere = 'مطلوب';
    if (!kafalaForm.prenom_mere.trim()) errors.prenom_mere = 'مطلوب';
    if (!kafalaForm.telephone.trim()) errors.telephone = 'مطلوب';
    // EMAIL N'EST PLUS REQUIS - SUPPRIMÉ
    if (!kafalaForm.adresse.trim()) errors.adresse = 'مطلوب';
    
    // TOUS LES CHAMPS ENFANT SONT MAINTENANT OPTIONNELS - SUPPRIMÉS

    // Validation email (seulement si fourni)
    if (kafalaForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kafalaForm.email)) {
      errors.email = 'تنسيق غير صالح';
    }

    // Validation dates
    if (kafalaForm.date_mariage && new Date(kafalaForm.date_mariage) > new Date()) {
      errors.date_mariage = 'تاريخ مستقبلي غير صالح';
    }

    if (kafalaForm.date_naissance_enfant && new Date(kafalaForm.date_naissance_enfant) > new Date()) {
      errors.date_naissance_enfant = 'تاريخ مستقبلي غير صالح';
    }

    // Avertissements
    if (!kafalaForm.reference && kafalaModal.mode === 'create') {
      warnings.push('سيتم إنشاء المرجع تلقائياً');
    }
    if (!kafalaForm.email) {
      warnings.push('البريد الإلكتروني غير محدد');
    }
    if (!kafalaForm.date_mariage) {
      warnings.push('تاريخ الزواج غير محدد');
    }
    if (!kafalaForm.nom_enfant) {
      warnings.push('اسم الطفل غير محدد');
    }
    if (!kafalaForm.prenom_enfant) {
      warnings.push('الاسم الشخصي للطفل غير محدد');
    }
    if (!kafalaForm.sexe_enfant) {
      warnings.push('جنس الطفل غير محدد');
    }
    if (!kafalaForm.date_naissance_enfant) {
      warnings.push('تاريخ ولادة الطفل غير محدد');
    }

    setFormErrors(errors);
    setFormWarnings(warnings);
    
    return Object.keys(errors).length === 0;
  }, [kafalaForm, kafalaModal.mode]);

  // Sauvegarder la kafala
  const handleSaveKafala = useCallback(async () => {
    if (!validateForm()) {
      showSnackbar('يرجى تصحيح الأخطاء', 'error');
      return;
    }

    updateKafalaModal({ loading: true });
    setPdfUploading(!!pdfFile);

    try {
      let response;
      const formData = new FormData();

      // Ajouter les données du formulaire
      Object.keys(kafalaForm).forEach(key => {
        if (kafalaForm[key]) {
          formData.append(key, kafalaForm[key]);
        }
      });

      // Ajouter le fichier PDF si présent
      if (pdfFile) {
        formData.append('fichier_pdf', pdfFile);
      }

      if (kafalaModal.mode === 'create') {
        response = await kafalaService.createKafalaWithFile(formData, (progress) => {
          setPdfUploadProgress(progress);
        });
      } else {
        response = await kafalaService.updateKafalaWithFile(kafalaModal.kafala.id, formData, (progress) => {
          setPdfUploadProgress(progress);
        });
      }

      if (response.success) {
        const action = kafalaModal.mode === 'create' ? 'تم إنشاء' : 'تم تعديل';
        showSnackbar(`${action} الكفالة بنجاح`, 'success');
        updateKafalaModal({ open: false, loading: false });
        resetForm();
        loadKafalas(page, false);
        loadStatistics();
      } else {
        showSnackbar(response.message || 'خطأ في الحفظ', 'error');
      }
    } catch (error) {
      showSnackbar('خطأ في الحفظ', 'error');
      console.error('خطأ الحفظ:', error);
    } finally {
      updateKafalaModal({ loading: false });
      setPdfUploading(false);
      setPdfUploadProgress(0);
    }
  }, [validateForm, showSnackbar, updateKafalaModal, pdfFile, kafalaForm, kafalaModal.mode, kafalaModal.kafala, resetForm, loadKafalas, page, loadStatistics]);

  // Fermer le modal
  const handleCloseModal = useCallback(() => {
    updateKafalaModal({ open: false });
    resetForm();
  }, [updateKafalaModal, resetForm]);

  // Gestionnaires PDF
  const handleViewPdf = useCallback(async (kafalaId) => {
    setPdfLoading(prev => ({ ...prev, [kafalaId]: true }));
    
    try {
      const pdfUrl = kafalaService.getPdfViewUrl(kafalaId);
      window.open(pdfUrl, '_blank');
      showSnackbar('تم فتح PDF في علامة تبويب جديدة', 'success');
    } catch (error) {
      console.error('خطأ عرض PDF:', error);
      showSnackbar('خطأ في فتح PDF', 'error');
    } finally {
      setPdfLoading(prev => ({ ...prev, [kafalaId]: false }));
    }
  }, [showSnackbar]);

  const handleDownloadPdf = useCallback(async (kafalaId, reference) => {
    setPdfLoading(prev => ({ ...prev, [kafalaId]: true }));
    
    try {
      await kafalaService.downloadPdf(kafalaId, `kafala_${reference}.pdf`);
      showSnackbar('بدء التحميل', 'success');
    } catch (error) {
      console.error('خطأ تحميل PDF:', error);
      showSnackbar('خطأ في التحميل', 'error');
    } finally {
      setPdfLoading(prev => ({ ...prev, [kafalaId]: false }));
    }
  }, [showSnackbar]);

  // Gestionnaire de clic sur TableRow
  const handleRowClick = useCallback((kafala, event) => {
    // Empêcher l'ouverture si on clique sur un bouton/action
    const target = event.target;
    const isButton = target.closest('button') || 
                    target.closest('[role="button"]') || 
                    target.closest('.MuiIconButton-root') ||
                    target.closest('.MuiChip-root');
    
    if (!isButton) {
      handleView(kafala);
    }
  }, [handleView]);

  // Gestionnaire pour empêcher la propagation dans les actions
  const handleActionClick = useCallback((event, action, kafala) => {
    event.stopPropagation();
    action(kafala);
  }, []);

  // COMPOSANT FORMULAIRE KAFALA - MISE À JOUR
  const KafalaFormDialog = useMemo(() => {
    const isViewMode = kafalaModal.mode === 'view';
    const isCreateMode = kafalaModal.mode === 'create';
    const title = isCreateMode ? 'ملف كفالة جديد' : isViewMode ? 'بيانات الكفالة الطبية' : 'تعديل ملف الكفالة';

    return (
      <Dialog
        open={kafalaModal.open}
        onClose={handleCloseModal}
        maxWidth="lg"
        fullWidth
        keepMounted={false}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid #e0e7ff'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            bgcolor: '#f8fafc', 
            borderBottom: '2px solid #e2e8f0',
            py: 3,
            px: 4
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <LocalHospital sx={{ color: medicalTheme.colors.primary, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" fontWeight={600} color="#1e293b">
                {title}
              </Typography>
              {kafalaModal.kafala && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                  رقم المرجع الطبي: <strong>{kafalaModal.kafala.reference}</strong>
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 4, bgcolor: '#fafbfc' }}>
          <Grid container spacing={3}>
            {/* المرجع الطبي */}
            {isCreateMode && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                  <TextField
                    fullWidth
                    label="رقم المرجع الطبي (اختياري)"
                    value={kafalaForm.reference}
                    onChange={(e) => handleFormChange('reference', e.target.value)}
                    error={!!formErrors.reference}
                    helperText={formErrors.reference || "سيتم إنشاء رقم مرجع تلقائياً"}
                    disabled={isViewMode}
                    inputRef={firstInputRef}
                    variant="outlined"
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white' } }}
                  />
                </Paper>
              </Grid>
            )}

            {/* قسم معلومات ولي الأمر الأول */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: 'white', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Person sx={{ color: medicalTheme.colors.primary, fontSize: 24 }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    بيانات ولي الأمر الأول (الأب)
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="الاسم الأول"
                      value={kafalaForm.nom_pere}
                      onChange={(e) => handleFormChange('nom_pere', e.target.value)}
                      error={!!formErrors.nom_pere}
                      helperText={formErrors.nom_pere}
                      disabled={isViewMode}
                      required
                      inputRef={!isCreateMode ? firstInputRef : null}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="الاسم الشخصي"
                      value={kafalaForm.prenom_pere}
                      onChange={(e) => handleFormChange('prenom_pere', e.target.value)}
                      error={!!formErrors.prenom_pere}
                      helperText={formErrors.prenom_pere}
                      disabled={isViewMode}
                      required
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="رقم البطاقة الوطنية"
                      value={kafalaForm.cin_pere}
                      onChange={(e) => handleFormChange('cin_pere', e.target.value)}
                      error={!!formErrors.cin_pere}
                      helperText={formErrors.cin_pere}
                      disabled={isViewMode}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                      InputProps={{
                        startAdornment: <Badge sx={{ color: medicalTheme.colors.info, mr: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* قسم معلومات ولي الأمر الثاني */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: 'white', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Person sx={{ color: medicalTheme.colors.secondary, fontSize: 24 }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    بيانات ولي الأمر الثاني (الأم)
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="الاسم الأول"
                      value={kafalaForm.nom_mere}
                      onChange={(e) => handleFormChange('nom_mere', e.target.value)}
                      error={!!formErrors.nom_mere}
                      helperText={formErrors.nom_mere}
                      disabled={isViewMode}
                      required
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="الاسم الشخصي"
                      value={kafalaForm.prenom_mere}
                      onChange={(e) => handleFormChange('prenom_mere', e.target.value)}
                      error={!!formErrors.prenom_mere}
                      helperText={formErrors.prenom_mere}
                      disabled={isViewMode}
                      required
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="رقم البطاقة الوطنية"
                      value={kafalaForm.cin_mere}
                      onChange={(e) => handleFormChange('cin_mere', e.target.value)}
                      error={!!formErrors.cin_mere}
                      helperText={formErrors.cin_mere}
                      disabled={isViewMode}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                      InputProps={{
                        startAdornment: <Badge sx={{ color: medicalTheme.colors.info, mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="تاريخ الزواج"
                      value={kafalaForm.date_mariage}
                      onChange={(e) => handleFormChange('date_mariage', e.target.value)}
                      error={!!formErrors.date_mariage}
                      helperText={formErrors.date_mariage}
                      disabled={isViewMode}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                      InputProps={{
                        startAdornment: <CalendarToday sx={{ color: medicalTheme.colors.info, mr: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* قسم معلومات الاتصال */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: 'white', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <ContactPhone sx={{ color: medicalTheme.colors.success, fontSize: 24 }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    معلومات الاتصال والعنوان
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="رقم الهاتف"
                      value={kafalaForm.telephone}
                      onChange={(e) => handleFormChange('telephone', e.target.value)}
                      error={!!formErrors.telephone}
                      helperText={formErrors.telephone}
                      disabled={isViewMode}
                      required
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="email"
                      label="البريد الإلكتروني (اختياري)"
                      value={kafalaForm.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      error={!!formErrors.email}
                      helperText={formErrors.email}
                      disabled={isViewMode}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="العنوان الكامل"
                      value={kafalaForm.adresse}
                      onChange={(e) => handleFormChange('adresse', e.target.value)}
                      error={!!formErrors.adresse}
                      helperText={formErrors.adresse}
                      disabled={isViewMode}
                      required
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                      InputProps={{
                        startAdornment: <Home sx={{ color: medicalTheme.colors.success, mr: 1, alignSelf: 'flex-start', mt: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* قسم معلومات الطفل الطبية - TOUS OPTIONNELS */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: 'white', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <ChildCare sx={{ color: medicalTheme.colors.warning, fontSize: 24 }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    البيانات للطفل المكفول (اختيارية)
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Alert severity="info" sx={{ mb: 3, bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <Typography variant="body2">
                    جميع بيانات الطفل المكفول اختيارية ويمكن إدخالها لاحقاً عند توفرها
                  </Typography>
                </Alert>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="اسم الطفل الأول (اختياري)"
                      value={kafalaForm.nom_enfant}
                      onChange={(e) => handleFormChange('nom_enfant', e.target.value)}
                      error={!!formErrors.nom_enfant}
                      helperText={formErrors.nom_enfant}
                      disabled={isViewMode}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="الاسم الشخصي للطفل (اختياري)"
                      value={kafalaForm.prenom_enfant}
                      onChange={(e) => handleFormChange('prenom_enfant', e.target.value)}
                      error={!!formErrors.prenom_enfant}
                      helperText={formErrors.prenom_enfant}
                      disabled={isViewMode}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl 
                      fullWidth 
                      error={!!formErrors.sexe_enfant}
                      disabled={isViewMode}
                      variant="outlined"
                    >
                      <InputLabel>الجنس (اختياري)</InputLabel>
                      <Select
                        value={kafalaForm.sexe_enfant}
                        label="الجنس (اختياري)"
                        onChange={(e) => handleFormChange('sexe_enfant', e.target.value)}
                        sx={{ bgcolor: '#fafbfc' }}
                      >
                        <MenuItem value="">غير محدد</MenuItem>
                        <MenuItem value="M">ذكر</MenuItem>
                        <MenuItem value="F">أنثى</MenuItem>
                      </Select>
                      {formErrors.sexe_enfant && (
                        <FormHelperText>{formErrors.sexe_enfant}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="تاريخ الولادة (اختياري)"
                      value={kafalaForm.date_naissance_enfant}
                      onChange={(e) => handleFormChange('date_naissance_enfant', e.target.value)}
                      error={!!formErrors.date_naissance_enfant}
                      helperText={formErrors.date_naissance_enfant}
                      disabled={isViewMode}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                      InputProps={{
                        startAdornment: <CalendarToday sx={{ color: medicalTheme.colors.warning, mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="رقم البطاقة الوطنية للطفل (اختياري)"
                      value={kafalaForm.cin_enfant}
                      onChange={(e) => handleFormChange('cin_enfant', e.target.value)}
                      error={!!formErrors.cin_enfant}
                      helperText={formErrors.cin_enfant}
                      disabled={isViewMode}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                      InputProps={{
                        startAdornment: <Badge sx={{ color: medicalTheme.colors.warning, mr: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* قسم الوثائق الطبية */}
            {!isViewMode && (
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3, bgcolor: 'white', border: '1px solid #e2e8f0' }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <PictureAsPdf sx={{ color: medicalTheme.colors.error, fontSize: 24 }} />
                    <Typography variant="h6" fontWeight={600} color="#1e293b">
                      الوثائق والمستندات الطبية
                    </Typography>
                  </Stack>
                  <Divider sx={{ mb: 3 }} />
                  
                  {/* PDF موجود */}
                  {kafalaModal.kafala?.a_fichier_pdf && !pdfFile && (
                    <Box sx={{ mb: 3, p: 3, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0' }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <PictureAsPdf sx={{ color: medicalTheme.colors.success, fontSize: 32 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" fontWeight={500}>
                            مستند PDF متوفر: {kafalaModal.kafala.fichier_pdf_nom || `kafala_${kafalaModal.kafala.reference}.pdf`}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            تم رفع الوثيقة بنجاح
                          </Typography>
                        </Box>
                        <Button 
                          variant="contained"
                          size="small"
                          color="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPdf(kafalaModal.kafala.id);
                          }}
                          startIcon={<Visibility />}
                        >
                          عرض المستند
                        </Button>
                      </Stack>
                    </Box>
                  )}
                  
                  {/* رفع ملف جديد */}
                  {!pdfFile ? (
                    <Box sx={{ textAlign: 'center', p: 4, border: '2px dashed #cbd5e1', borderRadius: 2 }}>
                      <input
                        accept="application/pdf"
                        style={{ display: 'none' }}
                        id="pdf-upload-input"
                        type="file"
                        onChange={handlePdfFileChange}
                      />
                      <label htmlFor="pdf-upload-input">
                        <Button
                          variant="contained"
                          component="span"
                          size="large"
                          startIcon={<CloudUpload />}
                          sx={{
                            bgcolor: medicalTheme.colors.primary,
                            '&:hover': { bgcolor: '#1565c0' },
                            px: 4,
                            py: 1.5
                          }}
                        >
                          {kafalaModal.kafala?.a_fichier_pdf ? 'استبدال الوثيقة الطبية' : 'رفع وثيقة PDF'}
                        </Button>
                      </label>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        الحد الأقصى للملف: 10MB • الصيغة المقبولة: PDF
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ p: 3, bgcolor: '#fef3c7', borderRadius: 2, border: '1px solid #fcd34d' }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <PictureAsPdf sx={{ color: medicalTheme.colors.warning, fontSize: 32 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" fontWeight={500}>
                            {pdfFile.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            حجم الملف: {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                        <IconButton 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePdfFile();
                          }}
                          sx={{ color: medicalTheme.colors.error }}
                        >
                          <Close />
                        </IconButton>
                      </Stack>
                    </Box>
                  )}

                  {pdfUploading && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={pdfUploadProgress} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          bgcolor: '#e2e8f0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: medicalTheme.colors.success
                          }
                        }} 
                      />
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                        جاري رفع الوثيقة... {pdfUploadProgress.toFixed(0)}%
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}

            {/* قسم التعليقات الطبية */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: 'white', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Info sx={{ color: medicalTheme.colors.info, fontSize: 24 }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    ملاحظات طبية وتعليقات
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="ملاحظات وتعليقات طبية"
                  value={kafalaForm.commentaires}
                  onChange={(e) => handleFormChange('commentaires', e.target.value)}
                  error={!!formErrors.commentaires}
                  helperText={formErrors.commentaires || "أضف أي ملاحظات طبية مهمة حول الحالة"}
                  disabled={isViewMode}
                  variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
                />
              </Paper>
            </Grid>

            {/* تحذيرات طبية */}
            {formWarnings.length > 0 && (
              <Grid item xs={12}>
                <Alert 
                  severity="warning" 
                  sx={{ 
                    borderRadius: 2, 
                    border: '1px solid #fbbf24',
                    bgcolor: '#fffbeb'
                  }}
                  icon={<ErrorOutline />}
                >
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    تنبيهات مهمة:
                  </Typography>
                  {formWarnings.map((warning, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      • {warning}
                    </Typography>
                  ))}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', p: 3 }}>
          <Button 
            onClick={handleCloseModal} 
            disabled={kafalaModal.loading}
            variant="outlined"
            sx={{ px: 3 }}
          >
            {isViewMode ? 'إغلاق الملف' : 'إلغاء العملية'}
          </Button>
          {!isViewMode && (
            <Button
              onClick={handleSaveKafala}
              variant="contained"
              disabled={kafalaModal.loading || pdfUploading}
              startIcon={kafalaModal.loading ? <CircularProgress size={20} /> : <Save />}
              sx={{
                px: 4,
                bgcolor: medicalTheme.colors.primary,
                '&:hover': { bgcolor: '#1565c0' }
              }}
            >
              {kafalaModal.loading ? 'جاري الحفظ...' : (isCreateMode ? 'إنشاء الملف' : 'حفظ التعديلات')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }, [kafalaModal, kafalaForm, formErrors, formWarnings, pdfFile, pdfUploading, pdfUploadProgress, handleFormChange, handleCloseModal, handlePdfFileChange, handleRemovePdfFile, handleViewPdf, handleSaveKafala]);

  // مكون الإحصائيات الطبية
  const StatisticsCards = useMemo(() => {
    if (statsLoading) {
      return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[...Array(5)].map((_, index) => (
            <Grid item xs={12} sm={6} md={2.4} key={index}>
              <Card elevation={2}>
                <CardContent>
                  <Skeleton variant="rectangular" height={60} />
                  <Skeleton variant="text" width="60%" sx={{ mt: 1 }} />
                  <Skeleton variant="text" width="40%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      );
    }

    if (!statistics) return null;

    const stats = [
      { 
        label: 'إجمالي الملفات الطبية', 
        value: statistics.total_kafalas, 
        color: medicalTheme.colors.primary,
        icon: <Groups />,
        bgcolor: '#e3f2fd'
      },
      { 
        label: 'ملفات موثقة بـ PDF', 
        value: statistics.avec_pdf, 
        color: medicalTheme.colors.success,
        icon: <PictureAsPdf />,
        bgcolor: '#e8f5e8'
      },
      { 
        label: 'ملفات بدون وثائق', 
        value: statistics.sans_pdf, 
        color: medicalTheme.colors.warning,
        icon: <ErrorOutline />,
        bgcolor: '#fff3e0'
      },
      { 
        label: 'الأطفال الذكور', 
        value: statistics.masculin, 
        color: medicalTheme.colors.info,
        icon: <ChildCare />,
        bgcolor: '#e1f5fe'
      },
      { 
        label: 'الأطفال الإناث', 
        value: statistics.feminin, 
        color: medicalTheme.colors.secondary,
        icon: <ChildCare />,
        bgcolor: '#fce4ec'
      },
    ];

    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <Card 
              elevation={3}
              sx={{ 
                height: '100%', 
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)' 
                },
                border: '1px solid #e2e8f0'
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: stat.bgcolor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    border: `2px solid ${stat.color}`
                  }}
                >
                  {React.cloneElement(stat.icon, { 
                    sx: { fontSize: 28, color: stat.color } 
                  })}
                </Box>
                <Typography variant="h3" fontWeight={700} sx={{ color: stat.color, mb: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="textSecondary" fontWeight={500}>
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }, [statistics, statsLoading]);

  // مكون المرشحات الطبية
  const FiltersToolbar = useMemo(() => (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'white', 
        border: '1px solid #e2e8f0',
        borderRadius: 2
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Search sx={{ color: medicalTheme.colors.primary, fontSize: 24 }} />
        <Typography variant="h6" fontWeight={600} color="#1e293b">
          فلترة وبحث الملفات الطبية
        </Typography>
      </Stack>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="البحث في الملفات"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="الاسم، المرجع، رقم البطاقة..."
            variant="outlined"
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>الجنس الطبي</InputLabel>
            <Select
              value={filters.sexe_enfant}
              label="الجنس الطبي"
              onChange={(e) => handleFilterChange('sexe_enfant', e.target.value)}
              sx={{ bgcolor: '#fafbfc' }}
            >
              <MenuItem value="">جميع الأجناس</MenuItem>
              <MenuItem value="M">الذكور</MenuItem>
              <MenuItem value="F">الإناث</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            type="date"
            label="تاريخ الزواج (من)"
            value={filters.date_mariage_from}
            onChange={(e) => handleFilterChange('date_mariage_from', e.target.value)}
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            type="date"
            label="تاريخ الزواج (إلى)"
            value={filters.date_mariage_to}
            onChange={(e) => handleFilterChange('date_mariage_to', e.target.value)}
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafbfc' } }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleResetFilters}
            startIcon={<ClearAll />}
            sx={{ 
              height: 56,
              borderColor: medicalTheme.colors.grey[400],
              color: medicalTheme.colors.grey[700],
              '&:hover': {
                borderColor: medicalTheme.colors.primary,
                color: medicalTheme.colors.primary
              }
            }}
          >
            إعادة تعيين الفلاتر
          </Button>
        </Grid>
      </Grid>
    </Paper>
  ), [filters, handleFilterChange, handleResetFilters]);

  return (
    <Container maxWidth="xl" sx={{ py: 4, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* رأس النظام الطبي */}
      <Box sx={{ mb: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <LocalHospital sx={{ fontSize: 40, color: 'white' }} />
                  <Box>
                    <Typography variant="h3" component="h1" fontWeight={700} sx={{ color: '#007bff' }}>
                      نظام إدارة المساعدة الطبية
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, mt: 1, color: '#64748b' }}>
                      إدارة الكفالة شاملة ومتقدمة للملفات الطبية والرعاية الصحية
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    loadKafalas(page, false);
                    loadStatistics();
                  }}
                  disabled={refreshing}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'white',
                    '&:hover': { 
                      borderColor: 'rgba(255,255,255,0.8)',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  {refreshing ? <CircularProgress size={20} color="inherit" /> : 'تحديث البيانات'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreate}
                  sx={{
                    bgcolor: 'white',
                    color: medicalTheme.colors.primary,
                    fontWeight: 600,
                    '&:hover': { 
                      bgcolor: 'rgba(255,255,255,0.9)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  ملف كفالة جديد
                </Button>
              </Box>
            </Stack>
          </Box>
          
          {/* خلفية ديكورية */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.1)',
              zIndex: 0
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 150,
              height: 150,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.1)',
              zIndex: 0
            }}
          />
        </Paper>
      </Box>

      {/* الإحصائيات الطبية */}
      {StatisticsCards}

      {/* المرشحات */}
      {FiltersToolbar}

      {/* شريط التقدم */}
      {refreshing && (
        <LinearProgress 
          sx={{ 
            mb: 3, 
            height: 4, 
            borderRadius: 2,
            bgcolor: '#e2e8f0',
            '& .MuiLinearProgress-bar': {
              bgcolor: medicalTheme.colors.primary
            }
          }} 
        />
      )}

      {/* الجدول الطبي الرئيسي */}
      <Paper 
        elevation={3}
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        <TableContainer sx={{ maxHeight: 700 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell 
                  sx={{ 
                    minWidth: 140, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Badge sx={{ color: medicalTheme.colors.primary }} />
                    <span>المرجع الطبي</span>
                  </Stack>
                </TableCell>
                <TableCell 
                  sx={{ 
                    minWidth: 220, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Person sx={{ color: medicalTheme.colors.primary }} />
                    <span>ولي الأمر الأول</span>
                  </Stack>
                </TableCell>
                <TableCell 
                  sx={{ 
                    minWidth: 220, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Person sx={{ color: medicalTheme.colors.secondary }} />
                    <span>ولي الأمر الثاني</span>
                  </Stack>
                </TableCell>
                <TableCell 
                  sx={{ 
                    minWidth: 240, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ChildCare sx={{ color: medicalTheme.colors.warning }} />
                    <span>الطفل المكفول</span>
                  </Stack>
                </TableCell>
                <TableCell 
                  sx={{ 
                    minWidth: 180, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ContactPhone sx={{ color: medicalTheme.colors.success }} />
                    <span>الاتصال</span>
                  </Stack>
                </TableCell>
                <TableCell 
                  sx={{ 
                    minWidth: 200, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Home sx={{ color: medicalTheme.colors.success }} />
                    <span>العنوان</span>
                  </Stack>
                </TableCell>
                <TableCell 
                  sx={{ 
                    minWidth: 140, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CalendarToday sx={{ color: medicalTheme.colors.info }} />
                    <span>تاريخ الزواج</span>
                  </Stack>
                </TableCell>
                <TableCell 
                  sx={{ 
                    minWidth: 140, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CalendarToday sx={{ color: medicalTheme.colors.warning }} />
                    <span>تاريخ الولادة</span>
                  </Stack>
                </TableCell>
                <TableCell 
                  sx={{ 
                    minWidth: 160, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Badge sx={{ color: medicalTheme.colors.info }} />
                    <span>البطاقات الوطنية</span>
                  </Stack>
                </TableCell>
                <TableCell 
                  sx={{ 
                    minWidth: 120, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PictureAsPdf sx={{ color: medicalTheme.colors.error }} />
                    <span>المستندات</span>
                  </Stack>
                </TableCell>
                <TableCell 
                  sx={{ 
                    minWidth: 140, 
                    bgcolor: '#f8fafc',
                    fontWeight: 700,
                    color: '#1e293b',
                    borderBottom: '2px solid #e2e8f0'
                  }} 
                  align="center"
                >
                  الإجراءات الطبية
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(rowsPerPage)].map((_, index) => (
                  <TableRow key={index}>
                    {[...Array(11)].map((_, cellIndex) => (
                      <TableCell key={cellIndex} sx={{ py: 3 }}>
                        <Skeleton variant="text" height={24} />
                        <Skeleton variant="text" height={20} width="60%" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                      <Typography variant="h5" color="error" gutterBottom fontWeight={600}>
                        خطأ في تحميل البيانات الطبية
                      </Typography>
                      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                        {error}
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Refresh />}
                        onClick={() => loadKafalas()}
                        sx={{ 
                          bgcolor: medicalTheme.colors.primary,
                          '&:hover': { bgcolor: '#1565c0' }
                        }}
                      >
                        إعادة المحاولة
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : kafalas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <LocalHospital sx={{ fontSize: 64, color: 'info.main', mb: 2 }} />
                      <Typography variant="h5" color="textSecondary" fontWeight={600}>
                        لا توجد ملفات كفالة طبية
                      </Typography>
                      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                        ابدأ بإنشاء أول ملف كفالة طبية
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleCreate}
                        sx={{ 
                          bgcolor: medicalTheme.colors.primary,
                          '&:hover': { bgcolor: '#1565c0' }
                        }}
                      >
                        إنشاء ملف جديد
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                kafalas.map((kafala) => (
                  <TableRow
                    key={kafala.id}
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        bgcolor: '#f8fafc',
                        transform: 'scale(1.001)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      },
                      transition: 'all 0.2s',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                    onClick={(e) => handleRowClick(kafala, e)}
                  >
                    {/* المرجع الطبي */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                        <Typography variant="body1" fontWeight={600} color={medicalTheme.colors.primary}>
                          {kafala.reference}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          مرجع طبي
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* ولي الأمر الأول */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ p: 2, bgcolor: '#fafafa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                        <Typography variant="body1" fontWeight={600} color="#1e293b">
                          {kafala.nom_pere} {kafala.prenom_pere}
                        </Typography>
                        {kafala.cin_pere && (
                          <Chip
                            label={`ب.و: ${kafala.cin_pere}`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              mt: 1, 
                              fontSize: '0.7rem',
                              color: medicalTheme.colors.primary,
                              borderColor: medicalTheme.colors.primary
                            }}
                          />
                        )}
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                          الأب
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* ولي الأمر الثاني */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ p: 2, bgcolor: '#fdf2f8', borderRadius: 2, border: '1px solid #fce7f3' }}>
                        <Typography variant="body1" fontWeight={600} color="#1e293b">
                          {kafala.nom_mere} {kafala.prenom_mere}
                        </Typography>
                        {kafala.cin_mere && (
                          <Chip
                            label={`ب.و: ${kafala.cin_mere}`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              mt: 1, 
                              fontSize: '0.7rem',
                              color: medicalTheme.colors.secondary,
                              borderColor: medicalTheme.colors.secondary
                            }}
                          />
                        )}
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                          الأم
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* الطفل المكفول */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fed7aa' }}>
                        {kafala.nom_enfant ? (
                          <>
                            <Typography variant="body1" fontWeight={600} color="#1e293b">
                              {kafala.nom_enfant} {kafala.prenom_enfant}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                              {kafala.sexe_enfant && (
                                <Chip
                                  label={kafala.sexe_enfant === 'M' ? 'ذكر' : 'أنثى'}
                                  size="small"
                                  color={kafala.sexe_enfant === 'M' ? 'primary' : 'secondary'}
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                              {kafala.age_enfant && (
                                <Chip
                                  label={`${kafala.age_enfant} سنة`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                            </Stack>
                            {kafala.cin_enfant && (
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                ب.و: {kafala.cin_enfant}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" color="textSecondary" fontStyle="italic">
                            بيانات الطفل غير محددة
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* معلومات الاتصال */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                          📞 {kafala.telephone}
                        </Typography>
                        {kafala.email && (
                          <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem', wordBreak: 'break-word' }}>
                            ✉️ {kafala.email}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* العنوان */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                        <Typography variant="body2" sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.4,
                          fontWeight: 500
                        }}>
                          🏠 {kafala.adresse}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* تاريخ الزواج */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                        <Typography variant="body2" fontWeight={500}>
                          {kafala.date_mariage ? 
                            new Date(kafala.date_mariage).toLocaleDateString('ar-MA') : 
                            'غير محدد'
                          }
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          تاريخ الزواج
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* تاريخ ولادة الطفل */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fed7aa' }}>
                        <Typography variant="body2" fontWeight={500}>
                          {kafala.date_naissance_enfant ? 
                            new Date(kafala.date_naissance_enfant).toLocaleDateString('ar-MA') : 
                            'غير محدد'
                          }
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          تاريخ الولادة
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* البطاقات الوطنية */}
                    <TableCell sx={{ py: 2 }}>
                      <Stack spacing={1}>
                        {kafala.cin_pere && (
                          <Chip 
                            label={`أب: ${kafala.cin_pere}`} 
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.7rem',
                              color: medicalTheme.colors.primary,
                              borderColor: medicalTheme.colors.primary
                            }}
                          />
                        )}
                        {kafala.cin_mere && (
                          <Chip 
                            label={`أم: ${kafala.cin_mere}`} 
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.7rem',
                              color: medicalTheme.colors.secondary,
                              borderColor: medicalTheme.colors.secondary
                            }}
                          />
                        )}
                        {kafala.cin_enfant && (
                          <Chip 
                            label={`طفل: ${kafala.cin_enfant}`} 
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.7rem',
                              color: medicalTheme.colors.warning,
                              borderColor: medicalTheme.colors.warning
                            }}
                          />
                        )}
                      </Stack>
                    </TableCell>

                    {/* المستندات الطبية */}
                    <TableCell sx={{ py: 2 }}>
                      {kafala.a_fichier_pdf ? (
                        <Box>
                          <Chip
                            label="PDF متوفر"
                            size="small"
                            color="success"
                            icon={<PictureAsPdf />}
                            sx={{ mb: 1, fontSize: '0.7rem' }}
                          />
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="عرض المستند">
                              <IconButton
                                size="small"
                                onClick={(e) => handleActionClick(e, () => handleViewPdf(kafala.id), kafala)}
                                disabled={pdfLoading[kafala.id]}
                                sx={{ 
                                  bgcolor: '#f0f9ff',
                                  border: '1px solid #bae6fd',
                                  '&:hover': { bgcolor: '#e0f2fe' }
                                }}
                              >
                                {pdfLoading[kafala.id] ? 
                                  <CircularProgress size={16} /> : 
                                  <Visibility sx={{ fontSize: 16, color: medicalTheme.colors.info }} />
                                }
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تحميل المستند">
                              <IconButton
                                size="small"
                                onClick={(e) => handleActionClick(e, () => handleDownloadPdf(kafala.id, kafala.reference), kafala)}
                                disabled={pdfLoading[kafala.id]}
                                sx={{ 
                                  bgcolor: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  '&:hover': { bgcolor: '#dcfce7' }
                                }}
                              >
                                {pdfLoading[kafala.id] ? 
                                  <CircularProgress size={16} /> : 
                                  <Download sx={{ fontSize: 16, color: medicalTheme.colors.success }} />
                                }
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      ) : (
                        <Chip
                          label="لا يوجد مستند"
                          size="small"
                          color="default"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </TableCell>

                    {/* الإجراءات الطبية */}
                    <TableCell align="center" sx={{ py: 2 }}>
                      <Stack spacing={1} alignItems="center">
                        <Tooltip title="تعديل الملف الطبي">
                          <IconButton
                            size="medium"
                            onClick={(e) => handleActionClick(e, handleEdit, kafala)}
                            sx={{ 
                              bgcolor: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              '&:hover': { 
                                bgcolor: '#e0f2fe',
                                transform: 'scale(1.1)'
                              }
                            }}
                          >
                            <Edit sx={{ fontSize: 18, color: medicalTheme.colors.primary }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف الملف الطبي">
                          <IconButton
                            size="medium"
                            onClick={(e) => handleActionClick(e, handleDelete, kafala)}
                            sx={{ 
                              bgcolor: '#fef2f2',
                              border: '1px solid #fecaca',
                              '&:hover': { 
                                bgcolor: '#fee2e2',
                                transform: 'scale(1.1)'
                              }
                            }}
                          >
                            <Delete sx={{ fontSize: 18, color: medicalTheme.colors.error }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ترقيم الصفحات الطبي */}
        <Box sx={{ bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 15, 25, 50]}
            labelRowsPerPage="ملفات لكل صفحة:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`} ملف طبي`
            }
            sx={{
              '& .MuiTablePagination-toolbar': {
                px: 3,
                py: 2
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontWeight: 500,
                color: '#374151'
              }
            }}
          />
        </Box>
      </Paper>

      {/* مربع حوار حذف الملف الطبي */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, kafala: null })}
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: '2px solid #fecaca',
            boxShadow: '0 10px 30px rgba(239, 68, 68, 0.2)'
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <ErrorOutline sx={{ fontSize: 28 }} />
            <span>تأكيد حذف الملف الطبي</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            تحذير: هذا الإجراء لا يمكن التراجع عنه
          </Alert>
          <DialogContentText sx={{ fontSize: '1rem', fontWeight: 500 }}>
            هل أنت متأكد من حذف ملف الكفالة الطبية رقم "{deleteDialog.kafala?.reference}"؟
            سيتم حذف جميع البيانات والمستندات المرتبطة بهذا الملف نهائياً.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#fafbfc' }}>
          <Button 
            onClick={() => setDeleteDialog({ open: false, kafala: null })}
            variant="outlined"
            sx={{ px: 3 }}
          >
            إلغاء العملية
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            autoFocus
            sx={{ px: 3, fontWeight: 600 }}
          >
            تأكيد الحذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* مربع حوار نموذج الكفالة الطبية */}
      {KafalaFormDialog}

      {/* شريط الإشعارات الطبية */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            fontWeight: 500,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default KafalaPage;