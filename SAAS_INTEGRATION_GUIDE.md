# SaaS Integration Guide

## 📋 Quick Integration Steps

### Step 1: Update server.js

Add the SaaS routes to your Express app:

```javascript
// At the top with other imports
import saasRoutes from './routes/saas.js';
import { rateLimiter, checkSubscriptionStatus, trackUsage } from './middleware/rateLimiter.js';

// After existing routes, add:
app.use('/api/saas', saasRoutes);

// Apply rate limiting and subscription checks to all API routes
app.use('/api/admin', rateLimiter, checkSubscriptionStatus, trackUsage);
app.use('/api/tenant', rateLimiter, checkSubscriptionStatus, trackUsage);
app.use('/api/properties', rateLimiter, checkSubscriptionStatus, trackUsage);
```

### Step 2: Update App.jsx (Frontend)

Add routing for new pages:

```javascript
import SaaSSignup from './pages/SaaSSignup';
import BillingDashboard from './pages/BillingDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... existing routes ... */}
        
        {/* SaaS Routes */}
        <Route path="/signup" element={<SaaSSignup />} />
        <Route path="/org/:organizationId/billing" element={<BillingDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Step 3: Environment Variables

Copy the Stripe keys to `.env`:

```bash
# .env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY
REDIS_URL=redis://localhost:6379
```

### Step 4: Install Dependencies

```bash
npm install stripe ioredis

# If not already installed
npm install ioredis
```

### Step 5: Update Auth Service

Modify `authService.js` to work with organizations:

```javascript
// OLD: register function (single-instance)
export const register = async (userData) => {
  // Creates user without organization
};

// NEW: You can keep old register for backward compatibility
// But new signup should use SaaSSignup page which calls /api/saas/signup
```

## 🗄️ Database Migration

If migrating from single-instance to SaaS:

### Step 1: Create Default Organization

```javascript
import { Organization } from './models/Organization.js';
import { User } from './models/User.js';

const createDefaultOrg = async () => {
  let org = await Organization.findOne({ name: 'Default Organization' });
  
  if (!org) {
    org = await Organization.create({
      name: 'Default Organization',
      email: 'admin@default.local',
      tier: 'enterprise', // Give existing users enterprise tier
      status: 'active',
      features: {
        multiProperty: true,
        advancedReports: true,
        apiAccess: true,
        customBranding: true,
        webhooks: true,
        smsNotifications: true,
        emailNotifications: true
      },
      limits: { properties: -1, beds: -1, staff: -1, apiCalls: -1 }
    });
  }
  
  return org;
};
```

### Step 2: Migrate Existing Users

```javascript
const migrateUsers = async () => {
  const defaultOrg = await Organization.findOne({ name: 'Default Organization' });
  
  // Add organizationId to all existing users
  await User.updateMany({}, { $set: { organization: defaultOrg._id } });
  
  // Do same for properties, tenants, invoices, expenses
  await Property.updateMany({}, { $set: { organization: defaultOrg._id } });
  await Tenant.updateMany({}, { $set: { organization: defaultOrg._id } });
  await Invoice.updateMany({}, { $set: { organization: defaultOrg._id } });
  await Expense.updateMany({}, { $set: { organization: defaultOrg._id } });
};
```

## 🧪 Testing the SaaS Setup

### 1. Signup Flow

```bash
# POST: Create organization
curl -X POST http://localhost:4000/api/saas/signup \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Test PG",
    "ownerName": "John Doe",
    "ownerEmail": "john@test.com",
    "ownerPassword": "password123"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhb...",
  "organization": {
    "_id": "org_id",
    "name": "Test PG",
    "tier": "trial",
    "trialEndDate": "2026-05-13"
  }
}
```

### 2. Select Tier

```bash
curl -X POST http://localhost:4000/api/saas/organizations/org_id/select-tier \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "professional",
    "billingCycle": "monthly"
  }'
```

### 3. Verify Tenant Isolation

```bash
# This should fail - can't access other org's data
curl -X GET 'http://localhost:4000/api/admin/properties' \
  -H "Authorization: Bearer user1_token"
# Only sees org1's properties

# Another user with different org
curl -X GET 'http://localhost:4000/api/admin/properties' \
  -H "Authorization: Bearer user2_token"
# Only sees org2's properties, never org1's data
```

## 🔄 Service Updates Needed

These existing services need to be updated to filter by organizationId:

### propertyService.js
```javascript
// OLD
const getProperties = async () => Property.find();

// NEW
const getProperties = async (organizationId) => 
  Property.find({ organization: organizationId });
```

### tenantService.js
```javascript
// OLD
const getTenants = async (propertyId) => 
  Tenant.find({ property: propertyId });

// NEW
const getTenants = async (organizationId, propertyId) => 
  Tenant.find({ organization: organizationId, property: propertyId });
```

### Similar updates for:
- invoiceService.js
- paymentService.js
- reportService.js
- dashboardService.js

##📊 Monitoring

### Check Organization Usage

```javascript
const checkOrgUsage = async (organizationId) => {
  const org = await Organization.findById(organizationId);
  return {
    tier: org.tier,
    usage: org.usage,
    limits: org.limits,
    percentUsed: {
      properties: (org.usage.properties / org.limits.properties) * 100,
      beds: (org.usage.beds / org.limits.beds) * 100
    }
  };
};
```

### Monitor Subscription Health

```javascript
const getSubscriptionStats = async () => {
  const orgs = await Organization.find();
  return {
    total: orgs.length,
    active: orgs.filter(o => o.status === 'active').length,
    trial: orgs.filter(o => o.tier === 'trial').length,
    byTier: {
      starter: orgs.filter(o => o.tier === 'starter').length,
      professional: orgs.filter(o => o.tier === 'professional').length,
      enterprise: orgs.filter(o => o.tier === 'enterprise').length
    }
  };
};
```

## 🚨 Common Issues

### Issue: organizationId undefined in routes
**Solution**: Make sure tenantIsolation middleware is applied BEFORE your handlers

```javascript
// ✓ Correct
router.get('/properties/:organizationId', 
  protect,
  tenantIsolation,  // Must be here
  getProperties
);

// ✗ Wrong
router.get('/properties/:organizationId', 
  protect,
  getProperties,
  tenantIsolation  // Too late
);
```

### Issue: Email conflicts between organizations
**Solution**: Email uniqueness is now per-organization, not global
- Auth service needs update to allow same email across different orgs
- Login must include organizationId or email must be unique globally during transtion

### Issue: Rate limit header not appearing
**Solution**: Redis must be running
```bash
# Check Redis
redis-cli ping
# Should output: PONG
```

## 📈 Revenue Tracking

Get MRR (Monthly Recurring Revenue):

```javascript
const getMRR = async () => {
  const subscriptions = await Subscription.find({ 
    status: 'active',
    tier: { $ne: 'trial' }
  });
  
  const mrr = subscriptions.reduce((sum, sub) => {
    return sum + (sub.pricing.monthlyAmount || 0);
  }, 0);
  
  return { mrr, count: subscriptions.length };
};
```

Get Churn Rate:

```javascript
const getChurnRate = async () => {
  const lastMonth = new Date(Date.now() - 30*24*60*60*1000);
  const cancelled = await Subscription.count({
    status: 'cancelled',
    cancelledAt: { $gte: lastMonth }
  });
  
  const active = await Subscription.count({ status: 'active' });
  const churnRate = (cancelled / active) * 100;
  
  return { churnRate, cancelled, active };
};
```

---

## Next: Update Existing Services

After integration, prioritize updating all services to:
1. Accept `organizationId` as first parameter
2. Filter all queries by `{ organization: organizationId, ...otherFilters }`
3. Test data isolation thoroughly

See `/memories/session/saas-architecture-plan.md` for complete implementation details.
