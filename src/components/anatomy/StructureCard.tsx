"use client";

import Link from "next/link";
import { ANAPHY_TOPICS } from "@/content/taxonomy";
import { printedPages, type GlossaryTerm, type Structure } from "@/lib/anatomy";
import { CrossIcon } from "../Icons";
import type { Glossary } from "./data";
import type { AnatomySystem } from "./types";

/**
 * What she sees after tapping a structure (or picking a book-only term in search): its name, and her book's glossary
 * entry word for word, saying honestly how that entry relates to it.
 */
export function StructureCard({
  structure,
  term,
  system,
  glossary,
  isolate,
  onIsolate,
  onZoom,
  onClose,
}: {
  /** A structure in the model, or else a glossary term the model doesn't have. */
  structure: Structure | null;
  term: string | null;
  system: AnatomySystem | null;
  glossary: Glossary;
  isolate: boolean;
  onIsolate: (on: boolean) => void;
  onZoom: () => void;
  onClose: () => void;
}) {
  const termName = structure?.term ?? term;
  const entry = termName && glossary.status === "ready" ? glossary.byTerm.get(termName) ?? null : null;
  const topic = ANAPHY_TOPICS.find((t) => t.id === (system?.topicId ?? entry?.topicId));
  const title = structure?.name ?? term ?? "";

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-meta font-semibold text-ink-muted">{system?.label ?? "Your A&P book"}</p>
          <h2 className="mt-0.5 font-display text-title font-bold leading-tight">{title}</h2>
        </div>
        <button type="button" className="btn btn-quiet -mr-2 -mt-1 size-11 shrink-0 !p-0" aria-label="Close" onClick={onClose}>
          <CrossIcon size={20} />
        </button>
      </div>

      {!structure && <p className="mt-2 text-small text-ink-soft">Not in the 3D model: BodyParts3D doesn&apos;t include it.</p>}

      {termName && glossary.status === "loading" && <p className="mt-4 text-small text-ink-muted">Opening your book&apos;s glossary…</p>}
      {entry && <Entry entry={entry} structure={structure} />}
      {structure && !structure.term && (
        <p className="mt-4 text-small text-ink-soft">Your book&apos;s glossary has no entry for this.</p>
      )}

      {topic && (
        <p className="mt-4 text-small text-ink-soft">
          Chapter{topic.bookChapters.length > 1 ? "s" : ""} {range(topic.bookChapters)} of your A&amp;P book · lecture notes ch.{" "}
          {range(topic.lectureChapters)} · <Link href={`/topics/${topic.id}`}>{topic.name}</Link>
        </p>
      )}

      {structure && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary min-h-11" onClick={onZoom}>
            Zoom to it
          </button>
          <button type="button" className="btn btn-secondary min-h-11" aria-pressed={isolate} onClick={() => onIsolate(!isolate)}>
            {isolate ? "Show the rest" : "Show only this"}
          </button>
        </div>
      )}
    </div>
  );
}

function Entry({ entry, structure }: { entry: GlossaryTerm; structure: Structure | null }) {
  const how = structure?.how ?? "exact";
  const pages = printedPages(entry.pages);
  return (
    <section className="mt-4 border-t border-line pt-4" aria-label="From your book's glossary">
      <p className="text-meta font-semibold text-ink-muted">
        {how === "exact" && "Your book's glossary"}
        {how === "general" && "Your book's entry for the broader term"}
        {how === "part" && "It's part of this; your book's entry"}
      </p>
      {/* The title already names it when the match is exact or there's no structure. */}
      {structure && how !== "exact" && <h3 className="mt-1 text-lead font-bold">{entry.term}</h3>}
      {entry.aka.length > 0 && <p className="mt-1 text-small text-ink-soft">aka {entry.aka.join(", ")}</p>}
      {entry.origin && <p className="mt-1 text-small italic text-ink-muted">{entry.origin}</p>}
      {entry.definition.split("\n\n").map((d, i) => (
        <p key={i} className="mt-2 leading-relaxed">
          {d}
        </p>
      ))}
      {pages.length > 0 && (
        <p className="tabular mt-2 text-meta text-ink-muted">
          Book {pages.length > 1 ? "pp." : "p."} {pages.slice(0, 6).join(", ")}
          {pages.length > 6 ? ", …" : ""}
        </p>
      )}
    </section>
  );
}

function range(ch: number[]): string {
  return ch.length > 1 && ch[ch.length - 1] - ch[0] === ch.length - 1 ? `${ch[0]}–${ch[ch.length - 1]}` : ch.join(", ");
}
