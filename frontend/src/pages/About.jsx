import { Link } from 'react-router-dom';

const wrap = { minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem 1rem', fontFamily: 'var(--font-body)' };
const card = { maxWidth: '720px', margin: '0 auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 1px 3px rgba(31,42,55,0.06)' };
const h1 = { fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', fontSize: '1.9rem', marginTop: 0 };
const h2 = { fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', fontSize: '1.3rem', marginTop: '2rem' };
const h3 = { fontWeight: '700', color: 'var(--color-primary)', fontSize: '1.05rem', marginTop: '1.5rem', marginBottom: '0.5rem' };
const p = { color: 'var(--color-text-secondary)', lineHeight: '1.6' };
const lead = { ...p, fontSize: '1.1rem', color: 'var(--color-text)', background: 'var(--color-surface-alt)', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)' };
const ul = { ...p, paddingLeft: '1.25rem' };
const hr = { border: 'none', borderTop: '1px solid var(--color-border)', margin: '2rem 0' };
const essentials = { textAlign: 'center', fontWeight: '700', color: 'var(--color-primary)', fontSize: '1.05rem', margin: '1.5rem 0' };
const note = { fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '2rem' };

export default function About() {
  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={h1}>What is EEB?</h1>

        <p style={lead}>
          Need essentials before payday? EEB lets eligible employees access part of their available earnings
          before payday, through approved merchants, with the amount settled through payroll.
        </p>
        <p style={p}>
          Three people make it work: <strong style={{ color: 'var(--color-text)' }}>Employer → Employee → Merchant.</strong> That's the heart of EEB.
        </p>

        <h2 style={h2}>What is EEB, in full?</h2>
        <p style={p}>
          EEB — Employee Essential Benefit — is a workplace benefit that helps eligible employees access money
          for essential everyday purchases before payday.
        </p>
        <p style={p}>
          Instead of waiting until payday, an employee can use EEB at participating merchants for approved
          essentials — groceries, pharmacy items, baby supplies, and other everyday necessities.
        </p>
        <p style={p}>
          The employee uses the EEB app to approve each purchase, while the employer sets the rules and spending
          limits. The amount used through EEB is then accounted for through the employer's payroll and
          settlement process.
        </p>
        <p style={p}>
          No card is required at the shop, and employees only ever have access to the amount and categories
          their employer allows.
        </p>

        <h2 style={h2}>How EEB works</h2>

        <h3 style={h3}>👤 Employees</h3>
        <p style={p}>Once your employer offers EEB, you register and submit your details for approval. Your employer decides your spending limits, which may include:</p>
        <ul style={ul}>
          <li>Monthly limit</li>
          <li>Weekly limit</li>
          <li>Daily limit</li>
          <li>Maximum amount per purchase</li>
          <li>Eligible spending categories</li>
        </ul>
        <p style={p}>At an approved merchant, the merchant enters the purchase amount and generates a short code. You enter that code in your EEB app, check the amount, and approve the transaction.</p>

        <h3 style={h3}>🏢 Employers</h3>
        <p style={p}>EEB gives employers control over the benefit from end to end. You can:</p>
        <ul style={ul}>
          <li>Register your organisation</li>
          <li>Set your payroll cycle</li>
          <li>Set default employee limits</li>
          <li>Approve employees</li>
          <li>Set individual employee limits</li>
          <li>Control eligible merchant categories</li>
          <li>Monitor employee transactions</li>
          <li>Manage the payroll and settlement process</li>
        </ul>

        <h3 style={h3}>🏪 Merchants</h3>
        <p style={p}>Approved merchants can accept EEB payments without installing specialist payment terminals: customer wants to pay with EEB → merchant enters the amount → EEB generates a short code → the customer enters it and approves → transaction confirmed → merchant is settled according to the agreed settlement cycle.</p>

        <hr style={hr} />

        <h2 style={h2}>Why EEB?</h2>
        <p style={p}>
          Payday doesn't always arrive when life needs it. EEB is designed to bridge that timing gap — not with
          an unrestricted line of credit, but with controlled access to essential spending, set and managed by
          the employer throughout.
        </p>
        <p style={essentials}>Groceries • Pharmacy • Baby supplies • Everyday essentials</p>

        <hr style={hr} />

        <p style={p}>
          Have more questions? Read the <Link to="/faq" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>full FAQ</Link>.
        </p>

        <p style={note}>
          EEB is currently in active development. Features, limits, merchant categories, and pricing described
          here reflect the platform as it's being built and may evolve before public launch. Full terms,
          regulatory disclosures, and legal definitions are set out separately in EEB's Terms of Service.
        </p>
      </div>
    </div>
  );
}
