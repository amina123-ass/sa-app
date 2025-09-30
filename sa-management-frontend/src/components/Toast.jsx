// src/components/Toast.jsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const Toast = ({
  show = false,
  message = '',
  type = 'success', // 'success', 'error', 'warning', 'info'
  duration = 5000,
  onClose,
  position = 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
  autoClose = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsExiting(false);
      
      if (autoClose && duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [show, duration, autoClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, 300); // Durée de l'animation de sortie
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="toast-icon" size={20} />;
      case 'error':
        return <XCircle className="toast-icon" size={20} />;
      case 'warning':
        return <AlertCircle className="toast-icon" size={20} />;
      case 'info':
        return <Info className="toast-icon" size={20} />;
      default:
        return <CheckCircle className="toast-icon" size={20} />;
    }
  };

  const getProgressBarColor = () => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#4caf50';
    }
  };

  if (!show && !isVisible) return null;

  return (
    <div className={`toast-container ${position}`}>
      <div 
        className={`toast toast-${type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
        role="alert"
        aria-live="polite"
      >
        <div className="toast-content">
          <div className="toast-icon-wrapper">
            {getIcon()}
          </div>
          
          <div className="toast-message">
            {message}
          </div>
          
          <button
            className="toast-close-btn"
            onClick={handleClose}
            aria-label="Fermer la notification"
          >
            <X size={16} />
          </button>
        </div>
        
        {autoClose && duration > 0 && (
          <div 
            className="toast-progress"
            style={{
              backgroundColor: getProgressBarColor(),
              animationDuration: `${duration}ms`
            }}
          />
        )}
      </div>
    </div>
  );
};

// Hook personnalisé pour gérer les toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success', options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      show: true,
      ...options
    };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto-remove after duration
    const duration = options.duration || 5000;
    if (options.autoClose !== false && duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const removeAllToasts = () => {
    setToasts([]);
  };

  const showSuccess = (message, options = {}) => {
    return addToast(message, 'success', options);
  };

  const showError = (message, options = {}) => {
    return addToast(message, 'error', { ...options, duration: options.duration || 7000 });
  };

  const showWarning = (message, options = {}) => {
    return addToast(message, 'warning', options);
  };

  const showInfo = (message, options = {}) => {
    return addToast(message, 'info', options);
  };

  return {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

// Composant ToastContainer pour afficher plusieurs toasts
export const ToastContainer = ({ toasts = [], onRemove, position = 'top-right' }) => {
  if (toasts.length === 0) return null;

  return (
    <div className={`toast-stack ${position}`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          show={toast.show}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          autoClose={toast.autoClose}
          position={position}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

export default Toast;