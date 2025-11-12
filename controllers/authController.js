const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const UAParser = require('ua-parser-js');
const sendWelcomeEmail = require('../utils/sendWelcomeEmail');
const notifyAdminOfRegistration = require('../utils/sendAdminNotification');
const { addToBrevoList } = require('../utils/brevo');
const { validatePlanAndMonths, computeCycleWithMonths, validatePlanAndDays, computeCycleWithDays } = require('../utils/subscriptionUtils');
const FormattingTestResult = require('../models/FormattingTestResult');
const PitmanExerciseSubmission = require('../models/PitmanExerciseSubmission');
const SelfPracticeSubmission = require('../models/SelfPracticeSubmission');
const TypingRecord = require('../models/TypingRecord');
const UserDictationSubmission = require('../models/UserDictationSubmission');
const McqSubmission = require('../models/mcqSubmissionModel');

// Helper to safely build a regex from user input
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.register = async (req, res) => {
  try {
    // ✅ Step 1: Destructure only the required fields (no subscriptionType here)
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      gender,
      examCategory,
      termConditions,
      referralCode,
      state,
      currentShorthandWPM,
      sourceOfDiscovery,
    } = req.body;

    const allowedWPM = [70, 80, 90, 100, 110, 115, 120, 125, 130, 135, 140, 150, 160];
    if (currentShorthandWPM !== undefined && !allowedWPM.includes(Number(currentShorthandWPM))) {
      return res.status(400).json({ message: 'Invalid currentShorthandWPM. Allowed: ' + allowedWPM.join(', ') });
    }

    // Sanitize sourceOfDiscovery (optional free-text field)
    const cleanSourceOfDiscovery =
      typeof sourceOfDiscovery === 'string' ? sourceOfDiscovery.trim() : '';

    // ✅ Step 2: Validate terms acceptance
    if (!termConditions) {
      return res.status(400).json({ message: 'You must accept the terms and conditions.' });
    }

    // ✅ Step 3: Password match check
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // ✅ Step 4: Check if user already exists
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const existingUser = await User.findOne({
      email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' }
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // ✅ Step 5: Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Step 6: Get user IP address
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // ✅ Step 7: Create new user with default trial subscription and 5-minute trial expiry
    const user = new User({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      password,
      gender,
      subscriptionType: 'Trial',                          // 👈 Force trial
      trialExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 👈 3 days from now

      examCategory,
      isActive: true,
      lastActiveDate: new Date(),
      isEmailVerified: false,
      otp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // OTP valid for 10 mins
      termConditions,
      referralCode,
      ipAddress: ip,
      state,
      currentShorthandWPM: currentShorthandWPM !== undefined ? Number(currentShorthandWPM) : undefined,
      sourceOfDiscovery: cleanSourceOfDiscovery,
      // CRM/Admin additional fields (explicit defaults on registration)
      DNC: '',
      Comment: '',
      SubscriptionPlanType: '',
      AmountPaid: 0,
      LeadType: '',
    });

    await user.save();

    // ✅ Step 8: Send OTP via email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: normalizedEmail,
      subject: 'Verify Your Email',
      html: `
      <!DOCTYPE html>
      <html lang="en" style="font-family: Arial, sans-serif;">
      <head><meta charset="UTF-8"><title>Email Verification</title></head>
      <body style="background-color: #f4f6f8; padding: 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); overflow: hidden;">
          <tr>
            <td style="background-color: #0a66c2; color: #ffffff; padding: 20px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Verify Your Email Address</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; color: #333;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${firstName}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.6;">
                Thank you for registering with <strong>Rapid Steno</strong>. To complete your registration, please verify your email address using the OTP below.
              </p>
              <p style="font-size: 18px; font-weight: bold; text-align: center; margin: 30px 0; background: #f1f3f5; padding: 15px; border-radius: 6px; letter-spacing: 2px;">
                ${otp}
              </p>
              <p style="font-size: 14px; color: #555;">
                This OTP will expire in 10 minutes. If you didn’t request this, please ignore this email.
              </p>
              <p style="margin-top: 30px; font-size: 14px;">Best Regards,<br><strong>Rapid Steno Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f3f5; padding: 20px; text-align: center; font-size: 13px; color: #777;">
              &copy; Rapid Steno. All rights reserved.
            </td>
          </tr>
        </table>
      </body>
      </html>
      `,
    });

    // ✅ Step 9: Respond with success
    res.status(201).json({
      message: 'Registered. OTP sent to email. Please verify to activate your account.',
      userId: user._id,
      email: user.email,
      createdAt: user.createdAt,
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// ✅ Get only subscription + CRM fields for Settings page (self only)
exports.getSelfSubscriptionAndCrmFields = async (req, res) => {
  try {
    const userId = req.params.id;

    // Ensure the logged-in user is fetching their own data
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const user = await User.findById(userId).select(
      'subscriptionType trialExpiresAt paidUntil DNC Comment SubscriptionPlanType AmountPaid LeadType'
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (error) {
    console.error('Fetch Self Subscription/CRM Error:', error);
    res.status(500).json({ message: 'Server Error', error });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    const user = await User.findOne({
      email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' }
    });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User is deactivated. Contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });


    let updated = false;

if (user.subscriptionType === 'Trial' && user.trialExpiresAt && new Date() > user.trialExpiresAt) {
  user.subscriptionType = 'Unpaid';
  user.trialExpiresAt = undefined;
  updated = true;
}

if (user.subscriptionType === 'Paid' && user.paidUntil && new Date() > user.paidUntil) {
  user.subscriptionType = 'Unpaid';
  user.paidUntil = undefined;
  updated = true;
}

// ✅ Save the changes BEFORE blocking login
    if (updated) {
      await user.save();
    }

    // ✅ Allow 'Unpaid' users to log in. Access restrictions (if any) should be handled at feature level.

    // ✅ Update session info
    const sessionToken = crypto.randomUUID();
    user.sessionToken = sessionToken;
    user.lastActiveDate = new Date();
    user.loginCount += 1;

    await user.save();

    // ⏰ Generate JWT valid until midnight
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const secondsUntilMidnight = Math.floor((midnight - now) / 1000);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: `${secondsUntilMidnight}s`,
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      sessionToken,
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      subscriptionType: user.subscriptionType,
       trialExpiresAt: user.trialExpiresAt || null,
       paidUntil: user.paidUntil || null,
      createdAt: user.createdAt,
      hasSeenGrowthTour: user.hasSeenGrowthTour || false,
      hasSeenComparisonTour: user.hasSeenComparisonTour || false,
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};



exports.getFilteredUsers = async (req, res) => {
  const { status, subscriptionType, examCategory, repeatUser } = req.query;

  const query = {};
  if (status) {
    const days = status === '15' ? 15 : 30;
    const inactiveThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    query.lastActiveDate = { $lt: inactiveThreshold };
  }

  if (subscriptionType) query.subscriptionType = subscriptionType;
  if (examCategory) query.examCategory = examCategory;
  if (repeatUser !== undefined) query.isRepeatUser = repeatUser === 'true';

  try {
    const users = await User.find(query);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};


 
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = isActive; // Toggle status
    await user.save();

    res.status(200).json({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};


// ✅ Fetch All Users
exports.getAllUsers = async (req, res) => {
try {
  const users = await User.find(); // Fetch all users from DB
  res.status(200).json(users);
} catch (error) {
  console.error("Fetch Users Error:", error);
  res.status(500).json({ message: 'Server Error', error });
}
};

// ✅ Fetch User by ID
exports.getUserById = async (req, res) => {
try {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.status(200).json(user);
} catch (error) {
  console.error("Fetch User by ID Error:", error);
  res.status(500).json({ message: 'Server Error', error });
}
};

// controllers/userController.js or authController.js
exports.getSelfUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Ensure the logged-in user is fetching their own data
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const user = await User.findById(userId).select(
      '_id hasSeenGrowthTour hasSeenComparisonTour'
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (error) {
    console.error("Fetch Self User by ID Error:", error);
    res.status(500).json({ message: 'Server Error', error });
  }
};


// ✅ Delete All Users
exports.deleteAllUsers = async (req, res) => {
try {
  await User.deleteMany(); // Deletes all users
  res.status(200).json({ message: 'All users deleted successfully' });
} catch (error) {
  console.error("Delete All Users Error:", error);
  res.status(500).json({ message: 'Server Error', error });
}
};


// ✅ Delete a Single User by ID
exports.deleteUserById = async (req, res) => {
try {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  await user.deleteOne();
  res.status(200).json({ message: 'User deleted successfully' });
} catch (error) {
  console.error("Delete User Error:", error);
  res.status(500).json({ message: 'Server Error', error });
}
};


exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.otp !== otp || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    // ✅ START: ADD THIS SECTION TO SEND THE WELCOME EMAIL
    try {
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Use the same beautiful HTML template from your other function
      const welcomeHtml = `
      <!DOCTYPE html>
      <html lang="en" style="font-family: Arial, sans-serif;">
      <head><meta charset="UTF-8"><title>Welcome to Rapid Steno</title></head>
      <body style="background-color: #f4f6f8; padding: 30px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
          <tr><td style="background-color: #002E2C; text-align: center; padding: 25px 0;"><h2 style="color: #fff; margin: 0;">Welcome to the RapidSteno Family!</h2></td></tr>
          <tr><td style="padding: 30px 25px 15px;"><h3 style="margin: 0; font-size: 20px; color: #333;">🎉 Thank you for joining us, ${user.firstName}!</h3><p style="font-size: 14px; color: #555;">Your account is now active. Get ready to make your speed faster with unlimited practice. Here's what you can do next:</p></td></tr>
          <tr><td style="padding: 10px 25px 20px;"><table width="100%" cellspacing="0" cellpadding="0" style="text-align: left;"><tr><td width="50%" style="padding: 10px;"><div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px;"><strong>🗣️ Dictation</strong><br><small>Practice with real-time dictation exercises.</small></div></td><td width="50%" style="padding: 10px;"><div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px;"><strong>📈 Growth Analysis</strong><br><small>Track your progress with detailed analytics.</small></div></td></tr></table></td></tr>
          <tr><td style="padding: 20px 25px; background-color: #f9fafb; border-top: 1px solid #e0e0e0; text-align: center;"><p style="font-size: 15px; color: #111; margin: 0;">⏳ <strong>Your Free Trial is Active!</strong></p><p style="font-size: 14px; color: #666; margin: 5px 0 15px;">Explore all premium features for free.</p><a href="https://www.rapidsteno.com" style="display: inline-block; padding: 10px 20px; background-color: #002E2C; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Practicing Now</a></td></tr>
          <tr><td style="text-align: center; padding: 20px; font-size: 13px; color: #888;"><p style="color: #aaa;">© 2025 Rapid Steno. All rights reserved.</p></td></tr>
        </table>
      </body>
      </html>`;

      await transporter.sendMail({
        from: `Rapid Steno <${process.env.SMTP_USER}>`, // Recommended to use a name
        to: user.email,
        subject: 'Welcome to Rapid Steno! Let\'s Get Started.',
        html: welcomeHtml
      });
      console.log(`Welcome email sent successfully to ${user.email}`);

    } catch (emailError) {
      // Log the email error but don't fail the entire request
      // The user is already verified, which is the most important part
      console.error('Failed to send welcome email:', emailError);
    }
    // ✅ END: ADD THIS SECTION

    res.status(200).json({ message: 'Email verified successfully. You can now log in.' });

  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error });
  }
};

// ✅ Send Reset Password Link
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(404).json({ message: 'User not found' });

    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: normalizedEmail,
      subject: 'Password Reset Request',
      html: `<p>Click the link below to reset your password (valid for 15 minutes):</p>
             <a href="${resetLink}">${resetLink}</a>`
    });

    res.status(200).json({ message: 'Reset link sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send reset link', error });
  }
};

// ✅ Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: 'Invalid or expired token' });

    user.password = password;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Reset failed', error });
  }
};


// memory storage for demo (replace with Redis for production)
const otpStore = {};

exports.sendOtp = async (req, res) => {
  const { email, firstName } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  const userExists = await User.findOne({
    email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' }
  });
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[normalizedEmail] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

  // send OTP
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: normalizedEmail,
    subject: 'Your OTP for Rapid Steno',
    // html: `<p>Hello <strong>${firstName || "User"}</strong>,<br/>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`
   
    html: `
    <!DOCTYPE html>
    <html lang="en" style="font-family: Arial, sans-serif;">
    <head><meta charset="UTF-8"><title>Email Verification</title></head>
    <body style="background-color: #f4f6f8; padding: 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); overflow: hidden;">
        <tr>
          <td style="background-color: #002E2C; color: #ffffff; padding: 20px 30px; text-align: center;">
       
         <img src="https://5dd79389a2.imgdist.com/pub/bfra/5lx74iao/fv0/1ra/wg1/Blue%20Modern%20Illustrative%20Engineering%20Services%20Logo%20Design%20.png" width="150" style="border-radius: 5px;">

            </td>
        </tr>
  
        <tr>
          <td style="padding: 30px; color: #333;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${firstName}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6;">
              Thank you for registering with <strong>Rapid Steno</strong>. To complete your registration, please verify your email address using the OTP below.
            </p>
            <p style="font-size: 18px; font-weight: bold; text-align: center; margin: 30px 0; background: #f1f3f5; padding: 15px; border-radius: 6px; letter-spacing: 2px;">
              ${otp}
            </p>
            <p style="font-size: 14px; color: #555;">
              This OTP will expire in 10 minutes. If you didn’t request this, please ignore this email.
            </p>
            <p style="margin-top: 30px; font-size: 14px;">Best Regards,<br><strong>Rapid Steno Team</strong></p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f1f3f5; padding: 20px; text-align: center; font-size: 13px; color: #777;">
            &copy; Rapid Steno. All rights reserved.
          </td>
        </tr>
      </table>
    </body>
    </html>
    `,
 
  });

  res.status(200).json({ message: 'OTP sent successfully' });
};


exports.markTourAsSeen = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.hasSeenGrowthTour = true; // ✅ Correct field
    await user.save();

    res.status(200).json({ message: 'Tour marked as seen' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update tour status', error });
  }
};

exports.markComparisonTourAsSeen = async (req, res) => {
  try {
    const userId = req.params.id;

    // Ensure user can only update their own record
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    await User.findByIdAndUpdate(userId, { hasSeenComparisonTour: true });

    res.status(200).json({ message: "Comparison tour marked as seen" });
  } catch (error) {
    console.error("Error marking comparison tour as seen:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

exports.verifyOtpAndRegister = async (req, res) => {
  const {
    email,
    otp,
    firstName,
    lastName,
    phone,
    password,
    confirmPassword,
    gender,
    subscriptionType, // not used, overridden below
    examCategory,
    termConditions,
    referralCode,
    state,
    currentShorthandWPM,
    sourceOfDiscovery,
  } = req.body;

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const stored = otpStore[normalizedEmail];

  // Validate OTP
  if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  // Validate password match
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  // Validate shorthand WPM if provided
  const allowedWPM = [70, 80, 90, 100, 110, 115, 120, 125, 130, 135, 140, 150, 160];
  if (currentShorthandWPM !== undefined && !allowedWPM.includes(Number(currentShorthandWPM))) {
    return res.status(400).json({ message: 'Invalid currentShorthandWPM. Allowed: ' + allowedWPM.join(', ') });
  }

  // Sanitize sourceOfDiscovery (optional free-text field)
  const cleanSourceOfDiscovery =
    typeof sourceOfDiscovery === 'string' ? sourceOfDiscovery.trim() : '';

  try {
    // Create new user with Trial subscription
    const user = new User({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      password,
      gender,
      subscriptionType: 'Trial',
      trialExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days trial
      examCategory,
      isActive: true,
      isEmailVerified: true,
      referralCode,
      termConditions,
      lastActiveDate: new Date(),
      state,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      currentShorthandWPM: currentShorthandWPM !== undefined ? Number(currentShorthandWPM) : undefined,
      sourceOfDiscovery: cleanSourceOfDiscovery,
      // CRM/Admin additional fields (explicit defaults on registration via OTP)
      DNC: '',
      Comment: '',
      SubscriptionPlanType: '',
      AmountPaid: 0,
      LeadType: '',
    });

    await user.save();
    delete otpStore[normalizedEmail]; // Remove OTP after successful registration

    // Try Brevo CRM sync (non-blocking)
    try {
      await addToBrevoList({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone
      });
      console.log(`✅ Brevo: ${user.email} added to CRM`);
    } catch (err) {
      console.error("❌ Brevo Sync Failed:", err.message);
    }

    // ✅ Try Welcome Email (non-blocking)
    try {
      await sendWelcomeEmail(user.email, user.firstName);
    } catch (err) {
      console.error("❌ Welcome email failed:", err.message);
    }

    // ✅ Try Admin Notification (non-blocking)
    try {
      await notifyAdminOfRegistration(user);
    } catch (err) {
      console.error("❌ Admin notification failed:", err.message);
    }

    // ✅ Respond after all major steps
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error("❌ Registration Error:", err.message);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

// ✅ User: Set subscription plan and duration
exports.setUserSubscriptionPlan = async (req, res) => {
  try {
    const { planType, months, days } = req.body;

    let validation;
    let durationDays;

    if (days !== undefined) {
      validation = validatePlanAndDays(planType, days);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.reason });
      }
      durationDays = validation.days;
    } else {
      validation = validatePlanAndMonths(planType, months);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.reason });
      }
      durationDays = validation.days;
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const cycle = computeCycleWithDays(new Date(), durationDays);

    user.subscriptionType = 'Paid';
    user.SubscriptionPlanType = validation.plan; // normalized plan string
    user.paidUntil = cycle.endDate;

    user.subscriptionHistory.push({
      type: 'Paid',
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    });

    await user.save();

    return res.status(200).json({
      message: 'Subscription plan set successfully',
      user: {
        id: user._id,
        email: user.email,
        subscriptionType: user.subscriptionType,
        planType: user.SubscriptionPlanType,
        paidUntil: user.paidUntil,
      }
    });
  } catch (error) {
    console.error('Set user subscription plan error:', error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};


exports.markNotificationAsSeen = async (req, res) => {
  try {
    const { userId, notificationId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.seenNotificationIds.includes(notificationId)) {
      user.seenNotificationIds.push(notificationId);
      await user.save();
    }

    res.status(200).json({ message: 'Notification marked as seen' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notification as seen', error });
  }
};

// ✅ Save page activity
exports.trackUserActivity = async (req, res) => {
  try {
    const { userId, page, timeSpent, deviceType, browser, os, userAgent } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const today = new Date().toISOString().split('T')[0];
    let dailyLog = user.activityLogs.find(log => log.date === today);

    if (!dailyLog) {
      dailyLog = {
        date: today,
        pages: [{
          page,
          timeSpent,
          viewCount: 1,
          deviceType,
          browser,
          os,
          userAgent
        }],
        totalActiveTime: timeSpent,
        totalPagesViewed: 1
      };
      user.activityLogs.push(dailyLog);
    } else {
      const pageEntry = dailyLog.pages.find(p => p.page === page);
      if (pageEntry) {
        pageEntry.timeSpent += timeSpent;
        pageEntry.viewCount += 1;
      } else {
        dailyLog.pages.push({
          page,
          timeSpent,
          viewCount: 1,
          deviceType,
          browser,
          os,
          userAgent
        });
      }
      dailyLog.totalActiveTime += timeSpent;
      dailyLog.totalPagesViewed += 1;
    }

    // 🔁 Update lifetime pageViewStats
    const lifetimeStat = user.pageViewStats.find(stat => stat.page === page);
    if (lifetimeStat) {
      lifetimeStat.count += 1;
    } else {
      user.pageViewStats.push({ page, count: 1 });
    }

    await user.save();
    res.status(200).json({ message: "Activity tracked" });

  } catch (err) {
    console.error("Track activity failed:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// http://localhost:5000/api/admin/mark-paid
// {
//   "userId": "PUT_USER_ID_HERE"
// }


// PUT /api/user/update-profile/:id
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName, email, gender, mobileNumber } = req.body;

    // Only the user can update their own profile
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update fields if they are provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) {
      const newEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (newEmail && newEmail !== user.email) {
        // Check if email is already taken (case-insensitive to match legacy data)
        const existing = await User.findOne({
          email: { $regex: `^${escapeRegex(newEmail)}$`, $options: 'i' }
        });
        if (existing && existing._id.toString() !== userId) {
          return res.status(400).json({ message: 'Email already in use' });
        }
        user.email = newEmail;
        user.isEmailVerified = false; // Reset email verification
      }
    }
    if (gender) user.gender = gender;
    if (mobileNumber) user.phone = mobileNumber;

    await user.save();

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// Weekly User Report Aggregator
exports.weeklyUserReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { start, end } = req.query;

    // Parse dates; default to current week starting from provided start or last Monday
    let startDate;
    if (start) {
      startDate = new Date(start);
    } else {
      const today = new Date();
      const day = today.getDay(); // 0 Sun .. 6 Sat
      const diffToMonday = (day === 0 ? -6 : 1) - day; // Monday as week start
      startDate = new Date(today);
      startDate.setDate(today.getDate() + diffToMonday);
      startDate.setHours(0,0,0,0);
    }
    if (isNaN(startDate)) return res.status(400).json({ message: 'Invalid start date' });

    let endDate = end ? new Date(end) : new Date(startDate);
    if (!end) { endDate.setDate(startDate.getDate() + 6); }
    endDate.setHours(23,59,59,999);

    const toYmd = (d) => {
      const dd = new Date(d);
      const y = dd.getFullYear();
      const m = String(dd.getMonth()+1).padStart(2,'0');
      const day = String(dd.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    };

    // Prepare day buckets
    const days = [];
    const daysCount = Math.max(1, Math.floor((endDate - startDate) / (24*60*60*1000)) + 1);
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push({
        date: toYmd(d),
        attendance: { status: 'Absent', punctual: false, totalActiveTimeSeconds: 0, totalPagesViewed: 0, pages: [] },
        typing: { attempts: 0, avgWpm: 0, avgAccuracy: 0, totalErrors: 0 },
        dictation: { attempts: 0, avgAccuracy: 0, totalMistakes: 0, breakdown: { capital: 0, spelling: 0, punctuation: 0, missing: 0, extra: 0 } },
        formatting: { attempts: 0, avgMarksAwarded: 0, totalMistakes: 0, breakdown: { word: 0, formatting: 0, punctuation: 0 } },
        pitman: { attempts: 0, avgAccuracy: 0, totalMistakes: 0, breakdown: { capital: 0, spelling: 0, punctuation: 0, spacing: 0, missing: 0, extra: 0 } },
        selfPractice: { attempts: 0, avgAccuracy: 0, totalMistakes: 0, breakdown: { capital: 0, spelling: 0, punctuation: 0, spacing: 0, missing: 0, extra: 0 } },
        mcq: { attempts: 0, avgScore: 0, avgAccuracyPercent: 0 },
      });
    }

    // Fetch user once for activity logs
    const user = await User.findById(userId).lean();
    const activityLogs = Array.isArray(user?.activityLogs) ? user.activityLogs : [];

    // Apply attendance per day using activityLogs
    for (const log of activityLogs) {
      const idx = days.findIndex(d => d.date === log.date);
      if (idx !== -1) {
        const attendance = days[idx].attendance;
        attendance.status = 'Present';
        attendance.totalActiveTimeSeconds = (attendance.totalActiveTimeSeconds || 0) + (log.totalActiveTime || 0);
        attendance.totalPagesViewed = (attendance.totalPagesViewed || 0) + (log.totalPagesViewed || 0);
        // Merge pages
        const pagesMap = new Map(attendance.pages.map(p => [p.page, p]));
        for (const p of (log.pages || [])) {
          if (pagesMap.has(p.page)) {
            const x = pagesMap.get(p.page);
            x.timeSpent += (p.timeSpent || 0);
            x.viewCount += (p.viewCount || 1);
          } else {
            pagesMap.set(p.page, { page: p.page, timeSpent: p.timeSpent || 0, viewCount: p.viewCount || 1 });
          }
        }
        attendance.pages = Array.from(pagesMap.values());
      }
    }
    // Define punctual as >= 15min of activity
    for (const d of days) {
      d.attendance.punctual = d.attendance.status === 'Present' && (d.attendance.totalActiveTimeSeconds >= 15*60);
    }

    // Build time range filter helper
    const range = { $gte: startDate, $lte: endDate };

    // Query all collections
    const [selfPractice, formattingTests, pitmanSubs, typingRecords, dictationSubs, mcqSubs] = await Promise.all([
      SelfPracticeSubmission.find({ user: userId, submittedAt: range }).lean(),
      FormattingTestResult.find({ user: userId, createdAt: range }).lean(),
      PitmanExerciseSubmission.find({ user: userId, submittedAt: range }).lean(),
      TypingRecord.find({ user: userId, createdAt: range }).lean(),
      UserDictationSubmission.find({ user: userId, submittedAt: range }).lean(),
      McqSubmission.find({ userId: userId, submittedAt: range }).lean(),
    ]);

    const dateKey = (dt) => toYmd(dt);

    // Helper to update day bucket
    for (const rec of typingRecords) {
      const k = dateKey(rec.createdAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.typing.attempts += 1;
      d.typing.avgWpm += rec.wpm || 0;
      d.typing.avgAccuracy += rec.accuracy || 0;
      d.typing.totalErrors += rec.errors || 0;
    }
    for (const d of days) {
      if (d.typing.attempts>0) { d.typing.avgWpm = +(d.typing.avgWpm / d.typing.attempts).toFixed(2); d.typing.avgAccuracy = +(d.typing.avgAccuracy / d.typing.attempts).toFixed(2); }
    }

    for (const sub of dictationSubs) {
      const k = dateKey(sub.submittedAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.dictation.attempts += 1;
      d.dictation.avgAccuracy += sub.accuracy || 0;
      d.dictation.totalMistakes += sub.totalMistakes || 0;
      d.dictation.breakdown.capital += sub.capitalMistakes || 0;
      d.dictation.breakdown.spelling += sub.spellingMistakes || 0;
      d.dictation.breakdown.punctuation += sub.punctuationMistakes ? (Array.isArray(sub.punctuationMistakes) ? sub.punctuationMistakes.length : sub.punctuationMistakes) : 0;
      d.dictation.breakdown.missing += sub.missingWords || 0;
      d.dictation.breakdown.extra += sub.extraWords || 0;
    }
    for (const d of days) {
      if (d.dictation.attempts>0) d.dictation.avgAccuracy = +(d.dictation.avgAccuracy / d.dictation.attempts).toFixed(2);
    }

    for (const sub of formattingTests) {
      const k = dateKey(sub.createdAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.formatting.attempts += 1;
      d.formatting.avgMarksAwarded += sub.marksAwarded || 0;
      d.formatting.totalMistakes += sub.totalMistakes || 0;
      d.formatting.breakdown.word += sub.wordMistakesCount || 0;
      d.formatting.breakdown.formatting += sub.formattingMistakesCount || 0;
      d.formatting.breakdown.punctuation += sub.punctuationMistakesCount || 0;
    }
    for (const d of days) {
      if (d.formatting.attempts>0) d.formatting.avgMarksAwarded = +(d.formatting.avgMarksAwarded / d.formatting.attempts).toFixed(2);
    }

    for (const sub of pitmanSubs) {
      const k = dateKey(sub.submittedAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.pitman.attempts += 1;
      d.pitman.avgAccuracy += sub.accuracy || 0;
      d.pitman.totalMistakes += sub.totalMistakes || 0;
      d.pitman.breakdown.capital += sub.capitalMistakes || 0;
      d.pitman.breakdown.spelling += sub.spellingMistakes || 0;
      d.pitman.breakdown.punctuation += sub.punctuationMistakes || 0;
      d.pitman.breakdown.spacing += sub.spacingMistakes || 0;
      d.pitman.breakdown.missing += sub.missingWords || 0;
      d.pitman.breakdown.extra += sub.extraWords || 0;
    }
    for (const d of days) {
      if (d.pitman.attempts>0) d.pitman.avgAccuracy = +(d.pitman.avgAccuracy / d.pitman.attempts).toFixed(2);
    }

    for (const sub of selfPractice) {
      const k = dateKey(sub.submittedAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.selfPractice.attempts += 1;
      d.selfPractice.avgAccuracy += sub.accuracy || 0;
      d.selfPractice.totalMistakes += sub.totalMistakes || 0;
      d.selfPractice.breakdown.capital += sub.capitalMistakes || 0;
      d.selfPractice.breakdown.spelling += sub.spellingMistakes || 0;
      d.selfPractice.breakdown.punctuation += sub.punctuationMistakes || 0;
      d.selfPractice.breakdown.spacing += sub.spacingMistakes || 0;
      d.selfPractice.breakdown.missing += sub.missingWords || 0;
      d.selfPractice.breakdown.extra += sub.extraWords || 0;
    }
    for (const d of days) {
      if (d.selfPractice.attempts>0) d.selfPractice.avgAccuracy = +(d.selfPractice.avgAccuracy / d.selfPractice.attempts).toFixed(2);
    }

    for (const sub of mcqSubs) {
      const k = dateKey(sub.submittedAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.mcq.attempts += 1;
      d.mcq.avgScore += sub.score || 0;
      d.mcq.avgAccuracyPercent += sub.total ? ((sub.score / sub.total) * 100) : 0;
    }
    for (const d of days) {
      if (d.mcq.attempts>0) {
        d.mcq.avgScore = +(d.mcq.avgScore / d.mcq.attempts).toFixed(2);
        d.mcq.avgAccuracyPercent = +(d.mcq.avgAccuracyPercent / d.mcq.attempts).toFixed(2);
      }
    }

    // Weekly summary metrics
    const weekly = {
      range: { start: toYmd(startDate), end: toYmd(endDate) },
      attendance: {
        daysPresent: days.filter(d=>d.attendance.status==='Present').length,
        daysAbsent: days.filter(d=>d.attendance.status==='Absent').length,
        punctualDays: days.filter(d=>d.attendance.punctual).length,
        totalActiveTimeSeconds: days.reduce((acc,d)=>acc + (d.attendance.totalActiveTimeSeconds||0), 0),
      },
      totals: {
        typingAttempts: typingRecords.length,
        dictationAttempts: dictationSubs.length,
        formattingAttempts: formattingTests.length,
        pitmanAttempts: pitmanSubs.length,
        selfPracticeAttempts: selfPractice.length,
        mcqAttempts: mcqSubs.length,
      }
    };

    // Growth indicators (simple end vs start comparison where data exists)
    const pickMetricSeries = (daysArr, path) => {
      const vals = daysArr.map(d => {
        const v = path.split('.').reduce((o,k)=>o && o[k], d);
        return (Number.isFinite(v) ? v : null);
      });
      return vals;
    };

    const typingWpmSeries = pickMetricSeries(days, 'typing.avgWpm');
    const typingAccSeries = pickMetricSeries(days, 'typing.avgAccuracy');
    const dictAccSeries = pickMetricSeries(days, 'dictation.avgAccuracy');
    const pitmanAccSeries = pickMetricSeries(days, 'pitman.avgAccuracy');
    const selfAccSeries = pickMetricSeries(days, 'selfPractice.avgAccuracy');
    const fmtMarksSeries = pickMetricSeries(days, 'formatting.avgMarksAwarded');

    const growthFromSeries = (series) => {
      const first = series.find(v=>v!==null && v>0);
      const last = [...series].reverse().find(v=>v!==null && v>0);
      if (!first || !last) return { changePercent: 0, direction: 'flat' };
      const change = last - first;
      const perc = first>0 ? (change/first)*100 : 0;
      return { changePercent: +perc.toFixed(2), direction: change>0?'up':change<0?'down':'flat' };
    };

    const growth = {
      typingWpm: growthFromSeries(typingWpmSeries),
      typingAccuracy: growthFromSeries(typingAccSeries),
      dictationAccuracy: growthFromSeries(dictAccSeries),
      pitmanAccuracy: growthFromSeries(pitmanAccSeries),
      selfPracticeAccuracy: growthFromSeries(selfAccSeries),
      formattingMarks: growthFromSeries(fmtMarksSeries),
    };

    const overallGrowthRate = (
      (growth.typingWpm.changePercent || 0) +
      (growth.typingAccuracy.changePercent || 0) +
      (growth.dictationAccuracy.changePercent || 0) +
      (growth.pitmanAccuracy.changePercent || 0) +
      (growth.selfPracticeAccuracy.changePercent || 0) +
      (growth.formattingMarks.changePercent || 0)
    ) / 6;

    weekly.overallGrowthRatePercent = +overallGrowthRate.toFixed(2);

    // Danger zone: top 3 mistake categories across all activities
    const mistakeTotals = {
      capital: 0, spelling: 0, punctuation: 0, spacing: 0, missing: 0, extra: 0
    };
    const addMistakes = (b) => {
      mistakeTotals.capital += b.capital || 0;
      mistakeTotals.spelling += b.spelling || 0;
      mistakeTotals.punctuation += b.punctuation || 0;
      mistakeTotals.spacing += b.spacing || 0;
      mistakeTotals.missing += b.missing || 0;
      mistakeTotals.extra += b.extra || 0;
    };
    for (const d of days) {
      addMistakes(d.dictation.breakdown);
      addMistakes(d.pitman.breakdown);
      addMistakes(d.selfPractice.breakdown);
      // formatting uses word/formatting/punctuation; map accordingly
      mistakeTotals.punctuation += d.formatting.breakdown.punctuation || 0;
      mistakeTotals.spelling += d.formatting.breakdown.word || 0; // treating word mistakes as spelling/missing/extra proxy
      mistakeTotals.capital += d.formatting.breakdown.formatting || 0; // proxy for formatting discipline issues
    }
    const sortedDanger = Object.entries(mistakeTotals).sort((a,b)=>b[1]-a[1]);
    const top3 = sortedDanger.slice(0,3).map(([k,v])=>({ category: k, count: v }));

    // Dictation weak topics (by highest mistakes)
    const dictationTopicAgg = {};
    for (const sub of dictationSubs) {
      const key = `${sub.dictationTitle}|${sub.dictationType}`;
      dictationTopicAgg[key] = (dictationTopicAgg[key] || 0) + (sub.totalMistakes || 0);
    }
    const topDictationTopics = Object.entries(dictationTopicAgg).sort((a,b)=>b[1]-a[1]).slice(0,3)
      .map(([key,count])=>{ const [title,type]=key.split('|'); return { title, type, totalMistakes: count }; });

    // Suggestions based on danger zone
    const suggestions = top3.map(t => {
      switch (t.category) {
        case 'punctuation': return 'Focus on punctuation: practice comma, semicolon, and full-stop exercises daily.';
        case 'spelling': return 'Strengthen spelling: use quick revision lists and do 10-word drills.';
        case 'capital': return 'Improve capitalization/formatting discipline: review formatting rules and apply consistently.';
        case 'spacing': return 'Work on spacing: slow down slightly and verify word boundaries.';
        case 'missing': return 'Reduce missing words: increase attention during dictation playback and cross-check.';
        case 'extra': return 'Avoid extra words: type what is dictated, resist paraphrasing.';
        default: return 'Maintain consistency across all sections; practice regularly.';
      }
    });

    // Weekly feature summary (aggregated across week)
    const avg = (arr) => arr.length ? +(arr.reduce((a,b)=> a + (b || 0), 0) / arr.length).toFixed(2) : 0;
    const sum = (arr) => arr.reduce((a,b)=> a + (b || 0), 0);

    const summary = {
      typing: {
        attempts: typingRecords.length,
        avgWpm: avg(typingRecords.map(r=>r.wpm)),
        avgAccuracy: avg(typingRecords.map(r=>r.accuracy)),
        totalErrors: sum(typingRecords.map(r=>r.errors)),
      },
      dictation: {
        attempts: dictationSubs.length,
        avgAccuracy: avg(dictationSubs.map(s=>s.accuracy)),
        totalMistakes: sum(dictationSubs.map(s=>s.totalMistakes)),
        breakdown: {
          capital: sum(dictationSubs.map(s=>s.capitalMistakes)),
          spelling: sum(dictationSubs.map(s=>s.spellingMistakes)),
          punctuation: sum(dictationSubs.map(s => Array.isArray(s.punctuationMistakes) ? s.punctuationMistakes.length : (s.punctuationMistakes || 0))),
          missing: sum(dictationSubs.map(s=>s.missingWords)),
          extra: sum(dictationSubs.map(s=>s.extraWords)),
        }
      },
      formatting: {
        attempts: formattingTests.length,
        avgMarksAwarded: avg(formattingTests.map(s=>s.marksAwarded)),
        totalMistakes: sum(formattingTests.map(s=>s.totalMistakes)),
        breakdown: {
          word: sum(formattingTests.map(s=>s.wordMistakesCount)),
          formatting: sum(formattingTests.map(s=>s.formattingMistakesCount)),
          punctuation: sum(formattingTests.map(s=>s.punctuationMistakesCount)),
        }
      },
      pitman: {
        attempts: pitmanSubs.length,
        avgAccuracy: avg(pitmanSubs.map(s=>s.accuracy)),
        totalMistakes: sum(pitmanSubs.map(s=>s.totalMistakes)),
        breakdown: {
          capital: sum(pitmanSubs.map(s=>s.capitalMistakes)),
          spelling: sum(pitmanSubs.map(s=>s.spellingMistakes)),
          punctuation: sum(pitmanSubs.map(s=>s.punctuationMistakes)),
          spacing: sum(pitmanSubs.map(s=>s.spacingMistakes)),
          missing: sum(pitmanSubs.map(s=>s.missingWords)),
          extra: sum(pitmanSubs.map(s=>s.extraWords)),
        }
      },
      selfPractice: {
        attempts: selfPractice.length,
        avgAccuracy: avg(selfPractice.map(s=>s.accuracy)),
        totalMistakes: sum(selfPractice.map(s=>s.totalMistakes)),
        breakdown: {
          capital: sum(selfPractice.map(s=>s.capitalMistakes)),
          spelling: sum(selfPractice.map(s=>s.spellingMistakes)),
          punctuation: sum(selfPractice.map(s=>s.punctuationMistakes)),
          spacing: sum(selfPractice.map(s=>s.spacingMistakes)),
          missing: sum(selfPractice.map(s=>s.missingWords)),
          extra: sum(selfPractice.map(s=>s.extraWords)),
        }
      },
      mcq: {
        attempts: mcqSubs.length,
        avgScore: avg(mcqSubs.map(s=>s.score)),
        avgAccuracyPercent: avg(mcqSubs.map(s=> s.total ? (s.score / s.total) * 100 : 0)),
      },
    };

    const includeDays = (req.query.detail === 'true') || (req.query.includeDays === 'true') || (req.query.withDays === 'true');

    const reportBase = {
      user: { id: userId, name: `${user?.firstName||''} ${user?.lastName||''}`.trim(), category: user?.examCategory },
      weekly,
      summary,
      growth,
      dangerZone: {
        topMistakeCategories: top3,
        dictationTopWeakTopics: topDictationTopics,
      },
      suggestions,
      generatedAt: new Date().toISOString(),
    };

    if (includeDays) {
      reportBase.days = days;
    }

    return res.status(200).json(reportBase);

  } catch (error) {
    console.error('Weekly report error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Wrapper endpoint: weekly report by userId (self-access only)
exports.weeklyUserReportById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (String(req.user._id) !== String(id)) {
      return res.status(403).json({ message: 'Forbidden: can only access your own report' });
    }
    return exports.weeklyUserReport(req, res);
  } catch (error) {
    console.error('Weekly report by id error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
