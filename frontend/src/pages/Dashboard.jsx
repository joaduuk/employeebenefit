import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Day 1 placeholder: one component that renders different content per
// module based on role (Platform has two tiers: super admin and admin).
// Split these into separate pages/routes once each module has real content.
export default function Dashboard() {
  const { user, logout, isPlatformStaff } = useAuth();

  const moduleLabel = {
    platform_super_admin: 'Platform (Super Admin)',
    platform_admin: 'Platform (Admin)',
    employer: 'Employer',
    merchant: 'Merchant',
    employee: 'Employee',
  }[user?.role] || 'Unknown';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(31,42,55,0.06)' }}>
        <h1 style={{ marginTop: 0, fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)' }}>Welcome, {user?.fullName || user?.email}</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Module: <strong style={{ color: 'var(--color-text)' }}>{moduleLabel}</strong>
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          This is a day-1 placeholder. Payment methods, settlements, enrolments,
          and billing-cutoff logic get built out module by module from here.
        </p>

        {isPlatformStaff && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Link to="/admin/employers" style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Review Employer Applications
            </Link>
            <Link to="/admin/merchants" style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Review Merchant Applications
            </Link>
            <Link to="/admin/employees" style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Review Employee Applications
            </Link>
          </div>
        )}

        {user?.role === 'employer' && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Link to="/employer/employees" style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Review My Employees
            </Link>
          </div>
        )}

        {user?.role === 'merchant' && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Link to="/merchant/charge" style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Take a Payment
            </Link>
          </div>
        )}

        {user?.role === 'employee' && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Link to="/employee/pay" style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Pay with My Benefit
            </Link>
          </div>
        )}

        <div>
          <button onClick={logout} style={{ padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
