import { Link } from 'react-router-dom';

const CARD_STYLE = {
  display: 'block', textDecoration: 'none', background: 'var(--color-surface)',
  border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.5rem',
  transition: 'border-color 0.15s ease',
};

const options = [
  {
    to: '/register/employer',
    icon: '🏢',
    title: 'Employer',
    desc: 'Set up the essential benefit for your company and manage employee enrolment.',
  },
  {
    to: '/register/merchant',
    icon: '🏪',
    title: 'Merchant',
    desc: 'Accept EEB payments from employees at your store, once approved by our team.',
  },
  {
    to: '/register/employee',
    icon: '🙋',
    title: 'Employee',
    desc: 'Use your employer-sponsored benefit at approved stores. Requires your employer to already be on EEB.',
  },
];

export default function RegisterChoice() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '1.8rem', fontWeight: '400', fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>EEB</span>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>Which describes you?</p>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {options.map((opt) => (
            <Link
              key={opt.to}
              to={opt.to}
              style={CARD_STYLE}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <span style={{ fontSize: '1.75rem' }}>{opt.icon}</span>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>{opt.title}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{opt.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
