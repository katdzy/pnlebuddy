// Domain types for her study data. Kept free of React so scheduling, grading
// and storage can be tested and replaced independently of the UI.

import type { PaperId } from "@/content/taxonomy";
import type { ChoiceId } from "./content-types";

export type { ChoiceId, Choice, Question, Flashcard, ContentManifest } from "./content-types";

/** Spaced-review state for a single question (Leitner boxes). */
export interface QuestionProgress {
  questionId: string;
  topicId: string;
  /** 0 = missed / comes back next session. Higher = longer interval. */
  box: number;
  dueAt: number;
  lastAnsweredAt: number;
  lastResult: "correct" | "incorrect";
  attempts: number;
  correctCount: number;
}

export interface Attempt {
  questionId: string;
  topicId: string;
  choiceIds: ChoiceId[];
  correct: boolean;
  at: number;
  sessionId: string;
}

/**
 * Flashcard review state, stored compactly because there can be thousands:
 * [dueDay, intervalDays, ease×1000, reps, lapses, topicIndex]
 * Days are local calendar days since 1970-01-01.
 */
export type CardState = [number, number, number, number, number, number];

export type CardRating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export const MISTAKE_CATEGORIES = [
  { id: "concept", label: "I didn't know the concept" },
  { id: "confused", label: "I confused two concepts" },
  { id: "misread", label: "I misread the question" },
  { id: "reasoning", label: "I struggled with clinical reasoning" },
  { id: "other", label: "Other" },
] as const;

export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number]["id"];

export interface MistakeEntry {
  id: string;
  /**
   * "question" from practice or quizzes, "card" from flashcards, "anatomy" from the 3D identify quiz (itemId is the
   * structure's FMA id; the snapshot holds plain text like a question's).
   */
  kind: "question" | "card" | "anatomy";
  itemId: string;
  sessionId: string;
  chosen: ChoiceId[];
  category: MistakeCategory;
  note: string;
  createdAt: number;
  /** Set when she marks it as understood. */
  resolvedAt: number | null;
  /** Copy of the item so the notebook still reads correctly if content changes. */
  snapshot: {
    topicId: string;
    /** Question stem, or the card front (HTML for cards). */
    prompt: string;
    chosenText: string;
    /** Correct option(s), or the card back (HTML for cards). */
    answerText: string;
    rationale: string;
  };
}

export type SessionMode = "recommended" | "topic" | "mistakes" | "saved" | "quiz";

export type QueueReason = "missed" | "weak-topic" | "due" | "new-topic" | "new" | "extra";

export interface SessionResponse {
  choiceIds: ChoiceId[];
  correct: boolean;
  answeredAt: number;
}

export interface ActiveSession {
  id: string;
  mode: SessionMode;
  title: string;
  /** "immediate" shows the rationale after each item. "end" is exam style: graded on submit. */
  feedback: "immediate" | "end";
  minutes: number;
  startedAt: number;
  questionIds: string[];
  reasons: Record<string, QueueReason>;
  currentIndex: number;
  responses: Record<string, SessionResponse>;
}

export interface SessionRecord {
  id: string;
  mode: SessionMode;
  title: string;
  feedback: "immediate" | "end";
  startedAt: number;
  endedAt: number;
  plannedCount: number;
  answeredCount: number;
  correctCount: number;
  topicIds: string[];
  /** [correct, total] per paper. */
  byPaper: Partial<Record<PaperId, [number, number]>>;
  /** Kept for quizzes so she can review them later: question id → chosen ids ("AC"). */
  answers?: Record<string, string>;
}

export interface Profile {
  name: string;
  preferredMinutes: number;
  /** New flashcards introduced per day. */
  newCardsPerDay: number;
  /** Optional: keep Today's practice on one paper while she reviews it. */
  focusPaper: PaperId | null;
}

export interface StudyData {
  version: 4;
  profile: Profile;
  progress: Record<string, QuestionProgress>;
  attempts: Attempt[];
  mistakes: MistakeEntry[];
  /** Saved for later: question id → saved-at. */
  saved: Record<string, number>;
  sessions: SessionRecord[];
  activeSession: ActiveSession | null;
  cards: Record<string, CardState>;
  /** Cards studied per day: day → [new, reviews]. Only recent days are kept. */
  cardLog: Record<string, [number, number]>;
  /** Reviewer pages she has read: topic id → read-at. */
  reviewersRead: Record<string, number>;
  /**
   * Her own checklist: topics she has ticked as done studying → ticked-at.
   * Self-reported, and kept apart from performance (v3).
   */
  topicsDone: Record<string, number>;
  /**
   * The 3D identify quiz: structure (FMA id) → review state, scheduled like a flashcard. The topic index is the A&P
   * topic of the structure's body system (v4).
   */
  anatomy: Record<string, CardState>;
}
