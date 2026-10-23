/*
 * Which BodyParts3D meshes go into each system file.
 *
 * Neither concept tree is by body system: PART-OF is regional (the femur sits under "left thigh") and IS-A is by kind
 * ("muscle organ", "artery"). So each mesh goes to the first system whose rule matches, using its kinds, what it's part
 * of, and its name. Rules are ordered: the heart before vessels, glands before the brain, the eye before bones.
 * public/anatomy/report.md lists every system's members and anything no rule took; read it after changing a rule.
 */
import type { Mesh } from "./source.mts";

export interface SystemSpec {
  id: string;
  label: string;
  /** Taxonomy topic the system belongs to. */
  topicId: string;
  /** Colour token for the model (a CSS variable); veins can use `veinColor`. */
  color: string;
  veinColor?: string;
  /** meshoptimizer target: share of vertices to keep (1 = no simplification), and how far (share of each mesh's
   * size) the surface may move to get there (default 0.001). Each file stays under ~4 MB. */
  keep: number;
  error?: number;
  /** Shown first on /anatomy. */
  onByDefault?: boolean;
  match: (m: Mesh) => boolean;
}

const kind = (m: Mesh, ...names: string[]) => names.some((n) => m.concepts.has(n));
const named = (m: Mesh, re: RegExp) => re.test(m.name);
/** Any concept the mesh belongs to matches, e.g. /muscle/ for "head of muscle organ" or "muscle of lower limb". */
const within = (m: Mesh, re: RegExp) => [...m.concepts].some((c) => re.test(c));

const BONES = new RegExp(
  "\\b(" +
    [
      "bone", "vertebra", "atlas", "axis", "sacrum", "coccyx", "rib", "costal cartilage", "intervertebral disk",
      "sternum", "manubrium", "xiphoid process", "ethmoid", "vomer", "mandible", "maxilla", "inferior nasal concha",
      "clavicle", "scapula", "humerus", "radius", "ulna", "scaphoid", "lunate", "triquetral", "pisiform",
      "trapezium", "trapezoid", "capitate", "hamate", "metacarpal", "phalanx", "femur", "patella", "tibia",
      "fibula", "talus", "calcaneus", "cuboid", "cuneiform bone", "metatarsal", "meniscus", "pubic symphysis",
    ].join("|") +
    ")\\b",
  "i",
);

const VESSEL_KINDS = ["region of vascular tree organ", "artery", "vein", "segment of arterial tree organ", "segment of venous tree organ"];
const vessel = (m: Mesh) =>
  kind(m, ...VESSEL_KINDS) || named(m, /arter|vein|aorta|vena cava|\btrunk\b|plantar arch|palmar (venous )?arch|venous (arch|network)/i);

export const SYSTEMS: SystemSpec[] = [
  {
    id: "heart",
    label: "Heart",
    topicId: "int-ap-cardiovascular",
    color: "--tag-red-solid",
    keep: 1,
    match: (m) => kind(m, "heart"),
  },
  {
    id: "endocrine",
    label: "Glands",
    topicId: "int-ap-endocrine",
    color: "--tag-green-solid",
    keep: 1,
    match: (m) => !vessel(m) && named(m, /pituitary|pineal|adrenal|suprarenal|thyroid gland|parathyroid/i),
  },
  {
    id: "lymphatic",
    label: "Lymphatic",
    topicId: "int-ap-lymphatic",
    color: "--tag-gray-solid",
    keep: 1,
    match: (m) => named(m, /spleen|thymus|tonsil|lymph/i),
  },
  {
    id: "urinary",
    label: "Urinary",
    topicId: "int-ap-urinary",
    color: "--tag-yellow-solid",
    keep: 1,
    match: (m) => !vessel(m) && named(m, /kidney|ureter|urinary bladder|urethra|renal pelvis|calyx/i),
  },
  {
    id: "reproductive",
    label: "Reproductive",
    topicId: "int-ap-reproductive",
    color: "--tag-purple-solid",
    keep: 1,
    match: (m) =>
      !vessel(m) &&
      named(m, /prostate|testis|epididymis|seminal|ductus deferens|deferent duct|spermatic cord|penis|scrotum|ovary|uter|vagin/i),
  },
  {
    id: "respiratory",
    label: "Airways",
    topicId: "int-ap-respiratory",
    color: "--tag-pink-solid",
    keep: 1,
    match: (m) =>
      !vessel(m) &&
      (kind(m, "segment of tracheobronchial tree") ||
      named(m, /trachea|bronch|epiglott|thyroid cartilage|cricoid|arytenoid|corniculate|cuneiform cartilage|nasal cartilage|alar cartilage|diaphragm|thyrohyoid (ligament|membrane)|cricothyroid ligament|vocal ligament|conus elasticus/i)),
  },
  {
    id: "vessels",
    label: "Vessels",
    topicId: "int-ap-cardiovascular",
    color: "--tag-red-solid",
    veinColor: "--tag-blue-solid",
    keep: 0.5,
    error: 0.002,
    match: vessel,
  },
  {
    id: "nervous",
    label: "Brain & nerves",
    topicId: "int-ap-nervous",
    color: "--tag-yellow-solid",
    keep: 0.6,
    error: 0.002,
    match: (m) =>
      !named(m, /\bbone\b|retinaculum/i) &&
      (kind(m, "segment of neural tree organ", "nerve", "cranial nerve") ||
      within(m, /neuraxis|brain|telencephalon|diencephalon/) ||
      named(
        m,
        /brain|cerebr|cerebell|gyrus|lobule|occipital lobe|\bpons\b|medulla oblongata|thalam|hippocamp|insula|internal capsule|colliculus|\bventricle\b|aqueduct|spinal cord|habenula|tuber cinereum|nerve|eyeball|cornea|\biris\b|\blens\b|sclera|choroid|vitreous|\bretina\b|lacrimal|check ligament|tarsal plate|nasolacrimal|corona ciliaris|external ear|amygdala|nucleus|interpeduncular fossa|interventricular foramen|putamen|pallidus|geniculate|mammillary|commissure|corpus callosum/i,
      )),
  },
  {
    id: "digestive",
    label: "Digestive",
    topicId: "int-ap-digestive",
    color: "--tag-orange-solid",
    keep: 0.7,
    match: (m) =>
      kind(m, "tooth") ||
      named(
        m,
        /esophag|stomach|duoden|jejun|ileum|ileocecal|colon|cecum|appendix|mesoappendix|rectum|anal canal|anal sphincter|liver|hepat|biliary|bile|cystic duct|gallbladder|pancrea|tongue|tooth|incisor|canine|molar|gingiva|parotid|submandibular gland|sublingual gland|mesentery|mesocolon|taenia|omentum|\blip\b|raphe/i,
      ),
  },
  {
    id: "skeletal",
    label: "Skeleton",
    topicId: "int-ap-skeletal",
    color: "--color-bone",
    keep: 0.6,
    onByDefault: true,
    match: (m) => !named(m, /arter|vein|nerve|muscle|branch|tendon/i) && (kind(m, "bone organ") || named(m, BONES) || named(m, /ligament|interosseous membrane/i)),
  },
  {
    id: "muscular",
    label: "Muscles",
    topicId: "int-ap-muscular",
    color: "--tag-brown-solid",
    keep: 0.5,
    error: 0.002,
    match: (m) =>
      within(m, /muscle/) ||
      named(m, /muscle|tendon|tendinous|aponeurosis|retinaculum|iliotibial tract|fascia|sphincter|linea alba|interossei|lumbricals|levatores|intertransversarii|interspinales|trapezius|trochlea of .*oblique/i),
  },
];

/** The order the chips show them in: the order she'd study them, not the order the rules run. */
export const DISPLAY_ORDER = [
  "skeletal", "muscular", "nervous", "heart", "vessels", "respiratory", "digestive", "urinary", "reproductive",
  "endocrine", "lymphatic",
];

/** The first system whose rule takes this mesh, or null. */
export function systemOf(m: Mesh): SystemSpec | null {
  return SYSTEMS.find((s) => s.match(m)) ?? null;
}

/** The body system a structure is taught under: a muscle is muscular wherever it sits (the larynx, the eye). */
export function topicOf(m: Mesh, system: SystemSpec): string {
  return within(m, /muscle/) && !kind(m, "heart") ? "int-ap-muscular" : system.topicId;
}
