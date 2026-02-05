const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;
const mongoose = require('mongoose');
const User = require('../models/userModel');
const admin = require('../models/adminModel');
const UserSession = require('../models/UserSession');
const SecurityEvent = require('../models/SecurityEvent');
const UserDictationSubmission = require('../models/UserDictationSubmission');
const { sendAdminOtp } = require('../utils/sendAdminOtp');
const { computeNextCycle, validatePlanAndMonths, computeCycleWithMonths, validatePlanAndDays, computeCycleWithDays } = require('../utils/subscriptionUtils');

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
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markUserAsPaid = async (req, res) => {
  try {
    const { userId, plan, duration } = req.body;
    // Basic implementation - actual logic might vary
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.subscriptionType = 'Paid';
    user.SubscriptionPlanType = plan;
    // Calculate expiry based on duration (assuming months)
    const months = parseInt(duration) || 1;
    user.paidUntil = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
    
    await user.save();
    res.status(200).json({ message: 'User marked as paid', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUserById = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.editUserByAdmin = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Prevent password update via this route
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOnlineUsers = async (req, res) => {
  try {
    // Users active in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const users = await User.find({ lastActiveDate: { $gte: fiveMinutesAgo } }).select('firstName lastName email lastActiveDate');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUserDictationSubmission = async (req, res) => {
  try {
    await UserDictationSubmission.findByIdAndDelete(req.params.submissionId);
    res.status(200).json({ message: 'Submission deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllUserDictationSubmissions = async (req, res) => {
  try {
    const submissions = await UserDictationSubmission.find().populate('user', 'firstName lastName email').sort({ submittedAt: -1 }).limit(100);
    res.status(200).json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUserCrmFields = async (req, res) => {
  try {
    const { DNC, Comment, LeadType } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { DNC, Comment, LeadType }, { new: true });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.adminSetUserSubscription = async (req, res) => {
  try {
    const { plan, durationMonths } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.subscriptionType = 'Paid';
    user.SubscriptionPlanType = plan;
    const months = parseInt(durationMonths) || 1;
    user.paidUntil = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
    
    await user.save();
    res.status(200).json({ message: 'Subscription updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.adminUpdateUserSubscriptionDates = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (endDate) user.paidUntil = new Date(endDate);
    
    await user.save();
    res.status(200).json({ message: 'Dates updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.adminWeeklyUserReport = async (req, res) => {
  try {
    const userId = req.params.id;
    // Fetch stats for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const submissions = await UserDictationSubmission.find({
      user: userId,
      submittedAt: { $gte: sevenDaysAgo }
    });

    const count = submissions.length;
    const totalAccuracy = submissions.reduce((sum, s) => sum + (s.accuracy || 0), 0);
    const accuracy = count ? (totalAccuracy / count).toFixed(2) : 0;
    
    // Aggregate mistakes
    let spellingMistakes = 0, missingWords = 0, extraWords = 0, capitalMistakes = 0;
    submissions.forEach(s => {
      spellingMistakes += s.spellingMistakes || 0;
      missingWords += s.missingWords || 0;
      extraWords += s.extraWords || 0;
      capitalMistakes += s.capitalMistakes || 0;
    });

    res.status(200).json({
      count,
      accuracy,
      spellingMistakes,
      missingWords,
      extraWords,
      capitalMistakes,
      conclusion: 'Keep practicing to improve accuracy!'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Get User Device Report (Admin Only)
exports.getUserDeviceReport = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 0. Validate User ID Format
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid User ID format' });
    }

    // Validate User Existence
    const user = await User.findById(userId).select('firstName lastName email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 1. Aggregation for Device Activity
    const deviceStats = await UserSession.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$deviceId",
          deviceType: { $first: "$deviceType" },
          totalSessions: { $sum: 1 },
          lastActive: { $max: "$lastActive" },
          ips: { $addToSet: "$ipAddress" }
        }
      },
      { $sort: { lastActive: -1 } }
    ]);

    // 2. Aggregation for IP Networks (Unique IPs)
    const uniqueIps = await UserSession.distinct('ipAddress', { user: userId });

    // 3. Get Security Events (DEVICE_MISMATCH)
    const securityEvents = await SecurityEvent.find({ 
      user: userId,
      eventType: 'DEVICE_MISMATCH'
    }).sort({ timestamp: -1 }).limit(50).lean();

    // 4. Suspicious Flag Logic
    // Check if multiple devices were used in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentDevices = await UserSession.distinct('deviceId', {
      user: userId,
      lastActive: { $gte: fifteenMinutesAgo }
    });
    
    const isRapidSwitching = recentDevices.length > 1;
    const isExcessiveDevices = deviceStats.length > 2; // More than 2 unique devices total
    const isExcessiveIps = uniqueIps.length > 2; // More than 2 unique IPs total
    
    const isSuspicious = isRapidSwitching || isExcessiveDevices || isExcessiveIps;
    
    let suspiciousReason = [];
    if (isRapidSwitching) suspiciousReason.push('Multiple devices detected within 15 minutes');
    if (isExcessiveDevices) suspiciousReason.push('Excessive number of unique devices (>2)');
    if (isExcessiveIps) suspiciousReason.push('Excessive number of unique IPs (>2)');

    // Construct Report
    const report = {
      user: {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      },
      summary: {
        totalUniqueDevices: deviceStats.length,
        totalUniqueIps: uniqueIps.length,
        isSuspicious: isSuspicious,
        suspiciousReason: suspiciousReason.length > 0 ? suspiciousReason.join(' | ') : null
      },
      devices: deviceStats.map(d => ({
        deviceId: d._id,
        deviceType: d.deviceType || 'Unknown',
        totalSessions: d.totalSessions,
        lastSeen: d.lastActive,
        associatedIps: d.ips
      })),
      securityEvents: securityEvents,
      generatedAt: new Date()
    };

    res.status(200).json(report);

  } catch (error) {
    console.error('Error generating device report:', error);
    res.status(500).json({ message: 'Server error generating report' });
  }
};

// ✅ Get Users with Multiple Devices (>2)
exports.getMultiDeviceUsers = async (req, res) => {
  try {
    const multiDeviceUsers = await UserSession.aggregate([
      {
        $group: {
          _id: "$user",
          uniqueDevices: { $addToSet: "$deviceId" },
          lastActive: { $max: "$lastActive" }
        }
      },
      {
        $project: {
          _id: 1,
          deviceCount: { $size: "$uniqueDevices" },
          lastActive: 1,
          uniqueDevices: 1
        }
      },
      {
        $match: {
          deviceCount: { $gt: 2 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"
      },
      {
        $project: {
          _id: 1,
          name: { $concat: ["$userInfo.firstName", " ", "$userInfo.lastName"] },
          email: "$userInfo.email",
          deviceCount: 1,
          lastActive: 1
        }
      },
      { $sort: { deviceCount: -1 } }
    ]);

    res.status(200).json(multiDeviceUsers);
  } catch (error) {
    console.error('Error fetching multi-device users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
