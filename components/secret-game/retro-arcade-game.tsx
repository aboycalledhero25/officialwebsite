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
  const [activePowerUps, setActivePowerUps] = useState<{ type: "rapid" | "shield" | "wideshot" | "extralife"; timer: number }[]>([]);
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

    getLeaderboard(10)
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
      getLeaderboard(10)
        .then((data) => setLeaderboard(data))
        .catch(() => {});
    }
  }, [phase]);

  const handleStart = useCallback(() => {
    sharedKeys.shoot = false;
    sharedAim.firing = false;
    setScore(0);
    setLives(3);
    setWave(1);
    setActivePowerUps([]);
    setResetKey((k) => k + 1);
    setPhase("playing");
  }, []);

  const handleRestart = useCallback(() => {
    sharedKeys.shoot = false;
    sharedAim.firing = false;
    setScore(0);
    setLives(3);
    setWave(1);
    setActivePowerUps([]);
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

      {/* Mobile controls */}
      {phase === "playing" && <MobileControls />}
    </div>
  );
}
