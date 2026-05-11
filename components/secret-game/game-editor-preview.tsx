"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { GamePlatformSettings, PlayerSprite } from "@/lib/data";

const BASE_W = 240;
const BASE_H = 320;

interface GameEditorPreviewProps {
  settings: GamePlatformSettings;
  playerSprite: PlayerSprite;
  platform: "desktop" | "mobile";
  onChange: (next: GamePlatformSettings) => void;
}

function drawStarfield(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 37) % (w + 20)) - 10;
    const sy = ((i * 53) % (h + 20)) - 10;
    ctx.fillRect(sx, sy, 1, 1);
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Simple fan silhouette placeholder
  ctx.fillStyle = "#ff006e";
  ctx.fillRect(x, y, 14, 10);
  ctx.fillStyle = "#fcee0a";
  ctx.fillRect(x + 4, y + 2, 2, 2);
  ctx.fillRect(x + 9, y + 2, 2, 2);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sprite: PlayerSprite,
  img: HTMLImageElement | null
) {
  if (img && img.complete) {
    ctx.drawImage(img, x + sprite.offsetX, y + sprite.offsetY, sprite.width, sprite.height);
  } else {
    ctx.fillStyle = "#00f0ff";
    ctx.fillRect(x, y, 10, 20);
  }
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
  const [scale, setScale] = useState(1);

  // Load player sprite
  useEffect(() => {
    const img = new Image();
    img.src = "/images/guitar.png";
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
  }, []);

  // Compute scale to fit container
  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scaleX = rect.width / BASE_W;
      const scaleY = rect.height / BASE_H;
      setScale(Math.min(scaleX, scaleY));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = BASE_W;
    canvas.height = BASE_H;

    drawStarfield(ctx, BASE_W, BASE_H);

    // Draw enemies
    const { enemy } = settings;
    const colUnit = 14 + enemy.paddingX;
    const rowUnit = 10 + enemy.paddingY;
    const totalW = enemy.columns * colUnit - enemy.paddingX;
    const startX = (BASE_W - totalW) / 2;
    for (let r = 0; r < enemy.rows; r++) {
      for (let c = 0; c < enemy.columns; c++) {
        drawEnemy(ctx, startX + c * colUnit, enemy.startY + r * rowUnit);
      }
    }

    // Draw player
    drawPlayer(ctx, settings.player.x, settings.player.y, playerSprite, imgRef.current);
  }, [settings, playerSprite]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Helper: mouse pixel → logical coords
  const toLogical = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale]
  );

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
      const dx = (clientX - d.startX) / scale;
      const dy = (clientY - d.startY) / scale;

      const next = { ...settings };
      switch (d.key) {
        case "player":
          next.player = { ...next.player, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
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
  }, [scale, settings, onChange]);

  // Overlay renderer for draggable items
  function DraggableOverlay({
    label,
    itemKey,
    x,
    y,
    width,
    height,
    visible,
    color = "#00f0ff",
  }: {
    label: string;
    itemKey: string;
    x: number;
    y: number;
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
          left: x * scale,
          top: y * scale,
          width: width * scale,
          height: height * scale,
          border: `2px dashed ${color}`,
          background: `${color}15`,
          borderRadius: 4,
          zIndex: 10,
        }}
        onMouseDown={(e) => startDrag(itemKey, x, y, e)}
        onTouchStart={(e) => startDrag(itemKey, x, y, e)}
      >
        <div
          className="absolute -top-5 left-0 text-[10px] font-mono px-1 rounded"
          style={{ background: color, color: "#000", whiteSpace: "nowrap" }}
        >
          {label}
        </div>
        {/* Resize handle bottom-right */}
        <div
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full"
          style={{ background: color }}
        />
      </div>
    );
  }

  const isMobile = platform === "mobile";
  const frameClass = isMobile
    ? "w-[280px] h-[560px]"
    : "w-[480px] h-[360px]";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs text-neutral-400 font-mono uppercase tracking-wider">
        {platform} Preview ({BASE_W} × {BASE_H} logical)
      </div>
      <div
        ref={containerRef}
        className={`relative ${frameClass} rounded-2xl border-4 border-[#1e1e1e] bg-black overflow-hidden flex items-center justify-center`}
        style={{ boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: BASE_W * scale,
            height: BASE_H * scale,
            imageRendering: "pixelated",
          }}
        />

        {/* Player overlay */}
        <DraggableOverlay
          label="Player"
          itemKey="player"
          x={settings.player.x - 2}
          y={settings.player.y - 12}
          width={playerSprite.width}
          height={playerSprite.height}
          visible={true}
          color="#00f0ff"
        />

        {/* Hearts overlay */}
        <DraggableOverlay
          label="Hearts"
          itemKey="hearts"
          x={settings.hearts.x}
          y={settings.hearts.y}
          width={settings.hearts.size * 3 + 8}
          height={settings.hearts.size + 4}
          visible={settings.hearts.visible}
          color="#ff006e"
        />

        {/* Arrow Keys overlay */}
        <DraggableOverlay
          label="Arrow Keys"
          itemKey="arrowKeys"
          x={settings.arrowKeys.x}
          y={settings.arrowKeys.y}
          width={settings.arrowKeys.size * 2 + 16}
          height={settings.arrowKeys.size + 8}
          visible={settings.arrowKeys.visible}
          color="#fcee0a"
        />

        {/* Touch Area overlay */}
        <DraggableOverlay
          label="Touch Area"
          itemKey="touchArea"
          x={settings.touchArea.x}
          y={settings.touchArea.y}
          width={settings.touchArea.width}
          height={settings.touchArea.height}
          visible={settings.touchArea.visible}
          color="#00f0ff"
        />

        {/* Fire Button overlay */}
        <DraggableOverlay
          label="Fire"
          itemKey="fireButton"
          x={settings.fireButton.x}
          y={settings.fireButton.y}
          width={settings.fireButton.size}
          height={settings.fireButton.size}
          visible={settings.fireButton.visible}
          color="#ff006e"
        />
      </div>
    </div>
  );
}
