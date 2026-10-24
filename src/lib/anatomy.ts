/*
 * The 3D anatomy page's pure logic: which systems a topic opens, the page state kept in the URL, search over the
 * structures and her book's glossary, the identify quiz, and "Practice this". Tested in __tests__/anatomy.test.ts.
 */

import { dayOf, rateCard } from "./cards";
import type { Question } from "./content-types";
import { shuffle } from "./scheduler";
import type { CardState } from "./types";

/** One entry of public/anatomy/structures.json (written by scripts/anatomy/convert.mts). */
export interface Structure {
  fma: string;
  name: string;
  system: string;
  side?: "left" | "right";
  center: [number, number, number];
  radius: number;
  vein?: true;
  /** Her book's glossary term, and how it was matched: the name itself, a broader term, or the larger structure. */
  term?: string;
  how?: "exact" | "general" | "part";
}

/** One entry of public/content/anatomy-terms.json (her A&P book's glossary, written by `npm run ingest`). */
export interface GlossaryTerm {
  term: string;
  aka: string[];
  origin?: string;
  definition: string;
  /** PDF pages; the printed page is 22 less. */
  pages: number[];
  chapter?: number;
  topicId?: string;
}

/** Mack Co A&P 1e: PDF page = printed page + 22 (MACK_PAGE_OFFSET in scripts/ingest/parsers/mack.mts). */
export const BOOK_PAGE_OFFSET = 22;

export const printedPages = (pages: number[]) => pages.map((p) => p - BOOK_PAGE_OFFSET).filter((p) => p > 0);

/** The 3D systems each A&P topic opens. Topics without a 3D system (cells, skin) aren't here. */
export const TOPIC_SYSTEMS: Record<string, string[]> = {
  "int-ap-skeletal": ["skeletal"],
  "int-ap-muscular": ["muscular"],
  "int-ap-nervous": ["nervous"],
  "int-ap-endocrine": ["endocrine", "skeletal"],
  "int-ap-cardiovascular": ["heart", "vessels"],
  "int-ap-lymphatic": ["lymphatic", "skeletal"],
  "int-ap-respiratory": ["respiratory", "skeletal"],
  "int-ap-digestive": ["digestive"],
  "int-ap-urinary": ["urinary", "skeletal"],
  "int-ap-reproductive": ["reproductive", "skeletal"],
};

/* ── Page state in the URL: ?s=skeletal,heart&x=muscular&f=FMA24475 (or &t=<term>) ─────────────────────────── */

export interface AnatomyUrlState {
  /** Systems shown solid, and shown see-through (x-ray). */
  shown?: string[];
  xray?: string[];
  /** The selected structure, or a glossary term that isn't in the model. */
  fma?: string;
  term?: string;
  /** Open the identify quiz on this system, or on her notebook's misses ("notebook"). */
  quiz?: string;
}

export function parseAnatomyUrl(search: string): AnatomyUrlState {
  const q = new URLSearchParams(search);
  const list = (k: string) => q.get(k)?.split(",").filter(Boolean);
  const out: AnatomyUrlState = {};
  const shown = list("s");
  const xray = list("x");
  if (shown) out.shown = shown;
  if (xray) out.xray = xray;
  const f = q.get("f");
  const t = q.get("t");
  if (f && /^FMA\d+$/.test(f)) out.fma = f;
  else if (t) out.term = t;
  const quiz = q.get("quiz");
  if (quiz && /^[a-z]+$/.test(quiz)) out.quiz = quiz;
  return out;
}

export function anatomyQuery(state: AnatomyUrlState): string {
  const q = new URLSearchParams();
  if (state.shown?.length) q.set("s", state.shown.join(","));
  if (state.xray?.length) q.set("x", state.xray.join(","));
  if (state.fma) q.set("f", state.fma);
  else if (state.term) q.set("t", state.term);
  if (state.quiz) q.set("quiz", state.quiz);
  // Keep the commas readable: "?s=skeletal,heart".
  return q.toString().replace(/%2C/g, ",");
}

/** "Open in 3D" from an A&P topic. */
export function anatomyHref(topicId: string): string | null {
  const shown = TOPIC_SYSTEMS[topicId];
  return shown ? `/anatomy?${anatomyQuery({ shown })}` : null;
}

/* ── Search ───────────────────────────────────────────────────────────────────────────────────────────────── */

const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** 3 = the name starts with the query, 2 = a word does, 1 = it's somewhere inside; 0 = no match. */
function score(name: string, q: string): number {
  const n = fold(name);
  if (!q || !n.includes(q)) return 0;
  if (n.startsWith(q)) return 3;
  return ` ${n}`.includes(` ${q}`) ? 2 : 1;
}

export interface SearchResults {
  structures: Structure[];
  /** Glossary terms with no structure in the model ("SA node", "nephron"): shown as book-only results. */
  bookOnly: GlossaryTerm[];
}

export function searchAnatomy(query: string, structures: Structure[], terms: GlossaryTerm[], limit = 8): SearchResults {
  const q = fold(query);
  if (q.length < 2) return { structures: [], bookOnly: [] };
  const hits = structures
    .map((s) => ({ s, score: Math.max(score(s.name, q), s.term ? score(s.term, q) - 0.5 : 0) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.s.name.length - b.s.name.length || a.s.name.localeCompare(b.s.name));
  const linked = new Set(structures.filter((s) => s.how === "exact").map((s) => s.term));
  const bookOnly = terms
    .map((t) => ({ t, score: Math.max(score(t.term, q), ...t.aka.map((a) => score(a, q))) }))
    .filter((h) => h.score > 0 && !linked.has(h.t.term))
    .sort((a, b) => b.score - a.score || a.t.term.length - b.t.term.length)
    .slice(0, 4)
    .map((h) => h.t);
  return { structures: hits.slice(0, limit).map((h) => h.s), bookOnly };
}

/* ── Identify quiz: a structure lights up and she names it from four ─────────────────────────────────────────── */

/** Branches, tributaries and segmental vessels are finer than she needs to name; everything else her book covers is fair. */
const TOO_FINE = /\b(branch(es)?|tributar(y|ies)|segmental|set of)\b/i;

/** What the quiz asks about: structures linked to her book's glossary, leaving out numbered branches. */
export function isQuizzable(s: Structure): boolean {
  return Boolean(s.term) && !TOO_FINE.test(s.name);
}

/** The name without its side. "Left femur" and "Right femur" count as one structure when choosing what to ask. */
export function baseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(left|right)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface IdentifyRound {
  fmas: string[];
  /** How the round is made up, to say so before it starts. */
  due: number;
  fresh: number;
  /** Not due yet, asked early so a round is never empty. */
  early: number;
}

/**
 * A round: structures due again first (most overdue first), then new ones, biggest first (the femur before a finger
 * bone), then, so there's always a round, the ones due soonest. One side of a pair per round.
 */
export function buildIdentifyRound(pool: Structure[], states: Record<string, CardState>, now: number, count = 10): IdentifyRound {
  const today = dayOf(now);
  const round: IdentifyRound = { fmas: [], due: 0, fresh: 0, early: 0 };
  const bases = new Set<string>();
  const take = (list: Structure[], kind: "due" | "fresh" | "early") => {
    for (const s of list) {
      if (round.fmas.length >= count) return;
      const b = baseName(s.name);
      if (bases.has(b)) continue;
      bases.add(b);
      round.fmas.push(s.fma);
      round[kind]++;
    }
  };
  const seen = pool.filter((s) => states[s.fma]);
  const dueDay = (s: Structure) => states[s.fma][0];
  take(seen.filter((s) => dueDay(s) <= today).sort((a, b) => dueDay(a) - dueDay(b)), "due");
  take(pool.filter((s) => !states[s.fma]).sort((a, b) => b.radius - a.radius), "fresh");
  take(seen.filter((s) => dueDay(s) > today).sort((a, b) => dueDay(a) - dueDay(b)), "early");
  return round;
}

/**
 * The four names to choose from: the structure's own, and three others picked at random from the eight most alike
 * in its body system (close by and of a similar size), so they're plausible rather than giveaways: the tibia for the
 * femur, not the finger bones that hang beside it. Never the same structure on the other side. Shuffled by `seed`.
 */
export function identifyChoices(target: Structure, candidates: Structure[], seed: number): Structure[] {
  const [x, y, z] = target.center;
  const far = (s: Structure) =>
    (s.system === target.system ? 0 : 1e6) +
    Math.hypot(s.center[0] - x, s.center[1] - y, s.center[2] - z) / Math.max(target.radius, 0.02) +
    3 * Math.abs(Math.log(s.radius / target.radius));
  const bases = new Set([baseName(target.name)]);
  const nearby: Structure[] = [];
  for (const s of [...candidates].sort((a, b) => far(a) - far(b))) {
    // Other systems only fill in for a small one (the glands, the urinary tract).
    if (s.system !== target.system && nearby.length >= 3) break;
    const b = baseName(s.name);
    if (bases.has(b)) continue;
    bases.add(b);
    nearby.push(s);
    if (nearby.length === 8) break;
  }
  return shuffle([target, ...shuffle(nearby, seed).slice(0, 3)], seed + 1);
}

/**
 * Her answer as a review. A miss is "Again" (back tomorrow). A right answer is "Good", but only moves a structure
 * that was new or due: naming one early shouldn't send it months away.
 */
export function rateIdentify(prev: CardState | undefined, topicId: string, correct: boolean, now: number): CardState {
  if (correct && prev && prev[0] > dayOf(now)) return prev;
  return rateCard(prev, topicId, correct ? 3 : 1, now);
}

/** Her book's entry for a structure as plain text for the notebook, saying how it relates, as the card does. */
export function bookNote(s: Structure, entry: GlossaryTerm): string {
  const pages = printedPages(entry.pages);
  const lead = { exact: "", general: "Broader term, ", part: "Part of the " }[s.how ?? "exact"];
  const where = pages.length ? ` (book ${pages.length > 1 ? "pp." : "p."} ${pages.slice(0, 6).join(", ")})` : "";
  return `${lead}${entry.term}: ${entry.definition.replace(/\n\n/g, " ")}${where}`;
}

/** How many structures in a pool are due again today. */
export function dueCount(pool: Structure[], states: Record<string, CardState>, now: number): number {
  const today = dayOf(now);
  return pool.filter((s) => states[s.fma] && states[s.fma][0] <= today).length;
}

/* ── "Practice this": questions that mention a structure's book term ───────────────────────────────────────── */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Singular and plural of the last word: "vertebrae" also finds "vertebra", "sulci" "sulcus", "femur" "femurs". */
function forms(phrase: string): string[] {
  const out = [phrase];
  if (phrase.endsWith("ae")) out.push(phrase.slice(0, -1));
  else if (phrase.endsWith("i")) out.push(`${phrase.slice(0, -1)}us`);
  else if (phrase.endsWith("es")) out.push(phrase.slice(0, -2));
  else if (phrase.endsWith("s")) out.push(phrase.slice(0, -1));
  return out;
}

/**
 * The book term and its akas without brackets ("sinoatrial node"), and with a bracketed abbreviation in place of the
 * word before it ("SA node") or on its own at the end ("ANP"). Very short ones are left out: too many false hits.
 */
export function termPhrases(entry: { term: string; aka: string[] }): string[] {
  const out = new Set<string>();
  const add = (p: string) => {
    p = p.replace(/\s+/g, " ").trim().toLowerCase();
    if (p.length >= 3) out.add(p);
  };
  for (const name of [entry.term, ...entry.aka]) {
    const plain = name.replace(/\s*[([][^)\]]*[)\]]/g, "");
    if (plain.trim().length >= 4) add(plain);
    const abbr = /^(.*?)\S+ \(([A-Z]{2,})\)(.*)$/.exec(name);
    if (abbr) add(abbr[3].trim() ? `${abbr[1]}${abbr[2]}${abbr[3]}` : abbr[2]);
  }
  return [...out];
}

export interface Mentions {
  /** Question ids, her A&P book's first, then board questions; within each, unanswered or longest ago first. */
  ids: string[];
  fromBook: number;
}

/** Questions whose situation, stem or choices mention any of the phrases (whole words, either number). */
export function questionsMentioning(phrases: string[], questions: Question[], lastAnswered: (id: string) => number): Mentions {
  if (!phrases.length) return { ids: [], fromBook: 0 };
  const re = new RegExp(`\\b(${phrases.flatMap(forms).map(escape).join("|")})(s|es)?\\b`, "i");
  const hits = questions.filter((q) => re.test([q.situation ?? "", q.stem, ...q.choices.map((c) => c.text)].join("\n")));
  const isBook = (q: Question) => q.topicId.startsWith("int-ap-");
  hits.sort((a, b) => Number(isBook(b)) - Number(isBook(a)) || lastAnswered(a.id) - lastAnswered(b.id));
  return { ids: hits.map((q) => q.id), fromBook: hits.filter(isBook).length };
}
