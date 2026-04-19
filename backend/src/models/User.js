import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
      enum: ['admin', 'owner', 'manager', 'staff', 'tenant'],
      default: 'tenant',
    },
    permissions: [String],

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

    // Password Reset
    resetToken: { type: String, select: false },
    resetTokenExpiry: Date,

    // Profile
    avatar: String,
    bio: String,
    timezone: { type: String, default: 'Asia/Kolkata' },
    language: { type: String, default: 'en' },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      weeklyReport: { type: Boolean, default: true },
      darkMode: { type: Boolean, default: true },
    },

    // Organization
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

    // Notifications
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

// Indexes (cleaned)
userSchema.index(
  { organization: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { organization: { $exists: true } },
  }
);
userSchema.index({ tenantProfile: 1 });
userSchema.index({ organization: 1, role: 1 });

// Password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.lastPasswordChange = new Date();
    next();
  } catch (err) {
    next(err);
  }
});

// Methods
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.incFailedLogins = async function () {
  if (!this.lockUntil || this.lockUntil < Date.now()) {
    this.failedLoginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= 5) {
      this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }
  return this.save();
};

userSchema.methods.resetFailedLogins = async function () {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  this.lastLogin = new Date();
  this.loginCount = (this.loginCount || 0) + 1;
  return this.save();
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.twoFactorSecret;
  delete obj.resetToken;
  return obj;
};

// Password Reset
userSchema.methods.generatePasswordReset = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetToken = hashedToken;
  this.resetTokenExpiry = new Date(Date.now() + 3600000);

  return resetToken;
};

userSchema.methods.verifyPasswordResetToken = function (token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return (
    this.resetToken === hashedToken &&
    this.resetTokenExpiry > new Date()
  );
};

userSchema.methods.clearPasswordReset = function () {
  this.resetToken = undefined;
  this.resetTokenExpiry = undefined;
  this.passwordChangeRequired = false;
  return this.save();
};

// Login history
userSchema.methods.addLoginHistory = function (ipAddress, userAgent) {
  this.loginHistory.push({
    timestamp: new Date(),
    ipAddress,
    userAgent,
  });

  if (this.loginHistory.length > 20) {
    this.loginHistory = this.loginHistory.slice(-20);
  }

  return this.save();
};

// Permissions
userSchema.methods.hasPermission = function (permission) {
  return this.permissions && this.permissions.includes(permission);
};

userSchema.methods.canManageProperty = function (propertyId) {
  return (
    this.managedProperties &&
    this.managedProperties.includes(propertyId)
  );
};

// Statics
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByRole = function (role) {
  return this.find({ role, isActive: true });
};

userSchema.statics.findByOrganization = function (organizationId) {
  return this.find({ organization: organizationId, isActive: true });
};

// Cleanup hook
userSchema.pre('findByIdAndDelete', async function (next) {
  next();
});

export const User = mongoose.model('User', userSchema);
