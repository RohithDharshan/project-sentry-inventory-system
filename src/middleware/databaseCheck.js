const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Middleware to check if MongoDB is connected
const checkDatabaseConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    // MongoDB not connected - return demo/mock response for development
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`Demo mode: ${req.method} ${req.path} - MongoDB not connected`);
      
      // Add demo flag to request
      req.demoMode = true;
      req.demoResponse = {
        success: true,
        message: 'Demo mode - MongoDB not connected',
        note: 'This is a mock response. Start MongoDB to use real data.',
        timestamp: new Date().toISOString()
      };
    } else {
      return res.status(503).json({
        success: false,
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please check database configuration.',
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
};

module.exports = checkDatabaseConnection;