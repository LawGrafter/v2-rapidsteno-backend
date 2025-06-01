const User = require('../models/userModel');

// This function will:
// 1. Deactivate users after 15 days of registration (for first-time Free users)
// 2. Deactivate users again every 30 days after that if still inactive
const autoDeactivateUsers = async () => {
  try {
    const now = new Date();

    // Fetch all active users
    const users = await User.find({ isActive: true });

    for (const user of users) {
      const { createdAt, lastActiveDate, subscriptionType, isRepeatUser } = user;

      // First-time user — check for 15-day expiration
      const isFirstCycle = !isRepeatUser && subscriptionType === 'Free';
      const firstCycleEnd = new Date(createdAt);
      firstCycleEnd.setDate(firstCycleEnd.getDate() + 15);

      // Recurring cycle — every 30 days after lastActiveDate
      const nextCycleEnd = new Date(lastActiveDate);
      nextCycleEnd.setDate(nextCycleEnd.getDate() + 30);

      if (
        (isFirstCycle && now > firstCycleEnd) ||
        (!isFirstCycle && now > nextCycleEnd)
      ) {
        user.isActive = false;
        user.isRepeatUser = true; // Mark them for future 30-day cycles
        await user.save();

        console.log(`🔒 User ${user.email} deactivated`);
      }
    }

    console.log(`✅ User deactivation check complete at ${now.toISOString()}`);
  } catch (error) {
    console.error("❌ Error in autoDeactivateUsers:", error);
  }
};

module.exports = autoDeactivateUsers;
