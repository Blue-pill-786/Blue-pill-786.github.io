# SaaS Tier Management System - Complete Integration Guide

## Overview

This document outlines the production-ready SaaS tier management system for the property management platform. It includes multi-tier subscriptions, billing management, usage tracking, and feature control.

## System Architecture

### Backend Components

#### 1. **SaaS Controller** (`backend/src/controllers/saasController.prod.js`)
- Handles all organization and billing operations
- Implements tier management logic
- Provides pricing and usage information
- Manages subscriptions and downgrades

#### 2. **Organization Model** (`backend/src/models/Organization.js`)
- Stores organization details
- Manages subscription information
- Tracks usage and billing history
- Stores team members and payment methods

#### 3. **SaaS Routes** (`backend/src/routes/saas.js`)
```
POST   /api/saas/signup              - Create new organization (public)
GET    /api/saas/pricing             - Get pricing information (public)
GET    /api/saas/details             - Get organization details (protected)
PUT    /api/saas/update              - Update organization settings (protected)
POST   /api/saas/upgrade             - Upgrade to higher tier (protected)
POST   /api/saas/downgrade           - Downgrade to lower tier (protected)
GET    /api/saas/usage               - Get usage and limits (protected)
GET    /api/saas/billing-history     - Get billing history (protected)
POST   /api/saas/cancel              - Cancel subscription (protected)
```

### Frontend Components

#### 1. **SaaS Hook** (`frontend/src/hooks/useSaaS.js`)
```javascript
const {
  organization,          // Current organization details
  pricing,              // Available tier pricing
  usage,                // Current usage and limits
  billingHistory,       // Invoice history
  loading,              // Loading state
  upgrading,            // Upgrade in progress
  error,                // Error messages
  success,              // Success messages
  loadOrganization,     // Load org details
  loadPricing,          // Load pricing info
  loadUsage,            // Load usage stats
  loadBillingHistory,   // Load invoices
  upgradeTier,          // Upgrade tier
  downgradeTier,        // Downgrade tier
  updateOrganization,   // Update org settings
  cancelSubscription,   // Cancel subscription
  isTrialExpired,       // Check if trial expired
  getUsagePercentage,   // Get usage percentage
  isApproachingLimit,   // Check if approaching limits
} = useSaaS();
```

#### 2. **SaaS Endpoints** (`frontend/src/lib/endpoints.js`)
```javascript
import { api } from '@/lib/endpoints';

// Organization
api.saas.signupOrganization(data);
api.saas.getOrganization();
api.saas.updateOrganization(data);

// Pricing & Tiers
api.saas.getPricing();
api.saas.upgradeTier({ tier, billingCycle });
api.saas.downgradeTier({ tier, reason });

// Billing & Usage
api.saas.getUsage();
api.saas.getBillingHistory({ page });
api.saas.cancelSubscription({ reason });
```

## Tier Configurations

### Trial Tier (Default - 30 days free)
- **Duration**: 30 days from signup
- **Cost**: Free
- **Limits**:
  - 1 property
  - 50 beds
  - 2 staff members
  - 10,000 API calls/month
  - 5 GB storage
- **Features**:
  - Single property management
  - No advanced reports
  - No API access
  - No custom branding
  - No webhooks
  - Email notifications only
  - Community support

### Starter Tier
- **Cost**: ₹4,999/month
- **Limits**:
  - 5 properties
  - 200 beds
  - 5 staff members
  - 100,000 API calls/month
  - 20 GB storage
- **Features**:
  - Multi-property management
  - No advanced reports
  - API access enabled
  - No custom branding
  - No webhooks
  - Email notifications
  - Email support

### Professional Tier
- **Cost**: ₹9,999/month
- **Limits**:
  - 25 properties
  - 1,000 beds
  - 20 staff members
  - 500,000 API calls/month
  - 100 GB storage
- **Features**:
  - Multi-property management
  - Advanced reports
  - API access with priority
  - Custom branding
  - Webhooks enabled
  - SMS + email notifications
  - Priority support

### Enterprise Tier
- **Cost**: Custom pricing
- **Limits**: Unlimited (properties, beds, staff, API calls, storage)
- **Features**:
  - All features enabled
  - Dedicated support
  - White-label solutions
  - Custom integrations
  - SLA guarantees
  - Custom onboarding
  - Dedicated account manager

## Usage Examples

### Example 1: Load Organization and Display Tier

```javascript
import { useSaaS } from '@/hooks/useSaaS';

export function OrganizationInfo() {
  const { organization, loading, loadOrganization } = useSaaS();

  useEffect(() => {
    loadOrganization();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{organization.name}</h2>
      <p>Current Tier: {organization.tier.toUpperCase()}</p>
      <p>Status: {organization.status}</p>
      {organization.tier === 'trial' && (
        <p>Trial expires: {new Date(organization.trialEndDate).toLocaleDateString()}</p>
      )}
    </div>
  );
}
```

### Example 2: Upgrade Tier Flow

```javascript
export function UpgradeTierPage() {
  const {
    pricing,
    organization,
    loadPricing,
    upgradeTier,
    upgrading,
    error,
    success,
  } = useSaaS();

  useEffect(() => {
    loadPricing();
  }, []);

  const handleUpgrade = async (tier) => {
    try {
      await upgradeTier(tier, 'monthly');
      // Notify user of success
    } catch (err) {
      // Handle error
    }
  };

  return (
    <div>
      <h2>Upgrade Your Plan</h2>
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}
      
      {pricing.map((plan) => (
        <PricingCard key={plan.tier} plan={plan}>
          <button
            onClick={() => handleUpgrade(plan.tier)}
            disabled={upgrading || plan.tier <= organization.tier}
          >
            {upgrading ? 'Upgrading...' : 'Upgrade to ' + plan.name}
          </button>
        </PricingCard>
      ))}
    </div>
  );
}
```

### Example 3: Usage Monitoring

```javascript
export function UsageAlert() {
  const { usage, getUsagePercentage, isApproachingLimit, loadUsage } = useSaaS();

  useEffect(() => {
    loadUsage();
  }, []);

  if (!usage) return null;

  return (
    <div>
      {['properties', 'beds', 'staff'].map((resource) => {
        const percentage = getUsagePercentage(resource);
        const isApproaching = isApproachingLimit(resource, 80);

        return (
          <div key={resource} className={isApproaching ? 'alert-warning' : ''}>
            <p>{resource}: {percentage}% used</p>
            {isApproaching && (
              <p className="text-warning">
                You're approaching your {resource} limit. Consider upgrading.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### Example 4: Billing History

```javascript
export function BillingPage() {
  const { billingHistory, loading, loadBillingHistory } = useSaaS();
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadBillingHistory(page);
  }, [page]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Billing History</h2>
      <table>
        <thead>
          <tr>
            <th>Invoice ID</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {billingHistory.map((invoice) => (
            <tr key={invoice.invoiceId}>
              <td>{invoice.invoiceId}</td>
              <td>{new Date(invoice.date).toLocaleDateString()}</td>
              <td>₹{invoice.totalAmount}</td>
              <td>{invoice.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Frontend Integration

### Step 1: Import the Hook and API

```javascript
import { useSaaS } from '@/hooks/useSaaS';
import { api } from '@/lib/endpoints';
```

### Step 2: Initialize SaaS State

```javascript
const {
  organization,
  pricing,
  usage,
  loadOrganization,
  upgradeTier,
  // ... other functions
} = useSaaS();
```

### Step 3: Load Initial Data

```javascript
useEffect(() => {
  loadOrganization();
  loadPricing();
  loadUsage();
}, []);
```

### Step 4: Display and Manage Subscriptions

```javascript
// Display current tier
<div>Current Tier: {organization?.tier}</div>

// Show upgrade options
{pricing.map(plan => (
  <button onClick={() => upgradeTier(plan.tier)}>
    Upgrade to {plan.name}
  </button>
))}

// Monitor usage
{usage && (
  <ProgressBar 
    value={getUsagePercentage('properties')}
    max={100}
  />
)}
```

## Backend Integration

### Using the SaaS Controller

```javascript
// In your controllers, access organization tier:
const organization = await Organization.findById(req.user.organization);

if (!organization.hasFeature('advancedReports')) {
  return next(new ForbiddenError('Feature not available in your tier'));
}

// Check limits
const propertiesCount = await Property.countDocuments({ organization: organizationId });
if (propertiesCount >= organization.limits.properties) {
  return next(new BadRequestError('Property limit reached'));
}
```

## Authentication & Authorization

### Protect Middleware
All SaaS routes (except signup and pricing) use the `protect` middleware:
```javascript
router.use(protect);
```

### Authorize Middleware
Organization updates and tier changes require `admin` or `owner` role:
```javascript
router.post('/upgrade', authorize('admin', 'owner'), upgradeTier);
```

## Error Handling

The SaaS system uses custom error classes:

```javascript
// Validation errors (400)
throw new ValidationError('Invalid tier', []);

// Unauthorized (401)
throw new UnauthorizedError('Only admins can update settings');

// Not found (404)
throw new NotFoundError('Organization', organizationId);

// Conflict (409)
throw new ConflictError('Email already registered');

// Forbidden (403)
throw new ForbiddenError('Feature not available');
```

## Database Indexes

The Organization model includes performance indexes:
- `email` - for unique email lookups
- `stripeCustomerId` - for Stripe integration
- `status` - for filtering by status
- `tier` - for tier-based queries
- `createdAt` - for sorting by creation date

## Payment Integration (Future)

The system is ready for Stripe/Razorpay integration:

```javascript
// Store Stripe customer ID
organization.stripeCustomerId = stripeCustomer.id;

// Store subscription ID
organization.stripeSubscriptionId = stripeSubscription.id;

// Track billing history
organization.billingHistory.push({
  invoiceId: stripeInvoice.id,
  amount: stripeInvoice.total / 100,
  status: 'paid',
  // ...
});
```

## Webhook Support

Organizations can configure webhooks for billing events:

```javascript
// Store webhook URL
organization.webhookUrl = 'https://yourapp.com/webhooks/billing';
organization.webhookSecret = generateSecret();

// Send webhook on tier upgrade
await sendWebhook({
  event: 'tier.upgraded',
  organization: organization._id,
  tier: organization.tier,
  timestamp: new Date(),
});
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "org_123",
    "name": "Acme Property Co",
    "tier": "professional",
    "limits": { "properties": 25, "beds": 1000 },
    "features": { "apiAccess": true, "webhooks": true }
  },
  "message": "Organization retrieved"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Upgrade failed",
  "errors": ["Tier must be higher than current tier"],
  "code": "UPGRADE_ERROR"
}
```

## Testing

The test suite includes SaaS tier endpoints:

```bash
npm test -- --testNamePattern="SaaS"
```

Tests cover:
- Organization signup
- Tier upgrades and downgrades
- Usage tracking
- Billing history
- Trial expiration
- Feature access control

## Next Steps

1. **Frontend Pages**: Create dedicated SaaS management pages
   - Settings/Organization page
   - Pricing page
   - Billing page
   - Usage monitoring page

2. **Payment Integration**: Add Stripe/Razorpay
   - Payment method management
   - Invoice generation
   - Automatic billing

3. **Advanced Features**:
   - Usage alerts and notifications
   - Auto-upgrade on limit approach
   - Custom reports for enterprise
   - Team member management

4. **Analytics**: Track tier adoption and churn

## Support

For issues or questions:
- Check the test suite for usage examples
- Review the hook implementation in `useSaaS.js`
- Check API responses in backend controllers
- Review error handling in middleware
