# Deploying to Ubuntu Server

This guide explains how to deploy Maistro to a vanilla Ubuntu server.

## Prerequisites

1. Ubuntu Server 22.04 LTS or newer
2. Root or sudo access

## Initial Server Setup

1. Update system:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Install required packages:
   ```bash
   sudo apt install -y nodejs npm mysql-server nginx certbot python3-certbot-nginx
   ```

3. Install Node.js 18:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

4. Install PM2:
   ```bash
   sudo npm install -g pm2
   ```

## Database Setup

1. Secure MySQL installation:
   ```bash
   sudo mysql_secure_installation
   ```

2. Create database and user:
   ```sql
   CREATE DATABASE maistro;
   CREATE USER 'maistro_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON maistro.* TO 'maistro_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

## Application Setup

1. Create application user:
   ```bash
   sudo useradd -m -s /bin/bash maistro
   sudo usermod -aG sudo maistro
   ```

2. Set up application directory:
   ```bash
   sudo mkdir -p /var/www/maistro
   sudo chown maistro:maistro /var/www/maistro
   ```

3. Clone repository:
   ```bash
   cd /var/www/maistro
   git clone https://github.com/rebots-online/maistro.git .
   ```

4. Install dependencies:
   ```bash
   npm install --production
   ```

5. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. Build application:
   ```bash
   npm run build
   ```

## Nginx Configuration

1. Create Nginx config:
   ```bash
   sudo nano /etc/nginx/sites-available/maistro
   ```

2. Add configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /uploads {
           alias /var/www/maistro/storage/uploads;
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```

3. Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/maistro /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## SSL Setup

1. Install SSL certificate:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Process Management

1. Create PM2 ecosystem file:
   ```bash
   nano ecosystem.config.js
   ```

2. Add configuration:
   ```javascript
   module.exports = {
     apps: [{
       name: 'maistro',
       script: 'server.js',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       instances: 'max',
       exec_mode: 'cluster'
     }]
   }
   ```

3. Start application:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## File Storage

1. Create storage directories:
   ```bash
   mkdir -p /var/www/maistro/storage/{uploads,scores}
   chown -R maistro:maistro /var/www/maistro/storage
   chmod -R 755 /var/www/maistro/storage
   ```

## Security

1. Configure firewall:
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

2. Set up fail2ban:
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

## Monitoring

1. Install monitoring tools:
   ```bash
   sudo apt install -y htop iotop
   ```

2. Set up log rotation:
   ```bash
   sudo nano /etc/logrotate.d/maistro
   ```
   ```
   /var/www/maistro/logs/*.log {
       daily
       rotate 14
       compress
       delaycompress
       notifempty
       create 0640 maistro maistro
       sharedscripts
       postrotate
           pm2 reloadLogs
       endscript
   }
   ```

## Backup Setup

1. Create backup script:
   ```bash
   nano /var/www/maistro/backup.sh
   ```
   ```bash
   #!/bin/bash
   BACKUP_DIR="/var/backups/maistro"
   DATE=$(date +%Y%m%d_%H%M%S)
   
   # Backup database
   mysqldump -u maistro_user -p'your_password' maistro > "$BACKUP_DIR/db_$DATE.sql"
   
   # Backup files
   tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" /var/www/maistro/storage
   
   # Keep only last 7 days of backups
   find "$BACKUP_DIR" -type f -mtime +7 -delete
   ```

2. Make script executable:
   ```bash
   chmod +x /var/www/maistro/backup.sh
   ```

3. Add to crontab:
   ```bash
   sudo crontab -e
   ```
   ```
   0 2 * * * /var/www/maistro/backup.sh
   ```

## Maintenance

### Updates

1. Pull updates:
   ```bash
   cd /var/www/maistro
   git pull origin main
   ```

2. Update dependencies:
   ```bash
   npm install --production
   ```

3. Rebuild and restart:
   ```bash
   npm run build
   pm2 reload all
   ```

For support, contact: robin@robin.bio
