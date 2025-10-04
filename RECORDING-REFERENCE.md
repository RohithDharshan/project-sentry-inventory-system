# 🎬 Quick Recording Reference

## 📱 **URLs to Keep Open**
- **Server Health**: http://localhost:3000/health
- **MongoDB Atlas**: https://cloud.mongodb.com/
- **Postman**: Project Sentry collection

## 🎯 **Fresh Demo Data (Use These in Recording)**

### **Stage 1: Low Stock Alert**
```json
{
  "store_id": "STORE-LA-001",
  "product_id": "PROD-HOODIE-001", 
  "product_name": "Pullover Hoodie",
  "current_stock": 4,
  "reorder_threshold": 12,
  "requested_quantity": 30
}
```

### **Stage 2: Transfer Order**
```json
{
  "replenishment_id": "[FROM_STAGE_1_RESPONSE]",
  "warehouse_id": "WH-EAST-001"
}
```

### **Stage 3: Shipment**
```json
{
  "replenishment_id": "[FROM_STAGE_1_RESPONSE]",
  "carrier": "FedEx",
  "estimated_delivery_days": 3
}
```

### **Stage 4: Delivery**
```json
{
  "replenishment_id": "[FROM_STAGE_1_RESPONSE]",
  "received_quantity": 30
}
```

## 🔍 **MongoDB Collections to Show**
1. **replenishmentorders** - Main workflow document
2. **inventories** - Store stock levels  
3. **warehouseinventories** - Warehouse stock
4. **stores** - Store information

## 📊 **Key Points to Highlight**
- ✅ Real MongoDB data persistence
- ✅ Unique ID generation
- ✅ Status progression through workflow
- ✅ Stock level updates
- ✅ Complete audit trail

## 🎬 **Recording Flow**
1. **Setup** → Run `./setup-demo.sh`
2. **Overview** → Show project structure
3. **MongoDB** → Show initial state
4. **Postman** → Execute 4-stage workflow
5. **MongoDB** → Show data updates after each stage
6. **Conclusion** → Final system state

## ⚡ **Quick Commands**
```bash
# Check server
curl http://localhost:3000/health

# Get inventory  
curl http://localhost:3000/api/v1/inventory

# View logs
tail -10 server.log

# Restart if needed
./setup-demo.sh
```

## 🎯 **Timeline (6-7 minutes total)**
- **Intro**: 30s
- **Architecture**: 45s  
- **MongoDB Initial**: 30s
- **4-Stage Demo**: 3m (45s each)
- **Additional APIs**: 1m
- **Logs Review**: 45s
- **Final MongoDB**: 45s
- **Conclusion**: 30s

## 💡 **Pro Tips**
- Keep MongoDB Atlas tab pinned
- Zoom Postman to 125%
- Use large terminal fonts
- Highlight cursor movements
- Practice transitions
- Have backup curl commands ready