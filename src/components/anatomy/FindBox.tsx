"use client";

import { useId, useState } from "react";
import { searchAnatomy, type GlossaryTerm, type Structure } from "@/lib/anatomy";
import type { AnatomySystem } from "./types";

type Option = { kind: "structure"; s: Structure } | { kind: "term"; t: GlossaryTerm };

/**
 * "Find a structure": type "femur", "SA node", "loop of Henle". Structures in the model come first; glossary terms the
 * model doesn't have follow, so a search never just fails. In list mode the same text filters the list instead.
 */
export function FindBox({
  query,
  onQuery,
  structures,
  terms,
  systems,
  suggest,
  onStructure,
  onTerm,
}: {
  query: string;
  onQuery: (q: string) => void;
  structures: Structure[];
  terms: GlossaryTerm[];
  systems: Record<string, AnatomySystem>;
  /** Off in list mode, where the list itself shows the matches. */
  suggest: boolean;
  onStructure: (s: Structure) => void;
  onTerm: (t: GlossaryTerm) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = searchAnatomy(query, structures, terms);
  const options: Option[] = [...results.structures.map((s) => ({ kind: "structure" as const, s })), ...results.bookOnly.map((t) => ({ kind: "term" as const, t }))];
  const showList = suggest && open && query.trim().length >= 2;

  function choose(o: Option) {
    setOpen(false);
    if (o.kind === "structure") onStructure(o.s);
    else onTerm(o.t);
  }

  return (
    <div className="relative w-full sm:max-w-sm">
      <label htmlFor={`${id}-q`} className="sr-only">
        Find a structure
      </label>
      <input
        id={`${id}-q`}
        type="search"
        className="field w-full"
        placeholder="Find a structure, e.g. femur"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList && options.length > 0}
        aria-controls={`${id}-list`}
        aria-activedescendant={showList && options[active] ? `${id}-o${active}` : undefined}
        value={query}
        onChange={(e) => {
          onQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, options.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && options[active]) choose(options[active]);
          else if (e.key === "Escape") setOpen(false);
          else return;
          e.preventDefault();
        }}
      />
      {showList && options.length === 0 && (
        <p role="status" className="anatomy-results px-4 py-3 text-small text-ink-muted">
          Nothing by that name in the model or your book&apos;s glossary.
        </p>
      )}
      {showList && options.length > 0 && (
        <div id={`${id}-list`} role="listbox" aria-label="Matches" className="anatomy-results">
          {(["structure", "term"] as const).map((kind) => {
            const group = options.map((o, i) => ({ o, i })).filter(({ o }) => o.kind === kind);
            if (!group.length) return null;
            const label = kind === "structure" ? "In the model" : "In your book, not in the model";
            return (
              <div key={kind} role="group" aria-label={label} className={kind === "term" ? "border-t border-line" : ""}>
                {kind === "term" && (
                  <p aria-hidden="true" className="px-4 pb-1 pt-3 text-meta font-semibold text-ink-muted">
                    {label}
                  </p>
                )}
                {group.map(({ o, i }) => (
                  <div
                    key={o.kind === "structure" ? o.s.fma : `t:${o.t.term}`}
                    id={`${id}-o${i}`}
                    role="option"
                    aria-selected={i === active}
                    className="anatomy-option"
                    // mousedown, not click: the input's blur would close the list first.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(o);
                    }}
                    onMouseEnter={() => setActive(i)}
                  >
                    <span className="truncate">{o.kind === "structure" ? o.s.name : o.t.term}</span>
                    <span className="shrink-0 text-meta text-ink-muted">{o.kind === "structure" ? systems[o.s.system]?.label : "glossary"}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
