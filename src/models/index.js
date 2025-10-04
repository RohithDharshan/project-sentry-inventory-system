const mongoose = require('mongoose');

// Inventory Schema
const inventorySchema = new mongoose.Schema({
  store_id: {
    type: String,
    required: true,
    index: true
  },
  product_id: {
    type: String,
    required: true,
    index: true
  },
  product_name: {
    type: String,
    required: true
  },
  product_category: {
    type: String,
    required: true
  },
  current_stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reorder_threshold: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  max_stock_level: {
    type: Number,
    required: true,
    min: 0,
    default: 100
  },
  unit_cost: {
    type: Number,
    required: true,
    min: 0
  },
  last_stock_update: {
    type: Date,
    default: Date.now
  },
  last_replenishment_date: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique store-product combination
inventorySchema.index({ store_id: 1, product_id: 1 }, { unique: true });

// Store Schema
const storeSchema = new mongoose.Schema({
  store_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  store_name: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip_code: String,
    country: { type: String, default: 'USA' }
  },
  manager_name: String,
  contact_phone: String,
  contact_email: String,
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
    default: 'ACTIVE'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Warehouse Schema
const warehouseSchema = new mongoose.Schema({
  warehouse_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  warehouse_name: {
    type: String,
    required: true
  },
  location: {
    street: String,
    city: String,
    state: String,
    zip_code: String,
    country: { type: String, default: 'USA' }
  },
  capacity: {
    type: Number,
    required: true,
    min: 0
  },
  current_utilization: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
    default: 'ACTIVE'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Warehouse Inventory Schema
const warehouseInventorySchema = new mongoose.Schema({
  warehouse_id: {
    type: String,
    required: true,
    index: true
  },
  product_id: {
    type: String,
    required: true,
    index: true
  },
  product_name: {
    type: String,
    required: true
  },
  available_stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reserved_stock: {
    type: Number,
    default: 0,
    min: 0
  },
  total_stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  unit_cost: {
    type: Number,
    required: true,
    min: 0
  },
  last_restocked: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique warehouse-product combination
warehouseInventorySchema.index({ warehouse_id: 1, product_id: 1 }, { unique: true });

// Pre-save middleware to update timestamps
[inventorySchema, storeSchema, warehouseSchema, warehouseInventorySchema].forEach(schema => {
  schema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
  });
});

// Instance methods for Inventory
inventorySchema.methods.needsReplenishment = function() {
  return this.current_stock <= this.reorder_threshold;
};

inventorySchema.methods.updateStock = function(quantity, operation = 'add') {
  if (operation === 'add') {
    this.current_stock += quantity;
  } else if (operation === 'subtract') {
    this.current_stock = Math.max(0, this.current_stock - quantity);
  } else if (operation === 'set') {
    this.current_stock = Math.max(0, quantity);
  }
  
  this.last_stock_update = new Date();
  return this.save();
};

// Static methods for Inventory
inventorySchema.statics.getLowStockItems = function(storeId = null) {
  const pipeline = [
    {
      $match: {
        $expr: { $lte: ['$current_stock', '$reorder_threshold'] },
        ...(storeId && { store_id: storeId })
      }
    },
    { $sort: { current_stock: 1, store_id: 1 } }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = {
  Inventory: mongoose.model('Inventory', inventorySchema),
  Store: mongoose.model('Store', storeSchema),
  Warehouse: mongoose.model('Warehouse', warehouseSchema),
  WarehouseInventory: mongoose.model('WarehouseInventory', warehouseInventorySchema)
};