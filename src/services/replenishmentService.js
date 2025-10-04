const { v4: uuidv4 } = require('uuid');
const ReplenishmentOrder = require('../models/ReplenishmentOrder');
const { Inventory, WarehouseInventory } = require('../models');
const kafkaService = require('./kafkaService');
const logger = require('../utils/logger');

class ReplenishmentService {
  
  // Helper method to safely publish to Kafka
  async safeKafkaPublish(publishMethod, data) {
    try {
      await publishMethod.call(kafkaService, data);
      logger.info('📨 Kafka event published successfully');
    } catch (error) {
      logger.warn('⚠️  Kafka publish failed (continuing without event):', error.message);
      // Continue execution - don't let Kafka failures break the workflow
    }
  }
  
  // Stage 1: Low-Stock Alert
  async createLowStockAlert(alertData) {
    try {
      const {
        store_id,
        product_id,
        product_name,
        current_stock,
        reorder_threshold,
        requested_quantity = null
      } = alertData;

      // Generate unique replenishment ID
      const replenishment_id = `REP-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Calculate requested quantity if not provided
      const calculatedQuantity = requested_quantity || 
        Math.max(1, (reorder_threshold * 2) - current_stock);

      // Create replenishment order
      const replenishmentOrder = new ReplenishmentOrder({
        replenishment_id,
        store_id,
        product_id,
        product_name,
        current_stock,
        reorder_threshold,
        requested_quantity: calculatedQuantity,
        status: 'ALERT_RAISED',
        alert_triggered_at: new Date(),
        alert_triggered_by: 'POS_SYSTEM',
        status_history: [{
          status: 'ALERT_RAISED',
          timestamp: new Date(),
          updated_by: 'SYSTEM',
          notes: `Low stock alert created. Current: ${current_stock}, Threshold: ${reorder_threshold}`
        }]
      });

      await replenishmentOrder.save();
      logger.info(`🚨 Low stock alert created: ${replenishment_id}`);

      // Publish event to Kafka (safe - won't break workflow if Kafka is down)
      await this.safeKafkaPublish(kafkaService.publishLowStockAlert, {
        replenishment_id,
        store_id,
        product_id,
        product_name,
        current_stock,
        requested_quantity: calculatedQuantity,
        stage: 'LOW_STOCK_ALERT'
      });

      return replenishmentOrder;
    } catch (error) {
      logger.error('Error creating low stock alert:', error);
      throw error;
    }
  }

  // Stage 2: Transfer Order Creation
  async createTransferOrder(transferData) {
    try {
      const { replenishment_id, warehouse_id = 'WH-CENTRAL-001' } = transferData;

      // Find the replenishment order
      const order = await ReplenishmentOrder.findOne({ replenishment_id });
      if (!order) {
        throw new Error(`Replenishment order not found: ${replenishment_id}`);
      }

      if (order.status !== 'ALERT_RAISED') {
        throw new Error(`Invalid status for transfer order creation: ${order.status}`);
      }

      // Check warehouse inventory
      const warehouseStock = await WarehouseInventory.findOne({
        warehouse_id,
        product_id: order.product_id
      });

      if (!warehouseStock || warehouseStock.available_stock < order.requested_quantity) {
        const availableStock = warehouseStock ? warehouseStock.available_stock : 0;
        logger.warn(`Insufficient warehouse stock. Available: ${availableStock}, Requested: ${order.requested_quantity}`);
        
        // Could implement partial fulfillment logic here
        if (availableStock === 0) {
          throw new Error('No stock available in warehouse');
        }
      }

      // Generate transfer order ID
      const transfer_order_id = `TO-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

      // Update replenishment order
      order.transfer_order_id = transfer_order_id;
      order.warehouse_id = warehouse_id;
      order.warehouse_available_stock = warehouseStock ? warehouseStock.available_stock : 0;
      order.transfer_quantity = Math.min(order.requested_quantity, warehouseStock?.available_stock || 0);
      order.transfer_order_created_at = new Date();
      order.transfer_order_created_by = 'SYSTEM';
      
      await order.updateStatus('PENDING_PICKING', 'SYSTEM', 'Transfer order created and ready for picking');

      // Reserve stock in warehouse
      if (warehouseStock) {
        warehouseStock.reserved_stock += order.transfer_quantity;
        warehouseStock.available_stock -= order.transfer_quantity;
        await warehouseStock.save();
      }

      logger.info(`📦 Transfer order created: ${transfer_order_id}`);

      // Publish event to Kafka (safe - won't break workflow if Kafka is down)
      await this.safeKafkaPublish(kafkaService.publishTransferOrderCreated, {
        replenishment_id,
        transfer_order_id,
        warehouse_id,
        product_id: order.product_id,
        transfer_quantity: order.transfer_quantity,
        stage: 'TRANSFER_ORDER_CREATED'
      });

      return order;
    } catch (error) {
      logger.error('Error creating transfer order:', error);
      throw error;
    }
  }

  // Stage 3: Shipment from Warehouse
  async createShipment(shipmentData) {
    try {
      const { 
        replenishment_id, 
        carrier = 'UPS',
        estimated_delivery_days = 2 
      } = shipmentData;

      // Find the replenishment order
      const order = await ReplenishmentOrder.findOne({ replenishment_id });
      if (!order) {
        throw new Error(`Replenishment order not found: ${replenishment_id}`);
      }

      if (order.status !== 'PENDING_PICKING') {
        throw new Error(`Invalid status for shipment creation: ${order.status}`);
      }

      // Generate shipment details
      const shipment_id = `SHP-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
      const tracking_number = `1Z${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
      const estimated_delivery_date = new Date();
      estimated_delivery_date.setDate(estimated_delivery_date.getDate() + estimated_delivery_days);

      // Update replenishment order
      order.shipment_id = shipment_id;
      order.tracking_number = tracking_number;
      order.carrier = carrier;
      order.estimated_delivery_date = estimated_delivery_date;
      order.shipped_at = new Date();
      order.shipped_by = 'WAREHOUSE_OPERATOR';
      order.shipped_quantity = order.transfer_quantity;

      await order.updateStatus('IN_TRANSIT', 'WAREHOUSE_OPERATOR', `Package shipped via ${carrier}`);

      // Update warehouse inventory (remove from reserved)
      const warehouseStock = await WarehouseInventory.findOne({
        warehouse_id: order.warehouse_id,
        product_id: order.product_id
      });
      
      if (warehouseStock) {
        warehouseStock.reserved_stock -= order.shipped_quantity;
        warehouseStock.total_stock -= order.shipped_quantity;
        await warehouseStock.save();
      }

      logger.info(`🚚 Shipment created: ${shipment_id}, Tracking: ${tracking_number}`);

      // Publish event to Kafka (safe - won't break workflow if Kafka is down)
      await this.safeKafkaPublish(kafkaService.publishShipmentDispatched, {
        replenishment_id,
        shipment_id,
        tracking_number,
        carrier,
        estimated_delivery_date: estimated_delivery_date.toISOString(),
        shipped_quantity: order.shipped_quantity,
        stage: 'SHIPMENT_DISPATCHED'
      });

      return order;
    } catch (error) {
      logger.error('Error creating shipment:', error);
      throw error;
    }
  }

  // Stage 4: Stock Received at Store
  async confirmDelivery(deliveryData) {
    try {
      const { 
        replenishment_id, 
        received_quantity = null,
        received_by = 'STORE_EMPLOYEE' 
      } = deliveryData;

      // Find the replenishment order
      const order = await ReplenishmentOrder.findOne({ replenishment_id });
      if (!order) {
        throw new Error(`Replenishment order not found: ${replenishment_id}`);
      }

      if (order.status !== 'IN_TRANSIT') {
        throw new Error(`Invalid status for delivery confirmation: ${order.status}`);
      }

      // Use shipped quantity if received quantity not specified
      const actualReceivedQuantity = received_quantity || order.shipped_quantity;

      // Update store inventory
      const storeInventory = await Inventory.findOne({
        store_id: order.store_id,
        product_id: order.product_id
      });

      if (storeInventory) {
        await storeInventory.updateStock(actualReceivedQuantity, 'add');
        storeInventory.last_replenishment_date = new Date();
        await storeInventory.save();
      }

      // Update replenishment order
      order.received_at = new Date();
      order.received_by = received_by;
      order.received_quantity = actualReceivedQuantity;
      order.new_stock_level = storeInventory ? storeInventory.current_stock : actualReceivedQuantity;

      await order.updateStatus('COMPLETED', received_by, 'Stock received and inventory updated');

      logger.info(`✅ Delivery confirmed: ${replenishment_id}, New stock level: ${order.new_stock_level}`);

      // Publish final event to Kafka (safe - won't break workflow if Kafka is down)
      await this.safeKafkaPublish(kafkaService.publishStockReceived, {
        replenishment_id,
        received_quantity: actualReceivedQuantity,
        new_stock_level: order.new_stock_level,
        stage: 'STOCK_RECEIVED'
      });

      return order;
    } catch (error) {
      logger.error('Error confirming delivery:', error);
      throw error;
    }
  }

  // Event handlers for Kafka messages
  async processLowStockAlert(payload) {
    logger.info('Processing low stock alert from Kafka event');
    // This could trigger automatic transfer order creation
    // For now, just log the event
  }

  async processTransferOrderCreated(payload) {
    logger.info('Processing transfer order created from Kafka event');
    // This could trigger automatic shipment creation after picking
  }

  async processShipmentDispatched(payload) {
    logger.info('Processing shipment dispatched from Kafka event');
    // This could trigger notifications to store or customer
  }

  async processStockReceived(payload) {
    logger.info('Processing stock received from Kafka event');
    // This could trigger analytics updates or next order predictions
  }

  // Utility methods
  async getOrderById(replenishment_id) {
    return await ReplenishmentOrder.findOne({ replenishment_id });
  }

  async getOrdersByStore(store_id, status = null) {
    return await ReplenishmentOrder.findByStore(store_id, status);
  }

  async getActiveOrders() {
    return await ReplenishmentOrder.getActiveOrders();
  }

  async getOrderHistory(replenishment_id) {
    const order = await ReplenishmentOrder.findOne({ replenishment_id });
    return order ? order.status_history : null;
  }
}

module.exports = new ReplenishmentService();