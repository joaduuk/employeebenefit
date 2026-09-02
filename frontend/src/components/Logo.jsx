// frontend/src/components/Logo.jsx
// Primary EEB wordmark — DM Serif Display italic + a green checkmark
// touching the final "B". Relies on the font already loaded by
// index.html (make sure that link includes :ital@0;1, not just the
// regular style) — no separate font request from this component.
//
// If the checkmark doesn't sit exactly where you want against the "B"
// once you see it rendered live, nudge the two x values marked NUDGE
// below — this was positioned from a preview render, not a
// pixel-measured one, and DM Serif Display's metrics differ slightly
// from the earlier Playfair Display version.

export default function Logo({ height = 40 }) {
  return (
    <svg
      viewBox="0 0 220 90"
      height={height}
      width={height * (220 / 90)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="EEB"
    >
      <text
        x="0" y="65"
        style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic' }}
        fontSize="58"
        fill="#1B3A5C"
      >
        EEB
      </text>
      {/* NUDGE: adjust the two x values below (154 and 186) to move the
          checkmark left/right relative to the final "B" */}
      {/* <path d="M154 52 L164 62 L186 34" fill="none" stroke="#2F9E6E" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /> */}
      <path d="M110 52 L120 62 L142 34" fill="none" stroke="#2F9E6E" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
