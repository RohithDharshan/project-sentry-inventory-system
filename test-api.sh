#!/bin/bash

echo "🚀 Testing Project Sentry API endpoints..."
echo ""

# Check if server is running
echo "1. Testing health endpoint..."
curl -s http://localhost:3000/health | jq '.' || echo "❌ Health check failed - is the server running?"
echo ""

# Test Stage 1: Low Stock Alert
echo "2. Testing Stage 1: Low Stock Alert..."
curl -s -X POST http://localhost:3000/api/v1/replenishment/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "STORE-NYC-001",
    "product_id": "PROD-JEANS-001", 
    "product_name": "Slim Fit Jeans",
    "current_stock": 5,
    "reorder_threshold": 10,
    "requested_quantity": 25
  }' | jq '.' || echo "❌ Stage 1 test failed"
echo ""

# Test root endpoint
echo "3. Testing root endpoint..."
curl -s http://localhost:3000/ | jq '.' || echo "❌ Root endpoint test failed"
echo ""

echo "✅ API testing complete!"