# Step 1: Composer dependencies
FROM composer:2 as vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader
COPY . .

# Step 2: Build frontend (React + Vite)
FROM node:18 as build

WORKDIR /app
COPY . .
RUN npm install && npm run build

# Step 3: PHP + Apache final image
FROM php:8.2-apache

WORKDIR /var/www/html
COPY --from=vendor /app /var/www/html
COPY --from=build /app/public /var/www/html/public

RUN docker-php-ext-install pdo pdo_mysql
RUN a2enmod rewrite

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80
