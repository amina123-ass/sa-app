import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

const SecuritySetupPage = () => {
  const [formData, setFormData] = useState({
    password: '',
    password_confirmation: '',
    security_answers: [
      { question_id: '', answer: '' },
      { question_id: '', answer: '' },
      { question_id: '', answer: '' }
    ]
  });
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setupSecurity } = useAuth();

  // Récupérer l'email depuis les paramètres URL ou state
  const email = searchParams.get('email') || location.state?.email;
  const isVerified = searchParams.get('verified') === 'true';

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }

    // Si l'email vient d'être vérifié, afficher un message de succès
    if (isVerified) {
      setSuccess('Email vérifié avec succès ! Vous pouvez maintenant configurer votre sécurité.');
    }

    const loadQuestions = async () => {
      try {
        const data = await authService.getSecurityQuestions();
        setQuestions(data);
      } catch (error) {
        setError('Erreur lors du chargement des questions');
      }
    };

    loadQuestions();
  }, [email, isVerified, navigate]);

  const handlePasswordChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      security_answers: prev.security_answers.map((answer, i) =>
        i === index ? { ...answer, [field]: value } : answer
      )
    }));
  };

  const getAvailableQuestions = (currentIndex) => {
    const selectedQuestions = formData.security_answers
      .map((answer, index) => index !== currentIndex ? answer.question_id : null)
      .filter(Boolean);
    
    return questions.filter(q => !selectedQuestions.includes(q.id.toString()));
  };

  const isStepValid = () => {
    if (currentQuestion === 0) {
      return formData.password.length >= 8 && 
             formData.password === formData.password_confirmation;
    }
    
    if (currentQuestion <= 3) {
      const questionIndex = currentQuestion - 1;
      const answer = formData.security_answers[questionIndex];
      return answer.question_id && answer.answer.trim().length >= 2;
    }
    
    return true;
  };

  const nextStep = () => {
    if (currentQuestion < 4) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      await setupSecurity({
        email,
        ...formData
      });
      setSuccess('Configuration terminée ! Votre compte sera activé par un administrateur.');
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Configuration terminée ! Votre compte sera activé par un administrateur.' 
          }
        });
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (currentQuestion === 0) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Choisissez votre mot de passe
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Email vérifié: <strong>{email}</strong>
          </Typography>
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Mot de passe"
            type="password"
            value={formData.password}
            onChange={handlePasswordChange}
            helperText="Au moins 8 caractères"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password_confirmation"
            label="Confirmer le mot de passe"
            type="password"
            value={formData.password_confirmation}
            onChange={handlePasswordChange}
          />
        </Box>
      );
    }

    if (currentQuestion >= 1 && currentQuestion <= 3) {
      const questionIndex = currentQuestion - 1;
      const answer = formData.security_answers[questionIndex];
      
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Question de sécurité {currentQuestion} sur 3
          </Typography>
          <FormControl fullWidth margin="normal">
            <InputLabel>Sélectionnez une question</InputLabel>
            <Select
              value={answer.question_id}
              onChange={(e) => handleQuestionChange(questionIndex, 'question_id', e.target.value)}
            >
              {getAvailableQuestions(questionIndex).map((question) => (
                <MenuItem key={question.id} value={question.id.toString()}>
                  {question.question}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Votre réponse"
            value={answer.answer}
            onChange={(e) => handleQuestionChange(questionIndex, 'answer', e.target.value)}
            helperText="Minimum 2 caractères"
          />
        </Box>
      );
    }

    if (currentQuestion === 4) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Récapitulatif de vos questions de sécurité
          </Typography>
          {formData.security_answers.map((answer, index) => {
            const question = questions.find(q => q.id.toString() === answer.question_id);
            return (
              <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Question {index + 1}: {question?.question}
                </Typography>
                <Typography variant="body2">
                  Réponse: {answer.answer}
                </Typography>
              </Box>
            );
          })}
        </Box>
      );
    }
  };

  const progress = ((currentQuestion + 1) / 5) * 100;

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
              Configuration de la sécurité
            </Typography>
          </Box>

          <LinearProgress variant="determinate" value={progress} sx={{ mb: 3 }} />

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

          {renderStep()}

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            {currentQuestion > 0 && (
              <Button
                variant="outlined"
                onClick={prevStep}
                disabled={loading}
              >
                Précédent
              </Button>
            )}
            
            {currentQuestion < 4 ? (
              <Button
                variant="contained"
                onClick={nextStep}
                disabled={!isStepValid() || loading}
                fullWidth={currentQuestion === 0}
              >
                Suivant
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Terminer'}
              </Button>
            )}
          </Box>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Vous configurez le compte pour: <strong>{email}</strong>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default SecuritySetupPage;