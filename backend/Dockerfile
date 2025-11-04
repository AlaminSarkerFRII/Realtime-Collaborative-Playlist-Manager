FROM node:18-alpine

WORKDIR /app

# Install OpenSSL and other dependencies needed for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat curl sqlite

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client with Alpine Linux binary targets
RUN npx prisma generate

# Copy application code
COPY . .

# Create data directory with proper permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose port
EXPOSE 4000

# Use entrypoint script
ENTRYPOINT ["/app/docker-entrypoint.sh"]

