const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

class KafkaService {
  constructor() {
    this.kafka = null;
    this.producer = null;
    this.consumer = null;
    this.connected = false;
    
    // Topic names for the 4-stage workflow
    this.topics = {
      LOW_STOCK_ALERT: 'sentry.low-stock-alert',
      TRANSFER_ORDER_CREATED: 'sentry.transfer-order-created',
      SHIPMENT_DISPATCHED: 'sentry.shipment-dispatched',
      STOCK_RECEIVED: 'sentry.stock-received'
    };
  }

  async initialize() {
    try {
      // Initialize Kafka client
      this.kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || 'project-sentry',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        connectionTimeout: 10000,
        authenticationTimeout: 10000,
        reauthenticationThreshold: 10000,
        logLevel: 1, // ERROR level
      });

      // Create producer
      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000,
      });

      // Create consumer
      this.consumer = this.kafka.consumer({
        groupId: process.env.KAFKA_GROUP_ID || 'sentry-consumer-group',
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });

      // Connect to Kafka
      await this.producer.connect();
      await this.consumer.connect();

      logger.info('🔗 Kafka service initialized successfully');
      this.connected = true;

      // Set up event handlers
      this.setupEventHandlers();

    } catch (error) {
      logger.error('Failed to initialize Kafka service:', error);
      throw error;
    }
  }

  async setupEventHandlers() {
    try {
      // Subscribe to all topics
      await this.consumer.subscribe({
        topics: Object.values(this.topics),
        fromBeginning: false
      });

      // Start consuming messages
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const payload = JSON.parse(message.value.toString());
            logger.info(`📨 Received Kafka event: ${topic}`, { payload });

            // Route to appropriate handler
            await this.handleEvent(topic, payload);

          } catch (error) {
            logger.error(`Error processing message from topic ${topic}:`, error);
          }
        },
      });

      logger.info('🎯 Kafka event handlers set up successfully');
    } catch (error) {
      logger.error('Failed to set up Kafka event handlers:', error);
      throw error;
    }
  }

  async handleEvent(topic, payload) {
    const replenishmentService = require('./replenishmentService');

    switch (topic) {
      case this.topics.LOW_STOCK_ALERT:
        logger.info('🚨 Processing Low Stock Alert event');
        await replenishmentService.processLowStockAlert(payload);
        break;

      case this.topics.TRANSFER_ORDER_CREATED:
        logger.info('📦 Processing Transfer Order Created event');
        await replenishmentService.processTransferOrderCreated(payload);
        break;

      case this.topics.SHIPMENT_DISPATCHED:
        logger.info('🚚 Processing Shipment Dispatched event');
        await replenishmentService.processShipmentDispatched(payload);
        break;

      case this.topics.STOCK_RECEIVED:
        logger.info('✅ Processing Stock Received event');
        await replenishmentService.processStockReceived(payload);
        break;

      default:
        logger.warn(`Unknown topic: ${topic}`);
    }
  }

  async publishEvent(topic, payload, key = null) {
    if (!this.connected) {
      throw new Error('Kafka service not connected');
    }

    try {
      const message = {
        topic,
        messages: [{
          key: key || payload.replenishment_id || payload.id,
          value: JSON.stringify({
            ...payload,
            timestamp: new Date().toISOString(),
            source: 'project-sentry'
          }),
          timestamp: Date.now().toString()
        }]
      };

      const result = await this.producer.send(message);
      logger.info(`📤 Published event to ${topic}:`, { 
        key: message.messages[0].key,
        payload: payload 
      });
      
      return result;
    } catch (error) {
      logger.error(`Failed to publish event to ${topic}:`, error);
      throw error;
    }
  }

  // Convenience methods for each stage
  async publishLowStockAlert(payload) {
    return this.publishEvent(this.topics.LOW_STOCK_ALERT, payload);
  }

  async publishTransferOrderCreated(payload) {
    return this.publishEvent(this.topics.TRANSFER_ORDER_CREATED, payload);
  }

  async publishShipmentDispatched(payload) {
    return this.publishEvent(this.topics.SHIPMENT_DISPATCHED, payload);
  }

  async publishStockReceived(payload) {
    return this.publishEvent(this.topics.STOCK_RECEIVED, payload);
  }

  async disconnect() {
    try {
      if (this.producer) {
        await this.producer.disconnect();
      }
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      this.connected = false;
      logger.info('🔌 Kafka service disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka service:', error);
    }
  }

  isConnected() {
    return this.connected;
  }

  getTopics() {
    return this.topics;
  }
}

// Export singleton instance
module.exports = new KafkaService();