# Quick Start Guide

## 🚀 Fastest Way to Run

### With Docker (Recommended)

```bash
# Just run this one command:
docker compose up

# Then open:
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
```

### Without Docker

```bash
# Terminal 1 - Backend
cd backend
pnpm install
cp .env.example .env
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
pnpm run dev

# Terminal 2 - Frontend  
cd frontend
pnpm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
echo "NEXT_PUBLIC_WS_URL=ws://localhost:4000" >> .env.local
pnpm run dev

# Then open: http://localhost:3000
```

## ✅ Verify It Works

1. Open http://localhost:3000
2. You should see:
   - Track Library on the left
   - Playlist on the right
   - Connection status showing "Connected"
   - Now Playing bar at the bottom

3. Test real-time sync:
   - Open multiple browser windows/tabs
   - Add a track in one window
   - See it appear in other windows within ~1 second

4. Test drag-and-drop:
   - Drag a playlist item to reorder
   - Position should update smoothly

5. Test voting:
   - Click upvote/downvote buttons
   - Vote count updates in real-time

## 🧪 Run Tests

```bash
cd backend
pnpm test
```

## 📝 Features to Try

- **Add Track**: Click "Add" button on any track in the library
- **Reorder**: Drag playlist items up/down
- **Vote**: Use upvote/downvote arrows
- **Play**: Click play button to mark track as "Now Playing"
- **Remove**: Hover over playlist item, click X button
- **Search**: Type in the search box in Track Library
- **Filter**: Select genre from dropdown

## 🐛 Troubleshooting

**Backend won't start:**
- Check if port 4000 is available
- Ensure database file is writable
- Run `pnpm run db:migrate` again

**Frontend won't connect:**
- Ensure backend is running first
- Check `.env.local` has correct URLs
- Check browser console for errors

**No real-time updates:**
- Check connection status indicator (should be green)
- Open browser DevTools → Network → WS to see WebSocket connection
- Check backend console for WebSocket logs

