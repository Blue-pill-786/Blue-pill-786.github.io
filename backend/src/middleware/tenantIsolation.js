import { Organization } from '../models/Organization.js';

/**
 * Tenant Isolation Middleware
 * 
 * Validates that the authenticated user belongs to the requested organization
 * and auto-injects organizationId into all queries/operations within the handler
 * 
 * Usage: router.use('/:organizationId', tenantIsolation, handler)
 */
export const tenantIsolation = async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    // Verify organizationId is valid ObjectId format
    if (!organizationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Verify user exists and get their organization
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user belongs to this organization
    // User's organization field must match the requested organizationId
    if (req.user.organization.toString() !== organizationId) {
      return res.status(403).json({ 
        error: 'Unauthorized: You do not have access to this organization' 
      });
    }

    // Check if organization is active
    if (organization.status === 'suspended' || organization.status === 'cancelled') {
      return res.status(403).json({ 
        error: 'Organization is not active' 
      });
    }

    // Inject organizationId into request context
    // All handlers can safely use req.organizationId
    req.organizationId = organizationId;
    req.organization = organization;

    next();
  } catch (error) {
    console.error('Tenant isolation middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Query Helper: Auto-injects organizationId into find queries
 * 
 * Usage in services:
 *   const tenants = await Tenant.find(addOrgFilter(req.organizationId, {status: 'active'}))
 */
export const addOrgFilter = (organizationId, filter = {}) => {
  return { ...filter, organization: organizationId };
};

/**
 * Check if user has permission for an operation
 * Usage: await checkOrgAccess(req.user, req.organizationId)
 */
export const checkOrgAccess = async (user, requestedOrgId) => {
  if (!user || !user.organization) {
    return false;
  }
  return user.organization.toString() === requestedOrgId.toString();
};

/**
 * Validate subscription status and feature access
 * Usage: await validateSubscription(organization, 'apiAccess')
 */
export const validateSubscription = async (organization, featureName) => {
  if (!organization) {
    throw new Error('Organization not found');
  }

  if (organization.status === 'suspended') {
    throw new Error('Organization suspended');
  }

  if (organization.status === 'cancelled') {
    throw new Error('Organization cancelled');
  }

  // Check if feature is enabled for this tier
  const features = organization.features || {};
  if (!features[featureName]) {
    throw new Error(`Feature '${featureName}' not available for tier '${organization.tier}'`);
  }

  // Check subscription expiration
  if (organization.tier !== 'trial' && organization.subscriptionEndDate) {
    if (new Date() > new Date(organization.subscriptionEndDate)) {
      throw new Error('Subscription expired');
    }
  }

  return true;
};

/**
 * Resource-level access check
 * Ensures a resource (property, tenant, invoice) belongs to the user's organization
 * 
 * Usage: await validateResourceAccess(Tenant, tenantId, req.organizationId)
 */
export const validateResourceAccess = async (Model, resourceId, organizationId) => {
  const resource = await Model.findOne({
    _id: resourceId,
    organization: organizationId
  });

  if (!resource) {
    throw new Error('Resource not found or access denied');
  }

  return resource;
};

/**
 * Rate limiting check for API tier
 * Usage: await checkRateLimit(req.organization, req)
 */
export const checkRateLimit = async (organization) => {
  if (!organization) {
    throw new Error('Organization not found');
  }

  const rateLimits = {
    'trial': { monthly: 5000 },
    'starter': { monthly: 10000 },
    'professional': { monthly: 50000 },
    'enterprise': { monthly: -1 } // unlimited
  };

  const limit = rateLimits[organization.tier] || rateLimits.trial;

  if (limit.monthly === -1) {
    // Unlimited
    return true;
  }

  // Check current month usage
  const subscription = await require('../models/Subscription.js').Subscription
    .findOne({ organization: organization._id });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (subscription.usage.apiCallsUsed >= limit.monthly) {
    throw new Error(`API rate limit exceeded for tier: ${organization.tier}`);
  }

  return true;
};
