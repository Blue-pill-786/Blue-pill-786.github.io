/**
 * Document Management Routes
 *
 */

const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const documentController = require('../controllers/documentController');

// All routes require authentication
router.use(protect);

// Document CRUD operations
router.post('/', documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.get('/search', documentController.searchDocuments);
router.get('/stats', documentController.getStats);
router.get('/:documentId', documentController.getDocumentById);
router.get('/:documentId/download', documentController.downloadDocument);
router.put('/:documentId/metadata', documentController.updateMetadata);
router.delete('/:documentId', documentController.deleteDocument);

// Sharing and access control
router.post('/:documentId/share', documentController.shareDocument);
router.delete('/:documentId/share/:userId', documentController.revokeAccess);
router.post('/:documentId/share-link', documentController.generateShareableLink);

// Versioning
router.post('/:documentId/version', documentController.createNewVersion);

// Favorites
router.put('/:documentId/star', documentController.toggleStar);

module.exports = router;
