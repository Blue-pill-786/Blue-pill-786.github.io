import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();

router.use(protect);

router.get('/my', authorize('tenant'), paymentController.getMyPayments);
router.get('/all', authorize('admin', 'manager', 'staff'), paymentController.getAllPayments);
router.get('/:id', paymentController.getInvoice);

router.post(
  '/pay',
  [body('invoiceId').notEmpty(), body('method').isIn(['stripe', 'razorpay', 'cash', 'bank_transfer'])],
  paymentController.markAsPaid
);

router.post(
  '/admin',
  authorize('admin', 'manager', 'staff'),
  [
    body('tenantId').notEmpty(),
    body('billingMonth').notEmpty(),
    body('baseAmount').isFloat({ min: 0 })
  ],
  paymentController.createInvoice
);

router.patch('/admin/:id', authorize('admin', 'manager', 'staff'), paymentController.adjustInvoice);
router.delete('/admin/:id', authorize('admin', 'manager', 'staff'), paymentController.cancelInvoice);

router.post('/webhook/:provider', paymentController.handleWebhook);

export default router;
