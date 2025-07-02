#!/bin/bash

# Development script for AI Agent Server

echo "🚀 Starting AI Agent Server in development mode..."

# Kill any existing processes on port 5000
echo "🧹 Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# Wait a moment for cleanup
sleep 1

# Start the server with nodemon
echo "📡 Starting server with nodemon..."
echo "📁 Running: nodemon index.js"
nodemon index.js 