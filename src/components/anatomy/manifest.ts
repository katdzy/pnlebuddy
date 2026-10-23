"use client";

// Loads public/anatomy/manifest.json once, the same way content.ts loads the question bank.

import { useSyncExternalStore } from "react";
import type { AnatomyManifest } from "./types";

export type ManifestState = { status: "loading" } | { status: "missing" } | { status: "ready"; manifest: AnatomyManifest };

let snapshot: ManifestState = { status: "loading" };
let started = false;
const listeners = new Set<() => void>();

async function load() {
  try {
    const res = await fetch("/anatomy/manifest.json");
    snapshot = res.ok ? { status: "ready", manifest: (await res.json()) as AnatomyManifest } : { status: "missing" };
  } catch {
    snapshot = { status: "missing" };
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!started) {
    started = true;
    void load();
  }
  return () => listeners.delete(l);
}

const loading: ManifestState = { status: "loading" };

export function useAnatomyManifest(): ManifestState {
  return useSyncExternalStore(subscribe, () => snapshot, () => loading);
}

/** `?fps` on the page shows a frame counter, for checking smoothness on her iPad. */
export function useShowFps(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).has("fps"),
    () => false,
  );
}
