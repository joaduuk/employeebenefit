import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const linkStyle = { color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: '600', fontSize: '0.88rem', padding: '0.4rem 0.7rem', borderRadius: '6px', whiteSpace: 'nowrap' };
const primaryBtnStyle = { padding: '0.4rem 0.9rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none', whiteSpace: 'nowrap' };

const ROLE_LINKS = {
  platform_super_admin: [
    { to: '/admin/employers', label: 'Employers' },
    { to: '/admin/merchants', label: 'Merchants' },
    { to: '/admin/employees', label: 'Employees' },
    { to: '/admin/merchant-settlements', label: 'Settlements' },
  ],
  platform_admin: [
    { to: '/admin/employers', label: 'Employers' },
    { to: '/admin/merchants', label: 'Merchants' },
    { to: '/admin/employees', label: 'Employees' },
    { to: '/admin/merchant-settlements', label: 'Settlements' },
  ],
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

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const roleLinks = user ? (ROLE_LINKS[user.role] || []) : [];

  // Logo always goes to the homepage now, regardless of login state. If
  // already on "/", a normal <Link> is a no-op in React Router — so this
  // forces a real reload in that case instead of navigating elsewhere.
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
        <a href="/" onClick={goHome} style={{ display: 'inline-block', cursor: 'pointer' }}>
        <Logo height={32} />
      </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
          {!user && (
            <>
              <Link to="/" style={linkStyle}>Home</Link>
              <Link to="/about" style={linkStyle}>About</Link>
              <Link to="/faq" style={linkStyle}>FAQ</Link>
            </>
          )}
          {user && roleLinks.map((l) => (
            <Link key={l.to} to={l.to} style={linkStyle}>{l.label}</Link>
          ))}
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
