"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { GameCanvas, GamePhase } from "./game-canvas";
import { GameHUD } from "./game-hud";
import { GameOverlay, type RunStats } from "./game-overlay";
import { MobileControls } from "./mobile-controls";
import { PowerUpSelection } from "./power-up-selection";
import { sharedKeys, sharedAim } from "./use-keyboard-controls";
import { useAudioSfx, setSoundVolumes, unlockAudio } from "./use-audio-sfx";
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

/** Saved run state — persisted to localStorage so players can resume later */
interface SavedRunState {
  chosenPowerUps: PermPowerUpState;
  score: number;
  lives: number;
  wave: number;
  healthDetail: { current: number; max: number; slicesPerHeart: number };
  savedAt: number; // timestamp
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
  const [hasSave, setHasSave] = useState(false);
  const [activePowerUps, setActivePowerUps] = useState<{ type: "rapid" | "shield" | "wideshot" | "extralife" | "invincible" | "projectile" | "timewarp" | "doubleshot" | "ricochet" | "overcharge" | "groupie"; timer: number; stacks: number }[]>([]);
  const [songUnlockNeedsTap, setSongUnlockNeedsTap] = useState(false);

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

  // Refresh high score when game ends + wipe save state on death
  useEffect(() => {
    if (phase === "gameover") {
      try {
        const hs = localStorage.getItem("abch-guitar-invaders-highscore");
        if (hs) setHighScore(parseInt(hs, 10));
      } catch {}
      // Wipe saved run — death means start over
      try { localStorage.removeItem("abch-guitar-invaders-save"); } catch {}
      // Also refresh leaderboard
      getLeaderboard(5)
        .then((data) => setLeaderboard(data))
        .catch(() => {});
    }
  }, [phase]);

  // ── Save / Load run state ───────────────────────────────────────────
  const SAVE_KEY = "abch-guitar-invaders-save";

  /** Persist current run state to localStorage */
  const saveRunState = useCallback(() => {
    if (phase !== "playing" && phase !== "wavereward" && phase !== "bossreward") return;
    const state: SavedRunState = {
      chosenPowerUps,
      score,
      lives,
      wave,
      healthDetail,
      savedAt: Date.now(),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
  }, [chosenPowerUps, score, lives, wave, healthDetail, phase]);

  /** Load saved run state from localStorage, returns true if a valid save was found */
  const loadRunState = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const state = JSON.parse(raw) as SavedRunState;
      if (!state || typeof state.wave !== "number") return false;
      // Optional: reject saves older than 7 days
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - state.savedAt > ONE_WEEK) {
        localStorage.removeItem(SAVE_KEY);
        return false;
      }
      setChosenPowerUps(state.chosenPowerUps ?? {});
      setScore(state.score ?? 0);
      setLives(state.lives ?? startingHearts);
      setWave(state.wave ?? 1);
      setHealthDetail(state.healthDetail ?? { current: startingHearts, max: startingHearts, slicesPerHeart: 1 });
      return true;
    } catch {
      return false;
    }
  }, [startingHearts]);

  // Auto-save whenever key run state changes
  useEffect(() => {
    saveRunState();
  }, [chosenPowerUps, score, lives, wave, healthDetail, saveRunState]);

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
    // Wipe any existing save — this is a fresh run
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setHasSave(false);
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
    // Wipe save on restart too
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setHasSave(false);
    setPhase("playing");
  }, [resetRoguelikeState, startingHearts]);

  // Check for existing save on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      setHasSave(!!raw);
    } catch {
      setHasSave(false);
    }
  }, []);

  /** Resume a saved run */
  const handleResume = useCallback(() => {
    const loaded = loadRunState();
    if (loaded) {
      sharedKeys.shoot = false;
      sharedAim.firing = false;
      sharedAim.aiming = false;
      setActivePowerUps([]);
      setResetKey((k) => k + 1);
      setPhase("playing");
    }
  }, [loadRunState]);

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
      // Tier conversion: first pick of a super tier converts all of previous tier
      if (id === "superProjectile" && (prev.superProjectile ?? 0) === 0) {
        next.projectile = Math.max(0, (prev.projectile ?? 0) - 2);
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

  // ── Wave 100 song unlock ────────────────────────────────────────────
  // Use Web Audio API instead of <audio> element for reliable mobile playback
  const songSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const songBufferRef = useRef<AudioBuffer | null>(null);
  const songCtxRef = useRef<AudioContext | null>(null);
  const songGainRef = useRef<GainNode | null>(null);
  const songEndedRef = useRef(false);
  const wasMutedRef = useRef(muted);
  const [songFinished, setSongFinished] = useState(false);

  // Keep wasMutedRef in sync so callbacks always use the correct value
  useEffect(() => {
    wasMutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (phase !== "songunlock") {
      // Stop and clean up Web Audio
      if (songSourceRef.current) {
        try { songSourceRef.current.stop(); } catch {}
        songSourceRef.current = null;
      }
      if (songGainRef.current) {
        try { songGainRef.current.disconnect(); } catch {}
        songGainRef.current = null;
      }
      songEndedRef.current = false;
      setSongUnlockNeedsTap(false);
      setSongFinished(false);
      return;
    }

    // Prevent duplicate setup
    if (songSourceRef.current || songBufferRef.current) return;
    songEndedRef.current = false;

    const wasMuted = wasMutedRef.current;

    // Mute all game audio so only the song plays
    setMuted(true);
    setAudioMuted(true);
    setMusicMuted(true);

    let cancelled = false;

    const startPlayback = async () => {
      try {
        // Ensure AudioContext is unlocked (required on mobile)
        unlockAudio();

        // Fetch and decode the audio file once
        const res = await fetch("/api/audio/reward");
        const arrayBuf = await res.arrayBuffer();

        // Use shared context if available, otherwise create one
        const ctx = songCtxRef.current ?? new AudioContext();
        songCtxRef.current = ctx;

        const buffer = await ctx.decodeAudioData(arrayBuf);
        if (cancelled) return;
        songBufferRef.current = buffer;

        // Create gain node for volume control
        const gain = ctx.createGain();
        gain.gain.value = 1;
        gain.connect(ctx.destination);
        songGainRef.current = gain;

        // Start playback
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        source.onended = () => {
          if (cancelled || songEndedRef.current) return;
          songEndedRef.current = true;
          setSongFinished(true);
          setMuted(wasMuted);
          setAudioMuted(wasMuted);
          setMusicMuted(wasMuted);
        };
        songSourceRef.current = source;
        source.start(0);
        setSongUnlockNeedsTap(false);
      } catch {
        // Decoding or playback failed — show tap to retry
        if (!cancelled) {
          setSongUnlockNeedsTap(true);
        }
      }
    };

    startPlayback();

    return () => {
      cancelled = true;
      if (songSourceRef.current) {
        try { songSourceRef.current.stop(); } catch {}
        songSourceRef.current = null;
      }
      // Only fully discard buffer when leaving the phase
      if (phase !== "songunlock") {
        songBufferRef.current = null;
        if (songGainRef.current) {
          try { songGainRef.current.disconnect(); } catch {}
          songGainRef.current = null;
        }
      }
    };
  }, [phase, setAudioMuted, setMusicMuted]);

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
        onResume={handleResume}
        onRestart={handleRestart}
        onClose={onClose}
        runStats={runStats}
        hasSave={hasSave}
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

      {/* Song unlock overlay — wave 100 reward */}
      {phase === "songunlock" && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-700"
          onClick={() => {
            // Web Audio API playback — restart if needed
            if (songUnlockNeedsTap && songBufferRef.current && songCtxRef.current && !songEndedRef.current) {
              try {
                const source = songCtxRef.current.createBufferSource();
                source.buffer = songBufferRef.current;
                const gain = songCtxRef.current.createGain();
                gain.gain.value = 1;
                gain.connect(songCtxRef.current.destination);
                source.connect(gain);
                source.onended = () => {
                  if (songEndedRef.current) return;
                  songEndedRef.current = true;
                  setSongFinished(true);
                  setMuted(wasMutedRef.current);
                  setAudioMuted(wasMutedRef.current);
                  setMusicMuted(wasMutedRef.current);
                };
                songSourceRef.current = source;
                source.start(0);
                setSongUnlockNeedsTap(false);
              } catch {}
            }
          }}
        >
          <div className="flex flex-col items-center gap-5 text-center px-6 max-w-lg">
            <div className="text-4xl md:text-5xl font-black tracking-widest uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              Congratulations!
            </div>
            <div className="text-xl md:text-2xl font-bold text-[#ff006e]">
              You made it!
            </div>
            <div className="text-white/90 text-lg md:text-xl leading-relaxed">
              Here&apos;s a new song - Can&apos;t Let Her Go
            </div>
            {songUnlockNeedsTap && !songFinished && (
              <div
                className="mt-2 px-6 py-3 bg-[#ff006e]/20 border border-[#ff006e]/40 rounded-sm text-[#ff006e] font-bold text-sm uppercase tracking-widest animate-pulse cursor-pointer"
                onClick={() => {
                  if (songBufferRef.current && songCtxRef.current && !songEndedRef.current) {
                    try {
                      const source = songCtxRef.current.createBufferSource();
                      source.buffer = songBufferRef.current;
                      const gain = songCtxRef.current.createGain();
                      gain.gain.value = 1;
                      gain.connect(songCtxRef.current.destination);
                      source.connect(gain);
                      source.onended = () => {
                        if (songEndedRef.current) return;
                        songEndedRef.current = true;
                        setSongFinished(true);
                        setMuted(wasMutedRef.current);
                        setAudioMuted(wasMutedRef.current);
                        setMusicMuted(wasMutedRef.current);
                      };
                      songSourceRef.current = source;
                      source.start(0);
                      setSongUnlockNeedsTap(false);
                    } catch {}
                  }
                }}
              >
                Tap to play
              </div>
            )}
            {!songUnlockNeedsTap && !songFinished && (
              <div className="flex gap-2 mt-6">
                <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            )}
            {songFinished && (
              <button
                onClick={() => setPhase("wavereward")}
                className="mt-4 px-10 py-4 bg-[#ff006e] hover:bg-[#e6005f] text-white font-bold text-lg rounded-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,0,110,0.4)] hover:shadow-[0_0_30px_rgba(255,0,110,0.6)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile controls */}
      {phase === "playing" && <MobileControls />}
    </div>
  );
}
