import React, { useState, useEffect, useCallback } from 'react';
import { upasAPI, groupedListsUtils, GROUPED_LISTS_CONSTANTS, upasUtils, UPAS_CONSTANTS } from '../services/upasAPI';

const GroupedListsByCampagne = ({ campagneId, onClose }) => {
  // États principaux
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState({
    participants: [],
    admin_principal: [],
    admin_attente: []
  });
  
  // États pour les filtres/recherche par liste
  const [searchTerms, setSearchTerms] = useState({
    participants: '',
    admin_principal: '',
    admin_attente: ''
  });
  
  // États pour les actions
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionConfig, setActionConfig] = useState(null);

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await upasAPI.getGroupedListsByCampagne(campagneId);
      
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.message || 'Erreur lors du chargement');
      }
    } catch (err) {
      console.error('Erreur chargement listes groupées:', err);
      setError('Erreur lors du chargement des listes groupées');
    } finally {
      setLoading(false);
    }
  }, [campagneId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Gestion de la sélection
  const handleSelectItem = (listType, itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [listType]: prev[listType].includes(itemId)
        ? prev[listType].filter(id => id !== itemId)
        : [...prev[listType], itemId]
    }));
  };

  const handleSelectAll = (listType) => {
    if (!data) return;
    
    const listData = data[listType] || [];
    const filteredData = groupedListsUtils.filterList(listData, searchTerms[listType]);
    
    setSelectedItems(prev => ({
      ...prev,
      [listType]: prev[listType].length === filteredData.length 
        ? []
        : filteredData.map(item => item.id)
    }));
  };

  // Gestion des actions en masse
  const handleMassAction = (action, sourceListType) => {
    const selectedIds = selectedItems[sourceListType];
    if (selectedIds.length === 0) {
      alert('Aucun bénéficiaire sélectionné');
      return;
    }

    setActionConfig({
      action,
      sourceListType,
      selectedIds,
      count: selectedIds.length
    });
    setShowActionModal(true);
  };

  const executeMassAction = async () => {
    if (!actionConfig) return;

    try {
      setActionLoading(true);
      
      const { action, selectedIds } = actionConfig;
      let response;

      switch (action) {
        case GROUPED_LISTS_CONSTANTS.ACTIONS.MOVE_TO_PRINCIPAL:
          response = await upasAPI.moveToAdminPrincipal(campagneId, selectedIds);
          break;
        case GROUPED_LISTS_CONSTANTS.ACTIONS.MOVE_TO_ATTENTE:
          response = await upasAPI.moveToAdminAttente(campagneId, selectedIds);
          break;
        case GROUPED_LISTS_CONSTANTS.ACTIONS.MOVE_TO_PARTICIPANTS:
          response = await upasAPI.moveToParticipants(campagneId, selectedIds);
          break;
        case GROUPED_LISTS_CONSTANTS.ACTIONS.ACCEPTER:
          response = await upasAPI.accepterEnMasse(campagneId, selectedIds);
          break;
        case GROUPED_LISTS_CONSTANTS.ACTIONS.REFUSER:
          response = await upasAPI.refuserEnMasse(campagneId, selectedIds);
          break;
        default:
          throw new Error('Action non reconnue');
      }

      if (response.data.success) {
        alert(response.data.message);
        setSelectedItems({
          participants: [],
          admin_principal: [],
          admin_attente: []
        });
        setShowActionModal(false);
        setActionConfig(null);
        await loadData(); // Recharger les données
      } else {
        alert('Erreur: ' + response.data.message);
      }

    } catch (err) {
      console.error('Erreur action en masse:', err);
      alert('Erreur lors de l\'exécution de l\'action');
    } finally {
      setActionLoading(false);
    }
  };

  // Gestion de la recherche
  const handleSearchChange = (listType, value) => {
    setSearchTerms(prev => ({
      ...prev,
      [listType]: value
    }));
  };

  // Rendu d'une liste
  const renderList = (listType, listData, title) => {
    const filteredData = groupedListsUtils.filterList(listData, searchTerms[listType]);
    const selectedCount = selectedItems[listType].length;
    const colors = GROUPED_LISTS_CONSTANTS.LIST_COLORS[listType];

    return (
      <div className="col-lg-4 mb-4">
        <div className={`card h-100 ${colors.border}`}>
          <div className={`card-header ${colors.bg} ${colors.text}`}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                {groupedListsUtils.getListTitle(listType, filteredData.length)}
              </h5>
              {selectedCount > 0 && (
                <span className="badge badge-light">
                  {selectedCount} sélectionné(s)
                </span>
              )}
            </div>
          </div>
          
          <div className="card-body p-0">
            {/* Barre de recherche */}
            <div className="p-3 border-bottom">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Rechercher dans cette liste..."
                value={searchTerms[listType]}
                onChange={(e) => handleSearchChange(listType, e.target.value)}
              />
            </div>

            {/* Actions en masse */}
            {filteredData.length > 0 && (
              <div className="p-3 border-bottom bg-light">
                <div className="d-flex flex-wrap gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleSelectAll(listType)}
                  >
                    {selectedCount === filteredData.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                  
                  {selectedCount > 0 && (
                    <>
                      {listType !== 'admin_principal' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleMassAction(GROUPED_LISTS_CONSTANTS.ACTIONS.MOVE_TO_PRINCIPAL, listType)}
                        >
                          → Liste Principale
                        </button>
                      )}
                      
                      {listType !== 'admin_attente' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleMassAction(GROUPED_LISTS_CONSTANTS.ACTIONS.MOVE_TO_ATTENTE, listType)}
                        >
                          → Liste Attente
                        </button>
                      )}
                      
                      {listType !== 'participants' && (
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleMassAction(GROUPED_LISTS_CONSTANTS.ACTIONS.MOVE_TO_PARTICIPANTS, listType)}
                        >
                          → Participants
                        </button>
                      )}
                      
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleMassAction(GROUPED_LISTS_CONSTANTS.ACTIONS.ACCEPTER, listType)}
                      >
                        ✅ Accepter
                      </button>
                      
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleMassAction(GROUPED_LISTS_CONSTANTS.ACTIONS.REFUSER, listType)}
                      >
                        ❌ Refuser
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Liste des bénéficiaires */}
            <div className="list-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {filteredData.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  {searchTerms[listType] ? 'Aucun résultat trouvé' : 'Aucun bénéficiaire dans cette liste'}
                </div>
              ) : (
                filteredData.map((beneficiaire) => (
                  <div 
                    key={beneficiaire.id} 
                    className={`border-bottom p-3 hover-bg-light ${
                      selectedItems[listType].includes(beneficiaire.id) ? 'bg-light border-primary' : ''
                    }`}
                  >
                    <div className="d-flex align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input mt-1 me-3"
                        checked={selectedItems[listType].includes(beneficiaire.id)}
                        onChange={() => handleSelectItem(listType, beneficiaire.id)}
                      />
                      
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="mb-0">
                            {beneficiaire.nom} {beneficiaire.prenom}
                            <small className="text-muted ms-2">
                              {beneficiaire.sexe === 'M' ? '👨' : '👩'}
                              {beneficiaire.age && ` • ${beneficiaire.age} ans`}
                            </small>
                          </h6>
                          
                          {beneficiaire.decision && (
                            <span className={`badge badge-${upasUtils.getDecisionColor(beneficiaire.decision)}`}>
                              {upasUtils.getDecisionIcon(beneficiaire.decision)} {upasUtils.getDecisionLibelle(beneficiaire.decision)}
                            </span>
                          )}
                        </div>
                        
                        <div className="small text-muted">
                          <div>📞 {beneficiaire.telephone}</div>
                          {beneficiaire.email && <div>✉️ {beneficiaire.email}</div>}
                          {beneficiaire.cin && <div>🆔 {beneficiaire.cin}</div>}
                        </div>
                        
                        <div className="mt-2">
                          {beneficiaire.a_beneficie && (
                            <span className="badge badge-success me-2">A bénéficié</span>
                          )}
                          {beneficiaire.enfants_scolarises !== null && (
                            <span className={`badge me-2 ${beneficiaire.enfants_scolarises ? 'badge-info' : 'badge-secondary'}`}>
                              Scolarisé: {beneficiaire.enfants_scolarises ? 'Oui' : 'Non'}
                            </span>
                          )}
                          {beneficiaire.cote && (
                            <span className="badge badge-info me-2">{beneficiaire.cote}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Affichage du loading
  if (loading) {
    return (
      <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-body text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Chargement...</span>
              </div>
              <p className="mt-3">Chargement des listes groupées...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Affichage des erreurs
  if (error) {
    return (
      <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Erreur</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger">
                <h6>Erreur lors du chargement</h6>
                <p>{error}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
              <button className="btn btn-primary" onClick={loadData}>Réessayer</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formattedStats = groupedListsUtils.formatStatistics(data.statistics);

  return (
    <>
      {/* Modal principal */}
      <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Listes Groupées - {data.campagne.nom}
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            
            <div className="modal-body">
              {/* Statistiques globales */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6 className="card-title">📊 Statistiques Globales</h6>
                      <div className="row">
                        <div className="col-md-3">
                          <div className="text-center">
                            <div className="h4 text-info">{formattedStats.totaux.participants.count}</div>
                            <small>Participants ({formattedStats.totaux.participants.percentage}%)</small>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="text-center">
                            <div className="h4 text-primary">{formattedStats.totaux.admin_principal.count}</div>
                            <small>Liste Principale ({formattedStats.totaux.admin_principal.percentage}%)</small>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="text-center">
                            <div className="h4 text-secondary">{formattedStats.totaux.admin_attente.count}</div>
                            <small>Liste Attente ({formattedStats.totaux.admin_attente.percentage}%)</small>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="text-center">
                            <div className="h4 text-dark">{formattedStats.totaux.global.count}</div>
                            <small>Total</small>
                          </div>
                        </div>
                      </div>
                      
                      {data.statistics.credit_estime && (
                        <div className="mt-3 pt-3 border-top">
                          <h6>💰 Crédit Estimé</h6>
                          <div className="row">
                            <div className="col-md-6">
                              <small>Prix unitaire: {upasUtils.formatMontant(data.statistics.credit_estime.prix_unitaire)}</small>
                            </div>
                            <div className="col-md-6">
                              <small>Total ayant bénéficié: <strong>{upasUtils.formatMontant(data.statistics.credit_estime.total)}</strong></small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Les trois listes */}
              <div className="row">
                {renderList('participants', data.participants, 'Participants')}
                {renderList('admin_principal', data.admin_principal, 'Liste Admin Principale')}
                {renderList('admin_attente', data.admin_attente, 'Liste Admin d\'Attente')}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Fermer
              </button>
              <button className="btn btn-outline-primary" onClick={loadData}>
                🔄 Actualiser
              </button>
              <button 
                className="btn btn-success"
                onClick={() => {
                  // Fonctionnalité d'export à implémenter
                  alert('Export des listes groupées - À implémenter');
                }}
              >
                📥 Exporter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation d'action */}
      {showActionModal && actionConfig && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmer l'action</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowActionModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Êtes-vous sûr de vouloir <strong>{GROUPED_LISTS_CONSTANTS.ACTION_LABELS[actionConfig.action] || actionConfig.action}</strong> pour <strong>{actionConfig.count}</strong> bénéficiaire(s) sélectionné(s) ?
                </p>
                <p className="text-muted">
                  Cette action modifiera la décision de ces bénéficiaires et les déplacera dans la liste appropriée.
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowActionModal(false)}
                  disabled={actionLoading}
                >
                  Annuler
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={executeMassAction}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Traitement...
                    </>
                  ) : (
                    'Confirmer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GroupedListsByCampagne;