import React, { useState } from 'react';
import { X, UserCheck, Mail, Key, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const AccountActivationModal = ({ 
    isOpen, 
    onClose, 
    user, 
    roles, 
    onActivate 
}) => {
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [activationResult, setActivationResult] = useState(null);
    const [error, setError] = useState('');

    const handleActivate = async () => {
        if (!selectedRoleId) {
            setError('Veuillez sélectionner un rôle');
            return;
        }

        setIsActivating(true);
        setError('');
        
        try {
            console.log('🔄 Modal: Début activation utilisateur', { 
                userId: user.id, 
                roleId: selectedRoleId 
            });

            const result = await onActivate(user.id, selectedRoleId);
            
            console.log('✅ Modal: Activation réussie', result);
            setActivationResult(result);

        } catch (error) {
            console.error('❌ Modal: Erreur activation', error);
            
            setError(error.message || 'Erreur lors de l\'activation');
            setActivationResult({
                success: false,
                message: error.message || 'Erreur lors de l\'activation'
            });
        } finally {
            setIsActivating(false);
        }
    };

    const handleClose = () => {
        setSelectedRoleId('');
        setActivationResult(null);
        setError('');
        onClose();
    };

    const handleRetry = () => {
        setActivationResult(null);
        setError('');
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center space-x-3">
                        <UserCheck className="h-6 w-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Activer le compte
                        </h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isActivating}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    {!activationResult ? (
                        <>
                            {/* Informations utilisateur */}
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-900 mb-3">
                                    Informations de l'utilisateur
                                </h4>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Nom complet:</span>
                                        <span className="font-medium">
                                            {user.nom_user} {user.prenom_user}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Email:</span>
                                        <span className="font-medium">{user.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Téléphone:</span>
                                        <span className="font-medium">{user.tel_user || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Email vérifié:</span>
                                        <span className={`font-medium ${
                                            user.email_verified_at ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {user.email_verified_at ? 'Oui' : 'Non'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Sélection du rôle */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sélectionner un rôle <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedRoleId}
                                    onChange={(e) => setSelectedRoleId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={isActivating}
                                >
                                    <option value="">Choisir un rôle...</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.libelle}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Erreur d'activation */}
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-start space-x-3">
                                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                        <div className="text-sm text-red-800">
                                            <p className="font-medium mb-1">Erreur d'activation :</p>
                                            <p>{error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Avertissement */}
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start space-x-3">
                                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium mb-1">Actions automatiques :</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Le compte sera activé immédiatement</li>
                                            <li>Un email de confirmation sera envoyé à l'utilisateur</li>
                                            <li>L'utilisateur pourra se connecter avec son rôle assigné</li>
                                            <li>Un mot de passe sera généré si nécessaire</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Résultat de l'activation */
                        <div className="text-center">
                            {activationResult.success ? (
                                <>
                                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                        Compte activé avec succès !
                                    </h4>
                                    <p className="text-gray-600 mb-4">
                                        {activationResult.message}
                                    </p>
                                    
                                    {activationResult.generated_credentials && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Key className="h-5 w-5 text-yellow-600" />
                                                <span className="font-medium text-yellow-800">
                                                    Identifiants générés
                                                </span>
                                            </div>
                                            <div className="text-sm text-yellow-700">
                                                <p><strong>Email:</strong> {activationResult.generated_credentials.email}</p>
                                                <p><strong>Mot de passe:</strong> {activationResult.generated_credentials.password}</p>
                                                <p><strong>Rôle:</strong> {activationResult.generated_credentials.role}</p>
                                                <p className="mt-2 text-xs">
                                                    Ces informations ont été envoyées par email à l'utilisateur.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {activationResult.activation_details && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Mail className="h-5 w-5 text-green-600" />
                                                <span className="font-medium text-green-800">
                                                    Email {activationResult.activation_details.email_sent ? 'envoyé' : 'non envoyé'}
                                                </span>
                                            </div>
                                            <div className="text-sm text-green-700">
                                                <p><strong>Activé le :</strong> {activationResult.activation_details.activated_at}</p>
                                                <p><strong>Rôle assigné :</strong> {activationResult.activation_details.role_assigned}</p>
                                                {activationResult.activation_details.email_sent ? (
                                                    <p className="mt-2">
                                                        Un email de confirmation avec les détails d'activation 
                                                        et un lien de connexion a été envoyé à {user.email}
                                                    </p>
                                                ) : (
                                                    <p className="mt-2 text-orange-700">
                                                        ⚠️ L'email de confirmation n'a pas pu être envoyé.
                                                        Vous pouvez communiquer manuellement les identifiants à l'utilisateur.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                        Erreur d'activation
                                    </h4>
                                    <p className="text-red-600 mb-4">
                                        {activationResult.message}
                                    </p>
                                    
                                    {/* Suggestions de résolution */}
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                                        <p className="font-medium text-yellow-800 mb-2">Suggestions :</p>
                                        <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                                            <li>Vérifiez que l'utilisateur existe toujours</li>
                                            <li>Assurez-vous que le rôle sélectionné est valide</li>
                                            <li>Vérifiez la configuration email du serveur</li>
                                            <li>Consultez les logs Laravel pour plus de détails</li>
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
                    {!activationResult ? (
                        <>
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                disabled={isActivating}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleActivate}
                                disabled={!selectedRoleId || isActivating}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isActivating ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Activation en cours...
                                    </>
                                ) : (
                                    'Activer le compte'
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            {!activationResult.success && (
                                <button
                                    onClick={handleRetry}
                                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                >
                                    Réessayer
                                </button>
                            )}
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                                Fermer
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountActivationModal;