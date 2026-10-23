"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsIcon, SproutMark } from "./Icons";
import { isActive, MORE, NAV } from "./Sidebar";

/** Narrower screens (iPad portrait, phones): a slim top bar, with tabs along the bottom on phones. */
export function AppHeader() {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/settings");
  return (
    <>
      <header className="safe-top relative z-20 border-b border-line bg-paper lg:hidden">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 rounded-md text-ink no-underline">
            <SproutMark size={26} />
            <span className="whitespace-nowrap font-display text-[1.1875rem] font-bold tracking-[-0.01em]">PNLE Buddy</span>
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {[...NAV, ...MORE].map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-11 items-center rounded-md px-2.5 text-body font-bold no-underline transition-colors ${
                        active ? "bg-accent-wash text-accent-ink" : "text-ink-soft hover:bg-sunken hover:text-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <Link
            href="/settings"
            aria-label="Settings and look"
            aria-current={settingsActive ? "page" : undefined}
            className={`grid size-11 place-items-center rounded-md no-underline transition-colors ${
              settingsActive ? "bg-accent-wash text-accent-ink" : "text-ink-soft hover:bg-sunken hover:text-ink"
            }`}
          >
            <SettingsIcon size={22} />
          </Link>
        </div>
      </header>

      {/* Phones: tabs along the bottom, within thumb reach. */}
      <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-md md:hidden">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.75rem] font-bold no-underline ${
                    active ? "text-accent-ink" : "text-ink-muted"
                  }`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors duration-200 ${active ? "bg-accent-wash" : ""}`}>
                    <Icon size={22} />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
