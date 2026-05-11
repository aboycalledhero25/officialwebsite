"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

const STORAGE_KEY = "abch-guitar-tuner";

/* ─────────────────────────────────────────────
   Tuning defaults
   ───────────────────────────────────────────── */
interface TuningParams {
  bloomStrength: number;
  bloomThreshold: number;
  guitarOpacity: number;
  emissiveIntensity: number;
  stratColor: string;
  jaguarColor: string;
  bannerOpacity: number;
  bannerGradientEdge: "top" | "bottom" | "left" | "right";
  bannerGradientSize: number;
  bannerGradientOpacity: number;
}

const DEFAULTS: TuningParams = {
  bloomStrength: 0.35,
  bloomThreshold: 0.5,
  guitarOpacity: 0.2,
  emissiveIntensity: 1.2,
  stratColor: "#00f0ff",
  jaguarColor: "#ff006e",
  bannerOpacity: 1.0,
  bannerGradientEdge: "bottom",
  bannerGradientSize: 35,
  bannerGradientOpacity: 1.0,
};

function loadSettings(): TuningParams {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function saveSettings(params: TuningParams) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {}
}

function settingsEqual(a: TuningParams, b: TuningParams): boolean {
  return (
    a.bloomStrength === b.bloomStrength &&
    a.bloomThreshold === b.bloomThreshold &&
    a.guitarOpacity === b.guitarOpacity &&
    a.emissiveIntensity === b.emissiveIntensity &&
    a.stratColor === b.stratColor &&
    a.jaguarColor === b.jaguarColor &&
    a.bannerOpacity === b.bannerOpacity &&
    a.bannerGradientEdge === b.bannerGradientEdge &&
    a.bannerGradientSize === b.bannerGradientSize &&
    a.bannerGradientOpacity === b.bannerGradientOpacity
  );
}

function dispatchUpdate(detail?: TuningParams) {
  window.dispatchEvent(new CustomEvent("tuner-update", { detail }));
}

function hexToInt(hex: string) {
  return parseInt(hex.replace("#", ""), 16);
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
function makeStarTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.15, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.4)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.08)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createStarfield(count: number, depthRange: number) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 10 + Math.random() * depthRange;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    const roll = Math.random();
    if (roll < 0.32) {
      colours[i3] = 0.0; colours[i3 + 1] = 0.9; colours[i3 + 2] = 1.0;
    } else if (roll < 0.64) {
      colours[i3] = 1.0; colours[i3 + 1] = 0.15; colours[i3 + 2] = 0.55;
    } else {
      const b = 0.75 + Math.random() * 0.25;
      colours[i3] = b; colours[i3 + 1] = b; colours[i3 + 2] = 1.0;
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));

  const material = new THREE.PointsMaterial({
    size: 0.2,
    map: makeStarTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function wrap(val: number, min: number, max: number) {
  const range = max - min;
  while (val > max) val -= range;
  while (val < min) val += range;
  return val;
}

function loadGLB(path: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(path, (gltf) => resolve(gltf.scene), undefined, (err) => reject(err));
  });
}

/* ─────────────────────────────────────────────
   Module-level GLB cache so toggling guitars
   does not re-fetch models from the network.
   ───────────────────────────────────────────── */
let glbCache: [THREE.Group, THREE.Group] | null = null;

async function loadGLBModels(): Promise<[THREE.Group, THREE.Group]> {
  if (glbCache) return glbCache;
  const models = await Promise.all([loadGLB("/models/strat.glb"), loadGLB("/models/jaguar.glb")]);
  glbCache = models;
  return models;
}

/* ─────────────────────────────────────────────
   Slider component
   ───────────────────────────────────────────── */
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/80">{label}</span>
        <span className="text-accent font-mono">
          {value.toFixed(step < 0.01 ? 2 : step < 0.1 ? 2 : 1)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/20 accent-accent"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */
export function GuitarBackground({ showFloatingGuitars = true, isAdmin }: { showFloatingGuitars?: boolean; isAdmin?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<TuningParams>(DEFAULTS);
  const draftRef = useRef<TuningParams>(DEFAULTS);
  const [showPanel, setShowPanel] = useState(true);
  const [savedTick, setSavedTick] = useState(0);
  const [previewTick, setPreviewTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = loadSettings();
    savedRef.current = saved;
    draftRef.current = { ...saved };
    setMounted(true);
    setPreviewTick((t) => t + 1);
  }, []);

  const isDirty = !settingsEqual(savedRef.current, draftRef.current);

  const updateDraft = <K extends keyof TuningParams>(key: K, value: TuningParams[K]) => {
    draftRef.current[key] = value;
    dispatchUpdate(draftRef.current);
    setPreviewTick((t) => t + 1);
  };

  const commitSave = () => {
    savedRef.current = { ...draftRef.current };
    saveSettings(savedRef.current);
    dispatchUpdate(draftRef.current);
    setSavedTick((t) => t + 1);
  };

  const resetDefaults = () => {
    draftRef.current = { ...DEFAULTS };
    savedRef.current = { ...DEFAULTS };
    saveSettings(savedRef.current);
    dispatchUpdate(draftRef.current);
    setSavedTick((t) => t + 1);
    setPreviewTick((t) => t + 1);
  };

  const discardChanges = () => {
    draftRef.current = { ...savedRef.current };
    dispatchUpdate(draftRef.current);
    setPreviewTick((t) => t + 1);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ── Post-processing ──
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      draftRef.current.bloomStrength,
      0.4,
      draftRef.current.bloomThreshold
    );
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms["resolution"].value.set(1 / window.innerWidth, 1 / window.innerHeight);

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(fxaaPass);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(3, 5, 4);
    scene.add(dir);

    // ── Stars ──
    const star1 = createStarfield(4000, 100);
    const star2 = createStarfield(2000, 60);
    const star3 = createStarfield(400, 30);
    scene.add(star1, star2, star3);

    // ── Guitar state ──
    type GuitarEntry = {
      group: THREE.Group;
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      rotSpeed: THREE.Euler;
      light: THREE.PointLight;
      isStrat: boolean;
      mats: THREE.MeshStandardMaterial[];
    };

    let guitars: GuitarEntry[] = [];
    let guitarFrameId = 0;
    let baseFrameId = 0;
    let isActive = true;

    const stratCol = new THREE.Color();
    const jaguarCol = new THREE.Color();

    const animate = () => {
      if (!isActive) return;
      baseFrameId = requestAnimationFrame(animate);

      bloomPass.strength = draftRef.current.bloomStrength;
      bloomPass.threshold = draftRef.current.bloomThreshold;

      // Update star rotations
      star1.rotation.y += 0.00003;
      star1.rotation.x += 0.000006;
      star2.rotation.y += 0.00006;
      star2.rotation.x += 0.000012;
      star3.rotation.y += 0.00012;
      star3.rotation.x += 0.000024;

      // Update guitars if present
      if (guitars.length > 0) {
        stratCol.set(draftRef.current.stratColor);
        jaguarCol.set(draftRef.current.jaguarColor);

        guitars.forEach((g) => {
          const targetColor = g.isStrat ? stratCol : jaguarCol;
          g.mats.forEach((mat) => {
            mat.color.lerp(targetColor, 0.92);
            mat.emissive.copy(targetColor);
            mat.emissiveIntensity = draftRef.current.emissiveIntensity;
            mat.opacity = draftRef.current.guitarOpacity;
            mat.transparent = draftRef.current.guitarOpacity < 1.0;
          });
          g.light.color.copy(targetColor);

          g.pos.add(g.vel);
          g.pos.x = wrap(g.pos.x, -22, 22);
          g.pos.y = wrap(g.pos.y, -14, 14);
          g.pos.z = wrap(g.pos.z, -10, 6);

          g.group.position.copy(g.pos);
          g.group.rotation.x += g.rotSpeed.x;
          g.group.rotation.y += g.rotSpeed.y;
          g.group.rotation.z += g.rotSpeed.z;

          g.light.position.copy(g.pos);
        });
      }

      composer.render();
    };
    animate();

    // ── Load guitars if enabled ──
    if (showFloatingGuitars) {
      loadGLBModels().then(([stratTemplate, jaguarTemplate]) => {
        if (!isActive) return;

        const BOUNDS = { x: 22, y: 14, z: { min: -10, max: 6 } };
        const GUITAR_COUNT = 10;

        for (let i = 0; i < GUITAR_COUNT; i++) {
          const isStrat = i < 5;
          const template = isStrat ? stratTemplate : jaguarTemplate;

          const model = template.clone(true);
          scaleToFit(model, 5.5);

          const mats: THREE.MeshStandardMaterial[] = [];
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
              mesh.material = mat;
              mats.push(mat);
            }
          });

          const group = new THREE.Group();
          group.add(model);
          scene.add(group);

          const pos = new THREE.Vector3(
            rand(-BOUNDS.x * 0.7, BOUNDS.x * 0.7),
            rand(-BOUNDS.y * 0.7, BOUNDS.y * 0.7),
            rand(BOUNDS.z.min * 0.6, BOUNDS.z.max * 0.6)
          );

          const vel = new THREE.Vector3(
            rand(-0.003, 0.003),
            rand(-0.002, 0.002),
            rand(-0.0015, 0.0015)
          );

          const rotSpeed = new THREE.Euler(
            rand(-0.0003, 0.0003),
            rand(-0.0005, 0.0005),
            rand(-0.0002, 0.0002)
          );

          group.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
          group.position.copy(pos);

          const light = new THREE.PointLight(
            isStrat ? hexToInt(draftRef.current.stratColor) : hexToInt(draftRef.current.jaguarColor),
            6,
            30
          );
          light.position.copy(pos);
          scene.add(light);

          guitars.push({ group, pos, vel, rotSpeed, light, isStrat, mats });
        }
      });
    }

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      fxaaPass.uniforms["resolution"].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      isActive = false;
      cancelAnimationFrame(baseFrameId);
      cancelAnimationFrame(guitarFrameId);
      window.removeEventListener("resize", onResize);

      // Remove guitars and their lights from scene
      guitars.forEach((g) => {
        scene.remove(g.group);
        scene.remove(g.light);
        g.group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if ((mesh.material as THREE.Material).dispose) {
              (mesh.material as THREE.Material).dispose();
            }
          }
        });
      });

      composer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [savedTick, showFloatingGuitars]);

  const tuning = draftRef.current;

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 z-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Toggle button — admin only */}
      {isAdmin && (
        <button
          onClick={() => setShowPanel((s) => !s)}
          className="fixed top-4 right-4 z-50 rounded-lg bg-surface-elevated/90 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm border border-border hover:border-accent transition-colors"
        >
          {showPanel ? "Hide Tuner" : "Show Tuner"}
        </button>
      )}

      {/* Tuning panel */}
      {isAdmin && showPanel && (
        <div className="fixed top-12 right-4 z-50 w-72 max-h-[85vh] overflow-y-auto rounded-xl bg-surface-elevated/90 p-4 backdrop-blur-md border border-border shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg tracking-wide text-foreground">
              Guitar Tuner
            </h3>
            {isDirty && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">
                Unsaved
              </span>
            )}
          </div>

          <Slider
            label="Bloom Strength"
            value={tuning.bloomStrength}
            min={0}
            max={1.5}
            step={0.01}
            onChange={(v) => updateDraft("bloomStrength", v)}
          />

          <Slider
            label="Bloom Threshold"
            value={tuning.bloomThreshold}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateDraft("bloomThreshold", v)}
          />

          <Slider
            label="Guitar Opacity"
            value={tuning.guitarOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateDraft("guitarOpacity", v)}
          />

          <Slider
            label="Emissive Intensity"
            value={tuning.emissiveIntensity}
            min={0}
            max={3}
            step={0.05}
            onChange={(v) => updateDraft("emissiveIntensity", v)}
          />

          <div className="mb-3">
            <span className="text-xs text-white/80 block mb-1">Strat Colour</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={tuning.stratColor}
                onChange={(e) => updateDraft("stratColor", e.target.value)}
                className="h-8 w-14 rounded border-0 cursor-pointer"
              />
              <span className="text-xs font-mono text-white/60">{tuning.stratColor}</span>
            </div>
          </div>

          <div className="mb-4">
            <span className="text-xs text-white/80 block mb-1">Jaguar Colour</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={tuning.jaguarColor}
                onChange={(e) => updateDraft("jaguarColor", e.target.value)}
                className="h-8 w-14 rounded border-0 cursor-pointer"
              />
              <span className="text-xs font-mono text-white/60">{tuning.jaguarColor}</span>
            </div>
          </div>

          <hr className="border-white/10 my-4" />

          <h4 className="font-display text-sm tracking-wide text-foreground mb-3">
            Banner Gradient
          </h4>

          <Slider
            label="Banner Opacity"
            value={tuning.bannerOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateDraft("bannerOpacity", v)}
          />

          <div className="mb-3">
            <span className="text-xs text-white/80 block mb-1">Gradient Edge</span>
            <div className="flex gap-1">
              {(["top", "bottom", "left", "right"] as const).map((edge) => (
                <button
                  key={edge}
                  onClick={() => updateDraft("bannerGradientEdge", edge)}
                  className={`flex-1 rounded py-1 text-xs capitalize transition-colors ${
                    tuning.bannerGradientEdge === edge
                      ? "bg-accent text-background font-bold"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {edge}
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="Gradient Size (%)"
            value={tuning.bannerGradientSize}
            min={0}
            max={100}
            step={1}
            onChange={(v) => updateDraft("bannerGradientSize", v)}
          />

          <Slider
            label="Gradient Opacity"
            value={tuning.bannerGradientOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateDraft("bannerGradientOpacity", v)}
          />

          <hr className="border-white/10 my-4" />

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={commitSave}
              disabled={!isDirty}
              className={`w-full rounded-lg py-2 text-sm font-bold transition-colors ${
                isDirty
                  ? "bg-accent text-background hover:brightness-110"
                  : "bg-accent/30 text-background/40 cursor-not-allowed"
              }`}
            >
              Save Settings
            </button>

            {isDirty && (
              <button
                onClick={discardChanges}
                className="w-full rounded-lg border border-border bg-background py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent transition-colors"
              >
                Discard Changes
              </button>
            )}

            <button
              onClick={resetDefaults}
              className="w-full rounded-lg border border-border bg-background py-2 text-sm font-medium text-foreground hover:border-red-500 hover:text-red-400 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function scaleToFit(model: THREE.Group, targetHeight: number) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  model.scale.setScalar(targetHeight / maxDim);
}
