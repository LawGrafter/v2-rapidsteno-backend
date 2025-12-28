const AllExamAspirant = require('../models/AllExamAspirant');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory OTP store (same as authController)
const otpStore = {};

const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// Step 1: Send OTP for Registration
exports.sendOtpForRegistration = async (req, res) => {
  const { firstName, email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if user already exists
    const existingUser = await AllExamAspirant.findOne({
      email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[normalizedEmail] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10 mins

    // Send OTP
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
      subject: 'Your OTP for Rapid Steno (All Exam Aspirants)',
      html: `
      <!DOCTYPE html>
      <html lang="en" style="font-family: Arial, sans-serif;">
      <head><meta charset="UTF-8"><title>Email Verification</title></head>
      <body style="background-color: #f4f6f8; padding: 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); overflow: hidden;">
          <tr>
            <td style="background-color: #002E2C; color: #ffffff; padding: 20px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Rapid Steno</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; color: #333333;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${firstName || 'Aspirant'}</strong>,</p>
              <p style="font-size: 16px; margin-bottom: 20px;">Thank you for registering with us. Please use the OTP below to verify your email address.</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #002E2C; letter-spacing: 5px; border: 1px dashed #002E2C; padding: 10px 20px; border-radius: 5px;">${otp}</span>
              </div>
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

  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

// Step 2: Verify OTP and Register
exports.verifyOtpAndRegister = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    confirmPassword,
    gender,
    state,
    examType,
    referralCode,
    howDidHearAboutUs,
    examAttempt,
    termConditions,
    otp
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

  try {
    const user = new AllExamAspirant({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      password,
      gender,
      state,
      examType,
      referralCode,
      howDidHearAboutUs,
      examAttempt,
      termConditions,
      isEmailVerified: true,
      isActive: true,
      lastActiveDate: new Date(),
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    await user.save();
    delete otpStore[normalizedEmail]; // Remove OTP after successful registration

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: user._id,
      email: user.email
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const requestId = Date.now();

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await AllExamAspirant.findOne({
      email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User is deactivated.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate Token
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    // Save session token if needed (User model does this)
    user.sessionToken = token;
    user.lastActiveDate = new Date();
    await user.save();

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        examType: user.examType
      }
    });

  } catch (error) {
    console.error(`[LOGIN][${requestId}] Error:`, error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

// Get All Aspirants (Admin/Protected)
exports.getAllAspirants = async (req, res) => {
  try {
    const aspirants = await AllExamAspirant.find().select('-password');
    res.status(200).json(aspirants);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
