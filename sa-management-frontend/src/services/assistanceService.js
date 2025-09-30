// services/assistanceService.js - Version corrigée avec fallback mock
import axiosClient, { handleApiError } from './axiosClient';

// Données mockées pour les tests et le développement
const MOCK_DATA = {
  assistances: [
    {
      id: 1,
      beneficiaire_nom: 'Dupont',
      beneficiaire_prenom: 'Jean',
      beneficiaire_display: 'Jean Dupont',
      telephone: '0612345678',
      type_assistance_id: 1,
      type_assistance_libelle: 'Aide médicale',
      nature_done_id: 1,
      nature_done_libelle: 'Don simple',
      etat_done_id: 1,
      etat_done_libelle: 'Neuf',
      situation_id: 1,
      situation_libelle: 'Difficultés financières',
      date_assistance: '2024-01-15',
      montant: 500,
      priorite: 'Normale',
      moi_meme: false,
      observations: 'Assistance fournie avec succès',
      est_pret: false,
      retour_effectue: false,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: 2,
      beneficiaire_nom: 'Martin',
      beneficiaire_prenom: 'Marie',
      beneficiaire_display: 'Marie Martin',
      telephone: '0687654321',
      type_assistance_id: 2,
      type_assistance_libelle: 'Appareillage auditif',
      nature_done_id: 2,
      nature_done_libelle: 'Prêt temporaire',
      etat_done_id: 2,
      etat_done_libelle: 'Bon état',
      situation_id: 2,
      situation_libelle: 'Perte auditive',
      date_assistance: '2024-01-20',
      duree_utilisation: 30,
      date_retour_prevue: '2024-02-20',
      montant: 1200,
      priorite: 'Urgente',
      moi_meme: false,
      observations: 'Prêt d\'appareil auditif',
      est_pret: true,
      retour_effectue: false,
      created_at: '2024-01-20T14:30:00Z',
      updated_at: '2024-01-20T14:30:00Z'
    },
    {
      id: 3,
      beneficiaire_nom: 'Lambert',
      beneficiaire_prenom: 'Pierre',
      beneficiaire_display: 'Pierre Lambert',
      telephone: '0698765432',
      type_assistance_id: 3,
      type_assistance_libelle: 'Lunettes de vue',
      nature_done_id: 2,
      nature_done_libelle: 'Prêt temporaire',
      etat_done_id: 1,
      etat_done_libelle: 'Neuf',
      situation_id: 3,
      situation_libelle: 'Problème de vue',
      date_assistance: '2024-01-25',
      duree_utilisation: 15,
      date_retour_prevue: '2024-02-10',
      montant: 800,
      priorite: 'Normale',
      moi_meme: true,
      observations: 'Lunettes de vue temporaires',
      est_pret: true,
      retour_effectue: true,
      date_retour: '2024-02-08',
      created_at: '2024-01-25T09:15:00Z',
      updated_at: '2024-02-08T16:20:00Z'
    }
  ],
  
  reference_data: {
    types_assistance: [
      { id: 1, libelle: 'Aide médicale', description: 'Assistance pour frais médicaux' },
      { id: 2, libelle: 'Appareillage auditif', description: 'Aide ou prêt d\'appareils auditifs' },
      { id: 3, libelle: 'Lunettes de vue', description: 'Aide ou prêt de lunettes correctrices' },
      { id: 4, libelle: 'Matériel médical', description: 'Prêt de matériel médical divers' },
      { id: 5, libelle: 'Médicaments', description: 'Aide pour l\'achat de médicaments' }
    ],
    
    nature_dones: [
      { id: 1, libelle: 'Don simple', description: 'Don sans retour', is_loan: false },
      { id: 2, libelle: 'Prêt temporaire', description: 'Prêt avec retour obligatoire', is_loan: true, duree: 30 },
      { id: 3, libelle: 'Aide ponctuelle', description: 'Aide occasionnelle', is_loan: false },
      { id: 4, libelle: 'Prêt longue durée', description: 'Prêt sur une période étendue', is_loan: true, duree: 90 }
    ],
    
    etat_dones: [
      { id: 1, libelle: 'Neuf', description: 'État neuf' },
      { id: 2, libelle: 'Bon état', description: 'Bon état général' },
      { id: 3, libelle: 'Usagé', description: 'État d\'usage normal' },
      { id: 4, libelle: 'À réparer', description: 'Nécessite des réparations' },
      { id: 5, libelle: 'Hors service', description: 'Non fonctionnel' }
    ],
    
    situations: [
      { id: 1, libelle: 'Difficultés financières', description: 'Situation précaire' },
      { id: 2, libelle: 'Perte auditive', description: 'Problèmes d\'audition' },
      { id: 3, libelle: 'Problème de vue', description: 'Troubles visuels' },
      { id: 4, libelle: 'Handicap moteur', description: 'Handicap de mobilité' },
      { id: 5, libelle: 'Maladie chronique', description: 'Pathologie de longue durée' },
      { id: 6, libelle: 'Accident', description: 'Suite d\'accident' }
    ],
    
    beneficiaires: [
      { 
        id: 1, 
        nom: 'Dupont', 
        prenom: 'Jean', 
        telephone: '0612345678',
        email: 'jean.dupont@email.com',
        adresse: '123 Rue de la Paix, Sefrou'
      },
      { 
        id: 2, 
        nom: 'Martin', 
        prenom: 'Marie', 
        telephone: '0687654321',
        email: 'marie.martin@email.com',
        adresse: '456 Avenue Mohammed V, Sefrou'
      },
      { 
        id: 3, 
        nom: 'Lambert', 
        prenom: 'Pierre', 
        telephone: '0698765432',
        email: 'pierre.lambert@email.com',
        adresse: '789 Boulevard Hassan II, Sefrou'
      },
      { 
        id: 4, 
        nom: 'Benali', 
        prenom: 'Fatima', 
        telephone: '0656789123',
        email: 'fatima.benali@email.com',
        adresse: '321 Rue Ibn Sina, Sefrou'
      },
      { 
        id: 5, 
        nom: 'Alami', 
        prenom: 'Ahmed', 
        telephone: '0634567890',
        email: 'ahmed.alami@email.com',
        adresse: '654 Avenue Al Massira, Sefrou'
      }
    ],
    
    campagnes: [
      { 
        id: 1, 
        nom: 'Campagne 2024', 
        description: 'Campagne d\'assistance 2024',
        date_debut: '2024-01-01',
        date_fin: '2024-12-31',
        active: true
      },
      { 
        id: 2, 
        nom: 'Urgences médicales', 
        description: 'Campagne urgences médicales',
        date_debut: '2024-01-01',
        date_fin: '2024-12-31',
        active: true
      }
    ]
  }
};

class AssistanceService {
  constructor() {
    this.baseURL = '/upas/assistances';
    this.useMockData = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_MOCK === 'true';
    this.mockDelay = 500; // Délai pour simuler les appels API
  }

  // ==========================================
  // UTILITAIRES MOCK
  // ==========================================

  async simulateApiCall(data, delay = this.mockDelay) {
    await new Promise(resolve => setTimeout(resolve, delay));
    return data;
  }

  generateId() {
    return Math.max(...MOCK_DATA.assistances.map(a => a.id), 0) + 1;
  }

  paginateData(data, page = 1, perPage = 15) {
    const total = data.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedData = data.slice(start, end);
    
    return {
      data: paginatedData,
      current_page: page,
      per_page: perPage,
      total: total,
      last_page: Math.ceil(total / perPage),
      from: start + 1,
      to: Math.min(end, total)
    };
  }

  filterAssistances(assistances, filters = {}) {
    let filtered = [...assistances];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(assistance => 
        assistance.beneficiaire_display?.toLowerCase().includes(searchLower) ||
        assistance.type_assistance_libelle?.toLowerCase().includes(searchLower) ||
        assistance.nature_done_libelle?.toLowerCase().includes(searchLower) ||
        assistance.observations?.toLowerCase().includes(searchLower) ||
        assistance.id.toString().includes(searchLower)
      );
    }

    if (filters.type_assistance_id) {
      filtered = filtered.filter(assistance => 
        assistance.type_assistance_id == filters.type_assistance_id
      );
    }

    if (filters.nature_done_id) {
      filtered = filtered.filter(assistance => 
        assistance.nature_done_id == filters.nature_done_id
      );
    }

    if (filters.statut_pret && filters.statut_pret !== 'tous') {
      filtered = filtered.filter(assistance => {
        const estPret = assistance.est_pret || assistance.duree_utilisation || assistance.date_retour_prevue;
        
        switch (filters.statut_pret) {
          case 'don':
            return !estPret;
          case 'en_cours':
            return estPret && !assistance.retour_effectue;
          case 'retourne':
            return estPret && assistance.retour_effectue;
          case 'en_retard':
            if (!estPret || assistance.retour_effectue) return false;
            const dateRetour = new Date(assistance.date_retour_prevue);
            return dateRetour < new Date();
          default:
            return true;
        }
      });
    }

    if (filters.priorite) {
      filtered = filtered.filter(assistance => 
        assistance.priorite === filters.priorite
      );
    }

    if (filters.date_min) {
      filtered = filtered.filter(assistance => 
        new Date(assistance.date_assistance) >= new Date(filters.date_min)
      );
    }

    if (filters.date_max) {
      filtered = filtered.filter(assistance => 
        new Date(assistance.date_assistance) <= new Date(filters.date_max)
      );
    }

    return filtered;
  }

  // ==========================================
  // GESTION DES ASSISTANCES MÉDICALES - CRUD
  // ==========================================

  async getAssistances(params = {}) {
    try {
      if (this.useMockData) {
        console.log('🔧 Mode Mock: Utilisation des données simulées');
        
        const filtered = this.filterAssistances(MOCK_DATA.assistances, params);
        const result = this.paginateData(filtered, params.page, params.per_page);
        
        return await this.simulateApiCall(result);
      }

      const response = await axiosClient.get(this.baseURL, { params });
      return response.data;
    } catch (error) {
      console.warn('⚠️ API Error, fallback to mock data:', error.message);
      
      const filtered = this.filterAssistances(MOCK_DATA.assistances, params);
      const result = this.paginateData(filtered, params.page, params.per_page);
      
      return await this.simulateApiCall(result);
    }
  }

  async getAssistanceMedicale(id) {
    try {
      if (this.useMockData) {
        const assistance = MOCK_DATA.assistances.find(a => a.id == id);
        if (!assistance) {
          throw new Error(`Assistance ${id} non trouvée`);
        }
        return await this.simulateApiCall({ data: assistance });
      }

      const response = await axiosClient.get(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      const assistance = MOCK_DATA.assistances.find(a => a.id == id);
      if (!assistance) {
        throw this.handleError(error, `Assistance ${id} non trouvée`);
      }
      return await this.simulateApiCall({ data: assistance });
    }
  }

  async storeAssistanceMedicale(assistanceData) {
    try {
      this.validateAssistanceData(assistanceData);
      
      if (this.useMockData) {
        const newAssistance = {
          ...assistanceData,
          id: this.generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Ajouter les libellés des relations
          beneficiaire_display: this.getBeneficiaireDisplay(assistanceData.beneficiaire_id),
          type_assistance_libelle: this.getTypeAssistanceLibelle(assistanceData.type_assistance_id),
          nature_done_libelle: this.getNatureDoneLibelle(assistanceData.nature_done_id),
          etat_done_libelle: this.getEtatDoneLibelle(assistanceData.etat_don_id),
          situation_libelle: this.getSituationLibelle(assistanceData.situation_id)
        };
        
        MOCK_DATA.assistances.push(newAssistance);
        return await this.simulateApiCall({ 
          success: true, 
          data: newAssistance,
          message: 'Assistance créée avec succès'
        });
      }
      
      const response = await axiosClient.post(this.baseURL, assistanceData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la création de l\'assistance');
    }
  }

  async updateAssistanceMedicale(id, assistanceData) {
    try {
      this.validateAssistanceData(assistanceData, true);
      
      if (this.useMockData) {
        const index = MOCK_DATA.assistances.findIndex(a => a.id == id);
        if (index === -1) {
          throw new Error(`Assistance ${id} non trouvée`);
        }
        
        const updatedAssistance = {
          ...MOCK_DATA.assistances[index],
          ...assistanceData,
          updated_at: new Date().toISOString(),
          // Mettre à jour les libellés
          beneficiaire_display: this.getBeneficiaireDisplay(assistanceData.beneficiaire_id),
          type_assistance_libelle: this.getTypeAssistanceLibelle(assistanceData.type_assistance_id),
          nature_done_libelle: this.getNatureDoneLibelle(assistanceData.nature_done_id),
          etat_done_libelle: this.getEtatDoneLibelle(assistanceData.etat_don_id),
          situation_libelle: this.getSituationLibelle(assistanceData.situation_id)
        };
        
        MOCK_DATA.assistances[index] = updatedAssistance;
        return await this.simulateApiCall({ 
          success: true, 
          data: updatedAssistance,
          message: 'Assistance modifiée avec succès'
        });
      }
      
      const response = await axiosClient.put(`${this.baseURL}/${id}`, assistanceData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la mise à jour de l'assistance ${id}`);
    }
  }

  async deleteAssistanceMedicale(id) {
    try {
      if (this.useMockData) {
        const index = MOCK_DATA.assistances.findIndex(a => a.id == id);
        if (index === -1) {
          throw new Error(`Assistance ${id} non trouvée`);
        }
        
        MOCK_DATA.assistances.splice(index, 1);
        return await this.simulateApiCall({ 
          success: true,
          message: 'Assistance supprimée avec succès'
        });
      }
      
      const response = await axiosClient.delete(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la suppression de l'assistance ${id}`);
    }
  }

  // ==========================================
  // GESTION DES PRÊTS ET RETOURS
  // ==========================================

  async marquerRetourPret(id, retourData) {
    try {
      if (this.useMockData) {
        const index = MOCK_DATA.assistances.findIndex(a => a.id == id);
        if (index === -1) {
          throw new Error(`Assistance ${id} non trouvée`);
        }
        
        MOCK_DATA.assistances[index] = {
          ...MOCK_DATA.assistances[index],
          retour_effectue: true,
          date_retour: retourData.date_retour || new Date().toISOString().split('T')[0],
          observation_retour: retourData.observation_retour || '',
          etat_retour: retourData.etat_retour || 'bon',
          updated_at: new Date().toISOString()
        };
        
        return await this.simulateApiCall({ 
          success: true,
          message: 'Retour marqué avec succès'
        });
      }

      const data = {
        date_retour: retourData.date_retour || new Date().toISOString().split('T')[0],
        observation_retour: retourData.observation_retour || '',
        etat_retour: retourData.etat_retour || 'bon',
        retour_effectue: true
      };

      const response = await axiosClient.post(`${this.baseURL}/${id}/retour`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Erreur lors du marquage de retour pour l'assistance ${id}`);
    }
  }

  async getPretsEnCours(params = {}) {
    try {
      if (this.useMockData) {
        const pretsEnCours = MOCK_DATA.assistances.filter(assistance => 
          (assistance.est_pret || assistance.duree_utilisation || assistance.date_retour_prevue) &&
          !assistance.retour_effectue
        );
        
        return await this.simulateApiCall({
          data: pretsEnCours,
          total: pretsEnCours.length
        });
      }
      
      const response = await axiosClient.get(`${this.baseURL}/prets/en-cours`, { params });
      return response.data;
    } catch (error) {
      const pretsEnCours = MOCK_DATA.assistances.filter(assistance => 
        (assistance.est_pret || assistance.duree_utilisation || assistance.date_retour_prevue) &&
        !assistance.retour_effectue
      );
      
      return await this.simulateApiCall({
        data: pretsEnCours,
        total: pretsEnCours.length
      });
    }
  }

  async getStatistiquesPrets() {
    try {
      if (this.useMockData) {
        const assistances = MOCK_DATA.assistances;
        const prets = assistances.filter(a => a.est_pret || a.duree_utilisation || a.date_retour_prevue);
        const pretsActifs = prets.filter(p => !p.retour_effectue);
        const pretsRetournes = prets.filter(p => p.retour_effectue);
        const pretsEnRetard = pretsActifs.filter(p => {
          if (!p.date_retour_prevue) return false;
          return new Date(p.date_retour_prevue) < new Date();
        });

        const stats = {
          total_prets: prets.length,
          prets_actifs: pretsActifs.length,
          prets_retournes: pretsRetournes.length,
          prets_en_retard: pretsEnRetard.length,
          taux_retour: prets.length > 0 ? Math.round((pretsRetournes.length / prets.length) * 100) : 0
        };
        
        return await this.simulateApiCall({ data: stats });
      }
      
      const response = await axiosClient.get(`${this.baseURL}/prets/statistiques`);
      return response.data;
    } catch (error) {
      // Fallback avec calcul des stats à partir des données mock
      const assistances = MOCK_DATA.assistances;
      const prets = assistances.filter(a => a.est_pret || a.duree_utilisation || a.date_retour_prevue);
      const pretsActifs = prets.filter(p => !p.retour_effectue);
      const pretsRetournes = prets.filter(p => p.retour_effectue);
      
      const stats = {
        total_prets: prets.length,
        prets_actifs: pretsActifs.length,
        prets_retournes: pretsRetournes.length,
        prets_en_retard: 0,
        taux_retour: prets.length > 0 ? Math.round((pretsRetournes.length / prets.length) * 100) : 0
      };
      
      return await this.simulateApiCall({ data: stats });
    }
  }

  // ==========================================
  // EXPORT DE DONNÉES
  // ==========================================

  async exportAssistances(exportParams = {}) {
    try {
      if (this.useMockData) {
        console.log('🔧 Mock Export: Simulation de téléchargement CSV');
        
        // Simuler la génération du CSV
        const assistances = this.filterAssistances(MOCK_DATA.assistances, exportParams.filters || {});
        const csvContent = this.generateCSV(assistances);
        
        // Simuler le téléchargement
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `assistances_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        return await this.simulateApiCall({ 
          success: true, 
          message: 'Export CSV généré avec succès' 
        });
      }
      
      const response = await axiosClient.post(`${this.baseURL}/export`, exportParams, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `assistances_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Export réalisé avec succès' };
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de l\'export des assistances');
    }
  }

  generateCSV(assistances) {
    const headers = [
      'ID',
      'Bénéficiaire',
      'Téléphone',
      'Type Assistance',
      'Nature Don',
      'État Don',
      'Situation',
      'Date Assistance',
      'Montant',
      'Priorité',
      'Observations',
      'Est Prêt',
      'Durée Utilisation',
      'Date Retour Prévue',
      'Retour Effectué',
      'Date Retour'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    assistances.forEach(assistance => {
      const row = [
        assistance.id,
        `"${assistance.beneficiaire_display || ''}"`,
        assistance.telephone || '',
        `"${assistance.type_assistance_libelle || ''}"`,
        `"${assistance.nature_done_libelle || ''}"`,
        `"${assistance.etat_done_libelle || ''}"`,
        `"${assistance.situation_libelle || ''}"`,
        assistance.date_assistance || '',
        assistance.montant || '',
        assistance.priorite || '',
        `"${assistance.observations || ''}"`,
        assistance.est_pret ? 'Oui' : 'Non',
        assistance.duree_utilisation || '',
        assistance.date_retour_prevue || '',
        assistance.retour_effectue ? 'Oui' : 'Non',
        assistance.date_retour || ''
      ];
      csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
  }

  // ==========================================
  // MÉTHODES D'ASSISTANCE POUR LES FORMULAIRES
  // ==========================================

  async getFormData() {
    try {
      if (this.useMockData) {
        console.log('🔧 Mode Mock: Chargement des données de référence simulées');
        
        return await this.simulateApiCall({
          success: true,
          data: {
            ...MOCK_DATA.reference_data,
            priorites: [
              { value: 'Normale', label: 'Normale' },
              { value: 'Élevée', label: 'Élevée' },
              { value: 'Urgente', label: 'Urgente' },
              { value: 'Très urgente', label: 'Très urgente' }
            ]
          },
          warnings: []
        });
      }

      // Tentative de chargement depuis l'API réelle
      const results = await Promise.allSettled([
        axiosClient.get('/upas/types-assistance'),
        axiosClient.get('/admin/dictionary/nature-dones'),
        axiosClient.get('/admin/dictionary/etat-dones'),
        axiosClient.get('/admin/dictionary/situations'),
        axiosClient.get('/upas/beneficiaires'),
        axiosClient.get('/upas/campagnes/actives')
      ]);

      const [
        typesAssistanceResult,
        natureDoneResult,
        etatDoneResult,
        situationResult,
        beneficiaireResult,
        campagneResult
      ] = results;

      const data = {
        types_assistance: this.extractDataFromResult(typesAssistanceResult),
        nature_dones: this.extractDataFromResult(natureDoneResult),
        etat_dones: this.extractDataFromResult(etatDoneResult),
        situations: this.extractDataFromResult(situationResult),
        beneficiaires: this.extractDataFromResult(beneficiaireResult),
        campagnes: this.extractDataFromResult(campagneResult),
        priorites: [
          { value: 'Normale', label: 'Normale' },
          { value: 'Élevée', label: 'Élevée' },
          { value: 'Urgente', label: 'Urgente' },
          { value: 'Très urgente', label: 'Très urgente' }
        ]
      };

      return {
        success: true,
        data,
        warnings: this.getLoadingWarnings(results)
      };
    } catch (error) {
      console.warn('⚠️ API Error, fallback to mock data:', error.message);
      
      return await this.simulateApiCall({
        success: true,
        data: {
          ...MOCK_DATA.reference_data,
          priorites: [
            { value: 'Normale', label: 'Normale' },
            { value: 'Élevée', label: 'Élevée' },
            { value: 'Urgente', label: 'Urgente' },
            { value: 'Très urgente', label: 'Très urgente' }
          ]
        },
        warnings: ['Mode hors ligne: Utilisation des données simulées']
      });
    }
  }

  extractDataFromResult(result) {
    if (result.status === 'fulfilled' && result.value?.data) {
      return result.value.data.data || result.value.data || [];
    }
    return [];
  }

  getLoadingWarnings(results) {
    const warnings = [];
    const endpoints = [
      'Types d\'assistance',
      'Nature des dons',
      'États des dons', 
      'Situations',
      'Bénéficiaires',
      'Campagnes'
    ];

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        warnings.push(`Impossible de charger: ${endpoints[index]}`);
      }
    });

    return warnings;
  }

  async getDetailsTypeAssistance(typeAssistanceId) {
    try {
      if (this.useMockData) {
        // Simuler des détails pour les types d'assistance
        const mockDetails = [
          { id: 1, libelle: 'Consultation spécialisée', type_assistance_id: typeAssistanceId },
          { id: 2, libelle: 'Examens médicaux', type_assistance_id: typeAssistanceId },
          { id: 3, libelle: 'Intervention chirurgicale', type_assistance_id: typeAssistanceId }
        ];
        
        return await this.simulateApiCall(mockDetails);
      }
      
      const response = await axiosClient.get(`/admin/dictionary/details-type-assistances/type/${typeAssistanceId}`);
      return response.data;
    } catch (error) {
      console.warn('Erreur chargement détails type assistance, utilisation mock');
      return [];
    }
  }

  // ==========================================
  // UTILITAIRES POUR LES LIBELLÉS
  // ==========================================

  getBeneficiaireDisplay(beneficiaireId) {
    const beneficiaire = MOCK_DATA.reference_data.beneficiaires.find(b => b.id == beneficiaireId);
    return beneficiaire ? `${beneficiaire.prenom} ${beneficiaire.nom}` : '';
  }

  getTypeAssistanceLibelle(typeId) {
    const type = MOCK_DATA.reference_data.types_assistance.find(t => t.id == typeId);
    return type ? type.libelle : '';
  }

  getNatureDoneLibelle(natureId) {
    const nature = MOCK_DATA.reference_data.nature_dones.find(n => n.id == natureId);
    return nature ? nature.libelle : '';
  }

  getEtatDoneLibelle(etatId) {
    const etat = MOCK_DATA.reference_data.etat_dones.find(e => e.id == etatId);
    return etat ? etat.libelle : '';
  }

  getSituationLibelle(situationId) {
    const situation = MOCK_DATA.reference_data.situations.find(s => s.id == situationId);
    return situation ? situation.libelle : '';
  }

  // ==========================================
  // VALIDATION DES DONNÉES
  // ==========================================

  validateAssistanceData(data, isUpdate = false) {
    const errors = [];

    // Validation des champs obligatoires
    if (!isUpdate || data.hasOwnProperty('type_assistance_id')) {
      if (!data.type_assistance_id) {
        errors.push('Le type d\'assistance est obligatoire');
      }
    }

    if (!isUpdate || data.hasOwnProperty('beneficiaire_id')) {
      if (!data.beneficiaire_id) {
        errors.push('Le bénéficiaire est obligatoire');
      }
    }

    if (!isUpdate || data.hasOwnProperty('etat_don_id')) {
      if (!data.etat_don_id) {
        errors.push('L\'état du don est obligatoire');
      }
    }

    if (!isUpdate || data.hasOwnProperty('nature_done_id')) {
      if (!data.nature_done_id) {
        errors.push('La nature du don est obligatoire');
      }
    }

    if (!isUpdate || data.hasOwnProperty('date_assistance')) {
      if (!data.date_assistance) {
        errors.push('La date d\'assistance est obligatoire');
      } else {
        const dateAssistance = new Date(data.date_assistance);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Fin de journée
        if (dateAssistance > today) {
          errors.push('La date d\'assistance ne peut pas être dans le futur');
        }
      }
    }

    // Validation du montant
    if (data.hasOwnProperty('montant') && data.montant !== null && data.montant !== '') {
      const montant = parseFloat(data.montant);
      if (isNaN(montant) || montant < 0) {
        errors.push('Le montant doit être un nombre positif');
      }
      if (montant > 1000000) {
        errors.push('Le montant ne peut pas dépasser 1 000 000 DH');
      }
    }

    // Validation de la priorité
    if (data.priorite && !['Normale', 'Élevée', 'Urgente', 'Très urgente'].includes(data.priorite)) {
      errors.push('La priorité doit être Normale, Élevée, Urgente ou Très urgente');
    }

    // Validation pour les prêts
    if (data.est_pret || data.duree_utilisation || data.date_retour_prevue) {
      if (data.duree_utilisation) {
        const duree = parseInt(data.duree_utilisation);
        if (isNaN(duree) || duree <= 0) {
          errors.push('La durée d\'utilisation doit être un nombre positif');
        }
        if (duree > 365) {
          errors.push('La durée d\'utilisation ne peut pas dépasser 365 jours');
        }
      }

      if (data.date_retour_prevue && data.date_assistance) {
        const dateRetour = new Date(data.date_retour_prevue);
        const dateAssistance = new Date(data.date_assistance);
        if (dateRetour <= dateAssistance) {
          errors.push('La date de retour prévue doit être postérieure à la date d\'assistance');
        }
      }
    }

    if (errors.length > 0) {
      throw new Error('Erreurs de validation: ' + errors.join(', '));
    }

    return true;
  }

  // ==========================================
  // GESTION DES ERREURS
  // ==========================================

  handleError(error, defaultMessage) {
    console.error('AssistanceService Error:', error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return new Error(data.message || 'Données invalides');
        case 401:
          return new Error('Non autorisé. Veuillez vous reconnecter.');
        case 403:
          return new Error('Accès interdit. Permissions insuffisantes.');
        case 404:
          return new Error(data.message || 'Assistance non trouvée');
        case 422:
          const validationErrors = data.errors ? 
            Object.values(data.errors).flat().join(', ') : 
            data.message;
          return new Error(`Erreur de validation: ${validationErrors}`);
        case 500:
          return new Error('Erreur serveur. Veuillez réessayer plus tard.');
        default:
          return new Error(data.message || defaultMessage);
      }
    } else if (error.request) {
      return new Error('Erreur de connexion. Vérifiez votre connexion internet.');
    } else {
      return new Error(error.message || defaultMessage);
    }
  }

  // ==========================================
  // UTILITAIRES DE FORMATAGE
  // ==========================================

  formatAssistanceForDisplay(assistance) {
    if (!assistance) return null;

    return {
      ...assistance,
      date_assistance_formatted: this.formatDate(assistance.date_assistance),
      date_retour_formatted: this.formatDate(assistance.date_retour),
      date_retour_prevue_formatted: this.formatDate(assistance.date_retour_prevue),
      montant_formatted: this.formatMontant(assistance.montant),
      priorite_badge: this.getPrioriteBadge(assistance.priorite),
      statut_validation: this.getStatutValidation(assistance),
      jours_retard: this.calculerJoursRetard(assistance)
    };
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch (error) {
      return '-';
    }
  }

  formatMontant(montant) {
    if (!montant) return '-';
    try {
      return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD'
      }).format(montant);
    } catch (error) {
      return `${montant} DH`;
    }
  }

  getPrioriteBadge(priorite) {
    const badges = {
      'Normale': { class: 'badge-secondary', text: 'Normale' },
      'Élevée': { class: 'badge-info', text: 'Élevée' },
      'Urgente': { class: 'badge-warning', text: 'Urgente' },
      'Très urgente': { class: 'badge-danger', text: 'Très urgente' }
    };
    return badges[priorite] || badges['Normale'];
  }

  getStatutValidation(assistance) {
    if (assistance.rejetee) {
      return { status: 'rejected', text: 'Rejetée', class: 'badge-danger' };
    }
    if (assistance.validee) {
      return { status: 'validated', text: 'Validée', class: 'badge-success' };
    }
    return { status: 'pending', text: 'En attente', class: 'badge-warning' };
  }

  calculerJoursRetard(assistance) {
    if (!assistance.date_retour_prevue || assistance.retour_effectue) {
      return 0;
    }

    const today = new Date();
    const dateFin = new Date(assistance.date_retour_prevue);
    const diffTime = today - dateFin;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
}

// Créer et exporter une instance unique du service
export default new AssistanceService();