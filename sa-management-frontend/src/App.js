// src/App.js - Version complète avec activation d'utilisateur intégrée
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Contexts existants
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { UpasProvider } from './contexts/UpasContext';

// Services de notifications
import { useAdminNotificationService } from './services/notificationService';

// Composants de protection
import ProtectedRoute from './components/ProtectedRoute';

// Import des layouts existants
import UpasLayoutSimple from './components/Layout/UpasLayoutSimple';
import ReceptionLayout from './components/Layout/ReceptionLayout';
import AdminLayout from './components/Layout/AdminLayout'; // Layout admin

// Pages publiques
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SecuritySetupPage from './pages/SecuritySetupPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Pages Admin AVEC notifications intégrées
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersManagement from './pages/admin/UsersManagement';
import UserActivationPage from './pages/admin/UserActivationPage'; // ← NOUVELLE PAGE
import ActivationErrorPage from './pages/admin/ActivationErrorPage'; // ← NOUVELLE PAGE
import RolesAssignment from './pages/admin/RolesAssignment';
import DictionaryPage from './pages/admin/DictionaryPage';
import SettingsPage from './pages/admin/SettingsPage';

// Pages UPAS existantes (SANS DashboardUpas)
import AssistancesPage from './pages/upas/TypesAssistancePage';
import BeneficiairesPage from './pages/upas/BeneficiairesPage';
import CampagnesPage from './pages/upas/CampagnesPage';
import KafalasPage from './pages/upas/KafalasPage';
import StatistiquesPage from './pages/upas/StatistiquesRapportsPage';

// Pages Reception existantes
import ReceptionDashboard from './pages/reception/ReceptionDashboard';
import CampagnesManager from './pages/reception/CampagnesManager';
import ImportExcel from './pages/reception/ImportExcel';
import ParticipantsManager from './pages/reception/ParticipantsManager';
import BeneficiairesOui from './pages/reception/BeneficiairesOui';
import BeneficiairesNon from './pages/reception/BeneficiairesNon';

// Styles pour les notifications
import './styles/notifications.css';

// Thème personnalisé SA étendu
const saTheme = createTheme({
  palette: {
    primary: {
      main: '#3498db',
      light: '#5dade2',
      dark: '#2980b9',
      lighter: '#ebf3fd'
    },
    secondary: {
      main: '#2ecc71',
    },
    success: {
      main: '#2ecc71',
      lighter: '#d5f4e6'
    },
    error: {
      main: '#e74c3c',
      lighter: '#fadbd8'
    },
    warning: {
      main: '#f39c12',
      lighter: '#fef5e7'
    },
    info: {
      main: '#17a2b8',
      lighter: '#d1ecf1'
    },
    background: {
      default: '#f5f5f5',
    },
    // Couleurs pour notifications
    notification: {
      admin: '#3498db',
      upas: '#2196f3',
      reception: '#9c27b0',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336'
    }
  },
  typography: {
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f8f9fa',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500
        }
      }
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }
      }
    }
  },
});

// Wrapper pour initialiser les notifications admin
const AdminNotificationWrapper = ({ children }) => {
  useAdminNotificationService(process.env.REACT_APP_API_URL);
  return children;
};

function App() {
  return (
    <ThemeProvider theme={saTheme}>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <AdminNotificationWrapper>
            <UpasProvider>
              <Router>
                <Routes>
                  {/* ===== ROUTES PUBLIQUES ===== */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/security-setup" element={<SecuritySetupPage />} />
                  <Route path="/email-verified" element={<EmailVerificationPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  
                  {/* ===== ROUTES D'ACTIVATION (PUBLIC/SEMI-PUBLIC) ===== */}
                  <Route path="/admin/users/:userId/activate" element={<UserActivationPage />} />
                  <Route path="/activation-error" element={<ActivationErrorPage />} />
                  
                  {/* ===== ROUTES ADMIN AVEC NOTIFICATIONS ===== */}
                  <Route 
                    path="/admin/*" 
                    element={
                      <ProtectedRoute requiredRole="Administrateur Informatique">
                        <AdminLayout>
                          <Routes>
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="users" element={<UsersManagement />} />
                            <Route path="users/:userId/activate" element={<UserActivationPage />} />
                            <Route path="roles" element={<RolesAssignment />} />
                            <Route path="dictionary" element={<DictionaryPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                            <Route path="" element={<Navigate to="dashboard" replace />} />
                            <Route path="*" element={<Navigate to="dashboard" replace />} />
                          </Routes>
                        </AdminLayout>
                      </ProtectedRoute>
                    } 
                  />

                  {/* ===== ROUTES UPAS SANS DASHBOARD - Redirection vers Bénéficiaires ===== */}
                  <Route 
                    path="/upas/*" 
                    element={
                      <ProtectedRoute requiredRole="Responsable UPAS">
                        <UpasLayoutSimple>
                          <Routes>
                            <Route path="campagnes" element={<CampagnesPage />} />
                            <Route path="beneficiaires" element={<BeneficiairesPage />} />
                            
                            <Route path="kafalas" element={<KafalasPage />} />
                            <Route path="assistances" element={<AssistancesPage />} />
                            <Route path="budgets" element={<BudgetsDashboard />} />
                            <Route path="statistiques" element={<StatistiquesPage />} />
                            <Route path="parametres" element={<ParametresPage />} />
                            {/* Redirection par défaut vers Bénéficiaires au lieu du dashboard */}
                            <Route path="dashboard" element={<Navigate to="../beneficiaires" replace />} />
                            <Route path="" element={<Navigate to="beneficiaires" replace />} />
                            <Route path="*" element={<Navigate to="beneficiaires" replace />} />
                          </Routes>
                        </UpasLayoutSimple>
                      </ProtectedRoute>
                    } 
                  />

                  {/* ===== ROUTE DASHBOARD RECEPTION DIRECT ===== */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute requiredRole="Reception">
                        <ReceptionLayout>
                          <ReceptionDashboard />
                        </ReceptionLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* ===== ROUTES RECEPTION AVEC NOTIFICATIONS ===== */}
                  <Route 
                    path="/reception/*" 
                    element={
                      <ProtectedRoute requiredRole="Reception">
                        <ReceptionLayout>
                          <Routes>
                            <Route path="campagnes" element={<CampagnesManager />} />
                            <Route path="import" element={<ImportExcel />} />
                            <Route path="participants" element={<ParticipantsManager />} />
                            <Route path="beneficiaires-oui" element={<BeneficiairesOui />} />
                            <Route path="beneficiaires-non" element={<BeneficiairesNon />} />
                            <Route path="dashboard" element={<Navigate to="/dashboard" replace />} />
                            <Route path="" element={<Navigate to="/dashboard" replace />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                          </Routes>
                        </ReceptionLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* ===== ROUTES GESTIONNAIRE STOCK ===== */}
                  <Route 
                    path="/stock/*" 
                    element={
                      <ProtectedRoute requiredRole="Gestionnaire de Stock">
                        <Routes>
                          <Route path="dashboard" element={<StockDashboard />} />
                          <Route path="" element={<Navigate to="dashboard" replace />} />
                          <Route path="*" element={<Navigate to="dashboard" replace />} />
                        </Routes>
                      </ProtectedRoute>
                    }
                  />

                  {/* ===== ROUTES BÉNÉFICIAIRE ===== */}
                  <Route 
                    path="/beneficiaire/*" 
                    element={
                      <ProtectedRoute requiredRole="Bénéficiaire">
                        <Routes>
                          <Route path="dashboard" element={<BeneficiaireDashboard />} />
                          <Route path="" element={<Navigate to="dashboard" replace />} />
                          <Route path="*" element={<Navigate to="dashboard" replace />} />
                        </Routes>
                      </ProtectedRoute>
                    }
                  />

                  {/* ===== REDIRECTION INTELLIGENTE ===== */}
                  <Route path="/" element={<SmartRedirect />} />

                  {/* ===== PAGE 404 ===== */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Router>
            </UpasProvider>
          </AdminNotificationWrapper>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// ===== COMPOSANTS TEMPORAIRES POUR LES MODULES EN DÉVELOPPEMENT =====

const BudgetsDashboard = () => (
  <div style={{ 
    padding: '40px 20px', 
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <div style={{
      backgroundColor: 'white',
      padding: '60px 40px',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      maxWidth: '600px'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: '#f39c12',
        borderRadius: '50%',
        margin: '0 auto 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        color: 'white'
      }}>
        💰
      </div>
      <h2 style={{ 
        color: '#2c3e50', 
        marginBottom: '20px',
        fontSize: '2.5rem',
        fontWeight: '600'
      }}>
        Gestion Budgétaire UPAS
      </h2>
      <p style={{ 
        color: '#7f8c8d', 
        fontSize: '1.2rem',
        marginBottom: '10px',
        lineHeight: '1.6'
      }}>
        Suivi et contrôle des budgets des campagnes
      </p>
      <p style={{ 
        color: '#e67e22', 
        fontSize: '1rem',
        fontWeight: '500'
      }}>
        🚧 Module en cours de développement...
      </p>
    </div>
  </div>
);

const ParametresPage = () => (
  <div style={{ 
    padding: '40px 20px', 
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <div style={{
      backgroundColor: 'white',
      padding: '60px 40px',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      maxWidth: '600px'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: '#95a5a6',
        borderRadius: '50%',
        margin: '0 auto 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        color: 'white'
      }}>
        ⚙️
      </div>
      <h2 style={{ 
        color: '#2c3e50', 
        marginBottom: '20px',
        fontSize: '2.5rem',
        fontWeight: '600'
      }}>
        Paramètres UPAS
      </h2>
      <p style={{ 
        color: '#7f8c8d', 
        fontSize: '1.2rem',
        marginBottom: '10px',
        lineHeight: '1.6'
      }}>
        Configuration et paramètres du système
      </p>
      <p style={{ 
        color: '#e67e22', 
        fontSize: '1rem',
        fontWeight: '500'
      }}>
        🚧 Module en cours de développement...
      </p>
    </div>
  </div>
);

const StockDashboard = () => (
  <div style={{ 
    padding: '40px 20px', 
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <div style={{
      backgroundColor: 'white',
      padding: '60px 40px',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      maxWidth: '600px'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: '#3498db',
        borderRadius: '50%',
        margin: '0 auto 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        color: 'white'
      }}>
        📦
      </div>
      <h2 style={{ 
        color: '#2c3e50', 
        marginBottom: '20px',
        fontSize: '2.5rem',
        fontWeight: '600'
      }}>
        Module Gestionnaire de Stock
      </h2>
      <p style={{ 
        color: '#7f8c8d', 
        fontSize: '1.2rem',
        marginBottom: '10px',
        lineHeight: '1.6'
      }}>
        Gestion complète des équipements médicaux
      </p>
      <p style={{ 
        color: '#e67e22', 
        fontSize: '1rem',
        fontWeight: '500'
      }}>
        🚧 En cours de développement...
      </p>
    </div>
  </div>
);

const BeneficiaireDashboard = () => (
  <div style={{ 
    padding: '40px 20px', 
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <div style={{
      backgroundColor: 'white',
      padding: '60px 40px',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      maxWidth: '600px'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: '#2ecc71',
        borderRadius: '50%',
        margin: '0 auto 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        color: 'white'
      }}>
        👤
      </div>
      <h2 style={{ 
        color: '#2c3e50', 
        marginBottom: '20px',
        fontSize: '2.5rem',
        fontWeight: '600'
      }}>
        Espace Bénéficiaire
      </h2>
      <p style={{ 
        color: '#7f8c8d', 
        fontSize: '1.2rem',
        marginBottom: '10px',
        lineHeight: '1.6'
      }}>
        Suivi de vos demandes d'assistance médicale
      </p>
      <p style={{ 
        color: '#e67e22', 
        fontSize: '1rem',
        fontWeight: '500'
      }}>
        🚧 En cours de développement...
      </p>
    </div>
  </div>
);

// ===== SMART REDIRECT MODIFIÉ =====
const SmartRedirect = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('auth_token');

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!user.role?.libelle) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  switch (user.role.libelle) {
    case 'Administrateur Informatique':
      return <Navigate to="/admin/dashboard" replace />;
    case 'Responsable UPAS':
      // Redirection directe vers Bénéficiaires au lieu du dashboard
      return <Navigate to="/upas/beneficiaires" replace />;
    case 'Reception':
      return <Navigate to="/reception/dashboard" replace />;
    case 'Gestionnaire de Stock':
      return <Navigate to="/stock/dashboard" replace />;
    case 'Bénéficiaire':
      return <Navigate to="/beneficiaire/dashboard" replace />;
    default:
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      return <Navigate to="/login" replace />;
  }
};

// ===== PAGE 404 =====
const NotFoundPage = () => {
  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      textAlign: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '60px 40px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{
          fontSize: '6rem',
          margin: '0 0 20px 0',
          color: '#3498db',
          fontWeight: 'bold'
        }}>
          404
        </div>
        
        <h2 style={{ 
          color: '#2c3e50', 
          marginBottom: '20px',
          fontSize: '2rem',
          fontWeight: '600'
        }}>
          Page non trouvée
        </h2>
        
        <p style={{ 
          color: '#7f8c8d', 
          marginBottom: '30px',
          fontSize: '1.1rem'
        }}>
          La page que vous recherchez n'existe pas.
        </p>
        
        <button 
          onClick={handleGoBack}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            marginRight: '10px'
          }}
        >
          ← Retour
        </button>
        
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            color: '#3498db',
            border: '2px solid #3498db',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🏠 Accueil
        </button>
      </div>
    </div>
  );
};

export default App;
