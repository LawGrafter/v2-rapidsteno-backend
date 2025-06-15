// // jobs/trialExpiryJob.js
// const cron = require('node-cron');
// const User = require('../models/userModel');

// // Run every minute
// cron.schedule('* * * * *', async () => {
//   try {
//     const now = new Date();

//     // Find all users whose trial has expired
//     const expiredUsers = await User.find({
//       subscriptionType: 'Trial',
//       trialExpiresAt: { $lt: now }
//     });

//     for (const user of expiredUsers) {
//       user.subscriptionType = 'Unpaid';
//       user.trialExpiresAt = undefined;

//       await user.save();
//       console.log(`⏳ Trial expired for: ${user.email}`);
//     }
//   } catch (error) {
//     console.error('❌ Trial expiry cron error:', error);
//   }
// });
// jobs/trialAndPaidExpiryJob.js
const cron = require('node-cron');
const User = require('../models/userModel');

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();

    // 🔹 1. Expire Trial Users
    const expiredTrialUsers = await User.find({
      subscriptionType: 'Trial',
      trialExpiresAt: { $lt: now }
    });

    for (const user of expiredTrialUsers) {
      user.subscriptionType = 'Unpaid';
      user.trialExpiresAt = undefined;

      user.subscriptionHistory.push({
        type: 'Trial',
        startDate: new Date(user.createdAt),
        endDate: now
      });

      await user.save();
      console.log(`⏳ Trial expired for: ${user.email}`);
    }

    // 🔹 2. Expire Paid Users
    const expiredPaidUsers = await User.find({
      subscriptionType: 'Paid',
      paidUntil: { $lt: now }
    });

    for (const user of expiredPaidUsers) {
      user.subscriptionType = 'Unpaid';
      user.paidUntil = undefined;

      user.subscriptionHistory.push({
        type: 'Paid',
        startDate: new Date(now.getTime() - 5 * 60 * 1000), // Approx 5 min ago
        endDate: now
      });

      await user.save();
      console.log(`💰 Paid access expired for: ${user.email}`);
    }

  } catch (error) {
    console.error('❌ Subscription expiry cron error:', error);
  }
});
