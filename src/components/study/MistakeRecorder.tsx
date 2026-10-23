"use client";

import { useId, useState } from "react";
import { actions } from "@/lib/store";
import type { ChoiceId, MistakeCategory, MistakeEntry, Question } from "@/lib/types";
import { MISTAKE_CATEGORIES } from "@/lib/types";
import { CheckIcon } from "../Icons";

export function MistakeRecorder({
  question,
  sessionId,
  chosen,
  existing,
}: {
  question: Question;
  sessionId: string;
  chosen: ChoiceId[];
  existing: MistakeEntry | undefined;
}) {
  const [category, setCategory] = useState<MistakeCategory | null>(existing?.category ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const noteId = useId();
  const helpId = useId();

  const dirty = existing ? existing.category !== category || existing.note !== note.trim() : true;
  const saved = Boolean(existing) && !dirty;

  function save() {
    if (!category) return;
    actions.recordMistake({ questionId: question.id, sessionId, chosen, category, note });
  }

  return (
    <section aria-labelledby={`${helpId}-title`} className="mt-10 rounded-panel bg-sunken p-5 sm:p-6">
      <h3 id={`${helpId}-title`} className="text-body font-bold">
        What tripped you up?
      </h3>
      <p id={helpId} className="mt-1 text-small text-ink-soft">
        Optional. Saved notes go to your notebook so you can come back to them (balikan) later.
      </p>

      <fieldset className="mt-4" aria-describedby={helpId}>
        <legend className="sr-only">Reason for the mistake</legend>
        <div className="flex flex-wrap gap-2">
          {MISTAKE_CATEGORIES.map((c) => {
            const checked = category === c.id;
            return (
              <label
                key={c.id}
                className={`relative inline-flex min-h-12 cursor-pointer items-center rounded-control border px-4 text-small font-semibold transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                  checked
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-surface text-ink hover:bg-paper"
                }`}
              >
                <input
                  type="radio"
                  name={`mistake-${question.id}`}
                  value={c.id}
                  checked={checked}
                  onChange={() => setCategory(c.id)}
                  className="sr-only"
                />
                {c.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {category && (
        <div className="mt-5">
          <label htmlFor={noteId} className="text-small font-semibold">
            {category === "other" ? "What happened?" : "Anything you want to remember?"}{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder={
              category === "confused"
                ? "e.g. I mixed up hypo- and hypercalcemia signs"
                : "A short note for future you"
            }
            className="field mt-2 resize-y"
          />
        </div>
      )}

      <div className="mt-5 flex min-h-12 flex-wrap items-center gap-4">
        {!saved && (
          <button type="button" className="btn btn-secondary" onClick={save} disabled={!category}>
            {existing ? "Update note" : "Save to notebook"}
          </button>
        )}
        <p role="status" className="flex items-center gap-1.5 text-small font-semibold text-accent-ink">
          {saved && (
            <>
              <CheckIcon size={18} />
              Saved to your notebook
            </>
          )}
        </p>
      </div>
    </section>
  );
}
