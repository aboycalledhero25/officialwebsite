"use client";

import { useSiteData } from "@/components/data-provider";
import { useEffect, useState } from "react";

const BASE_H = 320;
const BASE_W = 240;

interface ActivePowerUp {
  type: "rapid" | "shield" | "wideshot" | "extralife" | "invincible";
  timer: number;
  stacks?: number;
}

interface GameHUDProps {
  score: number;
  lives: number;
  wave: number;
  muted: boolean;
  activePowerUps?: ActivePowerUp[];
  onPause: () => void;
  onToggleMute: () => void;
  /** Roguelike: total slice count (currentSlices / maxSlices) */
  currentSlices?: number;
  maxSlices?: number;
  slicesPerHeart?: number;
  /** Roguelike: total hearts (may grow with ExtraLife) */
  maxHearts?: number;
}

/**
 * 8-bit pixel heart that supports partial fills for the slicing system.
 * `fillFraction` is 0..1 where 1 = fully filled, 0 = empty.
 */
function PixelHeart({ fillFraction, size }: { fillFraction: number; size: number }) {
  const filled = fillFraction >= 1;
  const empty = fillFraction <= 0;
  // Clip the fill so a partial heart shows left portion filled
  const clipPct = Math.max(0, Math.min(1, fillFraction)) * 100;
  const heartRects = (
    <>
      <rect x="1" y="0" width="1" height="1" />
      <rect x="5" y="0" width="1" height="1" />
      <rect x="0" y="1" width="7" height="3" />
      <rect x="1" y="4" width="5" height="1" />
      <rect x="2" y="5" width="3" height="1" />
      <rect x="3" y="6" width="1" height="1" />
    </>
  );
  return (
    <div style={{ width: size, height: size, imageRendering: "pixelated", position: "relative" }}>
      <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" style={{ position: "absolute" }}>
        {/* Empty outline layer */}
        <g fill="#ff006e" opacity="0.2">{heartRects}</g>
      </svg>
      {!empty && (
        <svg
          width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges"
          style={{ position: "absolute", clipPath: filled ? undefined : `inset(0 ${100 - clipPct}% 0 0)` }}
        >
          <g fill="#ff006e">{heartRects}</g>
        </svg>
      )}
    </div>
  );
}

function PowerUpLabel({ type, size, stacks }: { type: ActivePowerUp["type"]; size: number; stacks?: number }) {
  const labels: Record<ActivePowerUp["type"], { text: string; color: string }> = {
    rapid: { text: "RAPID", color: "#ff8800" },
    shield: { text: "SHIELD", color: "#00f0ff" },
    wideshot: { text: "WIDE", color: "#fcee0a" },
    extralife: { text: "LIFE", color: "#ff006e" },
    invincible: { text: "STAR", color: "#ffd700" },
  };
  const l = labels[type];
  const suffix = stacks && stacks > 1 ? `x${stacks}` : "";
  return (
    <span
      className="font-mono font-bold leading-none"
      style={{ color: l.color, fontSize: size, imageRendering: "pixelated" }}
    >
      {l.text}{suffix}
    </span>
  );
}

export function GameHUD({ score, lives, wave, muted, activePowerUps, onPause, onToggleMute, currentSlices, maxSlices, slicesPerHeart, maxHearts }: GameHUDProps) {
  const siteData = useSiteData();
  const [dims, setDims] = useState({ w: 1920, h: 1080 });
  const [scoreBump, setScoreBump] = useState(false);

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Score bump animation
  useEffect(() => {
    setScoreBump(true);
    const t = setTimeout(() => setScoreBump(false), 150);
    return () => clearTimeout(t);
  }, [score]);

  const isMobile = typeof window !== "undefined" && (window.innerWidth < 768 || "ontouchstart" in window);
  const plat = siteData.secretGame?.[isMobile ? "mobile" : "desktop"];
  const hearts = plat?.hearts ?? { visible: true, x: 190, y: 8, size: 28 };
  const scorePos = plat?.score ?? { visible: true, x: 8, y: 8, size: 14 };
  const wavePos = plat?.wave ?? { visible: true, x: 120, y: 8, size: 14 };
  const powerUpsPos = plat?.powerUps ?? { visible: true, x: 120, y: 28, size: 8 };

  // Scale stored positions (0-240 x, 0-320 y) to actual screen dimensions
  const screenX = (baseX: number) => (baseX / BASE_W) * dims.w;
  const screenY = (baseY: number) => (baseY / BASE_H) * dims.h;
  const scaleSize = (baseSize: number) => (baseSize / BASE_H) * dims.h;

  const scoreSizePx = scaleSize(scorePos.size ?? 14);
  const waveSizePx = scaleSize(wavePos.size ?? 14);
  const powerUpsSizePx = scaleSize(powerUpsPos.size ?? 8);

  const settingsDurations = siteData.secretGame?.powerUpDurations;
  const powerUpDurations: Record<ActivePowerUp["type"], number> = {
    rapid: settingsDurations?.rapid ?? 5,
    shield: 0,
    wideshot: settingsDurations?.wideShot ?? 4,
    extralife: 0,
    invincible: settingsDurations?.invincible ?? 4,
  };

  return (
    <div
      className="absolute top-0 left-0 right-0 bottom-0 z-50 pointer-events-none"
      style={{ imageRendering: "pixelated" }}
    >
      {/* Score */}
      {scorePos.visible && (
        <div className="absolute select-none" style={{ left: screenX(scorePos.x), top: screenY(scorePos.y) }}>
          <span
            className="font-mono font-bold leading-none block"
            style={{ fontSize: scoreSizePx * 0.5, color: "#888888", imageRendering: "pixelated" }}
          >
            SCORE
          </span>
          <span
            className="font-mono font-bold leading-none inline-block"
            style={{
              color: "#00f0ff",
              fontSize: scoreSizePx,
              transform: scoreBump ? "scale(1.2)" : "scale(1)",
              transition: "transform 150ms",
              textShadow: "2px 2px 0 #004444",
              imageRendering: "pixelated",
            }}
          >
            {score.toString().padStart(6, "0")}
          </span>
        </div>
      )}

      {/* Wave */}
      {wavePos.visible && (
        <div className="absolute select-none" style={{ left: screenX(wavePos.x), top: screenY(wavePos.y) }}>
          <span
            className="font-mono font-bold leading-none block"
            style={{ fontSize: waveSizePx * 0.5, color: "#888888", imageRendering: "pixelated" }}
          >
            WAVE
          </span>
          <span
            className="font-mono font-bold leading-none"
            style={{
              color: "#fcee0a",
              fontSize: waveSizePx,
              textShadow: "2px 2px 0 #444400",
              imageRendering: "pixelated",
            }}
          >
            {wave}
          </span>
        </div>
      )}

      {/* Active power-up indicators (8-bit block bars) */}
      {powerUpsPos.visible && activePowerUps && activePowerUps.length > 0 && (
        <div className="absolute select-none flex flex-col gap-1" style={{ left: screenX(powerUpsPos.x), top: screenY(powerUpsPos.y) }}>
          {activePowerUps.map((pu, i) => (
            <div key={`${pu.type}-${i}`} className="flex items-center gap-1">
              <PowerUpLabel type={pu.type} size={powerUpsSizePx} stacks={pu.stacks} />
              {pu.type !== "extralife" && pu.type !== "shield" && (
                <div
                  className="flex gap-px"
                  style={{ height: Math.max(4, powerUpsSizePx * 0.6) }}
                >
                  {Array.from({ length: 8 }).map((_, j) => {
                    const pct = Math.max(0, Math.min(100, (pu.timer / powerUpDurations[pu.type]) * 100));
                    const filled = j < Math.ceil(pct / 12.5);
                    return (
                      <div
                        key={j}
                        style={{
                          width: Math.max(3, powerUpsSizePx * 0.5),
                          height: "100%",
                          backgroundColor: filled
                            ? pu.type === "rapid"
                              ? "#ff8800"
                              : pu.type === "invincible"
                                ? "#ffd700"
                                : "#fcee0a"
                            : "#333333",
                          imageRendering: "pixelated",
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hearts — single heart with slice fill + numeric lives counter */}
      {hearts.visible && (
        <div
          className="absolute select-none"
          style={{ left: screenX(hearts.x), top: screenY(hearts.y) }}
        >
          <div className="flex items-center gap-1 p-1" style={{ background: "rgba(0,0,0,0.6)" }}>
            {(() => {
              const sph = slicesPerHeart ?? 1;
              const curSlices = currentSlices ?? lives * sph;
              const livesCount = curSlices > 0 ? Math.ceil(curSlices / sph) : 0;
              const heartSizePx = Math.round(scaleSize(hearts.size) * 0.7);
              // Fill fraction of the current (topmost) life:
              // If curSlices is an exact multiple of sph the heart is full; otherwise show partial.
              const remainder = curSlices % sph;
              const fillFraction = curSlices <= 0 ? 0 : remainder === 0 ? 1 : remainder / sph;
              return (
                <>
                  {/* Single heart showing health within the current life */}
                  <PixelHeart fillFraction={fillFraction} size={heartSizePx} />
                  {/* Slice pip indicators when health power-up is active */}
                  {sph > 1 && (
                    <div className="flex gap-px items-end ml-0.5">
                      {Array.from({ length: sph }).map((_, si) => {
                        const filled = si < (curSlices <= 0 ? 0 : remainder === 0 ? sph : remainder);
                        return (
                          <div
                            key={si}
                            style={{
                              width: Math.max(2, heartSizePx * 0.18),
                              height: Math.max(4, heartSizePx * 0.35),
                              backgroundColor: filled ? "#ff006e" : "#ff006e33",
                              imageRendering: "pixelated",
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                  {/* Lives count */}
                  <span
                    className="font-mono font-bold leading-none"
                    style={{
                      color: "#ff006e",
                      fontSize: heartSizePx * 0.65,
                      textShadow: "1px 1px 0 #440022",
                      imageRendering: "pixelated",
                      marginLeft: 2,
                    }}
                  >
                    ×{livesCount}
                  </span>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Controls - top right (8-bit) */}
      <div className="absolute flex items-center gap-1 pointer-events-auto" style={{ right: screenX(8), top: screenY(8) }}>
        <button
          onClick={onToggleMute}
          className="flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
          style={{
            width: scaleSize(24),
            height: scaleSize(24),
            background: "#000000",
            border: "2px solid #444444",
            fontSize: scaleSize(12),
            imageRendering: "pixelated",
          }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? "M" : "S"}
        </button>
        <button
          onClick={onPause}
          className="flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
          style={{
            width: scaleSize(24),
            height: scaleSize(24),
            background: "#000000",
            border: "2px solid #444444",
            fontSize: scaleSize(12),
            imageRendering: "pixelated",
          }}
          aria-label="Pause"
        >
          II
        </button>
      </div>
    </div>
  );
}
