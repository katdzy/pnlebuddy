import type { Metadata } from "next";
import { Suspense } from "react";
import { SproutMark } from "@/components/Icons";
import { UnlockForm } from "./UnlockForm";

export const metadata: Metadata = { title: "Unlock" };

/** The one page outside the password gate. Her saved theme still applies (set in the root layout). */
export default function UnlockPage() {
  return (
    <div className="page-main min-h-dvh" data-tone="accent">
      <div className="cover-wrap !mt-0 !ml-0 !w-full">
        <div className="cover cover-gingham" />
      </div>
      <main className="mx-auto w-full max-w-md px-4 pb-16 sm:px-8">
        <div className="page-icon -ml-2" aria-hidden="true">
          <SproutMark size={64} />
        </div>
        <h1 className="mt-3 text-headline sm:text-display">PNLE Buddy</h1>
        <p className="mt-2 text-lead text-ink-soft">This study space is private. Enter the password to open it.</p>
        <Suspense>
          <UnlockForm />
        </Suspense>
      </main>
    </div>
  );
}
