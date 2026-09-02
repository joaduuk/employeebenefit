import { Link } from 'react-router-dom';

const wrap = { minHeight: '70vh', background: 'var(--color-bg)', padding: '3rem 1rem 4rem', fontFamily: 'var(--font-body)' };
const card = { maxWidth: '680px', margin: '0 auto' };
const h2Style = { fontFamily: 'var(--font-heading)', fontWeight: '400', fontSize: '1.35rem', color: 'var(--color-primary)', marginTop: '2rem', marginBottom: '0.75rem' };
const pStyle = { color: 'var(--color-text-secondary)', lineHeight: '1.7', fontSize: '1rem', marginBottom: '1rem' };

export default function Founder() {
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {/* Placeholder avatar — swap for a real <img src="..." /> when ready */}
          <div style={{
            width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 1rem',
            background: 'var(--color-primary)', color: 'var(--color-on-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: '400',
          }}>
            JA
          </div>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--color-text)', margin: 0 }}>John Adu</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>Founder, EEB</p>
        </div>

        <blockquote style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: '1.25rem', margin: '0 0 2rem' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: '400', color: 'var(--color-text)', lineHeight: '1.5', fontStyle: 'italic', margin: 0 }}>
            "I built EEB because fintech keeps innovating for people who already have options — and leaves behind everyone else."
          </p>
        </blockquote>

        <h2 style={h2Style}>The gap I kept seeing</h2>
        <p style={pStyle}>
          Most fintech innovation gets built for people who already have options — good credit, steady income, banks competing for their attention. The people who get left out are easy to overlook precisely because nobody's building for them: the employee who needs milk and nappies three days before payday, and the corner shop down the road that's never once been offered the payment technology the supermarket chain next to it takes for granted.
        </p>
        <p style={pStyle}>
          I kept noticing both, separately, until I realised they were really the same problem — private individuals and small, independent businesses sitting on opposite sides of the same gap fintech had quietly stepped over.
        </p>

        <h2 style={h2Style}>Building something for both sides</h2>
        <p style={pStyle}>
          EEB is my answer to both at once. It gives employees a way to cover essentials without waiting on payday or reaching for expensive credit. And it gives small, independent merchants — the shops that make up most of our high streets but rarely get a seat at the fintech table — access to the same modern payment tools the big chains have had for years.
        </p>
        <p style={pStyle}>
          It's not one product with a side benefit. It's one idea, built for two groups who needed it equally.
        </p>

        <h2 style={h2Style}>Why "essentials"</h2>
        <p style={pStyle}>
          Everything about EEB comes back to that word. Not a general-purpose spending wallet, not a credit line to be maximised — groceries, pharmacy items, baby supplies. The things people actually need, from the shops that actually need the business. That focus shaped every decision in how EEB was built, right down to which purchases the app will and won't approve.
        </p>

        <h2 style={h2Style}>Where EEB is today</h2>
        <p style={pStyle}>
          EEB is in active development. This isn't about disrupting anything for its own sake — it's about making sure ordinary people and the small businesses they depend on aren't the last ones to benefit from what fintech can actually do.
        </p>

        <p style={{ ...pStyle, fontWeight: '600', color: 'var(--color-text)', marginTop: '2rem' }}>
          — John Adu
        </p>

        <p style={{ marginTop: '2.5rem' }}>
          <Link to="/" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
