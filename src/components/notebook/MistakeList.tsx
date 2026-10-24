"use client";

import Link from "next/link";
import { useState } from "react";
import { topicLabel } from "@/content/taxonomy";
import { formatDate } from "@/lib/copy";
import { actions } from "@/lib/store";
import { MISTAKE_CATEGORIES, type MistakeCategory, type MistakeEntry } from "@/lib/types";
import { EmptyNote } from "../Bits";

export function MistakeList({ entries, empty }: { entries: MistakeEntry[]; empty: string }) {
  if (entries.length === 0) return <EmptyNote>{empty}</EmptyNote>;
  return (
    <ol className="space-y-4">
      {entries.map((m) => (
        <MistakeItem key={m.id} entry={m} />
      ))}
    </ol>
  );
}

function MistakeItem({ entry: m }: { entry: MistakeEntry }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(m.note);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isCard = m.kind === "card";
  const isAnatomy = m.kind === "anatomy";
  const label = m.snapshot.topicId === "legacy" ? "Older note" : topicLabel(m.snapshot.topicId);

  return (
    <li className={`p-4 sm:p-5 ${m.resolvedAt ? "rounded-panel border border-line" : "index-card"}`}>
      <div className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 ${m.resolvedAt ? "" : "index-card-head -mx-4 px-4 pb-3 sm:-mx-5 sm:px-5"}`}>
        <p className="text-meta font-semibold text-ink-muted">{label}</p>
        <p className="text-meta text-ink-muted">
          {formatDate(m.createdAt)}
          {m.resolvedAt && ` · understood ${formatDate(m.resolvedAt)}`}
        </p>
      </div>

      {isCard ? (
        <div className="card-html mt-3 font-semibold" dangerouslySetInnerHTML={{ __html: m.snapshot.prompt }} />
      ) : (
        <p className="mt-3 whitespace-pre-line font-semibold">{m.snapshot.prompt}</p>
      )}

      <div className="mt-3 grid gap-2 text-small sm:grid-cols-2">
        {!isCard && m.snapshot.chosenText && (
          <div className="rounded-control bg-miss-wash/70 px-3 py-2">
            <p className="text-meta font-semibold text-miss">You chose</p>
            <p className="whitespace-pre-line">{m.snapshot.chosenText}</p>
          </div>
        )}
        <div className={`rounded-control bg-accent-wash/70 px-3 py-2 ${isCard ? "sm:col-span-2" : ""}`}>
          <p className="text-meta font-semibold text-accent-ink">{isCard ? "Answer" : "Correct"}</p>
          {isCard ? (
            <div className="card-html" dangerouslySetInnerHTML={{ __html: m.snapshot.answerText }} />
          ) : (
            <p className="whitespace-pre-line">{m.snapshot.answerText}</p>
          )}
        </div>
      </div>

      {isAnatomy && (
        <p className="mt-3 text-small">
          <Link href={`/anatomy?f=${m.itemId}`} className="link">
            See it in 3D
          </Link>
        </p>
      )}

      {m.snapshot.rationale && (
        <details className="mt-3 text-small">
          <summary className="cursor-pointer font-semibold text-accent-ink">{isAnatomy ? "Your book" : "Rationale"}</summary>
          <p className="mt-1 max-w-[70ch] text-ink-soft">{m.snapshot.rationale}</p>
        </details>
      )}

      <div className="mt-4 border-t border-line pt-3">
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              actions.updateMistake(m.id, { note });
              setEditing(false);
            }}
          >
            {m.kind === "question" && (
              <label className="block text-small font-semibold">
                What tripped you up
                <select
                  className="field mt-1"
                  value={m.category}
                  onChange={(e) => actions.updateMistake(m.id, { category: e.target.value as MistakeCategory })}
                >
                  {MISTAKE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-small font-semibold">
              Your note
              <textarea className="field mt-1 resize-y" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-secondary">
                Save
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => (setNote(m.note), setEditing(false))}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-small text-ink-soft">
              {m.kind === "question" && <span className="font-semibold text-ink">{MISTAKE_CATEGORIES.find((c) => c.id === m.category)?.label}. </span>}
              {m.note ? `“${m.note}”` : <span className="text-ink-muted">No note yet.</span>}
            </p>
            <div className="flex flex-wrap gap-1">
              <button type="button" className="btn btn-quiet min-h-11" onClick={() => setEditing(true)}>
                Edit note
              </button>
              <button type="button" className="btn btn-quiet min-h-11" onClick={() => actions.setMistakeResolved(m.id, !m.resolvedAt)}>
                {m.resolvedAt ? "Move back" : "Got it now"}
              </button>
              {confirmDelete ? (
                <>
                  <button type="button" className="btn btn-quiet min-h-11 text-miss" onClick={() => actions.deleteMistake(m.id)}>
                    Delete
                  </button>
                  <button type="button" className="btn btn-quiet min-h-11" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-quiet min-h-11" onClick={() => setConfirmDelete(true)} aria-label="Delete this note">
                  Delete…
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
