const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Reuse existing connection in serverless for performance
    if (mongoose.connection.readyState >= 1) {
      return;
    }

    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.warn('⚠️ MONGO_URI is not set. Skipping DB connect.');
      return; // Do not crash serverless on missing env; handle at route level if needed
    }

    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected...');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    // Do NOT exit in serverless; let the request handler decide response
    // throw error; // Optional: surface error to callers
  }
};

module.exports = connectDB;
