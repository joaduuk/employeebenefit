import { Link } from 'react-router-dom';
import { useState } from 'react';

const wrap = { minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem 1rem', fontFamily: 'var(--font-body)' };
const card = { maxWidth: '720px', margin: '0 auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 1px 3px rgba(31,42,55,0.06)' };
const h1 = { fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', fontSize: '1.9rem', marginTop: 0 };
const sectionTitle = { fontFamily: 'var(--font-heading)', fontWeight: '400', color: 'var(--color-primary)', fontSize: '1.3rem', marginTop: '2rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' };
const note = { fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '2rem' };
const tabRow = { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' };

const FAQS = {
  General: [
    { q: 'Is EEB a loan or a credit card?', a: "EEB is not designed to work like a conventional credit card or interest-bearing personal loan. It's a workplace benefit designed to give eligible employees access to a controlled amount before their normal payday, with the amount subsequently accounted for through the employer's payroll and settlement process. There is no traditional revolving credit facility or interest-bearing balance." },
    { q: 'What can I actually buy with it?', a: "Essentials only — groceries, pharmacy items, baby supplies, and everyday convenience-store purchases. It's not designed for luxuries, and your employer can further restrict which categories of shop are eligible for your account." },
    { q: "Who's behind EEB?", a: 'EEB is a platform that connects employers, their eligible employees, and approved local merchants, with the payment and settlement process handled digitally throughout.' },
    { q: 'Is my data safe?', a: 'EEB only collects what\u2019s needed to run the benefit responsibly — your work details for verification, your spending limits, and your transaction history. Bank and payout details are held securely and used only for the purposes of running the scheme.' },
  ],
  Employees: [
    { q: 'How do I sign up?', a: 'Register through the app, select your employer from the list (they need to already be approved on EEB), and submit your work email and employee details. Your employer reviews and approves your application.' },
    { q: 'How do I know what my limits are?', a: "Your employer sets these when they approve you — a monthly limit, and optionally daily, weekly, and per-purchase limits too, along with which categories of merchant you can use. If you're not sure what yours are, check your account or ask your employer." },
    { q: 'How does a purchase actually work?', a: 'At an approved shop, the merchant enters the purchase amount and generates a short code. Open the EEB app, enter the code, check the amount, and approve it. No card needed.' },
    { q: 'What happens if I try to spend more than my limit allows?', a: "The app will let you know the purchase can't be approved and explain which limit it would exceed. Nothing is charged, and no explanation is needed at the till." },
    { q: 'When does the amount come out of my pay?', a: "It's tied to your employer's payroll cycle. Everything you use through EEB before the cutoff date is accounted for in your next payslip, as part of the agreed settlement process." },
    { q: 'What happens if I leave my job?', a: "Your access to the benefit ends when your employment does. Any outstanding balance is handled as part of your final pay, according to your employer's process." },
  ],
  Employers: [
    { q: 'What does setting this up involve?', a: 'You register your organisation, set your payroll cycle and a default employee spending limit, and submit for approval. Once approved, you can start approving employees.' },
    { q: 'Do I have to approve every employee myself?', a: "Yes — this keeps the benefit tied to real employees of your company. It takes a minute per application, and you set each employee's individual limits at the same time." },
    { q: 'Can I control what employees spend it on?', a: 'Yes. You can set which categories of merchant are eligible company-wide (e.g. allow supermarkets and pharmacies, block others), and override that for individual employees if needed.' },
    { q: 'How does billing and settlement work?', a: "EEB tracks everything your employees use against your payroll cycle. After your cutoff date, the amounts used in that cycle are settled in line with your payroll timing, so the process stays aligned with how and when you already pay your team." },
    { q: 'Are there costs for employers?', a: "EEB's pricing will depend on the final service and commercial model. Any applicable employer, transaction, or other fees will be clearly explained before an organisation joins the service." },
  ],
  Merchants: [
    { q: 'How do I start accepting EEB payments?', a: 'Register as a merchant, provide your business details and category, and submit for approval. Once approved, you can start accepting payments; a separate step verifies your bank details before payouts are switched on.' },
    { q: 'How does taking a payment work in-store?', a: 'Enter the amount in the EEB app, and it generates a short code for the customer. They enter that code in their own app and approve it — once confirmed, you can complete the sale.' },
    { q: 'When do I get paid?', a: "Once an EEB transaction is approved, it's recorded in the system and the merchant is settled according to the applicable settlement cycle, which is aligned with the employer's payroll timing." },
    { q: "What if a customer's purchase gets declined?", a: "If a purchase exceeds the customer's limit or their account isn't in good standing, the app will let them know it can't be approved. No payment is taken, and the customer is free to use a standard payment method instead." },
    { q: 'Is there a fee to join as a merchant?', a: 'Details on merchant fees will be confirmed as EEB moves toward public launch — check back or contact the EEB team directly for the latest.' },
  ],
};

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--color-border)', padding: '0.9rem 0' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}
      >
        <span style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '0.95rem' }}>{q}</span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>{open ? '−' : '+'}</span>
      </button>
      {open && <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6', marginTop: '0.6rem', marginBottom: 0, fontSize: '0.9rem' }}>{a}</p>}
    </div>
  );
}

export default function Faq() {
  const [tab, setTab] = useState('General');

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={h1}>Frequently Asked Questions</h1>

        <div style={tabRow}>
          {Object.keys(FAQS).map((cat) => (
            <button
              key={cat}
              onClick={() => setTab(cat)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)',
                background: tab === cat ? 'var(--color-primary)' : 'var(--color-surface)',
                color: tab === cat ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <h2 style={sectionTitle}>{tab}</h2>
        <div>
          {FAQS[tab].map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        <p style={note}>
          Have a question that isn't answered here? Reach out to the EEB team directly. For precise definitions
          of how deductions, settlement, disputes, and employment changes are handled, see EEB's Terms of
          Service.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <Link to="/" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
