import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const linkStyle = { color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: '600', fontSize: '0.88rem', padding: '0.4rem 0.7rem', borderRadius: '6px', whiteSpace: 'nowrap' };
const primaryBtnStyle = { padding: '0.4rem 0.9rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none', whiteSpace: 'nowrap' };

const ADMIN_MENU_ITEMS = [
  { to: '/admin/employers', label: 'Employer Applications' },
  { to: '/admin/merchants', label: 'Merchant Applications' },
  { to: '/admin/employees', label: 'Employee Applications' },
  { to: '/admin/billing-cycles', label: 'Employer Settlements' },
  { to: '/admin/merchant-settlements', label: 'Merchant Settlements' },
  { to: '/admin/transactions', label: 'Transactions' },
  { to: '/admin/accounting', label: 'Accounting Summary' },
  { to: '/admin/audit-log', label: 'Audit Log' },
];

const ROLE_LINKS = {
  employer: [
    { to: '/employer/employees', label: 'My Employees' },
    { to: '/employer/billing-cycles', label: 'Billing Cycles' },
  ],
  merchant: [
    { to: '/merchant/charge', label: 'Take Payment' },
    { to: '/merchant/history', label: 'History' },
    { to: '/merchant/settlements', label: 'Settlements' },
  ],
  employee: [
    { to: '/employee/pay', label: 'Pay' },
    { to: '/employee/balance', label: 'Balance' },
    { to: '/employee/history', label: 'History' },
  ],
};

function AdminMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ ...linkStyle, background: open ? 'var(--color-surface-alt)' : 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
      >
        Admin {open ? '▴' : '▾'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '0.4rem', background: 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(31,42,55,0.12)',
          minWidth: '220px', zIndex: 200, overflow: 'hidden',
        }}>
          {ADMIN_MENU_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              style={{ display: 'block', padding: '0.6rem 1rem', color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isPlatformStaff = user?.role === 'platform_super_admin' || user?.role === 'platform_admin';
  const roleLinks = user ? (ROLE_LINKS[user.role] || []) : [];

  const goHome = (e) => {
    e.preventDefault();
    if (location.pathname === '/') {
      window.location.reload();
    } else {
      navigate('/');
    }
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <a href="/" onClick={goHome} style={{ display: 'inline-block', cursor: 'pointer', lineHeight: 0 }}>
          <Logo height={50} />
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
          {!user && (
            <>
              <Link to="/" style={linkStyle}>Home</Link>
              <Link to="/about" style={linkStyle}>About</Link>
              <Link to="/faq" style={linkStyle}>FAQ</Link>
            </>
          )}
          {user && (
            <>
              {/* Always-visible escape hatch back to the hub — the logo now
                  goes to the public homepage, not the dashboard, so this
                  is the one-click way back for a logged-in user on any page. */}
              <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
              {isPlatformStaff && <AdminMenu />}
              {roleLinks.map((l) => (
                <Link key={l.to} to={l.to} style={linkStyle}>{l.label}</Link>
              ))}
            </>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user ? (
            <>
              <Link to="/profile" style={linkStyle}>{user.fullName || 'My Profile'}</Link>
              <button onClick={logout} style={{ ...primaryBtnStyle, border: 'none' }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={linkStyle}>Sign In</Link>
              <Link to="/register" style={primaryBtnStyle}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
