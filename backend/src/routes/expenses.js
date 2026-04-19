/**
 * Expense Routes - Full CRUD operations
 * Handles property expense tracking and reporting
 */

import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { Expense } from '../models/Expense.js';
import ResponseFormatter from '../utils/responseFormatter.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const router = express.Router();

/**
 * Get expenses for organization (paginated)
 */
router.get(
  '/',
  protect,
  authorize('admin', 'manager', 'staff'),
  async (req, res, next) => {
    try {
      const { property, month, category, page = 1, limit = 20 } = req.query;
      const organizationId = req.user.organization;

      const query = { organization: organizationId };
      if (property) query.property = property;
      if (month) query.month = month;
      if (category) query.category = category;

      const total = await Expense.countDocuments(query);
      const expenses = await Expense.find(query)
        .populate('property', 'name code')
        .sort({ expenseDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      res.json(
        ResponseFormatter.paginated(expenses, page, limit, total, 'Expenses retrieved')
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Create expense
 */
router.post(
  '/',
  protect,
  authorize('admin', 'manager', 'staff'),
  [
    body('property').notEmpty().isMongoId(),
    body('category').isIn(['maintenance', 'electricity', 'water', 'internet', 'salary', 'misc']),
    body('amount').isFloat({ min: 0 }),
    body('expenseDate').isISO8601(),
    body('note').optional().isString().trim(),
  ],
  async (req, res, next) => {
    try {
      const { property, category, amount, expenseDate, note } = req.body;
      const organizationId = req.user.organization;

      const expense = new Expense({
        organization: organizationId,
        property,
        category,
        amount,
        expenseDate,
        note,
      });

      await expense.save();
      await expense.populate('property', 'name code');

      res.json(ResponseFormatter.created(expense, 'Expense created'));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Get expense by ID
 */
router.get(
  '/:id',
  protect,
  authorize('admin', 'manager', 'staff'),
  async (req, res, next) => {
    try {
      const expense = await Expense.findById(req.params.id)
        .populate('property', 'name code address');

      if (!expense) throw new NotFoundError('Expense', req.params.id);

      res.json(ResponseFormatter.success(expense, 'Expense retrieved'));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Update expense
 */
router.put(
  '/:id',
  protect,
  authorize('admin', 'manager', 'staff'),
  [
    body('category').optional().isIn(['maintenance', 'electricity', 'water', 'internet', 'salary', 'misc']),
    body('amount').optional().isFloat({ min: 0 }),
    body('note').optional().isString().trim(),
  ],
  async (req, res, next) => {
    try {
      let expense = await Expense.findById(req.params.id);
      if (!expense) throw new NotFoundError('Expense', req.params.id);

      Object.assign(expense, req.body);
      await expense.save();

      res.json(ResponseFormatter.updated(expense, 'Expense updated'));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Delete expense
 */
router.delete(
  '/:id',
  protect,
  authorize('admin', 'manager', 'staff'),
  async (req, res, next) => {
    try {
      const expense = await Expense.findByIdAndDelete(req.params.id);

      if (!expense) throw new NotFoundError('Expense', req.params.id);

      res.json(ResponseFormatter.success({}, 'Expense deleted'));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Get expenses by category
 */
router.get(
  '/category/:category',
  protect,
  authorize('admin', 'manager', 'staff'),
  async (req, res, next) => {
    try {
      const { category } = req.params;
      const organizationId = req.user.organization;

      const expenses = await Expense.getByCategory(organizationId, category)
        .populate('property', 'name code');

      res.json(
        ResponseFormatter.success(expenses, `${category} expenses retrieved`)
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Get monthly total
 */
router.get(
  '/monthly/:month',
  protect,
  authorize('admin', 'manager', 'staff'),
  async (req, res, next) => {
    try {
      const { month } = req.params;
      const organizationId = req.user.organization;

      const total = await Expense.getTotalForMonth(organizationId, month);
      const expenses = await Expense.find({ organization: organizationId, month })
        .populate('property', 'name code');

      res.json(
        ResponseFormatter.success(
          { total, count: expenses.length, expenses },
          `Total expenses for ${month}: ₹${total}`
        )
      );
    } catch (err) {
      next(err);
    }
  }
);

export default router;
