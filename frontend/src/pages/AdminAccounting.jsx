import { useEffect, useState } from 'react';
import API from '../services/api';

const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem' };
const labelStyle = { fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.35rem' };
const figureStyle = { fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-text)' };

export default function AdminAccounting() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [arrears, setArrears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bankBalance, setBankBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [summaryRes, historyRes, arrearsRes] = await Promise.all([
        API.get('/admin/accounting/summary'),
        API.get('/admin/accounting/cash-position/history'),
        API.get('/admin/accounting/employer-arrears'),
      ]);
      setSummary(summaryRes.data);
      setHistory(historyRes.data);
      setArrears(arrearsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const recordCashPosition = async (e) => {
    e.preventDefault();
    if (!bankBalance) return;
    setSaving(true);
    setMessage(null);
    try {
      await API.post('/admin/accounting/cash-position', {
        bank_balance: Number(bankBalance),
        notes: notes || null,
      });
      setMessage('Recorded.');
      setBankBalance('');
      setNotes('');
      await load();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to record');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !summary) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>Loading…</p>
      </div>
    );
  }

  const hasDiscrepancy = summary.discrepancy !== null && Math.abs(Number(summary.discrepancy)) > 0.01;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Accounting Summary
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          A daily balancing view: what's owed to us, what we owe out, what's disputed, and whether our books match the bank.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={cardStyle}>
            <div style={labelStyle}>Owed by Employers</div>
            <div style={figureStyle}>£{summary.total_owed_by_employers}</div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Owed to Merchants</div>
            <div style={figureStyle}>£{summary.total_owed_to_merchants}</div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Disputed ({summary.disputed_count})</div>
            <div style={{ ...figureStyle, color: summary.disputed_count > 0 ? '#8A6D3B' : 'var(--color-text)' }}>£{summary.total_disputed}</div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Employer Arrears</div>
            <div style={{ ...figureStyle, color: Number(summary.total_employer_arrears) > 0 ? 'var(--color-danger-text)' : 'var(--color-text)' }}>£{summary.total_employer_arrears}</div>
          </div>
        </div>

        {arrears.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: '1.5rem', borderColor: 'var(--color-danger-text)' }}>
            <div style={{ fontWeight: '700', color: 'var(--color-danger-text)', marginBottom: '0.75rem' }}>Employers with Outstanding Arrears</div>
            {arrears.map((a) => (
              <div key={a.employer_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                <span>{a.employer_company_name}</span>
                <span style={{ fontWeight: '700' }}>£{a.total_shortfall} across {a.cycle_count} cycle{a.cycle_count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: '700', color: 'var(--color-primary)', marginBottom: '1rem' }}>Cash Position</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={labelStyle}>Collected from Employers</div>
              <div style={{ fontWeight: '700' }}>£{summary.total_collected_from_employers}</div>
            </div>
            <div>
              <div style={labelStyle}>Paid to Merchants</div>
              <div style={{ fontWeight: '700' }}>£{summary.total_paid_to_merchants}</div>
            </div>
            <div>
              <div style={labelStyle}>Book Balance (computed)</div>
              <div style={{ fontWeight: '800', fontSize: '1.2rem' }}>£{summary.book_balance}</div>
            </div>
            <div>
              <div style={labelStyle}>Bank Balance (recorded)</div>
              <div style={{ fontWeight: '800', fontSize: '1.2rem' }}>
                {summary.bank_balance !== null ? `£${summary.bank_balance}` : '—'}
              </div>
              {summary.bank_balance_recorded_date && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>as of {summary.bank_balance_recorded_date}</div>
              )}
            </div>
          </div>

          {summary.discrepancy !== null && (
            <div
              style={{
                padding: '0.75rem 1rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem',
                background: hasDiscrepancy ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                color: hasDiscrepancy ? 'var(--color-danger-text)' : 'var(--color-success-text)',
              }}
            >
              {hasDiscrepancy
                ? `Discrepancy: £${summary.discrepancy} — books and bank don't match, worth investigating.`
                : 'Books and bank balance match.'}
            </div>
          )}

          <form onSubmit={recordCashPosition} style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 160px' }}>
                <label style={labelStyle}>Record Today's Bank Balance</label>
                <input
                  type="number" step="0.01" required value={bankBalance}
                  onChange={(e) => setBankBalance(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: '2 1 220px' }}>
                <label style={labelStyle}>Notes (optional)</label>
                <input
                  type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="submit" disabled={saving}
                style={{ padding: '0.6rem 1.25rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
              >
                {saving ? 'Saving…' : 'Record'}
              </button>
            </div>
            {message && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '0.6rem' }}>{message}</p>}
          </form>
        </div>

        <div style={cardStyle}>
          <div style={{ fontWeight: '700', color: 'var(--color-primary)', marginBottom: '0.75rem' }}>Recent Cash Position History</div>
          {history.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No entries recorded yet.</p>
          ) : (
            history.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                <span>{h.recorded_date} — £{h.bank_balance} {h.notes && `(${h.notes})`}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{h.recorded_by_email}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
