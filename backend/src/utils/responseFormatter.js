/**
 * Advanced Response Formatter for Consistent API Responses
 */

export class ResponseFormatter {
  /**
   * Success Response
   */
  static success(data, message = 'Request successful', statusCode = 200) {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Paginated Response
   */
  static paginated(items, page, limit, total, message = 'Data retrieved successfully') {
    return {
      success: true,
      statusCode: 200,
      message,
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Created Response
   */
  static created(data, message = 'Resource created successfully') {
    return this.success(data, message, 201);
  }

  /**
   * Updated Response
   */
  static updated(data, message = 'Resource updated successfully') {
    return this.success(data, message, 200);
  }

  /**
   * Deleted Response
   */
  static deleted(message = 'Resource deleted successfully') {
    return {
      success: true,
      statusCode: 200,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Error Response
   */
  static error(message, statusCode = 500, details = {}, type = 'Error') {
    return {
      success: false,
      statusCode,
      error: {
        message,
        type,
        details,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Not Found Response
   */
  static notFound(resource) {
    return this.error(`${resource} not found`, 404, { resource });
  }

  /**
   * Unauthorized Response
   */
  static unauthorized(message = 'Unauthorized') {
    return this.error(message, 401, { reason: 'Authentication required' });
  }

  /**
   * Forbidden Response
   */
  static forbidden(message = 'Access denied') {
    return this.error(message, 403, { reason: 'Insufficient permissions' });
  }

  /**
   * Bad Request Response
   */
  static badRequest(message, errors = []) {
    return this.error(message, 400, { errors }, 'BadRequestError');
  }

  /**
   * Validation Error Response
   */
  static validationError(errors) {
    return this.error('Validation failed', 422, { validationErrors: errors }, 'ValidationError');
  }

  /**
   * Conflict Response
   */
  static conflict(message, details = {}) {
    return this.error(message, 409, details, 'ConflictError');
  }

  /**
   * Rate Limit Response
   */
  static rateLimited(retryAfter = 60) {
    return this.error('Too many requests', 429, { retryAfter }, 'RateLimitError');
  }

  /**
   * Server Error Response
   */
  static serverError(message = 'Internal server error', requestId = null) {
    return this.error(message, 500, { requestId }, 'InternalServerError');
  }
}

export default ResponseFormatter;
