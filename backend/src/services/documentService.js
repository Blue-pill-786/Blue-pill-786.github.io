/**
 * Document Service
 * Business logic for document management
 */

const Document = require('../models/Document');
const StorageService = require('./storageService');
const { NotFoundError, ValidationError } = require('../utils/errors');

class DocumentService {
  /**
   * Upload new document
   */
  static async uploadDocument(fileData, uploadedBy, organizationId, metadata = {}) {
    try {
      // Generate file hash for duplicate detection
      const fileHash = await StorageService.generateHash(fileData.path);

      // Check for duplicate
      const existing = await Document.findOne({
        organization: organizationId,
        documentHash: fileHash,
        isDeleted: false,
      });

      if (existing) {
        throw new ValidationError(
          'This file has already been uploaded',
          ['Duplicate file detected']
        );
      }

      // Upload to storage
      const storageProvider = process.env.STORAGE_PROVIDER || 'cloudinary';
      let uploadResult;

      if (storageProvider === 's3') {
        uploadResult = await StorageService.uploadToS3(
          fileData.path,
          metadata.fileType,
          organizationId
        );
      } else {
        uploadResult = await StorageService.uploadToCloudinary(
          fileData.path,
          metadata.fileType || 'other',
          organizationId
        );
      }

      // Virus scan
      const scanResult = await StorageService.scanForViruses(fileData.path);
      if (!scanResult.safe) {
        // Delete from storage
        await StorageService.deleteFile(uploadResult.storageUrl, storageProvider, organizationId);
        throw new ValidationError('File contains malware', ['Virus scan failed']);
      }

      // Create document record
      const document = await Document.create({
        organization: organizationId,
        uploadedBy,
        fileName: fileData.originalname,
        originalFileName: fileData.originalname,
        fileType: metadata.fileType || 'other',
        fileSize: fileData.size,
        mimeType: fileData.mimetype,
        fileExtension: fileData.originalname.split('.').pop(),
        storageUrl: uploadResult.storageUrl,
        storageProvider: uploadResult.storageProvider,
        storageKey: uploadResult.storageKey,
        thumbnail: uploadResult.thumbnail,
        preview: uploadResult.preview,
        tags: metadata.tags || [],
        description: metadata.description,
        category: metadata.category,
        relatedEntity: metadata.relatedEntity,
        relatedEntityId: metadata.relatedEntityId,
        accessLevel: metadata.accessLevel || 'private',
        documentHash: fileHash,
        virusScanStatus: 'safe',
      });

      return document;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Get documents for organization
   */
  static async getDocuments(organizationId, filters = {}) {
    const query = {
      organization: organizationId,
      isDeleted: false,
    };

    if (filters.fileType) query.fileType = filters.fileType;
    if (filters.category) query.category = filters.category;
    if (filters.uploadedBy) query.uploadedBy = filters.uploadedBy;
    if (filters.relatedEntity) {
      query.relatedEntity = filters.relatedEntity;
      if (filters.relatedEntityId) query.relatedEntityId = filters.relatedEntityId;
    }

    const skip = (filters.page - 1) * (filters.limit || 20);
    const [documents, total] = await Promise.all([
      Document.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filters.limit || 20)
        .lean(),
      Document.countDocuments(query),
    ]);

    return { documents, total };
  }

  /**
   * Search documents
   */
  static async searchDocuments(organizationId, searchQuery, filters = {}) {
    try {
      return await Document.searchDocuments(organizationId, searchQuery, filters);
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  static async getDocumentById(documentId, organizationId) {
    const document = await Document.findOne({
      _id: documentId,
      organization: organizationId,
      isDeleted: false,
    });

    if (!document) {
      throw new NotFoundError('Document', documentId);
    }

    return document;
  }

  /**
   * Share document
   */
  static async shareDocument(documentId, userId, organizationId, expirationDays = null) {
    const document = await this.getDocumentById(documentId, organizationId);

    // Check if already shared
    const alreadyShared = document.sharedWith.some((share) => share.user.toString() === userId);
    if (alreadyShared) {
      throw new ValidationError('Document already shared with this user', []);
    }

    const shareData = {
      user: userId,
      sharedAt: new Date(),
    };

    if (expirationDays) {
      shareData.expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
    }

    document.sharedWith.push(shareData);
    await document.save();

    return document;
  }

  /**
   * Revoke access
   */
  static async revokeAccess(documentId, userId, organizationId) {
    const document = await this.getDocumentById(documentId, organizationId);

    document.sharedWith = document.sharedWith.filter((share) => share.user.toString() !== userId);
    await document.save();

    return document;
  }

  /**
   * Toggle star
   */
  static async toggleStar(documentId, userId, organizationId) {
    const document = await this.getDocumentById(documentId, organizationId);

    const index = document.isStarred.indexOf(userId);
    if (index > -1) {
      document.isStarred.splice(index, 1);
    } else {
      document.isStarred.push(userId);
    }

    await document.save();
    return document;
  }

  /**
   * Track document access
   */
  static async trackAccess(documentId, userId, organizationId) {
    const document = await this.getDocumentById(documentId, organizationId);

    const share = document.sharedWith.find((s) => s.user.toString() === userId);
    if (share) {
      share.accessCount += 1;
      share.lastAccessedAt = new Date();
      await document.save();
    }

    return document;
  }

  /**
   * Update document metadata
   */
  static async updateMetadata(documentId, organizationId, updates) {
    const document = await this.getDocumentById(documentId, organizationId);

    // Only allow certain fields to be updated
    const allowedFields = ['tags', 'description', 'category', 'fileType', 'accessLevel'];
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        document[field] = updates[field];
      }
    });

    await document.save();
    return document;
  }

  /**
   * Create new version
   */
  static async createNewVersion(documentId, newFileData, uploadedBy, organizationId, metadata = {}) {
    const originalDocument = await this.getDocumentById(documentId, organizationId);

    // Mark original as old version
    originalDocument.isLatestVersion = false;
    await originalDocument.save();

    // Upload new file
    const newDocument = await this.uploadDocument(newFileData, uploadedBy, organizationId, {
      ...metadata,
      fileType: originalDocument.fileType,
    });

    // Link to previous version
    newDocument.previousVersion = originalDocument._id;
    newDocument.versionNumber = originalDocument.versionNumber + 1;
    await newDocument.save();

    return newDocument;
  }

  /**
   * Soft delete document
   */
  static async deleteDocument(documentId, organizationId, deletedBy) {
    const document = await this.getDocumentById(documentId, organizationId);

    document.isDeleted = true;
    document.deletedAt = new Date();
    document.deletedBy = deletedBy;
    await document.save();

    return document;
  }

  /**
   * Permanently delete document
   */
  static async permanentlyDeleteDocument(documentId, organizationId) {
    const document = await this.getDocumentById(documentId, organizationId);

    // Delete from storage
    await StorageService.deleteFile(document.storageUrl, document.storageProvider, organizationId);

    // Delete from database
    await Document.deleteOne({ _id: documentId });

    return { success: true };
  }

  /**
   * Generate shareable link
   */
  static async generateShareableLink(documentId, organizationId, expirationDays = 7) {
    const document = await this.getDocumentById(documentId, organizationId);

    const shareToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

    // In production, store this in a SharedLink model
    // For now, return direct URL
    const shareLink = {
      token: shareToken,
      url: `${process.env.FRONTEND_URL}/documents/shared/${shareToken}`,
      expiresAt,
      documentId,
    };

    return shareLink;
  }

  /**
   * Get document statistics
   */
  static async getDocumentStats(organizationId) {
    const [
      totalDocuments,
      byType,
      byUploader,
      totalSize,
      recentlyAdded,
      sharedCount,
    ] = await Promise.all([
      Document.countDocuments({ organization: organizationId, isDeleted: false }),
      Document.aggregate([
        { $match: { organization: organizationId, isDeleted: false } },
        { $group: { _id: '$fileType', count: { $sum: 1 } } },
      ]),
      Document.aggregate([
        { $match: { organization: organizationId, isDeleted: false } },
        { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      ]),
      Document.aggregate([
        { $match: { organization: organizationId, isDeleted: false } },
        { $group: { _id: null, totalSize: { $sum: '$fileSize' } } },
      ]),
      Document.find({ organization: organizationId, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Document.countDocuments({
        organization: organizationId,
        isDeleted: false,
        'sharedWith.0': { $exists: true },
      }),
    ]);

    return {
      totalDocuments,
      byType: Object.fromEntries(byType.map((t) => [t._id, t.count])),
      topUploaders: byUploader,
      totalSize: totalSize[0]?.totalSize || 0,
      recentlyAdded,
      sharedCount,
    };
  }
}

module.exports = DocumentService;
