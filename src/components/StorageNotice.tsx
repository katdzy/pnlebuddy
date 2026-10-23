"use client";

import Link from "next/link";
import { actions, useStudyStore } from "@/lib/store";

/** Quiet banner shown only when saving fails or old data couldn't be read. */
export function StorageNotice() {
  const store = useStudyStore();
  if (!store || (!store.saveFailed && !store.recovered && !store.migrated)) return null;
  return (
    <div role="status" className="border-b border-line bg-sunken">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-small sm:px-8">
        {store.saveFailed ? (
          <p>
            Your latest progress couldn&apos;t be saved on this device. Storage may be full or turned off
            for this site. Try <Link className="link" href="/settings#backup">downloading a backup</Link> to keep it safe.
          </p>
        ) : store.migrated ? (
          <>
            <p>
              PNLE Buddy now uses your real review questions. Your name, notes and history came along; practice
              on the old demo questions starts fresh.
            </p>
            <button type="button" className="btn btn-quiet min-h-10" onClick={actions.dismissRecovered}>
              Got it
            </button>
          </>
        ) : (
          <>
            <p>
              Some saved data couldn&apos;t be read, so the app started fresh. The old copy was kept in this
              browser&apos;s storage in case it&apos;s needed.
            </p>
            <button type="button" className="btn btn-quiet min-h-10" onClick={actions.dismissRecovered}>
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}
