/** public/anatomy/manifest.json, written by `npm run anatomy`. */
export interface AnatomyManifest {
  version: 1;
  systems: Record<string, { file: string; label: string; topicId: string; bytes: number }>;
}

/** A tapped structure. */
export interface Picked {
  fma: string;
  name: string;
  system: string;
}
