"use client";

import { GamePhase } from "./game-canvas";

interface GameOverlayProps {
  phase: GamePhase;
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
}: GameOverlayProps) {
  if (phase === "playing") return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 select-none">
      {/* Dark backdrop for readability */}
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 text-center px-6 max-w-md w-full">
        {phase === "menu" && (
          <>
            <h1 className="text-4xl md:text-5xl font-bold text-[#ff006e] mb-3 tracking-wider uppercase drop-shadow-[0_0_12px_rgba(255,0,110,0.6)]">
              {title}
            </h1>
            <p className="text-base md:text-lg text-neutral-300 mb-8 leading-relaxed">
              {instructions}
            </p>
            <div className="space-y-2 text-sm text-neutral-400 mb-8 font-mono">
              <p>← → or A/D to move</p>
              <p>SPACE to shoot</p>
              <p>CTRL for power-up beam</p>
              <p>P to pause · M to mute</p>
            </div>
            {highScore > 0 && (
              <p className="text-sm text-[#fcee0a] mb-6 font-mono">
                HIGH SCORE: {highScore}
              </p>
            )}
            <button
              onClick={onStart}
              className="px-10 py-4 bg-[#ff006e] text-black font-bold text-base rounded-xl hover:brightness-110 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,0,110,0.4)]"
            >
              START GAME
            </button>
          </>
        )}

        {phase === "paused" && (
          <>
            <h2 className="text-4xl md:text-5xl font-bold text-[#00f0ff] mb-6 tracking-wider uppercase drop-shadow-[0_0_12px_rgba(0,240,255,0.6)]">
              PAUSED
            </h2>
            <div className="space-y-3 max-w-xs mx-auto">
              <button
                onClick={onResume}
                className="w-full px-6 py-3 bg-[#00f0ff] text-black font-bold text-base rounded-xl hover:brightness-110 transition-all active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.4)]"
              >
                RESUME
              </button>
              <button
                onClick={onRestart}
                className="w-full px-6 py-3 border-2 border-[#ff006e] text-[#ff006e] font-bold text-base rounded-xl hover:bg-[#ff006e]/10 transition-all active:scale-95"
              >
                RESTART
              </button>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 border-2 border-neutral-600 text-neutral-400 font-bold text-base rounded-xl hover:bg-neutral-800 transition-all active:scale-95"
              >
                EXIT
              </button>
            </div>
          </>
        )}

        {phase === "gameover" && (
          <>
            <h2 className="text-4xl md:text-5xl font-bold text-red-500 mb-3 tracking-wider uppercase drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]">
              GAME OVER
            </h2>
            <p className="text-2xl text-white mb-1 font-mono">
              SCORE: {score}
            </p>
            {score >= highScore && score > 0 && (
              <p className="text-sm text-[#fcee0a] mb-4 font-bold">
                NEW HIGH SCORE!
              </p>
            )}
            <p className="text-sm text-neutral-400 mb-8 font-mono">
              HIGH SCORE: {highScore}
            </p>
            <div className="space-y-3 max-w-xs mx-auto">
              <button
                onClick={onRestart}
                className="w-full px-6 py-3 bg-[#ff006e] text-black font-bold text-base rounded-xl hover:brightness-110 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,0,110,0.4)]"
              >
                TRY AGAIN
              </button>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 border-2 border-neutral-600 text-neutral-400 font-bold text-base rounded-xl hover:bg-neutral-800 transition-all active:scale-95"
              >
                EXIT
              </button>
            </div>
          </>
        )}

        {phase === "levelcomplete" && (
          <>
            <h2 className="text-4xl md:text-5xl font-bold text-[#fcee0a] mb-3 tracking-wider uppercase drop-shadow-[0_0_12px_rgba(252,238,10,0.6)]">
              WAVE CLEAR!
            </h2>
            <p className="text-base text-neutral-300 mb-4">
              Wave {wave - 1} complete
            </p>
            <p className="text-sm text-neutral-400 animate-pulse">
              Next wave starting...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
