/**
 * Guilloché: the interlaced rosette engraved on banknotes since the 1800s, drawn from the same
 * parametric curves the original rose engines cut. Each ring is a hypotrochoid; nesting them with
 * a slow phase drift produces the moiré that makes a note hard to forge.
 */

type RosetteProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
  rings?: number;
  /** Points per curve. Higher is smoother and heavier. */
  resolution?: number;
  className?: string;
  strokeWidth?: number;
  /** Set for the scroll-drawn variant; GSAP animates the offset. */
  drawable?: boolean;
  opacity?: number;
};

function hypotrochoid(R: number, r: number, d: number, points: number, phase: number): string {
  const step = (Math.PI * 2) / points;
  let path = "";
  for (let i = 0; i <= points; i += 1) {
    const t = i * step;
    const k = (R - r) / r;
    const x = (R - r) * Math.cos(t + phase) + d * Math.cos(k * t + phase);
    const y = (R - r) * Math.sin(t + phase) - d * Math.sin(k * t + phase);
    path += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return path + "Z";
}

export function Guilloche({
  size = 420,
  rings = 11,
  resolution = 560,
  className = "",
  strokeWidth = 0.55,
  drawable = false,
  opacity = 1,
  ...rest
}: RosetteProps) {
  const half = size / 2;
  const curves = Array.from({ length: rings }, (_, i) => {
    const t = i / Math.max(1, rings - 1);
    // A whole-number ratio closes the curve in one revolution, which is what makes it symmetric.
    const k = 14 + i;
    const dRatio = 2.5 - t * 0.8;
    // A hypotrochoid reaches R - r + d at its widest. Solve R so that reach lands on the target,
    // otherwise the outer rings overshoot the viewBox and get clipped.
    const reach = half * (0.97 - t * 0.32);
    const R = reach / (1 + (dRatio - 1) / k);
    const r = R / k;
    const d = r * dRatio;
    // Golden-angle phases stop every ring's loops lining up in one direction and crowding there.
    const phase = (i * 2.39996323) % (Math.PI * 2);
    return { d: hypotrochoid(R, r, d, resolution, phase), key: i };
  });

  return (
    <svg
      viewBox={`${-half} ${-half} ${size} ${size}`}
      className={className}
      style={{ opacity }}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round">
        {curves.map((c) => (
          <path
            key={c.key}
            d={c.d}
            pathLength={drawable ? 1 : undefined}
            className={drawable ? "engrave-line" : undefined}
            style={drawable ? { animationDelay: `${0.15 + c.key * 0.09}s` } : undefined}
          />
        ))}
      </g>
    </svg>
  );
}

/** The engraved line band that runs under a denomination, as on the edge of a note. */
export function IntaglioBand({
  width = 900,
  height = 56,
  lines = 26,
  className = "",
}: {
  width?: number;
  height?: number;
  lines?: number;
  className?: string;
}) {
  const paths = Array.from({ length: lines }, (_, i) => {
    const y = (i / (lines - 1)) * height;
    const amp = Math.sin((i / lines) * Math.PI) * (height * 0.34);
    let d = `M0 ${y.toFixed(1)}`;
    for (let x = 0; x <= width; x += 18) {
      const wave = Math.sin((x / width) * Math.PI * 6 + i * 0.32) * amp;
      d += `L${x} ${(y + wave).toFixed(1)}`;
    }
    return { d, key: i };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="none" stroke="currentColor" strokeWidth="0.5">
        {paths.map((p) => (
          <path key={p.key} d={p.d} />
        ))}
      </g>
    </svg>
  );
}

/** Repeated micro-lettering, the anti-copy device that reads as a solid rule until you zoom. */
export function MicroText({
  text = "QUITTANCE · A RECEIPT FOR MONEY THAT CROSSED CHAINS · ",
  repeat = 8,
  className = "",
}: {
  text?: string;
  repeat?: number;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden text-[5.5px] leading-none tracking-[0.18em] whitespace-nowrap select-none ${className}`}
      aria-hidden="true"
    >
      {text.repeat(repeat)}
    </div>
  );
}
