"use client";

import { useEffect, useMemo, useRef } from "react";
import { identifyChoices, type IdentifyRound, type Structure } from "@/lib/anatomy";
import { CheckIcon, CrossIcon } from "../Icons";
import type { Glossary } from "./data";
import { BookEntry } from "./StructureCard";

/** The identify quiz, as the page keeps it: choosing what to be asked, or a round in progress (or just finished). */
export type QuizState =
  | { step: "setup"; scope: string }
  | {
      step: "round";
      scope: string;
      id: string;
      startedAt: number;
      fmas: string[];
      index: number;
      /** Structure asked → the structure she chose. */
      picks: Record<string, string>;
      /** The layers before the round, put back when it ends. */
      before: Record<string, "shown" | "xray" | "hidden">;
    };

export interface QuizScope {
  id: string;
  label: string;
  pool: Structure[];
  due: number;
}

/** What she sees in the card's place during the quiz (docs/ANATOMY_3D_PLAN.md §1, §6). */
export function IdentifyQuiz({
  quiz,
  scopes,
  plan,
  byFma,
  candidates,
  glossary,
  onScope,
  onStart,
  onPick,
  onNext,
  onShow,
  onClose,
}: {
  quiz: QuizState;
  scopes: QuizScope[];
  /** The round Start would begin, for the chosen scope. */
  plan: IdentifyRound;
  byFma: Map<string, Structure>;
  /** Every structure the quiz may name (the wrong choices come from these). */
  candidates: Structure[];
  glossary: Glossary;
  onScope: (scope: string) => void;
  onStart: () => void;
  onPick: (choice: Structure) => void;
  onNext: () => void;
  /** Leave the quiz and show this structure's card. */
  onShow: (s: Structure) => void;
  onClose: () => void;
}) {
  const scope = scopes.find((s) => s.id === quiz.scope);
  if (quiz.step === "setup")
    return <Setup scope={quiz.scope} scopes={scopes} plan={plan} onScope={onScope} onStart={onStart} onClose={onClose} />;
  const label = scope?.label ?? "";
  if (quiz.index >= quiz.fmas.length) {
    return <Done label={label} fmas={quiz.fmas} picks={quiz.picks} byFma={byFma} onAgain={onStart} onShow={onShow} onClose={onClose} />;
  }
  const target = byFma.get(quiz.fmas[quiz.index]);
  if (!target) return null;
  return (
    <Question
      key={target.fma}
      label={`${label} · ${quiz.index + 1} of ${quiz.fmas.length}`}
      target={target}
      candidates={candidates}
      seed={hash(quiz.id) + quiz.index}
      picked={quiz.picks[target.fma] ?? null}
      last={quiz.index === quiz.fmas.length - 1}
      glossary={glossary}
      onPick={onPick}
      onNext={onNext}
      onClose={onClose}
    />
  );
}

function Head({
  meta,
  title,
  closeLabel,
  onClose,
  headingRef,
}: {
  meta: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="tabular text-meta font-semibold text-ink-muted">{meta}</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-0.5 font-display text-title font-bold leading-tight outline-none">
          {title}
        </h2>
      </div>
      <button type="button" className="btn btn-quiet -mr-2 -mt-1 size-11 shrink-0 !p-0" aria-label={closeLabel} onClick={onClose}>
        <CrossIcon size={20} />
      </button>
    </div>
  );
}

function Setup({
  scope,
  scopes,
  plan,
  onScope,
  onStart,
  onClose,
}: {
  scope: string;
  scopes: QuizScope[];
  plan: IdentifyRound;
  onScope: (scope: string) => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const parts = [plan.due && `${plan.due} due again`, plan.fresh && `${plan.fresh} new`, plan.early && `${plan.early} not due yet`].filter(
    Boolean,
  );
  return (
    <div>
      <Head meta="Quiz" title="Name what lights up" closeLabel="Close the quiz" onClose={onClose} />
      <p className="mt-2 text-small text-ink-soft">
        A structure lights up; choose its name from four. Misses come back tomorrow and go to your notebook.
      </p>
      <div role="group" aria-label="Which structures" className="mt-4 flex flex-wrap gap-2">
        {scopes.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === scope}
            className={`chip ${s.id === scope ? "chip-on" : ""}`}
            onClick={() => onScope(s.id)}
          >
            {s.label}
            {s.due > 0 && <span className="font-normal">· {s.due} due</span>}
          </button>
        ))}
      </div>
      <p className="mt-4 text-small text-ink-soft">{parts.length ? `This round: ${parts.join(", ")}.` : "Nothing here to ask yet."}</p>
      <button type="button" className="btn btn-primary mt-4 min-h-11" disabled={!plan.fmas.length} onClick={onStart}>
        Start {plan.fmas.length > 0 && plan.fmas.length}
      </button>
    </div>
  );
}

function Question({
  label,
  target,
  candidates,
  seed,
  picked,
  last,
  glossary,
  onPick,
  onNext,
  onClose,
}: {
  label: string;
  target: Structure;
  candidates: Structure[];
  seed: number;
  picked: string | null;
  last: boolean;
  glossary: Glossary;
  onPick: (choice: Structure) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const choices = useMemo(() => identifyChoices(target, candidates, seed), [target, candidates, seed]);
  const heading = useRef<HTMLHeadingElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const correct = picked === target.fma;
  const entry = target.term && glossary.status === "ready" ? (glossary.byTerm.get(target.term) ?? null) : null;

  // A new structure: start reading from the question. An answer: Next is the obvious move.
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (picked) next.current?.focus({ preventScroll: true });
  }, [picked]);

  // Keys 1–4 to answer on a keyboard (Enter then presses the focused Next).
  useEffect(() => {
    if (picked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target instanceof Element && e.target.closest("input, textarea, select"))) return;
      const choice = choices[Number(e.key) - 1];
      if (choice) {
        e.preventDefault();
        onPick(choice);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, choices, onPick]);

  return (
    <div>
      <Head meta={label} title="What's lit up?" closeLabel="Stop the quiz" onClose={onClose} headingRef={heading} />
      {!picked && <p className="mt-1 text-small text-ink-muted max-sm:hidden">Turn the body to look around it.</p>}
      <ul className="mt-4 space-y-2">
        {choices.map((c, i) => {
          const tone = !picked ? "idle" : c.fma === target.fma ? "correct" : c.fma === picked ? "wrong" : "muted";
          return (
            <li key={c.fma}>
              <button type="button" disabled={Boolean(picked)} className={`identify-choice identify-${tone}`} onClick={() => onPick(c)}>
                <span aria-hidden="true" className="identify-key">
                  {i + 1}
                </span>
                <span className="flex-1">{c.name}</span>
                {tone === "correct" && <CheckIcon size={20} className="shrink-0 text-accent-deep" />}
                {tone === "wrong" && <CrossIcon size={20} className="shrink-0 text-miss" />}
                {tone === "correct" && <span className="sr-only"> (the answer)</span>}
                {tone === "wrong" && <span className="sr-only"> (your answer)</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div aria-live="polite">
        {picked && (
          <div className="mt-4">
            <p className="font-semibold">{correct ? "Yes, that's it." : `The answer: ${target.name}.`}</p>
            {!correct && <p className="mt-1 text-small text-ink-muted">Saved to your notebook. It comes back tomorrow.</p>}
            {entry ? (
              <BookEntry entry={entry} structure={target} />
            ) : (
              glossary.status === "loading" && <p className="mt-3 text-small text-ink-muted">Opening your book&apos;s glossary…</p>
            )}
          </div>
        )}
      </div>
      {picked && (
        <button ref={next} type="button" className="btn btn-primary mt-4 min-h-11 w-full" onClick={onNext}>
          {last ? "See how it went" : "Next"}
        </button>
      )}
      {!picked && <p className="mt-3 hidden text-meta text-ink-muted lg:block">Keys 1–4 to answer</p>}
    </div>
  );
}

function Done({
  label,
  fmas,
  picks,
  byFma,
  onAgain,
  onShow,
  onClose,
}: {
  label: string;
  fmas: string[];
  picks: Record<string, string>;
  byFma: Map<string, Structure>;
  onAgain: () => void;
  onShow: (s: Structure) => void;
  onClose: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  const asked = fmas.filter((f) => picks[f]);
  const missed = asked.filter((f) => picks[f] !== f).flatMap((f) => byFma.get(f) ?? []);
  const right = asked.length - missed.length;

  return (
    <div>
      <Head
        meta={label}
        title={`You named ${right} of ${asked.length}.`}
        closeLabel="Close the quiz"
        onClose={onClose}
        headingRef={heading}
      />
      <p className="mt-2 text-small text-ink-soft">
        {missed.length ? "The ones you missed come back tomorrow, and they're in your notebook." : "They'll come back when they're due."}
      </p>
      {missed.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {missed.map((s) => (
            <li key={s.fma} className="flex items-center justify-between gap-3 py-1">
              <span className="min-w-0 text-small">{s.name}</span>
              <button type="button" className="btn btn-quiet min-h-11 shrink-0" onClick={() => onShow(s)}>
                Show me<span className="sr-only"> {s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary min-h-11" onClick={onAgain}>
          Another round
        </button>
        <button type="button" className="btn btn-secondary min-h-11" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

/** A stable number from the round's id, so each question's choices stay put across re-renders. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}
