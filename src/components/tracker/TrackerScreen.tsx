"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { areasInPaper, PAPERS, topicsInArea, topicsInPaper, type Paper } from "@/content/taxonomy";
import { cardCountsByTopic, type CardCounts } from "@/lib/cards";
import { FLOOR, PASSING } from "@/lib/grading";
import { computePaperStats, computeTopicStats, STATUS_LABEL, type PaperStats, type TopicStats } from "@/lib/insights";
import { iconFor, type ToneId } from "@/lib/look";
import { useLook } from "@/lib/lookStore";
import { actions } from "@/lib/store";
import { BandChip, fmtPct, Meter, PaperIcon, PaperTag, Tick, usePaperTone } from "../Bits";
import { WithData, type Ready } from "../Gate";
import { CheckIcon, ChevronRightIcon } from "../Icons";
import { PageHeader } from "../look/PageHeader";

export function TrackerScreen() {
  return <WithData label="Loading your tracker">{(ready) => <Tracker {...ready} />}</WithData>;
}

/** Performance as a select tag. "Needs practice" uses the soft miss colour, never red. */
export function StatusTag({ status }: { status: TopicStats["status"] }) {
  const tone: Record<TopicStats["status"], ToneId | null> = {
    "not-started": "gray",
    "getting-started": "brown",
    "needs-practice": null,
    building: "blue",
    steady: "green",
  };
  const t = tone[status];
  return (
    <span
      className="tag"
      data-tone={t ?? undefined}
      style={t ? undefined : { background: "var(--color-miss-wash)", color: "var(--color-miss)" }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function Tracker({ data, bank, content, now }: Ready) {
  const topicStats = useMemo(() => computeTopicStats(bank, data.attempts, data.progress, now), [bank, data.attempts, data.progress, now]);
  const paperStats = useMemo(() => computePaperStats(topicStats, data.attempts, data.sessions), [topicStats, data.attempts, data.sessions]);
  const cardCounts = useMemo(() => cardCountsByTopic(data.cards, now), [data.cards, now]);
  const cardTotals = content.manifest?.topics ?? {};
  const totalTopics = Object.keys(topicStats).length;
  const ticked = Object.keys(data.topicsDone).length;
  const learned = Object.values(cardCounts).reduce((n, c) => n + c.learned, 0);

  return (
    <div>
      <PageHeader iconKey="page:tracker" title="Tracker">
        <p className="mt-2 max-w-[65ch] text-lead text-ink-soft">
          Sorted the way the board is: NP1 to NP5, then what&apos;s tested inside every paper. Nothing here is a deadline.
        </p>
      </PageHeader>

      <dl className="mt-10 grid grid-cols-2 gap-y-2 border-y border-line md:grid-cols-4 md:divide-x md:divide-line">
        <Summary label="Questions answered" value={data.attempts.length.toLocaleString()} />
        <Summary label="Topics started" value={`${Object.values(topicStats).filter((t) => t.attempts > 0).length}`} of={totalTopics} />
        <Summary label="Flashcards learned" value={learned.toLocaleString()} />
        <Summary label="Ticked off" value={String(ticked)} of={totalTopics} />
      </dl>

      <section aria-labelledby="readiness" className="mt-14">
        <h2 id="readiness" className="text-title font-bold">
          Board readiness
        </h2>
        <p className="mt-2 max-w-[70ch] text-small text-ink-soft">
          The PNLE needs a {PASSING}% general average with no paper below {FLOOR}%. Recent is your accuracy in practice,
          Quizzes your quiz average. Each needs at least 5 answers before it says anything.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="db min-w-[40rem]">
            <thead>
              <tr>
                <th scope="col">Paper</th>
                <th scope="col" className="w-24 text-right">Recent</th>
                <th scope="col" className="w-24 text-right">Quizzes</th>
                <th scope="col" className="w-44">Covered</th>
              </tr>
            </thead>
            <tbody>
              {PAPERS.map((p) => (
                <ReadinessRow key={p.id} paper={p} stats={paperStats[p.id]} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="by-paper" className="mt-16">
        <h2 id="by-paper" className="text-title font-bold">
          Topics
        </h2>
        <p className="mt-2 max-w-[70ch] text-small text-ink-soft">
          Tick a topic when <span className="font-bold text-ink">you</span> feel you&apos;ve gone through it. That&apos;s your
          own checklist. <span className="font-bold text-ink">Performance</span> is separate: it only reflects how
          you&apos;ve actually answered lately.
        </p>
        <div className="mt-6 space-y-2">
          {PAPERS.map((p) => (
            <PaperSection
              key={p.id}
              paper={p}
              stats={paperStats[p.id]}
              topicStats={topicStats}
              cardCounts={cardCounts}
              cardTotals={cardTotals}
              data={data}
              initiallyOpen={data.profile.focusPaper ? data.profile.focusPaper === p.id : p.id === "np1"}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value, of }: { label: string; value: string; of?: number }) {
  return (
    <div className="py-5 pr-4 md:px-6 md:first:pl-0">
      <dt className="text-meta text-ink-muted">{label}</dt>
      <dd className="figure mt-1 text-headline">
        {value}
        {of !== undefined && <span className="text-lead font-normal text-ink-muted"> / {of}</span>}
      </dd>
    </div>
  );
}

function ReadinessRow({ paper, stats }: { paper: Paper; stats: PaperStats }) {
  const tone = usePaperTone(paper.id);
  const pct = stats.totalQuestions ? Math.round((stats.seenQuestions / stats.totalQuestions) * 100) : null;
  return (
    <tr>
      <th scope="row" className="!h-auto !py-3 !text-body !font-normal !text-ink">
        <a href={`#paper-${paper.id}`} className="flex items-center gap-3 text-ink no-underline hover:underline">
          <PaperIcon paperId={paper.id} className="text-[1.5rem]" />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <PaperTag paperId={paper.id} />
              <span className="font-bold">{paper.id === "int" ? "Integrated" : paper.name}</span>
              {stats.band && <BandChip band={stats.band} short />}
            </span>
            <span className="mt-0.5 block whitespace-normal text-meta text-ink-muted">
              {stats.topicsNeedingPractice > 0
                ? `${stats.topicsNeedingPractice} topic${stats.topicsNeedingPractice === 1 ? "" : "s"} could use more practice.`
                : stats.recentAttempts
                  ? "No topic is giving you trouble right now."
                  : "Not started yet."}
            </span>
          </span>
        </a>
      </th>
      <td className="figure text-right text-lead">{fmtPct(stats.recentPercent)}</td>
      <td className="figure text-right text-lead">{fmtPct(stats.quizPercent)}</td>
      <td>
        <span className="flex items-center gap-3">
          <Meter value={stats.seenQuestions} max={stats.totalQuestions} label={`${paper.short} questions covered`} tone={tone} />
          <span className="tabular w-10 shrink-0 text-right text-meta text-ink-muted">{pct === null ? "–" : `${pct}%`}</span>
        </span>
      </td>
    </tr>
  );
}

function PaperSection({
  paper,
  stats,
  topicStats,
  cardCounts,
  cardTotals,
  data,
  initiallyOpen,
}: {
  paper: Paper;
  stats: PaperStats;
  topicStats: Record<string, TopicStats>;
  cardCounts: Record<string, CardCounts>;
  cardTotals: Record<string, { questions: number; cards: number }>;
  data: Ready["data"];
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const look = useLook();
  const tone = usePaperTone(paper.id);
  const anchor = `paper-${paper.id}`;
  const topics = topicsInPaper(paper.id);
  const ticked = topics.filter((t) => data.topicsDone[t.id]).length;

  // Opening from the sidebar or the readiness table: unfold this paper and bring it into view.
  useEffect(() => {
    function check() {
      if (window.location.hash !== `#${anchor}`) return;
      setOpen(true);
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: "start" }));
    }
    check();
    window.addEventListener("hashchange", check);
    window.addEventListener("popstate", check);
    return () => {
      window.removeEventListener("hashchange", check);
      window.removeEventListener("popstate", check);
    };
  }, [anchor]);

  return (
    <details
      id={anchor}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group scroll-mt-6 border-b border-line pb-2"
      data-tone={tone}
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-md py-3 pr-2 hover:bg-sunken/60 [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon size={18} className="ml-1 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-90" />
        <PaperIcon paperId={paper.id} className="text-[1.75rem]" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-display text-lead font-bold">{paper.id === "int" ? "Integrated in every paper" : paper.name}</span>
            <PaperTag paperId={paper.id} />
          </span>
          <span className="block text-meta text-ink-muted">{paper.summary}</span>
        </span>
        <span className="hidden w-40 shrink-0 sm:block">
          <span className="tabular block text-right text-meta text-ink-muted">
            {ticked}/{topics.length} ticked · {stats.seenQuestions}/{stats.totalQuestions} seen
          </span>
          <span className="mt-1.5 block">
            <Meter value={ticked} max={topics.length} label={`${paper.short} topics ticked`} tone={tone} />
          </span>
        </span>
      </summary>

      <div className="pb-4 pl-0 sm:pl-8">
        {paper.id !== "int" && (
          <div className="flex flex-wrap items-center gap-2 pb-2 pt-1">
            <button
              type="button"
              className="btn btn-secondary min-h-11"
              onClick={() => actions.setFocusPaper(data.profile.focusPaper === paper.id ? null : paper.id)}
              aria-pressed={data.profile.focusPaper === paper.id}
            >
              {data.profile.focusPaper === paper.id ? `Today is focused on ${paper.short}` : `Focus Today on ${paper.short}`}
            </button>
            <Link href={`/quiz?paper=${paper.id}`} className="btn btn-quiet min-h-11 no-underline">
              Quiz {paper.short}
            </Link>
          </div>
        )}
        {areasInPaper(paper.id).map((area) => (
          <div key={area.id} className="mt-4">
            <h3 className="flex items-center gap-2 text-small font-bold text-ink-soft">
              <span className="size-2 rounded-full bg-[var(--tone-solid)]" aria-hidden="true" />
              {area.name}
              {area.id === "int-anaphy" && (
                <Link href="/anatomy" className="ml-auto font-normal">
                  Open the 3D body
                </Link>
              )}
            </h3>
            <div className="mt-1 overflow-x-auto">
              <table className="db min-w-[38rem] table-fixed">
                <thead>
                  <tr>
                    <th scope="col" className="w-14 !px-1 text-center">
                      Done
                    </th>
                    <th scope="col">Topic</th>
                    <th scope="col" className="w-36">Performance</th>
                    <th scope="col" className="w-28">Questions</th>
                    <th scope="col" className="w-28">Cards</th>
                    <th scope="col" className="w-14 !px-1 text-center">
                      <span className="sr-only">Reviewer read</span>
                      <span aria-hidden="true">📖</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topicsInArea(area.id).map((t) => {
                    const s = topicStats[t.id];
                    const cc = cardCounts[t.id];
                    const totalCards = cardTotals[t.id]?.cards ?? 0;
                    const icon = iconFor(look, `topic:${t.id}`);
                    return (
                      <tr key={t.id}>
                        <td className="!p-0 text-center">
                          <Tick checked={Boolean(data.topicsDone[t.id])} onChange={(v) => actions.setTopicDone(t.id, v)} label={`${t.name}: done`} />
                        </td>
                        <td>
                          <Link href={`/topics/${t.id}`} className="flex min-h-10 items-center gap-2 font-bold text-ink no-underline hover:underline">
                            {icon && (
                              <span aria-hidden="true" className="text-[1.125rem]">
                                {icon}
                              </span>
                            )}
                            <span className={data.topicsDone[t.id] ? "text-ink-soft" : ""}>{t.name}</span>
                          </Link>
                        </td>
                        <td>
                          <StatusTag status={s.status} />
                          {s.recentAttempts > 0 && (
                            <span className="tabular mt-1 block text-meta text-ink-muted">
                              {s.recentCorrect} of last {s.recentAttempts}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="tabular block text-meta text-ink-muted">
                            {s.seenQuestions}/{s.totalQuestions}
                          </span>
                          <Meter value={s.seenQuestions} max={s.totalQuestions} label={`${t.name} questions covered`} tone={tone} />
                        </td>
                        <td>
                          <span className="tabular block text-meta text-ink-muted">
                            {cc?.learned ?? 0}/{totalCards}
                          </span>
                          <Meter value={cc?.learned ?? 0} max={totalCards} label={`${t.name} cards learned`} tone="gray" />
                        </td>
                        <td className="text-center">
                          {data.reviewersRead[t.id] ? (
                            <CheckIcon className="inline text-accent-deep" aria-label="Reviewer read" aria-hidden={false} role="img" />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
