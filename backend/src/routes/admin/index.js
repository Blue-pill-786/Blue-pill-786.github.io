import express from 'express';

import dashboardRoutes from './dashboard.js';
import propertyRoutes from './property.js';
import tenantRoutes from './tenant.js';

import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

/* ================= GLOBAL ADMIN MIDDLEWARE ================= */

// Protect ALL admin routes
router.use(protect);

// Role-based access
router.use(authorize('admin', 'owner', 'manager'));

/* ================= ADMIN ROUTES ================= */

router.use('/dashboard', dashboardRoutes);
router.use('/properties', propertyRoutes);
router.use('/tenants', tenantRoutes);

export default router;