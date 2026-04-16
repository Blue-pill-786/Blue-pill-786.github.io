import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, unique: true },
    phone: { type: String, sparse: true },
    password: { type: String, required: true, minlength: 6, select: false },

    // Role & Permissions
    role: {
      type: String,
      enum: ['admin', 'manager', 'staff', 'tenant'],
      default: 'tenant',
    },
    permissions: [String], // Additional granular permissions

    // Account Status
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationTokenExpiry: Date,

    // Security
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    lastPasswordChange: Date,
    passwordChangeRequired: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    // Profile
    avatar: String,
    bio: String,
    timezone: { type: String, default: 'Asia/Kolkata' },
    language: { type: String, default: 'en' },

    // Organization (for SaaS)
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },

    // Relations
    tenantProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    managedProperties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],

    // Notification Preferences
    notifications: {
      emailInvoice: { type: Boolean, default: true },
      emailPayment: { type: Boolean, default: true },
      emailMaintenance: { type: Boolean, default: true },
      smsReminders: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: true },
    },

    // Audit
    lastLogin: Date,
    loginCount: { type: Number, default: 0 },
    loginHistory: [
      {
        timestamp: Date,
        ipAddress: String,
        userAgent: String,
      },
    ],
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ organization: 1, email: 1 }, { 
  unique: true,
  partialFilterExpression: { organization: { $exists: true } }
});
userSchema.index({ tenantProfile: 1 });
userSchema.index({ organization: 1, role: 1 });

// Password hashing
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Methods
userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isAccountLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.incFailedLogins = async function() {
  if (!this.lockUntil || this.lockUntil < Date.now()) {
    this.failedLoginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= 5) {
      this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    }
  }
  return this.save();
};

userSchema.methods.resetFailedLogins = async function() {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  this.lastLogin = new Date();
  this.loginCount = (this.loginCount || 0) + 1;
  return this.save();
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.twoFactorSecret;
  return obj;
};

/**
 * Generate password reset token
 */
userSchema.methods.generatePasswordReset = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  this.password = resetToken; // Temporary storage
  this.passwordChangeRequired = true;
  return resetToken;
};

/**
 * Add login history entry
 */
userSchema.methods.addLoginHistory = function(ipAddress, userAgent) {
  this.loginHistory.push({
    timestamp: new Date(),
    ipAddress,
    userAgent,
  });
  
  // Keep only last 20 logins
  if (this.loginHistory.length > 20) {
    this.loginHistory = this.loginHistory.slice(-20);
  }
  
  return this.save();
};

/**
 * Check if user has permission
 */
userSchema.methods.hasPermission = function(permission) {
  return this.permissions && this.permissions.includes(permission);
};

/**
 * Check if user can manage property
 */
userSchema.methods.canManageProperty = function(propertyId) {
  return this.managedProperties && this.managedProperties.includes(propertyId);
};

/**
 * Statics - Find by email safely
 */
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Statics - Find active users by role
 */
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

/**
 * Statics - Find organization users
 */
userSchema.statics.findByOrganization = function(organizationId) {
  return this.find({ organization: organizationId, isActive: true });
};

/**
 * Pre-delete hook - Remove references
 */
userSchema.pre('findByIdAndRemove', async function(next) {
  // Clean up: remove user from related documents
  // Implementation depends on your needs
  next();
});

export const User = mongoose.model('User', userSchema);
