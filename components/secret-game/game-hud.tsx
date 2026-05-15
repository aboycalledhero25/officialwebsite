"use client";

import { useSiteData } from "@/components/data-provider";
import { useEffect, useRef, useState } from "react";

const BASE_H = 320;
const BASE_W = 240;

interface ActivePowerUp {
  type: "rapid" | "shield" | "wideshot" | "extralife" | "invincible" | "projectile" | "timewarp" | "doubleshot" | "ricochet" | "overcharge" | "groupie";
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
    projectile: { text: "PROJ", color: "#ff6600" },
    extralife: { text: "LIFE", color: "#ff006e" },
    invincible: { text: "STAR", color: "#ffd700" },
    timewarp: { text: "SLOW", color: "#00b4d8" },
    doubleshot: { text: "DBL", color: "#ff8800" },
    ricochet: { text: "ZAP", color: "#fcee0a" },
    overcharge: { text: "POW", color: "#ff2222" },
    groupie: { text: "GROUPIE", color: "#ff69b4" },

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const iosHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect iOS — requestFullscreen does not exist on iOS Safari for non-video elements
  const isIOS = typeof navigator !== "undefined" &&
    /iP(hone|ad|od)/.test(navigator.userAgent);

  // Track fullscreen state changes (e.g. user presses Escape)
  useEffect(() => {
    const onChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      setIsFullscreen(!!(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggleFullscreen = () => {
    // iOS Safari has no fullscreen API for web content (only <video> supports it).
    // The only way to get true fullscreen on iOS is "Add to Home Screen" → standalone PWA.
    if (isIOS) {
      if (iosHintTimer.current) clearTimeout(iosHintTimer.current);
      setIosHint(true);
      iosHintTimer.current = setTimeout(() => setIosHint(false), 6000);
      return;
    }

    type FSDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    type FSEl  = HTMLElement & { webkitRequestFullscreen?: () => void };
    const doc = document as FSDoc;
    const el  = document.documentElement as FSEl;
    const isFs = !!(document.fullscreenElement || doc.webkitFullscreenElement);

    if (!isFs) {
      if (typeof el.requestFullscreen === "function") {
        el.requestFullscreen().catch(() => {});
      } else if (typeof el.webkitRequestFullscreen === "function") {
        el.webkitRequestFullscreen();
      }
    } else {
      if (typeof document.exitFullscreen === "function") {
        document.exitFullscreen().catch(() => {});
      } else if (typeof doc.webkitExitFullscreen === "function") {
        doc.webkitExitFullscreen();
      }
    }
  };

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
  const controlsPos = plat?.controls ?? { x: 159, y: 292, size: 24 };

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
    projectile: settingsDurations?.projectile ?? 4,
    extralife: 0,
    invincible: settingsDurations?.invincible ?? 4,
    timewarp: settingsDurations?.timewarp ?? 5,
    doubleshot: settingsDurations?.doubleshot ?? 6,
    ricochet: settingsDurations?.ricochet ?? 5,
    overcharge: 0,
    groupie: settingsDurations?.groupie ?? 8,
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
              {pu.type !== "extralife" && pu.type !== "shield" && pu.type !== "overcharge" && (
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

      {/* Controls — position/size from admin panel */}
      {(() => {
        const btnSz = scaleSize(controlsPos.size);
        const btnStyle: React.CSSProperties = {
          width: btnSz,
          height: btnSz,
          background: "#000000",
          border: "2px solid #444444",
          fontSize: btnSz * 0.45,
          imageRendering: "pixelated",
          flexShrink: 0,
        };
        return (
          <div
            className="absolute flex items-center pointer-events-auto"
            style={{ left: screenX(controlsPos.x), top: screenY(controlsPos.y), gap: Math.max(2, btnSz * 0.1) }}
          >
            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
              style={btnStyle}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? "⊡" : "⛶"}
            </button>
            {/* Mute toggle */}
            <button
              onClick={onToggleMute}
              className="flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
              style={btnStyle}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? "M" : "S"}
            </button>
            {/* Pause */}
            <button
              onClick={onPause}
              className="flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
              style={btnStyle}
              aria-label="Pause"
            >
              II
            </button>
          </div>
        );
      })()}

      {/* iOS fullscreen hint — shown when user taps fullscreen on iPhone/iPad */}
      {iosHint && (
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "12%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            width: "min(280px, 80vw)",
          }}
        >
          <div
            className="rounded-xl text-white text-center px-4 py-4"
            style={{
              background: "rgba(0,0,0,0.92)",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
            }}
          >
            <div className="text-2xl mb-2">📱</div>
            <div className="font-bold text-sm mb-1">Fullscreen on iPhone</div>
            <div className="text-xs text-white/70 leading-relaxed">
              Tap the <span className="text-white font-bold">Share</span> button{" "}
              <span className="text-lg">⬆</span> then{" "}
              <span className="text-white font-bold">Add to Home Screen</span>.
              Opening from there gives you the full screen with no browser bar.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
