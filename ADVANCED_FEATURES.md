# Advanced Features Documentation

## 🚀 Backend Advanced Features

### 1. **Custom Error Classes** (`backend/src/utils/errors.js`)
- `AppError`: Base error class with statusCode and details
- `BadRequestError`: 400 Bad Request
- `UnauthorizedError`: 401 Unauthorized
- `ForbiddenError`: 403 Forbidden
- `NotFoundError`: 404 Not Found
- `ConflictError`: 409 Conflict
- `ValidationError`: 422 Validation Failed
- `RateLimitError`: 429 Too Many Requests
- `InternalServerError`: 500 Server Error

**Usage:**
```javascript
import { NotFoundError, ValidationError } from './utils/errors.js';

throw new NotFoundError('User', userId);
throw new ValidationError('Invalid fields', errorArray);
```

### 2. **Advanced Middleware** (`backend/src/middleware/advanced.js`)

#### Request Validation
- `validateRequest(schema)`: Validates request body against Joi schema
- Returns consistent validation errors with field-level details

#### Response Formatter
- `formatResponse`: Standardizes all API responses
- Success: `{ success, statusCode, data, message, timestamp }`
- Error: `{ success, error, statusCode, timestamp }`

#### Request Logging
- `requestLogger`: Logs all requests with duration metrics
- Hides sensitive data (passwords)
- Includes user info and request details
- Performance metrics in milliseconds

#### Security Headers
- `securityHeaders`: Sets X-Content-Type-Options, X-Frame-Options, XSS Protection
- Strict-Transport-Security and CSP headers
- Request ID tracking for debugging

#### Rate Limiting
- `rateLimit(maxRequests, windowMs)`: In-memory rate limiting
- Prevents abuse with configurable limits per window
- Returns retry-after headers

#### CORS
- `advancedCors()`: Configurable CORS with credentials support
- Whitelist origins and methods
- Handles preflight requests

### 3. **Validation Schemas** (`backend/src/utils/validationSchemas.js`)
Pre-built Joi schemas for:
- Auth (register, login, reset password, update password)
- Tenant management
- Invoice management
- Payment processing
- Property management
- Pagination and filtering

### 4. **Response Formatter** (`backend/src/utils/responseFormatter.js`)
Static methods for consistent responses:
- `.success(data, message)`: 200 OK response
- `.created(data)`: 201 Created response
- `.paginated(items, page, limit, total)`: Paginated response
- `.error(message, statusCode, details)`: Error response
- `.validationError(errors)`: Validation error response
- `.rateLimited(retryAfter)`: Rate limit response

---

## 🎨 Frontend Advanced Features

### 1. **Custom Hooks** (`frontend/src/hooks/useAdvanced.js`)

#### useFetch
Advanced data fetching hook with caching and error handling
```javascript
const { data, loading, error, refetch } = useFetch('/api/data', {
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  skipCache: false
});
```

#### useForm
Complete form management with validation
```javascript
const { values, errors, touched, handleChange, handleBlur, handleSubmit } = 
  useForm(initialValues, onSubmit, validate);
```

#### useMutation
API mutations with loading and error states
```javascript
const { mutate, loading, error } = useMutation(async (data) => {
  return api.post('/endpoint', data);
});

await mutate(payload);
```

#### usePagination
Pagination for arrays
```javascript
const { currentPage, totalPages, currentItems, goToPage } = 
  usePagination(items, itemsPerPage);
```

#### useLocalStorage
Persistent state in localStorage
```javascript
const [value, setValue] = useLocalStorage('key', initialValue);
```

#### useDebounce
Debounce values for search, autocomplete
```javascript
const debouncedSearchTerm = useDebounce(searchTerm, 500);
```

#### useAsync
Execute async functions with state management
```javascript
const { execute, status, data, error } = useAsync(asyncFn, immediate);
```

### 2. **Helper Utilities** (`frontend/src/utils/helpers.js`)
- `formatCurrency()`: Format amounts with locale and currency
- `formatDate()`: Multiple date formats (short, medium, full, time)
- `getRelativeTime()`: "2 hours ago" style
- `isValidEmail()`, `isValidPhone()`: Validation functions
- `validatePasswordStrength()`: Password scoring system
- `getStatusColor()`: Status-based color schemes
- `truncateText()`: Truncate with ellipsis
- `deepClone()`, `deepMerge()`: Object utilities
- `formatFileSize()`: Convert bytes to readable format
- `daysUntil()`: Calculate days to date
- `debounce()`, `throttle()`: Function performance utilities

### 3. **Error Boundary** (`frontend/src/components/ErrorBoundary.jsx`)
React error boundary component that:
- Catches component errors gracefully
- Shows user-friendly error UI
- Displays stack trace in development mode
- Tracks error count for escalation
- Provides recovery options

### 4. **Advanced API Service** (`frontend/src/lib/apiService.js`)
Enhanced axios-based API client with:
- **Request Interceptors**: Auto-attach auth token, generate request IDs
- **Response Interceptors**: Handle errors consistently
- **Token Refresh**: Automatic JWT refresh on 401
- **Retry Logic**: Exponential backoff for 5xx errors
- **Rate Limit Handling**: Respects 429 responses
- **File Upload**: Progress tracking support
- **Batch Requests**: Promise.all wrapper

---

## 📊 Integration Guide

### Backend Setup
1. Install dependencies: `npm install joi`
2. Update server.js to use new middleware:
```javascript
import { formatResponse, requestLogger, errorHandler, securityHeaders, advancedCors } from './middleware/advanced.js';

app.use(securityHeaders);
app.use(advancedCors(['http://localhost:3000']));
app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(express.json());
app.use(formatResponse);

// Routes here...

app.use(errorHandler);
```

3. Use validation in routes:
```javascript
import { validateRequest } from './middleware/advanced.js';
import { authSchemas } from './utils/validationSchemas.js';

router.post('/register', validateRequest(authSchemas.register), registerController);
```

4. Use response formatter:
```javascript
import ResponseFormatter from './utils/responseFormatter.js';

res.status(200).json(ResponseFormatter.success(data, 'Success message'));
```

### Frontend Setup
1. Update main.jsx to wrap with ErrorBoundary (done in App.jsx)
2. Use advanced hooks in components:
```javascript
import { useFetch, useForm, useMutation } from '../hooks/useAdvanced';
import { formatCurrency, isValidEmail } from '../utils/helpers';

function MyComponent() {
  const { data, loading } = useFetch('/api/endpoint');
  const { mutate, loading: submitting } = useMutation(submitForm);
  const { values, errors, handleChange, handleSubmit } = 
    useForm(initial, onSubmit, validate);
  
  return (/* JSX */);
}
```

3. Use advanced API service:
```javascript
import apiService from '../lib/apiService';

const response = await apiService.get('/endpoint');
const result = await apiService.post('/endpoint', data);
await apiService.uploadFile('/upload', file, onProgress);
```

---

## 🔒 Security Features

✅ Security headers (HSTS, CSP, X-Frame-Options)
✅ CORS with origin whitelist
✅ Rate limiting per IP/endpoint
✅ JWT token refresh mechanism
✅ Password strength validation
✅ Input validation with Joi schemas
✅ Error sanitization (no stack traces in production)
✅ Request ID tracking for audit logs

---

## ⚡ Performance Features

✅ API response caching in useFetch
✅ Debounced search/autocomplete
✅ Request retry with exponential backoff
✅ Pagination support
✅ Error boundaries for component isolation
✅ localStorage persistence
✅ File upload with progress tracking

---

## 📝 Error Handling Strategy

### Backend
1. Use custom error classes for consistency
2. Middleware catches all errors
3. ResponseFormatter standardizes error output
4. Sensitive data stripped from responses
5. Request IDs enable tracing

### Frontend
1. ErrorBoundary catches React errors
2. useNotification shows user-friendly messages
3. useMutation and useFetch handle API errors
4. Retry logic improves reliability
5. Stack traces in development only

---

## 🎯 Best Practices

### Backend
- Always use ResponseFormatter for responses
- Throw custom error classes with details
- Use validation schemas for input validation
- Log important operations with request IDs
- Set appropriate status codes

### Frontend
- Wrap async operations in try-catch
- Use custom hooks for repeated logic
- Provide loading and error states
- Validate forms client-side before submission
- Use ErrorBoundary at high-level components
