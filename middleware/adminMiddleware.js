const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No Bearer token in header');
    return res.status(403).json({ message: 'Admin Access Denied: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log('🔍 Decoded token:', decoded);

    // ✅ New WhatsApp OTP login — isAdmin flag in token
    if (decoded.isAdmin === true) {
      console.log('✅ WhatsApp admin verified:', decoded.name);
      req.admin = { id: decoded.adminId, name: decoded.name };
      return next();
    }

    // ✅ Legacy email-based token — backward compatibility
    if (decoded.email && decoded.email === ADMIN_EMAIL) {
      console.log('✅ Email admin verified:', decoded.email);
      req.admin = { email: decoded.email };
      return next();
    }

    console.log('❌ Token does not have isAdmin=true or matching email');
    return res.status(403).json({ message: 'Access Denied: Not an admin token' });
  } catch (err) {
    console.log('❌ Token verification error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
