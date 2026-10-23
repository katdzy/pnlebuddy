/*
 * Performance insights derived from attempt history.
 *
 * Topic *coverage* (how many of its questions she has seen) is tracked
 * separately from *demonstrated performance* (how she has actually answered
 * recently). Finishing a topic never marks it as known.
 */

import { PAPERS, getTopic, type PaperId } from "@/content/taxonomy";
import type { BankIndex } from "./bank";
import { topicName } from "./bank";
import { grade, type Band, bandFor, percent } from "./grading";
import type { QueueItem } from "./scheduler";
import { isDue } from "./scheduler";
import type { Attempt, QuestionProgress, QueueReason, SessionRecord } from "./types";

export type TopicStatus =
  | "not-started"
  | "getting-started"
  | "needs-practice"
  | "building"
  | "steady";

export const STATUS_LABEL: Record<TopicStatus, string> = {
  "not-started": "Not started",
  "getting-started": "Getting started",
  "needs-practice": "Needs practice",
  building: "Building",
  steady: "Steady",
};

/** How many of the most recent attempts per topic count as "recent". */
export const RECENT_WINDOW = 6;
const MIN_ATTEMPTS_FOR_JUDGEMENT = 3;
const MIN_ATTEMPTS_FOR_STEADY = 5;
const WEAK_BELOW = 0.6;
const STEADY_FROM = 0.8;
const IMPROVEMENT_MARGIN = 0.25;

export interface TopicStats {
  topicId: string;
  totalQuestions: number;
  /** Unique questions answered at least once. */
  seenQuestions: number;
  attempts: number;
  recentAttempts: number;
  recentCorrect: number;
  recentAccuracy: number | null;
  status: TopicStatus;
  improving: boolean;
  dueCount: number;
}

export function computeTopicStats(
  index: BankIndex,
  attempts: Attempt[],
  progress: Record<string, QuestionProgress>,
  now: number,
): Record<string, TopicStats> {
  const byTopic = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const list = byTopic.get(a.topicId) ?? [];
    list.push(a);
    byTopic.set(a.topicId, list);
  }

  const out: Record<string, TopicStats> = {};
  for (const topic of index.topics) {
    const questions = index.questionsInTopic(topic.id);
    const list = (byTopic.get(topic.id) ?? []).slice().sort((a, b) => a.at - b.at);
    const recent = list.slice(-RECENT_WINDOW);
    const recentCorrect = recent.filter((a) => a.correct).length;
    const recentAccuracy = recent.length ? recentCorrect / recent.length : null;

    let status: TopicStatus;
    if (list.length === 0) status = "not-started";
    else if (list.length < MIN_ATTEMPTS_FOR_JUDGEMENT) status = "getting-started";
    else if ((recentAccuracy ?? 0) < WEAK_BELOW) status = "needs-practice";
    else if (list.length >= MIN_ATTEMPTS_FOR_STEADY && (recentAccuracy ?? 0) >= STEADY_FROM)
      status = "steady";
    else status = "building";

    out[topic.id] = {
      topicId: topic.id,
      totalQuestions: questions.length,
      seenQuestions: questions.filter((q) => progress[q.id]).length,
      attempts: list.length,
      recentAttempts: recent.length,
      recentCorrect,
      recentAccuracy,
      status,
      improving: isImproving(list),
      dueCount: questions.filter((q) => progress[q.id] && isDue(progress[q.id], now)).length,
    };
  }
  return out;
}

/**
 * Improving = the last three attempts in a topic are meaningfully more
 * accurate than the attempts before them.
 */
function isImproving(sorted: Attempt[]): boolean {
  if (sorted.length < 4) return false;
  const last = sorted.slice(-3);
  const before = sorted.slice(-RECENT_WINDOW - 3, -3);
  if (before.length === 0) return false;
  const acc = (xs: Attempt[]) => xs.filter((a) => a.correct).length / xs.length;
  return acc(last) - acc(before) >= IMPROVEMENT_MARGIN;
}

export function recentAccuracy(attempts: Attempt[], window = 20) {
  const recent = attempts.slice(-window);
  if (recent.length === 0) return null;
  const correct = recent.filter((a) => a.correct).length;
  return { correct, total: recent.length, ratio: correct / recent.length };
}

export function dueForReviewCount(
  progress: Record<string, QuestionProgress>,
  now: number,
): number {
  return Object.values(progress).filter((p) => isDue(p, now)).length;
}

/* ── Recommendation ─────────────────────────────────────────────────────── */

export interface Recommendation {
  title: string;
  reason: string;
  /** Counts of each queue reason inside this session. */
  breakdown: { reason: QueueReason; count: number }[];
  /** Topic ids in order of first appearance. */
  topicIds: string[];
  questionCount: number;
}

const BREAKDOWN_LABEL: Record<QueueReason, (n: number) => string> = {
  missed: (n) => `${n} to try again`,
  "weak-topic": (n) => `${n} from a tricky topic`,
  due: (n) => `${n} due for review`,
  "new-topic": (n) => `${n} new`,
  new: (n) => `${n} new`,
  extra: (n) => `${n} extra practice`,
};

export function describeBreakdown(breakdown: Recommendation["breakdown"]): string[] {
  // Merge the two "new" reasons so the summary reads naturally.
  const merged = new Map<string, number>();
  for (const { reason, count } of breakdown) {
    const key = reason === "new-topic" ? "new" : reason;
    merged.set(key, (merged.get(key) ?? 0) + count);
  }
  return [...merged].map(([reason, n]) => BREAKDOWN_LABEL[reason as QueueReason](n));
}

function listTopics(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

export function buildRecommendation(
  index: BankIndex,
  session: QueueItem[],
  topicStats: Record<string, TopicStats>,
  hasHistory: boolean,
): Recommendation | null {
  if (session.length === 0) return null;

  const counts = new Map<QueueReason, number>();
  const topicIds: string[] = [];
  for (const item of session) {
    counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
    if (!topicIds.includes(item.topicId)) topicIds.push(item.topicId);
  }
  const breakdown = [...counts].map(([reason, count]) => ({ reason, count }));
  const lead = session[0];
  const leadTopic = topicName(lead.topicId);
  const n = (r: QueueReason) => counts.get(r) ?? 0;

  let title: string;
  const parts: string[] = [];

  if (!hasHistory) {
    title = `Start with ${leadTopic}`;
    parts.push(
      `${leadTopic} is a solid place to begin. Every question explains the answer once you've chosen, so there's nothing to prepare first.`,
    );
  } else {
    switch (lead.reason) {
      case "missed": {
        const missedTopics = [
          ...new Set(session.filter((s) => s.reason === "missed").map((s) => s.topicId)),
        ].map((id) => topicName(id));
        title =
          missedTopics.length === 1
            ? `Revisit what tripped you up in ${missedTopics[0]}`
            : "Revisit the questions that tripped you up";
        parts.push(
          n("missed") === 1
            ? "A question you missed is ready to try again. Seeing it soon after a miss helps it stick."
            : `${n("missed")} questions you missed are ready to try again. Seeing them soon after a miss helps them stick.`,
        );
        break;
      }
      case "weak-topic": {
        const s = topicStats[lead.topicId];
        title = `Strengthen ${leadTopic}`;
        parts.push(
          s && s.recentAttempts
            ? `${leadTopic} has been tricky lately: ${s.recentCorrect} of your last ${s.recentAttempts} were correct. A focused round will help.`
            : `${leadTopic} could use a little more practice.`,
        );
        break;
      }
      case "due":
        title = "Refresh what you've learned";
        parts.push(
          `${n("due")} ${plural(n("due"), "question is", "questions are")} due for a spaced review. Coming back at the right moment helps you remember longer.`,
        );
        break;
      case "new-topic":
      case "new":
        title = lead.reason === "new-topic" ? `Start ${leadTopic}` : `Keep going with ${leadTopic}`;
        parts.push(
          lead.reason === "new-topic"
            ? `You're up to date on reviews, so this is a good time to cover something new.`
            : `You're up to date on reviews, and there's more of ${leadTopic} to explore.`,
        );
        break;
      default:
        title = "Extra practice";
        parts.push(
          "Everything is up to date. This round is optional practice with questions you've already seen.",
        );
    }

    // Mention what else is in the session.
    const otherNew = session.filter(
      (s) => (s.reason === "new-topic" || s.reason === "new") && lead.reason !== s.reason,
    );
    if (otherNew.length && (lead.reason === "missed" || lead.reason === "due" || lead.reason === "weak-topic")) {
      const names = [...new Set(otherNew.map((s) => topicName(s.topicId)))].slice(0, 2);
      parts.push(`It also introduces ${listTopics(names)}.`);
    }
  }

  return {
    title,
    reason: parts.join(" "),
    breakdown,
    topicIds,
    questionCount: session.length,
  };
}

/* ── Paper-level view for the tracker ───────────────────────────────────── */

export interface PaperStats {
  paperId: PaperId;
  totalQuestions: number;
  seenQuestions: number;
  /** Accuracy over the most recent attempts in this paper (up to 40). */
  recentCorrect: number;
  recentAttempts: number;
  recentPercent: number | null;
  band: Band | null;
  /** Average score of quizzes that included this paper, most recent 5. */
  quizPercent: number | null;
  quizCount: number;
  topicsNeedingPractice: number;
  dueCount: number;
}

export function computePaperStats(
  topicStats: Record<string, TopicStats>,
  attempts: Attempt[],
  sessions: SessionRecord[],
): Record<PaperId, PaperStats> {
  const out = {} as Record<PaperId, PaperStats>;
  for (const paper of PAPERS) {
    const topics = Object.values(topicStats).filter((t) => getTopic(t.topicId)?.paperId === paper.id);
    const recent = attempts.filter((a) => getTopic(a.topicId)?.paperId === paper.id).slice(-40);
    const rc = recent.filter((a) => a.correct).length;
    const quizzes = sessions
      .filter((s) => s.mode === "quiz" && s.byPaper[paper.id])
      .slice(-5)
      .map((s) => s.byPaper[paper.id]!);
    const qc = quizzes.reduce((n, [c]) => n + c, 0);
    const qt = quizzes.reduce((n, [, t]) => n + t, 0);
    const recentPercent = recent.length >= 5 ? percent(rc, recent.length) : null;
    out[paper.id] = {
      paperId: paper.id,
      totalQuestions: topics.reduce((n, t) => n + t.totalQuestions, 0),
      seenQuestions: topics.reduce((n, t) => n + t.seenQuestions, 0),
      recentCorrect: rc,
      recentAttempts: recent.length,
      recentPercent,
      band: recentPercent === null ? null : bandFor(recentPercent),
      quizPercent: qt ? grade({ [paper.id]: [qc, qt] }).percent : null,
      quizCount: quizzes.length,
      topicsNeedingPractice: topics.filter((t) => t.status === "needs-practice").length,
      dueCount: topics.reduce((n, t) => n + t.dueCount, 0),
    };
  }
  return out;
}
