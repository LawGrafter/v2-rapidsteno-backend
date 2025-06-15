const jwt = require('jsonwebtoken');
// const admin = require('../models/adminModel');

const SECRET_KEY = process.env.JWT_SECRET;

// exports.adminLogin = (req, res) => {
//   const { id, password } = req.body;

//   if (id === admin.adminId && password === admin.adminPassword) {
//     // Create a token valid for 1 hour
//     const token = jwt.sign({ id }, SECRET_KEY, { expiresIn: '1h' });
//     return res.status(200).json({ message: 'Login successful', token });
//   }

//   return res.status(401).json({ message: 'Invalid credentials' });
// };

const User = require('../models/userModel');
const admin = require('../models/adminModel');

//const SECRET_KEY = process.env.JWT_SECRET;

exports.adminLogin = (req, res) => {
  const { email, password } = req.body;

  // Ensure email and password match the hardcoded admin credentials
  if (email === admin.adminEmail && password === admin.adminPassword) {
    // Sign the token with email (NOT id) so your middleware can validate admin identity
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        email: admin.adminEmail,
      }
    });
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
    const paidUntil = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

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