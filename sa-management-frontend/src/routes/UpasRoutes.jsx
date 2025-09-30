// src/routes/UpasRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UpasLayout from '../layouts/UpasLayout';
import ProtectedRoute from '../components/ProtectedRoute';

// Pages UPAS
import DashboardUpas from '../pages/upas/DashboardUpas';
import AssistancesPage from '../pages/upas/AssistancesPage';
import BeneficiairesPage from '../pages/upas/BeneficiairesPage';
import CampagnesPage from '../pages/upas/CampagnesPage';
import StockPage from '../pages/upas/StockPage';
import RechercheAvanceePage from '../pages/upas/RechercheAvanceePage';

const UpasRoutes = () => {
  return (
    <ProtectedRoute allowedRoles={['Responsable UPAS', 'Administrateur Informatique']}>
      <Routes>
        <Route path="/" element={<UpasLayout />}>
          {/* Redirection par défaut vers le dashboard */}
          <Route index element={<Navigate to="/upas/dashboard" replace />} />
          
          {/* Dashboard UPAS */}
          <Route path="dashboard" element={<DashboardUpas />} />
          
          {/* Gestion des assistances médicales */}
          <Route path="assistances" element={<AssistancesPage />} />
          
          {/* Gestion des bénéficiaires */}
          <Route path="beneficiaires" element={<BeneficiairesPage />} />
          
          {/* Gestion des campagnes */}
          <Route path="campagnes" element={<CampagnesPage />} />
          
          {/* État du stock */}
          <Route path="stock" element={<StockPage />} />
          
          {/* Recherche avancée */}
          <Route path="recherche" element={<RechercheAvanceePage />} />
          
          {/* Route de fallback */}
          <Route path="*" element={<Navigate to="/upas/dashboard" replace />} />
        </Route>
      </Routes>
    </ProtectedRoute>
  );
};

export default UpasRoutes;