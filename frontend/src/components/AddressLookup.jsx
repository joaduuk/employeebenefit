// src/components/AddressLookup.jsx
import { useState, useEffect, useRef } from 'react';
import API from '../services/api';

/**
 * Address entry with lookup-assisted autocomplete, falling back to
 * plain manual fields whenever the lookup API is unavailable — network
 * error, no results, rate limit, or monthly quota exhausted. The
 * manual fields always work regardless of lookup status, so a failure
 * here never blocks registration; it just means one extra field to
 * type out by hand.
 *
 * Props:
 *   onAddressChange({ business_address, postcode, latitude, longitude }) —
 *     called whenever the resolved address changes, whether via lookup
 *     selection or manual typing. latitude/longitude are only present
 *     when resolved via lookup (Homedata's retrieve step returns
 *     rooftop-precision coordinates) — they're null for manual entry,
 *     since there's nothing to geocode from free text alone. Field
 *     names are generic ("business_address") so this same component
 *     works on merchant/employer/employee forms — the parent decides
 *     what to call the values it stores.
 */
export default function AddressLookup({ onAddressChange }) {
  const [mode, setMode] = useState('search'); // 'search' | 'postcode' | 'manual'
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [selected, setSelected] = useState(null);

  // Manual fallback fields
  const [manualAddress, setManualAddress] = useState('');
  const [manualPostcode, setManualPostcode] = useState('');

  const debounceRef = useRef(null);

  useEffect(() => {
    if (mode === 'manual' || lookupFailed) return;
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const endpoint = mode === 'postcode' ? '/address-lookup/postcode' : '/address-lookup/find';
        const param = mode === 'postcode' ? 'postcode' : 'q';
        const res = await API.get(`${endpoint}?${param}=${encodeURIComponent(query.trim())}`);
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        // Any failure — network, 502 from our proxy, rate limit —
        // drops straight to manual entry. No retry loop, no error
        // shown as a blocker; the user just keeps going.
        console.warn('Address lookup unavailable, falling back to manual entry:', err);
        setLookupFailed(true);
        setMode('manual');
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query, mode, lookupFailed]);

  const selectSuggestion = async (suggestion) => {
    try {
      const full = await API.get(`/address-lookup/retrieve/${suggestion.uprn}`);
      const d = full.data;
      // Homedata's retrieve response is structured (address_line_1/2/3,
      // town_name, postcode, latitude, longitude) — not a single
      // "address" string, so build a display line from the parts.
      const lines = [d.address_line_1, d.address_line_2, d.address_line_3].filter(Boolean);
      const resolvedAddress = [...lines, d.town_name].filter(Boolean).join(', ') || suggestion.address;
      const resolvedPostcode = d.postcode || suggestion.postcode;
      setSelected({ address: resolvedAddress, postcode: resolvedPostcode });
      setSuggestions([]);
      setQuery('');
      onAddressChange({
        business_address: resolvedAddress,
        postcode: resolvedPostcode,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
      });
    } catch (err) {
      // Retrieve failing after a successful search is rare but
      // possible (quota ran out between the two calls). Same
      // fallback: drop to manual, and pre-fill what we already know
      // from the suggestion so the user isn't starting from scratch.
      // No coordinates available here — manual/partial entries never
      // have them, which is fine, since the existing postcode-geocode
      // step at admin approval covers that gap.
      console.warn('Address retrieve failed, falling back to manual entry:', err);
      setLookupFailed(true);
      setMode('manual');
      setManualAddress(suggestion.address || '');
      setManualPostcode(suggestion.postcode || '');
      onAddressChange({ business_address: suggestion.address || '', postcode: suggestion.postcode || '', latitude: null, longitude: null });
    }
  };

  const changeSelected = () => {
    setSelected(null);
    setQuery('');
  };

  const handleManualChange = (field, value) => {
    if (field === 'address') setManualAddress(value);
    if (field === 'postcode') setManualPostcode(value);
    onAddressChange({
      business_address: field === 'address' ? value : manualAddress,
      postcode: field === 'postcode' ? value : manualPostcode,
      latitude: null,
      longitude: null,
    });
  };

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--color-border)',
    borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box',
  };

  // --- Selected address confirmation ---
  if (selected) {
    return (
      <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem', background: 'var(--color-surface-alt)' }}>
        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{selected.address}</div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{selected.postcode}</div>
        <button
          type="button"
          onClick={changeSelected}
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', padding: 0 }}
        >
          Change address
        </button>
      </div>
    );
  }

  // --- Manual fallback ---
  if (mode === 'manual') {
    return (
      <div>
        {lookupFailed && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>
            Address lookup isn't available right now — please enter your address below.
          </p>
        )}
        <input
          type="text"
          placeholder="Business address"
          value={manualAddress}
          onChange={(ev) => handleManualChange('address', ev.target.value)}
          style={{ ...inputStyle, marginBottom: '0.6rem' }}
        />
        <input
          type="text"
          placeholder="Postcode"
          value={manualPostcode}
          onChange={(ev) => handleManualChange('postcode', ev.target.value)}
          style={inputStyle}
        />
        {!lookupFailed && (
          <button
            type="button"
            onClick={() => { setMode('search'); setManualAddress(''); setManualPostcode(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.5rem', padding: 0 }}
          >
            Use address lookup instead
          </button>
        )}
      </div>
    );
  }

  // --- Search / postcode lookup ---
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <button
          type="button"
          onClick={() => { setMode('search'); setQuery(''); setSuggestions([]); }}
          style={{
            padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
            background: mode === 'search' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: mode === 'search' ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
          }}
        >
          Start typing address
        </button>
        <button
          type="button"
          onClick={() => { setMode('postcode'); setQuery(''); setSuggestions([]); }}
          style={{
            padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
            background: mode === 'postcode' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: mode === 'postcode' ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
          }}
        >
          Enter postcode
        </button>
      </div>

      <input
        type="text"
        placeholder={mode === 'postcode' ? 'e.g. SW1A 1AA' : 'e.g. 10 Downing Street'}
        value={query}
        onChange={(ev) => setQuery(ev.target.value)}
        style={inputStyle}
      />

      {searching && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginTop: '0.4rem' }}>Searching…</p>
      )}

      {suggestions.length > 0 && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: '0.4rem', overflow: 'hidden' }}>
          {suggestions.map((s, idx) => (
            <div
              key={s.uprn || idx}
              onClick={() => selectSuggestion(s)}
              style={{
                padding: '0.6rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem',
                borderBottom: idx < suggestions.length - 1 ? '1px solid var(--color-border)' : 'none',
                background: 'var(--color-surface)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
            >
              {s.address}{s.postcode ? `, ${s.postcode}` : ''}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => { setMode('manual'); setLookupFailed(false); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.5rem', padding: 0 }}
      >
        Can't find your address? Enter it manually
      </button>
    </div>
  );
}
