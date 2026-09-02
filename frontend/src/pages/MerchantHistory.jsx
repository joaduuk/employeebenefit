import { useEffect, useState } from 'react';
import API from '../services/api';

const API_ORIGIN = new URL(API.defaults.baseURL).origin;
const fullPhotoUrl = (path) => (path ? `${API_ORIGIN}${path}` : null);

const STATUS_COLORS = {
  pending: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)' },
  approved: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
  declined: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
  expired: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
};

const TAG_LABELS = {
  food_drinks: '🍽️ Food & Drinks',
  daily_essentials: '🧴 Daily Essentials',
  mixed: '🛒 Mixed (incl. Alcohol/Tobacco)',
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.65rem', textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

export default function MerchantHistory() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = filter ? `?status=${filter}` : '';
        const res = await API.get(`/merchant/transactions${params}`);
        setTransactions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [filter]);

  const approvedTotal = transactions
    .filter((t) => t.status === 'approved')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const approvedCount = transactions.filter((t) => t.status === 'approved').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Payment History
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Tap any transaction for full details.
        </p>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Approved Total</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-success-text)' }}>£{approvedTotal.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Approved Count</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-text)' }}>{approvedCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['', 'pending', 'approved', 'declined', 'expired'].map((s) => (
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
        ) : transactions.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No transactions in this view.
          </p>
        ) : (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
            {transactions.map((t, i) => {
              const expanded = expandedId === t.id;
              return (
                <div key={t.id} style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div
                    onClick={() => setExpandedId(expanded ? null : t.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.25rem', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--color-text)' }}>£{t.amount}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {new Date(t.created_at).toLocaleString()} · {t.transaction_code}
                      </div>
                    </div>
                    <StatusPill status={t.status} />
                  </div>

                  {expanded && (
                    <div style={{ padding: '0 1.25rem 1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Code:</span> {t.transaction_code}</div>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Method:</span> {t.method === 'qr' ? 'QR scan' : 'Manual code'}</div>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Generated:</span> {new Date(t.created_at).toLocaleString()}</div>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Decided:</span> {t.approved_at ? new Date(t.approved_at).toLocaleString() : '—'}</div>
                      {t.employee_full_name && (
                        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {t.employee_photo_url && (
                            <img
                              src={fullPhotoUrl(t.employee_photo_url)}
                              alt=""
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                            />
                          )}
                          <span><span style={{ color: 'var(--color-text-muted)' }}>Employee:</span> {t.employee_full_name} ({t.employee_work_email})</span>
                        </div>
                      )}
                      {t.purchase_tag && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Your note:</span> {TAG_LABELS[t.purchase_tag] || t.purchase_tag}
                        </div>
                      )}
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
