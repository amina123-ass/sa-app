// src/components/ErrorMessage.jsx
import React from 'react';
import './ErrorMessage.css';

const ErrorMessage = ({ 
  message = 'Une erreur est survenue', 
  onRetry, 
  retryText = 'Réessayer',
  type = 'error' 
}) => {
  return (
    <div className={`error-container ${type}`}>
      <div className="error-icon">
        {type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
      </div>
      <div className="error-content">
        <p className="error-message">{message}</p>
        {onRetry && (
          <button 
            className="btn btn-retry" 
            onClick={onRetry}
          >
            🔄 {retryText}
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;