/*
 * Question review scheduling.
 *
 * A deliberately simple, explainable Leitner-style system:
 *  - A missed question drops to box 0 and is due immediately (it comes back
 *    in the next session).
 *  - A correct answer moves the question up one box. Each box has a longer
 *    interval before it is due again.
 *  - A question answered correctly the first time starts in box 2, so easy
 *    material doesn't crowd out what needs work.
 *
 * Everything here is pure and takes `now` explicitly.
 */

import type { TopicStats } from "./insights";
import type { Question, QuestionProgress, QueueReason } from "./types";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Days until next review for each box. Index = box number. */
export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35] as const;
export const MAX_BOX = BOX_INTERVAL_DAYS.length - 1;
const FIRST_TRY_CORRECT_BOX = 2;

export function applyAnswer(
  prev: QuestionProgress | undefined,
  questionId: string,
  topicId: string,
  correct: boolean,
  now: number,
): QuestionProgress {
  let box: number;
  if (!correct) box = 0;
  else if (!prev) box = FIRST_TRY_CORRECT_BOX;
  else box = Math.min(prev.box + 1, MAX_BOX);

  return {
    questionId,
    topicId,
    box,
    dueAt: now + BOX_INTERVAL_DAYS[box] * DAY_MS,
    lastAnsweredAt: now,
    lastResult: correct ? "correct" : "incorrect",
    attempts: (prev?.attempts ?? 0) + 1,
    correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
  };
}

export function isDue(progress: QuestionProgress, now: number): boolean {
  return progress.dueAt <= now;
}

export interface QueueItem {
  questionId: string;
  topicId: string;
  reason: QueueReason;
}

/** Priority order. Lower index = studied first. */
export const REASON_ORDER: QueueReason[] = ["missed", "weak-topic", "due", "new-topic", "new", "extra"];

/**
 * Build the ordered review queue from a pool of questions:
 *   1. Previously missed questions that are due
 *   2. Questions in weak topics (unseen first, then due)
 *   3. Other questions due for spaced review
 *   4. Questions from topics she hasn't started, one topic at a time
 *   5. Unseen questions from topics already started
 *   6. Everything else, soonest-due first (optional extra practice)
 */
export function buildReviewQueue(
  pool: Question[],
  topicOrder: string[],
  progress: Record<string, QuestionProgress>,
  topicStats: Record<string, TopicStats>,
  now: number,
): QueueItem[] {
  const buckets: Record<QueueReason, { q: Question; sortKey: number }[]> = {
    missed: [],
    "weak-topic": [],
    due: [],
    "new-topic": [],
    new: [],
    extra: [],
  };
  const order = new Map(topicOrder.map((t, i) => [t, i]));

  pool.forEach((q, position) => {
    const p = progress[q.id];
    const stats = topicStats[q.topicId];
    const weak = stats?.status === "needs-practice";

    if (p && p.lastResult === "incorrect" && isDue(p, now)) {
      buckets.missed.push({ q, sortKey: p.lastAnsweredAt });
    } else if (weak && (!p || isDue(p, now))) {
      buckets["weak-topic"].push({ q, sortKey: p ? p.dueAt : Number.MIN_SAFE_INTEGER + position });
    } else if (p && isDue(p, now)) {
      buckets.due.push({ q, sortKey: p.dueAt });
    } else if (!p && (!stats || stats.status === "not-started")) {
      buckets["new-topic"].push({ q, sortKey: (order.get(q.topicId) ?? 999) * 100000 + position });
    } else if (!p) {
      buckets.new.push({ q, sortKey: position });
    } else {
      buckets.extra.push({ q, sortKey: p.dueAt });
    }
  });

  const queue: QueueItem[] = [];
  for (const reason of REASON_ORDER) {
    buckets[reason]
      .sort((a, b) => a.sortKey - b.sortKey)
      .forEach(({ q }) => queue.push({ questionId: q.id, topicId: q.topicId, reason }));
  }
  return queue;
}

/** Session lengths offered on the home screen, with a question count for each. */
export const SESSION_SIZES = [
  { minutes: 10, questions: 6 },
  { minutes: 25, questions: 15 },
  { minutes: 45, questions: 25 },
] as const;

export function questionsForMinutes(minutes: number): number {
  return SESSION_SIZES.find((s) => s.minutes === minutes)?.questions ?? SESSION_SIZES[1].questions;
}

/** Plain-language description of when a question comes back. */
export function describeDue(dueAt: number, now: number): string {
  const days = Math.ceil((dueAt - now) / DAY_MS);
  if (days <= 0) return "Ready now";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/** Deterministic shuffle so a quiz built twice from the same seed is identical. */
export function shuffle<T>(list: T[], seed: number): T[] {
  const a = [...list];
  let s = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
