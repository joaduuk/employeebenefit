import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

export default function VerifyEmail() {
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const hasRun = useRef(false);

  useEffect(() => {
    // React StrictMode double-invokes effects in development, which would
    // otherwise call this endpoint twice — the second call fails because
    // the token is already consumed, overwriting a real success with a
    // false "invalid or expired" error. This ref ensures only the first
    // call's result is ever used.
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    API.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.data?.message || 'Email verified successfully.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Verification failed — the link may have expired.');
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a3d6b 0%, #0f2544 100%)', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '400px', padding: '2.5rem 2rem', textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Verifying your email…</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Email Verified</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{message}</p>
            <Link to="/login" style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: '#1a3d6b', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Go to Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Verification Failed</h2>
            <p style={{ color: '#b91c1c', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{message}</p>
            <Link to="/login" style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: '#1a3d6b', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
