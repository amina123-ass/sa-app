# ========================================
# Dockerfile pour Laravel 10 + PHP 8.2
# Compatible avec sa_management backend
# ========================================

FROM php:8.2-cli

# Définir les variables d'environnement pour éviter les prompts interactifs
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Africa/Casablanca \
    COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1

# Installer les dépendances système requises
RUN apt-get update && apt-get install -y \
    # Outils de base
    git \
    curl \
    wget \
    unzip \
    zip \
    # Dépendances pour GD (images)
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libwebp-dev \
    # Dépendances pour autres extensions PHP
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    # Client MySQL pour healthcheck et debugging
    default-mysql-client \
    # Utilitaires système
    procps \
    vim \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Configurer et installer l'extension GD avec support complet
RUN docker-php-ext-configure gd \
    --with-freetype \
    --with-jpeg \
    --with-webp

# Installer toutes les extensions PHP nécessaires pour Laravel
RUN docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    opcache

# Configuration PHP optimisée pour Laravel
RUN { \
    echo 'memory_limit = 512M'; \
    echo 'max_execution_time = 120'; \
    echo 'max_input_time = 120'; \
    echo 'post_max_size = 50M'; \
    echo 'upload_max_filesize = 50M'; \
    echo 'max_input_vars = 5000'; \
    echo 'date.timezone = Africa/Casablanca'; \
    echo 'expose_php = Off'; \
} > /usr/local/etc/php/conf.d/laravel.ini

# Configuration Opcache optimisée pour Laravel en production
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.enable_cli=0'; \
    echo 'opcache.memory_consumption=256'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=10000'; \
    echo 'opcache.revalidate_freq=2'; \
    echo 'opcache.validate_timestamps=1'; \
    echo 'opcache.fast_shutdown=1'; \
    echo 'opcache.save_comments=1'; \
    echo 'opcache.enable_file_override=0'; \
} > /usr/local/etc/php/conf.d/opcache.ini

# Installer Composer (dernière version stable)
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Créer l'utilisateur www-data s'il n'existe pas et configurer les permissions
RUN usermod -u 1000 www-data || true && \
    groupmod -g 1000 www-data || true

# Définir le répertoire de travail
WORKDIR /var/www/html

# Créer la structure des dossiers Laravel avec les bonnes permissions
RUN mkdir -p \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache && \
    chmod -R 775 storage bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Exposer le port 8000 pour Laravel
EXPOSE 8000

# Healthcheck pour vérifier que Laravel répond
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://127.0.0.1:8000 || exit 1

# Point d'entrée par défaut (sera surchargé par docker-compose)
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]