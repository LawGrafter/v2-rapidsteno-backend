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

// ✅ Admin users for WhatsApp OTP login
const ADMIN_USERS = [
  { id: 'aquib', name: 'Mohammad Aquib', phone: '916394058460' },
  { id: 'tarun', name: 'Tarun Sharma',   phone: '918318919787' },
];

// ✅ Send OTP via AI Sensy WhatsApp
const sendWhatsAppOtp = async (phone, name, otp) => {
  const payload = {
    apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NGQxYWFkNmY3MGEyMGQ3OWIyMDFkZCIsIm5hbWUiOiJSYXBpZCBTdGVubyIsImFwcE5hbWUiOiJBaVNlbnN5IiwiY2xpZW50SWQiOiI2OTRkMWFhZDZmNzBhMjBkNzliMjAxZDgiLCJhY3RpdmVQbGFuIjoiRlJFRV9GT1JFVkVSIiwiaWF0IjoxNzY2NjYwNzgxfQ.oBhYKecjriIJ6Zih3ZxUus9S-7v7__OxxZjKVE7gRxE",
    campaignName: "rapid_steno_study_room_login_otp",
    destination: phone,
    userName: name,
    templateParams: [otp],
    source: "admin-login",
    media: {},
    buttons: [
      {
        type: "button",
        sub_type: "url",
        index: 0,
        parameters: [{ type: "text", text: otp }]
      }
    ],
    carouselCards: [],
    location: {},
    attributes: {},
    paramsFallbackValue: { FirstName: name.split(' ')[0] }
  };

  const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log('📱 AI Sensy WhatsApp response:', data);
  return data;
};

// ✅ Step 1: Admin selects themselves → send WhatsApp OTP
exports.requestAdminWhatsAppOtp = async (req, res) => {
  const { adminId } = req.body;

  const adminUser = ADMIN_USERS.find(a => a.id === adminId);
  if (!adminUser) return res.status(400).json({ message: 'Invalid admin selection' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  otpStore[adminUser.phone] = { otp, expiresAt, adminId };
  console.log(`📱 Sending WhatsApp OTP to ${adminUser.name} (${adminUser.phone}): ${otp}`);

  try {
    await sendWhatsAppOtp(adminUser.phone, adminUser.name, otp);
    return res.status(200).json({
      message: 'OTP sent to your WhatsApp',
      phone: adminUser.phone.slice(-4), // last 4 digits only for display
      name: adminUser.name
    });
  } catch (err) {
    console.error('❌ Error sending WhatsApp OTP:', err);
    return res.status(500).json({ message: 'Failed to send WhatsApp OTP' });
  }
};

// ✅ Step 2: Verify WhatsApp OTP and issue JWT
exports.verifyAdminWhatsAppOtp = (req, res) => {
  const { adminId, otp } = req.body;

  const adminUser = ADMIN_USERS.find(a => a.id === adminId);
  if (!adminUser) return res.status(400).json({ message: 'Invalid admin selection' });

  const stored = otpStore[adminUser.phone];
  if (!stored) return res.status(400).json({ message: 'No OTP requested. Please request a new OTP.' });
  if (stored.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
  if (stored.otp !== otp.trim()) return res.status(401).json({ message: 'Incorrect OTP. Please try again.' });

  // OTP valid → clear from memory
  delete otpStore[adminUser.phone];

  const token = jwt.sign(
    { isAdmin: true, adminId: adminUser.id, name: adminUser.name },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  console.log(`✅ Admin ${adminUser.name} logged in via WhatsApp OTP`);

  return res.status(200).json({
    message: 'Login successful',
    token,
    admin: { id: adminUser.id, name: adminUser.name }
  });
};

// ✅ Get admin users list (public - for login screen)
exports.getAdminUsers = (req, res) => {
  const list = ADMIN_USERS.map(a => ({ id: a.id, name: a.name }));
  return res.status(200).json(list);
};

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

  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '24h' });

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
    console.log('📋 getAllUsers called');
    console.log('🔑 Admin from middleware:', req.admin);
    console.log('📊 Fetching users from database...');
    
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    console.log(`✅ Found ${users.length} users`);
    res.status(200).json(users);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markUserAsPaid = async (req, res) => {
  try {
    const { userId, plan, passType, duration, days, validity } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.subscriptionType = 'Paid';

    const finalPlan = plan || passType;
    if (finalPlan) {
        user.SubscriptionPlanType = finalPlan;
    }

    let addDays = 30;
    
    const explicitDays = days !== undefined && days !== null ? days : validity;

    if (explicitDays !== undefined && explicitDays !== null) {
        addDays = parseInt(explicitDays);
    } else if (duration !== undefined && duration !== null) {
        addDays = parseInt(duration) * 30;
    }

    user.paidUntil = new Date(Date.now() + addDays * 24 * 60 * 60 * 1000);
    
    const updatedUser = await user.save();
    res.status(200).json({ message: 'User marked as paid', user: updatedUser });
  } catch (error) {
    console.error('Mark User Paid Error:', error);
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
    const { plan, passType, durationMonths, days, validity } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.subscriptionType = 'Paid';
    const finalPlan = plan || passType;
    if (finalPlan) {
      user.SubscriptionPlanType = finalPlan;
    }
    let addDays = 30;
    const explicitDays = days !== undefined && days !== null ? days : validity;
    if (explicitDays !== undefined && explicitDays !== null) {
      addDays = parseInt(explicitDays);
    } else if (durationMonths !== undefined && durationMonths !== null) {
      const months = parseInt(durationMonths);
      addDays = months * 30;
    }
    user.paidUntil = new Date(Date.now() + addDays * 24 * 60 * 60 * 1000);
    
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

// ✅ Force logout a user (admin only) — clears sessionToken so next request is rejected
exports.adminForceLogoutUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Clear the sessionToken on the user — userMiddleware compares this field,
    // so wiping it immediately invalidates any active session.
    await User.findByIdAndUpdate(id, { $unset: { sessionToken: "" } });
    // Also deactivate all UserSession records for good measure
    const result = await UserSession.updateMany(
      { user: id, isActive: true },
      { $set: { isActive: false } }
    );
    console.log(`🔴 Admin force-logged out user ${id} — sessionToken cleared, ${result.modifiedCount} session(s) deactivated`);
    res.status(200).json({ message: 'User has been logged out successfully', sessionsCleared: result.modifiedCount });
  } catch (error) {
    console.error('Error force-logging out user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Send invoice email to user
exports.sendInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, months, discount } = req.body;

    // Fetch user details
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Plan pricing details (from pricing-details.md)
    const planPricing = {
      'gold': { name: 'Gold Pass', prices: { 1: 498, 3: 894, 6: 1596 } },
      'ahc': { name: 'AHC Pass', prices: { 1: 1299, 2: 1700, 3: 2100, 6: 3396 } },
      'hindi': { name: 'Hindi Pass', prices: { 1: 399, 3: 894 } },
      'pitman': { name: 'Pitman Beginner', prices: { 1: 399, 3: 777, 6: 1299 } },
      'pitman-beginner': { name: 'Pitman Beginner', prices: { 1: 399, 3: 777, 6: 1299 } },
      'spreadsheet': { name: 'Spreadsheet Pass', prices: { 1: 249 } },
      'exam': { name: 'All Exam Software', prices: { 1: 199, 3: 498 } },
      'jja': { name: 'JJA Pass', prices: { 1: 199, 3: 498 } },
      'ssc': { name: 'SSC Steno Pass', prices: { 1: 498, 3: 894, 6: 1596 } },
      'typing': { name: 'Typing Software', prices: { 1: 199, 3: 498, 6: 786 } },
    };

    const selectedPlan = planPricing[plan];
    if (!selectedPlan) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const basePrice = selectedPlan.prices[months] || selectedPlan.prices[3];
    const discountAmount = discount || 0;
    const finalPrice = Math.max(0, basePrice - discountAmount);

    // Calculate validity dates
    const validFrom = new Date();
    const validTo = new Date();
    validTo.setMonth(validTo.getMonth() + months);

    const formatDate = (date) => {
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${user._id.toString().slice(-6).toUpperCase()}`;

    // HTML Email Template
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - Rapid Steno</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Lexend', 'Tahoma', 'Segoe UI', Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 20px; }
    .container { max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(1,52,47,0.15); border: 1px solid #d1fae5; }
    .header { background: linear-gradient(135deg, #01342F 0%, #078F65 100%); padding: 30px; text-align: center; }
    .logo { max-width: 180px; height: auto; margin-bottom: 15px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .header h1 { color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 5px; }
    .header p { color: #e8f5f0; font-size: 14px; }
    .content { padding: 40px 30px; }
    .invoice-header { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e8f5f0; }
    .invoice-number { font-size: 13px; color: #7a9e98; }
    .invoice-number strong { color: #01342F; font-size: 16px; font-weight: 700; display: block; margin-top: 8px; word-break: break-all; }
    .invoice-date { font-size: 13px; color: #7a9e98; text-align: right; }
    .invoice-date strong { color: #01342F; font-size: 16px; font-weight: 700; display: block; margin-top: 8px; }
    .section-title { color: #01342F; font-size: 16px; font-weight: 700; margin: 25px 0 15px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-box { background: #f9fbfa; border-left: 4px solid #078F65; padding: 15px 20px; margin-bottom: 20px; border-radius: 6px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; align-items: center; }
    .info-label { color: #7a9e98; font-size: 14px; font-weight: 500; min-width: 90px; }
    .info-value { color: #01342F; font-size: 14px; font-weight: 600; text-align: right; flex: 1; margin-left: 10px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th { background: #01342F; color: #ffffff; padding: 12px; text-align: left; font-size: 13px; font-weight: 600; }
    .table td { padding: 12px; border-bottom: 1px solid #e8f5f0; font-size: 14px; color: #475569; }
    .table tr:last-child td { border-bottom: none; }
    .total-row { background: #f9fbfa; font-weight: 700; }
    .total-row td { color: #01342F; font-size: 16px; padding: 15px 12px; }
    .highlight { color: #078F65; font-weight: 700; font-size: 18px; }
    .footer { background: #f9fbfa; padding: 25px 30px; text-align: center; border-top: 2px solid #e8f5f0; }
    .footer p { color: #7a9e98; font-size: 13px; line-height: 1.6; margin: 5px 0; }
    .footer strong { color: #01342F; }
    .validity-box { background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); border: 2px solid #166534; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .validity-box p { color: #166534; font-size: 14px; font-weight: 600; margin: 5px 0; }
    .validity-box .dates { color: #01342F; font-size: 16px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <img src="https://ik.imagekit.io/rapidsteno/atvicon-logo.jpg" alt="Atvicon Technologies" class="logo">
      <h1>INVOICE</h1>
      <p>Rapid Steno Subscription</p>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Invoice Info -->
      <div class="invoice-header">
        <div class="invoice-number">
          <span>Invoice Number</span>
          <strong>${invoiceNumber}</strong>
        </div>
        <div class="invoice-date">
          <span>Date</span>
          <strong>${formatDate(new Date())}</strong>
        </div>
      </div>

      <!-- Billing From -->
      <div class="section-title">From</div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Company:</div><div class="info-value">Atvicon Technologies</div></div>
        <div class="info-row"><div class="info-label">Email:</div><div class="info-value">info@rapidsteno.com</div></div>
        <div class="info-row"><div class="info-label">Phone:</div><div class="info-value">+91 63940 58460</div></div>
        <div class="info-row"><div class="info-label">GST:</div><div class="info-value">09BZJPA3758E1ZD</div></div>
        <div class="info-row"><div class="info-label">Location:</div><div class="info-value">Prayagraj, Uttar Pradesh, India</div></div>
      </div>

      <!-- Billing To -->
      <div class="section-title">To</div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Name:</div><div class="info-value">${user.firstName} ${user.lastName}</div></div>
        <div class="info-row"><div class="info-label">Email:</div><div class="info-value">${user.email}</div></div>
        <div class="info-row"><div class="info-label">Phone:</div><div class="info-value">${user.phone || 'N/A'}</div></div>
      </div>

      <!-- Plan Details -->
      <div class="section-title">Plan Details</div>
      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Duration</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${selectedPlan.name}</strong></td>
            <td style="text-align: center;">${months} Month${months > 1 ? 's' : ''}</td>
            <td style="text-align: right;">₹${basePrice.toLocaleString('en-IN')}</td>
          </tr>
          ${discountAmount > 0 ? `
          <tr>
            <td colspan="2"><strong>Discount Applied</strong></td>
            <td style="text-align: right; color: #dc2626;">- ₹${discountAmount.toLocaleString('en-IN')}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td colspan="2"><strong>Total Amount Paid</strong></td>
            <td style="text-align: right;" class="highlight">₹${finalPrice.toLocaleString('en-IN')}</td>
          </tr>
        </tbody>
      </table>

      <!-- Validity Period -->
      <div class="validity-box">
        <p>Subscription Validity</p>
        <p class="dates">${formatDate(validFrom)} - ${formatDate(validTo)}</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Thank you for choosing Rapid Steno!</strong></p>
      <p>For any queries, contact us at <strong>info@rapidsteno.com</strong> or call <strong>+91 63940 58460</strong></p>
      <p style="margin-top: 15px; font-size: 12px;">This is a computer-generated invoice and does not require a signature.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using nodemailer
    const nodemailer = require('nodemailer');
    
    // Check if email credentials are configured
    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      console.error('❌ Email credentials not configured. Please set SMTP_USER and SMTP_PASS in .env file');
      return res.status(500).json({ 
        success: false, 
        message: 'Email service not configured. Please contact administrator to set up email credentials.',
        error: 'Missing SMTP_USER or SMTP_PASS environment variables'
      });
    }
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: `"Rapid Steno" <${emailUser}>`,
      to: user.email,
      subject: `Hey ${user.firstName}, here is your invoice for Rapid Steno ${selectedPlan.name}`,
      html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Invoice email sent successfully to ${user.email} for ${selectedPlan.name} - ${months} month(s)`);
    res.status(200).json({ 
      success: true, 
      message: `Invoice sent successfully to ${user.email}`,
      invoiceNumber,
      sentTo: user.email
    });

  } catch (error) {
    console.error('Error sending invoice email:', error);
    res.status(500).json({ success: false, message: 'Failed to send invoice email', error: error.message });
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
