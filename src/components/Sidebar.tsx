"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PAPERS } from "@/content/taxonomy";
import { iconFor, THEMES, todayIcon, toneFor, type LookKey } from "@/lib/look";
import { lookActions, useLook } from "@/lib/lookStore";
import { useNow, useStudyStore } from "@/lib/store";
import { BoneIcon, CardsIcon, ChartIcon, ClipboardIcon, NotebookIcon, SettingsIcon, SproutMark, SunIcon } from "./Icons";

export const NAV = [
  { href: "/", label: "Today", icon: SunIcon, key: "page:today" },
  { href: "/tracker", label: "Tracker", icon: ChartIcon, key: "page:tracker", also: ["/topics"] },
  { href: "/quiz", label: "Quiz", icon: ClipboardIcon, key: "page:quiz" },
  { href: "/cards", label: "Cards", icon: CardsIcon, key: "page:cards" },
  { href: "/notebook", label: "Notebook", icon: NotebookIcon, key: "page:notebook" },
] as const;

/** Pages that don't get a phone tab (five is the most that fit); phones reach them from Settings. */
export const MORE = [{ href: "/anatomy", label: "Anatomy", icon: BoneIcon, key: "page:anatomy" }] as const;

export function isActive(pathname: string, item: (typeof NAV)[number] | (typeof MORE)[number]) {
  if (item.href === "/") return pathname === "/";
  return pathname.startsWith(item.href) || ("also" in item && item.also.some((p) => pathname.startsWith(p)));
}

/**
 * Wide screens (iPad landscape, desktop): a workspace sidebar like Notion's,
 * with her page icons, the papers as sub-pages, and the theme a tap away.
 */
export function Sidebar() {
  const pathname = usePathname();
  const look = useLook();
  const store = useStudyStore();
  const now = useNow();
  const name = store?.data.profile.name.trim();
  const hour = now ? new Date(now).getHours() : 9;
  const icon = (key: LookKey) => iconFor(look, key, key === "page:today" ? todayIcon(hour) : "");

  return (
    <aside className="safe-top fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-[color-mix(in_srgb,var(--color-sunken)_55%,var(--color-paper))] lg:flex">
      <Link href="/" className="mx-3 mt-4 flex min-h-12 items-center gap-2.5 rounded-md px-2 text-ink no-underline hover:bg-line/60">
        <SproutMark size={26} />
        <span className="truncate font-display text-[1.0625rem] font-bold tracking-[-0.01em]">{name ? `${name}'s PNLE Buddy` : "PNLE Buddy"}</span>
      </Link>

      <nav aria-label="Main" className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {[...NAV, ...MORE].map((item) => {
            const Icon = item.icon;
            const emoji = icon(item.key);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={isActive(pathname, item) ? "page" : undefined} className="side-link">
                  <span className="side-emoji" aria-hidden="true">
                    {emoji || <Icon size={18} />}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 px-2.5 text-meta font-bold text-ink-muted" id="side-papers">
          Papers
        </p>
        <ul aria-labelledby="side-papers" className="mt-1 space-y-0.5">
          {PAPERS.map((p) => {
            const emoji = iconFor(look, `paper:${p.id}`);
            return (
              <li key={p.id}>
                <Link href={`/tracker#paper-${p.id}`} className="side-link font-normal" data-tone={toneFor(look, p.id)}>
                  <span className="side-emoji" aria-hidden="true">
                    {emoji || <span className="size-2 rounded-full bg-[var(--tone-solid)]" />}
                  </span>
                  <span className="min-w-0 truncate">
                    <span className="font-bold text-[var(--tone-fg)]">{p.id === "int" ? "All" : p.short}</span> {p.id === "int" ? "Integrated" : p.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="safe-bottom border-t border-line px-3 py-3">
        <div className="px-2.5 pb-2">
          <span className="text-meta text-ink-muted" id="side-theme">
            Theme
          </span>
          <div role="radiogroup" aria-labelledby="side-theme" className="-ml-1 mt-1 flex gap-0.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={look.theme === t.id}
                aria-label={t.name}
                title={t.name}
                className="grid size-9 place-items-center rounded-full"
                onClick={() => lookActions.setTheme(t.id)}
              >
                <span
                  className={`block size-6 rounded-full border transition-transform ${look.theme === t.id ? "scale-110 border-ink ring-2 ring-ink/20" : "border-line-strong"}`}
                  style={{ background: `linear-gradient(135deg, ${t.swatch[2]} 0 50%, ${t.swatch[1]} 50% 100%)` }}
                />
              </button>
            ))}
          </div>
        </div>
        <Link href="/settings" aria-current={pathname.startsWith("/settings") ? "page" : undefined} className="side-link">
          <span className="side-emoji" aria-hidden="true">
            <SettingsIcon size={18} />
          </span>
          Settings &amp; look
        </Link>
      </div>
    </aside>
  );
}
