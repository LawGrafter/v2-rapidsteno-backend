// // module.exports = connectDB;
// const mongoose = require('mongoose');
// require('dotenv').config();

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log('✅ MongoDB Connected...');
//   } catch (error) {
//     console.error('❌ MongoDB Connection Error:', error);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;

// config/db.js
// const mongoose = require('mongoose');
// require('dotenv').config();

// const MONGODB_URI = process.env.MONGO_URI;

// if (!MONGODB_URI) {
//   throw new Error('❌ Missing MONGO_URI in environment variables');
// }

// // Reuse cached connection in serverless (Vercel, Lambda, etc.)
// let cached = global._mongoose;
// if (!cached) {
//   cached = global._mongoose = { conn: null, promise: null };
// }

// const connectDB = async () => {
//   if (cached.conn) return cached.conn;

//   if (!cached.promise) {
//     mongoose.set('strictQuery', true);
//     cached.promise = mongoose.connect(MONGODB_URI, {
//       bufferCommands: false,          // 🧠 Prevent "buffering timed out" errors
//       maxPoolSize: 5,                 // 🧩 Small pool for serverless
//       serverSelectionTimeoutMS: 10000, // ⏱ Wait max 10s for DB selection
//       socketTimeoutMS: 20000,          // ⏱ Socket inactivity timeout
//       connectTimeoutMS: 10000,         // ⏱ Initial connect timeout
//       autoIndex: false,                // 🚀 Faster startup (disable in prod)
//     })
//       .then((mongooseInstance) => {
//         console.log('✅ MongoDB connected successfully');
//         return mongooseInstance;
//       })
//       .catch((err) => {
//         console.error('❌ MongoDB connection failed:', err.message);
//         throw err;
//       });
//   }

//   cached.conn = await cached.promise;
//   return cached.conn;
// };

// module.exports = connectDB;


const mongoose = require("mongoose");
require("dotenv").config();

if (!process.env.MONGO_URI) {
  throw new Error("❌ Missing MONGO_URI in environment variables");
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    mongoose.set("strictQuery", true);

    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 20000,
        connectTimeoutMS: 10000,
        bufferCommands: true,
      })
      .then((mongooseInstance) => {
        console.log("✅ MongoDB connected");
        return mongooseInstance;
      })
      .catch((err) => {
        console.error("❌ MongoDB connection failed:", err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
