/*
 * General parser for Philippine board-style question files.
 *
 *   Situation 1: Nurse Ana is assigned ...
 *   1. Which of the following ...
 *   A. option            (also "a.", "A)", two-column layouts in any order)
 *   B. option
 *   ...
 *   Answer: B. text      (or "Ans: B", or a letter glued to the rationale: "CVisitors should ...")
 *   Rationale: ...
 *
 * An optional answer-key table near the end ("ANSWER KEY  1. A  2. C ...") is
 * used for items without an inline answer, but only when the numbering in the
 * file is unique, so keys can't be matched to the wrong set.
 *
 * Items without any answer are dropped: a quiz can't grade them.
 */
import { CHOICES, clean, pageIndex, type RawQuestion } from "../util.mts";
import { KEY } from "../layout.mts";
import type { ChoiceId } from "../../../src/lib/content-types.ts";

const Q_START = /^\s*(\d{1,3})\s*[.)]\s+(\S.*)$/;
const OPT = /^\s*(?:[a-d]\.\s+)?([A-Da-d])\s*[.)]\s+(\S.*)$/;
const SITUATION = /^\s*situation\s*(?:\d+)?\s*[:\-.]\s*(.*)$/i;
const ANSWER = /^\s*(?:correct\s+)?(?:answer|ans)\s*[:.\-]\s*\(?([A-Da-d])\b[.)]?\s*(.*)$/i;
const RATIONALE = /^\s*rationale\s*[:.\-]\s*(.*)$/i;

interface Block {
  num: number;
  situation?: string;
  stem: string[];
  options: Partial<Record<ChoiceId, string>>;
  lastOpt?: ChoiceId;
  answer?: ChoiceId;
  glued?: boolean;
  keyed: ChoiceId[];
  after: string[];
  offset: number;
}

function sameStart(a: string, b: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const x = n(a).slice(0, 14);
  const y = n(b).slice(0, 14);
  return x.length >= 4 && (y.startsWith(x) || x.startsWith(y.slice(0, Math.max(4, x.length))));
}

export function parsePnle(text: string, opts: { style?: RawQuestion["style"] } = {}): RawQuestion[] {
  const pageOf = pageIndex(text);
  const rawLines = text.split("\n");
  const blocks: Block[] = [];
  let situation: string | undefined;
  let situationParts: string[] | null = null;
  let cur: Block | null = null;
  let offset = 0;

  const close = () => {
    if (cur) blocks.push(cur);
    cur = null;
  };

  for (const raw of rawLines) {
    const lineOffset = offset;
    offset += raw.length + 1;
    const line = raw.replace(/\f/g, "");
    if (/^\s*={3,}\s*page \d+/.test(line) || /^#/.test(line)) continue;

    const sm = SITUATION.exec(line);
    if (sm) {
      close();
      situationParts = [sm[1]];
      situation = undefined;
      continue;
    }

    const qm = Q_START.exec(line);
    if (qm && !(cur && !cur.lastOpt && !Object.keys(cur.options).length && Number(qm[1]) <= 5 && cur.stem.length < 2)) {
      const num = Number(qm[1]);
      // Accept a new question when we aren't in the middle of collecting options,
      // or when the number follows on from the current one.
      if (!cur || cur.lastOpt || num === cur.num + 1) {
        close();
        if (situationParts) {
          situation = clean(situationParts.join("\n"));
          situationParts = null;
        }
        cur = { num, situation, stem: [qm[2].replace(KEY, "")], options: {}, keyed: [], after: [], offset: lineOffset };
        continue;
      }
    }

    if (!cur) {
      if (situationParts && line.trim()) situationParts.push(line);
      continue;
    }

    const am = ANSWER.exec(line);
    if (am && cur.lastOpt) {
      cur.answer = am[1].toUpperCase() as ChoiceId;
      if (am[2]) cur.after.push(am[2]);
      continue;
    }

    const om = OPT.exec(line);
    if (om && !cur.answer) {
      const id = om[1].toUpperCase() as ChoiceId;
      if (!cur.options[id] || !cur.lastOpt) {
        if (om[2].includes(KEY)) cur.keyed.push(id);
        cur.options[id] = om[2].replace(KEY, "").trim();
        cur.lastOpt = id;
        continue;
      }
    }

    // A letter glued to the start of the rationale: "CVisitors should wash..." or
    // "CMeningococcal meningitis has...". Only trusted right after the last option.
    const glued = /^([A-D])([A-Z"“'(0-9].*)$/.exec(line.trim());
    if (glued && !cur.answer && Object.keys(cur.options).length >= 4 && cur.lastOpt === "D") {
      const id = glued[1] as ChoiceId;
      const opt = cur.options[id] ?? "";
      cur.answer = id;
      cur.glued = true;
      cur.after.push(sameStart(opt, glued[2]) ? glued[2].slice(opt.length).trim() : glued[2]);
      continue;
    }

    if (!line.trim()) continue;
    if (cur.answer || RATIONALE.test(line)) cur.after.push(line.replace(RATIONALE, "$1"));
    else if (cur.lastOpt) cur.options[cur.lastOpt] += " " + line.replace(KEY, "").trim();
    else cur.stem.push(line);
  }
  close();

  // Formatting key: exactly one bold/green option.
  for (const b of blocks) if (!b.answer && b.keyed.length === 1) b.answer = b.keyed[0];

  // Glued letters are only trusted when they're clearly this file's house style.
  const withOptions = blocks.filter((b) => Object.keys(b.options).length >= 4).length;
  const gluedCount = blocks.filter((b) => b.glued).length;
  if (gluedCount < Math.max(5, withOptions * 0.3))
    for (const b of blocks)
      if (b.glued) {
        b.answer = undefined;
        b.after = [];
      }

  // Answer-key table, used only when question numbers are unique in this file.
  const nums = blocks.map((b) => b.num);
  if (new Set(nums).size === nums.length) {
    const keyAt = text.search(/answer\s*key/i);
    if (keyAt >= 0) {
      const keyText = text.slice(keyAt);
      const key = new Map<number, ChoiceId>();
      for (const m of keyText.matchAll(/(\d{1,3})\s*[.)\-:]\s*([A-Da-d])\b/g)) key.set(Number(m[1]), m[2].toUpperCase() as ChoiceId);
      const covered = blocks.filter((b) => key.has(b.num)).length;
      if (covered >= blocks.length * 0.8) for (const b of blocks) if (!b.answer && key.has(b.num)) b.answer = key.get(b.num);
    }
  }

  const out: RawQuestion[] = [];
  for (const b of blocks) {
    const ids = CHOICES.filter((c) => b.options[c] !== undefined);
    if (ids.length < 3 || ids.some((id, i) => id !== CHOICES[i]) || !b.answer) continue;
    out.push({
      style: opts.style ?? "pnle",
      situation: b.situation,
      stem: clean(b.stem.join("\n").split(KEY).join("")),
      choices: ids.map((id) => clean(b.options[id]!)),
      answer: [b.answer],
      rationale: clean(b.after.join("\n").split(KEY).join("")).replace(/^[-–:.\s]+/, ""),
      page: pageOf(b.offset),
    });
  }
  return out;
}
