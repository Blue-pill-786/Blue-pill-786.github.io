import express from 'express';
import { body } from 'express-validator';
import {
  registerUser,
  loginUser,
  getMe
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ],
  registerUser
);

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  loginUser
);

router.get('/me', protect, getMe);

export default router;