/*
 * Reading the BodyParts3D 4.0 downloads.
 *
 * The meshes come from the IS-A set (isa_BP3D_4.0_obj_99): it holds every PART-OF mesh (same geometry, different
 * header) plus ~1,000 more (muscles, nerves, spleen, laryngeal cartilages). Both concept lists are read, because each
 * groups the same files differently: IS-A by kind ("muscle organ", "bone organ", "artery"), PART-OF by place
 * ("heart", "right lung", "left thigh").
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Mesh {
  file: string;
  /** The element's own concept, from the OBJ header (or the parts lists when the header is blank). */
  fma: string;
  name: string;
  min: number[];
  max: number[];
  /** Every concept, IS-A and PART-OF, whose element list includes this file: its kinds and the things it's part of. */
  concepts: Set<string>;
}

export interface Source {
  dir: string;
  meshes: Mesh[];
  /** Files left out, with the reason. */
  skipped: { file: string; why: string }[];
}

function tsv(src: string, name: string): string[][] {
  return readFileSync(join(src, name), "utf8")
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((l) => l.split("\t"));
}

export function readSource(src: string): Source {
  const dir = join(src, "isa_BP3D_4.0_obj_99");
  if (!existsSync(dir)) {
    throw new Error(`Can't find the BodyParts3D meshes at ${dir}. Unzip isa_BP3D_4.0_obj_99.zip there, or set ANATOMY_SRC.`);
  }

  // file → every concept listing it, and concept → how many files it lists (smaller = more specific).
  const conceptsOf = new Map<string, Set<string>>();
  const size = new Map<string, number>();
  const idOf = new Map<string, string>();
  for (const list of ["isa_element_parts.txt", "partof_element_parts.txt"]) {
    for (const [id, name, file] of tsv(src, list)) {
      const key = name.toLowerCase();
      if (!conceptsOf.has(file)) conceptsOf.set(file, new Set());
      conceptsOf.get(file)!.add(key);
      size.set(key, (size.get(key) ?? 0) + 1);
      idOf.set(key, id);
    }
  }

  const meshes: Mesh[] = [];
  const skipped: Source["skipped"] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".obj"))) {
    const file = f.slice(0, -4);
    const head = readFileSync(join(dir, f), "utf8").slice(0, 1500);
    const b = /Bounds\(mm\): \(([^)]+)\)-\(([^)]+)\)/.exec(head);
    if (!b) throw new Error(`No bounds in the header of ${f}`);
    let fma = /Concept ID : (FMA\d+)/.exec(head)?.[1] ?? "";
    let name = /English name : (.+)/.exec(head)?.[1]?.trim() ?? "";
    const concepts = conceptsOf.get(file) ?? new Set<string>();
    if (!fma || !name) {
      // A blank header: take the most specific concept that lists this file.
      const best = [...concepts].sort((a, c) => size.get(a)! - size.get(c)!)[0];
      if (!best || size.get(best)! > 1) {
        skipped.push({ file, why: "no concept or name in the OBJ header, and no concept lists it alone" });
        continue;
      }
      fma = idOf.get(best)!;
      name = best[0].toUpperCase() + best.slice(1);
    }
    meshes.push({ file, fma, name, concepts, min: b[1].split(",").map(Number), max: b[2].split(",").map(Number) });
  }
  return { dir, meshes, skipped };
}
