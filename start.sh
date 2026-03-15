#!/bin/bash
set -e

echo "🚀 Starting Management Software services..."

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Trap SIGTERM and SIGINT
trap cleanup SIGTERM SIGINT

# Run database migrations
echo "📦 Running database migrations..."
cd /app/apps/backend
npx prisma migrate deploy || echo "⚠️  Migration warning (might be initial setup)"
cd /app

# Start backend service in background
echo "🔧 Starting backend service on port 3001..."
cd /app/apps/backend
node dist/main.js &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# Start frontend service in foreground
echo "🎨 Starting frontend service on port 3000..."
cd /app/apps/web
exec node_modules/.bin/next start -p 3000 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
