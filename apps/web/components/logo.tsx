/**
 * The mark is a split tally. A debt was notched across a stick, then split lengthwise so each
 * party held half; matching the halves proved the obligation was discharged. Quittance matches
 * the deposit half to the delivery half, so the notches only read as whole when they agree.
 */
export function TallyMark({
  size = 32,
  className = "",
  mono = false,
}: {
  size?: number;
  className?: string;
  mono?: boolean;
}) {
  const accent = mono ? "currentColor" : "var(--mint-ink)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M9 5 V27" />
        <path d="M9 11 H14.5" />
        <path d="M9 16 H14.5" />
        <path d="M9 21 H14.5" />
      </g>
      <g stroke={accent} strokeWidth="2.6" strokeLinecap="round">
        <path d="M23 5 V27" />
        <path d="M17.5 11 H23" />
        <path d="M17.5 16 H23" />
        <path d="M17.5 21 H23" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <TallyMark size={26} />
      <span className="text-[1.3rem] leading-none font-semibold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 108' }}>
        Quittance
      </span>
    </span>
  );
}
