"use client";

// Loads the 3D page's data once, the same way content.ts loads the question bank:
//   public/anatomy/manifest.json + structures.json   (npm run anatomy)
//   public/content/anatomy-terms.json                 (npm run ingest; her book's glossary, ~650 KB, loaded alongside)

import { useSyncExternalStore } from "react";
import type { GlossaryTerm, Structure } from "@/lib/anatomy";
import type { AnatomyManifest } from "./types";

export type AnatomyData =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; manifest: AnatomyManifest; structures: Structure[]; byFma: Map<string, Structure> };

export type Glossary = { status: "loading" | "missing" } | { status: "ready"; terms: GlossaryTerm[]; byTerm: Map<string, GlossaryTerm> };

let data: AnatomyData = { status: "loading" };
let glossary: Glossary = { status: "loading" };
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function json<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

async function loadModels() {
  const [manifest, structures] = await Promise.all([json<AnatomyManifest>("/anatomy/manifest.json"), json<Structure[]>("/anatomy/structures.json")]);
  // A phase-0 manifest (version 1) has no system order or structures: treat it as not built yet.
  data =
    manifest?.version === 2 && structures
      ? { status: "ready", manifest, structures, byFma: new Map(structures.map((s) => [s.fma, s])) }
      : { status: "missing" };
  emit();
}

async function loadGlossary() {
  const terms = await json<GlossaryTerm[]>("/content/anatomy-terms.json");
  glossary = terms ? { status: "ready", terms, byTerm: new Map(terms.map((t) => [t.term, t])) } : { status: "missing" };
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!started) {
    started = true;
    void loadModels();
    void loadGlossary();
  }
  return () => listeners.delete(l);
}

const loading = { status: "loading" } as const;

export function useAnatomyData(): AnatomyData {
  return useSyncExternalStore(subscribe, () => data, () => loading);
}

export function useGlossary(): Glossary {
  return useSyncExternalStore(subscribe, () => glossary, () => loading);
}

/** The query string the page was opened with (deep links), read once on the client. */
export function useInitialSearch(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => "",
  );
}

/** `?fps` on the page shows a frame counter, for checking smoothness on her iPad. */
export function useShowFps(): boolean {
  return new URLSearchParams(useInitialSearch()).has("fps");
}

/** True on screens wide enough for the card to sit beside the canvas (the sidebar layout). */
export function useWide(): boolean {
  return useSyncExternalStore(
    (l) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", l);
      return () => mq.removeEventListener("change", l);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}
