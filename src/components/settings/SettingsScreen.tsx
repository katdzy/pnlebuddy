"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { PAPERS, type PaperId } from "@/content/taxonomy";
import { formatDate } from "@/lib/copy";
import { actions } from "@/lib/store";
import type { StudyData } from "@/lib/types";
import { WithData, type Ready } from "../Gate";
import { PageHeader } from "../look/PageHeader";
import { LookSettings } from "./LookSettings";

export function SettingsScreen() {
  return <WithData label="Opening settings">{(ready) => <Settings {...ready} />}</WithData>;
}

function Settings({ data, content }: Ready) {
  const m = content.manifest;
  const totalQ = m?.questionFiles.reduce((n, f) => n + f.count, 0) ?? 0;
  const totalC = m?.cardFiles.reduce((n, f) => n + f.count, 0) ?? 0;
  return (
    <div>
      <PageHeader iconKey="page:settings" title="Settings" />
      <LookSettings />
      <div className="mt-16 grid gap-12 border-t border-line pt-12 lg:grid-cols-2">
        <NameSetting current={data.profile.name} />
        <StudySettings data={data} />
        <Backup />
        <section aria-labelledby="about-content">
          <h2 id="about-content" className="text-lead font-bold">
            About the content
          </h2>
          <p className="mt-2 max-w-[60ch] text-ink-soft">
            {totalQ.toLocaleString()} questions and {totalC.toLocaleString()} flashcards, imported from your own review
            folder{m ? ` on ${formatDate(Date.parse(m.generatedAt))}` : ""}. Answer keys are as printed in each source and
            haven&apos;t been checked by a clinician, so if a key looks wrong, trust your references.
          </p>
          {m && (
            <ul className="mt-4 divide-y divide-line border-y border-line text-small">
              {m.sources.slice(0, 14).map((s) => (
                <li key={s.label} className="flex justify-between gap-4 py-2">
                  <span>{s.label}</span>
                  <span className="tabular shrink-0 text-ink-muted">
                    {s.questions ? `${s.questions.toLocaleString()} q` : `${s.cards.toLocaleString()} cards`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="about-anatomy">
          <h2 id="about-anatomy" className="text-lead font-bold">
            3D anatomy
          </h2>
          <p className="mt-2 max-w-[60ch] text-ink-soft">
            A body you can turn and tap, linked to your A&amp;P book&apos;s glossary.{" "}
            <Link href="/anatomy">Open Anatomy</Link> · <Link href="/anatomy/credits">Credits for the 3D models</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function StudySettings({ data }: { data: StudyData }) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-study`}>
      <h2 id={`${id}-study`} className="text-lead font-bold">
        Study preferences
      </h2>
      <label className="mt-4 block max-w-md">
        <span className="font-semibold">New flashcards per day</span>
        <span className="block text-small text-ink-soft">Reviews of cards you&apos;ve already seen are never limited.</span>
        <select
          className="field mt-2"
          value={data.profile.newCardsPerDay}
          onChange={(e) => actions.setNewCardsPerDay(Number(e.target.value))}
        >
          {[0, 10, 20, 30, 50, 80, 120].map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "None (reviews only)" : n}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-6 block max-w-md">
        <span className="font-semibold">Today&apos;s practice focus</span>
        <span className="block text-small text-ink-soft">Keep Today&apos;s next step on one paper while you review it.</span>
        <select
          className="field mt-2"
          value={data.profile.focusPaper ?? ""}
          onChange={(e) => actions.setFocusPaper((e.target.value || null) as PaperId | null)}
        >
          <option value="">All papers</option>
          {PAPERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.short}: {p.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function NameSetting({ current }: { current: string }) {
  const [value, setValue] = useState(current);
  const [saved, setSaved] = useState(false);
  const id = useId();

  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-lead font-bold">
        Your name
      </h2>
      <p className="mt-2 text-ink-soft">Used only for the greeting. Leave it blank if you prefer.</p>
      <form
        className="mt-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          actions.setName(value.trim());
          setSaved(true);
        }}
      >
        <label htmlFor={id} className="sr-only">
          Your name
        </label>
        <input
          id={id}
          className="field"
          value={value}
          maxLength={40}
          autoComplete="given-name"
          placeholder="First name"
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
        />
        <button type="submit" className="btn btn-secondary shrink-0">
          Save
        </button>
      </form>
      <p role="status" className="mt-2 min-h-6 text-small font-bold text-accent-ink">
        {saved ? "Saved." : ""}
      </p>
    </section>
  );
}

function Backup() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function download() {
    const blob = new Blob([actions.exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnle-buddy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ tone: "ok", text: "Backup downloaded. Keep it somewhere safe, like Files or iCloud Drive." });
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 20_000_000) {
      setMessage({ tone: "error", text: "That file is too large to be a PNLE Buddy backup." });
      return;
    }
    setPendingImport(await file.text());
    setMessage(null);
  }

  function confirmImport() {
    if (!pendingImport) return;
    const ok = actions.importBackup(pendingImport);
    setPendingImport(null);
    if (fileRef.current) fileRef.current.value = "";
    setMessage(
      ok
        ? { tone: "ok", text: "Backup restored." }
        : { tone: "error", text: "That file doesn't look like a PNLE Buddy backup, so nothing was changed." },
    );
  }

  return (
    <section id="backup" aria-labelledby="backup-title" className="scroll-mt-8">
      <h2 id="backup-title" className="text-lead font-bold">
        Keep your progress safe
      </h2>
      <p className="mt-2 max-w-[60ch] text-ink-soft">
        Everything is stored on this device only. A backup file lets you restore it if the browser
        clears its storage, or move to another device.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary" onClick={download}>
          Download backup
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
          Restore from file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => chooseFile(e.target.files?.[0])}
        />
      </div>

      {pendingImport && (
        <div className="mt-4 rounded-control border border-line-strong bg-surface p-4">
          <p className="text-small">
            Restoring replaces everything currently on this device with the backup. Continue?
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-primary" onClick={confirmImport}>
              Restore backup
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                setPendingImport(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p
        role="status"
        className={`mt-3 min-h-6 text-small ${message?.tone === "error" ? "text-miss" : "text-accent-ink"}`}
      >
        {message?.text ?? ""}
      </p>

      <div className="mt-6 border-t border-line pt-6">
        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-small text-ink-soft">This erases all answers, notes and saved questions on this device.</p>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary text-miss"
              onClick={() => {
                actions.resetAll();
                setConfirmReset(false);
                setMessage({ tone: "ok", text: "Everything has been cleared." });
              }}
            >
              Erase everything
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-quiet -ml-3" onClick={() => setConfirmReset(true)}>
            Start over…
          </button>
        )}
      </div>
    </section>
  );
}
