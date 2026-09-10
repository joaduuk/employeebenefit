import { useEffect, useState } from 'react';
import API from '../services/api';
import ExportButtons from '../components/ExportButtons';

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

export default function EmployerBillingCycles() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [openCycles, setOpenCycles] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/employer/billing-cycles');
      setCycles(res.data);
      if (res.data.length > 0) setOpenCycles({ [res.data[0].id]: true });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleCycle = (id) => setOpenCycles((o) => ({ ...o, [id]: !o[id] }));

  const closeCycleNow = async (id) => {
    setActingId(id);
    setMessage(null);
    try {
      await API.put(`/employer/billing-cycle/${id}/close-now`);
      setMessage('Cycle closed — the deduction file is now available to download.');
      await load();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to close cycle');
    } finally {
      setActingId(null);
    }
  };

  const confirmPayrollDeducted = async (id) => {
    setActingId(id);
    setMessage(null);
    try {
      await API.put(`/employer/billing-cycle/${id}/confirm-payroll-deducted`);
      setMessage('Confirmed — employee balances have been cleared for this cycle.');
      await load();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to confirm');
    } finally {
      setActingId(null);
    }
  };

  const downloadFile = (id, format) => {
    window.open(`${API.defaults.baseURL}/employer/billing-cycle/${id}/deduction-file?format=${format}`, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', margin: 0 }}>
            Billing Cycles
          </h1>
          <ExportButtons exportPath="/employer/billing-cycles/export" />
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Click a cycle to see the deduction file and available actions.
        </p>

        {message && (
          <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
            {message}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
        ) : cycles.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No billing cycles yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {cycles.map((c) => {
              const isOpen = !!openCycles[c.id];
              return (
                <div key={c.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div
                    onClick={() => toggleCycle(c.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>Cycle #{c.cycle_number}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{c.period_start} → {c.period_end}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StatusPill status={c.status} />
                      <span style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>{isOpen ? '▴' : '▾'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.25rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                        Payroll deduction date: {c.payroll_deduction_date}
                        {c.employer_amount_expected != null && <> · Amount: <strong>£{c.employer_amount_expected}</strong></>}
                      </p>

                      {c.status === 'employer_paid' && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                          Confirmed received by EEB {c.employer_paid_at ? new Date(c.employer_paid_at).toLocaleString() : ''}
                        </p>
                      )}

                      {(c.status === 'closed' || c.status === 'payroll_deducted' || c.status === 'employer_paid') && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <button onClick={() => downloadFile(c.id, 'csv')} style={{ padding: '0.4rem 0.9rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>
                            Download CSV
                          </button>
                          <button onClick={() => downloadFile(c.id, 'json')} style={{ padding: '0.4rem 0.9rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>
                            Download JSON
                          </button>
                        </div>
                      )}

                      {c.status === 'open' && (
                        <button
                          disabled={actingId === c.id}
                          onClick={() => closeCycleNow(c.id)}
                          style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                        >
                          {actingId === c.id ? '…' : 'Close Now (testing)'}
                        </button>
                      )}

                      {c.status === 'closed' && (
                        <button
                          disabled={actingId === c.id}
                          onClick={() => confirmPayrollDeducted(c.id)}
                          style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                        >
                          {actingId === c.id ? '…' : 'Confirm Payroll Deducted'}
                        </button>
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
