"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type {
  GamePlatformSettings,
  PlayerSprite,
  BossSettings,
  HitboxPoint,
  SpawnPoint,
  PlayerHitbox,
  GameShieldSettings,
} from "@/lib/data";
import { drawEnemy, drawBoss, drawPlayer } from "./draw-sprites";

const BASE_W = 240;
const BASE_H = 320;

/* ═══════════════════════════════════════════════════════════════════════════ */

type Sel =
  | { type: "player" }
  | { type: "hitbox" }
  | { type: "bulletSpawn" }
  | { type: "shield" }
  | { type: "permShield" }
  | { type: "boss" }
  | { type: "spawnPoint"; index: number }
  | { type: "ui"; key: string };

type Drag =
  | { kind: "none" }
  | { kind: "move"; el: Sel; sx: number; sy: number }
  | { kind: "resize"; el: Sel; handle: string; sx: number; sy: number };

interface Props {
  settings: GamePlatformSettings;
  playerSprite: PlayerSprite;
  bossSettings: BossSettings;
  platform: "desktop" | "mobile";
  zoom?: number;
  hitboxPoints?: HitboxPoint[];
  bulletSpawnOffsetX?: number;
  bulletSpawnOffsetY?: number;
  mouseFollowOffsetX?: number;
  mouseFollowOffsetY?: number;
  spawnPoints?: [SpawnPoint, SpawnPoint, SpawnPoint];
  onChange: (next: GamePlatformSettings) => void;
  onBossChange?: (next: BossSettings) => void;
  onHitboxChange?: (points: HitboxPoint[]) => void;
  onBulletSpawnChange?: (ox: number, oy: number) => void;
  onMouseFollowChange?: (ox: number, oy: number) => void;
  onSpawnPointsChange?: (next: [SpawnPoint, SpawnPoint, SpawnPoint]) => void;
  onPlayerSpriteChange?: (next: PlayerSprite) => void;
  onPlayerHitboxChange?: (next: PlayerHitbox) => void;
  onPermShieldChange?: (next: GameShieldSettings) => void;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function inRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}
function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ── Number input (inspector) ───────────────────────────────────────────── */

function Num({ label, value, onChange, min, max, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-neutral-400">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 rounded border border-[#333] bg-[#1a1a1a] px-2 py-1 text-right text-[11px] text-white focus:border-[#00f0ff] focus:outline-none"
      />
    </div>
  );
}

/* ── Inspector panel ─────────────────────────────────────────────────────── */

function Inspector({ sel, settings, playerSprite, bossSettings, hitboxPoints, bulletSpawnOffsetX, bulletSpawnOffsetY, onChange, onBossChange, onBulletSpawnChange, onPlayerSpriteChange, onPlayerHitboxChange, onPermShieldChange }: {
  sel: Sel | null;
  settings: GamePlatformSettings;
  playerSprite: PlayerSprite;
  bossSettings: BossSettings;
  hitboxPoints?: HitboxPoint[];
  bulletSpawnOffsetX?: number;
  bulletSpawnOffsetY?: number;
  onChange: (next: GamePlatformSettings) => void;
  onBossChange?: (next: BossSettings) => void;
  onBulletSpawnChange?: (ox: number, oy: number) => void;
  onPlayerSpriteChange?: (next: PlayerSprite) => void;
  onPlayerHitboxChange?: (next: PlayerHitbox) => void;
  onPermShieldChange?: (next: GameShieldSettings) => void;
}) {
  if (!sel) {
    return (
      <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-3">
        <div className="text-[11px] text-neutral-500">Click an element to edit</div>
      </div>
    );
  }

  const patchUI = (key: string, patch: any) => {
    const el = (settings as any)[key];
    if (!el) return;
    onChange({ ...settings, [key]: { ...el, ...patch } });
  };
  const patchBossPos = (patch: any) => onChange({ ...settings, boss: { ...settings.boss, ...patch } });
  const patchShield = (patch: any) => onChange({ ...settings, shield: { ...settings.shield, ...patch } });
  const patchSpawn = (i: number, patch: any) => {
    const next = [...settings.spawnPoints] as [SpawnPoint, SpawnPoint, SpawnPoint];
    next[i] = { ...next[i], ...patch };
    onChange({ ...settings, spawnPoints: next });
  };

  switch (sel.type) {
    case "player":
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-white">Player Sprite</div>
          <Num label="X" value={settings.player.x} onChange={(v) => onChange({ ...settings, player: { ...settings.player, x: clamp(v, 0, BASE_W) } })} min={0} max={BASE_W} />
          <Num label="Y" value={settings.player.y} onChange={(v) => onChange({ ...settings, player: { ...settings.player, y: clamp(v, 0, BASE_H) } })} min={0} max={BASE_H} />
          <Num label="Offset X" value={playerSprite.offsetX} onChange={(v) => onPlayerSpriteChange?.({ ...playerSprite, offsetX: v })} />
          <Num label="Offset Y" value={playerSprite.offsetY} onChange={(v) => onPlayerSpriteChange?.({ ...playerSprite, offsetY: v })} />
          <Num label="Width" value={playerSprite.width} onChange={(v) => onPlayerSpriteChange?.({ ...playerSprite, width: Math.max(1, v) })} min={1} max={200} />
          <Num label="Height" value={playerSprite.height} onChange={(v) => onPlayerSpriteChange?.({ ...playerSprite, height: Math.max(1, v) })} min={1} max={200} />
          <Num label="Cols" value={playerSprite.cols ?? 12} onChange={(v) => onPlayerSpriteChange?.({ ...playerSprite, cols: Math.max(1, v) })} min={1} max={60} />
        </div>
      );
    case "hitbox": {
      const hb = (settings as any).playerHitbox ?? {};
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-white">Hitbox</div>
          <Num label="Offset X" value={hb.offsetX ?? 0} onChange={(v) => onPlayerHitboxChange?.({ ...hb, offsetX: v })} />
          <Num label="Offset Y" value={hb.offsetY ?? 0} onChange={(v) => onPlayerHitboxChange?.({ ...hb, offsetY: v })} />
          <Num label="Width" value={hb.width ?? 10} onChange={(v) => onPlayerHitboxChange?.({ ...hb, width: Math.max(1, v) })} min={1} max={200} />
          <Num label="Height" value={hb.height ?? 20} onChange={(v) => onPlayerHitboxChange?.({ ...hb, height: Math.max(1, v) })} min={1} max={200} />
        </div>
      );
    }
    case "bulletSpawn":
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-white">Bullet Spawn</div>
          <Num label="Offset X" value={bulletSpawnOffsetX ?? 5} onChange={(v) => onBulletSpawnChange?.(v, bulletSpawnOffsetY ?? 10)} />
          <Num label="Offset Y" value={bulletSpawnOffsetY ?? 10} onChange={(v) => onBulletSpawnChange?.(bulletSpawnOffsetX ?? 5, v)} />
        </div>
      );
    case "shield":
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-white">Temp Shield</div>
          <Num label="Offset X" value={settings.shield.offsetX} onChange={(v) => patchShield({ offsetX: v })} />
          <Num label="Offset Y" value={settings.shield.offsetY} onChange={(v) => patchShield({ offsetY: v })} />
          <Num label="Radius" value={settings.shield.radius} onChange={(v) => patchShield({ radius: Math.max(1, v) })} min={1} max={100} />
        </div>
      );
    case "permShield": {
      const ps = (settings as any).permShield ?? { offsetX: 0, offsetY: 0, radius: 20, size: 1 };
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-white">Perm Shield</div>
          <Num label="Offset X" value={ps.offsetX} onChange={(v) => onPermShieldChange?.({ ...ps, offsetX: v })} />
          <Num label="Offset Y" value={ps.offsetY} onChange={(v) => onPermShieldChange?.({ ...ps, offsetY: v })} />
          <Num label="Radius" value={ps.radius} onChange={(v) => onPermShieldChange?.({ ...ps, radius: Math.max(1, v) })} min={1} max={100} />
          <Num label="Size" value={ps.size} onChange={(v) => onPermShieldChange?.({ ...ps, size: Math.max(0.1, v) })} min={0.1} max={5} step={0.1} />
        </div>
      );
    }
    case "boss":
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-white">Boss</div>
          <Num label="X" value={settings.boss.x} onChange={(v) => patchBossPos({ x: clamp(v, 0, BASE_W) })} min={0} max={BASE_W} />
          <Num label="Y" value={settings.boss.y} onChange={(v) => patchBossPos({ y: clamp(v, 0, BASE_H) })} min={0} max={BASE_H} />
          <Num label="Width" value={bossSettings.width} onChange={(v) => onBossChange?.({ ...bossSettings, width: Math.max(10, v) })} min={10} max={200} />
          <Num label="Height" value={bossSettings.height} onChange={(v) => onBossChange?.({ ...bossSettings, height: Math.max(10, v) })} min={10} max={200} />
        </div>
      );
    case "spawnPoint": {
      const sp = settings.spawnPoints[sel.index];
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-white">Spawn {sel.index + 1}</div>
          <Num label="X" value={sp.x} onChange={(v) => patchSpawn(sel.index, { x: clamp(v, 0, BASE_W) })} min={0} max={BASE_W} />
          <Num label="Y" value={sp.y} onChange={(v) => patchSpawn(sel.index, { y: clamp(v, 0, BASE_H) })} min={0} max={BASE_H} />
        </div>
      );
    }
    case "ui": {
      const key = sel.key;
      const el = (settings as any)[key] as any;
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-white">{key}</div>
          <Num label="X" value={el.x} onChange={(v) => patchUI(key, { x: v })} min={0} max={BASE_W} />
          <Num label="Y" value={el.y} onChange={(v) => patchUI(key, { y: v })} min={0} max={BASE_H} />
          {"size" in el && <Num label="Size" value={el.size} onChange={(v) => patchUI(key, { size: Math.max(1, v) })} min={1} max={200} />}
          {"width" in el && <Num label="Width" value={el.width} onChange={(v) => patchUI(key, { width: Math.max(1, v) })} min={1} max={240} />}
          {"height" in el && <Num label="Height" value={el.height} onChange={(v) => patchUI(key, { height: Math.max(1, v) })} min={1} max={320} />}
          {"visible" in el && (
            <label className="flex items-center gap-2 text-[11px] text-neutral-300">
              <input type="checkbox" checked={el.visible} onChange={(e) => patchUI(key, { visible: e.target.checked })} className="accent-[#00f0ff]" />
              Visible
            </label>
          )}
        </div>
      );
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════════════════ */

export function GameEditorPreview({
  settings,
  playerSprite,
  bossSettings,
  platform,
  zoom = 1,
  hitboxPoints,
  bulletSpawnOffsetX,
  bulletSpawnOffsetY,
  mouseFollowOffsetX,
  mouseFollowOffsetY,
  spawnPoints,
  onChange,
  onBossChange,
  onHitboxChange,
  onBulletSpawnChange,
  onMouseFollowChange,
  onSpawnPointsChange,
  onPlayerSpriteChange,
  onPlayerHitboxChange,
  onPermShieldChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [sel, setSel] = useState<Sel | null>(null);
  const [hover, setHover] = useState<Sel | null>(null);
  const [drag, setDrag] = useState<Drag>({ kind: "none" });

  // Asset state
  const [assets, setAssets] = useState({ player: false, shield: false, bg: false });

  // ── Measure container ──
  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDims({ w: Math.floor(r.width), h: Math.floor(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [zoom]);

  // ── Load assets ──
  useEffect(() => {
    const loadImg = (src: string, key: "player" | "shield" | "bg") => {
      const img = new Image();
      img.src = src;
      img.onload = () => setAssets((a) => ({ ...a, [key]: true }));
      img.onerror = () => setAssets((a) => ({ ...a, [key]: true })); // don't block on missing
      return img;
    };
    loadImg("/player/player.png", "player");
    loadImg("/shield/shield.png", "shield");
    loadImg(platform === "mobile" ? "/images/stage_mobile.png" : "/images/stage.png", "bg");
  }, [platform]);

  // ── Helpers ──
  const getScale = useCallback(() => (dims.h > 0 ? dims.h / BASE_H : 1), [dims.h]);

  const pixToGame = useCallback((px: number, py: number) => {
    const sc = getScale();
    return { x: px / sc, y: py / sc };
  }, [getScale]);

  // ── Hit test ──
  const hitTest = useCallback((gx: number, gy: number): Sel | null => {
    const sc = getScale();
    const logW = dims.w / sc;
    const xs = logW / BASE_W;
    const T = 8; // threshold

    // UI elements (topmost)
    const uiKeys = ["hearts", "arrowKeys", "fireButton", "score", "wave", "powerUps", "bossHealthBar", "controls"];
    for (const key of uiKeys) {
      const el = (settings as any)[key];
      if (!el || el.visible === false) continue;
      let ex = el.x * xs, ey = el.y, ew = el.size ?? 20, eh = el.size ?? 20;
      if (key === "touchArea") { ew = el.width; eh = el.height; }
      if (key === "controls") { ew = (el.size ?? 24) * 3; eh = el.size ?? 24; }
      if (key === "bossHealthBar") { ew = (el.size ?? 6) * 10; eh = el.size ?? 6; }
      if (inRect(gx, gy, ex, ey, ew, eh)) return { type: "ui", key };
    }

    // Bullet spawn
    const bsoX = bulletSpawnOffsetX ?? 5;
    const bsoY = bulletSpawnOffsetY ?? 10;
    const bsx = settings.player.x * xs + bsoX;
    const bsy = settings.player.y + bsoY;
    if (dist(gx, gy, bsx, bsy) < T) return { type: "bulletSpawn" };

    // Temp shield
    const shCX = settings.player.x * xs + playerSprite.offsetX + playerSprite.width / 2 + settings.shield.offsetX;
    const shCY = settings.player.y + playerSprite.offsetY + playerSprite.height / 2 + settings.shield.offsetY;
    if (dist(gx, gy, shCX, shCY) < settings.shield.radius + 4) return { type: "shield" };

    // Perm shield
    const ps = (settings as any).permShield;
    if (ps) {
      const pcx = settings.player.x * xs + playerSprite.offsetX + playerSprite.width / 2 + (ps.offsetX ?? 0);
      const pcy = settings.player.y + playerSprite.offsetY + playerSprite.height / 2 + (ps.offsetY ?? 0);
      if (dist(gx, gy, pcx, pcy) < (ps.radius ?? 20) + 4) return { type: "permShield" };
    }

    // Hitbox
    const hb = (settings as any).playerHitbox ?? {};
    const hx = settings.player.x * xs + (hb.offsetX ?? 0);
    const hy = settings.player.y + (hb.offsetY ?? 0);
    if (inRect(gx, gy, hx, hy, hb.width ?? 10, hb.height ?? 20)) return { type: "hitbox" };

    // Player sprite
    const sprX = settings.player.x * xs + playerSprite.offsetX;
    const sprY = settings.player.y + playerSprite.offsetY;
    if (inRect(gx, gy, sprX, sprY, playerSprite.width, playerSprite.height)) return { type: "player" };

    // Boss
    if (bossSettings.enabled) {
      const bx = settings.boss.x * xs;
      const by = settings.boss.y;
      if (inRect(gx, gy, bx, by, bossSettings.width, bossSettings.height)) return { type: "boss" };
    }

    // Spawn points
    const sps = spawnPoints ?? settings.spawnPoints;
    for (let i = 0; i < sps.length; i++) {
      const sp = sps[i];
      if (!sp.enabled) continue;
      if (dist(gx, gy, sp.x * xs, sp.y) < 10) return { type: "spawnPoint", index: i };
    }

    return null;
  }, [settings, playerSprite, bossSettings, bulletSpawnOffsetX, bulletSpawnOffsetY, spawnPoints, getScale, dims.w]);

  // ── Handle detection ──
  const getHandle = useCallback((el: Sel, gx: number, gy: number): string | null => {
    const sc = getScale();
    const logW = dims.w / sc;
    const xs = logW / BASE_W;
    const T = 8;
    const near = (ax: number, ay: number) => dist(gx, gy, ax, ay) < T;

    switch (el.type) {
      case "player": {
        const sx = settings.player.x * xs + playerSprite.offsetX;
        const sy = settings.player.y + playerSprite.offsetY;
        if (near(sx + playerSprite.width, sy + playerSprite.height)) return "se";
        return null;
      }
      case "hitbox": {
        const hb = (settings as any).playerHitbox ?? {};
        const hx = settings.player.x * xs + (hb.offsetX ?? 0);
        const hy = settings.player.y + (hb.offsetY ?? 0);
        if (near(hx + (hb.width ?? 10), hy + (hb.height ?? 20))) return "se";
        return null;
      }
      case "shield": {
        const scx = settings.player.x * xs + playerSprite.offsetX + playerSprite.width / 2 + settings.shield.offsetX;
        const scy = settings.player.y + playerSprite.offsetY + playerSprite.height / 2 + settings.shield.offsetY;
        if (near(scx + settings.shield.radius, scy)) return "radius";
        return null;
      }
      case "boss": {
        const bx = settings.boss.x * xs;
        const by = settings.boss.y;
        if (near(bx + bossSettings.width, by + bossSettings.height)) return "se";
        return null;
      }
      case "spawnPoint": {
        const sp = (spawnPoints ?? settings.spawnPoints)[el.index];
        if (near(sp.x * xs, sp.y)) return "center";
        return null;
      }
      case "ui": {
        const u = (settings as any)[el.key];
        let ex = u.x * xs, ey = u.y, ew = u.size ?? 20, eh = u.size ?? 20;
        if (el.key === "touchArea") { ew = u.width; eh = u.height; }
        if (el.key === "controls") { ew = (u.size ?? 24) * 3; eh = u.size ?? 24; }
        if (el.key === "bossHealthBar") { ew = (u.size ?? 6) * 10; eh = u.size ?? 6; }
        if (near(ex + ew, ey + eh)) return "se";
        return null;
      }
      default:
        return null;
    }
  }, [settings, playerSprite, bossSettings, spawnPoints, getScale, dims.w]);

  // ── Draw ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || dims.w === 0 || dims.h === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sc = getScale();
    const logW = dims.w / sc;
    const xs = logW / BASE_W;

    canvas.width = dims.w;
    canvas.height = dims.h;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, dims.w, dims.h);
    ctx.save();
    ctx.scale(sc, sc);

    // ── Background ──
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, logW, BASE_H);

    // Starfield
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 37 + 13) % (logW + 10)) - 5;
      const sy = ((i * 53 + 7) % (BASE_H + 10)) - 5;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // ── Spawn points + enemy reps ──
    const sps = spawnPoints ?? settings.spawnPoints;
    const { enemy } = settings;
    for (let i = 0; i < sps.length; i++) {
      const sp = sps[i];
      const sx = sp.x * xs;
      const sy = sp.y;
      if (sp.enabled) {
        const ew = enemy.width, eh = enemy.height;
        const ess = enemy.spriteScale ?? 1;
        const esprW = ew * ess, esprH = eh * ess;
        const esprX = sx - ew / 2 - (esprW - ew) / 2;
        const esprY = sy - (esprH - eh) / 2;
        drawEnemy(ctx, esprX, esprY, i % 3 as 0 | 1 | 2, 0, false, esprW, esprH);
      }
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = sp.enabled ? "rgba(255,0,110,0.5)" : "rgba(100,100,100,0.3)";
      ctx.fill();
      ctx.strokeStyle = sel?.type === "spawnPoint" && sel.index === i ? "#fff" : sp.enabled ? "#ff006e" : "#666";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`S${i + 1}`, sx, sy - 10);
    }

    // ── Player ──
    const pbx = settings.player.x * xs;
    const pby = settings.player.y;
    const psx = pbx + playerSprite.offsetX;
    const psy = pby + playerSprite.offsetY;

    // Try real sprite first
    const playerImg = document.querySelector<HTMLImageElement>(`img[src="/player/player.png"]`);
    // Actually load it properly via a ref-like approach - we'll use a module cache
    // For now, use the procedural fallback which looks like a guitar
    drawPlayer(ctx, psx, psy, 0);

    // Player selection outline
    if (sel?.type === "player") {
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(psx, psy, playerSprite.width, playerSprite.height);
      ctx.setLineDash([]);
      // Resize handle
      ctx.fillStyle = "#fff";
      ctx.fillRect(psx + playerSprite.width - 3, psy + playerSprite.height - 3, 6, 6);
      ctx.restore();
    }

    // ── Hitbox ──
    const hb = (settings as any).playerHitbox ?? {};
    const hx = pbx + (hb.offsetX ?? 0);
    const hy = pby + (hb.offsetY ?? 0);
    const hw = hb.width ?? 10, hh = hb.height ?? 20;
    ctx.save();
    ctx.strokeStyle = sel?.type === "hitbox" ? "#fff" : "rgba(255,0,110,0.7)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(hx, hy, hw, hh);
    ctx.fillStyle = "rgba(255,0,110,0.08)";
    ctx.fillRect(hx, hy, hw, hh);
    ctx.setLineDash([]);
    if (sel?.type === "hitbox") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(hx + hw - 3, hy + hh - 3, 6, 6);
    }
    ctx.restore();

    // ── Bullet spawn ──
    const bsoX = bulletSpawnOffsetX ?? 5;
    const bsoY = bulletSpawnOffsetY ?? 10;
    const bsx = pbx + bsoX;
    const bsy = pby + bsoY;
    ctx.save();
    ctx.strokeStyle = sel?.type === "bulletSpawn" ? "#fff" : "#00f0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bsx, bsy, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bsx - 6, bsy); ctx.lineTo(bsx + 6, bsy);
    ctx.moveTo(bsx, bsy - 6); ctx.lineTo(bsx, bsy + 6);
    ctx.stroke();
    ctx.fillStyle = sel?.type === "bulletSpawn" ? "#fff" : "#00f0ff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Bullet", bsx, bsy - 10);
    ctx.restore();

    // ── Temp Shield ──
    const shCX = pbx + playerSprite.offsetX + playerSprite.width / 2 + settings.shield.offsetX;
    const shCY = pby + playerSprite.offsetY + playerSprite.height / 2 + settings.shield.offsetY;
    ctx.save();
    ctx.strokeStyle = sel?.type === "shield" ? "#fff" : "rgba(0,240,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shCX, shCY, settings.shield.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,240,255,0.06)";
    ctx.fill();
    if (sel?.type === "shield") {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(shCX + settings.shield.radius, shCY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Shield", shCX, shCY - settings.shield.radius - 4);
    ctx.restore();

    // ── Perm Shield ──
    const psh = (settings as any).permShield;
    if (psh) {
      const pcx = pbx + playerSprite.offsetX + playerSprite.width / 2 + (psh.offsetX ?? 0);
      const pcy = pby + playerSprite.offsetY + playerSprite.height / 2 + (psh.offsetY ?? 0);
      const pr = (psh.radius ?? 20) * (psh.size ?? 1);
      ctx.save();
      ctx.strokeStyle = sel?.type === "permShield" ? "#fff" : "rgba(0,240,255,0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(pcx, pcy, pr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(0,240,255,0.04)";
      ctx.fill();
      ctx.fillStyle = "#00f0ff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Perm", pcx, pcy - pr - 4);
      ctx.restore();
    }

    // ── Boss ──
    if (bossSettings.enabled) {
      const bx = settings.boss.x * xs;
      const by = settings.boss.y;
      const bw = bossSettings.width;
      const bh = bossSettings.height;
      drawBoss(ctx, bx, by, bw, bh, 0, 0, 1);

      ctx.save();
      ctx.strokeStyle = sel?.type === "boss" ? "#fff" : "#ff006e";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,0,110,0.08)";
      ctx.fillRect(bx, by, bw, bh);
      if (sel?.type === "boss") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(bx + bw - 3, by + bh - 3, 6, 6);
      }
      ctx.restore();
    }

    // ── UI Elements ──
    const uiKeys = ["hearts", "arrowKeys", "fireButton", "score", "wave", "powerUps", "bossHealthBar", "controls"];
    for (const key of uiKeys) {
      const el = (settings as any)[key];
      if (!el || el.visible === false) continue;
      const ex = el.x * xs, ey = el.y;
      let ew = el.size ?? 20, eh = el.size ?? 20;
      if (key === "touchArea") { ew = el.width; eh = el.height; }
      if (key === "controls") { ew = (el.size ?? 24) * 3; eh = el.size ?? 24; }
      if (key === "bossHealthBar") { ew = (el.size ?? 6) * 10; eh = el.size ?? 6; }
      const isSel = sel?.type === "ui" && sel.key === key;
      ctx.save();
      ctx.strokeStyle = isSel ? "#fff" : "rgba(0,240,255,0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(ex, ey, ew, eh);
      ctx.setLineDash([]);
      ctx.fillStyle = isSel ? "rgba(0,240,255,0.12)" : "rgba(0,240,255,0.04)";
      ctx.fillRect(ex, ey, ew, eh);
      ctx.fillStyle = isSel ? "#fff" : "rgba(0,240,255,0.5)";
      ctx.font = "8px monospace";
      ctx.textAlign = "left";
      ctx.fillText(key, ex + 2, ey + 10);
      if (isSel) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(ex + ew - 3, ey + eh - 3, 6, 6);
      }
      ctx.restore();
    }

    // ── Mouse-follow cursor ──
    const mfoX = mouseFollowOffsetX ?? (playerSprite.offsetX + playerSprite.width / 2);
    const mfoY = mouseFollowOffsetY ?? (playerSprite.offsetY + playerSprite.height / 2);
    const mfx = pbx + mfoX;
    const mfy = pby + mfoY;
    ctx.save();
    ctx.strokeStyle = "rgba(255,204,0,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(mfx, mfy, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffcc00";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Aim", mfx, mfy - 8);
    ctx.restore();

    ctx.restore();
  }, [dims, settings, playerSprite, bossSettings, sel, spawnPoints, bulletSpawnOffsetX, bulletSpawnOffsetY, mouseFollowOffsetX, mouseFollowOffsetY, assets]);

  useEffect(() => { draw(); }, [draw]);

  // ── Mouse events ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { x: gx, y: gy } = pixToGame(px, py);

    // Check handle first if something is selected
    if (sel) {
      const h = getHandle(sel, gx, gy);
      if (h) {
        setDrag({ kind: "resize", el: sel, handle: h, sx: gx, sy: gy });
        return;
      }
    }

    const hit = hitTest(gx, gy);
    if (hit) {
      setSel(hit);
      setDrag({ kind: "move", el: hit, sx: gx, sy: gy });
    } else {
      setSel(null);
    }
  }, [hitTest, getHandle, pixToGame, sel]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { x: gx, y: gy } = pixToGame(px, py);

    if (drag.kind === "none") {
      const h = sel ? getHandle(sel, gx, gy) : null;
      if (h) { canvas.style.cursor = "nwse-resize"; setHover(null); return; }
      const hit = hitTest(gx, gy);
      setHover(hit);
      canvas.style.cursor = hit ? "move" : "default";
      return;
    }

    const sc = getScale();
    const logW = dims.w / sc;
    const xs = logW / BASE_W;
    const dx = gx - drag.sx;
    const dy = gy - drag.sy;

    if (drag.kind === "resize") {
      switch (drag.el.type) {
        case "player":
          if (drag.handle === "se") {
            onPlayerSpriteChange?.({ ...playerSprite, width: Math.max(1, playerSprite.width + dx), height: Math.max(1, playerSprite.height + dy) });
          }
          break;
        case "hitbox": {
          const hb = (settings as any).playerHitbox ?? {};
          if (drag.handle === "se") {
            onPlayerHitboxChange?.({ ...hb, width: Math.max(1, (hb.width ?? 10) + dx), height: Math.max(1, (hb.height ?? 20) + dy) });
          }
          break;
        }
        case "shield":
          if (drag.handle === "radius") {
            onChange({ ...settings, shield: { ...settings.shield, radius: Math.max(1, settings.shield.radius + dx) } });
          }
          break;
        case "boss":
          if (drag.handle === "se") {
            onBossChange?.({ ...bossSettings, width: Math.max(10, bossSettings.width + dx), height: Math.max(10, bossSettings.height + dy) });
          }
          break;
        case "ui": {
          const u = (settings as any)[drag.el.key];
          if (drag.handle === "se") {
            const size = Math.max(1, (u.size ?? 20) + dx);
            onChange({ ...settings, [drag.el.key]: { ...u, size } });
          }
          break;
        }
      }
    } else if (drag.kind === "move") {
      switch (drag.el.type) {
        case "player": {
          const nx = clamp(settings.player.x + dx / xs, 0, BASE_W);
          const ny = clamp(settings.player.y + dy, 0, BASE_H);
          onChange({ ...settings, player: { ...settings.player, x: nx, y: ny } });
          break;
        }
        case "hitbox": {
          const hb = (settings as any).playerHitbox ?? {};
          onPlayerHitboxChange?.({ ...hb, offsetX: (hb.offsetX ?? 0) + dx, offsetY: (hb.offsetY ?? 0) + dy });
          break;
        }
        case "bulletSpawn": {
          onBulletSpawnChange?.((bulletSpawnOffsetX ?? 5) + dx, (bulletSpawnOffsetY ?? 10) + dy);
          break;
        }
        case "shield": {
          onChange({ ...settings, shield: { ...settings.shield, offsetX: settings.shield.offsetX + dx, offsetY: settings.shield.offsetY + dy } });
          break;
        }
        case "permShield": {
          const ps = (settings as any).permShield ?? { offsetX: 0, offsetY: 0, radius: 20 };
          onPermShieldChange?.({ ...ps, offsetX: ps.offsetX + dx, offsetY: ps.offsetY + dy });
          break;
        }
        case "boss": {
          const nx = clamp(settings.boss.x + dx / xs, 0, BASE_W);
          const ny = clamp(settings.boss.y + dy, 0, BASE_H);
          onChange({ ...settings, boss: { ...settings.boss, x: nx, y: ny } });
          break;
        }
        case "spawnPoint": {
          const idx = (drag.el as Extract<Sel, { type: "spawnPoint" }>).index;
          const sps = (spawnPoints ?? settings.spawnPoints).map((sp, i) =>
            i === idx
              ? { ...sp, x: clamp(sp.x + dx / xs, 0, BASE_W), y: clamp(sp.y + dy, 0, BASE_H) }
              : sp
          ) as [SpawnPoint, SpawnPoint, SpawnPoint];
          onSpawnPointsChange?.(sps);
          break;
        }
        case "ui": {
          const u = (settings as any)[drag.el.key];
          const nx = clamp(u.x + dx / xs, 0, BASE_W);
          const ny = clamp(u.y + dy, 0, BASE_H);
          onChange({ ...settings, [drag.el.key]: { ...u, x: nx, y: ny } });
          break;
        }
      }
    }

    setDrag((prev) => prev.kind === "none" ? prev : { ...prev, sx: gx, sy: gy });
  }, [drag, getScale, dims.w, settings, playerSprite, bossSettings, spawnPoints, bulletSpawnOffsetX, bulletSpawnOffsetY, onChange, onBossChange, onBulletSpawnChange, onSpawnPointsChange, onPlayerSpriteChange, onPlayerHitboxChange, onPermShieldChange, hitTest, getHandle, pixToGame, sel]);

  const onMouseUp = useCallback(() => setDrag({ kind: "none" }), []);

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden" style={{ cursor: hover ? "move" : "default" }}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
      {/* Inspector */}
      <div className="absolute top-3 right-3 w-56 space-y-2 pointer-events-auto">
        <Inspector
          sel={sel}
          settings={settings}
          playerSprite={playerSprite}
          bossSettings={bossSettings}
          hitboxPoints={hitboxPoints}
          bulletSpawnOffsetX={bulletSpawnOffsetX}
          bulletSpawnOffsetY={bulletSpawnOffsetY}
          onChange={onChange}
          onBossChange={onBossChange}
          onBulletSpawnChange={onBulletSpawnChange}
          onPlayerSpriteChange={onPlayerSpriteChange}
          onPlayerHitboxChange={onPlayerHitboxChange}
          onPermShieldChange={onPermShieldChange}
        />
      </div>
    </div>
  );
}

