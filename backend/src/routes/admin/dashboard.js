import express from 'express';
import { getDashboard } from '../../controllers/dashboardController.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('admin', 'manager', 'staff'));

router.get('/', getDashboard);

export default router;