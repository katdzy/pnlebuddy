/*
 * Linking BodyParts3D structures to her book's glossary (public/content/anatomy-terms.json).
 *
 * BodyParts3D uses FMA names ("Distal phalanx of left big toe", "Anterior leaflet of mitral valve"); the book uses
 * textbook terms. A match says how it was found, so the info card can say it honestly:
 *   exact    the structure's own name (without left/right) is a term or an aka
 *   general  a less specific name is: "Fifth thoracic vertebra" → "thoracic vertebrae", "Distal phalanx" → "phalanges"
 *   part     it's part of something the book defines: "Anterior leaflet of mitral valve" → "mitral valve"
 * A general or part match must also be a term the book places in the same body system, because a word can mean
 * different things: the book's "canaliculi" are channels in bone, not the eye's lacrimal canaliculi. (Terms the index
 * doesn't place in a chapter are allowed.)
 * Only links are made here; definitions are never written or changed.
 */

export interface GlossaryEntry {
  term: string;
  aka: string[];
  topicId?: string;
}

export type How = "exact" | "general" | "part";
export interface TermMatch {
  term: string;
  how: How;
}

type Index = Map<string, GlossaryEntry>;

/** FMA name → the name the book uses for the same structure. */
const SYNONYMS: Record<string, string> = {
  "hip bone": "coxal bone",
  "deferent duct": "ductus deferens",
  "pineal body": "pineal gland",
  "suprarenal gland": "adrenal gland",
  ethmoid: "ethmoid bone",
  "main bronchus": "primary bronchus",
  "main bronchus proper": "primary bronchus",
  "vitreous body": "vitreous humor",
  "parenchyma of pancreas": "pancreas",
  "pancreatic duct": "main pancreatic duct",
  "medulla oblongata": "medulla",
  "lateral geniculate body": "lateral geniculate nucleus",
};

/** Name families the book teaches under one term: "scalenus anterior" is one of the scalenes. */
const FAMILIES: [RegExp, string, How][] = [
  [/^scalenus\b/, "scalenes", "general"],
  [/^(superior|inferior|medial|lateral) (rectus|oblique)$/, "extrinsic eye muscles", "general"],
  [/\bphalanx of .*\b(finger|thumb)$/, "phalanx bone of the hand", "general"],
  [/\bphalanx of .*\btoe$/, "phalanx bone of the foot", "general"],
  [/^(iliocostalis|longissimus|spinalis) /, "erector spinae group", "part"],
  [/^hepatovenous segment\b/, "liver", "part"],
  [/\bbronchial tree$/, "bronchial tree", "part"],
];

/** Words that can't stand for a structure on their own ("Wall of left atrium" must not link to "wall"). */
const TOO_GENERIC = new Set([
  "artery", "vein", "nerve", "muscle", "bone", "branch", "tributary", "ligament", "cartilage", "tooth", "segment",
  "lobe", "lobule", "duct", "gland", "tree", "wall", "cavity", "part", "body", "head", "trunk", "region", "zone",
  "division", "set", "cusp", "leaflet", "gyrus", "membrane", "plate", "process", "chamber", "canal", "ventricle",
  "arch", "network", "root", "tendon", "fascia", "sinus", "fossa", "tract", "sulcus", "matter", "nucleus", "surface",
  // Defined by the book in a sense other than the structure's: fibre direction, the humerus, bone channels, the scrotum.
  "rectus", "oblique", "trochlea", "canaliculus", "raphe",
]);

/** The book defines these as hand muscles; the foot has muscles of the same name. */
const HAND_ONLY = /^(lumbricals?|abductor digiti minimi|flexor digiti minimi brevis|opponens digiti minimi|(dorsal|palmar) interosse(i|ous))$/;

/** Trailing words that only qualify a name ("infraspinatus muscle", "iliocostalis cervicis"). */
const QUALIFIERS = /^(muscle|tooth|bone|proper|capitis|cervicis|colli|thoracis|lumborum)$/;

const SERIES =
  /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|secondary|upper|lower)\b/g;

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\b(left|right|the|set of)\b/g, " ")
    .replace(/\bdisk\b/g, "disc")
    .replace(/[^a-z0-9' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Singular and plural guesses for the last word: "phalanx" ↔ "phalanges", "vertebra" ↔ "vertebrae". */
function variants(s: string): string[] {
  const out = [s];
  const m = /^(.*?)(\w+)$/.exec(s);
  if (!m) return out;
  const [, pre, w] = m;
  const alt = [
    w.replace(/ae$/, "a"),
    w.endsWith("a") ? `${w}e` : "",
    w.replace(/ies$/, "y"),
    w.endsWith("y") ? `${w.slice(0, -1)}ies` : "",
    w.replace(/ges$/, "x"),
    w.endsWith("x") ? `${w.slice(0, -1)}ges` : "",
    w.replace(/i$/, "us"),
    w.endsWith("us") ? `${w.slice(0, -2)}i` : "",
    w.replace(/es$/, ""),
    w.replace(/s$/, ""),
    `${w}s`,
  ];
  for (const a of alt) if (a && a !== w) out.push(pre + a);
  // Latin order: "gemellus inferior" is the book's "inferior gemellus"; "arytenoid cartilage" its "arytenoids".
  const latin = /^(\w+) (superior|inferior|anterior|posterior|medius|major|minor|longus|brevis)$/.exec(s);
  if (latin) out.push(`${latin[2]} ${latin[1]}`);
  const cartilage = /^(\w+) cartilage$/.exec(s);
  if (cartilage) out.push(`${cartilage[1]}s`);
  return out;
}

export function buildIndex(entries: GlossaryEntry[]): Index {
  const index: Index = new Map();
  for (const e of entries) {
    for (const name of [e.term, ...e.aka]) {
      const k = normalise(name);
      if (k && !index.has(k)) index.set(k, e);
    }
  }
  return index;
}

function lookup(index: Index, s: string): GlossaryEntry | null {
  const k = normalise(SYNONYMS[s] ?? s);
  for (const v of variants(k)) {
    const hit = index.get(v);
    if (hit) return hit;
  }
  return null;
}

/** Less specific names for the same thing, keeping its head noun: drop series words, then words from the front. */
function generalisations(s: string): string[] {
  const out: string[] = [];
  const add = (x: string) => {
    x = x.replace(/\s+/g, " ").trim();
    if (x && x !== s && !out.includes(x) && !TOO_GENERIC.has(x)) out.push(x);
  };
  let words = s.replace(SERIES, " ").replace(/\s+/g, " ").trim().split(" ");
  while (words.length > 1 && QUALIFIERS.test(words[words.length - 1])) {
    add(words.join(" "));
    words = words.slice(0, -1);
  }
  for (let i = 0; i < words.length; i++) add(words.slice(i).join(" "));
  return out;
}

/**
 * `topicId` is the body system the structure belongs to (for a muscle, the muscular system, wherever it sits);
 * general and part matches must be placed there by the book too.
 */
export function matchTerm(name: string, index: Index, topicId?: string): TermMatch | null {
  const s = normalise(name);
  const exact = lookup(index, s);
  if (exact) return { term: exact.term, how: "exact" };

  // A term the book's index doesn't place in a chapter can't contradict the structure's system.
  const fits = (e: GlossaryEntry | null) => (e && (!topicId || !e.topicId || e.topicId === topicId) ? e : null);
  for (const [re, family, how] of FAMILIES) {
    const hit = re.test(s) ? fits(lookup(index, family)) : null;
    if (hit) return { term: hit.term, how };
  }

  // "X of Y": X is the structure itself when it's specific ("distal phalanx of big toe"), else it's part of Y.
  const of = /^(.+?) of (.+)$/.exec(s);
  const head = of ? of[1] : s;
  if (of?.[2] === "foot" && HAND_ONLY.test(head.replace(SERIES, "").trim())) return null;
  if (!/^(proximal|middle|distal) part$/.test(head)) {
    for (const g of [head, ...generalisations(head)]) {
      if (TOO_GENERIC.has(g)) continue;
      const hit = fits(lookup(index, g));
      if (hit) return { term: hit.term, how: "general" };
    }
  }
  if (of) {
    const whole = matchTerm(of[2], index, topicId);
    if (whole && fits(index.get(normalise(whole.term)) ?? null)) return { term: whole.term, how: "part" };
  }
  return null;
}
