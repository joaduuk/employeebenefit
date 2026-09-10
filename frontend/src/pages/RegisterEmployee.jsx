import { useEffect, useRef, useState } from 'react';
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
  work_email: '', employee_number: '', department: '', job_title: '',
  agreed_to_terms: false,
};

const DEBOUNCE_MS = 350;

export default function RegisterEmployee() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [openDoc, setOpenDoc] = useState(null); // null | 'terms' | 'privacy'
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // --- Employer picker ---
  const [employerQuery, setEmployerQuery] = useState('');
  const [employerResults, setEmployerResults] = useState([]);
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (selectedEmployer || employerQuery.trim().length < 2) {
      setEmployerResults([]);
      return;
    }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await API.get('/register/employers/lookup', { params: { q: employerQuery.trim() } });
        setEmployerResults(res.data);
      } catch (err) {
        setEmployerResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [employerQuery, selectedEmployer]);

  const pickEmployer = (employer) => {
    setSelectedEmployer(employer);
    setEmployerQuery(employer.company_name);
    setEmployerResults([]);
  };

  const clearEmployer = () => {
    setSelectedEmployer(null);
    setEmployerQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!selectedEmployer) { setError('Please select your employer from the list'); return; }
    if (!form.agreed_to_terms) { setError('You must agree to the Employee Terms and Privacy Policy to register'); return; }

    setLoading(true);
    try {
      await API.post('/register/employee', {
        ...form,
        employer_id: selectedEmployer.id,
      });
      setSuccess("Application submitted! Check your email to verify your address — your employer will review your details shortly after.");
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: '12px', boxShadow: '0 20px 60px rgba(31,42,55,0.12)', border: '1px solid var(--color-border)', width: '100%', maxWidth: '460px', overflow: 'hidden' }}>
        <div style={{ background: 'var(--color-primary)', padding: '1.5rem', textAlign: 'center' }}>
          <span style={{ color: 'var(--color-on-primary)', fontSize: '1.4rem', fontWeight: '400', fontFamily: 'var(--font-heading)' }}>
            Register as an Employee
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
                <label style={labelStyle}>Login Email</label>
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

              <p style={sectionTitleStyle}>Your employer</p>
              <div style={{ ...fieldStyle, position: 'relative' }}>
                <label style={labelStyle}>Company Name</label>
                <input
                  type="text"
                  required
                  value={employerQuery}
                  onChange={(e) => { setEmployerQuery(e.target.value); setSelectedEmployer(null); }}
                  placeholder="Start typing your employer's name…"
                  style={inputStyle}
                  autoComplete="off"
                />
                {selectedEmployer && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-success-text)', marginTop: '0.35rem' }}>
                    ✓ {selectedEmployer.company_name}{' '}
                    <button type="button" onClick={clearEmployer} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8rem', padding: 0 }}>
                      change
                    </button>
                  </p>
                )}
                {!selectedEmployer && employerQuery.trim().length >= 2 && (
                  <div style={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', marginTop: '0.25rem', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(31,42,55,0.1)' }}>
                    {searching && (
                      <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Searching…</div>
                    )}
                    {!searching && employerResults.length === 0 && (
                      <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No approved employers found.</div>
                    )}
                    {!searching && employerResults.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => pickEmployer(emp)}
                        style={{ padding: '0.6rem 0.75rem', fontSize: '0.9rem', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {emp.company_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p style={sectionTitleStyle}>Work details</p>
              <div style={fieldStyle}>
                <label style={labelStyle}>Work Email</label>
                <input type="email" required value={form.work_email} onChange={set('work_email')} style={inputStyle} placeholder="Used by your employer to verify you" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Employee Number (optional)</label>
                <input type="text" value={form.employee_number} onChange={set('employee_number')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Department (optional)</label>
                <input type="text" value={form.department} onChange={set('department')} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Job Title (optional)</label>
                <input type="text" value={form.job_title} onChange={set('job_title')} style={inputStyle} />
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
                  <button type="button" onClick={() => setOpenDoc('terms')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}>Employee Terms</button>
                  {' '}and{' '}
                  <button type="button" onClick={() => setOpenDoc('privacy')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}>Privacy Policy</button>
                </label>
              </div>

              {openDoc === 'terms' && (
                <LegalDocumentModal url="/legal/employee-terms" title="Employee Terms" onClose={() => setOpenDoc(null)} />
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
