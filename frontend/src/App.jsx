import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";

import AdminDashboard from "./pages/AdminDashboard";
import InvoiceManagement from "./pages/InvoiceManagement";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/Register";
import TenantDashboard from "./pages/TenantDashboard";

import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import AddTenant from "./pages/AddTenant";
import AddProperty from "./pages/AddProperty";
import EditProperty from "./pages/EditProperty";
import EditTenant from "./pages/EditTenant";
import Tenants from "./pages/Tenants";

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

  return (
    <Navigate
      to={user.role === "tenant" ? "/tenant" : "/admin"}
      replace
    />
  );
};

/* ================= APP ================= */

const App = () => (
  <Routes>
    {/* PUBLIC ROUTES */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

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
          <ProtectedRoute roles={["admin", "manager", "staff"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="properties"
        element={
          <ProtectedRoute roles={["admin", "manager", "staff"]}>
            <Properties />
          </ProtectedRoute>
        }
      />

      <Route
        path="property/:id"
        element={
          <ProtectedRoute roles={["admin", "manager", "staff"]}>
            <PropertyDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="tenants"
        element={
          <ProtectedRoute roles={["admin", "manager", "staff"]}>
            <Tenants />
          </ProtectedRoute>
        }
      />

      <Route
        path="invoices"
        element={
          <ProtectedRoute roles={["admin", "manager", "staff"]}>
            <InvoiceManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="add-property"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AddProperty />
          </ProtectedRoute>
        }
      />

      <Route
        path="edit-property/:id"
        element={
          <ProtectedRoute roles={["admin", "manager"]}>
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
          <ProtectedRoute roles={["tenant"]}>
            <TenantDashboard />
          </ProtectedRoute>
        }
      />
    </Route>
  </Routes>
);

export default App;