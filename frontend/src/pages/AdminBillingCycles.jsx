import { useEffect, useState } from 'react';
import API from '../services/api';

const STATUS_COLORS = {
  open: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)' },
  closed: { bg: '#FFF3CD', text: '#8A6D3B' },
  payroll_deducted: { bg: '#E0ECFF', text: '#2C5AA0' },
  employer_paid: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
  merchants_settled: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.open;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.65rem', textTransform: 'capitalize' }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function AdminBillingCycles() {
  const [cycles, setCycles] = useState([]);
  const [filter, setFilter] = useState('payroll_deducted');
  const [loading, setLoading] = useState(true);
  const [refDrafts, setRefDrafts] = useState({});
  const [receivedDrafts, setReceivedDrafts] = useState({});
  const [actingId, setActingId] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async (status) => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : '';
      const res = await API.get(`/admin/billing-cycles${params}`);
      setCycles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const confirmEmployerPaid = async (cycleId, expected) => {
    const received = receivedDrafts[cycleId];
    if (!received) {
      setMessage('Enter the amount actually received before confirming.');
      return;
    }
    setActingId(cycleId);
    setMessage(null);
    try {
      const res = await API.put(`/admin/billing-cycle/${cycleId}/confirm-employer-paid`, {
        amount_received: Number(received),
        payment_reference: refDrafts[cycleId] || null,
      });
      if (res.data.shortfall) {
        setMessage(`Confirmed — but this was £${res.data.shortfall} short of the expected £${expected}. Tracked as arrears against this employer.`);
      } else {
        setMessage('Confirmed in full — now counted as collected in the accounting summary.');
      }
      await load(filter);
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to confirm');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Employer Settlements — All Employers
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Confirm once an employer has actually remitted a cycle's amount to EEB — this is what the accounting summary counts as collected.
        </p>

        {message && (
          <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {['open', 'closed', 'payroll_deducted', 'employer_paid', ''].map((s) => (
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
              {(s || 'All').replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
        ) : cycles.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No billing cycles in this view.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cycles.map((c) => (
              <div key={c.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{c.employer_company_name} — Cycle #{c.cycle_number}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {c.period_start} → {c.period_end} · Payroll date: {c.payroll_deduction_date}
                    </div>
                  </div>
                  <StatusPill status={c.status} />
                </div>

                {c.status === 'employer_paid' && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    Received £{c.employer_amount_received} of £{c.employer_amount_expected} expected
                    {c.employer_amount_received && c.employer_amount_expected && Number(c.employer_amount_received) < Number(c.employer_amount_expected) && (
                      <span style={{ color: 'var(--color-danger-text)', fontWeight: '700' }}> — shortfall £{(Number(c.employer_amount_expected) - Number(c.employer_amount_received)).toFixed(2)}</span>
                    )}
                    {' · '}Confirmed {c.employer_paid_at ? new Date(c.employer_paid_at).toLocaleString() : ''}
                  </p>
                )}

                {c.status === 'payroll_deducted' && (
                  <>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                      Expected: <strong>£{c.employer_amount_expected ?? '—'}</strong>
                    </p>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount actually received"
                      value={receivedDrafts[c.id] ?? c.employer_amount_expected ?? ''}
                      onChange={(ev) => setReceivedDrafts((d) => ({ ...d, [c.id]: ev.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.5rem', boxSizing: 'border-box' }}
                    />
                    <input
                      type="text"
                      placeholder="Optional payment reference"
                      value={refDrafts[c.id] || ''}
                      onChange={(ev) => setRefDrafts((d) => ({ ...d, [c.id]: ev.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                    />
                    <button
                      disabled={actingId === c.id}
                      onClick={() => confirmEmployerPaid(c.id, c.employer_amount_expected)}
                      style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                    >
                      {actingId === c.id ? '…' : 'Confirm Employer Paid'}
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
