"use client";

import { useEffect, useRef } from "react";
import { getPaper } from "@/content/taxonomy";
import { topicName } from "@/lib/bank";
import { sessionClosing } from "@/lib/copy";
import { BAND_LABEL, grade } from "@/lib/grading";
import type { MistakeEntry, SessionRecord } from "@/lib/types";
import { BandChip, fmtPct } from "../Bits";
import { Sprig } from "../Botanicals";
import { ArrowRightIcon } from "../Icons";
import { QuizReview } from "../quiz/QuizReview";

export function SessionSummary({
  record,
  mistakes,
  name,
  onLeave,
}: {
  record: SessionRecord;
  mistakes: MistakeEntry[];
  name: string;
  onLeave: (href: string) => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const g = grade(record.byPaper);
  const isQuiz = record.mode === "quiz";
  const missed = (isQuiz ? record.plannedCount : record.answeredCount) - record.correctCount;
  const n = name.trim();

  return (
    <main className="safe-top safe-bottom mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-20">
      <Sprig variant="bloom" height={112} drawn className="-ml-3" />
      <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-headline font-bold tracking-[-0.015em] outline-none sm:text-display">
        {isQuiz ? "Quiz results" : n ? `Nice work, ${n}.` : "Session complete."}
      </h1>
      <p className="mt-2 text-lead text-ink-soft">{record.title}</p>

      {isQuiz ? (
        <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-3">
          <p className="figure text-[4rem] leading-none">{fmtPct(g.percent)}</p>
          <div className="pb-1">
            <BandChip band={g.band} />
            <p className="tabular mt-2 text-small text-ink-muted">
              {g.correct} of {g.total} correct · {BAND_LABEL[g.band].toLowerCase()}
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 text-lead text-ink-soft">{sessionClosing(record.correctCount, record.answeredCount, record.plannedCount)}</p>
          <dl className="mt-10 grid grid-cols-3 divide-x divide-line border-y border-line">
            <Stat label="Answered" value={record.answeredCount} />
            <Stat label="Correct" value={record.correctCount} />
            <Stat label="In notebook" value={mistakes.length} />
          </dl>
        </>
      )}

      {isQuiz ? (
        <div className="mt-10">
          <QuizReview record={record} />
        </div>
      ) : (
        <section aria-labelledby="by-topic" className="mt-10">
          <h2 id="by-topic" className="text-lead font-bold">
            By topic
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {record.topicIds.map((t) => (
              <li key={t} className="py-3">
                {topicName(t)}
              </li>
            ))}
          </ul>
          {Object.keys(record.byPaper).length > 0 && (
            <p className="mt-3 text-meta text-ink-muted">
              {Object.entries(record.byPaper)
                .map(([p, [c, t]]) => `${getPaper(p)?.short}: ${c}/${t}`)
                .join(" · ")}
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="next" className="mt-10">
        <h2 id="next" className="text-lead font-bold">
          What happens next
        </h2>
        <p className="mt-2 max-w-[60ch] text-ink-soft">
          {missed === 1 && "The question you missed will come back first in your next practice. "}
          {missed > 1 && `The ${missed} questions you missed will come back first in your next practice. `}
          The ones you got right are spaced out, so they&apos;ll return in a few days, just as they start to fade.
        </p>
      </section>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn btn-primary btn-large" onClick={() => onLeave("/")}>
          Back to Today
          <ArrowRightIcon size={22} />
        </button>
        <button type="button" className="btn btn-secondary btn-large" onClick={() => onLeave(mistakes.length ? "/notebook" : "/tracker")}>
          {mistakes.length ? "Open notebook" : "Open tracker"}
        </button>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-5 first:pl-0">
      <dt className="text-meta text-ink-muted">{label}</dt>
      <dd className="figure mt-1 text-headline">{value}</dd>
    </div>
  );
}
