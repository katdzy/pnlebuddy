"use client";

import { useState } from "react";
import { getPaper } from "@/content/taxonomy";
import { topicName } from "@/lib/bank";
import { useContent } from "@/lib/content";
import { FLOOR, grade, isCorrect, PASSING } from "@/lib/grading";
import { actions, useStudyStore } from "@/lib/store";
import type { ChoiceId, SessionRecord } from "@/lib/types";
import { BandChip, fmtPct } from "../Bits";
import { CheckIcon, CrossIcon } from "../Icons";

/** Score breakdown plus every item with her answer, for a finished quiz. */
export function QuizReview({ record, showItems = true }: { record: SessionRecord; showItems?: boolean }) {
  const content = useContent();
  const store = useStudyStore();
  const [filter, setFilter] = useState<"wrong" | "all">("wrong");
  const g = grade(record.byPaper);
  const bank = content.bank;
  const answers = record.answers ?? {};
  const items = Object.entries(answers)
    .map(([qid, chosen]) => {
      const q = bank?.question(qid);
      return q ? { q, chosen: chosen.split("") as ChoiceId[], ok: isCorrect(q, chosen.split("") as ChoiceId[]) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const wrong = items.filter((i) => !i.ok);
  const unsaved = wrong.filter((i) => !store?.data.mistakes.some((m) => m.itemId === i.q.id && m.sessionId === record.id)).length;
  const shown = filter === "wrong" ? wrong : items;

  // Per-topic breakdown, weakest first.
  const byTopic = new Map<string, [number, number]>();
  for (const i of items) {
    const cur = byTopic.get(i.q.topicId) ?? [0, 0];
    byTopic.set(i.q.topicId, [cur[0] + (i.ok ? 1 : 0), cur[1] + 1]);
  }
  const topics = [...byTopic].sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);

  return (
    <div>
      {g.boardRule && (
        <p className={`rounded-control px-4 py-3 text-small ${g.boardRule.passes ? "bg-accent-wash text-accent-ink" : "bg-sunken text-ink"}`}>
          {g.boardRule.passes
            ? `By the board's rule this would pass: ${g.boardRule.average}% average, every paper at ${FLOOR}% or more.`
            : g.boardRule.average < PASSING
              ? `By the board's rule this average (${g.boardRule.average}%) is under ${PASSING}%. ${g.boardRule.weakest ? `${getPaper(g.boardRule.weakest.paperId)?.short} is the one to lift first.` : ""}`
              : `The average is ${g.boardRule.average}%, but ${getPaper(g.boardRule.weakest!.paperId)?.short} is under ${FLOOR}%, which the board doesn't allow. That paper is the one to work on.`}
        </p>
      )}

      {g.papers.length > 1 && (
        <table className="mt-5 w-full max-w-xl text-left">
          <thead>
            <tr className="border-b border-line-strong text-meta text-ink-muted">
              <th className="py-2 font-semibold">Paper</th>
              <th className="py-2 font-semibold">Score</th>
              <th className="py-2 font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {g.papers.map((p) => (
              <tr key={p.paperId}>
                <td className="py-2 font-semibold">
                  {getPaper(p.paperId)?.short} <span className="font-normal text-ink-muted">{getPaper(p.paperId)?.name}</span>
                </td>
                <td className="tabular py-2">
                  {fmtPct(p.percent)} <span className="text-meta text-ink-muted">({p.correct}/{p.total})</span>
                </td>
                <td className="py-2">
                  <BandChip band={p.band} short />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {topics.length > 1 && (
        <div className="mt-6">
          <h3 className="text-body font-bold">By topic</h3>
          <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
            {topics.map(([t, [c, n]]) => (
              <li key={t} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-small">
                <span>{topicName(t)}</span>
                <span className={`tabular shrink-0 ${c / n < 0.6 ? "font-semibold text-miss" : "text-ink-soft"}`}>
                  {c}/{n}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showItems && items.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-body font-bold">Answers</h3>
            <div className="flex gap-1">
              <button type="button" aria-pressed={filter === "wrong"} className={`chip min-h-10 ${filter === "wrong" ? "chip-on" : ""}`} onClick={() => setFilter("wrong")}>
                Missed ({wrong.length})
              </button>
              <button type="button" aria-pressed={filter === "all"} className={`chip min-h-10 ${filter === "all" ? "chip-on" : ""}`} onClick={() => setFilter("all")}>
                All ({items.length})
              </button>
            </div>
            {unsaved > 0 && (
              <button type="button" className="btn btn-secondary min-h-10" onClick={() => actions.recordQuizMistakes(record)}>
                Save {unsaved} missed to notebook
              </button>
            )}
          </div>
          <ol className="mt-4 space-y-4">
            {shown.map(({ q, chosen, ok }) => (
              <li key={q.id} className="rounded-panel border border-line bg-surface p-4">
                <div className="flex items-start gap-3">
                  {ok ? <CheckIcon className="mt-1 shrink-0 text-accent-deep" /> : <CrossIcon className="mt-1 shrink-0 text-miss" />}
                  <div className="min-w-0">
                    <p className="text-meta text-ink-muted">{topicName(q.topicId)}</p>
                    {q.situation && <p className="mt-1 text-small text-ink-soft">{q.situation}</p>}
                    <p className="mt-1 font-semibold">{q.stem}</p>
                    <ul className="mt-2 space-y-1 text-small">
                      {q.choices.map((c) => {
                        const right = q.answer.includes(c.id);
                        const mine = chosen.includes(c.id);
                        return (
                          <li key={c.id} className={right ? "font-semibold text-accent-ink" : mine ? "text-miss line-through decoration-1" : "text-ink-soft"}>
                            {c.id}. {c.text}
                            {mine && <span className="sr-only"> (your answer)</span>}
                            {right && <span className="sr-only"> (correct)</span>}
                          </li>
                        );
                      })}
                    </ul>
                    {chosen.length === 0 && <p className="mt-1 text-meta text-ink-muted">Left blank</p>}
                    {q.rationale && (
                      <details className="mt-2 text-small">
                        <summary className="cursor-pointer font-semibold text-accent-ink">Why</summary>
                        <p className="mt-1 text-ink-soft">{q.rationale}</p>
                      </details>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      {showItems && !record.answers && <p className="mt-6 text-small text-ink-muted">The answer sheet for this older quiz wasn&apos;t kept.</p>}
    </div>
  );
}
