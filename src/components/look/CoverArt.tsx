"use client";

import { useId } from "react";
import type { Cover, PatternId } from "@/lib/look";
import { usePhotoUrl } from "@/lib/media";

/*
 * Cover banners. Patterns are drawn from the current tone (--tone-*), so the
 * same cover re-colours itself with the theme or the paper's tag colour.
 * CSS draws the geometric ones; waves and sampaguita need real shapes, so
 * they're inline SVG patterns.
 */

function Waves() {
  const id = useId();
  return (
    <svg aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="120" height="36" patternUnits="userSpaceOnUse">
          <path
            d="M0 18 Q15 6 30 18 T60 18 T90 18 T120 18"
            fill="none"
            stroke="var(--tone-solid)"
            strokeOpacity="0.45"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M0 34 Q15 22 30 34 T60 34 T90 34 T120 34"
            fill="none"
            stroke="var(--tone-solid)"
            strokeOpacity="0.2"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Sampaguita, the national flower: small white five-petal blooms scattered on the tone. */
function Flowers() {
  const id = useId();
  const bloom = (x: number, y: number, r: number, turn: number) => (
    <g transform={`translate(${x} ${y}) rotate(${turn}) scale(${r})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy="-7"
          rx="4.2"
          ry="7"
          transform={`rotate(${a})`}
          fill="var(--color-surface)"
          stroke="var(--tone-solid)"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
      ))}
      <circle r="2.6" fill="var(--tag-yellow-solid)" />
    </g>
  );
  return (
    <svg aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="132" height="96" patternUnits="userSpaceOnUse">
          {bloom(24, 26, 1, 8)}
          {bloom(92, 62, 0.8, -20)}
          {bloom(118, 14, 0.55, 30)}
          {bloom(56, 84, 0.6, 12)}
          <circle cx="70" cy="30" r="2" fill="var(--tone-solid)" fillOpacity="0.4" />
          <circle cx="10" cy="70" r="1.6" fill="var(--tone-solid)" fillOpacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function PatternFill({ pattern }: { pattern: PatternId }) {
  if (pattern === "waves") return <Waves />;
  if (pattern === "flowers") return <Flowers />;
  return null;
}

function Photo({ id }: { id: string }) {
  const url = usePhotoUrl(id);
  // eslint-disable-next-line @next/next/no-img-element -- a local object URL; next/image can't optimise it
  return url ? <img src={url} alt="" /> : null;
}

/** The banner itself. `className` sizes it; tone comes from the nearest data-tone. */
export function CoverArt({ cover, className = "" }: { cover: Cover; className?: string }) {
  if (cover.kind === "none") return <div className={`cover cover-none ${className}`} />;
  if (cover.kind === "photo")
    return (
      <div className={`cover ${className}`}>
        <Photo id={cover.id} />
      </div>
    );
  return (
    <div className={`cover cover-${cover.pattern} ${className}`}>
      <PatternFill pattern={cover.pattern} />
    </div>
  );
}
