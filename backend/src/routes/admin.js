import express from 'express';
import dayjs from 'dayjs';
import { body, validationResult } from 'express-validator';
import { authorize, protect } from '../middleware/auth.js';
import { Property } from '../models/Property.js';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Invoice } from '../models/Invoice.js';
import { Expense } from '../models/Expense.js';
import { generateMonthlyRent } from '../services/rentScheduler.js';

const router = express.Router();
router.use(protect, authorize('admin', 'manager', 'staff'));

router.get('/dashboard', async (_req, res) => {
  const [totalTenants, totalProperties, pendingInvoices, occupiedAgg, monthlyRevenue] = await Promise.all([
    Tenant.countDocuments({ status: 'active' }),
    Property.countDocuments({ isActive: true }),
    Invoice.countDocuments({ status: { $in: ['pending', 'overdue'] } }),
    Property.aggregate([
      { $unwind: '$floors' },
      { $unwind: '$floors.rooms' },
      { $unwind: '$floors.rooms.beds' },
      {
        $group: {
          _id: null,
          totalBeds: { $sum: 1 },
          occupiedBeds: {
            $sum: { $cond: [{ $eq: ['$floors.rooms.beds.status', 'occupied'] }, 1, 0] }
          }
        }
      }
    ]),
    Invoice.aggregate([
      {
        $match: {
          status: 'paid',
          paidAt: {
            $gte: dayjs().startOf('month').toDate(),
            $lte: dayjs().endOf('month').toDate()
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  const bedStats = occupiedAgg[0] || { totalBeds: 0, occupiedBeds: 0 };
  res.json({
    totalTenants,
    totalProperties,
    pendingInvoices,
    occupiedBeds: bedStats.occupiedBeds,
    vacantBeds: bedStats.totalBeds - bedStats.occupiedBeds,
    monthlyRevenue: monthlyRevenue[0]?.total || 0
  });
});

router.post('/properties', [body('name').notEmpty(), body('code').notEmpty(), body('address').notEmpty(), body('city').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  const property = await Property.create(req.body);
  return res.status(201).json(property);
});

router.get('/properties', async (_req, res) => {
  const properties = await Property.find().populate('manager', 'name email');
  return res.json(properties);
});

router.post('/tenants', async (req, res) => {
  const { name, email, phone, propertyId, floorName, roomNumber, bedLabel, monthlyRent, dueDayOfMonth, lateFeePerDay } = req.body;

  const user = await User.create({ name, email, phone, password: 'Temp@123456', role: 'tenant' });
  const tenant = await Tenant.create({
    user: user._id,
    property: propertyId,
    floorName,
    roomNumber,
    bedLabel,
    monthlyRent,
    dueDayOfMonth,
    lateFeePerDay
  });

  user.tenantProfile = tenant._id;
  await user.save();

  await Property.updateOne(
    { _id: propertyId, 'floors.name': floorName, 'floors.rooms.number': roomNumber, 'floors.rooms.beds.label': bedLabel },
    {
      $set: {
        'floors.$[floor].rooms.$[room].beds.$[bed].status': 'occupied',
        'floors.$[floor].rooms.$[room].beds.$[bed].occupiedBy': tenant._id,
        'floors.$[floor].rooms.$[room].beds.$[bed].monthlyRent': monthlyRent
      }
    },
    {
      arrayFilters: [{ 'floor.name': floorName }, { 'room.number': roomNumber }, { 'bed.label': bedLabel }]
    }
  );

  return res.status(201).json({ user, tenant });
});

router.put('/tenants/:tenantId', async (req, res) => {
  const tenant = await Tenant.findByIdAndUpdate(req.params.tenantId, req.body, { new: true });
  if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
  return res.json(tenant);
});

router.delete('/tenants/:tenantId', async (req, res) => {
  const tenant = await Tenant.findByIdAndUpdate(req.params.tenantId, { status: 'vacated' }, { new: true });
  if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
  return res.json({ message: 'Tenant vacated', tenant });
});

router.post('/rent/generate', async (_req, res) => {
  const result = await generateMonthlyRent();
  return res.json(result);
});

router.post('/expenses', [body('property').notEmpty(), body('category').notEmpty(), body('amount').isNumeric(), body('expenseDate').isISO8601()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  const expense = await Expense.create(req.body);
  return res.status(201).json(expense);
});

router.get('/reports/monthly', async (req, res) => {
  const month = req.query.month || dayjs().format('YYYY-MM');
  const start = dayjs(`${month}-01`).startOf('month');
  const end = start.endOf('month');

  const [incomeAgg, expenseAgg] = await Promise.all([
    Invoice.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: start.toDate(), $lte: end.toDate() } } },
      { $group: { _id: null, income: { $sum: '$totalAmount' } } }
    ]),
    Expense.aggregate([
      { $match: { expenseDate: { $gte: start.toDate(), $lte: end.toDate() } } },
      { $group: { _id: null, expenses: { $sum: '$amount' } } }
    ])
  ]);

  const income = incomeAgg[0]?.income || 0;
  const expenses = expenseAgg[0]?.expenses || 0;

  return res.json({ month, income, expenses, net: income - expenses });
});

export default router;
