/*
 * The 3D anatomy page's pure logic: which systems a topic opens, the page state kept in the URL, and search over the
 * structures and her book's glossary. Tested in __tests__/anatomy.test.ts.
 */

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
  return out;
}

export function anatomyQuery(state: AnatomyUrlState): string {
  const q = new URLSearchParams();
  if (state.shown?.length) q.set("s", state.shown.join(","));
  if (state.xray?.length) q.set("x", state.xray.join(","));
  if (state.fma) q.set("f", state.fma);
  else if (state.term) q.set("t", state.term);
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
