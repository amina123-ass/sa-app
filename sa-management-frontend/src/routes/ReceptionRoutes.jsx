// src/routes/ReceptionRoutes.jsx
import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import ReceptionLayout from '../components/Layout/ReceptionLayout';
import Dashboard from '../pages/reception/Dashboard';
import Campagnes from '../pages/reception/Campagnes';
import Participants from '../pages/reception/Participants';
import DemandesRecentes from '../pages/reception/DemandesRecentes';
import RechercheAvancee from '../pages/reception/RechercheAvancee';
import ProtectedRoute from '../components/ProtectedRoute';

const ReceptionRoutes = () => {
  return (
    <Routes>
      <Route
        path="/reception/*"
        element={
          <ProtectedRoute requiredRole="Réception">
            <ReceptionLayout>
              <Routes>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="campagnes" element={<Campagnes />} />
                <Route path="participants" element={<Participants />} />
                <Route path="demandes-recentes" element={<DemandesRecentes />} />
                <Route path="recherche-avancee" element={<RechercheAvancee />} />
                <Route path="*" element={<Navigate to="/reception/dashboard" replace />} />
              </Routes>
            </ReceptionLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default ReceptionRoutes;
