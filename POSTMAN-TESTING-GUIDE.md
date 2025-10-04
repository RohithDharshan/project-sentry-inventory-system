# 🚀 Project Sentry - Postman Testing Guide

## 📋 Complete Step-by-Step Instructions

### Step 1: Setup Postman

1. **Download and Install Postman**
   - Go to https://www.postman.com/downloads/
   - Download Postman for your operating system
   - Install and launch Postman

2. **Import the Collection**
   - Open Postman
   - Click "Import" button (top left)
   - Choose "Upload Files"
   - Select `Project-Sentry-Postman-Collection.json` from your project folder
   - Click "Import"

### Step 2: Start Your Server

Before testing, make sure your Project Sentry server is running:

```bash
# Navigate to your project directory
cd "/Volumes/MRD/mac/one credit/assignment"

# Start the server
npm start
```

**Wait for this message:**
```
🚀 Project Sentry server running on port 3000
```

### Step 3: Test Basic Endpoints

#### 3.1 Health Check
- **Collection:** `Health & Status` → `Health Check`
- **Method:** GET
- **URL:** `http://localhost:3000/health`
- **Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-04T03:37:18.717Z",
  "service": "Project Sentry - Inventory Replenishment System",
  "version": "1.0.0",
  "environment": "development",
  "database": {
    "mongodb": "Connected",
    "uri": "mongodb+srv://***:***@..."
  }
}
```

#### 3.2 Get All Inventory
- **Collection:** `Inventory Management` → `Get All Inventory`
- **Method:** GET
- **URL:** `http://localhost:3000/api/v1/inventory`
- **Expected Response:**
```json
{
  "success": true,
  "count": 18,
  "data": [
    {
      "store_id": "STORE-NYC-001",
      "product_id": "PROD-JEANS-001",
      "product_name": "Slim Fit Jeans",
      "current_stock": 30,
      "reorder_threshold": 11,
      "unit_cost": 45.99
    }
  ]
}
```

### Step 4: Test 4-Stage Replenishment Workflow

**🔄 This is the core feature - test these in sequence:**

#### Stage 1: Create Low Stock Alert
- **Collection:** `4-Stage Replenishment Workflow` → `Stage 1: Create Low Stock Alert`
- **Method:** POST
- **URL:** `http://localhost:3000/api/v1/replenishment/alerts`
- **Body (JSON):** *(Use this fresh data for clean demo recording)*
```json
{
  "store_id": "STORE-NYC-001",
  "product_id": "PROD-SNEAKERS-001",
  "product_name": "Canvas Sneakers",
  "current_stock": 3,
  "reorder_threshold": 15,
  "requested_quantity": 25
}
```
- **Expected Response:**
```json
{
  "success": true,
  "message": "Low stock alert created successfully",
  "data": {
    "replenishment_id": "REP-1759548840321-7QWLM0",
    "status": "ALERT_RAISED",
    "store_id": "STORE-NYC-001",
    "product_name": "Slim Fit Jeans"
  },
  "stage": "Stage 1: Low-Stock Alert",
  "next_stage": "Stage 2: Transfer Order Creation"
}
```

**📝 Important:** Copy the `replenishment_id` from the response!

#### Stage 2: Create Transfer Order
- **Collection:** `4-Stage Replenishment Workflow` → `Stage 2: Create Transfer Order`
- **Method:** POST
- **URL:** `http://localhost:3000/api/v1/replenishment/transfer-orders`
- **Body (JSON):**
```json
{
  "replenishment_id": "[COPY_FROM_STAGE_1_RESPONSE]",
  "warehouse_id": "WH-EAST-001"
}
```
**Note:** Replace `[COPY_FROM_STAGE_1_RESPONSE]` with the actual ID from Stage 1

#### Stage 3: Create Shipment
- **Collection:** `4-Stage Replenishment Workflow` → `Stage 3: Create Shipment`
- **Method:** POST
- **URL:** `http://localhost:3000/api/v1/replenishment/shipments`
- **Body (JSON):**
```json
{
  "replenishment_id": "[COPY_FROM_STAGE_1_RESPONSE]",
  "carrier": "FedEx",
  "estimated_delivery_days": 3
}
```

#### Stage 4: Confirm Delivery
- **Collection:** `4-Stage Replenishment Workflow` → `Stage 4: Confirm Delivery`
- **Method:** POST
- **URL:** `http://localhost:3000/api/v1/replenishment/deliveries`
- **Body (JSON):**
```json
{
  "replenishment_id": "[COPY_FROM_STAGE_1_RESPONSE]",
  "received_quantity": 25
}
```

### Step 5: Advanced Testing

#### 5.1 Filter Inventory
- **Low Stock Items:** `GET /api/v1/inventory?low_stock=true`
- **Store Specific:** `GET /api/v1/inventory?store_id=STORE-NYC-001`
- **Product Specific:** `GET /api/v1/inventory?product_id=PROD-JEANS-001`

#### 5.2 Test Different Stores
Use different store IDs in your requests:
- `STORE-NYC-001` (Manhattan)
- `STORE-LA-001` (Beverly Hills)
- `STORE-CHI-001` (Downtown)

#### 5.3 Test Error Handling
- **Collection:** `Sample Test Data` → `Error Testing` → `Invalid Request - Missing Fields`
- This should return a 400 error with validation messages

### Step 6: Monitor Requests

**Enable Enhanced Logging:**
1. Check your terminal where the server is running
2. You'll see detailed logs like:
```
🔵 INCOMING REQUEST {
  "method": "POST",
  "url": "/api/v1/replenishment/alerts",
  "body": {
    "store_id": "STORE-NYC-001",
    "product_name": "Slim Fit Jeans"
  }
}

🟢 REQUEST COMPLETED {
  "statusCode": 201,
  "duration": "4ms",
  "responseBody": {...}
}
```

### Step 7: Postman Features to Use

#### 7.1 Environment Variables
The collection uses variables:
- `{{baseUrl}}` = `http://localhost:3000`
- `{{replenishment_id}}` = Automatically set from Stage 1 response

#### 7.2 Test Scripts
Each request has test scripts that:
- Verify response status codes
- Check required fields in responses
- Automatically extract and save the replenishment_id

#### 7.3 Collection Runner
1. Click "Runner" in Postman
2. Select "Project Sentry" collection
3. Click "Run Project Sentry" to run all tests automatically

### Step 8: Expected Data Flow

**Complete 4-Stage Workflow Result:**
1. **Stage 1:** Creates replenishment order with status `ALERT_RAISED`
2. **Stage 2:** Updates status to `PENDING_PICKING`, adds transfer order details
3. **Stage 3:** Updates status to `IN_TRANSIT`, adds shipment and tracking info
4. **Stage 4:** Updates status to `COMPLETED`, updates inventory stock levels

### 🚨 Troubleshooting

**Server Not Responding:**
```bash
# Check if server is running
curl http://localhost:3000/health

# Restart server if needed
npm start
```

**MongoDB Connection Issues:**
- Server will run in demo mode if MongoDB is not connected
- All endpoints will still work and return mock data
- Look for "Demo mode" in response messages

**Port Already in Use:**
```bash
# Kill existing server
pkill -f "node src/server.js"
# Then restart
npm start
```

### 📊 Success Indicators

**✅ Working Correctly When You See:**
- Status codes: 200 (GET), 201 (POST)
- `"success": true` in all responses
- Unique IDs generated (REP-, TO-, SHP- prefixes)
- Status progression through workflow stages
- Detailed request/response logging in terminal

**🎉 Congratulations!** You've successfully tested the complete Project Sentry inventory replenishment system using Postman!