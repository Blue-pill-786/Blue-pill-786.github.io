/**
 * Phase 3 - Custom Report Routes
 * Router for report management and generation
 */

import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import reportController from '../controllers/reportController.js';

const router = express.Router();

// Require authentication for all report routes
router.use(protect);

/* ================= TEMPLATES ================= */

/**
 * GET /api/reports/templates
 * Get available report templates
 */
router.get('/templates', reportController.getTemplates);

/* ================= STATS ================= */

/**
 * GET /api/reports/stats
 * Get organization report statistics
 */
router.get('/stats', reportController.getReportStats);

/* ================= REPORT MANAGEMENT ================= */

/**
 * POST /api/reports
 * Create new report
 */
router.post('/', reportController.createReport);

/**
 * GET /api/reports
 * Get all organization reports
 */
router.get('/', reportController.getReports);

/**
 * GET /api/reports/:id
 * Get single report details
 */
router.get('/:id', reportController.getReport);

/**
 * PUT /api/reports/:id
 * Update report
 */
router.put('/:id', reportController.updateReport);

/**
 * POST /api/reports/:id/generate
 * Generate/regenerate report
 */
router.post('/:id/generate', reportController.generateReport);

/**
 * POST /api/reports/:id/clone
 * Clone report
 */
router.post('/:id/clone', reportController.cloneReport);

/**
 * GET /api/reports/:id/export
 * Export report
 */
router.get('/:id/export', reportController.exportReport);

/**
 * DELETE /api/reports/:id
 * Delete report
 */
router.delete('/:id', reportController.deleteReport);

export default router;
