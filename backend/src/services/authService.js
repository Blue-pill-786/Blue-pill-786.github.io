import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

/* ================= TOKEN ================= */

const signToken = (id, role) => {
  if (!env.jwtSecret) {
    throw new Error('JWT secret not configured');
  }

  return jwt.sign(
    { id, role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn || '7d' }
  );
};

/* ================= REGISTER ================= */

export const register = async ({ name, email, password, phone, role, organizationId }) => {
  const cleanEmail = email.trim().toLowerCase();

  // For backward compatibility: allow registration without organization
  // Users without org should upgrade to SaaS or be assigned to default org
  const filter = organizationId 
    ? { email: cleanEmail, organization: organizationId }
    : { email: cleanEmail };

  const existing = await User.findOne(filter);

  if (existing) {
    const err = new Error('User already exists');
    err.statusCode = 409;
    throw err;
  }

  const userData = {
    name: name.trim(),
    email: cleanEmail,
    password,
    phone,
    role: role || 'tenant'
  };

  // If organizationId provided, add it
  if (organizationId) {
    userData.organization = organizationId;
  }

  const user = await User.create(userData);

  const token = signToken(user._id, user.role);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organization || null
    }
  };
};

/* ================= LOGIN ================= */

export const login = async ({ email, password }) => {
  const cleanEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: cleanEmail }).select('+password');

  if (!user) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const token = signToken(user._id, user.role);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};