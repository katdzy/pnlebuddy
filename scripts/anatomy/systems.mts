/*
 * Which BodyParts3D meshes go into each system file.
 *
 * BodyParts3D 4.0's PART-OF tree is regional, not by system: the femur sits under "left thigh", and its
 * "skeletal system" root has the skull, spine and ribs but no limbs (and some eye parts). So a system is
 * either a root concept, looked up by its English name (never a hard-coded FMA id), or a name rule.
 */

export interface SystemSpec {
  id: string;
  label: string;
  /** Taxonomy topic the system belongs to. */
  topicId: string;
  /** Every element under these concepts, by English name in partof_parts_list_e.txt. */
  roots?: string[];
  /** Or every mesh whose English name matches `include` and not `exclude`. */
  include?: RegExp;
  exclude?: RegExp;
  /** meshoptimizer target: share of vertices to keep (1 = no simplification). */
  keep: number;
}

const BONES = new RegExp(
  "\\b(" +
    [
      "bone", "vertebra", "atlas", "axis", "sacrum", "coccyx", "rib", "costal cartilage", "intervertebral disk",
      "sternum", "manubrium", "xiphoid process", "ethmoid", "vomer", "mandible", "maxilla", "inferior nasal concha",
      "clavicle", "scapula", "humerus", "radius", "ulna", "scaphoid", "lunate", "triquetral", "pisiform",
      "trapezium", "trapezoid", "capitate", "hamate", "metacarpal", "phalanx", "femur", "patella", "tibia",
      "fibula", "talus", "calcaneus", "cuboid", "cuneiform", "metatarsal",
    ].join("|") +
    ")\\b",
  "i",
);

/** Phase 0: the skeleton and the heart only. */
export const SYSTEMS: SystemSpec[] = [
  {
    id: "skeletal",
    label: "Skeleton",
    topicId: "int-ap-skeletal",
    include: BONES,
    exclude: /arter|vein|nerve|muscle|branch|tendon|ligament|retinaculum/i,
    keep: 0.6,
  },
  {
    id: "heart",
    label: "Heart",
    topicId: "int-ap-cardiovascular",
    roots: ["heart"],
    keep: 1,
  },
];
