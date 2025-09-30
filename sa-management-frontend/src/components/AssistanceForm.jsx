// src/components/AssistanceForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Box,
    Typography,
    Card,
    CardContent,
    Autocomplete,
    Chip,
    InputAdornment,
    Alert,
    CircularProgress,
    Paper
} from '@mui/material';
import {
    DatePicker,
    LocalizationProvider
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { format, addDays } from 'date-fns';
import assistancesApi from '../services/assistancesApi';

const priorityOptions = [
    { value: 'faible', label: 'Faible', color: 'success' },
    { value: 'normale', label: 'Normale', color: 'info' },
    { value: 'elevee', label: 'Élevée', color: 'warning' },
    { value: 'urgente', label: 'Urgente', color: 'error' }
];

const AssistanceForm = ({ 
    open, 
    onClose, 
    assistance = null, 
    onSave,
    loading = false 
}) => {
    // États du formulaire
    const [formData, setFormData] = useState({
        beneficiaire_id: '',
        type_assistance_id: '',
        details_type_assistance_id: '',
        nature_done_id: '',
        etat_don_id: '',
        situation_id: '',
        campagne_id: '',
        date_assistance: new Date(),
        montant: '',
        priorite: 'normale',
        duree_utilisation: '',
        date_fin_prevue: null,
        observations: '',
        documents: null
    });

    // États pour les options de formulaire
    const [formOptions, setFormOptions] = useState({
        types_assistance: [],
        details_type_assistance: [],
        nature_dones: [],
        etat_dones: [],
        situations: [],
        campagnes: [],
        beneficiaires: []
    });

    // États pour la recherche de bénéficiaires
    const [beneficiaireSearchValue, setBeneficiaireSearchValue] = useState('');
    const [beneficiaireOptions, setBeneficiaireOptions] = useState([]);
    const [selectedBeneficiaire, setSelectedBeneficiaire] = useState(null);

    // États pour la gestion des erreurs et du chargement
    const [errors, setErrors] = useState({});
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isSearchingBeneficiaires, setIsSearchingBeneficiaires] = useState(false);

    // État pour déterminer si c'est un prêt
    const [isPret, setIsPret] = useState(false);

    // Charger les options du formulaire
    useEffect(() => {
        const loadFormOptions = async () => {
            setIsLoadingOptions(true);
            try {
                const result = await assistancesApi.getFormOptions();
                if (result.success) {
                    setFormOptions(result.data);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des options:', error);
            } finally {
                setIsLoadingOptions(false);
            }
        };

        if (open) {
            loadFormOptions();
        }
    }, [open]);

    // Initialiser le formulaire avec les données existantes
    useEffect(() => {
        if (assistance) {
            setFormData({
                beneficiaire_id: assistance.beneficiaire_id || '',
                type_assistance_id: assistance.type_assistance_id || '',
                details_type_assistance_id: assistance.details_type_assistance_id || '',
                nature_done_id: assistance.nature_done_id || '',
                etat_don_id: assistance.etat_don_id || '',
                situation_id: assistance.situation_id || '',
                campagne_id: assistance.campagne_id || '',
                date_assistance: assistance.date_assistance ? new Date(assistance.date_assistance) : new Date(),
                montant: assistance.montant || '',
                priorite: assistance.priorite || 'normale',
                duree_utilisation: assistance.duree_utilisation || '',
                date_fin_prevue: assistance.date_fin_prevue ? new Date(assistance.date_fin_prevue) : null,
                observations: assistance.observations || '',
                documents: null
            });

            // Définir le bénéficiaire sélectionné
            if (assistance.beneficiaire) {
                setSelectedBeneficiaire({
                    id: assistance.beneficiaire.id,
                    nom: assistance.beneficiaire.nom,
                    prenom: assistance.beneficiaire.prenom,
                    telephone: assistance.beneficiaire.telephone
                });
            }

            // Vérifier si c'est un prêt
            checkIsPret(assistance.nature_done_id);
        } else {
            // Réinitialiser pour une nouvelle assistance
            setFormData({
                beneficiaire_id: '',
                type_assistance_id: '',
                details_type_assistance_id: '',
                nature_done_id: '',
                etat_don_id: '',
                situation_id: '',
                campagne_id: '',
                date_assistance: new Date(),
                montant: '',
                priorite: 'normale',
                duree_utilisation: '',
                date_fin_prevue: null,
                observations: '',
                documents: null
            });
            setSelectedBeneficiaire(null);
            setIsPret(false);
        }
        setErrors({});
    }, [assistance, open]);

    // Charger les détails du type d'assistance
    const loadDetailsTypeAssistance = async (typeAssistanceId) => {
        if (!typeAssistanceId) {
            setFormOptions(prev => ({ ...prev, details_type_assistance: [] }));
            return;
        }

        setIsLoadingDetails(true);
        try {
            const result = await assistancesApi.getDetailsTypeAssistance(typeAssistanceId);
            if (result.success) {
                setFormOptions(prev => ({ 
                    ...prev, 
                    details_type_assistance: result.data 
                }));
            }
        } catch (error) {
            console.error('Erreur lors du chargement des détails:', error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // Vérifier si la nature sélectionnée correspond à un prêt
    const checkIsPret = (natureDoneId) => {
        const natureDone = formOptions.nature_dones.find(n => n.id === natureDoneId);
        const isLoan = natureDone?.libelle?.toLowerCase().includes('prêt') ||
                       natureDone?.libelle?.toLowerCase().includes('pret') ||
                       natureDone?.libelle?.toLowerCase().includes('durée');
        setIsPret(isLoan);
        return isLoan;
    };

    // Rechercher des bénéficiaires
    const searchBeneficiaires = useCallback(async (searchValue) => {
        if (!searchValue || searchValue.length < 2) {
            setBeneficiaireOptions([]);
            return;
        }

        setIsSearchingBeneficiaires(true);
        try {
            const result = await assistancesApi.searchBeneficiaires(searchValue);
            if (result.success) {
                setBeneficiaireOptions(result.data);
            }
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            setBeneficiaireOptions([]);
        } finally {
            setIsSearchingBeneficiaires(false);
        }
    }, []);

    // Calculer la date de fin prévue
    const calculateDateFinPrevue = (dateAssistance, dureeUtilisation) => {
        if (dateAssistance && dureeUtilisation && isPret) {
            const duree = parseInt(dureeUtilisation);
            if (!isNaN(duree) && duree > 0) {
                return addDays(new Date(dateAssistance), duree);
            }
        }
        return null;
    };

    // Gérer les changements de champs
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Supprimer l'erreur du champ modifié
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }

        // Actions spécifiques selon le champ
        switch (field) {
            case 'type_assistance_id':
                if (value !== formData.type_assistance_id) {
                    setFormData(prev => ({ ...prev, details_type_assistance_id: '' }));
                    loadDetailsTypeAssistance(value);
                }
                break;
                
            case 'nature_done_id':
                const isLoan = checkIsPret(value);
                if (!isLoan) {
                    setFormData(prev => ({ 
                        ...prev, 
                        duree_utilisation: '',
                        date_fin_prevue: null
                    }));
                }
                break;
                
            case 'date_assistance':
            case 'duree_utilisation':
                if (isPret) {
                    const dateFinPrevue = calculateDateFinPrevue(
                        field === 'date_assistance' ? value : formData.date_assistance,
                        field === 'duree_utilisation' ? value : formData.duree_utilisation
                    );
                    setFormData(prev => ({ ...prev, date_fin_prevue: dateFinPrevue }));
                }
                break;
                
            default:
                break;
        }
    };

    // Gérer la sélection du bénéficiaire
    const handleBeneficiaireChange = (event, value) => {
        setSelectedBeneficiaire(value);
        setFormData(prev => ({ 
            ...prev, 
            beneficiaire_id: value ? value.id : '' 
        }));
        
        if (errors.beneficiaire_id) {
            setErrors(prev => ({ ...prev, beneficiaire_id: null }));
        }
    };

    // Valider le formulaire
    const validateForm = () => {
        const newErrors = {};

        if (!formData.beneficiaire_id) {
            newErrors.beneficiaire_id = 'Bénéficiaire requis';
        }
        if (!formData.type_assistance_id) {
            newErrors.type_assistance_id = 'Type d\'assistance requis';
        }
        if (!formData.etat_don_id) {
            newErrors.etat_don_id = 'État du don requis';
        }
        if (!formData.date_assistance) {
            newErrors.date_assistance = 'Date d\'assistance requise';
        }
        if (!formData.montant || isNaN(parseFloat(formData.montant))) {
            newErrors.montant = 'Montant valide requis';
        }
        if (!formData.priorite) {
            newErrors.priorite = 'Priorité requise';
        }

        // Validations spécifiques aux prêts
        if (isPret) {
            if (!formData.duree_utilisation || isNaN(parseInt(formData.duree_utilisation))) {
                newErrors.duree_utilisation = 'Durée d\'utilisation requise pour un prêt';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Soumettre le formulaire
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        // Préparer les données pour l'envoi
        const submitData = {
            ...formData,
            date_assistance: format(new Date(formData.date_assistance), 'yyyy-MM-dd'),
            date_fin_prevue: formData.date_fin_prevue ? 
                format(new Date(formData.date_fin_prevue), 'yyyy-MM-dd') : null,
            montant: parseFloat(formData.montant),
            duree_utilisation: formData.duree_utilisation ? 
                parseInt(formData.duree_utilisation) : null
        };

        try {
            let result;
            if (assistance?.id) {
                result = await assistancesApi.update(assistance.id, submitData);
            } else {
                result = await assistancesApi.create(submitData);
            }

            if (result.success) {
                onSave(result.data);
                onClose();
            } else {
                if (result.errors) {
                    setErrors(result.errors);
                }
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        }
    };

    // Gérer la fermeture
    const handleClose = () => {
        setFormData({
            beneficiaire_id: '',
            type_assistance_id: '',
            details_type_assistance_id: '',
            nature_done_id: '',
            etat_don_id: '',
            situation_id: '',
            campagne_id: '',
            date_assistance: new Date(),
            montant: '',
            priorite: 'normale',
            duree_utilisation: '',
            date_fin_prevue: null,
            observations: '',
            documents: null
        });
        setSelectedBeneficiaire(null);
        setErrors({});
        setIsPret(false);
        onClose();
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <Dialog 
                open={open} 
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { minHeight: '80vh' }
                }}
            >
                <DialogTitle>
                    {assistance ? 'Modifier l\'assistance' : 'Nouvelle assistance'}
                </DialogTitle>
                
                <DialogContent dividers>
                    {isLoadingOptions ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {/* Sélection du bénéficiaire */}
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Bénéficiaire
                                </Typography>
                                <Autocomplete
                                    value={selectedBeneficiaire}
                                    onChange={handleBeneficiaireChange}
                                    inputValue={beneficiaireSearchValue}
                                    onInputChange={(event, newValue) => {
                                        setBeneficiaireSearchValue(newValue);
                                        searchBeneficiaires(newValue);
                                    }}
                                    options={beneficiaireOptions}
                                    getOptionLabel={(option) => 
                                        `${option.nom} ${option.prenom} - ${option.telephone || 'N/A'}`
                                    }
                                    loading={isSearchingBeneficiaires}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Rechercher un bénéficiaire"
                                            placeholder="Nom, prénom ou téléphone..."
                                            error={!!errors.beneficiaire_id}
                                            helperText={errors.beneficiaire_id}
                                            InputProps={{
                                                ...params.InputProps,
                                                endAdornment: (
                                                    <>
                                                        {isSearchingBeneficiaires && (
                                                            <CircularProgress size={20} />
                                                        )}
                                                        {params.InputProps.endAdornment}
                                                    </>
                                                )
                                            }}
                                        />
                                    )}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            <Box>
                                                <Typography variant="body1">
                                                    {option.nom} {option.prenom}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {option.telephone || 'Téléphone non renseigné'}
                                                </Typography>
                                            </Box>
                                        </li>
                                    )}
                                    noOptionsText="Aucun bénéficiaire trouvé"
                                />
                            </Grid>

                            {/* Informations de l'assistance */}
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Informations de l'assistance
                                </Typography>
                            </Grid>

                            {/* Type d'assistance */}
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth error={!!errors.type_assistance_id}>
                                    <InputLabel>Type d'assistance *</InputLabel>
                                    <Select
                                        value={formData.type_assistance_id}
                                        onChange={(e) => handleChange('type_assistance_id', e.target.value)}
                                        label="Type d'assistance *"
                                    >
                                        {(formOptions.types_assistance || []).map((type) => (
                                            <MenuItem key={type.id} value={type.id}>
                                                {type.libelle}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {errors.type_assistance_id && (
                                        <FormHelperText>{errors.type_assistance_id}</FormHelperText>
                                    )}
                                </FormControl>
                            </Grid>

                            {/* Détails du type d'assistance */}
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth disabled={!formData.type_assistance_id || isLoadingDetails}>
                                    <InputLabel>Détails</InputLabel>
                                    <Select
                                        value={formData.details_type_assistance_id}
                                        onChange={(e) => handleChange('details_type_assistance_id', e.target.value)}
                                        label="Détails"
                                    >
                                        {(formOptions.details_type_assistance || []).map((detail) => (
                                            <MenuItem key={detail.id} value={detail.id}>
                                                {detail.libelle}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {isLoadingDetails && (
                                        <FormHelperText>
                                            <CircularProgress size={16} /> Chargement des détails...
                                        </FormHelperText>
                                    )}
                                </FormControl>
                            </Grid>

                            {/* Nature du don */}
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Nature du don</InputLabel>
                                    <Select
                                        value={formData.nature_done_id}
                                        onChange={(e) => handleChange('nature_done_id', e.target.value)}
                                        label="Nature du don"
                                    >
                                        {(formOptions.nature_dones || []).map((nature) => (
                                            <MenuItem key={nature.id} value={nature.id}>
                                                {nature.libelle}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* État du don */}
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth error={!!errors.etat_don_id}>
                                    <InputLabel>État du don *</InputLabel>
                                    <Select
                                        value={formData.etat_don_id}
                                        onChange={(e) => handleChange('etat_don_id', e.target.value)}
                                        label="État du don *"
                                    >
                                        {(formOptions.etat_dones || []).map((etat) => (
                                            <MenuItem key={etat.id} value={etat.id}>
                                                {etat.libelle}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {errors.etat_don_id && (
                                        <FormHelperText>{errors.etat_don_id}</FormHelperText>
                                    )}
                                </FormControl>
                            </Grid>

                            {/* Date d'assistance */}
                            <Grid item xs={12} md={6}>
                                <DatePicker
                                    label="Date d'assistance *"
                                    value={formData.date_assistance}
                                    onChange={(date) => handleChange('date_assistance', date)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            error={!!errors.date_assistance}
                                            helperText={errors.date_assistance}
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Montant */}
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Montant *"
                                    type="number"
                                    value={formData.montant}
                                    onChange={(e) => handleChange('montant', e.target.value)}
                                    error={!!errors.montant}
                                    helperText={errors.montant}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">MAD</InputAdornment>
                                    }}
                                />
                            </Grid>

                            {/* Priorité */}
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth error={!!errors.priorite}>
                                    <InputLabel>Priorité *</InputLabel>
                                    <Select
                                        value={formData.priorite}
                                        onChange={(e) => handleChange('priorite', e.target.value)}
                                        label="Priorité *"
                                    >
                                        {priorityOptions.map((priority) => (
                                            <MenuItem key={priority.value} value={priority.value}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Chip 
                                                        size="small" 
                                                        label={priority.label}
                                                        color={priority.color}
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {errors.priorite && (
                                        <FormHelperText>{errors.priorite}</FormHelperText>
                                    )}
                                </FormControl>
                            </Grid>

                            {/* Situation */}
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Situation</InputLabel>
                                    <Select
                                        value={formData.situation_id}
                                        onChange={(e) => handleChange('situation_id', e.target.value)}
                                        label="Situation"
                                    >
                                        {(formOptions.situations || []).map((situation) => (
                                            <MenuItem key={situation.id} value={situation.id}>
                                                {situation.libelle}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Informations de prêt (conditionnel) */}
                            {isPret && (
                                <Grid item xs={12}>
                                    <Paper elevation={1} sx={{ p: 2, backgroundColor: 'action.hover' }}>
                                        <Typography variant="h6" gutterBottom color="primary">
                                            Informations de prêt
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="Durée d'utilisation (jours) *"
                                                    type="number"
                                                    value={formData.duree_utilisation}
                                                    onChange={(e) => handleChange('duree_utilisation', e.target.value)}
                                                    error={!!errors.duree_utilisation}
                                                    helperText={errors.duree_utilisation || "Nombre de jours de prêt"}
                                                    InputProps={{
                                                        endAdornment: <InputAdornment position="end">jours</InputAdornment>
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <DatePicker
                                                    label="Date de retour prévue"
                                                    value={formData.date_fin_prevue}
                                                    onChange={(date) => handleChange('date_fin_prevue', date)}
                                                    disabled
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            fullWidth
                                                            helperText="Calculée automatiquement"
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                        </Grid>
                                        <Alert severity="info" sx={{ mt: 2 }}>
                                            La date de retour prévue est calculée automatiquement en ajoutant la durée à la date d'assistance.
                                        </Alert>
                                    </Paper>
                                </Grid>
                            )}

                            {/* Campagne (optionnel) */}
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Campagne</InputLabel>
                                    <Select
                                        value={formData.campagne_id}
                                        onChange={(e) => handleChange('campagne_id', e.target.value)}
                                        label="Campagne"
                                    >
                                        {(formOptions.campagnes || []).map((campagne) => (
                                            <MenuItem key={campagne.id} value={campagne.id}>
                                                {campagne.nom}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Observations */}
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Observations"
                                    multiline
                                    rows={3}
                                    value={formData.observations}
                                    onChange={(e) => handleChange('observations', e.target.value)}
                                    placeholder="Commentaires, observations particulières..."
                                />
                            </Grid>

                            {/* Upload de documents */}
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Documents justificatifs
                                </Typography>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => handleChange('documents', e.target.files)}
                                    style={{ display: 'none' }}
                                    id="documents-upload"
                                />
                                <label htmlFor="documents-upload">
                                    <Button
                                        variant="outlined"
                                        component="span"
                                        fullWidth
                                        sx={{ py: 2, borderStyle: 'dashed' }}
                                    >
                                        Sélectionner des fichiers
                                        <br />
                                        <Typography variant="caption">
                                            PDF, DOC, Images (Max 10MB chacun)
                                        </Typography>
                                    </Button>
                                </label>
                                {formData.documents && formData.documents.length > 0 && (
                                    <Box mt={1}>
                                        <Typography variant="caption">
                                            {formData.documents.length} fichier(s) sélectionné(s)
                                        </Typography>
                                    </Box>
                                )}
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleClose} color="inherit">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading || isLoadingOptions}
                        startIcon={loading && <CircularProgress size={20} />}
                    >
                        {assistance ? 'Modifier' : 'Créer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default AssistanceForm;