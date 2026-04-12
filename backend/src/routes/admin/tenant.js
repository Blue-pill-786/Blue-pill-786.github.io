import express from 'express';
import {
  createTenant,
  removeTenant,
  updateTenant,
  getTenant,
  updateBedRent,
  getAllTenants
} from '../../controllers/tenantController.js';

import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

/* ================= MIDDLEWARE ================= */

router.use(protect, authorize('admin', 'manager', 'staff'));

/* ================= TENANTS ================= */

router.get('/', getAllTenants);

router.get('/:id', getTenant);

router.post('/', createTenant);

router.put('/:id', updateTenant);

/* ================= BED ================= */

router.put('/beds/rent', updateBedRent);

/* ================= DELETE ================= */

router.delete('/:id', removeTenant);

export default router;