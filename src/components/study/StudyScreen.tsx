"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useContent } from "@/lib/content";
import { actions, useStudyStore } from "@/lib/store";
import type { ActiveSession, SessionRecord, StudyData } from "@/lib/types";
import type { BankIndex } from "@/lib/bank";
import { Placeholder } from "../Placeholder";
import { QuestionPanel } from "./QuestionPanel";
import { SessionSummary } from "./SessionSummary";
import { SessionTopBar } from "./SessionTopBar";

interface Finished {
  record: SessionRecord;
  session: ActiveSession;
}

export function StudyScreen() {
  const store = useStudyStore();
  const content = useContent();
  const router = useRouter();
  const [finished, setFinished] = useState<Finished | null>(null);

  if (!store || !content.bank) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <Placeholder label="Opening your session" />
      </div>
    );
  }

  const { data } = store;
  const bank = content.bank;
  const session = data.activeSession;

  function endSession() {
    if (!session) return;
    const snapshot = session;
    const record = actions.finish();
    if (record) setFinished({ record, session: snapshot });
    else router.push("/");
  }

  function leave(href: string) {
    setFinished(null);
    router.push(href);
  }

  if (session) return <ActiveSessionView data={data} bank={bank} session={session} onEnd={endSession} />;

  if (finished) {
    return (
      <SessionSummary
        record={finished.record}
        mistakes={data.mistakes.filter((m) => m.sessionId === finished.record.id)}
        name={data.profile.name}
        onLeave={leave}
      />
    );
  }

  return (
    <main className="safe-top mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-16 sm:px-8">
      <h1 className="text-headline font-bold">No session in progress</h1>
      <p className="mt-3 text-lead text-ink-soft">Head back to Today and you&apos;ll find a next step waiting.</p>
      <div className="mt-8">
        <Link href="/" className="btn btn-primary no-underline">
          Go to Today
        </Link>
      </div>
    </main>
  );
}

function ActiveSessionView({ data, bank, session, onEnd }: { data: StudyData; bank: BankIndex; session: ActiveSession; onEnd: () => void }) {
  const questionId = session.questionIds[session.currentIndex];
  const question = bank.question(questionId);
  const isLast = session.currentIndex === session.questionIds.length - 1;
  const exam = session.feedback === "end";
  const unanswered = session.questionIds.filter((q) => !session.responses[q]).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionTopBar
        session={session}
        topicId={question?.topicId}
        saved={Boolean(data.saved[questionId])}
        onToggleSaved={() => actions.toggleSaved(questionId)}
        onEnd={onEnd}
        onJump={(i) => actions.goTo(i)}
      />
      <main id="main" className="flex-1">
        {question ? (
          <QuestionPanel
            key={`${session.id}:${questionId}`}
            question={question}
            sessionId={session.id}
            response={session.responses[questionId]}
            existingMistake={data.mistakes.find((m) => m.itemId === questionId && m.sessionId === session.id)}
            exam={exam}
            isFirst={session.currentIndex === 0}
            isLast={isLast}
            unanswered={unanswered}
            onNext={() => (isLast ? onEnd() : actions.next())}
            onPrev={() => actions.goTo(session.currentIndex - 1)}
            onSubmit={onEnd}
          />
        ) : (
          <MissingQuestion onSkip={() => (isLast ? onEnd() : actions.goTo(session.currentIndex + 1))} />
        )}
      </main>
    </div>
  );
}

/** Shown if a saved session points at a question that's no longer in the bank. */
function MissingQuestion({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <h1 className="text-title font-bold">This question isn&apos;t available anymore</h1>
      <p className="mt-3 text-ink-soft">The question bank was rebuilt since this session started. Your other answers are saved.</p>
      <button type="button" className="btn btn-secondary mt-6" onClick={onSkip}>
        Skip it
      </button>
    </div>
  );
}
