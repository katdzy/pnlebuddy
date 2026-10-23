"use client";

import { useId, useRef, useState } from "react";
import { PAPERS, type PaperId } from "@/content/taxonomy";
import { FONTS, iconFor, THEMES, TONES, toneFor, type FontId, type ThemeId } from "@/lib/look";
import { lookActions, useLook } from "@/lib/lookStore";
import { EmojiPicker } from "../look/Pickers";
import { Popover } from "../look/Popover";

const FONT_FAMILY: Record<FontId, string> = {
  modern: "var(--font-bricolage)",
  soft: "var(--font-fraunces)",
  rounded: "var(--font-nunito)",
};

/** Theme, heading font, paper colours and icons, motto. The Notion-tracker side of the app. */
export function LookSettings() {
  const look = useLook();
  const id = useId();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <section aria-labelledby={`${id}-look`} className="mt-10">
      <h2 id={`${id}-look`} className="text-title font-bold">
        Look &amp; feel
      </h2>
      <p className="mt-2 max-w-[60ch] text-ink-soft">
        Make it yours. Covers and page icons can also be changed right on each page, the way you would in Notion.
      </p>

      <fieldset className="mt-8">
        <legend className="font-bold">Theme</legend>
        <div role="radiogroup" aria-label="Theme" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => (
            <ThemeOption key={t.id} theme={t} selected={look.theme === t.id} />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-10">
        <legend className="font-bold">Heading font</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {FONTS.map((f) => {
            const on = look.font === f.id;
            return (
              <label
                key={f.id}
                className={`flex cursor-pointer items-center gap-4 rounded-panel border p-4 transition-colors ${on ? "border-accent-deep bg-accent-wash" : "border-line bg-surface hover:border-line-strong"}`}
              >
                <input type="radio" name={`${id}-font`} className="sr-only" checked={on} onChange={() => lookActions.setFont(f.id)} />
                <span aria-hidden="true" className="text-[2rem] font-bold leading-none" style={{ fontFamily: FONT_FAMILY[f.id] }}>
                  Aa
                </span>
                <span>
                  <span className="block font-bold">{f.name}</span>
                  <span className="block text-meta text-ink-muted">{f.note}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-10">
        <legend className="font-bold">Paper colours and icons</legend>
        <p className="mt-1 text-small text-ink-soft">Each paper keeps its colour everywhere: the tracker, quizzes, flashcards and tags.</p>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {PAPERS.map((p) => (
            <PaperLook key={p.id} paperId={p.id} />
          ))}
        </ul>
      </fieldset>

      <MottoSetting current={look.motto} />

      <div className="mt-8">
        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-small text-ink-soft">Back to Rosewater, default icons, covers and colours? Your study data stays.</p>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                lookActions.reset();
                setConfirmReset(false);
              }}
            >
              Reset the look
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-quiet -ml-3" onClick={() => setConfirmReset(true)}>
            Reset the look…
          </button>
        )}
      </div>
    </section>
  );
}

/** A tiny page drawn in that theme's own colours, so she can see it before choosing. */
function ThemeOption({ theme, selected }: { theme: (typeof THEMES)[number]; selected: boolean }) {
  const [ground, deep, wash] = theme.swatch;
  const dark = theme.id === "night";
  const ink = dark ? "#eeeaf2" : "#2a2230";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`overflow-hidden rounded-panel border text-left transition-[border-color,box-shadow] ${selected ? "border-accent-deep shadow-[0_0_0_2px_var(--color-accent-deep)]" : "border-line hover:border-line-strong"}`}
      onClick={() => lookActions.setTheme(theme.id as ThemeId)}
    >
      <span aria-hidden="true" className="block" style={{ background: ground }}>
        <span
          className="block h-10"
          style={{
            backgroundColor: wash,
            backgroundImage: `repeating-linear-gradient(90deg, ${deep}33 0 10px, transparent 10px 20px), repeating-linear-gradient(0deg, ${deep}33 0 10px, transparent 10px 20px)`,
          }}
        />
        <span className="block px-3 pb-3 pt-2">
          <span className="block h-2.5 w-2/3 rounded-full" style={{ background: ink, opacity: 0.85 }} />
          <span className="mt-2 flex gap-1.5">
            <span className="h-2 w-8 rounded" style={{ background: deep }} />
            <span className="h-2 w-6 rounded" style={{ background: wash, outline: `1px solid ${deep}44` }} />
          </span>
        </span>
      </span>
      <span className="block border-t border-line bg-surface px-3 py-2">
        <span className="block font-bold">{theme.name}</span>
        <span className="block text-meta text-ink-muted">{theme.note}</span>
      </span>
    </button>
  );
}

function PaperLook({ paperId }: { paperId: PaperId }) {
  const look = useLook();
  const paper = PAPERS.find((p) => p.id === paperId)!;
  const tone = toneFor(look, paperId);
  const icon = iconFor(look, `paper:${paperId}`);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const label = paper.id === "int" ? "Integrated" : `${paper.short} ${paper.name}`;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3" data-tone={tone}>
      <div className="relative">
        <button
          ref={btn}
          type="button"
          aria-label={`${label} icon${icon ? ` ${icon}` : ""}. Change icon`}
          aria-expanded={open}
          className="grid size-12 place-items-center rounded-md border border-line bg-surface text-[1.5rem] hover:bg-sunken"
          onClick={() => setOpen(!open)}
        >
          {icon || <span className="text-meta text-ink-muted">+</span>}
        </button>
        <Popover open={open} onClose={() => setOpen(false)} anchor={btn} label={`Icon for ${label}`} className="sm:left-0 sm:top-full sm:mt-2">
          <EmojiPicker
            current={icon}
            onPick={(e) => {
              lookActions.setIcon(`paper:${paperId}`, e);
              setOpen(false);
            }}
            onRemove={() => {
              lookActions.setIcon(`paper:${paperId}`, "");
              setOpen(false);
            }}
            onReset={() => {
              lookActions.resetIcon(`paper:${paperId}`);
              setOpen(false);
            }}
          />
        </Popover>
      </div>
      <span className="min-w-0 flex-1 basis-40">
        <span className="tag tag-dot">{paper.short}</span>
        <span className="ml-2 font-bold">{paper.id === "int" ? "Integrated" : paper.name}</span>
      </span>
      <div role="radiogroup" aria-label={`Colour for ${label}`} className="flex flex-wrap gap-0.5">
        {TONES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tone === t}
            aria-label={t}
            title={t}
            data-tone={t}
            className="grid size-9 place-items-center rounded-full"
            onClick={() => lookActions.setPaperTone(paperId, t)}
          >
            <span
              className={`block size-6 rounded-full border-2 transition-transform ${tone === t ? "scale-110 border-ink" : "border-transparent"}`}
              style={{ background: "var(--tone-solid)" }}
            />
          </button>
        ))}
      </div>
    </li>
  );
}

function MottoSetting({ current }: { current: string }) {
  const id = useId();
  const [value, setValue] = useState(current);
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="mt-10 max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        lookActions.setMotto(value.trim());
        setSaved(true);
      }}
    >
      <label htmlFor={id} className="font-bold">
        Motto
      </label>
      <p className="text-small text-ink-soft">Shown on Today, under the greeting. Leave it blank to hide it.</p>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          className="field"
          maxLength={140}
          value={value}
          placeholder="Future RN. Kaya mo 'to."
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
        />
        <button type="submit" className="btn btn-secondary shrink-0">
          Save
        </button>
      </div>
      <p role="status" className="mt-2 min-h-6 text-small font-bold text-accent-ink">
        {saved ? "Saved." : ""}
      </p>
    </form>
  );
}
