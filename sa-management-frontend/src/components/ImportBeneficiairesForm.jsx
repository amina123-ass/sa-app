import React, { useState, useEffect } from 'react';
import { upasAPI } from '../../services/upasAPI';
import { handleApiError } from '../../services/axiosClient';
import { Button, Select, MenuItem, InputLabel, FormControl, Typography } from '@mui/material';

const ImportBeneficiairesForm = () => {
  const [campagnes, setCampagnes] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCampagne, setSelectedCampagne] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Charger les campagnes actives
    const fetchCampagnes = async () => {
      try {
        const result = await upasAPI.getFormOptions(); // ou upasAPI.getCampagnesActives()
        setCampagnes(result.campagnes_actives);
      } catch (err) {
        setError('Erreur lors du chargement des campagnes.');
      }
    };
    fetchCampagnes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!selectedFile || !selectedCampagne) {
      setError('Veuillez sélectionner un fichier et une campagne.');
      return;
    }

    try {
      await upasAPI.importBeneficiaires({
        file: selectedFile,
        campagne_id: selectedCampagne,
      });
      setMessage('✅ Importation réussie !');
    } catch (err) {
      const msg = handleApiError(err);
      setError('❌ Erreur : ' + msg);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormControl fullWidth sx={{ my: 2 }}>
        <InputLabel id="campagne-label">Campagne</InputLabel>
        <Select
          labelId="campagne-label"
          value={selectedCampagne}
          label="Campagne"
          onChange={(e) => setSelectedCampagne(e.target.value)}
        >
          {campagnes.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.nom}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => setSelectedFile(e.target.files[0])}
        required
      />

      <Button variant="contained" type="submit" sx={{ mt: 2 }}>
        Importer le fichier
      </Button>

      {message && <Typography color="success.main" mt={2}>{message}</Typography>}
      {error && <Typography color="error.main" mt={2}>{error}</Typography>}
    </form>
  );
};

export default ImportBeneficiairesForm;
