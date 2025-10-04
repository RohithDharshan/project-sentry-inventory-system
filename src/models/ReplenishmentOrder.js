const mongoose = require('mongoose');

// Replenishment Order Schema - The Digital Thread
const replenishmentOrderSchema = new mongoose.Schema({
  // Stage 1: Low-Stock Alert
  replenishment_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
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
  current_stock: {
    type: Number,
    required: true,
    min: 0
  },
  reorder_threshold: {
    type: Number,
    required: true,
    min: 0
  },
  requested_quantity: {
    type: Number,
    required: true,
    min: 1
  },
  alert_triggered_at: {
    type: Date,
    default: Date.now
  },
  alert_triggered_by: {
    type: String,
    default: 'POS_SYSTEM'
  },

  // Stage 2: Transfer Order Creation
  transfer_order_id: {
    type: String,
    sparse: true,
    index: true
  },
  warehouse_id: {
    type: String
  },
  warehouse_available_stock: {
    type: Number,
    min: 0
  },
  transfer_quantity: {
    type: Number,
    min: 0
  },
  transfer_order_created_at: {
    type: Date
  },
  transfer_order_created_by: {
    type: String
  },

  // Stage 3: Shipment from Warehouse
  shipment_id: {
    type: String,
    sparse: true,
    index: true
  },
  tracking_number: {
    type: String,
    sparse: true,
    index: true
  },
  carrier: {
    type: String
  },
  estimated_delivery_date: {
    type: Date
  },
  shipped_at: {
    type: Date
  },
  shipped_by: {
    type: String
  },
  shipped_quantity: {
    type: Number,
    min: 0
  },

  // Stage 4: Stock Received at Store
  received_at: {
    type: Date
  },
  received_by: {
    type: String
  },
  received_quantity: {
    type: Number,
    min: 0
  },
  new_stock_level: {
    type: Number,
    min: 0
  },

  // Status Management (State Machine)
  status: {
    type: String,
    required: true,
    enum: [
      'ALERT_RAISED',
      'PENDING_PICKING',
      'IN_TRANSIT',
      'COMPLETED',
      'CANCELLED',
      'FAILED'
    ],
    default: 'ALERT_RAISED',
    index: true
  },

  // Audit Trail
  status_history: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updated_by: {
      type: String,
      required: true
    },
    notes: String
  }],

  // Metadata
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  tags: [String],
  notes: String,
  
  // System fields
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update updated_at field
replenishmentOrderSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Index for performance
replenishmentOrderSchema.index({ store_id: 1, status: 1 });
replenishmentOrderSchema.index({ product_id: 1, status: 1 });
replenishmentOrderSchema.index({ created_at: -1 });

// Instance methods
replenishmentOrderSchema.methods.updateStatus = function(newStatus, updatedBy, notes = '') {
  // Add to history
  this.status_history.push({
    status: this.status,
    timestamp: new Date(),
    updated_by: updatedBy,
    notes: `Status changed from ${this.status} to ${newStatus}. ${notes}`.trim()
  });
  
  // Update current status
  this.status = newStatus;
  this.updated_at = new Date();
  
  return this.save();
};

// Static methods
replenishmentOrderSchema.statics.findByStore = function(storeId, status = null) {
  const query = { store_id: storeId };
  if (status) query.status = status;
  return this.find(query).sort({ created_at: -1 });
};

replenishmentOrderSchema.statics.findByProduct = function(productId, status = null) {
  const query = { product_id: productId };
  if (status) query.status = status;
  return this.find(query).sort({ created_at: -1 });
};

replenishmentOrderSchema.statics.getActiveOrders = function() {
  return this.find({ 
    status: { $in: ['ALERT_RAISED', 'PENDING_PICKING', 'IN_TRANSIT'] }
  }).sort({ created_at: -1 });
};

module.exports = mongoose.model('ReplenishmentOrder', replenishmentOrderSchema);