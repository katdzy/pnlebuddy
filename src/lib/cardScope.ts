"use client";

/*
 * Which flashcards the review screen should show. Set just before navigating
 * to /flashcards. Kept in memory and sessionStorage only: if it's lost, the
 * review screen falls back to "everything due".
 */

import type { PaperId } from "@/content/taxonomy";

export interface CardScope {
  title: string;
  papers: PaperId[];
  /** Empty = all topics in those papers. */
  topicIds: string[];
  /** Include new cards (up to the daily allowance). */
  includeNew: boolean;
  /** Only these card ids (e.g. cards from the notebook). */
  cardIds?: string[];
}

const KEY = "pnlebuddy:card-scope";
let current: CardScope | null = null;

export function setCardScope(scope: CardScope) {
  current = scope;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(scope));
  } catch {
    /* private mode; memory copy is enough */
  }
}

export function getCardScope(): CardScope | null {
  if (current) return current;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) current = JSON.parse(raw) as CardScope;
  } catch {
    /* ignore */
  }
  return current;
}
