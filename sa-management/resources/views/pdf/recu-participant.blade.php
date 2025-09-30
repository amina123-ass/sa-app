<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reçu d'inscription - Centre Médical UPAS</title>
    <style>
        @page {
            size: A5 portrait;
            margin: 8mm;
        }
        
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 8px;
            line-height: 1.2;
            color: #333;
            margin: 0;
            padding: 0;
            max-width: 132mm;
            min-height: 194mm;
        }
        
        .header {
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 1px solid #1976d2;
            padding-bottom: 6px;
        }
        
        .logo {
            font-size: 12px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 2px;
        }
        
        .title {
            font-size: 10px;
            font-weight: bold;
            color: #2c3e50;
            margin: 4px 0;
        }
        
        .subtitle {
            font-size: 8px;
            color: #7f8c8d;
        }
        
        .content {
            margin: 8px 0;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 3px;
            border-bottom: 1px dotted #eee;
            padding-bottom: 2px;
            align-items: flex-start;
        }
        
        .label {
            font-weight: bold;
            width: 70px;
            color: #2c3e50;
            flex-shrink: 0;
            font-size: 7px;
        }
        
        .value {
            flex: 1;
            color: #34495e;
            word-break: break-word;
            font-size: 8px;
        }
        
        .status-box {
            background-color: #e8f5e8;
            border: 1px solid #27ae60;
            border-radius: 3px;
            padding: 4px;
            text-align: center;
            margin: 8px 0;
        }
        
        .status-text {
            font-size: 9px;
            font-weight: bold;
            color: #27ae60;
        }
        
        .footer {
            margin-top: 12px;
            text-align: center;
            font-size: 7px;
            color: #7f8c8d;
            border-top: 1px solid #ddd;
            padding-top: 6px;
        }
        
        .signature-area {
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            gap: 5px;
        }
        
        .signature-box {
            text-align: center;
            width: 48%;
            font-size: 7px;
        }
        
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 15px;
            padding-top: 2px;
            font-size: 6px;
        }
        
        .campaign-info {
            background-color: #f8f9fa;
            border-left: 2px solid #1976d2;
            padding: 4px;
            margin: 6px 0;
            font-size: 7px;
        }
        
        .campaign-title {
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 2px;
            font-size: 8px;
        }
        
        .section-title {
            color: #2c3e50;
            margin: 6px 0 4px 0;
            font-size: 8px;
            font-weight: bold;
            border-bottom: 1px solid #eee;
            padding-bottom: 1px;
        }
        
        .important-note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 2px;
            padding: 3px;
            margin: 5px 0;
            font-size: 7px;
        }
        
        .reference-number {
            background-color: #e3f2fd;
            border: 1px solid #1976d2;
            border-radius: 2px;
            padding: 2px 4px;
            display: inline-block;
            font-weight: bold;
            color: #1976d2;
            font-size: 8px;
        }
        
        .compact-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 7px;
        }
        
        .compact-label {
            font-weight: bold;
            color: #2c3e50;
        }
        
        .compact-value {
            color: #34495e;
            text-align: right;
        }
        
        .mini-section {
            margin: 4px 0;
            padding: 3px;
            background-color: #f9f9f9;
            border-radius: 2px;
        }
        
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🏥 DÉLÉGATION DE SANTÉ - SEFROU</div>
        <div class="title">REÇU D'INSCRIPTION</div>
        <div class="subtitle">Campagne Médicale</div>
    </div>

    <div class="content">
        <div class="campaign-info">
            <div class="campaign-title">Campagne de Dépistage Médical</div>
            <div>📅 15/07/2025 → 30/07/2025</div>
            <div>📍 Délégation de Santé - Sefrou</div>
        </div>

        <div class="status-box">
            <div class="status-text">✅ INSCRIPTION CONFIRMÉE</div>
        </div>

        <div class="section-title">Participant :</div>
        
        <div class="compact-row">
            <span class="compact-label">Nom :</span>
            <span class="compact-value">Mohamed El Alami</span>
        </div>
        
        <div class="compact-row">
            <span class="compact-label">Adresse :</span>
            <span class="compact-value">Rue Hassan II, Agdal, Fès</span>
        </div>
        
        <div class="compact-row">
            <span class="compact-label">Téléphone :</span>
            <span class="compact-value">+212 6 12 34 56 78</span>
        </div>
        
        <div class="compact-row">
            <span class="compact-label">Email :</span>
            <span class="compact-value">m.elalami@email.com</span>
        </div>
        
        <div class="mini-section">
            <div class="compact-row">
                <span class="compact-label">Né le :</span>
                <span class="compact-value">15/03/1980</span>
            </div>
            <div class="compact-row">
                <span class="compact-label">CIN :</span>
                <span class="compact-value">AB123456</span>
            </div>
            <div class="compact-row">
                <span class="compact-label">Appelé le :</span>
                <span class="compact-value">10/07/2025 à 14:30</span>
            </div>
        </div>
        
        <div style="text-align: center; margin: 8px 0;">
            <span class="compact-label">N° Réf : </span>
            <span class="reference-number">000125</span>
        </div>
    </div>

    <div class="important-note">
        <strong>⚠️</strong> Se présenter à jeun (12h sans manger) pour les analyses sanguines.
    </div>

    <div class="signature-area">
        <div class="signature-box">
            <div>Participant</div>
            <div class="signature-line">Signature</div>
        </div>
        <div class="signature-box">
            <div>Réception</div>
            <div class="signature-line">Signature & cachet</div>
        </div>
    </div>

    <div class="footer">
        <div><strong>Conserver ce reçu</strong> - À présenter le jour J</div>
        <div style="margin-top: 4px;">
            📞 05 35 66 XX XX | 🕒 06/07/2025 à 16:45
        </div>
    </div>
</body>
</html>