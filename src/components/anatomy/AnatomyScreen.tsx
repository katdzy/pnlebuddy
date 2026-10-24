"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { anatomyQuery, parseAnatomyUrl, type GlossaryTerm, type Structure } from "@/lib/anatomy";
import { PageHeader } from "../look/PageHeader";
import { Placeholder } from "../Placeholder";
import { useAnatomyData, useGlossary, useInitialSearch, useShowFps, useWide, type AnatomyData } from "./data";
import { FindBox } from "./FindBox";
import { StructureCard } from "./StructureCard";
import { StructureList } from "./StructureList";
import type { Focus, Layer, Selection } from "./types";

// three.js only ever loads on this page, and only in the browser.
const Viewer = dynamic(() => import("./Viewer"), { ssr: false, loading: () => <div className="anatomy-stage" /> });

/** The 3D body (docs/ANATOMY_3D_PLAN.md): systems to show or see through, tap or find a structure, read the book. */
export function AnatomyScreen() {
  const data = useAnatomyData();
  if (data.status === "loading") return <Placeholder label="Opening the 3D body" />;
  if (data.status === "missing") return <NoModels />;
  return <Anatomy data={data} />;
}

const NEXT: Record<Layer, Layer> = { hidden: "shown", shown: "xray", xray: "hidden" };

function Anatomy({ data }: { data: Extract<AnatomyData, { status: "ready" }> }) {
  const { manifest, structures, byFma } = data;
  const { order, systems } = manifest;
  const glossary = useGlossary();
  const initialSearch = useInitialSearch();
  const showFps = useShowFps();
  const wide = useWide();

  // What the page was opened with (a deep link from a topic page, or a shared view); defaults otherwise.
  const opened = useMemo(() => {
    const url = parseAnatomyUrl(initialSearch);
    const shown = url.shown ?? order.filter((o) => systems[o].onByDefault);
    const layers: Record<string, Layer> = {};
    for (const id of order) layers[id] = url.xray?.includes(id) ? "xray" : shown.includes(id) ? "shown" : "hidden";
    const s = url.fma ? byFma.get(url.fma) : undefined;
    if (s && layers[s.system] === "hidden") layers[s.system] = "shown";
    const selection: Selection | null = s ? { kind: "structure", fma: s.fma } : url.term ? { kind: "term", term: url.term } : null;
    const focus: Focus | null = s ? { center: s.center, radius: s.radius, key: 0 } : null;
    return { layers, selection, focus };
  }, [initialSearch, order, systems, byFma]);

  const [layersState, setLayers] = useState<Record<string, Layer> | null>(null);
  const [selectionState, setSelection] = useState<Selection | null | undefined>(undefined);
  const [focusState, setFocus] = useState<Focus | null | undefined>(undefined);
  const [isolate, setIsolate] = useState(false);
  const [query, setQuery] = useState("");
  const [listMode, setListMode] = useState(false);

  const layers = layersState ?? opened.layers;
  const selection = selectionState === undefined ? opened.selection : selectionState;
  const focus = focusState === undefined ? opened.focus : focusState;
  const structure = selection?.kind === "structure" ? byFma.get(selection.fma) ?? null : null;
  const term = selection?.kind === "term" ? selection.term : null;

  // Keep the view in the URL, so a topic page can link to it and reloading keeps her place. (?fps stays.)
  useEffect(() => {
    const shown = order.filter((id) => layers[id] === "shown");
    const xray = order.filter((id) => layers[id] === "xray");
    const q = anatomyQuery({ shown, xray, ...(structure ? { fma: structure.fma } : term ? { term } : {}) });
    const fps = new URLSearchParams(window.location.search).has("fps") ? `${q ? "&" : ""}fps` : "";
    const next = `${window.location.pathname}${q || fps ? `?${q}${fps}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, "", next);
  }, [layers, structure, term, order]);

  const select = useCallback((next: Selection | null) => {
    setSelection(next);
    if (!next) setIsolate(false);
  }, []);
  const onPick = useCallback((fma: string | null) => select(fma ? { kind: "structure", fma } : null), [select]);
  const onReset = useCallback(() => setFocus(null), []);
  const viewerSystems = useMemo(
    () => order.map((id) => ({ id, label: systems[id].label, url: `/anatomy/${systems[id].file}`, color: systems[id].color, veinColor: systems[id].veinColor })),
    [order, systems],
  );
  function chooseStructure(s: Structure) {
    if (layers[s.system] !== "shown") setLayers({ ...layers, [s.system]: "shown" });
    select({ kind: "structure", fma: s.fma });
    setFocus({ center: s.center, radius: s.radius, key: Date.now() });
  }
  function chooseTerm(t: GlossaryTerm) {
    select({ kind: "term", term: t.term });
  }
  function cycle(id: string) {
    const next = NEXT[layers[id] ?? "hidden"];
    setLayers({ ...layers, [id]: next });
    if (next === "hidden" && structure?.system === id) select(null);
  }

  const card = useMemo(
    () =>
      selection ? (
        <StructureCard
          structure={structure}
          term={term}
          system={structure ? systems[structure.system] : null}
          glossary={glossary}
          isolate={isolate}
          onIsolate={setIsolate}
          onZoom={() => structure && setFocus({ center: structure.center, radius: structure.radius, key: Date.now() })}
          onClose={() => select(null)}
        />
      ) : null,
    [selection, structure, term, systems, glossary, isolate, select],
  );
  const anyShown = order.some((id) => layers[id] !== "hidden");

  return (
    <div>
      <PageHeader iconKey="page:anatomy" title="Anatomy" />
      <p className="mt-2 max-w-[62ch] text-ink-soft">
        Turn with one finger, pinch to zoom, two fingers to move. Tap a structure, or find it by name, to read your
        book&apos;s entry for it.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FindBox
          query={query}
          onQuery={setQuery}
          structures={structures}
          terms={glossary.status === "ready" ? glossary.terms : []}
          systems={systems}
          suggest={!listMode}
          onStructure={chooseStructure}
          onTerm={chooseTerm}
        />
        <div role="group" aria-label="View" className="flex gap-2">
          {[
            { list: false, label: "3D" },
            { list: true, label: "List" },
          ].map((v) => (
            <button key={v.label} type="button" aria-pressed={listMode === v.list} className={`chip ${listMode === v.list ? "chip-on" : ""}`} onClick={() => setListMode(v.list)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div role="group" aria-label="Body systems" className="mt-4 flex flex-wrap gap-2">
        {order.map((id) => {
          const s = systems[id];
          const layer = layers[id] ?? "hidden";
          const now = { shown: "shown", xray: "see-through", hidden: "hidden" }[layer];
          const then = { shown: "see through it", xray: "hide it", hidden: "show it" }[layer];
          return (
            <button
              key={id}
              type="button"
              className={`chip ${layer === "shown" ? "chip-on" : layer === "xray" ? "chip-xray" : ""}`}
              aria-label={`${s.label}: ${now}. Tap to ${then}.`}
              onClick={() => cycle(id)}
            >
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: `var(${s.color})` }} />
              {s.label}
              {layer === "xray" && <span className="font-normal">· see-through</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-meta text-ink-muted">Tap a system once to show it, again to see through it, again to hide it.</p>

      <div className={`mt-4 ${wide ? "grid grid-cols-[minmax(0,1fr)_20rem] items-start gap-6" : ""}`}>
        <div>
          {!wide && listMode && card && <div className="anatomy-card mb-4">{card}</div>}
          {listMode ? (
            <StructureList
              order={order}
              systems={systems}
              structures={structures}
              layers={layers}
              query={query}
              selected={structure?.fma ?? null}
              onSelect={chooseStructure}
            />
          ) : (
            <Viewer
              systems={viewerSystems}
              layers={layers}
              selected={structure?.fma ?? null}
              isolate={isolate && Boolean(structure)}
              focus={focus}
              onPick={onPick}
              onReset={onReset}
              showFps={showFps}
              sheet={wide ? null : card}
            >
              {!anyShown && <p className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-ink-muted">Turn on a system above to see it.</p>}
            </Viewer>
          )}
        </div>
        {wide && (
          <aside aria-live="polite" className="sticky top-6">
            {card ?? (
              <p className="text-small text-ink-muted">
                Tap a structure, or find one by name. Its name and your book&apos;s glossary entry show here.
              </p>
            )}
          </aside>
        )}
      </div>

      <p className="mt-8 max-w-[62ch] text-meta text-ink-muted">
        3D models: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.{" "}
        <Link href="/anatomy/credits">Credits and what the models leave out</Link>
      </p>
    </div>
  );
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
