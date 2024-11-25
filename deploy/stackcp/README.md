# Deploying to StackCP

This guide explains how to deploy Maistro to a StackCP-managed server.

## Prerequisites

1. StackCP server with:
   - Node.js support (v18+)
   - MySQL database
   - SSL/TLS certificates
   - SSH access

## Deployment Steps

### 1. Database Setup

1. In StackCP panel:
   - Create new MySQL database
   - Create database user
   - Assign permissions
   - Note connection details

2. Update `.env` file:
   ```
   DATABASE_URL="mysql://user:password@localhost:3306/database_name"
   ```

### 2. Application Setup

1. SSH into your server:
   ```bash
   ssh username@your-server
   ```

2. Navigate to web directory:
   ```bash
   cd /home/username/web/your-domain/public_html
   ```

3. Clone repository:
   ```bash
   git clone https://github.com/rebots-online/maistro.git .
   ```

4. Install dependencies:
   ```bash
   npm install --production
   ```

5. Build the application:
   ```bash
   npm run build
   ```

### 3. Process Management

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Create PM2 configuration (ecosystem.config.js):
   ```javascript
   module.exports = {
     apps: [{
       name: 'maistro',
       script: 'server.js',
       env: {
         NODE_ENV: 'production'
       }
     }]
   }
   ```

3. Start the application:
   ```bash
   pm2 start ecosystem.config.js
   ```

4. Save PM2 configuration:
   ```bash
   pm2 save
   ```

### 4. Nginx Configuration

1. Create custom Nginx configuration:
   ```nginx
   location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
   }
   ```

2. Add to StackCP's Nginx configuration through the panel

### 5. SSL Configuration

1. Use StackCP's SSL management:
   - Install Let's Encrypt certificate
   - Or upload custom SSL certificate

### 6. File Storage

1. Create storage directories:
   ```bash
   mkdir -p storage/uploads
   mkdir -p storage/scores
   ```

2. Set permissions:
   ```bash
   chown -R webuser:webgroup storage/
   chmod -R 755 storage/
   ```

## Maintenance

### Updates

1. Pull latest changes:
   ```bash
   git pull origin main
   ```

2. Update dependencies:
   ```bash
   npm install --production
   ```

3. Rebuild:
   ```bash
   npm run build
   ```

4. Restart application:
   ```bash
   pm2 restart maistro
   ```

### Backups

1. Database:
   ```bash
   mysqldump -u user -p database_name > backup.sql
   ```

2. Files:
   ```bash
   tar -czf backup.tar.gz storage/ .env
   ```

### Monitoring

1. Check application status:
   ```bash
   pm2 status
   pm2 logs maistro
   ```

2. Monitor resources through StackCP panel

## Troubleshooting

1. Check application logs:
   ```bash
   pm2 logs maistro
   ```

2. Verify Node.js version:
   ```bash
   node -v
   ```

3. Check MySQL connection:
   ```bash
   mysql -u user -p database_name -h localhost
   ```

4. Verify file permissions:
   ```bash
   ls -la storage/
   ```

For support, contact: robin@robin.bio
