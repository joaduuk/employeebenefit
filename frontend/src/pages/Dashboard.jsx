import { useAuth } from '../context/AuthContext';

// Day 1 placeholder: one component that renders different content per
// module based on role (Platform has two tiers: super admin and admin).
// Split these into separate pages/routes once each module has real content.
export default function Dashboard() {
  const { user, logout } = useAuth();

  const moduleLabel = {
    platform_super_admin: 'Platform (Super Admin)',
    platform_admin: 'Platform (Admin)',
    employer: 'Employer',
    merchant: 'Merchant',
    employee: 'Employee',
  }[user?.role] || 'Unknown';

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '2rem', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <h1 style={{ marginTop: 0 }}>Welcome, {user?.fullName || user?.email}</h1>
        <p style={{ color: '#64748b' }}>
          Module: <strong>{moduleLabel}</strong>
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          This is a day-1 placeholder. Payment methods, settlements, enrolments,
          and billing-cutoff logic get built out module by module from here.
        </p>
        <button onClick={logout} style={{ padding: '0.5rem 1.25rem', background: '#1a3d6b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
          Logout
        </button>
      </div>
    </div>
  );
}
