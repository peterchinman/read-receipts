#!/bin/bash
# server-setup.sh — run once on a fresh DigitalOcean Ubuntu 24.04 droplet as root.
#
# Prerequisites:
#   1. Clone the repo into its final location before running this script:
#        Public repo:
#          git clone https://github.com/YOUR_USERNAME/YOUR_REPO /var/www/readreceipts
#
#   2. Have your deployer SSH public key ready to paste when prompted.
#
# After running:
#   - Trigger a deploy by pushing to main (or manually run the GitHub Actions workflow)
#   - SSH in as 'deployer' and run: bash /var/www/readreceipts/scripts/init-deploy.sh

set -euo pipefail

# ============================================================
# Configuration
# ============================================================
read -rp "Admin email (for SSL cert): " ADMIN_EMAIL

APP_DIR=/var/www/readreceipts
DEPLOY_USER=deployer
PHP_VER=8.4

if [ ! -d "$APP_DIR/.git" ]; then
    echo "Error: repo not found at $APP_DIR. Clone it there before running this script."
    exit 1
fi

# ============================================================
# System packages
# ============================================================
apt-get update && apt-get upgrade -y

apt-get install -y \
    nginx \
    php${PHP_VER}-fpm php${PHP_VER}-cli php${PHP_VER}-sqlite3 php${PHP_VER}-mbstring \
    php${PHP_VER}-xml php${PHP_VER}-curl php${PHP_VER}-zip php${PHP_VER}-bcmath php${PHP_VER}-tokenizer \
    supervisor \
    sqlite3 \
    certbot python3-certbot-nginx \
    git \
    ufw

# Install Composer
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# ============================================================
# Create deploy user
# ============================================================
id $DEPLOY_USER &>/dev/null || useradd -m -s /bin/bash $DEPLOY_USER

mkdir -p /home/$DEPLOY_USER/.ssh
echo ""
echo "Paste the deployer SSH public key, then press Enter and Ctrl+D:"
cat > /home/$DEPLOY_USER/.ssh/authorized_keys
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys

# Add deployer to www-data group so it can write to storage/bootstrap/database during deploys
usermod -aG www-data $DEPLOY_USER

# Allow deployer to restart the queue worker without a password
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/bin/supervisorctl restart laravel-worker" \
    > /etc/sudoers.d/$DEPLOY_USER
chmod 440 /etc/sudoers.d/$DEPLOY_USER

# ============================================================
# Set up app directory
# ============================================================
# Create persistent directories that are excluded from rsync deploys.
# These survive every deploy and are owned by www-data (PHP-FPM).
mkdir -p $APP_DIR/backend/storage/{app/public,framework/{cache/data,sessions,testing,views},logs}
mkdir -p $APP_DIR/backend/bootstrap/cache
mkdir -p $APP_DIR/backend/database
touch $APP_DIR/backend/database/database.sqlite

# Deployer owns the app files; www-data owns the writable runtime dirs
chown -R $DEPLOY_USER:www-data $APP_DIR
find $APP_DIR -type f -exec chmod 644 {} \;
find $APP_DIR -type d -exec chmod 755 {} \;

chown -R www-data:www-data \
    $APP_DIR/backend/storage \
    $APP_DIR/backend/bootstrap/cache \
    $APP_DIR/backend/database
chmod -R 775 \
    $APP_DIR/backend/storage \
    $APP_DIR/backend/bootstrap/cache \
    $APP_DIR/backend/database

# ============================================================
# nginx — temporary HTTP config just to get the SSL cert
# ============================================================
cat > /etc/nginx/sites-available/readreceipts << 'NGINX'
server {
    listen 80;
    server_name readreceipts.org www.readreceipts.org;
    root /var/www/html;
    location / { try_files $uri $uri/ =404; }
}
NGINX

ln -sf /etc/nginx/sites-available/readreceipts /etc/nginx/sites-enabled/readreceipts
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ============================================================
# SSL certificate via Let's Encrypt
# ============================================================
certbot certonly --webroot -w /var/www/html \
    -d readreceipts.org -d www.readreceipts.org \
    --non-interactive --agree-tos --email "$ADMIN_EMAIL"

# Enable automatic renewal
systemctl enable certbot.timer

# Now deploy the real HTTPS nginx config
cp $APP_DIR/scripts/nginx.conf /etc/nginx/sites-available/readreceipts
nginx -t && systemctl reload nginx

# ============================================================
# Supervisor (queue worker)
# ============================================================
cp $APP_DIR/scripts/supervisor-worker.conf /etc/supervisor/conf.d/laravel-worker.conf
systemctl enable supervisor
supervisorctl reread
supervisorctl update

# ============================================================
# Firewall
# ============================================================
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# ============================================================
# SQLite backup cron — daily at 2am, keeps 30 days
# ============================================================
mkdir -p /var/backups/readreceipts

# Write backup as a script (cron doesn't support line continuations)
cat > /usr/local/bin/backup-readreceipts << 'SCRIPT'
#!/bin/bash
sqlite3 /var/www/readreceipts/backend/database/database.sqlite ".backup '/var/backups/readreceipts/db-$(date +%Y%m%d).sqlite'"
find /var/backups/readreceipts -name "*.sqlite" -mtime +30 -delete
SCRIPT
chmod +x /usr/local/bin/backup-readreceipts

echo "0 2 * * * root /usr/local/bin/backup-readreceipts" > /etc/cron.d/readreceipts-backup

echo ""
echo "================================================================"
echo " Server setup complete!"
echo ""
echo " Next steps:"
echo "   1. Trigger a deploy by pushing to main (or manually run the GitHub Actions workflow)"
echo "   2. SSH in as deployer and run: bash /var/www/readreceipts/scripts/init-deploy.sh"
echo "================================================================"
