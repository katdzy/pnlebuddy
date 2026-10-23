"use client";

import type { Ref } from "react";
import type { MistakeEntry, Question, SessionResponse } from "@/lib/types";
import { CheckIcon, CrossIcon } from "../Icons";
import { MistakeRecorder } from "./MistakeRecorder";

export function AnswerReview({
  ref,
  question,
  response,
  sessionId,
  existingMistake,
}: {
  ref: Ref<HTMLHeadingElement>;
  question: Question;
  response: SessionResponse;
  sessionId: string;
  existingMistake: MistakeEntry | undefined;
}) {
  const right = question.choices.filter((c) => question.answer.includes(c.id));
  const others = question.choices.filter((c) => !question.answer.includes(c.id));
  const correct = response.correct;
  const answerLabel = question.answer.join(", ");
  const hasDistractors = others.some((c) => question.distractorExplanations?.[c.id]);

  return (
    <section aria-labelledby={`result-${question.id}`} className="reveal mt-12">
      <h2 id={`result-${question.id}`} ref={ref} tabIndex={-1} className="flex scroll-mt-28 items-center gap-3 text-title font-bold outline-none">
        {correct ? (
          <>
            <span className="grid size-9 place-items-center rounded-full bg-accent-deep text-paper">
              <CheckIcon size={20} />
            </span>
            Correct
          </>
        ) : (
          <>
            <span className="grid size-9 place-items-center rounded-full bg-miss-wash text-miss">
              <CrossIcon size={20} />
            </span>
            Not quite
          </>
        )}
      </h2>
      <p className="mt-2 text-body text-ink-soft">
        {correct ? (
          <>You chose {response.choiceIds.join(", ")}, the right answer.</>
        ) : (
          <>
            You chose {response.choiceIds.join(", ")}. The answer is {answerLabel}
            {question.kind === "multi" ? " (all of them, and only them)" : ""}.
          </>
        )}
      </p>

      <div className="mt-8 max-w-[68ch]">
        <h3 className="text-body font-bold">
          Why {answerLabel} {question.answer.length > 1 ? "are" : "is"} right
        </h3>
        {right.map((c) => (
          <p key={c.id} className="mt-1 font-semibold text-accent-ink">
            {c.id}. {c.text}
          </p>
        ))}
        <p className="mt-3 text-body leading-relaxed">
          {question.rationale || (
            <span className="text-ink-soft">{noRationale(question.source.label)}</span>
          )}
        </p>
      </div>

      {hasDistractors && (
        <div className="mt-10 max-w-[68ch]">
          <h3 className="text-body font-bold">Why the others don&apos;t fit</h3>
          <dl className="mt-3 divide-y divide-line border-y border-line">
            {others.map((c) => (
              <div key={c.id} className="py-4">
                <dt className="flex flex-wrap items-baseline gap-x-2 font-semibold">
                  <span className="tabular">{c.id}.</span>
                  <span>{c.text}</span>
                  {response.choiceIds.includes(c.id) && (
                    <span className="rounded-[6px] bg-miss-wash px-2 py-0.5 text-meta font-semibold text-miss">Your answer</span>
                  )}
                </dt>
                <dd className="mt-1.5 text-ink-soft">{question.distractorExplanations?.[c.id] ?? "Not explained in the source."}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {question.tip && (
        <div className="mt-10 max-w-[68ch] rounded-panel border border-accent-line bg-accent-wash/60 p-5">
          <h3 className="text-body font-bold text-accent-ink">Test-taking strategy</h3>
          {question.tip.split("\n\n").map((p, i) => (
            <p key={i} className="mt-2 text-ink-soft">
              {p}
            </p>
          ))}
        </div>
      )}

      {!correct && (
        <MistakeRecorder question={question} sessionId={sessionId} chosen={response.choiceIds} existing={existingMistake} />
      )}

      <p className="mt-10 max-w-[68ch] text-meta text-ink-muted">
        Source: {question.source.label}
        {question.seenIn && question.seenIn > 1 ? ` · also in ${question.seenIn - 1} other file${question.seenIn > 2 ? "s" : ""} of yours` : ""}
        {question.source.kind === "reference" && !question.source.clinicallyReviewed && " · answer key as printed in the source"}
      </p>
    </section>
  );
}

/** Book questions point to their section; others to her notes. */
function noRationale(label: string): string {
  const book = /§(\d+\.\d+[a-z]?)[^,]*, p\. (\d+)$/.exec(label);
  if (book) return `The book gives no rationale for its Learning Checks and Review Questions. Section ${book[1]} (p. ${book[2]}) explains it.`;
  return "The source didn\u2019t include a rationale for this one. It\u2019s worth a quick look in your notes.";
}
