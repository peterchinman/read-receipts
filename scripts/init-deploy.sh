#!/bin/bash
# init-deploy.sh — run once after the first GitHub Actions deploy lands on the server.
# SSH in as deployer and run: bash /var/www/readreceipts/scripts/init-deploy.sh

set -euo pipefail

BACKEND=/var/www/readreceipts/backend

# ============================================================
# .env
# ============================================================
echo "=== Creating .env ==="
cp $BACKEND/.env.example $BACKEND/.env

echo ""
echo "Open another terminal and edit $BACKEND/.env with production values:"
echo ""
echo "  APP_NAME=\"Read Receipts\""
echo "  APP_ENV=production"
echo "  APP_DEBUG=false"
echo "  APP_URL=https://readreceipts.org"
echo "  FRONTEND_URL=https://readreceipts.org"
echo "  LOG_LEVEL=error"
echo ""
echo "  # Mail (Resend)"
echo "  MAIL_MAILER=resend"
echo "  RESEND_KEY=re_..."
echo "  MAIL_FROM_ADDRESS=submissions@readreceipts.org"
echo "  MAIL_FROM_NAME=\"Read Receipts\""
echo ""
read -rp "Press Enter when .env is saved..."

# ============================================================
# Laravel bootstrap
# ============================================================
echo "=== Installing Composer dependencies ==="
cd $BACKEND && composer install --no-dev --optimize-autoloader

echo "=== Generating app key ==="
php $BACKEND/artisan key:generate

echo "=== Running migrations ==="
php $BACKEND/artisan migrate --force

echo "=== Setting database permissions ==="
sudo chown www-data:www-data $BACKEND/database/database.sqlite
sudo chown www-data:www-data $BACKEND/database/
sudo chmod 664 $BACKEND/database/database.sqlite
sudo chmod 775 $BACKEND/database/

echo "=== Caching config / routes / views ==="
php $BACKEND/artisan config:cache
php $BACKEND/artisan route:cache
php $BACKEND/artisan view:cache

# ============================================================
# Admin user
# ============================================================
echo ""
read -rp "Admin email address: " ADMIN_EMAIL

echo "App\Models\User::create([
    'name' => 'Admin',
    'email' => '$ADMIN_EMAIL',
    'is_admin' => true,
]);
echo 'Admin user created.';" | php $BACKEND/artisan tinker

# ============================================================
# Start queue worker
# ============================================================
echo "=== Starting queue worker ==="
sudo supervisorctl restart laravel-worker

echo ""
echo "================================================================"
echo " Init complete! readreceipts.org should be live."
echo "================================================================"
