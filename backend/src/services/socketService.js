/**
 * Socket.io Service - Real-time event emitter
 * Handles all WebSocket events and real-time notifications
 * Supports event routing, user filtering, and organization isolation
 */

const ConnectedUsers = new Map(); // userId -> socket details

class SocketService {
  constructor(io) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Socket.io authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;
      const organizationId = socket.handshake.auth.organizationId;

      if (!token || !userId || !organizationId) {
        return next(new Error('Authentication failed'));
      }

      // Verify token (in production, verify JWT)
      socket.userId = userId;
      socket.organizationId = organizationId;
      next();
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ User connected: ${socket.userId}`);

      // Register user
      ConnectedUsers.set(socket.userId, {
        socketId: socket.id,
        organizationId: socket.organizationId,
        connectedAt: new Date(),
      });

      // Join organization room (for broadcasts)
      socket.join(`org-${socket.organizationId}`);
      socket.join(`user-${socket.userId}`);

      // Disconnect handler
      socket.on('disconnect', () => {
        ConnectedUsers.delete(socket.userId);
        console.log(`❌ User disconnected: ${socket.userId}`);
      });

      // Health check
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  /**
   * Emit to specific user
   */
  notifyUser(userId, eventType, data) {
    this.io.to(`user-${userId}`).emit(eventType, {
      type: eventType,
      data,
      timestamp: new Date(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  /**
   * Emit to organization (all users in org)
   */
  notifyOrganization(organizationId, eventType, data, excludeUserId = null) {
    const event = {
      type: eventType,
      data,
      timestamp: new Date(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Emit to org room
    this.io.to(`org-${organizationId}`).emit(eventType, event);

    // Exclude specific user if needed
    if (excludeUserId) {
      this.io.to(`user-${excludeUserId}`).emit('notification:excluded', {
        excludedEvent: event,
      });
    }
  }

  /**
   * Emit to multiple users
   */
  notifyUsers(userIds, eventType, data) {
    userIds.forEach((userId) => {
      this.notifyUser(userId, eventType, data);
    });
  }

  /**
   * Broadcast from server
   */
  broadcast(eventType, data) {
    this.io.emit(eventType, {
      type: eventType,
      data,
      timestamp: new Date(),
    });
  }

  /**
   * PAYMENT EVENTS
   */

  notifyPaymentReceived(organizationId, invoiceId, tenantId, amount) {
    this.notifyOrganization(organizationId, 'payment:received', {
      invoiceId,
      tenantId,
      amount,
      message: `Payment of ₹${amount} received`,
      severity: 'success',
      icon: '💰',
    });
  }

  notifyPaymentFailed(organizationId, invoiceId, tenantId, reason) {
    this.notifyUser(tenantId, 'payment:failed', {
      invoiceId,
      reason,
      message: `Payment failed: ${reason}`,
      severity: 'error',
      icon: '❌',
      actionUrl: `/payments/${invoiceId}`,
    });
  }

  notifyPaymentDueReminder(organizationId, tenantId, invoiceId, daysUntilDue) {
    const message =
      daysUntilDue === 0 ? 'Payment due today!' : `Payment due in ${daysUntilDue} days`;
    this.notifyUser(tenantId, 'payment:reminder', {
      invoiceId,
      daysUntilDue,
      message,
      severity: 'warning',
      icon: '⏰',
      actionUrl: `/payments/${invoiceId}`,
    });
  }

  notifyPaymentOverdue(organizationId, tenantId, invoiceId, daysOverdue, lateFee) {
    this.notifyUser(tenantId, 'payment:overdue', {
      invoiceId,
      daysOverdue,
      lateFee,
      message: `Payment overdue by ${daysOverdue} days. Late fee: ₹${lateFee}`,
      severity: 'error',
      icon: '⚠️',
      actionUrl: `/payments/${invoiceId}`,
    });
  }

  /**
   * COMPLAINT EVENTS
   */

  notifyComplaintCreated(organizationId, complaintId, complaintType, tenantId) {
    this.notifyOrganization(organizationId, 'complaint:created', {
      complaintId,
      complaintType,
      tenantId,
      message: `New complaint: ${complaintType}`,
      severity: 'info',
      icon: '🔔',
      actionUrl: `/admin/complaints/${complaintId}`,
    });
  }

  notifyComplaintResolved(tenantId, complaintId, resolution) {
    this.notifyUser(tenantId, 'complaint:resolved', {
      complaintId,
      resolution,
      message: `Your complaint has been resolved`,
      severity: 'success',
      icon: '✅',
      actionUrl: `/complaints/${complaintId}`,
    });
  }

  /**
   * TENANT EVENTS
   */

  notifyTenantAdded(organizationId, tenantId, tenantName, propertyId) {
    this.notifyOrganization(organizationId, 'tenant:added', {
      tenantId,
      tenantName,
      propertyId,
      message: `New tenant added: ${tenantName}`,
      severity: 'info',
      icon: '👤',
      actionUrl: `/admin/tenants/${tenantId}`,
    });
  }

  notifyTenantMoveIn(organizationId, tenantId, tenantName) {
    this.notifyOrganization(organizationId, 'tenant:movein', {
      tenantId,
      tenantName,
      message: `${tenantName} has moved in`,
      severity: 'info',
      icon: '🏠',
    });
  }

  notifyTenantMoveOut(organizationId, tenantId, tenantName) {
    this.notifyOrganization(organizationId, 'tenant:moveout', {
      tenantId,
      tenantName,
      message: `${tenantName} has moved out`,
      severity: 'warning',
      icon: '👋',
    });
  }

  /**
   * OCCUPANCY EVENTS
   */

  notifyOccupancyUpdate(organizationId, propertyId, occupancyData) {
    this.notifyOrganization(organizationId, 'occupancy:updated', {
      propertyId,
      ...occupancyData,
      message: `Occupancy updated for property`,
      severity: 'info',
      icon: '📊',
    });
  }

  /**
   * INVOICE EVENTS
   */

  notifyInvoiceGenerated(organizationId, invoiceId, tenantId, amount, dueDate) {
    this.notifyUser(tenantId, 'invoice:generated', {
      invoiceId,
      amount,
      dueDate,
      message: `New invoice generated: ₹${amount}`,
      severity: 'info',
      icon: '📄',
      actionUrl: `/invoices/${invoiceId}`,
    });
  }

  /**
   * SYSTEM EVENTS
   */

  notifySystemAlert(organizationId, alertType, message, severity = 'warning') {
    this.notifyOrganization(organizationId, 'system:alert', {
      alertType,
      message,
      severity,
      icon: '🚨',
    });
  }

  notifyMaintenanceUpdate(organizationId, maintenanceId, status, updatedBy) {
    this.notifyOrganization(organizationId, 'maintenance:updated', {
      maintenanceId,
      status,
      updatedBy,
      message: `Maintenance request ${status}`,
      severity: 'info',
      icon: '🔧',
    });
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return ConnectedUsers.has(userId);
  }

  /**
   * Get online users in organization
   */
  getOnlineUsersInOrg(organizationId) {
    const onlineUsers = [];
    ConnectedUsers.forEach((userSockets, userId) => {
      if (userSockets.organizationId === organizationId) {
        onlineUsers.push(userId);
      }
    });
    return onlineUsers;
  }

  /**
   * Get connection count
   */
  getConnectedUsersCount() {
    return ConnectedUsers.size;
  }
}

module.exports = SocketService;
