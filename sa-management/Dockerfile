FROM php:8.2-cli

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Installer les extensions PHP
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Configurer PHP
RUN echo "memory_limit = 512M" > /usr/local/etc/php/conf.d/memory.ini
RUN echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/memory.ini

# Installer Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Définir le répertoire de travail
WORKDIR /var/www/html

# Créer les répertoires nécessaires (au cas où)
RUN mkdir -p /var/www/html/storage/logs /var/www/html/storage/framework/{cache,sessions,views} /var/www/html/bootstrap/cache

# Exposer le port
EXPOSE 8000

# Commande par défaut (sera remplacée par docker-compose)
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]