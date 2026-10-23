"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getTopic, PAPERS, type PaperId } from "@/content/taxonomy";
import { setCardScope } from "@/lib/cardScope";
import { actions } from "@/lib/store";
import { MISTAKE_CATEGORIES, type MistakeEntry } from "@/lib/types";
import { PageHeader } from "../look/PageHeader";
import { useLook } from "@/lib/lookStore";
import { toneFor } from "@/lib/look";
import { WithData, type Ready } from "../Gate";
import { ArrowRightIcon } from "../Icons";
import { PenUnderline } from "../Botanicals";
import { MistakeList } from "./MistakeList";
import { SavedList } from "./SavedList";

type Tab = "questions" | "cards" | "saved" | "understood";

export function NotebookScreen() {
  return <WithData label="Opening your notebook">{(ready) => <Notebook {...ready} />}</WithData>;
}

const TIPS: Record<MistakeEntry["category"], string> = {
  concept: "Most misses are gaps in the concept itself. Read the topic's reviewer or its pages in your files before the next quiz.",
  confused: "You often mix up two similar ideas. When you save one, write the difference in the note; it's the note you'll want later.",
  misread: "A lot of misses come from misreading. Slow down on words like NOT, EXCEPT, FIRST, BEST and PRIORITY.",
  reasoning: "Clinical reasoning trips you up most. Try ABC, then Maslow, then safety before choosing, and read the test-taking strategy after each answer.",
  other: "Your notes say more than the categories do. Skim them before a quiz.",
};

function Notebook({ data, bank }: Ready) {
  const router = useRouter();
  const look = useLook();
  const [tab, setTab] = useState<Tab>("questions");
  const [paper, setPaper] = useState<PaperId | "all">("all");
  const [blocked, setBlocked] = useState(false);

  const inPaper = (topicId: string) => paper === "all" || getTopic(topicId)?.paperId === paper;
  const open = data.mistakes.filter((m) => !m.resolvedAt && inPaper(m.snapshot.topicId));
  const questions = open.filter((m) => m.kind === "question").reverse();
  const cards = open.filter((m) => m.kind === "card").reverse();
  const understood = data.mistakes.filter((m) => m.resolvedAt && inPaper(m.snapshot.topicId)).reverse();
  const savedIds = Object.keys(data.saved).filter((id) => {
    const q = bank.question(id);
    return q && inPaper(q.topicId);
  });

  // The most common reason she gives, once there's enough to say something.
  const byCategory = new Map<string, number>();
  for (const m of data.mistakes.filter((x) => x.kind === "question" && x.category !== "other")) byCategory.set(m.category, (byCategory.get(m.category) ?? 0) + 1);
  const top = [...byCategory].sort((a, b) => b[1] - a[1])[0];
  const totalQ = [...byCategory.values()].reduce((a, b) => a + b, 0);

  function balikan() {
    if (data.activeSession) {
      setBlocked(true);
      return;
    }
    if (tab === "cards") {
      setCardScope({ title: "Notebook cards", papers: PAPERS.map((p) => p.id), topicIds: [], includeNew: false, cardIds: cards.map((m) => m.itemId) });
      router.push("/flashcards");
      return;
    }
    const ids = tab === "saved" ? savedIds : questions.map((m) => m.itemId);
    actions.startList(tab === "saved" ? "saved" : "mistakes", ids);
    router.push("/study");
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "questions", label: "Questions", count: questions.length },
    { id: "cards", label: "Flashcards", count: cards.length },
    { id: "saved", label: "Saved", count: savedIds.length },
    { id: "understood", label: "Understood", count: understood.length },
  ];
  const reviewable = tab === "questions" ? questions.length : tab === "cards" ? cards.length : tab === "saved" ? savedIds.length : 0;

  return (
    <div>
      <PageHeader iconKey="page:notebook" title="Notebook">
        <p className="mt-2 max-w-[65ch] text-lead text-ink-soft">
          Everything that tripped you up, with the reasoning and your own notes. Balikan whenever you like.
        </p>
      </PageHeader>

      {top && totalQ >= 5 && (
        <p className="callout mt-6 block max-w-[65ch] text-small" data-tone="accent">
          <span className="font-bold">
            {Math.round((top[1] / totalQ) * 100)}% of your saved misses: “{MISTAKE_CATEGORIES.find((c) => c.id === top[0])?.label}”.{" "}
          </span>
          {TIPS[top[0] as MistakeEntry["category"]]}
        </p>
      )}

      <div role="tablist" aria-label="Notebook sections" className="mt-10 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
        {tabs.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="notebook-panel"
              className={`relative flex h-12 shrink-0 items-center gap-2 px-3 font-semibold sm:px-4 ${selected ? "text-ink" : "text-ink-soft hover:text-ink"}`}
              onClick={() => {
                setTab(t.id);
                setBlocked(false);
              }}
            >
              {t.label}
              <span className={`tabular rounded-md px-1.5 text-meta ${selected ? "bg-accent-wash text-accent-ink" : "bg-sunken text-ink-soft"}`}>{t.count}</span>
              {selected && <PenUnderline className="absolute inset-x-2 bottom-0 h-1.5 w-[calc(100%-1rem)]" />}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by paper">
        <button type="button" aria-pressed={paper === "all"} className={`chip min-h-10 ${paper === "all" ? "chip-on" : ""}`} onClick={() => setPaper("all")}>
          All
        </button>
        {PAPERS.map((p) => (
          <button key={p.id} type="button" data-tone={toneFor(look, p.id)} aria-pressed={paper === p.id} className={`chip min-h-10 ${paper === p.id ? "chip-on" : ""}`} onClick={() => setPaper(p.id)}>
            {p.short}
          </button>
        ))}
      </div>

      {reviewable > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="button" className="btn btn-primary" onClick={balikan}>
            Balikan: review {Math.min(reviewable, tab === "cards" ? reviewable : 25)}
            <ArrowRightIcon size={20} />
          </button>
          {blocked && (
            <p role="status" className="text-small text-ink-soft">
              Finish or end the session in progress first (it&apos;s waiting on Today).
            </p>
          )}
        </div>
      )}

      <div id="notebook-panel" role="tabpanel" className="mt-8">
        {tab === "questions" && <MistakeList entries={questions} empty="No open question mistakes. When you miss one, save it here with a note." />}
        {tab === "cards" && <MistakeList entries={cards} empty="No flashcards saved. Tap “Save to notebook” on a card you keep missing." />}
        {tab === "saved" && <SavedList ids={savedIds} paper={paper} />}
        {tab === "understood" && <MistakeList entries={understood} empty="Notes you mark as understood move here." />}
      </div>
    </div>
  );
}
