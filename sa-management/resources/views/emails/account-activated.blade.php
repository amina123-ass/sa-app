<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compte activé - UPAS</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .login-button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Compte Activé !</h1>
            <p>Bienvenue dans le système UPAS</p>
        </div>
        
        <div class="content">
            <h2>Bonjour {{ $user->prenom_user }} {{ $user->nom_user }},</h2>
            
            <p>Excellente nouvelle ! Votre compte sur le système UPAS a été activé par un administrateur.</p>
            
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>📋 Détails de votre compte :</h3>
                <ul>
                    <li><strong>Email :</strong> {{ $user->email }}</li>
                    <li><strong>Rôle assigné :</strong> {{ $role->libelle }}</li>
                    <li><strong>Date d'activation :</strong> {{ now()->format('d/m/Y à H:i') }}</li>
                </ul>
            </div>
            
            @if($generatedPassword)
            <div class="credentials">
                <h3>🔐 Vos identifiants de connexion :</h3>
                <ul>
                    <li><strong>Email :</strong> {{ $user->email }}</li>
                    <li><strong>Mot de passe temporaire :</strong> {{ $generatedPassword }}</li>
                </ul>
                <p><small>⚠️ <strong>Important :</strong> Pour votre sécurité, nous vous recommandons fortement de changer ce mot de passe temporaire lors de votre première connexion.</small></p>
            </div>
            @endif
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ env('FRONTEND_URL', 'http://localhost:3000') }}/login" class="login-button">
                    🚀 Se connecter maintenant
                </a>
            </div>
            
            <p>Vous pouvez maintenant accéder à toutes les fonctionnalités correspondant à votre rôle.</p>
            <p>Si vous avez des questions ou rencontrez des difficultés, n'hésitez pas à contacter l'équipe support.</p>
            <p><strong>Bienvenue dans le système UPAS !</strong></p>
        </div>
        
        <div class="footer">
            <p>Cordialement,<br>L'équipe UPAS</p>
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
    </div>
</body>
</html>
