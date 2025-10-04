#!/bin/bash

# Project Sentry - API Test Generator
# This script generates various API requests to demonstrate the monitoring system

BASE_URL="http://localhost:3000"
DELAY=2

echo "🧪 Project Sentry - API Test Generator"
echo "====================================="
echo "This script will generate various API requests to test the monitoring system"
echo "Make sure the server is running before executing this script"
echo ""

# Function to make a request and show what we're doing
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo "📡 Testing: $description"
    echo "   → $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        curl -s "$BASE_URL$endpoint" > /dev/null
    else
        curl -s -X "$method" "$BASE_URL$endpoint" \
             -H "Content-Type: application/json" \
             -d "$data" > /dev/null
    fi
    
    sleep $DELAY
}

echo "Starting API test sequence..."
echo ""

# Test 1: Health Check
make_request "GET" "/health" "" "System Health Check"

# Test 2: Get Inventory
make_request "GET" "/api/v1/inventory" "" "Get All Inventory Items"

# Test 3: Get Store Inventory
make_request "GET" "/api/v1/inventory/stores/STORE-NYC-001" "" "Get Store-Specific Inventory"

# Test 4: Get Low Stock Items
make_request "GET" "/api/v1/inventory?low_stock=true" "" "Get Low Stock Items"

# Test 5: Stage 1 - Create Low Stock Alert
echo "🔄 Starting 4-Stage Replenishment Workflow..."
REPLENISHMENT_DATA='{
    "store_id":"STORE-NYC-001",
    "product_id":"PROD-JEANS-001",
    "product_name":"Slim Fit Jeans",
    "current_stock":5,
    "reorder_threshold":10,
    "requested_quantity":25
}'

make_request "POST" "/api/v1/replenishment/alerts" "$REPLENISHMENT_DATA" "Stage 1: Low Stock Alert"

# Get the replenishment ID from the last request (in real monitoring, you'd extract this)
REPLENISHMENT_ID="REP-$(date +%s)-TEST$(openssl rand -hex 3 | tr '[:lower:]' '[:upper:]')"

# Test 6: Stage 2 - Create Transfer Order
TRANSFER_DATA="{\"replenishment_id\":\"$REPLENISHMENT_ID\"}"
make_request "POST" "/api/v1/replenishment/transfer-orders" "$TRANSFER_DATA" "Stage 2: Transfer Order"

# Test 7: Stage 3 - Create Shipment
SHIPMENT_DATA="{\"replenishment_id\":\"$REPLENISHMENT_ID\",\"carrier\":\"FedEx\",\"estimated_delivery_days\":3}"
make_request "POST" "/api/v1/replenishment/shipments" "$SHIPMENT_DATA" "Stage 3: Shipment Creation"

# Test 8: Stage 4 - Confirm Delivery
DELIVERY_DATA="{\"replenishment_id\":\"$REPLENISHMENT_ID\",\"received_quantity\":25}"
make_request "POST" "/api/v1/replenishment/deliveries" "$DELIVERY_DATA" "Stage 4: Delivery Confirmation"

# Test 9: Test Error Handling
echo "🔥 Testing Error Handling..."
make_request "POST" "/api/v1/replenishment/alerts" '{"invalid":"data"}' "Invalid Request (should error)"

echo ""
echo "✅ API test sequence completed!"
echo "Check the monitoring logs to see all the request/response details"