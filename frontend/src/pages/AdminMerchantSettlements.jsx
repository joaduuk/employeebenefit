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

export default function AdminMerchantSettlements() {
  const [settlements, setSettlements] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refDrafts, setRefDrafts] = useState({});
  const [actingId, setActingId] = useState(null);

  const load = async (status) => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : '';
      const res = await API.get(`/admin/merchant-settlements${params}`);
      setSettlements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const markPaid = async (id) => {
    setActingId(id);
    try {
      await API.put(`/admin/merchant-settlements/${id}/mark-paid`, {
        paid_reference: refDrafts[id] || null,
      });
      await load(filter);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to mark as paid');
    } finally {
      setActingId(null);
    }
  };

  const pendingTotal = settlements
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + Number(s.total_amount), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Merchant Settlements
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Generated automatically each month. Mark as paid once the transfer has actually been sent.
        </p>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Owed (This View)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-text)' }}>£{pendingTotal.toFixed(2)}</div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['pending', 'paid', ''].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setFilter(s)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)',
                background: filter === s ? 'var(--color-primary)' : 'var(--color-surface)',
                color: filter === s ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', textTransform: 'capitalize',
              }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
        ) : settlements.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No settlements in this view.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {settlements.map((s) => (
              <div key={s.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{s.business_name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {MONTH_NAMES[s.period_month]} {s.period_year} · £{s.total_amount} · due {s.due_date}
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                </div>

                {s.status === 'pending' && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                      <span>Settlement readiness</span>
                      <span style={{ fontWeight: '700', color: s.readiness_percentage >= 100 ? 'var(--color-success-text)' : 'var(--color-text)' }}>{s.readiness_percentage}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--color-surface-alt)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(s.readiness_percentage, 100)}%`, background: s.readiness_percentage >= 100 ? 'var(--color-success-text)' : 'var(--color-accent)' }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      £{s.amount_backed} collected from employers so far · £{s.amount_unbacked} still in transit
                    </div>
                  </div>
                )}

                {s.status === 'paid' && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    Paid {s.paid_at ? new Date(s.paid_at).toLocaleString() : ''}
                    {s.paid_reference && ` · Ref: ${s.paid_reference}`}
                  </p>
                )}

                {s.status === 'pending' && (
                  <>
                    <input
                      type="text"
                      placeholder="Optional payment reference"
                      value={refDrafts[s.id] || ''}
                      onChange={(ev) => setRefDrafts((d) => ({ ...d, [s.id]: ev.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                    />
                    <button
                      disabled={actingId === s.id}
                      onClick={() => markPaid(s.id)}
                      style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                    >
                      {actingId === s.id ? '…' : 'Mark as Paid'}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
