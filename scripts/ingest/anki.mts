/*
 * Converts her Anki decks (.apkg) into PNLE Buddy flashcards.
 *
 * Handles the old (collection.anki2 / anki21, JSON media map) and new
 * (collection.anki21b, zstd + protobuf media map) package formats.
 * Basic notes become front/back cards; cloze notes become one card per cloze
 * number. Image-occlusion notes are skipped because they need their masks.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { zstdDecompressSync } from "node:zlib";

export interface RawCard {
  front: string;
  back: string;
  deck: string;
  /** Plain text of both sides, for topic classification. */
  plain: string;
  frontText: string;
  backText: string;
  source: string;
  media: string[];
}

/* ── Minimal protobuf reader for the anki21b media map ─────────────── */
function readVarint(buf: Buffer, pos: number): [number, number] {
  let result = 0;
  let shift = 0;
  for (;;) {
    const b = buf[pos++];
    result += (b & 0x7f) * 2 ** shift;
    if (!(b & 0x80)) return [result, pos];
    shift += 7;
  }
}
function decodeMediaMap(buf: Buffer): string[] {
  const names: string[] = [];
  let pos = 0;
  while (pos < buf.length) {
    const [tag, p1] = readVarint(buf, pos);
    const [len, p2] = readVarint(buf, p1);
    const entry = buf.subarray(p2, p2 + len);
    pos = p2 + len;
    if (tag >> 3 !== 1) continue;
    let ep = 0;
    let name = "";
    while (ep < entry.length) {
      const [t, q1] = readVarint(entry, ep);
      if ((t & 7) === 2) {
        const [l, q2] = readVarint(entry, q1);
        if (t >> 3 === 1) name = entry.subarray(q2, q2 + l).toString("utf8");
        ep = q2 + l;
      } else {
        ep = readVarint(entry, q1)[1];
      }
    }
    names.push(name);
  }
  return names;
}

/* ── HTML cleanup ───────────────────────────────────────────────────── */
const ALLOWED = new Set(["b", "strong", "i", "em", "u", "br", "div", "p", "ul", "ol", "li", "sub", "sup", "table", "tr", "td", "th", "tbody", "thead"]);

export function sanitize(html: string, mediaMap: Map<string, string>, used: string[]): string {
  let s = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\[sound:[^\]]*\]/g, "");
  s = s.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (tag, name: string, attrs: string) => {
    const n = name.toLowerCase();
    const closing = tag.startsWith("</");
    if (n === "img" && !closing) {
      const src = /src\s*=\s*"([^"]+)"/i.exec(attrs)?.[1] ?? /src\s*=\s*'([^']+)'/i.exec(attrs)?.[1];
      const mapped = src ? mediaMap.get(src) : undefined;
      if (!mapped) return "";
      used.push(mapped);
      return `<img src="/content/media/${mapped}" alt="">`;
    }
    if (n === "span" && /class="cloze/.test(attrs)) return tag; // our own cloze markers
    if (n === "span") return closing ? "</span>" : "<span>";
    if (!ALLOWED.has(n)) return n === "div" || n === "p" ? (closing ? "" : "<br>") : "";
    return closing ? `</${n}>` : `<${n}>`;
  });
  return s
    .replace(/(<br>\s*){3,}/g, "<br><br>")
    .replace(/^(\s|<br>)+|(\s|<br>)+$/g, "")
    .replace(/<span>\s*<\/span>/g, "")
    .trim();
}

export function htmlToText(html: string): string {
  return html
    .replace(/<br>|<\/div>|<\/p>|<\/li>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── Cloze rendering ────────────────────────────────────────────────── */
const CLOZE = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g;

function clozeSides(text: string, n: number): { front: string; back: string } {
  const front = text.replace(CLOZE, (_, num, answer, hint) =>
    Number(num) === n ? `<span class="cloze">[${hint ? hint : "…"}]</span>` : answer,
  );
  const back = text.replace(CLOZE, (_, num, answer) =>
    Number(num) === n ? `<span class="cloze-answer">${answer}</span>` : answer,
  );
  return { front, back };
}

/* ── Package reader ─────────────────────────────────────────────────── */
function prettyDeck(name: string): { path: string; source: string } {
  const parts = name.split(/\x1f|::/).map((p) => p.trim()).filter(Boolean);
  let source = "Anki deck";
  if (parts.length && /\(by [^)]+\)|PNLE/i.test(parts[0])) {
    source = `Anki: ${parts.shift()!.replace(/[^\x20-\x7E()]/g, "").replace(/\s+/g, " ").trim()}`;
  }
  return { path: parts.join(" › "), source };
}

export function readApkg(file: string, mediaOut: string): RawCard[] {
  const dir = mkdtempSync(join(tmpdir(), "apkg-"));
  try {
    execFileSync("unzip", ["-o", "-q", file, "-d", dir]);
    const has = (f: string) => existsSync(join(dir, f));
    const isNew = has("collection.anki21b");
    const dbPath = join(dir, "collection.db");
    if (isNew) writeFileSync(dbPath, zstdDecompressSync(readFileSync(join(dir, "collection.anki21b"))));
    else copyFileSync(join(dir, has("collection.anki21") ? "collection.anki21" : "collection.anki2"), dbPath);

    // media: zip member "N" -> original filename
    const mediaMap = new Map<string, string>(); // original filename -> stored filename
    const memberFor = new Map<string, string>();
    if (has("media")) {
      const raw = readFileSync(join(dir, "media"));
      if (isNew) decodeMediaMap(zstdDecompressSync(raw)).forEach((name, i) => memberFor.set(name, String(i)));
      else for (const [k, v] of Object.entries(JSON.parse(raw.toString("utf8") || "{}") as Record<string, string>)) memberFor.set(v, k);
    }
    for (const [name, member] of memberFor) {
      const p = join(dir, member);
      if (!existsSync(p) || !/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) continue;
      let data: Buffer = readFileSync(p);
      if (isNew) {
        try {
          data = zstdDecompressSync(data);
        } catch {
          /* stored uncompressed */
        }
      }
      const stored = createHash("sha1").update(data).digest("hex").slice(0, 16) + extname(name).toLowerCase();
      mkdirSync(mediaOut, { recursive: true });
      const dest = join(mediaOut, stored);
      if (!existsSync(dest)) writeFileSync(dest, data);
      mediaMap.set(name, stored);
    }

    const db = new DatabaseSync(dbPath, { readOnly: true });
    const tables = new Set((db.prepare("select name from sqlite_master where type='table'").all() as { name: string }[]).map((r) => r.name));
    const noteTypes = new Map<number, string>();
    const decks = new Map<number, string>();
    if (tables.has("notetypes")) {
      for (const r of db.prepare("select id, name from notetypes").all() as { id: number; name: string }[]) noteTypes.set(Number(r.id), r.name);
      for (const r of db.prepare("select id, name from decks").all() as { id: number; name: string }[]) decks.set(Number(r.id), r.name);
    } else {
      const col = db.prepare("select models, decks from col").get() as { models: string; decks: string };
      for (const m of Object.values(JSON.parse(col.models) as Record<string, { id: number; name: string }>)) noteTypes.set(Number(m.id), m.name);
      for (const d of Object.values(JSON.parse(col.decks) as Record<string, { id: number; name: string }>)) decks.set(Number(d.id), d.name);
    }

    const rows = db
      .prepare("select n.flds as flds, n.mid as mid, c.ord as ord, c.did as did from cards c join notes n on n.id = c.nid")
      .all() as { flds: string; mid: number; ord: number; did: number }[];
    const out: RawCard[] = [];
    for (const r of rows) {
      const type = noteTypes.get(Number(r.mid)) ?? "";
      if (/image occlusion/i.test(type)) continue;
      const fields = r.flds.split("\x1f");
      const deckName = decks.get(Number(r.did)) ?? "";
      const { path, source } = prettyDeck(deckName);
      const used: string[] = [];
      let front: string;
      let back: string;
      if (/cloze/i.test(type) || /\{\{c\d+::/.test(fields[0])) {
        const sides = clozeSides(fields[0], Number(r.ord) + 1);
        if (sides.front === sides.back) continue; // no cloze with this number
        const extra = fields.slice(1).filter((f) => f && !/^\d+$/.test(f.trim())).join("<br>");
        front = sanitize(sides.front, mediaMap, used);
        back = sanitize(sides.back + (extra ? `<br><br>${extra}` : ""), mediaMap, used);
      } else {
        const [f0 = "", f1 = "", ...rest] = fields;
        const reversed = /reverse/i.test(type) && Number(r.ord) === 1;
        front = sanitize(reversed ? f1 : f0, mediaMap, used);
        back = sanitize((reversed ? f0 : f1) + (rest.filter(Boolean).length ? "<br><br>" + rest.filter(Boolean).join("<br>") : ""), mediaMap, used);
      }
      const plainFront = htmlToText(front);
      const plainBack = htmlToText(back);
      if ((!plainFront && !front.includes("<img")) || (!plainBack && !back.includes("<img"))) continue;
      out.push({ front, back, deck: path, plain: `${plainFront} ${plainBack}`, frontText: plainFront, backText: plainBack, source, media: used });
    }
    db.close();
    return out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function findDecks(root: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".") || e.name.startsWith("_")) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".apkg")) out.push(p);
    }
  };
  walk(root);
  return out.sort();
}
