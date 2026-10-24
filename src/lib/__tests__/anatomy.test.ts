import { describe, expect, it } from "vitest";
import { TOPICS } from "@/content/taxonomy";
import { anatomyHref, anatomyQuery, parseAnatomyUrl, printedPages, searchAnatomy, TOPIC_SYSTEMS, type GlossaryTerm, type Structure } from "../anatomy";

const s = (fma: string, name: string, system: string, term?: string, how?: Structure["how"]): Structure => ({
  fma,
  name,
  system,
  center: [0, 0, 0],
  radius: 0.1,
  ...(term ? { term, how } : {}),
});

// Made-up structures and glossary entries (no book text).
const structures = [
  s("FMA1", "Left femur", "skeletal", "femur", "exact"),
  s("FMA2", "Right femur", "skeletal", "femur", "exact"),
  s("FMA3", "Head of left femur", "skeletal", "femur", "part"),
  s("FMA4", "Left femoral artery", "vessels", "femoral artery", "exact"),
  s("FMA5", "Fifth thoracic vertebra", "skeletal", "thoracic vertebrae", "general"),
];
const terms: GlossaryTerm[] = [
  { term: "femur", aka: [], definition: "x", pages: [] },
  { term: "femoral artery", aka: [], definition: "x", pages: [] },
  { term: "sinoatrial node", aka: ["SA node"], definition: "x", pages: [] },
  { term: "thoracic vertebrae", aka: [], definition: "x", pages: [] },
];

describe("3D anatomy page logic", () => {
  it("keeps the page state in a readable URL and reads it back", () => {
    const q = anatomyQuery({ shown: ["skeletal", "heart"], xray: ["muscular"], fma: "FMA24475" });
    expect(q).toBe("s=skeletal,heart&x=muscular&f=FMA24475");
    expect(parseAnatomyUrl(`?${q}`)).toEqual({ shown: ["skeletal", "heart"], xray: ["muscular"], fma: "FMA24475" });
    expect(parseAnatomyUrl("?t=sinoatrial%20node")).toEqual({ term: "sinoatrial node" });
    // A malformed id is ignored rather than trusted.
    expect(parseAnatomyUrl("?f=<script>")).toEqual({});
  });

  it("opens an A&P topic's systems, and only for topics that have one", () => {
    expect(anatomyHref("int-ap-cardiovascular")).toBe("/anatomy?s=heart,vessels");
    expect(anatomyHref("int-ap-foundations")).toBeNull();
    const ids = new Set(TOPICS.map((t) => t.id));
    for (const id of Object.keys(TOPIC_SYSTEMS)) expect(ids.has(id)).toBe(true);
  });

  it("shows printed page numbers", () => {
    expect(printedPages([20, 366, 494])).toEqual([344, 472]);
  });

  it("finds structures by name or by their book term, best matches first", () => {
    const r = searchAnatomy("femur", structures, terms);
    expect(r.structures.map((x) => x.fma)).toEqual(["FMA1", "FMA2", "FMA3"]);
    expect(searchAnatomy("vertebrae", structures, terms).structures.map((x) => x.fma)).toEqual(["FMA5"]);
    expect(searchAnatomy("f", structures, terms).structures).toEqual([]);
  });

  it("offers book terms the model doesn't have, by term or aka", () => {
    const r = searchAnatomy("SA node", structures, terms);
    expect(r.structures).toEqual([]);
    expect(r.bookOnly.map((t) => t.term)).toEqual(["sinoatrial node"]);
    // A term with a structure of its own isn't repeated as book-only.
    expect(searchAnatomy("femur", structures, terms).bookOnly).toEqual([]);
  });
});
