"use client";

import { useEffect, useRef, useState } from "react";
import { actions } from "@/lib/store";
import type { ChoiceId, MistakeEntry, Question, SessionResponse } from "@/lib/types";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CrossIcon } from "../Icons";
import { AnswerReview } from "./AnswerReview";

const KEY_TO_CHOICE: Record<string, ChoiceId> = {
  a: "A", b: "B", c: "C", d: "D", e: "E", f: "F",
  "1": "A", "2": "B", "3": "C", "4": "D", "5": "E", "6": "F",
};

export function QuestionPanel({
  question,
  sessionId,
  response,
  existingMistake,
  exam,
  isFirst,
  isLast,
  unanswered,
  onNext,
  onPrev,
  onSubmit,
}: {
  question: Question;
  sessionId: string;
  response: SessionResponse | undefined;
  existingMistake: MistakeEntry | undefined;
  /** Exam mode: no feedback until the quiz is submitted. */
  exam: boolean;
  isFirst: boolean;
  isLast: boolean;
  unanswered: number;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
}) {
  const multi = question.kind === "multi";
  const [selected, setSelected] = useState<ChoiceId[]>(response?.choiceIds ?? []);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const revealed = !exam && Boolean(response);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const stemRef = useRef<HTMLHeadingElement>(null);
  const justSubmitted = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    stemRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!revealed || !justSubmitted.current) return;
    justSubmitted.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [revealed]);

  function choose(id: ChoiceId) {
    if (revealed) return;
    const next = multi ? (selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id].sort()) : [id];
    setSelected(next);
    // In exam mode every change is saved straight away (nothing is revealed).
    if (exam) {
      if (next.length) actions.answer(question.id, next);
    }
  }

  function check() {
    if (!selected.length || revealed) return;
    justSubmitted.current = true;
    actions.answer(question.id, selected);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && (t as HTMLInputElement).type === "text"))) return;
      if (revealed) return;
      const choice = KEY_TO_CHOICE[e.key.toLowerCase()];
      if (choice && question.choices.some((c) => c.id === choice)) {
        e.preventDefault();
        choose(choice);
        return;
      }
      if (e.key === "Enter" && t?.tagName !== "BUTTON" && selected.length && !exam) {
        e.preventDefault();
        check();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const legendId = `stem-${question.id}`;

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pb-44 pt-8 sm:px-8 sm:pt-12">
        {question.situation && (
          <div className="mb-6 rounded-panel border border-line bg-sunken/60 px-4 py-3 sm:px-5">
            <p className="text-meta font-semibold uppercase tracking-[0.08em] text-ink-muted">Situation</p>
            <p className="mt-1 max-w-[65ch] text-body text-ink-soft">{question.situation}</p>
          </div>
        )}
        <h1
          id={legendId}
          ref={stemRef}
          tabIndex={-1}
          className="max-w-[62ch] text-lead font-semibold leading-[1.5] outline-none sm:text-[1.375rem]"
        >
          {question.stem}
        </h1>
        {multi && <p className="mt-3 text-small font-semibold text-accent-ink">Select all that apply.</p>}

        <fieldset className="mt-8" aria-labelledby={legendId} disabled={revealed}>
          <div className="space-y-3">
            {question.choices.map((choice) => (
              <ChoiceRow
                key={choice.id}
                name={`q-${question.id}`}
                id={choice.id}
                text={choice.text}
                multi={multi}
                selected={selected.includes(choice.id)}
                revealed={revealed}
                isCorrect={question.answer.includes(choice.id)}
                onSelect={() => choose(choice.id)}
              />
            ))}
          </div>
        </fieldset>

        {!revealed && (
          <p className="mt-6 hidden text-meta text-ink-muted lg:block">
            Tip: press A–{question.choices.at(-1)?.id} to choose{exam ? "" : " and Enter to check"}.
          </p>
        )}

        {revealed && response && (
          <AnswerReview ref={resultRef} question={question} response={response} sessionId={sessionId} existingMistake={existingMistake} />
        )}
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper">
        {confirmSubmit && (
          <div className="border-b border-line bg-surface">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
              <p className="text-small text-ink-soft">
                {unanswered > 0
                  ? `${unanswered} ${unanswered === 1 ? "item is" : "items are"} unanswered and will count as wrong, like on the board. Submit anyway?`
                  : "Submit your answers and see your score?"}
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-quiet" onClick={() => setConfirmSubmit(false)}>
                  Keep going
                </button>
                <button type="button" className="btn btn-primary" onClick={onSubmit}>
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
          {exam ? (
            <>
              <button type="button" className="btn btn-secondary btn-large shrink-0" onClick={onPrev} disabled={isFirst} aria-label="Previous question">
                <ArrowLeftIcon size={22} />
                <span className="max-sm:sr-only">Back</span>
              </button>
              <p className="text-center text-small text-ink-muted" aria-live="polite">
                {selected.length ? `Answer ${selected.join(", ")} saved.` : "Choose an answer, or skip for now."}
              </p>
              {isLast ? (
                <button type="button" className="btn btn-primary btn-large shrink-0" onClick={() => setConfirmSubmit(true)}>
                  Submit
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-large shrink-0" onClick={onNext}>
                  <span className="max-sm:sr-only">Next</span>
                  <ArrowRightIcon size={22} />
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-small text-ink-muted" aria-live="polite">
                {revealed
                  ? isLast
                    ? "That's the last one."
                    : "Read as much as you like, then continue."
                  : selected.length
                    ? `Answer ${selected.join(", ")} selected.`
                    : multi
                      ? "Choose every answer that applies."
                      : "Choose an answer."}
              </p>
              {revealed ? (
                <button type="button" className="btn btn-primary btn-large shrink-0" onClick={onNext}>
                  {isLast ? "Finish" : "Next question"}
                  <ArrowRightIcon size={22} />
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-large shrink-0" disabled={!selected.length} onClick={check}>
                  Check answer
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ChoiceRow({
  name,
  id,
  text,
  multi,
  selected,
  revealed,
  isCorrect,
  onSelect,
}: {
  name: string;
  id: ChoiceId;
  text: string;
  multi: boolean;
  selected: boolean;
  revealed: boolean;
  isCorrect: boolean;
  onSelect: () => void;
}) {
  let tone: "idle" | "selected" | "correct" | "wrong" | "muted" = "idle";
  if (revealed) tone = isCorrect ? "correct" : selected ? "wrong" : "muted";
  else if (selected) tone = "selected";

  const row = {
    idle: "border-line-strong bg-surface hover:bg-sunken cursor-pointer",
    selected: "border-ink bg-surface ring-1 ring-ink cursor-pointer",
    correct: "border-accent-deep bg-accent-wash",
    wrong: "border-miss bg-miss-wash",
    muted: "border-line bg-transparent text-ink-soft",
  }[tone];

  const letter = {
    idle: "border border-line-strong text-ink-soft",
    selected: "bg-ink text-paper",
    correct: "bg-accent-deep text-paper",
    wrong: "bg-miss text-paper",
    muted: "border border-line text-ink-muted",
  }[tone];

  return (
    <label
      className={`relative flex min-h-16 items-start gap-4 rounded-control border px-4 py-4 transition-[background-color,border-color,box-shadow] duration-150 sm:px-5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${row}`}
    >
      <input type={multi ? "checkbox" : "radio"} name={name} value={id} checked={selected} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden="true"
        className={`grid size-8 shrink-0 place-items-center text-small font-bold transition-colors duration-150 ${multi ? "rounded-[6px]" : "rounded-full"} ${letter}`}
      >
        {id}
      </span>
      <span className="flex-1 pt-0.5 text-[1.0625rem] leading-relaxed sm:text-[1.125rem]">
        <span className="sr-only">{id}. </span>
        {text}
        {tone === "correct" && <span className="sr-only"> (correct answer)</span>}
        {tone === "wrong" && <span className="sr-only"> (your answer)</span>}
      </span>
      {tone === "correct" && <CheckIcon size={24} className="mt-0.5 shrink-0 text-accent-deep" />}
      {tone === "wrong" && <CrossIcon size={24} className="mt-0.5 shrink-0 text-miss" />}
    </label>
  );
}
