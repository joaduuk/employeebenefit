import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import LegalDocumentModal from '../components/LegalDocumentModal';

const inputStyle = { width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box', fontFamily: 'var(--font-body)', color: 'var(--color-text)' };
const labelStyle = { display: 'block', marginBottom: '0.4rem', color: 'var(--color-text-secondary)', fontWeight: '600', fontSize: '0.875rem' };
const fieldStyle = { marginBottom: '1rem' };
const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1.5rem 0 0.75rem' };

const ErrorBanner = ({ msg }) => msg ? (
  <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid var(--color-danger-border)' }}>{msg}</div>
) : null;

const SuccessBanner = ({ msg }) => msg ? (
  <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid var(--color-success-border)' }}>{msg}</div>
) : null;

const EMPTY_FORM = {
  full_name: '', email: '', phone: '', password: '',
  business_name: '', owner_name: '', business_address: '',
  category: 'other', registration_number: '',
  payout_account_name: '', payout_account_number: '', payout_sort_code: '',
  agreed_to_terms: false,
};

const CATEGORIES = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'convenience_store', label: 'Convenience Store' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'baby_supplies', label: 'Baby Supplies' },
  { value: 'other', label: 'Other' },
];

export default function RegisterMerchant() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [openDoc, setOpenDoc] = useState(null); // null | 'terms' | 'privacy'
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!form.agreed_to_terms) { setError('You must agree to the Merchant Agreement and Privacy Policy to register'); return; }

    setLoading(true);
    try {
      await API.post('/register/merchant', form);
      setSuccess("Application submitted! Check your email to verify your address — our team will review your business details before you can start accepting payments.");
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: '12px', boxShadow: '0 20px 60px rgba(31,42,55,0.12)', border: '1px solid var(--color-border)', width: '100%', maxWidth: '460px', overflow: 'hidden' }}>
        <div style={{ background: 'var(--color-primary)', padding: '1.5rem', textAlign: 'center' }}>
          <span style={{ color: 'var(--color-on-primary)', fontSize: '1.4rem', fontWeight: '400', fontFamily: 'var(--font-heading)' }}>
            Register as a Merchant
          </span>
        </div>

        <div style={{ padding: '2rem', maxHeight: '75vh', overflowY: 'auto' }}>
          <ErrorBanner msg={error} />
          <SuccessBanner msg={success} />

          {!success && (
            <form onSubmit={handleSubmit}>
              <p style={sectionTitleStyle}>Your account</p>
              <div style={fieldStyle}>
                <label style={labelStyle}>Your Full Name</label>
                <input type="text" required value={form.full_name} onChange={set('full_name')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Email (used to sign in)</label>
                <input type="email" required value={form.email} onChange={set('email')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={form.phone} onChange={set('phone')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Password</label>
                <input type="password" required value={form.password} onChange={set('password')} style={inputStyle} placeholder="Min. 8 characters" />
              </div>

              <p style={sectionTitleStyle}>Business details</p>
              <div style={fieldStyle}>
                <label style={labelStyle}>Business / Trading Name</label>
                <input type="text" required value={form.business_name} onChange={set('business_name')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Owner / Director Name</label>
                <input type="text" value={form.owner_name} onChange={set('owner_name')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Business Address</label>
                <input type="text" value={form.business_address} onChange={set('business_address')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Business Type</label>
                <select value={form.category} onChange={set('category')} style={inputStyle}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Company Registration Number (optional)</label>
                <input type="text" value={form.registration_number} onChange={set('registration_number')} style={inputStyle} />
              </div>

              <p style={sectionTitleStyle}>Payout details (optional for now)</p>
              <div style={fieldStyle}>
                <label style={labelStyle}>Account Name</label>
                <input type="text" value={form.payout_account_name} onChange={set('payout_account_name')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Account Number</label>
                <input type="text" value={form.payout_account_number} onChange={set('payout_account_number')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Sort Code</label>
                <input type="text" value={form.payout_sort_code} onChange={set('payout_sort_code')} style={inputStyle} placeholder="00-00-00" />
              </div>

              <div style={{ ...fieldStyle, display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginTop: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="agree"
                  checked={form.agreed_to_terms}
                  onChange={(e) => setForm((f) => ({ ...f, agreed_to_terms: e.target.checked }))}
                  style={{ width: '18px', height: '18px', marginTop: '0.15rem', cursor: 'pointer', flexShrink: 0 }}
                />
                <label htmlFor="agree" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                  I agree to the{' '}
                  <button type="button" onClick={() => setOpenDoc('terms')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}>Merchant Agreement</button>
                  {' '}and{' '}
                  <button type="button" onClick={() => setOpenDoc('privacy')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}>Privacy Policy</button>
                </label>
              </div>

              {openDoc === 'terms' && (
                <LegalDocumentModal url="/legal/merchant-agreement" title="Merchant Agreement" onClose={() => setOpenDoc(null)} />
              )}
              {openDoc === 'privacy' && (
                <LegalDocumentModal url="/legal/privacy" title="Privacy Policy" onClose={() => setOpenDoc(null)} />
              )}

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: loading ? 'var(--color-border-strong)' : 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            <Link to="/" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>← Back</Link>
            {' · '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
