import React, { useState, useCallback, useEffect } from 'react';
import { upasAPI } from '../services/beneficiereService';
import { handleApiError } from '../services/axiosClient';
import LoadingSpinner from './LoadingSpinner';
import * as XLSX from 'xlsx';

const ImportExcelForm = ({ 
  importFile,
  setImportFile,
  importCampagne,
  setImportCampagne,
  importValidation,
  setImportValidation,
  importProgress,
  setImportProgress,
  isImporting,
  setIsImporting,
  importError,
  setImportError,
  formOptions,
  onImportSuccess,
  onClose
}) => {
  // États locaux
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importSettings, setImportSettings] = useState({
    ignoreDoublons: true,
    forceImport: false,
    validateFirst: true,
    maxRows: 1000
  });
  const [validationDetails, setValidationDetails] = useState(null);

  // Constantes pour validation
  const ACCEPTED_FILE_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
    'text/plain'
  ];

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const REQUIRED_COLUMNS = ['nom', 'prenom', 'sexe', 'adresse', 'telephone'];
  const OPTIONAL_COLUMNS = [
    'date_naissance', 'email', 'cin', 'commentaire', 'decision', 
    'cote', 'lateralite', 'enfants_scolarises'
  ];

  const COLUMN_MAPPING = {
    'nom': ['nom', 'nom_famille', 'last_name', 'famille'],
    'prenom': ['prenom', 'prénom', 'first_name', 'nom_prenom'],
    'sexe': ['sexe', 'genre', 'gender', 'sex'],
    'telephone': ['telephone', 'téléphone', 'phone', 'tel', 'gsm'],
    'adresse': ['adresse', 'address', 'lieu', 'domicile'],
    'date_naissance': ['date_naissance', 'naissance', 'birth_date', 'age'],
    'email': ['email', 'mail', 'e-mail', 'courrier'],
    'cin': ['cin', 'cni', 'carte_identite', 'id'],
    'commentaire': ['commentaire', 'comment', 'note', 'observation'],
    'decision': ['decision', 'décision', 'statut_decision', 'result'],
    'cote': ['cote', 'côté', 'side', 'lateralite_cote'],
    'lateralite': ['lateralite', 'latéralité', 'laterality'],
    'enfants_scolarises': ['enfants_scolarises', 'scolarise', 'school', 'école']
  };

  // Fonction pour afficher les erreurs avec alert() standard
  const showValidationAlert = (items, type = 'error') => {
    if (!items || items.length === 0) return;
    
    const displayItems = Array.isArray(items) ? items : [items];
    const maxDisplay = 10;
    
    let alertTitle = type === 'error' ? 'ERREURS DÉTECTÉES' : 'AVERTISSEMENTS';
    let message = `${alertTitle}\n\n`;
    
    displayItems.slice(0, maxDisplay).forEach((item, index) => {
      const itemText = typeof item === 'string' ? item : JSON.stringify(item);
      message += `${index + 1}. ${itemText}\n`;
    });
    
    if (displayItems.length > maxDisplay) {
      message += `\n... et ${displayItems.length - maxDisplay} autres ${type === 'error' ? 'erreurs' : 'avertissements'}`;
    }
    
    alert(message);
  };

  // Fonction de sélection de fichier
  const handleFileSelect = useCallback((file) => {
    console.log('Sélection fichier:', file.name);

    // Réinitialiser les états
    setImportError(null);
    setImportValidation(null);
    setPreviewData(null);
    setShowPreview(false);
    setValidationDetails(null);

    // Validation du type de fichier
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const acceptedExtensions = ['xlsx', 'xls', 'csv'];
    
    if (!ACCEPTED_FILE_TYPES.includes(file.type) && !acceptedExtensions.includes(fileExtension)) {
      const errorMessage = `Type de fichier non supporté: ${file.type}. Utilisez Excel (.xlsx, .xls) ou CSV (.csv)`;
      setImportError(errorMessage);
      alert('ERREUR DE FICHIER\n\n' + errorMessage);
      return;
    }

    // Validation de la taille
    if (file.size > MAX_FILE_SIZE) {
      const errorMessage = `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)} MB). Taille maximale: 10 MB`;
      setImportError(errorMessage);
      alert('ERREUR DE TAILLE\n\n' + errorMessage);
      return;
    }

    // Validation du nom de fichier
    if (file.name.length > 255) {
      const errorMessage = 'Nom de fichier trop long (maximum 255 caractères)';
      setImportError(errorMessage);
      alert('ERREUR DE NOM\n\n' + errorMessage);
      return;
    }

    console.log('Validation fichier réussie');
    setImportFile(file);
    generatePreview(file);
  }, [setImportFile, setImportError, setImportValidation]);

  // Générer aperçu du fichier
  const generatePreview = useCallback(async (file) => {
    try {
      console.log('Génération aperçu');
      setImportProgress({ step: 'preview', message: 'Analyse du fichier en cours...' });

      const fileExtension = file.name.split('.').pop().toLowerCase();
      let data = [];

      if (['xlsx', 'xls'].includes(fileExtension)) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0 });
      } else if (fileExtension === 'csv') {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        data = lines.map(line => {
          return line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
        });
      }

      if (data.length === 0) {
        throw new Error('Le fichier semble vide ou illisible');
      }

      const headers = data[0] || [];
      const sampleRows = data.slice(1, 6);
      const normalizedHeaders = headers.map(header => header.toString().toLowerCase().trim());
      const detectedColumns = detectColumns(normalizedHeaders);
      
      const preview = {
        fileName: file.name,
        totalRows: data.length - 1,
        headers: headers,
        normalizedHeaders: normalizedHeaders,
        sampleRows: sampleRows,
        detectedColumns: detectedColumns,
        hasRequiredColumns: REQUIRED_COLUMNS.every(col => detectedColumns.found.includes(col)),
        missingColumns: REQUIRED_COLUMNS.filter(col => !detectedColumns.found.includes(col))
      };

      setPreviewData(preview);
      setImportProgress(null);

      // Alerter si des colonnes sont manquantes
      if (preview.missingColumns.length > 0) {
        alert(`COLONNES MANQUANTES\n\nLes colonnes suivantes sont obligatoires mais n'ont pas été trouvées:\n${preview.missingColumns.join(', ')}\n\nVeuillez vérifier votre fichier.`);
      }

    } catch (error) {
      console.error('Erreur génération aperçu:', error);
      const errorMessage = `Erreur lors de la lecture du fichier: ${error.message}`;
      setImportError(errorMessage);
      setImportProgress(null);
      alert('ERREUR DE LECTURE\n\n' + errorMessage);
    }
  }, [setImportProgress]);

  // Détecter les colonnes automatiquement
  const detectColumns = useCallback((normalizedHeaders) => {
    const found = [];
    const mapping = {};
    const unknown = [];

    normalizedHeaders.forEach((header, index) => {
      let matched = false;
      
      for (const [standardColumn, variants] of Object.entries(COLUMN_MAPPING)) {
        if (variants.includes(header)) {
          found.push(standardColumn);
          mapping[standardColumn] = index;
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        unknown.push({ header, index });
      }
    });

    return { found, mapping, unknown };
  }, []);

  // Gestion drag & drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  // Validation du fichier
  const validateFile = useCallback(async () => {
    if (!importFile) {
      const errorMessage = 'Veuillez sélectionner un fichier';
      setImportError(errorMessage);
      alert('FICHIER MANQUANT\n\n' + errorMessage);
      return;
    }

    if (!importCampagne) {
      const errorMessage = 'Veuillez sélectionner une campagne';
      setImportError(errorMessage);
      alert('CAMPAGNE MANQUANTE\n\n' + errorMessage);
      return;
    }

    try {
      console.log('Début validation fichier');
      setImportProgress({ step: 'validation', message: 'Validation des données en cours...' });
      setImportError(null);

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('campagne_id', parseInt(importCampagne).toString());

      const response = await upasAPI.validateImportFile(formData);

      if (response.data?.success) {
        const validation = response.data.data;
        setImportValidation(validation);
        setValidationDetails(validation);

        const hasErrors = validation.invalid_rows > 0;
        let progressMessage = hasErrors ? 
          `${validation.invalid_rows} erreurs détectées sur ${validation.valid_rows + validation.invalid_rows} lignes` :
          `Fichier validé avec succès - ${validation.valid_rows} lignes prêtes à importer`;

        setImportProgress({ 
          step: 'validated', 
          message: progressMessage,
          canImport: !hasErrors
        });

        // Afficher les résultats de validation avec alert
        if (hasErrors) {
          let alertMessage = `RÉSULTATS DE VALIDATION\n\n`;
          alertMessage += `✓ Lignes valides: ${validation.valid_rows}\n`;
          alertMessage += `✗ Lignes avec erreurs: ${validation.invalid_rows}\n`;
          alertMessage += `⚠ Avertissements: ${validation.warnings?.length || 0}\n\n`;
          
          if (validation.errors && validation.errors.length > 0) {
            alertMessage += `ERREURS DÉTECTÉES:\n`;
            validation.errors.slice(0, 5).forEach((error, index) => {
              alertMessage += `${index + 1}. ${error}\n`;
            });
            if (validation.errors.length > 5) {
              alertMessage += `... et ${validation.errors.length - 5} autres erreurs\n`;
            }
          }
          
          alert(alertMessage);
        } else {
          alert(`VALIDATION RÉUSSIE\n\n✓ ${validation.valid_rows} lignes prêtes à importer\n⚠ ${validation.warnings?.length || 0} avertissements`);
        }

        // Afficher les avertissements séparément si présents
        if (validation.warnings && validation.warnings.length > 0) {
          showValidationAlert(validation.warnings, 'warning');
        }

      } else {
        throw new Error(response.data?.message || 'Réponse de validation invalide');
      }

    } catch (err) {
      console.error('Erreur validation:', err);
      let userMessage = 'Erreur lors de la validation du fichier';
      
      if (err.response?.status === 422 && err.response.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat();
        userMessage = errorMessages.join(', ');
      } else if (err.response?.data?.message) {
        userMessage = err.response.data.message;
      } else if (err.message) {
        userMessage = err.message;
      }
      
      setImportError(userMessage);
      setImportProgress(null);
      setImportValidation(null);
      setValidationDetails(null);
      
      // Afficher l'erreur avec alert
      alert('ERREUR DE VALIDATION\n\n' + userMessage);
    }
  }, [importFile, importCampagne, setImportProgress, setImportValidation, setValidationDetails]);

  // Exécuter l'import
  const executeImport = useCallback(async (forceImport = false) => {
    if (!importFile || !importCampagne) {
      const errorMessage = 'Fichier et campagne requis';
      setImportError(errorMessage);
      alert('DONNÉES MANQUANTES\n\n' + errorMessage);
      return;
    }

    if (!importValidation && !forceImport) {
      const errorMessage = 'Veuillez d\'abord valider le fichier';
      setImportError(errorMessage);
      alert('VALIDATION REQUISE\n\n' + errorMessage);
      return;
    }

    const confirmMessage = forceImport 
      ? 'Êtes-vous sûr de vouloir forcer l\'import malgré les erreurs ?' 
      : `Confirmer l'import de ${importValidation?.valid_rows || 0} bénéficiaires ?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('Début import');
      setIsImporting(true);
      setImportProgress({ step: 'importing', message: 'Import des données en cours...' });
      setImportError(null);

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('campagne_id', parseInt(importCampagne).toString());
      formData.append('ignore_doublons', importSettings.ignoreDoublons ? 'true' : 'false');
      
      if (forceImport) {
        formData.append('force_import', 'true');
      }

      const response = await upasAPI.importBeneficiaires(formData);

      if (response.data?.success) {
        const importData = response.data.data;
        
        setImportProgress({ 
          step: 'completed', 
          message: `Import terminé avec succès: ${importData.imported_count || 0} bénéficiaires importés`,
          result: importData
        });

        // Afficher les résultats d'import avec alert
        let successMessage = `IMPORT TERMINÉ AVEC SUCCÈS\n\n`;
        successMessage += `✓ Bénéficiaires importés: ${importData.imported_count || 0}\n`;
        successMessage += `⊘ Lignes ignorées: ${importData.skipped_count || 0}\n`;
        successMessage += `✗ Erreurs: ${importData.error_count || 0}`;
        
        if (importData.errors && importData.errors.length > 0) {
          successMessage += `\n\nDétail des erreurs:\n`;
          importData.errors.slice(0, 3).forEach((error, index) => {
            successMessage += `${index + 1}. ${error}\n`;
          });
          if (importData.errors.length > 3) {
            successMessage += `... et ${importData.errors.length - 3} autres erreurs`;
          }
        }
        
        alert(successMessage);

        if (onImportSuccess && typeof onImportSuccess === 'function') {
          onImportSuccess(importData);
        }

        setTimeout(() => {
          if (onClose && typeof onClose === 'function') {
            onClose();
          }
        }, 3000);

      } else {
        throw new Error(response.data?.message || 'Import échoué');
      }

    } catch (err) {
      console.error('Erreur import:', err);
      let errorMessage = 'Erreur lors de l\'import';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat();
        errorMessage = errorMessages.join(', ');
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setImportError(errorMessage);
      setImportProgress(null);
      
      // Afficher l'erreur d'import avec alert
      alert('ERREUR D\'IMPORT\n\n' + errorMessage);
      
    } finally {
      setIsImporting(false);
    }
  }, [
    importFile, 
    importCampagne, 
    importValidation, 
    importSettings, 
    setIsImporting, 
    setImportProgress, 
    setImportError, 
    onImportSuccess, 
    onClose
  ]);

  // Télécharger template Excel
  const downloadTemplate = useCallback(async () => {
    try {
      if (!importCampagne) {
        const errorMessage = 'Veuillez d\'abord sélectionner une campagne';
        setImportError(errorMessage);
        alert('CAMPAGNE REQUISE\n\n' + errorMessage);
        return;
      }

      setImportProgress({ step: 'template', message: 'Génération du template...' });

      const response = await upasAPI.getImportTemplate(importCampagne);

      if (response.data?.success) {
        const templateData = response.data.data;
        
        const wb = XLSX.utils.book_new();
        const mainSheetData = [
          templateData.template.headers,
          ...templateData.template.exemples.slice(0, 3)
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(mainSheetData);
        ws['!cols'] = templateData.template.headers.map(() => ({ wch: 15 }));
        XLSX.utils.book_append_sheet(wb, ws, "Import Bénéficiaires");
        
        const instructions = [
          ['Instructions d\'Import - Système UPAS'],
          [''],
          ['COLONNES OBLIGATOIRES:'],
          ['• nom - Nom de famille du patient'],
          ['• prenom - Prénom du patient'],
          ['• sexe - M (masculin) ou F (féminin)'],
          ['• telephone - Numéro de téléphone (format: 06XXXXXXXX)'],
          ['• adresse - Adresse de résidence complète'],
          [''],
          ['COLONNES OPTIONNELLES:'],
          ['• date_naissance - Format: YYYY-MM-DD'],
          ['• email - Adresse électronique'],
          ['• cin - Carte d\'identité nationale'],
          ['• commentaire - Observations médicales'],
          ['• decision - Statut de la demande'],
          [''],
          ['RÈGLES DE VALIDATION:'],
          ['• Tous les champs obligatoires doivent être renseignés'],
          ['• Les téléphones doivent être uniques dans le système'],
          ['• Le sexe doit être exactement M ou F'],
          ['• Les dates au format ISO (YYYY-MM-DD)'],
          ['• Maximum 1000 lignes par fichier'],
          ['• Numéros de téléphone: 10 chiffres commençant par 06 ou 07'],
          [''],
          [`CAMPAGNE: ${templateData.campagne.nom}`],
          [`TYPE: ${templateData.campagne.type_assistance || 'Non défini'}`],
          [''],
          [`Généré le: ${new Date().toLocaleDateString('fr-FR')}`]
        ];
        
        const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
        wsInstructions['!cols'] = [{ wch: 60 }];
        XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
        
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `Template_UPAS_${templateData.campagne.nom.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;
        
        XLSX.writeFile(wb, fileName);
        setImportProgress(null);

        alert(`TEMPLATE TÉLÉCHARGÉ\n\nLe fichier template "${fileName}" a été téléchargé avec succès.\n\nVeuillez utiliser ce template pour formater vos données avant l'import.`);

      } else {
        throw new Error(response.data?.message || 'Erreur lors de la génération du template');
      }

    } catch (error) {
      console.error('Erreur téléchargement template:', error);
      const errorMessage = `Erreur lors du téléchargement: ${error.message}`;
      setImportError(errorMessage);
      setImportProgress(null);
      alert('ERREUR DE TÉLÉCHARGEMENT\n\n' + errorMessage);
    }
  }, [importCampagne, setImportProgress]);

  // Réinitialiser l'état d'import
  const resetImportState = useCallback(() => {
    setImportFile(null);
    setImportValidation(null);
    setImportError(null);
    setImportProgress(null);
    setValidationDetails(null);
    setPreviewData(null);
    setIsImporting(false);
  }, [
    setImportFile, 
    setImportValidation, 
    setImportError, 
    setImportProgress, 
    setValidationDetails, 
    setPreviewData, 
    setIsImporting
  ]);

  return (
    <>
      <style jsx>{`
        .medical-import-form {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .medical-header {
          background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%);
          color: white;
          padding: 24px 32px;
          text-align: center;
        }

        .medical-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .medical-header p {
          margin: 8px 0 0 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .form-content {
          padding: 32px;
        }

        .medical-step {
          margin-bottom: 32px;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          overflow: hidden;
        }

        .step-header {
          background: #f8f9fa;
          padding: 16px 24px;
          border-bottom: 1px solid #e1e5e9;
        }

        .step-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #2c5aa0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .step-number {
          background: #2c5aa0;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .step-content {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }

        .form-control {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: white;
        }

        .form-control:focus {
          outline: none;
          border-color: #2c5aa0;
          box-shadow: 0 0 0 3px rgba(44, 90, 160, 0.1);
        }

        .form-control:disabled {
          background: #f8f9fa;
          color: #6c757d;
        }

        .file-upload-zone {
          border: 2px dashed #c3c4c7;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
          background: #fafafa;
        }

        .file-upload-zone.drag-active {
          border-color: #2c5aa0;
          background: rgba(44, 90, 160, 0.05);
        }

        .file-upload-zone.has-file {
          border-color: #28a745;
          background: rgba(40, 167, 69, 0.05);
        }

        .upload-icon {
          font-size: 48px;
          margin-bottom: 16px;
          color: #6c757d;
        }

        .upload-text {
          font-size: 16px;
          color: #333;
          margin-bottom: 8px;
        }

        .upload-subtext {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 16px;
        }

        .file-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
        }

        .file-details h4 {
          margin: 0;
          font-size: 16px;
          color: #333;
        }

        .file-details p {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #6c757d;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #2c5aa0;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1e3a5f;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background: #218838;
        }

        .btn-warning {
          background: #ffc107;
          color: #212529;
        }

        .btn-warning:hover:not(:disabled) {
          background: #e0a800;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .btn-outline {
          background: transparent;
          border: 2px solid #e1e5e9;
          color: #333;
        }

        .btn-outline:hover:not(:disabled) {
          background: #f8f9fa;
        }

        .btn-sm {
          padding: 8px 16px;
          font-size: 12px;
        }

        .alert {
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 16px;
          border-left: 4px solid;
        }

        .alert-info {
          background: #e7f3ff;
          border-left-color: #2c5aa0;
          color: #1e3a5f;
        }

        .alert-success {
          background: #d4edda;
          border-left-color: #28a745;
          color: #155724;
        }

        .alert-warning {
          background: #fff3cd;
          border-left-color: #ffc107;
          color: #856404;
        }

        .alert-danger {
          background: #f8d7da;
          border-left-color: #dc3545;
          color: #721c24;
        }

        .preview-section {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          margin: 16px 0;
        }

        .preview-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin: 16px 0;
        }

        .stat-card {
          background: white;
          padding: 16px;
          border-radius: 6px;
          text-align: center;
          border: 1px solid #e1e5e9;
        }

        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #2c5aa0;
        }

        .stat-label {
          font-size: 12px;
          color: #6c757d;
          margin-top: 4px;
        }

        .column-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0;
        }

        .column-tag {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .column-tag.required {
          background: #d4edda;
          color: #155724;
          border: 1px solid #28a745;
        }

        .column-tag.optional {
          background: #e7f3ff;
          color: #1e3a5f;
          border: 1px solid #2c5aa0;
        }

        .column-tag.unknown {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffc107;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 12px;
        }

        .data-table th,
        .data-table td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid #e1e5e9;
        }

        .data-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #333;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin: 16px 0;
        }

        .option-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
        }

        .option-checkbox {
          width: 18px;
          height: 18px;
          accent-color: #2c5aa0;
        }

        .option-label {
          flex: 1;
        }

        .option-title {
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .option-description {
          font-size: 12px;
          color: #6c757d;
        }

        .actions-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin: 20px 0;
        }

        .actions-row .btn {
          flex: 1;
          min-width: 160px;
          justify-content: center;
        }

        .modal-footer {
          padding: 24px 32px;
          background: #f8f9fa;
          border-top: 1px solid #e1e5e9;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .progress-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #e7f3ff;
          border: 1px solid #2c5aa0;
          border-radius: 6px;
          margin: 16px 0;
        }

        .progress-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #2c5aa0;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .result-summary {
          background: white;
          border: 1px solid #28a745;
          border-radius: 6px;
          padding: 20px;
          margin: 16px 0;
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .result-icon {
          font-size: 24px;
        }

        .result-title {
          font-size: 18px;
          font-weight: 600;
          color: #155724;
        }

        .result-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }

        .result-stat {
          text-align: center;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .result-stat-number {
          font-size: 20px;
          font-weight: bold;
          color: #2c5aa0;
        }

        .result-stat-label {
          font-size: 12px;
          color: #6c757d;
          margin-top: 4px;
        }

        .instructions-panel {
          background: #f8f9fa;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          padding: 20px;
          margin: 16px 0;
        }

        .instructions-title {
          font-weight: 600;
          color: #2c5aa0;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .instructions-section {
          margin-bottom: 16px;
        }

        .instructions-section h4 {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .instructions-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .instructions-list li {
          padding: 4px 0;
          font-size: 14px;
          color: #555;
        }

        .instructions-list li::before {
          content: "•";
          color: #2c5aa0;
          margin-right: 8px;
          font-weight: bold;
        }

        .hidden {
          display: none;
        }

        @media (max-width: 768px) {
          .form-content {
            padding: 16px;
          }

          .medical-header {
            padding: 16px;
          }

          .step-content {
            padding: 16px;
          }

          .actions-row {
            flex-direction: column;
          }

          .actions-row .btn {
            min-width: auto;
          }

          .modal-footer {
            flex-direction: column;
          }

          .preview-stats {
            grid-template-columns: 1fr;
          }

          .options-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="medical-import-form">
        <div className="medical-header">
          <h2>Import de Bénéficiaires - Système UPAS</h2>
          <p>Importation sécurisée de données patients depuis fichiers Excel/CSV</p>
        </div>

        <div className="form-content">
          {/* Étape 1: Sélection de campagne */}
          <div className="medical-step">
            <div className="step-header">
              <h3>
                <span className="step-number">1</span>
                Sélection de la campagne médicale
              </h3>
            </div>
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">Campagne de destination</label>
                <select
                  value={importCampagne}
                  onChange={(e) => {
                    setImportCampagne(e.target.value);
                    if (importValidation) {
                      setImportValidation(null);
                      setValidationDetails(null);
                    }
                  }}
                  className="form-control"
                  required
                >
                  <option value="">Sélectionner une campagne...</option>
                  {formOptions.campagnes_actives?.map(campagne => (
                    <option key={campagne.id} value={campagne.id}>
                      {campagne.nom} ({campagne.type_assistance || 'Type non défini'})
                    </option>
                  ))}
                  {formOptions.campagnes_terminees?.map(campagne => (
                    <option key={campagne.id} value={campagne.id}>
                      {campagne.nom} (Terminée - {campagne.type_assistance || 'Type non défini'})
                    </option>
                  ))}
                </select>
                
                {importCampagne && (
                  <div className="alert alert-info" style={{marginTop: '12px'}}>
                    <strong>Campagne sélectionnée:</strong> {
                      formOptions.campagnes_actives?.find(c => c.id == importCampagne)?.nom || 
                      formOptions.campagnes_terminees?.find(c => c.id == importCampagne)?.nom || 
                      'Non trouvée'
                    }
                  </div>
                )}
              </div>
            </div>
          </div>

          

          {/* Étape 3: Sélection fichier */}
          {importCampagne && (
            <div className="medical-step">
              <div className="step-header">
                <h3>
                  <span className="step-number">3</span>
                  Sélection du fichier de données
                </h3>
              </div>
              <div className="step-content">
                <div
                  className={`file-upload-zone ${dragActive ? 'drag-active' : ''} ${importFile ? 'has-file' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-input"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  
                  {!importFile ? (
                    <div>
                      <div className="upload-icon">📁</div>
                      <div className="upload-text">Glissez votre fichier ici</div>
                      <div className="upload-subtext">ou</div>
                      <label htmlFor="file-input" className="btn btn-primary">
                        Parcourir le fichier
                      </label>
                      <div className="upload-subtext" style={{marginTop: '12px'}}>
                        Formats acceptés: Excel (.xlsx, .xls) ou CSV (.csv) - Maximum 10 MB
                      </div>
                    </div>
                  ) : (
                    <div className="file-info">
                      <div style={{fontSize: '32px'}}>📄</div>
                      <div className="file-details">
                        <h4>{importFile.name}</h4>
                        <p>{(importFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setImportFile(null);
                          setPreviewData(null);
                          setImportValidation(null);
                          setImportError(null);
                        }}
                        className="btn btn-sm btn-danger"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>

                {/* Aperçu du fichier */}
                {previewData && (
                  <div className="preview-section">
                    <h4>Aperçu des données</h4>
                    
                    <div className="preview-stats">
                      <div className="stat-card">
                        <div className="stat-number">{previewData.totalRows}</div>
                        <div className="stat-label">Lignes de données</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">{previewData.headers.length}</div>
                        <div className="stat-label">Colonnes détectées</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number" style={{
                          color: previewData.hasRequiredColumns ? '#28a745' : '#dc3545'
                        }}>
                          {previewData.hasRequiredColumns ? 'Valide' : 'Invalide'}
                        </div>
                        <div className="stat-label">Structure</div>
                      </div>
                    </div>

                    <div>
                      <h5>Colonnes détectées:</h5>
                      <div className="column-tags">
                        {previewData.headers.map((header, index) => (
                          <span
                            key={index}
                            className={`column-tag ${
                              REQUIRED_COLUMNS.includes(header.toLowerCase()) ? 'required' : 
                              OPTIONAL_COLUMNS.includes(header.toLowerCase()) ? 'optional' : 'unknown'
                            }`}
                          >
                            {header}
                          </span>
                        ))}
                      </div>
                    </div>

                    {previewData.sampleRows.length > 0 && (
                      <div>
                        <h5>Échantillon de données:</h5>
                        <div style={{overflowX: 'auto'}}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                {previewData.headers.slice(0, 6).map((header, index) => (
                                  <th key={index}>{header}</th>
                                ))}
                                {previewData.headers.length > 6 && <th>...</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.sampleRows.slice(0, 3).map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {row.slice(0, 6).map((cell, cellIndex) => (
                                    <td key={cellIndex}>
                                      {String(cell).length > 20 ? 
                                        String(cell).substring(0, 20) + '...' : 
                                        String(cell)
                                      }
                                    </td>
                                  ))}
                                  {row.length > 6 && <td>...</td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Étape 4: Options */}
          {importFile && previewData && (
            <div className="medical-step">
              <div className="step-header">
                <h3>
                  <span className="step-number">4</span>
                  Configuration de l'import
                </h3>
              </div>
              <div className="step-content">
                <div className="options-grid">
                  <div className="option-item">
                    <input
                      type="checkbox"
                      id="ignore-doublons"
                      className="option-checkbox"
                      checked={importSettings.ignoreDoublons}
                      onChange={(e) => setImportSettings(prev => ({
                        ...prev,
                        ignoreDoublons: e.target.checked
                      }))}
                    />
                    <label htmlFor="ignore-doublons" className="option-label">
                      <div className="option-title">Ignorer les doublons</div>
                      <div className="option-description">
                        Les patients avec un téléphone existant seront ignorés
                      </div>
                    </label>
                  </div>

                  <div className="option-item">
                    <input
                      type="checkbox"
                      id="validate-first"
                      className="option-checkbox"
                      checked={importSettings.validateFirst}
                      onChange={(e) => setImportSettings(prev => ({
                        ...prev,
                        validateFirst: e.target.checked
                      }))}
                    />
                    <label htmlFor="validate-first" className="option-label">
                      <div className="option-title">Validation préalable</div>
                      <div className="option-description">
                        Recommandé: vérifier les données avant l'import
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 5: Validation */}
          {importFile && previewData && importSettings.validateFirst && (
            <div className="medical-step">
              <div className="step-header">
                <h3>
                  <span className="step-number">5</span>
                  Validation des données
                </h3>
              </div>
              <div className="step-content">
                <div className="actions-row">
                  <button
                    type="button"
                    onClick={validateFile}
                    disabled={!importFile || !importCampagne || isImporting || importProgress?.step === 'validation'}
                    className="btn btn-warning"
                  >
                    {importProgress?.step === 'validation' ? (
                      <>
                        <div className="progress-spinner"></div>
                        Validation en cours...
                      </>
                    ) : (
                      'Valider le fichier'
                    )}
                  </button>
                </div>

                {/* Résultats de validation simplifiés */}
                {validationDetails && (
                  <div className="preview-section">
                    <h5>Résultats de la validation (détails affichés via popup):</h5>
                    <div className="preview-stats">
                      <div className="stat-card">
                        <div className="stat-number" style={{color: '#28a745'}}>
                          {validationDetails.valid_rows || 0}
                        </div>
                        <div className="stat-label">Lignes valides</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number" style={{color: '#dc3545'}}>
                          {validationDetails.invalid_rows || 0}
                        </div>
                        <div className="stat-label">Lignes avec erreurs</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number" style={{color: '#ffc107'}}>
                          {validationDetails.warnings?.length || 0}
                        </div>
                        <div className="stat-label">Avertissements</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Étape 6: Import */}
          {importFile && previewData && (!importSettings.validateFirst || importValidation) && (
            <div className="medical-step">
              <div className="step-header">
                <h3>
                  <span className="step-number">6</span>
                  Exécution de l'import
                </h3>
              </div>
              <div className="step-content">
                <div className="actions-row">
                  <button
                    type="button"
                    onClick={() => executeImport(false)}
                    disabled={
                      !importFile || 
                      !importCampagne || 
                      isImporting || 
                      (importSettings.validateFirst && !importValidation) ||
                      (importValidation && importValidation.invalid_rows > 0 && !importSettings.forceImport)
                    }
                    className="btn btn-success"
                  >
                    {isImporting ? (
                      <>
                        <div className="progress-spinner"></div>
                        Import en cours...
                      </>
                    ) : (
                      `Lancer l'import (${importValidation?.valid_rows || previewData?.totalRows || 0} lignes)`
                    )}
                  </button>

                  {importValidation && importValidation.invalid_rows > 0 && (
                    <button
                      type="button"
                      onClick={() => executeImport(true)}
                      disabled={!importFile || !importCampagne || isImporting}
                      className="btn btn-warning"
                    >
                      {isImporting ? (
                        <>
                          <div className="progress-spinner"></div>
                          Import forcé...
                        </>
                      ) : (
                        'Forcer l\'import (ignorer erreurs)'
                      )}
                    </button>
                  )}
                </div>

                <div className="alert alert-info" style={{marginTop: '16px'}}>
                  <strong>Information:</strong> L'import normal ne traite que les lignes valides. 
                  L'import forcé tente d'importer toutes les lignes possibles en ignorant les erreurs.
                  Les erreurs détaillées s'affichent dans des popups pour une meilleure lisibilité.
                </div>
              </div>
            </div>
          )}

          {/* Messages d'état */}
          {importProgress && (
            <div className="progress-indicator">
              {importProgress.step === 'importing' && <div className="progress-spinner"></div>}
              <span>{importProgress.message}</span>
            </div>
          )}

          {importProgress?.result && (
            <div className="result-summary">
              <div className="result-header">
                <div className="result-icon">✅</div>
                <div className="result-title">Import terminé avec succès (détails dans popup)</div>
              </div>
              <div className="result-stats">
                <div className="result-stat">
                  <div className="result-stat-number">{importProgress.result.imported_count}</div>
                  <div className="result-stat-label">Importés</div>
                </div>
                <div className="result-stat">
                  <div className="result-stat-number">{importProgress.result.skipped_count}</div>
                  <div className="result-stat-label">Ignorés</div>
                </div>
                <div className="result-stat">
                  <div className="result-stat-number">{importProgress.result.error_count}</div>
                  <div className="result-stat-label">Erreurs</div>
                </div>
              </div>
            </div>
          )}

          {/* Messages d'erreur simplifiés */}
          {importError && (
            <div className="alert alert-danger">
              <strong>Erreur:</strong> {importError} (Détails affichés via popup)
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={resetImportState}
            className="btn btn-outline"
            disabled={isImporting}
          >
            Réinitialiser
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isImporting}
          >
            {isImporting ? 'Fermer après import...' : 'Fermer'}
          </button>
        </div>
      </div>
    </>
  );
};

export default ImportExcelForm;