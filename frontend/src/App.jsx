import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
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

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['platform_super_admin', 'platform_admin', 'employer', 'merchant', 'employee']}>
            <Dashboard />
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
