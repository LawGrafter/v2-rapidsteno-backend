// dropPhoneIndex.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // ✅ Load from parent folder

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI not defined in .env file");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ Connected to MongoDB: ${mongoose.connection.host}`);

    const result = await mongoose.connection.db.collection('users').dropIndex('phone_1');
    console.log('✅ Dropped index:', result);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
};

run();
