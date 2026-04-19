import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../../middleware/auth.js';
import {
  getAllProperties,
  createProperty,
  getProperty,
  updateProperty,
  deleteProperty,
  getVacantBeds,
  updateBedStatus,
  getMonthlyRevenue,
  getPropertiesByCity,
  getPropertiesByManager
} from '../../controllers/propertyController.js';

const router = express.Router();

/**
 * All admin property routes require authentication
 */
router.use(protect, authorize('admin', 'owner', 'manager'));

/* ================= PROPERTY CRUD ================= */

// GET all properties
router.get('/', getAllProperties);

// CREATE property
router.post(
  '/',
  [
    body('name').notEmpty().trim().isLength({ min: 3 }),
    body('code').notEmpty().trim().isLength({ min: 2 }),
    body('address').notEmpty().trim(),
    body('city').notEmpty().trim(),
    body('state').optional().trim(),
    body('manager').optional().isMongoId(),
    body('floors').optional().isArray(),
    body('floors.*.name').optional().trim().notEmpty(),
    body('floors.*.rooms').optional().isArray(),
    body('floors.*.rooms.*.number').optional().trim().notEmpty(),
    body('floors.*.rooms.*.beds').optional().isArray(),
    body('floors.*.rooms.*.beds.*.label').optional().trim().notEmpty(),
    body('floors.*.rooms.*.beds.*.monthlyRent').optional().isFloat({ min: 0 }),
    body('autoInvoicingEnabled').optional().isBoolean(),
    body('autoLateFeesEnabled').optional().isBoolean(),
    body('autoRemindersEnabled').optional().isBoolean()
  ],
  createProperty
);

/* ================= FILTERING & SEARCH (MOVE UP) ================= */

// IMPORTANT: specific routes BEFORE :id

router.get('/search/city', getPropertiesByCity);
router.get('/search/manager', getPropertiesByManager);

/* ================= FINANCIAL ================= */

router.get('/summary/revenue', authorize('admin', 'owner'), getMonthlyRevenue);

/* ================= BED MANAGEMENT ================= */

router.get('/:id/vacant-beds', getVacantBeds);

router.patch(
  '/:id/beds/:bedId/status',
  [
    body('status').isIn(['vacant', 'occupied', 'maintenance']),
    body('occupant').optional().isMongoId(),
    body('moveInDate').optional().isISO8601()
  ],
  updateBedStatus
);

/* ================= PROPERTY BY ID (MOVE DOWN) ================= */

// NOW safe to use dynamic route

router.get('/:id', getProperty);

router.put(
  '/:id',
  [
    body('name').optional().trim().isLength({ min: 3 }),
    body('address').optional().trim(),
    body('rentPerBed').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['active', 'inactive', 'maintenance'])
  ],
  updateProperty
);

router.patch('/:id', updateProperty);

router.delete('/:id', authorize('admin', 'owner'), deleteProperty);

export default router;
