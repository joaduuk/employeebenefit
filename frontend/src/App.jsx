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
import EmployerBillingCycles from './pages/EmployerBillingCycles';
import MerchantCharge from './pages/MerchantCharge';
import MerchantHistory from './pages/MerchantHistory';
import MerchantSettlements from './pages/MerchantSettlements';
import AdminMerchantSettlements from './pages/AdminMerchantSettlements';
import EmployeePay from './pages/EmployeePay';
import EmployeeBalance from './pages/EmployeeBalance';
import EmployeeHistory from './pages/EmployeeHistory';
import Profile from './pages/Profile';
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

      {/* Public — no login required. */}
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
        path="/employer/billing-cycles"
        element={
          <ProtectedRoute allowedRoles={['employer']}>
            <EmployerBillingCycles />
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
        path="/merchant/history"
        element={
          <ProtectedRoute allowedRoles={['merchant']}>
            <MerchantHistory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/settlements"
        element={
          <ProtectedRoute allowedRoles={['merchant']}>
            <MerchantSettlements />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/merchant-settlements"
        element={
          <ProtectedRoute allowedRoles={['platform_super_admin', 'platform_admin']}>
            <AdminMerchantSettlements />
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

      <Route
        path="/employee/balance"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeBalance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/history"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeHistory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['platform_super_admin', 'platform_admin', 'employer', 'merchant', 'employee']}>
            <Profile />
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
