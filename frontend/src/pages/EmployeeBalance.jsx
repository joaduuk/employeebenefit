import { useEffect, useState } from 'react';
import API from '../services/api';

export default function EmployeeBalance() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/employee/balance')
      .then((res) => setBalance(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading…</div>;
  }

  if (!balance) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Couldn't load your balance.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '1.5rem' }}>
          My Balance
        </h1>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Available to Spend</div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--color-text)' }}>£{balance.available}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Monthly Limit</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>£{balance.spending_limit}</div>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Outstanding</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>£{balance.outstanding}</div>
          </div>
        </div>

        {balance.monthly_net_pay != null && balance.spending_limit_percentage != null && (
          <div style={{ background: 'var(--color-surface-alt)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Your limit is calculated as <strong>{balance.spending_limit_percentage}%</strong> of your registered monthly net pay of <strong>£{balance.monthly_net_pay}</strong>.
          </div>
        )}

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          Current billing period ends <strong>{balance.current_cycle_period_end}</strong> · Status: <strong style={{ textTransform: 'capitalize' }}>{balance.current_cycle_status?.replace('_', ' ')}</strong>
        </div>

        {(balance.max_transaction_amount || balance.daily_limit || balance.weekly_limit) && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
            {balance.max_transaction_amount && <div>Max per transaction: £{balance.max_transaction_amount}</div>}
            {balance.daily_limit && <div>Daily limit: £{balance.daily_limit}</div>}
            {balance.weekly_limit && <div>Weekly limit: £{balance.weekly_limit}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
