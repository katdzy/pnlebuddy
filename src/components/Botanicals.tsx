// Line drawings in the spirit of pressed flowers, grown from the sprout mark.
// One pen: 1.5 stroke in rose-deep, petals washed in rose-wash. Decorative only.

export type SprigVariant = "bud" | "bloom" | "moon" | "leaf";

/** Which drawing suits the hour: a bud in the morning, open by afternoon, moonlit at night. */
export function sprigForHour(hour: number): SprigVariant {
  if (hour >= 5 && hour < 12) return "bud";
  if (hour >= 12 && hour < 18) return "bloom";
  return "moon";
}

const PEN = {
  fill: "none",
  stroke: "var(--color-accent-deep)",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
} as const;

/** Stroke that draws itself in when the parent has `.drawn`. */
function Ink({ d, late }: { d: string; late?: boolean }) {
  return <path d={d} pathLength={1} className={late ? "ink ink-late" : "ink"} {...PEN} />;
}

function Leaves() {
  return (
    <>
      <path className="wash" d="M59 128 Q40 128 30 108 Q50 110 59 128Z" fill="var(--color-accent-wash)" />
      <path className="wash" d="M61 104 Q80 104 90 86 Q70 88 61 104Z" fill="var(--color-accent-wash)" />
      <path className="wash" d="M60 88 Q49 89 44 78 Q55 79 60 88Z" fill="var(--color-accent-wash)" />
      <Ink d="M59 128 Q40 128 30 108 Q50 110 59 128Z M57 125 Q45 118 36 111" late />
      <Ink d="M61 104 Q80 104 90 86 Q70 88 61 104Z M63 101 Q75 95 85 89" late />
      <Ink d="M60 88 Q49 89 44 78 Q55 79 60 88Z" late />
    </>
  );
}

function Crown({ variant }: { variant: SprigVariant }) {
  if (variant === "bud") {
    return (
      <>
        <path className="wash" d="M60 70 C50 62 50 46 60 38 C70 46 70 62 60 70Z" fill="var(--color-accent-wash)" />
        <Ink d="M60 70 C50 62 50 46 60 38 C70 46 70 62 60 70Z M60 70 Q51 67 48 58 M60 70 Q69 67 72 58 M60 66 Q57 54 60 42" />
      </>
    );
  }
  if (variant === "bloom") {
    const petals = [0, 72, 144, 216, 288];
    return (
      <>
        {petals.map((a) => (
          <ellipse key={a} className="wash" cx="60" cy="38" rx="8" ry="13" transform={`rotate(${a} 60 52)`} fill="var(--color-accent-wash)" />
        ))}
        {petals.map((a) => (
          <g key={a} transform={`rotate(${a} 60 52)`}>
            <Ink d="M60 52 C52 46 52 30 60 25 C68 30 68 46 60 52Z" />
          </g>
        ))}
        <circle className="wash" cx="60" cy="52" r="4" fill="var(--color-accent-deep)" />
      </>
    );
  }
  if (variant === "moon") {
    return (
      <>
        <path className="wash" d="M60 70 C54 65 54 55 60 50 C66 55 66 65 60 70Z" fill="var(--color-accent-wash)" />
        <Ink d="M60 70 C54 65 54 55 60 50 C66 55 66 65 60 70Z M60 70 Q54 68 52 62 M60 70 Q66 68 68 62" />
        <path className="wash" d="M96 14 A17 17 0 1 0 108 44 A13 13 0 1 1 96 14Z" fill="var(--color-accent-wash)" />
        <Ink d="M96 14 A17 17 0 1 0 108 44 A13 13 0 1 1 96 14Z" late />
        <circle className="wash" cx="78" cy="22" r="1.4" fill="var(--color-accent)" />
        <circle className="wash" cx="108" cy="58" r="1.1" fill="var(--color-accent)" />
        <circle className="wash" cx="84" cy="44" r="0.9" fill="var(--color-accent)" />
      </>
    );
  }
  return null;
}

/**
 * A single sprig. `drawn` plays the ink-in once on mount (skipped under reduced motion).
 * The viewBox is 120 × 160; pass a height and the width follows.
 */
export function Sprig({
  variant,
  height = 120,
  drawn = false,
  className = "",
}: {
  variant: SprigVariant;
  height?: number;
  drawn?: boolean;
  className?: string;
}) {
  const leafOnly = variant === "leaf";
  return (
    <svg
      viewBox={leafOnly ? "20 60 80 100" : "0 0 120 160"}
      height={height}
      width={leafOnly ? height * 0.8 : height * 0.75}
      aria-hidden="true"
      focusable="false"
      className={`${drawn ? "drawn" : ""} ${className}`}
    >
      <Ink d={leafOnly ? "M60 156 C58 130 64 104 60 76" : "M60 156 C58 130 64 104 60 70"} />
      <Leaves />
      <Crown variant={variant} />
    </svg>
  );
}

/** A hand-drawn underline for the current tab: a single pen stroke, slightly uneven. */
export function PenUnderline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 6" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={className}>
      <path d="M1.5 4.2 C14 2 26 5.2 40 3.4 S54 2.6 58.5 3" {...PEN} strokeWidth={2} />
    </svg>
  );
}
