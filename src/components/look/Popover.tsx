"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

/**
 * A small anchored panel (cover and icon pickers). On phones it becomes a
 * sheet along the bottom edge. Escape or a tap outside closes it, and focus
 * returns to the button that opened it (`anchor`; iPad Safari doesn't focus
 * tapped buttons, so document.activeElement can't be trusted for this).
 */
export function Popover({
  open,
  onClose,
  anchor,
  label,
  children,
  className = "",
}: {
  open: boolean;
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Callers pass inline closures; keep the latest without re-running the open effect.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = anchor.current;
    ref.current?.querySelector<HTMLElement>("button, input, [tabindex]")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close.current();
    }
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !opener?.contains(t)) close.current();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      opener?.focus?.();
    };
  }, [open, anchor]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className={`pop safe-bottom fixed inset-x-3 bottom-3 z-50 max-h-[72dvh] overflow-y-auto p-4 sm:absolute sm:inset-x-auto sm:bottom-auto sm:w-[25rem] ${className}`}
    >
      {children}
    </div>
  );
}
