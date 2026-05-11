"use client";

import { useSiteData } from "@/components/data-provider";
import { useEffect, useState } from "react";

const BASE_H = 320;
const BASE_W = 240;
const MAX_LIVES = 3;

interface ActivePowerUp {
  type: "rapid" | "shield" | "wideshot" | "extralife";
  timer: number;
}

interface GameHUDProps {
  score: number;
  lives: number;
  wave: number;
  muted: boolean;
  activePowerUp?: ActivePowerUp | null;
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

function PowerUpLabel({ type }: { type: ActivePowerUp["type"] }) {
  const labels: Record<ActivePowerUp["type"], { text: string; color: string }> = {
    rapid: { text: "RAPID FIRE", color: "#ff8800" },
    shield: { text: "SHIELD", color: "#00f0ff" },
    wideshot: { text: "WIDE SHOT", color: "#fcee0a" },
    extralife: { text: "EXTRA LIFE", color: "#ff006e" },
  };
  const l = labels[type];
  return (
    <span className="text-[10px] font-mono font-bold tracking-wider" style={{ color: l.color }}>
      {l.text}
    </span>
  );
}

export function GameHUD({ score, lives, wave, muted, activePowerUp, onPause, onToggleMute }: GameHUDProps) {
  const filledLives = Math.max(0, Math.min(lives, MAX_LIVES));
  const siteData = useSiteData();
  const [dims, setDims] = useState({ w: 1920, h: 1080 });

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = typeof window !== "undefined" && (window.innerWidth < 768 || "ontouchstart" in window);
  const plat = siteData.secretGame?.[isMobile ? "mobile" : "desktop"];
  const hearts = plat?.hearts ?? { visible: true, x: 190, y: 8, size: 28 };

  // Scale stored positions (0-240 x, 0-320 y) to actual screen dimensions
  const screenX = (baseX: number) => (baseX / BASE_W) * dims.w;
  const screenY = (baseY: number) => (baseY / BASE_H) * dims.h;
  const scaleSize = (baseSize: number) => (baseSize / BASE_H) * dims.h;

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 z-50 pointer-events-none">
      {/* Score - top left */}
      <div className="absolute select-none" style={{ left: screenX(8), top: screenY(8) }}>
        <span className="text-xs text-neutral-400 font-mono leading-none tracking-wider block">SCORE</span>
        <span className="text-lg text-[#00f0ff] font-mono font-bold leading-tight drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]">
          {score.toString().padStart(6, "0")}
        </span>
      </div>

      {/* Wave - top center */}
      <div className="absolute left-1/2 -translate-x-1/2 select-none text-center" style={{ top: screenY(8) }}>
        <span className="text-xs text-neutral-400 font-mono leading-none tracking-wider block">WAVE</span>
        <span className="text-lg text-[#fcee0a] font-mono font-bold leading-tight drop-shadow-[0_0_6px_rgba(252,238,10,0.5)]">{wave}</span>
      </div>

      {/* Active power-up indicator */}
      {activePowerUp && (
        <div className="absolute left-1/2 -translate-x-1/2 select-none text-center" style={{ top: screenY(28) }}>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
            <PowerUpLabel type={activePowerUp.type} />
            <div className="w-16 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(0, Math.min(100, (activePowerUp.timer / (
                    activePowerUp.type === "rapid" ? 5 :
                    activePowerUp.type === "shield" ? 6 : 4
                  )) * 100))}%`,
                  backgroundColor: activePowerUp.type === "rapid" ? "#ff8800" :
                    activePowerUp.type === "shield" ? "#00f0ff" : "#fcee0a",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hearts - positioned from settings */}
      {hearts.visible && (
        <div
          className="absolute select-none"
          style={{
            left: screenX(hearts.x),
            top: screenY(hearts.y),
          }}
        >
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 shadow-lg">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart key={i} filled={i < filledLives} size={Math.round(scaleSize(hearts.size))} />
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
