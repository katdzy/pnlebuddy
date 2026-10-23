"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PAPERS } from "@/content/taxonomy";
import { paperShort, topicName } from "@/lib/bank";
import { getCardScope, type CardScope } from "@/lib/cardScope";
import { buildCardQueue, newCardsToday, previewInterval } from "@/lib/cards";
import { requestCards, useContent } from "@/lib/content";
import { plural } from "@/lib/copy";
import { actions, newId, useNow, useStudyStore } from "@/lib/store";
import type { CardRating, Flashcard } from "@/lib/types";
import { Sprig } from "../Botanicals";
import { CrossIcon } from "../Icons";
import { Placeholder } from "../Placeholder";

const FALLBACK: CardScope = { title: "All papers", papers: PAPERS.map((p) => p.id), topicIds: [], includeNew: true };

const RATINGS: { rating: CardRating; label: string; key: string; tone: string }[] = [
  { rating: 1, label: "Again", key: "1", tone: "border-miss-line text-miss hover:bg-miss-wash" },
  { rating: 2, label: "Hard", key: "2", tone: "border-line-strong text-ink hover:bg-sunken" },
  { rating: 3, label: "Good", key: "3", tone: "border-accent-line text-accent-ink hover:bg-accent-wash" },
  { rating: 4, label: "Easy", key: "4", tone: "border-accent-deep text-accent-ink hover:bg-accent-wash" },
];

export function CardReview() {
  const store = useStudyStore();
  const content = useContent();
  const now = useNow();
  const [scope] = useState<CardScope>(() => (typeof window === "undefined" ? FALLBACK : (getCardScope() ?? FALLBACK)));

  useEffect(() => {
    if (content.status === "ready") requestCards(scope.papers);
  }, [content.status, scope.papers]);

  const loaded = scope.papers.every((p) => content.cards[p]);
  if (!store || now === 0 || !loaded) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <Placeholder label="Loading flashcards" />
      </div>
    );
  }
  const cards = scope.papers.flatMap((p) => content.cards[p] ?? []);
  return <Review scope={scope} cards={cards} />;
}

function Review({ scope, cards }: { scope: CardScope; cards: Flashcard[] }) {
  const store = useStudyStore()!;
  const now = useNow();
  const data = store.data;
  const sessionId = useRef(newId()).current;

  // Build the queue once, when the screen opens, so it doesn't shift mid-review.
  const [queue] = useState<string[]>(() => {
    const topics = new Set(scope.topicIds);
    const ids = cards.filter((c) => (!topics.size || topics.has(c.topicId)) && (!scope.cardIds || scope.cardIds.includes(c.id))).map((c) => c.id);
    const allowance = scope.includeNew ? Math.max(0, data.profile.newCardsPerDay - newCardsToday(data.cardLog, now)) : 0;
    const { due, fresh } = buildCardQueue(ids, data.cards, now, scope.cardIds ? ids.length : allowance);
    return [...due, ...fresh];
  });
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [again, setAgain] = useState<string[]>([]);
  const [noted, setNoted] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState({ reviewed: 0, again: 0 });

  // Cards marked Again come back once more at the end of this sitting.
  const list = [...queue, ...again];
  const card = byId.get(list[index]);
  const done = index >= list.length;

  function rate(r: CardRating) {
    if (!card) return;
    actions.reviewCard(card.id, card.topicId, r);
    setCounts((c) => ({ reviewed: c.reviewed + 1, again: c.again + (r === 1 ? 1 : 0) }));
    if (r === 1 && !again.includes(card.id) && index < queue.length) setAgain((a) => [...a, card.id]);
    setShown(false);
    setNote("");
    setIndex((i) => i + 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      if (done || !card) return;
      if (!shown && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setShown(true);
      } else if (shown && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        rate(Number(e.key) as CardRating);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (done || !card) {
    return (
      <main className="safe-top safe-bottom mx-auto max-w-xl px-4 py-16 sm:px-8">
        <Sprig variant={queue.length === 0 ? "leaf" : "bloom"} height={96} drawn />
        <h1 className="mt-6 text-headline font-bold">{queue.length === 0 ? "Nothing to review here" : "That's the stack"}</h1>
        <p className="mt-3 text-lead text-ink-soft">
          {queue.length === 0
            ? "No cards are due in this set, and today's new cards are already added."
            : `${plural(counts.reviewed, "review")} done${counts.again ? `, ${counts.again} marked Again` : ""}. They'll come back on their own schedule.`}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/cards" className="btn btn-primary btn-large no-underline">
            Back to flashcards
          </Link>
          <Link href="/" className="btn btn-secondary btn-large no-underline">
            Today
          </Link>
        </div>
      </main>
    );
  }

  const state = data.cards[card.id];
  const isNew = !state;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-6">
          <Link href="/cards" className="btn btn-quiet justify-self-start no-underline" aria-label="Stop reviewing">
            <CrossIcon />
            <span aria-hidden="true" className="max-[480px]:hidden">
              Stop
            </span>
          </Link>
          <div className="min-w-0 text-center">
            <p className="truncate text-small font-semibold">{scope.title}</p>
            <p className="tabular text-meta text-ink-muted">
              {Math.min(index + 1, list.length)} of {list.length}
            </p>
          </div>
          <span />
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-3 sm:px-8">
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[var(--ease-out-quart)]" style={{ width: `${(index / list.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-48 pt-8 sm:px-8 sm:pt-12">
        <div className="index-card">
          <div className="index-card-head flex items-baseline justify-between gap-3 px-5 pb-2.5 pt-4 sm:px-8">
            <p className="min-w-0 truncate text-meta text-ink-muted">
              {paperShort(card.topicId)} · {topicName(card.topicId)}
            </p>
            {isNew && <span className="shrink-0 rounded-[6px] bg-accent-wash px-2 py-0.5 text-meta font-semibold text-accent-ink">New</span>}
          </div>
          <div className="px-6 pb-8 pt-7 text-center sm:px-10 sm:pb-12 sm:pt-10">
          <div className="card-html text-lead leading-relaxed" dangerouslySetInnerHTML={{ __html: card.front }} />
          {shown && (
            <>
              <hr className="mx-auto my-7 w-16 border-accent-line" />
              <div className="card-html reveal text-lead leading-relaxed" dangerouslySetInnerHTML={{ __html: card.back }} />
            </>
          )}
          </div>
        </div>
        <p className="mt-3 text-center text-[0.75rem] text-ink-muted">
          {card.deck} · {card.source.replace(/^Anki:\s*/, "")}
        </p>

        {shown && (
          <div className="mt-8 rounded-panel bg-sunken p-4">
            {noted.has(card.id) ? (
              <p className="text-small font-semibold text-accent-ink">Saved to your notebook.</p>
            ) : (
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  actions.recordCardMistake(card, sessionId, note);
                  setNoted((s) => new Set(s).add(card.id));
                }}
              >
                <label htmlFor="card-note" className="sr-only">
                  Note for the notebook
                </label>
                <input
                  id="card-note"
                  className="field"
                  placeholder="Tricky? Add a note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary shrink-0">
                  Save to notebook
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-8 sm:py-4">
          {shown ? (
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map((r) => (
                <button key={r.rating} type="button" className={`btn min-h-16 flex-col gap-0 border bg-surface px-1 ${r.tone}`} onClick={() => rate(r.rating)}>
                  <span>{r.label}</span>
                  <span className="text-meta font-normal text-ink-muted">{previewInterval(state, r.rating, now)}</span>
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-large w-full" onClick={() => setShown(true)}>
              Show answer
            </button>
          )}
          <p className="mt-2 hidden text-center text-meta text-ink-muted lg:block">
            {shown ? "Keys 1–4 to rate" : "Space to show the answer"}
          </p>
        </div>
      </div>
    </div>
  );
}
