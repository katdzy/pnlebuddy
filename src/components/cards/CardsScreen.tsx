"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { areasInPaper, PAPERS, topicsInArea, topicsInPaper, type PaperId } from "@/content/taxonomy";
import { setCardScope, type CardScope } from "@/lib/cardScope";
import { cardCountsByTopic, newCardsToday } from "@/lib/cards";
import { plural } from "@/lib/copy";
import { Meter, PaperIcon, PaperTag } from "../Bits";
import { toneFor } from "@/lib/look";
import { useLook } from "@/lib/lookStore";
import { PageHeader } from "../look/PageHeader";
import { WithData, type Ready } from "../Gate";
import { ArrowRightIcon, ChevronDownIcon } from "../Icons";

export function CardsScreen() {
  return <WithData label="Loading flashcards">{(ready) => <Cards {...ready} />}</WithData>;
}

function Cards({ data, content, now }: Ready) {
  const router = useRouter();
  const look = useLook();
  const counts = useMemo(() => cardCountsByTopic(data.cards, now), [data.cards, now]);
  const totals = content.manifest?.topics ?? {};
  const due = Object.values(counts).reduce((n, c) => n + c.due, 0);
  const newLeft = Math.max(0, data.profile.newCardsPerDay - newCardsToday(data.cardLog, now));
  const totalCards = Object.values(totals).reduce((n, t) => n + t.cards, 0);
  const sources = content.manifest?.sources.filter((s) => s.cards > 0) ?? [];

  function go(scope: CardScope) {
    setCardScope(scope);
    router.push("/flashcards");
  }
  const sum = (paper: PaperId, key: "due" | "learned") => topicsInPaper(paper).reduce((n, t) => n + (counts[t.id]?.[key] ?? 0), 0);
  const totalIn = (paper: PaperId) => topicsInPaper(paper).reduce((n, t) => n + (totals[t.id]?.cards ?? 0), 0);

  return (
    <div>
      <PageHeader iconKey="page:cards" title="Flashcards">
        <p className="mt-2 max-w-[65ch] text-lead text-ink-soft">
          Your Anki decks, sorted into the same NP topics as everything else. Cards you know come back less often; the
          ones you miss come back tomorrow.
        </p>
      </PageHeader>

      <section className="sheet mt-10 p-5 sm:p-8" aria-labelledby="today-cards">
        <h2 id="today-cards" className="text-title font-bold sm:text-headline">
          {due > 0 ? `${plural(due, "card")} to review today` : "You're caught up on reviews"}
        </h2>
        <p className="mt-3 max-w-[60ch] text-ink-soft">
          {newLeft > 0
            ? `You can also add up to ${newLeft} new ${newLeft === 1 ? "card" : "cards"} today. Change this in Settings.`
            : "You've added today's new cards. More tomorrow."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="btn btn-primary btn-large"
            disabled={due === 0 && newLeft === 0}
            onClick={() => go({ title: "All papers", papers: PAPERS.map((p) => p.id), topicIds: [], includeNew: newLeft > 0 })}
          >
            {due > 0 ? "Review due cards" : "Learn new cards"}
            <ArrowRightIcon size={22} />
          </button>
        </div>
        <p className="mt-4 text-meta text-ink-muted">
          {totalCards.toLocaleString()} cards from {sources.map((s) => s.label.replace(/^Anki:\s*/, "")).join(", ")}.
        </p>
      </section>

      <div className="mt-12 space-y-2">
        {PAPERS.map((p) => {
          const pDue = sum(p.id, "due");
          const pLearned = sum(p.id, "learned");
          const pTotal = totalIn(p.id);
          const tone = toneFor(look, p.id);
          return (
            <details key={p.id} className="group border-b border-line pb-2" data-tone={tone}>
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-md py-3 pr-2 hover:bg-sunken/60 [&::-webkit-details-marker]:hidden">
                <PaperIcon paperId={p.id} className="text-[1.75rem]" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-display text-lead font-bold">{p.id === "int" ? "Integrated in every paper" : p.name}</span>
                    <PaperTag paperId={p.id} />
                  </span>
                  <span className="tabular block text-meta text-ink-muted">
                    {pLearned} of {pTotal.toLocaleString()} learned{pDue ? ` · ${pDue} due` : ""}
                  </span>
                </span>
                <ChevronDownIcon className="shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="pb-4 sm:pl-12">
                <div className="pb-2 pt-1">
                  <button
                    type="button"
                    className="btn btn-secondary min-h-11"
                    onClick={() => go({ title: `${p.short} ${p.name}`, papers: [p.id], topicIds: [], includeNew: true })}
                  >
                    Study {p.short}
                  </button>
                </div>
                {areasInPaper(p.id).map((a) => (
                  <div key={a.id}>
                    <h3 className="flex items-center gap-2 pt-4 text-small font-bold text-ink-soft">
                      <span className="size-2 rounded-full bg-[var(--tone-solid)]" aria-hidden="true" />
                      {a.name}
                    </h3>
                    <ul className="mt-2 divide-y divide-line border-y border-line">
                      {topicsInArea(a.id).map((t) => {
                        const c = counts[t.id];
                        const total = totals[t.id]?.cards ?? 0;
                        return (
                          <li key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_9rem_auto]">
                            <span className="font-bold">{t.name}</span>
                            <span className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                              <span className="tabular block text-meta text-ink-muted">
                                {c?.learned ?? 0}/{total} learned{c?.due ? ` · ${c.due} due` : ""}
                              </span>
                              <Meter value={c?.learned ?? 0} max={total} label={`${t.name} cards learned`} tone={tone} />
                            </span>
                            <button
                              type="button"
                              className="btn btn-quiet min-h-11"
                              disabled={!total}
                              onClick={() => go({ title: t.name, papers: [p.id], topicIds: [t.id], includeNew: true })}
                            >
                              Study
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
