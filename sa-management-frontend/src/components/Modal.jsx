// src/components/Modal.jsx - Composant Modal nécessaire
import React, { useEffect } from 'react';
import './Modal.css';

const Modal = ({ 
  title, 
  children, 
  onClose, 
  size = 'medium', 
  isOpen = true,
  closeOnOverlayClick = true,
  showCloseButton = true 
}) => {
  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Empêcher le scroll de la page
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const sizeClasses = {
    small: 'modal-small',
    medium: 'modal-medium', 
    large: 'modal-large',
    xlarge: 'modal-xlarge'
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-container ${sizeClasses[size]}`}>
        {/* En-tête du modal */}
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          {showCloseButton && (
            <button 
              className="modal-close-button" 
              onClick={onClose}
              type="button"
              aria-label="Fermer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Contenu du modal */}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;