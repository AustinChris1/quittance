/** Simplified chain marks, drawn as geometry so they inherit theme colour and stay crisp at any size. */

type MarkProps = { size?: number; className?: string };

const box = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24" });

export function NearMark({ size = 24, className = "" }: MarkProps) {
  return (
    <svg {...box(size)} className={className} fill="none" aria-hidden="true">
      <path
        d="M4 19V5l7.2 9.2a1 1 0 0 0 1.78-.62V8.4M20 5v14l-7.2-9.2a1 1 0 0 1-.2-.6V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EthereumMark({ size = 24, className = "" }: MarkProps) {
  return (
    <svg {...box(size)} className={className} fill="none" aria-hidden="true">
      <path d="M12 2.5 5.5 12.3 12 16l6.5-3.7L12 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5.5 13.8 12 21.5l6.5-7.7L12 17.6 5.5 13.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function TronMark({ size = 24, className = "" }: MarkProps) {
  return (
    <svg {...box(size)} className={className} fill="none" aria-hidden="true">
      <path d="M3.5 4.5 20 8l-7.4 12L3.5 4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3.5 4.5 12.6 20M20 8l-7.4 1.6L3.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function BitcoinMark({ size = 24, className = "" }: MarkProps) {
  return (
    <svg {...box(size)} className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9.6 7.6h3.1a2.1 2.1 0 1 1 0 4.2H9.6m0 0h3.6a2.1 2.1 0 1 1 0 4.2H9.6m0-8.4v8.4M11 6v1.6m0 8.4V18m2.2-12v1.6m0 8.4V18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BaseMark({ size = 24, className = "" }: MarkProps) {
  return (
    <svg {...box(size)} className={className} fill="none" aria-hidden="true">
      <path
        d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 8.9-7.6H12.8a1.4 1.4 0 0 1 0-2.8h8.1A9 9 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SolanaMark({ size = 24, className = "" }: MarkProps) {
  return (
    <svg {...box(size)} className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M6.6 7.2h11.2L15.4 9.6H4.2L6.6 7.2Z" strokeLinejoin="round" />
        <path d="M6.6 11.2h11.2l-2.4 2.4H4.2l2.4-2.4Z" strokeLinejoin="round" />
        <path d="M6.6 15.2h11.2l-2.4 2.4H4.2l2.4-2.4Z" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export const CHAINS = [
  { name: "NEAR", Mark: NearMark },
  { name: "Ethereum", Mark: EthereumMark },
  { name: "Tron", Mark: TronMark },
  { name: "Bitcoin", Mark: BitcoinMark },
  { name: "Base", Mark: BaseMark },
  { name: "Solana", Mark: SolanaMark },
] as const;
