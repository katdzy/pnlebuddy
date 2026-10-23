"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EXAM_PAPERS, getPaper, getTopic, PAPERS, topicsInPaper, type PaperId } from "@/content/taxonomy";
import { formatDate, plural } from "@/lib/copy";
import { grade } from "@/lib/grading";
import { quizPool, type QuizSpec } from "@/lib/session";
import { actions } from "@/lib/store";
import type { SessionRecord } from "@/lib/types";
import { BandChip, fmtPct, SectionTitle } from "../Bits";
import { PageHeader } from "../look/PageHeader";
import { useLook } from "@/lib/lookStore";
import { toneFor } from "@/lib/look";
import { WithData, type Ready } from "../Gate";
import { ArrowRightIcon, ChevronDownIcon } from "../Icons";
import { QuizReview } from "./QuizReview";

export function QuizScreen() {
  return <WithData label="Loading quizzes">{(ready) => <Quiz {...ready} />}</WithData>;
}

const COUNTS = [10, 25, 50, 100] as const;

function initialFromUrl(): { papers: PaperId[]; topics: string[] } {
  if (typeof window === "undefined") return { papers: ["np1"], topics: [] };
  const q = new URLSearchParams(window.location.search);
  const topic = q.get("topic");
  const t = topic ? getTopic(topic) : undefined;
  if (t) return { papers: [t.paperId], topics: [t.id] };
  const paper = q.get("paper");
  if (paper && getPaper(paper)) return { papers: [paper as PaperId], topics: [] };
  return { papers: EXAM_PAPERS.map((p) => p.id), topics: [] };
}

function Quiz({ data, bank }: Ready) {
  const router = useRouter();
  const look = useLook();
  const [init] = useState(initialFromUrl);
  const [papers, setPapers] = useState<PaperId[]>(init.papers);
  const [topics, setTopics] = useState<string[]>(init.topics);
  const [count, setCount] = useState<number>(init.topics.length ? 10 : init.papers.length > 1 ? 100 : 25);
  const [style, setStyle] = useState<QuizSpec["style"]>("all");
  const [onlyMissed, setOnlyMissed] = useState(false);
  const [feedback, setFeedback] = useState<QuizSpec["feedback"]>("end");

  const isMock = papers.length === EXAM_PAPERS.length && EXAM_PAPERS.every((p) => papers.includes(p.id)) && !topics.length;
  const title = topics.length === 1
    ? `${getPaper(papers[0])?.short} · ${getTopic(topics[0])?.name}`
    : isMock
      ? "Mock board (NP1–NP5)"
      : papers.map((p) => getPaper(p)?.short).join(" + ") + (topics.length ? ` · ${topics.length} topics` : "");
  const spec: QuizSpec = { title, papers, topicIds: topics, count, style, onlyMissed, feedback };
  const pool = useMemo(() => quizPool(data, bank, spec), [data, bank, papers, topics, style, onlyMissed]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = Math.min(count, pool.length);

  function togglePaper(id: PaperId) {
    setTopics([]);
    setPapers((cur) => (cur.includes(id) ? (cur.length > 1 ? cur.filter((p) => p !== id) : cur) : [...cur, id]));
  }
  function start() {
    actions.startQuiz({ ...spec, title: `${title} · ${n} items` });
    router.push("/study");
  }

  const quizzes = data.sessions.filter((s) => s.mode === "quiz").reverse();

  return (
    <div>
      <PageHeader iconKey="page:quiz" title="Quiz">
        <p className="mt-2 max-w-[65ch] text-lead text-ink-soft">
          Graded like the board: 75% to pass, nothing under 60%. Exam mode shows your score at the end; practice mode
          explains each answer as you go.
        </p>
      </PageHeader>

      <section aria-labelledby="make" className="sheet mt-10 p-5 sm:p-8">
        <h2 id="make" className="text-title font-bold">
          Make a quiz
        </h2>

        <fieldset className="mt-6">
          <legend className="text-small font-semibold">Papers</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={isMock}
              className={`chip ${isMock ? "chip-on" : ""}`}
              onClick={() => {
                setTopics([]);
                setPapers(EXAM_PAPERS.map((p) => p.id));
                setCount(100);
              }}
            >
              Mock board: all five
            </button>
            {PAPERS.map((p) => (
              <button key={p.id} type="button" data-tone={toneFor(look, p.id)} aria-pressed={papers.includes(p.id) && !isMock} className={`chip ${papers.includes(p.id) && !isMock ? "chip-on" : ""}`} onClick={() => (isMock ? (setPapers([p.id]), setCount(25)) : togglePaper(p.id))}>
                <span className="font-bold">{p.short}</span>
                <span className="hidden font-normal sm:inline">{p.name}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {papers.length === 1 && (
          <details className="group mt-5" open={topics.length > 0}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-small font-semibold text-accent-ink [&::-webkit-details-marker]:hidden">
              <ChevronDownIcon size={18} className="transition-transform group-open:rotate-180" />
              Narrow to specific topics {topics.length ? `(${topics.length} chosen)` : "(optional)"}
            </summary>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {topicsInPaper(papers[0]).map((t) => {
                const checked = topics.includes(t.id);
                const available = bank.questionsInTopic(t.id).length;
                return (
                  <label key={t.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-sunken">
                    <input
                      type="checkbox"
                      className="size-5"
                      checked={checked}
                      disabled={!available}
                      onChange={() => setTopics((cur) => (checked ? cur.filter((x) => x !== t.id) : [...cur, t.id]))}
                    />
                    <span className="flex-1">{t.name}</span>
                    <span className="tabular text-meta text-ink-muted">{available}</span>
                  </label>
                );
              })}
            </div>
          </details>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <fieldset>
            <legend className="text-small font-semibold">Items</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {COUNTS.map((c) => (
                <button key={c} type="button" aria-pressed={count === c} className={`chip tabular ${count === c ? "chip-on" : ""}`} onClick={() => setCount(c)}>
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-small font-semibold">Question style</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["all", "Both"],
                  ["pnle", "PNLE board"],
                  ["nclex", "NCLEX"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={style === v} className={`chip ${style === v ? "chip-on" : ""}`} onClick={() => setStyle(v)}>
                  {l}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-small font-semibold">Answers</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" aria-pressed={feedback === "end"} className={`chip ${feedback === "end" ? "chip-on" : ""}`} onClick={() => setFeedback("end")}>
                Exam: at the end
              </button>
              <button type="button" aria-pressed={feedback === "immediate"} className={`chip ${feedback === "immediate" ? "chip-on" : ""}`} onClick={() => setFeedback("immediate")}>
                Practice: each one
              </button>
            </div>
          </fieldset>
        </div>

        <label className="mt-6 flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" className="size-5" checked={onlyMissed} onChange={(e) => setOnlyMissed(e.target.checked)} />
          <span>Only questions I&apos;ve missed before</span>
        </label>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:gap-5">
          <button type="button" className="btn btn-primary btn-large" onClick={start} disabled={n === 0 || Boolean(data.activeSession)}>
            Start {n > 0 ? `${n}-item quiz` : "quiz"}
            <ArrowRightIcon size={22} />
          </button>
          <p className="text-small text-ink-muted">
            {data.activeSession
              ? "Finish or end the session in progress first (it's on Today)."
              : pool.length === 0
                ? "No questions match these choices."
                : `${plural(pool.length, "question")} match. ${isMock ? "Items are spread evenly across the papers. " : ""}Unseen questions come first.`}
          </p>
        </div>
      </section>

      <section aria-labelledby="history" className="mt-14">
        <SectionTitle id="history" className="text-title">
          Past quizzes
        </SectionTitle>
        {quizzes.length === 0 ? (
          <p className="mt-3 text-ink-soft">Your quiz results will be listed here, with every answer to look back on.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {quizzes.map((q) => (
              <HistoryRow key={q.id} record={q} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ record }: { record: SessionRecord }) {
  const g = grade(record.byPaper);
  return (
    <li>
      <details className="group">
        <summary className="flex min-h-16 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 py-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{record.title}</span>
            <span className="block text-meta text-ink-muted">
              {formatDate(record.endedAt)} · {record.feedback === "end" ? "Exam mode" : "Practice mode"} · {g.correct} of {g.total}
            </span>
          </span>
          <span className="figure text-title">{fmtPct(g.percent)}</span>
          <BandChip band={g.band} short />
          <ChevronDownIcon className="text-ink-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="pb-6">
          <QuizReview record={record} />
        </div>
      </details>
    </li>
  );
}
