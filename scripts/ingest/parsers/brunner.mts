/*
 * Brunner & Suddarth Test Bank (14th ed.), as extracted by pdftotext.
 *
 *   10. A nurse is caring for ...
 *   A)
 *   Forearm
 *   B)
 *   Thigh
 *   Ans:
 *   B            (or "A, C, D" for multiple response)
 *   Feedback:
 *   The patient is taught ...
 *
 * Chapter titles come from the table of contents (title + start page), which
 * we map onto pages using pdftotext's form feeds.
 */
import { CHOICES, clean, pageIndex, type RawQuestion } from "../util.mts";
import type { ChoiceId } from "../../../src/lib/content-types.ts";

const HEADER = /^Test Bank - Brunner/;

export function parseBrunner(text: string): RawQuestion[] {
  const pageOf = pageIndex(text);

  // Table of contents: "Chapter 15: Title" followed by its start page.
  const toc: { page: number; title: string }[] = [];
  const tocRe = /^Chapter (\d+): (.+)\n(\d+)$/gm;
  for (let m; (m = tocRe.exec(text.slice(0, 20000))); ) toc.push({ page: Number(m[3]), title: m[2] });
  toc.sort((a, b) => a.page - b.page);
  const chapterFor = (page: number) => {
    let t = "";
    for (const c of toc) if (c.page <= page) t = c.title;
    return t;
  };

  const lines = text.split("\n").map((l) => (HEADER.test(l.replace(/\f/g, "")) ? "" : l.replace(/\f/g, "")));
  const offsets: number[] = [];
  let off = 0;
  for (const l of text.split("\n")) {
    offsets.push(off);
    off += l.length + 1;
  }

  const out: RawQuestion[] = [];
  let i = 0;
  while (i < lines.length) {
    const qm = /^(\d{1,3})\.\s+(\S.*)$/.exec(lines[i]);
    if (!qm) {
      i++;
      continue;
    }
    const start = i;
    const stemParts = [qm[2]];
    i++;
    while (i < lines.length && !/^[A-F]\)\s*$/.test(lines[i]) && !/^[A-F]\)\s+\S/.test(lines[i])) {
      if (/^\d{1,3}\.\s+\S/.test(lines[i]) || /^Ans:/.test(lines[i])) break;
      stemParts.push(lines[i]);
      i++;
    }
    if (!/^[A-F]\)/.test(lines[i] ?? "")) continue;

    const choices: string[] = [];
    while (i < lines.length && !/^Ans:/.test(lines[i])) {
      const om = /^([A-F])\)\s*(.*)$/.exec(lines[i]);
      if (om && om[1] === CHOICES[choices.length]) choices.push(om[2]);
      else if (choices.length && lines[i].trim() && !/^\s*\d+\s*$/.test(lines[i])) {
        choices[choices.length - 1] += " " + lines[i].trim();
      }
      if (/^\d{1,3}\.\s+\S/.test(lines[i]) && choices.length >= 2) break;
      i++;
    }
    if (!/^Ans:/.test(lines[i] ?? "")) continue;
    let ansText = lines[i].replace(/^Ans:\s*/, "");
    i++;
    while (!ansText.trim() && i < lines.length) ansText = lines[i++];
    const answer = ansText
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s): s is ChoiceId => /^[A-F]$/.test(s));

    const fb: string[] = [];
    if (/^Feedback:/.test(lines[i] ?? "")) i++;
    while (i < lines.length && !/^\d{1,3}\.\s+\S/.test(lines[i]) && !/^Chapter \d+:/.test(lines[i])) {
      if (!/^\s*\d+\s*$/.test(lines[i])) fb.push(lines[i]);
      i++;
    }

    const page = pageOf(offsets[start]);
    out.push({
      style: "nclex",
      stem: clean(stemParts.join("\n")),
      choices: choices.map(clean),
      answer,
      rationale: clean(fb.join("\n")),
      hint: chapterFor(page),
      page,
    });
  }
  return out;
}
