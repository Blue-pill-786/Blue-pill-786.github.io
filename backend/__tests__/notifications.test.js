/**
 * Jest Test Suite - Phase 1: Real-Time Notifications
 * Comprehensive tests for notification system
 */

const request = require('supertest');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const User = require('../models/User');
const Organization = require('../models/Organization');

// Mock socket service
jest.mock('../services/socketService');

describe('Notifications API Suite', () => {
  let app, server;
  let testUser, testOrg;
  let authToken;

  beforeAll(async () => {
    // Connect to test DB
    app = require('../server');
    server = app.listen(5001);

    // Create test org and user
    testOrg = await Organization.create({
      name: 'Test Org',
      owner: new mongoose.Types.ObjectId(),
    });

    testUser = await User.create({
      email: 'test@example.com',
      password: 'Test123!@#',
      organization: testOrg._id,
      status: 'active',
    });

    // Get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test123!@#' });

    authToken = response.body.data.token;
  });

  afterAll(async () => {
    await Notification.deleteMany();
    await NotificationPreference.deleteMany();
    await User.deleteMany();
    await Organization.deleteMany();
    await mongoose.connection.close();
    server.close();
  });

  describe('GET /api/notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await Notification.create([
        {
          organization: testOrg._id,
          recipient: testUser._id,
          type: 'payment:received',
          title: 'Payment Received',
          message: 'Payment of ₹1000 received',
          severity: 'success',
        },
        {
          organization: testOrg._id,
          recipient: testUser._id,
          type: 'payment:overdue',
          title: 'Payment Overdue',
          message: 'Payment is overdue',
          severity: 'error',
        },
      ]);
    });

    it('should return paginated notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter unread notifications only', async () => {
      const res = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((n) => !n.isRead)).toBe(true);
    });

    it('should filter by notification type', async () => {
      const res = await request(app)
        .get('/api/notifications?type=payment:received')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].type).toBe('payment:received');
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const notif = await Notification.create({
        organization: testOrg._id,
        recipient: testUser._id,
        type: 'payment:received',
        title: 'Payment',
        message: 'Got payment',
        severity: 'success',
      });

      const res = await request(app)
        .put(`/api/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).toBeDefined();
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    beforeEach(async () => {
      await Notification.deleteMany();
      await Notification.create([
        {
          organization: testOrg._id,
          recipient: testUser._id,
          type: 'payment:received',
          title: 'Payment 1',
          message: 'Message 1',
          severity: 'success',
          isRead: false,
        },
        {
          organization: testOrg._id,
          recipient: testUser._id,
          type: 'payment:received',
          title: 'Payment 2',
          message: 'Message 2',
          severity: 'success',
          isRead: false,
        },
      ]);
    });

    it('should mark all notifications as read', async () => {
      const res = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.modifiedCount).toBe(2);

      // Verify all marked as read
      const notifs = await Notification.find({
        recipient: testUser._id,
        organization: testOrg._id,
      });

      expect(notifs.every((n) => n.isRead)).toBe(true);
    });
  });

  describe('GET /api/notifications/count/unread', () => {
    it('should return unread count', async () => {
      const res = await request(app)
        .get('/api/notifications/count/unread')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(0);
      expect(res.body.data.hasUnread).toBeDefined();
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should return notification preferences', async () => {
      const res = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.categories).toBeDefined();
    });

    it('should create default preferences if not exists', async () => {
      // Delete preferences
      await NotificationPreference.deleteMany({ user: testUser._id });

      const res = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const updates = {
        emailNotifications: false,
        smsNotifications: true,
        inAppSound: true,
      };

      const res = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.data.emailNotifications).toBe(false);
      expect(res.body.data.smsNotifications).toBe(true);
      expect(res.body.data.inAppSound).toBe(true);
    });
  });

  describe('PUT /api/notifications/mute', () => {
    it('should mute notifications for specified duration', async () => {
      const res = await request(app)
        .put('/api/notifications/mute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ minutes: 60 });

      expect(res.status).toBe(200);
      expect(res.body.data.mutedUntil).toBeDefined();
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      const notif = await Notification.create({
        organization: testOrg._id,
        recipient: testUser._id,
        type: 'payment:received',
        title: 'Delete Test',
        message: 'Test',
        severity: 'success',
      });

      const res = await request(app)
        .delete(`/api/notifications/${notif._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      const deleted = await Notification.findById(notif._id);
      expect(deleted).toBeNull();
    });
  });
});

describe('Notifications Service', () => {
  describe('SocketService', () => {
    it('should emit payment:received notification', () => {
      const SocketService = require('../services/socketService');
      const mockIO = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
      const service = new SocketService(mockIO);

      service.notifyPaymentReceived('org1', 'inv1', 'tenant1', 1000);

      expect(mockIO.to).toHaveBeenCalledWith('org-org1');
    });

    it('should emit payment:overdue notification', () => {
      const SocketService = require('../services/socketService');
      const mockIO = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
      const service = new SocketService(mockIO);

      service.notifyPaymentOverdue('org1', 'tenant1', 'inv1', 5, 500);

      expect(mockIO.to).toHaveBeenCalledWith('org-org1');
    });

    it('should track online users', () => {
      const SocketService = require('../services/socketService');
      const mockIO = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
      const service = new SocketService(mockIO);

      const onlineCount = service.getConnectedUsersCount();
      expect(typeof onlineCount).toBe('number');
    });
  });
});

describe('Notification Model', () => {
  describe('Schema Validation', () => {
    it('should validate required fields', async () => {
      const notif = new Notification({});

      try {
        await notif.validate();
        expect(true).toBe(false); // Should throw
      } catch (error) {
        expect(error.errors).toBeDefined();
      }
    });

    it('should accept valid notification', async () => {
      const notif = new Notification({
        organization: new mongoose.Types.ObjectId(),
        recipient: new mongoose.Types.ObjectId(),
        type: 'payment:received',
        title: 'Test',
        message: 'Test message',
      });

      const validation = await notif.validate();
      expect(validation).toBeUndefined();
    });
  });

  describe('Index Performance', () => {
    it('should have indexes for common queries', () => {
      const indexes = Notification.collection.getIndexes();
      expect(Object.keys(indexes).length).toBeGreaterThan(0);
    });
  });
});
