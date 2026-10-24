import { describe, expect, it } from "vitest";
import { TOPICS } from "@/content/taxonomy";
import {
  anatomyHref,
  anatomyQuery,
  bookNote,
  buildIdentifyRound,
  dueCount,
  identifyChoices,
  isQuizzable,
  parseAnatomyUrl,
  printedPages,
  questionsMentioning,
  rateIdentify,
  searchAnatomy,
  termPhrases,
  TOPIC_SYSTEMS,
  type GlossaryTerm,
  type Structure,
} from "../anatomy";
import { dayOf } from "../cards";
import type { Question } from "../content-types";
import type { CardState } from "../types";

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
    expect(parseAnatomyUrl("?s=heart&quiz=notebook")).toEqual({ shown: ["heart"], quiz: "notebook" });
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

const T0 = Date.UTC(2026, 9, 1, 9, 0, 0);
const DAY = 86_400_000;

// A made-up skeleton: sizes and places only roughly like the real one.
const at = (fma: string, name: string, center: [number, number, number], radius: number, system = "skeletal", term = "x"): Structure => ({
  fma,
  name,
  system,
  center,
  radius,
  term,
  how: "exact",
});
const bones = [
  at("F1", "Left femur", [0.1, 0.5, 0], 0.22),
  at("F2", "Right femur", [-0.1, 0.5, 0], 0.22),
  at("F3", "Left tibia", [0.1, 0.2, 0], 0.18),
  at("F4", "Left patella", [0.1, 0.35, 0.03], 0.03),
  at("F5", "Left fibula", [0.13, 0.2, 0], 0.17),
  at("F6", "Sacrum", [0, 0.9, -0.05], 0.06),
  at("F7", "Left hip bone", [0.1, 0.9, 0], 0.15),
  at("F8", "Skull", [0, 1.6, 0], 0.11),
  at("V1", "Left femoral artery", [0.1, 0.5, 0.01], 0.2, "vessels"),
];

describe("identify quiz", () => {
  it("asks about structures her book covers, not numbered branches", () => {
    expect(isQuizzable(bones[0])).toBe(true);
    expect(isQuizzable({ ...bones[0], term: undefined })).toBe(false);
    expect(isQuizzable({ ...bones[0], name: "Marginal branch of right coronary artery" })).toBe(false);
  });

  it("builds a round: due first, then new ones biggest first, one side of a pair", () => {
    const states: Record<string, CardState> = {
      F8: [dayOf(T0) - 3, 2, 2500, 1, 0, 0], // due 3 days ago
      F6: [dayOf(T0), 2, 2500, 1, 0, 0], // due today
      F4: [dayOf(T0) + 5, 5, 2500, 2, 0, 0], // not due
    };
    const skeleton = bones.filter((b) => b.system === "skeletal");
    const round = buildIdentifyRound(skeleton, states, T0, 5);
    expect(round.fmas).toEqual(["F8", "F6", "F1", "F3", "F5"]); // F2 is the other femur
    expect(round).toMatchObject({ due: 2, fresh: 3, early: 0 });
    expect(dueCount(skeleton, states, T0)).toBe(2);
    // When everything has been seen and nothing is due, the round still fills, soonest due first.
    const later = buildIdentifyRound([bones[3]], states, T0, 10);
    expect(later).toMatchObject({ fmas: ["F4"], early: 1 });
  });

  it("offers four different names from nearby structures in the same system, never the other side", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const choices = identifyChoices(bones[0], bones, seed);
      expect(choices).toHaveLength(4);
      expect(choices.map((c) => c.fma)).toContain("F1");
      expect(choices.map((c) => c.fma)).not.toContain("F2");
      expect(choices.map((c) => c.fma)).not.toContain("V1");
      expect(new Set(choices.map((c) => c.fma)).size).toBe(4);
    }
    // Size counts as well as distance: the fingers hang beside the femur, but aren't what it could be mistaken for.
    const fingers = [1, 2, 3, 4, 5].map((n) => at(`H${n}`, `Proximal phalanx ${n} of left hand`, [0.2, 0.55, 0.02 * n], 0.012));
    const arm = [at("A1", "Left humerus", [0.2, 1.1, 0], 0.17), at("A2", "Left radius", [0.22, 0.85, 0], 0.13)];
    const femurChoices = identifyChoices(bones[0], [...bones, ...arm, ...fingers], 1).map((c) => c.fma);
    expect(femurChoices.filter((f) => f.startsWith("H"))).toEqual([]);
    // A small system borrows the nearest names from the others.
    const kidney = at("K1", "Left kidney", [0.1, 1.0, -0.05], 0.06, "urinary");
    expect(identifyChoices(kidney, [...bones, kidney], 1)).toHaveLength(4);
  });

  it("writes her book's entry into the notebook, saying how it relates", () => {
    const entry: GlossaryTerm = { term: "right coronary artery", aka: [], definition: "One of two.\n\nSupplies the right side.", pages: [400, 401] };
    expect(bookNote({ ...bones[0], how: "part" }, entry)).toBe("Part of the right coronary artery: One of two. Supplies the right side. (book pp. 378, 379)");
  });

  it("schedules answers like flashcards, without pushing early right answers away", () => {
    const missed = rateIdentify(undefined, "int-ap-skeletal", false, T0);
    expect(missed[0]).toBe(dayOf(T0) + 1);
    const named = rateIdentify(undefined, "int-ap-skeletal", true, T0);
    expect(named[1]).toBe(2);
    expect(rateIdentify(named, "int-ap-skeletal", true, T0)).toBe(named); // not due yet: unchanged
    expect(rateIdentify(named, "int-ap-skeletal", true, T0 + 2 * DAY)[1]).toBeGreaterThan(2);
    expect(rateIdentify(named, "int-ap-skeletal", false, T0)[1]).toBe(1); // a miss always counts
  });
});

describe("practice this", () => {
  const q = (id: string, topicId: string, stem: string, choice = "x"): Question => ({
    id,
    topicId,
    style: "pnle",
    kind: "single",
    stem,
    choices: [
      { id: "A", text: choice },
      { id: "B", text: "y" },
    ],
    answer: ["A"],
    rationale: "",
    source: { kind: "reference", label: "Fixture", clinicallyReviewed: false },
  });
  const bank = [
    q("b1", "np3-fluids-electrolytes", "A client with a fractured femur…"),
    q("b2", "np3-fluids-electrolytes", "Which is a long bone?", "Femurs"),
    q("a1", "int-ap-skeletal", "The femur articulates with…"),
    q("x1", "np3-fluids-electrolytes", "Femoral pulse is checked…"),
    q("v1", "int-ap-skeletal", "Thoracic vertebra number…"),
    q("s1", "int-ap-cardiovascular", "The SA node is…"),
  ];

  it("looks for the term and its akas, without brackets or very short forms", () => {
    expect(termPhrases({ term: "sinoatrial (SA) node", aka: ["SA", "pacemaker"] })).toEqual(["sinoatrial node", "sa node", "pacemaker"]);
    expect(termPhrases({ term: "atrial natriuretic peptide (ANP)", aka: [] })).toEqual(["atrial natriuretic peptide", "anp"]);
  });

  it("finds whole-word mentions in stems and choices, her book's questions first, unanswered first", () => {
    const answered: Record<string, number> = { b1: T0 };
    const r = questionsMentioning(["femur"], bank, (id) => answered[id] ?? 0);
    expect(r.ids).toEqual(["a1", "b2", "b1"]); // "femoral" isn't "femur"
    expect(r.fromBook).toBe(1);
    expect(questionsMentioning(["thoracic vertebrae"], bank, () => 0).ids).toEqual(["v1"]);
    expect(questionsMentioning([], bank, () => 0).ids).toEqual([]);
    expect(questionsMentioning(termPhrases({ term: "sinoatrial (SA) node", aka: [] }), bank, () => 0).ids).toEqual(["s1"]);
  });
});
