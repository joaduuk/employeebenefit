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

function groupByMonth(settlements) {
  const groups = {};
  for (const s of settlements) {
    const key = `${s.period_year}-${String(s.period_month).padStart(2, '0')}`;
    if (!groups[key]) {
      groups[key] = { key, year: s.period_year, month: s.period_month, items: [], total: 0 };
    }
    groups[key].items.push(s);
    groups[key].total += Number(s.total_amount);
  }
  return Object.values(groups).sort((a, b) => (a.key < b.key ? 1 : -1));
}

export default function MerchantSettlements() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMonths, setOpenMonths] = useState({});

  useEffect(() => {
    API.get('/merchant/settlements')
      .then((res) => {
        setSettlements(res.data);
        const groups = groupByMonth(res.data);
        if (groups.length > 0) setOpenMonths({ [groups[0].key]: true });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const toggleMonth = (key) => setOpenMonths((o) => ({ ...o, [key]: !o[key] }));

  const groups = groupByMonth(settlements);
  const pendingTotal = settlements.filter((s) => s.status === 'pending').reduce((sum, s) => sum + Number(s.total_amount), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Settlements
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Generated automatically each month for every approved sale. Grouped by month — click to browse.
        </p>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Pending Payment</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-text)' }}>£{pendingTotal.toFixed(2)}</div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
        ) : groups.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No settlements yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {groups.map((g) => {
              const isOpen = !!openMonths[g.key];
              return (
                <div key={g.key} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div
                    onClick={() => toggleMonth(g.key)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{MONTH_NAMES[g.month]} {g.year}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>£{g.total.toFixed(2)} total</div>
                    </div>
                    <span style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>{isOpen ? '▴' : '▾'}</span>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {g.items.map((s) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-alt)', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                          <div>
                            <div style={{ fontWeight: '700' }}>£{s.total_amount}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                              Due {s.due_date}
                              {s.status === 'paid' && s.paid_at && ` · Paid ${new Date(s.paid_at).toLocaleDateString()}`}
                            </div>
                          </div>
                          <StatusPill status={s.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
