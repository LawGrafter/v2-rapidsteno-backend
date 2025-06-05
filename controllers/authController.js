const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      gender,
      subscriptionType,
      examCategory,
      termConditions,
      referralCode
    } = req.body;

    if (!termConditions) {
      return res.status(400).json({ message: 'You must accept the terms and conditions.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      subscriptionType,
      examCategory,
      isActive: true,
      lastActiveDate: new Date(),
      isEmailVerified: false,
      otp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      termConditions,
      referralCode,
      ipAddress: ip,
    });

    await user.save();

    // Send OTP via email
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
      // text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
      // html: `
      // <!-- Paste your complete HTML email template here -->
      // <!-- Replace any variables like ${firstName} and ${otp} as needed -->
      
      // <!-- Truncated preview -->
      // <html lang="en">
      // <head>
      //   <meta charset="UTF-8">
      //   <title>Email Verification</title>
      //   <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@100;200;300;400;500;600;700;800;900" rel="stylesheet">
      //   <style>
      //     body { font-family: 'Nunito', Arial, sans-serif; background-color: #f2f2f2; margin: 0; padding: 0; }
      //   </style>
      // </head>
      // <body>
      //   <table width="100%" style="background-color:#f2f2f2;">
      //     <tr>
      //       <td align="center">
      //         <table width="600" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
      //           <tr>
      //             <td style="background-color:#002e2c; padding:20px; color:#ffffff;">
      //               <img src="https://5dd79389a2.imgdist.com/pub/bfra/5lx74iao/fv0/1ra/wg1/Blue%20Modern%20Illustrative%20Engineering%20Services%20Logo%20Design%20.png" alt="Logo" width="160" style="border-radius:5px;">
      //             </td>
      //           </tr>
      //           <tr>
      //             <td style="padding:30px;">
      //               <p style="font-size:16px;">Hi <strong>${firstName}</strong>,</p>
      //               <p style="font-size:15px;">Thanks for signing up with <strong>Rapid Steno</strong>! To complete your registration, please verify your email using the code below:</p>
      //               <p style="font-size:24px; font-weight:bold; text-align:center; background:#f1f3f5; padding:15px; border-radius:6px;">${otp}</p>
      //               <p style="font-size:14px;">This OTP is valid for 10 minutes. If you didn’t initiate this registration, you can safely ignore this email.</p>
      //               <p style="margin-top:30px; font-size:14px;">Happy Practicing,<br><strong>The Rapid Steno Team</strong></p>
      //               <p style="font-size:14px;"><a href="http://www.rapidsteno.com" style="color:#0068A5; text-decoration:none;">www.rapidsteno.com</a></p>
      //             </td>
      //           </tr>
      //           <tr>
      //             <td style="background-color:#002e2c; text-align:center; padding:20px; color:#F8F8F8; font-size:14px;">
      //               &copy; 2025 Rapid Steno. All Rights Reserved.
      //             </td>
      //           </tr>
      //         </table>
      //       </td>
      //     </tr>
      //   </table>
      // </body>
      // </html>
      // `,
      
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

    const sessionToken = crypto.randomUUID();

    user.sessionToken = sessionToken;
    user.lastActiveDate = new Date();
    user.loginCount += 1;
    await user.save();

    // const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Sets to 12:00 AM of the next day
    
    const secondsUntilMidnight = Math.floor((midnight - now) / 1000); // in seconds
    
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
      createdAt: user.createdAt, 
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

    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

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


exports.verifyOtpAndRegister = async (req, res) => {
  const {
    email, otp, firstName, lastName, phone,
    password, confirmPassword, gender, subscriptionType,
    examCategory, termConditions, referralCode
  } = req.body;

  const stored = otpStore[email];
  if (!stored || stored.otp !== otp || stored.expiresAt < Date.now()) {
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
    subscriptionType,
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

  res.status(201).json({ message: 'User registered successfully' });
};
