const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; 

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Admin Access Denied: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);

    // ✅ Check if token email matches the allowed admin email from .env
    if (decoded.email !== ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Access Denied: Not an admin token' });
    }

    // Attach admin data to request for downstream use
    req.admin = { email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
