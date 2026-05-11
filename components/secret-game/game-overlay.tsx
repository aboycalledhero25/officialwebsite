"use client";

import { useCallback, useEffect, useState } from "react";

export type OverlayPhase = "menu" | "playing" | "paused" | "gameover" | "levelcomplete";

export interface OverlayProps {
  phase: OverlayPhase;
  score: number;
  highScore: number;
  wave: number;
  title: string;
  instructions: string;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onClose: () => void;
}

export function GameOverlay({
  phase,
  score,
  highScore,
  wave,
  title,
  instructions,
  onStart,
  onResume,
  onRestart,
  onClose,
}: OverlayProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
  }, []);

  const handleKeyStart = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (phase === "menu") onStart();
        else if (phase === "gameover") onRestart();
        else if (phase === "paused") onResume();
      }
    },
    [phase, onStart, onRestart, onResume]
  );

  const content = (() => {
    switch (phase) {
      case "menu":
        return (
          <div
            className="flex flex-col items-center gap-6 animate-in fade-in duration-500 text-center px-6"
            tabIndex={0}
            onKeyDown={handleKeyStart}
            autoFocus
          >
            <div className="text-5xl md:text-6xl font-black tracking-widest uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              {title.split(" ").length > 1 ? (
                <>
                  {title.split(" ").slice(0, -1).join(" ")}<br />{title.split(" ").slice(-1)}
                </>
              ) : (
                title
              )}
            </div>
            <div className="flex flex-col items-center gap-1 text-white/70 text-sm md:text-base max-w-md">
              <span>{instructions}</span>
              <span className="text-white/50">
                {isMobile
                  ? "Tap arrows to move, fire button to shoot"
                  : "Arrow keys / A-D to move · Space to shoot · P to pause · M to mute"}
              </span>
            </div>
            <button
              onClick={onStart}
              className="mt-4 px-10 py-4 bg-[#ff006e] hover:bg-[#e6005f] text-white font-bold text-lg rounded-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,0,110,0.4)] hover:shadow-[0_0_30px_rgba(255,0,110,0.6)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Start Game
            </button>
            {highScore > 0 && (
              <div className="text-white/60 text-sm mt-2">
                High Score: {highScore}
              </div>
            )}
          </div>
        );
      case "paused":
        return (
          <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300 text-center px-6">
            <div className="text-4xl md:text-5xl font-black tracking-widest uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              Paused
            </div>
            <button
              onClick={onResume}
              className="px-8 py-3 bg-[#ff006e] hover:bg-[#e6005f] text-white font-bold rounded-sm uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,0,110,0.4)] hover:shadow-[0_0_25px_rgba(255,0,110,0.6)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Resume
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-sm transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Quit to Menu
            </button>
          </div>
        );
      case "gameover":
        return (
          <div
            className="flex flex-col items-center gap-6 animate-in fade-in duration-500 text-center px-6"
            tabIndex={0}
            onKeyDown={handleKeyStart}
            autoFocus
          >
            <div className="text-5xl md:text-6xl font-black tracking-widest uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              Game Over
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/80 text-lg">
                Score: <span className="text-white font-bold text-xl">{score}</span>
              </span>
              <span className="text-white/60 text-sm">Wave {wave}</span>
              {score >= highScore && score > 0 && (
                <span className="text-[#ff006e] font-bold text-sm animate-pulse">
                  New High Score!
                </span>
              )}
            </div>
            <button
              onClick={onRestart}
              className="mt-2 px-10 py-4 bg-[#ff006e] hover:bg-[#e6005f] text-white font-bold text-lg rounded-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,0,110,0.4)] hover:shadow-[0_0_30px_rgba(255,0,110,0.6)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Play Again
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-sm transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Main Menu
            </button>
          </div>
        );
      case "levelcomplete":
        return (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300 text-center px-6">
            <div className="text-3xl md:text-4xl font-black tracking-widest uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              Wave {wave} Clear!
            </div>
            <div className="text-white/60 text-sm">Get ready for the next wave...</div>
          </div>
        );
      default:
        return null;
    }
  })();

  if (phase === "playing") return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {content}
    </div>
  );
}
