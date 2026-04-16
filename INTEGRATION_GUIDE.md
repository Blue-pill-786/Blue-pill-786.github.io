# Advanced Features Integration Guide

## ✅ What Was Added

### Backend (`/backend/src`)
1. **utils/errors.js** - Custom error classes for type-safe error handling
2. **middleware/advanced.js** - Production-ready middleware (logging, validation, CORS, rate limit)
3. **utils/validationSchemas.js** - Pre-built Joi schemas for API validation
4. **utils/responseFormatter.js** - Standardized response formatting

### Frontend (`/frontend/src`)
1. **hooks/useAdvanced.js** - 7 powerful React hooks (fetch, form, mutation, pagination, etc.)
2. **utils/helpers.js** - 20+ utility functions (format, validate, date, etc.)
3. **components/ErrorBoundary.jsx** - React error catching component
4. **lib/apiService.js** - Advanced axios client with retry, token refresh, etc.

---

## 🔧 Backend Integration Steps

### Step 1: Install Dependencies
```bash
cd backend
npm install joi
```

### Step 2: Update server.js
Replace your existing middleware setup with:

```javascript
import express from 'express';
import cors from 'cors';
import { 
  formatResponse, 
  requestLogger, 
  requestIdMiddleware,
  securityHeaders, 
  advancedCors, 
  rateLimit,
  errorHandler 
} from './src/middleware/advanced.js';

const app = express();

// Security & Logging Middleware (in order)
app.use(securityHeaders);
app.use(advancedCors(['http://localhost:3000', 'http://localhost:5173']));
app.use(requestIdMiddleware);
app.use(requestLogger);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate Limiting (optional - enable as needed)
// app.use('/api/', rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 min

// Response Formatter
app.use(formatResponse);

// ==================== ROUTES ====================
import authRoutes from './src/routes/auth.js';
import tenantRoutes from './src/routes/tenant.js';

app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);

// ==================== ERROR HANDLING ====================
// Must be last middleware
app.use(errorHandler);

export default app;
```

### Step 3: Update Route Handlers with Validation
Example: Auth Route
```javascript
import { Router } from 'express';
import { validateRequest } from '../middleware/advanced.js';
import { authSchemas } from '../utils/validationSchemas.js';
import ResponseFormatter from '../utils/responseFormatter.js';
import { register, login } from '../controllers/authController.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validateRequest(authSchemas.register), async (req, res, next) => {
  try {
    const result = await register(req.validatedData);
    res.status(201).json(ResponseFormatter.created(result, 'User registered successfully'));
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validateRequest(authSchemas.login), async (req, res, next) => {
  try {
    const result = await login(req.validatedData);
    res.json(ResponseFormatter.success(result, 'Login successful'));
  } catch (err) {
    next(err);
  }
});

export default router;
```

### Step 4: Update Controllers to Use Error Classes
Example: authController.js
```javascript
import { User } from '../models/User.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import ResponseFormatter from '../utils/responseFormatter.js';

export const register = async (data) => {
  // Check if user exists
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  // Create user
  const user = await User.create(data);
  
  return { id: user._id, email: user.email, name: user.name };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user._id);
  return { user, token };
};
```

### Step 5: Create Custom Validation Schemas
Extend `validationSchemas.js` with your custom schemas:
```javascript
// In validationSchemas.js
export const propertySchemas = {
  create: Joi.object({
    name: Joi.string().required().min(3).max(100),
    address: Joi.string().required(),
    // ... more fields
  }),
};

// In route handler
router.post('/properties', validateRequest(propertySchemas.create), async (req, res, next) => {
  try {
    const result = await createProperty(req.validatedData);
    res.status(201).json(ResponseFormatter.created(result));
  } catch (err) {
    next(err);
  }
});
```

---

## 🎨 Frontend Integration Steps

### Step 1: ErrorBoundary is Already Integrated
✅ App.jsx now wraps everything with `<ErrorBoundary>`

### Step 2: Use Advanced Hooks in Components
Example: Tenant Dashboard with new hooks
```javascript
import { useFetch, useMutation } from '../hooks/useAdvanced';
import { formatCurrency, getRelativeTime } from '../utils/helpers';

function TenantDashboard() {
  // Fetch data with caching
  const { data, loading, error, refetch } = useFetch('/api/tenant/dashboard');

  // Mutation for complaint
  const { mutate: submitComplaint, loading: submitting } = 
    useMutation(async (complaint) => {
      return apiService.post('/api/tenant/complaints', complaint);
    });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Total Due: {formatCurrency(data.summary.totalDue)}</h2>
      <p>Last payment: {getRelativeTime(data.summary.lastPaymentDate)}</p>
      
      <button 
        onClick={() => submitComplaint({ title, description })}
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit Complaint'}
      </button>
    </div>
  );
}
```

### Step 3: Use useForm for Form Management
Example: Invoice Payment Form
```javascript
import { useForm } from '../hooks/useAdvanced';
import { isValidEmail, formatCurrency } from '../utils/helpers';

function PaymentForm({ onComplete }) {
  const validate = {
    email: (value) => (!value ? 'Email required' : !isValidEmail(value) ? 'Invalid email' : ''),
    amount: (value) => (!value || value <= 0 ? 'Valid amount required' : ''),
  };

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = 
    useForm(
      { email: '', amount: '' },
      async (values) => {
        const result = await apiService.post('/api/payments', values);
        onComplete(result);
      },
      validate
    );

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Email"
      />
      {touched.email && errors.email && <span>{errors.email}</span>}

      <input
        name="amount"
        value={values.amount}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Amount"
      />
      {touched.amount && errors.amount && <span>{errors.amount}</span>}

      <button type="submit">Pay {formatCurrency(values.amount)}</button>
    </form>
  );
}
```

### Step 4: Use Pagination
```javascript
import { usePagination } from '../hooks/useAdvanced';

function InvoicesList({ invoices }) {
  const { 
    currentPage, 
    totalPages, 
    currentItems, 
    goToPage, 
    goToNext, 
    goToPrev 
  } = usePagination(invoices, 10);

  return (
    <div>
      {currentItems.map(invoice => <InvoiceCard key={invoice._id} invoice={invoice} />)}
      
      <div>
        <button onClick={goToPrev} disabled={currentPage === 1}>Prev</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={goToNext} disabled={currentPage === totalPages}>Next</button>
      </div>
    </div>
  );
}
```

### Step 5: Local Storage Persistence
```javascript
import { useLocalStorage } from '../hooks/useAdvanced';

function UserPreferences() {
  const [theme, setTheme] = useLocalStorage('theme', 'dark');
  const [language, setLanguage] = useLocalStorage('language', 'en');

  return (
    <div>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        Switch Theme (Current: {theme})
      </button>
    </div>
  );
}
```

---

## 📊 Usage Examples

### Backend - Error Handling
```javascript
// Custom error throwing
if (!user) throw new NotFoundError('User', userId);
if (email already exists) throw new ConflictError('Email already registered');
if (invalid data) throw new ValidationError('Validation failed', errors);

// Automatic handling by errorHandler middleware
// Returns standardized error response with correct status code
```

### Frontend - API Calls with Retry
```javascript
// Automatic retry on 5xx errors
// Automatic token refresh on 401
// Automatic rate limit handling
const result = await apiService.post('/api/endpoint', data);
```

### Frontend - Async State
```javascript
import { useAsync } from '../hooks/useAdvanced';

function DataLoader() {
  const { execute, status, data, error } = useAsync(
    async () => apiService.get('/api/data'),
    true // execute immediately
  );

  if (status === 'pending') return <div>Loading...</div>;
  if (status === 'error') return <div>Error: {error.message}</div>;
  if (status === 'success') return <div>{JSON.stringify(data)}</div>;
}
```

---

## 🚀 Next Steps

1. **Install missing packages**: `npm install joi` in backend
2. **Update server.js** with middleware setup (Step 2 above)
3. **Update routes** to use validation and response formatter
4. **Update components** to use new hooks
5. **Test error handling** with Error Boundary
6. **Enable rate limiting** for production security

---

## 📋 File Reference

| File | Purpose | Status |
|------|---------|--------|
| backend/src/utils/errors.js | Custom error classes | ✅ Created |
| backend/src/middleware/advanced.js | Advanced middleware | ✅ Created |
| backend/src/utils/validationSchemas.js | Joi validation schemas | ✅ Created |
| backend/src/utils/responseFormatter.js | Response formatting | ✅ Created |
| frontend/src/hooks/useAdvanced.js | Custom React hooks | ✅ Created |
| frontend/src/utils/helpers.js | Utility functions | ✅ Created |
| frontend/src/components/ErrorBoundary.jsx | Error boundary | ✅ Created |
| frontend/src/lib/apiService.js | Advanced API client | ✅ Created |
| frontend/src/App.jsx | Updated with ErrorBoundary | ✅ Updated |

---

## ✨ Features Summary

### Backend Security
- ✅ CORS with whitelist
- ✅ Security headers (HSTS, CSP)
- ✅ Rate limiting
- ✅ Request ID tracking
- ✅ Input validation
- ✅ Error sanitization

### Backend Developer Experience
- ✅ Automatic logging
- ✅ Consistent error responses
- ✅ Pre-built validation schemas
- ✅ Type-safe error classes
- ✅ Performance metrics

### Frontend User Experience
- ✅ Error boundary for crash recovery
- ✅ Loading states
- ✅ Form validation
- ✅ Retry logic
- ✅ Pagination support
- ✅ Persistent storage

### Frontend Developer Experience
- ✅ 7 custom hooks
- ✅ 20+ utility functions
- ✅ Advanced API client
- ✅ Automatic error handling
- ✅ Token refresh mechanism
