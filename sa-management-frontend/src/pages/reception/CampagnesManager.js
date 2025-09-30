import React from 'react';
import ReceptionLayout from '../../components/Layout/ReceptionLayout';
import { ReceptionProvider } from '../../contexts/ReceptionContext';
import CampagnesManagerComponent from '../../components/Reception/CampagnesManager';

const CampagnesManager = () => {
  return (
    <ReceptionProvider>
      <ReceptionLayout>
        <CampagnesManagerComponent />
      </ReceptionLayout>
    </ReceptionProvider>
  );
};

export default CampagnesManager;
