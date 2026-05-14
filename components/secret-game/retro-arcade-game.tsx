"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { GameCanvas, GamePhase } from "./game-canvas";
import { GameHUD } from "./game-hud";
import { GameOverlay, type RunStats } from "./game-overlay";
import { MobileControls } from "./mobile-controls";
import { PowerUpSelection } from "./power-up-selection";
import { sharedKeys, sharedAim } from "./use-keyboard-controls";
import { useAudioSfx, setSoundVolumes } from "./use-audio-sfx";
import { useGameMusic } from "./use-game-music";
import { getLeaderboard } from "@/lib/actions";
import { type PermPowerUpState, computePlayerStats } from "./player-stats";
import { pickRandomChoices } from "./power-up-registry";
import { ROGUELIKE_CONFIG } from "./power-up-config";
import { useSiteData } from "@/components/data-provider";

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
  const siteData = useSiteData();
  const disabledPowerUps = siteData.secretGame?.disabledPowerUps ?? [];
  // Live overrides from data.json — merged on top of ROGUELIKE_CONFIG defaults
  const roguelikeOverride = siteData.secretGame?.roguelikeConfig;
  const startingHearts = roguelikeOverride?.startingHearts ?? ROGUELIKE_CONFIG.startingHearts;

  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(startingHearts);
  const [wave, setWave] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [activePowerUps, setActivePowerUps] = useState<{ type: "rapid" | "shield" | "wideshot" | "extralife" | "invincible" | "projectile"; timer: number; stacks: number }[]>([]);

  // ── Roguelike permanent power-up state ──────────────────────────────
  const [chosenPowerUps, setChosenPowerUps] = useState<PermPowerUpState>({});
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);
  // Health detail for sliced-heart HUD
  const [healthDetail, setHealthDetail] = useState({ current: startingHearts, max: startingHearts, slicesPerHeart: 1 });
  // Trigger for the HealthRefill power-up (canvas watches this)
  const [healthRefillTrigger, setHealthRefillTrigger] = useState(0);
  // Run stats (populated when the player dies)
  const [runStats, setRunStats] = useState<RunStats | undefined>(undefined);

  // Compute all player stats from chosen power-ups (memoised), merging in data.json overrides
  const playerStats = useMemo(() => computePlayerStats(chosenPowerUps, roguelikeOverride), [chosenPowerUps, roguelikeOverride]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  // Persist volumes in localStorage so they survive page refreshes
  const [musicVolume, setMusicVolumeState] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("abch-music-vol") ?? "0.4"); } catch { return 0.4; }
  });
  const [sfxVolume, setSfxVolumeState] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("abch-sfx-vol") ?? "1"); } catch { return 1; }
  });

  const { playFile, setMuted: setAudioMuted, setVolume: setSfxVolume } = useAudioSfx();
  const { setMuted: setMusicMuted, setVolume: setMusicVolume } = useGameMusic("/audio/8-bit.mp3", musicVolume);

  // Sync initial volumes into audio systems once on mount
  useEffect(() => {
    setSfxVolume(sfxVolume);
    setMusicVolume(musicVolume);
    // Apply per-sound volume overrides from admin mixer
    if (siteData.secretGame?.sfxVolumes) {
      setSoundVolumes(siteData.secretGame.sfxVolumes);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /** Reset all roguelike state for a fresh run */
  const resetRoguelikeState = useCallback(() => {
    setChosenPowerUps({});
    setCurrentChoices([]);
    setHealthDetail({ current: startingHearts, max: startingHearts, slicesPerHeart: 1 });
  }, [startingHearts]);

  const handleStart = useCallback(() => {
    sharedKeys.shoot = false;
    sharedAim.firing = false;
    sharedAim.aiming = false;
    setScore(0);
    setLives(startingHearts);
    setWave(1);
    setActivePowerUps([]);
    resetRoguelikeState();
    setResetKey((k) => k + 1);
    setPhase("playing");
  }, [resetRoguelikeState, startingHearts]);

  const handleRestart = useCallback(() => {
    sharedKeys.shoot = false;
    sharedAim.firing = false;
    sharedAim.aiming = false;
    setScore(0);
    setLives(startingHearts);
    setWave(1);
    setActivePowerUps([]);
    setRunStats(undefined);
    resetRoguelikeState();
    setResetKey((k) => k + 1);
    setPhase("playing");
  }, [resetRoguelikeState, startingHearts]);

  // Generate 3 choices and play the fanfare whenever a reward screen is entered
  useEffect(() => {
    if (phase === "bossreward" || phase === "wavereward") {
      setCurrentChoices(pickRandomChoices(chosenPowerUps, 3, disabledPowerUps, siteData.secretGame?.powerUpMaxStacks));
      playFile("/audio/powerup.mp3");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /** Called when the player picks a power-up from the selection screen */
  const handlePowerUpSelect = useCallback((id: string) => {
    if (!id) {
      setPhase("playing");
      return;
    }
    if (id === "healthRefill") {
      // Immediate refill — signal canvas via trigger, do NOT track in chosenPowerUps
      setHealthRefillTrigger((t) => t + 1);
      setPhase("playing");
      return;
    }
    setChosenPowerUps((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      // Tier conversion: first pick of a super tier converts 3 of previous tier
      if (id === "superProjectile" && (prev.superProjectile ?? 0) === 0) {
        next.projectile = Math.max(0, (prev.projectile ?? 0) - 3);
      }
      if (id === "superProjectile2" && (prev.superProjectile2 ?? 0) === 0) {
        next.superProjectile = Math.max(0, (prev.superProjectile ?? 0) - 3);
      }
      if (id === "superProjectile3" && (prev.superProjectile3 ?? 0) === 0) {
        next.superProjectile2 = Math.max(0, (prev.superProjectile2 ?? 0) - 3);
      }
      return next;
    });
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

  /** Stable callback for health-detail updates — must NOT be an inline arrow function
   *  or it will re-create resetGame every render, causing an infinite update loop. */
  const handleHealthDetailChange = useCallback(
    (current: number, max: number, slicesPerHeart: number) => {
      setHealthDetail({ current, max, slicesPerHeart });
    },
    [],
  );

  const handleRunStatsChange = useCallback((damage: number) => {
    setRunStats({
      totalDamage: damage,
      powerUpCount: Object.keys(chosenPowerUps).length,
      damageMultiplier: playerStats.damageMultiplier,
      fireRate: playerStats.reloadTime > 0 ? 1 / playerStats.reloadTime : 0,
      projectileCount: playerStats.projectileCount,
    });
  }, [chosenPowerUps, playerStats]);

  const handleToggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    setMusicMuted(next);
  }, [muted, setAudioMuted, setMusicMuted]);

  const handleMusicVolume = useCallback((vol: number) => {
    setMusicVolumeState(vol);
    setMusicVolume(vol);
    try { localStorage.setItem("abch-music-vol", String(vol)); } catch {}
  }, [setMusicVolume]);

  const handleSfxVolume = useCallback((vol: number) => {
    setSfxVolumeState(vol);
    setSfxVolume(vol);
    try { localStorage.setItem("abch-sfx-vol", String(vol)); } catch {}
  }, [setSfxVolume]);

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
        onRunStatsChange={handleRunStatsChange}
        onHealthDetailChange={handleHealthDetailChange}
        score={score}
        lives={lives}
        wave={wave}
        playerStats={playerStats}
        healthRefillTrigger={healthRefillTrigger}
      />

      {/* HUD overlays the canvas */}
      {phase !== "menu" && (
        <GameHUD
          score={score}
          lives={lives}
          wave={wave}
          muted={muted}
          activePowerUps={activePowerUps}
          currentSlices={healthDetail.current}
          maxSlices={healthDetail.max}
          slicesPerHeart={healthDetail.slicesPerHeart}
          maxHearts={playerStats.maxHearts}
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
        musicVolume={musicVolume}
        sfxVolume={sfxVolume}
        onMusicVolume={handleMusicVolume}
        onSfxVolume={handleSfxVolume}
        onStart={handleStart}
        onResume={() => setPhase("playing")}
        onRestart={handleRestart}
        onClose={onClose}
        runStats={runStats}
      />

      {/* Roguelike power-up selection — after boss kill, wave clear, or choice pickup */}
      {(phase === "bossreward" || phase === "wavereward") && (
        <PowerUpSelection
          choices={currentChoices}
          chosen={chosenPowerUps}
          onSelect={handlePowerUpSelect}
          title={phase === "wavereward" ? "WAVE COMPLETE!" : "BOSS DEFEATED!"}
        />
      )}

      {/* Mobile controls */}
      {phase === "playing" && <MobileControls />}
    </div>
  );
}
