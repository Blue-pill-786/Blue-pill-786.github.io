/**
 * Document Model
 * Stores metadata for uploaded documents
 * Supports versioning, sharing, access tracking
 */

import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // File information
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: String,
    fileType: {
      type: String,
      enum: [
        'lease',
        'invoice',
        'id_proof',
        'agreement',
        'receipt',
        'identity',
        'address',
        'bank',
        'tax',
        'medical',
        'insurance',
        'maintenance',
        'report',
        'other',
      ],
      default: 'other',
    },
    fileSize: {
      type: Number,
      required: true, // in bytes
    },
    mimeType: String, // application/pdf, image/png, etc.
    fileExtension: String, // pdf, jpg, png, etc.

    // Storage details
    storageUrl: {
      type: String,
      required: true,
    },
    storageProvider: {
      type: String,
      enum: ['s3', 'cloudinary', 'local'],
      default: 'cloudinary',
    },
    storageKey: String, // For S3 - the key in bucket

    // Preview
    thumbnail: String, // URL to thumbnail
    preview: String, // Base64 preview

    // Related entity
    relatedEntity: {
      type: String, // 'tenant', 'property', 'invoice', 'payment'
      default: null,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Search & organization
    tags: [String],
    description: String,
    category: String, // Room, Payment, Legal, etc.

    // Access control
    accessLevel: {
      type: String,
      enum: ['private', 'team', 'shared', 'public'],
      default: 'private',
    },

    // Sharing details
    sharedWith: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        sharedAt: { type: Date, default: Date.now },
        expiresAt: Date,
        accessCount: { type: Number, default: 0 },
        lastAccessedAt: Date,
      },
    ],

    // Version control
    isLatestVersion: {
      type: Boolean,
      default: true,
    },
    previousVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    versionNumber: {
      type: Number,
      default: 1,
    },

    // Metadata
    isStarred: [mongoose.Schema.Types.ObjectId], // Users who starred this
    documentHash: String, // SHA256 hash for duplicate detection
    virusScanStatus: {
      type: String,
      enum: ['pending', 'scanned', 'safe', 'infected'],
      default: 'pending',
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: mongoose.Schema.Types.ObjectId,

    // timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast queries
documentSchema.index({ organization: 1, createdAt: -1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ fileType: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ relatedEntity: 1, relatedEntityId: 1 });
documentSchema.index({ isDeleted: 1 });
documentSchema.index({ fileName: 'text', description: 'text', tags: 'text' }); // Full-text search

// Instance methods
documentSchema.methods.isExpired = function () {
  if (!this.sharedWith || this.sharedWith.length === 0) return false;
  return this.sharedWith.some((share) => share.expiresAt && share.expiresAt < new Date());
};

documentSchema.methods.hasExpired = function (expirationDate) {
  return expirationDate && expirationDate < new Date();
};

documentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static methods
documentSchema.statics.findByOrganization = function (organizationId, options = {}) {
  return this.find({
    organization: organizationId,
    isDeleted: false,
    ...options,
  }).lean();
};

documentSchema.statics.searchDocuments = function (organizationId, query, filters = {}) {
  const searchQuery = {
    organization: organizationId,
    isDeleted: false,
    $text: { $search: query },
  };

  if (filters.fileType) {
    searchQuery.fileType = filters.fileType;
  }

  if (filters.uploadedBy) {
    searchQuery.uploadedBy = filters.uploadedBy;
  }

  if (filters.startDate || filters.endDate) {
    searchQuery.createdAt = {};
    if (filters.startDate) searchQuery.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) searchQuery.createdAt.$lte = new Date(filters.endDate);
  }

  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' } })
    .lean();
};

export const Document = mongoose.model('Document', documentSchema);
