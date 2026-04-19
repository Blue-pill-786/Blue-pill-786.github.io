import Redis from 'ioredis';
import { Organization } from '../models/Organization.js';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

/**
 * Rate Limiting Middleware
 * Implements tier-based rate limiting for API calls
 */

const RATE_LIMITS = {
  trial: { requests: 100, window: 'hour' }, // 100 per hour
  starter: { requests: 1000, window: 'hour' }, // 1000 per hour
  professional: { requests: 5000, window: 'hour' }, // 5000 per hour
  enterprise: { requests: -1, window: 'hour' } // unlimited
};

const WINDOW_SECONDS = {
  minute: 60,
  hour: 3600,
  day: 86400
};

export const rateLimiter = async (req, res, next) => {
  try {
    if (!req.organizationId) {
      return next(); // Skip if no org context
    }

    if (!redis) {
      console.warn('Redis not configured, skipping rate limiting');
      return next();
    }

    const organization = await Organization.findById(req.organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const limit = RATE_LIMITS[organization.tier] || RATE_LIMITS.trial;

    // Unlimited tier
    if (limit.requests === -1) {
      return next();
    }

    const windowSeconds = WINDOW_SECONDS[limit.window];
    const key = `ratelimit:${req.organizationId}:${limit.window}`;
    const current = await redis.incr(key);

    // Set expiration on first request
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    // Set headers
    res.setHeader('X-RateLimit-Limit', limit.requests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.requests - current));
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (windowSeconds * 1000)).toISOString());

    if (current > limit.requests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: limit.requests,
        window: limit.window,
        retryAfter: windowSeconds
      });
    }

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Don't block request on rate limit error
    next();
  }
};

/**
 * Subscription Status Middleware
 * Checks if subscription is active and allows access
 */

export const checkSubscriptionStatus = async (req, res, next) => {
  try {
    if (!req.organizationId) {
      return next();
    }

    const organization = await Organization.findById(req.organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check status
    if (organization.status === 'suspended') {
      return res.status(403).json({
        error: 'Organization suspended',
        reason: 'Please contact support'
      });
    }

    if (organization.status === 'cancelled') {
      return res.status(403).json({
        error: 'Subscription cancelled',
        reason: 'Please reactivate subscription'
      });
    }

    // Check trial expiration
    if (organization.tier === 'trial') {
      const trialEnd = new Date(organization.trialEndDate);
      if (new Date() > trialEnd) {
        organization.status = 'inactive';
        organization.tier = 'starter';
        await organization.save();

        return res.status(402).json({
          error: 'Trial expired',
          reason: 'Please select a payment plan'
        });
      }
    }

    // Check subscription expiration (non-trial)
    if (organization.tier !== 'trial' && organization.subscriptionEndDate) {
      const subEnd = new Date(organization.subscriptionEndDate);
      if (new Date() > subEnd && organization.autoRenew === false) {
        organization.status = 'inactive';
        await organization.save();

        return res.status(402).json({
          error: 'Subscription expired',
          reason: 'Please renew subscription'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    next();
  }
};

/**
 * Feature Access Middleware
 * Validates access to tier-specific features
 */

export const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return next();
      }

      const organization = await Organization.findById(req.organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const isEnabled = organization.features[featureName];
      if (!isEnabled) {
        return res.status(403).json({
          error: `Feature '${featureName}' not available`,
          tier: organization.tier,
          requiredTier: this.getMinimumTierForFeature(featureName)
        });
      }

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      next();
    }
  };
};

/**
 * Helper: Get minimum tier for a feature
 */
checkFeatureAccess.getMinimumTierForFeature = (featureName) => {
  const requirements = {
    multiProperty: 'professional',
    advancedReports: 'professional',
    apiAccess: 'enterprise',
    customBranding: 'enterprise',
    webhooks: 'enterprise',
    smsNotifications: 'professional'
  };
  return requirements[featureName] || 'starter';
};

/**
 * Usage Tracking Middleware
 * Tracks API usage per organization
 */

export const trackUsage = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    // Track only successful requests
    if (res.statusCode >= 200 && res.statusCode < 400 && req.organizationId) {
      trackApiCall(req.organizationId).catch(err => {
        console.error('Usage tracking error:', err);
      });
    }

    res.send = originalSend;
    return res.send(data);
  };

  next();
};

async function trackApiCall(organizationId) {
  if (!redis) return;

  const key = `usage:${organizationId}:month`;
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  try {
    // Increment counter
    await redis.hincrby(`${key}:${monthKey}`, 'calls', 1);
    // Set expiration to 60 days
    await redis.expire(`${key}:${monthKey}`, 60 * 24 * 60 * 60);

    // Log to database monthly
    // This would be called by a scheduled job to aggregatefrom Redis to DB
  } catch (error) {
    console.error('Track API call error:', error);
  }
}

export default {
  rateLimiter,
  checkSubscriptionStatus,
  checkFeatureAccess,
  trackUsage
};
