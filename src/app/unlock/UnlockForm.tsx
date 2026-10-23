"use client";

import { useSearchParams } from "next/navigation";

export function UnlockForm() {
  const params = useSearchParams();
  const error = params.get("error") === "1";
  return (
    <form method="post" action="/api/unlock" className="mt-8">
      <input type="hidden" name="next" value={params.get("next") ?? "/"} />
      <label htmlFor="password" className="font-bold">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        aria-invalid={error || undefined}
        aria-describedby={error ? "unlock-error" : undefined}
        className="field mt-2"
      />
      <p id="unlock-error" role="status" className="mt-2 min-h-6 text-small font-bold text-miss">
        {error ? "That password didn't match. Try again." : ""}
      </p>
      <button type="submit" className="btn btn-primary btn-large mt-2 w-full">
        Open PNLE Buddy
      </button>
      <p className="mt-4 text-meta text-ink-muted">This device stays unlocked for about a year.</p>
    </form>
  );
}
