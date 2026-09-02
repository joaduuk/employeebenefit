import { Link } from 'react-router-dom';
import { useState } from 'react';

const colTitle = { fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' };
const linkStyle = { display: 'block', color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem' };

export default function Footer() {
  const [showFounderNote, setShowFounderNote] = useState(false);

  return (
    <footer style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', marginTop: '3rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--color-primary)', marginBottom: '0.75rem' }}>EEB</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Employee Essential Benefit — access to essentials, before payday.</p>
        </div>

        <div>
          <div style={colTitle}>Company</div>
          <Link to="/about" style={linkStyle}>About EEB</Link>
          <Link to="/faq" style={linkStyle}>FAQ</Link>
          <Link to="/contact" style={linkStyle}>Contact</Link>
        </div>

        <div>
          <div style={colTitle}>For Business</div>
          <Link to="/register/employer" style={linkStyle}>Employers</Link>
          <Link to="/register/merchant" style={linkStyle}>Merchants</Link>
          <Link to="/register/employee" style={linkStyle}>Employees</Link>
        </div>

        <div>
          <div style={colTitle}>Legal</div>
          <Link to="/legal/privacy" style={linkStyle}>Privacy Policy</Link>
          <Link to="/legal/terms" style={linkStyle}>Terms of Use</Link>
          <Link to="/legal/cookies" style={linkStyle}>Cookie Policy</Link>
          <Link to="/legal/complaints" style={linkStyle}>Complaints</Link>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              © {new Date().getFullYear()} EEB. All rights reserved.
            </span>
            <button
              onClick={() => setShowFounderNote((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: '600', fontSize: '0.78rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              Founder's Note {showFounderNote ? '▴' : '▾'}
            </button>
          </div>

          {showFounderNote && (
            <div style={{ maxWidth: '600px', textAlign: 'center', padding: '1rem 0 0.25rem' }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: '400', color: 'var(--color-text)', lineHeight: '1.6', fontStyle: 'italic', margin: '0 0 0.5rem' }}>
                "I built EEB because fintech keeps innovating for people who already have options — and leaves behind everyone else: employees who need essentials before payday, and small corner shops who never get offered the same payment technology as the big chains. EEB is for both of them."
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600', marginBottom: '0.5rem' }}>
                — John Adu, Founder of EEB
              </p>
              <Link to="/founder" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>
                Read the full story
              </Link>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
