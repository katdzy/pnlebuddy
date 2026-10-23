"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ANAPHY_TOPICS } from "@/content/taxonomy";
import { PageHeader } from "../look/PageHeader";
import { Placeholder } from "../Placeholder";
import { useAnatomyManifest, useShowFps } from "./manifest";
import type { Picked } from "./types";

// three.js only ever loads on this page, and only in the browser.
const Viewer = dynamic(() => import("./Viewer"), { ssr: false, loading: () => <div className="anatomy-stage" /> });

/** The 3D body (docs/ANATOMY_3D_PLAN.md): body systems to turn on, tap a structure to name it. */
export function AnatomyScreen() {
  const load = useAnatomyManifest();
  const showFps = useShowFps();
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);

  if (load.status === "loading") return <Placeholder label="Opening the 3D body" />;
  if (load.status === "missing") return <NoModels />;

  const { order, systems: byId } = load.manifest;
  const systems = order.map((id) => [id, byId[id]] as const);
  // Only the skeleton at first: each system downloads when its chip is turned on.
  const defaults = order.filter((id) => byId[id].onByDefault);
  const visible = chosen ?? defaults;
  const toggle = (id: string) => {
    // Functional, so quick taps on several chips all count. At least one system stays on.
    setChosen((prev) => {
      const cur = prev ?? defaults;
      const next = cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id];
      return next.length ? next : cur;
    });
    if (picked?.system === id && visible.includes(id)) setPicked(null);
  };
  const pickedSystem = picked ? load.manifest.systems[picked.system] : null;
  const topic = pickedSystem ? ANAPHY_TOPICS.find((t) => t.id === pickedSystem.topicId) : null;

  return (
    <div>
      <PageHeader iconKey="page:anatomy" title="Anatomy" />
      <p className="mt-2 max-w-[62ch] text-ink-soft">
        Turn with one finger, pinch to zoom, two fingers to move. Tap a structure to see its name; tap empty space to see
        everything again.
      </p>

      <div role="group" aria-label="Systems" className="mt-6 flex flex-wrap gap-2">
        {systems.map(([id, s]) => (
          <button key={id} type="button" className={`chip ${visible.includes(id) ? "chip-on" : ""}`} aria-pressed={visible.includes(id)} onClick={() => toggle(id)}>
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: `var(${s.color})` }} />
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Viewer
          systems={systems.map(([id, s]) => ({ id, label: s.label, url: `/anatomy/${s.file}`, color: s.color, veinColor: s.veinColor }))}
          visible={visible}
          picked={picked}
          onPick={setPicked}
          showFps={showFps}
        >
          <div aria-live="polite" className="pointer-events-none absolute inset-x-3 top-3">
            {picked && pickedSystem && (
              <div className="anatomy-card pointer-events-auto">
                <p className="text-meta font-semibold text-ink-muted">{pickedSystem.label}</p>
                <h2 className="mt-0.5 font-display text-title font-bold leading-tight">{picked.name}</h2>
                {topic && (
                  <p className="mt-2 text-small text-ink-soft">
                    In your A&amp;P book: chapter{topic.bookChapters.length > 1 ? "s" : ""} {chapterRange(topic.bookChapters)} ·{" "}
                    <Link href={`/topics/${topic.id}`}>topic page</Link>
                  </p>
                )}
              </div>
            )}
          </div>
        </Viewer>
      </div>

      <p className="mt-8 max-w-[62ch] text-meta text-ink-muted">
        3D models: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.{" "}
        <Link href="/anatomy/credits">Credits and what the models leave out</Link>
      </p>
    </div>
  );
}

function chapterRange(ch: number[]): string {
  return ch.length > 1 && ch[ch.length - 1] - ch[0] === ch.length - 1 ? `${ch[0]}–${ch[ch.length - 1]}` : ch.join(", ");
}

function NoModels() {
  return (
    <div className="max-w-[62ch] pt-8">
      <h1 className="text-headline font-bold">No 3D models yet</h1>
      <p className="mt-3 text-lead text-ink-soft">The models are built on the Mac from BodyParts3D. Run this in the project folder, then reload:</p>
      <pre className="mt-4 overflow-x-auto rounded-control bg-sunken p-4 text-small">npm run anatomy</pre>
      <p className="mt-4 text-ink-soft">
        It reads <code>~/Fel Reviewers/anatomy-src</code>. Set <code>ANATOMY_SRC</code> if the folder is somewhere else.
      </p>
    </div>
  );
}
