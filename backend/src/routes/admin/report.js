import express from 'express';
import { getMonthlyReport } from '../../controllers/reportController.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('admin', 'manager'));

router.get('/monthly', getMonthlyReport);

export default router;