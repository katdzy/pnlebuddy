/*
 * Saunders Q & A Review for the NCLEX-RN (9th ed.), as extracted by pdftotext.
 *
 *   261. The nurse is encouraging the client ...
 *   1. Nebulizer
 *   2. Ambu bag
 *   ...
 *   Level of Cognitive Ability: Applying
 *   Content Area: Adult Health: Cardiovascular
 *   Health Problems: Adult Health: Respiratory: Pneumonia
 *   Answer: 4            (or "Answer: 1, 2, 5, 6" for select-all)
 *   Rationale: ...
 *   Test-Taking Strategy: ...
 *   Priority Nursing Tip: ...
 *   Reference: ...
 */
import { CHOICES, clean, pageIndex, type RawQuestion } from "../util.mts";

const META = /^(Level of Cognitive Ability|Client Needs|Clinical Judgment\/Cognitive Skills|Integrated Process|Content Area|Health Problems|Priority Concepts):/;

export function parseSaunders(text: string): RawQuestion[] {
  const pageOf = pageIndex(text);
  const lines = text.split("\n");
  const offsets: number[] = [];
  let off = 0;
  for (const l of lines) {
    offsets.push(off);
    off += l.length + 1;
  }
  const out: RawQuestion[] = [];

  for (let i = 0; i < lines.length; i++) {
    const am = /^\s*Answer:\s*(.+)$/.exec(lines[i]);
    if (!am) continue;
    const nums = am[1].split(/\s*,\s*/).map((s) => s.trim());
    if (!nums.every((n) => /^[1-6]$/.test(n))) continue; // calculation answers like "9 mL"

    // Walk up through the metadata block until we reach the last option line.
    let metaStart = -1;
    let hint = "";
    for (let j = i - 1; j >= 0 && i - j < 30; j--) {
      const l = lines[j].trim();
      if (/^[1-6]\.\s+\S/.test(l)) break;
      if (META.test(l)) {
        metaStart = j;
        if (/^(Content Area|Health Problems):/.test(l)) hint += " " + l.replace(/^[^:]+:/, "") + " " + (lines[j + 1] ?? "");
      }
    }
    if (metaStart < 0) continue;

    // Options sit directly above the metadata, numbered 1..n, possibly wrapped.
    const optLines: string[] = [];
    let k = metaStart - 1;
    while (k >= 0 && lines[k].trim() === "") k--;
    const block: string[] = [];
    while (k >= 0 && metaStart - k < 60) {
      block.unshift(lines[k]);
      if (/^\s*1\.\s+\S/.test(lines[k])) break;
      k--;
    }
    if (!/^\s*1\.\s/.test(block[0] ?? "")) continue;
    const choices: string[] = [];
    let expect = 1;
    for (const l of block) {
      const m = /^\s*(\d)\.\s+(.*)$/.exec(l);
      if (m && Number(m[1]) === expect) {
        choices.push(m[2]);
        expect++;
      } else if (choices.length && l.trim()) {
        choices[choices.length - 1] += " " + l.trim();
      }
    }
    optLines.push(...choices);

    // Stem: from the numbered question line down to option 1.
    let s = k - 1;
    const stemLines: string[] = [];
    while (s >= 0 && k - s < 25) {
      stemLines.unshift(lines[s]);
      if (/^\s*\d{1,4}\.\s+\S/.test(lines[s])) break;
      s--;
    }
    const first = /^\s*(\d{1,4})\.\s+(.*)$/.exec(stemLines[0] ?? "");
    if (!first || Number(first[1]) < 1) continue;
    stemLines[0] = first[2];
    const stem = clean(stemLines.join("\n"));

    // Rationale and strategy follow the answer line.
    const tail: string[] = [];
    for (let t = i + 1; t < Math.min(lines.length, i + 80); t++) {
      if (/^\s*(Reference|References):/.test(lines[t])) break;
      if (t > i + 2 && /^\s*\d{1,4}\.\s+\S/.test(lines[t])) break; // next question
      tail.push(lines[t]);
    }
    const tailText = tail.join("\n");
    const rationale = clean(/Rationale:([\s\S]*?)(?=Test-Taking Strategy:|Priority Nursing Tip:|$)/.exec(tailText)?.[1] ?? "");
    const strategy = clean(/Test-Taking Strategy:([\s\S]*?)(?=Priority Nursing Tip:|$)/.exec(tailText)?.[1] ?? "");
    const priority = clean(/Priority Nursing Tip:([\s\S]*)$/.exec(tailText)?.[1] ?? "");

    out.push({
      style: "nclex",
      stem,
      choices: optLines.map(clean),
      answer: nums.map((n) => CHOICES[Number(n) - 1]),
      rationale,
      tip: [strategy, priority && `Priority tip: ${priority}`].filter(Boolean).join("\n\n") || undefined,
      hint: clean(hint),
      page: pageOf(offsets[i]),
    });
  }
  return out;
}
