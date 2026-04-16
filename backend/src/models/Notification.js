/**
 * Notification Model
 * Stores all notifications sent to users (for history, replay, etc.)
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for system notifications
    },

    // Notification content
    type: {
      type: String,
      enum: [
        'payment:received',
        'payment:failed',
        'payment:reminder',
        'payment:overdue',
        'complaint:created',
        'complaint:resolved',
        'tenant:added',
        'tenant:movein',
        'tenant:moveout',
        'occupancy:updated',
        'invoice:generated',
        'system:alert',
        'maintenance:updated',
        'message:received',
        'document:shared',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    description: String,
    icon: String, // Emoji or icon identifier
    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },

    // Related entity
    relatedEntity: {
      type: String, // invoice, complaint, tenant, property, payment
      default: null,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Action link
    actionUrl: String,
    actionText: String,

    // Metadata
    data: mongoose.Schema.Types.Mixed,

    // Read status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },

    // Delivery tracking
    channels: {
      inApp: { sent: Boolean, deliveredAt: Date },
      email: { sent: Boolean, deliveredAt: Date, openedAt: Date },
      sms: { sent: Boolean, deliveredAt: Date },
      push: { sent: Boolean, deliveredAt: Date },
    },

    // Priority
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // Expiration
    expiresAt: Date,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ organization: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1, recipient: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

// Help with unread count queries
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
