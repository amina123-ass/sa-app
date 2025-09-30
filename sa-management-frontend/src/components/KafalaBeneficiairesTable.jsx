import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// Composant principal du tableau des bénéficiaires
const KafalaBeneficiairesTable = () => {
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileDialog, setFileDialog] = useState({
    open: false,
    fileUrl: '',
    fileName: '',
    fileType: '',
    beneficiaire: null
  });

  // Données d'exemple (remplacez par votre appel API)
  useEffect(() => {
    // Simuler un appel API
    const fetchBeneficiaires = async () => {
      try {
        setLoading(true);
        // Remplacez ceci par votre appel API réel
        // const response = await upasAPI.getKafalas();
        
        // Données d'exemple
        const mockData = [
          {
            id: 1,
            reference: 'KAF-001',
            nom_pere: 'أحمد',
            prenom_pere: 'محمد',
            nom_mere: 'فاطمة',
            prenom_mere: 'علي',
            nom_enfant: 'سارة',
            prenom_enfant: 'أحمد',
            sexe_enfant: 'F',
            telephone: '0612345678',
            adresse: 'الدار البيضاء، المغرب',
            email: 'ahmed.mohamed@email.com',
            fichier: 'http://localhost:8000/storage/kafala/kafala_001.pdf',
            created_at: '2024-01-15T10:30:00Z'
          },
          {
            id: 2,
            reference: 'KAF-002',
            nom_pere: 'عبدالله',
            prenom_pere: 'يوسف',
            nom_mere: 'خديجة',
            prenom_mere: 'حسن',
            nom_enfant: 'محمد',
            prenom_enfant: 'عبدالله',
            sexe_enfant: 'M',
            telephone: '0623456789',
            adresse: 'الرباط، المغرب',
            email: 'abdullah.youssef@email.com',
            fichier: 'http://localhost:8000/storage/kafala/kafala_002.jpg',
            created_at: '2024-01-16T14:20:00Z'
          },
          {
            id: 3,
            reference: 'KAF-003',
            nom_pere: 'عمر',
            prenom_pere: 'الحسن',
            nom_mere: 'عائشة',
            prenom_mere: 'محمد',
            nom_enfant: 'فاطمة',
            prenom_enfant: 'عمر',
            sexe_enfant: 'F',
            telephone: '0634567890',
            adresse: 'فاس، المغرب',
            email: null,
            fichier: null, // Pas de fichier
            created_at: '2024-01-17T09:45:00Z'
          }
        ];

        setTimeout(() => {
          setBeneficiaires(mockData);
          setLoading(false);
        }, 1000);

      } catch (err) {
        setError('خطأ في تحميل البيانات');
        setLoading(false);
      }
    };

    fetchBeneficiaires();
  }, []);

  // Détecter le type de fichier
  const getFileType = (fileUrl) => {
    if (!fileUrl) return null;
    const extension = fileUrl.split('.').pop().toLowerCase();
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    return 'unknown';
  };

  // Ouvrir la modale de visualisation
  const handleViewFile = (beneficiaire) => {
    if (!beneficiaire.fichier) {
      alert('لا يوجد ملف متاح لهذا المستفيد');
      return;
    }

    const fileType = getFileType(beneficiaire.fichier);
    const fileName = beneficiaire.fichier.split('/').pop();

    setFileDialog({
      open: true,
      fileUrl: beneficiaire.fichier,
      fileName: fileName,
      fileType: fileType,
      beneficiaire: beneficiaire
    });
  };

  // Fermer la modale
  const handleCloseDialog = () => {
    setFileDialog({
      open: false,
      fileUrl: '',
      fileName: '',
      fileType: '',
      beneficiaire: null
    });
  };

  // Télécharger le fichier
  const handleDownloadFile = () => {
    if (fileDialog.fileUrl) {
      const link = document.createElement('a');
      link.href = fileDialog.fileUrl;
      link.download = fileDialog.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-MA');
  };

  // Rendu du contenu de la modale selon le type de fichier
  const renderFileContent = () => {
    const { fileUrl, fileType, fileName } = fileDialog;

    if (!fileUrl) {
      return (
        <Alert severity="error" icon={<ErrorIcon />}>
          لا يمكن تحميل الملف
        </Alert>
      );
    }

    switch (fileType) {
      case 'pdf':
        return (
          <Box sx={{ width: '100%', height: '70vh' }}>
            <iframe
              src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              width="100%"
              height="100%"
              title={`PDF: ${fileName}`}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '4px'
              }}
            />
          </Box>
        );

      case 'image':
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              maxHeight: '70vh',
              overflow: 'auto'
            }}
          >
            <img
              src={fileUrl}
              alt={fileName}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                border: '1px solid #e0e0e0',
                borderRadius: '4px'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <Alert 
              severity="error" 
              sx={{ display: 'none' }}
            >
              خطأ في تحميل الصورة
            </Alert>
          </Box>
        );

      default:
        return (
          <Alert severity="warning">
            نوع الملف غير مدعوم للعرض: {fileName}
          </Alert>
        );
    }
  };

  // Icône selon le type de fichier
  const getFileIcon = (fileUrl) => {
    const fileType = getFileType(fileUrl);
    switch (fileType) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'image':
        return <ImageIcon color="primary" />;
      default:
        return <ErrorIcon color="disabled" />;
    }
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px' 
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>جاري تحميل البيانات...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2, textAlign: 'right' }}>
          📋 قائمة مستفيدي الكفالة
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'right' }}>
          إجمالي المستفيدين: {beneficiaires.length}
        </Typography>
      </Box>

      {/* Tableau */}
      <TableContainer component={Paper} elevation={3}>
        <Table sx={{ minWidth: 650 }} aria-label="جدول المستفيدين">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                المرجع
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                👨👩 الوالدين
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                👶 الطفل
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                📞 معلومات الاتصال
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                📅 تاريخ الإنشاء
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                📄 الملف
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                🔧 الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {beneficiaires.map((beneficiaire) => (
              <TableRow 
                key={beneficiaire.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                {/* المرجع */}
                <TableCell align="center">
                  <Chip 
                    label={beneficiaire.reference} 
                    color="primary" 
                    variant="outlined" 
                  />
                </TableCell>

                {/* الوالدين */}
                <TableCell>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <PersonIcon sx={{ mr: 0.5, fontSize: 16 }} />
                      👨 الأب: {beneficiaire.nom_pere} {beneficiaire.prenom_pere}
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 0.5, fontSize: 16 }} />
                      👩 الأم: {beneficiaire.nom_mere} {beneficiaire.prenom_mere}
                    </Typography>
                  </Box>
                </TableCell>

                {/* الطفل */}
                <TableCell>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {beneficiaire.sexe_enfant === 'M' ? '👦' : '👧'} {beneficiaire.nom_enfant} {beneficiaire.prenom_enfant}
                    </Typography>
                    <Chip 
                      label={beneficiaire.sexe_enfant === 'M' ? 'ذكر' : 'أنثى'} 
                      size="small" 
                      color={beneficiaire.sexe_enfant === 'M' ? 'info' : 'secondary'}
                    />
                  </Box>
                </TableCell>

                {/* معلومات الاتصال */}
                <TableCell>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <PhoneIcon sx={{ mr: 0.5, fontSize: 16 }} />
                      {beneficiaire.telephone}
                    </Typography>
                    {beneficiaire.email && (
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        ✉️ {beneficiaire.email}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                      <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
                      {beneficiaire.adresse}
                    </Typography>
                  </Box>
                </TableCell>

                {/* تاريخ الإنشاء */}
                <TableCell align="center">
                  {formatDate(beneficiaire.created_at)}
                </TableCell>

                {/* الملف */}
                <TableCell align="center">
                  {beneficiaire.fichier ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getFileIcon(beneficiaire.fichier)}
                      <Typography variant="caption" sx={{ ml: 0.5 }}>
                        متوفر
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      غير متوفر
                    </Typography>
                  )}
                </TableCell>

                {/* الإجراءات */}
                <TableCell align="center">
                  <Tooltip title="عرض الملف">
                    <span>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewFile(beneficiaire)}
                        disabled={!beneficiaire.fichier}
                        sx={{ minWidth: 'auto' }}
                      >
                        عرض
                      </Button>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modale de visualisation des fichiers */}
      <Dialog
        open={fileDialog.open}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            width: '90vw',
            height: '85vh',
            maxWidth: 'none'
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e0e0e0',
            textAlign: 'right'
          }}
        >
          <Box>
            <Typography variant="h6" component="div">
              📄 عرض الملف: {fileDialog.fileName}
            </Typography>
            {fileDialog.beneficiaire && (
              <Typography variant="subtitle2" color="text.secondary">
                المستفيد: {fileDialog.beneficiaire.reference} - {fileDialog.beneficiaire.nom_enfant} {fileDialog.beneficiaire.prenom_enfant}
              </Typography>
            )}
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleCloseDialog}
            aria-label="إغلاق"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2, overflow: 'hidden' }}>
          {renderFileContent()}
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #e0e0e0', p: 2 }}>
          <Button
            onClick={handleDownloadFile}
            startIcon={<DownloadIcon />}
            variant="outlined"
            disabled={!fileDialog.fileUrl}
          >
            تحميل الملف
          </Button>
          <Button
            onClick={handleCloseDialog}
            variant="contained"
            color="primary"
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message si aucun bénéficiaire */}
      {beneficiaires.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            لا توجد بيانات للعرض
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default KafalaBeneficiairesTable;