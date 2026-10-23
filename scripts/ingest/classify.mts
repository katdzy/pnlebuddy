/*
 * Keyword classifier: picks the best topic for a question or flashcard.
 *
 * Each keyword in the taxonomy scores by how specific it is (phrases count
 * more than single words). Hint text, such as a textbook chapter title,
 * a Saunders "Content Area" line or an Anki deck path, counts five times as
 * much as the question text itself.
 */
import { TOPICS, type Topic } from "../../src/content/taxonomy.ts";

interface Compiled {
  topic: Topic;
  patterns: { re: RegExp; weight: number }[];
}

function weightOf(kw: string): number {
  const words = kw.trim().split(/\s+/).length;
  if (words >= 3) return 3;
  if (words === 2) return 2;
  return kw.length <= 3 ? 0.6 : 1;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compiled: Compiled[] = TOPICS.map((topic) => ({
  topic,
  patterns: topic.keywords.map((kw) => ({
    re: new RegExp(`(?<![a-z0-9])${escape(kw.toLowerCase())}(?![a-z0-9])`, "g"),
    weight: weightOf(kw),
  })),
}));

function count(re: RegExp, text: string): number {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text) && n < 3) n++;
  return n;
}

export interface Classification {
  topicId: string;
  score: number;
  runnerUp?: string;
}

export interface ClassifyInput {
  /** Chapter title, Saunders content area or Anki sub-deck. Counts 5x. */
  hint?: string;
  /** Situation and stem, or a flashcard's front. Counts 2x. */
  strong?: string;
  /** Options, or a flashcard's back. Counts 1x. */
  normal?: string;
  /** Rationale. Counts 0.5x: it often mentions related topics in passing. */
  weak?: string;
}

export function classify(
  input: ClassifyInput,
  opts: { papers?: string[]; minScore?: number } = {},
): Classification | null {
  const h = (input.hint ?? "").toLowerCase();
  const strong = (input.strong ?? "").toLowerCase();
  const normal = (input.normal ?? "").toLowerCase();
  const weak = (input.weak ?? "").toLowerCase();
  const scores: { id: string; score: number }[] = [];
  for (const c of compiled) {
    if (opts.papers && !opts.papers.includes(c.topic.paperId)) continue;
    let s = 0;
    for (const p of c.patterns) {
      if (h) s += 5 * p.weight * count(p.re, h);
      if (strong) s += 2 * p.weight * count(p.re, strong);
      if (normal) s += p.weight * count(p.re, normal);
      if (weak) s += 0.5 * p.weight * count(p.re, weak);
    }
    if (s > 0) scores.push({ id: c.topic.id, score: s });
  }
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  if (!best || best.score < (opts.minScore ?? 1.5)) return null;
  return { topicId: best.id, score: best.score, runnerUp: scores[1]?.id };
}
