"use client";

import { SESSION_SIZES } from "@/lib/scheduler";

export function DurationPicker({
  value,
  onChange,
  available,
}: {
  value: number;
  onChange: (minutes: number) => void;
  /** Total questions the bank can offer, to show honest counts. */
  available: number;
}) {
  return (
    <fieldset>
      <legend className="text-small font-semibold text-ink">How much time do you have?</legend>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {SESSION_SIZES.map((s) => {
          const count = Math.min(s.questions, available);
          const checked = value === s.minutes;
          return (
            <label
              key={s.minutes}
              className={`relative flex min-h-[72px] cursor-pointer flex-col justify-center rounded-control border px-3 py-3 transition-colors sm:px-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                checked
                  ? "border-accent-deep bg-accent-wash text-accent-ink ring-1 ring-accent-deep"
                  : "border-line-strong bg-surface text-ink hover:bg-sunken"
              }`}
            >
              <input
                type="radio"
                name="session-length"
                value={s.minutes}
                checked={checked}
                onChange={() => onChange(s.minutes)}
                className="sr-only"
              />
              <span className="text-lead leading-tight"><span className="figure text-title">{s.minutes}</span> min</span>
              <span className={`text-meta ${checked ? "text-accent-ink" : "text-ink-muted"}`}>
                {count} {count === 1 ? "question" : "questions"}
              </span>
              {checked && (
                <span aria-hidden="true" className="absolute right-3 top-3 hidden size-2 rounded-full bg-accent-deep sm:block" />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
