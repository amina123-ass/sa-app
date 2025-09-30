import React from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper,
  Grid,
  LinearProgress
} from '@mui/material';

const PrintableReport = ({ rapportData }) => {
  if (!rapportData) return null;

  const printStyles = `
    @media print {
      @page {
        margin: 1cm;
        size: A4;
      }
      
      body * {
        visibility: hidden;
      }
      
      #printable-report, #printable-report * {
        visibility: visible !important;
      }
      
      #printable-report {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      
      .no-print {
        display: none !important;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      .avoid-break {
        page-break-inside: avoid;
      }
      
      .print-table {
        font-size: 10px !important;
      }
      
      .print-table th {
        background-color: #1976D2 !important;
        color: white !important;
        -webkit-print-color-adjust: exact;
      }
      
      .print-header {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #1976D2;
        padding-bottom: 15px;
      }
      
      .print-stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin: 15px 0;
      }
      
      .print-stat-card {
        border: 1px solid #ddd;
        padding: 10px;
        text-align: center;
        background: #f9f9f9;
        -webkit-print-color-adjust: exact;
      }
      
      .print-section-title {
        font-size: 16px;
        font-weight: bold;
        color: #1976D2;
        margin: 20px 0 10px 0;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
      }
    }
  `;

  return (
    <>
      <style>{printStyles}</style>
      <div id="printable-report" style={{ display: 'none' }}>
        {/* En-tête du rapport */}
        <div className="print-header">
          <Typography variant="h4" style={{ fontWeight: 'bold', color: '#1976D2' }}>
            📊 RAPPORT DE STATISTIQUES - UPAS
          </Typography>
          <Typography variant="h6" style={{ color: '#666', margin: '10px 0' }}>
            Campagne : {rapportData.campagne.nom}
          </Typography>
          <Typography variant="body2" style={{ color: '#999' }}>
            Généré le : {new Date().toLocaleDateString('fr-FR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>
        </div>

        {/* Informations de la campagne */}
        <div className="avoid-break">
          <div className="print-section-title">📋 Informations de la Campagne</div>
          <Grid container spacing={2} style={{ marginBottom: '20px' }}>
            <Grid item xs={6}>
              <Typography><strong>Type d'assistance :</strong> {rapportData.campagne.type_assistance}</Typography>
              <Typography><strong>Période :</strong> {rapportData.campagne.date_debut} - {rapportData.campagne.date_fin}</Typography>
              <Typography><strong>Lieu :</strong> {rapportData.campagne.lieu}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography><strong>Budget alloué :</strong> {rapportData.campagne.budget_alloue?.toLocaleString() || 'Non défini'} DH</Typography>
              <Typography><strong>Description :</strong> {rapportData.campagne.description || 'Aucune description'}</Typography>
            </Grid>
          </Grid>
        </div>

        {/* Statistiques globales */}
        <div className="avoid-break">
          <div className="print-section-title">📈 Statistiques Globales</div>
          <div className="print-stats-grid">
            <div className="print-stat-card">
              <Typography variant="h6" style={{ fontWeight: 'bold', color: '#1976D2' }}>
                {rapportData.statistiques_generales.total_beneficiaires}
              </Typography>
              <Typography variant="caption">Total Bénéficiaires</Typography>
            </div>
            <div className="print-stat-card">
              <Typography variant="h6" style={{ fontWeight: 'bold', color: '#1976D2' }}>
                {rapportData.statistiques_generales.hommes}
              </Typography>
              <Typography variant="caption">Hommes ({((rapportData.statistiques_generales.hommes / rapportData.statistiques_generales.total_beneficiaires) * 100 || 0).toFixed(1)}%)</Typography>
            </div>
            <div className="print-stat-card">
              <Typography variant="h6" style={{ fontWeight: 'bold', color: '#1976D2' }}>
                {rapportData.statistiques_generales.femmes}
              </Typography>
              <Typography variant="caption">Femmes ({((rapportData.statistiques_generales.femmes / rapportData.statistiques_generales.total_beneficiaires) * 100 || 0).toFixed(1)}%)</Typography>
            </div>
            <div className="print-stat-card">
              <Typography variant="h6" style={{ fontWeight: 'bold', color: '#4CAF50' }}>
                {rapportData.statistiques_generales.ayant_beneficie}
              </Typography>
              <Typography variant="caption">Ayant Bénéficié ({rapportData.statistiques_generales.taux_reussite}%)</Typography>
            </div>
          </div>
        </div>

        {/* Détails par type d'assistance */}
        {Object.entries(rapportData.statistiques_specifiques).map(([typeKey, typeData]) => (
          <div key={typeKey} className="page-break avoid-break">
            <div className="print-section-title">
              {typeKey === 'lunettes' ? '👓 Lunettes - Détails' : 
               typeKey === 'auditifs' ? '🦻 Appareils Auditifs - Détails' : 
               '🏥 Assistance Médicale - Détails'}
            </div>
            
            <TableContainer component={Paper} style={{ marginBottom: '20px' }}>
              <Table className="print-table">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Indicateur</strong></TableCell>
                    <TableCell align="center"><strong>Total Bénéficiaires</strong></TableCell>
                    <TableCell align="center"><strong>Ayant Bénéficié</strong></TableCell>
                    <TableCell align="center"><strong>Taux de Réussite</strong></TableCell>
                    <TableCell align="center"><strong>Prix Unitaire</strong></TableCell>
                    <TableCell align="center"><strong>Crédit Consommé</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <strong>
                        {typeKey === 'lunettes' ? 'Lunettes' : 
                         typeKey === 'auditifs' ? 'Appareils Auditifs' : 
                         'Assistance Médicale'}
                      </strong>
                    </TableCell>
                    <TableCell align="center">{typeData.total_beneficiaires}</TableCell>
                    <TableCell align="center" style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                      {typeData.ayant_beneficie}
                    </TableCell>
                    <TableCell align="center" style={{ color: '#FF9800', fontWeight: 'bold' }}>
                      {((typeData.ayant_beneficie / typeData.total_beneficiaires) * 100 || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell align="center">{typeData.prix_unitaire.toLocaleString()} DH</TableCell>
                    <TableCell align="center" style={{ color: '#F44336', fontWeight: 'bold' }}>
                      {typeData.credit_consomme.toLocaleString()} DH
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Répartition par sexe */}
            <Typography variant="subtitle1" style={{ fontWeight: 'bold', marginBottom: '10px' }}>
              Répartition par sexe
            </Typography>
            <Grid container spacing={2} style={{ marginBottom: '15px' }}>
              <Grid item xs={6}>
                <Box style={{ padding: '10px', background: '#E3F2FD', borderRadius: '4px', textAlign: 'center' }}>
                  <Typography variant="body2">Hommes</Typography>
                  <Typography variant="h6" style={{ fontWeight: 'bold' }}>
                    {typeData.par_sexe.M} ({((typeData.par_sexe.M / typeData.total_beneficiaires) * 100 || 0).toFixed(1)}%)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box style={{ padding: '10px', background: '#F3E5F5', borderRadius: '4px', textAlign: 'center' }}>
                  <Typography variant="body2">Femmes</Typography>
                  <Typography variant="h6" style={{ fontWeight: 'bold' }}>
                    {typeData.par_sexe.F} ({((typeData.par_sexe.F / typeData.total_beneficiaires) * 100 || 0).toFixed(1)}%)
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Analyse financière */}
            <Typography variant="subtitle1" style={{ fontWeight: 'bold', marginBottom: '10px' }}>
              💰 Analyse Financière
            </Typography>
            <Box style={{ padding: '15px', background: '#F5F5F5', borderRadius: '4px', marginBottom: '15px' }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Budget prévisionnel :</strong> {(typeData.budget_previsionnel || typeData.total_beneficiaires * typeData.prix_unitaire).toLocaleString()} DH</Typography>
                  <Typography variant="body2"><strong>Budget consommé :</strong> {typeData.credit_consomme.toLocaleString()} DH</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Économie réalisée :</strong> {((typeData.budget_previsionnel || typeData.total_beneficiaires * typeData.prix_unitaire) - typeData.credit_consomme).toLocaleString()} DH</Typography>
                  <Typography variant="body2"><strong>Taux d'utilisation :</strong> {((typeData.credit_consomme / (typeData.budget_previsionnel || typeData.total_beneficiaires * typeData.prix_unitaire)) * 100 || 0).toFixed(1)}%</Typography>
                </Grid>
              </Grid>
            </Box>
          </div>
        ))}

        {/* Recommandations */}
        <div className="page-break avoid-break">
          <div className="print-section-title">💡 Recommandations</div>
          {Object.entries(rapportData.statistiques_specifiques).map(([typeKey, typeData]) => {
            const tauxReussite = (typeData.ayant_beneficie / typeData.total_beneficiaires) * 100 || 0;
            
            return (
              <Box key={typeKey} style={{ 
                marginBottom: '15px', 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                borderLeft: '4px solid #FF9800'
              }}>
                <Typography variant="subtitle2" style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {typeKey === 'lunettes' ? '👓 Lunettes' : 
                   typeKey === 'auditifs' ? '🦻 Appareils Auditifs' : 
                   '🏥 Assistance Médicale'}
                </Typography>
                <Typography variant="body2">
                  {tauxReussite >= 60 ? 
                    `✅ Performance satisfaisante avec ${tauxReussite.toFixed(1)}% de taux de réussite. Continuer les efforts actuels.` :
                    `⚠️ Taux de réussite de ${tauxReussite.toFixed(1)}% nécessite une amélioration. Recommandation : réviser les critères de sélection et le suivi des bénéficiaires.`
                  }
                </Typography>
              </Box>
            );
          })}
        </div>

        {/* Footer */}
        <Box style={{ 
          marginTop: '30px', 
          paddingTop: '15px', 
          borderTop: '1px solid #ddd', 
          textAlign: 'center',
          fontSize: '12px',
          color: '#666'
        }}>
          <Typography variant="caption">
            Rapport généré par le système UPAS - Confidentiel - {new Date().toLocaleDateString('fr-FR')}
          </Typography>
        </Box>
      </div>
    </>
  );
};

export default PrintableReport;