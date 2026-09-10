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
  const [selected, setSelected] = useState({});
  const [bulkConfirming, setBulkConfirming] = useState(false);

  const [showAnchorSettings, setShowAnchorSettings] = useState(false);
  const [anchorDate, setAnchorDate] = useState('');
  const [savingAnchor, setSavingAnchor] = useState(false);
  const [anchorMessage, setAnchorMessage] = useState(null);

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
  const toggleSelected = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

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

  const bulkConfirmSelected = async () => {
    const cycleIds = Object.keys(selected).filter((id) => selected[id]);
    if (cycleIds.length === 0) return;
    setBulkConfirming(true);
    setMessage(null);
    try {
      const res = await API.put('/employer/billing-cycles/bulk-confirm-payroll-deducted', { cycle_ids: cycleIds });
      setMessage(`Confirmed ${res.data.confirmed.length} cycle${res.data.confirmed.length !== 1 ? 's' : ''} — employee balances cleared for each.`);
      setSelected({});
      await load();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to bulk confirm');
    } finally {
      setBulkConfirming(false);
    }
  };

  const saveAnchorDate = async () => {
    if (!anchorDate) {
      setAnchorMessage('Pick a date first.');
      return;
    }
    setSavingAnchor(true);
    setAnchorMessage(null);
    try {
      await API.put('/employer/payroll-anchor-date', { payroll_anchor_date: anchorDate });
      setAnchorMessage('Saved — this only affects cycles created from now on.');
    } catch (err) {
      setAnchorMessage(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSavingAnchor(false);
    }
  };

  const downloadFile = (id, format) => {
    window.open(`${API.defaults.baseURL}/employer/billing-cycle/${id}/deduction-file?format=${format}`, '_blank');
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const closedCycles = cycles.filter((c) => c.status === 'closed');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', margin: 0 }}>
            Billing Cycles
          </h1>
          <ExportButtons exportPath="/employer/billing-cycles/export" />
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          Click a cycle to see the deduction file and available actions.
        </p>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', marginBottom: '1.25rem', overflow: 'hidden' }}>
          <div
            onClick={() => setShowAnchorSettings((v) => !v)}
            style={{ padding: '0.85rem 1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', fontWeight: '600', color: 'var(--color-primary)' }}
          >
            Payroll Settings (only relevant if you pay fortnightly)
            <span style={{ color: 'var(--color-text-muted)' }}>{showAnchorSettings ? '▴' : '▾'}</span>
          </div>
          {showAnchorSettings && (
            <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.1rem' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                If you pay staff fortnightly, enter any date that was an actual payroll date — this tells us which week is the "on" week, so future cycles land on the right Friday (or whichever day you pay), not just every 7 days.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={anchorDate}
                  onChange={(e) => setAnchorDate(e.target.value)}
                  style={{ padding: '0.5rem 0.7rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem' }}
                />
                <button
                  disabled={savingAnchor}
                  onClick={saveAnchorDate}
                  style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                >
                  {savingAnchor ? '…' : 'Save'}
                </button>
              </div>
              {anchorMessage && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>{anchorMessage}</p>}
            </div>
          )}
        </div>

        {message && (
          <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
            {message}
          </div>
        )}

        {closedCycles.length > 1 && (
          <div style={{ background: 'var(--color-surface-alt)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              {selectedCount > 0 ? `${selectedCount} cycle${selectedCount !== 1 ? 's' : ''} selected` : 'Select multiple closed cycles below to confirm them all at once'}
            </span>
            {selectedCount > 0 && (
              <button
                disabled={bulkConfirming}
                onClick={bulkConfirmSelected}
                style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}
              >
                {bulkConfirming ? '…' : `Confirm ${selectedCount} Selected`}
              </button>
            )}
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
                  <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', gap: '0.75rem' }}>
                    {c.status === 'closed' && (
                      <input
                        type="checkbox"
                        checked={!!selected[c.id]}
                        onChange={() => toggleSelected(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                      />
                    )}
                    <div
                      onClick={() => toggleCycle(c.id)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, cursor: 'pointer' }}
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
