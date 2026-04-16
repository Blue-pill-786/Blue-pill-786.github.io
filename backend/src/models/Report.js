import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    // Basic Info
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Report name is required'],
      trim: true,
      maxlength: 255,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // Report Configuration
    type: {
      type: String,
      enum: [
        'occupancy',
        'revenue',
        'expense',
        'tenant',
        'property',
        'maintenance',
        'financial',
        'custom',
      ],
      required: true,
      index: true,
    },
    template: {
      type: String,
      enum: [
        'summary',
        'detail',
        'comparison',
        'trend',
        'forecast',
        'custom',
      ],
      default: 'summary',
    },

    dataSource: {
      type: {
        type: String,
        enum: ['invoices', 'expenses', 'tenants', 'properties', 'maintenance', 'payments', 'all'],
        required: true,
      },
      dateRange: {
        start: Date,
        end: Date,
      },
      properties: [mongoose.Schema.Types.ObjectId],
      tenants: [mongoose.Schema.Types.ObjectId],
      status: [String],
      tags: [String],
    },

    // Formatting & Display
    formatting: {
      chartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'area', 'scatter', 'none'],
        default: 'bar',
      },
      groupBy: {
        type: String,
        enum: ['day', 'week', 'month', 'quarter', 'year', 'property', 'tenant', 'status'],
      },
      metrics: [
        {
          type: String,
          enum: [
            'count',
            'total',
            'average',
            'min',
            'max',
            'percentage',
            'trend',
          ],
        },
      ],
      includeCharts: {
        type: Boolean,
        default: true,
      },
      includeTables: {
        type: Boolean,
        default: true,
      },
      includeSummary: {
        type: Boolean,
        default: true,
      },
    },

    // Scheduling
    schedule: {
      isScheduled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      },
      dayOfWeek: Number, // 0-6 for weekly
      dayOfMonth: Number, // 1-31 for monthly
      time: String, // HH:MM format
      nextRunAt: Date,
      lastRunAt: Date,
    },

    // Notifications
    notifications: {
      enabled: {
        type: Boolean,
        default: false,
      },
      recipients: [String], // email addresses
      sendVia: {
        type: String,
        enum: ['email', 'sms', 'in-app', 'all'],
        default: 'email',
      },
      format: {
        type: String,
        enum: ['pdf', 'excel', 'csv', 'html'],
        default: 'pdf',
      },
    },

    // Access Control
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        role: {
          type: String,
          enum: ['viewer', 'editor', 'admin'],
        },
      },
    ],

    // Status & Versions
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },

    // Generated Report Data (cached)
    lastGenerated: {
      data: mongoose.Schema.Types.Mixed,
      generatedAt: Date,
      expiresAt: Date,
      duration: Number, // milliseconds
    },

    // Metadata
    tags: [String],
    notes: String,
    isFavorite: {
      type: Boolean,
      default: false,
    },

    // Soft delete
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'reports',
  }
);

// Indexes for performance
reportSchema.index({ organizationId: 1, createdAt: -1 });
reportSchema.index({ organizationId: 1, status: 1 });
reportSchema.index({ organizationId: 1, type: 1 });
reportSchema.index({ 'schedule.nextRunAt': 1 }, { sparse: true });
reportSchema.index({ deletedAt: 1 });

// Query to exclude soft-deleted by default
reportSchema.query.notDeleted = function () {
  return this.where({ deletedAt: { $exists: false } });
};

// Instance methods
reportSchema.methods.generateReport = async function () {
  // Placeholder - will be implemented by reportService
  throw new Error('generateReport must be implemented by reportService');
};

reportSchema.methods.scheduleNextRun = function () {
  if (!this.schedule.isScheduled || !this.schedule.frequency) {
    return;
  }

  const now = new Date();
  let nextRun = new Date();

  switch (this.schedule.frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
    case 'quarterly':
      nextRun.setMonth(nextRun.getMonth() + 3);
      break;
    case 'yearly':
      nextRun.setFullYear(nextRun.getFullYear() + 1);
      break;
  }

  this.schedule.nextRunAt = nextRun;
};

export default mongoose.model('Report', reportSchema);
