/*
 * Builds the 3D anatomy models from BodyParts3D 4.0 (CC BY 4.0, Database Center for Life Science).
 *
 *   npm run anatomy                        # uses ~/Fel Reviewers/anatomy-src
 *   ANATOMY_SRC=/path/to/anatomy-src npm run anatomy
 *
 * Reads, from the downloads at https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html:
 *   partof_parts_list_e.txt, partof_element_parts.txt
 *   partof_BP3D_4.0_obj_99/*.obj           (unzipped partof_BP3D_4.0_obj_99.zip)
 *
 * Writes:
 *   public/anatomy/<system>.<hash>.glb     one mesh per FMA concept, named by its FMA id, English name in extras
 *   public/anatomy/manifest.json           system → file, so the hashed files can be cached forever
 *   public/anatomy/report.md               what went into each file
 *
 * Every system shares one frame: metres, Y up, the body facing +Z, centred on the whole body's bounds.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO, type Material } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { SYSTEMS, type SystemSpec } from "./systems.mts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = process.env.ANATOMY_SRC ?? join(homedir(), "Fel Reviewers", "anatomy-src");
const OBJ_DIR = join(SRC, "partof_BP3D_4.0_obj_99");
const OUT = join(repo, "public", "anatomy");

if (!existsSync(OBJ_DIR)) {
  console.error(`Can't find the BodyParts3D meshes at ${OBJ_DIR}. Unzip partof_BP3D_4.0_obj_99.zip there, or set ANATOMY_SRC.`);
  process.exit(1);
}

function tsv(name: string): string[][] {
  return readFileSync(join(SRC, name), "utf8")
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((l) => l.split("\t"));
}

// --- What's on disk ------------------------------------------------------------------------------------------

interface ObjInfo {
  file: string;
  fma: string;
  name: string;
  min: number[];
  max: number[];
}

/** The header of each OBJ names its concept and bounds, so the files can be sorted without parsing geometry. */
function readHeader(file: string): ObjInfo {
  const head = readFileSync(join(OBJ_DIR, `${file}.obj`), "utf8").slice(0, 1500);
  const fma = /Concept ID : (FMA\d+)/.exec(head)?.[1];
  const name = /English name : (.+)/.exec(head)?.[1]?.trim();
  const b = /Bounds\(mm\): \(([^)]+)\)-\(([^)]+)\)/.exec(head);
  if (!b) throw new Error(`No bounds in the header of ${file}.obj`);
  // A couple of files have an empty concept and name; they still count for the frame but join no system.
  return { file, fma: fma ?? "", name: name ?? "", min: b[1].split(",").map(Number), max: b[2].split(",").map(Number) };
}

const objs = readdirSync(OBJ_DIR)
  .filter((f) => f.endsWith(".obj"))
  .map((f) => readHeader(f.slice(0, -4)));
const unnamed = objs.filter((o) => !o.fma || !o.name).map((o) => o.file);
const byFile = new Map(objs.filter((o) => o.fma && o.name).map((o) => [o.file, o]));

const conceptByName = new Map(tsv("partof_parts_list_e.txt").map(([id, , en]) => [en.toLowerCase(), id]));
const filesByConcept = new Map<string, string[]>();
for (const [id, , file] of tsv("partof_element_parts.txt")) {
  if (!filesByConcept.has(id)) filesByConcept.set(id, []);
  filesByConcept.get(id)!.push(file);
}

function pick(spec: SystemSpec): ObjInfo[] {
  const files = new Set<string>();
  for (const root of spec.roots ?? []) {
    const id = conceptByName.get(root.toLowerCase());
    if (!id) throw new Error(`No concept named "${root}" in partof_parts_list_e.txt`);
    for (const f of filesByConcept.get(id) ?? []) if (byFile.has(f)) files.add(f);
  }
  if (spec.include) {
    for (const o of byFile.values()) if (spec.include.test(o.name) && !spec.exclude?.test(o.name)) files.add(o.file);
  }
  return [...files].map((f) => byFile.get(f)!).sort((a, b) => a.name.localeCompare(b.name));
}

// --- Shared frame --------------------------------------------------------------------------------------------

// BodyParts3D: millimetres, Z up, -Y anterior, -X the body's right. three.js: Y up, viewer on +Z.
// (x, y, z) → (x, z, -y) is a rotation, so triangle winding is kept.
const lo = [0, 1, 2].map((i) => Math.min(...objs.map((o) => o.min[i])));
const hi = [0, 1, 2].map((i) => Math.max(...objs.map((o) => o.max[i])));
const centre = [0, 1, 2].map((i) => (lo[i] + hi[i]) / 2);
const toScene = (x: number, y: number, z: number): [number, number, number] => [
  (x - centre[0]) / 1000,
  (z - centre[2]) / 1000,
  -(y - centre[1]) / 1000,
];

// --- OBJ → glTF ----------------------------------------------------------------------------------------------

/** BodyParts3D OBJs are triangles with matching vertex and normal indices ("f 1//1 2//2 3//3"). */
function readObj(file: string, pos: number[], nor: number[], idx: number[]) {
  const base = pos.length / 3;
  const text = readFileSync(join(OBJ_DIR, `${file}.obj`), "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim().split(/\s+/);
    if (t[0] === "v") pos.push(...toScene(+t[1], +t[2], +t[3]));
    else if (t[0] === "vn") nor.push(+t[1], +t[3], -t[2]);
    else if (t[0] === "f") {
      const v = t.slice(1).map((s) => base + parseInt(s, 10) - 1);
      for (let i = 1; i + 1 < v.length; i++) idx.push(v[0], v[i], v[i + 1]);
    }
  }
}

async function buildSystem(spec: SystemSpec, parts: ObjInfo[]) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(spec.id);
  const material: Material = doc.createMaterial(spec.id).setBaseColorFactor([0.9, 0.87, 0.8, 1]).setRoughnessFactor(0.7);

  // One mesh per concept: a few concepts (e.g. the hyoid) come in more than one file.
  const concepts = new Map<string, ObjInfo[]>();
  for (const p of parts) concepts.set(p.fma, [...(concepts.get(p.fma) ?? []), p]);

  for (const [fma, files] of concepts) {
    const pos: number[] = [];
    const nor: number[] = [];
    const idx: number[] = [];
    for (const f of files) readObj(f.file, pos, nor, idx);
    if (nor.length !== pos.length) throw new Error(`${fma}: normals don't match vertices`);
    const prim = doc
      .createPrimitive()
      .setMaterial(material)
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos)).setBuffer(buffer))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(nor)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(idx)).setBuffer(buffer));
    const mesh = doc.createMesh(fma).addPrimitive(prim);
    const extras = { fma, name: files[0].name, files: files.map((f) => f.file) };
    scene.addChild(doc.createNode(fma).setMesh(mesh).setExtras(extras));
  }

  await MeshoptSimplifier.ready;
  await MeshoptEncoder.ready;
  await doc.transform(
    weld(),
    ...(spec.keep < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio: spec.keep, error: 0.001 })] : []),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
  const glb = await io.writeBinary(doc);
  const hash = createHash("sha256").update(glb).digest("hex").slice(0, 10);
  const file = `${spec.id}.${hash}.glb`;
  writeFileSync(join(OUT, file), glb);
  return { file, bytes: glb.byteLength, structures: concepts.size };
}

// --- Run -----------------------------------------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".glb")) rmSync(join(OUT, f));

const manifest: Record<string, { file: string; label: string; topicId: string; bytes: number }> = {};
const report: string[] = [
  "# 3D anatomy build",
  "",
  "From BodyParts3D 4.0 (PART-OF, OBJ 99%), © The Database Center for Life Science, CC BY 4.0.",
  "Generated by `npm run anatomy`; don't edit.",
  "",
];

for (const spec of SYSTEMS) {
  const parts = pick(spec);
  const out = await buildSystem(spec, parts);
  manifest[spec.id] = { file: out.file, label: spec.label, topicId: spec.topicId, bytes: out.bytes };
  const names = [...new Set(parts.map((p) => p.name))];
  report.push(
    `## ${spec.label} (\`${out.file}\`)`,
    "",
    `${out.structures} structures from ${parts.length} mesh files, ${(out.bytes / 1e6).toFixed(2)} MB.`,
    "",
    names.join(" · "),
    "",
  );
  console.log(`${spec.label}: ${out.structures} structures, ${parts.length} files → ${out.file} (${(out.bytes / 1e6).toFixed(2)} MB)`);
}

if (unnamed.length) report.push(`Left out: ${unnamed.join(", ")} (no concept or name in the OBJ header).`, "");

writeFileSync(join(OUT, "manifest.json"), JSON.stringify({ version: 1, systems: manifest }, null, 2) + "\n");
writeFileSync(join(OUT, "report.md"), report.join("\n"));
