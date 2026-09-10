import { useEffect, useRef, useState } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const API_ORIGIN = new URL(API.defaults.baseURL).origin;
const fullPhotoUrl = (path) => (path ? `${API_ORIGIN}${path}` : null);

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const [merchantLocation, setMerchantLocation] = useState(null);
  const [settingLocation, setSettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationSuccess, setLocationSuccess] = useState(null);

  const isMerchant = user?.role === 'merchant';

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/profile/me');
      setProfile(res.data);
      setFullName(res.data.full_name);
      setPhone(res.data.phone || '');
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadMerchantLocation = async () => {
    try {
      const res = await API.get('/merchant/location');
      setMerchantLocation(res.data);
    } catch (err) {
      // fine — just means it's not been set yet, or a transient error
    }
  };

  useEffect(() => {
    load();
    if (isMerchant) loadMerchantLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDetails = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await API.put('/profile/me', { full_name: fullName, phone: phone || null });
      setProfile(res.data);
      setSuccess('Saved.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await API.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(res.data);
      setSuccess('Photo updated.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await API.delete('/profile/photo');
      setProfile(res.data);
      setSuccess('Photo removed.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove photo');
    }
  };

  const setShopLocation = () => {
    setLocationError(null);
    setLocationSuccess(null);
    if (!navigator.geolocation) {
      setLocationError('Location isn\u2019t available on this device/browser.');
      return;
    }
    setSettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await API.put('/merchant/location', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setMerchantLocation(res.data);
          setLocationSuccess('Shop location saved.');
        } catch (err) {
          setLocationError(err.response?.data?.detail || 'Failed to save location.');
        } finally {
          setSettingLocation(false);
        }
      },
      () => {
        setLocationError('Location access was denied or unavailable. You can try again any time.');
        setSettingLocation(false);
      },
      { timeout: 8000 }
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>Loading…</p>
      </div>
    );
  }

  const hasLocation = merchantLocation?.latitude != null && merchantLocation?.longitude != null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(31,42,55,0.06)' }}>
        <h1 style={{ marginTop: 0, fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)' }}>
          My Profile
        </h1>

        {error && <p style={{ color: 'var(--color-danger-text)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
        {success && <p style={{ color: 'var(--color-success-text)', fontSize: '0.85rem', marginBottom: '1rem' }}>{success}</p>}

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 0.75rem',
              background: profile?.photo_url ? `url(${fullPhotoUrl(profile.photo_url)}) center/cover` : 'var(--color-surface-alt)',
              border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', color: 'var(--color-text-muted)',
            }}
          >
            {!profile?.photo_url && '👤'}
          </div>

          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
            >
              {uploading ? 'Uploading…' : profile?.photo_url ? 'Change Photo' : 'Add Photo'}
            </button>
            {profile?.photo_url && (
              <button
                onClick={removePhoto}
                style={{ padding: '0.5rem 1rem', background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
              >
                Remove
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Optional — JPEG, PNG, or WEBP, up to 5MB.
          </p>
        </div>

        <form onSubmit={saveDetails}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--color-text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--color-text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--color-text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Email</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box', background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        {isMerchant && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              Shop Location
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
              Set this once, ideally while you're physically at your shop — every future transaction uses this saved location automatically, so you never need to share your location again at checkout.
            </p>

            {hasLocation ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-success-text)', marginBottom: '0.75rem' }}>
                ✓ Location saved ({merchantLocation.latitude.toFixed(5)}, {merchantLocation.longitude.toFixed(5)})
              </p>
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                Not set yet — tap below while you're at your shop.
              </p>
            )}

            {locationError && <p style={{ color: 'var(--color-danger-text)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{locationError}</p>}
            {locationSuccess && <p style={{ color: 'var(--color-success-text)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{locationSuccess}</p>}

            <button
              onClick={setShopLocation}
              disabled={settingLocation}
              style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface-alt)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}
            >
              {settingLocation ? 'Getting location…' : hasLocation ? 'Update My Shop\u2019s Location' : 'Set My Shop\u2019s Location'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
