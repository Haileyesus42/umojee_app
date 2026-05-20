#!/bin/bash

# Quick Start Script for Umoja AI Server
# Optimized for fast startup with smaller embedding model

set -e

echo "🚀 Starting Umoja AI Server..."
echo ""

# Check if server is already running
if lsof -i :8000 >/dev/null 2>&1; then
    echo "⚠️  Server already running on port 8000"
    echo ""
    read -p "Kill existing server and restart? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping existing server..."
        pkill -f "uvicorn server.main" || true
        sleep 2
    else
        echo "Exiting..."
        exit 0
    fi
fi

# Set environment variables for fast startup
export EMBEDDING_MODEL=all-MiniLM-L6-v2  # 80MB, fast download
export OMP_NUM_THREADS=1                  # Prevent threading issues
export MKL_NUM_THREADS=1
export OPENBLAS_NUM_THREADS=1

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env with required variables"
    exit 1
fi

echo "✅ Environment configured"
echo "   Model: all-MiniLM-L6-v2 (80MB, fast)"
echo ""

# Start server
echo "Starting server on http://localhost:8000..."
echo ""
echo "📊 Startup time: ~10-15 seconds"
echo "   (First API call may take 10-30 sec to load model)"
echo ""

uvicorn server.main:app --host 0.0.0.0 --port 8000
