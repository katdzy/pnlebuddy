/*
 * Mack Co, Anatomy & Physiology (1st ed., Cengage 2023): Learning Check and
 * Chapter Review questions, keyed from the book's own answer appendix
 * ("Answers to Learning Checks and Chapter Review Questions").
 *
 * Reads `pdftohtml -xml` output, because the pages are laid out in two or three
 * columns that plain text interleaves. Each page is split at its column gutters
 * and read column by column.
 *
 * Questions are matched to keys by chapter section + question number:
 *   Learning Check in section 3.1c, question 2   ↔  "Learning Check Questions, Section 3.1c: 2. b"
 *   "2.6 Questions" at the end of chapter 2, q 3 ↔  "Chapter Review Questions, Section 2.6: 3. b, c"
 * Mini-case questions and anything that needs a figure are skipped.
 */
import { anaphyTopicForChapter } from "../../../src/content/taxonomy.ts";
import type { ChoiceId } from "../../../src/lib/content-types.ts";
import { CHOICES, clean, type RawQuestion } from "../util.mts";

export interface BookQuestion extends RawQuestion {
  topicId: string;
  section: string;
  /** kind|section|nth: which Learning Check or Review block this came from. */
  block: string;
}

interface Seg {
  top: number;
  left: number;
  width: number;
  text: string;
}

/** PDF page = printed page + 22 in this edition. */
export const MACK_PAGE_OFFSET = 22;

const FOOTER = /Copyright 2023 Cengage|Editorial review has deemed|third party content may be suppressed/;

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** One page of pdftohtml XML → lines, read column by column. */
export function pageLines(pageXml: string, width: number, height = 1174, marks = false): string[] {
  const segs: Seg[] = [];
  for (const t of pageXml.matchAll(/<text top="(\d+)" left="(\d+)" width="(\d+)" height="\d+" font="\d+">([\s\S]*?)<\/text>/g)) {
    // ⟦B⟧ marks a bold run (glossary terms), only when asked for.
    const text = decode(marks ? t[4].replace(/<b>/g, "⟦B⟧").replace(/<\/b>/g, "⟦/B⟧") : t[4]);
    if (!text.trim() || FOOTER.test(text)) continue;
    segs.push({ top: Number(t[1]), left: Number(t[2]), width: Number(t[3]), text });
  }
  // Running headers and footers sit in a band at the top and bottom and often span a gutter.
  const inBand = (s: Seg) => s.top < 75 || s.top > height - 70;
  // Find gutters: x positions no body segment covers (ignore wide headings).
  const cover = new Uint16Array(width + 1);
  for (const s of segs) {
    if (inBand(s) || s.width > width * 0.55) continue;
    for (let x = Math.max(0, s.left); x <= Math.min(width, s.left + s.width); x++) cover[x]++;
  }
  // A gutter may be crossed by a stray heading or intro line or two; real text columns are covered by dozens.
  const body = segs.filter((s) => !inBand(s)).length;
  const allowed = body >= 20 ? 2 : 0;
  const cuts: number[] = [];
  let runStart = -1;
  for (let x = Math.floor(width * 0.2); x <= Math.floor(width * 0.8); x++) {
    if (cover[x] <= allowed) {
      if (runStart < 0) runStart = x;
    } else if (runStart >= 0) {
      if (x - runStart >= 6) cuts.push(Math.round((runStart + x) / 2));
      runStart = -1;
    }
  }
  const colOf = (s: Seg) => (inBand(s) ? -1 : cuts.filter((c) => s.left >= c).length);
  const cols = new Map<number, Seg[]>();
  for (const s of segs) (cols.get(colOf(s)) ?? cols.set(colOf(s), []).get(colOf(s))!).push(s);

  const lines: string[] = [];
  for (const c of [...cols.keys()].sort((a, b) => a - b)) {
    const list = cols.get(c)!.sort((a, b) => a.top - b.top || a.left - b.left);
    let cur: Seg[] = [];
    const flush = () => {
      if (cur.length) lines.push(cur.sort((a, b) => a.left - b.left).map((s) => s.text).join(" ").replace(/\s+/g, " ").trim());
      cur = [];
    };
    for (const s of list) {
      if (cur.length && Math.abs(cur[0].top - s.top) > 4) flush();
      cur.push(s);
    }
    flush();
  }
  return lines;
}

export function bookPages(xml: string, marks = false): { pdfPage: number; lines: string[] }[] {
  const out: { pdfPage: number; lines: string[] }[] = [];
  for (const m of xml.matchAll(/<page number="(\d+)"[^>]*?height="(\d+)" width="(\d+)"[\s\S]*?<\/page>/g)) {
    out.push({ pdfPage: Number(m[1]), lines: pageLines(m[0], Number(m[3]), Number(m[2]), marks) });
  }
  return out;
}

/* ── Answer key ──────────────────────────────────────────────────────── */

type Key = Map<string, ChoiceId[]>;
const keyId = (kind: "lc" | "cr", section: string, nth: number, q: number) => `${kind}|${section}|${nth}|${q}`;

export function parseKey(lines: string[]): Key {
  const key: Key = new Map();
  const conflicts = new Set<string>();
  let kind: "lc" | "cr" | null = null;
  let section = "";
  let nth = 1;
  let skip = true;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const head = /^(Learning Check(?: #(\d))? Questions|Chapter Review Questions),?\s*(.*)$/.exec(l);
    if (head) {
      kind = head[1].startsWith("Learning") ? "lc" : "cr";
      nth = head[2] ? Number(head[2]) : 1;
      // The section label may be on this line or the next ones ("Section 2.4 (Mini Case 1: Flow Rate):").
      let label = head[3];
      let j = i;
      while (!/:\s*$/.test(label) && j + 1 < lines.length && j - i < 3) label += " " + lines[++j];
      i = j;
      const sm = /Section\s+(\d+\.\d+[a-z]?)/.exec(label);
      section = sm ? sm[1] : "";
      skip = /mini case/i.test(label) || !section;
      continue;
    }
    // Any other block (Case Study Questions, Self-Quizzes, a new chapter) ends the current one.
    if (/Questions\b|^Chapter \d|Self-Quiz|^Answers to/i.test(l)) {
      kind = null;
      skip = true;
      continue;
    }
    const am = /^(\d{1,2})\.\s+([a-e](?:\s*,\s*[a-e])*)\s*$/.exec(l);
    if (am && kind && !skip) {
      const ids = am[2].split(/\s*,\s*/).map((x) => x.toUpperCase() as ChoiceId);
      const id = keyId(kind, section, nth, Number(am[1]));
      if (key.has(id)) conflicts.add(id);
      key.set(id, ids);
    }
  }
  // Never guess: a key printed twice for the same question is dropped.
  for (const id of conflicts) key.delete(id);
  return key;
}

/* ── Questions ───────────────────────────────────────────────────────── */

const SECTION_HEAD = /^(\d{1,2})\.(\d{1,2})([a-z])?\s+[A-Z][A-Za-z]/;
const Q = /^(\d{1,2})\.\s+(\S.*)$/;

/** "a. Radius b. Ulna" or a grid row "a. Radius c. Femur" → [["a","Radius"], ["b","Ulna"]]; null if the line has no option. */
function optionParts(line: string): [string, string][] | null {
  if (!/^[a-e]\.\s/.test(line)) return null;
  return line.split(/\s+(?=[a-e]\.\s)/).map((p) => [p[0], p.slice(2).trim()] as [string, string]);
}

export interface GlossaryTerm {
  term: string;
  /** "aka" names and plural forms the book gives. */
  aka: string[];
  /** Word origin as printed, e.g. "Latin: corpus - body; luteus - yellow". */
  origin?: string;
  definition: string;
  /** PDF pages the book's index lists for this term (printed + 22). */
  pages: number[];
  chapter?: number;
  topicId?: string;
}

export interface MackBook {
  questions: BookQuestion[];
  glossary: GlossaryTerm[];
  /** PDF page range of each chapter (running headers), for the reading index. */
  chapters: { chapter: number; from: number; to: number }[];
}

/** PDF page = printed page + 22 in this edition. */

export function readMack(xml: string): MackBook {
  const pages = bookPages(xml);
  const questions = parseMack(pages);
  const end = appendixIndex(pages);
  const starts = new Map<number, number>();
  for (const p of pages.slice(0, end < 0 ? pages.length : end)) {
    for (const l of p.lines.slice(0, 4)) {
      const m = /Chapter (\d{1,2})\s*\d{1,4}\s*$/.exec(l);
      if (m && !starts.has(Number(m[1]))) starts.set(Number(m[1]), p.pdfPage);
    }
  }
  const sorted = [...starts].sort((a, b) => a[0] - b[0]);
  const lastPage = end < 0 ? pages[pages.length - 1].pdfPage : pages[end].pdfPage - 1;
  const chapters = sorted.map(([chapter, from], i) => ({ chapter, from, to: (sorted[i + 1]?.[1] ?? lastPage + 1) - 1 }));
  const glossary = parseGlossary(xml, pages, chapters);
  return { questions, chapters, glossary };
}

/* ── Glossary + index ────────────────────────────────────────────────── */

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/[^a-z0-9' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Index: "Aorta" → PDF pages, including its sub-entries ("abdominal, 832, 833f"). */
function parseIndex(lines: string[]): Map<string, number[]> {
  const index = new Map<string, number[]>();
  let main = "";
  const pagesIn = (s: string) => {
    const out: number[] = [];
    for (const m of s.matchAll(/(\d{1,4})\s*[ftb]?\s*(?:[–-]\s*(\d{1,4})\s*[ftb]?)?/g)) {
      const a = Number(m[1]);
      const b = m[2] ? Number(m[2]) : a;
      for (let p = a; p <= Math.min(b, a + 15); p++) out.push(p + MACK_PAGE_OFFSET);
    }
    return out;
  };
  for (const raw of lines) {
    const l = raw.replace(/⟦B⟧/g, "").trim();
    if (!l || /^I-\d+|Index$|^[A-Z]$/.test(l)) continue;
    const m = /^(.*?)(?:,\s*|\s+)((?:\d{1,4}\s*[ftb]?\s*(?:[–-]\s*\d{1,4}\s*[ftb]?\s*)?,?\s*)+)$/.exec(l);
    const label = (m ? m[1] : l).replace(/,\s*$/, "").trim();
    const ps = m ? pagesIn(m[2]) : [];
    if (/^\d/.test(l)) {
      // A wrapped line of page numbers belongs to the entry above.
      if (main) index.get(main)!.push(...pagesIn(l));
      continue;
    }
    if (/^[A-Z]/.test(label) && !/^See /.test(label)) {
      main = norm(label);
      index.set(main, [...(index.get(main) ?? []), ...ps]);
    } else if (main && !/^See /.test(label)) {
      index.get(main)!.push(...ps);
    }
  }
  return index;
}

function parseGlossary(xml: string, plain: { pdfPage: number; lines: string[] }[], chapters: { chapter: number; from: number; to: number }[]): GlossaryTerm[] {
  const gStart = plain.findIndex((p) => p.lines[0] === "Glossary" || /^G-\d+ Glossary$|^Glossary G-\d+$/.test(p.lines[0] ?? ""));
  const iStart = plain.findIndex((p, i) => i > gStart && /^I-\d+ Index$|^Index I-\d+$|^Index$/.test(p.lines[0] ?? ""));
  if (gStart < 0 || iStart < 0) return [];
  const index = parseIndex(plain.slice(iStart).flatMap((p) => p.lines));
  const marked = bookPages(xml, true).slice(gStart, iStart).flatMap((p) => p.lines);

  // An entry starts with a bold term; a term can wrap onto the next line (still bold).
  const raw: { term: string; body: string }[] = [];
  for (const l of marked) {
    const plainLine = l.replace(/⟦\/?B⟧/g, "").trim();
    if (/^(Glossary|G-\d+|[A-Z])(\s+(G-\d+|Glossary))?$/.test(plainLine) || !plainLine) continue;
    const bold = /^⟦B⟧(.*?)⟦\/B⟧\s*(.*)$/.exec(l.trim());
    const last = raw[raw.length - 1];
    if (bold && last && !last.body.trim()) {
      last.term += " " + bold[1];
      last.body = bold[2];
    } else if (bold) raw.push({ term: bold[1], body: bold[2] });
    else if (last) last.body += " " + l;
  }

  const chapterOf = (pdfPage: number) => chapters.find((c) => pdfPage >= c.from && pdfPage <= c.to)?.chapter;
  const byTerm = new Map<string, GlossaryTerm>();
  for (const entry of raw) {
    const tidy = (x: string) => x.replace(/⟦\/?B⟧/g, "").replace(/(\w)- (\w)/g, "$1$2").replace(/\s+/g, " ").trim();
    const term = tidy(entry.term).replace(/[,;:]$/, "");
    let rest = tidy(entry.body);
    // Leading (aka …) / (pl: …) / (sing: …) / (Latin: …; Greek: …) groups, then the definition.
    const groups: string[] = [];
    for (let m = /^\(([^()]*)\)\s*/.exec(rest); m; m = /^\(([^()]*)\)\s*/.exec(rest)) {
      groups.push(m[1].trim());
      rest = rest.slice(m[0].length);
    }
    const NAME = /^(aka|pl|sing)\s*:?\s*/i;
    const aka = groups.filter((g) => NAME.test(g)).flatMap((g) => g.replace(NAME, "").split(/,\s*|;\s*| or /)).map((x) => x.trim()).filter(Boolean);
    const origin = groups.filter((g) => !NAME.test(g)).join("; ") || undefined;
    let definition = rest;
    if (term.length < 2 || term.length > 60 || definition.length < 15) continue;
    definition = definition.charAt(0).toUpperCase() + definition.slice(1);

    const key = norm(term);
    const pages = [...new Set([key, ...aka.map(norm)].flatMap((k) => index.get(k) ?? index.get(k.replace(/s$/, "")) ?? index.get(k + "s") ?? []))].sort((a, b) => a - b);
    const prev = byTerm.get(key);
    if (prev) {
      // The book sometimes defines a term twice (once per chapter); keep both, once.
      if (!prev.definition.includes(definition)) prev.definition += `\n\n${definition}`;
      continue;
    }
    // Topic = the chapter the index cites most for this term.
    const counts = new Map<number, number>();
    for (const p of pages) {
      const c = chapterOf(p);
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const chapter = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
    byTerm.set(key, { term, aka, ...(origin ? { origin } : {}), definition, pages, chapter, topicId: chapter ? anaphyTopicForChapter(chapter) : undefined });
  }
  return [...byTerm.values()];
}

const appendixIndex = (pages: { lines: string[] }[]) =>
  pages.findIndex((p) => p.lines.some((l) => /Answers to Learning Checks and Chapter Review Questions/.test(l)));

export function parseMack(pages: { pdfPage: number; lines: string[] }[]): BookQuestion[] {
  const appendixStart = appendixIndex(pages);
  const key = parseKey(pages.slice(appendixStart >= 0 ? appendixStart : pages.length).flatMap((p) => p.lines));

  const out: BookQuestion[] = [];
  let chapter = 0;
  let section = "";
  type Block = { kind: "lc" | "cr"; section: string; nth: number };
  let mode = null as Block | null;
  const lcCount = new Map<string, number>();
  const blockOf = (m: Block) => `${m.kind}|${m.section}|${m.nth}`;
  const seen = new Map<string, Set<number>>();
  let cur: { num: number; stem: string[]; opts: string[]; last?: string; page: number; mode: Block } | null = null;

  const close = () => {
    if (!cur) return;
    const ans = key.get(keyId(cur.mode.kind, cur.mode.section, cur.mode.nth, cur.num));
    const topicId = anaphyTopicForChapter(Number(cur.mode.section.split(".")[0]));
    const stem = clean(cur.stem.join("\n"));
    const complete = cur.opts.length >= 2 && [...cur.opts].every((o) => typeof o === "string");
    if (ans && topicId && complete) {
      const multi = ans.length > 1 || /select all that apply/i.test(stem);
      out.push({
        style: "nclex",
        stem: stem.replace(/\s*Please select all th(?:at|e) apply\.?/i, " Select all that apply.").trim(),
        choices: cur.opts.map((o) => clean(o)),
        answer: ans,
        rationale: "",
        topicId,
        section: cur.mode.section,
        block: blockOf(cur.mode),
        page: cur.page,
        where: `§${cur.mode.section} ${cur.mode.kind === "lc" ? "Learning Check" : "Questions"}, p. ${cur.page - MACK_PAGE_OFFSET}`,
        hint: multi ? "multi" : undefined,
      });
    }
    cur = null;
  };

  for (const { pdfPage, lines } of pages.slice(0, appendixStart >= 0 ? appendixStart : pages.length)) {
    for (const raw of lines) {
      const line = raw.replace(/⟦KEY⟧/g, "").trim();
      if (!line) continue;
      const header = /Chapter (\d{1,2})\s*\d{1,4}\s*$|^\d{1,4}\s*Chapter (\d{1,2})\b/.exec(line);
      if (header) {
        chapter = Number(header[1] ?? header[2]);
        continue;
      }
      // Even-page running header ("872 Unit 4 Fluids and Transport") or its odd-page twin.
      if (/^\d{1,4}\s+Unit \d\b|\bUnit \d [A-Z][\w ,&]+\s\d{1,4}$/.test(line)) continue;
      if (/^Chapter Review$|^Chapter Review Questions?$/.test(line)) {
        close();
        mode = null;
        continue;
      }
      const reviewHead = /^(\d{1,2}\.\d{1,2}) Questions$/.exec(line);
      if (reviewHead) {
        close();
        mode = { kind: "cr", section: reviewHead[1], nth: 1 };
        continue;
      }
      if (/^Learning Check(\s*#\d)?$/.test(line)) {
        close();
        const n = (lcCount.get(section) ?? 0) + 1;
        lcCount.set(section, n);
        mode = section ? { kind: "lc", section, nth: Number(/#(\d)/.exec(line)?.[1] ?? n) } : null;
        continue;
      }
      if (/^Mini Case|^\d{1,2}\.\d{1,2} Summary|^Figure \d|^Table \d/.test(line)) {
        close();
        if (!/^Figure|^Table/.test(line)) mode = null;
        continue;
      }
      const sh = SECTION_HEAD.exec(line);
      if (sh && !Q.test(line.replace(/^\d+\.\d+/, ""))) {
        const label = `${sh[1]}.${sh[2]}${sh[3] ?? ""}`;
        if (Number(sh[1]) === chapter || !chapter) {
          close();
          section = label;
          if (mode?.kind === "lc") mode = null;
          continue;
        }
      }
      if (!mode) continue;
      const qm = Q.exec(line);
      if (qm && (!cur || cur.opts.length >= 2 || Number(qm[1]) === cur.num + 1)) {
        close();
        cur = { num: Number(qm[1]), stem: [qm[2]], opts: [], page: pdfPage, mode };
        (seen.get(blockOf(mode)) ?? seen.set(blockOf(mode), new Set()).get(blockOf(mode))!).add(cur.num);
        continue;
      }
      if (!cur) continue;
      const parts = optionParts(line);
      let used = false;
      if (parts) {
        for (const [letter, text] of parts) cur.opts["abcde".indexOf(letter)] = text;
        cur.last = parts[parts.length - 1][0];
        used = true;
      } else if (cur.last) {
        const i = "abcde".indexOf(cur.last);
        cur.opts[i] += " " + line;
        used = true;
      }
      if (!used) cur.stem.push(line);
    }
  }
  close();
  // A block is trusted only if the questions we read are numbered exactly like its key (1..n, same n).
  // Otherwise a missed heading may have paired it with a neighbouring section's answers.
  const keySize = new Map<string, number>();
  for (const k of key.keys()) {
    const b = k.split("|").slice(0, 3).join("|");
    keySize.set(b, (keySize.get(b) ?? 0) + 1);
  }
  const trusted = (b: string) => {
    const nums = seen.get(b);
    const n = keySize.get(b);
    return !!nums && !!n && nums.size === n && Math.max(...nums) === n;
  };
  // Drop anything that leans on a figure or table, and sanity-check the key.
  return out.filter(
    (q) =>
      trusted(q.block) &&
      !/\bfigure\b|\btable \d|\blabel(ed)?\b|\bimage\b|shown (above|below)/i.test(q.stem) &&
      q.answer.every((a) => CHOICES.indexOf(a) < q.choices.length),
  );
}
