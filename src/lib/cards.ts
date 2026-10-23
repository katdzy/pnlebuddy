/*
 * Flashcard scheduling: a small, Anki-like spaced repetition rule (SM-2 family).
 *
 *   Again → back to 1 day, ease drops, counts as a lapse
 *   Hard  → interval × 1.2, ease drops a little
 *   Good  → interval × ease
 *   Easy  → interval × ease × 1.3, ease rises
 *
 * New cards start at 1 day (Again/Hard), 2 days (Good) or 4 days (Easy).
 * Pure functions, days are local calendar days.
 */

import { TOPICS } from "@/content/taxonomy";
import type { CardRating, CardState } from "./types";

export const DEFAULT_EASE = 2500;
const MIN_EASE = 1300;
const MAX_INTERVAL = 365;

/** Local calendar day number (days since 1970-01-01 in local time). */
export function dayOf(at: number): number {
  const d = new Date(at);
  return Math.floor((at - d.getTimezoneOffset() * 60_000) / 86_400_000);
}

const topicIndex = new Map(TOPICS.map((t, i) => [t.id, i]));
export function topicIdOfState(s: CardState): string | undefined {
  return TOPICS[s[5]]?.id;
}

export function rateCard(prev: CardState | undefined, topicId: string, rating: CardRating, now: number): CardState {
  const today = dayOf(now);
  const tIdx = topicIndex.get(topicId) ?? -1;
  if (!prev) {
    const first = rating === 4 ? 4 : rating === 3 ? 2 : 1;
    const ease = rating === 1 ? DEFAULT_EASE - 200 : rating === 4 ? DEFAULT_EASE + 150 : DEFAULT_EASE;
    return [today + first, first, ease, 1, rating === 1 ? 1 : 0, tIdx];
  }
  const [, ivl, ease, reps, lapses] = prev;
  let nextIvl: number;
  let nextEase = ease;
  let nextLapses = lapses;
  switch (rating) {
    case 1:
      nextIvl = 1;
      nextEase = Math.max(MIN_EASE, ease - 200);
      nextLapses += 1;
      break;
    case 2:
      nextIvl = Math.max(1, Math.round(ivl * 1.2));
      nextEase = Math.max(MIN_EASE, ease - 150);
      break;
    case 3:
      nextIvl = Math.max(ivl + 1, Math.round((ivl * ease) / 1000));
      break;
    default:
      nextIvl = Math.max(ivl + 2, Math.round(((ivl * ease) / 1000) * 1.3));
      nextEase = ease + 150;
  }
  nextIvl = Math.min(MAX_INTERVAL, nextIvl);
  return [today + nextIvl, nextIvl, nextEase, reps + 1, nextLapses, tIdx];
}

export function isCardDue(s: CardState, now: number): boolean {
  return s[0] <= dayOf(now);
}

/** "Learned" = seen and currently on an interval of 3+ days. */
export function isCardLearned(s: CardState): boolean {
  return s[1] >= 3;
}

export function previewInterval(prev: CardState | undefined, rating: CardRating, now: number): string {
  const s = rateCard(prev, "", rating, now);
  const d = s[1];
  if (d < 30) return d === 1 ? "1 day" : `${d} days`;
  const m = Math.round(d / 30);
  return m === 1 ? "1 month" : `${m} months`;
}

export interface CardCounts {
  due: number;
  learned: number;
  seen: number;
}

/** Due/learned/seen counts per topic, from stored states only (no card content needed). */
export function cardCountsByTopic(cards: Record<string, CardState>, now: number): Record<string, CardCounts> {
  const out: Record<string, CardCounts> = {};
  const today = dayOf(now);
  for (const s of Object.values(cards)) {
    const id = TOPICS[s[5]]?.id;
    if (!id) continue;
    const c = (out[id] ??= { due: 0, learned: 0, seen: 0 });
    c.seen++;
    if (s[0] <= today) c.due++;
    if (isCardLearned(s)) c.learned++;
  }
  return out;
}

export function newCardsToday(log: Record<string, [number, number]>, now: number): number {
  return log[String(dayOf(now))]?.[0] ?? 0;
}

/**
 * Build a review list from a set of cards: due reviews first (most overdue
 * first), then new cards up to the daily allowance.
 */
export function buildCardQueue(
  cardIds: string[],
  states: Record<string, CardState>,
  now: number,
  newAllowance: number,
): { due: string[]; fresh: string[] } {
  const today = dayOf(now);
  const due = cardIds
    .filter((id) => states[id] && states[id][0] <= today)
    .sort((a, b) => states[a][0] - states[b][0]);
  const fresh = cardIds.filter((id) => !states[id]).slice(0, Math.max(0, newAllowance));
  return { due, fresh };
}
