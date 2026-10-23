import { describe, expect, it } from "vitest";
import { buildIndex, matchTerm } from "../terms.mts";

// A made-up glossary in the shape of anatomy-terms.json (no book text).
const index = buildIndex([
  { term: "femur", aka: [], topicId: "int-ap-skeletal" },
  { term: "thoracic vertebrae", aka: [], topicId: "int-ap-skeletal" },
  { term: "phalanx bone of the foot", aka: [] },
  { term: "left atrioventricular valve", aka: ["bicuspid valve", "mitral valve"], topicId: "int-ap-cardiovascular" },
  { term: "lumbrical", aka: [], topicId: "int-ap-muscular" },
  { term: "rectus", aka: [], topicId: "int-ap-muscular" },
  { term: "canaliculi", aka: [], topicId: "int-ap-skeletal" },
  { term: "inferior gemellus", aka: [], topicId: "int-ap-muscular" },
  { term: "sulci", aka: [], topicId: "int-ap-nervous" },
]);

describe("linking BodyParts3D names to the glossary", () => {
  it("matches the structure's own name, ignoring the side", () => {
    expect(matchTerm("Left femur", index, "int-ap-skeletal")).toEqual({ term: "femur", how: "exact" });
  });

  it("generalises to a less specific name that keeps the head noun", () => {
    expect(matchTerm("Seventh thoracic vertebra", index, "int-ap-skeletal")).toEqual({ term: "thoracic vertebrae", how: "general" });
    expect(matchTerm("Distal phalanx of left little toe", index, "int-ap-skeletal")).toEqual({ term: "phalanx bone of the foot", how: "general" });
    expect(matchTerm("Right gemellus inferior", index, "int-ap-muscular")).toEqual({ term: "inferior gemellus", how: "exact" });
  });

  it("says when a structure is only part of what the book defines", () => {
    expect(matchTerm("Anterior leaflet of mitral valve", index, "int-ap-cardiovascular")).toEqual({
      term: "left atrioventricular valve",
      how: "part",
    });
  });

  it("refuses words the book defines in another sense or another system", () => {
    expect(matchTerm("Left medial rectus", index, "int-ap-muscular")).toBeNull();
    expect(matchTerm("Left lacrimal canaliculus", index, "int-ap-nervous")).toBeNull();
    expect(matchTerm("Artery of left postcentral sulcus", index, "int-ap-cardiovascular")).toBeNull();
  });

  it("keeps the book's hand muscles off the foot muscles of the same name", () => {
    expect(matchTerm("Second lumbrical of right foot", index, "int-ap-muscular")).toBeNull();
    expect(matchTerm("Second lumbrical of right hand", index, "int-ap-muscular")).toEqual({ term: "lumbrical", how: "general" });
  });
});
