import { NearMark, EthereumMark } from "./chains";
import { MessageSquareWarning } from "lucide-react";

const STOPS = [
  {
    date: "11 Sep",
    title: "575,830 TRX lands",
    detail: "Credited to intents.near",
    source: "NEAR chain",
    tone: "neutral" as const,
    Icon: NearMark,
  },
  {
    date: "27 Sep",
    title: "190,995.29 USDT delivered",
    detail: "Reached the recipient",
    source: "Ethereum, block 26,068,435",
    tone: "good" as const,
    Icon: EthereumMark,
  },
  {
    date: "9 Oct",
    title: "Reported as lost",
    detail: "Still unanswered",
    source: "Forum thread 42664",
    tone: "warn" as const,
    Icon: MessageSquareWarning,
  },
];

const GAPS = ["16 days to settle", "12 days after it arrived"];

const TONE = {
  neutral: { ring: "ring-[#2a3f4e]", text: "text-[#dbe5ec]" },
  good: { ring: "ring-tally", text: "text-tally-bright" },
  warn: { ring: "ring-caution/60", text: "text-caution" },
};

export function Journey() {
  return (
    <div className="mt-12">
      <div className="grid gap-0 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start">
        {STOPS.map((stop, i) => (
          <div key={stop.date} className="contents">
            <div className="reveal py-6 md:py-0" style={{ animationDelay: `${i * 0.12}s` }}>
              <div
                className={`flex size-11 items-center justify-center rounded-xl ring-1 ${TONE[stop.tone].ring} ${TONE[stop.tone].text}`}
              >
                <stop.Icon size={20} />
              </div>
              <p className="mt-4 font-[family-name:var(--font-mono)] text-xs text-mute">{stop.date}</p>
              <p className={`mt-1.5 text-[1.05rem] leading-snug font-medium ${TONE[stop.tone].text}`}>
                {stop.title}
              </p>
              <p className="mt-1 text-sm text-[#b8c7d2]">{stop.detail}</p>
              <p className="mt-2 font-[family-name:var(--font-mono)] text-[0.7rem] text-mute">{stop.source}</p>
            </div>

            {i < GAPS.length ? (
              <div
                className="track-in hidden md:flex md:w-40 md:flex-col md:items-center md:pt-5 lg:w-56"
                style={{ animationDelay: `${0.2 + i * 0.12}s` }}
              >
                <div className="h-px w-full bg-gradient-to-r from-[#1e3140] via-[#2a3f4e] to-[#1e3140]" />
                <span className="mt-2 font-[family-name:var(--font-mono)] text-[0.68rem] text-mute">
                  {GAPS[i]}
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* The same gaps, stated plainly, for narrow screens where the track is hidden. */}
      <p className="mt-4 font-[family-name:var(--font-mono)] text-xs text-mute md:hidden">
        16 days to settle, then reported lost 12 days after it arrived.
      </p>
    </div>
  );
}
