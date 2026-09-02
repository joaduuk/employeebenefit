import { Link } from 'react-router-dom';

const Check = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function ApprovalCardMockup() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.75rem', width: '280px', boxShadow: '0 20px 50px rgba(31,42,55,0.14)' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Corner Shop, Leeds</div>
      <div style={{ fontSize: '2.1rem', fontWeight: '800', color: 'var(--color-text)', marginBottom: '1.1rem' }}>£12.40</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--color-success-bg)', borderRadius: '10px', padding: '0.7rem 0.9rem' }}>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-success-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={13} color="var(--color-surface)" />
        </div>
        <span style={{ fontWeight: '700', color: 'var(--color-success-text)', fontSize: '0.9rem' }}>Approved</span>
      </div>
    </div>
  );
}

function ChecklistMockup() {
  const rows = [
    { name: 'Amara O.', amount: '£300 limit', done: true },
    { name: 'James P.', amount: '£250 limit', done: true },
    { name: 'Sofia R.', amount: 'Pending', done: false },
  ];
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', width: '300px' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text)', marginBottom: '1rem' }}>Employee limits</div>
      {rows.map((r) => (
        <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: r.done ? 'none' : '1.5px solid var(--color-border)', background: r.done ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {r.done && <Check size={11} color="var(--color-on-primary)" />}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>{r.name}</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{r.amount}</span>
        </div>
      ))}
    </div>
  );
}

function QRMockup() {
  const seed = [1,1,0,1,0,1,1,0, 1,0,1,1,1,0,1,1, 0,1,0,0,0,1,0,1, 1,1,1,1,0,1,1,0, 0,0,1,0,1,0,0,1, 1,1,0,1,1,1,0,1, 0,1,1,0,0,1,1,0, 1,0,1,1,0,1,0,1];
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.75rem', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 14px)', gridTemplateRows: 'repeat(8, 14px)', gap: '2px' }}>
        {seed.map((v, i) => (
          <div key={i} style={{ background: v ? 'var(--color-text)' : 'transparent', borderRadius: '2px' }} />
        ))}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: '700', letterSpacing: '0.15em', color: 'var(--color-primary)' }}>7K3QP</div>
    </div>
  );
}

const sectionWrap = { maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem' };
const h2Style = { fontFamily: 'var(--font-heading)', fontWeight: '400', fontSize: '1.9rem', color: 'var(--color-primary)', marginBottom: '0.75rem' };
const bodyStyle = { color: 'var(--color-text-secondary)', lineHeight: '1.65', fontSize: '1rem', maxWidth: '480px' };
const btnPrimary = { display: 'inline-block', padding: '0.8rem 1.6rem', background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '0.95rem' };
const btnSecondary = { display: 'inline-block', padding: '0.8rem 1.6rem', background: 'transparent', color: 'var(--color-primary)', border: '1.5px solid var(--color-border)', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '0.95rem' };

export default function HomePage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>

      {/* Hero */}
      <section style={{ background: 'var(--color-bg)', padding: '4.5rem 0 5rem' }}>
        <div style={{ ...sectionWrap, display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px', minWidth: '320px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', fontSize: '2.9rem', lineHeight: '1.15', color: 'var(--color-primary)', margin: '0 0 1.25rem' }}>
              Essentials before payday, without the wait.
            </h1>
            <p style={{ ...bodyStyle, fontSize: '1.08rem', marginBottom: '2rem' }}>
              EEB is a workplace benefit that lets approved employees pay for groceries, pharmacy items, and other everyday essentials at participating shops — settled through payroll, not a credit card.
            </p>
            <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
              <Link to="/register" style={btnPrimary}>Get Started</Link>
              <Link to="/faq" style={btnSecondary}>See How It Works</Link>
            </div>
          </div>
          <div style={{ flex: '1 1 280px', display: 'flex', justifyContent: 'center' }}>
            <ApprovalCardMockup />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ ...sectionWrap, display: 'flex', flexWrap: 'wrap', gap: '0' }}>
          {[
            'Free for employees — no fees, no interest, ever',
            'Essentials only — groceries, pharmacy, baby supplies',
            'Spending limits set by your employer — never open-ended',
          ].map((fact, i) => (
            <div
              key={fact}
              style={{
                flex: '1 1 260px', padding: '1.4rem 1.5rem',
                borderLeft: i > 0 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--color-text)', fontWeight: '600', lineHeight: '1.5' }}>{fact}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Employees */}
      <section style={{ padding: '5rem 0' }}>
        <div style={{ ...sectionWrap, display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', display: 'flex', justifyContent: 'center' }}>
            <ApprovalCardMockup />
          </div>
          <div style={{ flex: '1 1 380px', minWidth: '300px' }}>
            <h2 style={h2Style}>For employees</h2>
            <p style={bodyStyle}>
              Once your employer switches on EEB, you can pay for what you actually need at an approved shop — no card, no waiting for payday. Enter a code or scan a QR, check the amount, approve it.
            </p>
            <p style={{ ...bodyStyle, marginTop: '1rem', fontWeight: '600', color: 'var(--color-text)' }}>
              There's no cost to you. No fees, no interest — nothing added to what you spend.
            </p>
          </div>
        </div>
      </section>

      {/* Employers */}
      <section style={{ padding: '5rem 0', background: 'var(--color-surface)' }}>
        <div style={{ ...sectionWrap, display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap-reverse' }}>
          <div style={{ flex: '1 1 380px', minWidth: '300px' }}>
            <h2 style={h2Style}>For employers</h2>
            <p style={bodyStyle}>
              You're in control from day one — set your payroll schedule, approve each employee, and decide their individual spending limits and which categories of shop they can use.
            </p>
            <p style={{ ...bodyStyle, marginTop: '1rem' }}>
              A benefit you can offer your team without touching payroll software or negotiating with retailers.
            </p>
          </div>
          <div style={{ flex: '1 1 320px', display: 'flex', justifyContent: 'center' }}>
            <ChecklistMockup />
          </div>
        </div>
      </section>

      {/* Merchants */}
      <section style={{ padding: '5rem 0' }}>
        <div style={{ ...sectionWrap, display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', display: 'flex', justifyContent: 'center' }}>
            <QRMockup />
          </div>
          <div style={{ flex: '1 1 380px', minWidth: '300px' }}>
            <h2 style={h2Style}>For merchants</h2>
            <p style={bodyStyle}>
              Accept EEB payments without installing new hardware. Enter an amount, a code appears, the customer approves it on their phone — that's the whole transaction.
            </p>
            <p style={{ ...bodyStyle, marginTop: '1rem' }}>
              Settlements are generated automatically on a predictable monthly schedule.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '5rem 0', background: 'var(--color-surface)' }}>
        <div style={sectionWrap}>
          <h2 style={{ ...h2Style, marginBottom: '2.5rem' }}>How it works</h2>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { n: '1', title: 'Merchant enters the amount', body: 'A short code (or QR) appears on their screen — nothing else is needed at the till.' },
              { n: '2', title: 'Employee approves it', body: 'They check the amount in the EEB app and approve it, within their own spending limit.' },
              { n: '3', title: 'Everyone gets settled', body: 'The purchase is deducted through payroll, and the merchant is paid on schedule.' },
            ].map((step, i) => (
              <div key={step.n} style={{ flex: '1 1 260px', position: 'relative', paddingLeft: '3.2rem' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, width: '2.4rem', height: '2.4rem', borderRadius: '50%',
                  background: 'var(--color-primary)', color: 'var(--color-on-primary)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.05rem',
                }}>
                  {step.n}
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 0.5rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: '1.55', margin: 0 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Essentials focus */}
      <section style={{ padding: '3rem 0' }}>
        <div style={{ ...sectionWrap, textAlign: 'center' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Built around what people actually need</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {['Groceries', 'Pharmacy', 'Baby supplies', 'Everyday essentials'].map((item, i) => (
              <span key={item} style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--color-primary)', borderLeft: i > 0 ? '1px solid var(--color-border)' : 'none', paddingLeft: i > 0 ? '2rem' : 0 }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: 'var(--color-primary)', padding: '3.5rem 0' }}>
        <div style={{ ...sectionWrap, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: '400', fontSize: '1.9rem', color: 'var(--color-on-primary)', margin: '0 0 1.5rem' }}>
            Ready to see it in action?
          </h2>
          <div style={{ display: 'flex', gap: '0.9rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{ ...btnPrimary, background: 'var(--color-on-primary)', color: 'var(--color-primary)' }}>Register Your Company</Link>
            <Link to="/login" style={{ ...btnSecondary, borderColor: 'var(--color-on-primary)', color: 'var(--color-on-primary)' }}>Sign In</Link>
          </div>
        </div>
      </section>

    </div>
  );
}
