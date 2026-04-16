/**
 * Notification Routes
 * API endpoints for notifications and preferences
 */

const router = require('express').Router();
const { protect } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

// Notification endpoints
router.get('/', notificationController.getMyNotifications);
router.get('/count/unread', notificationController.getUnreadCount);
router.put('/:notificationId/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:notificationId', notificationController.deleteNotification);
router.delete('/', notificationController.deleteAllNotifications);

// Preference endpoints
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);
router.put('/preferences/category/toggle', notificationController.toggleCategory);
router.put('/preferences/quiet-hours', notificationController.setQuietHours);
router.put('/mute', notificationController.muteNotifications);
router.put('/unmute', notificationController.unmuteNotifications);

module.exports = router;
