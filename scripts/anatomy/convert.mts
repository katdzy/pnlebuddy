/*
 * Builds the 3D anatomy models from BodyParts3D 4.0 (CC BY 4.0, Database Center for Life Science).
 *
 *   npm run anatomy                        # uses ~/Fel Reviewers/anatomy-src
 *   ANATOMY_SRC=/path/to/anatomy-src npm run anatomy
 *
 * Reads, from https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html:
 *   isa_BP3D_4.0_obj_99/*.obj              (unzipped isa_BP3D_4.0_obj_99.zip: every mesh)
 *   isa_element_parts.txt, partof_element_parts.txt
 * and, when `npm run ingest` has made it, public/content/anatomy-terms.json (her book's glossary).
 *
 * Writes (git-ignored, rebuilt on this Mac like public/content/):
 *   public/anatomy/<system>.<hash>.glb     one mesh per FMA concept, named by its FMA id, name in extras
 *   public/anatomy/structures.json         every structure: system, side, centre, radius, glossary link
 *   public/anatomy/manifest.json           systems in order, with their files, colours and counts
 *   public/anatomy/report.md               what went where, what matched the glossary, what didn't
 *
 * Every system shares one frame: metres, Y up, the body facing +Z, centred on the whole body's bounds.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { readSource, type Mesh, type Source } from "./source.mts";
import { DISPLAY_ORDER, SYSTEMS, systemOf, topicOf, type SystemSpec } from "./systems.mts";
import { buildIndex, matchTerm, type GlossaryEntry, type TermMatch } from "./terms.mts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = process.env.ANATOMY_SRC ?? join(homedir(), "Fel Reviewers", "anatomy-src");
const OUT = join(repo, "public", "anatomy");
const TERMS = join(repo, "public", "content", "anatomy-terms.json");

let source: Source;
try {
  source = readSource(SRC);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}

const glossary: GlossaryEntry[] = existsSync(TERMS) ? JSON.parse(readFileSync(TERMS, "utf8")) : [];
if (!glossary.length) console.warn("No public/content/anatomy-terms.json (run `npm run ingest`): structures won't link to the glossary.");
const index = buildIndex(glossary);

// --- Shared frame --------------------------------------------------------------------------------------------

// BodyParts3D: millimetres, Z up, -Y anterior, -X the body's right. three.js: Y up, viewer on +Z.
// (x, y, z) → (x, z, -y) is a rotation, so triangle winding is kept.
const all = source.meshes;
const lo = [0, 1, 2].map((i) => Math.min(...all.map((o) => o.min[i])));
const hi = [0, 1, 2].map((i) => Math.max(...all.map((o) => o.max[i])));
const centre = [0, 1, 2].map((i) => (lo[i] + hi[i]) / 2);
const toScene = (x: number, y: number, z: number): [number, number, number] => [
  (x - centre[0]) / 1000,
  (z - centre[2]) / 1000,
  -(y - centre[1]) / 1000,
];

/**
 * BodyParts3D OBJs are triangles with matching vertex and normal indices ("f 1//1 2//2 3//3"). Normals are left out:
 * they split vertices along seams, which stops simplification, and the viewer computes smooth ones on load.
 */
function readObj(file: string, pos: number[], idx: number[]) {
  const base = pos.length / 3;
  for (const line of readFileSync(join(source.dir, `${file}.obj`), "utf8").split("\n")) {
    const t = line.trim().split(/\s+/);
    if (t[0] === "v") pos.push(...toScene(+t[1], +t[2], +t[3]));
    else if (t[0] === "f") {
      const v = t.slice(1).map((s) => base + parseInt(s, 10) - 1);
      for (let i = 1; i + 1 < v.length; i++) idx.push(v[0], v[i], v[i + 1]);
    }
  }
}

// --- Structures ----------------------------------------------------------------------------------------------

/** One entry of structures.json (mirrored in src/components/anatomy/types.ts). */
interface Structure {
  fma: string;
  name: string;
  system: string;
  side?: "left" | "right";
  /** Bounding sphere in scene units (metres), for framing and labels. */
  center: [number, number, number];
  radius: number;
  vein?: true;
  /** Her book's glossary term, and how it was matched (see terms.mts). */
  term?: string;
  how?: TermMatch["how"];
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const isVein = (m: Mesh) => m.concepts.has("vein") || /\b(vein|venous|vena cava|sinus)\b/i.test(m.name);
const round = (x: number) => Math.round(x * 10000) / 10000;

const bySystem = new Map<string, Map<string, Mesh[]>>();
const leftOut: string[] = [];
for (const m of all) {
  const s = systemOf(m);
  if (!s) {
    leftOut.push(m.name);
    continue;
  }
  const concepts = bySystem.get(s.id) ?? bySystem.set(s.id, new Map()).get(s.id)!;
  concepts.set(m.fma, [...(concepts.get(m.fma) ?? []), m]);
}

async function buildSystem(spec: SystemSpec, concepts: Map<string, Mesh[]>) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(spec.id);
  const material = doc.createMaterial(spec.id).setRoughnessFactor(0.7);
  const structures: Structure[] = [];

  for (const [fma, files] of concepts) {
    const pos: number[] = [];
    const idx: number[] = [];
    for (const f of files) readObj(f.file, pos, idx);

    const name = capital(files[0].name);
    const lo3 = [Infinity, Infinity, Infinity];
    const hi3 = [-Infinity, -Infinity, -Infinity];
    for (let j = 0; j < pos.length; j++) {
      lo3[j % 3] = Math.min(lo3[j % 3], pos[j]);
      hi3[j % 3] = Math.max(hi3[j % 3], pos[j]);
    }
    const center = [0, 1, 2].map((i) => (lo3[i] + hi3[i]) / 2) as [number, number, number];
    let r2 = 0;
    for (let j = 0; j < pos.length; j += 3) {
      r2 = Math.max(r2, (pos[j] - center[0]) ** 2 + (pos[j + 1] - center[1]) ** 2 + (pos[j + 2] - center[2]) ** 2);
    }
    const side = /\bleft\b/i.test(name) ? "left" : /\bright\b/i.test(name) ? "right" : undefined;
    const vein = isVein(files[0]);
    const match = glossary.length ? matchTerm(name, index, topicOf(files[0], spec)) : null;
    structures.push({
      fma,
      name,
      system: spec.id,
      ...(side ? { side } : {}),
      center: center.map(round) as [number, number, number],
      radius: round(Math.sqrt(r2)),
      ...(vein ? { vein: true as const } : {}),
      ...(match ? { term: match.term, how: match.how } : {}),
    });

    const prim = doc
      .createPrimitive()
      .setMaterial(material)
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(idx)).setBuffer(buffer));
    const mesh = doc.createMesh(fma).addPrimitive(prim);
    scene.addChild(doc.createNode(fma).setMesh(mesh).setExtras({ fma, name, ...(vein ? { vein: true } : {}) }));
  }

  await doc.transform(
    weld(),
    ...(spec.keep < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio: spec.keep, error: spec.error ?? 0.001 })] : []),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
  const glb = await io.writeBinary(doc);
  const file = `${spec.id}.${createHash("sha256").update(glb).digest("hex").slice(0, 10)}.glb`;
  writeFileSync(join(OUT, file), glb);
  return { file, bytes: glb.byteLength, structures };
}

// --- Run -----------------------------------------------------------------------------------------------------

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".glb")) rmSync(join(OUT, f));

const manifest: { version: 2; order: string[]; systems: Record<string, object> } = { version: 2, order: [], systems: {} };
const structures: Structure[] = [];
const sections: string[] = [];
let totalBytes = 0;

for (const spec of SYSTEMS) {
  const concepts = bySystem.get(spec.id);
  if (!concepts?.size) continue;
  const out = await buildSystem(spec, concepts);
  structures.push(...out.structures);
  totalBytes += out.bytes;
  manifest.order.push(spec.id);
  manifest.systems[spec.id] = {
    file: out.file,
    label: spec.label,
    topicId: spec.topicId,
    color: spec.color,
    ...(spec.veinColor ? { veinColor: spec.veinColor } : {}),
    ...(spec.onByDefault ? { onByDefault: true } : {}),
    bytes: out.bytes,
    count: out.structures.length,
  };

  const linked = out.structures.filter((s) => s.term).length;
  const how = (h: string) => out.structures.filter((s) => s.how === h).length;
  const unmatched = [...new Set(out.structures.filter((s) => !s.term).map((s) => s.name.replace(/\b(left|right) /i, "")))].sort();
  sections.push(
    `## ${spec.label} (\`${out.file}\`, ${(out.bytes / 1e6).toFixed(2)} MB)`,
    "",
    `${out.structures.length} structures. Glossary: ${linked} linked (${how("exact")} exact, ${how("general")} general, ${how("part")} part of), ${out.structures.length - linked} not.`,
    "",
    unmatched.length ? `Not in the glossary: ${unmatched.join(" · ")}` : "Every structure links to the glossary.",
    "",
  );
  console.log(`${spec.label.padEnd(15)} ${String(out.structures.length).padStart(4)} structures  ${(out.bytes / 1e6).toFixed(2)} MB  ${linked} linked`);
}

const linked = structures.filter((s) => s.term).length;
const pct = (n: number) => `${Math.round((n / structures.length) * 100)}%`;
const how = (h: string) => structures.filter((s) => s.how === h).length;
manifest.order.sort((a, b) => DISPLAY_ORDER.indexOf(a) - DISPLAY_ORDER.indexOf(b));
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(join(OUT, "structures.json"), JSON.stringify(structures));
writeFileSync(
  join(OUT, "report.md"),
  [
    "# 3D anatomy build",
    "",
    "From BodyParts3D 4.0 (IS-A meshes, OBJ 99%), © The Database Center for Life Science, CC BY 4.0.",
    "Generated by `npm run anatomy`; don't edit. Rules: `scripts/anatomy/systems.mts`; glossary links: `terms.mts`.",
    "",
    `${structures.length} structures in ${manifest.order.length} files, ${(totalBytes / 1e6).toFixed(1)} MB.`,
    `Linked to her book's glossary: ${linked} (${pct(linked)}): ${how("exact")} exact, ${how("general")} by a less specific name, ${how("part")} as part of something it defines.`,
    "",
    `Left out (no system): ${[...new Set(leftOut)].join(" · ") || "none"}.`,
    source.skipped.length ? `Skipped files: ${source.skipped.map((s) => `${s.file} (${s.why})`).join("; ")}.` : "",
    "",
    ...sections,
  ].join("\n"),
);
console.log(`\n${structures.length} structures, ${(totalBytes / 1e6).toFixed(1)} MB; ${linked} (${pct(linked)}) linked to the glossary. See public/anatomy/report.md`);
