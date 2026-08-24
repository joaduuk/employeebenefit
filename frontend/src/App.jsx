import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import RegisterChoice from './pages/RegisterChoice';
import RegisterEmployer from './pages/RegisterEmployer';
import RegisterMerchant from './pages/RegisterMerchant';
import RegisterEmployee from './pages/RegisterEmployee';
import About from './pages/About';
import Faq from './pages/Faq';
import AdminEmployerQueue from './pages/AdminEmployerQueue';
import AdminMerchantQueue from './pages/AdminMerchantQueue';
import AdminEmployeeQueue from './pages/AdminEmployeeQueue';
import EmployerEmployeeQueue from './pages/EmployerEmployeeQueue';
import MerchantCharge from './pages/MerchantCharge';
import EmployeePay from './pages/EmployeePay';
import Dashboard from './pages/Dashboard';

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      {/* Password-reset links land on this same route — Login reads
          the ?token= param and switches to the reset view itself. */}
      <Route path="/reset-password" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/register" element={<RegisterChoice />} />
      <Route path="/register/employer" element={<RegisterEmployer />} />
      <Route path="/register/merchant" element={<RegisterMerchant />} />
      <Route path="/register/employee" element={<RegisterEmployee />} />

      {/* Public — no login required. Currently only linked from the
          Login page; may move under a dedicated marketing site later. */}
      <Route path="/about" element={<About />} />
      <Route path="/faq" element={<Faq />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['platform_super_admin', 'platform_admin', 'employer', 'merchant', 'employee']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/employers"
        element={
          <ProtectedRoute allowedRoles={['platform_super_admin', 'platform_admin']}>
            <AdminEmployerQueue />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/merchants"
        element={
          <ProtectedRoute allowedRoles={['platform_super_admin', 'platform_admin']}>
            <AdminMerchantQueue />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute allowedRoles={['platform_super_admin', 'platform_admin']}>
            <AdminEmployeeQueue />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employer/employees"
        element={
          <ProtectedRoute allowedRoles={['employer']}>
            <EmployerEmployeeQueue />
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/charge"
        element={
          <ProtectedRoute allowedRoles={['merchant']}>
            <MerchantCharge />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/pay"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeePay />
          </ProtectedRoute>
        }
      />

      {/*
        Wildcard MUST stay last — React Router matches top-to-bottom and
        a "*" placed earlier silently swallows every route added below it.
        (This exact bug hit RoscaApp's /blog routes — keeping it last from day 1.)
      */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
