"use client";

import { useSiteData } from "@/components/data-provider";
import { useEffect, useState } from "react";

const BASE_H = 320;
const BASE_W = 240;
const MAX_LIVES = 3;
const ABSOLUTE_MAX_LIVES = MAX_LIVES + 2; // extralife can push to 5

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
}

function Heart({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "#ff006e" : "none"}
      stroke={filled ? "#ff006e" : "rgba(255,0,110,0.35)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block"
      style={{
        filter: filled
          ? "drop-shadow(0 0 6px rgba(255,0,110,0.8))"
          : "none",
      }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function PowerUpLabel({ type, size, stacks }: { type: ActivePowerUp["type"]; size: number; stacks?: number }) {
  const labels: Record<ActivePowerUp["type"], { text: string; color: string }> = {
    rapid: { text: "RAPID FIRE", color: "#ff8800" },
    shield: { text: "SHIELD", color: "#00f0ff" },
    wideshot: { text: "WIDE SHOT", color: "#fcee0a" },
    extralife: { text: "EXTRA LIFE", color: "#ff006e" },
    invincible: { text: "INVINCIBLE", color: "#ffd700" },
  };
  const l = labels[type];
  const suffix = stacks && stacks > 1 ? ` x${stacks}` : "";
  return (
    <span className="font-mono font-bold tracking-wider" style={{ color: l.color, fontSize: size }}>
      {l.text}{suffix}
    </span>
  );
}

export function GameHUD({ score, lives, wave, muted, activePowerUps, onPause, onToggleMute }: GameHUDProps) {
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
    <div className="absolute top-0 left-0 right-0 bottom-0 z-50 pointer-events-none">
      {/* Score */}
      {scorePos.visible && (
        <div className="absolute select-none" style={{ left: screenX(scorePos.x), top: screenY(scorePos.y) }}>
          <span className="text-neutral-400 font-mono leading-none tracking-wider block" style={{ fontSize: scoreSizePx * 0.55 }}>SCORE</span>
          <span
            className="text-[#00f0ff] font-mono font-bold leading-tight drop-shadow-[0_0_6px_rgba(0,240,255,0.5)] inline-block transition-transform duration-150"
            style={{ fontSize: scoreSizePx, transform: scoreBump ? "scale(1.2)" : "scale(1)" }}
          >
            {score.toString().padStart(6, "0")}
          </span>
        </div>
      )}

      {/* Wave */}
      {wavePos.visible && (
        <div className="absolute select-none" style={{ left: screenX(wavePos.x), top: screenY(wavePos.y) }}>
          <span className="text-neutral-400 font-mono leading-none tracking-wider block" style={{ fontSize: waveSizePx * 0.55 }}>WAVE</span>
          <span className="text-[#fcee0a] font-mono font-bold leading-tight drop-shadow-[0_0_6px_rgba(252,238,10,0.5)]" style={{ fontSize: waveSizePx }}>{wave}</span>
        </div>
      )}

      {/* Active power-up indicators */}
      {powerUpsPos.visible && activePowerUps && activePowerUps.length > 0 && (
        <div className="absolute select-none flex flex-col gap-1" style={{ left: screenX(powerUpsPos.x), top: screenY(powerUpsPos.y) }}>
          {activePowerUps.map((pu, i) => (
            <div key={`${pu.type}-${i}`} className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              <PowerUpLabel type={pu.type} size={powerUpsSizePx} stacks={pu.stacks} />
              {pu.type !== "extralife" && pu.type !== "shield" && (
                <div className="w-16 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, (pu.timer / powerUpDurations[pu.type]) * 100))}%`,
                      backgroundColor: pu.type === "rapid" ? "#ff8800" :
                        pu.type === "invincible" ? "#ffd700" : "#fcee0a",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hearts - positioned from settings, show up to absolute max */}
      {hearts.visible && (
        <div
          className="absolute select-none"
          style={{
            left: screenX(hearts.x),
            top: screenY(hearts.y),
          }}
        >
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 shadow-lg">
            {Array.from({ length: ABSOLUTE_MAX_LIVES }).map((_, i) => (
              <Heart key={i} filled={i < lives} size={Math.round(scaleSize(hearts.size))} />
            ))}
          </div>
        </div>
      )}

      {/* Controls - top right */}
      <div className="absolute flex items-center gap-2 pointer-events-auto" style={{ right: screenX(8), top: screenY(8) }}>
        <button
          onClick={onToggleMute}
          className="w-10 h-10 rounded-xl bg-black/70 border border-white/15 flex items-center justify-center text-sm text-neutral-300 hover:text-white hover:bg-black/90 transition-colors backdrop-blur-md shadow-lg"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button
          onClick={onPause}
          className="w-10 h-10 rounded-xl bg-black/70 border border-white/15 flex items-center justify-center text-sm text-neutral-300 hover:text-white hover:bg-black/90 transition-colors backdrop-blur-md shadow-lg"
          aria-label="Pause"
        >
          ⏸
        </button>
      </div>
    </div>
  );
}
