/*
 * Quiz grading, using the PNLE passing rule: a general average of at least
 * 75%, with no paper below 60%.
 */

import { EXAM_PAPERS, type PaperId } from "@/content/taxonomy";
import type { ChoiceId, Question } from "./content-types";

export const PASSING = 75;
export const FLOOR = 60;

/** All-or-nothing, like the board: select-all items need the exact set. */
export function isCorrect(q: Question, chosen: ChoiceId[]): boolean {
  if (chosen.length !== q.answer.length) return false;
  const want = new Set(q.answer);
  return chosen.every((c) => want.has(c));
}

export type Band = "passing" | "below-passing" | "below-floor";

export function bandFor(percent: number): Band {
  if (percent >= PASSING) return "passing";
  if (percent >= FLOOR) return "below-passing";
  return "below-floor";
}

export const BAND_LABEL: Record<Band, string> = {
  passing: "At or above 75%",
  "below-passing": "Between 60% and 75%",
  "below-floor": "Below the 60% floor",
};

export function percent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
}

export interface PaperGrade {
  paperId: PaperId;
  correct: number;
  total: number;
  percent: number;
  band: Band;
}

export interface Grade {
  correct: number;
  total: number;
  percent: number;
  band: Band;
  papers: PaperGrade[];
  /**
   * For quizzes that cover several real papers: would this pass by the board's
   * rule (average ≥ 75% and every paper ≥ 60%)? Null for single-paper quizzes.
   */
  boardRule: { average: number; passes: boolean; weakest: PaperGrade | null } | null;
}

export function grade(byPaper: Partial<Record<PaperId, [number, number]>>): Grade {
  let correct = 0;
  let total = 0;
  const papers: PaperGrade[] = [];
  for (const [id, [c, t]] of Object.entries(byPaper) as [PaperId, [number, number]][]) {
    correct += c;
    total += t;
    const p = percent(c, t);
    papers.push({ paperId: id, correct: c, total: t, percent: p, band: bandFor(p) });
  }
  const order = ["np1", "np2", "np3", "np4", "np5", "int"];
  papers.sort((a, b) => order.indexOf(a.paperId) - order.indexOf(b.paperId));
  const pct = percent(correct, total);

  const exam = papers.filter((p) => EXAM_PAPERS.some((e) => e.id === p.paperId));
  let boardRule: Grade["boardRule"] = null;
  if (exam.length >= 2) {
    const average = Math.round((exam.reduce((s, p) => s + p.percent, 0) / exam.length) * 10) / 10;
    const weakest = exam.reduce((w, p) => (p.percent < w.percent ? p : w), exam[0]);
    boardRule = { average, passes: average >= PASSING && exam.every((p) => p.percent >= FLOOR), weakest };
  }
  return { correct, total, percent: pct, band: bandFor(pct), papers, boardRule };
}
