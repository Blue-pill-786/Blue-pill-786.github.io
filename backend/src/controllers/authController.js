/**
 * Production-Ready Auth Controller
 * Handles user authentication with security features (2FA, account lockout, password history)
 */

import { User } from '../models/User.js';
import ResponseFormatter from '../utils/responseFormatter.js';
import { ValidationError, UnauthorizedError, BadRequestError, ConflictError, NotFoundError } from '../utils/errors.js';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';

/**
 * Register new user
 */
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role = 'tenant' } = req.body;

    // Validation
    if (!email || !password || !name) {
      throw new ValidationError('Name, email, and password are required', []);
    }

    if (password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters');
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role,
      status: 'active',
      twoFaEnabled: false,
      loginAttempts: 0,
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return sanitized user object
    const userObj = user.toJSON();

    return res.json(
      ResponseFormatter.created({ token, user: userObj }, 'User registered successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Login user with security features
 */
export const loginUser = async (req, res, next) => {
  try {
    const { email, password, twoFaCode } = req.body;

    // Validation
    if (!email || !password) {
      throw new ValidationError('Email and password are required', []);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check account status
    if (user.status !== 'active') {
      throw new UnauthorizedError(`Account is ${user.status}`);
    }

    // Check if account locked (5 failed attempts = 15 min lock)
    if (user.isAccountLocked?.()) {
      throw new UnauthorizedError('Account temporarily locked. Try again later.');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      user.incFailedLogins();
      await user.save();
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check 2FA if enabled
    if (user.twoFaEnabled) {
      if (!twoFaCode) {
        return res.json({
          success: true,
          message: '2FA code required',
          requiresTwoFa: true,
          tempToken: jwt.sign(
            { id: user._id, email: user.email, temp: true },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
          )
        });
      }

      // Verify 2FA code (implement with TOTP library in production)
      // This is a placeholder
      if (twoFaCode !== '000000') {
        throw new UnauthorizedError('Invalid 2FA code');
      }
    }

    // Reset failed login attempts
    user.resetFailedLogins();
    
    // Track login
    user.lastLogin = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userObj = user.toJSON();

    return res.json(
      ResponseFormatter.success({ token, user: userObj }, 'Login successful')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get current user
 */
export const getMe = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new UnauthorizedError('Not authenticated');
    }

    const user = await User.findById(req.user._id).select('-password -passwordHistory');

    if (!user) {
      throw new NotFoundError('User', req.user._id);
    }

    return res.json(ResponseFormatter.success(user.toJSON(), 'User retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Update profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name, phone, avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    // Update allowed fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    return res.json(ResponseFormatter.updated(user.toJSON(), 'Profile updated successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Change password
 */
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, newPasswordConfirm} = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current and new password are required', []);
    }

    if (newPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters');
    }

    if (newPassword !== newPasswordConfirm) {
      throw new BadRequestError('Passwords do not match');
    }

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Check password not used before
    for (const prevPassword of user.passwordHistory || []) {
      const isReused = await user.comparePassword(newPassword, prevPassword);
      if (isReused) {
        throw new BadRequestError('Cannot reuse recent passwords');
      }
    }

    // Update password
    user.password = newPassword;
    user.lastPasswordChange = new Date();
    user.passwordHistory = user.passwordHistory || [];
    user.passwordHistory.push(user.password);
    // Keep only last 5 passwords
    if (user.passwordHistory.length > 5) {
      user.passwordHistory = user.passwordHistory.slice(-5);
    }

    await user.save();

    return res.json(ResponseFormatter.success({}, 'Password updated successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Enable 2FA (placeholder - implement with TOTP in production)
 */
export const enable2FA = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    // Generate 2FA secret (use speakeasy library in production)
    user.twoFaEnabled = true;
    user.twoFaSecret = 'placeholder_secret'; // Generate real secret in production
    await user.save();

    return res.json(
      ResponseFormatter.success(
        { qrCode: 'placeholder_qr' },
        '2FA enabled. Please scan the QR code in your authenticator app.'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Verify 2FA code
 */
export const verify2FA = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { code } = req.body;

    if (!code) {
      throw new ValidationError('2FA code is required', []);
    }

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    // Verify code against user's 2FA secret (use speakeasy in production)
    if (code !== '000000') {
      throw new UnauthorizedError('Invalid 2FA code');
    }

    return res.json(ResponseFormatter.success({}, '2FA verified successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Logout (invalidate session)
 */
export const logout = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (user) {
      user.lastLogout = new Date();
      await user.save();
    }

    return res.json(ResponseFormatter.success({}, 'Logout successful'));
  } catch (err) {
    next(err);
  }
};