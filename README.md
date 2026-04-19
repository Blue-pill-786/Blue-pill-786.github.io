# PG Management Web Application

A full-stack PG (Paying Guest) management platform with admin console + tenant dashboard.

## Highlights
- JWT authentication with role-based access (`admin`, `manager`, `staff`, `tenant`)
- Multi-property management with floors, rooms, and bed-level occupancy
- Tenant onboarding + complaint tracking
- Monthly rent invoice generation and overdue late fee automation
- Online/offline payment recording + webhook endpoint for payment gateway integration
- Monthly income vs expense reporting
- React + Tailwind dashboards for admin and tenants

## Project Structure
- `backend/` – Node.js, Express, MongoDB APIs + cron automation
- `frontend/` – React + Tailwind responsive dashboard UI

## Quick Start
```bash
npm install
npm run dev:backend
npm run dev:frontend
```

Backend runs at `http://localhost:4000`, frontend at `http://localhost:5173`.

## Backend Environment Variables
Create `backend/.env`:
```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/pg_management
JWT_SECRET=replace_with_secure_secret
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:5173
NOTIFICATION_PROVIDER=console
STRIPE_SECRET_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
REDIS_URL=
EMAIL_FROM=noreply@pgmanager.app
```

## Important API Endpoints
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/otp/request`, `/api/auth/otp/verify`
- Admin: `/api/admin/dashboard`, `/api/admin/properties`, `/api/admin/tenants`, `/api/admin/rent/generate`
- Tenant: `/api/tenant/dashboard`, `/api/tenant/invoices`, `/api/tenant/complaints`
- Payments: `/api/payments/pay`, `/api/payments/webhook/:provider`

## Automation
Cron jobs configured in `backend/src/jobs/cron.js`:
- Generate monthly rent invoices on the 1st
- Apply late fees daily
- Send reminders 2 days before due date
