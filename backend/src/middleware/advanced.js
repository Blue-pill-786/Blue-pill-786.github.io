/**
 * Advanced Validation Middleware with detailed error messages
 */

import { ValidationError, BadRequestError } from '../utils/errors.js';

export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));
        throw new ValidationError('Request validation failed', errors);
      }

      req.validatedData = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Advanced Response Formatter Middleware
 */
export const formatResponse = (req, res, next) => {
  // Override res.json to format all responses
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    const response = {
      success: res.statusCode < 400,
      statusCode: res.statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    };

    if (res.statusCode < 400) {
      response.data = data;
      response.message = data?.message || 'Request successful';
    } else {
      response.error = data?.message || 'An error occurred';
      response.details = data?.details || {};
    }

    return originalJson(response);
  };

  next();
};

/**
 * Advanced Request Logging Middleware with performance metrics
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = req.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  req.id = requestId;

  // Log request
  console.log(`\n📥 [${requestId}] ${req.method} ${req.path}`);
  if (Object.keys(req.query).length > 0) {
    console.log(`   Query: ${JSON.stringify(req.query)}`);
  }
  if (req.body && Object.keys(req.body).length > 0) {
    const body = { ...req.body };
    if (body.password) body.password = '***';
    console.log(`   Body: ${JSON.stringify(body)}`);
  }
  if (req.user) {
    console.log(`   User: ${req.user._id} (${req.user.role})`);
  }

  // Capture response
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    const duration = Date.now() - startTime;
    const statusEmoji = res.statusCode < 400 ? '✅' : '❌';

    console.log(`${statusEmoji} [${requestId}] ${res.statusCode} (${duration}ms)`);
    if (data?.message) {
      console.log(`   Message: ${data.message}`);
    }

    return originalJson(data);
  };

  next();
};

/**
 * Request ID Middleware
 */
export const requestIdMiddleware = (req, res, next) => {
  req.id = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Security Headers Middleware
 */
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
};

/**
 * CORS Middleware with advanced configuration
 */
export const advancedCors = (allowedOrigins = []) => {
  return (req, res, next) => {
    const origin = req.headers.origin;
    const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173'];
    const validOrigins = [...defaultOrigins, ...allowedOrigins];

    if (validOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-ID');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  };
};

/**
 * Rate Limiting Middleware (in-memory, simple implementation)
 */
const requestCounts = new Map();

export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || '0.0.0.0';
    const key = `${ip}-${req.path}`;
    const now = Date.now();

    if (!requestCounts.has(key)) {
      requestCounts.set(key, []);
    }

    const requests = requestCounts.get(key).filter((time) => now - time < windowMs);
    requests.push(now);
    requestCounts.set(key, requests);

    if (requests.length > maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    } else {
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - requests.length);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      next();
    }
  };
};

/**
 * Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  const requestId = req.id || 'unknown';
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log error
  if (statusCode >= 500) {
    console.error(`\n❌ [${requestId}] ERROR (${statusCode}):`);
    console.error(`   Message: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);
  } else {
    console.warn(`\n⚠️  [${requestId}] WARNING (${statusCode}): ${err.message}`);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      type: err.name || 'Error',
      details: err.details || {},
      requestId,
    },
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
