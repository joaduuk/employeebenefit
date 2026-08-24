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

export default function AdminEmployerQueue() {
  const [employers, setEmployers] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [actingId, setActingId] = useState(null);

  const fetchEmployers = async (status) => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : '';
      const res = await API.get(`/admin/employers${params}`);
      setEmployers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployers(filter); }, [filter]);

  const decide = async (id, action) => {
    setActingId(id);
    try {
      await API.put(`/admin/employers/${id}/${action}`, {
        decision_note: noteDrafts[id] || null,
      });
      await fetchEmployers(filter);
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Employer Applications
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Review and approve companies applying to offer the benefit.
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
        ) : employers.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No employers in this view.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {employers.map((e) => (
              <div key={e.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{e.company_name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{e.admin_full_name} · {e.admin_email}</div>
                  </div>
                  <StatusPill status={e.application_status} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', background: 'var(--color-surface-alt)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Reg. Number</div>{e.registration_number || '—'}</div>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Payroll</div>{e.payroll_frequency} · day {e.payroll_day}</div>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Benefit Active</div>{e.benefit_active ? 'Yes' : 'No'}</div>
                </div>

                {e.decision_note && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                    Note: {e.decision_note}
                  </p>
                )}

                {(e.application_status === 'pending' || e.application_status === 'under_review') && (
                  <>
                    <input
                      type="text"
                      placeholder="Optional note (shown on approve or reject)"
                      value={noteDrafts[e.id] || ''}
                      onChange={(ev) => setNoteDrafts((d) => ({ ...d, [e.id]: ev.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        disabled={actingId === e.id}
                        onClick={() => decide(e.id, 'approve')}
                        style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                      >
                        {actingId === e.id ? '…' : 'Approve'}
                      </button>
                      <button
                        disabled={actingId === e.id}
                        onClick={() => decide(e.id, 'reject')}
                        style={{ padding: '0.45rem 1rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                      >
                        {actingId === e.id ? '…' : 'Reject'}
                      </button>
                    </div>
                  </>
                )}

                {e.application_status === 'approved' && (
                  <button
                    disabled={actingId === e.id}
                    onClick={() => decide(e.id, 'suspend')}
                    style={{ padding: '0.45rem 1rem', background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    {actingId === e.id ? '…' : 'Suspend'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
