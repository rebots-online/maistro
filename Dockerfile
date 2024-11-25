# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Development image (optimized for lifetime deal hosting)
FROM node:18-alpine AS development
WORKDIR /app
ENV NODE_ENV=development
ENV DEPLOYMENT_TIER=development

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets and source
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Create storage directories
RUN mkdir -p storage uploads

# Add non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# Optimize for lower memory usage
ENV NODE_OPTIONS="--max-old-space-size=512"

EXPOSE 3000
CMD ["npm", "start"]

# Production image (for future use)
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV DEPLOYMENT_TIER=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets and source
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Create storage directories
RUN mkdir -p storage uploads

# Add non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
CMD ["npm", "start"]
