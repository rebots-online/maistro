# Deploying to Plesk

This guide explains how to deploy Maistro to a Plesk-managed server.

## Prerequisites

1. Plesk server with:
   - Node.js support
   - PostgreSQL or MySQL database
   - SSL/TLS certificates configured
   - Git support enabled

## Deployment Steps

### 1. Database Setup

1. Create a new database in Plesk
2. Note down the database credentials
3. Update the `.env` file with the database connection string

### 2. Application Setup

1. Create a new domain or subdomain in Plesk
2. Enable Node.js for the domain
3. Set up Git deployment:
   ```bash
   git remote add plesk ssh://user@your-server:port/path/to/git/repo
   git push plesk main
   ```

### 3. Environment Configuration

1. In Plesk, navigate to the domain's Node.js settings
2. Set the following:
   - Document root: `/public`
   - Application root: `/`
   - Application startup file: `server.js`
   - Node.js version: 18.x
   - NPM install command: `npm install --production`
   - Application mode: `production`

### 4. SSL Configuration

1. Use Plesk's built-in Let's Encrypt integration
2. Or upload your own SSL certificate

### 5. File Storage

1. Create required directories:
   ```bash
   mkdir -p /var/www/vhosts/your-domain/uploads
   mkdir -p /var/www/vhosts/your-domain/scores
   ```
2. Set proper permissions:
   ```bash
   chown -R psaserv:psacln /var/www/vhosts/your-domain/uploads
   chown -R psaserv:psacln /var/www/vhosts/your-domain/scores
   ```

## Maintenance

### Updates

1. Push changes to the Plesk Git repository:
   ```bash
   git push plesk main
   ```

### Backups

1. Use Plesk's backup feature to backup:
   - Application files
   - Database
   - Configuration

### Monitoring

1. Check application logs in Plesk's Node.js interface
2. Monitor resource usage through Plesk's statistics

## Troubleshooting

1. Check Node.js application logs in Plesk
2. Verify database connection
3. Check file permissions
4. Verify environment variables

For support, contact: robin@robin.bio
