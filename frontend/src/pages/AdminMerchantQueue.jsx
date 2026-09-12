import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';
import API from '../services/api';

const STATUS_COLORS = {
  pending: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)', dot: '#9ca3af' },
  under_review: { bg: 'var(--color-surface-alt)', text: 'var(--color-text-secondary)', dot: '#9ca3af' },
  approved: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)', dot: '#16a34a' },
  rejected: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)', dot: '#dc2626' },
  suspended: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)', dot: '#dc2626' },
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'convenience_store', label: 'Convenience Store' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'baby_supplies', label: 'Baby Supplies' },
  { value: 'other', label: 'Other' },
];

const UK_CENTER = [54.5, -3.5];

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.65rem', textTransform: 'capitalize' }}>
      {status.replace('_', ' ')}
    </span>
  );
}

function CapabilityPill({ label, on }) {
  return (
    <span style={{
      background: on ? 'var(--color-success-bg)' : 'var(--color-surface-alt)',
      color: on ? 'var(--color-success-text)' : 'var(--color-text-muted)',
      borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.55rem',
    }}>
      {label}: {on ? 'On' : 'Off'}
    </span>
  );
}

export default function AdminMerchantQueue() {
  const [merchants, setMerchants] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [category, setCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [actingId, setActingId] = useState(null);

  // Debounce the search box so we're not hitting the API on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchMerchants = async (status, cat, q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (cat) params.set('category', cat);
      if (q) params.set('q', q);
      const qs = params.toString();
      const res = await API.get(`/admin/merchants${qs ? `?${qs}` : ''}`);
      setMerchants(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants(filter, category, debouncedSearch);
  }, [filter, category, debouncedSearch]);

  const decide = async (id, action) => {
    setActingId(id);
    try {
      await API.put(`/admin/merchants/${id}/${action}`, {
        decision_note: noteDrafts[id] || null,
      });
      await fetchMerchants(filter, category, debouncedSearch);
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setActingId(null);
    }
  };

  const togglePayouts = async (id, enabled) => {
    setActingId(id);
    try {
      await API.put(`/admin/merchants/${id}/payouts`, { enabled, decision_note: noteDrafts[id] || null });
      await fetchMerchants(filter, category, debouncedSearch);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update payouts');
    } finally {
      setActingId(null);
    }
  };

  const mappableMerchants = useMemo(
    () => merchants.filter((m) => m.latitude != null && m.longitude != null),
    [merchants]
  );
  const unmappedCount = merchants.length - mappableMerchants.length;

  const mapCenter = mappableMerchants.length > 0
    ? [mappableMerchants[0].latitude, mappableMerchants[0].longitude]
    : UK_CENTER;
  const mapZoom = mappableMerchants.length > 0 ? 10 : 6;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Merchant Applications
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Review businesses applying to accept EEB payments.
        </p>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {[{ id: 'list', label: 'List' }, { id: 'map', label: 'Map' }].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)',
                background: view === v.id ? 'var(--color-primary)' : 'var(--color-surface)',
                color: view === v.id ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
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

        {/* Search + category filter — context-sensitive across name, postcode, address, owner */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name, postcode, address, or owner…"
            value={searchInput}
            onChange={(ev) => setSearchInput(ev.target.value)}
            style={{
              flex: '1 1 280px', padding: '0.55rem 0.8rem', border: '1px solid var(--color-border)',
              borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box',
            }}
          />
          <select
            value={category}
            onChange={(ev) => setCategory(ev.target.value)}
            style={{
              padding: '0.55rem 0.8rem', border: '1px solid var(--color-border)', borderRadius: '8px',
              fontSize: '0.85rem', background: 'var(--color-surface)', color: 'var(--color-text-secondary)',
            }}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
        ) : merchants.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No merchants match this view.
          </p>
        ) : view === 'map' ? (
          <div>
            {unmappedCount > 0 && (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                {unmappedCount} merchant{unmappedCount === 1 ? '' : 's'} in this view {unmappedCount === 1 ? "isn't" : "aren't"} shown — missing a postcode or coordinates.
              </p>
            )}
            <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '600px', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mappableMerchants.map((m) => {
                  const color = (STATUS_COLORS[m.application_status] || STATUS_COLORS.pending).dot;
                  return (
                    <CircleMarker
                      key={m.id}
                      center={[m.latitude, m.longitude]}
                      radius={9}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
                    >
                      <Popup>
                        <strong>{m.business_name}</strong>
                        <br />
                        {m.category.replace('_', ' ')} · {m.application_status.replace('_', ' ')}
                        <br />
                        {m.postcode || m.business_address || '—'}
                        <br />
                        {m.owner_user_full_name} · {m.owner_user_email}
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {merchants.map((m) => (
              <div key={m.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{m.business_name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{m.owner_user_full_name} · {m.owner_user_email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusPill status={m.application_status} />
                    <CapabilityPill label="Payments" on={m.payments_enabled} />
                    <CapabilityPill label="Payouts" on={m.payouts_enabled} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', background: 'var(--color-surface-alt)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Category</div>{m.category.replace('_', ' ')}</div>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Address</div>{m.business_address || '—'}</div>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Postcode</div>{m.postcode || '—'}</div>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Reg. Number</div>{m.registration_number || '—'}</div>
                  <div><div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Bank Details</div>{m.payout_account_number ? `${m.payout_account_name} · ${m.payout_sort_code}` : 'Not provided'}</div>
                </div>

                {m.decision_note && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                    Note: {m.decision_note}
                  </p>
                )}

                {(m.application_status === 'pending' || m.application_status === 'under_review') && (
                  <>
                    <input
                      type="text"
                      placeholder="Optional note"
                      value={noteDrafts[m.id] || ''}
                      onChange={(ev) => setNoteDrafts((d) => ({ ...d, [m.id]: ev.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button disabled={actingId === m.id} onClick={() => decide(m.id, 'approve')}
                        style={{ padding: '0.45rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                        {actingId === m.id ? '…' : 'Approve'}
                      </button>
                      <button disabled={actingId === m.id} onClick={() => decide(m.id, 'reject')}
                        style={{ padding: '0.45rem 1rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                        {actingId === m.id ? '…' : 'Reject'}
                      </button>
                    </div>
                  </>
                )}

                {m.application_status === 'approved' && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button disabled={actingId === m.id} onClick={() => togglePayouts(m.id, !m.payouts_enabled)}
                      style={{ padding: '0.45rem 1rem', background: m.payouts_enabled ? 'var(--color-danger-bg)' : 'var(--color-success-bg)', color: m.payouts_enabled ? 'var(--color-danger-text)' : 'var(--color-success-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                      {actingId === m.id ? '…' : m.payouts_enabled ? 'Disable Payouts' : 'Enable Payouts'}
                    </button>
                    <button disabled={actingId === m.id} onClick={() => decide(m.id, 'suspend')}
                      style={{ padding: '0.45rem 1rem', background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                      {actingId === m.id ? '…' : 'Suspend'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
