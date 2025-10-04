#!/usr/bin/env node

// 🧹 Clean Database Script for Fresh Demo Recording
require('dotenv').config();
const mongoose = require('mongoose');

async function cleanDatabase() {
  console.log('🧹 Project Sentry - Database Cleanup for Fresh Demo');
  console.log('====================================================');
  
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
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📁 Found ${collections.length} collections`);
    
    // Show current state
    console.log('\n📊 CURRENT DATABASE STATE:');
    console.log('===========================');
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`📁 ${collection.name}: ${count} documents`);
    }
    
    // Clean specific collections (keep base data)
    console.log('\n🧹 CLEANING COLLECTIONS...');
    console.log('============================');
    
    // Clear replenishment orders (workflow data)
    const replenishmentResult = await mongoose.connection.db.collection('replenishmentorders').deleteMany({});
    console.log(`🗑️  Replenishment Orders: Deleted ${replenishmentResult.deletedCount} documents`);
    
    // Reset inventory to original state (optional - keep commented for now)
    // const inventoryResult = await mongoose.connection.db.collection('inventories').deleteMany({});
    // console.log(`🗑️  Inventory: Deleted ${inventoryResult.deletedCount} documents`);
    
    // Reset warehouse inventory to original state (optional - keep commented for now)
    // const warehouseResult = await mongoose.connection.db.collection('warehouseinventories').deleteMany({});
    // console.log(`🗑️  Warehouse Inventory: Deleted ${warehouseResult.deletedCount} documents`);
    
    console.log('\n📊 DATABASE STATE AFTER CLEANUP:');
    console.log('==================================');
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`📁 ${collection.name}: ${count} documents`);
    }
    
    console.log('\n✅ DATABASE CLEANUP COMPLETE!');
    console.log('==============================');
    console.log('🎬 Ready for fresh demo recording!');
    console.log('📝 All replenishment workflow data cleared');
    console.log('🏪 Store and inventory data preserved');
    console.log('🏭 Warehouse data preserved');
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run cleanup
cleanDatabase();