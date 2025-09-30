// OUTIL DE DEBUG - Ajoutez ceci temporairement dans votre page Participants
// src/components/DebugParticipants.jsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  Grid
} from '@mui/material';
import { receptionService } from '../services/receptionService';
import axios from '../config/axios';

const DebugParticipants = ({ selectedCampagne }) => {
  const [debugResult, setDebugResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState({
    nom: 'TEST',
    prenom: 'Participant',
    date_naissance: '1990-01-01',
    tel: '0123456789',
    adresse: 'Adresse de test'
  });

  const runFullDiagnostic = async () => {
    setLoading(true);
    const results = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      // Test 1: Vérifier l'authentification
      results.tests.push({
        name: 'Authentification',
        status: 'running'
      });

      const token = localStorage.getItem('auth_token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      results.tests[0] = {
        name: 'Authentification',
        status: token ? 'success' : 'error',
        details: {
          hasToken: !!token,
          tokenLength: token ? token.length : 0,
          userRole: user?.role?.libelle,
          userId: user?.id
        }
      };

      // Test 2: Vérifier la connectivité API
      results.tests.push({
        name: 'Connectivité API',
        status: 'running'
      });

      try {
        const response = await axios.get('/reception/form-data');
        results.tests[1] = {
          name: 'Connectivité API',
          status: 'success',
          details: {
            status: response.status,
            hasData: !!response.data,
            campagnesCount: response.data?.campagnes_actives?.length || 0,
            situationsCount: response.data?.situations?.length || 0
          }
        };
      } catch (error) {
        results.tests[1] = {
          name: 'Connectivité API',
          status: 'error',
          details: {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data
          }
        };
      }

      // Test 3: Vérifier la route spécifique d'ajout
      if (selectedCampagne) {
        results.tests.push({
          name: 'Route Ajout Participant',
          status: 'running'
        });

        try {
          // Test avec données fictives
          const testParticipant = {
            nom: 'TEST_DEBUG',
            prenom: 'Participant',
            date_naissance: '1990-01-01',
            tel: '0123456789',
            adresse: 'Test debug address',
            situation_id: null
          };

          console.log('🧪 Test ajout participant:', testParticipant);
          console.log('🎯 Campagne ID:', selectedCampagne);

          const addResponse = await receptionService.addParticipant(selectedCampagne, testParticipant);
          
          results.tests[2] = {
            name: 'Route Ajout Participant',
            status: 'success',
            details: {
              response: addResponse,
              participantId: addResponse?.participant?.id
            }
          };

          // Si l'ajout a réussi, essayer de supprimer le participant de test
          if (addResponse?.participant?.id) {
            try {
              await receptionService.deleteParticipant(addResponse.participant.id);
              results.tests[2].details.cleanupSuccess = true;
            } catch (cleanupError) {
              results.tests[2].details.cleanupError = cleanupError.message;
            }
          }

        } catch (error) {
          results.tests[2] = {
            name: 'Route Ajout Participant',
            status: 'error',
            details: {
              error: error.message,
              status: error.response?.status,
              data: error.response?.data,
              errors: error.errors
            }
          };
        }
      }

      // Test 4: Vérifier les permissions spécifiques
      results.tests.push({
        name: 'Permissions',
        status: 'running'
      });

      try {
        const userRole = user?.role?.libelle;
        const allowedRoles = ['Reception', 'Responsable UPAS', 'Administrateur Informatique'];
        const hasPermission = allowedRoles.includes(userRole);

        results.tests[3] = {
          name: 'Permissions',
          status: hasPermission ? 'success' : 'error',
          details: {
            userRole,
            allowedRoles,
            hasPermission
          }
        };
      } catch (error) {
        results.tests[3] = {
          name: 'Permissions',
          status: 'error',
          details: { error: error.message }
        };
      }

    } catch (globalError) {
      results.globalError = globalError.message;
    }

    setDebugResult(results);
    setLoading(false);
  };

  const testDirectAPI = async () => {
    if (!selectedCampagne) {
      alert('Veuillez sélectionner une campagne d\'abord');
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 Test direct API avec données:', testData);
      
      const result = await receptionService.addParticipant(selectedCampagne, testData);
      
      console.log('✅ Résultat test direct:', result);
      
      setDebugResult({
        timestamp: new Date().toISOString(),
        directTest: {
          status: 'success',
          result,
          message: 'Participant ajouté avec succès ! Vérifiez la liste.'
        }
      });
    } catch (error) {
      console.error('❌ Erreur test direct:', error);
      
      setDebugResult({
        timestamp: new Date().toISOString(),
        directTest: {
          status: 'error',
          error: error.message,
          details: error.response?.data || error.errors,
          fullError: error
        }
      });
    }
    setLoading(false);
  };

  const checkLaravelLogs = () => {
    alert(`
Pour vérifier les logs Laravel:

1. Ouvrez un terminal dans votre projet Laravel
2. Exécutez: tail -f storage/logs/laravel.log
3. Tentez d'ajouter un participant
4. Regardez les erreurs qui apparaissent

Vérifiez aussi:
- php artisan route:list | grep reception
- php artisan config:clear
- php artisan cache:clear
    `);
  };

  return (
    <Card sx={{ mb: 3, border: '2px dashed orange' }}>
      <CardContent>
        <Typography variant="h6" color="warning.main" gutterBottom>
          🔧 Outil de Debug - Participants
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              onClick={runFullDiagnostic}
              disabled={loading}
            >
              Diagnostic Complet
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              onClick={checkLaravelLogs}
            >
              Guide Laravel Logs
            </Button>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" gutterBottom>
          Test Direct d'Ajout:
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <TextField
              size="small"
              fullWidth
              label="Nom"
              value={testData.nom}
              onChange={(e) => setTestData({...testData, nom: e.target.value})}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              size="small"
              fullWidth
              label="Prénom"
              value={testData.prenom}
              onChange={(e) => setTestData({...testData, prenom: e.target.value})}
            />
          </Grid>
          <Grid item xs={4}>
            <Button
              variant="contained"
              fullWidth
              onClick={testDirectAPI}
              disabled={loading || !selectedCampagne}
            >
              Test Ajout
            </Button>
          </Grid>
        </Grid>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {debugResult && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Résultats du Debug:
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="caption">
                Timestamp: {debugResult.timestamp}
              </Typography>
            </Alert>

            {debugResult.tests?.map((test, index) => (
              <Alert 
                key={index}
                severity={test.status === 'success' ? 'success' : test.status === 'error' ? 'error' : 'info'}
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2">{test.name}</Typography>
                <Typography variant="caption" component="pre">
                  {JSON.stringify(test.details, null, 2)}
                </Typography>
              </Alert>
            ))}

            {debugResult.directTest && (
              <Alert 
                severity={debugResult.directTest.status === 'success' ? 'success' : 'error'}
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2">Test Direct API</Typography>
                <Typography variant="caption" component="pre">
                  {JSON.stringify(debugResult.directTest, null, 2)}
                </Typography>
              </Alert>
            )}

            {debugResult.globalError && (
              <Alert severity="error">
                Erreur globale: {debugResult.globalError}
              </Alert>
            )}
          </Box>
        )}

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="caption">
            ⚠️ Cet outil de debug est temporaire. Supprimez-le une fois le problème résolu.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default DebugParticipants;