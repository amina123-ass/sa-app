// src/contexts/NotificationContext.js - Version corrigée et optimisée

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar,
  Avatar,
  Typography,
  Chip,
  Button,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Person, 
  Security, 
  VpnKey, 
  PersonOff,
  CheckCircle,
  Info
} from '@mui/icons-material';
import api from '../services/api';

// Types de notifications avec leurs icônes et couleurs
const NOTIFICATION_TYPES = {
  user_registered: {
    icon: Person,
    color: '#2196f3',
    bgColor: '#e3f2fd',
    label: 'Inscription'
  },
  user_activated: {
    icon: CheckCircle,
    color: '#4caf50',
    bgColor: '#e8f5e9',
    label: 'Activation'
  },
  role_assigned: {
    icon: Security,
    color: '#ff9800',
    bgColor: '#fff3e0',
    label: 'Rôle'
  },
  user_deactivated: {
    icon: PersonOff,
    color: '#f44336',
    bgColor: '#ffebee',
    label: 'Désactivation'
  },
  password_reset: {
    icon: VpnKey,
    color: '#9c27b0',
    bgColor: '#f3e5f5',
    label: 'Mot de passe'
  }
};

// Reducer pour gérer l'état des notifications
const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        loading: false,
        error: null
      };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    
    case 'SET_UNREAD_COUNT':
      return {
        ...state,
        unreadCount: action.payload
      };
    
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      };
    
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    
    case 'RESET_STATE':
      return {
        ...initialState,
        // Préserver certaines valeurs lors du reset
        loading: false
      };
    
    default:
      return state;
  }
};

const initialState = {
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  loading: false,
  error: null
};

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  
  // Références pour contrôler les timers et requêtes
  const isMountedRef = useRef(true);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastLoadTimeRef = useRef(0);
  const isLoadingRef = useRef(false);
  const initializationRef = useRef(false);

  // Configuration
  const MIN_LOAD_INTERVAL = 30000; // 30 secondes minimum entre les chargements
  const RECONNECT_DELAY = 10000; // 10 secondes pour reconnexion
  const INIT_DELAY = 500; // Délai d'initialisation réduit

  // Vérifier si l'utilisateur est authentifié (version améliorée)
  const isAuthenticated = useCallback(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // Si pas de token, pas authentifié
    if (!token) {
      return false;
    }
    
    // Vérifier si le token n'est pas expiré (optionnel)
    try {
      // Si vous avez un JWT, vous pouvez vérifier l'expiration
      // const payload = JSON.parse(atob(token.split('.')[1]));
      // return payload.exp * 1000 > Date.now();
      
      // Pour l'instant, on fait confiance au token s'il existe
      return true;
    } catch (error) {
      console.warn('⚠️ Token invalide:', error);
      return false;
    }
  }, []);

  // Charger les notifications avec protection contre les appels multiples
  const loadNotifications = useCallback(async (force = false) => {
    // Vérifications de sécurité
    if (!isMountedRef.current) {
      console.log('🛑 loadNotifications ignoré : composant démonté');
      return;
    }

    if (!isAuthenticated()) {
      console.log('🛑 loadNotifications ignoré : non authentifié');
      // Ne pas reset l'état si on n'est pas initialisé
      if (initializationRef.current) {
        dispatch({ type: 'RESET_STATE' });
      }
      return;
    }

    // Éviter les appels trop fréquents
    const now = Date.now();
    if (!force && (now - lastLoadTimeRef.current) < MIN_LOAD_INTERVAL) {
      console.log('🛑 loadNotifications ignoré : trop récent');
      return;
    }

    // Éviter les appels multiples simultanés
    if (isLoadingRef.current) {
      console.log('🛑 loadNotifications ignoré : déjà en cours');
      return;
    }

    try {
      isLoadingRef.current = true;
      lastLoadTimeRef.current = now;
      
      // Marquer comme initialisé
      initializationRef.current = true;
      
      dispatch({ type: 'SET_LOADING', payload: true });

      console.log('📡 Chargement notifications...');
      
      const response = await api.get('/notifications');
      
      if (!isMountedRef.current) return;

      if (response.data.success) {
        console.log('✅ Notifications chargées:', response.data.data?.length || 0);
        
        dispatch({ 
          type: 'SET_NOTIFICATIONS', 
          payload: response.data.data || []
        });
        
        dispatch({ 
          type: 'SET_UNREAD_COUNT', 
          payload: response.data.unread_count || 0
        });
        
        // Effacer les erreurs précédentes
        dispatch({ type: 'SET_ERROR', payload: null });
      } else {
        throw new Error(response.data.message || 'Erreur lors du chargement');
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement notifications:', error);
      
      if (!isMountedRef.current) return;
      
      // Gérer les erreurs d'authentification
      if (error.response?.status === 401) {
        console.log('🔐 Erreur d\'authentification détectée');
        initializationRef.current = true; // Marquer comme initialisé même en cas d'erreur
        dispatch({ type: 'RESET_STATE' });
        return;
      }
      
      // Gérer les erreurs serveur
      let errorMessage = 'Erreur lors du chargement des notifications';
      if (error.response?.status >= 500) {
        errorMessage = 'Service temporairement indisponible. Réessayez plus tard.';
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Problème de connexion réseau';
      }
      
      dispatch({ 
        type: 'SET_ERROR', 
        payload: errorMessage
      });
      
    } finally {
      isLoadingRef.current = false;
      
      if (isMountedRef.current) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, [isAuthenticated]);

  // Marquer toutes les notifications comme lues
  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated() || !initializationRef.current) {
      return;
    }

    try {
      console.log('📝 Marquage notifications comme lues...');
      
      const response = await api.post('/notifications/read-all');
      
      if (response.data.success) {
        dispatch({ type: 'MARK_ALL_READ' });
        console.log('✅ Notifications marquées comme lues');
      }
    } catch (error) {
      console.error('❌ Erreur marquage notifications:', error);
      // Ne pas afficher d'erreur pour les problèmes de marquage
    }
  }, [isAuthenticated]);

  // Nettoyer les connexions
  const cleanup = useCallback(() => {
    console.log('🧹 Nettoyage NotificationContext...');
    
    // Fermer EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Nettoyer les timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Réinitialiser les flags
    isLoadingRef.current = false;
    
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
  }, []);

  // Connexion SSE sécurisée
  const connectSSE = useCallback(() => {
    if (!isAuthenticated() || !initializationRef.current) {
      console.log('🛑 SSE ignoré : non authentifié ou non initialisé');
      return;
    }

    cleanup(); // Nettoyer les connexions existantes

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL || '/api'}/notifications/stream?token=${token}`;
      
      console.log('🔌 Connexion SSE...', url);
      
      eventSourceRef.current = new EventSource(url);

      eventSourceRef.current.onopen = () => {
        console.log('✅ Connexion SSE établie');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
      };

      eventSourceRef.current.addEventListener('notification', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Nouvelle notification SSE:', data);
          
          if (data.notification) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: data.notification });
          }
        } catch (error) {
          console.error('❌ Erreur parsing notification SSE:', error);
        }
      });

      eventSourceRef.current.onerror = (error) => {
        console.error('❌ Erreur SSE:', error);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
        
        // Reconnexion après délai si toujours authentifié
        if (isMountedRef.current && isAuthenticated() && initializationRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && isAuthenticated()) {
              console.log('🔄 Tentative reconnexion SSE...');
              connectSSE();
            }
          }, RECONNECT_DELAY);
        }
      };

    } catch (error) {
      console.error('❌ Erreur création SSE:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Impossible de se connecter au flux temps réel' });
    }
  }, [isAuthenticated, cleanup]);

  // Fonction d'initialisation sécurisée
  const initialize = useCallback(async () => {
    if (!isMountedRef.current || initializationRef.current) {
      return;
    }

    console.log('🚀 Initialisation NotificationContext');

    if (isAuthenticated()) {
      console.log('✅ Utilisateur authentifié, chargement des notifications');
      await loadNotifications(true);
      
      // Connecter SSE après un délai
      setTimeout(() => {
        if (isMountedRef.current && isAuthenticated() && initializationRef.current) {
          connectSSE();
        }
      }, 2000);
    } else {
      console.log('ℹ️ Utilisateur non authentifié');
      initializationRef.current = true; // Marquer comme initialisé même sans auth
    }
  }, [isAuthenticated, loadNotifications, connectSSE]);

  // Effet principal d'initialisation
  useEffect(() => {
    isMountedRef.current = true;
    
    // Délai d'initialisation pour éviter les conflits
    const initTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        initialize();
      }
    }, INIT_DELAY);

    // Nettoyage au démontage
    return () => {
      isMountedRef.current = false;
      initializationRef.current = false;
      cleanup();
      clearTimeout(initTimeout);
    };
  }, []); // Dépendances vides pour n'exécuter qu'une fois

  // Effet pour surveiller les changements d'authentification
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!isMountedRef.current) return;

      if (e.key === 'token' || e.key === null) { // null = localStorage.clear()
        const wasAuthenticated = !!e.oldValue;
        const isAuthenticated_now = !!e.newValue;
        
        if (!wasAuthenticated && isAuthenticated_now) {
          // Utilisateur vient de se connecter
          console.log('🔐 Connexion détectée');
          setTimeout(() => {
            if (isMountedRef.current) {
              initializationRef.current = false; // Reset pour permettre réinitialisation
              initialize();
            }
          }, 1000);
        } else if (wasAuthenticated && !isAuthenticated_now) {
          // Utilisateur vient de se déconnecter
          console.log('🚪 Déconnexion détectée');
          cleanup();
          dispatch({ type: 'RESET_STATE' });
          initializationRef.current = false;
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [initialize, cleanup]);

  // Rafraîchissement périodique (optionnel)
  useEffect(() => {
    if (!isAuthenticated() || !initializationRef.current) {
      return;
    }

    const interval = setInterval(() => {
      if (isMountedRef.current && isAuthenticated() && initializationRef.current) {
        loadNotifications(false); // false = respecter le délai minimum
      }
    }, 60000); // Toutes les minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, loadNotifications]);

  const value = {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    isConnected: state.isConnected,
    loading: state.loading,
    error: state.error,
    markAllAsRead,
    loadNotifications: () => loadNotifications(true),
    getUnreadCount: () => state.unreadCount,
    isAuthenticated,
    isInitialized: () => initializationRef.current
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification doit être utilisé dans un NotificationProvider');
  }
  return context;
};

// Composant pour afficher la liste des notifications
export const NotificationList = ({ maxHeight = 400 }) => {
  const { 
    notifications, 
    loading, 
    error, 
    markAllAsRead, 
    unreadCount, 
    isConnected,
    isAuthenticated,
    isInitialized
  } = useNotification();

  // Si non authentifié, ne rien afficher
  if (!isAuthenticated()) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Connectez-vous pour voir vos notifications
        </Typography>
      </Box>
    );
  }

  // Si en cours d'initialisation
  if (!isInitialized() || (loading && notifications.length === 0)) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Chargement...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning" size="small">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
          Notifications
          {unreadCount > 0 && (
            <Chip 
              label={unreadCount} 
              size="small" 
              color="primary" 
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Indicateur de connexion */}
          <Box sx={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%',
            backgroundColor: isConnected ? '#4caf50' : '#ff9800'
          }} />
          
          {unreadCount > 0 && (
            <Button 
              size="small" 
              onClick={markAllAsRead}
              sx={{ fontSize: '0.75rem' }}
            >
              Tout marquer lu
            </Button>
          )}
        </Box>
      </Box>

      {/* Liste des notifications */}
      <Box sx={{ maxHeight, overflow: 'auto' }}>
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Info sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Aucune notification
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.slice(0, 20).map((notification, index) => {
              const typeConfig = NOTIFICATION_TYPES[notification.type] || {
                icon: Info,
                color: '#757575',
                bgColor: '#f5f5f5',
                label: 'Info'
              };
              
              const IconComponent = typeConfig.icon;

              return (
                <React.Fragment key={notification.id || index}>
                  <ListItem 
                    sx={{ 
                      py: 1.5,
                      backgroundColor: notification.is_read ? 'transparent' : '#f8f9fa',
                      borderLeft: !notification.is_read ? `3px solid ${typeConfig.color}` : 'none',
                      '&:hover': { backgroundColor: '#f0f0f0' }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: typeConfig.bgColor,
                        color: typeConfig.color,
                        width: 40,
                        height: 40
                      }}>
                        <IconComponent sx={{ fontSize: 20 }} />
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {notification.title || 'Notification'}
                          </Typography>
                          <Chip 
                            label={typeConfig.label}
                            size="small"
                            sx={{ 
                              fontSize: '0.7rem',
                              height: 20,
                              backgroundColor: typeConfig.bgColor,
                              color: typeConfig.color
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            {notification.message || notification.data?.message || 'Pas de message'}
                          </Typography>
                          
                          <Typography variant="caption" color="text.secondary">
                            {notification.time_ago || new Date(notification.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
};