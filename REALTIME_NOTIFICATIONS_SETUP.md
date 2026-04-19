# ⚡ REAL-TIME NOTIFICATIONS SETUP GUIDE

**Status:** Phase 1 Implementation Complete  
**Date:** April 14, 2026  
**Feature:** WebSocket Real-Time Notifications with Socket.io

---

## 📦 INSTALLATION STEPS

### Step 1: Install Dependencies

Backend:
```bash
cd backend
npm install socket.io@latest dotenv
npm install --save-dev socket.io-client
```

Frontend:
```bash
cd frontend
npm install socket.io-client@latest
```

Update `backend/package.json` for Socket.io types:
```bash
npm install --save-dev @types/socket.io
```

---

### Step 2: Configure Server (backend/src/server.js)

Replace the existing server creation code with Socket.io integration:

```javascript
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io Authentication & Event Setup
const SocketService = require('./services/socketService');
const socketAuth = require('./middleware/socketAuth');

// Initialize Socket.io with authentication
io.use(socketAuth);
const socketService = new SocketService(io);

// Make socketService available across the app
app.locals.socketService = socketService;

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tenant', require('./routes/tenant'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
// ... other routes

// Error handler
app.use(require('./middleware/errorHandler'));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
});

module.exports = { app, server, io, socketService };
```

---

### Step 3: Create Environment Variables

Add to `backend/.env`:
```env
# Socket.io
SOCKET_PING_INTERVAL=25000
SOCKET_PING_TIMEOUT=60000

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

Add to `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=http://localhost:5000
```

---

### Step 4: Integrate Notification Routes

Add to `backend/src/server.js` (in routes section):
```javascript
app.use('/api/notifications', require('./routes/notifications'));
```

---

### Step 5: Create Models

✅ Already created:
- `backend/src/models/Notification.js`
- `backend/src/models/NotificationPreference.js`

---

### Step 6: Create Backend Services

✅ Already created:
- `backend/src/services/socketService.js`
- `backend/src/controllers/notificationController.js`
- `backend/src/middleware/socketAuth.js`

---

### Step 7: Integrate Socket Events in Controllers

Example - Update payment controller to emit events:

```javascript
// In backend/src/controllers/paymentController.js

const handlePaymentSuccess = async (req, res, next) => {
  try {
    const { invoiceId, amount, tenantId } = req.body;
    const organization = req.user.organization;

    // Save payment to DB
    const payment = await Payment.create({
      invoice: invoiceId,
      amount,
      status: 'completed',
      organization,
    });

    // Create notification record
    const notification = await Notification.create({
      recipient: tenantId,
      organization,
      type: 'payment:received',
      title: `Payment Received`,
      message: `Payment of ₹${amount} has been received`,
      severity: 'success',
      icon: '💰',
      relatedEntity: 'payment',
      relatedEntityId: payment._id,
      channels: {
        inApp: { sent: true, deliveredAt: new Date() },
      },
    });

    // ⭐ EMIT REAL-TIME NOTIFICATION
    const socketService = req.app.locals.socketService;
    socketService.notifyPaymentReceived(organization, invoiceId, tenantId, amount);

    return res.json(ResponseFormatter.success(payment));
  } catch (error) {
    next(error);
  }
};
```

---

### Step 8: Frontend Integration

#### Update `frontend/src/context/AuthContext.jsx`

Add socket connection on login:

```javascript
// In login handler...
const handleLogin = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    const { token, user } = response.data;

    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);
    setIsAuthenticated(true);

    // Connect Socket.io with token
    if (window.socketInstance) {
      window.socketInstance.disconnect();
    }

    const socket = io(import.meta.env.VITE_API_URL, {
      auth: {
        token,
        userId: user.id,
        organizationId: user.organization,
      },
    });

    window.socketInstance = socket;
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

#### Update `frontend/src/pages/LoginPage.jsx` or main Layout

Add NotificationBell to navbar:

```javascript
import NotificationBell from '../components/NotificationBell';

export const Layout = () => {
  return (
    <nav className="flex items-center justify-between">
      {/* ... other navbar items ... */}
      <NotificationBell />
    </nav>
  );
};
```

#### Add route to Notification Preferences Page

```javascript
// In frontend/src/App.jsx routes

import NotificationPreferencesPage from './pages/NotificationPreferencesPage';

{
  path: '/settings/notifications',
  element: <NotificationPreferencesPage />,
}
```

---

## ✅ TESTING THE FEATURE

### Test 1: Real-Time Notification on Payment

1. Login as tenant and admin in separate browsers
2. Tenant goes to `http://localhost:5173/payments`
3. Admin goes to `http://localhost:5173/admin/dashboard`
4. Tenant makes a payment
5. ✅ Admin should see real-time notification (no page refresh needed)
6. ✅ Badge count should update instantly
7. ✅ Sound should play (if enabled in preferences)

### Test 2: WebSocket Connection

Open browser console and run:
```javascript
// Check socket connection
console.log(window.socketInstance?.connected); // Should be true

// Listen to a test event
if (window.socketInstance) {
  window.socketInstance.on('payment:received', (data) => {
    console.log('💰 Payment received:', data);
  });
}
```

### Test 3: Notification Preferences

1. Go to `http://localhost:5173/settings/notifications`
2. Toggle notification channels
3. Set quiet hours
4. Verify preferences save (check API call in Network tab)
5. Refresh page and verify preferences persist

### Test 4: Connection Resilience

1. Open DevTools Network tab
2. Enable "Offline" mode
3. ✅ Should attempt reconnection (see logs)
4. Go back to "Online"
5. ✅ Should automatically reconnect

---

## 🎨 UI/UX FEATURES IMPLEMENTED

### NotificationBell Component
- ✨ Animated bell icon with pulsing unread badge
- 🔴 Red glow effect on unread notifications
- 📬 Dropdown with last 5 unread notifications
- 🔘 Connection indicator dot
- 📱 Mobile-responsive

### NotificationPreferencesPage
- 📢 Channel selection (Email, SMS, In-App, Sound)
- 🎯 Category-specific controls
- 🌙 Quiet hours configuration
- 🔇 Temporary mute (15/30/60/120 min)
- 💾 Save/Cancel buttons

---

## 📡 WEB SOCKET EVENTS

### Emit FROM Server TO Client

```javascript
// Payment events
'payment:received'      // ✅ Payment successful
'payment:failed'        // ❌ Payment failed
'payment:reminder'      // ⏰ Payment due soon
'payment:overdue'       // ⚠️ Payment overdue

// Complaint events
'complaint:created'     // 🔔 New complaint
'complaint:resolved'    // ✅ Complaint resolved

// Tenant events
'tenant:added'          // 👤 New tenant added
'tenant:movein'         // 🏠 Tenant moved in
'tenant:moveout'        // 👋 Tenant moved out

// Financial events
'occupancy:updated'     // 📊 Occupancy changed
'invoice:generated'     // 📄 New invoice
'system:alert'          // 🚨 System alert

// Maintenance
'maintenance:updated'   // 🔧 Work order updated

// Messages
'message:received'      // 💬 New message
'document:shared'       // 📄 Document shared
```

---

## 🔐 SECURITY FEATURES

✅ JWT token verification on socket connection  
✅ Organization isolation (users only see their org notifications)  
✅ User ID matching (prevent token hijacking)  
✅ SSL/TLS ready (wss:// support)  
✅ Rate limiting support  

---

## 📊 DATABASE SCHEMA

### Notification Model
```
- organization (required)
- recipient (required)
- sender (optional - null for system)
- type (enum: payment, complaint, tenant, etc.)
- title, message, icon
- severity (info, success, warning, error)
- relatedEntity, relatedEntityId
- isRead, readAt
- channels (inApp, email, sms, push)
- createdAt, updatedAt
```

### NotificationPreference Model
```
- user (unique)
- organization
- emailNotifications, smsNotifications, inAppNotifications
- quietHours { enabled, start, end, timezone }
- categories { payments, complaints, tenants, etc. }
- muteDuration
- keepHistoryDays
```

---

## 🚀 PRODUCTION CHECKLIST

- [ ] Enable SSL/TLS (wss:// protocol)
- [ ] Configure Redis for socket state (scale horizontally)
- [ ] Add rate limiting on socket events
- [ ] Setup socket.io-redis adapter
- [ ] Enable socket compression
- [ ] Add monitoring/logging for socket events
- [ ] Test under load (1000+ concurrent connections)
- [ ] Setup alerts for connection failures
- [ ] Document team Slack notifications

---

## 🔧 TROUBLESHOOTING

### Connection fails: "Authentication failed"
- Verify JWT token is being sent correctly
- Check socket auth middleware in server
- Ensure token is in localStorage before connection

### Notifications not appearing
- Check browser console for socket errors
- Verify socketService methods are called in controllers
- Ensure user is subscribed to correct room

### Socket reconnects too often
- Check network tab for websocket failures
- Increase `reconnectionDelay` if server is overloaded
- Verify server is handling connections properly

### High CPU usage
- Reduce ping frequency (pingInterval)
- Enable socket compression
- Check for infinite loops in event handlers

---

## 📈 NEXT PHASES

Phase 1: ✅ Real-Time Notifications (DONE)
Phase 2: Document Management
Phase 3: In-App Messaging
Phase 4: Advanced Search
Phase 5: Custom Reports

---

**Status:** Ready for implementation on all features  
**Estimated Timeline:** Complete Phase 1 by **April 18**  
**Team:** Full stack devs ready to deploy
