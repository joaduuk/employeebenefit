import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

export default function EmployeeBalance() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/employee/balance');
        setBalance(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load balance');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(31,42,55,0.06)' }}>
        <h1 style={{ marginTop: 0, fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)' }}>
          Your Balance
        </h1>

        {loading && <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>}
        {error && <p style={{ color: 'var(--color-danger-text)' }}>{error}</p>}

        {balance && (
          <>
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Available to spend
              </div>
              <div style={{ fontSize: '2.75rem', fontWeight: '800', color: Number(balance.available) > 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                £{balance.available}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--color-surface-alt)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Spending Limit</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-text)' }}>£{balance.spending_limit}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Outstanding</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-text)' }}>£{balance.outstanding}</div>
              </div>
            </div>

            {Number(balance.available) <= 0 && (
              <p style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                You've reached your limit for this cycle. It'll become available again once your outstanding balance clears through payroll.
              </p>
            )}

            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              {balance.max_transaction_amount != null && <div>Per-purchase limit: £{balance.max_transaction_amount}</div>}
              {balance.daily_limit != null && <div>Daily limit: £{balance.daily_limit}</div>}
              {balance.weekly_limit != null && <div>Weekly limit: £{balance.weekly_limit}</div>}
              {balance.current_cycle_period_end && (
                <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                  Current cycle ends {balance.current_cycle_period_end}
                </div>
              )}
            </div>

            <Link
              to="/employee/pay"
              style={{ display: 'block', textAlign: 'center', padding: '0.75rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}
            >
              Pay with Your Benefit
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
