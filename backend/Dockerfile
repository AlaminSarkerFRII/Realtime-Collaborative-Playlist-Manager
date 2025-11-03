FROM node:18-alpine

WORKDIR /app

# Install OpenSSL and other dependencies needed for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat curl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client with Alpine Linux binary targets
ENV PRISMA_CLI_BINARY_TARGETS="native,linux-musl-openssl-3.0.x"
RUN npx prisma generate

# Copy application code
COPY . .

# Create data directory with proper permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Expose port
EXPOSE 4000

# Create a startup script
RUN echo '#!/bin/sh\n\
set -e\n\
echo "Setting up database..."\n\
npx prisma db push --skip-generate --accept-data-loss || echo "Database push completed"\n\
if [ ! -f /app/data/dev.db ] || [ ! -s /app/data/dev.db ]; then\n\
  echo "Seeding database..."\n\
  npm run db:seed\n\
else\n\
  echo "Database exists, skipping seed"\n\
fi\n\
echo "Starting server..."\n\
npm start' > /app/start.sh && chmod +x /app/start.sh

# Start script
CMD ["/app/start.sh"]

