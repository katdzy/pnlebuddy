"use client";

import { Bounds, OrbitControls, useBounds, useGLTF, useProgress, type BoundsApi } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { memo, Suspense, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { type Group, Mesh, MeshStandardMaterial } from "three";
import type { Focus, Layer } from "./types";

export interface ViewerProps {
  /** `color` and `veinColor` are CSS variable names, read from the current theme. */
  systems: { id: string; label: string; url: string; color: string; veinColor?: string }[];
  layers: Record<string, Layer>;
  /** FMA id of the selected structure. */
  selected: string | null;
  /** Hide everything but the selected structure. */
  isolate: boolean;
  /** The identify quiz: fill the selected structure with the accent and fade the rest further, so it can't be missed. */
  strong?: boolean;
  focus: Focus | null;
  onPick: (fma: string | null) => void;
  /** "Reset view" was pressed: the parent drops its focus; the viewer frames the whole body. */
  onReset: () => void;
  showFps: boolean;
  /** The card, on narrow screens: a sheet over the bottom of the canvas. The view shifts up to stay clear of it. */
  sheet?: ReactNode;
  /** Other things drawn over the canvas. */
  children?: ReactNode;
}

/** A pointer that moved further than this (px) between down and up was a turn or a pan, not a tap. */
const TAP_SLOP = 8;
const noRaycast = () => {};

// Memoised: typing in the search box re-renders the page, and the 3D scene needn't follow.
export default memo(function Viewer({ systems, layers, selected, isolate, strong = false, focus, onPick, onReset, showFps, sheet, children }: ViewerProps) {
  const colors = useThemeColors(["--color-accent", ...systems.flatMap((s) => [s.color, s.veinColor ?? s.color])]);
  const reduced = useReducedMotion();
  const [fitKey, setFitKey] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const down = useRef({ x: 0, y: 0 });
  const fps = useRef<HTMLSpanElement>(null);
  const loading = useProgress((p) => p.active);
  const mounted = systems.filter((s) => (layers[s.id] ?? "hidden") !== "hidden");
  const [sheetEl, setSheetEl] = useState<HTMLDivElement | null>(null);
  const inset = useHeight(sheetEl);

  return (
    <div className="anatomy-stage" onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}>
      <Canvas
        role="img"
        aria-label="3D body model. For a list a screen reader can use, choose List above."
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 35, position: [0, 0.1, 3], near: 0.01, far: 50 }}
        onPointerMissed={(e) => {
          if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) < TAP_SLOP) onPick(null);
        }}
      >
        <hemisphereLight args={["#ffffff", "#8a8070", 1.1]} />
        <directionalLight position={[1.5, 3, 4]} intensity={1.8} />
        <directionalLight position={[-2, 1, -3]} intensity={0.7} />
        <Bounds maxDuration={reduced ? 0 : 0.5}>
          <Refit focus={focus} bottom={sheet ? inset : 0} deps={[mounted.map((s) => s.id).join(), fitKey, loaded, focus?.key]} />
          {mounted.map((s) => (
            <Suspense key={s.id} fallback={null}>
              <System
                url={s.url}
                color={colors[s.color]}
                veinColor={colors[s.veinColor ?? s.color]}
                accent={colors["--color-accent"]}
                xray={layers[s.id] === "xray"}
                selected={selected}
                isolate={isolate}
                strong={strong}
                onPick={onPick}
                onLoaded={() => setLoaded((n) => n + 1)}
              />
            </Suspense>
          ))}
        </Bounds>
        <OrbitControls makeDefault enableDamping={!reduced} minDistance={0.1} maxDistance={6} />
        <ViewOffset bottom={sheet ? inset : 0} />
        {showFps && <FpsMeter out={fps} />}
      </Canvas>

      {loading && (
        <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-meta text-ink-muted">
          Loading the model…
        </p>
      )}
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
        {showFps && <span ref={fps} className="tabular rounded-control bg-surface px-2 py-1 text-meta text-ink-muted" />}
        <button
          type="button"
          className="btn btn-secondary pointer-events-auto min-h-11"
          onClick={() => {
            onReset();
            setFitKey((k) => k + 1);
          }}
        >
          Reset view
        </button>
      </div>
      {children}
      {sheet && (
        <div ref={setSheetEl} aria-live="polite" className="anatomy-sheet">
          {sheet}
        </div>
      )}
    </div>
  );
});

/** Moves the picture up by half of `bottom` px, so what's in the middle of the view sits above the sheet. */
function ViewOffset({ bottom }: { bottom: number }) {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    // A virtual canvas `bottom` px taller, of which we draw the lower part: the centre moves up by bottom / 2.
    if (bottom > 0) camera.setViewOffset(width, height + bottom, 0, bottom, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, width, height, bottom, invalidate]);
  return null;
}

function useHeight(el: HTMLElement | null): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    if (!el) return;
    // offsetHeight, not contentRect: the sheet's padding covers the canvas too.
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return el ? h : 0;
}

/** Looks at whatever is visible from the front (Bounds' fit distance already leaves a margin). */
function frontView(api: BoundsApi) {
  const { box, center, distance } = api.refresh().clip().getSize();
  if (box.isEmpty()) return; // nothing loaded yet: an empty box would put the camera at NaN
  api.to({ position: [center.x, center.y, center.z + distance], target: [center.x, center.y, center.z] });
}

/**
 * Flies to the focused structure, from the front, close enough that it fills what's visible (`room` is the share of
 * the canvas the sheet leaves); else frames everything.
 */
function frame(api: BoundsApi, focus: Focus | null, room: number) {
  if (!focus) return frontView(api);
  const [x, y, z] = focus.center;
  api.refresh().clip();
  api.to({ position: [x, y, z + Math.max((focus.radius * 3.5) / room, 0.3)], target: [x, y, z] });
}

/**
 * Frames the view: when a system is turned on or off or finishes loading, the iPad turns, on focus, or on reset; and
 * when the sheet changes height while something is focused (a tap alone never moves the camera).
 */
function Refit({ focus, bottom, deps }: { focus: Focus | null; bottom: number; deps: unknown[] }) {
  const api = useBounds();
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const room = Math.max(0.35, (height - bottom) / height);
  useEffect(() => {
    frame(api, focus, room);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, width, height, focus ? room : 1]);
  return null;
}

function System({
  url,
  color,
  veinColor,
  accent,
  xray,
  selected,
  isolate,
  strong,
  onPick,
  onLoaded,
}: {
  url: string;
  color: string;
  veinColor: string;
  accent: string;
  xray: boolean;
  selected: string | null;
  isolate: boolean;
  strong: boolean;
  onPick: (fma: string | null) => void;
  onLoaded: () => void;
}) {
  const { scene } = useGLTF(url, false, true);
  const invalidate = useThree((s) => s.invalidate);
  const root = useRef<Group>(null);

  // Each structure gets its own material so it can be highlighted or faded on its own, and smooth normals (the
  // files leave them out).
  useEffect(() => {
    root.current?.traverse((o) => {
      if (o instanceof Mesh && o.userData.own !== true) {
        if (!o.geometry.getAttribute("normal")) o.geometry.computeVertexNormals();
        o.material = new MeshStandardMaterial({ roughness: 0.75, metalness: 0 });
        o.userData.own = true;
      }
    });
    onLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    root.current?.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const mat = o.material as MeshStandardMaterial;
      const isSelected = selected === o.userData.fma;
      const others = selected !== null && !isSelected;
      // Isolate hides the rest; x-ray shows a system faintly and lets taps through to what's behind it.
      const hidden = isolate && others;
      const seeThrough = xray && !isSelected;
      const opacity = seeThrough ? 0.12 : others ? (strong ? 0.07 : 0.15) : 1;
      o.visible = !hidden;
      o.raycast = hidden || seeThrough ? noRaycast : Mesh.prototype.raycast;
      mat.color.set(isSelected && strong ? accent : o.userData.vein ? veinColor : color);
      mat.emissive.set(isSelected ? accent : "#000000");
      mat.emissiveIntensity = isSelected ? (strong ? 0.35 : 0.55) : 0;
      if (mat.transparent !== opacity < 1) mat.needsUpdate = true;
      mat.transparent = opacity < 1;
      mat.opacity = opacity;
      mat.depthWrite = opacity === 1;
    });
    invalidate();
  }, [scene, selected, isolate, strong, xray, color, veinColor, accent, invalidate]);

  return (
    <primitive
      ref={root}
      object={scene}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > TAP_SLOP) return;
        const fma = (e.object.userData as { fma?: string }).fma;
        if (fma) onPick(selected === fma ? null : fma);
      }}
    />
  );
}

/** For testing on her iPad with ?fps: frames drawn in the last second while the model moves. */
function FpsMeter({ out }: { out: RefObject<HTMLSpanElement | null> }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
  });
  useEffect(() => {
    const t = setInterval(() => {
      if (out.current) out.current.textContent = frames.current > 0 ? `${frames.current} fps` : "fps: idle";
      frames.current = 0;
    }, 1000);
    return () => clearInterval(t);
  }, [out]);
  return null;
}

/** The scene's colours come from the theme tokens (CSS variable names → values), and follow a theme change. */
function useThemeColors(names: string[]): Record<string, string> {
  const key = [...new Set(names)].join(",");
  const [colors, setColors] = useState(() => readTokens(key));
  useEffect(() => {
    const update = () => setColors(readTokens(key));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [key]);
  return colors;
}

function readTokens(key: string): Record<string, string> {
  const css = getComputedStyle(document.documentElement);
  return Object.fromEntries(key.split(",").map((n) => [n, css.getPropertyValue(n).trim()]));
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}
