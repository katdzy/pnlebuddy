"use client";

import type { Structure } from "@/lib/anatomy";
import type { AnatomySystem, Layer } from "./types";

const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * The same structures as a list, by system: the way in for a screen reader (the 3D canvas isn't usable with one), and
 * a quick way to browse. The search box filters it.
 */
export function StructureList({
  order,
  systems,
  structures,
  layers,
  query,
  selected,
  onSelect,
}: {
  order: string[];
  systems: Record<string, AnatomySystem>;
  structures: Structure[];
  layers: Record<string, Layer>;
  query: string;
  selected: string | null;
  onSelect: (s: Structure) => void;
}) {
  const q = fold(query);
  const groups = order
    .map((id) => ({
      id,
      items: structures
        .filter((s) => s.system === id && (!q || fold(s.name).includes(q) || (s.term && fold(s.term).includes(q))))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.items.length);

  if (!groups.length) return <p className="py-8 text-ink-muted">Nothing in the model matches “{query}”.</p>;

  return (
    <div className="space-y-2">
      {groups.map((g) => (
        // Re-keyed by the query so typing opens every group with a match; otherwise the systems that are on start open.
        <details key={`${g.id}:${q ? "q" : ""}`} open={Boolean(q) || layers[g.id] !== "hidden"} className="border-b border-line pb-2">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: `var(${systems[g.id].color})` }} />
            {systems[g.id].label}
            <span className="tabular font-normal text-ink-muted">{g.items.length}</span>
          </summary>
          <ul className="grid gap-x-4 sm:grid-cols-2">
            {g.items.map((s) => (
              <li key={s.fma}>
                <button
                  type="button"
                  aria-pressed={selected === s.fma}
                  className={`flex min-h-11 w-full items-center rounded-control px-2 text-left text-small hover:bg-sunken ${selected === s.fma ? "bg-accent-wash font-bold text-accent-ink" : ""}`}
                  onClick={() => onSelect(s)}
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
