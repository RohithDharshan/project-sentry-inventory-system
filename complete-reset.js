#!/usr/bin/env node

// 🧹 Complete Database Reset Script - Fresh Start with Original Data
require('dotenv').config();
const mongoose = require('mongoose');

async function completeReset() {
  console.log('🧹 Project Sentry - Complete Database Reset');
  console.log('=============================================');
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 15000,
      maxPoolSize: 5
    });
    
    console.log('✅ Connected to MongoDB Atlas');
    console.log('📊 Database:', mongoose.connection.name);
    
    // Show current problematic state
    console.log('\n📊 CURRENT PROBLEMATIC STATE:');
    console.log('==============================');
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`📁 ${collection.name}: ${count} documents`);
    }
    
    // Check warehouse inventory issues
    console.log('\n🔍 CHECKING WAREHOUSE INVENTORY ISSUES:');
    console.log('=======================================');
    const warehouseProblem = await mongoose.connection.db.collection('warehouseinventories').find({
      $or: [
        { total_stock: { $lt: 0 } },
        { available_stock: { $lt: 0 } },
        { reserved_stock: { $lt: 0 } }
      ]
    }).toArray();
    
    if (warehouseProblem.length > 0) {
      console.log(`❌ Found ${warehouseProblem.length} warehouse inventory issues:`);
      warehouseProblem.forEach(item => {
        console.log(`   🏭 ${item.warehouse_id} - ${item.product_id}: total=${item.total_stock}, available=${item.available_stock}, reserved=${item.reserved_stock}`);
      });
    }
    
    // COMPLETE RESET - Delete all dynamic data and recreate fresh
    console.log('\n🗑️  PERFORMING COMPLETE RESET...');
    console.log('==================================');
    
    // Delete all collections except the basic structure
    const collectionsToReset = ['replenishmentorders', 'inventories', 'warehouseinventories', 'stores', 'warehouses'];
    
    for (const collectionName of collectionsToReset) {
      const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
      console.log(`🗑️  ${collectionName}: Deleted ${result.deletedCount} documents`);
    }
    
    // Recreate fresh data using the populate script logic
    console.log('\n🔄 RECREATING FRESH DATA...');
    console.log('============================');
    
    // Create stores
    const stores = [
      {
        store_id: "STORE-NYC-001",
        store_name: "UrbanStyle Manhattan", 
        address: "123 Broadway, New York, NY 10001",
        manager: "Sarah Johnson",
        phone: "+1-212-555-0101",
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        store_id: "STORE-LA-001",
        store_name: "UrbanStyle Beverly Hills",
        address: "456 Rodeo Drive, Beverly Hills, CA 90210", 
        manager: "Michael Chen",
        phone: "+1-310-555-0102",
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        store_id: "STORE-CHI-001",
        store_name: "UrbanStyle Downtown",
        address: "789 Michigan Ave, Chicago, IL 60611",
        manager: "Emily Rodriguez", 
        phone: "+1-312-555-0103",
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    await mongoose.connection.db.collection('stores').insertMany(stores);
    console.log('✅ Created 3 stores');
    
    // Create warehouses
    const warehouses = [
      {
        warehouse_id: "WH-CENTRAL-001",
        warehouse_name: "Central Distribution Center",
        address: "1000 Industrial Blvd, Newark, NJ 07102",
        manager: "David Wilson",
        phone: "+1-973-555-0201",
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: "WH-EAST-001", 
        warehouse_name: "East Coast Warehouse",
        address: "2000 Logistics Way, Atlanta, GA 30309",
        manager: "Lisa Thompson",
        phone: "+1-404-555-0202",
        created_at: new Date(), 
        updated_at: new Date()
      }
    ];
    
    await mongoose.connection.db.collection('warehouses').insertMany(warehouses);
    console.log('✅ Created 2 warehouses');
    
    // Create fresh inventory with safe stock levels
    const products = [
      { id: "PROD-JEANS-001", name: "Slim Fit Jeans", category: "Apparel", cost: 45.99 },
      { id: "PROD-SHIRT-001", name: "Cotton T-Shirt", category: "Apparel", cost: 19.99 },
      { id: "PROD-JACKET-001", name: "Denim Jacket", category: "Apparel", cost: 79.99 },
      { id: "PROD-SNEAKERS-001", name: "Canvas Sneakers", category: "Footwear", cost: 59.99 },
      { id: "PROD-HOODIE-001", name: "Pullover Hoodie", category: "Apparel", cost: 49.99 },
      { id: "PROD-DRESS-001", name: "Summer Dress", category: "Apparel", cost: 39.99 }
    ];
    
    const inventoryData = [];
    const warehouseInventoryData = [];
    
    // Create store inventory with higher stock levels
    for (const store of stores) {
      for (const product of products) {
        const currentStock = Math.floor(Math.random() * 50) + 30; // 30-80 stock
        const reorderThreshold = Math.floor(Math.random() * 15) + 10; // 10-25 threshold
        const maxStock = currentStock + Math.floor(Math.random() * 30) + 20; // Higher max
        
        inventoryData.push({
          store_id: store.store_id,
          product_id: product.id,
          product_name: product.name,
          product_category: product.category,
          current_stock: currentStock,
          reorder_threshold: reorderThreshold,
          max_stock_level: maxStock,
          unit_cost: product.cost,
          last_stock_update: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    
    await mongoose.connection.db.collection('inventories').insertMany(inventoryData);
    console.log(`✅ Created ${inventoryData.length} inventory items`);
    
    // Create warehouse inventory with abundant stock
    for (const warehouse of warehouses) {
      for (const product of products) {
        const totalStock = Math.floor(Math.random() * 300) + 200; // 200-500 stock
        
        warehouseInventoryData.push({
          warehouse_id: warehouse.warehouse_id,
          product_id: product.id,
          product_name: product.name,
          total_stock: totalStock,
          available_stock: totalStock, // All available initially
          reserved_stock: 0, // Nothing reserved initially
          unit_cost: product.cost,
          last_updated: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    
    await mongoose.connection.db.collection('warehouseinventories').insertMany(warehouseInventoryData);
    console.log(`✅ Created ${warehouseInventoryData.length} warehouse inventory items`);
    
    // Show final clean state
    console.log('\n📊 CLEAN DATABASE STATE:');
    console.log('=========================');
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`📁 ${collection.name}: ${count} documents`);
    }
    
    console.log('\n✅ COMPLETE DATABASE RESET SUCCESSFUL!');
    console.log('======================================');
    console.log('🎬 Database is now completely fresh and ready for demo recording!');
    console.log('📦 All inventory levels are abundant (200+ warehouse stock)');
    console.log('🏪 All store stock levels are healthy (30+ items)');
    console.log('🔄 Zero replenishment orders - clean slate');
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Complete reset failed:', error.message);
    process.exit(1);
  }
}

// Run complete reset
completeReset();