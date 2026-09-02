import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import API from '../services/api';

const API_ORIGIN = new URL(API.defaults.baseURL).origin;
const fullPhotoUrl = (path) => (path ? `${API_ORIGIN}${path}` : null);

const POLL_INTERVAL_MS = 3000;

const PURCHASE_TAGS = [
  { value: 'food_drinks', label: '🍽️ Food & Drinks' },
  { value: 'daily_essentials', label: '🧴 Daily Essentials' },
  { value: 'mixed', label: '🛒 Mixed (incl. Alcohol/Tobacco)' },
];

export default function MerchantCharge() {
  const [amount, setAmount] = useState('');
  const [purchaseTag, setPurchaseTag] = useState(null);
  const [txn, setTxn] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const startPolling = (transactionId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await API.get(`/merchant/transactions/${transactionId}`);
        setTxn(res.data);
        if (res.data.status !== 'pending') {
          stopPolling();
        }
      } catch (err) {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  };

  const createTransaction = async () => {
    setError(null);
    const value = Number(amount);
    if (!value || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setCreating(true);
    try {
      const res = await API.post('/merchant/transactions', {
        amount: value,
        method: 'manual_code',
        purchase_tag: purchaseTag,
      });
      setTxn(res.data);
      startPolling(res.data.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create transaction');
    } finally {
      setCreating(false);
    }
  };

  const reset = () => {
    stopPolling();
    setTxn(null);
    setAmount('');
    setPurchaseTag(null);
    setError(null);
  };

  // --- Resolved states get a big, unmistakable full screen instead of a status pill ---

  if (txn && txn.status === 'approved') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-body)' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>✅</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-success-text)', marginBottom: '0.5rem' }}>
            Payment Approved
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-success-text)', marginBottom: '1.5rem' }}>
            £{txn.amount}
          </div>
          {txn.employee_photo_url && (
            <div style={{ marginBottom: '1.5rem' }}>
              <img
                src={fullPhotoUrl(txn.employee_photo_url)}
                alt="Employee"
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-success-text)' }}
              />
              <p style={{ color: 'var(--color-success-text)', fontSize: '0.85rem', fontWeight: '600', marginTop: '0.5rem' }}>
                {txn.employee_full_name} — check this matches the person in front of you
              </p>
            </div>
          )}
          <p style={{ color: 'var(--color-success-text)', fontSize: '1.1rem', fontWeight: '600', marginBottom: '2rem' }}>
            You're clear to release the goods.
          </p>
          <button
            onClick={reset}
            style={{ padding: '0.75rem 2rem', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}
          >
            New Transaction
          </button>
        </div>
      </div>
    );
  }

  if (txn && (txn.status === 'declined' || txn.status === 'expired')) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-body)' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>❌</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-danger-text)', marginBottom: '0.5rem' }}>
            {txn.status === 'expired' ? 'Code Expired' : 'Payment Not Approved'}
          </div>
          <p style={{ color: 'var(--color-danger-text)', fontSize: '1.1rem', fontWeight: '600', marginBottom: '2rem' }}>
            Do not release the goods for this transaction.
          </p>
          <button
            onClick={reset}
            style={{ padding: '0.75rem 2rem', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}
          >
            New Transaction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(31,42,55,0.06)' }}>
        <h1 style={{ marginTop: 0, fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)' }}>
          Take a Payment
        </h1>

        {!txn && (
          <>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Enter the purchase amount. The employee can scan the QR code or type the code shown to approve it.
            </p>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Amount (£)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1.4rem', border: '1px solid var(--color-border)', borderRadius: '8px', boxSizing: 'border-box', marginBottom: '1rem' }}
            />

            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              What's this for? (optional — for your own records, the customer never sees this)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {PURCHASE_TAGS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => setPurchaseTag(purchaseTag === tag.value ? null : tag.value)}
                  style={{
                    padding: '0.65rem 1rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                    border: purchaseTag === tag.value ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    background: purchaseTag === tag.value ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                    fontWeight: purchaseTag === tag.value ? '700' : '500', color: 'var(--color-text)', fontSize: '0.9rem',
                  }}
                >
                  {tag.label}
                </button>
              ))}
            </div>

            {error && (
              <p style={{ color: 'var(--color-danger-text)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
            )}
            <button
              disabled={creating}
              onClick={createTransaction}
              style={{ width: '100%', padding: '0.75rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}
            >
              {creating ? 'Generating code…' : 'Generate Code'}
            </button>
          </>
        )}

        {txn && txn.status === 'pending' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              £{txn.amount}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
              <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <QRCodeSVG value={txn.transaction_code} size={180} />
              </div>
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0.5rem 0' }}>or type this code</p>

            <div
              style={{
                display: 'inline-block', fontFamily: 'monospace', fontSize: '2rem', fontWeight: '700',
                letterSpacing: '0.2em', background: 'var(--color-surface-alt)', border: '1px dashed var(--color-border)',
                borderRadius: '10px', padding: '0.75rem 1.25rem', marginBottom: '1rem', color: 'var(--color-primary)',
              }}
            >
              {txn.transaction_code}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '700', padding: '0.3rem 0.9rem' }}>
                Waiting for employee…
              </span>
            </div>

            <button
              onClick={reset}
              style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
