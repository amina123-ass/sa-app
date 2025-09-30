// src/services/assistancesApi.js
import api from './api';

class AssistancesApi {
    /**
     * Récupérer la liste des assistances avec filtres et pagination
     * @param {Object} params - Paramètres de filtrage et pagination
     * @returns {Promise} Réponse avec données et métadonnées
     */
    async list(params = {}) {
        try {
            const response = await api.get('/upas/assistances', { params });
            return {
                success: true,
                data: response.data.data || response.data,
                meta: response.data.meta || {},
                message: 'Assistances récupérées avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des assistances:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la récupération des assistances',
                error: error
            };
        }
    }

    /**
     * Récupérer une assistance spécifique
     * @param {number} id - ID de l'assistance
     * @returns {Promise} Données de l'assistance
     */
    async get(id) {
        try {
            const response = await api.get(`/upas/assistances/${id}`);
            return {
                success: true,
                data: response.data.data || response.data,
                message: 'Assistance récupérée avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'assistance:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Assistance non trouvée',
                error: error
            };
        }
    }

    /**
     * Créer une nouvelle assistance
     * @param {Object} assistanceData - Données de l'assistance
     * @returns {Promise} Assistance créée
     */
    async create(assistanceData) {
        try {
            const response = await api.post('/upas/assistances', assistanceData);
            return {
                success: true,
                data: response.data.data || response.data,
                message: 'Assistance créée avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de la création de l\'assistance:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la création',
                errors: error.response?.data?.errors || {},
                error: error
            };
        }
    }

    /**
     * Mettre à jour une assistance
     * @param {number} id - ID de l'assistance
     * @param {Object} assistanceData - Nouvelles données
     * @returns {Promise} Assistance mise à jour
     */
    async update(id, assistanceData) {
        try {
            const response = await api.put(`/upas/assistances/${id}`, assistanceData);
            return {
                success: true,
                data: response.data.data || response.data,
                message: 'Assistance mise à jour avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'assistance:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la mise à jour',
                errors: error.response?.data?.errors || {},
                error: error
            };
        }
    }

    /**
     * Supprimer une assistance
     * @param {number} id - ID de l'assistance
     * @returns {Promise} Confirmation de suppression
     */
    async remove(id) {
        try {
            const response = await api.delete(`/upas/assistances/${id}`);
            return {
                success: true,
                message: 'Assistance supprimée avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'assistance:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la suppression',
                error: error
            };
        }
    }

    /**
     * Valider une assistance
     * @param {number} id - ID de l'assistance
     * @param {Object} validationData - Données de validation
     * @returns {Promise} Assistance validée
     */
    async validate(id, validationData = {}) {
        try {
            const response = await api.post(`/upas/assistances/${id}/validate`, validationData);
            return {
                success: true,
                data: response.data.data || response.data,
                message: 'Assistance validée avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de la validation de l\'assistance:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la validation',
                error: error
            };
        }
    }

    /**
     * Rejeter une assistance
     * @param {number} id - ID de l'assistance
     * @param {Object} rejectionData - Raison du rejet
     * @returns {Promise} Assistance rejetée
     */
    async reject(id, rejectionData = {}) {
        try {
            const response = await api.post(`/upas/assistances/${id}/reject`, rejectionData);
            return {
                success: true,
                data: response.data.data || response.data,
                message: 'Assistance rejetée avec succès'
            };
        } catch (error) {
            console.error('Erreur lors du rejet de l\'assistance:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors du rejet',
                error: error
            };
        }
    }

    /**
     * Marquer une assistance comme retournée (pour les prêts)
     * @param {number} id - ID de l'assistance
     * @param {Object} returnData - Données de retour (date_retour, observation_retour)
     * @returns {Promise} Assistance marquée comme retournée
     */
    async markReturned(id, returnData) {
        try {
            const response = await api.post(`/upas/assistances/${id}/retour`, returnData);
            return {
                success: true,
                data: response.data.data || response.data,
                message: 'Retour confirmé avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de la confirmation du retour:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la confirmation du retour',
                errors: error.response?.data?.errors || {},
                error: error
            };
        }
    }

    /**
     * Télécharger le reçu PDF d'une assistance
     * @param {number} id - ID de l'assistance
     * @returns {Promise} Blob du PDF
     */
    async downloadReceipt(id) {
        try {
            const response = await api.get(`/upas/assistances/${id}/receipt`, {
                responseType: 'blob'
            });
            
            // Créer un lien de téléchargement
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `recu_assistance_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return {
                success: true,
                message: 'Reçu téléchargé avec succès'
            };
        } catch (error) {
            console.error('Erreur lors du téléchargement du reçu:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors du téléchargement du reçu',
                error: error
            };
        }
    }

    /**
     * Exporter les assistances en Excel
     * @param {Object} filters - Filtres à appliquer
     * @returns {Promise} Téléchargement du fichier Excel
     */
    async exportToExcel(filters = {}) {
        try {
            const response = await api.post('/upas/assistances/export', filters, {
                responseType: 'blob'
            });

            // Créer un lien de téléchargement
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Récupérer le nom du fichier depuis l'en-tête ou utiliser un nom par défaut
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'assistances_export.xlsx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return {
                success: true,
                message: 'Export Excel téléchargé avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de l\'export Excel',
                error: error
            };
        }
    }

    /**
     * Récupérer les options pour les formulaires (types assistance, natures, etc.)
     * @returns {Promise} Options pour les formulaires
     */
    async getFormOptions() {
        try {
            const response = await api.get('/upas/form-options');
            return {
                success: true,
                data: response.data.data || response.data,
                message: 'Options récupérées avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des options:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la récupération des options',
                error: error
            };
        }
    }

    /**
     * Récupérer les détails d'un type d'assistance
     * @param {number} typeAssistanceId - ID du type d'assistance
     * @returns {Promise} Détails du type d'assistance
     */
    async getDetailsTypeAssistance(typeAssistanceId) {
        try {
            const response = await api.get(`/admin/dictionary/details-type-assistances/type/${typeAssistanceId}`);
            return {
                success: true,
                data: response.data.data || response.data,
                message: 'Détails récupérés avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des détails:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la récupération des détails',
                error: error,
                data: [] // Retourner un tableau vide en cas d'erreur
            };
        }
    }

    /**
     * Rechercher des bénéficiaires
     * @param {string} query - Terme de recherche
     * @returns {Promise} Liste des bénéficiaires trouvés
     */
    async searchBeneficiaires(query) {
        try {
            const response = await api.get('/upas/beneficiaires', {
                params: {
                    search: query,
                    limit: 20
                }
            });
            return {
                success: true,
                data: response.data.data || response.data,
                message: 'Bénéficiaires trouvés'
            };
        } catch (error) {
            console.error('Erreur lors de la recherche de bénéficiaires:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la recherche',
                error: error,
                data: []
            };
        }
    }

    /**
     * Récupérer les statistiques des assistances
     * @param {Object} filters - Filtres pour les statistiques
     * @returns {Promise} Statistiques des assistances
     */
    async getStatistics(filters = {}) {
        try {
            const response = await api.get('/upas/assistances/statistiques', { params: filters });
            return {
                success: true,
                data: response.data.data || response.data,
                message: 'Statistiques récupérées avec succès'
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la récupération des statistiques',
                error: error
            };
        }
    }

    /**
     * Récupérer les prêts en cours (avec retard ou à retourner prochainement)
     * @returns {Promise} Liste des prêts en cours
     */
    async getPretsEnCours() {
        try {
            const response = await api.get('/upas/assistances/prets/en-cours');
            return {
                success: true,
                data: response.data.data || response.data,
                total: response.data.total || 0,
                message: 'Prêts en cours récupérés'
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des prêts:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la récupération des prêts',
                error: error,
                data: [],
                total: 0
            };
        }
    }
}

// Instance singleton
const assistancesApi = new AssistancesApi();

export default assistancesApi;