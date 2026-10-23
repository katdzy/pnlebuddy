"use client";

import { Bounds, OrbitControls, useBounds, useGLTF, useProgress, type BoundsApi } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { type Group, Mesh, MeshStandardMaterial } from "three";
import type { Picked } from "./types";

export interface ViewerProps {
  /** `color` and `veinColor` are CSS variable names, read from the current theme. */
  systems: { id: string; label: string; url: string; color: string; veinColor?: string }[];
  visible: string[];
  picked: Picked | null;
  onPick: (p: Picked | null) => void;
  showFps: boolean;
  /** Drawn over the canvas (the info card). */
  children?: ReactNode;
}

/** A pointer that moved further than this (px) between down and up was a turn or a pan, not a tap. */
const TAP_SLOP = 8;

export default function Viewer({ systems, visible, picked, onPick, showFps, children }: ViewerProps) {
  const colors = useThemeColors(["--color-accent", ...systems.flatMap((s) => [s.color, s.veinColor ?? s.color])]);
  const reduced = useReducedMotion();
  const [fitKey, setFitKey] = useState(0);
  const down = useRef({ x: 0, y: 0 });
  const fps = useRef<HTMLSpanElement>(null);
  const loading = useProgress((p) => p.active);

  return (
    <div className="anatomy-stage" onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}>
      <Canvas
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
          <Refit deps={[visible.join(), fitKey]} />
          {systems
            .filter((s) => visible.includes(s.id))
            .map((s) => (
              <Suspense key={s.id} fallback={null}>
                <System
                  id={s.id}
                  url={s.url}
                  color={colors[s.color]}
                  veinColor={colors[s.veinColor ?? s.color]}
                  accent={colors["--color-accent"]}
                  picked={picked}
                  onPick={onPick}
                />
              </Suspense>
            ))}
        </Bounds>
        <OrbitControls makeDefault enableDamping={!reduced} minDistance={0.15} maxDistance={6} />
        {showFps && <FpsMeter out={fps} />}
      </Canvas>

      {loading && (
        <p role="status" className="absolute inset-0 grid place-items-center text-meta text-ink-muted">
          Loading the model…
        </p>
      )}
      {children}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
        <button type="button" className="btn btn-secondary pointer-events-auto" onClick={() => setFitKey((k) => k + 1)}>
          Reset view
        </button>
        {showFps && <span ref={fps} className="tabular rounded-control bg-surface px-2 py-1 text-meta text-ink-muted" />}
      </div>
    </div>
  );
}

/** Looks at whatever is visible from the front (Bounds' fit distance already leaves a margin). */
function frontView(api: BoundsApi) {
  const { box, center, distance } = api.refresh().clip().getSize();
  if (box.isEmpty()) return; // nothing loaded yet: an empty box would put the camera at NaN
  api.to({ position: [center.x, center.y, center.z + distance], target: [center.x, center.y, center.z] });
}

/** Frames whatever is visible: when a system is turned on or off, the iPad turns, or on "Reset view". */
function Refit({ deps }: { deps: unknown[] }) {
  const api = useBounds();
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    frontView(api);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, width, height]);
  return null;
}

function System({
  id,
  url,
  color,
  veinColor,
  accent,
  picked,
  onPick,
}: {
  id: string;
  url: string;
  color: string;
  veinColor: string;
  accent: string;
  picked: Picked | null;
  onPick: (p: Picked | null) => void;
}) {
  const { scene } = useGLTF(url, false, true);
  const invalidate = useThree((s) => s.invalidate);
  const api = useBounds();
  const root = useRef<Group>(null);

  // Each structure gets its own material so it can be highlighted or faded on its own, and smooth normals (the
  // files leave them out). Once loaded, frame the body again so the new system is in view.
  useEffect(() => {
    root.current?.traverse((o) => {
      if (o instanceof Mesh && o.userData.own !== true) {
        if (!o.geometry.getAttribute("normal")) o.geometry.computeVertexNormals();
        o.material = new MeshStandardMaterial({ roughness: 0.75, metalness: 0 });
        o.userData.own = true;
      }
    });
    frontView(api);
  }, [scene, api]);

  useEffect(() => {
    root.current?.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const mat = o.material as MeshStandardMaterial;
      const isPicked = picked?.fma === o.userData.fma;
      const faded = picked !== null && !isPicked;
      mat.color.set(o.userData.vein ? veinColor : color);
      mat.emissive.set(isPicked ? accent : "#000000");
      mat.emissiveIntensity = isPicked ? 0.55 : 0;
      if (mat.transparent !== faded) mat.needsUpdate = true;
      mat.transparent = faded;
      mat.opacity = faded ? 0.15 : 1;
      mat.depthWrite = !faded;
    });
    invalidate();
  }, [scene, picked, color, veinColor, accent, invalidate]);

  return (
    <primitive
      ref={root}
      object={scene}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > TAP_SLOP) return;
        const d = e.object.userData as { fma?: string; name?: string };
        if (d.fma && d.name) onPick(picked?.fma === d.fma ? null : { fma: d.fma, name: d.name, system: id });
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
