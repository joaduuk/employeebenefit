import { useEffect } from 'react';

export default function LegalDocumentModal({ url, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,55,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--color-surface)', borderRadius: '12px', width: '100%', maxWidth: '760px', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', fontSize: '1.1rem' }}>{title}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>
        <iframe src={url} title={title} style={{ flex: 1, border: 'none', width: '100%' }} />
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', textAlign: 'right', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
