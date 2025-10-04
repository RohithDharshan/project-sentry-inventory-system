#!/usr/bin/env node

/**
 * MongoDB Atlas Data Populator
 * Creates sample data for Project Sentry to view in Atlas dashboard
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ReplenishmentOrder = require('./src/models/ReplenishmentOrder');
const { Inventory, Store, Warehouse, WarehouseInventory } = require('./src/models/index');

// Sample data definitions
const sampleStores = [
  {
    store_id: 'STORE-NYC-001',
    store_name: 'UrbanStyle Manhattan',
    location: 'New York, NY',
    manager: 'Sarah Johnson',
    contact_email: 'sarah.johnson@urbanstyle.com',
    phone: '+1-212-555-0101'
  },
  {
    store_id: 'STORE-LA-001',
    store_name: 'UrbanStyle Beverly Hills',
    location: 'Los Angeles, CA',
    manager: 'Mike Chen',
    contact_email: 'mike.chen@urbanstyle.com',
    phone: '+1-310-555-0201'
  },
  {
    store_id: 'STORE-CHI-001',
    store_name: 'UrbanStyle Downtown',
    location: 'Chicago, IL',
    manager: 'Emma Davis',
    contact_email: 'emma.davis@urbanstyle.com',
    phone: '+1-312-555-0301'
  }
];

const sampleWarehouses = [
  {
    warehouse_id: 'WH-CENTRAL-001',
    warehouse_name: 'Central Distribution Center',
    location: 'Kansas City, MO',
    manager: 'Robert Wilson',
    contact_email: 'robert.wilson@urbanstyle.com',
    capacity: 10000
  },
  {
    warehouse_id: 'WH-EAST-001',
    warehouse_name: 'East Coast Warehouse',
    location: 'Philadelphia, PA',
    manager: 'Lisa Rodriguez',
    contact_email: 'lisa.rodriguez@urbanstyle.com',
    capacity: 7500
  }
];

const sampleProducts = [
  { id: 'PROD-JEANS-001', name: 'Slim Fit Jeans', category: 'Apparel', cost: 45.99 },
  { id: 'PROD-SHIRT-001', name: 'Cotton T-Shirt', category: 'Apparel', cost: 19.99 },
  { id: 'PROD-JACKET-001', name: 'Denim Jacket', category: 'Apparel', cost: 79.99 },
  { id: 'PROD-SNEAKERS-001', name: 'Canvas Sneakers', category: 'Footwear', cost: 59.99 },
  { id: 'PROD-HOODIE-001', name: 'Pullover Hoodie', category: 'Apparel', cost: 49.99 },
  { id: 'PROD-DRESS-001', name: 'Summer Dress', category: 'Apparel', cost: 39.99 }
];

async function connectToMongoDB() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('🔗 Connecting to MongoDB Atlas...');
    console.log(`📍 URI: ${mongoURI.replace(/\/\/[^@]+@/, '//***:***@')}`);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🏠 Host: ${mongoose.connection.host}`);
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function clearExistingData() {
  console.log('\n🧹 Clearing existing data...');
  
  await ReplenishmentOrder.deleteMany({});
  await Inventory.deleteMany({});
  await Store.deleteMany({});
  await Warehouse.deleteMany({});
  await WarehouseInventory.deleteMany({});
  
  console.log('✅ Existing data cleared');
}

async function createStores() {
  console.log('\n🏪 Creating stores...');
  
  for (const storeData of sampleStores) {
    const store = new Store(storeData);
    await store.save();
    console.log(`   ✅ Created store: ${storeData.store_name}`);
  }
}

async function createWarehouses() {
  console.log('\n🏭 Creating warehouses...');
  
  for (const warehouseData of sampleWarehouses) {
    const warehouse = new Warehouse(warehouseData);
    await warehouse.save();
    console.log(`   ✅ Created warehouse: ${warehouseData.warehouse_name}`);
  }
}

async function createInventory() {
  console.log('\n📦 Creating inventory data...');
  
  for (const store of sampleStores) {
    for (const product of sampleProducts) {
      // Create varying stock levels - some low, some normal
      const isLowStock = Math.random() < 0.3; // 30% chance of low stock
      const reorderThreshold = 10 + Math.floor(Math.random() * 20); // 10-30
      const currentStock = isLowStock 
        ? Math.floor(Math.random() * reorderThreshold) // Below threshold
        : reorderThreshold + Math.floor(Math.random() * 50); // Above threshold
      
      const inventory = new Inventory({
        store_id: store.store_id,
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        current_stock: currentStock,
        reorder_threshold: reorderThreshold,
        max_stock_level: reorderThreshold + 50 + Math.floor(Math.random() * 50),
        unit_cost: product.cost,
        last_updated: new Date()
      });
      
      await inventory.save();
      
      const stockStatus = currentStock <= reorderThreshold ? '⚠️ LOW' : '✅ OK';
      console.log(`   📦 ${store.store_id}: ${product.name} - Stock: ${currentStock}/${reorderThreshold} ${stockStatus}`);
    }
  }
}

async function createWarehouseInventory() {
  console.log('\n🏭 Creating warehouse inventory...');
  
  for (const warehouse of sampleWarehouses) {
    for (const product of sampleProducts) {
      const warehouseInventory = new WarehouseInventory({
        warehouse_id: warehouse.warehouse_id,
        product_id: product.id,
        product_name: product.name,
        available_stock: 100 + Math.floor(Math.random() * 500), // 100-600 units
        reserved_stock: Math.floor(Math.random() * 50), // 0-50 reserved
        unit_cost: product.cost,
        last_updated: new Date()
      });
      
      await warehouseInventory.save();
      console.log(`   🏭 ${warehouse.warehouse_id}: ${product.name} - Available: ${warehouseInventory.available_stock}`);
    }
  }
}

async function createReplenishmentOrders() {
  console.log('\n🔄 Creating replenishment orders...');
  
  // Get low stock items to create realistic replenishment orders
  const lowStockItems = await Inventory.find({
    $expr: { $lte: ['$current_stock', '$reorder_threshold'] }
  });
  
  console.log(`Found ${lowStockItems.length} low stock items to create orders for`);
  
  const statuses = ['ALERT_RAISED', 'PENDING_PICKING', 'IN_TRANSIT', 'COMPLETED'];
  
  for (let i = 0; i < lowStockItems.length; i++) {
    const item = lowStockItems[i];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const requestedQuantity = item.reorder_threshold + Math.floor(Math.random() * 30);
    
    const replenishmentOrder = new ReplenishmentOrder({
      replenishment_id: `REP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      store_id: item.store_id,
      product_id: item.product_id,
      product_name: item.product_name,
      current_stock: item.current_stock,
      reorder_threshold: item.reorder_threshold,
      requested_quantity: requestedQuantity,
      status: status,
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
      last_updated: new Date()
    });
    
    // Add status history
    replenishmentOrder.status_history = [
      {
        status: 'ALERT_RAISED',
        timestamp: replenishmentOrder.created_at,
        updated_by: 'SYSTEM',
        notes: 'Low stock alert triggered automatically'
      }
    ];
    
    if (status !== 'ALERT_RAISED') {
      replenishmentOrder.status_history.push({
        status: 'PENDING_PICKING',
        timestamp: new Date(replenishmentOrder.created_at.getTime() + Math.random() * 24 * 60 * 60 * 1000),
        updated_by: 'WAREHOUSE_MANAGER',
        notes: 'Transfer order created and sent to warehouse'
      });
    }
    
    if (status === 'IN_TRANSIT' || status === 'COMPLETED') {
      replenishmentOrder.status_history.push({
        status: 'IN_TRANSIT',
        timestamp: new Date(replenishmentOrder.created_at.getTime() + 2 * 24 * 60 * 60 * 1000),
        updated_by: 'SHIPPING_DEPT',
        notes: 'Shipment dispatched from warehouse'
      });
    }
    
    if (status === 'COMPLETED') {
      replenishmentOrder.status_history.push({
        status: 'COMPLETED',
        timestamp: new Date(replenishmentOrder.created_at.getTime() + 4 * 24 * 60 * 60 * 1000),
        updated_by: 'STORE_MANAGER',
        notes: 'Stock received and inventory updated'
      });
    }
    
    await replenishmentOrder.save();
    console.log(`   🔄 Order ${replenishmentOrder.replenishment_id}: ${item.product_name} - Status: ${status}`);
  }
  
  // Create a few additional orders for demonstration
  for (let i = 0; i < 5; i++) {
    const randomStore = sampleStores[Math.floor(Math.random() * sampleStores.length)];
    const randomProduct = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const replenishmentOrder = new ReplenishmentOrder({
      replenishment_id: `REP-${Date.now() + i}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      store_id: randomStore.store_id,
      product_id: randomProduct.id,
      product_name: randomProduct.name,
      current_stock: Math.floor(Math.random() * 10),
      reorder_threshold: 15,
      requested_quantity: 25 + Math.floor(Math.random() * 25),
      status: status,
      created_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Random date within last 2 weeks
      last_updated: new Date()
    });
    
    await replenishmentOrder.save();
    console.log(`   🔄 Demo Order ${replenishmentOrder.replenishment_id}: ${randomProduct.name} - Status: ${status}`);
  }
}

async function showSummary() {
  console.log('\n📊 Database Population Summary:');
  console.log('=' .repeat(50));
  
  const storeCount = await Store.countDocuments();
  const warehouseCount = await Warehouse.countDocuments();
  const inventoryCount = await Inventory.countDocuments();
  const warehouseInventoryCount = await WarehouseInventory.countDocuments();
  const replenishmentOrderCount = await ReplenishmentOrder.countDocuments();
  const lowStockCount = await Inventory.countDocuments({
    $expr: { $lte: ['$current_stock', '$reorder_threshold'] }
  });
  
  console.log(`🏪 Stores: ${storeCount}`);
  console.log(`🏭 Warehouses: ${warehouseCount}`);
  console.log(`📦 Inventory Items: ${inventoryCount}`);
  console.log(`🏭 Warehouse Inventory: ${warehouseInventoryCount}`);
  console.log(`🔄 Replenishment Orders: ${replenishmentOrderCount}`);
  console.log(`⚠️  Low Stock Items: ${lowStockCount}`);
  
  console.log('\n🎉 Database populated successfully!');
  console.log('🌐 You can now view your data in MongoDB Atlas dashboard');
  console.log('📊 Click "Browse Collections" in your Atlas interface to see the data');
}

async function main() {
  console.log('🚀 Project Sentry - MongoDB Atlas Data Populator');
  console.log('=' .repeat(60));
  
  const connected = await connectToMongoDB();
  if (!connected) {
    console.error('❌ Failed to connect to MongoDB. Exiting...');
    process.exit(1);
  }
  
  try {
    await clearExistingData();
    await createStores();
    await createWarehouses();
    await createInventory();
    await createWarehouseInventory();
    await createReplenishmentOrders();
    await showSummary();
    
  } catch (error) {
    console.error('❌ Error populating database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n🔌 Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

main();