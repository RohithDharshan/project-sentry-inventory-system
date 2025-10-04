# Project Sentry - Automated Inventory Replenishment System

An automated backend platform for UrbanStyle Apparel's inventory replenishment workflow, featuring a 4-stage lifecycle management system with REST APIs, MongoDB persistence, and Kafka event streaming.

## System Architecture

### 4-Stage Replenishment Workflow

1. **Stage 1: Low-Stock Alert** 
   - POS system detects stock below reorder threshold
   - Generates unique `replenishment_id`
   - Triggers `sentry.low-stock-alert` Kafka event

2. **Stage 2: Transfer Order Creation** 
   - Creates stock transfer order from central warehouse
   - Validates warehouse inventory availability
   - Updates status to `PENDING_PICKING`
   - Triggers `sentry.transfer-order-created` event

3. **Stage 3: Shipment from Warehouse** 
   - Warehouse operator picks and packs items
   - Generates tracking number and shipment ID
   - Updates status to `IN_TRANSIT`
   - Triggers `sentry.shipment-dispatched` event

4. **Stage 4: Stock Received at Store** 
   - Store employee confirms receipt
   - Updates inventory levels automatically
   - Status changes to `COMPLETED`
   - Triggers `sentry.stock-received` event

### Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Message Queue**: Apache Kafka for event streaming
- **Validation**: Joi for request validation
- **Logging**: Winston for comprehensive logging
- **Security**: Helmet, CORS, Rate limiting

## 📁 Project Structure

```
project-sentry/
├── src/
│   ├── server.js                 # Main application entry point
│   ├── config/
│   │   └── database.js          # MongoDB connection configuration
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handling
│   │   └── requestLogger.js     # Request logging middleware
│   ├── models/
│   │   ├── index.js            # Inventory, Store, Warehouse models
│   │   └── ReplenishmentOrder.js # Main replenishment order model
│   ├── routes/
│   │   ├── replenishment.js    # Replenishment workflow endpoints
│   │   └── inventory.js        # Inventory management endpoints
│   ├── services/
│   │   ├── kafkaService.js     # Kafka producer/consumer service
│   │   └── replenishmentService.js # Business logic service
│   └── utils/
│       └── logger.js           # Winston logging configuration
├── .env.example                # Environment variables template
├── package.json               # Dependencies and scripts
└── README.md                 # This file
```

##  Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Apache Kafka (optional for event streaming)

### Installation

1. **Clone and setup:**
   ```bash
   cd assignment
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server:**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

4. **Verify installation:**
   ```bash
   curl http://localhost:3000/health
   ```

##  API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Health Check
```http
GET /health
```

### Replenishment Workflow Endpoints

#### Stage 1: Create Low-Stock Alert
```http
POST /api/v1/replenishment/alerts
Content-Type: application/json

{
  "store_id": "STORE-NYC-001",
  "product_id": "PROD-JEANS-001",
  "product_name": "Slim Fit Jeans",
  "current_stock": 5,
  "reorder_threshold": 10,
  "requested_quantity": 25
}
```

**Response:**
```json
{
  "success": true,
  "message": "Low stock alert created successfully",
  "data": {
    "replenishment_id": "REP-1696248000000-ABC12345",
    "status": "ALERT_RAISED",
    "store_id": "STORE-NYC-001",
    "product_id": "PROD-JEANS-001",
    "product_name": "Slim Fit Jeans",
    "current_stock": 5,
    "requested_quantity": 25,
    "alert_triggered_at": "2023-10-02T15:30:00.000Z"
  },
  "stage": "Stage 1: Low-Stock Alert",
  "next_stage": "Stage 2: Transfer Order Creation"
}
```

#### Stage 2: Create Transfer Order
```http
POST /api/v1/replenishment/transfer-orders
Content-Type: application/json

{
  "replenishment_id": "REP-1696248000000-ABC12345",
  "warehouse_id": "WH-CENTRAL-001"
}
```

#### Stage 3: Create Shipment
```http
POST /api/v1/replenishment/shipments
Content-Type: application/json

{
  "replenishment_id": "REP-1696248000000-ABC12345",
  "carrier": "UPS",
  "estimated_delivery_days": 2
}
```

#### Stage 4: Confirm Delivery
```http
POST /api/v1/replenishment/deliveries
Content-Type: application/json

{
  "replenishment_id": "REP-1696248000000-ABC12345",
  "received_quantity": 25,
  "received_by": "John Smith"
}
```

### Query Endpoints

#### Get Replenishment Order
```http
GET /api/v1/replenishment/orders/{replenishment_id}
```

#### Get Orders by Store
```http
GET /api/v1/replenishment/stores/{store_id}/orders?status=IN_TRANSIT
```

#### Get Active Orders
```http
GET /api/v1/replenishment/active-orders
```

#### Get Order History
```http
GET /api/v1/replenishment/orders/{replenishment_id}/history
```

### Inventory Management Endpoints

#### Get Low Stock Items
```http
GET /api/v1/inventory/low-stock?store_id=STORE-NYC-001
```

#### Update Stock Level
```http
PUT /api/v1/inventory/stores/{store_id}/products/{product_id}/stock
Content-Type: application/json

{
  "quantity": 50,
  "operation": "add"
}
```

##  Database Schema

### ReplenishmentOrder Document
```javascript
{
  // Stage 1: Low-Stock Alert
  replenishment_id: "REP-1696248000000-ABC12345",
  store_id: "STORE-NYC-001",
  product_id: "PROD-JEANS-001",
  product_name: "Slim Fit Jeans",
  current_stock: 5,
  reorder_threshold: 10,
  requested_quantity: 25,
  status: "ALERT_RAISED",
  
  // Stage 2: Transfer Order
  transfer_order_id: "TO-1696248300000-XYZ789",
  warehouse_id: "WH-CENTRAL-001",
  
  // Stage 3: Shipment
  shipment_id: "SHP-1696248600000-DEF456",
  tracking_number: "1Z12345E1234567890",
  
  // Stage 4: Delivery
  received_quantity: 25,
  new_stock_level: 30,
  
  // Audit Trail
  status_history: [...],
  created_at: "2023-10-02T15:30:00.000Z",
  updated_at: "2023-10-02T16:45:00.000Z"
}
```

##  Kafka Event Flow

### Event Topics
- `sentry.low-stock-alert`
- `sentry.transfer-order-created`
- `sentry.shipment-dispatched`
- `sentry.stock-received`

### Event Payload Example
```json
{
  "replenishment_id": "REP-1696248000000-ABC12345",
  "store_id": "STORE-NYC-001",
  "product_id": "PROD-JEANS-001",
  "stage": "LOW_STOCK_ALERT",
  "timestamp": "2023-10-02T15:30:00.000Z",
  "source": "project-sentry"
}
```

##  Development

### Available Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run test:watch # Run tests in watch mode
```

### Environment Variables
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/project-sentry
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=project-sentry
LOG_LEVEL=info
```

### API Testing with curl

Complete workflow example:
```bash
# Stage 1: Create low stock alert
curl -X POST http://localhost:3000/api/v1/replenishment/alerts \
  -H "Content-Type: application/json" \
  -d '{"store_id":"STORE-NYC-001","product_id":"PROD-JEANS-001","product_name":"Slim Fit Jeans","current_stock":5,"reorder_threshold":10,"requested_quantity":25}'

# Stage 2: Create transfer order (use replenishment_id from above)
curl -X POST http://localhost:3000/api/v1/replenishment/transfer-orders \
  -H "Content-Type: application/json" \
  -d '{"replenishment_id":"REP-1696248000000-ABC12345"}'

# Stage 3: Create shipment
curl -X POST http://localhost:3000/api/v1/replenishment/shipments \
  -H "Content-Type: application/json" \
  -d '{"replenishment_id":"REP-1696248000000-ABC12345","carrier":"UPS"}'

# Stage 4: Confirm delivery
curl -X POST http://localhost:3000/api/v1/replenishment/deliveries \
  -H "Content-Type: application/json" \
  -d '{"replenishment_id":"REP-1696248000000-ABC12345","received_quantity":25}'
```

##  Key Features

 **Digital Thread Maintenance**: Single source of truth for each replenishment order  
 **Unique ID Generation**: System-generated identifiers for all major artifacts  
 **State Machine Implementation**: Proper status transitions with validation  
 **Event-Driven Architecture**: Kafka integration for stage orchestration  
 **Comprehensive Logging**: Winston-based logging with multiple levels  
 **Input Validation**: Joi schema validation for all endpoints  
 **Error Handling**: Global error handling with detailed responses  
 **Database Indexing**: Optimized MongoDB queries with proper indexing  
 **API Documentation**: RESTful design with clear endpoint structure  

##  System Monitoring

### Health Endpoints
- `GET /health` - Database connectivity and system status
- `GET /` - Service information and endpoint discovery

### Logging
- All requests logged with timestamps
- MongoDB operations tracked
- Kafka event publishing monitored
- Error tracking with stack traces

##  Deployment Ready

The system is fully operational and ready for:
- Production deployment
- Load testing and performance optimization
- Integration with external POS systems
- Monitoring and alerting setup
- Additional feature development

---

**Project Sentry** - Automating inventory replenishment for UrbanStyle Apparel 🎯
