# 🎬 Project Sentry Demo Video Script

## 📋 Complete Demo Recording Guide

### 🎯 **Demo Objective:**
Show the complete Project Sentry inventory replenishment system working end-to-end with real MongoDB data persistence and reflection.

---

## 🚀 **PREPARATION (Before Recording)**

### **1. Setup Requirements:**
- MongoDB Atlas dashboard open in browser
- Postman with Project Sentry collection imported
- Terminal with Project Sentry server running
- VS Code with project open (optional)

### **2. Pre-Recording Checklist:**
```bash
# Ensure server is running
curl http://localhost:3000/health

# Clear any old test data (optional)
# node populate-atlas.js  # Re-populate if needed
```

---

## 🎥 **VIDEO RECORDING SCRIPT**

### **INTRO (30 seconds)**
**[Show screen]**
> "Hello! Today I'm demonstrating Project Sentry - an automated inventory replenishment system built with Node.js, MongoDB, and REST APIs. This system manages a complete 4-stage workflow for inventory replenishment with real-time data persistence."

**[Show project structure in VS Code]**
- Show `src/` folder structure
- Show `README.md` briefly
- Show `.env` file (blur credentials)

---

### **PART 1: System Architecture Overview (45 seconds)**

**[Screen: Project overview + Terminal]**
> "Project Sentry consists of:
> - Node.js Express server with REST APIs
> - MongoDB Atlas for data persistence
> - 4-stage replenishment workflow
> - Real-time inventory management"

**[Terminal - Show server status]**
```bash
curl -s http://localhost:3000/health | jq .
```

**[Narration while showing health response]**
> "As we can see, MongoDB is connected and the system is ready. The health endpoint shows our database connection is active."

---

### **PART 2: MongoDB Atlas - Initial State (30 seconds)**

**[Screen: MongoDB Atlas Dashboard]**
1. **Login to MongoDB Atlas**
2. **Navigate to your project-sentry database**
3. **Show Collections:**
   - `inventories` - Show current inventory data
   - `replenishmentorders` - Show existing orders
   - `stores` - Show store information
   - `warehouses` - Show warehouse data

**[Narration]**
> "Here's our MongoDB Atlas database with pre-populated data. We have inventory items, stores, warehouses, and some existing replenishment orders. Let's now create a new replenishment workflow and watch the data flow."

---

### **PART 3: Postman API Testing - 4-Stage Workflow (3 minutes)**

**[Screen: Postman with Project Sentry collection]**

#### **Stage 1: Create Low Stock Alert (45 seconds)**
**[Postman: Stage 1 - Create Low Stock Alert]**

1. **Show the request body:**
```json
{
  "store_id": "STORE-NYC-001",
  "product_id": "PROD-JEANS-001",
  "product_name": "Slim Fit Jeans",
  "current_stock": 5,
  "reorder_threshold": 10,
  "requested_quantity": 25
}
```

2. **Send the request**
3. **Show the response:**
```json
{
  "success": true,
  "message": "Low stock alert created successfully",
  "data": {
    "replenishment_id": "REP-1759554439842-5389B898",
    "status": "ALERT_RAISED",
    "store_id": "STORE-NYC-001",
    "product_name": "Slim Fit Jeans"
  },
  "stage": "Stage 1: Low-Stock Alert",
  "next_stage": "Stage 2: Transfer Order Creation"
}
```

**[Narration]**
> "Stage 1 complete! We've created a low stock alert for Slim Fit Jeans. Note the unique replenishment ID generated. Now let's check MongoDB to see this data."

**[Switch to MongoDB Atlas]**
- **Refresh the `replenishmentorders` collection**
- **Show the new document with the replenishment_id**
- **Point out the status: "ALERT_RAISED"**

---

#### **Stage 2: Create Transfer Order (45 seconds)**
**[Back to Postman: Stage 2 - Create Transfer Order]**

1. **Show the request uses the replenishment_id from Stage 1:**
```json
{
  "replenishment_id": "REP-1759554439842-5389B898",
  "warehouse_id": "WH-CENTRAL-001"
}
```

2. **Send the request**
3. **Show the response with transfer_order_id**

**[Narration]**
> "Stage 2 creates a transfer order from our central warehouse. The system automatically calculates quantities and reserves warehouse stock."

**[Switch to MongoDB Atlas]**
- **Refresh the `replenishmentorders` collection**
- **Show the updated document**
- **Point out the new fields: transfer_order_id, status: "PENDING_PICKING"**
- **Show `warehouseinventories` collection - point out reserved stock**

---

#### **Stage 3: Create Shipment (45 seconds)**
**[Back to Postman: Stage 3 - Create Shipment]**

1. **Show the request:**
```json
{
  "replenishment_id": "REP-1759554439842-5389B898",
  "carrier": "FedEx",
  "estimated_delivery_days": 3
}
```

2. **Send the request**
3. **Show response with shipment_id and tracking_number**

**[Narration]**
> "Stage 3 dispatches the shipment with tracking information. The system generates a tracking number and calculates delivery date."

**[Switch to MongoDB Atlas]**
- **Refresh and show updated document**
- **Point out: shipment_id, tracking_number, status: "IN_TRANSIT"**

---

#### **Stage 4: Confirm Delivery (45 seconds)**
**[Back to Postman: Stage 4 - Confirm Delivery]**

1. **Show the request:**
```json
{
  "replenishment_id": "REP-1759554439842-5389B898",
  "received_quantity": 25
}
```

2. **Send the request**
3. **Show final response with completed status**

**[Narration]**
> "Stage 4 completes the workflow. The system updates store inventory and marks the replenishment as completed."

**[Switch to MongoDB Atlas]**
- **Show final document status: "COMPLETED"**
- **Show `inventories` collection - point out updated stock levels**
- **Show received_at timestamp and new_stock_level**

---

### **PART 4: Additional API Demonstrations (1 minute)**

#### **Get All Inventory (20 seconds)**
**[Postman: Get All Inventory]**
- Send GET request to `/api/v1/inventory`
- Show real inventory data returned

**[Narration]**
> "The inventory endpoint shows all current stock levels across stores, including our updated inventory from the completed replenishment."

#### **Get Store-Specific Inventory (20 seconds)**
**[Postman: Get Store Inventory]**
- Send GET request to `/api/v1/inventory?store_id=STORE-NYC-001`
- Show filtered results

#### **Get Low Stock Items (20 seconds)**
**[Postman: Filter Low Stock]**
- Send GET request to `/api/v1/inventory?low_stock=true`
- Show items below reorder threshold

---

### **PART 5: System Monitoring & Logs (45 seconds)**

**[Screen: Terminal with server logs]**
**[Narration]**
> "Throughout this process, our system has been logging all operations in real-time."

**[Show terminal with logs]**
```bash
tail -20 server.log
```

- **Point out MongoDB operations**
- **Show request/response logging**
- **Highlight the workflow progression**

---

### **PART 6: MongoDB Atlas Final Review (45 seconds)**

**[Screen: MongoDB Atlas Dashboard]**
**[Narration]**
> "Let's do a final review of our MongoDB database to see the complete data story."

1. **Show `replenishmentorders` collection:**
   - Point out the complete workflow document
   - Highlight all stages captured in one record

2. **Show `inventories` collection:**
   - Show updated stock levels
   - Compare before/after if possible

3. **Show `warehouseinventories` collection:**
   - Show reduced warehouse stock
   - Show reserved stock updated

---

### **CONCLUSION (30 seconds)**

**[Screen: Health check response or project overview]**
**[Narration]**
> "This demonstrates a complete end-to-end inventory replenishment system with:
> - Real-time REST API processing
> - MongoDB data persistence
> - 4-stage workflow automation
> - Complete audit trail
> - Scalable architecture ready for production
> 
> The system successfully handles inventory alerts, transfer orders, shipments, and delivery confirmations with full data traceability."

---

## 📝 **RECORDING TIPS**

### **Technical Setup:**
- **Screen Resolution:** 1920x1080 (Full HD)
- **Recording Software:** OBS Studio, Camtasia, or QuickTime
- **Audio:** Clear microphone, eliminate background noise
- **Cursor:** Use cursor highlighting for better visibility

### **Presentation Tips:**
1. **Speak Clearly:** Moderate pace, clear pronunciation
2. **Smooth Transitions:** Plan transitions between screens
3. **Highlight Important Data:** Circle or point to key information
4. **Keep Moving:** Don't pause too long on any screen
5. **Practice First:** Do a dry run to smooth out timing

### **Screen Management:**
- **Postman:** Zoom to 125% for better visibility
- **MongoDB Atlas:** Use full screen, zoom on collections
- **Terminal:** Large font size (16pt+)
- **Close Unnecessary Apps:** Clean desktop, close notifications

### **Backup Plan:**
- Have curl commands ready if Postman fails
- Keep MongoDB Atlas bookmarks ready
- Have server restart commands ready

---

## 🎯 **EXPECTED TOTAL DURATION: 6-7 minutes**

This script provides a comprehensive demonstration of Project Sentry's capabilities while showing real MongoDB data persistence throughout the workflow. The video will effectively demonstrate both the API functionality and the database reflection of all operations.

Good luck with your recording! 🎬