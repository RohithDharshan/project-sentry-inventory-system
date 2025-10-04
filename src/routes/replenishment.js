const express = require('express');
const Joi = require('joi');
const replenishmentService = require('../services/replenishmentService');
const logger = require('../utils/logger');
const checkDatabaseConnection = require('../middleware/databaseCheck');

const router = express.Router();

// Apply database check middleware to all routes
router.use(checkDatabaseConnection);

// Validation schemas
const lowStockAlertSchema = Joi.object({
  store_id: Joi.string().required(),
  product_id: Joi.string().required(),
  product_name: Joi.string().required(),
  current_stock: Joi.number().min(0).required(),
  reorder_threshold: Joi.number().min(0).required(),
  requested_quantity: Joi.number().min(1).optional()
});

const transferOrderSchema = Joi.object({
  replenishment_id: Joi.string().required(),
  warehouse_id: Joi.string().optional()
});

const shipmentSchema = Joi.object({
  replenishment_id: Joi.string().required(),
  carrier: Joi.string().optional(),
  estimated_delivery_days: Joi.number().min(1).max(30).optional()
});

const deliverySchema = Joi.object({
  replenishment_id: Joi.string().required(),
  received_quantity: Joi.number().min(0).optional(),
  received_by: Joi.string().optional()
});

// Stage 1: Low-Stock Alert
/**
 * @route   POST /api/v1/replenishment/alerts
 * @desc    Create a low-stock alert (Stage 1)
 * @access  Public
 */
router.post('/alerts', async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = lowStockAlertSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details.map(detail => detail.message)
      });
    }

    // Handle demo mode
    if (req.demoMode) {
      const demoReplenishmentId = `REP-${Date.now()}-DEMO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      return res.status(201).json({
        ...req.demoResponse,
        message: 'Demo: Low stock alert created successfully',
        data: {
          replenishment_id: demoReplenishmentId,
          status: 'ALERT_RAISED',
          store_id: value.store_id,
          product_id: value.product_id,
          product_name: value.product_name,
          current_stock: value.current_stock,
          requested_quantity: value.requested_quantity || Math.max(1, (value.reorder_threshold * 2) - value.current_stock),
          alert_triggered_at: new Date().toISOString()
        },
        stage: 'Stage 1: Low-Stock Alert',
        next_stage: 'Stage 2: Transfer Order Creation'
      });
    }

    // Create low stock alert
    const replenishmentOrder = await replenishmentService.createLowStockAlert(value);

    res.status(201).json({
      success: true,
      message: 'Low stock alert created successfully',
      data: {
        replenishment_id: replenishmentOrder.replenishment_id,
        status: replenishmentOrder.status,
        store_id: replenishmentOrder.store_id,
        product_id: replenishmentOrder.product_id,
        product_name: replenishmentOrder.product_name,
        current_stock: replenishmentOrder.current_stock,
        requested_quantity: replenishmentOrder.requested_quantity,
        alert_triggered_at: replenishmentOrder.alert_triggered_at
      },
      stage: 'Stage 1: Low-Stock Alert',
      next_stage: 'Stage 2: Transfer Order Creation'
    });

  } catch (error) {
    next(error);
  }
});

// Stage 2: Transfer Order Creation
/**
 * @route   POST /api/v1/replenishment/transfer-orders
 * @desc    Create a transfer order (Stage 2)
 * @access  Public
 */
router.post('/transfer-orders', async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = transferOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details.map(detail => detail.message)
      });
    }

    // Handle demo mode
    if (req.demoMode) {
      const { v4: uuidv4 } = require('uuid');
      const mockData = {
        replenishment_id: value.replenishment_id,
        transfer_order_id: `TO-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`,
        status: 'PENDING_PICKING',
        warehouse_id: 'WH-CENTRAL-001',
        transfer_quantity: 25,
        warehouse_available_stock: 100,
        transfer_order_created_at: new Date()
      };

      return res.status(201).json({
        success: true,
        message: 'Demo: Transfer order created successfully',
        note: 'This is a mock response. Start MongoDB to use real data.',
        timestamp: new Date().toISOString(),
        data: mockData,
        stage: 'Stage 2: Transfer Order Creation',
        next_stage: 'Stage 3: Shipment from Warehouse'
      });
    }

    // Create transfer order
    const replenishmentOrder = await replenishmentService.createTransferOrder(value);

    res.status(201).json({
      success: true,
      message: 'Transfer order created successfully',
      data: {
        replenishment_id: replenishmentOrder.replenishment_id,
        transfer_order_id: replenishmentOrder.transfer_order_id,
        status: replenishmentOrder.status,
        warehouse_id: replenishmentOrder.warehouse_id,
        transfer_quantity: replenishmentOrder.transfer_quantity,
        warehouse_available_stock: replenishmentOrder.warehouse_available_stock,
        transfer_order_created_at: replenishmentOrder.transfer_order_created_at
      },
      stage: 'Stage 2: Transfer Order Creation',
      next_stage: 'Stage 3: Shipment from Warehouse'
    });

  } catch (error) {
    next(error);
  }
});

// Stage 3: Shipment from Warehouse
/**
 * @route   POST /api/v1/replenishment/shipments
 * @desc    Create a shipment (Stage 3)
 * @access  Public
 */
router.post('/shipments', async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = shipmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details.map(detail => detail.message)
      });
    }

    // Handle demo mode
    if (req.demoMode) {
      const { v4: uuidv4 } = require('uuid');
      const mockData = {
        replenishment_id: value.replenishment_id,
        shipment_id: `SHP-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`,
        tracking_number: `1Z${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
        status: 'IN_TRANSIT',
        carrier: value.carrier || 'UPS',
        shipped_quantity: 25,
        estimated_delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        shipped_at: new Date()
      };

      return res.status(201).json({
        success: true,
        message: 'Demo: Shipment created successfully',
        note: 'This is a mock response. Start MongoDB to use real data.',
        timestamp: new Date().toISOString(),
        data: mockData,
        stage: 'Stage 3: Shipment from Warehouse',
        next_stage: 'Stage 4: Stock Received at Store'
      });
    }

    // Create shipment
    const replenishmentOrder = await replenishmentService.createShipment(value);

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: {
        replenishment_id: replenishmentOrder.replenishment_id,
        shipment_id: replenishmentOrder.shipment_id,
        tracking_number: replenishmentOrder.tracking_number,
        status: replenishmentOrder.status,
        carrier: replenishmentOrder.carrier,
        shipped_quantity: replenishmentOrder.shipped_quantity,
        estimated_delivery_date: replenishmentOrder.estimated_delivery_date,
        shipped_at: replenishmentOrder.shipped_at
      },
      stage: 'Stage 3: Shipment from Warehouse',
      next_stage: 'Stage 4: Stock Received at Store'
    });

  } catch (error) {
    next(error);
  }
});

// Stage 4: Stock Received at Store
/**
 * @route   POST /api/v1/replenishment/deliveries
 * @desc    Confirm delivery (Stage 4)
 * @access  Public
 */
router.post('/deliveries', async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = deliverySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details.map(detail => detail.message)
      });
    }

    // Handle demo mode
    if (req.demoMode) {
      const mockData = {
        replenishment_id: value.replenishment_id,
        status: 'COMPLETED',
        received_quantity: value.received_quantity || 25,
        new_stock_level: 30,
        received_at: new Date(),
        received_by: value.received_by || 'STORE_EMPLOYEE'
      };

      return res.status(200).json({
        success: true,
        message: 'Demo: Delivery confirmed successfully',
        note: 'This is a mock response. Start MongoDB to use real data.',
        timestamp: new Date().toISOString(),
        data: mockData,
        stage: 'Stage 4: Stock Received at Store',
        workflow_status: 'COMPLETED'
      });
    }

    // Confirm delivery
    const replenishmentOrder = await replenishmentService.confirmDelivery(value);

    res.status(200).json({
      success: true,
      message: 'Delivery confirmed successfully',
      data: {
        replenishment_id: replenishmentOrder.replenishment_id,
        status: replenishmentOrder.status,
        received_quantity: replenishmentOrder.received_quantity,
        new_stock_level: replenishmentOrder.new_stock_level,
        received_at: replenishmentOrder.received_at,
        received_by: replenishmentOrder.received_by
      },
      stage: 'Stage 4: Stock Received at Store',
      workflow_status: 'COMPLETED'
    });

  } catch (error) {
    next(error);
  }
});

// Get replenishment order by ID
/**
 * @route   GET /api/v1/replenishment/orders/:replenishment_id
 * @desc    Get replenishment order details
 * @access  Public
 */
router.get('/orders/:replenishment_id', async (req, res, next) => {
  try {
    const { replenishment_id } = req.params;
    const order = await replenishmentService.getOrderById(replenishment_id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Replenishment order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    next(error);
  }
});

// Get replenishment orders by store
/**
 * @route   GET /api/v1/replenishment/stores/:store_id/orders
 * @desc    Get replenishment orders for a specific store
 * @access  Public
 */
router.get('/stores/:store_id/orders', async (req, res, next) => {
  try {
    const { store_id } = req.params;
    const { status } = req.query;
    
    const orders = await replenishmentService.getOrdersByStore(store_id, status);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    next(error);
  }
});

// Get all active orders
/**
 * @route   GET /api/v1/replenishment/active-orders
 * @desc    Get all active replenishment orders
 * @access  Public
 */
router.get('/active-orders', async (req, res, next) => {
  try {
    const orders = await replenishmentService.getActiveOrders();

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    next(error);
  }
});

// Get order history
/**
 * @route   GET /api/v1/replenishment/orders/:replenishment_id/history
 * @desc    Get status history for a replenishment order
 * @access  Public
 */
router.get('/orders/:replenishment_id/history', async (req, res, next) => {
  try {
    const { replenishment_id } = req.params;
    const history = await replenishmentService.getOrderHistory(replenishment_id);

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Replenishment order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        replenishment_id,
        status_history: history
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;