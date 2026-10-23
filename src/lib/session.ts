/*
 * Pure state transitions for study sessions, quizzes, flashcards, mistakes and
 * saved items. Each function takes the current StudyData and returns a new one.
 */

import { getTopic, TOPICS, type PaperId } from "@/content/taxonomy";
import type { BankIndex } from "./bank";
import { dayOf, rateCard } from "./cards";
import type { Flashcard, Question } from "./content-types";
import { isCorrect } from "./grading";
import { buildRecommendation, computeTopicStats, type Recommendation } from "./insights";
import { applyAnswer, buildReviewQueue, questionsForMinutes, shuffle, type QueueItem } from "./scheduler";
import type {
  ActiveSession,
  CardRating,
  ChoiceId,
  MistakeCategory,
  SessionMode,
  SessionRecord,
  StudyData,
} from "./types";

const TOPIC_ORDER = TOPICS.map((t) => t.id);

/* ── Recommended practice ───────────────────────────────────────────── */

export interface SessionPlan {
  items: QueueItem[];
  recommendation: Recommendation | null;
}

function poolFor(index: BankIndex, paper: PaperId | null): Question[] {
  return paper ? index.questionsInPaper(paper) : index.questions;
}

/** What Today shows, and exactly what Start will begin. */
export function planSession(data: StudyData, index: BankIndex, minutes: number, now: number): SessionPlan {
  const stats = computeTopicStats(index, data.attempts, data.progress, now);
  const queue = buildReviewQueue(poolFor(index, data.profile.focusPaper), TOPIC_ORDER, data.progress, stats, now);
  const items = queue.slice(0, questionsForMinutes(minutes));
  return { items, recommendation: buildRecommendation(index, items, stats, data.attempts.length > 0) };
}

function newSession(
  id: string,
  mode: SessionMode,
  title: string,
  questionIds: string[],
  now: number,
  opts: { feedback?: ActiveSession["feedback"]; reasons?: ActiveSession["reasons"]; minutes?: number } = {},
): ActiveSession {
  return {
    id,
    mode,
    title,
    feedback: opts.feedback ?? "immediate",
    minutes: opts.minutes ?? Math.max(5, Math.round(questionIds.length * 1.5)),
    startedAt: now,
    questionIds,
    reasons: opts.reasons ?? {},
    currentIndex: 0,
    responses: {},
  };
}

export function startRecommendedSession(data: StudyData, index: BankIndex, minutes: number, now: number, id: string): StudyData {
  const { items, recommendation } = planSession(data, index, minutes, now);
  if (items.length === 0) return data;
  return {
    ...data,
    profile: { ...data.profile, preferredMinutes: minutes },
    activeSession: newSession(
      id,
      "recommended",
      recommendation?.title ?? "Practice",
      items.map((i) => i.questionId),
      now,
      { minutes, reasons: Object.fromEntries(items.map((i) => [i.questionId, i.reason])) },
    ),
  };
}

/** Practice one topic: missed and due first, then unseen, then the rest. */
export function startTopicSession(data: StudyData, index: BankIndex, topicId: string, count: number, now: number, id: string): StudyData {
  const pool = index.questionsInTopic(topicId);
  const stats = computeTopicStats(index, data.attempts, data.progress, now);
  const queue = buildReviewQueue(pool, TOPIC_ORDER, data.progress, stats, now).slice(0, count);
  if (!queue.length) return data;
  return {
    ...data,
    activeSession: newSession(id, "topic", getTopic(topicId)?.name ?? "Topic practice", queue.map((q) => q.questionId), now, {
      reasons: Object.fromEntries(queue.map((i) => [i.questionId, i.reason])),
    }),
  };
}

/** Start from a fixed list, e.g. notebook mistakes or saved questions. */
export function startListSession(
  data: StudyData,
  index: BankIndex,
  mode: "mistakes" | "saved",
  questionIds: string[],
  now: number,
  id: string,
  limit = 25,
): StudyData {
  const ids = [...new Set(questionIds)].filter((q) => index.question(q)).slice(0, limit);
  if (ids.length === 0) return data;
  return {
    ...data,
    activeSession: newSession(id, mode, mode === "mistakes" ? "Balikan: your mistakes" : "Saved questions", ids, now, {
      reasons: Object.fromEntries(ids.map((q) => [q, mode === "mistakes" ? "missed" : "extra"])),
    }),
  };
}

/* ── Quizzes ─────────────────────────────────────────────────────────── */

export interface QuizSpec {
  title: string;
  papers: PaperId[];
  /** Empty = every topic in the chosen papers. */
  topicIds: string[];
  count: number;
  style: "all" | "pnle" | "nclex";
  /** Only questions she has missed before. */
  onlyMissed: boolean;
  feedback: "immediate" | "end";
}

export function quizPool(data: StudyData, index: BankIndex, spec: QuizSpec): Question[] {
  const topics = new Set(spec.topicIds);
  return index.questions.filter((q) => {
    const t = getTopic(q.topicId);
    if (!t || !spec.papers.includes(t.paperId)) return false;
    if (topics.size && !topics.has(q.topicId)) return false;
    if (spec.style !== "all" && q.style !== spec.style) return false;
    if (spec.onlyMissed) {
      const p = data.progress[q.id];
      if (!p || p.correctCount === p.attempts) return false;
    }
    return true;
  });
}

/**
 * Pick quiz items: spread evenly across the chosen papers (like a mock board),
 * preferring questions she hasn't seen, then ones seen longest ago.
 */
export function startQuiz(data: StudyData, index: BankIndex, spec: QuizSpec, now: number, id: string): StudyData {
  const pool = quizPool(data, index, spec);
  if (!pool.length) return data;
  const seed = Math.floor(now / 1000);
  const byPaper = new Map<PaperId, Question[]>();
  for (const q of shuffle(pool, seed)) {
    const p = getTopic(q.topicId)!.paperId;
    (byPaper.get(p) ?? byPaper.set(p, []).get(p)!).push(q);
  }
  const freshness = (q: Question) => data.progress[q.id]?.lastAnsweredAt ?? 0;
  for (const list of byPaper.values()) list.sort((a, b) => freshness(a) - freshness(b));

  const picked: Question[] = [];
  const lists = [...byPaper.values()];
  for (let round = 0; picked.length < spec.count && lists.some((l) => l.length > round); round++)
    for (const l of lists) if (l[round] && picked.length < spec.count) picked.push(l[round]);

  // Keep situational sets together, as on the board.
  const ordered = shuffle(picked, seed + 1).sort((a, b) => (a.situation ?? "").localeCompare(b.situation ?? ""));
  return {
    ...data,
    activeSession: newSession(id, "quiz", spec.title, ordered.map((q) => q.id), now, {
      feedback: spec.feedback,
      minutes: Math.round(ordered.length * 1.2),
    }),
  };
}

/* ── Answering ───────────────────────────────────────────────────────── */

export function answerQuestion(data: StudyData, index: BankIndex, questionId: string, choiceIds: ChoiceId[], now: number): StudyData {
  const session = data.activeSession;
  const question = index.question(questionId);
  if (!session || !question || !session.questionIds.includes(questionId) || choiceIds.length === 0) return data;
  const correct = isCorrect(question, choiceIds);
  const response = { choiceIds: [...choiceIds].sort(), correct, answeredAt: now };

  if (session.feedback === "end") {
    // Exam mode: she can change answers until she submits. Nothing is scored yet.
    return { ...data, activeSession: { ...session, responses: { ...session.responses, [questionId]: response } } };
  }
  if (session.responses[questionId]) return data; // already answered; ignore double submits
  return {
    ...data,
    activeSession: { ...session, responses: { ...session.responses, [questionId]: response } },
    progress: {
      ...data.progress,
      [questionId]: applyAnswer(data.progress[questionId], questionId, question.topicId, correct, now),
    },
    attempts: [
      ...data.attempts,
      { questionId, topicId: question.topicId, choiceIds: response.choiceIds, correct, at: now, sessionId: session.id },
    ],
  };
}

export function goToQuestion(data: StudyData, indexInSession: number): StudyData {
  const s = data.activeSession;
  if (!s) return data;
  const target = Math.max(0, Math.min(s.questionIds.length - 1, indexInSession));
  if (s.feedback === "immediate" && target > s.currentIndex && !s.responses[s.questionIds[s.currentIndex]]) return data;
  return { ...data, activeSession: { ...s, currentIndex: target } };
}

export function goToNextQuestion(data: StudyData): StudyData {
  const s = data.activeSession;
  if (!s || s.currentIndex >= s.questionIds.length - 1) return data;
  return goToQuestion(data, s.currentIndex + 1);
}

export function finishSession(data: StudyData, index: BankIndex, now: number): { data: StudyData; record: SessionRecord | null } {
  const s = data.activeSession;
  if (!s) return { data, record: null };
  const answered = Object.entries(s.responses);
  if (answered.length === 0) return { data: { ...data, activeSession: null }, record: null };

  let next = data;
  if (s.feedback === "end") {
    // Score the exam now: unanswered items count as wrong, like the board.
    const progress = { ...data.progress };
    const attempts = [...data.attempts];
    for (const qid of s.questionIds) {
      const q = index.question(qid);
      const r = s.responses[qid];
      if (!q) continue;
      const correct = r?.correct ?? false;
      progress[qid] = applyAnswer(progress[qid], qid, q.topicId, correct, now);
      attempts.push({ questionId: qid, topicId: q.topicId, choiceIds: r?.choiceIds ?? [], correct, at: now, sessionId: s.id });
    }
    next = { ...data, progress, attempts };
  }

  const counted = s.feedback === "end" ? s.questionIds : answered.map(([qid]) => qid);
  const byPaper: SessionRecord["byPaper"] = {};
  const topicIds: string[] = [];
  let correctCount = 0;
  for (const qid of counted) {
    const q = index.question(qid);
    if (!q) continue;
    const paper = getTopic(q.topicId)?.paperId;
    const ok = s.responses[qid]?.correct ?? false;
    if (ok) correctCount++;
    if (paper) {
      const cur = byPaper[paper] ?? [0, 0];
      byPaper[paper] = [cur[0] + (ok ? 1 : 0), cur[1] + 1];
    }
    if (!topicIds.includes(q.topicId)) topicIds.push(q.topicId);
  }
  const record: SessionRecord = {
    id: s.id,
    mode: s.mode,
    title: s.title,
    feedback: s.feedback,
    startedAt: s.startedAt,
    endedAt: now,
    plannedCount: s.questionIds.length,
    answeredCount: answered.length,
    correctCount,
    topicIds,
    byPaper,
    ...(s.mode === "quiz"
      ? { answers: Object.fromEntries(s.questionIds.map((q) => [q, (s.responses[q]?.choiceIds ?? []).join("")])) }
      : {}),
  };
  return { data: { ...next, activeSession: null, sessions: [...next.sessions, record] }, record };
}

/* ── Notebook ────────────────────────────────────────────────────────── */

export interface MistakeInput {
  questionId: string;
  sessionId: string;
  chosen: ChoiceId[];
  category: MistakeCategory;
  note: string;
}

const choiceText = (q: Question, ids: ChoiceId[]) =>
  ids.map((id) => `${id}. ${q.choices.find((c) => c.id === id)?.text ?? ""}`).join("\n");

/** Save a question mistake. Re-saving the same question in the same session updates it. */
export function recordMistake(data: StudyData, index: BankIndex, input: MistakeInput, now: number, id: string): StudyData {
  const q = index.question(input.questionId);
  if (!q) return data;
  const note = input.note.trim().slice(0, 1000);
  const existing = data.mistakes.find((m) => m.kind === "question" && m.itemId === q.id && m.sessionId === input.sessionId);
  if (existing) {
    return {
      ...data,
      mistakes: data.mistakes.map((m) => (m.id === existing.id ? { ...m, category: input.category, note, resolvedAt: null } : m)),
    };
  }
  return {
    ...data,
    mistakes: [
      ...data.mistakes,
      {
        id,
        kind: "question",
        itemId: q.id,
        sessionId: input.sessionId,
        chosen: input.chosen,
        category: input.category,
        note,
        createdAt: now,
        resolvedAt: null,
        snapshot: {
          topicId: q.topicId,
          prompt: q.situation ? `${q.situation}\n\n${q.stem}` : q.stem,
          chosenText: choiceText(q, input.chosen),
          answerText: choiceText(q, q.answer),
          rationale: q.rationale,
        },
      },
    ],
  };
}

/** Save every wrong answer from a finished quiz that isn't in the notebook yet. */
export function recordQuizMistakes(data: StudyData, index: BankIndex, record: SessionRecord, now: number, newId: () => string): StudyData {
  let next = data;
  for (const [qid, chosen] of Object.entries(record.answers ?? {})) {
    const q = index.question(qid);
    if (!q) continue;
    const ids = chosen.split("") as ChoiceId[];
    if (isCorrect(q, ids)) continue;
    if (next.mistakes.some((m) => m.itemId === qid && m.sessionId === record.id)) continue;
    next = recordMistake(next, index, { questionId: qid, sessionId: record.id, chosen: ids, category: "other", note: "" }, now, newId());
  }
  return next;
}

export function recordCardMistake(data: StudyData, card: Flashcard, sessionId: string, note: string, now: number, id: string): StudyData {
  if (data.mistakes.some((m) => m.kind === "card" && m.itemId === card.id && !m.resolvedAt)) return data;
  return {
    ...data,
    mistakes: [
      ...data.mistakes,
      {
        id,
        kind: "card",
        itemId: card.id,
        sessionId,
        chosen: [],
        category: "concept",
        note: note.trim().slice(0, 1000),
        createdAt: now,
        resolvedAt: null,
        snapshot: { topicId: card.topicId, prompt: card.front, chosenText: "", answerText: card.back, rationale: "" },
      },
    ],
  };
}

export function updateMistake(data: StudyData, mistakeId: string, patch: { category?: MistakeCategory; note?: string }): StudyData {
  return {
    ...data,
    mistakes: data.mistakes.map((m) =>
      m.id === mistakeId ? { ...m, ...patch, ...(patch.note !== undefined ? { note: patch.note.trim().slice(0, 1000) } : {}) } : m,
    ),
  };
}

export function setMistakeResolved(data: StudyData, mistakeId: string, resolved: boolean, now: number): StudyData {
  return { ...data, mistakes: data.mistakes.map((m) => (m.id === mistakeId ? { ...m, resolvedAt: resolved ? now : null } : m)) };
}

export function deleteMistake(data: StudyData, mistakeId: string): StudyData {
  return { ...data, mistakes: data.mistakes.filter((m) => m.id !== mistakeId) };
}

export function toggleSaved(data: StudyData, questionId: string, now: number): StudyData {
  const saved = { ...data.saved };
  if (saved[questionId]) delete saved[questionId];
  else saved[questionId] = now;
  return { ...data, saved };
}

/* ── Flashcards ──────────────────────────────────────────────────────── */

export function reviewCard(data: StudyData, cardId: string, topicId: string, rating: CardRating, now: number): StudyData {
  const prev = data.cards[cardId];
  const day = String(dayOf(now));
  const [n, r] = data.cardLog[day] ?? [0, 0];
  // Keep about two months of daily counts.
  const log = Object.fromEntries(Object.entries(data.cardLog).filter(([d]) => Number(d) > dayOf(now) - 60));
  log[day] = prev ? [n, r + 1] : [n + 1, r];
  return { ...data, cards: { ...data.cards, [cardId]: rateCard(prev, topicId, rating, now) }, cardLog: log };
}

/* ── Reviewers ───────────────────────────────────────────────────────── */

export function setReviewerRead(data: StudyData, topicId: string, read: boolean, now: number): StudyData {
  const reviewersRead = { ...data.reviewersRead };
  if (read) reviewersRead[topicId] = now;
  else delete reviewersRead[topicId];
  return { ...data, reviewersRead };
}

/** Her own "done studying this topic" tick. Doesn't touch performance or scheduling. */
export function setTopicDone(data: StudyData, topicId: string, done: boolean, now: number): StudyData {
  const topicsDone = { ...data.topicsDone };
  if (done) topicsDone[topicId] = now;
  else delete topicsDone[topicId];
  return { ...data, topicsDone };
}
