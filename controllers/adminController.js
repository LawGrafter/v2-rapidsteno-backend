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
const { adminEmail, adminPassword } = require('../models/adminModel');

exports.adminLogin = (req, res) => {
  const { email, password } = req.body;

  if (email === adminEmail && password === adminPassword) {
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });
    return res.status(200).json({ message: 'Login successful', token });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
};
