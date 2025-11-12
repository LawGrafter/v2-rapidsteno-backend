// const cron = require('node-cron');
// const User = require('../models/userModel');

// // Run every minute
// cron.schedule('* * * * *', async () => {
//   try {
//     const now = new Date();

//     // 🔹 1. Expire Trial Users
//     const expiredTrialUsers = await User.find({
//       subscriptionType: 'Trial',
//       trialExpiresAt: { $lt: now }
//     });

//     for (const user of expiredTrialUsers) {
//       user.subscriptionType = 'Unpaid';
//       user.trialExpiresAt = undefined;

//       user.subscriptionHistory.push({
//         type: 'Trial',
//         startDate: new Date(user.createdAt),
//         endDate: now
//       });

//       await user.save();
//       console.log(`⏳ Trial expired for: ${user.email}`);
//     }

//     // 🔹 2. Expire Paid Users
//     const expiredPaidUsers = await User.find({
//       subscriptionType: 'Paid',
//       paidUntil: { $lt: now }
//     });

//     for (const user of expiredPaidUsers) {
//       user.subscriptionType = 'Unpaid';
//       user.paidUntil = undefined;

//       user.subscriptionHistory.push({
//         type: 'Paid',
//         startDate: new Date(now.getTime() - 5 * 60 * 1000), // Approx 5 min ago
//         endDate: now
//       });

//       await user.save();
//       console.log(`💰 Paid access expired for: ${user.email}`);
//     }

//   } catch (error) {
//     console.error('❌ Subscription expiry cron error:', error);
//   }
// });

const cron = require('node-cron');
const User = require('../models/userModel');
const connectDB = require('../config/db');

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    // ✅ Ensure DB is connected before running queries (safe on serverless due to caching)
    await connectDB();
    const now = new Date();

    // 🔹 1. Expire Trial Users (batched)
    const expiredTrialUsers = await User.find({
      subscriptionType: 'Trial',
      trialExpiresAt: { $lt: now }
    }).limit(50); // Limit to avoid overloading MongoDB

    if (expiredTrialUsers.length > 0) {
      const trialBulkOps = expiredTrialUsers.map(user => ({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              subscriptionType: 'Unpaid'
            },
            $unset: {
              trialExpiresAt: ""
            },
            $push: {
              subscriptionHistory: {
                type: 'Trial',
                startDate: user.createdAt,
                endDate: now
              }
            }
          }
        }
      }));
      await User.bulkWrite(trialBulkOps);
      console.log(`⏳ Trial expired for ${expiredTrialUsers.length} users`);
    }

    // 🔹 2. Expire Paid Users (batched)
    const expiredPaidUsers = await User.find({
      subscriptionType: 'Paid',
      paidUntil: { $lt: now }
    }).limit(50); // Limit to avoid long-running cron

    if (expiredPaidUsers.length > 0) {
      const paidBulkOps = expiredPaidUsers.map(user => ({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              subscriptionType: 'Unpaid'
            },
            $unset: {
              paidUntil: ""
            },
            $push: {
              subscriptionHistory: {
                type: 'Paid',
                startDate: new Date(now.getTime() - 5 * 60 * 1000), // Adjust if needed
                endDate: now
              }
            }
          }
        }
      }));
      await User.bulkWrite(paidBulkOps);
      console.log(`💰 Paid access expired for ${expiredPaidUsers.length} users`);
    }

  } catch (error) {
    console.error('❌ Subscription expiry cron error:', error);
  }
});
