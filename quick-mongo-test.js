#!/usr/bin/env node

// Quick server with forced MongoDB connection
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

let isMongoConnected = false;

// Force MongoDB connection with detailed logging
async function connectMongoDB() {
  console.log('🔗 Forcing MongoDB connection...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 15000,
      connectTimeoutMS: 10000,
      maxPoolSize: 3,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    isMongoConnected = true;
    
    // Test query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 Collections found:', collections.length);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    isMongoConnected = false;
    return false;
  }
}

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    mongodb: isMongoConnected ? 'Connected' : 'Disconnected',
    database: mongoose.connection.name || 'N/A',
    collections: isMongoConnected ? 'Available' : 'N/A'
  });
});

// Simple inventory endpoint
app.get('/api/v1/inventory', async (req, res) => {
  if (!isMongoConnected) {
    return res.json({
      success: true,
      message: 'Demo mode - MongoDB not connected',
      data: [{ demo: 'This would be real data if MongoDB was connected' }]
    });
  }
  
  try {
    // Real MongoDB query
    const inventoryData = await mongoose.connection.db.collection('inventories').find({}).limit(5).toArray();
    
    res.json({
      success: true,
      message: 'Real data from MongoDB!',
      count: inventoryData.length,
      data: inventoryData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database query failed',
      error: error.message
    });
  }
});

// Start server and connect MongoDB
async function startServer() {
  // First connect to MongoDB
  const mongoConnected = await connectMongoDB();
  
  if (mongoConnected) {
    console.log('🎉 MongoDB connected - starting server with real data');
  } else {
    console.log('⚠️  Starting server in demo mode');
  }
  
  app.listen(3000, () => {
    console.log('🚀 Quick test server running on port 3000');
    console.log('📊 Test: curl http://localhost:3000/health');
    console.log('📦 Test: curl http://localhost:3000/api/v1/inventory');
  });
}

startServer();