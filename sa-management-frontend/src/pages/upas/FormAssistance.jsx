import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Alert,
  Paper,
  Autocomplete,
  InputAdornment,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Save,
  Cancel,
  Person,
  MedicalServices,
  AttachMoney,
  CalendarToday,
  PriorityHigh,
  Info,
  Refresh,
  Schedule,
  Assignment,
  PersonPin
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { addDays, format } from 'date-fns';
import axiosClient from '../../services/axiosClient';

const SimpleAssistanceForm = ({ 
  assistance = null, 
  onSubmit, 
  onCancel 
}) => {
  // État des données de référence
  const [referenceData, setReferenceData] = useState({
    types_assistance: [],
    etat_dones: [],
    nature_dones: [],
    situations: [],
    beneficiaires: [],
    details_type_assistance: []
  });

  const [loadingData, setLoadingData] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingDetailsType, setLoadingDetailsType] = useState(false);
  const [errors, setErrors] = useState({});
  const [dataErrors, setDataErrors] = useState({});

  // État du formulaire - CORRIGÉ pour correspondre aux attentes du serveur
  const [formData, setFormData] = useState({
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
    // CHAMPS PRÊT CORRIGÉS - utiliser les noms exacts attendus par le serveur
    duree_utilisation: '', // Au lieu de 'duree'
    date_retour_prevue: null,
    est_pret: false, // Au lieu de 'est_pret_temporaire'
    retour_effectue: false
  });

  // État pour savoir si on doit afficher les champs de prêt
  const [showDureeFields, setShowDureeFields] = useState(false);
  const [selectedNatureDon, setSelectedNatureDon] = useState(null);

  // Charger les données de référence au montage
  useEffect(() => {
    loadAllReferenceData();
  }, []);

  // Charger les détails quand le type d'assistance change
  useEffect(() => {
    if (formData.type_assistance_id) {
      loadDetailsTypeAssistance(formData.type_assistance_id);
    } else {
      setReferenceData(prev => ({ ...prev, details_type_assistance: [] }));
      setFormData(prev => ({ ...prev, details_type_assistance_id: '' }));
    }
  }, [formData.type_assistance_id]);

  // CORRIGÉ: Surveiller les changements de nature_done_id
  useEffect(() => {
    const selectedNature = referenceData.nature_dones.find(
      nature => nature.id == formData.nature_done_id
    );
    
    if (selectedNature) {
      setSelectedNatureDon(selectedNature);
      
      const libelleNature = selectedNature.libelle?.toLowerCase() || '';
      
      // Détection des prêts
      const shouldShowDuree = 
        libelleNature.includes('prêt') || 
        libelleNature.includes('pret') ||
        libelleNature.includes('durée') ||
        libelleNature.includes('duree') ||
        libelleNature.includes('temporaire') ||
        libelleNature.includes('retour') ||
        (selectedNature.duree && selectedNature.duree > 0);
      
      console.log('🔍 Analyse nature sélectionnée:', {
        id: selectedNature.id,
        libelle: selectedNature.libelle,
        dureeFromModel: selectedNature.duree,
        shouldShowDuree,
        libelleNature
      });
      
      setShowDureeFields(shouldShowDuree);
      
      // CORRIGÉ: Pré-remplir avec les bons noms de champs
      setFormData(prev => ({
        ...prev,
        est_pret: shouldShowDuree,
        duree_utilisation: shouldShowDuree ? (selectedNature.duree || prev.duree_utilisation) : '',
        retour_effectue: false,
        // Si ce n'est plus un prêt, vider les champs associés
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

  // CORRIGÉ: Synchroniser durée et date de retour automatiquement
  useEffect(() => {
    if (formData.duree_utilisation && formData.date_assistance && showDureeFields) {
      const dureeJours = parseInt(formData.duree_utilisation);
      if (!isNaN(dureeJours) && dureeJours > 0) {
        const dateRetour = addDays(new Date(formData.date_assistance), dureeJours);
        
        console.log('🔄 Calcul automatique date retour:', {
          duree: dureeJours,
          dateDebut: format(formData.date_assistance, 'dd/MM/yyyy'),
          dateRetour: format(dateRetour, 'dd/MM/yyyy')
        });
        
        setFormData(prev => ({
          ...prev,
          date_retour_prevue: dateRetour
        }));
      }
    }
  }, [formData.duree_utilisation, formData.date_assistance, showDureeFields]);

  // Charger les données du formulaire si modification
  useEffect(() => {
    if (assistance) {
      console.log('📝 Chargement assistance existante:', assistance);
      
      // CORRIGÉ: Charger la durée depuis les différentes sources possibles
      const dureeFromData = assistance.duree_utilisation || 
                            assistance.duree_pret || 
                            assistance.duree || 
                            assistance.duree_jours || 
                            '';
      
      const dateRetourFromData = assistance.date_retour_prevue ? new Date(assistance.date_retour_prevue) :
                                assistance.date_fin_prevue ? new Date(assistance.date_fin_prevue) :
                                assistance.date_retour ? new Date(assistance.date_retour) :
                                null;
      
      setFormData({
        type_assistance_id: assistance.type_assistance_id || '',
        details_type_assistance_id: assistance.details_type_assistance_id || '',
        beneficiaire_id: assistance.beneficiaire_id || '',
        etat_don_id: assistance.etat_don_id || '',
        situation_id: assistance.situation_id || '',
        nature_done_id: assistance.nature_done_id || '',
        date_assistance: assistance.date_assistance ? new Date(assistance.date_assistance) : new Date(),
        montant: assistance.montant || '',
        priorite: assistance.priorite || 'Normale',
        moi_meme: assistance.moi_meme || false,
        observations: assistance.observations || '',
        commentaire_interne: assistance.commentaire_interne || '',
        duree_utilisation: dureeFromData,
        date_retour_prevue: dateRetourFromData,
        est_pret: Boolean(dureeFromData || dateRetourFromData),
        retour_effectue: assistance.retour_effectue || false
      });
      
      // Détecter si c'était un prêt
      if (dureeFromData || dateRetourFromData) {
        setShowDureeFields(true);
      }
    }
  }, [assistance]);

  // Fonction pour charger les natures de don avec gestion des prêts
  const loadNatureDones = async () => {
    try {
      console.log('🔄 Chargement natures done...');
      
      const routesToTry = [
        '/admin/dictionary/nature-dones',
        '/upas/form-options',
        '/form-options'
      ];

      for (const route of routesToTry) {
        try {
          console.log(`🔍 Essai route natures: ${route}`);
          
          const response = await axiosClient.get(route);
          let natureDones = [];

          if (route.includes('form-options')) {
            if (response.data?.success && response.data.data?.nature_dones) {
              natureDones = response.data.data.nature_dones;
            } else if (response.data?.data?.nature_dones) {
              natureDones = response.data.data.nature_dones;
            } else if (response.data?.nature_dones) {
              natureDones = response.data.nature_dones;
            }
          } else {
            if (response.data?.success && Array.isArray(response.data?.data)) {
              natureDones = response.data.data;
            } else if (Array.isArray(response.data?.data)) {
              natureDones = response.data.data;
            } else if (Array.isArray(response.data)) {
              natureDones = response.data;
            }
          }

          if (Array.isArray(natureDones) && natureDones.length > 0) {
            // Traitement des nature_dones avec détection automatique des prêts
            const processedNatureDones = natureDones.map(nature => ({
              ...nature,
              duree: nature.duree || null,
              // Calculer automatiquement si c'est un prêt
              is_loan: Boolean(
                nature.duree || 
                nature.libelle?.toLowerCase().includes('prêt') ||
                nature.libelle?.toLowerCase().includes('pret') ||
                nature.libelle?.toLowerCase().includes('temporaire') ||
                nature.libelle?.toLowerCase().includes('durée')
              )
            }));
            
            setReferenceData(prev => ({ ...prev, nature_dones: processedNatureDones }));
            console.log(`✅ Natures done chargées via ${route}:`, processedNatureDones.length);
            console.log('🔍 Natures avec durée:', processedNatureDones.filter(n => n.duree).length);
            return processedNatureDones;
          }
        } catch (error) {
          console.warn(`⚠️ Route ${route} échouée:`, error.message);
        }
      }

      // Données par défaut avec gestion des prêts
      const defaultNatureDones = [
        { id: 1, libelle: 'Don individuel', duree: null, is_loan: false },
        { id: 2, libelle: 'Don d\'entreprise', duree: null, is_loan: false },
        { id: 3, libelle: 'Don d\'association', duree: null, is_loan: false },
        { id: 4, libelle: 'Don gouvernemental', duree: null, is_loan: false },
        { id: 5, libelle: 'Prêt pour une durée déterminée', duree: 30, is_loan: true },
        { id: 6, libelle: 'Prêt temporaire avec retour', duree: 60, is_loan: true },
        { id: 7, libelle: 'Don en nature', duree: null, is_loan: false },
        { id: 8, libelle: 'Don financier', duree: null, is_loan: false },
        { id: 9, libelle: 'Aide d\'urgence', duree: null, is_loan: false },
        { id: 10, libelle: 'Prêt d\'équipement médical', duree: 90, is_loan: true }
      ];
      
      setReferenceData(prev => ({ ...prev, nature_dones: defaultNatureDones }));
      setDataErrors(prev => ({ ...prev, nature_dones: 'Données par défaut utilisées - Vérifiez la base de données' }));
      console.log('⚠️ Utilisation des données par défaut pour les natures done');

    } catch (error) {
      console.error('❌ Erreur critique chargement natures done:', error);
      setDataErrors(prev => ({ ...prev, nature_dones: 'Erreur critique: ' + error.message }));
    }
  };

  // Autres fonctions de chargement (inchangées)
  const loadAllReferenceData = async () => {
    setLoadingData(true);
    setDataErrors({});

    console.log('🔄 Début du chargement des données de référence...');

    try {
      const [
        typesResult,
        beneficiairesResult, 
        etatDonesResult,
        natureDonesResult,
        situationsResult
      ] = await Promise.allSettled([
        loadTypesAssistance(),
        loadBeneficiaires(),
        loadEtatDones(),
        loadNatureDones(),
        loadSituations()
      ]);

      console.log('✅ Chargement des données de référence terminé');
    } catch (error) {
      console.error('❌ Erreur globale chargement données:', error);
      setDataErrors(prev => ({ ...prev, global: 'Erreur générale lors du chargement' }));
    } finally {
      setLoadingData(false);
    }
  };

  const loadTypesAssistance = async () => {
    try {
      console.log('🔄 Chargement types assistance...');
      
      const routes = [
        '/upas/types-assistance',
        '/admin/dictionary/type-assistances',
        '/upas/form-options'
      ];

      for (const route of routes) {
        try {
          console.log(`🔍 Essai route types: ${route}`);
          const response = await axiosClient.get(route);
          
          let types = [];
          
          if (route.includes('form-options')) {
            if (response.data?.success && response.data.data?.types_assistance) {
              types = response.data.data.types_assistance;
            } else if (response.data?.data?.types_assistance) {
              types = response.data.data.types_assistance;
            } else if (response.data?.types_assistance) {
              types = response.data.types_assistance;
            }
          } else {
            if (response.data?.success && Array.isArray(response.data?.data)) {
              types = response.data.data;
            } else if (Array.isArray(response.data?.data)) {
              types = response.data.data;
            } else if (Array.isArray(response.data)) {
              types = response.data;
            }
          }
          
          if (Array.isArray(types) && types.length > 0) {
            setReferenceData(prev => ({ ...prev, types_assistance: types }));
            console.log(`✅ Types assistance chargés via ${route}:`, types.length);
            return types;
          }
        } catch (error) {
          console.warn(`⚠️ Route ${route} échouée:`, error.message);
        }
      }
      
      const defaultTypes = [
        { id: 1, libelle: 'Assistance Médicale' },
        { id: 2, libelle: 'Assistance Matérielle' },
        { id: 3, libelle: 'Assistance Financière' },
        { id: 4, libelle: 'Assistance Sociale' },
        { id: 5, libelle: 'Appareillage Auditif' },
        { id: 6, libelle: 'Lunettes de Vue' }
      ];
      
      setReferenceData(prev => ({ ...prev, types_assistance: defaultTypes }));
      setDataErrors(prev => ({ ...prev, types_assistance: 'Données par défaut utilisées' }));
      console.log('⚠️ Utilisation des données par défaut pour les types assistance');
      
    } catch (error) {
      console.error('❌ Erreur critique chargement types assistance:', error);
      setDataErrors(prev => ({ ...prev, types_assistance: 'Erreur critique: ' + error.message }));
    }
  };

  const loadEtatDones = async () => {
    try {
      console.log('🔄 Chargement états done...');
      
      const routesToTry = [
        '/admin/dictionary/etat-dones',
        '/upas/form-options',
        '/form-options'
      ];

      for (const route of routesToTry) {
        try {
          console.log(`🔍 Essai route états: ${route}`);
          
          const response = await axiosClient.get(route);
          let etatDones = [];

          if (route.includes('form-options')) {
            if (response.data?.success && response.data.data?.etat_dones) {
              etatDones = response.data.data.etat_dones;
            } else if (response.data?.data?.etat_dones) {
              etatDones = response.data.data.etat_dones;
            } else if (response.data?.etat_dones) {
              etatDones = response.data.etat_dones;
            }
          } else {
            if (response.data?.success && Array.isArray(response.data?.data)) {
              etatDones = response.data.data;
            } else if (Array.isArray(response.data?.data)) {
              etatDones = response.data.data;
            } else if (Array.isArray(response.data)) {
              etatDones = response.data;
            }
          }

          if (Array.isArray(etatDones) && etatDones.length > 0) {
            setReferenceData(prev => ({ ...prev, etat_dones: etatDones }));
            console.log(`✅ États done chargés via ${route}:`, etatDones.length);
            return etatDones;
          }
        } catch (error) {
          console.warn(`⚠️ Route ${route} échouée:`, error.message);
        }
      }

      const defaultEtatDones = [
        { id: 1, libelle: 'Neuf' },
        { id: 2, libelle: 'Très bon état' },
        { id: 3, libelle: 'Bon état' },
        { id: 4, libelle: 'État moyen' },
        { id: 5, libelle: 'Usagé' },
        { id: 6, libelle: 'À réparer' },
        { id: 7, libelle: 'Hors service' }
      ];
      
      setReferenceData(prev => ({ ...prev, etat_dones: defaultEtatDones }));
      setDataErrors(prev => ({ ...prev, etat_dones: 'Données par défaut utilisées - Vérifiez la base de données' }));
      console.log('⚠️ Utilisation des données par défaut pour les états done');

    } catch (error) {
      console.error('❌ Erreur critique chargement états done:', error);
      setDataErrors(prev => ({ ...prev, etat_dones: 'Erreur critique: ' + error.message }));
    }
  };

  const loadSituations = async () => {
    try {
      console.log('🔄 Chargement situations...');
      
      const routes = [
        '/admin/dictionary/situations',
        '/upas/form-options',
        '/form-options'
      ];

      for (const route of routes) {
        try {
          console.log(`🔍 Essai route situations: ${route}`);
          const response = await axiosClient.get(route);
          
          let situations = [];
          
          if (route.includes('form-options')) {
            if (response.data?.success && response.data.data?.situations) {
              situations = response.data.data.situations;
            } else if (response.data?.data?.situations) {
              situations = response.data.data.situations;
            } else if (response.data?.situations) {
              situations = response.data.situations;
            }
          } else {
            if (response.data?.success && Array.isArray(response.data?.data)) {
              situations = response.data.data;
            } else if (Array.isArray(response.data?.data)) {
              situations = response.data.data;
            } else if (Array.isArray(response.data)) {
              situations = response.data;
            }
          }
          
          if (Array.isArray(situations) && situations.length > 0) {
            setReferenceData(prev => ({ ...prev, situations }));
            console.log(`✅ Situations chargées via ${route}:`, situations.length);
            return situations;
          }
        } catch (error) {
          console.warn(`⚠️ Route ${route} échouée:`, error.message);
        }
      }
      
      const defaultSituations = [
        { id: 1, libelle: 'Situation précaire' },
        { id: 2, libelle: 'Famille nombreuse' },
        { id: 3, libelle: 'Personne âgée' },
        { id: 4, libelle: 'Personne handicapée' },
        { id: 5, libelle: 'Situation d\'urgence' },
        { id: 6, libelle: 'Orphelin(e)' },
        { id: 7, libelle: 'Veuf/Veuve' },
        { id: 8, libelle: 'Sans emploi' },
        { id: 9, libelle: 'Mère célibataire' },
        { id: 10, libelle: 'Étudiant(e)' }
      ];
      
      setReferenceData(prev => ({ ...prev, situations: defaultSituations }));
      setDataErrors(prev => ({ ...prev, situations: 'Données par défaut utilisées - Vérifiez la base de données' }));
      console.log('⚠️ Utilisation des données par défaut pour les situations');
      
    } catch (error) {
      console.error('❌ Erreur critique chargement situations:', error);
      setDataErrors(prev => ({ ...prev, situations: 'Erreur critique: ' + error.message }));
    }
  };

  const loadBeneficiaires = async () => {
    try {
      console.log('🔄 Chargement bénéficiaires...');
      
      const routes = [
        '/upas/beneficiaires?per_page=1000',
        '/upas/beneficiaires'
      ];

      for (const route of routes) {
        try {
          console.log(`🔍 Essai route bénéficiaires: ${route}`);
          const response = await axiosClient.get(route);
          
          let beneficiaires = [];
          
          if (response.data?.data && Array.isArray(response.data.data)) {
            beneficiaires = response.data.data;
          } else if (response.data?.success && Array.isArray(response.data.data)) {
            beneficiaires = response.data.data;
          } else if (Array.isArray(response.data)) {
            beneficiaires = response.data;
          }
          
          if (Array.isArray(beneficiaires)) {
            setReferenceData(prev => ({ ...prev, beneficiaires }));
            console.log(`✅ Bénéficiaires chargés via ${route}:`, beneficiaires.length);
            return beneficiaires;
          }
        } catch (error) {
          console.warn(`⚠️ Route ${route} échouée:`, error.message);
        }
      }
      
      setReferenceData(prev => ({ ...prev, beneficiaires: [] }));
      setDataErrors(prev => ({ ...prev, beneficiaires: 'Aucun bénéficiaire trouvé - Vérifiez la base de données' }));
      console.log('⚠️ Aucun bénéficiaire chargé');
      
    } catch (error) {
      console.error('❌ Erreur critique chargement bénéficiaires:', error);
      setDataErrors(prev => ({ ...prev, beneficiaires: 'Erreur critique: ' + error.message }));
    }
  };

  const loadDetailsTypeAssistance = async (typeAssistanceId) => {
    try {
      setLoadingDetailsType(true);
      console.log(`🔄 Chargement détails pour type assistance ${typeAssistanceId}...`);

      const routesToTry = [
        `/admin/dictionary/details-type-assistances/type/${typeAssistanceId}`,
        `/admin/dictionary/details-type-assistances?type_assistance_id=${typeAssistanceId}`,
        `/upas/details-type-assistances/type/${typeAssistanceId}`,
        `/upas/details-type-assistances?type_assistance_id=${typeAssistanceId}`
      ];

      let detailsLoaded = false;

      for (const route of routesToTry) {
        try {
          console.log(`🔍 Essai route détails: ${route}`);
          const response = await axiosClient.get(route);
          
          let details = [];
          
          if (response.data?.success && Array.isArray(response.data?.data)) {
            details = response.data.data;
          } else if (Array.isArray(response.data?.data)) {
            details = response.data.data;
          } else if (Array.isArray(response.data)) {
            details = response.data;
          } else if (response.data?.success && response.data?.details) {
            details = response.data.details;
          }
          
          details = details.filter(detail => 
            !detail.date_suppression && 
            detail.type_assistance_id == typeAssistanceId
          );
          
          console.log(`✅ Détails trouvés via ${route}:`, details.length, 'détails');
          
          setReferenceData(prev => ({ ...prev, details_type_assistance: details }));
          console.log(`✅ Détails type assistance chargés:`, details.length);
          detailsLoaded = true;
          
          setDataErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.details_type_assistance;
            return newErrors;
          });
          
          break;
          
        } catch (error) {
          console.warn(`⚠️ Route ${route} échouée:`, error.response?.status, error.message);
          
          if (error.response?.status === 404) {
            console.log(`ℹ️ Pas de détails disponibles pour le type ${typeAssistanceId}`);
            setReferenceData(prev => ({ ...prev, details_type_assistance: [] }));
            setDataErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.details_type_assistance;
              return newErrors;
            });
            detailsLoaded = true;
            break;
          }
        }
      }

      if (!detailsLoaded) {
        console.log('⚠️ Aucune route de détails accessible, utilisation de données par défaut');
        
        const defaultDetailsByType = {
          1: [
            { id: 101, libelle: 'Consultation générale', type_assistance_id: 1, description: 'Consultation médicale générale' },
            { id: 102, libelle: 'Consultation spécialisée', type_assistance_id: 1, description: 'Consultation chez un spécialiste' },
            { id: 103, libelle: 'Analyses médicales', type_assistance_id: 1, description: 'Analyses de laboratoire' },
            { id: 104, libelle: 'Radiologie', type_assistance_id: 1, description: 'Examens radiologiques' },
            { id: 105, libelle: 'Médicaments', type_assistance_id: 1, description: 'Prise en charge médicaments' }
          ],
          2: [
            { id: 201, libelle: 'Équipement médical', type_assistance_id: 2, description: 'Matériel médical divers' },
            { id: 202, libelle: 'Matériel de mobilité', type_assistance_id: 2, description: 'Fauteuils roulants, cannes...' },
            { id: 203, libelle: 'Prothèses', type_assistance_id: 2, description: 'Prothèses diverses' },
            { id: 204, libelle: 'Orthèses', type_assistance_id: 2, description: 'Orthèses et attelles' }
          ],
          3: [
            { id: 301, libelle: 'Aide financière directe', type_assistance_id: 3, description: 'Aide financière directe' },
            { id: 302, libelle: 'Prise en charge frais médicaux', type_assistance_id: 3, description: 'Paiement frais médicaux' },
            { id: 303, libelle: 'Aide transport', type_assistance_id: 3, description: 'Frais de transport' }
          ],
          4: [
            { id: 401, libelle: 'Accompagnement social', type_assistance_id: 4, description: 'Suivi social personnalisé' },
            { id: 402, libelle: 'Aide administrative', type_assistance_id: 4, description: 'Aide démarches administratives' },
            { id: 403, libelle: 'Orientation', type_assistance_id: 4, description: 'Orientation vers services appropriés' }
          ],
          5: [
            { id: 501, libelle: 'Appareil auditif contour d\'oreille', type_assistance_id: 5, description: 'Appareil externe classique' },
            { id: 502, libelle: 'Appareil auditif intra-auriculaire', type_assistance_id: 5, description: 'Appareil discret dans l\'oreille' },
            { id: 503, libelle: 'Amplificateur de son', type_assistance_id: 5, description: 'Amplificateur simple' },
            { id: 504, libelle: 'Accessoires auditifs', type_assistance_id: 5, description: 'Piles, écouteurs...' },
            { id: 505, libelle: 'Entretien appareil auditif', type_assistance_id: 5, description: 'Maintenance et réparation' }
          ],
          6: [
            { id: 601, libelle: 'Lunettes de vue simple', type_assistance_id: 6, description: 'Verres correcteurs simples' },
            { id: 602, libelle: 'Lunettes de vue progressive', type_assistance_id: 6, description: 'Verres progressifs' },
            { id: 603, libelle: 'Lunettes de lecture', type_assistance_id: 6, description: 'Lunettes loupe pour lecture' },
            { id: 604, libelle: 'Lunettes de protection', type_assistance_id: 6, description: 'Verres de sécurité' },
            { id: 605, libelle: 'Accessoires optiques', type_assistance_id: 6, description: 'Étuis, produits nettoyage...' }
          ]
        };
        
        const defaultDetails = defaultDetailsByType[typeAssistanceId] || [];
        setReferenceData(prev => ({ ...prev, details_type_assistance: defaultDetails }));
        
        if (defaultDetails.length > 0) {
          setDataErrors(prev => ({ 
            ...prev, 
            details_type_assistance: `Données par défaut utilisées (${defaultDetails.length} éléments) - Vérifiez la base de données` 
          }));
        } else {
          setDataErrors(prev => ({ 
            ...prev, 
            details_type_assistance: 'Aucun détail disponible pour ce type d\'assistance' 
          }));
        }
      }

    } catch (error) {
      console.error('❌ Erreur chargement détails type assistance:', error);
      setReferenceData(prev => ({ ...prev, details_type_assistance: [] }));
      setDataErrors(prev => ({ 
        ...prev, 
        details_type_assistance: 'Erreur chargement détails: ' + error.message 
      }));
    } finally {
      setLoadingDetailsType(false);
    }
  };

  // Gérer les changements de champs
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Supprimer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // CORRIGÉ: Validation du formulaire avec support des prêts
  const validateForm = () => {
    const newErrors = {};

    if (!formData.type_assistance_id) {
      newErrors.type_assistance_id = 'Le type d\'assistance est obligatoire';
    }

    if (!formData.beneficiaire_id) {
      newErrors.beneficiaire_id = 'Le bénéficiaire est obligatoire';
    }

    if (!formData.etat_don_id) {
      newErrors.etat_don_id = 'L\'état du don est obligatoire';
    }

    if (!formData.nature_done_id) {
      newErrors.nature_done_id = 'La nature du don est obligatoire';
    }

    if (!formData.date_assistance) {
      newErrors.date_assistance = 'La date d\'assistance est obligatoire';
    }

    if (!formData.priorite) {
      newErrors.priorite = 'La priorité est obligatoire';
    }

    if (formData.montant && (isNaN(formData.montant) || parseFloat(formData.montant) < 0)) {
      newErrors.montant = 'Le montant doit être un nombre positif';
    }

    // CORRIGÉ: Validation spécifique pour les prêts
    if (showDureeFields && formData.est_pret) {
      if (!formData.duree_utilisation) {
        newErrors.duree_utilisation = 'La durée d\'utilisation est obligatoire pour un prêt';
      } else if (isNaN(formData.duree_utilisation) || parseInt(formData.duree_utilisation) <= 0) {
        newErrors.duree_utilisation = 'La durée doit être un nombre positif de jours';
      } else if (parseInt(formData.duree_utilisation) > 365) {
        newErrors.duree_utilisation = 'La durée ne peut pas dépasser 365 jours';
      }

      if (!formData.date_retour_prevue) {
        newErrors.date_retour_prevue = 'La date de retour prévue est obligatoire pour un prêt';
      } else {
        const dateRetour = new Date(formData.date_retour_prevue);
        const dateDebut = new Date(formData.date_assistance);
        
        if (dateRetour <= dateDebut) {
          newErrors.date_retour_prevue = 'La date de retour doit être postérieure à la date d\'assistance';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // CORRIGÉ: Soumettre le formulaire avec les bons noms de champs
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      console.warn('❌ Validation échouée:', errors);
      return;
    }

    try {
      setLoadingSubmit(true);

      // CORRIGÉ: Préparation des données avec les noms de champs attendus par le serveur
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
        
        // CORRIGÉ: Champs de prêt avec les bons noms
        est_pret: Boolean(formData.est_pret && showDureeFields),
        duree_utilisation: formData.duree_utilisation && showDureeFields ? parseInt(formData.duree_utilisation) : null,
        date_retour_prevue: formData.date_retour_prevue && showDureeFields ? 
          formData.date_retour_prevue.toISOString().split('T')[0] : null,
        retour_effectue: Boolean(formData.retour_effectue)
      };

      // Nettoyer les valeurs null/undefined pour éviter les erreurs de validation
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === undefined) {
          submitData[key] = null;
        }
      });

      console.log('📤 Données soumises avec champs corrects:', submitData);

      await onSubmit(submitData);
      
      console.log('✅ Assistance soumise avec succès');
      
    } catch (error) {
      console.error('❌ Erreur soumission:', error);
      
      // Gérer les erreurs de validation du serveur
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        const newErrors = {};
        
        Object.keys(serverErrors).forEach(field => {
          if (Array.isArray(serverErrors[field])) {
            newErrors[field] = serverErrors[field][0];
          } else {
            newErrors[field] = serverErrors[field];
          }
        });
        
        setErrors(prev => ({ ...prev, ...newErrors }));
        console.error('❌ Erreurs de validation serveur:', serverErrors);
      } else {
        setErrors(prev => ({ ...prev, submit: error.message }));
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Options de priorité
  const PRIORITE_OPTIONS = [
    { value: 'Normale', label: 'Normale', icon: '📋', color: 'default' },
    { value: 'Élevée', label: 'Élevée', icon: '⚡', color: 'info' },
    { value: 'Urgente', label: 'Urgente', icon: '🚨', color: 'warning' },
    { value: 'Très urgente', label: 'Très urgente', icon: '🔥', color: 'error' }
  ];

  // Affichage du chargement
  if (loadingData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Chargement des données de référence...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Types d'assistance, bénéficiaires, natures de don...
        </Typography>
        {Object.keys(dataErrors).length > 0 && (
          <Box sx={{ mt: 2 }}>
            {Object.entries(dataErrors).map(([key, error]) => (
              <Typography key={key} variant="caption" color="warning.main" display="block">
                ⚠️ {key}: {error}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Box component="form" onSubmit={handleSubmit}>
        {/* Récapitulatif des données chargées */}
        <Card sx={{ mb: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Info sx={{ mr: 1 }} />
              État des données de référence
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6} sm={3}>
                <Chip 
                  label={`Types: ${referenceData.types_assistance.length}`}
                  color={referenceData.types_assistance.length > 0 ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Chip 
                  label={`Bénéficiaires: ${referenceData.beneficiaires.length}`}
                  color={referenceData.beneficiaires.length > 0 ? 'success' : 'warning'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Chip 
                  label={`États: ${referenceData.etat_dones.length}`}
                  color={referenceData.etat_dones.length > 0 ? 'success' : 'warning'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Chip 
                  label={`Natures: ${referenceData.nature_dones.length}`}
                  color={referenceData.nature_dones.length > 0 ? 'success' : 'warning'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Chip 
                  label={`Détails: ${referenceData.details_type_assistance.length}`}
                  color={referenceData.details_type_assistance.length > 0 ? 'success' : 'info'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Chip 
                  label={`Situations: ${referenceData.situations.length}`}
                  color={referenceData.situations.length > 0 ? 'success' : 'warning'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Chip 
                  label={`Prêts: ${referenceData.nature_dones.filter(n => n.is_loan || n.duree).length}`}
                  color={referenceData.nature_dones.filter(n => n.is_loan || n.duree).length > 0 ? 'success' : 'info'}
                  size="small"
                />
              </Grid>
            </Grid>
            {Object.keys(dataErrors).length > 0 && (
              <Box sx={{ mt: 1 }}>
                {Object.entries(dataErrors).map(([key, error]) => (
                  <Typography key={key} variant="caption" color="warning.main" display="block">
                    ⚠️ {key}: {error}
                  </Typography>
                ))}
              </Box>
            )}
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={loadAllReferenceData}
              sx={{ mt: 1, color: 'primary.contrastText' }}
            >
              Recharger les données
            </Button>
          </CardContent>
        </Card>

        {/* Erreurs de validation */}
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Veuillez corriger les erreurs suivantes :
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {Object.values(errors).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Bloc 1: Informations principales */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
            <MedicalServices sx={{ mr: 1 }} />
            Informations principales
          </Typography>
          
          <Grid container spacing={2}>
            {/* Type d'assistance */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!errors.type_assistance_id}>
                <InputLabel>Type d'assistance</InputLabel>
                <Select
                  value={formData.type_assistance_id}
                  onChange={(e) => handleInputChange('type_assistance_id', e.target.value)}
                  label="Type d'assistance"
                >
                  {referenceData.types_assistance.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      <Box>
                        <Typography variant="body2">{type.libelle}</Typography>
                        {type.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {type.description}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.type_assistance_id && (
                  <Typography variant="caption" color="error">
                    {errors.type_assistance_id}
                  </Typography>
                )}
                {!referenceData.types_assistance.length && (
                  <Typography variant="caption" color="error">
                    ⚠️ Aucun type d'assistance disponible - Vérifiez la connexion
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Détail du type d'assistance */}
            {(formData.type_assistance_id && (referenceData.details_type_assistance.length > 0 || loadingDetailsType)) && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={loadingDetailsType}>
                  <InputLabel>Détail de l'assistance</InputLabel>
                  <Select
                    value={formData.details_type_assistance_id}
                    onChange={(e) => handleInputChange('details_type_assistance_id', e.target.value)}
                    label="Détail de l'assistance"
                    endAdornment={loadingDetailsType && (
                      <InputAdornment position="end">
                        <CircularProgress size={20} />
                      </InputAdornment>
                    )}
                  >
                    <MenuItem value="">
                      <em>Aucun détail spécifique</em>
                    </MenuItem>
                    {referenceData.details_type_assistance.map((detail) => (
                      <MenuItem key={detail.id} value={detail.id}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {detail.libelle}
                          </Typography>
                          {detail.description && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {detail.description}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {loadingDetailsType ? (
                    <Typography variant="caption" color="info.main">
                      Chargement des détails...
                    </Typography>
                  ) : referenceData.details_type_assistance.length > 0 ? (
                    <Typography variant="caption" color="success.main">
                      ✅ {referenceData.details_type_assistance.length} détails disponibles
                    </Typography>
                  ) : formData.type_assistance_id && (
                    <Typography variant="caption" color="warning.main">
                      ⚠️ Aucun détail disponible pour ce type
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            )}

            {/* Bénéficiaire */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={referenceData.beneficiaires}
                getOptionLabel={(option) => {
                  if (!option) return '';
                  const nom = option.nom || '';
                  const prenom = option.prenom || '';
                  const telephone = option.telephone || '';
                  return `${nom} ${prenom}${telephone ? ` - ${telephone}` : ''}`.trim();
                }}
                value={referenceData.beneficiaires.find(b => b.id == formData.beneficiaire_id) || null}
                onChange={(event, newValue) => {
                  handleInputChange('beneficiaire_id', newValue?.id || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Bénéficiaire"
                    required
                    error={!!errors.beneficiaire_id}
                    helperText={errors.beneficiaire_id || 
                      (referenceData.beneficiaires.length === 0 ? 
                        '⚠️ Aucun bénéficiaire trouvé' : 
                        `${referenceData.beneficiaires.length} bénéficiaires disponibles`)}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {option.nom} {option.prenom}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.telephone && `Tél: ${option.telephone}`}
                        {option.cin && ` | CIN: ${option.cin}`}
                        {option.email && ` | ${option.email}`}
                      </Typography>
                    </Box>
                  </li>
                )}
                noOptionsText="Aucun bénéficiaire trouvé"
                loadingText="Chargement des bénéficiaires..."
              />
            </Grid>

            {/* État du don */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!errors.etat_don_id}>
                <InputLabel>État du don</InputLabel>
                <Select
                  value={formData.etat_don_id}
                  onChange={(e) => handleInputChange('etat_don_id', e.target.value)}
                  label="État du don"
                >
                  {referenceData.etat_dones.map((etat) => (
                    <MenuItem key={etat.id} value={etat.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {etat.libelle?.toLowerCase().includes('neuf') && '🆕'}
                        {etat.libelle?.toLowerCase().includes('bon') && '✅'}
                        {etat.libelle?.toLowerCase().includes('usagé') && '🔄'}
                        {etat.libelle?.toLowerCase().includes('réparer') && '🔧'}
                        {etat.libelle?.toLowerCase().includes('hors') && '❌'}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {etat.libelle}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.etat_don_id && (
                  <Typography variant="caption" color="error">
                    {errors.etat_don_id}
                  </Typography>
                )}
                {referenceData.etat_dones.length > 0 ? (
                  <Typography variant="caption" color="success.main">
                    ✅ {referenceData.etat_dones.length} états disponibles
                  </Typography>
                ) : (
                  <Typography variant="caption" color="warning.main">
                    ⚠️ Utilisation de données par défaut
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Date d'assistance */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date d'assistance"
                value={formData.date_assistance}
                onChange={(newValue) => handleInputChange('date_assistance', newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!errors.date_assistance,
                    helperText: errors.date_assistance,
                    InputProps: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarToday sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }
                  }
                }}
              />
            </Grid>

            {/* Montant */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Montant"
                value={formData.montant}
                onChange={(e) => handleInputChange('montant', e.target.value)}
                error={!!errors.montant}
                helperText={errors.montant}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: <InputAdornment position="end">DH</InputAdornment>
                }}
                placeholder="0.00"
                inputProps={{
                  min: 0,
                  step: 0.01
                }}
              />
            </Grid>

            {/* Priorité */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!errors.priorite}>
                <InputLabel>Priorité</InputLabel>
                <Select
                  value={formData.priorite}
                  onChange={(e) => handleInputChange('priorite', e.target.value)}
                  label="Priorité"
                  startAdornment={
                    <InputAdornment position="start">
                      <PriorityHigh sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                >
                  {PRIORITE_OPTIONS.map((priorite) => (
                    <MenuItem key={priorite.value} value={priorite.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <span style={{ marginRight: 8, fontSize: '1.2em' }}>{priorite.icon}</span>
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {priorite.label}
                        </Typography>
                        <Chip 
                          size="small" 
                          color={priorite.color} 
                          label={priorite.value}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.priorite && (
                  <Typography variant="caption" color="error">
                    {errors.priorite}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Bloc 2: Informations complémentaires */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
            <Assignment sx={{ mr: 1 }} />
            Informations complémentaires
          </Typography>
          
          <Grid container spacing={2}>
            {/* Situation */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Situation</InputLabel>
                <Select
                  value={formData.situation_id}
                  onChange={(e) => handleInputChange('situation_id', e.target.value)}
                  label="Situation"
                >
                  <MenuItem value="">
                    <em>Aucune situation spécifique</em>
                  </MenuItem>
                  {referenceData.situations.map((situation) => (
                    <MenuItem key={situation.id} value={situation.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {situation.libelle?.toLowerCase().includes('précaire') && '🚨'}
                        {situation.libelle?.toLowerCase().includes('famille') && '👨‍👩‍👧‍👦'}
                        {situation.libelle?.toLowerCase().includes('âgée') && '👴'}
                        {situation.libelle?.toLowerCase().includes('handicapée') && '♿'}
                        {situation.libelle?.toLowerCase().includes('urgence') && '🆘'}
                        {situation.libelle?.toLowerCase().includes('orphelin') && '👶'}
                        {situation.libelle?.toLowerCase().includes('veuf') && '🖤'}
                        {situation.libelle?.toLowerCase().includes('emploi') && '💼'}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {situation.libelle}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {referenceData.situations.length > 0 ? (
                  <Typography variant="caption" color="success.main">
                    ✅ {referenceData.situations.length} situations disponibles
                  </Typography>
                ) : (
                  <Typography variant="caption" color="warning.main">
                    ⚠️ Utilisation de données par défaut
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Nature du don */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!errors.nature_done_id}>
                <InputLabel>Nature du don</InputLabel>
                <Select
                  value={formData.nature_done_id}
                  onChange={(e) => handleInputChange('nature_done_id', e.target.value)}
                  label="Nature du don"
                >
                  {referenceData.nature_dones.map((nature) => (
                    <MenuItem key={nature.id} value={nature.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        {nature.libelle?.toLowerCase().includes('individuel') && '👤'}
                        {nature.libelle?.toLowerCase().includes('entreprise') && '🏢'}
                        {nature.libelle?.toLowerCase().includes('association') && '🤝'}
                        {nature.libelle?.toLowerCase().includes('gouvernemental') && '🏛️'}
                        {(nature.libelle?.toLowerCase().includes('prêt') || nature.duree) && '🔄'}
                        {nature.libelle?.toLowerCase().includes('nature') && '📦'}
                        {nature.libelle?.toLowerCase().includes('financier') && '💰'}
                        
                        <Typography variant="body2" sx={{ ml: 1, flexGrow: 1 }}>
                          {nature.libelle}
                        </Typography>
                        
                        {/* Badge spécial pour les prêts avec durée du modèle */}
                        {(nature.is_loan || nature.duree) && (
                          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                            <Chip 
                              size="small" 
                              color="warning" 
                              label="PRÊT"
                              icon={<Schedule />}
                            />
                            {nature.duree && (
                              <Chip 
                                size="small" 
                                color="info" 
                                label={`${nature.duree}j`}
                                title={`Durée par défaut: ${nature.duree} jours`}
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.nature_done_id && (
                  <Typography variant="caption" color="error">
                    {errors.nature_done_id}
                  </Typography>
                )}
                {referenceData.nature_dones.length > 0 ? (
                  <Box>
                    <Typography variant="caption" color="success.main" display="block">
                      ✅ {referenceData.nature_dones.length} natures disponibles
                    </Typography>
                    {referenceData.nature_dones.filter(n => n.is_loan || n.duree).length > 0 && (
                      <Typography variant="caption" color="info.main" display="block">
                        🔄 {referenceData.nature_dones.filter(n => n.is_loan || n.duree).length} options de prêt
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="caption" color="warning.main">
                    ⚠️ Utilisation de données par défaut
                  </Typography>
                )}
                
                {/* Affichage des informations sur la nature sélectionnée */}
                {selectedNatureDon && (
                  <Box sx={{ mt: 1, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" fontWeight="bold" display="block">
                      Nature sélectionnée: {selectedNatureDon.libelle}
                    </Typography>
                    {selectedNatureDon.duree && (
                      <Typography variant="caption" color="info.main" display="block">
                        Durée par défaut: {selectedNatureDon.duree} jours
                      </Typography>
                    )}
                    {selectedNatureDon.is_loan && (
                      <Typography variant="caption" color="warning.main" display="block">
                        Type: Prêt temporaire
                      </Typography>
                    )}
                  </Box>
                )}
              </FormControl>
            </Grid>

            {/* Assistance pour moi-même */}
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.moi_meme}
                    onChange={(e) => handleInputChange('moi_meme', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonPin sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2">Assistance pour moi-même</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cochez si vous bénéficiez personnellement de cette assistance
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ 
                  alignItems: 'flex-start',
                  '& .MuiFormControlLabel-label': { mt: 0.5 }
                }}
              />
            </Grid>

            {/* Champs de prêt */}
            {showDureeFields && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip 
                      label="🔄 Mode Prêt Temporaire Activé" 
                      color="warning" 
                      variant="outlined"
                      sx={{ 
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        px: 2
                      }}
                    />
                  </Divider>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Info sx={{ mr: 1, mt: 0.5 }} />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        Mode Prêt Temporaire Détecté
                      </Typography>
                      <Typography variant="body2">
                        Cette assistance est configurée comme un prêt temporaire.
                        {selectedNatureDon?.duree && (
                          ` Durée suggérée par le système: ${selectedNatureDon.duree} jours.`
                        )}
                        Vous pouvez modifier cette durée selon vos besoins.
                      </Typography>
                    </Box>
                  </Alert>
                </Grid>

                {/* Champ durée */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Durée d'utilisation (en jours)"
                    value={formData.duree_utilisation}
                    onChange={(e) => handleInputChange('duree_utilisation', e.target.value)}
                    error={!!errors.duree_utilisation}
                    helperText={
                      errors.duree_utilisation || 
                      (selectedNatureDon?.duree 
                        ? `Durée suggérée: ${selectedNatureDon.duree} jours (modifiable)`
                        : 'Nombre de jours pour le prêt du matériel/équipement'
                      )
                    }
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Schedule sx={{ color: 'warning.main' }} />
                        </InputAdornment>
                      ),
                      endAdornment: <InputAdornment position="end">jours</InputAdornment>
                    }}
                    placeholder={selectedNatureDon?.duree ? selectedNatureDon.duree.toString() : "Ex: 30, 60, 90..."}
                    inputProps={{
                      min: 1,
                      max: 365
                    }}
                  />
                </Grid>

                {/* Date de retour prévue */}
                {formData.date_retour_prevue && (
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Date de retour prévue"
                      value={formData.date_retour_prevue}
                      onChange={(newValue) => handleInputChange('date_retour_prevue', newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.date_retour_prevue,
                          helperText: errors.date_retour_prevue || "Calculée automatiquement selon la durée (modifiable)",
                          InputProps: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <CalendarToday sx={{ color: 'warning.main' }} />
                              </InputAdornment>
                            )
                          }
                        }
                      }}
                    />
                  </Grid>
                )}

                {/* Récapitulatif du prêt */}
                {formData.duree_utilisation && formData.date_retour_prevue && (
                  <Grid item xs={12}>
                    <Card sx={{ backgroundColor: 'warning.light', color: 'warning.contrastText' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="body1" fontWeight="bold" gutterBottom>
                          📋 Récapitulatif du Prêt
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={3}>
                            <Typography variant="body2">
                              <strong>Nature:</strong> {selectedNatureDon?.libelle || 'Non définie'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Typography variant="body2">
                              <strong>Durée:</strong> {formData.duree_utilisation} jours
                              {selectedNatureDon?.duree && selectedNatureDon.duree != formData.duree_utilisation && (
                                <span style={{ fontSize: '0.8em' }}> (suggéré: {selectedNatureDon.duree}j)</span>
                              )}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Typography variant="body2">
                              <strong>Début:</strong> {format(formData.date_assistance, 'dd/MM/yyyy', { locale: fr })}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Typography variant="body2">
                              <strong>Retour prévu:</strong> {format(formData.date_retour_prevue, 'dd/MM/yyyy', { locale: fr })}
                            </Typography>
                          </Grid>
                        </Grid>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          ⏰ Un rappel sera automatiquement généré proche de la date de retour
                        </Typography>
                        
                        {/* Informations techniques */}
                        <Box sx={{ mt: 2, p: 1, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
                          <Typography variant="caption" fontWeight="bold" display="block">
                            Données qui seront enregistrées:
                          </Typography>
                          <Typography variant="caption" display="block">
                            • nature_done_id: {formData.nature_done_id} ({selectedNatureDon?.libelle})
                          </Typography>
                          <Typography variant="caption" display="block">
                            • est_pret: true
                          </Typography>
                          <Typography variant="caption" display="block">
                            • duree_utilisation: {formData.duree_utilisation} jours
                          </Typography>
                          <Typography variant="caption" display="block">
                            • date_retour_prevue: {format(formData.date_retour_prevue, 'yyyy-MM-dd')}
                          </Typography>
                          <Typography variant="caption" display="block">
                            • retour_effectue: false
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            )}

            {/* Observations */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observations"
                value={formData.observations}
                onChange={(e) => handleInputChange('observations', e.target.value)}
                placeholder="Observations générales sur l'assistance (état du matériel, besoins particuliers, etc.)..."
                helperText="Informations visibles par le bénéficiaire et dans les rapports"
              />
            </Grid>

            {/* Commentaire interne */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Commentaire interne"
                value={formData.commentaire_interne}
                onChange={(e) => handleInputChange('commentaire_interne', e.target.value)}
                placeholder="Commentaires internes équipe (suivi, contact avec le bénéficiaire, etc.)..."
                helperText="⚠️ Informations internes non visibles par le bénéficiaire"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'action.hover'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
          {onCancel && (
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={onCancel}
              disabled={loadingSubmit}
              size="large"
            >
              Annuler
            </Button>
          )}
          
          <Button
            type="submit"
            variant="contained"
            startIcon={loadingSubmit ? <CircularProgress size={20} /> : <Save />}
            disabled={loadingSubmit || Object.keys(errors).length > 0}
            color="primary"
            size="large"
            sx={{ minWidth: 200 }}
          >
            {loadingSubmit ? (
              assistance ? 'Mise à jour en cours...' : 'Création en cours...'
            ) : (
              assistance ? 'Mettre à jour l\'assistance' : 'Créer l\'assistance'
            )}
          </Button>
        </Box>

        
      </Box>
    </LocalizationProvider>
  );
};

export default SimpleAssistanceForm;