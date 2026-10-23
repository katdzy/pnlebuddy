"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getPaper, PAPERS, topicsInPaper, type PaperId } from "@/content/taxonomy";
import { paperOfTopic, topicName } from "@/lib/bank";
import { cardCountsByTopic, newCardsToday } from "@/lib/cards";
import { encouragement, formatDate, greeting, plural } from "@/lib/copy";
import { grade } from "@/lib/grading";
import { computePaperStats, computeTopicStats, describeBreakdown, dueForReviewCount, recentAccuracy, type PaperStats, type TopicStats } from "@/lib/insights";
import { todayIcon } from "@/lib/look";
import { lookActions, useLook } from "@/lib/lookStore";
import { DAY_MS } from "@/lib/scheduler";
import { planSession } from "@/lib/session";
import { actions } from "@/lib/store";
import { BandChip, fmtPct, Meter, PaperIcon, PaperTag, SectionTitle, usePaperTone } from "../Bits";
import { DurationPicker } from "../DurationPicker";
import { WithData, type Ready } from "../Gate";
import { ArrowRightIcon } from "../Icons";
import { PageHeader } from "../look/PageHeader";

export function TodayScreen() {
  return <WithData>{(ready) => <Today {...ready} />}</WithData>;
}

function Today({ data, bank, now }: Ready) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(data.profile.preferredMinutes);
  const hasHistory = data.attempts.length > 0;
  const lastStudiedAt = Math.max(data.attempts.at(-1)?.at ?? 0, data.sessions.at(-1)?.endedAt ?? 0) || null;

  const plan = useMemo(() => planSession(data, bank, minutes, now), [data, bank, minutes, now]);
  const stats = useMemo(() => computeTopicStats(bank, data.attempts, data.progress, now), [bank, data.attempts, data.progress, now]);
  const focus = data.profile.focusPaper ? getPaper(data.profile.focusPaper) : null;
  const available = focus ? bank.questionsInPaper(focus.id).length : bank.questions.length;

  function start() {
    actions.startRecommended(minutes);
    router.push("/study");
  }

  return (
    <div>
      <PageHeader iconKey="page:today" fallbackIcon={todayIcon(new Date(now).getHours())} title={greeting(now, data.profile.name)}>
        <p className="mt-2 text-lead text-ink-soft">{encouragement(now, lastStudiedAt)}</p>
        <Motto />
      </PageHeader>

      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <section aria-labelledby="next-step-title" className="sheet self-start p-5 sm:p-8 lg:col-span-7">
          {data.activeSession ? (
            <ResumeSession data={data} onResume={() => router.push("/study")} />
          ) : plan.recommendation ? (
            <>
              <h2 id="next-step-title" className="text-title font-bold sm:text-headline">
                {plan.recommendation.title}
              </h2>
              <p className="mt-4 max-w-[60ch] text-body text-ink-soft">
                <span className="font-semibold text-ink">Why this: </span>
                {plan.recommendation.reason}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {[...new Set(plan.items.map((i) => paperOfTopic(i.topicId)).filter((p): p is PaperId => Boolean(p)))].map((p) => (
                  <PaperTag key={p} paperId={p} />
                ))}
                <span className="text-meta text-ink-muted">
                  {describeBreakdown(plan.recommendation.breakdown).join(" · ")}
                  {focus && ` · ${focus.short} focus`}
                </span>
              </div>

              <div className="mt-8 border-t border-line pt-6">
                <DurationPicker value={minutes} onChange={setMinutes} available={available} />
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                <button type="button" className="btn btn-primary btn-large w-full sm:w-auto" onClick={start}>
                  Start studying
                  <ArrowRightIcon size={22} />
                </button>
                <p className="text-small text-ink-muted">About {minutes} minutes. You can stop whenever you like.</p>
              </div>
            </>
          ) : (
            <>
              <h2 id="next-step-title" className="text-title font-bold">
                Nothing in the queue
              </h2>
              <p className="mt-3 text-ink-soft">There are no questions for this focus yet. Try a different paper in Settings.</p>
            </>
          )}
        </section>

        <div className="grid content-start gap-10 md:grid-cols-2 lg:col-span-5 lg:grid-cols-1 lg:gap-0 lg:divide-y lg:divide-line lg:[&>*]:py-8 lg:[&>*:first-child]:pt-2">
          <CardsToday data={data} now={now} />
          {hasHistory ? <TopicsToReview stats={stats} /> : <HowItWorks />}
          <LatestQuiz data={data} />
          {hasHistory && <Lately data={data} now={now} />}
        </div>
      </div>

      <PapersAtAGlance data={data} stats={stats} />
    </div>
  );
}

/** Her motto or a note to self, as a callout under the greeting. Tap to edit. */
function Motto() {
  const { motto } = useLook();
  const [draft, setDraft] = useState<string | null>(null);

  if (draft !== null) {
    return (
      <form
        className="mt-5 flex max-w-2xl flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          lookActions.setMotto(draft.trim());
          setDraft(null);
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Your motto</span>
          <input
            className="field"
            autoFocus
            maxLength={140}
            value={draft}
            placeholder="Future RN. Kaya mo 'to."
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">
            Save
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }
  if (!motto) {
    return (
      <button type="button" className="btn btn-quiet -ml-3 mt-3 min-h-11 text-small text-ink-muted" onClick={() => setDraft("")}>
        + Add a motto or a note to yourself
      </button>
    );
  }
  return (
    <button
      type="button"
      data-tone="accent"
      className="callout mt-5 w-full max-w-2xl text-left transition-[filter] hover:brightness-[0.98]"
      onClick={() => setDraft(motto)}
      aria-label={`Your motto: ${motto}. Edit`}
    >
      <span className="callout-icon" aria-hidden="true">
        💭
      </span>
      <span className="text-lead font-bold text-accent-ink">{motto}</span>
    </button>
  );
}

/** Every paper with its icon, colour and how much she's covered, like a linked database. */
function PapersAtAGlance({ data, stats }: { data: Ready["data"]; stats: Record<string, TopicStats> }) {
  const paperStats = useMemo(() => computePaperStats(stats, data.attempts, data.sessions), [stats, data.attempts, data.sessions]);
  return (
    <section aria-labelledby="papers-title" className="mt-16">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <SectionTitle id="papers-title">Your papers</SectionTitle>
        <Link href="/tracker" className="link inline-flex min-h-11 items-center gap-1.5 text-small">
          Tracker <ArrowRightIcon size={16} />
        </Link>
      </div>
      <ul className="grid sm:grid-cols-2 sm:gap-x-10 xl:grid-cols-3">
        {PAPERS.map((p) => (
          <PaperLine key={p.id} paperId={p.id} stats={paperStats[p.id]} ticked={topicsInPaper(p.id).filter((t) => data.topicsDone[t.id]).length} />
        ))}
      </ul>
    </section>
  );
}

function PaperLine({ paperId, stats, ticked }: { paperId: PaperId; stats: PaperStats; ticked: number }) {
  const paper = getPaper(paperId)!;
  const tone = usePaperTone(paperId);
  const topics = topicsInPaper(paperId).length;
  return (
    <li className="border-b border-line">
      <Link href={`/tracker#paper-${paperId}`} className="group flex items-center gap-3 py-4 text-ink no-underline">
        <PaperIcon paperId={paperId} className="text-[1.75rem]" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <PaperTag paperId={paperId} />
            <span className="truncate font-bold group-hover:underline">{paper.id === "int" ? "Integrated" : paper.name}</span>
          </span>
          <span className="mt-2 flex items-center gap-3">
            <Meter value={stats.seenQuestions} max={stats.totalQuestions} label={`${paper.short} questions seen`} tone={tone} />
            <span className="tabular shrink-0 text-meta text-ink-muted">
              {ticked}/{topics} ticked
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function ResumeSession({ data, onResume }: { data: Ready["data"]; onResume: () => void }) {
  const s = data.activeSession!;
  const answered = Object.keys(s.responses).length;
  return (
    <>
      <h2 id="next-step-title" className="pr-8 text-title font-bold sm:pr-12 sm:text-headline">
        Pick up where you left off
      </h2>
      <p className="mt-4 max-w-[60ch] text-ink-soft">
        <span className="font-semibold text-ink">{s.title}. </span>
        {answered === 0
          ? "It's ready whenever you are."
          : `You've answered ${answered} of ${s.questionIds.length}. Everything so far is saved.`}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" className="btn btn-primary btn-large w-full sm:w-auto" onClick={onResume}>
          Continue
          <ArrowRightIcon size={22} />
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => (answered > 0 && s.feedback === "immediate" ? actions.finish() : actions.discardSession())}
        >
          {s.feedback === "end" ? "Discard this quiz" : "End it and plan a new one"}
        </button>
      </div>
    </>
  );
}

function CardsToday({ data, now }: { data: Ready["data"]; now: number }) {
  const counts = cardCountsByTopic(data.cards, now);
  const due = Object.values(counts).reduce((n, c) => n + c.due, 0);
  const learned = Object.values(counts).reduce((n, c) => n + c.learned, 0);
  const newLeft = Math.max(0, data.profile.newCardsPerDay - newCardsToday(data.cardLog, now));
  return (
    <section aria-labelledby="cards-title">
      <SectionTitle id="cards-title">Flashcards</SectionTitle>
      <p className="mt-2 text-ink-soft">
        {due > 0 ? `${plural(due, "card is", "cards are")} ready for review` : "No cards waiting for review"}
        {newLeft > 0 ? `, plus up to ${newLeft} new today.` : "."}
        {learned > 0 && ` ${plural(learned, "card")} learned so far.`}
      </p>
      <Link href="/cards" className="btn btn-secondary mt-4 no-underline">
        {due > 0 ? "Review cards" : "Open flashcards"}
      </Link>
    </section>
  );
}

function TopicsToReview({ stats }: { stats: Record<string, TopicStats> }) {
  const list = Object.values(stats)
    .filter((s) => s.status === "needs-practice" || s.dueCount > 0)
    .sort((a, b) => (a.recentAccuracy ?? 1) - (b.recentAccuracy ?? 1) || b.dueCount - a.dueCount)
    .slice(0, 4);
  return (
    <section aria-labelledby="review-title">
      <SectionTitle id="review-title">Worth another look</SectionTitle>
      {list.length === 0 ? (
        <p className="mt-3 text-ink-soft">Nothing needs extra attention right now.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {list.map((s) => (
            <li key={s.topicId}>
              <Link href={`/topics/${s.topicId}`} className="flex items-center justify-between gap-4 py-3 text-ink no-underline hover:bg-sunken/50">
                <div>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
                    {paperOfTopic(s.topicId) && <PaperTag paperId={paperOfTopic(s.topicId)!} />}
                    {topicName(s.topicId)}
                  </p>
                  <p className="text-meta text-ink-muted">
                    {s.recentAttempts > 0 ? `${s.recentCorrect} of last ${s.recentAttempts} correct` : "Not tried recently"}
                  </p>
                </div>
                {s.dueCount > 0 && <span className="tabular shrink-0 text-meta font-bold text-accent-ink">{s.dueCount} to review</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LatestQuiz({ data }: { data: Ready["data"] }) {
  const last = [...data.sessions].reverse().find((s) => s.mode === "quiz");
  return (
    <section aria-labelledby="quiz-title">
      <SectionTitle id="quiz-title">Quizzes</SectionTitle>
      {last ? (
        <>
          <p className="mt-2 text-ink-soft">
            Last: <span className="font-semibold text-ink">{last.title}</span>, {formatDate(last.endedAt)}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="figure text-title">{fmtPct(grade(last.byPaper).percent)}</span>
            <BandChip band={grade(last.byPaper).band} />
          </div>
        </>
      ) : (
        <p className="mt-2 text-ink-soft">Graded quizzes by paper or topic, practice or exam style.</p>
      )}
      <Link href="/quiz" className="link mt-3 inline-flex min-h-11 items-center gap-1.5">
        {last ? "New quiz or past results" : "Make a quiz"}
        <ArrowRightIcon size={18} />
      </Link>
    </section>
  );
}

function Lately({ data, now }: { data: Ready["data"]; now: number }) {
  const weekCount = data.attempts.filter((a) => a.at > now - 7 * DAY_MS).length;
  const recent = recentAccuracy(data.attempts);
  const due = dueForReviewCount(data.progress, now);
  return (
    <section aria-labelledby="lately-title">
      <SectionTitle id="lately-title">Lately</SectionTitle>
      <ul className="mt-3 space-y-2 text-ink-soft">
        <li>
          {weekCount > 0
            ? `You've answered ${plural(weekCount, "question")} this week.`
            : "It's been a quiet week, which is fine. Your progress is all still here."}
        </li>
        {recent && (
          <li>
            You got {recent.correct} of your last {recent.total} right.
          </li>
        )}
        <li>{due > 0 ? `${plural(due, "question is", "questions are")} ready for review.` : "Nothing is waiting for review."}</li>
      </ul>
      <Link href="/tracker" className="link mt-4 inline-flex min-h-11 items-center gap-1.5">
        Open the tracker
        <ArrowRightIcon size={18} />
      </Link>
    </section>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="how-title">
      <SectionTitle id="how-title">How this works</SectionTitle>
      <ol className="mt-3 space-y-3 text-ink-soft">
        <li>
          <span className="font-semibold text-ink">Answer one question at a time.</span> Each one explains the answer once
          you&apos;ve chosen.
        </li>
        <li>
          <span className="font-semibold text-ink">Note what tripped you up.</span> Misses go to your notebook so you can
          come back to them.
        </li>
        <li>
          <span className="font-semibold text-ink">Let it come back.</span> Missed questions return first; the rest are
          spaced out so they stick.
        </li>
      </ol>
      <p className="mt-3 text-meta text-ink-muted">
        Questions and flashcards come from your own review materials, sorted into NP1–NP5 topics.
      </p>
    </section>
  );
}
