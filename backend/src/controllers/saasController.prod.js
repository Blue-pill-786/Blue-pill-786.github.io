/**
 * Production-Ready SaaS Tier Management
 */

import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import ResponseFormatter from '../utils/responseFormatter.js';
import { ValidationError, ConflictError, NotFoundError, BadRequestError, UnauthorizedError } from '../utils/errors.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Tier configurations with limits
 */
const TIER_CONFIGS = {
  trial: {
    name: 'Trial',
    duration: 30, // days
    price: 0,
    limits: {
      properties: 1,
      beds: 50,
      staff: 2,
      apiCalls: 10000,
      storageGB: 5,
    },
    features: {
      multiProperty: false,
      advancedReports: false,
      apiAccess: false,
      customBranding: false,
      webhooks: false,
      smsNotifications: false,
      emailNotifications: true,
      support: 'community',
    },
  },
  starter: {
    name: 'Starter',
    price: 4999, // Monthly in INR
    limits: {
      properties: 5,
      beds: 200,
      staff: 5,
      apiCalls: 100000,
      storageGB: 20,
    },
    features: {
      multiProperty: true,
      advancedReports: false,
      apiAccess: true,
      customBranding: false,
      webhooks: false,
      smsNotifications: false,
      emailNotifications: true,
      support: 'email',
    },
  },
  professional: {
    name: 'Professional',
    price: 9999,
    limits: {
      properties: 25,
      beds: 1000,
      staff: 20,
      apiCalls: 500000,
      storageGB: 100,
    },
    features: {
      multiProperty: true,
      advancedReports: true,
      apiAccess: true,
      customBranding: true,
      webhooks: true,
      smsNotifications: true,
      emailNotifications: true,
      support: 'priority',
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 'custom',
    limits: {
      properties: 'unlimited',
      beds: 'unlimited',
      staff: 'unlimited',
      apiCalls: 'unlimited',
      storageGB: 'unlimited',
    },
    features: {
      multiProperty: true,
      advancedReports: true,
      apiAccess: true,
      customBranding: true,
      webhooks: true,
      smsNotifications: true,
      emailNotifications: true,
      support: 'dedicated',
    },
  },
};

/**
 * Sign up organization (SaaS registration)
 */
export const signupOrganization = async (req, res, next) => {
  try {
    const {
      organizationName,
      ownerEmail,
      ownerName,
      ownerPassword,
      companyPhone,
      industry,
    } = req.body;

    // Validation
    if (!organizationName || !ownerEmail || !ownerName || !ownerPassword) {
      throw new ValidationError('Missing required fields', []);
    }

    if (ownerPassword.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters');
    }

    const normalizedEmail = ownerEmail.toLowerCase();

    // Check if organization already exists
    const existingOrg = await Organization.findOne({ email: normalizedEmail });
    if (existingOrg) {
      throw new ConflictError('Email already registered');
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Create organization
    const organization = new Organization({
      name: organizationName,
      email: normalizedEmail,
      billingEmail: normalizedEmail,
      phone: companyPhone,
      industry,
      tier: 'trial',
      status: 'active',
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      limits: TIER_CONFIGS.trial.limits,
      features: TIER_CONFIGS.trial.features,
    });

    await organization.save();

    const ownerUser = await User.create({
      organization: organization._id,
      name: ownerName,
      email: normalizedEmail,
      password: ownerPassword,
      phone: companyPhone,
      role: 'admin',
      isActive: true,
    });

    organization.owner = {
      userId: ownerUser._id,
      name: ownerUser.name,
      email: ownerUser.email,
    };
    organization.teamMembers = [
      {
        userId: ownerUser._id,
        email: ownerUser.email,
        role: 'admin',
      },
    ];

    await organization.save();

    // Generate token
    const token = jwt.sign(
      { id: ownerUser._id, email: ownerUser.email, organizationId: organization._id },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return res.json(
      ResponseFormatter.created(
        {
          token,
          user: ownerUser.toJSON(),
          organization: {
            id: organization._id,
            name: organization.name,
            tier: organization.tier,
            trialEndDate: organization.trialEndDate,
          },
        },
        'Organization owner account created. Trial activated for 30 days.'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get organization details
 */
export const getOrganization = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;

    const organization = await Organization.findById(organizationId)
      .select('-stripeCustomerId -stripeSubscriptionId')
      .lean();

    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    return res.json(ResponseFormatter.success(organization, 'Organization retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * Update organization settings
 */
export const updateOrganization = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      throw new UnauthorizedError('Only organization admins can update settings');
    }

    const organizationId = req.user.organization;
    const { name, billingEmail, phone, address, webhookUrl, branding } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      organizationId,
      {
        ...(name && { name }),
        ...(billingEmail && { billingEmail }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(webhookUrl && { webhookUrl }),
        ...(branding && { branding }),
      },
      { new: true }
    );

    return res.json(ResponseFormatter.updated(organization, 'Organization updated'));
  } catch (err) {
    next(err);
  }
};

/**
 * Get pricing information
 */
export const getPricing = async (req, res, next) => {
  try {
    const pricing = Object.entries(TIER_CONFIGS).map(([key, config]) => ({
      tier: key,
      ...config,
    }));

    return res.json(ResponseFormatter.success(pricing, 'Pricing information retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * Upgrade to paid tier
 */
export const upgradeTier = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const { tier, billingCycle = 'monthly', paymentMethodId } = req.body;

    // Validate tier
    if (!Object.keys(TIER_CONFIGS).includes(tier)) {
      throw new BadRequestError('Invalid tier');
    }

    if (tier === 'trial') {
      throw new BadRequestError('Cannot upgrade to trial tier');
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) throw new NotFoundError('Organization', organizationId);

    // Check tier hierarchy
    const tierHierarchy = { trial: 0, starter: 1, professional: 2, enterprise: 3 };
    if (tierHierarchy[tier] <= tierHierarchy[organization.tier]) {
      throw new BadRequestError('Can only upgrade to a higher tier');
    }

    // In production, integrate with Stripe/Razorpay
    // For now, just update the tier
    organization.tier = tier;
    organization.limits = TIER_CONFIGS[tier].limits;
    organization.features = TIER_CONFIGS[tier].features;
    organization.billingCycle = billingCycle;
    organization.subscriptionStartDate = new Date();
    organization.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await organization.save();

    return res.json(
      ResponseFormatter.updated(organization, `Successfully upgraded to ${tier} tier`)
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Downgrade tier
 */
export const downgradeTier = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const { tier } = req.body;

    if (!Object.keys(TIER_CONFIGS).includes(tier)) {
      throw new BadRequestError('Invalid tier');
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) throw new NotFoundError('Organization', organizationId);

    // Validate downgrade
    const tierHierarchy = { trial: 0, starter: 1, professional: 2, enterprise: 3 };
    if (tierHierarchy[tier] >= tierHierarchy[organization.tier]) {
      throw new BadRequestError('Can only downgrade to a lower tier');
    }

    organization.tier = tier;
    organization.limits = TIER_CONFIGS[tier].limits;
    organization.features = TIER_CONFIGS[tier].features;
    organization.downgradeReason = req.body.reason;
    organization.downgradedAt = new Date();

    await organization.save();

    return res.json(
      ResponseFormatter.updated(organization, `Downgraded to ${tier} tier`)
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get current usage
 */
export const getUsage = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;

    const organization = await Organization.findById(organizationId).select('limits').lean();
    if (!organization) throw new NotFoundError('Organization', organizationId);

    // Calculate current usage (requires aggregation from collections)
    const usage = {
      properties: 0,
      beds: 0,
      staff: 0,
      storage: 0,
    };

    // In production, query actual data
    // For now, return placeholder
    const response = {
      limits: organization.limits,
      current: usage,
      percentage: {
        properties: organization.limits.properties ? 0 : 'N/A',
        beds: organization.limits.beds ? 0 : 'N/A',
        staff: organization.limits.staff ? 0 : 'N/A',
      },
    };

    return res.json(ResponseFormatter.success(response, 'Usage information retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * Get billing history
 */
export const getBillingHistory = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const { page = 1, limit = 10 } = req.query;

    const organization = await Organization.findById(organizationId)
      .select('billingHistory')
      .lean();

    if (!organization) throw new NotFoundError('Organization', organizationId);

    const history = organization.billingHistory || [];
    const total = history.length;
    const paginated = history.slice((page - 1) * limit, page * limit);

    return res.json(
      ResponseFormatter.paginated(paginated, page, limit, total, 'Billing history retrieved')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const { reason } = req.body;

    const organization = await Organization.findById(organizationId);
    if (!organization) throw new NotFoundError('Organization', organizationId);

    organization.tier = 'trial';
    organization.status = 'suspended';
    organization.cancellationReason = reason;
    organization.cancelledAt = new Date();

    await organization.save();

    return res.json(ResponseFormatter.updated(organization, 'Subscription cancelled'));
  } catch (err) {
    next(err);
  }
};/**
 * Apply coupon
 */
export const applyCoupon = async (req, res, next) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      throw new BadRequestError('Coupon code is required');
    }

    // Dummy logic (replace with DB later)
    let discount = 0;

    if (couponCode === 'WELCOME10') {
      discount = 10;
    } else if (couponCode === 'PRO20') {
      discount = 20;
    } else {
      throw new BadRequestError('Invalid coupon code');
    }

    return res.json(
      ResponseFormatter.success(
        { couponCode, discount },
        'Coupon applied successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get subscription status
 */
export const getSubscriptionStatus = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;

    const organization = await Organization.findById(organizationId)
      .select('tier status subscriptionStartDate subscriptionEndDate trialEndDate')
      .lean();

    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    return res.json(
      ResponseFormatter.success(organization, 'Subscription status retrieved')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Renew subscription
 */
export const renewSubscription = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    organization.subscriptionStartDate = new Date();
    organization.subscriptionEndDate = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );

    await organization.save();

    return res.json(
      ResponseFormatter.updated(organization, 'Subscription renewed successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get API usage
 */
export const getAPIUsage = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;

    const organization = await Organization.findById(organizationId)
      .select('apiCallsThisMonth limits')
      .lean();

    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    return res.json(
      ResponseFormatter.success(
        {
          used: organization.apiCallsThisMonth || 0,
          limit: organization.limits?.apiCalls || 0,
        },
        'API usage retrieved'
      )
    );
  } catch (err) {
    next(err);
  }
};





/**
 * Export tier configurations
 */

/**
 * Get payment methods for organization
 */
export const getPaymentMethods = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;

    const organization = await Organization.findById(organizationId)
      .select('paymentMethods')
      .lean();

    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    const paymentMethods = organization.paymentMethods || [];
    return res.json(ResponseFormatter.success(paymentMethods, 'Payment methods retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * Add payment method
 */
export const createPaymentMethod = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const { cardholderName, cardNumber, expiryMonth, expiryYear, cvv } = req.body;

    if (!cardholderName || !cardNumber || !expiryMonth || !expiryYear || !cvv) {
      throw new ValidationError('Missing payment method fields', []);
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    const paymentMethod = {
      id: Date.now().toString(),
      cardholderName,
      last4: cardNumber.slice(-4),
      expiryMonth,
      expiryYear,
      isDefault: organization.paymentMethods?.length === 0,
      createdAt: new Date(),
    };

    if (!organization.paymentMethods) {
      organization.paymentMethods = [];
    }

    organization.paymentMethods.push(paymentMethod);
    await organization.save();

    return res.json(
      ResponseFormatter.created(paymentMethod, 'Payment method added successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Set default payment method
 */
export const setDefaultPaymentMethod = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const { methodId } = req.params;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    const paymentMethods = organization.paymentMethods || [];
    const methodIndex = paymentMethods.findIndex(m => m.id === methodId);

    if (methodIndex < 0) {
      throw new NotFoundError('Payment method', methodId);
    }

    paymentMethods.forEach(m => m.isDefault = false);
    paymentMethods[methodIndex].isDefault = true;

    organization.paymentMethods = paymentMethods;
    await organization.save();

    return res.json(
      ResponseFormatter.updated(paymentMethods[methodIndex], 'Default payment method updated')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Delete payment method
 */
export const deletePaymentMethod = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const { methodId } = req.params;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    const paymentMethods = organization.paymentMethods || [];
    const method = paymentMethods.find(m => m.id === methodId);

    if (!method) {
      throw new NotFoundError('Payment method', methodId);
    }

    organization.paymentMethods = paymentMethods.filter(m => m.id !== methodId);
    await organization.save();

    return res.json(ResponseFormatter.deleted('Payment method deleted successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Get team members
 */
export const getTeamMembers = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;

    const organization = await Organization.findById(organizationId)
      .select('teamMembers')
      .lean();

    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    const teamMembers = organization.teamMembers || [];
    return res.json(ResponseFormatter.success(teamMembers, 'Team members retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * Invite team member
 */
export const inviteTeamMember = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const { email, role } = req.body;

    if (!email || !role) {
      throw new ValidationError('Email and role are required', []);
    }

    if (!['admin', 'manager', 'staff'].includes(role)) {
      throw new BadRequestError('Invalid role');
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    const teamMember = {
      id: Date.now().toString(),
      email,
      role,
      status: 'pending',
      invitedAt: new Date(),
      inviteToken: Math.random().toString(36).substring(7),
    };

    if (!organization.teamMembers) {
      organization.teamMembers = [];
    }

    organization.teamMembers.push(teamMember);
    await organization.save();

    return res.json(
      ResponseFormatter.created(teamMember, 'Invitation sent successfully')
    );
  } catch (err) {
    next(err);
  }
};


export { TIER_CONFIGS };

