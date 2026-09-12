// src/pages/FindMerchants.jsx
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';
import API from '../services/api';

const CATEGORY_LABELS = {
  supermarket: 'Supermarket',
  convenience_store: 'Convenience Store',
  pharmacy: 'Pharmacy',
  baby_supplies: 'Baby Supplies',
  other: 'Other',
};

// Roughly centers on the UK when there's nothing to fit bounds to yet.
const UK_CENTER = [54.5, -3.5];
const UK_DEFAULT_ZOOM = 6;

export default function FindMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [mapRes, statsRes] = await Promise.all([
          API.get('/public/merchants/map'),
          API.get('/public/merchants/stats'),
        ]);
        setMerchants(mapRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error(err);
        setError('Could not load merchant locations right now. Please try again shortly.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const mapCenter = merchants.length > 0
    ? [merchants[0].latitude, merchants[0].longitude]
    : UK_CENTER;
  const mapZoom = merchants.length > 0 ? 11 : UK_DEFAULT_ZOOM;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Find a Participating Merchant
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
          See where you can spend your EEB benefit today.
        </p>

        {stats && (
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: '600', marginBottom: '1.5rem' }}>
            {stats.total_approved_merchants} merchant{stats.total_approved_merchants === 1 ? '' : 's'} currently accepting EEB
            {stats.by_category.length > 0 && (
              <span style={{ fontWeight: '400' }}>
                {' '}— {stats.by_category.map((c) => `${c.count} ${CATEGORY_LABELS[c.category] || c.category}`).join(', ')}
              </span>
            )}
          </p>
        )}

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading map…</p>
        ) : error ? (
          <p style={{ color: 'var(--color-danger-text)', background: 'var(--color-danger-bg)', padding: '1rem', borderRadius: '8px' }}>
            {error}
          </p>
        ) : merchants.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            No merchant locations available yet — check back soon.
          </p>
        ) : (
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '600px', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {merchants.map((m, idx) => (
                <Marker key={idx} position={[m.latitude, m.longitude]}>
                  <Popup>
                    <strong>{m.business_name}</strong>
                    <br />
                    {CATEGORY_LABELS[m.category] || m.category}
                    {m.area && (
                      <>
                        <br />
                        {m.area}
                      </>
                    )}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
}
