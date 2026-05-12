"use client";

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from "react";
import type { GamePlatformSettings, PlayerSprite } from "@/lib/data";

const BASE_W = 240;
const BASE_H = 320;
const PLAYER_W_BASE = 10;
const PLAYER_H_BASE = 20;

interface GameEditorPreviewProps {
  settings: GamePlatformSettings;
  playerSprite: PlayerSprite;
  platform: "desktop" | "mobile";
  onChange: (next: GamePlatformSettings) => void;
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

function drawEnemy(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#ff006e";
  ctx.fillRect(x, y, 14, 10);
  ctx.fillStyle = "#fcee0a";
  ctx.fillRect(x + 4, y + 2, 2, 2);
  ctx.fillRect(x + 9, y + 2, 2, 2);
}

function drawPlayerFallback(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#00f0ff";
  ctx.fillRect(x, y, 10, 20);
}

export function GameEditorPreview({
  settings,
  playerSprite,
  platform,
  onChange,
}: GameEditorPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [dims, setDims] = useState({ w: 280, h: 560 });

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

    // Draw enemies
    const { enemy } = settings;
    const colUnit = 14 + enemy.paddingX;
    const rowUnit = 10 + enemy.paddingY;
    const totalW = enemy.columns * colUnit - enemy.paddingX;
    const startX = Math.max(4, (logW - totalW) / 2) + (enemy.offsetX ?? 0);
    // Cap rows so enemies never drop below 55% of screen height (matches game logic)
    const maxRows = Math.floor((BASE_H * 0.55 - enemy.startY) / rowUnit) + 1;
    const rows = Math.min(maxRows, enemy.rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < enemy.columns; c++) {
        drawEnemy(ctx, startX + c * colUnit, enemy.startY + r * rowUnit);
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

    ctx.restore();
  }, [settings, playerSprite, dims.w, dims.h]);

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
      const dx = (clientX - d.startX) / scaleX;
      const dy = (clientY - d.startY) / scaleY;

      const next = { ...settings };
      switch (d.key) {
        case "player":
          // origX/Y include the sprite offset, so subtract it to get the raw player position
          next.player = {
            ...next.player,
            x: Math.round(d.origX + dx - playerSprite.offsetX),
            y: Math.round(d.origY + dy - playerSprite.offsetY),
          };
          break;
        case "hearts":
          next.hearts = { ...next.hearts, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          break;
        case "arrowKeys":
          next.arrowKeys = { ...next.arrowKeys, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          break;
        case "touchArea":
          next.touchArea = { ...next.touchArea, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          break;
        case "fireButton":
          next.fireButton = { ...next.fireButton, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          break;
        case "score":
          next.score = { ...next.score, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          break;
        case "wave":
          next.wave = { ...next.wave, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          break;
        case "powerUps":
          next.powerUps = { ...next.powerUps, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
          break;
        case "shield": {
          // Shield offset is visually scaled by scaleY, so drag delta must use scaleY
          next.shield = {
            ...next.shield,
            offsetX: Math.round(d.origX + dx * (scaleX / scaleY)),
            offsetY: Math.round(d.origY + dy * (scaleX / scaleY)),
          };
          break;
        }
      }
      onChange(next);
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
  }, [scaleX, scaleY, settings, onChange, playerSprite.offsetX, playerSprite.offsetY]);

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
  const frameClass = isMobile
    ? "w-[375px] h-[750px]"
    : "w-[640px] h-[360px]";

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

        {/* Shield overlay — circular, matches the actual rendered shield exactly */}
        <ShieldOverlay
          settings={settings}
          playerSprite={playerSprite}
          scaleX={scaleX}
          scaleY={scaleY}
          onDragStart={startDrag}
        />
      </div>
    </div>
  );
}
