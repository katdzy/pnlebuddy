/** public/anatomy/manifest.json, written by `npm run anatomy` (scripts/anatomy/convert.mts). */
export interface AnatomyManifest {
  version: 2;
  /** System ids in the order the chips show them. */
  order: string[];
  systems: Record<string, AnatomySystem>;
}

export interface AnatomySystem {
  file: string;
  label: string;
  topicId: string;
  /** CSS variable for the model's colour; veins use `veinColor` when set. */
  color: string;
  veinColor?: string;
  onByDefault?: boolean;
  bytes: number;
  count: number;
}

/** How a system is drawn: solid, see-through (taps pass through it), or not at all. */
export type Layer = "shown" | "xray" | "hidden";

/** What the card is about: a structure in the model, or a glossary term the model doesn't have. */
export type Selection = { kind: "structure"; fma: string } | { kind: "term"; term: string };

/** Where to point the camera: a structure's bounding sphere. `key` changes to fly there again. */
export interface Focus {
  center: [number, number, number];
  radius: number;
  key: number;
}
