import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import API from '../services/api';

const SCANNER_ELEMENT_ID = 'eeb-qr-scanner';

function getLocation() {
  // Best-effort, silent — never blocks approval. Resolves {latitude,
  // longitude} or null if denied/unavailable/timed out.
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000 }
    );
  });
}

export default function EmployeePay() {
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { status, reason }
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  const findTransaction = async (rawCode) => {
    const useCode = (rawCode ?? code).trim().toUpperCase();
    setError(null);
    setResult(null);
    if (!useCode) {
      setError('Enter the code shown on the merchant\u2019s screen.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.get(`/employee/transactions/lookup/${useCode}`);
      setCode(useCode);
      setLookup(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No pending transaction found for that code.');
      setLookup(null);
    } finally {
      setLoading(false);
    }
  };

  const decide = async (action) => {
    setDeciding(true);
    try {
      let body = {};
      if (action === 'approve') {
        const loc = await getLocation();
        if (loc) body = loc;
      }
      const res = await API.post(`/employee/transactions/${code.trim().toUpperCase()}/${action}`, body);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setDeciding(false);
    }
  };

  const reset = () => {
    setCode('');
    setLookup(null);
    setResult(null);
    setError(null);
  };

  // --- QR scanning ---

  const startScan = () => {
    setError(null);
    setScanning(true);
  };

  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {}).finally(() => {
        scannerRef.current = null;
      });
    }
    setScanning(false);
  };

  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          // Found a code — stop scanning and look it up immediately.
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          setScanning(false);
          findTransaction(decodedText);
        },
        () => {} // per-frame scan failures are normal while aiming the camera — ignore
      )
      .catch(() => {
        setError('Could not access the camera. You can still type the code below.');
        setScanning(false);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(31,42,55,0.06)' }}>
        <h1 style={{ marginTop: 0, fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)' }}>
          Pay with Your Benefit
        </h1>

        {!lookup && !result && (
          <>
            {scanning ? (
              <>
                <div id={SCANNER_ELEMENT_ID} style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }} />
                <button
                  onClick={stopScan}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel Scan
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
                  Scan the QR code on the merchant's screen, or type the code shown.
                </p>
                <button
                  onClick={startScan}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem', marginBottom: '1rem' }}
                >
                  📷 Scan QR Code
                </button>
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0.75rem 0' }}>or</div>
                <input
                  type="text"
                  value={code}
                  onChange={(ev) => setCode(ev.target.value.toUpperCase())}
                  placeholder="e.g. 7K3QP"
                  maxLength={8}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1.4rem', textAlign: 'center', letterSpacing: '0.2em', fontFamily: 'monospace', border: '1px solid var(--color-border)', borderRadius: '8px', boxSizing: 'border-box', marginBottom: '1rem', textTransform: 'uppercase' }}
                />
                {error && (
                  <p style={{ color: 'var(--color-danger-text)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
                )}
                <button
                  disabled={loading}
                  onClick={() => findTransaction()}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}
                >
                  {loading ? 'Looking up…' : 'Find Transaction'}
                </button>
              </>
            )}
          </>
        )}

        {lookup && !result && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>{lookup.business_name}</p>
            <div style={{ fontSize: '2.25rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '1rem' }}>
              £{lookup.amount}
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
              📍 If prompted, allowing location access helps protect you — it gives us evidence to support you if this purchase is ever disputed. Entirely optional.
            </p>

            {error && (
              <p style={{ color: 'var(--color-danger-text)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                disabled={deciding}
                onClick={() => decide('decline')}
                style={{ flex: 1, padding: '0.75rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
              >
                Decline
              </button>
              <button
                disabled={deciding}
                onClick={() => decide('approve')}
                style={{ flex: 1, padding: '0.75rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
              >
                {deciding ? '…' : 'Approve'}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div style={{ textAlign: 'center' }}>
            {result.status === 'approved' && (
              <>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-success-text)', marginBottom: '0.5rem' }}>
                  Payment Approved
                </div>
                <p style={{ color: 'var(--color-text-secondary)' }}>Show the merchant your screen to confirm.</p>
              </>
            )}
            {result.status === 'declined' && (
              <>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-danger-text)', marginBottom: '0.5rem' }}>
                  {result.reason ? "Can't Approve This Purchase" : 'Payment Declined'}
                </div>
                {result.reason && (
                  <p style={{ color: 'var(--color-text-secondary)' }}>{result.reason}</p>
                )}
              </>
            )}
            <button
              onClick={reset}
              style={{ marginTop: '1.5rem', padding: '0.6rem 1.5rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
