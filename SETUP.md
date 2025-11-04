# Setup Instructions

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm (via Corepack)
- Docker and Docker Compose (optional)

### Option 1: Docker Compose (Easiest)

```bash
docker compose up
```

This will:
- Build both backend and frontend containers
- Run database migrations
- Seed the database
- Start both services

Access the application at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Option 2: Manual Setup

#### Step 1: Install Dependencies

```bash
# Root directory
pnpm run install:all

# Or separately:
cd backend && pnpm install
cd ../frontend && pnpm install
```

#### Step 2: Setup Backend

```bash
cd backend

# Copy environment file
cp .env.example .env

# Generate Prisma client
pnpm run db:generate

# Run migrations (creates database)
pnpm run db:migrate

# Seed database
pnpm run db:seed

# Start backend (in one terminal)
pnpm run dev
```

Backend will run on `http://localhost:4000`

#### Step 3: Setup Frontend

```bash
cd frontend

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
echo "NEXT_PUBLIC_WS_URL=ws://localhost:4000" >> .env.local

# Start frontend (in another terminal)
pnpm run dev
```

Frontend will run on `http://localhost:3000`

## Running Tests

```bash
cd backend
pnpm test
```

## Troubleshooting

### Database Issues
If you encounter database errors:
```bash
cd backend
# Delete existing database
rm dev.db dev.db-journal
# Recreate
pnpm run db:migrate
pnpm run db:seed
```

### Port Already in Use
If port 3000 or 4000 is already in use:
- Change PORT in `backend/.env`
- Change port in `frontend/package.json` scripts

### WebSocket Connection Issues
- Ensure backend is running before frontend
- Check `NEXT_PUBLIC_WS_URL` in frontend `.env.local`
- Verify backend WebSocket server is active (check console logs)

## Production Build

### Backend
```bash
cd backend
pnpm start
```

### Frontend
```bash
cd frontend
pnpm run build
pnpm start
```

