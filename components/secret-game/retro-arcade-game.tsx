"use client";

import { useState, useCallback, useEffect } from "react";
import { GameCanvas, GamePhase } from "./game-canvas";
import { GameHUD } from "./game-hud";
import { GameOverlay } from "./game-overlay";
import { MobileControls } from "./mobile-controls";
import { sharedKeys, sharedAim } from "./use-keyboard-controls";
import { useAudioSfx } from "./use-audio-sfx";
import { useGameMusic } from "./use-game-music";
import { getLeaderboard } from "@/lib/actions";

interface LeaderboardEntry {
  name: string;
  score: number;
  wave: number;
  created_at: string;
}

interface RetroArcadeGameProps {
  title: string;
  instructions: string;
  onClose: () => void;
}

export function RetroArcadeGame({ title, instructions, onClose }: RetroArcadeGameProps) {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [activePowerUps, setActivePowerUps] = useState<{ type: "rapid" | "shield" | "wideshot" | "extralife" | "invincible"; timer: number; stacks: number }[]>([]);
  const [permUpgrades, setPermUpgrades] = useState({ permProjectileBonus: 0, permFireRateBonus: 0, regenLevel: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const { setMuted: setAudioMuted } = useAudioSfx();
  const { setMuted: setMusicMuted } = useGameMusic("/audio/8-bit.mp3");

  // Load high score + leaderboard on mount
  useEffect(() => {
    try {
      const hs = localStorage.getItem("abch-guitar-invaders-highscore");
      if (hs) setHighScore(parseInt(hs, 10));
    } catch {}

    getLeaderboard(5)
      .then((data) => {
        setLeaderboard(data);
        setLeaderboardLoading(false);
      })
      .catch(() => setLeaderboardLoading(false));
  }, []);

  // Refresh high score when game ends
  useEffect(() => {
    if (phase === "gameover") {
      try {
        const hs = localStorage.getItem("abch-guitar-invaders-highscore");
        if (hs) setHighScore(parseInt(hs, 10));
      } catch {}
      // Also refresh leaderboard
      getLeaderboard(5)
        .then((data) => setLeaderboard(data))
        .catch(() => {});
    }
  }, [phase]);

  const handleStart = useCallback(() => {
    sharedKeys.shoot = false;
    sharedAim.firing = false;
    sharedAim.aiming = false;
    setScore(0);
    setLives(3);
    setWave(1);
    setActivePowerUps([]);
    setPermUpgrades({ permProjectileBonus: 0, permFireRateBonus: 0, regenLevel: 0 });
    setResetKey((k) => k + 1);
    setPhase("playing");
  }, []);

  const handleRestart = useCallback(() => {
    sharedKeys.shoot = false;
    sharedAim.firing = false;
    sharedAim.aiming = false;
    setScore(0);
    setLives(3);
    setWave(1);
    setActivePowerUps([]);
    setPermUpgrades({ permProjectileBonus: 0, permFireRateBonus: 0, regenLevel: 0 });
    setResetKey((k) => k + 1);
    setPhase("playing");
  }, []);

  // Tab visibility pause
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && phase === "playing") {
        setPhase("paused");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase]);

  // Escape: pause first, then close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (phase === "playing") {
          e.preventDefault();
          sharedKeys.escape = false;
          setPhase("paused");
        } else if (phase === "paused" || phase === "menu" || phase === "gameover") {
          sharedKeys.escape = false;
          onClose();
        }
      }
      if (e.key === " " && (phase === "menu" || phase === "gameover")) {
        e.preventDefault();
        sharedKeys.shoot = false;
        if (phase === "menu") handleStart();
        else handleRestart();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, onClose, handleStart, handleRestart]);

  // Auto-advance from level complete
  useEffect(() => {
    if (phase === "levelcomplete") {
      const t = setTimeout(() => setPhase("playing"), 1500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleToggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    setMusicMuted(next);
  }, [muted, setAudioMuted, setMusicMuted]);

  // Mobile control handlers
  const handleMobileShoot = useCallback((active: boolean) => {
    sharedKeys.shoot = active;
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      {/* Canvas fills the entire viewport */}
      <GameCanvas
        phase={phase}
        resetKey={resetKey}
        onPhaseChange={setPhase}
        onScoreChange={setScore}
        onLivesChange={setLives}
        onWaveChange={setWave}
        onPowerUpChange={setActivePowerUps}
        score={score}
        lives={lives}
        wave={wave}
        permProjectileBonus={permUpgrades.permProjectileBonus}
        permFireRateBonus={permUpgrades.permFireRateBonus}
        regenLevel={permUpgrades.regenLevel}
      />

      {/* HUD overlays the canvas */}
      {phase !== "menu" && (
        <GameHUD
          score={score}
          lives={lives}
          wave={wave}
          muted={muted}
          activePowerUps={activePowerUps}
          onPause={() => phase === "playing" && setPhase("paused")}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Menu / pause / game over overlays */}
      <GameOverlay
        phase={phase}
        score={score}
        highScore={highScore}
        wave={wave}
        title={title}
        instructions={instructions}
        leaderboard={leaderboard}
        leaderboardLoading={leaderboardLoading}
        onStart={handleStart}
        onResume={() => setPhase("playing")}
        onRestart={handleRestart}
        onClose={onClose}
      />

      {/* Boss reward selection overlay */}
      {phase === "bossreward" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center max-w-xs w-full px-4">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              BOSS DEFEATED!
            </h2>
            <p className="text-white/80 text-sm mb-6">Choose your permanent upgrade:</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setPermUpgrades((u) => ({ ...u, permProjectileBonus: u.permProjectileBonus + 1 }));
                  setPhase("playing");
                }}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded border-2 border-blue-400 transition-colors"
              >
                <div className="font-bold">+1 Projectile</div>
                <div className="text-xs text-blue-200">Fire an extra bullet</div>
              </button>
              <button
                onClick={() => {
                  setPermUpgrades((u) => ({ ...u, permFireRateBonus: u.permFireRateBonus + 1 }));
                  setPhase("playing");
                }}
                className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded border-2 border-orange-400 transition-colors"
              >
                <div className="font-bold">+1 Fire Rate</div>
                <div className="text-xs text-orange-200">Shoot faster permanently</div>
              </button>
              <button
                onClick={() => {
                  setPermUpgrades((u) => ({ ...u, regenLevel: u.regenLevel + 1 }));
                  setPhase("playing");
                }}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white rounded border-2 border-green-400 transition-colors"
              >
                <div className="font-bold">Health Regen</div>
                <div className="text-xs text-green-200">
                  {permUpgrades.regenLevel > 0
                    ? `${permUpgrades.regenLevel + 1} hearts/min`
                    : "1 heart per minute"}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile controls */}
      {phase === "playing" && <MobileControls />}
    </div>
  );
}
