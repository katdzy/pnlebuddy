/*
 * How the app looks: theme, heading font, a colour per paper, page icons,
 * covers and her motto. Purely cosmetic, so it lives under its own small
 * localStorage key (read before first paint to avoid a flash of the wrong
 * theme) instead of inside StudyData. Backups carry it along as `look`.
 *
 * Pure and React-free so it can be tested; the client store is lookStore.ts.
 */

import { PAPERS, type PaperId } from "@/content/taxonomy";

export const LOOK_KEY = "pnlebuddy:look";

export const THEMES = [
  { id: "rosewater", name: "Rosewater", note: "Blush and plum, the original", swatch: ["#faf5f3", "#9c4f6b", "#f6e5eb"] },
  { id: "matcha", name: "Matcha", note: "Soft green tea", swatch: ["#f4f6ef", "#4a7340", "#e3eed9"] },
  { id: "ube", name: "Ube", note: "Purple yam halaya", swatch: ["#f7f4fa", "#6f4fa0", "#ede4f7"] },
  { id: "mango", name: "Mango float", note: "Graham and ripe mango", swatch: ["#fbf7ee", "#9a5a0c", "#fbeccb"] },
  { id: "sky", name: "Blueberry", note: "Cool and clear", swatch: ["#f3f6fa", "#3b67a0", "#e1ecf8"] },
  { id: "night", name: "Night shift", note: "Dark, for late study", swatch: ["#17161c", "#e8a7bd", "#2a2933"] },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];

export const FONTS = [
  { id: "modern", name: "Modern", note: "Bricolage Grotesque" },
  { id: "soft", name: "Soft serif", note: "Fraunces, the original" },
  { id: "rounded", name: "Rounded", note: "Nunito" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];

/** Tag colours, Notion-style. Each theme defines a wash, an ink and a solid for every tone. */
export const TONES = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const;
export type ToneId = (typeof TONES)[number];

export const PATTERNS = [
  { id: "gingham", name: "Gingham" },
  { id: "dots", name: "Polka dots" },
  { id: "stripes", name: "Candy stripe" },
  { id: "grid", name: "Graph paper" },
  { id: "lined", name: "Lined paper" },
  { id: "waves", name: "Waves" },
  { id: "flowers", name: "Sampaguita" },
  { id: "plain", name: "Plain" },
] as const;
export type PatternId = (typeof PATTERNS)[number]["id"];

export type Cover = { kind: "pattern"; pattern: PatternId } | { kind: "photo"; id: string } | { kind: "none" };

export const PAGE_SLOTS = ["today", "tracker", "quiz", "cards", "notebook", "settings"] as const;
export type PageSlot = (typeof PAGE_SLOTS)[number];

/**
 * Keys for icons and covers:
 *   page:<slot>     a main screen
 *   paper:<id>      a paper (also the cover of every topic page in it)
 *   topic:<id>      a topic (icon only)
 */
export type LookKey = `page:${PageSlot}` | `paper:${PaperId}` | `topic:${string}`;

export interface Look {
  version: 1;
  theme: ThemeId;
  font: FontId;
  paperTones: Record<PaperId, ToneId>;
  /** Emoji per key. A missing key falls back to the default; "" means no icon. */
  icons: Record<string, string>;
  /** Cover per key. A missing key falls back to the default. */
  covers: Record<string, Cover>;
  motto: string;
}

export const DEFAULT_TONES: Record<PaperId, ToneId> = {
  np1: "green",
  np2: "pink",
  np3: "orange",
  np4: "yellow",
  np5: "blue",
  int: "purple",
};

export const DEFAULT_ICONS: Record<string, string> = {
  "page:tracker": "📋",
  "page:quiz": "✏️",
  "page:cards": "🗂️",
  "page:notebook": "📓",
  "page:settings": "🎀",
  "paper:np1": "🏡",
  "paper:np2": "🍼",
  "paper:np3": "🫁",
  "paper:np4": "🩺",
  "paper:np5": "🧠",
  "paper:int": "💊",
};

export const DEFAULT_COVERS: Record<string, Cover> = {
  "page:today": { kind: "pattern", pattern: "gingham" },
  "page:tracker": { kind: "pattern", pattern: "grid" },
  "page:quiz": { kind: "pattern", pattern: "stripes" },
  "page:cards": { kind: "pattern", pattern: "dots" },
  "page:notebook": { kind: "pattern", pattern: "lined" },
  "page:settings": { kind: "pattern", pattern: "flowers" },
};
const DEFAULT_PAPER_COVER: Cover = { kind: "pattern", pattern: "waves" };

export function defaultLook(): Look {
  return { version: 1, theme: "rosewater", font: "modern", paperTones: { ...DEFAULT_TONES }, icons: {}, covers: {}, motto: "" };
}

/** Today's icon follows the time of day unless she picked one. */
export function todayIcon(hour: number): string {
  if (hour >= 5 && hour < 12) return "🌤️";
  if (hour >= 12 && hour < 18) return "☀️";
  return "🌙";
}

export function iconFor(look: Look, key: LookKey, fallback = ""): string {
  if (key in look.icons) return look.icons[key];
  return DEFAULT_ICONS[key] ?? fallback;
}

export function coverFor(look: Look, key: LookKey): Cover {
  if (key in look.covers) return look.covers[key];
  if (key.startsWith("paper:")) return DEFAULT_PAPER_COVER;
  return DEFAULT_COVERS[key] ?? { kind: "none" };
}

export function toneFor(look: Look, paperId: PaperId): ToneId {
  return look.paperTones[paperId] ?? DEFAULT_TONES[paperId];
}

/* ── Validation ─────────────────────────────────────────────────────────── */

type Unknown = Record<string, unknown>;
const isObj = (v: unknown): v is Unknown => typeof v === "object" && v !== null && !Array.isArray(v);
const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));
const FONT_IDS = new Set<string>(FONTS.map((f) => f.id));
const TONE_IDS = new Set<string>(TONES);
const PATTERN_IDS = new Set<string>(PATTERNS.map((p) => p.id));
const KEY_RE = /^(page|paper|topic):[a-z0-9-]{1,64}$/;

/** One emoji (or a short symbol cluster). Keeps the field from holding a paragraph. */
export function cleanIcon(v: string): string {
  const segs = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(v.trim())];
  return segs.length ? segs[0].segment.slice(0, 16) : "";
}

function sanitizeCover(v: unknown): Cover | null {
  if (!isObj(v)) return null;
  if (v.kind === "none") return { kind: "none" };
  if (v.kind === "pattern" && typeof v.pattern === "string" && PATTERN_IDS.has(v.pattern)) return { kind: "pattern", pattern: v.pattern as PatternId };
  if (v.kind === "photo" && typeof v.id === "string" && /^[\w:-]{1,80}$/.test(v.id)) return { kind: "photo", id: v.id };
  return null;
}

export function sanitizeLook(input: unknown): Look {
  const base = defaultLook();
  if (!isObj(input)) return base;
  const paperTones = { ...base.paperTones };
  if (isObj(input.paperTones)) {
    for (const p of PAPERS) {
      const t = input.paperTones[p.id];
      if (typeof t === "string" && TONE_IDS.has(t)) paperTones[p.id] = t as ToneId;
    }
  }
  const icons: Record<string, string> = {};
  if (isObj(input.icons)) {
    for (const [k, v] of Object.entries(input.icons)) if (KEY_RE.test(k) && typeof v === "string") icons[k] = cleanIcon(v);
  }
  const covers: Record<string, Cover> = {};
  if (isObj(input.covers)) {
    for (const [k, v] of Object.entries(input.covers)) {
      const c = KEY_RE.test(k) ? sanitizeCover(v) : null;
      if (c) covers[k] = c;
    }
  }
  return {
    version: 1,
    theme: typeof input.theme === "string" && THEME_IDS.has(input.theme) ? (input.theme as ThemeId) : base.theme,
    font: typeof input.font === "string" && FONT_IDS.has(input.font) ? (input.font as FontId) : base.font,
    paperTones,
    icons,
    covers,
    motto: typeof input.motto === "string" ? input.motto.slice(0, 140) : "",
  };
}

/**
 * Runs inline in <head> before first paint: applies the saved theme and font
 * so the page never flashes the default palette. Kept tiny and dependency-free.
 */
export const LOOK_BOOT_SCRIPT = `try{var l=JSON.parse(localStorage.getItem(${JSON.stringify(LOOK_KEY)})||"{}"),d=document.documentElement;if(typeof l.theme==="string")d.dataset.theme=l.theme;if(typeof l.font==="string")d.dataset.font=l.font}catch(e){}`;
