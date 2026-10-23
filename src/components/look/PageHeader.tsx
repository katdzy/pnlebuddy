"use client";

import { useRef, useState, type ReactNode } from "react";
import { coverFor, DEFAULT_ICONS, iconFor, type LookKey } from "@/lib/look";
import { lookActions, useLook } from "@/lib/lookStore";
import { ImageIcon, SmileIcon } from "../Icons";
import { CoverArt } from "./CoverArt";
import { CoverPicker, EmojiPicker } from "./Pickers";
import { Popover } from "./Popover";

/**
 * The top of every workspace page, Notion-style: a cover banner bleeding to
 * the edges of the column, a page icon half over it, then the title.
 * She can change the cover and the icon right here, the way she would in Notion.
 */
export function PageHeader({
  title,
  iconKey,
  coverKey = iconKey,
  tone = "accent",
  fallbackIcon = "",
  crumbs,
  titleId,
  children,
}: {
  title: ReactNode;
  iconKey: LookKey;
  /** Topics share their paper's cover. */
  coverKey?: LookKey;
  /** "accent" for main pages, a tag colour for paper and topic pages. */
  tone?: string;
  /** Icon when she hasn't chosen one and the key has no default (Today's follows the clock). */
  fallbackIcon?: string;
  crumbs?: ReactNode;
  titleId?: string;
  children?: ReactNode;
}) {
  const look = useLook();
  const cover = coverFor(look, coverKey);
  const icon = iconFor(look, iconKey, fallbackIcon);
  const [panel, setPanel] = useState<"cover" | "icon" | null>(null);
  const coverBtn = useRef<HTMLButtonElement>(null);
  const iconBtn = useRef<HTMLButtonElement>(null);
  const close = () => setPanel(null);
  const hasCover = cover.kind !== "none";

  return (
    <header data-tone={tone}>
      <div className="cover-wrap">
        <CoverArt cover={cover} />
        {crumbs && (
          <nav aria-label="Breadcrumb" className="absolute left-4 top-3 sm:left-8 lg:left-12">
            <div className="cover-tool cursor-default">{crumbs}</div>
          </nav>
        )}
        <div className="cover-tools">
          {!icon && (
            <button ref={iconBtn} type="button" className="cover-tool" aria-expanded={panel === "icon"} onClick={() => setPanel(panel === "icon" ? null : "icon")}>
              <SmileIcon size={16} /> Add icon
            </button>
          )}
          <button ref={coverBtn} type="button" className="cover-tool" aria-expanded={panel === "cover"} onClick={() => setPanel(panel === "cover" ? null : "cover")}>
            <ImageIcon size={16} /> {hasCover ? "Change cover" : "Add cover"}
          </button>
        </div>
        <Popover open={panel === "cover"} onClose={close} anchor={coverBtn} label="Change cover" className="sm:right-4 sm:top-full sm:mt-2">
          <CoverPicker
            current={cover}
            tone={tone}
            onPick={(c) => lookActions.setCover(coverKey, c)}
            onReset={() => lookActions.resetCover(coverKey)}
          />
        </Popover>
        {!icon && (
          <Popover open={panel === "icon"} onClose={close} anchor={iconBtn} label="Choose an icon" className="sm:right-4 sm:top-full sm:mt-2">
            <EmojiPicker
              current={icon}
              onPick={(e) => {
                lookActions.setIcon(iconKey, e);
                close();
              }}
              onRemove={close}
              onReset={iconKey in DEFAULT_ICONS || fallbackIcon ? () => (lookActions.resetIcon(iconKey), close()) : undefined}
            />
          </Popover>
        )}
      </div>

      {icon && (
        <div className="relative">
          <button
            ref={iconBtn}
            type="button"
            aria-label={`Page icon ${icon}. Change icon`}
            aria-expanded={panel === "icon"}
            className={`page-icon -ml-2 ${hasCover ? "" : "no-cover"}`}
            onClick={() => setPanel(panel === "icon" ? null : "icon")}
          >
            <span aria-hidden="true">{icon}</span>
          </button>
          <Popover open={panel === "icon"} onClose={close} anchor={iconBtn} label="Choose an icon" className="sm:left-0 sm:top-full sm:mt-2">
            <EmojiPicker
              current={icon}
              onPick={(e) => {
                lookActions.setIcon(iconKey, e);
                close();
              }}
              onRemove={() => {
                lookActions.setIcon(iconKey, "");
                close();
              }}
              onReset={iconKey in DEFAULT_ICONS || fallbackIcon ? () => (lookActions.resetIcon(iconKey), close()) : undefined}
            />
          </Popover>
        </div>
      )}

      <div className={icon ? "mt-3" : "mt-8"}>
        <h1 id={titleId} className="max-w-4xl text-headline sm:text-display">
          {title}
        </h1>
        {children}
      </div>
    </header>
  );
}
