import { useEffect, useState } from 'react';
import API from '../services/api';
import ExportButtons from '../components/ExportButtons';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_COLORS = {
  pending: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)' },
  paid: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.65rem', textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

function groupByMonth(settlements) {
  const groups = {};
  for (const s of settlements) {
    const key = `${s.period_year}-${String(s.period_month).padStart(2, '0')}`;
    if (!groups[key]) {
      groups[key] = { key, year: s.period_year, month: s.period_month, items: [], total: 0, pendingCount: 0 };
    }
    groups[key].items.push(s);
    groups[key].total += Number(s.total_amount);
    if (s.status === 'pending') groups[key].pendingCount += 1;
  }
  return Object.values(groups).sort((a, b) => (a.key < b.key ? 1 : -1));
}

export default function AdminMerchantSettlements() {
  const [settlements, setSettlements] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refDrafts, setRefDrafts] = useState({});
  const [actingId, setActingId] = useState(null);
  const [openMonths, setOpenMonths] = useState({});

  const load = async (status) => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : '';
      const res = await API.get(`/admin/merchant-settlements${params}`);
      setSettlements(res.data);
      const groups = groupByMonth(res.data);
      if (groups.length > 0) setOpenMonths({ [groups[0].key]: true });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const markPaid = async (id) => {
    setActingId(id);
    try {
      await API.put(`/admin/merchant-settlements/${id}/mark-paid`, {
        paid_reference: refDrafts[id] || null,
      });
      await load(filter);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to mark as paid');
    } finally {
      setActingId(null);
    }
  };

  const downloadStatement = async (id) => {
    try {
      const res = await API.get(`/admin/merchant-settlements/${id}/statement-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `eeb_settlement_${id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download statement.');
    }
  };

  const toggleMonth = (key) => setOpenMonths((o) => ({ ...o, [key]: !o[key] }));

  const groups = groupByMonth(settlements);
  const grandTotal = settlements.filter((s) => s.status === 'pending').reduce((sum, s) => sum + Number(s.total_amount), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', margin: 0 }}>
            Merchant Settlements
          </h1>
          <ExportButtons exportPath="/admin/merchant-settlements/export" extraParams={filter ? { status: filter } : {}} />
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Grouped by month. Click a month to browse its settlements.
        </p>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Owed (This View)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-text)' }}>£{grandTotal.toFixed(2)}</div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['pending', 'paid', ''].map((s) => (
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
        ) : groups.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No settlements in this view.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {groups.map((g) => {
              const isOpen = !!openMonths[g.key];
              return (
                <div key={g.key} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div
                    onClick={() => toggleMonth(g.key)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{MONTH_NAMES[g.month]} {g.year}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {g.items.length} settlement{g.items.length !== 1 ? 's' : ''} · £{g.total.toFixed(2)} total
                        {g.pendingCount > 0 && ` · ${g.pendingCount} pending`}
                      </div>
                    </div>
                    <span style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>{isOpen ? '▴' : '▾'}</span>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {g.items.map((s) => (
                        <div key={s.id} style={{ background: 'var(--color-surface-alt)', borderRadius: '8px', padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--color-text)' }}>{s.business_name}</div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>£{s.total_amount} · due {s.due_date}</div>
                            </div>
                            <StatusPill status={s.status} />
                          </div>

                          {s.status === 'pending' && (
                            <div style={{ marginBottom: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                <span>Settlement readiness</span>
                                <span style={{ fontWeight: '700', color: s.readiness_percentage >= 100 ? 'var(--color-success-text)' : 'var(--color-text)' }}>{s.readiness_percentage}%</span>
                              </div>
                              <div style={{ height: '6px', background: 'var(--color-surface)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(s.readiness_percentage, 100)}%`, background: s.readiness_percentage >= 100 ? 'var(--color-success-text)' : 'var(--color-accent)' }} />
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                £{s.amount_backed} collected so far · £{s.amount_unbacked} still in transit
                              </div>
                            </div>
                          )}

                          {s.status === 'paid' && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                              Paid {s.paid_at ? new Date(s.paid_at).toLocaleString() : ''}
                              {s.paid_reference && ` · Ref: ${s.paid_reference}`}
                            </p>
                          )}

                          <button
                            onClick={() => downloadStatement(s.id)}
                            style={{ marginTop: '0.5rem', padding: '0.3rem 0.7rem', background: 'none', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem' }}
                          >
                            Download Statement (PDF)
                          </button>

                          {s.status === 'pending' && (
                            <>
                              <input
                                type="text"
                                placeholder="Optional payment reference"
                                value={refDrafts[s.id] || ''}
                                onChange={(ev) => setRefDrafts((d) => ({ ...d, [s.id]: ev.target.value }))}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                              />
                              <button
                                disabled={actingId === s.id}
                                onClick={() => markPaid(s.id)}
                                style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                              >
                                {actingId === s.id ? '…' : 'Mark as Paid'}
                              </button>
                            </>
                          )}
                        </div>
                      ))}
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
