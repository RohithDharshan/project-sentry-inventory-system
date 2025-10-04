const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Import configuration and middleware
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// Import routes
const replenishmentRoutes = require('./routes/replenishment');
const inventoryRoutes = require('./routes/inventory');

// Import Kafka services
const kafkaService = require('./services/kafkaService');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoStatus = (mongoose.connection.readyState === 1 || global.isMongoConnected) ? 'Connected' : 'Disconnected';
  const kafkaStatus = kafkaService.isConnected() ? 'Connected' : 'Disconnected';
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Project Sentry - Inventory Replenishment System',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      mongodb: mongoStatus,
      uri: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@') : 'Not configured'
    },
    messaging: {
      kafka: kafkaStatus,
      brokers: process.env.KAFKA_BROKERS || 'Not configured'
    }
  });
});

// API Routes
app.use('/api/v1/replenishment', replenishmentRoutes);
app.use('/api/v1/inventory', inventoryRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Project Sentry - Automated Inventory Replenishment System',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      replenishment: '/api/v1/replenishment',
      inventory: '/api/v1/inventory'
    },
    stages: [
      'Stage 1: Low-Stock Alert',
      'Stage 2: Transfer Order Creation', 
      'Stage 3: Shipment from Warehouse',
      'Stage 4: Stock Received at Store'
    ]
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist on this server`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await kafkaService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await kafkaService.disconnect();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // First, try to connect to MongoDB
    logger.info('🔄 Attempting MongoDB connection before starting server...');
    
    try {
      const conn = await connectDB();
      if (conn) {
        logger.info('✅ MongoDB connected successfully - starting server with real data');
        global.isMongoConnected = true;
      }
    } catch (dbError) {
      logger.warn('⚠️  MongoDB connection failed - starting in demo mode');
      logger.warn(`MongoDB error: ${dbError.message}`);
      global.isMongoConnected = false;
    }

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 Project Sentry server running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
      logger.info(`🏪 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (global.isMongoConnected) {
        logger.info('🎉 Server running with REAL MongoDB data!');
      } else {
        logger.warn('🚧 Server running in DEMO mode - API endpoints will return mock responses');
      }
    });

    // Initialize Kafka if MongoDB is connected
    if (global.isMongoConnected) {
      kafkaService.initialize()
        .then(() => logger.info('🔗 Kafka service initialized'))
        .catch((kafkaError) => logger.warn('⚠️  Kafka initialization failed:', kafkaError.message));
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;