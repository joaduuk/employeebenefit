import { useEffect, useState } from 'react';
import API from '../services/api';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_COLORS = {
  pending: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)' },
  paid: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.65rem', textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

export default function MerchantSettlements() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/merchant/settlements');
        setSettlements(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendingTotal = settlements
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + Number(s.total_amount), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Settlements
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Generated automatically at the end of each month, once every purchase for that month is approved.
        </p>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Pending (Not Yet Paid)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-text)' }}>£{pendingTotal.toFixed(2)}</div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
        ) : settlements.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No settlements yet — your first will appear once a full calendar month of approved purchases has passed.
          </p>
        ) : (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
            {settlements.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.9rem 1.25rem', borderBottom: i < settlements.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--color-text)' }}>{MONTH_NAMES[s.period_month]} {s.period_year}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    £{s.total_amount} · due {s.due_date}
                  </div>
                </div>
                <StatusPill status={s.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
