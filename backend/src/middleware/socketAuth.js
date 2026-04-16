/**
 * Socket.io Authentication Middleware
 * Verifies JWT tokens for WebSocket connections
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const userId = socket.handshake.auth.userId;
    const organizationId = socket.handshake.auth.organizationId;

    if (!token) {
      return next(new Error('Missing authentication token'));
    }

    if (!userId || !organizationId) {
      return next(new Error('Missing user or organization ID'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.id !== userId) {
      return next(new Error('Token does not match user ID'));
    }

    // Optional: Verify user still exists and is active
    const user = await User.findById(userId);
    if (!user) {
      return next(new Error('User not found'));
    }

    if (user.status === 'inactive') {
      return next(new Error('User account is inactive'));
    }

    // Attach user info to socket
    socket.userId = userId;
    socket.organizationId = organizationId;
    socket.userEmail = user.email;
    socket.userName = user.profile?.name || 'Anonymous';

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    next(error);
  }
};

module.exports = socketAuth;
