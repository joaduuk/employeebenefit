import { useState } from 'react';
import API from '../services/api';

const wrap = { minHeight: '60vh', background: 'var(--color-bg)', padding: '2rem 1rem', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const card = { maxWidth: '480px', width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2.5rem' };
const inputStyle = { width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box', fontFamily: 'var(--font-body)', color: 'var(--color-text)' };
const labelStyle = { display: 'block', marginBottom: '0.4rem', color: 'var(--color-text-secondary)', fontWeight: '600', fontSize: '0.875rem' };
const fieldStyle = { marginBottom: '1rem' };

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', category: 'general', transaction_reference: '', message: '', honeypot: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await API.post('/contact', form);
      setSuccess("Thanks — we'll be in touch.");
      setForm({ name: '', email: '', category: 'general', transaction_reference: '', message: '', honeypot: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{ marginTop: 0, fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)' }}>Contact Us</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Have a question or something to report? Send us a message and we'll get back to you.
        </p>

        {error && (
          <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>
        )}
        {success && (
          <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Your Name</label>
              <input type="text" required value={form.name} onChange={set('name')} style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Your Email</label>
              <input type="email" required value={form.email} onChange={set('email')} style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>What's this about?</label>
              <select value={form.category} onChange={set('category')} style={inputStyle}>
                <option value="general">General Inquiry</option>
                <option value="dispute">Dispute a Transaction</option>
                <option value="technical">Technical Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
            {form.category === 'dispute' && (
              <div style={fieldStyle}>
                <label style={labelStyle}>Transaction reference or code (if you have it)</label>
                <input type="text" value={form.transaction_reference} onChange={set('transaction_reference')} style={inputStyle} placeholder="e.g. the 5-character code, or approximate date and amount" />
              </div>
            )}
            <div style={fieldStyle}>
              <label style={labelStyle}>Message</label>
              <textarea required rows={5} value={form.message} onChange={set('message')} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} placeholder={form.category === 'dispute' ? "Tell us what happened — which purchase, and why you're disputing it." : ''} />
            </div>

            {/* Honeypot — hidden from real users via off-screen positioning
                and aria-hidden, but a bot filling every field on the page
                will fill this one too. Never remove the name "honeypot"
                without also updating the backend schema/check. */}
            <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
              <label htmlFor="website">Leave this field blank</label>
              <input
                type="text"
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.honeypot}
                onChange={set('honeypot')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: loading ? 'var(--color-border-strong)' : 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
