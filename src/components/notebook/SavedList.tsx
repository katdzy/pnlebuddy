"use client";

import { getTopic, topicLabel, type PaperId } from "@/content/taxonomy";
import { useContent } from "@/lib/content";
import { actions } from "@/lib/store";
import { EmptyNote } from "../Bits";

export function SavedList({ ids, paper }: { ids: string[]; paper: PaperId | "all" }) {
  const { bank } = useContent();
  const items = ids
    .map((id) => bank?.question(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .filter((q) => paper === "all" || getTopic(q.topicId)?.paperId === paper);
  if (items.length === 0)
    return <EmptyNote>Nothing saved. Tap the bookmark during practice to keep a question for later.</EmptyNote>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((q) => (
        <li key={q.id} className="flex items-start justify-between gap-4 py-4">
          <div>
            <p className="text-meta font-semibold text-ink-muted">{topicLabel(q.topicId)}</p>
            <p className="mt-1">{q.stem}</p>
          </div>
          <button type="button" className="btn btn-quiet min-h-11 shrink-0" onClick={() => actions.toggleSaved(q.id)}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
