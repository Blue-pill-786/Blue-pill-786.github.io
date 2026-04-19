import express from 'express';
import { protect } from '../middleware/auth.js';
import  reportController from '../controllers/reportController.js';

const router = express.Router();

// 🔐 Protect all routes
router.use(protect);

/* ================= SPECIAL REPORTS ================= */

// ⚠️ IMPORTANT: define BEFORE "/:id"
router.get('/monthly', reportController.getMonthlyReport);

router.get('/stats', reportController.getReportStats);

router.get('/templates', reportController.getTemplates);

/* ================= CRUD ================= */

router.post('/', reportController.createReport);

router.get('/', reportController.getReports);

router.get('/:id', reportController.getReport);

router.put('/:id', reportController.updateReport);

router.delete('/:id', reportController.deleteReport);

/* ================= ACTIONS ================= */

router.post('/:id/generate', reportController.generateReport);

router.post('/:id/clone', reportController.cloneReport);

router.get('/:id/export', reportController.exportReport);

export default router;