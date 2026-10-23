"use client";

import { useRef, useState } from "react";
import { PATTERNS, type Cover } from "@/lib/look";
import { savePhoto } from "@/lib/media";
import { CoverArt } from "./CoverArt";

const EMOJI_GROUPS: { label: string; items: string[] }[] = [
  { label: "Study", items: ["📚", "📖", "📝", "✏️", "🖍️", "📓", "📒", "📋", "🗂️", "📌", "🔖", "🧠", "💡", "🎯", "⏳", "☕", "🧋", "🎧"] },
  { label: "Nursing", items: ["🩺", "💉", "💊", "🩹", "🩻", "🫀", "🫁", "🦴", "🧬", "🦠", "🌡️", "🏥", "🚑", "👩‍⚕️", "🤱", "🍼", "👶", "🧓", "🏡", "🧪", "🩸", "🦷", "👁️", "🧫"] },
  { label: "Cute", items: ["🌸", "🌷", "🌼", "🌻", "🍀", "🌿", "🌙", "⭐", "✨", "🌈", "🎀", "💖", "🤍", "🧸", "🐣", "🐱", "🦋", "🍓", "🥭", "🍡", "🍰", "☁️", "🕊️", "🇵🇭"] },
];

/** Notion-style icon picker: a grid of emoji, a field for any other emoji, and remove/reset. */
export function EmojiPicker({
  current,
  onPick,
  onRemove,
  onReset,
}: {
  current: string;
  onPick: (emoji: string) => void;
  onRemove: () => void;
  onReset?: () => void;
}) {
  const [custom, setCustom] = useState("");
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-small font-bold">Choose an icon</p>
        <div className="flex gap-1">
          {onReset && (
            <button type="button" className="btn btn-quiet min-h-9 px-2 text-meta" onClick={onReset}>
              Default
            </button>
          )}
          <button type="button" className="btn btn-quiet min-h-9 px-2 text-meta" onClick={onRemove} disabled={!current}>
            Remove
          </button>
        </div>
      </div>
      {EMOJI_GROUPS.map((g) => (
        <fieldset key={g.label} className="mt-3">
          <legend className="text-meta text-ink-muted">{g.label}</legend>
          <div className="mt-1 grid grid-cols-8 gap-0.5">
            {g.items.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={e}
                aria-pressed={current === e}
                className={`grid aspect-square place-items-center rounded-md text-[1.375rem] transition-colors hover:bg-sunken ${current === e ? "bg-accent-wash" : ""}`}
                onClick={() => onPick(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (custom.trim()) onPick(custom);
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Any emoji</span>
          <input className="field min-h-11" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or type any emoji" />
        </label>
        <button type="submit" className="btn btn-secondary min-h-11" disabled={!custom.trim()}>
          Use
        </button>
      </form>
    </div>
  );
}

/** Cover picker: theme-coloured patterns, her own photo, or no cover. */
export function CoverPicker({
  current,
  tone,
  onPick,
  onReset,
}: {
  current: Cover;
  tone: string;
  onPick: (cover: Cover) => void;
  onReset: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function upload(file: File | undefined) {
    if (!file) return;
    setStatus("saving");
    try {
      const id = await savePhoto(file);
      onPick({ kind: "photo", id });
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div data-tone={tone}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-small font-bold">Cover</p>
        <div className="flex gap-1">
          <button type="button" className="btn btn-quiet min-h-9 px-2 text-meta" onClick={onReset}>
            Default
          </button>
          <button type="button" className="btn btn-quiet min-h-9 px-2 text-meta" onClick={() => onPick({ kind: "none" })} disabled={current.kind === "none"}>
            Remove
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PATTERNS.map((p) => {
          const on = current.kind === "pattern" && current.pattern === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              className={`group overflow-hidden rounded-lg border text-left transition-colors ${on ? "border-accent-deep ring-2 ring-accent-deep" : "border-line hover:border-line-strong"}`}
              onClick={() => onPick({ kind: "pattern", pattern: p.id })}
            >
              <CoverArt cover={{ kind: "pattern", pattern: p.id }} className="!h-12" />
              <span className="block px-2 py-1 text-meta font-semibold text-ink-soft">{p.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <button type="button" className="btn btn-secondary min-h-11 w-full" onClick={() => fileRef.current?.click()} disabled={status === "saving"}>
          {status === "saving" ? "Saving photo…" : "Use a photo from this iPad"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => upload(e.target.files?.[0])} />
        <p role="status" className={`mt-2 text-meta ${status === "error" ? "text-miss" : "text-ink-muted"}`}>
          {status === "error" ? "That image couldn't be opened. Try a JPEG or PNG." : "Photos stay on this device and aren't included in backups."}
        </p>
      </div>
    </div>
  );
}
