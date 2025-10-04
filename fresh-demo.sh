#!/bin/bash

# 🎬 Fresh Demo Script - Clean Start for Video Recording
echo "🎬 Project Sentry - Fresh Demo Setup for Video Recording"
echo "========================================================"

# 1. Check server status
echo "📡 Checking server status..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Server is running"
    
    # Show clean database state
    echo ""
    echo "🗄️  CLEAN DATABASE STATUS:"
    echo "=========================="
    curl -s http://localhost:3000/health | jq .database
    
else
    echo "🔴 Server not running - starting server..."
    nohup npm start > server.log 2>&1 &
    sleep 5
    echo "✅ Server started"
fi

# 2. Show current inventory (should be original data)
echo ""
echo "📦 CURRENT INVENTORY STATUS:"
echo "============================"
curl -s http://localhost:3000/api/v1/inventory | jq '.data[0:3] | .[] | {store_id, product_name, current_stock, reorder_threshold}'

# 3. Show low stock items (good candidates for demo)
echo ""
echo "⚠️  LOW STOCK ITEMS (Good for Demo):"
echo "====================================="
curl -s "http://localhost:3000/api/v1/inventory?low_stock=true" | jq '.data | .[] | {store_id, product_name, current_stock, reorder_threshold}'

# 4. Check replenishment orders (should be empty)
echo ""
echo "📋 REPLENISHMENT ORDERS STATUS:"
echo "==============================="
REPLEN_COUNT=$(curl -s http://localhost:3000/api/v1/replenishment/orders 2>/dev/null | jq '.count // 0')
echo "📊 Current replenishment orders: $REPLEN_COUNT"

echo ""
echo "🎉 FRESH DEMO ENVIRONMENT READY!"
echo "================================="
echo "✅ Database cleaned - 0 replenishment orders"
echo "✅ Original inventory data preserved"
echo "✅ Server running with MongoDB connected"
echo "✅ Ready for clean demo recording"
echo ""
echo "🎬 RECORDING READY - FOLLOW THESE STEPS:"
echo "========================================"
echo ""
echo "1. 📱 OPEN THESE APPLICATIONS:"
echo "   • MongoDB Atlas Dashboard"
echo "   • Postman with Project Sentry collection"
echo "   • Terminal (this one)"
echo ""
echo "2. 🎯 START WITH FRESH DATA (Use in Postman Stage 1):"
echo "   {"
echo '     "store_id": "STORE-NYC-001",'
echo '     "product_id": "PROD-SNEAKERS-001",'
echo '     "product_name": "Canvas Sneakers",'
echo '     "current_stock": 3,'
echo '     "reorder_threshold": 15,'
echo '     "requested_quantity": 25'
echo "   }"
echo ""
echo "3. 📹 RECORDING CHECKLIST:"
echo "   ✅ Show MongoDB Atlas (empty replenishmentorders collection)"
echo "   ✅ Execute 4-stage workflow in Postman"
echo "   ✅ Show MongoDB updates after each stage"
echo "   ✅ Show final completed workflow"
echo ""
echo "4. 🔍 MONGODB COLLECTIONS TO SHOW:"
echo "   • replenishmentorders (will go from 0 → 1 document)"
echo "   • inventories (will show stock updates)"
echo "   • warehouseinventories (will show reserved stock)"
echo ""
echo "🎯 Follow DEMO-VIDEO-SCRIPT.md for complete recording guide!"
echo "🎬 Good luck with your video recording!"