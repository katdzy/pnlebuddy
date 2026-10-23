"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { getArea, getPaper, getTopic } from "@/content/taxonomy";
import { setCardScope } from "@/lib/cardScope";
import { cardCountsByTopic } from "@/lib/cards";
import { formatDate, plural } from "@/lib/copy";
import { computeTopicStats } from "@/lib/insights";
import { actions } from "@/lib/store";
import { Meter, PaperTag, Tick, usePaperTone } from "../Bits";
import { WithData, type Ready } from "../Gate";
import { ArrowRightIcon, BookIcon, CheckIcon } from "../Icons";
import { PageHeader } from "../look/PageHeader";
import { StatusTag } from "../tracker/TrackerScreen";

interface ReadingRef {
  file: string;
  label: string;
  pages: number[];
}

export function TopicScreen(props: { topicId: string; reviewerHtml: string | null; reading: ReadingRef[] }) {
  return <WithData label="Loading topic">{(ready) => <Topic {...ready} {...props} />}</WithData>;
}

function pagesLabel(pages: number[]): string {
  // Collapse runs: 3,4,5,9 → "pp. 3–5, 9"
  const parts: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    let j = i;
    while (j + 1 < pages.length && pages[j + 1] === pages[j] + 1) j++;
    parts.push(i === j ? `${pages[i]}` : `${pages[i]}–${pages[j]}`);
    i = j;
  }
  return `${pages.length === 1 ? "p." : "pp."} ${parts.slice(0, 6).join(", ")}${parts.length > 6 ? ", …" : ""}`;
}

function Topic({ data, bank, content, now, topicId, reviewerHtml, reading }: Ready & { topicId: string; reviewerHtml: string | null; reading: ReadingRef[] }) {
  const router = useRouter();
  const topic = getTopic(topicId)!;
  const paper = getPaper(topic.paperId)!;
  const area = getArea(topic.areaId);
  const stats = useMemo(() => computeTopicStats(bank, data.attempts, data.progress, now)[topicId], [bank, data, now, topicId]);
  const cards = cardCountsByTopic(data.cards, now)[topicId];
  const totalCards = content.manifest?.topics[topicId]?.cards ?? 0;
  const mistakes = data.mistakes.filter((m) => m.snapshot.topicId === topicId && !m.resolvedAt);
  const read = data.reviewersRead[topicId];
  const done = data.topicsDone[topicId];
  const tone = usePaperTone(topic.paperId);
  const questions = bank.questionsInTopic(topicId);
  const styles = { pnle: questions.filter((q) => q.style === "pnle").length, nclex: questions.filter((q) => q.style === "nclex").length };
  const highYield = questions.filter((q) => (q.seenIn ?? 1) > 1).length;

  function practice() {
    actions.startTopic(topicId, 12);
    router.push("/study");
  }
  function studyCards() {
    setCardScope({ title: topic.name, papers: [topic.paperId], topicIds: [topicId], includeNew: true });
    router.push("/flashcards");
  }

  return (
    <div>
      <PageHeader
        iconKey={`topic:${topicId}`}
        coverKey={`paper:${paper.id}`}
        tone={tone}
        title={topic.name}
        crumbs={
          <>
            <Link href="/tracker" className="text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink">
              Tracker
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={`/tracker#paper-${paper.id}`} className="text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink">
              {paper.short}
            </Link>
          </>
        }
      />

      <dl className="props mt-6 max-w-3xl border-b border-line pb-4">
        <dt>Paper</dt>
        <dd>
          <PaperTag paperId={paper.id} long />
        </dd>
        <dt>Area</dt>
        <dd>{area?.name}</dd>
        <dt>My checklist</dt>
        <dd>
          <span className="-ml-3 flex items-center">
            <Tick checked={Boolean(done)} onChange={(v) => actions.setTopicDone(topicId, v)} label="Done with this topic" />
            <span className={done ? "font-bold" : "text-ink-muted"}>{done ? `Done · ticked ${formatDate(done)}` : "Not ticked yet"}</span>
          </span>
        </dd>
        <dt>Performance</dt>
        <dd>
          <StatusTag status={stats.status} />
          {stats.recentAttempts > 0 && (
            <span className="tabular text-meta text-ink-muted">
              {stats.recentCorrect} of last {stats.recentAttempts}
            </span>
          )}
        </dd>
        <dt>Questions seen</dt>
        <dd className="!flex-nowrap">
          <span className="w-40 sm:w-56">
            <Meter value={stats.seenQuestions} max={stats.totalQuestions} label="Questions seen" tone={tone} />
          </span>
          <span className="tabular text-meta text-ink-muted">
            {stats.seenQuestions} / {stats.totalQuestions}
          </span>
        </dd>
        <dt>Cards learned</dt>
        <dd className="!flex-nowrap">
          <span className="w-40 sm:w-56">
            <Meter value={cards?.learned ?? 0} max={totalCards} label="Cards learned" tone="gray" />
          </span>
          <span className="tabular text-meta text-ink-muted">
            {cards?.learned ?? 0} / {totalCards}
          </span>
        </dd>
        <dt>Notebook</dt>
        <dd>{mistakes.length ? plural(mistakes.length, "open note") : <span className="text-ink-muted">Nothing open</span>}</dd>
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" className="btn btn-primary btn-large" onClick={practice} disabled={!questions.length}>
          Practice 12 questions
          <ArrowRightIcon size={22} />
        </button>
        <Link href={`/quiz?topic=${topicId}`} className="btn btn-secondary btn-large no-underline">
          Graded quiz
        </Link>
        <button type="button" className="btn btn-secondary btn-large" onClick={studyCards} disabled={!totalCards}>
          Study flashcards{cards?.due ? ` (${cards.due} due)` : ""}
        </button>
      </div>
      <p className="mt-3 text-meta text-ink-muted">
        {plural(questions.length, "question")}: {styles.pnle} board-style (PNLE), {styles.nclex} NCLEX-style
        {highYield > 0 && ` · ${highYield} appear in more than one of your sources`}
      </p>

      <div className="mt-14 grid gap-12 lg:grid-cols-12">
        <section aria-labelledby="reviewer" className="lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="reviewer" className="flex items-center gap-2 text-title font-bold">
              <BookIcon size={24} /> Reviewer
            </h2>
            {reviewerHtml && (
              <button
                type="button"
                aria-pressed={Boolean(read)}
                className={`btn min-h-11 ${read ? "btn-quiet text-accent-ink" : "btn-secondary"}`}
                onClick={() => actions.setReviewerRead(topicId, !read)}
              >
                {read ? (
                  <>
                    <CheckIcon size={18} /> Read {formatDate(read)}
                  </>
                ) : (
                  "Mark as read"
                )}
              </button>
            )}
          </div>
          {reviewerHtml ? (
            <article className="reviewer mt-6 max-w-[70ch]" dangerouslySetInnerHTML={{ __html: reviewerHtml }} />
          ) : (
            <div className="callout mt-4 max-w-[62ch]" data-tone={tone}>
              <span className="callout-icon" aria-hidden="true">
                🗒️
              </span>
              <div>
                <p className="font-bold">No reviewer for this topic yet.</p>
                <p className="mt-1 text-small text-ink-soft">
                  Reviewers are short notes, one Markdown file per topic (
                  <code className="text-meta">content/reviewers/{topicId}.md</code>). Until there&apos;s one, the pages
                  listed here are where this topic shows up in your own files.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside aria-labelledby="in-your-files" className="min-w-0 lg:col-span-4">
          <h2 id="in-your-files" className="text-lead font-bold">
            Read in your files
          </h2>
          {reading.length === 0 ? (
            <p className="mt-2 text-small text-ink-soft">No pages matched this topic in your notes.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {reading.map((r) => (
                <li key={r.file} className="py-3">
                  <p className="break-all font-semibold leading-snug">{r.label.replace(/^[^:]+:\s*/, "").replace(/_/g, " ")}</p>
                  <p className="tabular text-meta text-ink-muted">{pagesLabel(r.pages)}</p>
                  <p className="mt-0.5 break-words text-[0.75rem] text-ink-muted">RN2027/{r.file}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-meta text-ink-muted">Found by matching this topic&apos;s key terms page by page, so treat it as a starting point.</p>

          {mistakes.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lead font-bold">Open notes</h2>
              <ul className="mt-3 space-y-3">
                {mistakes.slice(0, 4).map((m) => (
                  <li key={m.id} className="rounded-control border border-line bg-surface p-3 text-small">
                    <p className="line-clamp-3">{m.kind === "card" ? m.snapshot.prompt.replace(/<[^>]+>/g, " ") : m.snapshot.prompt}</p>
                    {m.note && <p className="mt-1 text-ink-soft">“{m.note}”</p>}
                  </li>
                ))}
              </ul>
              <Link href="/notebook" className="link mt-3 inline-flex min-h-11 items-center gap-1.5">
                Open notebook <ArrowRightIcon size={18} />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
