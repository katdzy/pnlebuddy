"use client";

import type { ReactNode } from "react";
import type { BankIndex } from "@/lib/bank";
import { useContent, type ContentSnapshot } from "@/lib/content";
import { useNow, useStudyStore } from "@/lib/store";
import type { StudyData } from "@/lib/types";
import { Placeholder } from "./Placeholder";

export interface Ready {
  data: StudyData;
  bank: BankIndex;
  content: ContentSnapshot;
  now: number;
}

/** Renders children once her saved data and the question bank are both available. */
export function WithData({ label, children }: { label?: string; children: (ready: Ready) => ReactNode }) {
  const store = useStudyStore();
  const content = useContent();
  const now = useNow();
  if (content.status === "missing") return <NoContent />;
  if (content.status === "error") return <ContentError />;
  if (!store || now === 0 || content.status !== "ready" || !content.bank) return <Placeholder label={label} />;
  return <>{children({ data: store.data, bank: content.bank, content, now })}</>;
}

function NoContent() {
  return (
    <div className="max-w-[62ch]">
      <h1 className="text-headline font-bold">No study content yet</h1>
      <p className="mt-3 text-lead text-ink-soft">
        The questions and flashcards are built from the review folder on the Mac. Run this in the project
        folder, then reload:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-control bg-sunken p-4 text-small">npm run ingest</pre>
      <p className="mt-4 text-ink-soft">
        It reads <code>~/Fel Reviewers/RN2027</code>. Set <code>RN2027_DIR</code> if the folder is somewhere else.
      </p>
    </div>
  );
}

function ContentError() {
  return (
    <div className="max-w-[62ch]">
      <h1 className="text-headline font-bold">The questions didn&apos;t load</h1>
      <p className="mt-3 text-lead text-ink-soft">
        Check the connection and reload the page. Your progress is safe on this device either way.
      </p>
      <button type="button" className="btn btn-secondary mt-6" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}
