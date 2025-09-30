<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <title>{{ config('app.name', 'UPAS Management System') }}</title>
    
    <!-- Styles -->
    @if(file_exists(public_path('build/manifest.json')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @else
        <!-- Fallback for development -->
        <link href="{{ asset('css/app.css') }}" rel="stylesheet">
        <script src="{{ asset('js/app.js') }}" defer></script>
    @endif
    
    <!-- Additional meta tags for SPA -->
    <meta name="description" content="Système de gestion UPAS">
    <meta name="robots" content="noindex, nofollow">
</head>
<body>
    <div id="app">
        <!-- React/Vue app will mount here -->
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
            <div style="text-align: center;">
                <h2>Chargement de l'application...</h2>
                <p>Si cette page persiste, vérifiez que JavaScript est activé.</p>
            </div>
        </div>
    </div>

    <!-- Environment variables for frontend -->
    <script>
        window.Laravel = {
            csrfToken: '{{ csrf_token() }}',
            apiUrl: '{{ config('app.url') }}/api',
            baseUrl: '{{ config('app.url') }}'
        };
    </script>
</body>
</html>