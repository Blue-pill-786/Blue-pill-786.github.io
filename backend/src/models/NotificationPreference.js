/**
 * NotificationPreference Model
 * Stores user-specific notification preferences and settings
 */

const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    // Channel preferences
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: false,
    },
    inAppNotifications: {
      type: Boolean,
      default: true,
    },
    inAppSound: {
      type: Boolean,
      default: false, // Don't enable sound by default
    },

    // Quiet hours (respects user timezone)
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:00' }, // HH:mm format
      end: { type: String, default: '08:00' },
      timezone: { type: String, default: 'Asia/Kolkata' },
    },

    // Category-specific preferences
    categories: {
      payments: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['instant', 'daily', 'weekly'], default: 'instant' },
      },
      complaints: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['instant', 'daily'], default: 'instant' },
      },
      tenants: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['instant', 'daily', 'weekly'], default: 'daily' },
      },
      occupancy: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
      },
      financial: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['instant', 'daily', 'weekly'], default: 'daily' },
      },
      maintenance: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['instant', 'daily'], default: 'instant' },
      },
      documents: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['instant', 'daily'], default: 'instant' },
      },
      messages: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['instant'], default: 'instant' },
      },
    },

    // Advanced settings
    muteDuration: {
      type: Date,
      default: null, // When user mutes, until when?
    },
    disableAllNotifications: {
      type: Boolean,
      default: false,
    },

    // Notification history preferences
    keepHistoryDays: {
      type: Number,
      default: 30, // Auto-delete notifications older than 30 days
    },

    // Device preferences
    devices: [
      {
        deviceId: String,
        deviceName: String,
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Metadata
    language: { type: String, default: 'en' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Index on user and organization for quick lookups
notificationPreferenceSchema.index({ user: 1, organization: 1 });

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
