import { useEffect, useState } from 'react';
import API from '../services/api';
import ExportButtons from '../components/ExportButtons';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = entityType ? `?entity_type=${entityType}` : '';
      const res = await API.get(`/admin/audit-log${params}`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [entityType]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', margin: 0 }}>
            Audit Log
          </h1>
          <ExportButtons exportPath="/admin/audit-log/export" extraParams={entityType ? { entity_type: entityType } : {}} />
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Every significant state-changing action, most recent first.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {['', 'employer', 'merchant', 'employee_profile', 'transaction', 'billing_cycle', 'merchant_settlement', 'cash_position_entry'].map((t) => (
            <button
              key={t || 'all'}
              onClick={() => setEntityType(t)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)',
                background: entityType === t ? 'var(--color-primary)' : 'var(--color-surface)',
                color: entityType === t ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer', fontWeight: '600', fontSize: '0.78rem', textTransform: 'capitalize',
              }}
            >
              {(t || 'All').replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
        ) : logs.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No entries in this view.
          </p>
        ) : (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
            {logs.map((l, i) => (
              <div key={l.id} style={{ padding: '0.9rem 1.25rem', borderBottom: i < logs.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{l.action}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                      {l.entity_type}{l.entity_id ? ` · ${l.entity_id.slice(0, 8)}…` : ''}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                  {l.actor_email || 'System'} {l.actor_role && `(${l.actor_role})`}
                  {l.details && ` — ${l.details}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
