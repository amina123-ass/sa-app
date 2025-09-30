
// src/components/NotificationBell.jsx - Composant cloche de notifications corrigé

import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import useNotifications from '../hooks/useNotifications';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loading, error, markAllAsRead } = useNotifications();
  
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };
  
  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setIsOpen(false);
  };
  
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'À l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins}min`;
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      if (diffDays < 7) return `Il y a ${diffDays}j`;
      return date.toLocaleDateString('fr-FR');
    } catch {
      return 'Date inconnue';
    }
  };
  
  return (
    <div className="relative">
      {/* Bouton cloche */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        
        {/* Badge de notifications non lues */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Indicateur de chargement */}
        {loading && (
          <span className="absolute -top-1 -right-1 bg-blue-500 rounded-full h-3 w-3 animate-pulse"></span>
        )}
      </button>
      
      {/* Dropdown des notifications */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-sm text-gray-500">({unreadCount} non lues)</span>
              )}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Actions */}
          {unreadCount > 0 && (
            <div className="p-2 border-b border-gray-100">
              <button
                onClick={handleMarkAllRead}
                className="w-full text-sm text-blue-600 hover:text-blue-800 text-center py-1 px-2 rounded hover:bg-blue-50 transition-colors"
              >
                Marquer toutes comme lues
              </button>
            </div>
          )}
          
          {/* Contenu */}
          <div className="max-h-64 overflow-y-auto">
            {error && (
              <div className="p-4 text-center text-red-600 text-sm">
                Erreur: {error}
              </div>
            )}
            
            {!error && notifications.length === 0 && !loading && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Aucune notification
              </div>
            )}
            
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  !notification.read_at ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {notification.data?.title || 'Notification'}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.data?.message || 'Aucun message'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.read_at && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="p-2 border-t border-gray-100 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
