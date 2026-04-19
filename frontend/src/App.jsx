import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import NotificationContainer from "./components/common/NotificationContainer";
import ErrorBoundary from "./components/ErrorBoundary";

/* ================= PUBLIC PAGES ================= */
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/Register";
import TenantRegisterPage from "./pages/TenantRegisterPage";
import SaaSSignup from "./pages/SaaSSignup";
import PricingPage from "./pages/PricingPage";

/* ================= ADMIN PAGES ================= */
import AdminDashboard from "./pages/AdminDashboard";
import InvoiceManagement from "./pages/InvoiceManagement";
import BillingDashboard from "./pages/BillingDashboard";
import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import AddTenant from "./pages/AddTenant";
import AddProperty from "./pages/AddProperty";
import EditProperty from "./pages/EditProperty";
import EditTenant from "./pages/EditTenant";
import Tenants from "./pages/Tenants";

/* ================= TENANT PAGES ================= */
import TenantDashboard from "./pages/TenantDashboard";
import TenantProfilePage from "./pages/TenantProfilePage";
import PaymentPage from "./pages/PaymentPage";
import AlertsCenter from "./pages/AlertsCenter";

/* ================= SAAS PAGES ================= */
import AccountSettingsPage from "./pages/AccountSettingsPage";
import OrganizationSettingsPage from "./pages/OrganizationSettingsPage";
import PaymentMethodsPage from "./pages/PaymentMethodsPage";
import SubscriptionSettingsPage from "./pages/SubscriptionSettingsPage";

/* ================= SEARCH PAGES ================= */
import AdvancedSearch from "./pages/AdvancedSearch";

/* ================= REPORTS PAGES ================= */
import ReportList from "./pages/ReportList";
import ReportBuilder from "./pages/ReportBuilder";
import ReportView from "./pages/ReportView";

/* ================= ROLE CONSTANTS ================= */
const ADMIN_ROLES = ["admin", "owner", "manager", "staff"];
const PROPERTY_CREATOR_ROLES = ["admin", "owner", "manager"];
const TENANT_ROLE = ["tenant"];

/* ================= ROUTE WRAPPER WITH ERROR BOUNDARY ================= */
const RouteWithErrorBoundary = ({ children }) => (
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
);

/* ================= PROTECTED ROUTE ================= */
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <p>Loading app...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && (!user?.role || !roles.includes(user.role))) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/* ================= REDIRECT ================= */
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <p>Loading app...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const roleRedirect = {
    tenant: "/tenant",
    admin: "/admin",
    owner: "/admin",
    manager: "/admin",
    staff: "/admin",
  };

  return <Navigate to={roleRedirect[user.role] || "/login"} replace />;
};

/* ================= APP ================= */
const App = () => {
  return (
    <ErrorBoundary>
      <>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/admin" element={<SaaSSignup />} />
          <Route path="/register/tenant" element={<TenantRegisterPage />} />
          <Route path="/signup" element={<SaaSSignup />} />
          <Route path="/pricing" element={<PricingPage />} />

        {/* PROTECTED ROOT */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomeRedirect />} />

          {/* ADMIN */}
          <Route
            path="admin"
            element={
              <RouteWithErrorBoundary>
                <ProtectedRoute roles={ADMIN_ROLES}>
                  <AdminDashboard />
                </ProtectedRoute>
              </RouteWithErrorBoundary>
            }
          />

          <Route
            path="properties"
            element={
              <ProtectedRoute roles={ADMIN_ROLES}>
                <Properties />
              </ProtectedRoute>
            }
          />

          <Route
            path="property/:id"
            element={
              <ProtectedRoute roles={ADMIN_ROLES}>
                <PropertyDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="tenants"
            element={
              <ProtectedRoute roles={ADMIN_ROLES}>
                <Tenants />
              </ProtectedRoute>
            }
          />

          <Route
            path="invoices"
            element={
              <RouteWithErrorBoundary>
                <ProtectedRoute roles={ADMIN_ROLES}>
                  <InvoiceManagement />
                </ProtectedRoute>
              </RouteWithErrorBoundary>
            }
          />

          <Route
            path="add-property"
            element={
              <ProtectedRoute roles={PROPERTY_CREATOR_ROLES}>
                <AddProperty />
              </ProtectedRoute>
            }
          />

          <Route
            path="edit-property/:id"
            element={
              <ProtectedRoute roles={PROPERTY_CREATOR_ROLES}>
                <EditProperty />
              </ProtectedRoute>
            }
          />

          <Route
            path="add-tenant"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <AddTenant />
              </ProtectedRoute>
            }
          />

          <Route
            path="edit-tenant/:id"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <EditTenant />
              </ProtectedRoute>
            }
          />

          {/* TENANT */}
          <Route
            path="tenant"
            element={
              <ProtectedRoute roles={TENANT_ROLE}>
                <TenantDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="tenant/profile"
            element={
              <ProtectedRoute roles={TENANT_ROLE}>
                <TenantProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="payments"
            element={
              <RouteWithErrorBoundary>
                <ProtectedRoute roles={TENANT_ROLE}>
                  <PaymentPage />
                </ProtectedRoute>
              </RouteWithErrorBoundary>
            }
          />

          <Route
            path="alerts"
            element={
              <ProtectedRoute roles={TENANT_ROLE}>
                <AlertsCenter />
              </ProtectedRoute>
            }
          />

          {/* BILLING */}
          <Route
            path="org/:organizationId/billing"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <BillingDashboard />
              </ProtectedRoute>
            }
          />

          {/* SAAS SETTINGS */}
          <Route
            path="account/settings"
            element={
              <ProtectedRoute>
                <AccountSettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="organization/settings"
            element={
              <ProtectedRoute roles={["admin"]}>
                <OrganizationSettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="account/payment-methods"
            element={
              <ProtectedRoute>
                <PaymentMethodsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="subscription"
            element={
              <ProtectedRoute roles={["admin"]}>
                <SubscriptionSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* SEARCH */}
          <Route
            path="search"
            element={
              <ProtectedRoute>
                <AdvancedSearch />
              </ProtectedRoute>
            }
          />

          {/* REPORTS */}
          <Route
            path="reports"
            element={
              <ProtectedRoute roles={ADMIN_ROLES}>
                <ReportList />
              </ProtectedRoute>
            }
          />

          <Route
            path="reports/builder"
            element={
              <ProtectedRoute roles={ADMIN_ROLES}>
                <ReportBuilder />
              </ProtectedRoute>
            }
          />

          <Route
            path="reports/:reportId"
            element={
              <ProtectedRoute roles={ADMIN_ROLES}>
                <ReportView />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Route>
      </Routes>

      <NotificationContainer />
      </>
    </ErrorBoundary>
  );
};

export default App;
