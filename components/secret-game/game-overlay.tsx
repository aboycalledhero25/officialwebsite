"use client";

import { useCallback, useEffect, useState } from "react";
import { submitScore, getLeaderboard } from "@/lib/actions";

export type OverlayPhase = "menu" | "playing" | "paused" | "gameover" | "levelcomplete" | "bossreward" | "wavereward";

export interface LeaderboardEntry {
  name: string;
  score: number;
  wave: number;
  created_at: string;
}

export interface RunStats {
  totalDamage: number;
  powerUpCount: number;
  damageMultiplier: number;
  fireRate: number;
  projectileCount: number;
}

export interface OverlayProps {
  phase: OverlayPhase;
  score: number;
  highScore: number;
  wave: number;
  title: string;
  instructions: string;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  musicVolume?: number;
  sfxVolume?: number;
  onMusicVolume?: (v: number) => void;
  onSfxVolume?: (v: number) => void;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onClose: () => void;
  runStats?: RunStats;
}

export function GameOverlay({
  phase,
  score,
  highScore,
  wave,
  title,
  instructions,
  leaderboard,
  leaderboardLoading,
  musicVolume = 0.4,
  sfxVolume = 1,
  onMusicVolume,
  onSfxVolume,
  onStart,
  onResume,
  onRestart,
  onClose,
  runStats,
}: OverlayProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedName, setSavedName] = useState("");
  const [isTopScore, setIsTopScore] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
  }, []);

  // Reset save state when game over appears
  useEffect(() => {
    if (phase === "gameover") {
      setSaveStatus("idle");
      setPlayerName("");
      setSavedName("");
      setIsTopScore(false);
    }
  }, [phase]);

  const handleSaveScore = useCallback(async () => {
    const name = playerName.trim();
    if (!name || name.length > 20) return;
    setSaveStatus("saving");
    try {
      await submitScore(name, score, wave);
      setSaveStatus("saved");
      setSavedName(name);
      // Check if this is the new #1 score
      const fresh = await getLeaderboard(5);
      if (fresh.length > 0 && fresh[0].name.toLowerCase() === name.toLowerCase() && fresh[0].score === score) {
        setIsTopScore(true);
      }
    } catch {
      setSaveStatus("error");
    }
  }, [playerName, score, wave]);

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

  const LeaderboardTable = () => (
    <div className="w-full max-w-xs mt-2">
      <div className="text-white/70 text-xs font-mono uppercase tracking-widest mb-2 text-center">
        Top Scores
      </div>
      {leaderboardLoading ? (
        <div className="text-white/40 text-xs text-center py-2">Loading...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-white/40 text-xs text-center py-2">No scores yet</div>
      ) : (
        <div className="flex flex-col gap-1">
          {leaderboard.map((entry, i) => (
            <div
              key={i}
              className={`flex items-center justify-between text-xs font-mono px-2 py-1 rounded ${
                savedName && entry.name === savedName && entry.score === score
                  ? "bg-[#ff006e]/20 text-white"
                  : "text-white/70"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-white/40 w-4">{i + 1}</span>
                <span className="truncate max-w-[100px]">{entry.name}</span>
              </span>
              <span className="text-white/90">{entry.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const content = (() => {
    switch (phase) {
      case "menu":
        return (
          <div
            className="flex flex-col items-center gap-4 animate-in fade-in duration-500 text-center px-6 max-h-[90vh] overflow-y-auto"
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
                  ? "Touch and drag to move, fire button to shoot"
                  : "Arrow keys / WASD to move · Space to shoot · P to pause · M to mute"}
              </span>
            </div>
            <button
              onClick={onStart}
              className="mt-2 px-10 py-4 bg-[#ff006e] hover:bg-[#e6005f] text-white font-bold text-lg rounded-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,0,110,0.4)] hover:shadow-[0_0_30px_rgba(255,0,110,0.6)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Start Game
            </button>
            {highScore > 0 && (
              <div className="text-white/60 text-sm">
                High Score: {highScore}
              </div>
            )}
            <VolumeSliders
              musicVolume={musicVolume}
              sfxVolume={sfxVolume}
              onMusicVolume={onMusicVolume}
              onSfxVolume={onSfxVolume}
            />
            <LeaderboardTable />
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
            <VolumeSliders
              musicVolume={musicVolume}
              sfxVolume={sfxVolume}
              onMusicVolume={onMusicVolume}
              onSfxVolume={onSfxVolume}
            />
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
            className="flex flex-col items-center gap-4 animate-in fade-in duration-500 text-center px-6 max-h-[90vh] overflow-y-auto"
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
              {isTopScore && (
                <div className="flex flex-col items-center gap-1 animate-in zoom-in duration-300">
                  <span className="text-[#ffd700] font-black text-lg tracking-wider drop-shadow-[0_0_10px_rgba(255,215,0,0.8)] animate-bounce">
                    🏆 #1 ON THE LEADERBOARD!
                  </span>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className="text-xs animate-pulse"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      >
                        ✨
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Run stats */}
            {runStats && (
              <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-sm px-4 py-3 flex flex-col gap-2 text-left">
                <div className="text-white/50 text-xs font-mono uppercase tracking-widest text-center mb-1">Run Summary</div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Total Damage</span>
                  <span className="text-[#ff006e] font-bold">{runStats.totalDamage.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Power-Ups Collected</span>
                  <span className="text-[#fcee0a] font-bold">{runStats.powerUpCount}</span>
                </div>
                <div className="border-t border-white/10 my-1" />
                <div className="text-white/40 text-xs font-mono uppercase tracking-widest text-center mb-1">Final Stats</div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Damage ×</span>
                  <span className="text-white font-bold">{runStats.damageMultiplier.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Fire Rate</span>
                  <span className="text-white font-bold">{runStats.fireRate.toFixed(1)}/s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Projectiles / Shot</span>
                  <span className="text-white font-bold">{runStats.projectileCount}</span>
                </div>
              </div>
            )}
            {/* Name input */}
            {saveStatus !== "saved" && (
              <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-sm text-white text-sm text-center placeholder:text-white/30 focus:outline-none focus:border-white/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (playerName.trim()) handleSaveScore();
                    }
                  }}
                />
                <button
                  onClick={handleSaveScore}
                  disabled={!playerName.trim() || saveStatus === "saving"}
                  className="px-6 py-2 bg-[#00b4d8] hover:bg-[#0096c7] disabled:bg-white/10 disabled:text-white/30 text-white font-bold text-sm rounded-sm uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,180,216,0.4)] hover:shadow-[0_0_25px_rgba(0,180,216,0.6)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:shadow-none"
                >
                  {saveStatus === "saving" ? "Saving..." : "Save Score"}
                </button>
                {saveStatus === "error" && (
                  <span className="text-red-400 text-xs">Failed to save. Try again.</span>
                )}
              </div>
            )}
            {saveStatus === "saved" && (
              <div className="text-[#00b4d8] text-sm font-bold animate-pulse">
                Score saved!
              </div>
            )}
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
            <LeaderboardTable />
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

  if (phase === "playing" || phase === "bossreward" || phase === "wavereward") return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {content}
    </div>
  );
}

// ── Volume sliders widget ────────────────────────────────────────────────────
interface VolumeSlidersProps {
  musicVolume: number;
  sfxVolume: number;
  onMusicVolume?: (v: number) => void;
  onSfxVolume?: (v: number) => void;
}

function VolumeSliders({ musicVolume, sfxVolume, onMusicVolume, onSfxVolume }: VolumeSlidersProps) {
  return (
    <div className="w-full max-w-[220px] flex flex-col gap-3 py-2">
      <VolumeRow
        label="🎵 Music"
        value={musicVolume}
        onChange={onMusicVolume}
      />
      <VolumeRow
        label="🔊 SFX"
        value={sfxVolume}
        onChange={onSfxVolume}
      />
    </div>
  );
}

function VolumeRow({ label, value, onChange }: { label: string; value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/60 text-xs w-16 text-right shrink-0 font-mono">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        className="flex-1 h-1.5 appearance-none rounded-full bg-white/20 accent-[#00f0ff] cursor-pointer"
        style={{ accentColor: "#00f0ff" }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      />
      <span className="text-white/40 text-xs w-8 text-left font-mono tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
