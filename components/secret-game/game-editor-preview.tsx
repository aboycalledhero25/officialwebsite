"use client";

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from "react";
import type { GamePlatformSettings, PlayerSprite, BossSettings, HitboxPoint } from "@/lib/data";
import { drawEnemy, drawBoss } from "./draw-sprites";

const BASE_W = 240;
const BASE_H = 320;
const PLAYER_W_BASE = 10;
const PLAYER_H_BASE = 20;

type EditMode = "none" | "hitbox" | "bullet";

interface GameEditorPreviewProps {
  settings: GamePlatformSettings;
  playerSprite: PlayerSprite;
  bossSettings: BossSettings;
  platform: "desktop" | "mobile";
  /** Polygon hitbox points (relative to playerX/Y in game-logical units). */
  hitboxPoints?: HitboxPoint[];
  /** Bullet spawn offset from playerX (game-logical units). Default: PLAYER_W_BASE/2. */
  bulletSpawnOffsetX?: number;
  /** Bullet spawn offset from playerY (game-logical units). Default: PLAYER_H_BASE/2. */
  bulletSpawnOffsetY?: number;
  onChange: (next: GamePlatformSettings) => void;
  onBossChange?: (next: BossSettings) => void;
  /** Called when polygon hitbox points are updated via the visual editor. */
  onHitboxChange?: (points: HitboxPoint[]) => void;
  /** Called when bullet spawn offset is dragged. */
  onBulletSpawnChange?: (offsetX: number, offsetY: number) => void;
}

function drawStarfield(ctx: CanvasRenderingContext2D, logW: number, h: number) {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, logW, h);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 37) % (logW + 20)) - 10;
    const sy = ((i * 53) % (h + 20)) - 10;
    ctx.fillRect(sx, sy, 1, 1);
  }
}

function drawPlayerFallback(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#00f0ff";
  ctx.fillRect(x, y, 10, 20);
}

export function GameEditorPreview({
  settings,
  playerSprite,
  bossSettings,
  platform,
  hitboxPoints,
  bulletSpawnOffsetX,
  bulletSpawnOffsetY,
  onChange,
  onBossChange,
  onHitboxChange,
  onBulletSpawnChange,
}: GameEditorPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [dims, setDims] = useState({ w: 280, h: 560 });
  const [editMode, setEditMode] = useState<EditMode>("none");

  // Measure container size in pixels
  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [platform]);

  const scaleX = dims.w / BASE_W;
  const scaleY = dims.h / BASE_H;

  // Load player sprite
  useEffect(() => {
    const img = new Image();
    img.src = "/images/guitar.png";
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
  }, []);

  // Draw canvas — replicates the actual game's rendering exactly
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sc = scaleY;
    const logW = dims.w / sc;

    canvas.width = dims.w;
    canvas.height = dims.h;

    ctx.clearRect(0, 0, dims.w, dims.h);
    ctx.save();
    ctx.scale(sc, sc);

    drawStarfield(ctx, logW, BASE_H);

    // Draw enemies — mirror game logic exactly, including spriteScale
    const { enemy } = settings;
    const colUnit = enemy.width + enemy.paddingX;
    const rowUnit = enemy.height + enemy.paddingY;
    const totalW = enemy.columns * colUnit - enemy.paddingX;
    const startX = Math.max(4, (logW - totalW) / 2) + (enemy.offsetX ?? 0);
    // Cap rows so enemies never drop below 55% of screen height (matches game logic)
    const maxRows = Math.floor((BASE_H * 0.55 - enemy.startY) / rowUnit) + 1;
    const rows = Math.min(maxRows, enemy.rows);
    // spriteScale: visual size only — grid cell / collision stays at width×height
    const ss = enemy.spriteScale ?? 1;
    const sprW = enemy.width * ss;
    const sprH = enemy.height * ss;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < enemy.columns; c++) {
        const ex = startX + c * colUnit;
        const ey = enemy.startY + r * rowUnit;
        // Center scaled sprite on the grid cell (same offset calculation as game-canvas.tsx)
        const sprX = ex - (sprW - enemy.width) / 2;
        const sprY = ey - (sprH - enemy.height) / 2;
        drawEnemy(ctx, sprX, sprY, ((r + c) % 3) as 0 | 1 | 2, 0, false, sprW, sprH);
      }
    }

    // Draw player
    const playerX = settings.player.x * (logW / BASE_W);
    const playerY = settings.player.y;
    if (imgRef.current && imgRef.current.complete) {
      ctx.drawImage(
        imgRef.current,
        playerX + playerSprite.offsetX,
        playerY + playerSprite.offsetY,
        playerSprite.width,
        playerSprite.height
      );
    } else {
      drawPlayerFallback(ctx, playerX, playerY);
    }

    // Draw shield bubble on canvas (exactly as in-game)
    const shield = settings.shield;
    const scx = playerX + playerSprite.offsetX + playerSprite.width / 2 + (shield?.offsetX ?? 0);
    const scy = playerY + playerSprite.offsetY + playerSprite.height / 2 + (shield?.offsetY ?? 0);
    const radius = shield?.radius ?? 16;
    ctx.strokeStyle = `rgba(0, 240, 255, 0.5)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(scx, scy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(0, 240, 255, 0.08)`;
    ctx.fill();

    // Draw boss preview (actual scaled sprite)
    if (bossSettings.enabled) {
      const bx = settings.boss.x * (logW / BASE_W);
      const by = settings.boss.y;
      drawBoss(ctx, bx, by, bossSettings.width, bossSettings.height, 0, 0, 1);
      // Dashed outline so user knows the hitbox bounds
      ctx.strokeStyle = "#ff006e";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(bx, by, bossSettings.width, bossSettings.height);
      ctx.setLineDash([]);
    }

    // ── Draw hitbox polygon ───────────────────────────────────────────
    if (hitboxPoints && hitboxPoints.length >= 2) {
      ctx.save();
      ctx.lineWidth = 1 / sc;
      ctx.setLineDash([2 / sc, 2 / sc]);
      if (hitboxPoints.length >= 3) {
        ctx.fillStyle = "rgba(255,0,110,0.15)";
        ctx.beginPath();
        ctx.moveTo(playerX + hitboxPoints[0].x, playerY + hitboxPoints[0].y);
        for (const p of hitboxPoints.slice(1)) ctx.lineTo(playerX + p.x, playerY + p.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = "#ff006e";
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(playerX + hitboxPoints[0].x, playerY + hitboxPoints[0].y);
      for (const p of hitboxPoints.slice(1)) ctx.lineTo(playerX + p.x, playerY + p.y);
      if (hitboxPoints.length >= 3) ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Draw bullet spawn crosshair ───────────────────────────────────
    const bsoX = bulletSpawnOffsetX ?? PLAYER_W_BASE / 2;
    const bsoY = bulletSpawnOffsetY ?? PLAYER_H_BASE / 2;
    const bspX = playerX + bsoX;
    const bspY = playerY + bsoY;
    const cr = 3 / sc;
    ctx.save();
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 1 / sc;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(bspX - cr, bspY); ctx.lineTo(bspX + cr, bspY);
    ctx.moveTo(bspX, bspY - cr); ctx.lineTo(bspX, bspY + cr);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bspX, bspY, cr * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = "#00f0ff";
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, [settings, playerSprite, bossSettings, hitboxPoints, bulletSpawnOffsetX, bulletSpawnOffsetY, dims.w, dims.h]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Drag state
  const dragRef = useRef<{
    key: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const startDrag = useCallback(
    (key: string, origX: number, origY: number, e: React.MouseEvent | React.TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      dragRef.current = {
        key,
        startX: clientX,
        startY: clientY,
        origX,
        origY,
      };
    },
    []
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const d = dragRef.current;
      // dx/dy in game-logical units (scaleY for both axes — game units scale uniformly)
      const dx = (clientX - d.startX) / scaleY;
      const dy = (clientY - d.startY) / scaleY;

      const next = { ...settings };
      let changed = false;
      switch (d.key) {
        case "player":
          next.player = {
            ...next.player,
            x: Math.round(d.origX + dx - playerSprite.offsetX),
            y: Math.round(d.origY + dy - playerSprite.offsetY),
          };
          changed = true;
          break;
        case "hearts":
          next.hearts = { ...next.hearts, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          changed = true;
          break;
        case "arrowKeys":
          next.arrowKeys = { ...next.arrowKeys, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          changed = true;
          break;
        case "touchArea":
          next.touchArea = { ...next.touchArea, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          changed = true;
          break;
        case "fireButton":
          next.fireButton = { ...next.fireButton, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          changed = true;
          break;
        case "score":
          next.score = { ...next.score, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          changed = true;
          break;
        case "wave":
          next.wave = { ...next.wave, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          changed = true;
          break;
        case "powerUps":
          next.powerUps = { ...next.powerUps, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          changed = true;
          break;
        case "bossHealthBar":
          next.bossHealthBar = { ...next.bossHealthBar, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          changed = true;
          break;
        case "boss": {
          const next = { ...settings };
          next.boss = { x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          onChange(next);
          changed = false;
          break;
        }
        case "bossResize":
          if (onBossChange) {
            onBossChange({ ...bossSettings, width: Math.max(10, Math.round(d.origX + dx)), height: Math.max(10, Math.round(d.origY + dy)) });
          }
          changed = false; // boss changes handled separately
          break;
        case "shield": {
          next.shield = {
            ...next.shield,
            offsetX: Math.round(d.origX + dx),
            offsetY: Math.round(d.origY + dy),
          };
          changed = true;
          break;
        }
        case "bulletSpawn": {
          if (onBulletSpawnChange) {
            onBulletSpawnChange(Math.round(d.origX + dx), Math.round(d.origY + dy));
          }
          changed = false;
          break;
        }
        default: {
          // Hitbox polygon point: key = "hbpt_N"
          if (d.key.startsWith("hbpt_") && onHitboxChange && hitboxPoints) {
            const idx = parseInt(d.key.slice(5), 10);
            const newPts = hitboxPoints.map((p, i) =>
              i === idx ? { x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) } : p
            );
            onHitboxChange(newPts);
          }
          changed = false;
        }
      }
      if (changed) {
        onChange(next);
      }
    };

    const handleUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [scaleX, scaleY, settings, onChange, onBossChange, bossSettings, playerSprite.offsetX, playerSprite.offsetY, hitboxPoints, onHitboxChange, onBulletSpawnChange]);

  // Click on canvas to add a new hitbox point
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (editMode !== "hitbox" || !onHitboxChange) return;
    // Ignore if we just finished dragging a point
    if (dragRef.current) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    // Convert click to game-logical offset from player position
    const ptX = Math.round((e.clientX - rect.left - settings.player.x * scaleX) / scaleY);
    const ptY = Math.round((e.clientY - rect.top  - settings.player.y * scaleY) / scaleY);
    onHitboxChange([...(hitboxPoints ?? []), { x: ptX, y: ptY }]);
  }, [editMode, onHitboxChange, hitboxPoints, settings.player.x, settings.player.y, scaleX, scaleY]);

  // Overlay renderer for draggable items
  function DraggableOverlay({
    label,
    itemKey,
    left,
    top,
    width,
    height,
    visible,
    color = "#00f0ff",
  }: {
    label: string;
    itemKey: string;
    left: number;
    top: number;
    width: number;
    height: number;
    visible: boolean;
    color?: string;
  }) {
    if (!visible) return null;
    return (
      <div
        className="absolute cursor-grab active:cursor-grabbing select-none"
        style={{
          left,
          top,
          width,
          height,
          border: `2px dashed ${color}`,
          background: `${color}15`,
          borderRadius: 4,
          zIndex: 10,
        }}
        onMouseDown={(e) => {
          if (itemKey === "player") {
            startDrag(itemKey, settings.player.x + playerSprite.offsetX, settings.player.y + playerSprite.offsetY, e);
          } else if (itemKey === "shield") {
            startDrag(itemKey, settings.shield.offsetX, settings.shield.offsetY, e);
          } else {
            const item = settings[itemKey as keyof GamePlatformSettings] as { x: number; y: number };
            startDrag(itemKey, item.x, item.y, e);
          }
        }}
        onTouchStart={(e) => {
          if (itemKey === "player") {
            startDrag(itemKey, settings.player.x + playerSprite.offsetX, settings.player.y + playerSprite.offsetY, e);
          } else if (itemKey === "shield") {
            startDrag(itemKey, settings.shield.offsetX, settings.shield.offsetY, e);
          } else {
            const item = settings[itemKey as keyof GamePlatformSettings] as { x: number; y: number };
            startDrag(itemKey, item.x, item.y, e);
          }
        }}
      >
        <div
          className="absolute -top-5 left-0 text-[10px] font-mono px-1 rounded"
          style={{ background: color, color: "#000", whiteSpace: "nowrap" }}
        >
          {label}
        </div>
        <div
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full"
          style={{ background: color }}
        />
      </div>
    );
  }

  // Shield overlay — renders an actual circle matching the in-game shield
  function ShieldOverlay({
    settings,
    playerSprite,
    scaleX,
    scaleY,
    onDragStart,
  }: {
    settings: GamePlatformSettings;
    playerSprite: PlayerSprite;
    scaleX: number;
    scaleY: number;
    onDragStart: (key: string, origX: number, origY: number, e: React.MouseEvent | React.TouchEvent) => void;
  }) {
    const radius = settings.shield?.radius ?? 16;
    const left = settings.player.x * scaleX + (playerSprite.offsetX + playerSprite.width / 2 + (settings.shield?.offsetX ?? 0) - radius) * scaleY;
    const top = settings.player.y * scaleY + (playerSprite.offsetY + playerSprite.height / 2 + (settings.shield?.offsetY ?? 0) - radius) * scaleY;
    const size = radius * 2 * scaleY;

    return (
      <div
        className="absolute cursor-grab active:cursor-grabbing select-none"
        style={{
          left,
          top,
          width: size,
          height: size,
          borderRadius: "50%",
          border: "2px dashed rgba(0, 240, 255, 0.7)",
          background: "rgba(0, 240, 255, 0.08)",
          boxShadow: "0 0 12px rgba(0, 240, 255, 0.3)",
          zIndex: 10,
        }}
        onMouseDown={(e) => onDragStart("shield", settings.shield.offsetX, settings.shield.offsetY, e)}
        onTouchStart={(e) => onDragStart("shield", settings.shield.offsetX, settings.shield.offsetY, e)}
      >
        <div
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono px-1 rounded"
          style={{ background: "#00f0ff", color: "#000", whiteSpace: "nowrap" }}
        >
          Shield
        </div>
      </div>
    );
  }

  const isMobile = platform === "mobile";
  // Mobile: portrait phone (375×750 ≈ 1:2, fits in 520px sidebar).
  // Desktop: landscape – the game fills the full viewport height-scaled, so a
  // wide-short frame represents a typical monitor. Use full container width so
  // it doesn't overflow the 520px admin sidebar.
  const frameClass = isMobile
    ? "w-[375px] h-[750px]"
    : "w-full h-[260px]";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs text-neutral-400 font-mono uppercase tracking-wider">
        {platform} Preview ({BASE_W} × {BASE_H} ref)
      </div>
      <div
        ref={containerRef}
        className={`relative ${frameClass} rounded-2xl border-4 border-[#1e1e1e] bg-black overflow-hidden`}
        style={{ boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Player overlay — matches canvas-drawn sprite exactly */}
        <DraggableOverlay
          label="Player"
          itemKey="player"
          left={settings.player.x * scaleX + playerSprite.offsetX * scaleY}
          top={settings.player.y * scaleY + playerSprite.offsetY * scaleY}
          width={playerSprite.width * scaleY}
          height={playerSprite.height * scaleY}
          visible={true}
          color="#00f0ff"
        />

        {/* Hearts overlay — matches HTML HUD positioning */}
        <DraggableOverlay
          label="Hearts"
          itemKey="hearts"
          left={settings.hearts.x * scaleX}
          top={settings.hearts.y * scaleY}
          width={(settings.hearts.size * 5 + 8) * scaleY}
          height={(settings.hearts.size + 4) * scaleY}
          visible={settings.hearts.visible}
          color="#ff006e"
        />

        {/* Arrow Keys overlay */}
        <DraggableOverlay
          label="Arrow Keys"
          itemKey="arrowKeys"
          left={settings.arrowKeys.x * scaleX}
          top={settings.arrowKeys.y * scaleY}
          width={(settings.arrowKeys.size * 2 + 16) * scaleY}
          height={(settings.arrowKeys.size + 8) * scaleY}
          visible={settings.arrowKeys.visible}
          color="#fcee0a"
        />

        {/* Touch Area overlay */}
        <DraggableOverlay
          label="Touch Area"
          itemKey="touchArea"
          left={settings.touchArea.x * scaleX}
          top={settings.touchArea.y * scaleY}
          width={settings.touchArea.width * scaleX}
          height={settings.touchArea.height * scaleY}
          visible={settings.touchArea.visible}
          color="#00f0ff"
        />

        {/* Fire Button overlay */}
        <DraggableOverlay
          label="Fire"
          itemKey="fireButton"
          left={settings.fireButton.x * scaleX}
          top={settings.fireButton.y * scaleY}
          width={settings.fireButton.size * scaleX}
          height={settings.fireButton.size * scaleX}
          visible={settings.fireButton.visible}
          color="#ff006e"
        />

        {/* Score overlay */}
        <DraggableOverlay
          label="Score"
          itemKey="score"
          left={settings.score.x * scaleX}
          top={settings.score.y * scaleY}
          width={((settings.score.size ?? 14) * 4.5) * scaleY}
          height={((settings.score.size ?? 14) * 1.8) * scaleY}
          visible={settings.score.visible}
          color="#00f0ff"
        />

        {/* Wave overlay */}
        <DraggableOverlay
          label="Wave"
          itemKey="wave"
          left={settings.wave.x * scaleX}
          top={settings.wave.y * scaleY}
          width={((settings.wave.size ?? 14) * 3.2) * scaleY}
          height={((settings.wave.size ?? 14) * 1.8) * scaleY}
          visible={settings.wave.visible}
          color="#fcee0a"
        />

        {/* Power-ups overlay */}
        <DraggableOverlay
          label="Power-ups"
          itemKey="powerUps"
          left={settings.powerUps.x * scaleX}
          top={settings.powerUps.y * scaleY}
          width={((settings.powerUps.size ?? 8) * 14) * scaleY}
          height={((settings.powerUps.size ?? 8) * 2.5) * scaleY}
          visible={settings.powerUps.visible}
          color="#ff8800"
        />

        {/* Boss Health Bar overlay */}
        <DraggableOverlay
          label="Boss HP"
          itemKey="bossHealthBar"
          left={settings.bossHealthBar.x * scaleX}
          top={settings.bossHealthBar.y * scaleY}
          width={((settings.bossHealthBar.size ?? 6) * 10) * scaleY}
          height={((settings.bossHealthBar.size ?? 6) * 1.5) * scaleY}
          visible={settings.bossHealthBar.visible}
          color="#ff006e"
        />

        {/* Shield overlay — circular, matches the actual rendered shield exactly */}
        <ShieldOverlay
          settings={settings}
          playerSprite={playerSprite}
          scaleX={scaleX}
          scaleY={scaleY}
          onDragStart={startDrag}
        />

        {/* Boss overlay — draggable position + resizable */}
        {bossSettings.enabled && (
          <BossOverlay
            bossPos={settings.boss}
            bossSettings={bossSettings}
            scaleX={scaleX}
            scaleY={scaleY}
            onDragStart={startDrag}
          />
        )}

        {/* Hitbox polygon point handles */}
        {hitboxPoints && hitboxPoints.map((pt, i) => (
          <div
            key={`hbpt-${i}`}
            className="absolute select-none"
            style={{
              left: settings.player.x * scaleX + pt.x * scaleY - 6,
              top: settings.player.y * scaleY + pt.y * scaleY - 6,
              width: 12, height: 12,
              borderRadius: "50%",
              background: "#ff006e",
              border: "2px solid #fff",
              cursor: editMode === "hitbox" ? "grab" : "default",
              zIndex: 20,
            }}
            onMouseDown={(e) => { e.stopPropagation(); startDrag(`hbpt_${i}`, pt.x, pt.y, e); }}
            onTouchStart={(e) => { e.stopPropagation(); startDrag(`hbpt_${i}`, pt.x, pt.y, e); }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (onHitboxChange) onHitboxChange(hitboxPoints.filter((_, j) => j !== i));
            }}
          />
        ))}

        {/* Bullet spawn point handle */}
        {(() => {
          const bsoX = bulletSpawnOffsetX ?? PLAYER_W_BASE / 2;
          const bsoY = bulletSpawnOffsetY ?? PLAYER_H_BASE / 2;
          const bsl = settings.player.x * scaleX + bsoX * scaleY - 7;
          const bst = settings.player.y * scaleY + bsoY * scaleY - 7;
          return (
            <div
              className="absolute select-none"
              style={{
                left: bsl, top: bst,
                width: 14, height: 14,
                borderRadius: "50%",
                background: editMode === "bullet" ? "#00f0ff" : "rgba(0,240,255,0.5)",
                border: "2px solid #00f0ff",
                cursor: editMode === "bullet" ? "grab" : "default",
                zIndex: 20,
                boxShadow: editMode === "bullet" ? "0 0 8px #00f0ff" : "none",
              }}
              onMouseDown={(e) => { e.stopPropagation(); if (editMode === "bullet") startDrag("bulletSpawn", bsoX, bsoY, e); }}
              onTouchStart={(e) => { e.stopPropagation(); if (editMode === "bullet") startDrag("bulletSpawn", bsoX, bsoY, e); }}
            />
          );
        })()}

        {/* Invisible click-catcher for adding hitbox points */}
        {editMode === "hitbox" && (
          <div
            className="absolute inset-0 z-10"
            style={{ cursor: "crosshair" }}
            onClick={handleCanvasClick}
          />
        )}
      </div>

      {/* Mode toggle buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={() => setEditMode(editMode === "hitbox" ? "none" : "hitbox")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${editMode === "hitbox" ? "bg-[#ff006e] text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
        >
          {editMode === "hitbox" ? "✓ Drawing Hitbox" : "✏ Edit Hitbox"}
        </button>
        <button
          onClick={() => setEditMode(editMode === "bullet" ? "none" : "bullet")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${editMode === "bullet" ? "bg-[#00f0ff] text-black" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
        >
          {editMode === "bullet" ? "✓ Moving Bullet Spawn" : "🔫 Edit Bullet Spawn"}
        </button>
        {editMode === "hitbox" && (
          <button
            onClick={() => { if (onHitboxChange) onHitboxChange([]); }}
            className="px-3 py-1.5 text-xs font-mono rounded bg-white/10 text-white/60 hover:bg-white/20 transition-all"
          >
            🗑 Clear Hitbox
          </button>
        )}
      </div>
      {editMode === "hitbox" && (
        <p className="text-[11px] text-neutral-500 text-center max-w-xs">
          Click canvas to add points · Drag points to reshape · Right-click a point to remove
        </p>
      )}
      {editMode === "bullet" && (
        <p className="text-[11px] text-neutral-500 text-center max-w-xs">
          Drag the cyan dot to set where bullets fire from
        </p>
      )}
    </div>
  );
}

// Boss overlay — draggable body for position, bottom-right handle for resize
function BossOverlay({
  bossPos,
  bossSettings,
  scaleX,
  scaleY,
  onDragStart,
}: {
  bossPos: { x: number; y: number };
  bossSettings: BossSettings;
  scaleX: number;
  scaleY: number;
  onDragStart: (key: string, origX: number, origY: number, e: React.MouseEvent | React.TouchEvent) => void;
}) {
  const left = bossPos.x * scaleX;
  const top = bossPos.y * scaleY;
  const width = bossSettings.width * scaleY;
  const height = bossSettings.height * scaleY;
  const handleSize = 12;

  return (
    <>
      {/* Boss body — draggable for position */}
      <div
        className="absolute cursor-grab active:cursor-grabbing select-none"
        style={{
          left,
          top,
          width,
          height,
          border: "2px dashed #ff006e",
          background: "rgba(255, 0, 110, 0.08)",
          zIndex: 10,
        }}
        onMouseDown={(e) => onDragStart("boss", bossPos.x, bossPos.y, e)}
        onTouchStart={(e) => onDragStart("boss", bossPos.x, bossPos.y, e)}
      >
        <div
          className="absolute -top-5 left-0 text-[10px] font-mono px-1 rounded"
          style={{ background: "#ff006e", color: "#000", whiteSpace: "nowrap" }}
        >
          Boss
        </div>
      </div>
      {/* Resize handle — bottom right */}
      <div
        className="absolute cursor-nwse-resize select-none"
        style={{
          left: left + width - handleSize / 2,
          top: top + height - handleSize / 2,
          width: handleSize,
          height: handleSize,
          background: "#ff006e",
          border: "2px solid #ffffff",
          zIndex: 11,
        }}
        onMouseDown={(e) => onDragStart("bossResize", bossSettings.width, bossSettings.height, e)}
        onTouchStart={(e) => onDragStart("bossResize", bossSettings.width, bossSettings.height, e)}
      />
    </>
  );
}
