// ===================================================
// MODAL D'IMPORT CORRIGÉE - VERSION COMPLÈTE
// ===================================================

import React, { useState } from 'react';
import { upasAPI } from '../../services/beneficiereService';

const ImportModal = ({ onClose, onSuccess, campagnes }) => {
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCampagne, setSelectedCampagne] = useState('');
  const [importOptions, setImportOptions] = useState({
    ignore_doublons: true,
    force_import: false
  });
  const [validation, setValidation] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState([]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('📁 Fichier sélectionné:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      setSelectedFile(file);
      setValidation(null);
      setErrors([]);
      
      // Validation côté client
      const clientValidation = upasAPI.validateFileBeforeUpload(file, selectedCampagne);
      if (!clientValidation.isValid) {
        setErrors(clientValidation.errors);
      }
    }
  };

  /**
   * ✅ ÉTAPE 1: VALIDATION UNIQUEMENT (SANS SAUVEGARDE)
   */
  const handleValidation = async () => {
    if (!selectedFile || !selectedCampagne) {
      setErrors(['Veuillez sélectionner un fichier et une campagne']);
      return;
    }

    try {
      setLoading(true);
      setErrors([]);
      
      console.log('🔍 === DÉBUT VALIDATION (SANS SAUVEGARDE) ===');
      
      // Créer le FormData pour la validation
      const formData = upasAPI.createImportFormData(selectedFile, selectedCampagne, {
        // Pas d'options spéciales pour la validation
      });

      // ✅ APPEL DE VALIDATION UNIQUEMENT
      const response = await upasAPI.validateImportFile(formData);
      
      console.log('✅ Validation terminée (AUCUNE DONNÉE SAUVEGARDÉE):', response.data);
      
      if (response.data.success) {
        setValidation(response.data.data);
        setStep(2);
        
        // Afficher un message clair
        console.log('✅ VALIDATION RÉUSSIE - Fichier analysé, rien n\'a été sauvegardé en base');
      } else {
        setErrors([response.data.message || 'Erreur lors de la validation']);
      }
    } catch (error) {
      console.error('❌ Erreur validation:', error);
      
      if (error.response?.data?.errors) {
        setErrors(Object.values(error.response.data.errors).flat());
      } else {
        setErrors([error.message || 'Erreur lors de la validation du fichier']);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ ÉTAPE 2: IMPORT RÉEL AVEC SAUVEGARDE
   */
  const handleImport = async () => {
    try {
      setLoading(true);
      setErrors([]);
      setUploadProgress(0);
      
      console.log('🚀 === DÉBUT IMPORT RÉEL (AVEC SAUVEGARDE) ===');
      
      // Créer le FormData pour l'import réel
      const formData = upasAPI.createImportFormData(selectedFile, selectedCampagne, {
        ignore_doublons: importOptions.ignore_doublons,
        force_import: importOptions.force_import
      });

      // ✅ APPEL D'IMPORT RÉEL AVEC SAUVEGARDE
      const response = await upasAPI.importBeneficiaires(formData, (progress) => {
        console.log(`📊 Progression: ${progress}%`);
        setUploadProgress(progress);
      });

      console.log('✅ === IMPORT RÉEL TERMINÉ (DONNÉES SAUVEGARDÉES) ===', response.data);

      if (response.data.success) {
        setImportResult(response.data.data);
        setStep(3);
        
        // Message de succès clair
        const { imported_count, total_processed } = response.data.data;
        console.log(`✅ SUCCÈS: ${imported_count} bénéficiaires sauvegardés en base sur ${total_processed} lignes traitées`);
        
        // Notification de succès
        if (typeof onSuccess === 'function') {
          setTimeout(() => {
            onSuccess(response.data.data);
          }, 2000); // Laisser le temps de voir les résultats
        }
      } else {
        setErrors([response.data.message || 'Erreur lors de l\'import']);
      }
    } catch (error) {
      console.error('❌ Erreur import réel:', error);
      
      if (error.response?.data?.errors) {
        setErrors(Object.values(error.response.data.errors).flat());
      } else if (error.response?.data?.data) {
        // Import partiel - afficher les résultats partiels
        setImportResult(error.response.data.data);
        setErrors([error.message || 'Import terminé avec erreurs']);
      } else {
        setErrors([error.message || 'Erreur lors de l\'import']);
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  /**
   * ✅ RETOUR À L'ÉTAPE PRÉCÉDENTE
   */
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors([]);
    }
  };

  /**
   * ✅ RESET COMPLET
   */
  const handleReset = () => {
    setStep(1);
    setSelectedFile(null);
    setValidation(null);
    setImportResult(null);
    setErrors([]);
    setUploadProgress(0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
        
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Importer des bénéficiaires</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center mb-8">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white font-bold ${
            step >= 1 ? 'bg-blue-600' : 'bg-gray-300'
          }`}>
            1
          </div>
          <div className={`flex-1 h-2 mx-3 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          
          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white font-bold ${
            step >= 2 ? 'bg-blue-600' : 'bg-gray-300'
          }`}>
            2
          </div>
          <div className={`flex-1 h-2 mx-3 rounded ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          
          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white font-bold ${
            step >= 3 ? 'bg-green-600' : 'bg-gray-300'
          }`}>
            3
          </div>
        </div>

        {/* Labels des étapes */}
        <div className="flex items-center justify-between mb-6 text-sm text-gray-600">
          <span className={step === 1 ? 'font-bold text-blue-600' : ''}>
            1. Sélection & Validation
          </span>
          <span className={step === 2 ? 'font-bold text-blue-600' : ''}>
            2. Import en Base
          </span>
          <span className={step === 3 ? 'font-bold text-green-600' : ''}>
            3. Résultats
          </span>
        </div>

        {/* Affichage des erreurs */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600">⚠️</span>
              <h4 className="font-medium text-red-900">Erreurs détectées:</h4>
            </div>
            <ul className="text-sm text-red-800 list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ÉTAPE 1: Sélection du fichier et campagne */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">🔍 Étape 1: Validation du fichier</h3>
              <p className="text-sm text-blue-800">
                Cette étape analyse votre fichier et vérifie sa compatibilité. 
                <strong> Aucune donnée ne sera sauvegardée en base.</strong>
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campagne de destination *
                </label>
                <select
                  value={selectedCampagne}
                  onChange={(e) => setSelectedCampagne(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Sélectionner une campagne</option>
                  {campagnes.map(campagne => (
                    <option key={campagne.id} value={campagne.id}>
                      {campagne.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier Excel ou CSV *
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    📁 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 mb-2">📋 Format requis:</h4>
              <div className="text-sm text-amber-800 space-y-1">
                <p><strong>Colonnes obligatoires:</strong> nom, prenom, sexe, telephone, adresse</p>
                <p><strong>Colonnes optionnelles:</strong> email, date_naissance, cin, commentaire, decision</p>
                <p><strong>Formats:</strong> Sexe (M/F), Téléphone (10 chiffres), Date (YYYY-MM-DD)</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleValidation}
                disabled={!selectedFile || !selectedCampagne || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Validation en cours...
                  </>
                ) : (
                  <>
                    🔍 Valider le fichier
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 2: Résultats de validation et options d'import */}
        {step === 2 && validation && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">✅ Étape 2: Fichier validé - Prêt pour l'import</h3>
              <p className="text-sm text-green-800">
                La validation est terminée. Vous pouvez maintenant lancer l'import réel qui 
                <strong> sauvegardera les données en base de données.</strong>
              </p>
            </div>
            
            {/* Résultats de validation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-gray-900">{validation.total_rows}</div>
                <div className="text-sm text-gray-600">Total lignes</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{validation.valid_rows}</div>
                <div className="text-sm text-green-600">Lignes valides</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-600">{validation.invalid_rows}</div>
                <div className="text-sm text-red-600">Lignes avec erreurs</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-yellow-600">{validation.skipped_rows}</div>
                <div className="text-sm text-yellow-600">Lignes ignorées</div>
              </div>
            </div>

            {/* Erreurs détectées */}
            {validation.errors && validation.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-3">❌ Erreurs détectées dans le fichier:</h4>
                <div className="max-h-40 overflow-y-auto">
                  {validation.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-sm text-red-800 mb-1">
                      <strong>Ligne {error.ligne}:</strong> {error.erreurs.join(', ')}
                    </div>
                  ))}
                  {validation.errors.length > 10 && (
                    <div className="text-sm text-red-600 mt-2 font-medium">
                      ... et {validation.errors.length - 10} autres erreurs
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Avertissements */}
            {validation.warnings && validation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ Avertissements:</h4>
                <ul className="text-sm text-yellow-800 list-disc list-inside">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Options d'import */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">⚙️ Options d'import:</h4>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={importOptions.ignore_doublons}
                    onChange={(e) => setImportOptions(prev => ({
                      ...prev,
                      ignore_doublons: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Ignorer les doublons</span>
                    <p className="text-xs text-gray-500">Ne pas importer les lignes avec des numéros de téléphone déjà existants</p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={importOptions.force_import}
                    onChange={(e) => setImportOptions(prev => ({
                      ...prev,
                      force_import: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Forcer l'import</span>
                    <p className="text-xs text-gray-500">Importer même s'il y a des erreurs (seules les lignes valides seront importées)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Retour
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Recommencer
                </button>
                
                <button
                  onClick={handleImport}
                  disabled={loading || (!validation.can_import && !importOptions.force_import)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Import en cours...
                    </>
                  ) : (
                    <>
                      💾 Lancer l'import réel
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Barre de progression */}
            {loading && uploadProgress > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progression de l'import:</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 3: Résultats de l'import */}
        {step === 3 && importResult && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">🎉 Import terminé avec succès!</h3>
              <p className="text-sm text-green-800">
                Les données ont été sauvegardées en base de données. Vous pouvez maintenant consulter les bénéficiaires importés.
              </p>
            </div>

            {/* Résultats détaillés */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                <div className="text-3xl font-bold text-green-600">{importResult.imported_count}</div>
                <div className="text-sm text-green-600 font-medium">✅ Importés</div>
                <div className="text-xs text-green-500">Sauvegardés en base</div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-200">
                <div className="text-3xl font-bold text-yellow-600">{importResult.skipped_count}</div>
                <div className="text-sm text-yellow-600 font-medium">⏭️ Ignorés</div>
                <div className="text-xs text-yellow-500">Doublons détectés</div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                <div className="text-3xl font-bold text-red-600">{importResult.error_count}</div>
                <div className="text-sm text-red-600 font-medium">❌ Erreurs</div>
                <div className="text-xs text-red-500">Lignes non traitées</div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">{importResult.total_processed}</div>
                <div className="text-sm text-blue-600 font-medium">📊 Total</div>
                <div className="text-xs text-blue-500">Lignes traitées</div>
              </div>
            </div>

            {/* Taux de réussite */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Taux de réussite:</span>
                <span className="text-sm font-bold text-gray-900">
                  {importResult.total_processed > 0 
                    ? Math.round((importResult.imported_count / importResult.total_processed) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full"
                  style={{ 
                    width: `${importResult.total_processed > 0 
                      ? (importResult.imported_count / importResult.total_processed) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Détails des erreurs si présentes */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-3">❌ Détails des erreurs:</h4>
                <div className="max-h-40 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-sm text-red-800 mb-1">
                      <strong>Ligne {error.ligne}:</strong> {error.erreurs.join(', ')}
                    </div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <div className="text-sm text-red-600 mt-2 font-medium">
                      ... et {importResult.errors.length - 10} autres erreurs
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Avertissements finaux */}
            {importResult.warnings && importResult.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ Avertissements:</h4>
                <ul className="text-sm text-yellow-800 list-disc list-inside">
                  {importResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Informations sur la campagne */}
            {importResult.campagne && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📋 Campagne de destination:</h4>
                <div className="text-sm text-blue-800">
                  <p><strong>Nom:</strong> {importResult.campagne.nom}</p>
                  <p><strong>Type d'assistance:</strong> {importResult.campagne.type_assistance}</p>
                  <p><strong>Date d'import:</strong> {new Date(importResult.timestamp).toLocaleString('fr-FR')}</p>
                </div>
              </div>
            )}

            {/* Actions finales */}
            <div className="flex justify-between">
              <button
                onClick={handleReset}
                className="px-6 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                🔄 Nouvel import
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Redirection vers la liste des bénéficiaires avec filtre campagne
                    if (typeof onSuccess === 'function') {
                      onSuccess(importResult);
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  👁️ Voir les bénéficiaires
                </button>
                
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✅ Terminer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message d'aide en bas */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>💡 Aide:</strong></p>
              <p>• <strong>Étape 1:</strong> Validation du fichier (aucune donnée sauvegardée)</p>
              <p>• <strong>Étape 2:</strong> Configuration et lancement de l'import réel</p>
              <p>• <strong>Étape 3:</strong> Résultats avec données sauvegardées en base</p>
              <p>• En cas de problème, contactez l'administrateur avec les détails des erreurs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;