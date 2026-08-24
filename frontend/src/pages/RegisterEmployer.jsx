import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

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
  company_name: '', registration_number: '',
  payroll_frequency: 'monthly', payroll_day: '',
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function RegisterEmployer() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const isWeeklyType = form.payroll_frequency === 'weekly' || form.payroll_frequency === 'fortnightly';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.payroll_day === '') { setError('Please enter your payroll day'); return; }

    setLoading(true);
    try {
      await API.post('/register/employer', {
        ...form,
        payroll_day: Number(form.payroll_day),
      });
      setSuccess("Application submitted! Check your email to verify your address — a platform admin will review your company details shortly after.");
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: '12px', boxShadow: '0 20px 60px rgba(31,42,55,0.12)', border: '1px solid var(--color-border)', width: '100%', maxWidth: '460px', overflow: 'hidden' }}>
        <div style={{ background: 'var(--color-primary)', padding: '1.5rem', textAlign: 'center' }}>
          <span style={{ color: 'var(--color-on-primary)', fontSize: '1.4rem', fontWeight: '400', fontFamily: 'var(--font-heading)' }}>
            Register as an Employer
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
                <label style={labelStyle}>Work Email (used to sign in)</label>
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

              <p style={sectionTitleStyle}>Company details</p>
              <div style={fieldStyle}>
                <label style={labelStyle}>Company Name</label>
                <input type="text" required value={form.company_name} onChange={set('company_name')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Company Registration Number (optional)</label>
                <input type="text" value={form.registration_number} onChange={set('registration_number')} style={inputStyle} />
              </div>

              <p style={sectionTitleStyle}>Payroll schedule</p>
              <div style={fieldStyle}>
                <label style={labelStyle}>Payroll Frequency</label>
                <select value={form.payroll_frequency} onChange={set('payroll_frequency')} style={inputStyle}>
                  <option value="monthly">Monthly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>{isWeeklyType ? 'Payroll Day of Week' : 'Payroll Day of Month'}</label>
                {isWeeklyType ? (
                  <select value={form.payroll_day} onChange={set('payroll_day')} style={inputStyle}>
                    <option value="">Select a day</option>
                    {WEEKDAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}
                  </select>
                ) : (
                  <input type="number" min="1" max="31" required value={form.payroll_day} onChange={set('payroll_day')} style={inputStyle} placeholder="e.g. 25" />
                )}
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: loading ? 'var(--color-border-strong)' : 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>← Back</Link>
            {' · '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
