<?php
// config/cors.php - Configuration temporaire pour diagnostic

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', '*'],  // Temporairement élargi

    'allowed_methods' => ['*'],

    // Temporairement très permissif pour tester
    'allowed_origins' => ['*'],  // ATTENTION: À restreindre en production

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['XSRF-TOKEN'],

    'max_age' => 0,

    'supports_credentials' => false,  // Temporairement désactivé pour test
];
