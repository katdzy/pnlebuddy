/*
 * Versioned localStorage persistence.
 *
 * Data is validated on the way in. Anything malformed is dropped rather than
 * crashing the app, and an unreadable blob is backed up under a separate key
 * before starting fresh so nothing is silently destroyed.
 *
 * v1 (demo-question prototype) is migrated to v2: her name, session history and
 * notebook entries carry over. Progress on the 30 demo questions does not,
 * because those questions no longer exist.
 *
 * v2 → v3 adds `topicsDone` (her own topic checklist). Nothing else changed, so
 * v2 data is read as-is and the new field starts empty. The storage key stays
 * "pnlebuddy:v2" so existing progress is found where it always was.
 *
 * v3 → v4 adds `anatomy` (the 3D identify quiz's review states) and "anatomy" notebook entries. Again nothing else
 * changed: v2 and v3 data are read as-is and the new field starts empty.
 */

import { PAPERS, type PaperId } from "@/content/taxonomy";
import { CHOICE_IDS } from "./content-types";
import type {
  ActiveSession,
  Attempt,
  CardState,
  ChoiceId,
  MistakeEntry,
  Profile,
  QuestionProgress,
  SessionRecord,
  StudyData,
} from "./types";
import { MISTAKE_CATEGORIES } from "./types";

export const STORAGE_KEY = "pnlebuddy:v2";
export const LEGACY_KEY = "pnlebuddy:v1";
const MAX_ATTEMPTS = 6000;
const MAX_SESSIONS = 400;
const MAX_QUIZ_ANSWER_RECORDS = 40;
/** Versions `sanitize` reads directly (v1 is migrated). Also what a backup may be. */
export const STORED_VERSIONS = [2, 3, 4];

export function emptyData(): StudyData {
  return {
    version: 4,
    profile: { name: "", preferredMinutes: 25, newCardsPerDay: 20, focusPaper: null },
    progress: {},
    attempts: [],
    mistakes: [],
    saved: {},
    sessions: [],
    activeSession: null,
    cards: {},
    cardLog: {},
    reviewersRead: {},
    topicsDone: {},
    anatomy: {},
  };
}

type Unknown = Record<string, unknown>;
const isObj = (v: unknown): v is Unknown => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isChoice = (v: unknown): v is ChoiceId => CHOICE_IDS.includes(v as ChoiceId);
const isChoices = (v: unknown): v is ChoiceId[] => Array.isArray(v) && v.every(isChoice);
const CATEGORY_IDS = new Set<string>(MISTAKE_CATEGORIES.map((c) => c.id));
const PAPER_IDS = new Set<string>(PAPERS.map((p) => p.id));

function sanitizeProfile(v: unknown): Profile {
  const base = emptyData().profile;
  if (!isObj(v)) return base;
  return {
    name: isStr(v.name) ? v.name.slice(0, 40) : base.name,
    preferredMinutes: [10, 25, 45].includes(v.preferredMinutes as number) ? (v.preferredMinutes as number) : base.preferredMinutes,
    newCardsPerDay: isNum(v.newCardsPerDay) ? Math.min(200, Math.max(0, Math.round(v.newCardsPerDay))) : base.newCardsPerDay,
    focusPaper: isStr(v.focusPaper) && PAPER_IDS.has(v.focusPaper) ? (v.focusPaper as PaperId) : null,
  };
}

function sanitizeProgress(v: unknown): Record<string, QuestionProgress> {
  const out: Record<string, QuestionProgress> = {};
  if (!isObj(v)) return out;
  for (const [id, p] of Object.entries(v)) {
    if (
      isObj(p) &&
      isStr(p.topicId) &&
      isNum(p.box) &&
      isNum(p.dueAt) &&
      isNum(p.lastAnsweredAt) &&
      (p.lastResult === "correct" || p.lastResult === "incorrect") &&
      isNum(p.attempts) &&
      isNum(p.correctCount)
    ) {
      out[id] = {
        questionId: id,
        topicId: p.topicId,
        box: Math.max(0, Math.floor(p.box)),
        dueAt: p.dueAt,
        lastAnsweredAt: p.lastAnsweredAt,
        lastResult: p.lastResult,
        attempts: p.attempts,
        correctCount: p.correctCount,
      };
    }
  }
  return out;
}

function sanitizeAttempts(v: unknown): Attempt[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (a): a is Attempt =>
        isObj(a) &&
        isStr(a.questionId) &&
        isStr(a.topicId) &&
        isChoices(a.choiceIds) &&
        typeof a.correct === "boolean" &&
        isNum(a.at) &&
        isStr(a.sessionId),
    )
    .slice(-MAX_ATTEMPTS);
}

function sanitizeMistakes(v: unknown): MistakeEntry[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (m): m is MistakeEntry =>
      isObj(m) &&
      isStr(m.id) &&
      (m.kind === "question" || m.kind === "card" || m.kind === "anatomy") &&
      isStr(m.itemId) &&
      isChoices(m.chosen) &&
      isStr(m.category) &&
      CATEGORY_IDS.has(m.category) &&
      isStr(m.note) &&
      isNum(m.createdAt) &&
      (m.resolvedAt === null || isNum(m.resolvedAt)) &&
      isObj(m.snapshot) &&
      isStr(m.snapshot.topicId) &&
      isStr(m.snapshot.prompt) &&
      isStr(m.snapshot.answerText) &&
      isStr(m.snapshot.rationale),
  );
}

function sanitizeSaved(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [id, at] of Object.entries(v)) if (isNum(at)) out[id] = at;
  return out;
}

function sanitizeSessions(v: unknown): SessionRecord[] {
  if (!Array.isArray(v)) return [];
  const list = v
    .filter(
      (s): s is SessionRecord =>
        isObj(s) &&
        isStr(s.id) &&
        isStr(s.mode) &&
        isNum(s.startedAt) &&
        isNum(s.endedAt) &&
        isNum(s.answeredCount) &&
        isNum(s.correctCount) &&
        Array.isArray(s.topicIds) &&
        isObj(s.byPaper),
    )
    .map((s) => ({ ...s, title: isStr(s.title) ? s.title : "Practice", feedback: s.feedback === "end" ? "end" : "immediate" }) as SessionRecord)
    .slice(-MAX_SESSIONS);
  // Only the most recent quizzes keep their full answer sheets.
  let kept = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (!list[i].answers) continue;
    if (++kept > MAX_QUIZ_ANSWER_RECORDS) list[i] = { ...list[i], answers: undefined };
  }
  return list;
}

function sanitizeActive(v: unknown): ActiveSession | null {
  if (!isObj(v)) return null;
  if (
    !isStr(v.id) ||
    !Array.isArray(v.questionIds) ||
    !v.questionIds.every(isStr) ||
    v.questionIds.length === 0 ||
    !isNum(v.currentIndex) ||
    !isObj(v.responses) ||
    !isNum(v.startedAt)
  )
    return null;
  const responses: ActiveSession["responses"] = {};
  for (const [id, r] of Object.entries(v.responses)) {
    if (isObj(r) && isChoices(r.choiceIds) && typeof r.correct === "boolean" && isNum(r.answeredAt)) {
      responses[id] = { choiceIds: r.choiceIds, correct: r.correct, answeredAt: r.answeredAt };
    }
  }
  const modes = ["recommended", "topic", "mistakes", "saved", "quiz"];
  return {
    id: v.id,
    mode: modes.includes(v.mode as string) ? (v.mode as ActiveSession["mode"]) : "recommended",
    title: isStr(v.title) ? v.title : "Practice",
    feedback: v.feedback === "end" ? "end" : "immediate",
    minutes: isNum(v.minutes) ? v.minutes : 25,
    startedAt: v.startedAt,
    questionIds: v.questionIds as string[],
    reasons: isObj(v.reasons) ? (v.reasons as ActiveSession["reasons"]) : {},
    currentIndex: Math.min(Math.max(0, Math.floor(v.currentIndex)), v.questionIds.length - 1),
    responses,
  };
}

function sanitizeCards(v: unknown): Record<string, CardState> {
  const out: Record<string, CardState> = {};
  if (!isObj(v)) return out;
  for (const [id, s] of Object.entries(v)) if (Array.isArray(s) && s.length === 6 && s.every(isNum)) out[id] = s as CardState;
  return out;
}

function sanitizeCardLog(v: unknown): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  if (!isObj(v)) return out;
  for (const [d, x] of Object.entries(v)) if (Array.isArray(x) && x.length === 2 && x.every(isNum)) out[d] = x as [number, number];
  return out;
}

/** Validate unknown input (from storage or an imported backup) into StudyData. */
export function sanitize(input: unknown): StudyData {
  if (isObj(input) && input.version === 1) return migrateV1(input);
  // v2, v3 and v4 share a shape; v2 has no topicsDone yet, and v2–v3 no anatomy.
  if (!isObj(input) || !STORED_VERSIONS.includes(input.version as number)) return emptyData();
  return {
    version: 4,
    profile: sanitizeProfile(input.profile),
    progress: sanitizeProgress(input.progress),
    attempts: sanitizeAttempts(input.attempts),
    mistakes: sanitizeMistakes(input.mistakes),
    saved: sanitizeSaved(input.saved),
    sessions: sanitizeSessions(input.sessions),
    activeSession: sanitizeActive(input.activeSession),
    cards: sanitizeCards(input.cards),
    cardLog: sanitizeCardLog(input.cardLog),
    reviewersRead: sanitizeSaved(input.reviewersRead),
    topicsDone: sanitizeSaved(input.topicsDone),
    anatomy: sanitizeCards(input.anatomy),
  };
}

/** v1 → current. Keeps name, session history and notebook notes. */
export function migrateV1(v1: Unknown): StudyData {
  const data = emptyData();
  if (isObj(v1.profile)) {
    if (isStr(v1.profile.name)) data.profile.name = v1.profile.name.slice(0, 40);
    if ([10, 25, 45].includes(v1.profile.preferredMinutes as number)) data.profile.preferredMinutes = v1.profile.preferredMinutes as number;
  }
  if (Array.isArray(v1.mistakes)) {
    for (const m of v1.mistakes) {
      if (!isObj(m) || !isObj(m.snapshot) || !isStr(m.id) || !isStr(m.snapshot.stem)) continue;
      const snap = m.snapshot;
      data.mistakes.push({
        id: m.id,
        kind: "question",
        itemId: isStr(m.questionId) ? m.questionId : m.id,
        sessionId: isStr(m.sessionId) ? m.sessionId : "",
        chosen: isChoice(m.chosenChoiceId) ? [m.chosenChoiceId] : [],
        category: isStr(m.category) && CATEGORY_IDS.has(m.category) ? (m.category as MistakeEntry["category"]) : "other",
        note: isStr(m.note) ? m.note : "",
        createdAt: isNum(m.createdAt) ? m.createdAt : Date.now(),
        resolvedAt: isNum(m.resolvedAt) ? m.resolvedAt : null,
        snapshot: {
          topicId: "legacy",
          prompt: snap.stem as string,
          chosenText: isStr(snap.chosenText) ? snap.chosenText : "",
          answerText: `${isStr(snap.correctChoiceId) ? snap.correctChoiceId + ". " : ""}${isStr(snap.correctText) ? snap.correctText : ""}`,
          rationale: isStr(snap.rationale) ? snap.rationale : "",
        },
      });
    }
  }
  if (Array.isArray(v1.sessions)) {
    for (const s of v1.sessions) {
      if (!isObj(s) || !isStr(s.id) || !isNum(s.startedAt) || !isNum(s.endedAt) || !isNum(s.answeredCount) || !isNum(s.correctCount)) continue;
      data.sessions.push({
        id: s.id,
        mode: "recommended",
        title: "Practice (demo questions)",
        feedback: "immediate",
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        plannedCount: isNum(s.plannedCount) ? s.plannedCount : s.answeredCount,
        answeredCount: s.answeredCount,
        correctCount: s.correctCount,
        topicIds: [],
        byPaper: {},
      });
    }
  }
  return data;
}

export interface LoadResult {
  data: StudyData;
  /** True if stored data couldn't be read and was backed up before resetting. */
  recovered: boolean;
  /** True if v1 data was migrated on this load. */
  migrated: boolean;
}

export function loadData(storage: Storage): LoadResult {
  let raw: string | null = null;
  let legacy: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (!raw) legacy = storage.getItem(LEGACY_KEY);
  } catch {
    return { data: emptyData(), recovered: false, migrated: false };
  }
  const source = raw ?? legacy;
  if (!source) return { data: emptyData(), recovered: false, migrated: false };
  try {
    const data = sanitize(JSON.parse(source));
    if (!raw && legacy) {
      // Keep the old blob untouched; write the migrated copy under the new key.
      saveData(storage, data);
      return { data, recovered: false, migrated: true };
    }
    return { data, recovered: false, migrated: false };
  } catch {
    try {
      storage.setItem(`${STORAGE_KEY}:unreadable:${Date.now()}`, source);
    } catch {
      /* storage full; nothing more we can do */
    }
    return { data: emptyData(), recovered: true, migrated: false };
  }
}

/** Returns true when the write succeeded. */
export function saveData(storage: Storage, data: StudyData): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
