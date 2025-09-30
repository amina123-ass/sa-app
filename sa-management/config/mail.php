<?php
// config/mail.php - Configuration Email Corrigée

return [
    'admin_email' => env('ADMIN_EMAIL', 'aminatitoua342@gmail.com'),

    // CHANGEMENT IMPORTANT: Utiliser SMTP au lieu de log
    'default' => env('MAIL_MAILER', 'smtp'),

    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME'),
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', 'smtp.gmail.com'),
            'port' => env('MAIL_PORT', 587),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => 30, // Augmenter le timeout
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url(env('APP_URL', 'http://192.168.1.45:3000'), PHP_URL_HOST)),
            'encryption' => env('MAIL_ENCRYPTION', 'tls'),
        ],

        // Garder log comme fallback pour les tests
        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            'mailers' => [
                'smtp',
                'log',
            ],
            'retry_after' => 60,
        ],
    ],

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'aminatitoua342@gmail.com'),
        'name' => env('MAIL_FROM_NAME', 'SA Management'),
    ],
];

/*
=== FICHIER .env CORRIGÉ ===

APP_NAME="SA Management"
APP_ENV=local
APP_KEY=base64:8CXD+PQg+GGBhe6Q7FVwUf/Wnc1V9DAklt5+LLun+7k=
APP_DEBUG=true
APP_URL=http://localhost:8000

# Configuration Base de données
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sa_management_3afak
DB_USERNAME=root
DB_PASSWORD=

# Configuration Email - CORRIGER CES VALEURS
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=aminatitoua342@gmail.com
MAIL_PASSWORD=uyohfhnnyubypanv
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=aminatitoua342@gmail.com
MAIL_FROM_NAME="SA Management"
ADMIN_EMAIL=aminatitoua342@gmail.com

# Configuration Queue - IMPORTANT POUR LES NOTIFICATIONS
QUEUE_CONNECTION=database
QUEUE_RETRY_AFTER=90

# Configuration Session
SESSION_DRIVER=database
SESSION_LIFETIME=120
SANCTUM_STATEFUL_DOMAINS=localhost:3000
SESSION_DOMAIN=localhost

# Configuration Upload/Export
MAX_FILE_SIZE=10240
ALLOWED_FILE_TYPES=xlsx,xls,csv
EXPORT_MAX_RECORDS=10000

# Configuration Frontend
REACT_APP_API_URL=http://localhost:8000/api
FRONTEND_URL=http://localhost:3000

# Configuration PDF
DOMPDF_ENABLE_PHP=true
DOMPDF_ENABLE_REMOTE=true
*/