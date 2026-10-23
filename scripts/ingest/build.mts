/*
 * Builds PNLE Buddy's study content from her review folder (RN2027).
 *
 *   npm run ingest                       # uses ~/Fel Reviewers/RN2027
 *   RN2027_DIR=/path/to/RN2027 npm run ingest
 *
 * Reads the text that scripts/ingest/extract.sh produced inside RN2027:
 *   _text/**.txt          text of born-digital PDFs (pdftotext)
 *   _text/_layout/**.xml  the same PDFs with fonts, to read bold/green answer keys
 *   _ocr_text/**.txt      OCR text of scanned PDFs
 * plus the Anki decks (*.apkg) anywhere in the folder.
 *
 * Writes:
 *   public/content/manifest.json
 *   public/content/questions-<paper>.json
 *   public/content/cards-<paper>.json
 *   public/content/media/*               (flashcard images)
 *   src/content/generated/reading.json   (where each topic appears in her notes)
 *   content-report.md                    (what was imported and what was skipped)
 *
 * The output contains her paid review materials. Keep this repository private.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ANAPHY_TOPICS, PAPERS, TOPICS, getTopic, type PaperId } from "../../src/content/taxonomy.ts";
import type { ContentManifest, Flashcard, Question } from "../../src/lib/content-types.ts";
import { findDecks, readApkg } from "./anki.mts";
import { classify } from "./classify.mts";
import { layoutToText } from "./layout.mts";
import { parseBrunner } from "./parsers/brunner.mts";
import { MACK_PAGE_OFFSET, readMack, type GlossaryTerm } from "./parsers/mack.mts";
import { parseGoogleForms } from "./parsers/gforms.mts";
import { parsePnle } from "./parsers/pnle.mts";
import { parseSaunders } from "./parsers/saunders.mts";
import { CHOICES, fingerprint, hashId, rejectReason, trimRationale, type RawQuestion } from "./util.mts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = process.env.RN2027_DIR ?? join(homedir(), "Fel Reviewers", "RN2027");
const OUT = join(repo, "public", "content");
const GEN = join(repo, "src", "content", "generated");

if (!existsSync(SRC)) {
  console.error(`Can't find her review folder at ${SRC}. Set RN2027_DIR.`);
  process.exit(1);
}

function walk(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, ext));
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out.sort();
}
/** Her A&P textbook (Mack Co, Cengage 2023). Parsed on its own, never by the board-file parser. */
const MACK = /Mack Co - Anatomy & Physiology/;
const rel = (p: string) => relative(SRC, p).replace(/^_(ocr_)?text\/(_layout\/)?/, "").replace(/\.(txt|xml)$/, ".pdf");

/* ── Source labels ───────────────────────────────────────────────────── */
function labelFor(file: string): string {
  const name = basename(file).replace(/\.(txt|xml|pdf)$/, "");
  if (/Saunders Q & A/i.test(name)) return "Saunders Q&A Review for the NCLEX-RN, 9th ed.";
  if (/Brunner.*Testbank/i.test(name)) return "Brunner & Suddarth Test Bank, 14th ed.";
  if (MACK.test(file)) return "Mack Co, Anatomy & Physiology, 1st ed.";
  if (/ANAPHY_LEC/.test(name)) return `A&P lecture: ${name.replace(/^ANAPHY_LEC[_ ]*(CHAPTER)?\s*/i, "Ch. ").replace(/\.pdf.*$| \(\d\)$|\.$| copy$/g, "").replace(/_/g, " ").replace(/\s+/g, " ")}`;
  const folder = basename(dirname(file)).replace(/^\d+\.\s*/, "");
  if (/TOPRANK/.test(file)) return `Toprank ${folder.toLowerCase()}: ${name}`;
  return `${folder}: ${name}`;
}

/* ── Questions ───────────────────────────────────────────────────────── */
interface Parsed extends RawQuestion {
  file: string;
  label: string;
}
const parsed: Parsed[] = [];
const drops: Record<string, number> = {};
const perSource = new Map<string, { kept: number; dropped: number }>();

function add(file: string, items: RawQuestion[], opts: { minChoices?: number } = {}) {
  const label = labelFor(file);
  const stat = perSource.get(label) ?? { kept: 0, dropped: 0 };
  for (const raw of items) {
    const q = {
      ...raw,
      rationale: trimRationale(raw.rationale),
      situation: raw.situation?.replace(/^\d{1,3}\s*[-–]\s*\d{1,3}\s*/, "") || undefined,
    };
    const r = rejectReason(q, opts);
    if (r) {
      drops[r] = (drops[r] ?? 0) + 1;
      stat.dropped++;
      continue;
    }
    parsed.push({ ...q, file: rel(file), label });
    stat.kept++;
  }
  perSource.set(label, stat);
}

const textFiles = walk(join(SRC, "_text"), ".txt");
for (const f of textFiles) {
  if (/SAUNDERS Q&A\/2024 Saunders Q & A/.test(f)) add(f, parseSaunders(readFileSync(f, "utf8")));
  else if (/Brunner.*Testbank/.test(f)) add(f, parseBrunner(readFileSync(f, "utf8")));
  else if (/CDN 500-items/.test(f)) add(f, parsePnle(readFileSync(f, "utf8")));
}
for (const f of walk(join(SRC, "_ocr_text"), ".txt")) {
  if (/TOPRANK REVIEWERS\/RECALL\//.test(f)) add(f, parseGoogleForms(readFileSync(f, "utf8")));
}
const bookChapters: { chapter: number; from: number; to: number }[] = [];
const glossary: GlossaryTerm[] = [];
let bookFile = "";
for (const f of walk(join(SRC, "_text", "_layout"), ".xml")) {
  if (MACK.test(f)) {
    // Learning Checks and chapter Review Questions, keyed from the book's answer appendix.
    // True/False items are part of the book, so 2 choices are allowed here.
    const book = readMack(readFileSync(f, "utf8"));
    add(f, book.questions, { minChoices: 2 });
    bookChapters.push(...book.chapters);
    glossary.push(...book.glossary);
    bookFile = rel(f);
    continue;
  }
  add(f, parsePnle(layoutToText(readFileSync(f, "utf8"))));
}

// Classify and merge duplicates (the same board question appears in many recall sets).
const merged = new Map<string, { q: Question; files: Set<string>; answers: Map<string, number> }>();
let unclassified = 0;
for (const p of parsed) {
  const c = p.topicId
    ? { topicId: p.topicId }
    : classify(
        { hint: p.hint, strong: [p.situation, p.stem].filter(Boolean).join(" \n "), normal: p.choices.join(" \n "), weak: p.rationale },
        { minScore: 2 },
      );
  if (!c) {
    unclassified++;
    continue;
  }
  const key = fingerprint(p.stem) + "|" + p.choices.map(fingerprint).sort().join("|");
  const answerKey = p.answer.map((a) => fingerprint(p.choices[CHOICES.indexOf(a)])).sort().join("+");
  const existing = merged.get(key);
  if (existing) {
    existing.files.add(p.file);
    existing.answers.set(answerKey, (existing.answers.get(answerKey) ?? 0) + 1);
    if (!existing.q.rationale && p.rationale) existing.q.rationale = p.rationale;
    continue;
  }
  const q: Question = {
    id: hashId("q", fingerprint(p.stem), ...p.choices.map(fingerprint)),
    topicId: c.topicId,
    style: p.style,
    kind: p.answer.length > 1 ? "multi" : "single",
    ...(p.situation ? { situation: p.situation } : {}),
    stem: p.stem,
    choices: p.choices.map((text, i) => ({ id: CHOICES[i], text })),
    answer: p.answer,
    rationale: p.rationale,
    ...(p.tip ? { tip: p.tip } : {}),
    source: {
      kind: "reference",
      label: p.where ? `${p.label}, ${p.where}` : p.page ? `${p.label}, p. ${p.page}` : p.label,
      file: p.file,
      ...(p.page ? { page: p.page } : {}),
      clinicallyReviewed: false,
    },
  };
  merged.set(key, { q, files: new Set([p.file]), answers: new Map([[answerKey, 1]]) });
}

const questions: Question[] = [];
let conflicts = 0;
for (const { q, files, answers } of merged.values()) {
  if (answers.size > 1) {
    // Sources disagree on the key. Keep the majority answer only if it's clear.
    const sorted = [...answers.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] === sorted[1][1]) {
      conflicts++;
      continue;
    }
  }
  if (files.size > 1) q.seenIn = files.size;
  questions.push(q);
}

/* ── Flashcards ──────────────────────────────────────────────────────── */
// Deck names that pin cards to a paper, so the keyword classifier only picks within it.
const DECK_PAPERS: [RegExp, PaperId[], string?][] = [
  [/disaster/i, ["np1"], "np1-disaster"],
  [/community|chn/i, ["np1"], "np1-chn-concepts"],
  [/\bob\b|maternal|maternity|obstetric/i, ["np2"], "np2-pregnancy"],
  [/pedia|child/i, ["np2"], "np2-gd-theories"],
  [/psych/i, ["np5"], "np5-psych-concepts"],
  [/periop/i, ["np3"], "np3-periop"],
  [/oncolog|\bonco\b/i, ["np3"], "np3-oncology"],
  [/communicable/i, ["np3"], "np3-communicable"],
  [/respirat|cardio|hemato|fluid|renal|immun/i, ["np3"]],
  [/endocrin/i, ["np4"], "np4-adrenal-pituitary"],
  [/gastro|\bgi\b/i, ["np4"]],
  [/neuro/i, ["np4"], "np4-neuro"],
  [/ortho|msk|musculo/i, ["np4"], "np4-musculoskeletal"],
  [/special senses|\beyes?\b|\bears?\b/i, ["np4"], "np4-senses"],
  [/integument|skin/i, ["np4"], "np4-integumentary"],
  [/emergency|critical|burn|trauma/i, ["np5"]],
  [/research/i, ["int"], "int-research"],
  [/leadership|management|palm/i, ["int"], "int-leadership"],
  [/pharma/i, ["int"], "int-pharmacology"],
  [/fundamental|funda/i, ["int"], "int-basic-care"],
  [/medical.surgical|med.surg/i, ["np3", "np4", "np5"]],
];


const media = join(OUT, "media");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const cards: Flashcard[] = [];
const cardKeys = new Set<string>();
let cardsDropped = 0;
const cardSources = new Map<string, number>();
for (const deck of findDecks(SRC)) {
  for (const c of readApkg(deck, media)) {
    const key = fingerprint(c.plain);
    if (cardKeys.has(key)) continue;
    // Match the deck path from the most specific level up.
    const levels = c.deck.split(" › ");
    let papers: PaperId[] | undefined;
    let fallback: string | undefined;
    for (let i = levels.length - 1; i >= 0 && !papers; i--) {
      const m = DECK_PAPERS.find(([re]) => re.test(levels[i]));
      if (m) [, papers, fallback] = m;
    }
    // The deck's top level (e.g. "Community Health Nursing") only picks the paper;
    // deeper levels ("COPAR › Phases") are a real topic hint.
    const hint = levels.slice(1).slice(-2).join(" › ").replace(/\b(CHN|FUNDA|FUNDAMENTALS|NEUROLOGY|ENDOCRINOLOGY|ONCOLOGY|GI|OB|PEDIA|PSYCH):\s*/gi, "");
    const input = { hint, strong: c.frontText, normal: c.backText };
    const cls =
      classify(input, { papers, minScore: 1 }) ??
      classify({ ...input, hint: c.deck }, { papers, minScore: 1 }) ??
      (fallback ? { topicId: fallback, score: 0 } : null);
    if (!cls) {
      cardsDropped++;
      continue;
    }
    cardKeys.add(key);
    cards.push({
      id: hashId("c", key),
      topicId: cls.topicId,
      deck: c.deck,
      front: c.front,
      back: c.back,
      source: c.source,
    });
    cardSources.set(c.source, (cardSources.get(c.source) ?? 0) + 1);
  }
}

// The A&P book's glossary as flashcards, in the book's own words. A term goes to the body system whose
// chapter the book's index cites most; terms the index doesn't place are left out rather than guessed.
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let glossaryUnplaced = 0;
for (const g of glossary) {
  if (!g.topicId) {
    glossaryUnplaced++;
    continue;
  }
  const key = fingerprint(`${g.term} ${g.definition}`);
  if (cardKeys.has(key)) continue;
  cardKeys.add(key);
  const printed = g.pages.map((p) => p - MACK_PAGE_OFFSET);
  cards.push({
    id: hashId("c", key),
    topicId: g.topicId,
    deck: `Mack A&P glossary › Chapter ${g.chapter}`,
    front: `<b>${esc(g.term)}</b>${g.aka.length ? `<br><small>aka ${esc(g.aka.join(", "))}</small>` : ""}`,
    back:
      g.definition.split("\n\n").map((d) => `<p>${esc(d)}</p>`).join("") +
      (g.origin ? `<p><small><i>${esc(g.origin)}</i></small></p>` : "") +
      (printed.length ? `<p><small>Book pp. ${printed.slice(0, 4).join(", ")}${printed.length > 4 ? ", …" : ""}</small></p>` : ""),
    source: "Mack Co A&P 1e glossary",
  });
  cardSources.set("Mack Co A&P 1e glossary", (cardSources.get("Mack Co A&P 1e glossary") ?? 0) + 1);
}

/* ── Reading index: where each topic shows up in her notes ────────────── */
const NOTE_FILE = /NURSING 1\/|ROYAL PENTAGON|EPIKUS|CARL BALITA|TRA COMPLETE HANDOUT|INTENSIVE|REFRESHER|WORKBOOK|PALMR\/(SIMPLIFIED NOTES|LAWS|PALMER Notes|palm)|DOH Health Programs|IMCI Handbook|PHARMACOLOGY \/NOTES|CRAM SHEETS\/NP\d|Udan/i;
const reading: Record<string, { file: string; label: string; pages: number[] }[]> = {};
const noteFiles = [...walk(join(SRC, "_text"), ".txt"), ...walk(join(SRC, "_ocr_text"), ".txt")].filter(
  // The A&P textbook and lectures are indexed by chapter below; keyword-matching 1,300 textbook pages would bury her notes.
  (f) => NOTE_FILE.test(f) && !/_layout/.test(f) && !MACK.test(f) && !/ANAPHY_LEC/.test(f),
);
for (const f of noteFiles) {
  const text = readFileSync(f, "utf8");
  const pages = text.includes("===== page ") ? text.split(/\n===== page \d+ =====\n/).slice(1) : text.split("\f");
  const hits = new Map<string, number[]>();
  pages.forEach((page, i) => {
    if (page.trim().length < 200) return;
    const c = classify({ normal: page }, { minScore: 6 });
    if (c) hits.set(c.topicId, [...(hits.get(c.topicId) ?? []), i + 1]);
  });
  for (const [topicId, ps] of hits) {
    if (ps.length < 2 && pages.length > 3) continue;
    (reading[topicId] ??= []).push({ file: rel(f), label: labelFor(f), pages: ps });
  }
}
for (const list of Object.values(reading)) list.sort((a, b) => b.pages.length - a.pages.length).splice(8);

// A&P topics: the textbook chapters and her lecture notes that cover each body system.
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const lectures = [...walk(join(SRC, "_text"), ".txt"), ...walk(join(SRC, "_ocr_text"), ".txt")]
  .filter((f) => /ANAPHY_LEC/.test(f))
  .map((f) => {
    const n = /CHAPTER[ _]*(\d{1,2})|ANAPHY_LEC (\d{1,2})_/i.exec(basename(f));
    return { f, chapter: n ? Number(n[1] ?? n[2]) : 0 };
  });
for (const t of ANAPHY_TOPICS) {
  const refs: { file: string; label: string; pages: number[] }[] = [];
  for (const ch of bookChapters.filter((c) => t.bookChapters.includes(c.chapter)))
    refs.push({ file: bookFile, label: `Mack Co A&P 1e, ch. ${ch.chapter}`, pages: range(ch.from, ch.to) });
  for (const { f } of lectures.filter((l) => t.lectureChapters.includes(l.chapter))) {
    const text = readFileSync(f, "utf8");
    const n = text.includes("===== page ") ? text.split(/\n===== page \d+ =====\n/).length - 1 : text.split("\f").filter((p) => p.trim()).length;
    refs.push({ file: rel(f), label: labelFor(f), pages: range(1, Math.max(1, n)) });
  }
  if (refs.length) reading[t.id] = refs;
}

/* ── Write ───────────────────────────────────────────────────────────── */
const manifest: ContentManifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  questionFiles: [],
  cardFiles: [],
  topics: Object.fromEntries(TOPICS.map((t) => [t.id, { questions: 0, cards: 0 }])),
  sources: [],
};
for (const q of questions) manifest.topics[q.topicId].questions++;
for (const c of cards) manifest.topics[c.topicId].cards++;

for (const paper of PAPERS) {
  const qs = questions.filter((q) => getTopic(q.topicId)?.paperId === paper.id);
  const cs = cards.filter((c) => getTopic(c.topicId)?.paperId === paper.id);
  const qf = `questions-${paper.id}.json`;
  const cf = `cards-${paper.id}.json`;
  writeFileSync(join(OUT, qf), JSON.stringify(qs));
  writeFileSync(join(OUT, cf), JSON.stringify(cs));
  manifest.questionFiles.push({ paperId: paper.id, file: qf, count: qs.length });
  manifest.cardFiles.push({ paperId: paper.id, file: cf, count: cs.length });
}
const qBySource = new Map<string, number>();
for (const q of questions) {
  const l = q.source.label.replace(/, (§.*|p\. \d+)$/, "");
  const group = /^Toprank recall/.test(l) ? "Toprank recall sets" : l;
  qBySource.set(group, (qBySource.get(group) ?? 0) + 1);
}
manifest.sources = [
  ...[...qBySource].map(([label, n]) => ({ label, questions: n, cards: 0 })),
  ...[...cardSources].map(([label, n]) => ({ label, questions: 0, cards: n })),
].sort((a, b) => b.questions + b.cards - (a.questions + a.cards));
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
// For the 3D anatomy viewer: what the book says about each structure, and where (PDF pages).
writeFileSync(join(OUT, "anatomy-terms.json"), JSON.stringify(glossary));
mkdirSync(GEN, { recursive: true });
writeFileSync(join(GEN, "reading.json"), JSON.stringify(reading, null, 1));

/* ── Report ──────────────────────────────────────────────────────────── */
const lines = [
  `# Content report`,
  ``,
  `Generated ${manifest.generatedAt} from \`${SRC}\`.`,
  ``,
  `- Questions kept: **${questions.length}** (parsed ${parsed.length}; ${unclassified} couldn't be matched to a topic; ${conflicts} dropped because sources disagree on the answer)`,
  `- Flashcards kept: **${cards.length}** (${cardsDropped} couldn't be matched to a topic; duplicates merged)`,
  `- Questions found in 2+ sources: ${questions.filter((q) => (q.seenIn ?? 1) > 1).length}`,
  `- A&P book: ${parsed.filter((p) => MACK.test(p.file)).length} Learning Check / Review questions, ${glossary.length} glossary terms (${glossaryUnplaced} not in the index, so not made into cards)`,
  ``,
  `## By paper`,
  ``,
  `| Paper | Questions | Cards |`,
  `|---|---:|---:|`,
  ...PAPERS.map((p) => `| ${p.short} ${p.name} | ${manifest.questionFiles.find((f) => f.paperId === p.id)!.count} | ${manifest.cardFiles.find((f) => f.paperId === p.id)!.count} |`),
  ``,
  `## By topic`,
  ``,
  `| Topic | Questions | Cards | Reading refs |`,
  `|---|---:|---:|---:|`,
  ...TOPICS.map((t) => `| ${t.id} | ${manifest.topics[t.id].questions} | ${manifest.topics[t.id].cards} | ${reading[t.id]?.length ?? 0} |`),
  ``,
  `## Question sources`,
  ``,
  `| Source | Kept | Dropped |`,
  `|---|---:|---:|`,
  ...[...perSource].sort((a, b) => b[1].kept - a[1].kept).map(([l, s]) => `| ${l} | ${s.kept} | ${s.dropped} |`),
  ``,
  `## Why items were dropped`,
  ``,
  ...Object.entries(drops).sort((a, b) => b[1] - a[1]).map(([r, n]) => `- ${r}: ${n}`),
  ``,
  `Files with no readable answer key (student copies) are skipped entirely. They don't appear above.`,
];
writeFileSync(join(repo, "content-report.md"), lines.join("\n") + "\n");

const size = (f: string) => (statSync(join(OUT, f)).size / 1e6).toFixed(1);
console.log(`Questions: ${questions.length}  Cards: ${cards.length}  (report: content-report.md)`);
for (const p of PAPERS)
  console.log(`  ${p.short.padEnd(8)} ${String(manifest.questionFiles.find((f) => f.paperId === p.id)!.count).padStart(5)} q  ${String(manifest.cardFiles.find((f) => f.paperId === p.id)!.count).padStart(6)} cards  (${size(`questions-${p.id}.json`)} MB + ${size(`cards-${p.id}.json`)} MB)`);
