const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;
const User = require('../models/userModel');
const admin = require('../models/adminModel');
const { sendAdminOtp } = require('../utils/sendAdminOtp');

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

  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });

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
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
   // const paidUntil = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
   const paidUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

    user.subscriptionType = 'Paid';
    user.paidUntil = paidUntil;

    // ⏳ Log history for future reference
    user.subscriptionHistory.push({
      type: 'Paid',
      startDate: now,
      endDate: paidUntil,
    });

    await user.save();

    res.status(200).json({
      message: `User marked as Paid. Access valid until ${paidUntil.toLocaleTimeString()}`,
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
