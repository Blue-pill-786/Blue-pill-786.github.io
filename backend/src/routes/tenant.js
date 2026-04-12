import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';

import {
  getDashboard,
  getInvoices,
  createComplaint
} from '../controllers/tenantController.js';

const router = express.Router();

router.use(protect, authorize('tenant'));

router.get('/dashboard', getDashboard);

router.get('/invoices', getInvoices);

router.post(
  '/complaints',
  [
    body('title').notEmpty(),
    body('description').notEmpty()
  ],
  createComplaint
);

export default router;