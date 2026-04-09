import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const signToken = (id, role) => jwt.sign({ id, role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

router.post(
  '/register',
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 }), body('role').optional().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, email, password, phone, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password, phone, role: role || 'tenant' });
    const token = signToken(user._id, user.role);

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  }
);

router.post('/login', [body('email').isEmail(), body('password').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signToken(user._id, user.role);
  return res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

router.post('/otp/request', [body('phone').notEmpty()], async (req, res) => {
  const { phone } = req.body;
  // Real OTP integration should store hashed OTP + expiry.
  return res.json({ message: `OTP sent to ${phone}`, otp: '123456' });
});

router.post('/otp/verify', [body('phone').notEmpty(), body('otp').notEmpty()], async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ message: 'User not found for phone' });

  const token = signToken(user._id, user.role);
  return res.json({ token, user: { id: user._id, role: user.role, name: user.name, email: user.email } });
});

router.get('/me', protect, async (req, res) => {
  res.json({ id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role });
});

export default router;
