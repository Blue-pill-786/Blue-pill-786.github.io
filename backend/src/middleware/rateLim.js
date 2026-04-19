/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and system abuse
 */

const store = new Map(); // Simple in-memory store for rate limiting

/**
 * Rate limiter middleware
 * @param {Object} options - Configuration
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Max requests per window (default: 5)
 * @param {string} options.message - Error message (default: 'Too many requests')
 * @returns {Function} Express middleware
 */
export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    skip = () => false,
  } = options;

  return (req, res, next) => {
    if (skip(req)) return next();

    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request history for this key
    if (!store.has(key)) {
      store.set(key, []);
    }

    const requests = store.get(key);

    // Remove old requests outside the window
    const recentRequests = requests.filter(time => time > windowStart);

    // Check if exceeded limit
    if (recentRequests.length >= max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000),
      });
    }

    // Add current request
    recentRequests.push(now);
    store.set(key, recentRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      const entries = Array.from(store.entries());
      entries.forEach(([k, v]) => {
        const recent = v.filter(time => time > windowStart);
        if (recent.length === 0) {
          store.delete(k);
        } else {
          store.set(k, recent);
        }
      });
    }

    next();
  };
};

/**
 * Specific rate limiter for authentication endpoints
 * Stricter: 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again in 15 minutes',
});

/**
 * Rate limiter for general API endpoints
 * Moderate: 100 requests per 15 minutes per user
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Rate limit exceeded, try again later',
  keyGenerator: (req) => req.user?.id || req.ip, // Per user if logged in
});

/**
 * Rate limiter for file uploads
 * Strict: 20 uploads per hour per user
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Upload limit exceeded, please wait before uploading more files',
  keyGenerator: (req) => req.user?.id || req.ip,
});
