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

/** A tapped structure. */
export interface Picked {
  fma: string;
  name: string;
  system: string;
}
