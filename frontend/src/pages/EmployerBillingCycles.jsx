import { useEffect, useState } from 'react';
import API from '../services/api';

const STATUS_COLORS = {
  open: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)' },
  closed: { bg: '#FFF3CD', text: '#8A6D3B' },
  payroll_deducted: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
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

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/employer/billing-cycles');
      setCycles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const downloadFile = async (cycleId, cycleNumber, format) => {
    try {
      const res = await API.get(`/employer/billing-cycle/${cycleId}/deduction-file`, {
        params: { format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `EEB_Payroll_Cycle${cycleNumber}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage('Failed to download file');
    }
  };

  const closeNow = async (cycleId) => {
    setActingId(cycleId);
    setMessage(null);
    try {
      await API.put(`/employer/billing-cycle/${cycleId}/close-now`);
      setMessage('Cycle closed — deduction file is now available.');
      await load();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to close cycle');
    } finally {
      setActingId(null);
    }
  };

  const confirmDeducted = async (cycleId) => {
    setActingId(cycleId);
    setMessage(null);
    try {
      await API.put(`/employer/billing-cycle/${cycleId}/confirm-payroll-deducted`);
      setMessage('Confirmed — employee balances for this cycle have cleared.');
      await load();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to confirm');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Billing Cycles
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Cycles close automatically on your payroll deduction date. Download the deduction file and confirm once payroll has actually run.
        </p>

        {message && (
          <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
            {message}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cycles.map((c) => (
              <div key={c.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>Cycle #{c.cycle_number}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {c.period_start} → {c.period_end} · Payroll date: {c.payroll_deduction_date}
                    </div>
                  </div>
                  <StatusPill status={c.status} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => downloadFile(c.id, c.cycle_number, 'csv')}
                    style={{ padding: '0.45rem 1rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    Download CSV
                  </button>
                  <button
                    onClick={() => downloadFile(c.id, c.cycle_number, 'json')}
                    style={{ padding: '0.45rem 1rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    Download JSON
                  </button>

                  {c.status === 'open' && (
                    <button
                      disabled={actingId === c.id}
                      onClick={() => closeNow(c.id)}
                      style={{ padding: '0.45rem 1rem', background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                      title="Testing override — normally closes automatically on the payroll date"
                    >
                      {actingId === c.id ? '…' : 'Close Now (testing)'}
                    </button>
                  )}

                  {c.status === 'closed' && (
                    <button
                      disabled={actingId === c.id}
                      onClick={() => confirmDeducted(c.id)}
                      style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                    >
                      {actingId === c.id ? '…' : 'Confirm Payroll Deducted'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
