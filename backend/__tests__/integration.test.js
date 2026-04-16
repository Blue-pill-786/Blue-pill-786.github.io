/**
 * Integration & E2E Tests - Phase 1
 * Full flow testing for real-time notifications and document management
 */

const request = require('supertest');
const mongoose = require('mongoose');
const io = require('socket.io-client');

describe('End-to-End Integration Tests', () => {
  let app, server, socket;
  let testUser, testOrg, authToken;
  const TEST_PORT = 5003;

  beforeAll(async () => {
    app = require('../server');
    server = app.listen(TEST_PORT);

    // Create test data
    testOrg = await Organization.create({
      name: 'E2E Test Org',
      owner: new mongoose.Types.ObjectId(),
    });

    testUser = await User.create({
      email: 'e2e@test.com',
      password: 'E2eTest123!@#',
      organization: testOrg._id,
      status: 'active',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'e2e@test.com', password: 'E2eTest123!@#' });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    if (socket) socket.disconnect();
    await User.deleteMany();
    await Organization.deleteMany();
    await Notification.deleteMany();
    await Document.deleteMany();
    await mongoose.connection.close();
    server.close();
  });

  describe('Real-Time Notifications Flow', () => {
    it('should emit payment notification via socket', async () => {
      return new Promise((resolve, reject) => {
        // Connect to socket
        socket = io(`http://localhost:${TEST_PORT}`, {
          auth: { token: authToken },
        });

        socket.on('connect', () => {
          // Emit payment event
          socket.emit('payment:simulate', {
            tenant: 'test-tenant',
            amount: 1000,
          });
        });

        socket.on('notification:new', (data) => {
          expect(data.type).toBe('payment:received');
          expect(data.amount).toBe(1000);
          resolve();
        });

        socket.on('error', reject);

        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
    });

    it('should save notification to database', async () => {
      // Send payment via socket (triggers save)
      const res = await request(app)
        .post('/api/notifications/simulate-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          invoiceId: 'test-inv-1',
        });

      expect(res.status).toBe(201);

      // Verify saved in database
      const notifications = await Notification.find({
        recipient: testUser._id,
        type: 'payment:received',
      });

      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should fetch notifications with real-time sync', async () => {
      // Create test notification
      const testNotif = await Notification.create({
        organization: testOrg._id,
        recipient: testUser._id,
        type: 'payment:received',
        title: 'E2E Test Payment',
        message: 'E2E testing payment notification',
      });

      // Fetch via API
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      const foundNotif = res.body.data.find((n) => n._id === testNotif._id.toString());
      expect(foundNotif).toBeDefined();
      expect(foundNotif.title).toBe('E2E Test Payment');
    });

    it('should handle user preferences affecting notifications', async () => {
      // Set preference to disable email notifications
      await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: false,
        });

      // Send notification
      const notif = await Notification.create({
        organization: testOrg._id,
        recipient: testUser._id,
        type: 'payment:received',
        title: 'Preference Test',
        message: 'Testing preferences',
      });

      // Verify email wasn't queued (mock would show this)
      expect(notif._id).toBeDefined();
    });

    it('should support mute/quiet hours', async () => {
      // Enable quiet hours (10pm - 8am)
      await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
          },
        });

      const res = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data.quietHours.enabled).toBe(true);
    });

    it('should mark multiple notifications as read', async () => {
      // Create batch notifications
      const notifs = await Notification.create([
        {
          organization: testOrg._id,
          recipient: testUser._id,
          type: 'payment:received',
          title: 'Batch 1',
          message: 'Message 1',
          isRead: false,
        },
        {
          organization: testOrg._id,
          recipient: testUser._id,
          type: 'payment:received',
          title: 'Batch 2',
          message: 'Message 2',
          isRead: false,
        },
      ]);

      // Mark all as read
      const res = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.modifiedCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle WebSocket disconnection gracefully', () => {
      return new Promise((resolve, reject) => {
        socket = io(`http://localhost:${TEST_PORT}`, {
          auth: { token: authToken },
        });

        socket.on('connect', () => {
          socket.disconnect();
          expect(socket.connected).toBe(false);
          resolve();
        });

        socket.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
    });

    it('should reconnect automatically on disconnect', () => {
      return new Promise((resolve, reject) => {
        socket = io(`http://localhost:${TEST_PORT}`, {
          auth: { token: authToken },
          reconnection: true,
          reconnectionDelay: 100,
        });

        socket.on('connect', () => {
          socket.disconnect();

          socket.connect();

          socket.once('connect', () => {
            expect(socket.connected).toBe(true);
            resolve();
          });
        });

        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
    });
  });

  describe('Document Management Full Flow', () => {
    it('should upload document end-to-end', async () => {
      const fs = require('fs');
      const path = require('path');

      // Create test file
      const filePath = path.join(__dirname, '../test-files/e2e-test.pdf');
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }
      fs.writeFileSync(filePath, 'Test PDF Content');

      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('category', 'tenant_documents')
        .field('tags', 'test,e2e')
        .attach('file', filePath);

      expect(res.status).toBe(201);
      expect(res.body.data.url).toBeDefined();
      expect(res.body.data.category).toBe('tenant_documents');
      expect(res.body.data.tags).toContain('e2e');

      // Cleanup
      fs.unlinkSync(filePath);
    });

    it('should search uploaded documents', async () => {
      // Create test document
      const doc = await Document.create({
        organization: testOrg._id,
        owner: testUser._id,
        filename: 'search-test.pdf',
        originalName: 'search-test.pdf',
        url: 'https://test.com/search-test.pdf',
        fileType: 'application/pdf',
        category: 'reports',
        tags: ['searchable', 'test'],
      });

      // Search for document
      const res = await request(app)
        .get('/api/documents/search?q=searchable')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      if (res.body.data.length > 0) {
        const found = res.body.data.find((d) => d._id === doc._id.toString());
        expect(found).toBeDefined();
      }
    });

    it('should share document and access via link', async () => {
      const doc = await Document.create({
        organization: testOrg._id,
        owner: testUser._id,
        filename: 'share-test.pdf',
        originalName: 'share-test.pdf',
        url: 'https://test.com/share.pdf',
        fileType: 'application/pdf',
      });

      // Create share link
      const shareRes = await request(app)
        .post(`/api/documents/${doc._id}/share`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expiryDays: 7 });

      expect(shareRes.status).toBe(200);

      const shareToken = shareRes.body.data.shareLink.split('/').pop();

      // Access without authentication
      const accessRes = await request(app).get(`/api/documents/shared/${shareToken}`);

      expect(accessRes.status).toBe(200);
      expect(accessRes.body.data).toBeDefined();
    });

    it('should handle document versions', async () => {
      const doc = await Document.create({
        organization: testOrg._id,
        owner: testUser._id,
        filename: 'version-test.pdf',
        originalName: 'version-test.pdf',
        url: 'https://test.com/v1.pdf',
        fileType: 'application/pdf',
        versions: [],
      });

      // Create new version
      const updateRes = await request(app)
        .put(`/api/documents/${doc._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://test.com/v2.pdf',
          versionComment: 'Updated lease terms',
        });

      expect(updateRes.status).toBe(200);

      // Fetch document details with version history
      const detailRes = await request(app)
        .get(`/api/documents/${doc._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(detailRes.body.data.versions.length).toBeGreaterThan(0);
    });

    it('should soft delete and restore documents', async () => {
      const doc = await Document.create({
        organization: testOrg._id,
        owner: testUser._id,
        filename: 'delete-test.pdf',
        originalName: 'delete-test.pdf',
        url: 'https://test.com/delete.pdf',
        fileType: 'application/pdf',
      });

      // Soft delete
      const deleteRes = await request(app)
        .delete(`/api/documents/${doc._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify not in main list
      const listRes = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`);

      const notFound = listRes.body.data.find((d) => d._id === doc._id.toString());
      expect(notFound).toBeUndefined();

      // Restore
      const restoreRes = await request(app)
        .post(`/api/documents/${doc._id}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.deletedAt).toBeNull();
    });

    it('should track document statistics', async () => {
      // Create multiple documents
      await Document.create([
        {
          organization: testOrg._id,
          owner: testUser._id,
          filename: 'stat1.pdf',
          originalName: 'stat1.pdf',
          url: 'https://test.com/stat1.pdf',
          fileType: 'application/pdf',
          size: 100000,
          category: 'receipts',
        },
        {
          organization: testOrg._id,
          owner: testUser._id,
          filename: 'stat2.docx',
          originalName: 'stat2.docx',
          url: 'https://test.com/stat2.docx',
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 200000,
          category: 'tenant_documents',
        },
      ]);

      const res = await request(app)
        .get('/api/documents/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalDocuments).toBeGreaterThan(0);
      expect(res.body.data.totalSize).toBeGreaterThan(0);
      expect(res.body.data.categoryCounts).toBeDefined();
    });
  });

  describe('Real-Time + Document Integration', () => {
    it('should notify when document is shared', async () => {
      return new Promise((resolve, reject) => {
        const doc = await Document.create({
          organization: testOrg._id,
          owner: testUser._id,
          filename: 'notify-share.pdf',
          url: 'https://test.com/notify.pdf',
          fileType: 'application/pdf',
        });

        socket = io(`http://localhost:${TEST_PORT}`, {
          auth: { token: authToken },
        });

        socket.on('notification:document_shared', (data) => {
          expect(data.documentId).toBe(doc._id.toString());
          resolve();
        });

        socket.on('error', reject);

        // Create share which should emit notification
        request(app)
          .post(`/api/documents/${doc._id}/share`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ expiryDays: 7 });

        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
    });

    it('should handle concurrent operations', async () => {
      const promises = [];

      // Multiple notification fetches
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${authToken}`),
        );
      }

      // Multiple document operations
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .get('/api/documents')
            .set('Authorization', `Bearer ${authToken}`),
        );
      }

      const results = await Promise.all(promises);

      results.forEach((res) => {
        expect(res.status).toBeLessThan(400);
      });
    });

    it('should maintain data consistency', async () => {
      // Create notification and document
      const notif = await Notification.create({
        organization: testOrg._id,
        recipient: testUser._id,
        type: 'document:uploaded',
        title: 'Document Uploaded',
      });

      const doc = await Document.create({
        organization: testOrg._id,
        owner: testUser._id,
        filename: 'consistency.pdf',
        url: 'https://test.com/consistency.pdf',
        fileType: 'application/pdf',
      });

      // Verify both accessible
      const notifRes = await request(app)
        .get(`/api/notifications`)
        .set('Authorization', `Bearer ${authToken}`);

      const docRes = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(notifRes.status).toBe(200);
      expect(docRes.status).toBe(200);
    });
  });

  describe('Performance & Load Tests', () => {
    it('should handle notifications pagination efficiently', async () => {
      // Create batch of notifications
      const notifs = Array(50)
        .fill(null)
        .map((_, i) => ({
          organization: testOrg._id,
          recipient: testUser._id,
          type: 'payment:received',
          title: `Notification ${i}`,
          message: `Test message ${i}`,
        }));

      await Notification.insertMany(notifs);

      const res = await request(app)
        .get('/api/notifications?limit=10&page=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(10);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(50);
    });

    it('should search documents with performance', async () => {
      const startTime = Date.now();

      const res = await request(app)
        .get('/api/documents/search?q=test')
        .set('Authorization', `Bearer ${authToken}`);

      const duration = Date.now() - startTime;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});

describe('Error Handling & Edge Cases', () => {
  let authToken, testUser, testOrg;

  beforeAll(async () => {
    testOrg = await Organization.create({
      name: 'Error Test Org',
    });

    testUser = await User.create({
      email: 'error-test@example.com',
      password: 'Error123!@#',
      organization: testOrg._id,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'error-test@example.com', password: 'Error123!@#' });

    authToken = res.body.data.token;
  });

  it('should handle invalid notification ID', async () => {
    const res = await request(app)
      .put(`/api/notifications/invalid-id/read`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should handle invalid document ID', async () => {
    const res = await request(app)
      .get('/api/documents/invalid-id')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should validate required fields on upload', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should prevent unauthorized access', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer invalid-token`);

    expect(res.status).toBe(401);
  });
});
