const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;
const User = require('../models/userModel');
const admin = require('../models/adminModel');
const { sendAdminOtp } = require('../utils/sendAdminOtp');
const { computeNextCycle, validatePlanAndMonths, computeCycleWithMonths } = require('../utils/subscriptionUtils');

const otpStore = {}; // In-memory OTP store

// Step 1: Email & password check, then send OTP
exports.adminLoginRequestOtp = async (req, res) => {
  const { email, password } = req.body;

  if (email === admin.adminEmail && password === admin.adminPassword) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    otpStore[email] = { otp, expiresAt };

    try {
      await sendAdminOtp(email, otp);
      return res.status(200).json({ message: 'OTP sent to your email' });
    } catch (err) {
      console.error('❌ Error sending admin OTP:', err);
      return res.status(500).json({ message: 'Failed to send OTP' });
    }
  }

  return res.status(401).json({ message: 'Invalid credentials' });
};

// Step 2: Verify OTP and issue JWT
exports.adminVerifyOtp = (req, res) => {
  const { email, otp } = req.body;
  const stored = otpStore[email];

  if (!stored) return res.status(400).json({ message: 'No OTP requested' });
  if (stored.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
  if (stored.otp !== otp) return res.status(401).json({ message: 'Invalid OTP' });

  // OTP valid, clear from memory
  delete otpStore[email];

  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '7h' });

  return res.status(200).json({
    message: 'Login successful',
    token,
    admin: { email }
  });
};


// exports.adminLogin = (req, res) => {
//   const { email, password } = req.body;

//   // Ensure email and password match the hardcoded admin credentials
//   if (email === admin.adminEmail && password === admin.adminPassword) {
//     // Sign the token with email (NOT id) so your middleware can validate admin identity
//     const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });

//     return res.status(200).json({
//       message: 'Login successful',
//       token,
//       admin: {
//         email: admin.adminEmail,
//       }
//     });
//   }

//   return res.status(401).json({ message: 'Invalid credentials' });
// };

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  // Validate admin credentials
  if (email === admin.adminEmail && password === admin.adminPassword) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    otpStore[email] = { otp, expiresAt };

    try {
      await sendAdminOtp(email, otp);
      return res.status(200).json({
        message: 'OTP sent to your email. Please verify to complete login.',
      });
    } catch (err) {
      console.error('❌ Error sending admin OTP:', err);
      return res.status(500).json({ message: 'Failed to send OTP' });
    }
  }

  return res.status(401).json({ message: 'Invalid credentials' });
};


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error });
  }
};

// PUT /api/admin/users/:id/crm
// Updates only CRM/Admin fields safely
exports.updateUserCrmFields = async (req, res) => {
  try {
    const userId = req.params.id;

    // Whitelisted CRM fields
    const allowed = ['DNC', 'Comment', 'SubscriptionPlanType', 'AmountPaid', 'LeadType'];
    const updates = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = key === 'AmountPaid' && req.body[key] !== undefined
          ? Number(req.body[key])
          : req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({ message: 'CRM fields updated successfully', user });
  } catch (error) {
    console.error('Admin CRM update error:', error);
    return res.status(500).json({ message: 'Failed to update CRM fields', error });
  }
};

// ✅ Delete User by ID — Admin Only
exports.deleteUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.deleteOne();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("Admin Delete Error:", error);
    res.status(500).json({ message: 'Failed to delete user', error });
  }
};


// ✅ Admin marks user as paid (for 30 days)
// exports.markUserAsPaid = async (req, res) => {
//   try {
//     const { userId } = req.body;

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     user.subscriptionType = 'Paid';
//     user.paidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
//     await user.save();

//     res.status(200).json({ message: 'User subscription updated to Paid for 30 days.' });
//   } catch (error) {
//     console.error('Admin update error:', error);
//     res.status(500).json({ message: 'Failed to update subscription', error });
//   }
// };
// ✅ Admin marks user as Paid (⏱ 5-minute access)
exports.markUserAsPaid = async (req, res) => {
  try {
    const { userId, planType } = req.body; // optional planType override: 'Gold' | 'Silver'
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Compute next cycle using user's SubscriptionPlanType or override
    const { startDate, endDate, days } = computeNextCycle(user, planType);

    user.subscriptionType = 'Paid';
    user.paidUntil = endDate;

    // ⏳ Log history for future reference
    user.subscriptionHistory.push({
      type: 'Paid',
      startDate: startDate,
      endDate: endDate,
    });

    await user.save();

    res.status(200).json({
      message: `User marked as Paid for ${days} days. Access valid until ${endDate.toISOString()}`,
    });

  } catch (error) {
    console.error('Admin update error:', error);
    res.status(500).json({ message: 'Failed to update subscription', error });
  }
};

// GET /api/admin/online-users
exports.getOnlineUsers = async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);

    const onlineUsers = await User.find({
      lastActiveDate: { $gte: fiveMinutesAgo },
      isActive: true,
    }).select('firstName lastName email lastActiveDate subscriptionType');

    res.status(200).json({
      count: onlineUsers.length,
      users: onlineUsers
    });
  } catch (error) {
    console.error("Error fetching online users:", error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

// PUT /api/admin/edit-user/:id
exports.editUserByAdmin = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Admin edit error:", error);
    res.status(500).json({ message: "Failed to update user", error });
  }
};

// ✅ Admin: Set user subscription plan and duration
exports.adminSetUserSubscription = async (req, res) => {
  try {
    const userId = req.params.id;
    const { planType, months, startDate } = req.body;

    const validation = validatePlanAndMonths(planType, months);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.reason });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const cycle = computeCycleWithMonths(startDate, months);

    user.subscriptionType = 'Paid';
    user.SubscriptionPlanType = validation.plan; // store normalized
    user.paidUntil = cycle.endDate;

    user.subscriptionHistory.push({
      type: 'Paid',
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    });

    await user.save();

    return res.status(200).json({
      message: 'Subscription updated successfully',
      user: {
        id: user._id,
        email: user.email,
        subscriptionType: user.subscriptionType,
        planType: user.SubscriptionPlanType,
        paidUntil: user.paidUntil,
      }
    });
  } catch (error) {
    console.error('Admin set subscription error:', error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// ✅ Admin: Update user subscription start/end dates (flexible)
exports.adminUpdateUserSubscriptionDates = async (req, res) => {
  try {
    const userId = req.params.id;
    const { startDate, endDate, months } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;

    if (!end) {
      // If end not provided, compute from months or default 30 days
      const monthsNum = months ? Number(months) : 1;
      const cycle = computeCycleWithMonths(start || new Date(), monthsNum);
      start = cycle.startDate;
      end = cycle.endDate;
    }

    // Apply updates
    if (start) {
      user.subscriptionHistory.push({ type: 'Paid', startDate: start, endDate: end });
    }
    user.subscriptionType = 'Paid';
    user.paidUntil = end;

    await user.save();

    return res.status(200).json({
      message: 'Subscription dates updated successfully',
      user: {
        id: user._id,
        email: user.email,
        paidUntil: user.paidUntil,
        lastHistory: user.subscriptionHistory[user.subscriptionHistory.length - 1]
      }
    });
  } catch (error) {
    console.error('Admin update subscription dates error:', error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};
