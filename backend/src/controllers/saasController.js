import { validationResult } from 'express-validator';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { BillingService } from '../services/billingService.js';
import { catchAsync } from '../utils/catchAsync.js';

const getValidationErrors = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array();
};

/**
 * SaaS Signup Controller
 * Creates organization, owner user, and initializes subscription
 */

export const signupOrganization = catchAsync(async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) {
    return res.status(422).json({ success: false, errors });
  }

  const { organizationName, ownerEmail, ownerName, ownerPassword, companyPhone } = req.body;

  // Check if organization email already exists
  const existingOrg = await Organization.findOne({ email: ownerEmail });
  if (existingOrg) {
    return res.status(400).json({
      success: false,
      error: 'Email already registered to an organization'
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: ownerEmail });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'Email already registered'
    });
  }

  // Create organization (initially in trial)
  const organization = await Organization.create({
    name: organizationName,
    email: ownerEmail,
    billingEmail: ownerEmail,
    phone: companyPhone,
    tier: 'trial',
    status: 'active',
    trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    limits: {
      properties: 1,
      beds: 50,
      staff: 2,
      apiCalls: 10000
    },
    features: {
      multiProperty: false,
      advancedReports: false,
      apiAccess: false,
      customBranding: false,
      webhooks: false,
      smsNotifications: false,
      emailNotifications: true
    }
  });

  // Create owner user
  const ownerUser = await User.create({
    organization: organization._id,
    name: ownerName,
    email: ownerEmail,
    password: ownerPassword,
    phone: companyPhone,
    role: 'admin', // Owner is admin
    isActive: true
  });

  // Update organization with owner reference
  organization.owner = ownerUser._id;
  await organization.save();

  // Generate JWT token
  const token = require('jsonwebtoken').sign(
    { _id: ownerUser._id, organizationId: organization._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.status(201).json({
    success: true,
    message: 'Organization created successfully. Trial activated for 30 days.',
    token,
    organization: {
      _id: organization._id,
      name: organization.name,
      tier: organization.tier,
      trialEndDate: organization.trialEndDate
    },
    user: {
      _id: ownerUser._id,
      name: ownerUser.name,
      email: ownerUser.email,
      role: ownerUser.role
    }
  });
});

/**
 * Select Tier After Signup
 * Allows user to choose tier after trial starts
 */

export const selectTier = catchAsync(async (req, res) => {
  if (!req.user || !req.organizationId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { tier, billingCycle = 'monthly', paymentMethodId } = req.body;

  if (!['starter', 'professional', 'enterprise'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  // Create subscription
  const result = await BillingService.createSubscription(
    req.organizationId,
    tier,
    billingCycle,
    paymentMethodId
  );

  res.json({
    success: true,
    message: `Subscription to ${tier} tier activated`,
    subscription: result.subscription,
    organization: {
      tier: result.organization.tier,
      limits: result.organization.limits,
      features: result.organization.features
    }
  });
});

/**
 * Get Organization Details
 */

export const getOrganizationDetails = catchAsync(async (req, res) => {
  if (!req.organizationId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const organization = await Organization.findById(req.organizationId)
    .select('-stripeSubscriptionId -stripeCustomerId');

  res.json({
    success: true,
    organization
  });
});

/**
 * Update Organization Settings
 */

export const updateOrganization = catchAsync(async (req, res) => {
  if (!req.organizationId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, billingEmail, phone, address, webhookUrl, branding } = req.body;

  // Only allow updates by admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can update organization' });
  }

  const organization = await Organization.findByIdAndUpdate(
    req.organizationId,
    {
      $set: {
        ...(name && { name }),
        ...(billingEmail && { billingEmail }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(webhookUrl && { webhookUrl }),
        ...(branding && { branding })
      }
    },
    { new: true }
  );

  res.json({
    success: true,
    message: 'Organization updated',
    organization
  });
});

/**
 * Get Subscription Details
 */

export const getSubscriptionDetails = catchAsync(async (req, res) => {
  if (!req.organizationId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { Subscription } = await import('../models/Subscription.js');
  const subscription = await Subscription.findOne({ organization: req.organizationId });

  const organization = await Organization.findById(req.organizationId)
    .select('tier status subscriptionStartDate subscriptionEndDate trialEndDate paymentMethod');

  res.json({
    success: true,
    subscription,
    organization
  });
});

/**
 * Upgrade Subscription Tier
 */

export const upgradeTier = catchAsync(async (req, res) => {
  if (!req.organizationId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { newTier, billingCycle = 'monthly' } = req.body;
  const organization = await Organization.findById(req.organizationId);

  if (!organization) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const tierHierarchy = {
    trial: 0,
    starter: 1,
    professional: 2,
    enterprise: 3
  };

  if (tierHierarchy[newTier] <= tierHierarchy[organization.tier]) {
    return res.status(400).json({ error: 'Can only upgrade to higher tier' });
  }

  const result = await BillingService.createSubscription(
    req.organizationId,
    newTier,
    billingCycle
  );

  res.json({
    success: true,
    message: `Upgraded to ${newTier} tier`,
    subscription: result.subscription,
    organization: result.organization
  });
});

/**
 * Cancel Subscription
 */

export const cancelSubscription = catchAsync(async (req, res) => {
  if (!req.organizationId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { reason } = req.body;

  // Only admin can cancel
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can cancel subscription' });
  }

  const result = await BillingService.cancelSubscription(req.organizationId, reason);

  res.json({
    success: true,
    message: 'Subscription cancelled. You will lose access at the end of billing period.',
    subscription: result.subscription
  });
});

/**
 * List Invoices
 */

export const listInvoices = catchAsync(async (req, res) => {
  if (!req.organizationId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const invoices = await BillingService.getInvoiceHistory(req.organizationId, 20);

  res.json({
    success: true,
    invoices
  });
});

/**
 * Update Payment Method
 */

export const updatePaymentMethod = catchAsync(async (req, res) => {
  if (!req.organizationId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { paymentMethodId } = req.body;

  if (!paymentMethodId) {
    return res.status(400).json({ error: 'Payment method ID required' });
  }

  await BillingService.updatePaymentMethod(req.organizationId, paymentMethodId);

  res.json({
    success: true,
    message: 'Payment method updated'
  });
});

export default {
  signupOrganization,
  selectTier,
  getOrganizationDetails,
  updateOrganization,
  getSubscriptionDetails,
  upgradeTier,
  cancelSubscription,
  listInvoices,
  updatePaymentMethod
};
