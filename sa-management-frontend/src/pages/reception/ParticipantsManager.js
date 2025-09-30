import React from 'react';
import ReceptionLayout from '../../components/Layout/ReceptionLayout';
import { ReceptionProvider } from '../../contexts/ReceptionContext';
import ParticipantsManagerComponent from '../../components/Reception/ParticipantsManager';

const ParticipantsManager = () => {
  return (
    <ReceptionProvider>
      <ReceptionLayout>
        <ParticipantsManagerComponent />
      </ReceptionLayout>
    </ReceptionProvider>
  );
};

export default ParticipantsManager;