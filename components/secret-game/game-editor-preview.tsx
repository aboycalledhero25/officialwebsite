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
import { drawEnemy, drawBoss } from "./draw-sprites";
import { loadPlayerSprite, drawPlayerSprite } from "./player-sprite";
import { drawBossSprite, loadBossSkin } from "./boss-sprites";

const BASE_W = 240;
const BASE_H = 320;

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

type SelectableElement =
  | { type: "player" }
  | { type: "hitbox" }
  | { type: "bulletSpawn" }
  | { type: "shield" }
  | { type: "permShield" }
  | { type: "boss" }
  | { type: "spawnPoint"; index: number }
  | { type: "ui"; key: string };

type DragMode =
  | { kind: "none" }
  | { kind: "move"; element: SelectableElement; startGameX: number; startGameY: number }
  | { kind: "resize"; element: SelectableElement; handle: string; startGameX: number; startGameY: number };

interface GameEditorPreviewProps {
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
  onBulletSpawnChange?: (offsetX: number, offsetY: number) => void;
  onMouseFollowChange?: (offsetX: number, offsetY: number) => void;
  onSpawnPointsChange?: (next: [SpawnPoint, SpawnPoint, SpawnPoint]) => void;
  onPlayerSpriteChange?: (next: PlayerSprite) => void;
  onPlayerHitboxChange?: (next: PlayerHitbox) => void;
  onPermShieldChange?: (next: GameShieldSettings) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Geometry helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function distToPoint(px: number, py: number, tx: number, ty: number): number {
  return Math.sqrt((px - tx) ** 2 + (py - ty) ** 2);
}

function getXScale(logW: number) {
  return logW / BASE_W;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Asset cache — singleton so previews share loaded images
   ═══════════════════════════════════════════════════════════════════════════ */

const assetCache: Record<string, HTMLImageElement> = {};

function loadImage(src: string): HTMLImageElement {
  if (assetCache[src]) return assetCache[src];
  const img = new Image();
  img.src = src;
  assetCache[src] = img;
  return img;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Inspector sub-component
   ═══════════════════════════════════════════════════════════════════════════ */

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 rounded border border-[#333] bg-[#1a1a1a] px-2 py-1 text-xs text-white text-right outline-none focus:border-[#00f0ff]"
      />
    </div>
  );
}

function InspectorPanel({
  selected,
  settings,
  playerSprite,
  bossSettings,
  hitboxPoints,
  bulletSpawnOffsetX,
  bulletSpawnOffsetY,
  onChange,
  onBossChange,
  onHitboxChange,
  onBulletSpawnChange,
  onPlayerSpriteChange,
  onPlayerHitboxChange,
  onPermShieldChange,
}: {
  selected: SelectableElement | null;
  settings: GamePlatformSettings;
  playerSprite: PlayerSprite;
  bossSettings: BossSettings;
  hitboxPoints?: HitboxPoint[];
  bulletSpawnOffsetX?: number;
  bulletSpawnOffsetY?: number;
  onChange: (next: GamePlatformSettings) => void;
  onBossChange?: (next: BossSettings) => void;
  onHitboxChange?: (points: HitboxPoint[]) => void;
  onBulletSpawnChange?: (offsetX: number, offsetY: number) => void;
  onPlayerSpriteChange?: (next: PlayerSprite) => void;
  onPlayerHitboxChange?: (next: PlayerHitbox) => void;
  onPermShieldChange?: (next: GameShieldSettings) => void;
}) {
  if (!selected) {
    return (
      <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-4 text-xs text-neutral-500">
        Click an element on the canvas to edit its properties.
      </div>
    );
  }

  const patchPlatform = (patch: Partial<GamePlatformSettings>) => onChange({ ...settings, ...patch });
  const patchPlayer = (patch: Partial<GamePlatformSettings["player"]>) =>
    onChange({ ...settings, player: { ...settings.player, ...patch } });
  const patchShield = (patch: Partial<GamePlatformSettings["shield"]>) =>
    onChange({ ...settings, shield: { ...settings.shield, ...patch } });
  const patchBossPos = (patch: Partial<GamePlatformSettings["boss"]>) =>
    onChange({ ...settings, boss: { ...settings.boss, ...patch } });
  const patchUI = (key: keyof GamePlatformSettings, patch: any) =>
    onChange({ ...settings, [key]: { ...(settings as any)[key], ...patch } });

  switch (selected.type) {
    case "player":
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-4 space-y-3">
          <div className="text-xs font-semibold text-white">Player Sprite</div>
          <NumberInput label="X" value={settings.player.x} onChange={(v) => patchPlayer({ x: v })} min={0} max={240} />
          <NumberInput label="Y" value={settings.player.y} onChange={(v) => patchPlayer({ y: v })} min={0} max={320} />
          <NumberInput label="Sprite Offset X" value={playerSprite.offsetX} onChange={(v) => onPlayerSpriteChange?.({ ...playerSprite, offsetX: v })} />
          <NumberInput label="Sprite Offset Y" value={playerSprite.offsetY} onChange={(v) => onPlayerSpriteChange?.({ ...playerSprite, offsetY: v })} />
          <NumberInput label="Width" value={playerSprite.width} onChange={(v) => onPlayerSpriteChange?.({ ...playerSprite, width: v })} min={1} max={200} />
          <NumberInput label="Height" value={playerSprite.height} onChange={(v) => onPlayerSpriteChange?.({ ...playerSprite, height: v })} min={1} max={200} />
          <NumberInput label="Cols" value={playerSprite.cols ?? 12} onChange={(v) => onPlayerSpriteChange?.({ ...playerSprite, cols: v })} min={1} max={60} />
        </div>
      );

    case "hitbox": {
      const hb = hitboxPoints && hitboxPoints.length >= 3 ? null : (settings as any).playerHitbox ?? {};
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-4 space-y-3">
          <div className="text-xs font-semibold text-white">Player Hitbox</div>
          {hitboxPoints && hitboxPoints.length >= 3 ? (
            <div className="text-xs text-neutral-500">Polygon mode active ({hitboxPoints.length} points)</div>
          ) : (
            <>
              <NumberInput label="Offset X" value={hb.offsetX ?? 0} onChange={(v) => onPlayerHitboxChange?.({ ...hb, offsetX: v })} />
              <NumberInput label="Offset Y" value={hb.offsetY ?? 0} onChange={(v) => onPlayerHitboxChange?.({ ...hb, offsetY: v })} />
              <NumberInput label="Width" value={hb.width ?? 10} onChange={(v) => onPlayerHitboxChange?.({ ...hb, width: v })} min={1} max={200} />
              <NumberInput label="Height" value={hb.height ?? 20} onChange={(v) => onPlayerHitboxChange?.({ ...hb, height: v })} min={1} max={200} />
            </>
          )}
        </div>
      );
    }

    case "bulletSpawn":
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-4 space-y-3">
          <div className="text-xs font-semibold text-white">Bullet Spawn</div>
          <NumberInput label="Offset X" value={bulletSpawnOffsetX ?? 5} onChange={(v) => onBulletSpawnChange?.(v, bulletSpawnOffsetY ?? 10)} />
          <NumberInput label="Offset Y" value={bulletSpawnOffsetY ?? 10} onChange={(v) => onBulletSpawnChange?.(bulletSpawnOffsetX ?? 5, v)} />
        </div>
      );

    case "shield":
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-4 space-y-3">
          <div className="text-xs font-semibold text-white">Temp Shield</div>
          <NumberInput label="Offset X" value={settings.shield.offsetX} onChange={(v) => patchShield({ offsetX: v })} />
          <NumberInput label="Offset Y" value={settings.shield.offsetY} onChange={(v) => patchShield({ offsetY: v })} />
          <NumberInput label="Radius" value={settings.shield.radius} onChange={(v) => patchShield({ radius: v })} min={1} max={100} />
        </div>
      );

    case "permShield":
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-4 space-y-3">
          <div className="text-xs font-semibold text-white">Perm Shield</div>
          <NumberInput label="Offset X" value={((settings as any).permShield?.offsetX) ?? 0} onChange={(v) => onPermShieldChange?.({ ...(settings as any).permShield, offsetX: v })} />
          <NumberInput label="Offset Y" value={((settings as any).permShield?.offsetY) ?? 0} onChange={(v) => onPermShieldChange?.({ ...(settings as any).permShield, offsetY: v })} />
          <NumberInput label="Radius" value={((settings as any).permShield?.radius) ?? 20} onChange={(v) => onPermShieldChange?.({ ...(settings as any).permShield, radius: v })} min={1} max={100} />
          <NumberInput label="Size" value={((settings as any).permShield?.size) ?? 1} onChange={(v) => onPermShieldChange?.({ ...(settings as any).permShield, size: v })} min={0.1} max={5} step={0.1} />
        </div>
      );

    case "boss":
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-4 space-y-3">
          <div className="text-xs font-semibold text-white">Boss</div>
          <NumberInput label="X" value={settings.boss.x} onChange={(v) => patchBossPos({ x: v })} min={0} max={240} />
          <NumberInput label="Y" value={settings.boss.y} onChange={(v) => patchBossPos({ y: v })} min={0} max={320} />
          <NumberInput label="Width" value={bossSettings.width} onChange={(v) => onBossChange?.({ ...bossSettings, width: v })} min={10} max={200} />
          <NumberInput label="Height" value={bossSettings.height} onChange={(v) => onBossChange?.({ ...bossSettings, height: v })} min={10} max={200} />
        </div>
      );

    case "spawnPoint": {
      const sp = settings.spawnPoints[selected.index];
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-4 space-y-3">
          <div className="text-xs font-semibold text-white">Spawn Point {selected.index + 1}</div>
          <NumberInput label="X" value={sp.x} onChange={(v) => {
            const next: [SpawnPoint, SpawnPoint, SpawnPoint] = [...settings.spawnPoints] as any;
            next[selected.index] = { ...next[selected.index], x: v };
            onChange({ ...settings, spawnPoints: next });
          }} min={0} max={240} />
          <NumberInput label="Y" value={sp.y} onChange={(v) => {
            const next: [SpawnPoint, SpawnPoint, SpawnPoint] = [...settings.spawnPoints] as any;
            next[selected.index] = { ...next[selected.index], y: v };
            onChange({ ...settings, spawnPoints: next });
          }} min={0} max={320} />
        </div>
      );
    }

    case "ui": {
      const key = selected.key;
      const uiEl = (settings as any)[key] as any;
      return (
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]/95 p-4 space-y-3">
          <div className="text-xs font-semibold text-white">{key}</div>
          <NumberInput label="X" value={uiEl.x} onChange={(v) => patchUI(key as any, { x: v })} min={0} max={240} />
          <NumberInput label="Y" value={uiEl.y} onChange={(v) => patchUI(key as any, { y: v })} min={0} max={320} />
          {"size" in uiEl && (
            <NumberInput label="Size" value={uiEl.size} onChange={(v) => patchUI(key as any, { size: v })} min={1} max={200} />
          )}
          {"width" in uiEl && (
            <NumberInput label="Width" value={uiEl.width} onChange={(v) => patchUI(key as any, { width: v })} min={1} max={240} />
          )}
          {"height" in uiEl && (
            <NumberInput label="Height" value={uiEl.height} onChange={(v) => patchUI(key as any, { height: v })} min={1} max={320} />
          )}
          {"visible" in uiEl && (
            <label className="flex items-center gap-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={uiEl.visible}
                onChange={(e) => patchUI(key as any, { visible: e.target.checked })}
                className="accent-[#00f0ff]"
              />
              Visible
            </label>
          )}
        </div>
      );
    }

    default:
      return null;
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
}: GameEditorPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<SelectableElement | null>(null);
  const [hovered, setHovered] = useState<SelectableElement | null>(null);
  const [drag, setDrag] = useState<DragMode>({ kind: "none" });

  // Asset refs
  const playerImgRef = useRef<HTMLImageElement | null>(null);
  const shieldImgRef = useRef<HTMLImageElement | null>(null);
  const bossImgRef = useRef<HTMLImageElement | null>(null);
  const stageBgRef = useRef<HTMLImageElement | null>(null);

  // Load assets once
  useEffect(() => {
    loadPlayerSprite();
    playerImgRef.current = assetCache["/player/player.png"] ?? null;
    const shImg = loadImage("/shield/shield.png");
    shImg.onload = () => { shieldImgRef.current = shImg; requestDraw(); };
    shieldImgRef.current = shImg;

    const bgKey = platform === "mobile" ? "/images/stage_mobile.png" : "/images/stage.png";
    const bgImg = loadImage(bgKey);
    bgImg.onload = () => { stageBgRef.current = bgImg; requestDraw(); };
    stageBgRef.current = bgImg;

    // Load a random boss skin
    const VALID_BOSS_SKINS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 15, 16, 17, 18];
    const skinIdx = VALID_BOSS_SKINS[0];
    loadBossSkin(skinIdx);
    const bossKey = `/bosses/skins/${skinIdx}.png`;
    const bImg = loadImage(bossKey);
    bImg.onload = () => { bossImgRef.current = bImg; requestDraw(); };
    bossImgRef.current = bImg;
  }, [platform]);

  // Measure container
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDims({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [zoom]);

  // Coordinate conversion: pixel -> game-logical
  const getScale = useCallback(() => {
    return dims.h / BASE_H;
  }, [dims.h]);

  const pixelToGame = useCallback(
    (px: number, py: number) => {
      const sc = getScale();
      return { x: px / sc, y: py / sc };
    },
    [getScale]
  );

  const gameToPixel = useCallback(
    (gx: number, gy: number) => {
      const sc = getScale();
      return { x: gx * sc, y: gy * sc };
    },
    [getScale]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Hit-testing
  // ═══════════════════════════════════════════════════════════════════════

  const hitTest = useCallback(
    (gameX: number, gameY: number): SelectableElement | null => {
      const sc = getScale();
      const logW = dims.w / sc;
      const xScale = logW / BASE_W;

      // Check UI elements first (topmost)
      const uiKeys = ["hearts", "arrowKeys", "fireButton", "score", "wave", "powerUps", "bossHealthBar", "controls"];
      for (const key of uiKeys) {
        const el = (settings as any)[key];
        if (!el || el.visible === false) continue;
        const ex = el.x * xScale;
        const ey = el.y;
        let ew = el.size ?? 20;
        let eh = el.size ?? 20;
        if (key === "touchArea") { ew = el.width; eh = el.height; }
        if (key === "controls") { ew = (el.size ?? 24) * 3; eh = el.size ?? 24; }
        if (key === "bossHealthBar") { ew = (el.size ?? 6) * 10; eh = el.size ?? 6; }
        if (pointInRect(gameX, gameY, ex, ey, ew, eh)) {
          return { type: "ui", key };
        }
      }

      // Bullet spawn
      const bsoX = bulletSpawnOffsetX ?? 5;
      const bsoY = bulletSpawnOffsetY ?? 10;
      const bsPx = settings.player.x * xScale + bsoX;
      const bsPy = settings.player.y + bsoY;
      if (distToPoint(gameX, gameY, bsPx, bsPy) < 8) {
        return { type: "bulletSpawn" };
      }

      // Shield
      const shieldCX = settings.player.x * xScale + playerSprite.offsetX + playerSprite.width / 2 + settings.shield.offsetX;
      const shieldCY = settings.player.y + playerSprite.offsetY + playerSprite.height / 2 + settings.shield.offsetY;
      if (distToPoint(gameX, gameY, shieldCX, shieldCY) < settings.shield.radius + 4) {
        return { type: "shield" };
      }

      // Perm shield
      const permCX = settings.player.x * xScale + playerSprite.offsetX + playerSprite.width / 2 + ((settings as any).permShield?.offsetX ?? 0);
      const permCY = settings.player.y + playerSprite.offsetY + playerSprite.height / 2 + ((settings as any).permShield?.offsetY ?? 0);
      const permR = (settings as any).permShield?.radius ?? 20;
      if (distToPoint(gameX, gameY, permCX, permCY) < permR + 4) {
        return { type: "permShield" };
      }

      // Hitbox
      const hb = (settings as any).playerHitbox ?? {};
      const hbX = settings.player.x * xScale + (hb.offsetX ?? 0);
      const hbY = settings.player.y + (hb.offsetY ?? 0);
      const hbW = hb.width ?? 10;
      const hbH = hb.height ?? 20;
      if (pointInRect(gameX, gameY, hbX, hbY, hbW, hbH)) {
        return { type: "hitbox" };
      }

      // Player sprite
      const sprX = settings.player.x * xScale + playerSprite.offsetX;
      const sprY = settings.player.y + playerSprite.offsetY;
      if (pointInRect(gameX, gameY, sprX, sprY, playerSprite.width, playerSprite.height)) {
        return { type: "player" };
      }

      // Boss
      if (bossSettings.enabled) {
        const bx = settings.boss.x * xScale;
        const by = settings.boss.y;
        if (pointInRect(gameX, gameY, bx, by, bossSettings.width, bossSettings.height)) {
          return { type: "boss" };
        }
      }

      // Spawn points
      const sps = spawnPoints ?? settings.spawnPoints;
      for (let i = 0; i < sps.length; i++) {
        const sp = sps[i];
        if (!sp.enabled) continue;
        if (distToPoint(gameX, gameY, sp.x * xScale, sp.y) < 10) {
          return { type: "spawnPoint", index: i };
        }
      }

      return null;
    },
    [settings, playerSprite, bossSettings, bulletSpawnOffsetX, bulletSpawnOffsetY, spawnPoints, getScale, dims.w]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Drawing
  // ═══════════════════════════════════════════════════════════════════════

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || dims.w === 0 || dims.h === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sc = getScale();
    const logW = dims.w / sc;
    const xScale = logW / BASE_W;

    canvas.width = dims.w;
    canvas.height = dims.h;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, dims.w, dims.h);
    ctx.save();
    ctx.scale(sc, sc);

    // ── Background ──
    const bgImg = stageBgRef.current;
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      const imgW = bgImg.naturalWidth;
      const imgH = bgImg.naturalHeight;
      const bgScale = Math.max(logW / imgW, BASE_H / imgH);
      const drawW = imgW * bgScale;
      const drawH = imgH * bgScale;
      const offsetX = (logW - drawW) / 2;
      const offsetY = (BASE_H - drawH) / 2;
      ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);
    } else {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, logW, BASE_H);
    }

    // ── Spawn points with enemy representatives ──
    const sps = spawnPoints ?? settings.spawnPoints;
    const { enemy } = settings;
    for (let i = 0; i < sps.length; i++) {
      const sp = sps[i];
      const sx = sp.x * xScale;
      const sy = sp.y;

      // Draw enemy representative
      if (sp.enabled) {
        const ew = enemy.width;
        const eh = enemy.height;
        const ess = enemy.spriteScale ?? 1;
        const esprW = ew * ess;
        const esprH = eh * ess;
        const esprX = sx - ew / 2 - (esprW - ew) / 2;
        const esprY = sy - (esprH - eh) / 2;
        drawEnemy(ctx, esprX, esprY, i % 3 as 0 | 1 | 2, 0, false, esprW, esprH);
      }

      // Spawn point marker
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fillStyle = sp.enabled ? "rgba(255, 0, 110, 0.5)" : "rgba(100, 100, 100, 0.3)";
      ctx.fill();
      ctx.strokeStyle = selected?.type === "spawnPoint" && selected.index === i ? "#fff" : sp.enabled ? "#ff006e" : "#666";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`S${i + 1}`, sx, sy - 10);
    }

    // ── Player ──
    const pBaseX = settings.player.x * xScale;
    const pBaseY = settings.player.y;
    drawPlayerSprite(
      ctx,
      pBaseX + playerSprite.offsetX,
      pBaseY + playerSprite.offsetY,
      "down",
      0,
      playerSprite.width,
      playerSprite.height,
      playerSprite.cols,
      () => drawEnemy(ctx, pBaseX, pBaseY, 0, 0, false, 10, 20),
    );

    // ── Hitbox ──
    const hb = (settings as any).playerHitbox ?? {};
    const hbX = pBaseX + (hb.offsetX ?? 0);
    const hbY = pBaseY + (hb.offsetY ?? 0);
    const hbW = hb.width ?? 10;
    const hbH = hb.height ?? 20;
    ctx.save();
    ctx.strokeStyle = selected?.type === "hitbox" ? "#ff006e" : "rgba(255, 0, 110, 0.6)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(hbX, hbY, hbW, hbH);
    ctx.fillStyle = "rgba(255, 0, 110, 0.1)";
    ctx.fillRect(hbX, hbY, hbW, hbH);
    ctx.setLineDash([]);
    ctx.restore();

    // ── Bullet spawn marker ──
    const bsoX = bulletSpawnOffsetX ?? 5;
    const bsoY = bulletSpawnOffsetY ?? 10;
    const bsPx = pBaseX + bsoX;
    const bsPy = pBaseY + bsoY;
    ctx.save();
    ctx.strokeStyle = selected?.type === "bulletSpawn" ? "#fff" : "#00f0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bsPx, bsPy, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bsPx - 8, bsPy);
    ctx.lineTo(bsPx + 8, bsPy);
    ctx.moveTo(bsPx, bsPy - 8);
    ctx.lineTo(bsPx, bsPy + 8);
    ctx.stroke();
    ctx.fillStyle = selected?.type === "bulletSpawn" ? "#fff" : "#00f0ff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Bullet", bsPx, bsPy - 12);
    ctx.restore();

    // ── Temp Shield ──
    const shieldCX = pBaseX + playerSprite.offsetX + playerSprite.width / 2 + settings.shield.offsetX;
    const shieldCY = pBaseY + playerSprite.offsetY + playerSprite.height / 2 + settings.shield.offsetY;
    const shR = settings.shield.radius;
    ctx.save();
    ctx.strokeStyle = selected?.type === "shield" ? "#fff" : "rgba(0, 240, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shieldCX, shieldCY, shR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0, 240, 255, 0.08)";
    ctx.fill();
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Shield", shieldCX, shieldCY - shR - 4);
    ctx.restore();

    // ── Perm Shield ──
    const permShCfg = (settings as any).permShield;
    if (permShCfg) {
      const permCX = pBaseX + playerSprite.offsetX + playerSprite.width / 2 + (permShCfg.offsetX ?? 0);
      const permCY = pBaseY + playerSprite.offsetY + playerSprite.height / 2 + (permShCfg.offsetY ?? 0);
      const permR = permShCfg.radius ?? 20;
      const permScale = permShCfg.size ?? 1;
      ctx.save();
      ctx.strokeStyle = selected?.type === "permShield" ? "#fff" : "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(permCX, permCY, permR * permScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(0, 240, 255, 0.05)";
      ctx.fill();
      ctx.fillStyle = "#00f0ff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Perm", permCX, permCY - permR * permScale - 4);
      ctx.restore();
    }

    // ── Boss ──
    if (bossSettings.enabled) {
      const bx = settings.boss.x * xScale;
      const by = settings.boss.y;
      const bw = bossSettings.width;
      const bh = bossSettings.height;

      // Draw boss sprite if loaded
      const bImg = bossImgRef.current;
      if (bImg && bImg.complete && bImg.naturalWidth > 0) {
        const sprCfg = (settings as any).roguelikeConfig?.sprites ?? {};
        const sprW = bw * (sprCfg.bossWidthMult ?? 2.2);
        const sprH = bh * (sprCfg.bossHeightMult ?? 2.2);
        const sprX = bx + (sprCfg.bossOffsetX ?? -28);
        const sprY = by + (sprCfg.bossOffsetY ?? -35);
        drawBossSprite(ctx, sprX, sprY, sprW, sprH, 1, "walking", 0, 0, () => {});
      } else {
        drawBoss(ctx, bx, by, bw, bh, 0, 0, 1);
      }

      // Hitbox outline
      ctx.save();
      ctx.strokeStyle = selected?.type === "boss" ? "#fff" : "#ff006e";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255, 0, 110, 0.1)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.restore();
    }

    // ── UI Elements ──
    const uiKeys = ["hearts", "arrowKeys", "fireButton", "score", "wave", "powerUps", "bossHealthBar", "controls"];
    for (const key of uiKeys) {
      const el = (settings as any)[key];
      if (!el || el.visible === false) continue;
      const ex = el.x * xScale;
      const ey = el.y;
      let ew = el.size ?? 20;
      let eh = el.size ?? 20;
      if (key === "touchArea") { ew = el.width; eh = el.height; }
      if (key === "controls") { ew = (el.size ?? 24) * 3; eh = el.size ?? 24; }
      if (key === "bossHealthBar") { ew = (el.size ?? 6) * 10; eh = el.size ?? 6; }

      const isSelected = selected?.type === "ui" && selected.key === key;
      ctx.save();
      ctx.strokeStyle = isSelected ? "#fff" : "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(ex, ey, ew, eh);
      ctx.setLineDash([]);
      ctx.fillStyle = isSelected ? "rgba(0, 240, 255, 0.15)" : "rgba(0, 240, 255, 0.05)";
      ctx.fillRect(ex, ey, ew, eh);
      ctx.fillStyle = isSelected ? "#fff" : "rgba(0, 240, 255, 0.6)";
      ctx.font = "8px monospace";
      ctx.textAlign = "left";
      ctx.fillText(key, ex + 2, ey + 10);
      ctx.restore();
    }

    // ── Mouse-follow cursor ──
    const mfoX = mouseFollowOffsetX ?? (playerSprite.offsetX + playerSprite.width / 2);
    const mfoY = mouseFollowOffsetY ?? (playerSprite.offsetY + playerSprite.height / 2);
    const mfx = pBaseX + mfoX;
    const mfy = pBaseY + mfoY;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 204, 0, 0.6)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(mfx, mfy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffcc00";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Cursor", mfx, mfy - 10);
    ctx.restore();

    // ── Selection highlight ──
    if (selected) {
      drawSelectionHighlight(ctx, selected, settings, playerSprite, bossSettings, spawnPoints, bulletSpawnOffsetX, bulletSpawnOffsetY, logW);
    }

    ctx.restore();
  }, [dims, settings, playerSprite, bossSettings, selected, spawnPoints, bulletSpawnOffsetX, bulletSpawnOffsetY, mouseFollowOffsetX, mouseFollowOffsetY, getScale]);

  // ═══════════════════════════════════════════════════════════════════════
  // Selection highlight
  // ═══════════════════════════════════════════════════════════════════════

  function drawSelectionHighlight(
    ctx: CanvasRenderingContext2D,
    sel: SelectableElement,
    settings: GamePlatformSettings,
    playerSprite: PlayerSprite,
    bossSettings: BossSettings,
    spawnPoints: [SpawnPoint, SpawnPoint, SpawnPoint] | undefined,
    bulletSpawnOffsetX: number | undefined,
    bulletSpawnOffsetY: number | undefined,
    logW: number,
  ) {
    const xScale = logW / BASE_W;
    ctx.save();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    switch (sel.type) {
      case "player": {
        const sx = settings.player.x * xScale + playerSprite.offsetX;
        const sy = settings.player.y + playerSprite.offsetY;
        ctx.strokeRect(sx - 2, sy - 2, playerSprite.width + 4, playerSprite.height + 4);
        // Corner handles
        drawHandle(ctx, sx - 2, sy - 2);
        drawHandle(ctx, sx + playerSprite.width + 2, sy - 2);
        drawHandle(ctx, sx - 2, sy + playerSprite.height + 2);
        drawHandle(ctx, sx + playerSprite.width + 2, sy + playerSprite.height + 2);
        break;
      }
      case "hitbox": {
        const hb = (settings as any).playerHitbox ?? {};
        const hx = settings.player.x * xScale + (hb.offsetX ?? 0);
        const hy = settings.player.y + (hb.offsetY ?? 0);
        const hw = hb.width ?? 10;
        const hh = hb.height ?? 20;
        ctx.strokeRect(hx - 2, hy - 2, hw + 4, hh + 4);
        drawHandle(ctx, hx - 2, hy - 2);
        drawHandle(ctx, hx + hw + 2, hy + hh + 2);
        break;
      }
      case "bulletSpawn": {
        const bsoX = bulletSpawnOffsetX ?? 5;
        const bsoY = bulletSpawnOffsetY ?? 10;
        const bx = settings.player.x * xScale + bsoX;
        const by = settings.player.y + bsoY;
        drawHandle(ctx, bx, by);
        break;
      }
      case "shield": {
        const scx = settings.player.x * xScale + playerSprite.offsetX + playerSprite.width / 2 + settings.shield.offsetX;
        const scy = settings.player.y + playerSprite.offsetY + playerSprite.height / 2 + settings.shield.offsetY;
        ctx.beginPath();
        ctx.arc(scx, scy, settings.shield.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
        drawHandle(ctx, scx + settings.shield.radius, scy);
        break;
      }
      case "permShield": {
        const permShCfg = (settings as any).permShield;
        if (permShCfg) {
          const pcx = settings.player.x * xScale + playerSprite.offsetX + playerSprite.width / 2 + (permShCfg.offsetX ?? 0);
          const pcy = settings.player.y + playerSprite.offsetY + playerSprite.height / 2 + (permShCfg.offsetY ?? 0);
          const pr = (permShCfg.radius ?? 20) * (permShCfg.size ?? 1);
          ctx.beginPath();
          ctx.arc(pcx, pcy, pr + 2, 0, Math.PI * 2);
          ctx.stroke();
          drawHandle(ctx, pcx + pr, pcy);
        }
        break;
      }
      case "boss": {
        const bx = settings.boss.x * xScale;
        const by = settings.boss.y;
        ctx.strokeRect(bx - 2, by - 2, bossSettings.width + 4, bossSettings.height + 4);
        drawHandle(ctx, bx - 2, by - 2);
        drawHandle(ctx, bx + bossSettings.width + 2, by + bossSettings.height + 2);
        break;
      }
      case "spawnPoint": {
        const sp = (spawnPoints ?? settings.spawnPoints)[sel.index];
        const sx = sp.x * xScale;
        const sy = sp.y;
        drawHandle(ctx, sx, sy);
        break;
      }
      case "ui": {
        const el = (settings as any)[sel.key];
        const ex = el.x * xScale;
        const ey = el.y;
        let ew = el.size ?? 20;
        let eh = el.size ?? 20;
        if (sel.key === "touchArea") { ew = el.width; eh = el.height; }
        if (sel.key === "controls") { ew = (el.size ?? 24) * 3; eh = el.size ?? 24; }
        if (sel.key === "bossHealthBar") { ew = (el.size ?? 6) * 10; eh = el.size ?? 6; }
        ctx.strokeRect(ex - 2, ey - 2, ew + 4, eh + 4);
        drawHandle(ctx, ex - 2, ey - 2);
        drawHandle(ctx, ex + ew + 2, ey + eh + 2);
        break;
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 3, y - 3, 6, 6);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Mouse interaction
  // ═══════════════════════════════════════════════════════════════════════

  const requestDraw = useCallback(() => {
    requestAnimationFrame(drawFrame);
  }, [drawFrame]);

  useEffect(() => {
    requestDraw();
  }, [dims, settings, playerSprite, bossSettings, selected, spawnPoints, bulletSpawnOffsetX, bulletSpawnOffsetY, mouseFollowOffsetX, mouseFollowOffsetY, zoom, drawFrame]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;
      const { x: gameX, y: gameY } = pixelToGame(pixelX, pixelY);

      const sc = getScale();
      const logW = dims.w / sc;
      const xScale = logW / BASE_W;

      // Check if clicking a handle of the currently selected element
      if (selected) {
        const handle = getHandleAt(selected, gameX, gameY, settings, playerSprite, bossSettings, spawnPoints, bulletSpawnOffsetX, bulletSpawnOffsetY, logW);
        if (handle) {
          setDrag({ kind: "resize", element: selected, handle, startGameX: gameX, startGameY: gameY });
          return;
        }
      }

      const hit = hitTest(gameX, gameY);
      if (hit) {
        setSelected(hit);
        setDrag({ kind: "move", element: hit, startGameX: gameX, startGameY: gameY });
      } else {
        setSelected(null);
      }
    },
    [hitTest, pixelToGame, getScale, dims.w, selected, settings, playerSprite, bossSettings, spawnPoints, bulletSpawnOffsetX, bulletSpawnOffsetY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;
      const { x: gameX, y: gameY } = pixelToGame(pixelX, pixelY);

      if (drag.kind === "none") {
        const hit = hitTest(gameX, gameY);
        setHovered(hit);
        return;
      }

      const sc = getScale();
      const logW = dims.w / sc;
      const xScale = logW / BASE_W;
      const dx = gameX - drag.startGameX;
      const dy = gameY - drag.startGameY;

      applyDrag(drag, dx, dy, xScale, settings, playerSprite, bossSettings, spawnPoints, bulletSpawnOffsetX, bulletSpawnOffsetY, onChange, onBossChange, onBulletSpawnChange, onSpawnPointsChange);
      setDrag((prev) => (prev.kind === "none" ? prev : { ...prev, startGameX: gameX, startGameY: gameY }));
    },
    [drag, pixelToGame, hitTest, getScale, dims.w, settings, playerSprite, bossSettings, spawnPoints, bulletSpawnOffsetX, bulletSpawnOffsetY, onChange, onBossChange, onBulletSpawnChange, onSpawnPointsChange]
  );

  const handleMouseUp = useCallback(() => {
    setDrag({ kind: "none" });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden" style={{ cursor: hovered ? "pointer" : "default" }}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {/* Inspector panel */}
      <div className="absolute top-3 right-3 w-56 space-y-2">
        <InspectorPanel
          selected={selected}
          settings={settings}
          playerSprite={playerSprite}
          bossSettings={bossSettings}
          hitboxPoints={hitboxPoints}
          bulletSpawnOffsetX={bulletSpawnOffsetX}
          bulletSpawnOffsetY={bulletSpawnOffsetY}
          onChange={onChange}
          onBossChange={onBossChange}
          onHitboxChange={onHitboxChange}
          onBulletSpawnChange={onBulletSpawnChange}
          onPlayerSpriteChange={onPlayerSpriteChange}
          onPlayerHitboxChange={onPlayerHitboxChange}
          onPermShieldChange={onPermShieldChange}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Drag / resize helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function getHandleAt(
  sel: SelectableElement,
  gameX: number,
  gameY: number,
  settings: GamePlatformSettings,
  playerSprite: PlayerSprite,
  bossSettings: BossSettings,
  spawnPoints: [SpawnPoint, SpawnPoint, SpawnPoint] | undefined,
  bulletSpawnOffsetX: number | undefined,
  bulletSpawnOffsetY: number | undefined,
  logW: number,
): string | null {
  const xScale = logW / BASE_W;
  const threshold = 8;

  const near = (ax: number, ay: number) => distToPoint(gameX, gameY, ax, ay) < threshold;

  switch (sel.type) {
    case "player": {
      const sx = settings.player.x * xScale + playerSprite.offsetX;
      const sy = settings.player.y + playerSprite.offsetY;
      if (near(sx, sy)) return "nw";
      if (near(sx + playerSprite.width, sy)) return "ne";
      if (near(sx, sy + playerSprite.height)) return "sw";
      if (near(sx + playerSprite.width, sy + playerSprite.height)) return "se";
      return null;
    }
    case "hitbox": {
      const hb = (settings as any).playerHitbox ?? {};
      const hx = settings.player.x * xScale + (hb.offsetX ?? 0);
      const hy = settings.player.y + (hb.offsetY ?? 0);
      const hw = hb.width ?? 10;
      const hh = hb.height ?? 20;
      if (near(hx, hy)) return "nw";
      if (near(hx + hw, hy + hh)) return "se";
      return null;
    }
    case "bulletSpawn": {
      const bsoX = bulletSpawnOffsetX ?? 5;
      const bsoY = bulletSpawnOffsetY ?? 10;
      const bx = settings.player.x * xScale + bsoX;
      const by = settings.player.y + bsoY;
      if (near(bx, by)) return "center";
      return null;
    }
    case "shield": {
      const scx = settings.player.x * xScale + playerSprite.offsetX + playerSprite.width / 2 + settings.shield.offsetX;
      const scy = settings.player.y + playerSprite.offsetY + playerSprite.height / 2 + settings.shield.offsetY;
      if (near(scx + settings.shield.radius, scy)) return "radius";
      return null;
    }
    case "boss": {
      const bx = settings.boss.x * xScale;
      const by = settings.boss.y;
      if (near(bx, by)) return "nw";
      if (near(bx + bossSettings.width, by + bossSettings.height)) return "se";
      return null;
    }
    case "spawnPoint": {
      const sp = (spawnPoints ?? settings.spawnPoints)[sel.index];
      if (near(sp.x * xScale, sp.y)) return "center";
      return null;
    }
    case "ui": {
      const el = (settings as any)[sel.key];
      const ex = el.x * xScale;
      const ey = el.y;
      let ew = el.size ?? 20;
      let eh = el.size ?? 20;
      if (sel.key === "touchArea") { ew = el.width; eh = el.height; }
      if (sel.key === "controls") { ew = (el.size ?? 24) * 3; eh = el.size ?? 24; }
      if (sel.key === "bossHealthBar") { ew = (el.size ?? 6) * 10; eh = el.size ?? 6; }
      if (near(ex, ey)) return "nw";
      if (near(ex + ew, ey + eh)) return "se";
      return null;
    }
    default:
      return null;
  }
}

function applyDrag(
  drag: DragMode,
  dx: number,
  dy: number,
  xScale: number,
  settings: GamePlatformSettings,
  playerSprite: PlayerSprite,
  bossSettings: BossSettings,
  spawnPoints: [SpawnPoint, SpawnPoint, SpawnPoint] | undefined,
  bulletSpawnOffsetX: number | undefined,
  bulletSpawnOffsetY: number | undefined,
  onChange: (next: GamePlatformSettings) => void,
  onBossChange?: (next: BossSettings) => void,
  onBulletSpawnChange?: (offsetX: number, offsetY: number) => void,
  onSpawnPointsChange?: (next: [SpawnPoint, SpawnPoint, SpawnPoint]) => void,
  onPlayerSpriteChange?: (next: PlayerSprite) => void,
  onPlayerHitboxChange?: (next: PlayerHitbox) => void,
  onPermShieldChange?: (next: GameShieldSettings) => void,
) {
  if (drag.kind === "none") return;

  const el = drag.element;

  if (drag.kind === "resize") {
    switch (el.type) {
      case "player": {
        if (drag.handle === "se") {
          onPlayerSpriteChange?.({
            ...playerSprite,
            width: Math.max(1, playerSprite.width + dx),
            height: Math.max(1, playerSprite.height + dy),
          });
        }
        return;
      }
      case "hitbox": {
        const hb = (playerSprite as any).hitbox ?? {};
        if (drag.handle === "se") {
          const nextHb = {
            ...hb,
            width: Math.max(1, (hb.width ?? 10) + dx),
            height: Math.max(1, (hb.height ?? 20) + dy),
          };
          onPlayerHitboxChange?.(nextHb);
        }
        return;
      }
      case "shield": {
        if (drag.handle === "radius") {
          const newRadius = Math.max(1, settings.shield.radius + dx);
          onChange({ ...settings, shield: { ...settings.shield, radius: newRadius } });
        }
        return;
      }
      case "boss": {
        if (drag.handle === "se") {
          onBossChange?.({
            ...bossSettings,
            width: Math.max(10, bossSettings.width + dx),
            height: Math.max(10, bossSettings.height + dy),
          });
        }
        return;
      }
      default:
        return;
    }
  }

  // Move
  switch (el.type) {
    case "player": {
      const newBaseX = Math.max(0, Math.min(BASE_W, settings.player.x + dx / xScale));
      const newBaseY = Math.max(0, Math.min(BASE_H, settings.player.y + dy));
      onChange({ ...settings, player: { ...settings.player, x: newBaseX, y: newBaseY } });
      return;
    }
    case "hitbox": {
      const hb = (playerSprite as any).hitbox ?? {};
      const nextHb = {
        ...hb,
        offsetX: (hb.offsetX ?? 0) + dx,
        offsetY: (hb.offsetY ?? 0) + dy,
      };
      onPlayerHitboxChange?.(nextHb);
      return;
    }
    case "bulletSpawn": {
      const bsoX = (bulletSpawnOffsetX ?? 5) + dx;
      const bsoY = (bulletSpawnOffsetY ?? 10) + dy;
      onBulletSpawnChange?.(bsoX, bsoY);
      return;
    }
    case "shield": {
      onChange({
        ...settings,
        shield: {
          ...settings.shield,
          offsetX: settings.shield.offsetX + dx,
          offsetY: settings.shield.offsetY + dy,
        },
      });
      return;
    }
    case "permShield": {
      const permShCfg = (settings as any).permShield ?? { offsetX: 0, offsetY: 0, radius: 20 };
      onPermShieldChange?.({
        ...permShCfg,
        offsetX: permShCfg.offsetX + dx,
        offsetY: permShCfg.offsetY + dy,
      });
      return;
    }
    case "boss": {
      const newBaseX = Math.max(0, Math.min(BASE_W, settings.boss.x + dx / xScale));
      const newBaseY = Math.max(0, Math.min(BASE_H, settings.boss.y + dy));
      onChange({ ...settings, boss: { ...settings.boss, x: newBaseX, y: newBaseY } });
      return;
    }
    case "spawnPoint": {
      const sps = (spawnPoints ?? settings.spawnPoints).map((sp, i) =>
        i === el.index
          ? { ...sp, x: Math.max(0, Math.min(BASE_W, sp.x + dx / xScale)), y: Math.max(0, Math.min(BASE_H, sp.y + dy)) }
          : sp
      ) as [SpawnPoint, SpawnPoint, SpawnPoint];
      onSpawnPointsChange?.(sps);
      return;
    }
    case "ui": {
      const uiEl = (settings as any)[el.key];
      const newBaseX = Math.max(0, Math.min(BASE_W, uiEl.x + dx / xScale));
      const newBaseY = Math.max(0, Math.min(BASE_H, uiEl.y + dy));
      onChange({ ...settings, [el.key]: { ...uiEl, x: newBaseX, y: newBaseY } });
      return;
    }
  }
}
