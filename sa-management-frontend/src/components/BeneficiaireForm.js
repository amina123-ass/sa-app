import React, { useState, useEffect } from 'react';
import './BeneficiaireForm.css';

const BeneficiaireForm = ({
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  formSubmitting,
  onSubmit,
  onCancel,
  formOptions,
  selectedBeneficiaire = null,
  isEdit = false
}) => {

  // ✅ ÉTATS LOCAUX POUR LA GESTION DES CHAMPS CONDITIONNELS
  const [selectedTypeAssistance, setSelectedTypeAssistance] = useState(null);
  const [selectedCampagne, setSelectedCampagne] = useState(null);
  const [isMineur, setIsMineur] = useState(false);
  const [showConditionalFields, setShowConditionalFields] = useState({
    enfants_scolarises: false,
    cote: false,
    lateralite: false,
    decision_fields: false
  });

  // ✅ CALCUL DE L'ÂGE
  const calculateAge = (dateNaissance) => {
    if (!dateNaissance) return null;
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // ✅ EFFET: Détecter les changements de date de naissance
  useEffect(() => {
    if (formData.date_naissance) {
      const age = calculateAge(formData.date_naissance);
      const estMineur = age !== null && age < 18;
      setIsMineur(estMineur);
      
      console.log('🎂 Âge calculé:', { age, estMineur });
    } else {
      setIsMineur(false);
    }
  }, [formData.date_naissance]);

  // ✅ EFFET: Détecter les changements de type d'assistance
  useEffect(() => {
    if (formData.type_assistance_id) {
      const typeAssistance = formOptions.types_assistance?.find(
        t => t.id == formData.type_assistance_id
      );
      setSelectedTypeAssistance(typeAssistance);
      
      console.log('🩺 Type assistance sélectionné:', typeAssistance);
    } else {
      setSelectedTypeAssistance(null);
    }
  }, [formData.type_assistance_id, formOptions.types_assistance]);

  // ✅ EFFET: Détecter les changements de campagne
  useEffect(() => {
    if (formData.campagne_id && !formData.hors_campagne) {
      const campagne = [...(formOptions.campagnes || []), ...(formOptions.campagnes_actives || []), ...(formOptions.campagnes_terminees || [])]
        .find(c => c.id == formData.campagne_id);
      setSelectedCampagne(campagne);
      
      console.log('🏥 Campagne sélectionnée:', campagne);
    } else {
      setSelectedCampagne(null);
    }
  }, [formData.campagne_id, formData.hors_campagne, formOptions]);

  // ✅ EFFET: Calculer les champs conditionnels à afficher
  useEffect(() => {
    const typeLibelle = selectedTypeAssistance?.libelle?.toLowerCase() || '';
    const campagneType = selectedCampagne?.type_assistance?.toLowerCase() || '';
    const finalTypeLibelle = typeLibelle || campagneType || '';

    // ✅ LOGIQUE DES CHAMPS CONDITIONNELS
    const newConditionalFields = {
      // Enfants scolarisés: obligatoire pour les mineurs avec lunettes ou appareils auditifs
      enfants_scolarises: isMineur && (
        finalTypeLibelle.includes('lunette') || 
        finalTypeLibelle.includes('auditif') ||
        finalTypeLibelle.includes('appareil auditif')
      ),
      
      // Côté: obligatoire pour les appareils auditifs
      cote: finalTypeLibelle.includes('auditif') || finalTypeLibelle.includes('appareil auditif'),
      
      // Latéralité: pour certains types d'assistance
      lateralite: finalTypeLibelle.includes('auditif') || 
                  finalTypeLibelle.includes('orthopedique') ||
                  finalTypeLibelle.includes('prothese'),
      
      // Champs de décision: toujours disponibles mais conditionnels selon le contexte
      decision_fields: true
    };

    setShowConditionalFields(newConditionalFields);

    console.log('🔧 Champs conditionnels calculés:', {
      typeLibelle: finalTypeLibelle,
      isMineur,
      conditionalFields: newConditionalFields
    });

  }, [selectedTypeAssistance, selectedCampagne, isMineur]);

  // ✅ GESTION DES CHANGEMENTS DE CHAMPS
  const handleFieldChange = (field, value) => {
    console.log('📝 Changement champ:', { field, value });

    // Réinitialiser les champs conditionnels si nécessaire
    let newFormData = { ...formData, [field]: value };

    // Si changement de type d'assistance, réinitialiser les champs spécifiques
    if (field === 'type_assistance_id') {
      newFormData = {
        ...newFormData,
        enfants_scolarises: null,
        cote: '',
        lateralite: ''
      };
    }

    // Si hors campagne activé, vider la campagne
    if (field === 'hors_campagne' && value) {
      newFormData.campagne_id = '';
    }

    // Si campagne sélectionnée, désactiver hors campagne
    if (field === 'campagne_id' && value) {
      newFormData.hors_campagne = false;
    }

    setFormData(newFormData);

    // Effacer l'erreur du champ modifié
    if (formErrors[field]) {
      const newErrors = { ...formErrors };
      delete newErrors[field];
      setFormErrors(newErrors);
    }
  };

  // ✅ GESTION DE LA SOUMISSION
  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('📤 Soumission formulaire:', {
      isEdit,
      data: formData,
      conditionalFields: showConditionalFields
    });

    if (onSubmit) {
      onSubmit(e);
    }
  };

  // ✅ VALIDATION EN TEMPS RÉEL
  const getFieldError = (field) => {
    return formErrors[field] || null;
  };

  const isFieldRequired = (field) => {
    const baseRequired = ['nom', 'prenom', 'sexe', 'date_naissance', 'telephone', 'adresse', 'type_assistance_id'];
    
    if (baseRequired.includes(field)) {
      return true;
    }

    // Champs conditionnellement requis
    if (field === 'enfants_scolarises' && showConditionalFields.enfants_scolarises) {
      return true;
    }

    if (field === 'cote' && showConditionalFields.cote) {
      return true;
    }

    if (field === 'campagne_id' && !formData.hors_campagne) {
      return true;
    }

    return false;
  };

  return (
    <div className="beneficiaire-form">
      <form onSubmit={handleSubmit} className="medical-form">
        
        {/* ✅ SECTION: INFORMATIONS PERSONNELLES */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon">👤</span>
            Informations Personnelles
          </h3>
          
          <div className="form-grid">
            {/* Nom */}
            <div className="form-group">
              <label className="form-label required">
                <span className="label-icon">📝</span>
                Nom
              </label>
              <input
                type="text"
                className={`form-input ${getFieldError('nom') ? 'error' : ''}`}
                value={formData.nom || ''}
                onChange={(e) => handleFieldChange('nom', e.target.value)}
                placeholder="Nom de famille"
                required
              />
              {getFieldError('nom') && (
                <span className="error-message">{getFieldError('nom')}</span>
              )}
            </div>

            {/* Prénom */}
            <div className="form-group">
              <label className="form-label required">
                <span className="label-icon">📝</span>
                Prénom
              </label>
              <input
                type="text"
                className={`form-input ${getFieldError('prenom') ? 'error' : ''}`}
                value={formData.prenom || ''}
                onChange={(e) => handleFieldChange('prenom', e.target.value)}
                placeholder="Prénom"
                required
              />
              {getFieldError('prenom') && (
                <span className="error-message">{getFieldError('prenom')}</span>
              )}
            </div>

            {/* Sexe */}
            <div className="form-group">
              <label className="form-label required">
                <span className="label-icon">👥</span>
                Sexe
              </label>
              <select
                className={`form-select ${getFieldError('sexe') ? 'error' : ''}`}
                value={formData.sexe || ''}
                onChange={(e) => handleFieldChange('sexe', e.target.value)}
                required
              >
                <option value="">Sélectionner le sexe</option>
                {formOptions.sexes?.map(sexe => (
                  <option key={sexe.value} value={sexe.value}>
                    {sexe.label}
                  </option>
                ))}
              </select>
              {getFieldError('sexe') && (
                <span className="error-message">{getFieldError('sexe')}</span>
              )}
            </div>

            {/* Date de naissance */}
            <div className="form-group">
              <label className="form-label required">
                <span className="label-icon">🎂</span>
                Date de naissance
                {isMineur && <span className="minor-badge">👶 Mineur</span>}
              </label>
              <input
                type="date"
                className={`form-input ${getFieldError('date_naissance') ? 'error' : ''}`}
                value={formData.date_naissance || ''}
                onChange={(e) => handleFieldChange('date_naissance', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
              {formData.date_naissance && (
                <small className="field-info">
                  Âge: {calculateAge(formData.date_naissance)} ans
                </small>
              )}
              {getFieldError('date_naissance') && (
                <span className="error-message">{getFieldError('date_naissance')}</span>
              )}
            </div>

            {/* CIN */}
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">🆔</span>
                CIN
              </label>
              <input
                type="text"
                className={`form-input ${getFieldError('cin') ? 'error' : ''}`}
                value={formData.cin || ''}
                onChange={(e) => handleFieldChange('cin', e.target.value)}
                placeholder="Numéro CIN"
              />
              {getFieldError('cin') && (
                <span className="error-message">{getFieldError('cin')}</span>
              )}
            </div>
          </div>
        </div>

        {/* ✅ SECTION: CONTACT */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon">📞</span>
            Informations de Contact
          </h3>
          
          <div className="form-grid">
            {/* Téléphone */}
            <div className="form-group">
              <label className="form-label required">
                <span className="label-icon">📱</span>
                Téléphone
              </label>
              <input
                type="tel"
                className={`form-input ${getFieldError('telephone') ? 'error' : ''}`}
                value={formData.telephone || ''}
                onChange={(e) => handleFieldChange('telephone', e.target.value)}
                placeholder="0612345678"
                required
              />
              {getFieldError('telephone') && (
                <span className="error-message">{getFieldError('telephone')}</span>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">✉️</span>
                Email
              </label>
              <input
                type="email"
                className={`form-input ${getFieldError('email') ? 'error' : ''}`}
                value={formData.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="exemple@email.com"
              />
              {getFieldError('email') && (
                <span className="error-message">{getFieldError('email')}</span>
              )}
            </div>

            {/* Adresse */}
            <div className="form-group full-width">
              <label className="form-label required">
                <span className="label-icon">📍</span>
                Adresse
              </label>
              <textarea
                className={`form-textarea ${getFieldError('adresse') ? 'error' : ''}`}
                value={formData.adresse || ''}
                onChange={(e) => handleFieldChange('adresse', e.target.value)}
                placeholder="Adresse complète"
                rows="3"
                required
              />
              {getFieldError('adresse') && (
                <span className="error-message">{getFieldError('adresse')}</span>
              )}
            </div>
          </div>
        </div>

        {/* ✅ SECTION: TYPE D'ASSISTANCE ET CAMPAGNE */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon">🩺</span>
            Type d'Assistance et Campagne
          </h3>
          
          <div className="form-grid">
            {/* Type d'assistance */}
            <div className="form-group">
              <label className="form-label required">
                <span className="label-icon">🏥</span>
                Type d'assistance
              </label>
              <select
                className={`form-select ${getFieldError('type_assistance_id') ? 'error' : ''}`}
                value={formData.type_assistance_id || ''}
                onChange={(e) => handleFieldChange('type_assistance_id', e.target.value)}
                required
              >
                <option value="">Sélectionner le type</option>
                {formOptions.types_assistance?.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.libelle}
                  </option>
                ))}
              </select>
              {selectedTypeAssistance && (
                <small className="field-info">
                  🩺 {selectedTypeAssistance.libelle}
                </small>
              )}
              {getFieldError('type_assistance_id') && (
                <span className="error-message">{getFieldError('type_assistance_id')}</span>
              )}
            </div>

            {/* Hors campagne */}
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">⚠️</span>
                Hors campagne
              </label>
              <div className="form-checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={formData.hors_campagne || false}
                    onChange={(e) => handleFieldChange('hors_campagne', e.target.checked)}
                  />
                  <span className="checkbox-text">Ce bénéficiaire est hors campagne</span>
                </label>
              </div>
            </div>

            {/* Campagne */}
            {!formData.hors_campagne && (
              <div className="form-group full-width">
                <label className="form-label required">
                  <span className="label-icon">🏥</span>
                  Campagne médicale
                </label>
                <select
                  className={`form-select ${getFieldError('campagne_id') ? 'error' : ''}`}
                  value={formData.campagne_id || ''}
                  onChange={(e) => handleFieldChange('campagne_id', e.target.value)}
                  required={!formData.hors_campagne}
                >
                  <option value="">Sélectionner une campagne</option>
                  
                  {/* Campagnes actives */}
                  {formOptions.campagnes_actives?.length > 0 && (
                    <optgroup label="🩺 Campagnes Actives">
                      {formOptions.campagnes_actives.map(campagne => (
                        <option key={`active-${campagne.id}`} value={campagne.id}>
                          {campagne.nom} ({campagne.type_assistance || 'Type non défini'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Campagnes terminées */}
                  {formOptions.campagnes_terminees?.length > 0 && (
                    <optgroup label="✅ Campagnes Terminées">
                      {formOptions.campagnes_terminees.map(campagne => (
                        <option key={`terminated-${campagne.id}`} value={campagne.id}>
                          {campagne.nom} ({campagne.type_assistance || 'Type non défini'}) - Terminée
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Autres campagnes */}
                  {formOptions.campagnes?.filter(c => !c.est_active && !c.est_terminee).length > 0 && (
                    <optgroup label="⚪ Autres Campagnes">
                      {formOptions.campagnes
                        .filter(c => !c.est_active && !c.est_terminee)
                        .map(campagne => (
                          <option key={`other-${campagne.id}`} value={campagne.id}>
                            {campagne.nom} ({campagne.type_assistance || 'Type non défini'})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                {selectedCampagne && (
                  <small className="field-info">
                    🏥 {selectedCampagne.nom} - {selectedCampagne.type_assistance || 'Type non défini'}
                  </small>
                )}
                {getFieldError('campagne_id') && (
                  <span className="error-message">{getFieldError('campagne_id')}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ✅ SECTION: CHAMPS CONDITIONNELS SPÉCIFIQUES */}
        {(showConditionalFields.enfants_scolarises || showConditionalFields.cote || showConditionalFields.lateralite) && (
          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon">🔧</span>
              Informations Spécifiques
              <small className="section-subtitle">
                Champs spécifiques au type d'assistance sélectionné
              </small>
            </h3>
            
            <div className="form-grid">
              {/* Enfants scolarisés (pour mineurs avec lunettes ou appareils auditifs) */}
              {showConditionalFields.enfants_scolarises && (
                <div className="form-group">
                  <label className="form-label required">
                    <span className="label-icon">👶</span>
                    Enfants scolarisés
                    <small className="field-requirement">Obligatoire pour les mineurs</small>
                  </label>
                  <select
                    className={`form-select ${getFieldError('enfants_scolarises') ? 'error' : ''}`}
                    value={formData.enfants_scolarises === null ? '' : formData.enfants_scolarises ? 'true' : 'false'}
                    onChange={(e) => handleFieldChange('enfants_scolarises', e.target.value === '' ? null : e.target.value === 'true')}
                    required={isFieldRequired('enfants_scolarises')}
                  >
                    <option value="">Sélectionner</option>
                    <option value="true">Oui - Scolarisé</option>
                    <option value="false">Non - Non scolarisé</option>
                  </select>
                  {getFieldError('enfants_scolarises') && (
                    <span className="error-message">{getFieldError('enfants_scolarises')}</span>
                  )}
                </div>
              )}

              {/* Côté (pour appareils auditifs) */}
              {showConditionalFields.cote && (
                <div className="form-group">
                  <label className="form-label required">
                    <span className="label-icon">👂</span>
                    Côté (Appareils Auditifs)
                    <small className="field-requirement">Obligatoire pour les appareils auditifs</small>
                  </label>
                  <select
                    className={`form-select ${getFieldError('cote') ? 'error' : ''}`}
                    value={formData.cote || ''}
                    onChange={(e) => handleFieldChange('cote', e.target.value)}
                    required={isFieldRequired('cote')}
                  >
                    <option value="">Sélectionner le côté</option>
                    <option value="unilatéral">Unilatéral</option>
                    <option value="bilatéral">Bilatéral</option>
                  </select>
                  {getFieldError('cote') && (
                    <span className="error-message">{getFieldError('cote')}</span>
                  )}
                </div>
              )}

              
            </div>
          </div>
        )}

        {/* ✅ SECTION: DÉCISION ET STATUT */}
        {showConditionalFields.decision_fields && (
          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon">✅</span>
              Décision et Statut
            </h3>
            
            <div className="form-grid">
              {/* Décision */}
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🎯</span>
                  Décision
                </label>
                <select
                  className={`form-select ${getFieldError('decision') ? 'error' : ''}`}
                  value={formData.decision || ''}
                  onChange={(e) => handleFieldChange('decision', e.target.value)}
                >
                  <option value="">Aucune décision</option>
                  {formOptions.decisions?.map(decision => (
                    <option key={decision.value} value={decision.value}>
                      {decision.label}
                    </option>
                  ))}
                </select>
                {getFieldError('decision') && (
                  <span className="error-message">{getFieldError('decision')}</span>
                )}
              </div>

              {/* A bénéficié */}
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🎁</span>
                  A bénéficié
                </label>
                <div className="form-checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={formData.a_beneficie || false}
                      onChange={(e) => handleFieldChange('a_beneficie', e.target.checked)}
                    />
                    <span className="checkbox-text">A déjà bénéficié de l'assistance</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ SECTION: COMMENTAIRE */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon">💬</span>
            Commentaire
          </h3>
          
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📝</span>
              Observations
            </label>
            <textarea
              className={`form-textarea ${getFieldError('commentaire') ? 'error' : ''}`}
              value={formData.commentaire || ''}
              onChange={(e) => handleFieldChange('commentaire', e.target.value)}
              placeholder="Commentaires, observations ou notes particulières..."
              rows="4"
            />
            {getFieldError('commentaire') && (
              <span className="error-message">{getFieldError('commentaire')}</span>
            )}
          </div>
        </div>

        {/* ✅ SECTION: BOUTONS D'ACTION */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={formSubmitting}
          >
            <span className="btn-icon">❌</span>
            Annuler
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={formSubmitting}
          >
            {formSubmitting ? (
              <>
                <span className="btn-icon">⏳</span>
                {isEdit ? 'Modification...' : 'Création...'}
              </>
            ) : (
              <>
                <span className="btn-icon">{isEdit ? '✏️' : '👤'}</span>
                {isEdit ? 'Modifier' : 'Créer'} le bénéficiaire
              </>
            )}
          </button>
        </div>

        
      </form>
    </div>
  );
};

export default BeneficiaireForm;