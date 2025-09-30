// src/components/DebugUpas.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import api from '../services/api';

const DebugUpas = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  // Test 1: API de base
  const testBasicAPI = async () => {
    setLoading(prev => ({ ...prev, basic: true }));
    try {
      const response = await api.get('/test-upas-simple');
      setResults(prev => ({ ...prev, basic: response.data }));
      setErrors(prev => ({ ...prev, basic: null }));
    } catch (error) {
      setErrors(prev => ({ ...prev, basic: error.message }));
      setResults(prev => ({ ...prev, basic: null }));
    } finally {
      setLoading(prev => ({ ...prev, basic: false }));
    }
  };

  // Test 2: Modèles
  const testModels = async () => {
    setLoading(prev => ({ ...prev, models: true }));
    try {
      const response = await api.get('/test-upas-models');
      setResults(prev => ({ ...prev, models: response.data }));
      setErrors(prev => ({ ...prev, models: null }));
    } catch (error) {
      setErrors(prev => ({ ...prev, models: error.message }));
      setResults(prev => ({ ...prev, models: null }));
    } finally {
      setLoading(prev => ({ ...prev, models: false }));
    }
  };

  // Test 3: Contrôleur
  const testController = async () => {
    setLoading(prev => ({ ...prev, controller: true }));
    try {
      const response = await api.get('/test-upas-controller');
      setResults(prev => ({ ...prev, controller: response.data }));
      setErrors(prev => ({ ...prev, controller: null }));
    } catch (error) {
      setErrors(prev => ({ ...prev, controller: error.message }));
      setResults(prev => ({ ...prev, controller: null }));
    } finally {
      setLoading(prev => ({ ...prev, controller: false }));
    }
  };

  // Test 4: Endpoints UPAS réels
  const testRealEndpoints = async () => {
    setLoading(prev => ({ ...prev, endpoints: true }));
    try {
      const tests = {};
      
      // Test Dashboard
      try {
        const dashboardResponse = await api.get('/upas/dashboard');
        tests.dashboard = {
          status: 'success',
          data: dashboardResponse.data,
          dataKeys: Object.keys(dashboardResponse.data)
        };
      } catch (error) {
        tests.dashboard = {
          status: 'error',
          error: error.message
        };
      }
      
      // Test Form Data
      try {
        const formDataResponse = await api.get('/upas/form-data');
        tests.formData = {
          status: 'success',
          data: formDataResponse.data,
          dataKeys: Object.keys(formDataResponse.data)
        };
      } catch (error) {
        tests.formData = {
          status: 'error',
          error: error.message
        };
      }
      
      // Test Beneficiaires
      try {
        const beneficiairesResponse = await api.get('/upas/beneficiaires');
        tests.beneficiaires = {
          status: 'success',
          data: beneficiairesResponse.data,
          total: beneficiairesResponse.data.total || 0
        };
      } catch (error) {
        tests.beneficiaires = {
          status: 'error',
          error: error.message
        };
      }
      
      setResults(prev => ({ ...prev, endpoints: tests }));
      setErrors(prev => ({ ...prev, endpoints: null }));
    } catch (error) {
      setErrors(prev => ({ ...prev, endpoints: error.message }));
      setResults(prev => ({ ...prev, endpoints: null }));
    } finally {
      setLoading(prev => ({ ...prev, endpoints: false }));
    }
  };

  // Créer des données minimales
  const createMinimalData = async () => {
    setLoading(prev => ({ ...prev, create: true }));
    try {
      const response = await api.get('/force-create-minimal-data');
      setResults(prev => ({ ...prev, create: response.data }));
      setErrors(prev => ({ ...prev, create: null }));
    } catch (error) {
      setErrors(prev => ({ ...prev, create: error.message }));
      setResults(prev => ({ ...prev, create: null }));
    } finally {
      setLoading(prev => ({ ...prev, create: false }));
    }
  };

  // Test localStorage et token
  const testAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    setResults(prev => ({ 
      ...prev, 
      auth: {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        hasUser: !!user,
        userParsed: user ? JSON.parse(user) : null,
        apiHeaders: api.defaults.headers
      }
    }));
  };

  // Exécuter tous les tests
  const runAllTests = async () => {
    await testBasicAPI();
    await testModels();
    await testController();
    await testRealEndpoints();
    testAuth();
  };

  useEffect(() => {
    testAuth();
  }, []);

  const ResultCard = ({ title, result, error, isLoading, onTest }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{title}</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={isLoading ? <CircularProgress size={16} /> : <PlayArrowIcon />}
            onClick={onTest}
            disabled={isLoading}
          >
            {isLoading ? 'Test...' : 'Tester'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {result && (
          <Box>
            <Chip 
              label="Succès" 
              color="success" 
              size="small" 
              sx={{ mb: 2 }}
            />
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">Voir les détails</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <pre style={{ 
                  fontSize: '12px', 
                  overflow: 'auto', 
                  backgroundColor: '#f5f5f5', 
                  padding: '10px',
                  borderRadius: '4px'
                }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔍 Debug UPAS - Diagnostic des Données
      </Typography>

      <Box mb={3}>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={runAllTests}
          size="large"
        >
          Exécuter Tous les Tests
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ResultCard
            title="1. Test API de Base"
            result={results.basic}
            error={errors.basic}
            isLoading={loading.basic}
            onTest={testBasicAPI}
          />

          <ResultCard
            title="2. Test des Modèles"
            result={results.models}
            error={errors.models}
            isLoading={loading.models}
            onTest={testModels}
          />

          <ResultCard
            title="3. Test du Contrôleur"
            result={results.controller}
            error={errors.controller}
            isLoading={loading.controller}
            onTest={testController}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <ResultCard
            title="4. Test Endpoints Réels"
            result={results.endpoints}
            error={errors.endpoints}
            isLoading={loading.endpoints}
            onTest={testRealEndpoints}
          />

          <ResultCard
            title="5. Authentification"
            result={results.auth}
            error={errors.auth}
            isLoading={false}
            onTest={testAuth}
          />

          <ResultCard
            title="6. Créer Données Minimales"
            result={results.create}
            error={errors.create}
            isLoading={loading.create}
            onTest={createMinimalData}
          />
        </Grid>
      </Grid>

      {/* Résumé */}
      <Card sx={{ mt: 3, backgroundColor: '#f0f7ff' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Résumé du Diagnostic
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Tests Réussis:</strong> {Object.values(results).filter(r => r && !r.error).length}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Tests en Erreur:</strong> {Object.values(errors).filter(e => e).length}
              </Typography>
            </Grid>
          </Grid>

          {/* Instructions basées sur les résultats */}
          <Box mt={2}>
            <Typography variant="body2" gutterBottom>
              <strong>Prochaines étapes:</strong>
            </Typography>
            
            {!results.basic && (
              <Alert severity="error" sx={{ mb: 1 }}>
                ❌ API de base inaccessible - Vérifiez que le serveur Laravel fonctionne
              </Alert>
            )}
            
            {results.models && Object.values(results.models).some(v => typeof v === 'number' && v === 0) && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                ⚠️ Certaines tables sont vides - Cliquez sur "Créer Données Minimales"
              </Alert>
            )}
            
            {results.endpoints && results.endpoints.dashboard?.status === 'error' && (
              <Alert severity="error" sx={{ mb: 1 }}>
                ❌ Endpoint Dashboard en erreur - Vérifiez le contrôleur UpasController
              </Alert>
            )}
            
            {results.auth && !results.auth.hasToken && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                ⚠️ Pas de token d'authentification - Connectez-vous d'abord
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DebugUpas;