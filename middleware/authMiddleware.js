// const jwt = require('jsonwebtoken');

// // Use secret from environment variables
// const SECRET_KEY = process.env.JWT_SECRET;

// module.exports = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(403).json({ message: 'Access Denied: No token provided' });
//   }

//   const token = authHeader.split(' ')[1];
//   try {
//     const decoded = jwt.verify(token, SECRET_KEY);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: 'Invalid or expired token' });
//   }
// };


// const jwt = require('jsonwebtoken');

// const SECRET_KEY = process.env.JWT_SECRET;

// module.exports = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(403).json({ message: 'Admin Access Denied: No token provided' });
//   }

//   const token = authHeader.split(' ')[1];

//   try {
//     const decoded = jwt.verify(token, SECRET_KEY);

//     // Optional check: make sure decoded email matches your adminEmail
//     const { adminEmail } = require('../models/adminModel');
//     if (decoded.email !== adminEmail) {
//       return res.status(403).json({ message: 'Access Denied: Not an admin token' });
//     }

//     req.admin = decoded; // Set decoded token on req.admin
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: 'Invalid or expired admin token' });
//   }
// };
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

    const { adminEmail } = require('../models/adminModel');
    // if (decoded.email !== adminEmail) {
    //   return res.status(403).json({ message: 'Access Denied: Not an admin token' });
    // }
    

    // ✅ Check if token email matches allowed admin email
    if (decoded.email !== ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Access Denied: Not an admin token' });
    }


    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
