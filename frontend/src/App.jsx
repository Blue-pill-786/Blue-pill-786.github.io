import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import TenantDashboard from './pages/TenantDashboard';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'tenant' ? '/tenant' : '/admin'} replace />;
};

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<Layout />}>
      <Route
        index
        element={<HomeRedirect />}
      />
      <Route
        path="admin"
        element={
          <ProtectedRoute roles={['admin', 'manager', 'staff']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="tenant"
        element={
          <ProtectedRoute roles={['tenant']}>
            <TenantDashboard />
          </ProtectedRoute>
        }
      />
    </Route>
  </Routes>
);

export default App;
