import { describe, expect, it } from "vitest";
import { pageLines, parseKey, parseMack } from "../parsers/mack.mts";

/** A tiny pdftohtml page: two columns at x=50 and x=500 on a 972-wide page. Text here is made up, not from the book. */
function page(n: number, rows: [number, number, string][]): { pdfPage: number; lines: string[] } {
  const xml =
    `<page number="${n}" position="absolute" top="0" left="0" height="1174" width="972">` +
    rows.map(([top, left, t]) => `<text top="${top}" left="${left}" width="${Math.min(400, t.length * 7)}" height="15" font="1">${t}</text>`).join("") +
    `</page>`;
  return { pdfPage: n, lines: pageLines(xml, 972, 1174) };
}

describe("Mack A&P book parser", () => {
  it("reads two columns one after the other instead of interleaving them", () => {
    const rows: [number, number, string][] = [];
    for (let i = 0; i < 12; i++) rows.push([100 + i * 15, 50, `left ${i}`], [100 + i * 15, 500, `right ${i}`]);
    const { lines } = page(1, rows);
    expect(lines.slice(0, 12)).toEqual(Array.from({ length: 12 }, (_, i) => `left ${i}`));
    expect(lines[12]).toBe("right 0");
  });

  it("stops a key block at an unrecognised heading and drops keys printed twice", () => {
    const key = parseKey([
      "Chapter Review Questions,",
      "Section 27.8:",
      "1. b",
      "2. a, d",
      "Case Study Questions,",
      "Hypertension, Section 28.1:",
      "1. c",
      "Learning Check Questions,",
      "Section 3.1c:",
      "1. a",
      "1. b",
    ]);
    expect(key.get("cr|27.8|1|1")).toEqual(["B"]);
    expect(key.get("cr|27.8|1|2")).toEqual(["A", "D"]);
    expect(key.has("lc|3.1c|1|1")).toBe(false);
  });

  it("keys questions from the appendix, reads grid options, and skips blocks that don't line up", () => {
    const L = (top: number, t: string): [number, number, string] => [top, 50, t];
    const chapter = page(64, [
      L(51, "Introduction to the Human Body Chapter 2 41"),
      L(100, "2.6 Questions"),
      L(115, "1. Which plane divides the body into upper and lower parts?"),
      L(130, "a. Transverse c. Sagittal"),
      L(145, "b. Frontal d. Oblique"),
      L(160, "2. True or False: The sternum is anterior to the heart."),
      L(175, "a. True b. False"),
      L(190, "2.7 Questions"),
      L(205, "1. Which bone is in the forearm?"),
      L(220, "a. Radius b. Femur c. Tibia"),
      L(235, "2.7 Summary"),
    ]);
    const appendix = page(1279, [
      L(100, "Answers to Learning Checks and Chapter Review Questions"),
      L(115, "Chapter Review Questions,"),
      L(130, "Section 2.6:"),
      L(145, "1. a"),
      L(160, "2. a"),
      // 2.7 has two keys but only one question was read: the whole block is skipped.
      L(175, "Chapter Review Questions,"),
      L(190, "Section 2.7:"),
      L(205, "1. a"),
      L(220, "2. b"),
    ]);
    const qs = parseMack([chapter, appendix]);
    expect(qs.map((q) => q.stem)).toEqual(["Which plane divides the body into upper and lower parts?", "True or False: The sternum is anterior to the heart."]);
    expect(qs[0].choices).toEqual(["Transverse", "Frontal", "Sagittal", "Oblique"]);
    expect(qs[0].answer).toEqual(["A"]);
    expect(qs[0].topicId).toBe("int-ap-foundations");
    expect(qs[0].where).toBe("§2.6 Questions, p. 42");
  });
});
