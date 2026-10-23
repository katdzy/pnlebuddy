"use client";

import Link from "next/link";
import { useState } from "react";
import { paperShort, topicName } from "@/lib/bank";
import type { ActiveSession } from "@/lib/types";
import { BookmarkIcon, CrossIcon } from "../Icons";

export function SessionTopBar({
  session,
  topicId,
  saved,
  onToggleSaved,
  onEnd,
  onJump,
}: {
  session: ActiveSession;
  topicId: string | undefined;
  saved: boolean;
  onToggleSaved: () => void;
  onEnd: () => void;
  onJump: (index: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const total = session.questionIds.length;
  const position = session.currentIndex + 1;
  const answered = Object.keys(session.responses).length;
  const exam = session.feedback === "end";
  // Long quizzes: the per-item bar becomes a compact meter.
  const compact = total > 30;

  return (
    <header className="safe-top sticky top-0 z-20 border-b border-line bg-paper">
      <div className="mx-auto grid h-16 max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-6">
        <div>
          <button
            type="button"
            className="btn btn-quiet"
            aria-label={exam ? "Leave quiz" : "End session"}
            aria-expanded={confirming}
            aria-controls="end-session-confirm"
            onClick={() => setConfirming((c) => !c)}
          >
            <CrossIcon />
            <span aria-hidden="true" className="max-[480px]:hidden">
              {exam ? "Leave" : "End session"}
            </span>
          </button>
        </div>

        <div className="min-w-0 text-center">
          <p className="truncate text-small font-semibold text-ink">
            {exam ? session.title : topicId ? `${paperShort(topicId)} · ${topicName(topicId)}` : ""}
          </p>
          <p className="tabular text-meta text-ink-muted">
            {exam ? `Item ${position} of ${total} · ${answered} answered` : `Question ${position} of ${total}`}
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className={`btn btn-quiet ${saved ? "text-accent-ink" : ""}`}
            aria-label="Save for later"
            aria-pressed={saved}
            onClick={onToggleSaved}
          >
            <BookmarkIcon filled={saved} />
            <span aria-hidden="true" className="max-[480px]:hidden">
              {saved ? "Saved" : "Save"}
            </span>
          </button>
        </div>
      </div>

      {compact ? (
        <div className="mx-auto max-w-4xl px-4 pb-3 sm:px-8">
          <div
            role="progressbar"
            aria-label="Quiz progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={answered}
            className="h-1.5 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full bg-accent" style={{ width: `${(answered / total) * 100}%` }} />
          </div>
          {exam && (
            <details className="mt-1">
              <summary className="cursor-pointer text-meta font-semibold text-accent-ink">Jump to an item</summary>
              <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto pb-1">
                {session.questionIds.map((id, i) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onJump(i)}
                    aria-current={i === session.currentIndex ? "step" : undefined}
                    className={`tabular grid size-9 place-items-center rounded-[6px] text-meta font-semibold ${
                      i === session.currentIndex ? "bg-ink text-paper" : session.responses[id] ? "bg-accent-wash text-accent-ink" : "border border-line text-ink-muted"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      ) : (
        <div
          className="mx-auto flex max-w-4xl gap-1 px-4 pb-3 sm:px-8"
          role="progressbar"
          aria-label="Session progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answered}
          aria-valuetext={`${answered} of ${total} answered`}
        >
          {session.questionIds.map((id, i) =>
            exam ? (
              <button
                key={id}
                type="button"
                aria-label={`Go to item ${i + 1}${session.responses[id] ? ", answered" : ""}`}
                onClick={() => onJump(i)}
                className={`h-3 flex-1 rounded-full transition-colors duration-300 ${
                  i === session.currentIndex ? "bg-ink" : session.responses[id] ? "bg-accent" : "bg-line"
                }`}
              />
            ) : (
              <span
                key={id}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  session.responses[id] ? "bg-accent" : i === session.currentIndex ? "bg-ink-soft" : "bg-line"
                }`}
              />
            ),
          )}
        </div>
      )}

      {confirming && (
        <div id="end-session-confirm" className="border-t border-line bg-surface">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <p className="text-small text-ink-soft">
              {exam
                ? "Your answers so far are kept. Leave now and come back to this quiz from Today, or submit it to see your score."
                : answered > 0
                  ? `End now? Your ${answered} ${answered === 1 ? "answer is" : "answers are"} already saved.`
                  : "End now? You haven't answered anything yet, so nothing will be recorded."}
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-quiet" onClick={() => setConfirming(false)}>
                Keep going
              </button>
              {exam ? (
                <>
                  <Link href="/" className="btn btn-secondary no-underline">
                    Leave for now
                  </Link>
                  <button type="button" className="btn btn-secondary" onClick={onEnd}>
                    Submit now
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={onEnd}>
                  End session
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
