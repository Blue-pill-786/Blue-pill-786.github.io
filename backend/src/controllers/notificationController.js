/**
 * Notification Controller
 * Handles notification-related API endpoints
 */

const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const { ResponseFormatter } = require('../utils/responseFormatter');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * Get all notifications for current user
 */
exports.getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false, type } = req.query;
    const userId = req.user.id;
    const organizationId = req.user.organization;

    let query = {
      recipient: userId,
      organization: organizationId,
    };

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(query),
    ]);

    return res.json(
      ResponseFormatter.paginated(notifications, page, limit, total)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organization;

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      organization: organizationId,
      isRead: false,
    });

    return res.json(
      ResponseFormatter.success({
        unreadCount,
        hasUnread: unreadCount > 0,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      throw new NotFoundError('Notification', notificationId);
    }

    return res.json(ResponseFormatter.success(notification));
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organization;

    const result = await Notification.updateMany(
      {
        recipient: userId,
        organization: organizationId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return res.json(
      ResponseFormatter.success({
        modifiedCount: result.modifiedCount,
        message: 'All notifications marked as read',
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete notification
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: userId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Notification', notificationId);
    }

    return res.json(
      ResponseFormatter.success({
        message: 'Notification deleted',
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete all notifications
 */
exports.deleteAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organization;

    const result = await Notification.deleteMany({
      recipient: userId,
      organization: organizationId,
    });

    return res.json(
      ResponseFormatter.success({
        deletedCount: result.deletedCount,
        message: 'All notifications deleted',
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification preferences
 */
exports.getPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organization;

    let preferences = await NotificationPreference.findOne({
      user: userId,
      organization: organizationId,
    });

    // Create default preferences if not exists
    if (!preferences) {
      preferences = await NotificationPreference.create({
        user: userId,
        organization: organizationId,
      });
    }

    return res.json(ResponseFormatter.success(preferences));
  } catch (error) {
    next(error);
  }
};

/**
 * Update notification preferences
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organization;
    const updates = req.body;

    let preferences = await NotificationPreference.findOne({
      user: userId,
      organization: organizationId,
    });

    if (!preferences) {
      preferences = await NotificationPreference.create({
        user: userId,
        organization: organizationId,
        ...updates,
      });
    } else {
      Object.assign(preferences, updates);
      await preferences.save();
    }

    return res.json(ResponseFormatter.success(preferences));
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle specific category
 */
exports.toggleCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organization;
    const { category, enabled } = req.body;

    if (!category) {
      throw new ValidationError('Category is required', []);
    }

    let preferences = await NotificationPreference.findOne({
      user: userId,
      organization: organizationId,
    });

    if (!preferences) {
      preferences = await NotificationPreference.create({
        user: userId,
        organization: organizationId,
      });
    }

    if (!preferences.categories[category]) {
      throw new ValidationError(`Invalid category: ${category}`, []);
    }

    preferences.categories[category].enabled = enabled !== false;
    await preferences.save();

    return res.json(ResponseFormatter.success(preferences));
  } catch (error) {
    next(error);
  }
};

/**
 * Set quiet hours
 */
exports.setQuietHours = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organization;
    const { enabled, start, end, timezone } = req.body;

    let preferences = await NotificationPreference.findOne({
      user: userId,
      organization: organizationId,
    });

    if (!preferences) {
      preferences = await NotificationPreference.create({
        user: userId,
        organization: organizationId,
      });
    }

    preferences.quietHours = {
      enabled: enabled !== false,
      start: start || preferences.quietHours.start,
      end: end || preferences.quietHours.end,
      timezone: timezone || preferences.quietHours.timezone,
    };

    await preferences.save();

    return res.json(ResponseFormatter.success(preferences));
  } catch (error) {
    next(error);
  }
};

/**
 * Mute notifications temporarily
 */
exports.muteNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organization;
    const { minutes = 60 } = req.body;

    let preferences = await NotificationPreference.findOne({
      user: userId,
      organization: organizationId,
    });

    if (!preferences) {
      preferences = await NotificationPreference.create({
        user: userId,
        organization: organizationId,
      });
    }

    preferences.muteDuration = new Date(Date.now() + minutes * 60 * 1000);
    await preferences.save();

    return res.json(
      ResponseFormatter.success({
        message: `Notifications muted for ${minutes} minutes`,
        mutedUntil: preferences.muteDuration,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Unmute notifications
 */
exports.unmuteNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organization;

    let preferences = await NotificationPreference.findOne({
      user: userId,
      organization: organizationId,
    });

    if (!preferences) {
      preferences = await NotificationPreference.create({
        user: userId,
        organization: organizationId,
      });
    }

    preferences.muteDuration = null;
    await preferences.save();

    return res.json(_Formatter.success({ message: 'Notifications unmuted' }));
  } catch (error) {
    next(error);
  }
};
