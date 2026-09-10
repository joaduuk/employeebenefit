import { useEffect, useState } from 'react';
import API from '../services/api';
import ExportButtons from '../components/ExportButtons';

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

const MAX_PERCENTAGE = 30;
const DEFAULT_PERCENTAGE = 20;

const EMPTY_DRAFT = {
  monthly_net_pay: '',
  spending_limit_percentage: String(DEFAULT_PERCENTAGE),
  max_transaction_amount: '',
  daily_limit: '',
  weekly_limit: '',
  eligible_categories_override: '',
  benefit_start_date: '',
  decision_note: '',
};

function computedLimit(draft) {
  const pay = Number(draft.monthly_net_pay);
  const pct = Number(draft.spending_limit_percentage);
  if (!pay || !pct) return null;
  return (pay * pct / 100).toFixed(2);
}

export default function EmployerEmployeeQueue() {
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchEmployees = async (status) => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : '';
      const res = await API.get(`/employer/employees${params}`);
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(filter); }, [filter]);

  const draftFor = (id) => drafts[id] || EMPTY_DRAFT;
  const setDraftField = (id, field, value) => {
    setDrafts((d) => ({ ...d, [id]: { ...draftFor(id), [field]: value } }));
  };

  const decide = async (id, action) => {
    setError(null);
    const draft = draftFor(id);
    if (action === 'approve') {
      const pct = Number(draft.spending_limit_percentage);
      if (!draft.monthly_net_pay || Number(draft.monthly_net_pay) <= 0) {
        setError("Enter the employee's monthly net pay before approving.");
        return;
      }
      if (!pct || pct <= 0 || pct > MAX_PERCENTAGE) {
        setError(`Spending limit percentage must be between 0 and ${MAX_PERCENTAGE}%.`);
        return;
      }
    }
    setActingId(id);
    try {
      await API.put(`/employer/employees/${id}/${action}`, {
        monthly_net_pay: draft.monthly_net_pay ? Number(draft.monthly_net_pay) : undefined,
        spending_limit_percentage: draft.spending_limit_percentage ? Number(draft.spending_limit_percentage) : undefined,
        max_transaction_amount: draft.max_transaction_amount === '' ? null : Number(draft.max_transaction_amount),
        daily_limit: draft.daily_limit === '' ? null : Number(draft.daily_limit),
        weekly_limit: draft.weekly_limit === '' ? null : Number(draft.weekly_limit),
        eligible_categories_override: draft.eligible_categories_override || null,
        benefit_start_date: draft.benefit_start_date || null,
        decision_note: draft.decision_note || null,
      });
      setDrafts((d) => ({ ...d, [id]: EMPTY_DRAFT }));
      await fetchEmployees(filter);
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', margin: 0 }}>
            Employee Applications
          </h1>
          <ExportButtons exportPath="/employer/employees/export" extraParams={filter ? { status: filter } : {}} />
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Spending limits are calculated automatically as a percentage of the employee's monthly net pay — never typed directly — so every limit stays tied to real, verified earnings.
        </p>

        {error && (
          <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>{error}</div>
        )}

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
        ) : employees.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No employees in this view.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {employees.map((e) => {
              const draft = draftFor(e.id);
              const isPending = e.application_status === 'pending' || e.application_status === 'under_review';
              const preview = computedLimit(draft);
              return (
                <div key={e.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{e.user_full_name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{e.work_email}</div>
                    </div>
                    <StatusPill status={e.application_status} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', background: 'var(--color-surface-alt)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Employee No.</div>{e.employee_number || '—'}</div>
                    <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Department</div>{e.department || '—'}</div>
                    <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Job Title</div>{e.job_title || '—'}</div>
                    <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Login Email</div>{e.user_email}</div>
                  </div>

                  {e.application_status === 'approved' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                      <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Monthly Limit</div>{e.monthly_limit != null ? `£${e.monthly_limit}` : 'Employer default'}</div>
                      <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Basis</div>{e.spending_limit_percentage != null ? `${e.spending_limit_percentage}% of £${e.monthly_net_pay}` : '—'}</div>
                      <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Per Transaction</div>{e.max_transaction_amount != null ? `£${e.max_transaction_amount}` : '—'}</div>
                      <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Start Date</div>{e.benefit_start_date || 'Immediate'}</div>
                    </div>
                  )}

                  {e.decision_note && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                      Note: {e.decision_note}
                    </p>
                  )}

                  {isPending && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Employee's monthly net pay (£)</label>
                          <input
                            type="number"
                            value={draft.monthly_net_pay}
                            onChange={(ev) => setDraftField(e.id, 'monthly_net_pay', ev.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Spending limit % (max {MAX_PERCENTAGE}%)</label>
                          <input
                            type="number"
                            min="1"
                            max={MAX_PERCENTAGE}
                            value={draft.spending_limit_percentage}
                            onChange={(ev) => setDraftField(e.id, 'spending_limit_percentage', ev.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Max per transaction (£)</label>
                          <input
                            type="number"
                            value={draft.max_transaction_amount}
                            onChange={(ev) => setDraftField(e.id, 'max_transaction_amount', ev.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Daily limit (£)</label>
                          <input
                            type="number"
                            value={draft.daily_limit}
                            onChange={(ev) => setDraftField(e.id, 'daily_limit', ev.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Weekly limit (£)</label>
                          <input
                            type="number"
                            value={draft.weekly_limit}
                            onChange={(ev) => setDraftField(e.id, 'weekly_limit', ev.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Start date</label>
                          <input
                            type="date"
                            value={draft.benefit_start_date}
                            onChange={(ev) => setDraftField(e.id, 'benefit_start_date', ev.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {preview && (
                        <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)', borderRadius: '8px', padding: '0.6rem 0.9rem', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: '700' }}>
                          Resulting monthly spending limit: £{preview}
                        </div>
                      )}

                      <div style={{ marginBottom: '0.6rem' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Eligible categories (comma-sep, optional)</label>
                        <input
                          type="text"
                          value={draft.eligible_categories_override}
                          onChange={(ev) => setDraftField(e.id, 'eligible_categories_override', ev.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Optional note"
                        value={draft.decision_note}
                        onChange={(ev) => setDraftField(e.id, 'decision_note', ev.target.value)}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button disabled={actingId === e.id} onClick={() => decide(e.id, 'approve')}
                          style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                          {actingId === e.id ? '…' : 'Approve'}
                        </button>
                        <button disabled={actingId === e.id} onClick={() => decide(e.id, 'reject')}
                          style={{ padding: '0.45rem 1rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                          {actingId === e.id ? '…' : 'Reject'}
                        </button>
                      </div>
                    </>
                  )}

                  {e.application_status === 'approved' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button disabled={actingId === e.id} onClick={() => decide(e.id, 'suspend')}
                        style={{ padding: '0.45rem 1rem', background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                        {actingId === e.id ? '…' : 'Suspend'}
                      </button>
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
