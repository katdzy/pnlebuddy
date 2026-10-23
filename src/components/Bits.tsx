"use client";

// Small shared display pieces.

import { getPaper, type PaperId } from "@/content/taxonomy";
import { BAND_LABEL, type Band } from "@/lib/grading";
import { iconFor, toneFor, type ToneId } from "@/lib/look";
import { useLook } from "@/lib/lookStore";
import { Sprig } from "./Botanicals";

/** The colour she gave a paper. */
export function usePaperTone(paperId: PaperId): ToneId {
  return toneFor(useLook(), paperId);
}

/** NP1…NP5 as a select tag in that paper's colour. */
export function PaperTag({ paperId, long = false, className = "" }: { paperId: PaperId; long?: boolean; className?: string }) {
  const p = getPaper(paperId);
  const tone = usePaperTone(paperId);
  return (
    <span className={`tag tag-dot ${className}`} data-tone={tone}>
      {long ? `${p?.short} · ${p?.name}` : p?.short}
    </span>
  );
}

/** The paper's own emoji, for list headers. */
export function PaperIcon({ paperId, className = "" }: { paperId: PaperId; className?: string }) {
  const icon = iconFor(useLook(), `paper:${paperId}`);
  if (!icon) return null;
  return (
    <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center leading-none ${className}`}>
      {icon}
    </span>
  );
}

const BAND_TONE: Record<Band, string> = {
  passing: "green",
  "below-passing": "gray",
  "below-floor": "",
};

export function BandChip({ band, short = false }: { band: Band; short?: boolean }) {
  const label = short ? { passing: "75%+", "below-passing": "60–74%", "below-floor": "Under 60%" }[band] : BAND_LABEL[band];
  // Under the floor uses the soft "not quite" colour, never red.
  const style = band === "below-floor" ? { background: "var(--color-miss-wash)", color: "var(--color-miss)" } : undefined;
  return (
    <span className="tag" data-tone={BAND_TONE[band] || undefined} style={style}>
      {label}
    </span>
  );
}

/** A thin bar. `value` and `max` are counts; `tone` picks the colour (a tag tone, or the theme accent). */
export function Meter({ value, max, label, tone = "accent" }: { value: number; max: number; label: string; tone?: ToneId | "accent" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="bar" data-tone={tone}>
      <span style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  );
}

/** Notion-style checkbox. The whole 44px square is the hit area. */
export function Tick({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="tick-hit"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <span className="tick">
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

export function SectionTitle({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} className={`text-lead font-bold ${className}`}>
      {children}
    </h2>
  );
}

/** Empty state: a pressed leaf beside one plain sentence on what will appear here. */
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-[60ch] items-center gap-5 border-y border-line py-6">
      <Sprig variant="leaf" height={64} className="shrink-0 opacity-80" />
      <p className="text-ink-soft">{children}</p>
    </div>
  );
}

export function fmtPct(p: number | null): string {
  return p === null ? "–" : `${Math.round(p)}%`;
}
