const express = require('express');
const Joi = require('joi');
const { Inventory, Store, Warehouse, WarehouseInventory } = require('../models');
const logger = require('../utils/logger');
const checkDatabaseConnection = require('../middleware/databaseCheck');

const router = express.Router();

// Validation schemas
const inventorySchema = Joi.object({
  store_id: Joi.string().required(),
  product_id: Joi.string().required(),
  product_name: Joi.string().required(),
  product_category: Joi.string().required(),
  current_stock: Joi.number().min(0).default(0),
  reorder_threshold: Joi.number().min(0).default(10),
  max_stock_level: Joi.number().min(0).default(100),
  unit_cost: Joi.number().min(0).required()
});

const stockUpdateSchema = Joi.object({
  quantity: Joi.number().required(),
  operation: Joi.string().valid('add', 'subtract', 'set').default('set')
});

// Get all inventory items with optional filtering
/**
 * @route   GET /api/v1/inventory
 * @desc    Get all inventory items or filter by parameters
 * @access  Public
 */
router.get('/', checkDatabaseConnection, async (req, res, next) => {
  try {
    const { store_id, product_id, low_stock } = req.query;
    
    // Handle demo mode
    if (req.demoMode) {
      const demoInventory = [
        {
          inventory_id: 'INV-001',
          store_id: store_id || 'STORE-NYC-001',
          product_id: product_id || 'PROD-JEANS-001',
          product_name: 'Slim Fit Jeans',
          product_category: 'Apparel',
          current_stock: low_stock === 'true' ? 5 : 25,
          reorder_threshold: 10,
          max_stock_level: 100,
          unit_cost: 45.99,
          last_updated: new Date().toISOString()
        },
        {
          inventory_id: 'INV-002',
          store_id: store_id || 'STORE-NYC-001',
          product_id: 'PROD-SHIRT-001',
          product_name: 'Cotton T-Shirt',
          product_category: 'Apparel',
          current_stock: low_stock === 'true' ? 3 : 45,
          reorder_threshold: 15,
          max_stock_level: 80,
          unit_cost: 19.99,
          last_updated: new Date().toISOString()
        }
      ];
      
      let filteredInventory = demoInventory;
      if (store_id) filteredInventory = filteredInventory.filter(item => item.store_id === store_id);
      if (product_id) filteredInventory = filteredInventory.filter(item => item.product_id === product_id);
      if (low_stock === 'true') filteredInventory = filteredInventory.filter(item => item.current_stock <= item.reorder_threshold);
      
      return res.status(200).json({
        ...req.demoResponse,
        message: 'Demo: Inventory items retrieved successfully',
        count: filteredInventory.length,
        data: filteredInventory
      });
    }

    let query = {};
    if (store_id) query.store_id = store_id;
    if (product_id) query.product_id = product_id;

    let inventoryItems;
    
    if (low_stock === 'true') {
      inventoryItems = await Inventory.getLowStockItems(store_id);
    } else {
      inventoryItems = await Inventory.find(query).sort({ store_id: 1, product_name: 1 });
    }

    res.status(200).json({
      success: true,
      count: inventoryItems.length,
      data: inventoryItems
    });

  } catch (error) {
    next(error);
  }
});

// Get inventory by store
/**
 * @route   GET /api/v1/inventory/stores/:store_id
 * @desc    Get inventory items for a specific store
 * @access  Public
 */
router.get('/stores/:store_id', checkDatabaseConnection, async (req, res, next) => {
  try {
    const { store_id } = req.params;
    
    // Handle demo mode
    if (req.demoMode) {
      const demoStoreInventory = [
        {
          inventory_id: `INV-${store_id}-001`,
          store_id: store_id,
          product_id: 'PROD-JEANS-001',
          product_name: 'Slim Fit Jeans',
          product_category: 'Apparel',
          current_stock: 25,
          reorder_threshold: 10,
          max_stock_level: 100,
          unit_cost: 45.99,
          last_updated: new Date().toISOString()
        },
        {
          inventory_id: `INV-${store_id}-002`,
          store_id: store_id,
          product_id: 'PROD-SHIRT-001',
          product_name: 'Cotton T-Shirt',
          product_category: 'Apparel',
          current_stock: 45,
          reorder_threshold: 15,
          max_stock_level: 80,
          unit_cost: 19.99,
          last_updated: new Date().toISOString()
        }
      ];
      
      return res.status(200).json({
        ...req.demoResponse,
        message: `Demo: Inventory items retrieved for store ${store_id}`,
        store_id,
        count: demoStoreInventory.length,
        data: demoStoreInventory
      });
    }
    
    const inventoryItems = await Inventory.find({ store_id }).sort({ product_name: 1 });

    res.status(200).json({
      success: true,
      store_id,
      count: inventoryItems.length,
      data: inventoryItems
    });

  } catch (error) {
    next(error);
  }
});

// Get low stock items
/**
 * @route   GET /api/v1/inventory/low-stock
 * @desc    Get all items that need replenishment
 * @access  Public
 */
router.get('/low-stock', async (req, res, next) => {
  try {
    const { store_id } = req.query;
    const lowStockItems = await Inventory.getLowStockItems(store_id);

    res.status(200).json({
      success: true,
      message: 'Items requiring replenishment',
      count: lowStockItems.length,
      data: lowStockItems
    });

  } catch (error) {
    next(error);
  }
});

// Create new inventory item
/**
 * @route   POST /api/v1/inventory
 * @desc    Create a new inventory item
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = inventorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details.map(detail => detail.message)
      });
    }

    // Create inventory item
    const inventoryItem = new Inventory(value);
    await inventoryItem.save();

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: inventoryItem
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Inventory item already exists for this store and product'
      });
    }
    next(error);
  }
});

// Update stock level
/**
 * @route   PUT /api/v1/inventory/stores/:store_id/products/:product_id/stock
 * @desc    Update stock level for a specific inventory item
 * @access  Public
 */
router.put('/stores/:store_id/products/:product_id/stock', async (req, res, next) => {
  try {
    const { store_id, product_id } = req.params;
    
    // Validate request body
    const { error, value } = stockUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details.map(detail => detail.message)
      });
    }

    // Find inventory item
    const inventoryItem = await Inventory.findOne({ store_id, product_id });
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Update stock
    const previousStock = inventoryItem.current_stock;
    await inventoryItem.updateStock(value.quantity, value.operation);

    res.status(200).json({
      success: true,
      message: 'Stock level updated successfully',
      data: {
        store_id,
        product_id,
        product_name: inventoryItem.product_name,
        previous_stock: previousStock,
        current_stock: inventoryItem.current_stock,
        operation: value.operation,
        quantity: value.quantity,
        needs_replenishment: inventoryItem.needsReplenishment(),
        updated_at: inventoryItem.updated_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get warehouse inventory
/**
 * @route   GET /api/v1/inventory/warehouses/:warehouse_id
 * @desc    Get warehouse inventory
 * @access  Public
 */
router.get('/warehouses/:warehouse_id', async (req, res, next) => {
  try {
    const { warehouse_id } = req.params;
    const warehouseInventory = await WarehouseInventory.find({ warehouse_id }).sort({ product_name: 1 });

    res.status(200).json({
      success: true,
      warehouse_id,
      count: warehouseInventory.length,
      data: warehouseInventory
    });

  } catch (error) {
    next(error);
  }
});

// Get stores
/**
 * @route   GET /api/v1/inventory/stores
 * @desc    Get all stores
 * @access  Public
 */
router.get('/stores', async (req, res, next) => {
  try {
    const stores = await Store.find({ status: 'ACTIVE' }).sort({ store_name: 1 });

    res.status(200).json({
      success: true,
      count: stores.length,
      data: stores
    });

  } catch (error) {
    next(error);
  }
});

// Get warehouses
/**
 * @route   GET /api/v1/inventory/warehouses
 * @desc    Get all warehouses
 * @access  Public
 */
router.get('/warehouses', async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find({ status: 'ACTIVE' }).sort({ warehouse_name: 1 });

    res.status(200).json({
      success: true,
      count: warehouses.length,
      data: warehouses
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;