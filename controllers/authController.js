const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const UAParser = require('ua-parser-js');
const sendWelcomeEmail = require('../utils/sendWelcomeEmail');
const notifyAdminOfRegistration = require('../utils/sendAdminNotification');

// exports.register = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       phone,
//       password,
//       confirmPassword,
//       gender,
//       // subscriptionType,
//     subscriptionType: 'Trial',
//   trialExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
//       examCategory,
//       termConditions,
//       referralCode
//     } = req.body;

//     if (!termConditions) {
//       return res.status(400).json({ message: 'You must accept the terms and conditions.' });
//     }

//     if (password !== confirmPassword) {
//       return res.status(400).json({ message: 'Passwords do not match' });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: 'User with this email already exists' });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

//     const user = new User({
//       firstName,
//       lastName,
//       email,
//       phone,
//       password,
//       gender,
//       subscriptionType,
//       examCategory,
//       isActive: true,
//       lastActiveDate: new Date(),
//       isEmailVerified: false,
//       otp,
//       otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
//       termConditions,
//       referralCode,
//       ipAddress: ip,
//     });

//     await user.save();

//     // Send OTP via email
//     const transporter = nodemailer.createTransport({
//       service: 'Gmail',
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//       },
//     });

//     await transporter.sendMail({
//       from: process.env.SMTP_USER,
//       to: email,
//       subject: 'Verify Your Email',
//       // text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
//       // html: `
//       // <!-- Paste your complete HTML email template here -->
//       // <!-- Replace any variables like ${firstName} and ${otp} as needed -->
      
//       // <!-- Truncated preview -->
//       // <html lang="en">
//       // <head>
//       //   <meta charset="UTF-8">
//       //   <title>Email Verification</title>
//       //   <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@100;200;300;400;500;600;700;800;900" rel="stylesheet">
//       //   <style>
//       //     body { font-family: 'Nunito', Arial, sans-serif; background-color: #f2f2f2; margin: 0; padding: 0; }
//       //   </style>
//       // </head>
//       // <body>
//       //   <table width="100%" style="background-color:#f2f2f2;">
//       //     <tr>
//       //       <td align="center">
//       //         <table width="600" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
//       //           <tr>
//       //             <td style="background-color:#002e2c; padding:20px; color:#ffffff;">
//       //               <img src="https://5dd79389a2.imgdist.com/pub/bfra/5lx74iao/fv0/1ra/wg1/Blue%20Modern%20Illustrative%20Engineering%20Services%20Logo%20Design%20.png" alt="Logo" width="160" style="border-radius:5px;">
//       //             </td>
//       //           </tr>
//       //           <tr>
//       //             <td style="padding:30px;">
//       //               <p style="font-size:16px;">Hi <strong>${firstName}</strong>,</p>
//       //               <p style="font-size:15px;">Thanks for signing up with <strong>Rapid Steno</strong>! To complete your registration, please verify your email using the code below:</p>
//       //               <p style="font-size:24px; font-weight:bold; text-align:center; background:#f1f3f5; padding:15px; border-radius:6px;">${otp}</p>
//       //               <p style="font-size:14px;">This OTP is valid for 10 minutes. If you didn’t initiate this registration, you can safely ignore this email.</p>
//       //               <p style="margin-top:30px; font-size:14px;">Happy Practicing,<br><strong>The Rapid Steno Team</strong></p>
//       //               <p style="font-size:14px;"><a href="http://www.rapidsteno.com" style="color:#0068A5; text-decoration:none;">www.rapidsteno.com</a></p>
//       //             </td>
//       //           </tr>
//       //           <tr>
//       //             <td style="background-color:#002e2c; text-align:center; padding:20px; color:#F8F8F8; font-size:14px;">
//       //               &copy; 2025 Rapid Steno. All Rights Reserved.
//       //             </td>
//       //           </tr>
//       //         </table>
//       //       </td>
//       //     </tr>
//       //   </table>
//       // </body>
//       // </html>
//       // `,
      
//       html: `
// <!DOCTYPE html>
// <html lang="en" style="font-family: Arial, sans-serif;">
// <head><meta charset="UTF-8"><title>Email Verification</title></head>
// <body style="background-color: #f4f6f8; padding: 40px;">
//   <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); overflow: hidden;">
//     <tr>
//       <td style="background-color: #0a66c2; color: #ffffff; padding: 20px 30px; text-align: center;">
//         <h1 style="margin: 0; font-size: 24px;">Verify Your Email Address</h1>
//       </td>
//     </tr>
//     <tr>
//       <td style="padding: 30px; color: #333;">
//         <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${firstName}</strong>,</p>
//         <p style="font-size: 15px; line-height: 1.6;">
//           Thank you for registering with <strong>Rapid Steno</strong>. To complete your registration, please verify your email address using the OTP below.
//         </p>
//         <p style="font-size: 18px; font-weight: bold; text-align: center; margin: 30px 0; background: #f1f3f5; padding: 15px; border-radius: 6px; letter-spacing: 2px;">
//           ${otp}
//         </p>
//         <p style="font-size: 14px; color: #555;">
//           This OTP will expire in 10 minutes. If you didn’t request this, please ignore this email.
//         </p>
//         <p style="margin-top: 30px; font-size: 14px;">Best Regards,<br><strong>Rapid Steno Team</strong></p>
//       </td>
//     </tr>
//     <tr>
//       <td style="background-color: #f1f3f5; padding: 20px; text-align: center; font-size: 13px; color: #777;">
//         &copy; Rapid Steno. All rights reserved.
//       </td>
//     </tr>
//   </table>
// </body>
// </html>
// `,

//     });

//     res.status(201).json({
//       message: 'Registered. OTP sent to email. Please verify to activate your account.',
//       userId: user._id,
//       email: user.email,
//       createdAt: user.createdAt, 
//     });

//   } catch (error) {
//     res.status(500).json({ message: 'Server Error', error });
//   }
// };

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
    } = req.body;

    // ✅ Step 2: Validate terms acceptance
    if (!termConditions) {
      return res.status(400).json({ message: 'You must accept the terms and conditions.' });
    }

    // ✅ Step 3: Password match check
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // ✅ Step 4: Check if user already exists
    const existingUser = await User.findOne({ email });
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
      email,
      phone,
      password,
      gender,
      subscriptionType: 'Trial',                          // 👈 Force trial
      // trialExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 👈 5 minutes from now
      // trialExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      // trialExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 👈 5 minutes from now
trialExpiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 👈 15 days from now

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
    });

    await user.save();

    // ✅ Step 8: Send OTP via email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
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


// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ message: 'Invalid email or password' });

//     if (!user.isEmailVerified) {
//       return res.status(403).json({ message: 'Please verify your email before logging in.' });
//     }

//     if (!user.isActive) {
//       return res.status(403).json({ message: 'User is deactivated. Contact admin.' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

//     const sessionToken = crypto.randomUUID();

//     user.sessionToken = sessionToken;
//     user.lastActiveDate = new Date();
//     user.loginCount += 1;
//     await user.save();

//     // const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     const now = new Date();
//     const midnight = new Date();
//     midnight.setHours(24, 0, 0, 0); // Sets to 12:00 AM of the next day
    
//     const secondsUntilMidnight = Math.floor((midnight - now) / 1000); // in seconds
    
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: `${secondsUntilMidnight}s`,
//     });

    
//     res.status(200).json({
//       message: 'Login successful',
//       token,
//       sessionToken,
//       userId: user._id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       phone: user.phone,
//       subscriptionType: user.subscriptionType,
//       createdAt: user.createdAt, 
//       hasSeenGrowthTour: user.hasSeenGrowthTour || false,
//       hasSeenComparisonTour: user.hasSeenComparisonTour || false,
//     });

//   } catch (error) {
//     res.status(500).json({ message: 'Server Error', error });
//   }
// };

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User is deactivated. Contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    // ✅ Auto-expire trial if it's over
    // if (user.subscriptionType === 'Trial' && user.trialExpiresAt && new Date() > user.trialExpiresAt) {
    //   user.subscriptionType = 'Unpaid';
    //   user.trialExpiresAt = undefined;
    // }

    // // ✅ Auto-expire paid plan after 30 days
    // if (user.subscriptionType === 'Paid' && user.paidUntil && new Date() > user.paidUntil) {
    //   user.subscriptionType = 'Unpaid';
    //   user.paidUntil = undefined;
    // }

    // // ❌ Block unpaid users from logging in
    // if (user.subscriptionType === 'Unpaid') {
    //   return res.status(403).json({
    //     message: 'Your free trial or subscription has expired. Please contact admin.'
    //   });
    // }

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

// ❌ Block unpaid users from logging in
if (user.subscriptionType === 'Unpaid') {
  return res.status(403).json({
    message: 'Your free trial or subscription has expired. Please contact admin.'
  });
}

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

// exports.verifyOtp = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     const user = await User.findOne({ email });
//     if (!user || user.otp !== otp || user.otpExpiresAt < new Date()) {
//       return res.status(400).json({ message: 'Invalid or expired OTP' });
//     }

//     user.isEmailVerified = true;
//     user.otp = undefined;
//     user.otpExpiresAt = undefined;
//     await user.save();

//     res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
//   } catch (error) {
//     res.status(500).json({ message: 'Verification failed', error });
//   }
// };
// userController.js

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
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
    const user = await User.findOne({ email });

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
      to: email,
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

  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

  // send OTP
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
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


// exports.verifyOtpAndRegister = async (req, res) => {
//   const {
//     email, otp, firstName, lastName, phone,
//     password, confirmPassword, gender, subscriptionType,
//     examCategory, termConditions, referralCode
//   } = req.body;

//   // const stored = otpStore[email];
//   // if (!stored || stored.otp !== otp || stored.expiresAt < Date.now()) {
//   //   return res.status(400).json({ message: 'Invalid or expired OTP' });
//   // }

//   const stored = otpStore[email];

// if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
//   return res.status(400).json({ message: 'Invalid or expired OTP' });
// }

//   if (password !== confirmPassword) {
//     return res.status(400).json({ message: 'Passwords do not match' });
//   }

//   const user = new User({
//     firstName,
//     lastName,
//     email,
//     phone,
//     password,
//     gender,
//     // subscriptionType,
//     subscriptionType: 'Trial',
// trialExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 5-minute trial

//     examCategory,
//     isActive: true,
//     isEmailVerified: true,
//     referralCode,
//     termConditions,
//     lastActiveDate: new Date(),
//     ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress
//   });

//   await user.save();
//   delete otpStore[email];

//   res.status(201).json({ message: 'User registered successfully' });
// };


// // In your user controller
// exports.markTourAsSeen = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     user.hasSeenTour = true;
//     await user.save();

//     res.status(200).json({ message: 'Tour marked as seen' });
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to update tour status', error });
//   }
// };
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


// exports.markTourAsSeen = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     user.hasSeenTour = true;
//     await user.save();
    

//     res.status(200).json({ message: 'Tour marked as seen' });
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to update tour status', error });
//   }
// };

// exports.verifyOtpAndRegister = async (req, res) => {
//   const {
//     email, otp, firstName, lastName, phone,
//     password, confirmPassword, gender,
//     examCategory, termConditions, referralCode
//   } = req.body;

//   const stored = otpStore[email];

//   if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
//     return res.status(400).json({ message: 'Invalid or expired OTP' });
//   }

//   if (password !== confirmPassword) {
//     return res.status(400).json({ message: 'Passwords do not match' });
//   }

//   const user = new User({
//     firstName,
//     lastName,
//     email,
//     phone,
//     password,
//     gender,
//     subscriptionType: 'Trial',
//     trialExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
//     examCategory,
//     isActive: true,
//     isEmailVerified: true,
//     referralCode,
//     termConditions,
//     lastActiveDate: new Date(),
//     ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress
//   });

//   await user.save();
//   delete otpStore[email];

//   // ✅ Send Welcome Email
//   const transporter = nodemailer.createTransport({
//     service: 'Gmail',
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS,
//     },
//   });

//   const welcomeHtml = `
//   <!DOCTYPE html>
// <html lang="en" style="font-family: Arial, sans-serif;">
// <head>
//   <meta charset="UTF-8">
//   <title>Welcome to Rapid Steno</title>
// </head>
// <body style="background-color: #f4f6f8; padding: 30px;">
//   <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
//     <!-- Header -->
//     <tr>
//       <td style="background-color: #002E2C; text-align: center; padding: 25px 0;">
//         <h2 style="color: #fff; margin: 0;">RAPID STENO</h2>
//         <p style="color: #cfd8dc; font-size: 14px; margin: 4px 0;">Professional Stenography Training</p>
//       </td>
//     </tr>

//     <!-- Title -->
//     <tr>
//       <td style="padding: 30px 25px 15px;">
//         <h3 style="margin: 0; font-size: 20px; color: #333;">🎉 Registration Successful!</h3>
//         <p style="font-size: 14px; color: #555;">
//           Welcome to Rapid Steno! Your account has been successfully created. You can now start working on the following sections to enhance your stenography skills.
//         </p>
//       </td>
//     </tr>

//     <!-- Feature Cards -->
//     <tr>
//       <td style="padding: 10px 25px 20px;">
//         <table width="100%" cellspacing="0" cellpadding="0" style="text-align: left;">
//           <tr>
//             <td width="50%" style="padding: 10px;">
//               <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px;">
//                 <strong>🗣️ Dictation</strong><br>
//                 <small>Practice with real-time dictation exercises at various speeds to improve your stenography skills.</small>
//               </div>
//             </td>
//             <td width="50%" style="padding: 10px;">
//               <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px;">
//                 <strong>📈 Growth Analysis</strong><br>
//                 <small>Track your progress over time with detailed analytics and performance metrics.</small>
//               </div>
//             </td>
//           </tr>
//           <tr>
//             <td width="50%" style="padding: 10px;">
//               <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px;">
//                 <strong>📚 Self Practice</strong><br>
//                 <small>Access a library of practice materials to hone your skills at your own pace.</small>
//               </div>
//             </td>
//             <td width="50%" style="padding: 10px;">
//               <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px;">
//                 <strong>📄 Reports</strong><br>
//                 <small>Generate comprehensive reports on your accuracy, speed, and overall performance.</small>
//               </div>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>

//     <!-- Trial Info -->
//     <tr>
//       <td style="padding: 20px 25px; background-color: #f9fafb; border-top: 1px solid #e0e0e0; text-align: center;">
//         <p style="font-size: 15px; color: #111; margin: 0;">⏳ <strong>Your Free Trial is Active!</strong></p>
//         <p style="font-size: 14px; color: #666; margin: 5px 0 15px;">
//           You have <strong>15 days</strong> of free access to all premium features.
//           After your trial ends, subscribe to our monthly plan to continue your stenography journey with Rapid Steno.
//         </p>
//         <a href="https://www.rapidsteno.com/plans" style="display: inline-block; padding: 10px 20px; background-color: #002E2C; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">View Subscription Plans</a>
//       </td>
//     </tr>

//     <!-- Footer -->
//     <tr>
//       <td style="text-align: center; padding: 20px; font-size: 13px; color: #888;">
//         <p>Connect with us on social media:</p>
//         <p style="margin: 10px 0;">
//           <a href="#" style="margin: 0 8px; text-decoration: none;">📷 Instagram</a>
//           <a href="#" style="margin: 0 8px; text-decoration: none;">📘 Facebook</a>
//           <a href="#" style="margin: 0 8px; text-decoration: none;">🐦 Twitter</a>
//         </p>
//         <p style="color: #aaa;">© 2025 Rapid Steno. All rights reserved.</p>
//         <p style="color: #bbb;">If you have any questions, please contact our support team at <a href="mailto:support@rapidsteno.com">support@rapidsteno.com</a>.</p>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>

//   `;

//   await transporter.sendMail({
//     from: process.env.SMTP_USER,
//     to: email,
//     subject: 'Welcome to Rapid Steno!',
//     html: welcomeHtml
//   });

//   res.status(201).json({ message: 'User registered successfully' });
// };

exports.verifyOtpAndRegister = async (req, res) => {
  const {
    email, otp, firstName, lastName, phone,
    password, confirmPassword, gender, subscriptionType,
    examCategory, termConditions, referralCode
  } = req.body;

  const stored = otpStore[email];

if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
  return res.status(400).json({ message: 'Invalid or expired OTP' });
}

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  const user = new User({
    firstName,
    lastName,
    email,
    phone,
    password,
    gender,
    // subscriptionType,
    subscriptionType: 'Trial',
// trialExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 5-minute trial
trialExpiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    examCategory,
    isActive: true,
    isEmailVerified: true,
    referralCode,
    termConditions,
    lastActiveDate: new Date(),
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress
  });

  await user.save();
  delete otpStore[email];

  // ✅ Add to Brevo CRM List
const { addToBrevoList } = require('../utils/brevo');
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


  try {
    await sendWelcomeEmail(email, firstName);

    try {
  await notifyAdminOfRegistration(user);
} catch (err) {
  console.error("❌ Failed to send admin notification:", err.message);
}

  } catch (err) {
    console.error("❌ Failed to send welcome email:", err.message);
  }

  res.status(201).json({ message: 'User registered successfully' });
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
// exports.trackUserActivity = async (req, res) => {
//   try {
//     const { userId, page, timeSpent } = req.body;
//     if (!userId || !page || !timeSpent) {
//       return res.status(400).json({ message: 'Missing userId, page, or timeSpent' });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     const userAgent = req.headers['user-agent'] || '';
//     const parser = new UAParser(userAgent);
//     const deviceInfo = parser.getResult();

//     const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

//     // Find today's log
//     let todayLog = user.activityLogs.find(log => log.date === today);

//     if (!todayLog) {
//       todayLog = {
//         date: today,
//         totalActiveTime: 0,
//         totalPagesViewed: 0,
//         pages: []
//       };
//       user.activityLogs.push(todayLog);
//     }

//     // Update or push page
//     const pageEntry = todayLog.pages.find(p => p.page === page);
//     if (pageEntry) {
//       pageEntry.timeSpent += timeSpent;
//     } else {
//       todayLog.pages.push({
//         page,
//         timeSpent,
//         deviceType: deviceInfo.device.type || 'desktop',
//         browser: deviceInfo.browser.name || 'unknown',
//         os: deviceInfo.os.name || 'unknown',
//         userAgent
//       });
//     }

//     todayLog.totalActiveTime += timeSpent;
//     todayLog.totalPagesViewed += 1;

//     await user.save();

//     res.status(200).json({ message: 'Activity logged successfully' });

//   } catch (error) {
//     console.error('Track Activity Error:', error);
//     res.status(500).json({ message: 'Failed to track activity', error });
//   }
// };

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
    if (email && email !== user.email) {
      // Check if email is already taken
      const existing = await User.findOne({ email });
      if (existing && existing._id.toString() !== userId) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
      user.isEmailVerified = false; // Reset email verification
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
