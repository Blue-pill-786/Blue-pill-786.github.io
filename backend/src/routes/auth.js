/**
 * Authentication Routes
 * Handles user registration, login, and profile management
 */

import express from 'express';
import { body } from 'express-validator';
import {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
  logout
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import ResponseFormatter from '../utils/responseFormatter.js';

const router = express.Router();

/**
 * Register new user
 * POST /api/auth/register
 * Body: { name, email, password, role, organization }
 */
router.post(
  '/register',
  [
    body('name').notEmpty().trim().isLength({ min: 3 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'manager', 'staff', 'tenant']),
    body('organization').optional().isMongoId(),
  ],
  registerUser
);

/**
 * Login user
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().trim()
  ],
  loginUser
);

/**
 * Get current user profile
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', protect, getMe);

/**
 * Update profile (for logged-in users)
 * PUT /api/auth/profile
 * Body: { name, phone, avatar }
 */
router.put(
  '/profile',
  protect,
  [
    body('name').optional().trim().isLength({ min: 3 }),
    body('phone').optional().isMobilePhone(),
    body('avatar').optional().isURL()
  ],
  updateProfile
);

/**
 * Change password (for logged-in users)
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword, newPasswordConfirm }
 */
router.post(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
    body('newPasswordConfirm').notEmpty()
  ],
  changePassword
);

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', protect, logout);

export default router;