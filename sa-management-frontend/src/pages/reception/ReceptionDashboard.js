import React from 'react';
import ReceptionLayout from '../../components/Layout/ReceptionLayout';
import { ReceptionProvider } from '../../contexts/ReceptionContext';
import ReceptionDashboardComponent from '../../components/Reception/ReceptionDashboard';

const ReceptionDashboard = () => {
  return (
    <ReceptionProvider>
      <ReceptionLayout>
        <ReceptionDashboardComponent />
      </ReceptionLayout>
    </ReceptionProvider>
  );
};

export default ReceptionDashboard;
