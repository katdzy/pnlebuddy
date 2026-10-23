"use client";

/*
 * Client store for the look (theme, covers, icons, motto). Same pattern as
 * store.ts: useSyncExternalStore over localStorage, with the theme and font
 * mirrored onto <html> so CSS can pick them up.
 */

import { useSyncExternalStore } from "react";
import type { PaperId } from "@/content/taxonomy";
import { deletePhoto } from "./media";
import {
  cleanIcon,
  defaultLook,
  LOOK_KEY,
  sanitizeLook,
  THEMES,
  type Cover,
  type FontId,
  type Look,
  type LookKey,
  type ThemeId,
  type ToneId,
} from "./look";

let look: Look | null = null;
const listeners = new Set<() => void>();
const SERVER_LOOK = defaultLook();

function read(): Look {
  if (look) return look;
  try {
    look = sanitizeLook(JSON.parse(window.localStorage.getItem(LOOK_KEY) ?? "null"));
  } catch {
    look = defaultLook();
  }
  apply(look);
  return look;
}

function apply(l: Look) {
  const root = document.documentElement;
  root.dataset.theme = l.theme;
  root.dataset.font = l.font;
  const ground = THEMES.find((t) => t.id === l.theme)?.swatch[0];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (ground && meta) meta.setAttribute("content", ground);
}

function commit(next: Look) {
  look = next;
  try {
    window.localStorage.setItem(LOOK_KEY, JSON.stringify(next));
  } catch {
    /* storage full: the look still applies for this visit */
  }
  apply(next);
  listeners.forEach((l) => l());
}

function update(fn: (l: Look) => Look) {
  commit(fn(read()));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== LOOK_KEY) return;
    look = null;
    apply(read());
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The current look. During server render (and hydration) this is the default look. */
export function useLook(): Look {
  return useSyncExternalStore(subscribe, read, () => SERVER_LOOK);
}

function forgetPhoto(cover: Cover | undefined) {
  if (cover?.kind === "photo") void deletePhoto(cover.id);
}

export const lookActions = {
  /** Crossfades the whole workspace into the new palette where the browser supports it. */
  setTheme(theme: ThemeId) {
    const go = () => update((l) => ({ ...l, theme }));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ("startViewTransition" in document && !reduce) document.startViewTransition(go);
    else go();
  },
  setFont(font: FontId) {
    update((l) => ({ ...l, font }));
  },
  setPaperTone(paperId: PaperId, tone: ToneId) {
    update((l) => ({ ...l, paperTones: { ...l.paperTones, [paperId]: tone } }));
  },
  setIcon(key: LookKey, emoji: string) {
    update((l) => ({ ...l, icons: { ...l.icons, [key]: cleanIcon(emoji) } }));
  },
  resetIcon(key: LookKey) {
    update((l) => {
      const icons = { ...l.icons };
      delete icons[key];
      return { ...l, icons };
    });
  },
  setCover(key: LookKey, cover: Cover) {
    update((l) => {
      const prev = l.covers[key];
      if (prev?.kind === "photo" && !(cover.kind === "photo" && cover.id === prev.id)) forgetPhoto(prev);
      return { ...l, covers: { ...l.covers, [key]: cover } };
    });
  },
  resetCover(key: LookKey) {
    update((l) => {
      const covers = { ...l.covers };
      forgetPhoto(covers[key]);
      delete covers[key];
      return { ...l, covers };
    });
  },
  setMotto(motto: string) {
    update((l) => ({ ...l, motto: motto.slice(0, 140) }));
  },
  /** Replace the whole look (from a backup). Photos aren't in backups, so photo covers fall back to their default. */
  replace(input: unknown) {
    const next = sanitizeLook(input);
    for (const [k, c] of Object.entries(next.covers)) if (c.kind === "photo") delete next.covers[k];
    commit(next);
  },
  reset() {
    Object.values(read().covers).forEach(forgetPhoto);
    commit(defaultLook());
  },
  snapshot(): Look {
    return read();
  },
};
