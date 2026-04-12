import { validationResult } from 'express-validator';
import * as authService from '../services/authService.js';
import { catchAsync } from '../utils/catchAsync.js';

/* ================= HELPERS ================= */

const getValidationErrors = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array();
};

/* ================= REGISTER ================= */

export const registerUser = catchAsync(async (req, res) => {

  const errors = getValidationErrors(req);

  if (errors) {
    return res.status(422).json({
      success: false,
      errors
    });
  }

  console.log(`🆕 Register attempt: ${req.body.email}`);

  const { token, user } = await authService.register(req.body);

  res.status(201).json({
    success: true,
    token,
    user
  });

});

/* ================= LOGIN ================= */

export const loginUser = catchAsync(async (req, res) => {

  const errors = getValidationErrors(req);

  if (errors) {
    return res.status(422).json({
      success: false,
      errors
    });
  }

  console.log(`🔐 Login attempt: ${req.body.email}`);

  const { token, user } = await authService.login(req.body);

  res.json({
    success: true,
    token,
    user
  });

});

/* ================= GET ME ================= */

export const getMe = catchAsync(async (req, res) => {

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  res.json({
    success: true,
    user: req.user
  });

});