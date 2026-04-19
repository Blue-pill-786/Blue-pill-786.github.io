/**
 * Document Controller
 * API endpoints for document management
 */

const DocumentService = require('../services/documentService');
const Document = require('../models/Document');
const { ResponseFormatter } = require('../utils/responseFormatter');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

/**
 * Upload document
 */
exports.uploadDocument = [
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json(ResponseFormatter.error('No file provided', 400));
      }

      const { fileType, tags, description, category, relatedEntity, relatedEntityId, accessLevel } =
        req.body;
      const userId = req.user.id;
      const organizationId = req.user.organization;

      // Create temporary file path (in real app, handle this better)
      const tempFilePath = path.join('/tmp', `${Date.now()}-${req.file.originalname}`);

      // Write file to temp location
      const fs = require('fs').promises;
      await fs.writeFile(tempFilePath, req.file.buffer);

      const document = await DocumentService.uploadDocument(
        {
          path: tempFilePath,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
        userId,
        organizationId,
        {
          fileType: fileType || 'other',
          tags: tags ? tags.split(',') : [],
          description,
          category,
          relatedEntity,
          relatedEntityId,
          accessLevel: accessLevel || 'private',
        }
      );

      // Clean up temp file
      await fs.unlink(tempFilePath).catch(() => {});

      // Emit socket event
      const socketService = req.app.locals.socketService;
      if (socketService) {
        socketService.notifyOrganization(organizationId, 'document:uploaded', {
          documentId: document._id,
          fileName: document.fileName,
          uploadedBy: userId,
          message: `Document uploaded: ${document.fileName}`,
        });
      }

      return res.status(201).json(
        ResponseFormatter.created({
          document,
          message: 'Document uploaded successfully',
        })
      );
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Get documents
 */
exports.getDocuments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      fileType,
      category,
      uploadedBy,
      relatedEntity,
      relatedEntityId,
    } = req.query;
    const organizationId = req.user.organization;

    const filters = {
      page: Number(page),
      limit: Number(limit),
      fileType,
      category,
      uploadedBy,
    };

    if (relatedEntity) {
      filters.relatedEntity = relatedEntity;
      filters.relatedEntityId = relatedEntityId;
    }

    const { documents, total } = await DocumentService.getDocuments(organizationId, filters);

    return res.json(ResponseFormatter.paginated(documents, page, limit, total));
  } catch (error) {
    next(error);
  }
};

/**
 * Search documents
 */
exports.searchDocuments = async (req, res, next) => {
  try {
    const { q, fileType } = req.query;
    const organizationId = req.user.organization;

    if (!q || q.length < 2) {
      return res.json(
        ResponseFormatter.error('Search query must be at least 2 characters', 400)
      );
    }

    const documents = await DocumentService.searchDocuments(organizationId, q, {
      fileType,
    });

    return res.json(ResponseFormatter.success(documents));
  } catch (error) {
    next(error);
  }
};

/**
 * Get document by ID
 */
exports.getDocumentById = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const organizationId = req.user.organization;

    const document = await DocumentService.getDocumentById(documentId, organizationId);

    return res.json(ResponseFormatter.success(document));
  } catch (error) {
    next(error);
  }
};

/**
 * Download document
 */
exports.downloadDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const organizationId = req.user.organization;

    const document = await DocumentService.getDocumentById(documentId, organizationId);

    // Track access
    await DocumentService.trackAccess(documentId, req.user.id, organizationId);

    // Redirect to storage URL (or download if needed)
    return res.redirect(document.storageUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * Share document
 */
exports.shareDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { userId, expirationDays } = req.body;
    const organizationId = req.user.organization;

    const document = await DocumentService.shareDocument(
      documentId,
      userId,
      organizationId,
      expirationDays
    );

    // Emit notification
    const socketService = req.app.locals.socketService;
    if (socketService) {
      socketService.notifyUser(userId, 'document:shared', {
        documentId: document._id,
        fileName: document.fileName,
        sharedBy: req.user.id,
        message: `Document shared: ${document.fileName}`,
      });
    }

    return res.json(ResponseFormatter.success(document));
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke access
 */
exports.revokeAccess = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { userId } = req.body;
    const organizationId = req.user.organization;

    const document = await DocumentService.revokeAccess(documentId, userId, organizationId);

    return res.json(ResponseFormatter.success(document));
  } catch (error) {
    next(error);
  }
};

/**
 * Generate shareable link
 */
exports.generateShareableLink = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { expirationDays = 7 } = req.body;
    const organizationId = req.user.organization;

    const document = await DocumentService.getDocumentById(documentId, organizationId);
    const shareLink = await DocumentService.generateShareableLink(
      documentId,
      organizationId,
      expirationDays
    );

    return res.json(ResponseFormatter.success(shareLink));
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle star
 */
exports.toggleStar = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const organizationId = req.user.organization;

    const document = await DocumentService.toggleStar(documentId, req.user.id, organizationId);

    return res.json(ResponseFormatter.success(document));
  } catch (error) {
    next(error);
  }
};

/**
 * Update document metadata
 */
exports.updateMetadata = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { tags, description, category, fileType, accessLevel } = req.body;
    const organizationId = req.user.organization;

    const document = await DocumentService.updateMetadata(documentId, organizationId, {
      tags,
      description,
      category,
      fileType,
      accessLevel,
    });

    return res.json(ResponseFormatter.success(document));
  } catch (error) {
    next(error);
  }
};

/**
 * Create new version
 */
exports.createNewVersion = [
  upload.single('file'),
  async (req, res, next) => {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;
      const organizationId = req.user.organization;

      if (!req.file) {
        return res.status(400).json(ResponseFormatter.error('No file provided', 400));
      }

      const fs = require('fs').promises;
      const tempFilePath = path.join('/tmp', `${Date.now()}-${req.file.originalname}`);
      await fs.writeFile(tempFilePath, req.file.buffer);

      const newDocument = await DocumentService.createNewVersion(
        documentId,
        {
          path: tempFilePath,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
        userId,
        organizationId
      );

      await fs.unlink(tempFilePath).catch(() => {});

      return res.status(201).json(ResponseFormatter.created(newDocument));
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Delete document (soft delete)
 */
exports.deleteDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const organizationId = req.user.organization;

    await DocumentService.deleteDocument(documentId, organizationId, req.user.id);

    return res.json(ResponseFormatter.success({ message: 'Document deleted' }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get document statistics
 */
exports.getStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;

    const stats = await DocumentService.getDocumentStats(organizationId);

    return res.json(ResponseFormatter.success(stats));
  } catch (error) {
    next(error);
  }
};
