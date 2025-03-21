const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword, gender } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = new User({ firstName, lastName, email, phone, password, gender, isActive: true });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// ✅ Login API
exports.login = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Check if the user exists
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Invalid email or password' });
  
      // Check if the user is active
      if (!user.isActive) {
        return res.status(403).json({ message: 'User is deactivated. Contact admin.' });
      }
  
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });
  
      // Generate a JWT token
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      res.status(200).json({ message: 'Login successful', token });
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
