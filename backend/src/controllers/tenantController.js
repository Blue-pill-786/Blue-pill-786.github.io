import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import * as tenantService from '../services/tenantService.js';
import { Tenant } from '../models/Tenant.js';
import { catchAsync } from '../utils/catchAsync.js';

/* ================= HELPERS ================= */

const getValidationErrors = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array();
};

const sendSuccess = (res, data, status = 200) => {
  return res.status(status).json({
    success: true,
    data
  });
};

const sendError = (res, message, status = 400) => {
  return res.status(status).json({
    success: false,
    message
  });
};

/* ================= USER ================= */

export const getDashboard = catchAsync(async (req, res) => {

  if (!req.user?._id) {
    return sendError(res, "Unauthorized", 401);
  }

  const dashboard = await tenantService.getDashboard(req.user._id);

  sendSuccess(res, dashboard);

});

export const getInvoices = catchAsync(async (req, res) => {

  if (!req.user?._id) {
    return sendError(res, "Unauthorized", 401);
  }

  const invoices = await tenantService.getInvoices(req.user._id);

  sendSuccess(res, invoices);

});

export const createComplaint = catchAsync(async (req, res) => {

  if (!req.user?._id) {
    return sendError(res, "Unauthorized", 401);
  }

  const errors = getValidationErrors(req);
  if (errors) {
    return res.status(422).json({
      success: false,
      errors
    });
  }

  const complaint = await tenantService.createComplaint(
    req.user._id,
    req.body
  );

  sendSuccess(res, complaint, 201);

});

/* ================= ADMIN ================= */

export const getAllTenants = catchAsync(async (req, res) => {

  console.log(`📋 [${req.user?.role || "system"}] Fetching tenants`);

  const tenants = await tenantService.getAllTenants();

  sendSuccess(res, tenants || []);

});

export const getTenant = catchAsync(async (req, res) => {

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, "Invalid tenant ID", 400);
  }

  console.log(`📖 Fetching tenant: ${id}`);

  const tenant = await Tenant.findById(id)
    .populate('user', 'name email phone')
    .populate('property', 'name code city floors');

  if (!tenant) {
    return sendError(res, "Tenant not found", 404);
  }

  sendSuccess(res, tenant);

});

export const createTenant = catchAsync(async (req, res) => {

  if (!req.user?._id) {
    return sendError(res, "Unauthorized", 401);
  }

  const { email, name } = req.body;

  if (!email || !name) {
    return sendError(res, "Name and email are required", 400);
  }

  console.log(`➕ [${req.user.role}] Creating tenant: ${email}`);

  const result = await tenantService.createTenantWithAssignment(req.body);

  sendSuccess(res, result, 201);

});

export const removeTenant = catchAsync(async (req, res) => {

  if (!req.user?._id) {
    return sendError(res, "Unauthorized", 401);
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, "Invalid tenant ID", 400);
  }

  console.log(`🗑️ [${req.user.role}] Removing tenant: ${id}`);

  await tenantService.removeTenant(id);

  return res.json({
    success: true,
    message: 'Tenant removed successfully'
  });

});

export const updateTenant = catchAsync(async (req, res) => {

  if (!req.user?._id) {
    return sendError(res, "Unauthorized", 401);
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, "Invalid tenant ID", 400);
  }

  if (!Object.keys(req.body).length) {
    return sendError(res, "No data to update", 400);
  }

  console.log(`✏️ [${req.user.role}] Updating tenant: ${id}`);

  const updatedTenant = await tenantService.updateTenant(id, req.body);

  sendSuccess(res, updatedTenant);

});

export const updateBedRent = catchAsync(async (req, res) => {

  if (!req.user?._id) {
    return sendError(res, "Unauthorized", 401);
  }

  const { propertyId, floorName, roomNumber, bedLabel, rent } = req.body;

  if (!propertyId || !floorName || !roomNumber || !bedLabel) {
    return sendError(res, "Missing required fields", 400);
  }

  if (rent !== undefined && (isNaN(rent) || Number(rent) < 0)) {
    return sendError(res, "Invalid rent amount", 400);
  }

  console.log(`💰 [${req.user.role}] Updating rent`, {
    propertyId,
    floorName,
    roomNumber,
    bedLabel
  });

  await tenantService.updateBedRent(req.body);

  return res.json({
    success: true,
    message: 'Rent updated successfully'
  });

});