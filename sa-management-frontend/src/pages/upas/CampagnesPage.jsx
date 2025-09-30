// src/pages/upas/CampagnesPage.jsx - VERSION MÉDICALE PROFESSIONNELLE
import React, { useState, useEffect } from 'react';
import { upasAPI } from '../../services/upasAPI';
import { handleApiError } from '../../services/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import './CampagnesPage.css';

const CampagnesPage = () => {
  // États principaux
  const [campagnes, setCampagnes] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
    type_assistance_id: '',
    page: 1,
    per_page: 15,
    sort_by: 'created_at',
    sort_dir: 'desc'
  });
  
  // États pour les options de formulaire - initialisation robuste
  const [formOptions, setFormOptions] = useState({
    types_assistance: [],
    statuts_campagne: [
      { value: 'Active', label: 'Active' },
      { value: 'Inactive', label: 'Inactive' },
      { value: 'En cours', label: 'En cours' },
      { value: 'Terminée', label: 'Terminée' },
      { value: 'Annulée', label: 'Annulée' }
    ]
  });
  
  // États pour le chargement des options
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(null);
  
  // États pour les modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCampagne, setSelectedCampagne] = useState(null);
  const [formData, setFormData] = useState({});

  // Charger les types d'assistance avec fallback multiple
  const loadTypesAssistance = async () => {
    try {
      console.log('🔄 Chargement des types d\'assistance...');
      setOptionsError(null);

      // Première tentative: route spécialisée
      try {
        console.log('📋 Tentative 1: Route spécialisée types assistance');
        const response = await upasAPI.getTypesAssistance();
        
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const types = response.data.data.map(type => ({
            id: type.id,
            value: type.id,
            label: type.libelle || type.label,
            libelle: type.libelle || type.label,
            description: type.description || ''
          }));
          
          console.log('✅ Types assistance chargés (route spécialisée):', types.length);
          setFormOptions(prev => ({ ...prev, types_assistance: types }));
          return types;
        }
      } catch (error) {
        console.warn('⚠️ Route spécialisée échouée:', error.message);
      }

      // Deuxième tentative: route form-options
      try {
        console.log('📋 Tentative 2: Route form-options');
        const response = await upasAPI.getFormOptions();
        
        if (response.data && response.data.success && response.data.data) {
          const data = response.data.data;
          
          if (Array.isArray(data.types_assistance) && data.types_assistance.length > 0) {
            const types = data.types_assistance.map(type => ({
              id: type.id,
              value: type.id || type.value,
              label: type.libelle || type.label,
              libelle: type.libelle || type.label,
              description: type.description || ''
            }));
            
            console.log('✅ Types assistance chargés (form-options):', types.length);
            setFormOptions(prev => ({ 
              ...prev, 
              types_assistance: types,
              statuts_campagne: Array.isArray(data.statuts_campagne) ? data.statuts_campagne : prev.statuts_campagne
            }));
            return types;
          }
        }
      } catch (error) {
        console.warn('⚠️ Route form-options échouée:', error.message);
      }

      // Troisième tentative: route getAllFormOptions
      try {
        console.log('📋 Tentative 3: Route getAllFormOptions');
        const response = await upasAPI.getAllFormOptions();
        
        if (response.data && response.data.data) {
          const data = response.data.data;
          
          if (Array.isArray(data.types_assistance) && data.types_assistance.length > 0) {
            const types = data.types_assistance.map(type => ({
              id: type.id,
              value: type.id || type.value,
              label: type.libelle || type.label,
              libelle: type.libelle || type.label,
              description: type.description || ''
            }));
            
            console.log('✅ Types assistance chargés (getAllFormOptions):', types.length);
            setFormOptions(prev => ({ 
              ...prev, 
              types_assistance: types 
            }));
            return types;
          }
        }
      } catch (error) {
        console.warn('⚠️ Route getAllFormOptions échouée:', error.message);
      }

      // Quatrième tentative: Créer les types par défaut via l'API
      try {
        console.log('📋 Tentative 4: Création des types par défaut');
        const createResponse = await upasAPI.createDefaultTypesAssistance();
        
        if (createResponse.data && createResponse.data.success) {
          console.log('✅ Types par défaut créés, rechargement...');
          // Recharger après création
          const reloadResponse = await upasAPI.getTypesAssistance();
          
          if (reloadResponse.data && reloadResponse.data.success) {
            const types = reloadResponse.data.data.map(type => ({
              id: type.id,
              value: type.id,
              label: type.libelle,
              libelle: type.libelle,
              description: type.description || ''
            }));
            
            setFormOptions(prev => ({ ...prev, types_assistance: types }));
            return types;
          }
        }
      } catch (error) {
        console.warn('⚠️ Création types par défaut échouée:', error.message);
      }

      // Fallback final: types statiques
      console.log('📋 Fallback: Types d\'assistance statiques');
      const typesStatiques = [
        { id: 1, value: 1, label: 'Lunettes', libelle: 'Lunettes' },
        { id: 2, value: 2, label: 'Appareils Auditifs', libelle: 'Appareils Auditifs' },
        { id: 3, value: 3, label: 'Fauteuils Roulants', libelle: 'Fauteuils Roulants' },
        { id: 4, value: 4, label: 'Cannes Blanches', libelle: 'Cannes Blanches' },
        { id: 5, value: 5, label: 'Prothèses', libelle: 'Prothèses' }
      ];
      
      setFormOptions(prev => ({ ...prev, types_assistance: typesStatiques }));
      setOptionsError('Utilisation des types par défaut - Veuillez contacter l\'administrateur');
      return typesStatiques;

    } catch (error) {
      console.error('❌ Erreur critique chargement types assistance:', error);
      setOptionsError('Impossible de charger les types d\'assistance');
      
      // Même en cas d'erreur, fournir des types minimaux
      const typesMinimaux = [
        { id: 1, value: 1, label: 'Lunettes', libelle: 'Lunettes' },
        { id: 2, value: 2, label: 'Appareils Auditifs', libelle: 'Appareils Auditifs' }
      ];
      
      setFormOptions(prev => ({ ...prev, types_assistance: typesMinimaux }));
      return typesMinimaux;
    }
  };

  // Charger les campagnes
  const loadCampagnes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Chargement des campagnes avec filtres:', filters);
      
      const response = await upasAPI.getCampagnes(filters);
      
      if (response.data.success) {
        setCampagnes(response.data.data || []);
        setPagination({
          current_page: response.data.current_page || 1,
          per_page: response.data.per_page || 15,
          total: response.data.total || 0,
          last_page: response.data.last_page || 1
        });
        
        console.log('✅ Campagnes chargées:', response.data.data?.length || 0);
      } else {
        setError(response.data.message || 'Erreur lors du chargement des campagnes');
        setCampagnes([]);
      }
    } catch (err) {
      console.error('❌ Erreur campagnes:', err);
      setError(handleApiError(err));
      setCampagnes([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger toutes les options avec gestion d'erreurs
  const loadAllFormOptions = async () => {
    try {
      setOptionsLoading(true);
      setOptionsError(null);
      
      console.log('🔄 Chargement de toutes les options...');
      
      // Charger les types d'assistance en priorité
      await loadTypesAssistance();
      
      // Charger d'autres options si nécessaire
      // Les statuts sont déjà définis par défaut dans l'état initial
      
      console.log('✅ Toutes les options chargées');
      
    } catch (error) {
      console.error('❌ Erreur chargement options:', error);
      setOptionsError('Erreur lors du chargement des options de formulaire');
    } finally {
      setOptionsLoading(false);
    }
  };

  // Charger les données au montage et quand les filtres changent
  useEffect(() => {
    loadCampagnes();
  }, [filters]);

  useEffect(() => {
    loadAllFormOptions();
  }, []);

  // Gérer les changements de filtres
  const handleFilterChange = (key, value) => {
    console.log(`🔄 Changement filtre ${key}:`, value);
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset page sauf si on change la page
    }));
  };

  // Gérer la pagination
  const handlePageChange = (newPage) => {
    handleFilterChange('page', newPage);
  };

  // Formater les dates
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch (e) {
      return dateString;
    }
  };

  // Formater les montants
  const formatAmount = (amount) => {
    if (!amount) return '-';
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'MAD'
      }).format(amount);
    } catch (e) {
      return amount + ' DH';
    }
  };

  // Ouvrir le modal de création
  const handleCreate = () => {
    setFormData({
      nom: '',
      description: '',
      type_assistance_id: '',
      date_debut: '',
      date_fin: '',
      lieu: '',
      budget: '',
      nombre_participants_prevu: ''
    });
    setShowCreateModal(true);
  };

  // Ouvrir le modal d'édition
  const handleEdit = (campagne) => {
    setSelectedCampagne(campagne);
    setFormData({
      nom: campagne.nom || '',
      description: campagne.description || '',
      type_assistance_id: campagne.type_assistance_id || '',
      date_debut: campagne.date_debut || '',
      date_fin: campagne.date_fin || '',
      lieu: campagne.lieu || '',
      statut: campagne.statut || '',
      budget: campagne.budget || '',
      nombre_participants_prevu: campagne.nombre_participants_prevu || ''
    });
    setShowEditModal(true);
  };

  // Supprimer une campagne
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) {
      return;
    }

    try {
      const response = await upasAPI.deleteCampagne(id);
      if (response.data.success) {
        loadCampagnes(); // Recharger la liste
        alert('Campagne supprimée avec succès');
      } else {
        alert(response.data.message || 'Erreur lors de la suppression');
      }
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let response;
      
      if (showCreateModal) {
        console.log('🔄 Création campagne:', formData);
        response = await upasAPI.createCampagne(formData);
        setShowCreateModal(false);
        alert('Campagne créée avec succès');
      } else if (showEditModal) {
        console.log('🔄 Mise à jour campagne:', selectedCampagne.id, formData);
        response = await upasAPI.updateCampagne(selectedCampagne.id, formData);
        setShowEditModal(false);
        alert('Campagne mise à jour avec succès');
      }
      
      if (response && response.data.success) {
        loadCampagnes(); // Recharger la liste
      } else {
        alert(response?.data?.message || 'Erreur lors de l\'opération');
      }
    } catch (err) {
      console.error('❌ Erreur soumission:', err);
      alert(handleApiError(err));
    }
  };

  // Diagnostic des types d'assistance
  const handleDiagnosticTypes = async () => {
    try {
      const response = await upasAPI.diagnosticTypesAssistance();
      console.log('🔍 Diagnostic types assistance:', response.data);
      
      if (response.data.success) {
        alert('Diagnostic OK - Voir la console pour les détails');
      } else {
        alert('Problèmes détectés - Voir la console pour les détails');
      }
    } catch (error) {
      console.error('❌ Erreur diagnostic:', error);
      alert('Erreur lors du diagnostic');
    }
  };

  // Affichage pendant le chargement initial
  if (loading && campagnes.length === 0) {
    return (
      <div className="medical-campagnes-page">
        <LoadingSpinner message="Chargement des campagnes médicales..." />
      </div>
    );
  }

  return (
    <div className="medical-campagnes-page">
      {/* En-tête médical */}
      <div className="medical-page-header">
        <div className="medical-header-content">
          <div className="medical-header-info">
            <h1 className="medical-page-title">
              <span className="medical-icon">🏥</span>
              Gestion des Campagnes Médicales
            </h1>
            <p className="medical-page-subtitle">
              Planification et suivi des programmes d'assistance médicale
            </p>
          </div>
          <div className="medical-header-actions">
            <button 
              className="medical-btn medical-btn-primary"
              onClick={handleCreate}
            >
              <span className="medical-btn-icon">➕</span>
              Nouvelle Campagne
            </button>
            
            {/* Bouton de diagnostic en cas de problème */}
            {optionsError && (
              <button 
                className="medical-btn medical-btn-warning"
                onClick={handleDiagnosticTypes}
                title="Diagnostiquer les problèmes de types d'assistance"
              >
                <span className="medical-btn-icon">🔍</span>
                Diagnostic
              </button>
            )}
            
            {/* Bouton de rechargement des options */}
            <button 
              className="medical-btn medical-btn-secondary"
              onClick={loadAllFormOptions}
              disabled={optionsLoading}
              title="Recharger les options de formulaire"
            >
              <span className="medical-btn-icon">{optionsLoading ? '⏳' : '🔄'}</span>
              Recharger Options
            </button>
          </div>
        </div>
      </div>

      {/* Affichage des erreurs d'options */}
      {optionsError && (
        <div className="medical-alert medical-alert-warning">
          <div className="medical-alert-icon">⚠️</div>
          <div className="medical-alert-content">
            <strong>Problème avec les options de formulaire:</strong> {optionsError}
            <br />
            <small>Les fonctionnalités peuvent être limitées. Contactez l'administrateur si le problème persiste.</small>
          </div>
        </div>
      )}

      {/* Section de filtres médicaux */}
      <div className="medical-filters-section">
        <div className="medical-card">
          <div className="medical-card-header">
            <h3 className="medical-card-title">
              <span className="medical-icon">🔍</span>
              Filtres de recherche
            </h3>
          </div>
          <div className="medical-card-body">
            <div className="medical-filters-grid">
              <div className="medical-form-group">
                <label className="medical-label">Recherche</label>
                <input
                  type="text"
                  placeholder="Nom, lieu, description..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="medical-input"
                />
              </div>

              <div className="medical-form-group">
                <label className="medical-label">Statut</label>
                <select
                  value={filters.statut}
                  onChange={(e) => handleFilterChange('statut', e.target.value)}
                  className="medical-select"
                >
                  <option value="">Tous les statuts</option>
                  {formOptions.statuts_campagne.map(statut => (
                    <option key={statut.value} value={statut.value}>
                      {statut.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="medical-form-group">
                <label className="medical-label">
                  Type d'assistance
                  {optionsLoading && <span className="medical-loading-indicator">⏳</span>}
                  {formOptions.types_assistance.length === 0 && !optionsLoading && (
                    <span className="medical-error-indicator">⚠️</span>
                  )}
                </label>
                <select
                  value={filters.type_assistance_id}
                  onChange={(e) => handleFilterChange('type_assistance_id', e.target.value)}
                  className="medical-select"
                  disabled={optionsLoading}
                >
                  <option value="">Tous les types</option>
                  {formOptions.types_assistance.map(type => (
                    <option key={type.id || type.value} value={type.id || type.value}>
                      {type.label || type.libelle}
                    </option>
                  ))}
                </select>
                
                {/* Message d'aide si pas de types d'assistance */}
                {formOptions.types_assistance.length === 0 && !optionsLoading && (
                  <small className="medical-help-text medical-text-danger">
                    Aucun type d'assistance disponible
                  </small>
                )}
              </div>

              <div className="medical-form-group">
                <label className="medical-label">Trier par</label>
                <select
                  value={filters.sort_by}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  className="medical-select"
                >
                  <option value="created_at">Date de création</option>
                  <option value="nom">Nom</option>
                  <option value="date_debut">Date de début</option>
                  <option value="date_fin">Date de fin</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Affichage des erreurs */}
      {error && (
        <div className="medical-alert medical-alert-danger">
          <div className="medical-alert-icon">❌</div>
          <div className="medical-alert-content">
            <ErrorMessage 
              message={error} 
              onRetry={loadCampagnes}
            />
          </div>
        </div>
      )}

      {/* Tableau des campagnes médicales */}
      {!loading && !error && (
        <>
          <div className="medical-card">
            <div className="medical-card-header">
              <h3 className="medical-card-title">
                <span className="medical-icon">📋</span>
                Campagnes Médicales
                {pagination && (
                  <span className="medical-badge medical-badge-info">
                    {pagination.total} campagne{pagination.total > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
            </div>
            <div className="medical-table-container">
              <table className="medical-table">
                <thead>
                  <tr>
                    <th>Campagne</th>
                    <th>Type d'assistance</th>
                    <th>Période</th>
                    <th>Lieu</th>
                    <th>Statut</th>
                    <th>Budget</th>
                    <th>Participants</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campagnes.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="medical-table-empty">
                        <div className="medical-empty-state">
                          <span className="medical-empty-icon">📋</span>
                          <p>
                            {filters.search || filters.statut || filters.type_assistance_id ? 
                              'Aucune campagne ne correspond aux critères de recherche' : 
                              'Aucune campagne médicale trouvée'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    campagnes.map((campagne) => (
                      <tr key={campagne.id}>
                        <td>
                          <div className="medical-cell-content">
                            <strong className="medical-campagne-name">{campagne.nom}</strong>
                            {campagne.description && (
                              <small className="medical-campagne-description">{campagne.description}</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="medical-type-badge">
                            {campagne.type_assistance || '-'}
                          </span>
                        </td>
                        <td>
                          <div className="medical-date-range">
                            <div className="medical-date-item">
                              <small>Du</small> {formatDate(campagne.date_debut)}
                            </div>
                            <div className="medical-date-item">
                              <small>Au</small> {formatDate(campagne.date_fin)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="medical-location">
                            {campagne.lieu || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`medical-status-badge medical-status-${campagne.statut?.toLowerCase()?.replace(' ', '-')}`}>
                            {campagne.statut}
                          </span>
                        </td>
                        <td>
                          <span className="medical-amount">
                            {formatAmount(campagne.budget)}
                          </span>
                        </td>
                        <td>
                          <span className="medical-participants">
                            {campagne.nombre_participants_prevu || '-'}
                          </span>
                        </td>
                        <td>
                          <div className="medical-action-buttons">
                            <button
                              className="medical-btn medical-btn-sm medical-btn-secondary"
                              onClick={() => handleEdit(campagne)}
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button
                              className="medical-btn medical-btn-sm medical-btn-danger"
                              onClick={() => handleDelete(campagne.id)}
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination médicale */}
          {pagination && pagination.last_page > 1 && (
            <div className="medical-pagination-container">
              <Pagination
                currentPage={pagination.current_page}
                lastPage={pagination.last_page}
                total={pagination.total}
                perPage={pagination.per_page}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {/* Modal de création */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouvelle Campagne Médicale"
        size="large"
      >
        <CampagneForm
          formData={formData}
          setFormData={setFormData}
          formOptions={formOptions}
          onSubmit={handleSubmit}
          onCancel={() => setShowCreateModal(false)}
          isEdit={false}
          optionsLoading={optionsLoading}
        />
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier la Campagne Médicale"
        size="large"
      >
        <CampagneForm
          formData={formData}
          setFormData={setFormData}
          formOptions={formOptions}
          onSubmit={handleSubmit}
          onCancel={() => setShowEditModal(false)}
          isEdit={true}
          optionsLoading={optionsLoading}
        />
      </Modal>
    </div>
  );
};

// Composant formulaire de campagne - VERSION MÉDICALE SANS COÛT UNITAIRE
const CampagneForm = ({ 
  formData, 
  setFormData, 
  formOptions, 
  onSubmit, 
  onCancel, 
  isEdit, 
  optionsLoading = false 
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={onSubmit} className="medical-campagne-form">
      <div className="medical-form-grid">
        <div className="medical-form-group">
          <label className="medical-label medical-label-required">Nom de la campagne</label>
          <input
            type="text"
            name="nom"
            value={formData.nom || ''}
            onChange={handleChange}
            className="medical-input"
            required
            placeholder="Nom de la campagne médicale"
          />
        </div>

        <div className="medical-form-group">
          <label className="medical-label medical-label-required">
            Type d'assistance médicale
            {optionsLoading && <span className="medical-loading-indicator">⏳</span>}
          </label>
          <select
            name="type_assistance_id"
            value={formData.type_assistance_id || ''}
            onChange={handleChange}
            className="medical-select"
            required
            disabled={optionsLoading}
          >
            <option value="">Sélectionner un type d'assistance</option>
            {Array.isArray(formOptions.types_assistance) && formOptions.types_assistance.map(type => (
              <option key={type.id || type.value} value={type.id || type.value}>
                {type.label || type.libelle}
              </option>
            ))}
          </select>
          
          {/* Message d'aide */}
          {!optionsLoading && formOptions.types_assistance.length === 0 && (
            <small className="medical-help-text medical-text-danger">
              Aucun type d'assistance disponible. Contactez l'administrateur.
            </small>
          )}
        </div>

        <div className="medical-form-group">
          <label className="medical-label medical-label-required">Date de début</label>
          <input
            type="date"
            name="date_debut"
            value={formData.date_debut || ''}
            onChange={handleChange}
            className="medical-input"
            required
          />
        </div>

        <div className="medical-form-group">
          <label className="medical-label medical-label-required">Date de fin</label>
          <input
            type="date"
            name="date_fin"
            value={formData.date_fin || ''}
            onChange={handleChange}
            className="medical-input"
            required
          />
        </div>

        <div className="medical-form-group">
          <label className="medical-label">Lieu de la campagne</label>
          <input
            type="text"
            name="lieu"
            value={formData.lieu || ''}
            onChange={handleChange}
            className="medical-input"
            placeholder="Centre médical, hôpital, clinique..."
          />
        </div>

        {isEdit && (
          <div className="medical-form-group">
            <label className="medical-label">Statut de la campagne</label>
            <select
              name="statut"
              value={formData.statut || ''}
              onChange={handleChange}
              className="medical-select"
            >
              {Array.isArray(formOptions.statuts_campagne) && formOptions.statuts_campagne.map(statut => (
                <option key={statut.value} value={statut.value}>
                  {statut.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="medical-form-group">
          <label className="medical-label">Budget alloué (DH)</label>
          <input
            type="number"
            name="budget"
            value={formData.budget || ''}
            onChange={handleChange}
            className="medical-input"
            min="0"
            step="0.01"
            placeholder="0.00"
          />
          <small className="medical-help-text">Budget total en dirhams marocains</small>
        </div>

        <div className="medical-form-group">
          <label className="medical-label">Nombre de bénéficiaires prévus</label>
          <input
            type="number"
            name="nombre_participants_prevu"
            value={formData.nombre_participants_prevu || ''}
            onChange={handleChange}
            className="medical-input"
            min="0"
            placeholder="0"
          />
          <small className="medical-help-text">Estimation du nombre de patients</small>
        </div>
      </div>

      <div className="medical-form-group medical-form-group-full">
        <label className="medical-label">Description de la campagne</label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          className="medical-textarea"
          rows="4"
          placeholder="Objectifs, population cible, modalités d'organisation..."
        />
        <small className="medical-help-text">
          Décrivez les objectifs et modalités de cette campagne médicale
        </small>
      </div>

      {/* Actions du formulaire */}
      <div className="medical-form-actions">
        <button 
          type="button" 
          className="medical-btn medical-btn-secondary" 
          onClick={onCancel}
        >
          <span className="medical-btn-icon">❌</span>
          Annuler
        </button>
        <button 
          type="submit" 
          className="medical-btn medical-btn-primary"
          disabled={optionsLoading || formOptions.types_assistance.length === 0}
        >
          <span className="medical-btn-icon">{isEdit ? '💾' : '➕'}</span>
          {isEdit ? 'Mettre à jour' : 'Créer la campagne'}
        </button>
      </div>
      
      {/* Information sur l'état du formulaire */}
      {optionsLoading && (
        <div className="medical-form-status medical-form-status-loading">
          <span className="medical-status-icon">⏳</span>
          Chargement des options de formulaire...
        </div>
      )}
      
      {!optionsLoading && formOptions.types_assistance.length === 0 && (
        <div className="medical-form-status medical-form-status-error">
          <span className="medical-status-icon">⚠️</span>
          Impossible de créer une campagne sans types d'assistance disponibles
        </div>
      )}
    </form>
  );
};

export default CampagnesPage;