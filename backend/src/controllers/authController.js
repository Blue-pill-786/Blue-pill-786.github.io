import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { validatePasswordStrength } from '../utils/passwordValidator.js';
import { env } from '../config/env.js';
import ResponseFormatter from '../utils/responseFormatter.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Register
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role = 'tenant' } = req.body;

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet complexity requirements',
        errors: passwordValidation.errors,
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
    });

    const token = jwt.sign(
      { id: user._id },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    res.status(201).json({
      success: true,
      token,
      user: user.toJSON(),
    });

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Login
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account inactive' });
    }

    if (user.isAccountLocked()) {
      return res.status(403).json({ success: false, message: 'Account locked' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incFailedLogins();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await user.resetFailedLogins();
    await user.addLoginHistory(req.ip, req.get('user-agent'));

    const token = jwt.sign(
      { id: user._id, email: user.email },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    res.json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/**
 * Get Me
 */
export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false });

  res.json({ success: true, user: user.toJSON() });
};

/**
 * Update Profile
 */
export const updateProfile = async (req, res) => {
  const { name, phone, avatar, timezone, language } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false });

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (avatar) user.avatar = avatar;
  if (timezone) user.timezone = timezone;
  if (language) user.language = language;

  await user.save();

  res.json({ success: true, user: user.toJSON() });
};

/**
 * Change Password
 */
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  if (!user) return res.status(404).json({ success: false });

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Wrong password' });
  }

  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'New password does not meet complexity requirements',
      errors: passwordValidation.errors,
    });
  }

  user.password = newPassword;
  user.lastPasswordChange = new Date();
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
};

/**
 * Logout
 */
export const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};

/**
 * Get user preferences
 */
export const getUserPreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId)
      .select('preferences notifications')
      .lean();

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const preferences = {
      emailNotifications:
        user.preferences?.emailNotifications ?? user.notifications?.emailInvoice ?? true,
      smsNotifications:
        user.preferences?.smsNotifications ?? user.notifications?.smsReminders ?? false,
      weeklyReport: user.preferences?.weeklyReport ?? true,
      darkMode: user.preferences?.darkMode ?? true,
    };

    return res.json(ResponseFormatter.success(preferences, 'User preferences retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { emailNotifications, smsNotifications, weeklyReport, darkMode } = req.body;
    const user = await User.findById(userId).select('preferences notifications');

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const currentPreferences =
      user.preferences?.toObject?.() || user.preferences || {};
    const currentNotifications =
      user.notifications?.toObject?.() || user.notifications || {};

    user.preferences = {
      ...currentPreferences,
      ...(emailNotifications !== undefined ? { emailNotifications } : {}),
      ...(smsNotifications !== undefined ? { smsNotifications } : {}),
      ...(weeklyReport !== undefined ? { weeklyReport } : {}),
      ...(darkMode !== undefined ? { darkMode } : {}),
    };

    user.notifications = {
      ...currentNotifications,
      ...(emailNotifications !== undefined
        ? {
            emailInvoice: emailNotifications,
            emailPayment: emailNotifications,
            emailMaintenance: emailNotifications,
          }
        : {}),
      ...(smsNotifications !== undefined
        ? {
            smsReminders: smsNotifications,
          }
        : {}),
    };

    await user.save();

    return res.json(ResponseFormatter.updated(user.preferences, 'User preferences updated successfully'));
  } catch (err) {
    next(err);
  }
};
