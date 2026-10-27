import type { ReactNode } from "react";

/**
 * Entrance animation, in CSS rather than JavaScript.
 *
 * Two earlier attempts hid content: a scroll-triggered reveal left sections invisible when the
 * observer fired late, and a mount-triggered one left the whole page blank until hydration. A CSS
 * animation paints on the first frame and needs no JavaScript at all.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`reveal ${className}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
