import { createHash } from "node:crypto";
import type { ChoiceId, Question } from "../../src/lib/content-types.ts";

export const CHOICES: ChoiceId[] = ["A", "B", "C", "D", "E", "F"];

/** Fix PDF-extraction artifacts: ligatures, smart quotes, stray spaces. */
export function clean(s: string): string {
  return s
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/­/g, "")
    .replace(/[ \t]/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/(\w)- (\w)/g, (m, a, b) => (/[a-z]/.test(b) ? `${a}${b}` : m)) // re-join words split across lines
    .trim();
}

/** Lowercase, letters and digits only. Used for duplicate detection. */
export function fingerprint(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function hashId(prefix: string, ...parts: string[]): string {
  const h = createHash("sha1").update(parts.join("␞")).digest("hex").slice(0, 12);
  return `${prefix}_${h}`;
}

/** Page number (1-based) for each character offset, using pdftotext form feeds. */
export function pageIndex(text: string): (offset: number) => number {
  const breaks: number[] = [];
  for (let i = text.indexOf("\f"); i !== -1; i = text.indexOf("\f", i + 1)) breaks.push(i);
  return (offset: number) => {
    let lo = 0;
    let hi = breaks.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (breaks[mid] < offset) lo = mid + 1;
      else hi = mid;
    }
    return lo + 1;
  };
}

/** Minimal shape every parser returns before classification. */
export interface RawQuestion {
  style: Question["style"];
  situation?: string;
  stem: string;
  choices: string[];
  answer: ChoiceId[];
  rationale: string;
  tip?: string;
  /** Text that strongly suggests the topic: a chapter title, content area or deck name. */
  hint?: string;
  /** Restrict classification to these papers, when the source is clearly labelled. */
  papers?: string[];
  page?: number;
}

/** Cut a rationale where the next question or situation starts bleeding in. */
export function trimRationale(r: string): string {
  const cut = r.search(/(\s|^)(\d{1,3}\.\s+[A-Z][^.?]{10,}\?|situation\s*[:\d])/i);
  return (cut >= 0 ? r.slice(0, cut) : r).trim();
}

/** Shared sanity checks. Returns a reason string when the item should be dropped. */
export function rejectReason(q: RawQuestion): string | null {
  if (q.stem.length < 12) return "stem too short";
  if (q.choices.length < 3 || q.choices.length > 6) return "unexpected number of choices";
  if (q.choices.some((c) => c.length === 0)) return "empty choice";
  if (q.answer.length === 0) return "no answer key";
  if (q.answer.some((a) => CHOICES.indexOf(a) >= q.choices.length)) return "answer outside choices";
  const all = [q.stem, ...q.choices].join(" \n ");
  if (q.stem.length > 1200 || q.choices.some((c) => c.length > 350)) return "text too long (merged items)";
  if (/⟦KEY⟧|\banswer\s*:|\brationale\s*:|\bsituation\s*[:\d]/i.test(all)) return "merged with answer or next situation";
  if (/(^|\s)\d{1,3}\.\s?[A-Z][a-z]/.test(q.stem.slice(8))) return "another question inside the stem";
  if (q.choices.some((c) => /(^|\s)[A-Da-d][.)]\s?\S/.test(c) && /(^|\s)[B-Db-d][.)]/.test(c))) return "options merged";
  if (q.situation && /⟦KEY⟧|(^|\s)[A-Da-d][.)]\s\S.*(^|\s)[B-Db-d][.)]\s/.test(q.situation)) return "situation merged with options";
  if (/(^|\s)a\.\s.+\sb\.\s.+\sc\.\s/.test(q.rationale)) return "rationale merged with other items";
  if (/REVIEW ACADEMY|RADTECH|\bPage \d+ of\b|NURSING\*|\* ?[01] ?\/ ?1/.test([q.situation ?? "", all].join(" ")))
    return "page header or form residue";
  if (q.choices.some((c) => c.length > 70 && /\?/.test(c))) return "option contains another question";
  const end = q.stem.trim().slice(-1);
  if (!/[?:._)"'…\]]/.test(end) && !/\b(is|are|was|the|to|of|a|an|by|for|with|be|by|as|in|on|at|would|should|will|from|except|EXCEPT)$/i.test(q.stem.trim()))
    return "stem cut off";
  if (/\b(refer to|see) the (figure|illustration|exhibit|image|graphic)\b|\bexhibit\b|\[image\]/i.test(q.stem))
    return "needs an image";
  return null;
}
