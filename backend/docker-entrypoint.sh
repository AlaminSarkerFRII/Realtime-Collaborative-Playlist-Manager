#!/bin/sh
set -e

echo "🚀 Starting backend setup..."

# Ensure data directory exists
mkdir -p /app/data

# Generate Prisma client (in case it wasn't generated during build)
echo "📦 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "📊 Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Migrations failed, attempting to initialize..."
  npx prisma migrate dev --name init || {
    echo "⚠️  Migration dev failed, trying db push as fallback..."
    npx prisma db push --accept-data-loss || true
  }
}

# Check if database needs seeding (check if any tracks exist)
echo "🌱 Checking if database needs seeding..."
NEEDS_SEED=true
if [ -f /app/data/dev.db ]; then
  # Try to check if tracks exist using a simple SQLite query
  TRACK_COUNT=$(sqlite3 /app/data/dev.db "SELECT COUNT(*) FROM Track;" 2>/dev/null || echo "0")
  if [ "$TRACK_COUNT" != "0" ] && [ -n "$TRACK_COUNT" ]; then
    NEEDS_SEED=false
    echo "✅ Database already seeded (${TRACK_COUNT} tracks found)"
  fi
fi

if [ "$NEEDS_SEED" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed || echo "⚠️  Seeding failed, but continuing..."
fi

echo "✅ Database setup complete!"
echo "🚀 Starting server..."

# Start the server
exec npm start

