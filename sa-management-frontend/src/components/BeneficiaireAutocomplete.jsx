// src/components/BeneficiaireAutocomplete.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Chip
} from '@mui/material';
import { Person, Phone } from '@mui/icons-material';
import { receptionService } from '../services/receptionService';
import { debounce } from 'lodash';

const BeneficiaireAutocomplete = ({
  value,
  onChange,
  label = "Rechercher un bénéficiaire",
  placeholder = "Tapez le nom, prénom ou téléphone...",
  disabled = false,
  required = false,
  error = false,
  helperText = "",
  size = "medium",
  fullWidth = true,
  ...props
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Fonction de recherche avec debounce
  const debouncedSearch = useCallback(
    debounce(async (searchTerm) => {
      if (!searchTerm || searchTerm.length < 2) {
        setOptions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const results = await receptionService.searchBeneficiaires(searchTerm);
        setOptions(results || []);
      } catch (error) {
        console.error('Erreur recherche bénéficiaires:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Effet pour déclencher la recherche
  useEffect(() => {
    debouncedSearch(inputValue);
    
    // Cleanup function pour annuler les requêtes en attente
    return () => {
      debouncedSearch.cancel();
    };
  }, [inputValue, debouncedSearch]);

  // Gérer le changement d'input
  const handleInputChange = (event, newInputValue, reason) => {
    setInputValue(newInputValue);
    
    // Si l'utilisateur efface le champ, réinitialiser la sélection
    if (reason === 'clear' || newInputValue === '') {
      onChange?.(null);
    }
  };

  // Gérer le changement de sélection
  const handleChange = (event, newValue, reason) => {
    onChange?.(newValue, reason);
    
    // Si une option est sélectionnée, mettre à jour l'input
    if (newValue) {
      setInputValue(newValue.label);
    }
  };

  // Rendu d'une option dans la liste
  const renderOption = (props, option) => (
    <Box component="li" {...props} key={option.id}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
          <Person sx={{ fontSize: 18 }} />
        </Avatar>
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            {option.nom} {option.prenom}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {option.tel}
            </Typography>
          </Box>
        </Box>
        
        <Chip 
          label={`ID: ${option.id}`} 
          size="small" 
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
      </Box>
    </Box>
  );

  // Rendu de l'input
  const renderInput = (params) => (
    <TextField
      {...params}
      label={label}
      placeholder={placeholder}
      error={error}
      helperText={helperText}
      required={required}
      size={size}
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <>
            {loading ? <CircularProgress color="inherit" size={20} /> : null}
            {params.InputProps.endAdornment}
          </>
        ),
        startAdornment: (
          <Person sx={{ color: 'text.secondary', mr: 1 }} />
        )
      }}
    />
  );

  // Fonction pour afficher la valeur sélectionnée
  const getOptionLabel = (option) => {
    if (typeof option === 'string') {
      return option;
    }
    return option?.label || '';
  };

  // Fonction pour comparer les options
  const isOptionEqualToValue = (option, value) => {
    return option?.id === value?.id;
  };

  return (
    <Autocomplete
      {...props}
      value={value}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={options}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      renderOption={renderOption}
      renderInput={renderInput}
      noOptionsText={
        inputValue.length < 2 
          ? "Tapez au moins 2 caractères pour rechercher"
          : loading 
            ? "Recherche en cours..."
            : "Aucun bénéficiaire trouvé"
      }
      loadingText="Recherche en cours..."
      filterOptions={(x) => x} // Désactiver le filtrage côté client
      sx={{
        '& .MuiAutocomplete-option': {
          padding: 2,
        },
        '& .MuiAutocomplete-listbox': {
          maxHeight: '300px',
        },
        ...props.sx
      }}
    />
  );
};

export default BeneficiaireAutocomplete;