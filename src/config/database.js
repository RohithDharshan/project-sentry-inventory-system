const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/project-sentry';
    
    logger.info(`🔗 Connecting to MongoDB...`);
    logger.info(`📍 URI: ${mongoURI.replace(/\/\/[^@]+@/, '//***:***@')}`);
    
    const options = {
      serverSelectionTimeoutMS: 15000, // Shorter timeout for faster feedback
      socketTimeoutMS: 20000, // Shorter socket timeout
      connectTimeoutMS: 15000, // Shorter connection timeout
      maxPoolSize: 5, // Smaller pool for better connection handling
      retryWrites: true,
      w: 'majority'
    };

    const conn = await mongoose.connect(mongoURI, options);
    
    logger.info(`📊 MongoDB Connected: ${conn.connection.host}`);
    logger.info(`🗄️  Database: ${conn.connection.name}`);
    
    // Enable Mongoose debugging for detailed query logging
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName, method, query, doc, options) => {
        logger.info('🔍 MONGODB OPERATION', {
          collection: collectionName,
          method: method,
          query: query,
          document: doc && JSON.stringify(doc).length < 500 ? doc : 'Document too large to log',
          options: options,
          timestamp: new Date().toISOString()
        });
      });
    }
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('🔴 MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('🟡 MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('🟢 MongoDB reconnected');
    });
    
    return conn;
  } catch (error) {
    const safeURI = process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/[^@]+@/, '//***:***@') : 'URI not found';
    logger.error('MongoDB connection failed:', {
      message: error.message,
      name: error.name,
      uri: safeURI
    });
    
    // In development, continue without MongoDB for API structure testing
    if (process.env.NODE_ENV === 'development') {
      logger.warn('🚧 Running in development mode without MongoDB - API endpoints will return mock responses');
      return null;
    } else {
      throw error; // Re-throw in production
    }
  }
};

module.exports = connectDB;