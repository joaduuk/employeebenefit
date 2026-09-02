const wrap = { minHeight: '60vh', background: 'var(--color-bg)', padding: '2rem 1rem', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const card = { maxWidth: '480px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2.5rem', textAlign: 'center' };

export default function Contact() {
  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{ marginTop: 0, fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)' }}>Contact Us</h1>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
          A dedicated contact channel is being set up. In the meantime, reach out at{' '}
          <strong style={{ color: 'var(--color-text)' }}>[contact email]</strong>.
        </p>
      </div>
    </div>
  );
}
