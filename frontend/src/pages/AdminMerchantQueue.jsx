import { useEffect, useState } from 'react';
import API from '../services/api';

const STATUS_COLORS = {
  pending: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)' },
  under_review: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)' },
  approved: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
  rejected: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
  suspended: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.65rem', textTransform: 'capitalize' }}>
      {status.replace('_', ' ')}
    </span>
  );
}

function CapabilityPill({ label, on }) {
  return (
    <span style={{
      background: on ? 'var(--color-success-bg)' : 'var(--color-surface-alt)',
      color: on ? 'var(--color-success-text)' : 'var(--color-text-muted)',
      borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.55rem',
    }}>
      {label}: {on ? 'On' : 'Off'}
    </span>
  );
}

export default function AdminMerchantQueue() {
  const [merchants, setMerchants] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [actingId, setActingId] = useState(null);

  const fetchMerchants = async (status) => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : '';
      const res = await API.get(`/admin/merchants${params}`);
      setMerchants(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMerchants(filter); }, [filter]);

  const decide = async (id, action) => {
    setActingId(id);
    try {
      await API.put(`/admin/merchants/${id}/${action}`, {
        decision_note: noteDrafts[id] || null,
      });
      await fetchMerchants(filter);
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setActingId(null);
    }
  };

  const togglePayouts = async (id, enabled) => {
    setActingId(id);
    try {
      await API.put(`/admin/merchants/${id}/payouts`, { enabled, decision_note: noteDrafts[id] || null });
      await fetchMerchants(filter);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update payouts');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Merchant Applications
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Review businesses applying to accept EEB payments.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['pending', 'approved', 'rejected', 'suspended', ''].map((s) => (
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
        ) : merchants.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No merchants in this view.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {merchants.map((m) => (
              <div key={m.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{m.business_name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{m.owner_user_full_name} · {m.owner_user_email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusPill status={m.application_status} />
                    <CapabilityPill label="Payments" on={m.payments_enabled} />
                    <CapabilityPill label="Payouts" on={m.payouts_enabled} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', background: 'var(--color-surface-alt)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Category</div>{m.category.replace('_', ' ')}</div>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Address</div>{m.business_address || '—'}</div>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Reg. Number</div>{m.registration_number || '—'}</div>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Bank Details</div>{m.payout_account_number ? `${m.payout_account_name} · ${m.payout_sort_code}` : 'Not provided'}</div>
                </div>

                {m.decision_note && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                    Note: {m.decision_note}
                  </p>
                )}

                {(m.application_status === 'pending' || m.application_status === 'under_review') && (
                  <>
                    <input
                      type="text"
                      placeholder="Optional note"
                      value={noteDrafts[m.id] || ''}
                      onChange={(ev) => setNoteDrafts((d) => ({ ...d, [m.id]: ev.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button disabled={actingId === m.id} onClick={() => decide(m.id, 'approve')}
                        style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                        {actingId === m.id ? '…' : 'Approve'}
                      </button>
                      <button disabled={actingId === m.id} onClick={() => decide(m.id, 'reject')}
                        style={{ padding: '0.45rem 1rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                        {actingId === m.id ? '…' : 'Reject'}
                      </button>
                    </div>
                  </>
                )}

                {m.application_status === 'approved' && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button disabled={actingId === m.id} onClick={() => togglePayouts(m.id, !m.payouts_enabled)}
                      style={{ padding: '0.45rem 1rem', background: m.payouts_enabled ? 'var(--color-danger-bg)' : 'var(--color-success-bg)', color: m.payouts_enabled ? 'var(--color-danger-text)' : 'var(--color-success-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                      {actingId === m.id ? '…' : m.payouts_enabled ? 'Disable Payouts' : 'Enable Payouts'}
                    </button>
                    <button disabled={actingId === m.id} onClick={() => decide(m.id, 'suspend')}
                      style={{ padding: '0.45rem 1rem', background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                      {actingId === m.id ? '…' : 'Suspend'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
