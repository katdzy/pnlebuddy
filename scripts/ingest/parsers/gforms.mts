/*
 * Toprank recall sets saved as Google Forms result screenshots, after OCR.
 *
 *   X_ 1. Which of the following are some elements of primary health care *0/1
 *   except?
 *   O A. Use of appropriate technology
 *   @ 8B. Safe water supply x
 *   ©) C. Free medicines
 *   O D. Maternal and child care
 *   Correct answer
 *   @ C. Free medicines
 *
 * Only missed items show a "Correct answer" block, and OCR can't reliably tell
 * which radio button was ticked on items she got right, so we keep only the
 * items with an explicit correct answer.
 */
import { CHOICES, clean, type RawQuestion } from "../util.mts";
import type { ChoiceId } from "../../../src/lib/content-types.ts";

const CORRECT = /c[oa]r+[ea]c[tf]\s+an[sc]w[ea]r/i;
// Radio glyphs OCR as O, ©), @, (©), ® ...; a ticked "B" often reads "8B" or "8".
const GLYPH = String.raw`(?:\(?[©@®Oo0]\)?|\(\s*\))`;
const OPTION = new RegExp(
  `^${GLYPH}\\s*\\)?\\s*(?:8(?=[A-D]))?([A-D8])\\s*[.,:]?\\s*(?:[A-D]\\.\\s*)?(\\S.*?)(?:\\s+(?:[xX%4v]|SA))?\\s*$`,
);
// Question lines have no radio glyph; they may start with an X/✓ mark from the form.
const Q = /^(?:[xX✓v“"'_]{1,3}\s*)?(\d{1,3})\.\s+(\S.+)$/;
const isQ = (l: string) => Q.test(l) && !OPTION.test(l);

function letter(c: string): ChoiceId {
  return (c === "8" ? "B" : c) as ChoiceId;
}

export function parseGoogleForms(text: string): RawQuestion[] {
  const lines: string[] = [];
  const pages: number[] = [];
  let p = 1;
  for (const raw of text.split("\n")) {
    const pm = /^\s*={3,}\s*page (\d+)/.exec(raw);
    if (pm) p = Number(pm[1]);
    else if (!/^#/.test(raw) && raw.trim()) {
      lines.push(raw.trim());
      pages.push(p);
    }
  }
  const out: RawQuestion[] = [];
  let situation: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const sm = /^situation\s*\d*\s*[:.]\s*(.*)$/i.exec(lines[i]);
    if (sm) {
      const parts = [sm[1]];
      while (i + 1 < lines.length && !isQ(lines[i + 1])) parts.push(lines[++i]);
      situation = clean(parts.join("\n"));
      continue;
    }
    if (!isQ(lines[i])) continue;
    const qm = Q.exec(lines[i])!;
    const stemParts = [qm[2].replace(/\*\s*\d\s*\/\s*1.*$/, "")];
    let j = i + 1;
    while (j < lines.length && !OPTION.test(lines[j]) && !isQ(lines[j])) {
      stemParts.push(lines[j].replace(/\*\s*\d\s*\/\s*1.*$/, ""));
      j++;
    }
    const opts: Partial<Record<ChoiceId, string>> = {};
    while (j < lines.length && !CORRECT.test(lines[j]) && !isQ(lines[j])) {
      const om = OPTION.exec(lines[j]);
      if (om) opts[letter(om[1])] = om[2].replace(/^[A-D]\.\s*/, "");
      j++;
    }
    if (!CORRECT.test(lines[j] ?? "")) {
      i = j - 1;
      continue;
    }
    // The answer line may be pushed past OCR junk from a page break.
    let ans: ChoiceId | undefined;
    for (let k = j + 1; k < Math.min(lines.length, j + 4); k++) {
      const am = OPTION.exec(lines[k]);
      if (am) {
        ans = letter(am[1]);
        break;
      }
    }
    const ids = CHOICES.filter((c) => opts[c] !== undefined);
    if (ans && ids.length === 4 && ids.every((id, n) => id === CHOICES[n])) {
      out.push({
        style: "pnle",
        situation,
        stem: clean(stemParts.join("\n")),
        choices: ids.map((id) => clean(opts[id]!)),
        answer: [ans],
        rationale: "",
        page: pages[i],
      });
    }
    i = j;
  }
  return out;
}
