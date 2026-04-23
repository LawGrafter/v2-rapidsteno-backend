const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

// ── Admin: Create notification ──
exports.createNotification = async (req, res) => {
  try {
    const {
      type, title, description, imageUrl,
      buttonText, buttonLink, buttonLinkType,
      targetAudience, targetPlanTypes, targetUserIds, expiryDays,
    } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (type === 'image' && !imageUrl) return res.status(400).json({ success: false, message: 'Image URL is required for image notifications' });

    const notification = new Notification({
      type: type || 'text',
      title,
      description: description || '',
      imageUrl: imageUrl || '',
      buttonText: buttonText || '',
      buttonLink: buttonLink || '',
      buttonLinkType: buttonLinkType || 'internal',
      targetAudience: targetAudience || 'all',
      targetPlanTypes: targetAudience === 'plan_based' ? (targetPlanTypes || []) : [],
      expiryDays: targetAudience === 'expiring_soon' ? (parseInt(expiryDays) || 0) : 0,
      targetUserIds: targetAudience === 'individual' ? (targetUserIds || []) : [],
      sentBy: req.admin?.name || 'Admin',
    });

    await notification.save();
    res.status(201).json({ success: true, message: 'Notification sent', data: notification });
  } catch (err) {
    console.error('Create Notification Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create notification', error: err.message });
  }
};

// ── Admin: Get all notifications (history) ──
exports.getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('targetUserIds', 'firstName lastName email')
        .lean(),
      Notification.countDocuments(),
    ]);

    // Attach click & dismiss counts
    const data = notifications.map(n => ({
      ...n,
      totalClicks: n.clickedBy?.length || 0,
      totalDismissed: n.dismissedBy?.length || 0,
      totalTargeted: n.targetAudience === 'individual' ? n.targetUserIds?.length : null,
    }));

    res.status(200).json({ success: true, data, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Get Notifications Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: err.message });
  }
};

// ── Admin: Delete notification ──
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete notification', error: err.message });
  }
};

// ── Admin: Toggle notification active status ──
exports.toggleNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    notification.isActive = !notification.isActive;
    await notification.save();
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle notification', error: err.message });
  }
};

// ── Admin: Get audience counts ──
exports.getAudienceCounts = async (req, res) => {
  try {
    const now = new Date();
    const expiryDaysArr = [7, 10, 15, 20];
    const expiryQueries = expiryDaysArr.map(d => {
      const until = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      return User.countDocuments({ paidUntil: { $gte: now, $lte: until } });
    });

    const [total, paid, trial, unpaid, planCounts, ...expiryCounts] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ subscriptionType: 'Paid' }),
      User.countDocuments({ subscriptionType: 'Trial' }),
      User.countDocuments({ subscriptionType: 'Unpaid' }),
      User.aggregate([
        { $match: { SubscriptionPlanType: { $ne: '' } } },
        { $group: { _id: { $toLower: '$SubscriptionPlanType' }, count: { $sum: 1 } } },
      ]),
      ...expiryQueries,
    ]);

    const plans = {};
    planCounts.forEach(p => { plans[p._id] = p.count; });

    const expiring = {};
    expiryDaysArr.forEach((d, i) => { expiring[d] = expiryCounts[i]; });

    res.status(200).json({
      success: true,
      data: { all: total, paid, trial, unpaid, plans, expiring },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get counts', error: err.message });
  }
};

// ── Admin: Search users by name/email for individual targeting ──
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(200).json({ success: true, data: [] });

    const regex = new RegExp(q, 'i');
    const users = await User.find({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ],
    })
    .select('firstName lastName email phone subscriptionType')
    .limit(20)
    .lean();

    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed', error: err.message });
  }
};

// ── User: Get notifications for current user ──
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(userId).select('subscriptionType SubscriptionPlanType paidUntil').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const subType = (user.subscriptionType || '').toLowerCase(); // trial, paid, unpaid
    const planType = (user.SubscriptionPlanType || '').toLowerCase(); // gold, ahc, silver, etc.

    // Show notifications from the last 30 days that target this user
    const userObjId = new mongoose.Types.ObjectId(userId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orConditions = [
      { targetAudience: 'all' },
      { targetAudience: subType },
      { targetAudience: 'individual', targetUserIds: userObjId },
    ];
    // Plan-based targeting: match if user's SubscriptionPlanType is in targetPlanTypes
    if (planType) {
      orConditions.push({ targetAudience: 'plan_based', targetPlanTypes: planType });
    }
    // Expiring soon: fetch all, filter in code based on user's paidUntil
    orConditions.push({ targetAudience: 'expiring_soon' });
    const filter = { createdAt: { $gte: thirtyDaysAgo }, $or: orConditions };

    let notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Filter expiring_soon: only show if user's paidUntil is within expiryDays from now
    const now = new Date();
    const userPaidUntil = user.paidUntil ? new Date(user.paidUntil) : null;
    notifications = notifications.filter(n => {
      if (n.targetAudience !== 'expiring_soon') return true;
      if (!userPaidUntil || !n.expiryDays) return false;
      const daysLeft = Math.ceil((userPaidUntil - now) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= n.expiryDays;
    });

    // Mark which are dismissed/seen by this user
    const data = notifications.map(n => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      description: n.description,
      imageUrl: n.imageUrl,
      buttonText: n.buttonText,
      buttonLink: n.buttonLink,
      buttonLinkType: n.buttonLinkType,
      createdAt: n.createdAt,
      isActive: n.isActive,
      isSeen: (n.dismissedBy || []).some(id => id.toString() === userId.toString()),
    }));

    const unseenCount = data.filter(n => !n.isSeen && n.isActive).length;

    res.status(200).json({ success: true, data, unseenCount });
  } catch (err) {
    console.error('Get User Notifications Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: err.message });
  }
};

// ── User: Mark notification as seen/dismissed ──
exports.dismissNotification = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    await Notification.findByIdAndUpdate(id, {
      $addToSet: { dismissedBy: userId },
    });

    res.status(200).json({ success: true, message: 'Notification dismissed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to dismiss', error: err.message });
  }
};

// ── User: Track button click ──
exports.trackClick = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    await Notification.findByIdAndUpdate(id, {
      $addToSet: { clickedBy: userId },
      $inc: { totalClicks: 1 },
    });

    res.status(200).json({ success: true, message: 'Click tracked' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to track click', error: err.message });
  }
};
