const UserActivityLog = require('../models/UserActivityLog');
const User = require('../models/userModel');

/**
 * Get Activity Logs for a specific user by EMAIL
 * @route POST /api/admin-activity/user-by-email
 */
exports.getUserActivityLogsByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const { page = 1, limit = 20 } = req.query;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    const logs = await UserActivityLog.find({ user: user._id })
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await UserActivityLog.countDocuments({ user: user._id });
    const distinctIps = await UserActivityLog.distinct('ipAddress', { user: user._id });

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      data: logs,
      stats: {
        totalLogs: count,
        uniqueIps: distinctIps.length,
        ips: distinctIps
      },
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching user activity logs by email:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Get Activity Logs for a specific user
 * @route GET /api/admin-activity/user/:userId
 */
exports.getUserActivityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const logs = await UserActivityLog.find({ user: userId })
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await UserActivityLog.countDocuments({ user: userId });

    // Distinct IPs used by user
    const distinctIps = await UserActivityLog.distinct('ipAddress', { user: userId });

    res.status(200).json({
      success: true,
      data: logs,
      stats: {
        totalLogs: count,
        uniqueIps: distinctIps.length,
        ips: distinctIps
      },
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Get All Activity Logs (Global)
 * @route GET /api/admin/activity-logs
 */
exports.getAllActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    let query = {};
    if (search) {
        // Simple search by IP or User ID if provided
        // For User Name search, we'd need to populate and filter or aggregate.
        // Keeping it simple for now: IP search
        query = { ipAddress: { $regex: search, $options: 'i' } };
    }

    const logs = await UserActivityLog.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await UserActivityLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: logs,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching all activity logs:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
