const mongoose = require('mongoose');
const logger = require('./logger');
const { ReplenishmentOrder, Inventory, Store, Warehouse } = require('../models/index');

/**
 * Database Inspector Utility
 * Provides tools to view and inspect MongoDB data
 */
class DatabaseInspector {
  
  /**
   * Connect to MongoDB and show connection status
   */
  static async connect() {
    try {
      if (mongoose.connection.readyState === 1) {
        console.log('✅ Already connected to MongoDB');
        return true;
      }

      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/project-sentry';
      console.log('🔗 Connecting to MongoDB...');
      console.log(`📍 URI: ${mongoURI.replace(/\/\/[^@]+@/, '//***:***@')}`);
      
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      
      console.log('✅ Connected to MongoDB successfully!');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🏠 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      return true;
      
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      return false;
    }
  }

  /**
   * Show all collections in the database
   */
  static async showCollections() {
    try {
      await this.connect();
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      console.log('\n📋 Collections in database:');
      console.log('=' .repeat(50));
      
      if (collections.length === 0) {
        console.log('🗂️  No collections found (database is empty)');
        return;
      }
      
      for (const collection of collections) {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        console.log(`📁 ${collection.name}: ${count} documents`);
      }
      
    } catch (error) {
      console.error('❌ Error listing collections:', error.message);
    }
  }

  /**
   * Show all replenishment orders
   */
  static async showReplenishmentOrders(limit = 10) {
    try {
      await this.connect();
      
      console.log(`\n🔄 Replenishment Orders (latest ${limit}):`);
      console.log('=' .repeat(60));
      
      const orders = await ReplenishmentOrder.find()
        .sort({ created_at: -1 })
        .limit(limit);
      
      if (orders.length === 0) {
        console.log('📝 No replenishment orders found');
        return;
      }
      
      orders.forEach((order, index) => {
        console.log(`\n${index + 1}. 🆔 ${order.replenishment_id}`);
        console.log(`   📊 Status: ${order.status}`);
        console.log(`   🏪 Store: ${order.store_id}`);
        console.log(`   📦 Product: ${order.product_name} (${order.product_id})`);
        console.log(`   📈 Stock: ${order.current_stock}/${order.reorder_threshold}`);
        console.log(`   📅 Created: ${order.created_at?.toISOString() || 'N/A'}`);
        
        if (order.status_history && order.status_history.length > 0) {
          console.log(`   📋 Status History:`);
          order.status_history.forEach(status => {
            console.log(`      • ${status.status} at ${status.timestamp?.toISOString() || 'N/A'}`);
          });
        }
      });
      
    } catch (error) {
      console.error('❌ Error fetching replenishment orders:', error.message);
    }
  }

  /**
   * Show inventory items
   */
  static async showInventory(limit = 10) {
    try {
      await this.connect();
      
      console.log(`\n📦 Inventory Items (latest ${limit}):`);
      console.log('=' .repeat(50));
      
      const items = await Inventory.find()
        .sort({ last_updated: -1 })
        .limit(limit);
      
      if (items.length === 0) {
        console.log('📦 No inventory items found');
        return;
      }
      
      items.forEach((item, index) => {
        console.log(`\n${index + 1}. 🛍️  ${item.product_name}`);
        console.log(`   🆔 ID: ${item.product_id}`);
        console.log(`   🏪 Store: ${item.store_id}`);
        console.log(`   📊 Stock: ${item.current_stock} (threshold: ${item.reorder_threshold})`);
        console.log(`   💰 Cost: $${item.unit_cost}`);
        console.log(`   📅 Updated: ${item.last_updated?.toISOString() || 'N/A'}`);
        
        if (item.current_stock <= item.reorder_threshold) {
          console.log(`   ⚠️  LOW STOCK ALERT!`);
        }
      });
      
    } catch (error) {
      console.error('❌ Error fetching inventory:', error.message);
    }
  }

  /**
   * Show database statistics
   */
  static async showStats() {
    try {
      await this.connect();
      
      console.log('\n📈 Database Statistics:');
      console.log('=' .repeat(40));
      
      const stats = await mongoose.connection.db.stats();
      const replenishmentCount = await ReplenishmentOrder.countDocuments();
      const inventoryCount = await Inventory.countDocuments();
      const storeCount = await Store.countDocuments();
      const warehouseCount = await Warehouse.countDocuments();
      
      console.log(`📊 Database Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`🗃️  Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📋 Collections: ${stats.collections}`);
      console.log(`📄 Total Documents: ${stats.objects}`);
      console.log('');
      console.log('📊 Document Counts:');
      console.log(`   🔄 Replenishment Orders: ${replenishmentCount}`);
      console.log(`   📦 Inventory Items: ${inventoryCount}`);
      console.log(`   🏪 Stores: ${storeCount}`);
      console.log(`   🏭 Warehouses: ${warehouseCount}`);
      
    } catch (error) {
      console.error('❌ Error getting database stats:', error.message);
    }
  }

  /**
   * Search for specific data
   */
  static async search(query) {
    try {
      await this.connect();
      
      console.log(`\n🔍 Searching for: "${query}"`);
      console.log('=' .repeat(50));
      
      // Search replenishment orders
      const orders = await ReplenishmentOrder.find({
        $or: [
          { replenishment_id: { $regex: query, $options: 'i' } },
          { store_id: { $regex: query, $options: 'i' } },
          { product_id: { $regex: query, $options: 'i' } },
          { product_name: { $regex: query, $options: 'i' } },
          { status: { $regex: query, $options: 'i' } }
        ]
      }).limit(5);
      
      // Search inventory
      const inventory = await Inventory.find({
        $or: [
          { store_id: { $regex: query, $options: 'i' } },
          { product_id: { $regex: query, $options: 'i' } },
          { product_name: { $regex: query, $options: 'i' } },
          { product_category: { $regex: query, $options: 'i' } }
        ]
      }).limit(5);
      
      if (orders.length > 0) {
        console.log('\n🔄 Replenishment Orders:');
        orders.forEach(order => {
          console.log(`   • ${order.replenishment_id} - ${order.product_name} (${order.status})`);
        });
      }
      
      if (inventory.length > 0) {
        console.log('\n📦 Inventory Items:');
        inventory.forEach(item => {
          console.log(`   • ${item.product_name} at ${item.store_id} (Stock: ${item.current_stock})`);
        });
      }
      
      if (orders.length === 0 && inventory.length === 0) {
        console.log('❌ No results found');
      }
      
    } catch (error) {
      console.error('❌ Error searching database:', error.message);
    }
  }

  /**
   * Close database connection
   */
  static async disconnect() {
    try {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting:', error.message);
    }
  }
}

module.exports = DatabaseInspector;