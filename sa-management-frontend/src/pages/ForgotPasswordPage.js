import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { authService } from '../services/authService';

const steps = ['Méthode', 'Vérification', 'Nouveau mot de passe'];

const ForgotPasswordPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleMethodSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.forgotPassword(email, method);
      
      if (method === 'security') {
        setQuestions(response.questions);
        setAnswers(response.questions.map(q => ({ question_id: q.id, answer: '' })));
      } else {
        setSuccess('Email de réinitialisation envoyé !');
      }
      
      setActiveStep(1);
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de la demande');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.verifySecurityAnswers(email, answers);
      setResetToken(response.reset_token);
      localStorage.setItem('auth_token', response.reset_token);
      setActiveStep(2);
    } catch (error) {
      setError('Réponses incorrectes. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(newPassword, confirmPassword);
      setSuccess('Mot de passe réinitialisé avec succès !');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => prev.map(answer => 
      answer.question_id === questionId 
        ? { ...answer, answer: value }
        : answer
    ));
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              SA Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Récupération de mot de passe
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Étape 1: Choix méthode */}
          {activeStep === 0 && (
            <Box component="form" onSubmit={handleMethodSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Nom d'utilisateur ou Email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <FormControl component="fieldset" sx={{ mt: 2, mb: 2 }}>
                <FormLabel component="legend">Méthode de récupération</FormLabel>
                <RadioGroup
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <FormControlLabel 
                    value="security" 
                    control={<Radio />} 
                    label="Questions de sécurité" 
                  />
                  <FormControlLabel 
                    value="email" 
                    control={<Radio />} 
                    label="Email de réinitialisation" 
                  />
                </RadioGroup>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  fullWidth
                >
                  Retour
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Continuer'}
                </Button>
              </Box>
            </Box>
          )}

          {/* Étape 2: Questions de sécurité */}
          {activeStep === 1 && method === 'security' && (
            <Box component="form" onSubmit={handleSecuritySubmit}>
              <Typography variant="h6" gutterBottom>
                Répondez à vos questions de sécurité
              </Typography>
              
              {questions.map((question, index) => (
                <Box key={question.id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {question.question}
                  </Typography>
                  <TextField
                    fullWidth
                    required
                    value={answers.find(a => a.question_id === question.id)?.answer || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Votre réponse"
                  />
                </Box>
              ))}

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                  fullWidth
                >
                  Retour
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Vérifier'}
                </Button>
              </Box>
            </Box>
          )}

          {/* Étape 3: Nouveau mot de passe */}
          {activeStep === 2 && (
            <Box component="form" onSubmit={handlePasswordReset}>
              <Typography variant="h6" gutterBottom>
                Créer un nouveau mot de passe
              </Typography>

              <TextField
                margin="normal"
                required
                fullWidth
                name="newPassword"
                label="Nouveau mot de passe"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Au moins 8 caractères"
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirmer le mot de passe"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Réinitialiser'}
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPasswordPage;