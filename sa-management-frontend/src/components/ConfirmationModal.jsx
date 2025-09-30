// src/components/ConfirmationModal.jsx
import React from 'react';
import { X, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import './ConfirmationModal.css';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation',
  message = 'Êtes-vous sûr de vouloir continuer ?',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning', // 'warning', 'danger', 'success', 'info'
  loading = false,
  children
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <XCircle className="modal-icon danger" size={24} />;
      case 'success':
        return <CheckCircle className="modal-icon success" size={24} />;
      case 'info':
        return <Info className="modal-icon info" size={24} />;
      case 'warning':
      default:
        return <AlertTriangle className="modal-icon warning" size={24} />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'btn btn-danger';
      case 'success':
        return 'btn btn-success';
      case 'info':
        return 'btn btn-info';
      case 'warning':
      default:
        return 'btn btn-warning';
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && !loading) {
      onConfirm();
    }
  };

  return (
    <div 
      className="confirmation-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className={`confirmation-modal ${type}`}>
        <div className="modal-header">
          <div className="modal-title-section">
            {getIcon()}
            <h3 className="modal-title">{title}</h3>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {children ? children : (
            <p className="modal-message">{message}</p>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={getConfirmButtonClass()}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                Traitement...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;