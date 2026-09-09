import { useEffect, useState } from 'react';
import API from '../services/api';

const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem' };
const labelStyle = { fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.35rem' };
const figureStyle = { fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-text)' };

export default function AdminAccounting() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [atRisk, setAtRisk] = useState([]);
  const [suspendingId, setSuspendingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankBalance, setBankBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [summaryRes, historyRes, atRiskRes] = await Promise.all([
        API.get('/admin/accounting/summary'),
        API.get('/admin/accounting/cash-position/history'),
        API.get('/admin/accounting/at-risk-employers'),
      ]);
      setSummary(summaryRes.data);
      setHistory(historyRes.data);
      setAtRisk(atRiskRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const suspendEmployer = async (employerId, companyName) => {
    if (!window.confirm(`Suspend ${companyName}? This immediately blocks all of their employees from making new purchases.`)) return;
    setSuspendingId(employerId);
    try {
      await API.put(`/admin/employers/${employerId}/suspend`, { decision_note: 'Suspended from At-Risk Employers view due to overdue payment / arrears pattern.' });
      setMessage(`${companyName} suspended — their employees can no longer spend.`);
      await load();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to suspend');
    } finally {
      setSuspendingId(null);
    }
  };

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

        {atRisk.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: '1.5rem', borderColor: 'var(--color-danger-text)' }}>
            <div style={{ fontWeight: '700', color: 'var(--color-danger-text)', marginBottom: '0.75rem' }}>At-Risk Employers</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Overdue-unpaid means payroll was deducted but EEB hasn't been paid yet, past the due date. Arrears means a payment came in short. A single occurrence can be a processing delay — a pattern is the real signal.
            </p>
            {atRisk.map((a) => (
              <div key={a.employer_id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--color-text)' }}>{a.employer_company_name}</span>
                    {a.is_pattern && (
                      <span style={{ marginLeft: '0.5rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.6rem' }}>
                        Pattern
                      </span>
                    )}
                  </div>
                  <button
                    disabled={suspendingId === a.employer_id}
                    onClick={() => suspendEmployer(a.employer_id, a.employer_company_name)}
                    style={{ padding: '0.35rem 0.8rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}
                  >
                    {suspendingId === a.employer_id ? '…' : 'Suspend'}
                  </button>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '0.3rem' }}>
                  {a.overdue_unpaid_count > 0 && <span>Overdue unpaid: £{a.overdue_unpaid_amount} across {a.overdue_unpaid_count} cycle{a.overdue_unpaid_count !== 1 ? 's' : ''}. </span>}
                  {a.arrears_count > 0 && <span>Arrears: £{a.arrears_amount} across {a.arrears_count} cycle{a.arrears_count !== 1 ? 's' : ''}. </span>}
                  <strong>Total at risk: £{a.total_at_risk}</strong>
                </div>
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
