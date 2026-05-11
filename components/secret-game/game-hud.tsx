"use client";

interface GameHUDProps {
  score: number;
  lives: number;
  wave: number;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
}

const MAX_LIVES = 3;

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="28"
      height="28"
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

export function GameHUD({ score, lives, wave, muted, onPause, onToggleMute }: GameHUDProps) {
  const filledLives = Math.max(0, Math.min(lives, MAX_LIVES));

  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between px-4 py-3 select-none pointer-events-none">
      {/* Score */}
      <div className="flex flex-col">
        <span className="text-xs text-neutral-400 font-mono leading-none tracking-wider">SCORE</span>
        <span className="text-lg text-[#00f0ff] font-mono font-bold leading-tight drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]">
          {score.toString().padStart(6, "0")}
        </span>
      </div>

      {/* Wave */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-neutral-400 font-mono leading-none tracking-wider">WAVE</span>
        <span className="text-lg text-[#fcee0a] font-mono font-bold leading-tight drop-shadow-[0_0_6px_rgba(252,238,10,0.5)]">{wave}</span>
      </div>

      {/* Lives + controls */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="flex flex-col items-end">
          <span className="text-xs text-neutral-400 font-mono leading-none tracking-wider">LIVES</span>
          <div className="flex items-center gap-1 mt-1 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 shadow-lg">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart key={i} filled={i < filledLives} />
            ))}
          </div>
        </div>

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
