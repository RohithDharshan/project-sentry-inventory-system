#!/bin/bash

# 🎬 Project Sentry Demo Setup Script
echo "🚀 Setting up Project Sentry Demo Environment..."

# 1. Ensure server is running
echo "📡 Checking server status..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Server is running"
else
    echo "🔴 Server not running - starting server..."
    nohup npm start > server.log 2>&1 &
    sleep 5
    echo "✅ Server started"
fi

# 2. Check MongoDB connection
echo "🗄️  Checking MongoDB connection..."
MONGO_STATUS=$(curl -s http://localhost:3000/health | jq -r '.database.mongodb')
if [ "$MONGO_STATUS" = "Connected" ]; then
    echo "✅ MongoDB connected"
else
    echo "🔴 MongoDB not connected - please check connection"
fi

# 3. Show current system status
echo ""
echo "📊 CURRENT SYSTEM STATUS:"
echo "========================="
curl -s http://localhost:3000/health | jq .

# 4. Show sample inventory data
echo ""
echo "📦 SAMPLE INVENTORY DATA:"
echo "========================="
curl -s http://localhost:3000/api/v1/inventory | jq '.data[0:2]'

# 5. Create demo test data for recording
echo ""
echo "🎯 CREATING DEMO TEST DATA..."
echo "=============================="

# Stage 1: Create Low Stock Alert
echo "🚨 Creating Stage 1: Low Stock Alert..."
STAGE1_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/replenishment/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "STORE-NYC-001",
    "product_id": "PROD-SNEAKERS-001",
    "product_name": "Canvas Sneakers",
    "current_stock": 3,
    "reorder_threshold": 15,
    "requested_quantity": 20
  }')

REPLENISHMENT_ID=$(echo $STAGE1_RESPONSE | jq -r '.data.replenishment_id')
echo "✅ Stage 1 Complete - Replenishment ID: $REPLENISHMENT_ID"

# Wait a moment
sleep 2

# Stage 2: Create Transfer Order
echo "📦 Creating Stage 2: Transfer Order..."
STAGE2_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/replenishment/transfer-orders \
  -H "Content-Type: application/json" \
  -d "{
    \"replenishment_id\": \"$REPLENISHMENT_ID\",
    \"warehouse_id\": \"WH-CENTRAL-001\"
  }")

TRANSFER_ORDER_ID=$(echo $STAGE2_RESPONSE | jq -r '.data.transfer_order_id')
echo "✅ Stage 2 Complete - Transfer Order ID: $TRANSFER_ORDER_ID"

# Wait a moment
sleep 2

# Stage 3: Create Shipment
echo "🚚 Creating Stage 3: Shipment..."
STAGE3_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/replenishment/shipments \
  -H "Content-Type: application/json" \
  -d "{
    \"replenishment_id\": \"$REPLENISHMENT_ID\",
    \"carrier\": \"UPS\",
    \"estimated_delivery_days\": 2
  }")

SHIPMENT_ID=$(echo $STAGE3_RESPONSE | jq -r '.data.shipment_id')
echo "✅ Stage 3 Complete - Shipment ID: $SHIPMENT_ID"

# Wait a moment
sleep 2

# Stage 4: Confirm Delivery
echo "✅ Creating Stage 4: Delivery Confirmation..."
STAGE4_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/replenishment/deliveries \
  -H "Content-Type: application/json" \
  -d "{
    \"replenishment_id\": \"$REPLENISHMENT_ID\",
    \"received_quantity\": 20
  }")

echo "✅ Stage 4 Complete - Workflow Finished!"

echo ""
echo "🎉 DEMO SETUP COMPLETE!"
echo "======================="
echo "📝 Replenishment ID for demo: $REPLENISHMENT_ID"
echo "🌐 MongoDB Atlas: Check 'replenishmentorders' collection"
echo "📡 Server: http://localhost:3000"
echo "🔍 Health: http://localhost:3000/health"
echo ""
echo "🎬 READY FOR VIDEO RECORDING!"
echo ""
echo "📋 POSTMAN TEST DATA FOR FRESH DEMO:"
echo "===================================="
echo "Use these values in your Postman requests:"
echo ""
echo "🚨 Stage 1 - Low Stock Alert:"
echo '{"store_id":"STORE-LA-001","product_id":"PROD-HOODIE-001","product_name":"Pullover Hoodie","current_stock":4,"reorder_threshold":12,"requested_quantity":30}'
echo ""
echo "📦 Stage 2 - Transfer Order:"
echo '{"warehouse_id":"WH-EAST-001"}'
echo ""
echo "🚚 Stage 3 - Shipment:"
echo '{"carrier":"FedEx","estimated_delivery_days":3}'
echo ""
echo "✅ Stage 4 - Delivery:"
echo '{"received_quantity":30}'
echo ""
echo "🎯 Ready to record! Follow the DEMO-VIDEO-SCRIPT.md guide."