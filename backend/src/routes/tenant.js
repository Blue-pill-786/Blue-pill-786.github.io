import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { Tenant } from '../models/Tenant.js';
import { Invoice } from '../models/Invoice.js';

const router = express.Router();
router.use(protect, authorize('tenant'));

router.get('/dashboard', async (req, res) => {
  const tenant = await Tenant.findOne({ user: req.user._id, status: 'active' }).populate('property user');
  if (!tenant) return res.status(404).json({ message: 'Tenant profile not found' });

  const invoices = await Invoice.find({ tenant: tenant._id }).sort({ createdAt: -1 }).limit(12);
  const pending = invoices.filter((inv) => inv.status !== 'paid');

  return res.json({
    tenant,
    rentDetails: {
      monthlyRent: tenant.monthlyRent,
      dueDayOfMonth: tenant.dueDayOfMonth,
      lateFeePerDay: tenant.lateFeePerDay
    },
    paymentHistory: invoices,
    pendingAmount: pending.reduce((sum, inv) => sum + inv.totalAmount, 0)
  });
});

router.get('/invoices', async (req, res) => {
  const tenant = await Tenant.findOne({ user: req.user._id, status: 'active' });
  if (!tenant) return res.status(404).json({ message: 'Tenant profile not found' });

  const invoices = await Invoice.find({ tenant: tenant._id }).sort({ createdAt: -1 });
  return res.json(invoices);
});

router.post('/complaints', [body('title').notEmpty(), body('description').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const tenant = await Tenant.findOne({ user: req.user._id, status: 'active' });
  if (!tenant) return res.status(404).json({ message: 'Tenant profile not found' });

  tenant.complaints.push(req.body);
  await tenant.save();

  return res.status(201).json(tenant.complaints[tenant.complaints.length - 1]);
});

export default router;
