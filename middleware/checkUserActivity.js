const User = require('../models/userModel');

const checkUserActivity = async (req, res, next) => {
  const user = await User.findById(req.user.id); // assuming `req.user.id` from JWT middleware

  const lastActive = new Date(user.lastActiveDate);
  const now = new Date();
  const diff = now - lastActive;

  if (diff > 24 * 60 * 60 * 1000) { // 24 hours in ms
    user.sessionToken = null;
    await user.save();
    return res.status(401).json({ message: 'Logged out due to inactivity' });
  }


  
  user.lastActiveDate = now;
  await user.save();

  next();
};

module.exports = checkUserActivity;
