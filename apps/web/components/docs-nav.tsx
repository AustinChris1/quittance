"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, List, X } from "lucide-react";

export type DocSection = { id: string; title: string; children?: { id: string; title: string }[] };

/** Tracks which heading sits nearest the top of the viewport, so the nav can mark it. */
function useActive(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    const onScroll = () => {
      // The last heading above a line a quarter of the way down is the one being read.
      const line = window.innerHeight * 0.25;
      let current = els[0]?.id ?? "";
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids]);
  return active;
}

function Links({ sections, active, onPick }: { sections: DocSection[]; active: string; onPick?: () => void }) {
  const parentOf = (id: string) => sections.find((s) => s.id === id || s.children?.some((c) => c.id === id))?.id;
  const activeParent = parentOf(active);
  return (
    <ol className="space-y-1">
      {sections.map((s, i) => {
        const on = activeParent === s.id;
        return (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={onPick}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                on ? "bg-mint-wash font-semibold text-mint-ink" : "text-muted hover:bg-paper hover:text-fg"
              }`}
            >
              <span className="w-5 font-[family-name:var(--font-mono)] text-xs opacity-60">{String(i + 1).padStart(2, "0")}</span>
              {s.title}
            </a>
            {s.children && on ? (
              <ol className="mt-1 mb-2 ml-8 space-y-0.5 border-l border-line pl-3">
                {s.children.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`#${c.id}`}
                      onClick={onPick}
                      className={`block rounded-lg px-2 py-1.5 text-[0.82rem] transition-colors ${
                        active === c.id ? "font-semibold text-fg" : "text-faint hover:text-fg"
                      }`}
                    >
                      {c.title}
                    </a>
                  </li>
                ))}
              </ol>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function DocsNav({ sections }: { sections: DocSection[] }) {
  const ids = sections.flatMap((s) => [s.id, ...(s.children ?? []).map((c) => c.id)]);
  const active = useActive(ids);
  const [open, setOpen] = useState(false);
  const current = sections.find((s) => s.id === active || s.children?.some((c) => c.id === active));

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Desktop: the whole outline stays beside the page. */}
      <nav aria-label="Documentation" className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2 lg:block">
        <p className="mb-3 px-3 text-xs font-semibold tracking-[0.14em] text-faint uppercase">On this page</p>
        <Links sections={sections} active={active} />
        <a
          href="#top"
          className="mt-6 inline-flex items-center gap-2 px-3 text-xs text-faint transition-colors hover:text-fg"
        >
          <ArrowUp size={13} />
          Back to top
        </a>
      </nav>

      {/* Phone and tablet: a bar under the header names where you are and opens the outline. */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-2.5 text-sm"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2">
            <List size={16} />
            <span className="text-faint">Contents</span>
            <span className="font-semibold">{current?.title ?? sections[0]?.title}</span>
          </span>
          <span className="font-[family-name:var(--font-mono)] text-xs text-faint">
            {sections.findIndex((s) => s.id === current?.id) + 1}/{sections.length}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="sheet"
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button type="button" aria-label="Close contents" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-[1.75rem] bg-surface p-5 pb-8"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-[0.14em] text-faint uppercase">On this page</p>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full border border-line p-2">
                  <X size={15} />
                </button>
              </div>
              <Links sections={sections} active={active} onPick={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
