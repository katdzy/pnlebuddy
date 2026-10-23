"use client";

/*
 * Client-side store backed by localStorage.
 *
 * Exposed through useSyncExternalStore so the server render (and the first
 * client render) see `null` and show a calm placeholder, then switch to the
 * saved data. No setState-in-effect hydration dance.
 */

import { useSyncExternalStore } from "react";
import type { PaperId } from "@/content/taxonomy";
import { getBank } from "./content";
import type { Flashcard } from "./content-types";
import * as S from "./session";
import { lookActions } from "./lookStore";
import { emptyData, loadData, sanitize, saveData, STORAGE_KEY } from "./storage";
import type { CardRating, ChoiceId, MistakeCategory, SessionRecord, StudyData } from "./types";

export interface StoreSnapshot {
  data: StudyData;
  /** Last write to storage failed (e.g. storage full or blocked). */
  saveFailed: boolean;
  /** Stored data was unreadable and was backed up before starting fresh. */
  recovered: boolean;
  /** Data from the earlier prototype was carried over on this load. */
  migrated: boolean;
}

let snapshot: StoreSnapshot | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function ensureLoaded(): StoreSnapshot {
  if (snapshot) return snapshot;
  const { data, recovered, migrated } = loadData(window.localStorage);
  snapshot = { data, saveFailed: false, recovered, migrated };
  return snapshot;
}

function commit(next: StudyData) {
  const current = ensureLoaded();
  if (next === current.data) return;
  const ok = saveData(window.localStorage, next);
  snapshot = { ...current, data: next, saveFailed: !ok };
  emit();
}

function update(fn: (d: StudyData) => StudyData) {
  commit(fn(ensureLoaded().data));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep multiple open tabs/windows in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    const { data } = loadData(window.localStorage);
    snapshot = { ...ensureLoaded(), data };
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => null;

/** Returns null until local data has been read on the client. */
export function useStudyStore(): StoreSnapshot | null {
  return useSyncExternalStore(subscribe, ensureLoaded, getServerSnapshot);
}

/* ── Clock ──────────────────────────────────────────────────────────────── */

let now = 0;
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (!clockTimer) {
    clockTimer = setInterval(() => {
      now = Date.now();
      clockListeners.forEach((l) => l());
    }, 60_000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

function getNow() {
  if (now === 0) now = Date.now();
  return now;
}

/** Current time, refreshed every minute. 0 during server render. */
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, getNow, () => 0);
}

/* ── Actions ────────────────────────────────────────────────────────────── */

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Run a change that needs the question bank. No-op until content has loaded. */
function withBank(fn: (d: StudyData, bank: NonNullable<ReturnType<typeof getBank>>) => StudyData) {
  const bank = getBank();
  if (bank) update((d) => fn(d, bank));
}

export const actions = {
  startRecommended(minutes: number) {
    withBank((d, b) => S.startRecommendedSession(d, b, minutes, Date.now(), newId()));
  },
  startTopic(topicId: string, count = 12) {
    withBank((d, b) => S.startTopicSession(d, b, topicId, count, Date.now(), newId()));
  },
  startList(mode: "mistakes" | "saved", questionIds: string[]) {
    withBank((d, b) => S.startListSession(d, b, mode, questionIds, Date.now(), newId()));
  },
  startQuiz(spec: S.QuizSpec) {
    withBank((d, b) => S.startQuiz(d, b, spec, Date.now(), newId()));
  },
  answer(questionId: string, choiceIds: ChoiceId[]) {
    withBank((d, b) => S.answerQuestion(d, b, questionId, choiceIds, Date.now()));
  },
  next() {
    update(S.goToNextQuestion);
  },
  goTo(index: number) {
    update((d) => S.goToQuestion(d, index));
  },
  finish(): SessionRecord | null {
    const bank = getBank();
    if (!bank) return null;
    let record: SessionRecord | null = null;
    update((d) => {
      const result = S.finishSession(d, bank, Date.now());
      record = result.record;
      return result.data;
    });
    return record;
  },
  discardSession() {
    update((d) => ({ ...d, activeSession: null }));
  },
  recordMistake(input: S.MistakeInput) {
    withBank((d, b) => S.recordMistake(d, b, input, Date.now(), newId()));
  },
  recordQuizMistakes(record: SessionRecord) {
    withBank((d, b) => S.recordQuizMistakes(d, b, record, Date.now(), newId));
  },
  recordCardMistake(card: Flashcard, sessionId: string, note: string) {
    update((d) => S.recordCardMistake(d, card, sessionId, note, Date.now(), newId()));
  },
  updateMistake(id: string, patch: { category?: MistakeCategory; note?: string }) {
    update((d) => S.updateMistake(d, id, patch));
  },
  setMistakeResolved(id: string, resolved: boolean) {
    update((d) => S.setMistakeResolved(d, id, resolved, Date.now()));
  },
  deleteMistake(id: string) {
    update((d) => S.deleteMistake(d, id));
  },
  toggleSaved(questionId: string) {
    update((d) => S.toggleSaved(d, questionId, Date.now()));
  },
  reviewCard(cardId: string, topicId: string, rating: CardRating) {
    update((d) => S.reviewCard(d, cardId, topicId, rating, Date.now()));
  },
  setReviewerRead(topicId: string, read: boolean) {
    update((d) => S.setReviewerRead(d, topicId, read, Date.now()));
  },
  setTopicDone(topicId: string, done: boolean) {
    update((d) => S.setTopicDone(d, topicId, done, Date.now()));
  },
  setName(name: string) {
    update((d) => ({ ...d, profile: { ...d.profile, name: name.slice(0, 40) } }));
  },
  setNewCardsPerDay(n: number) {
    update((d) => ({ ...d, profile: { ...d.profile, newCardsPerDay: Math.min(200, Math.max(0, Math.round(n))) } }));
  },
  setFocusPaper(paper: PaperId | null) {
    update((d) => ({ ...d, profile: { ...d.profile, focusPaper: paper } }));
  },
  /** Replace all data from a backup. Returns false if the file isn't a valid backup. */
  importBackup(json: string): boolean {
    try {
      const parsed: unknown = JSON.parse(json);
      const version = (parsed as { version?: unknown })?.version;
      if (typeof parsed !== "object" || parsed === null || (version !== 1 && version !== 2 && version !== 3)) return false;
      commit(sanitize(parsed));
      const look = (parsed as { look?: unknown }).look;
      if (look) lookActions.replace(look);
      return true;
    } catch {
      return false;
    }
  },
  /** Study data plus the look (theme, icons, covers, motto). Cover photos stay on the device. */
  exportBackup(): string {
    return JSON.stringify({ ...ensureLoaded().data, look: lookActions.snapshot() }, null, 2);
  },
  resetAll() {
    commit(emptyData());
  },
  dismissRecovered() {
    const s = ensureLoaded();
    snapshot = { ...s, recovered: false, migrated: false };
    emit();
  },
};

export { newId };
