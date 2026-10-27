const NOTCHES = [26, 48, 70, 92];

/**
 * The product's mechanic, drawn. Two halves of a split tally arrive from opposite sides and the
 * notches only line up when the deposit and the delivery agree. Animated in CSS so it paints
 * without waiting for JavaScript.
 */
export function TallyMatch({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 260 130"
        className="w-full"
        role="img"
        aria-label="Two halves of a split tally meeting, labelled deposit and delivery"
      >
        <g className="slide-left" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M96 18 V112" />
          {NOTCHES.map((y) => (
            <path key={`l-${y}`} d={`M60 ${y} H96`} />
          ))}
        </g>

        <g
          className="slide-right"
          style={{ animationDelay: "0.08s" }}
          stroke="var(--color-tally-bright)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M164 18 V112" />
          {NOTCHES.map((y) => (
            <path key={`r-${y}`} d={`M164 ${y} H200`} />
          ))}
        </g>

        {/* The seam closes last: the moment the two sides are proven to agree. */}
        <g
          className="seam-in"
          style={{ animationDelay: "0.75s" }}
          stroke="var(--color-tally-bright)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        >
          {NOTCHES.map((y) => (
            <path key={`seam-${y}`} d={`M96 ${y} H164`} strokeDasharray="3 7" />
          ))}
        </g>

        <text x="60" y="126" fill="var(--color-mute)" style={{ font: "500 10px var(--font-mono)" }}>
          DEPOSIT
        </text>
        <text
          x="200"
          y="126"
          textAnchor="end"
          fill="var(--color-tally-bright)"
          style={{ font: "500 10px var(--font-mono)" }}
        >
          DELIVERY
        </text>
      </svg>
    </div>
  );
}
