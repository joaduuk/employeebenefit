import { useState, useRef, useEffect } from 'react';
import API from '../services/api';

/**
 * Drop this on any list/table page to add CSV/XLSX/JSON export.
 * exportPath: the export endpoint, e.g. "/admin/transactions/export"
 * extraParams: any current filters to carry into the export, e.g. { status: 'pending' }
 */
export default function ExportButtons({ exportPath, extraParams = {} }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const download = async (format) => {
    setDownloading(true);
    setOpen(false);
    try {
      const params = new URLSearchParams({ ...extraParams, format }).toString();
      const res = await API.get(`${exportPath}?${params}`, { responseType: 'blob' });
      const contentDisposition = res.headers['content-disposition'] || '';
      const match = contentDisposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : `export.${format}`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={downloading}
        style={{
          padding: '0.45rem 0.9rem', borderRadius: '6px', border: '1px solid var(--color-border)',
          background: 'var(--color-surface)', color: 'var(--color-text-secondary)',
          cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem',
          display: 'flex', alignItems: 'center', gap: '0.35rem',
        }}
      >
        {downloading ? 'Exporting…' : 'Export'} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '0.35rem', background: 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(31,42,55,0.12)',
          minWidth: '140px', zIndex: 200, overflow: 'hidden',
        }}>
          {['csv', 'xlsx', 'json'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => download(fmt)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.55rem 0.9rem', background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-alt)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
