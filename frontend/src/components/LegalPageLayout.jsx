import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';

const wrap = { minHeight: '60vh', background: 'var(--color-bg)', padding: '2rem 1rem', fontFamily: 'var(--font-body)' };
const card = { maxWidth: '760px', margin: '0 auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2.5rem' };

export default function LegalPageLayout({ markdown }) {
  return (
    <div style={wrap}>
      <div style={card} className="legal-doc">
        <style>{`
          .legal-doc h1 { font-family: var(--font-heading); font-weight: 400; color: var(--color-primary); font-size: 1.7rem; margin-top: 0; }
          .legal-doc h2 { font-family: var(--font-heading); font-weight: 400; color: var(--color-primary); font-size: 1.2rem; margin-top: 1.75rem; }
          .legal-doc h3 { color: var(--color-primary); font-size: 1rem; margin-top: 1.25rem; }
          .legal-doc p, .legal-doc li { color: var(--color-text-secondary); line-height: 1.6; font-size: 0.92rem; }
          .legal-doc strong { color: var(--color-text); }
          .legal-doc hr { border: none; border-top: 1px solid var(--color-border); margin: 1.5rem 0; }
          .legal-doc table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 1rem 0; }
          .legal-doc th, .legal-doc td { border: 1px solid var(--color-border); padding: 0.5rem; text-align: left; }
          .legal-doc th { background: var(--color-surface-alt); color: var(--color-text); }
        `}</style>
        <ReactMarkdown>{markdown}</ReactMarkdown>
        <p style={{ marginTop: '2rem' }}>
          <Link to="/" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>← Back</Link>
        </p>
      </div>
    </div>
  );
}
