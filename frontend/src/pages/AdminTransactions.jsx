import { useEffect, useState } from 'react';
import API from '../services/api';
import ExportButtons from '../components/ExportButtons';

const STATUS_COLORS = {
  pending: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)' },
  approved: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
  declined: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
  expired: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.65rem', textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

function DisputedBadge() {
  return (
    <span style={{ background: '#FFF3CD', color: '#8A6D3B', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.65rem' }}>
      Disputed
    </span>
  );
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [disputedOnly, setDisputedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reasonDrafts, setReasonDrafts] = useState({});
  const [actingId, setActingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = disputedOnly ? '?is_disputed=true' : '';
      const res = await API.get(`/admin/transactions${params}`);
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [disputedOnly]);

  const markDisputed = async (id) => {
    const reason = reasonDrafts[id];
    if (!reason || !reason.trim()) {
      alert('Enter a reason before marking this transaction disputed.');
      return;
    }
    setActingId(id);
    try {
      await API.put(`/admin/transactions/${id}/mark-disputed`, { reason });
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to mark disputed');
    } finally {
      setActingId(null);
    }
  };

  const resolveDispute = async (id, outcome) => {
    let resolution_note = null;
    if (outcome === 'upheld') {
      resolution_note = window.prompt('What manual action did you take (or will you take)? e.g. "Excluding from next deduction file" or "Refunding merchant £X via bank transfer on 12 Sept".');
      if (resolution_note === null) return; // cancelled
    }
    setActingId(id);
    try {
      await API.put(`/admin/transactions/${id}/resolve-dispute`, { outcome, resolution_note });
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resolve dispute');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', margin: 0 }}>
            Transactions — All Merchants
          </h1>
          <ExportButtons exportPath="/admin/transactions/export" extraParams={disputedOnly ? { is_disputed: 'true' } : {}} />
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Tap a transaction for full detail. Mark a transaction disputed to flag it in the accounting summary.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => setDisputedOnly(false)}
            style={{
              padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)',
              background: !disputedOnly ? 'var(--color-primary)' : 'var(--color-surface)',
              color: !disputedOnly ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem',
            }}
          >
            All
          </button>
          <button
            onClick={() => setDisputedOnly(true)}
            style={{
              padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)',
              background: disputedOnly ? 'var(--color-primary)' : 'var(--color-surface)',
              color: disputedOnly ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem',
            }}
          >
            Disputed Only
          </button>
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
              const isResolvable = t.is_disputed && !t.dispute_resolved_at;
              return (
                <div key={t.id} style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div
                    onClick={() => setExpandedId(expanded ? null : t.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.25rem', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--color-text)' }}>{t.business_name} — £{t.amount}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {t.employee_full_name || 'No employee yet'} · {new Date(t.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {t.is_disputed && !t.dispute_resolved_at && <DisputedBadge />}
                      <StatusPill status={t.status} />
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ padding: '0 1.25rem 1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', marginBottom: '1rem' }}>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Code:</span> {t.transaction_code}</div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Employer:</span> {t.employer_company_name || '—'}</div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Billing cycle:</span> {t.billing_cycle_status ? t.billing_cycle_status.replace(/_/g, ' ') : '—'}</div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Approved:</span> {t.approved_at ? new Date(t.approved_at).toLocaleString() : '—'}</div>
                      </div>

                      {t.is_disputed && (
                        <div style={{ background: '#FFF9E6', border: '1px solid #FFF3CD', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                          <div style={{ fontWeight: '600', color: '#8A6D3B', marginBottom: '0.25rem' }}>
                            {t.dispute_resolved_at ? `Dispute resolved — ${t.dispute_outcome}` : 'Open dispute'}
                          </div>
                          <div>{t.dispute_reason}</div>
                          {t.resolution_note && (
                            <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                              <strong>Action taken:</strong> {t.resolution_note}
                            </div>
                          )}
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            Raised {t.disputed_at ? new Date(t.disputed_at).toLocaleString() : ''}
                            {t.dispute_resolved_at && ` · Resolved ${new Date(t.dispute_resolved_at).toLocaleString()}`}
                          </div>
                        </div>
                      )}

                      {isResolvable ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            disabled={actingId === t.id}
                            onClick={() => resolveDispute(t.id, 'upheld')}
                            style={{ padding: '0.45rem 1rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                          >
                            {actingId === t.id ? '…' : 'Uphold'}
                          </button>
                          <button
                            disabled={actingId === t.id}
                            onClick={() => resolveDispute(t.id, 'rejected')}
                            style={{ padding: '0.45rem 1rem', background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                          >
                            {actingId === t.id ? '…' : 'Reject Dispute'}
                          </button>
                        </div>
                      ) : !t.is_disputed && (
                        <>
                          <input
                            type="text"
                            placeholder="Reason for dispute"
                            value={reasonDrafts[t.id] || ''}
                            onChange={(ev) => setReasonDrafts((d) => ({ ...d, [t.id]: ev.target.value }))}
                            style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.5rem', boxSizing: 'border-box' }}
                          />
                          <button
                            disabled={actingId === t.id}
                            onClick={() => markDisputed(t.id)}
                            style={{ padding: '0.45rem 1rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                          >
                            {actingId === t.id ? '…' : 'Mark Disputed'}
                          </button>
                        </>
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
