import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { Invoice } from '../models/Invoice.js';
import { markPaymentSuccess } from '../services/paymentService.js';

const router = express.Router();
router.use(protect);

router.post('/pay', [body('invoiceId').notEmpty(), body('method').isIn(['stripe', 'razorpay', 'cash', 'bank_transfer'])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { invoiceId, method } = req.body;
  const invoice = await Invoice.findById(invoiceId).populate({ path: 'tenant', populate: { path: 'user' } });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  if (req.user.role === 'tenant' && invoice.tenant.user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden invoice access' });
  }

  const paid = await markPaymentSuccess({
    invoiceId,
    method,
    transactionId: `TXN-${Date.now()}`,
    metadata: { source: 'manual-api' }
  });

  return res.json({ message: 'Payment recorded', invoice: paid });
});

router.post('/webhook/:provider', async (req, res) => {
  // Validate signature from Stripe/Razorpay in production.
  const { invoiceId, success, transactionId } = req.body;
  if (!success) return res.status(202).json({ message: 'Payment event ignored' });

  await markPaymentSuccess({ invoiceId, method: req.params.provider, transactionId, metadata: { webhook: true } });
  return res.json({ message: 'Payment updated from webhook' });
});

export default router;
