"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useGameLoop } from "./use-game-loop";
import { useKeyboardControls, sharedKeys, sharedTouch, sharedAim } from "./use-keyboard-controls";
import { useAudioSfx } from "./use-audio-sfx";
import { useSiteData } from "@/components/data-provider";
import {
  drawPlayer,
  drawEnemy,
  drawPlayerBullet,
  drawEnemyBullet,
  loadUnderwearSprite,
  drawParticle,
  drawPowerUp,
  drawBoss,
  drawBossProjectile,
  draw8BitHealthBar,
} from "./draw-sprites";
import {
  loadBossSkin,
  drawBossSprite,
  isBossAnimComplete,
  type BossAnimState,
} from "./boss-sprites";
import type { PlayerStats } from "./player-stats";
import { ROGUELIKE_CONFIG } from "./power-up-config";
import {
  loadEnemySprites,
  drawEnemySprite,
  isAnimComplete,
  animDuration,
  type EnemyAnimState,
} from "./enemy-sprites";
import {
  loadEffectSprites,
  spawnEffect,
  tickEffects,
  drawEffects,
  type ActiveEffect,
} from "./effect-sprites";

export type GamePhase = "menu" | "playing" | "paused" | "gameover" | "levelcomplete" | "bossreward" | "wavereward" | "songunlock";

/* ── Base resolution (reference coordinate system) ── */
const BASE_H = 320;
const BASE_W = 240;

/* ── Game constants (in base units) ── */
const BULLET_SPEED_BASE = 180;
// Enemy width/height now read from platform settings (configurable in editor)
const PLAYER_W_BASE = 10;
const PLAYER_H_BASE = 20;

/* ── Power-up constants ── */
const POWERUP_DRIFT_SPEED = 20;

type PowerUpType = "rapid" | "shield" | "wideshot" | "extralife" | "invincible" | "choice" | "projectile";

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
}

interface ActivePowerUp {
  type: Exclude<PowerUpType, "choice">;
  timer: number;
  stacks: number;
}

interface GameCanvasProps {
  phase: GamePhase;
  resetKey: number;
  onPhaseChange: (p: GamePhase) => void;
  onScoreChange: (s: number) => void;
  onLivesChange: (l: number) => void;
  onWaveChange: (w: number) => void;
  onPowerUpChange?: (p: ActivePowerUp[]) => void;
  /** Called when the run ends — delivers run summary stats (total damage dealt). */
  onRunStatsChange?: (damage: number) => void;
  /** Called whenever health (slices) changes — drives the sliced-heart HUD */
  onHealthDetailChange?: (currentSlices: number, maxSlices: number, slicesPerHeart: number) => void;
  score: number;
  lives: number;
  wave: number;
  /** All computed permanent player stats for this run */
  playerStats: PlayerStats;
  /** Increments when HealthRefill is chosen — canvas refills HP immediately */
  healthRefillTrigger?: number;
}

export function GameCanvas({
  phase,
  resetKey,
  onPhaseChange,
  onScoreChange,
  onLivesChange,
  onWaveChange,
  onPowerUpChange,
  onRunStatsChange,
  onHealthDetailChange,
  score,
  lives,
  wave,
  playerStats,
  healthRefillTrigger = 0,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimsRef = useRef({ w: BASE_W, h: BASE_H, scale: 1 });
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  const shieldImageRef = useRef<HTMLImageElement | null>(null);
  const orbsImageRef = useRef<HTMLImageElement | null>(null);
  const [stageBgImage, setStageBgImage] = useState<HTMLImageElement | null>(null);
  useKeyboardControls();
  const { play, playFile, setMuted, isMuted } = useAudioSfx();
  const siteData = useSiteData();
  // Keep a stable ref so that imperative callbacks (initWave, update) always read
  // the latest siteData without needing siteData in their dependency arrays.
  const siteDataRef = useRef(siteData);
  useEffect(() => { siteDataRef.current = siteData; });
  const spriteConfig = siteData.secretGame?.playerSprite ?? { offsetX: -2, offsetY: -12, width: 14, height: 42 };

  // Load platform-specific game settings — resolved once at mount to pick mobile vs desktop
  const isMobileAtMount = typeof window !== "undefined" && (window.innerWidth < 768 || "ontouchstart" in window);
  const platformSettings = siteData.secretGame?.[isMobileAtMount ? "mobile" : "desktop"];
  const settingsRef = useRef(platformSettings ?? {
    player: { x: 115, y: 265 },
    enemy: { speed: 18, fireRate: 0.003, projectileSpeed: 60, projectileSize: 10, columns: 5, rows: 3, startY: 30, paddingX: 6, paddingY: 8, dropDistance: 6 },
  });
  // Keep settingsRef up to date so that editor parameter changes propagate to the game loop
  // without needing to remount the component.
  useEffect(() => {
    const fresh = siteData.secretGame?.[isMobileAtMount ? "mobile" : "desktop"];
    if (fresh) settingsRef.current = fresh;
  });

  // Keep playerStats in a ref so the render function (which is not a useCallback) can
  // access the latest values without stale closures.
  const playerStatsRef = useRef(playerStats);
  useEffect(() => { playerStatsRef.current = playerStats; });

  // Load custom guitar sprite + shield spritesheet + orbital orbs spritesheet
  useEffect(() => {
    const img = new Image();
    img.src = "/images/guitar.png";
    img.onload = () => {
      playerImageRef.current = img;
    };
    const shieldImg = new Image();
    shieldImg.src = "/shield/shield.png";
    shieldImg.onload = () => {
      shieldImageRef.current = shieldImg;
    };
    const orbsImg = new Image();
    orbsImg.src = "/projectiles/spritesheets/orbs.png";
    orbsImg.onload = () => {
      orbsImageRef.current = orbsImg;
    };
    const stageImg = new Image();
    stageImg.src = "/background/stage.png";
    stageImg.onload = () => {
      setStageBgImage(stageImg);
    };
    // Start loading all enemy sprite sheets and effect GIFs in the background
    loadEnemySprites();
    loadEffectSprites();
    loadUnderwearSprite();
  }, []);

  // Compute x-scale factor to map stored positions (0-240) to actual logical width
  const getXScale = useCallback(() => {
    const { w, h } = dimsRef.current;
    const sc = h / BASE_H;
    const logW = w / sc;
    return logW / BASE_W;
  }, []);

  // Mutable game state
  const stateRef = useRef({
    playerX: BASE_W / 2,
    playerY: BASE_H - 55,
    playerCooldown: 0,
    enemies: [] as {
      x: number;
      y: number;
      variant: 0 | 1 | 2;
      alive: boolean;
      cooldown: number;
      projectileIndex: number; // 0–15: which cell of the 4×4 sprite sheet this enemy fires
      virusStacks: number;
      virusTimer: number;
      virusAccum: number;
      // HP system (hp > 1 = takes multiple hits)
      hp: number;
      maxHp: number;
      // Sprite animation
      animState: EnemyAnimState;
      animAccum: number;    // seconds elapsed in current anim
      dying: boolean;       // true while death anim plays (alive=false)
      orbitalHitCooldown: number; // prevents orbital from dealing damage every frame
    }[],
    bullets: [] as {
      x: number; y: number; vx: number; vy: number;
      isPlayer: boolean; isSeeker?: boolean;
      variant?: 0 | 1 | 2; isBoss?: boolean;
      projectileIndex?: number; // 0–15: which projectile sprite this bullet uses
      connectDamaged?: boolean;
      isSuperBullet?: boolean;    // true for super bullet projectiles
      superBulletTier?: number;   // 0=normal, 1=red, 2=purple, 3=gold
      superBulletDamage?: number; // damage override (for seeker missiles)
      // Seeker missile: reference to the specific enemy this missile is tracking
      seekerTarget?: { x: number; y: number; alive: boolean; dying: boolean } | null;
    }[],
    particles: [] as {
      x: number; y: number; vx: number; vy: number;
      life: number; maxLife: number; color: string; size: number;
    }[],
    powerups: [] as PowerUp[],
    activePowerUps: [] as ActivePowerUp[],
    enemyDir: 1,
    enemySpeed: 18,
    enemyDropAccum: 0,
    enemyFireChance: 0.003,
    screenShake: 0,
    frame: 0,
    score: 0,
    lives: ROGUELIKE_CONFIG.startingHearts,
    wave: 1,
    spawnAnim: 0,
    playAreaW: BASE_W,
    boss: null as {
      x: number; y: number; health: number; maxHealth: number;
      fireCooldown: number; hitFlash: number; dir: number; bossNumber: number;
      virusStacks: number; virusTimer: number; virusAccum: number;
      orbitalHitCooldown: number; // rate-limits orbital damage per frame
      // Sprite animation
      skinIndex: number;        // 1-18, randomly chosen at wave start
      animState: BossAnimState; // current animation ("walking" | "throwing" | "hurt" | "dying")
      animAccum: number;        // seconds elapsed in current animation
    } | null,
    // ── Roguelike: health slicing ─────────────────────────────────────
    currentSlices: ROGUELIKE_CONFIG.startingHearts,
    maxSlices: ROGUELIKE_CONFIG.startingHearts,
    slicesPerHeart: 1,
    maxHearts: ROGUELIKE_CONFIG.startingHearts,
    // ── Roguelike: timed effect accumulators ──────────────────────────
    bombAccum: 0,
    lightningAccum: 0,
    frenzyAccum: 0,
    nukeAccum: 0,
    permShieldAccum: 0,
    permShieldActive: false,
    permShieldTimer: 0,
    // ── Roguelike: connect beam visuals ──────────────────────────────
    lightningBeams: [] as { x1: number; y1: number; x2: number; y2: number; timer: number }[],
    // ── GIF impact effects ────────────────────────────────────────────
    activeEffects: [] as ActiveEffect[],
    // ── Shield animation ──────────────────────────────────────────────
    shieldDuration: 4, // stores the initial duration of the last temp-shield activation
    // ── Damage numbers (floating text) ──────────────────────────────
    damageNumbers: [] as { x: number; y: number; value: string; timer: number; maxTimer: number; color: string }[],
    // ── Player hit invincibility (after enemy body collision) ────────
    playerBodyHitTimer: 0, // countdown in seconds
    // ── Orbital orbs ─────────────────────────────────────────────────
    orbitalAccum: 0,       // cooldown accumulator
    orbitalActive: false,  // true while orbs are active
    orbitalTimer: 0,       // time remaining in active phase
    orbitalBaseAngle: 0,   // rotating base angle (radians)
    // ── Seeker Missile ────────────────────────────────────────────────
    seekerMissileAccum: 0, // cooldown accumulator
    // ── Run stats ────────────────────────────────────────────────────
    totalDamageDealt: 0,   // accumulated player damage this run
  });

  // Resize canvas to fill viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const vw = window.visualViewport;
      const w = vw ? Math.round(vw.width) : window.innerWidth;
      const h = vw ? Math.round(vw.height) : window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      const sc = h / BASE_H;
      dimsRef.current = { w, h, scale: sc };

      // Keep player in bounds after resize
      const s = stateRef.current;
      const logW = w / sc;
      const xScale = logW / BASE_W;
      s.playAreaW = logW;
      s.playerX = Math.min(s.playerX, logW - PLAYER_W_BASE);
      s.playerY = Math.max(0, Math.min(BASE_H - PLAYER_H_BASE, s.playerY));
    };

    resize();
    window.addEventListener("resize", resize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", resize);
    }
    return () => {
      window.removeEventListener("resize", resize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", resize);
      }
    };
  }, []);

  const getScaled = () => dimsRef.current.scale;

  const initWave = useCallback((w: number) => {
    const siteData = siteDataRef.current; // always fresh — avoids stale-closure issues
    const s = stateRef.current;
    s.enemies = [];
    s.bullets = []; // clear all projectiles on new wave
    s.boss = null;
    const edgeMargin = 4;
    const { w: CW, h: CH } = dimsRef.current;
    const sc = CH / BASE_H;
    const logW = CW / sc;
    const cfg = settingsRef.current.enemy;
    const bossCfg = siteData.secretGame?.boss;

    // Check if this is a boss wave
    const isBossWave = bossCfg?.enabled && w > 0 && w % (bossCfg?.interval ?? 10) === 0;

    if (isBossWave) {
      const bossNumber = Math.floor(w / (bossCfg?.interval ?? 10));
      // Use per-boss HP override from admin if available, otherwise fall back to formula
      const perGroupHp = siteData.secretGame?.bossHealthPerWaveGroup;
      const bossHealth = (perGroupHp && perGroupHp[bossNumber - 1] != null)
        ? perGroupHp[bossNumber - 1]
        : (bossCfg?.baseHealth ?? 500) + (bossNumber - 1) * (bossCfg?.healthIncrease ?? 500);
      const bossPos = settingsRef.current.boss;
      const bx = (bossPos?.x ?? 100) * (logW / BASE_W);
      // Pick a random boss skin that has real PNG assets.
      // Indices 10, 11, 12 have empty folders → always fall back to the old
      // procedural sprite, so we exclude them here.
      const VALID_BOSS_SKINS = [1,2,3,4,5,6,7,8,9,13,14,15,16,17,18];
      const skinIndex = VALID_BOSS_SKINS[Math.floor(Math.random() * VALID_BOSS_SKINS.length)];
      loadBossSkin(skinIndex);
      s.boss = {
        x: bx,
        y: bossPos?.y ?? 20,
        health: bossHealth,
        maxHealth: bossHealth,
        fireCooldown: 1,
        hitFlash: 0,
        dir: 1,
        bossNumber,
        virusStacks: 0,
        virusTimer: 0,
        virusAccum: 0,
        skinIndex,
        animState: "walking",
        animAccum: 0,
        orbitalHitCooldown: 0, // prevents orbital from dealing damage every frame
      };
    } else {
      const maxW = logW - edgeMargin * 2;
      const colUnit = cfg.width + cfg.paddingX;
      const rowUnit = cfg.height + cfg.paddingY;
      const maxCols = Math.max(1, Math.floor((maxW + cfg.paddingX) / colUnit));
      // Grow columns slowly: +1 col every 5 waves (smooth scaling, avoids 70-enemy grids early)
      const cols = Math.min(maxCols, cfg.columns + Math.floor((w - 1) / 5));
      // Cap rows so enemies never drop below 55% of screen height (above player area)
      const maxRows = Math.floor((BASE_H * 0.55 - cfg.startY) / rowUnit) + 1;
      // Grow rows slowly: +1 row every 8 waves
      const rows = Math.min(maxRows, cfg.rows + Math.floor((w - 1) / 8));
      const totalW = cols * colUnit - cfg.paddingX;
      const startX = Math.max(edgeMargin, (logW - totalW) / 2) + (cfg.offsetX ?? 0);
      const startY = Math.max(3, cfg.startY); // ensure enemy hair is visible

      // Calculate enemy HP for this wave
      const baseHp = siteData.secretGame?.enemyBaseHp ?? 1;
      const hpPerWave = siteData.secretGame?.enemyHpPerWave ?? 0;
      const waveHp = Math.max(1, Math.round(baseHp + (w - 1) * hpPerWave));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          s.enemies.push({
            x: startX + c * (cfg.width + cfg.paddingX),
            y: startY + r * (cfg.height + cfg.paddingY),
            variant: ((r + c) % 3) as 0 | 1 | 2,
            alive: true,
            cooldown: Math.random() * 2,
            // Each enemy fires a random projectile from the 4×4 sprite sheet (0–15)
            projectileIndex: Math.floor(Math.random() * 16),
            virusStacks: 0,
            virusTimer: 0,
            virusAccum: 0,
            hp: waveHp,
            maxHp: waveHp,
            animState: "walking",
            animAccum: Math.random() * 2.5, // stagger start frame so grid doesn't look uniform
            dying: false,
            orbitalHitCooldown: 0, // prevents orbital from dealing damage every frame
          });
        }
      }
    }

    // Scale difficulty with wave (capped for infinite playability)
    s.enemySpeed = Math.min(cfg.speed + (w - 1) * 1.2, 90);
    s.enemyFireChance = Math.min(cfg.fireRate * (1 + (w - 1) * 0.025), 0.012);
    s.wave = w;
    s.spawnAnim = 0;
    s.playAreaW = logW;
    // Reset the nuke timer so it fires at the predictable 30s mark into the new wave,
    // not immediately because the previous wave happened to leave the accumulator near 30s.
    s.nukeAccum = 0;
    // Reset player to starting position at wave start so player isn't surrounded
    const xScale = logW / BASE_W;
    s.playerX = settingsRef.current.player.x * xScale;
    s.playerY = settingsRef.current.player.y;
    // Clear any lingering post-hit invincibility
    s.playerBodyHitTimer = 0;
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    const cfg = settingsRef.current;
    const { w: CW, h: CH } = dimsRef.current;
    const sc = CH / BASE_H;
    const logW = CW / sc;
    const xScale = logW / BASE_W;
    const startH = ROGUELIKE_CONFIG.startingHearts;
    s.playerX = cfg.player.x * xScale;
    s.playerY = cfg.player.y;
    s.playerCooldown = 0;
    s.bullets = [];
    s.particles = [];
    s.powerups = [];
    s.activePowerUps = [];
    s.boss = null;
    s.enemyDir = 1;
    s.enemyDropAccum = 0;
    s.screenShake = 0;
    s.frame = 0;
    s.score = 0;
    s.totalDamageDealt = 0;
    // Reset health slicing to starting defaults
    s.maxHearts = startH;
    s.slicesPerHeart = 1;
    s.maxSlices = startH;
    s.currentSlices = startH;
    s.lives = startH;
    s.wave = 1;
    // Reset timed-effect accumulators
    s.bombAccum = 0;
    s.lightningAccum = 0;
    s.frenzyAccum = 0;
    s.nukeAccum = 0;
    s.permShieldAccum = 0;
    s.permShieldActive = false;
    s.permShieldTimer = 0;
    s.lightningBeams = [];
    s.activeEffects = [];
    s.damageNumbers = [];
    s.playerBodyHitTimer = 0;
    s.orbitalAccum = 0;
    s.orbitalActive = false;
    s.orbitalTimer = 0;
    s.orbitalBaseAngle = 0;
    s.seekerMissileAccum = 0;
    onScoreChange(0);
    onLivesChange(startH);
    onWaveChange(1);
    if (onPowerUpChange) onPowerUpChange([]);
    if (onHealthDetailChange) onHealthDetailChange(startH, startH, 1);
    s.playAreaW = logW;
    initWave(1);
  }, [initWave, onScoreChange, onLivesChange, onWaveChange, onPowerUpChange, onHealthDetailChange]);

  const spawnParticles = useCallback(
    (x: number, y: number, color: string, count: number) => {
      const s = stateRef.current;
      const MAX_PARTICLES = 200;
      const available = MAX_PARTICLES - s.particles.length;
      if (available <= 0) return;
      const actual = Math.min(count, available);
      for (let i = 0; i < actual; i++) {
        s.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          life: 0.3 + Math.random() * 0.4,
          maxLife: 0.7,
          color,
          size: 1 + Math.random() * 2,
        });
      }
    },
    []
  );

  // Sync external score/lives/wave
  useEffect(() => { stateRef.current.score = score; }, [score]);
  useEffect(() => { stateRef.current.lives = lives; }, [lives]);
  useEffect(() => { stateRef.current.wave = wave; }, [wave]);

  // Sync playerStats → update health slicing whenever chosen power-ups change
  useEffect(() => {
    const s = stateRef.current;
    const ps = playerStats;
    const oldMaxSlices = s.maxSlices;
    s.maxHearts = ps.maxHearts;
    s.slicesPerHeart = ps.slicesPerHeart;
    s.maxSlices = ps.maxHearts * ps.slicesPerHeart;
    // Proportionally scale current health when max slices changes
    if (oldMaxSlices > 0 && s.maxSlices !== oldMaxSlices) {
      const ratio = s.currentSlices / oldMaxSlices;
      s.currentSlices = Math.max(1, Math.min(s.maxSlices, Math.round(ratio * s.maxSlices)));
      s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
    }
    if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerStats]);

  // HealthRefill trigger: immediately restore all slices
  useEffect(() => {
    if (healthRefillTrigger > 0) {
      const s = stateRef.current;
      s.currentSlices = s.maxSlices;
      s.lives = s.maxHearts;
      onLivesChange(s.lives);
      if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthRefillTrigger]);

  // Keep a stable ref to resetGame so phase/resetKey effects don't need it as a dep.
  // (Including resetGame in deps would re-run the effect whenever a parent callback
  //  reference changes, which causes an infinite "Maximum update depth exceeded" loop.)
  const resetGameRef = useRef(resetGame);
  useEffect(() => { resetGameRef.current = resetGame; });

  // Handle phase transitions
  useEffect(() => {
    if (phase === "playing" && stateRef.current.lives <= 0) {
      resetGameRef.current();
    }
    if (
      phase === "playing" &&
      stateRef.current.enemies.filter((e) => e.alive).length === 0 &&
      !stateRef.current.boss
    ) {
      const nextWave = stateRef.current.wave + 1;
      onWaveChange(nextWave);
      initWave(nextWave);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, initWave, onWaveChange]);

  // Imperative reset when parent signals a restart (e.g. Try Again)
  useEffect(() => {
    if (resetKey > 0) {
      resetGameRef.current();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const update = useCallback(
    (dt: number) => {
      const siteData = siteDataRef.current; // always fresh — avoids stale-closure issues
      const s = stateRef.current;
      const keys = sharedKeys;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w: CW, h: CH, scale: sc } = dimsRef.current;
      const logW = CW / sc;
      const playAreaW = logW;
      const enemyCfg = settingsRef.current.enemy;
      const ew = enemyCfg.width;
      const eh = enemyCfg.height;

      // ── Input handling (one-shot keys) ──
      if (keys.pause) {
        keys.pause = false;
        if (phase === "playing") {
          onPhaseChange("paused");
          return;
        }
      }
      if (keys.mute) {
        keys.mute = false;
        setMuted(!isMuted());
      }

      if (phase !== "playing") {
        render(ctx, s, CW, CH, sc);
        return;
      }

      s.frame++;
      s.spawnAnim = Math.min(1, s.spawnAnim + dt * 2);

      // ── Player movement (speed from playerStats) ──
      const pSpeed = playerStats.movementSpeed;
      if (sharedTouch.targetX !== null && sharedTouch.targetY !== null) {
        const targetX = Math.max(0, Math.min(playAreaW - PLAYER_W_BASE, sharedTouch.targetX * (logW / BASE_W)));
        const targetY = Math.max(0, Math.min(BASE_H - PLAYER_H_BASE, sharedTouch.targetY));
        s.playerX += (targetX - s.playerX) * Math.min(1, pSpeed * 2.5 * dt);
        s.playerY += (targetY - s.playerY) * Math.min(1, pSpeed * 2.5 * dt);
      } else {
        if (keys.left) s.playerX -= pSpeed * dt;
        if (keys.right) s.playerX += pSpeed * dt;
        if (keys.up) s.playerY -= pSpeed * dt;
        if (keys.down) s.playerY += pSpeed * dt;
      }
      s.playerX = Math.max(0, Math.min(playAreaW - PLAYER_W_BASE, s.playerX));
      s.playerY = Math.max(0, Math.min(BASE_H - PLAYER_H_BASE, s.playerY));

      // ── Permanent Shield (periodic) ─────────────────────────────────
      if (playerStats.hasPermShield) {
        if (s.permShieldActive) {
          s.permShieldTimer -= dt;
          if (s.permShieldTimer <= 0) {
            s.permShieldActive = false;
            s.permShieldAccum = 0;
          }
        } else {
          s.permShieldAccum += dt;
          if (s.permShieldAccum >= playerStats.permShieldCooldown) {
            s.permShieldAccum = 0;
            s.permShieldActive = true;
            s.permShieldTimer = playerStats.permShieldDuration;
            playFile("/audio/shield.mp3");
            spawnParticles(s.playerX + PLAYER_W_BASE / 2, s.playerY + PLAYER_H_BASE / 2, "#00f0ff", 8);
          }
        }
      }

      // ── Timed effect: Bomb ───────────────────────────────────────────
      if (playerStats.hasBomb) {
        s.bombAccum += dt;
        if (s.bombAccum >= playerStats.bombCooldown) {
          s.bombAccum -= playerStats.bombCooldown;
          playFile("/audio/bomb.mp3");
          const bCount = playerStats.bombCount;
          const bDmg = playerStats.bombDamage;
          const bRadius = playerStats.bombCrossRadius;
          const enemyCfgRef = settingsRef.current.enemy;
          // Collect alive enemies once so each bomb can pick a fresh target
          const bombTargets = s.enemies.filter((e) => e.alive);
          for (let b = 0; b < bCount; b++) {
            // Target a random alive enemy; fall back to a random position
            // if no enemies remain (e.g. boss-only wave).
            let bx: number, by: number;
            if (bombTargets.length > 0) {
              const target = bombTargets[Math.floor(Math.random() * bombTargets.length)];
              bx = target.x + enemyCfgRef.width / 2;
              by = target.y + enemyCfgRef.height / 2;
            } else if (s.boss) {
              // No regular enemies — target the boss directly
              const bossW = siteData.secretGame?.boss?.width ?? 40;
              const bossH = siteData.secretGame?.boss?.height ?? 30;
              bx = s.boss.x + bossW / 2;
              by = s.boss.y + bossH / 2;
            } else {
              bx = Math.random() * playAreaW;
              by = BASE_H * 0.4;
            }
            spawnEffect(s.activeEffects, "bomb", bx, by, siteData.secretGame?.impacts?.bomb ?? { w: 60, h: 60 });
            spawnParticles(bx, by, "#ff8800", 12);
            spawnParticles(bx, by, "#ffdd00", 6);
            // Damage enemies in cross pattern (target + above/below/left/right)
            for (const e of s.enemies) {
              if (!e.alive) continue;
              const ex = e.x + enemyCfgRef.width / 2;
              const ey = e.y + enemyCfgRef.height / 2;
              const onColX = Math.abs(ex - bx) <= bRadius;
              const onColY = Math.abs(ey - by) <= bRadius;
              const inCross = (onColX && Math.abs(ey - by) <= bRadius * 2) ||
                              (onColY && Math.abs(ex - bx) <= bRadius * 2);
              if (inCross) {
                e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
                s.score += 5 * s.wave;
                spawnParticles(ex, ey, "#ff8800", 5);
              }
            }
            // Damage boss
            if (s.boss) {
              s.boss.health -= bDmg;
              s.boss.hitFlash = 0.15;
              if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
              if (s.boss.health <= 0) {
                s.score += (siteData.secretGame?.boss?.scoreReward ?? 500);
                spawnEffect(s.activeEffects, "boss", s.boss.x + 20, s.boss.y + 15, siteData.secretGame?.impacts?.boss ?? { w: 80, h: 80 });
                spawnParticles(s.boss.x + 20, s.boss.y + 15, "#ff8800", 20);
                play("levelComplete");
                s.boss = null;
                onPhaseChange("bossreward");
                return;
              }
            }
          }
          onScoreChange(s.score);
        }
      }

      // ── Timed effect: Lightning + Connect ───────────────────────────
      if (playerStats.hasLightning) {
        s.lightningAccum += dt;
        if (s.lightningAccum >= playerStats.lightningCooldown) {
          s.lightningAccum -= playerStats.lightningCooldown;
          playFile("/audio/lightning.mp3");
          const strikePoints: { x: number; y: number }[] = [];
          const aliveForLightning = s.enemies.filter((e) => e.alive);
          for (let i = 0; i < playerStats.lightningStrikes; i++) {
            let lx: number, ly: number;
            if (aliveForLightning.length > 0) {
              const target = aliveForLightning[Math.floor(Math.random() * aliveForLightning.length)];
              const ecfg = settingsRef.current.enemy;
              lx = target.x + ecfg.width / 2;
              ly = target.y + ecfg.height / 2;
              target.alive = false; target.dying = true; target.animState = "dying"; target.animAccum = 0;
              s.score += 5 * s.wave;
              spawnEffect(s.activeEffects, "lightning", lx, ly, siteData.secretGame?.impacts?.lightning ?? { w: 40, h: 40 });
              spawnParticles(lx, ly, "#00f0ff", 8);
              spawnParticles(lx, ly, "#ffffff", 4);
            } else if (s.boss) {
              lx = s.boss.x + Math.random() * (siteData.secretGame?.boss?.width ?? 40);
              ly = s.boss.y + (siteData.secretGame?.boss?.height ?? 30) / 2;
              s.boss.health -= playerStats.lightningDamage;
              s.boss.hitFlash = 0.1;
              if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
              spawnEffect(s.activeEffects, "lightning", lx, ly, siteData.secretGame?.impacts?.lightning ?? { w: 40, h: 40 });
              spawnParticles(lx, ly, "#00f0ff", 6);
            } else {
              lx = Math.random() * playAreaW;
              ly = Math.random() * BASE_H * 0.6;
            }
            strikePoints.push({ x: lx, y: ly });
          }
          // Connect: draw beams between consecutive strike points and deal damage
          if (playerStats.hasConnect && strikePoints.length >= 2) {
            playFile("/audio/connect.mp3");
            for (let i = 0; i < strikePoints.length - 1; i++) {
              const p1 = strikePoints[i];
              const p2 = strikePoints[i + 1];
              s.lightningBeams.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, timer: 0.5 });
              // Damage enemies along the beam (point-to-segment distance check)
              for (const e of s.enemies) {
                if (!e.alive) continue;
                const ecfg = settingsRef.current.enemy;
                const ex = e.x + ecfg.width / 2;
                const ey = e.y + ecfg.height / 2;
                const dx = p2.x - p1.x; const dy = p2.y - p1.y;
                const lenSq = dx * dx + dy * dy;
                const t = lenSq > 0 ? Math.max(0, Math.min(1, ((ex - p1.x) * dx + (ey - p1.y) * dy) / lenSq)) : 0;
                const nearX = p1.x + t * dx; const nearY = p1.y + t * dy;
                if (Math.hypot(ex - nearX, ey - nearY) <= 12) {
                  e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
                  s.score += 5 * s.wave;
                  spawnEffect(s.activeEffects, "lightning", ex, ey, siteData.secretGame?.impacts?.lightning ?? { w: 40, h: 40 });
                  spawnParticles(ex, ey, "#00f0ff", 5);
                }
              }
              if (s.boss) {
                s.boss.health -= playerStats.connectDamage;
                s.boss.hitFlash = 0.1;
                if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
              }
            }
          }
          onScoreChange(s.score);
        }
        // Decay beams
        for (let i = s.lightningBeams.length - 1; i >= 0; i--) {
          s.lightningBeams[i].timer -= dt;
          if (s.lightningBeams[i].timer <= 0) s.lightningBeams.splice(i, 1);
        }
      }

      // ── Timed effect: Frenzy ─────────────────────────────────────────
      if (playerStats.hasFrenzy) {
        s.frenzyAccum += dt;
        if (s.frenzyAccum >= playerStats.frenzyCooldown) {
          s.frenzyAccum -= playerStats.frenzyCooldown;
          const count = playerStats.frenzyProjectiles;
          const px = s.playerX + (siteData.secretGame?.bulletSpawnOffsetX ?? PLAYER_W_BASE / 2);
          const py = s.playerY + (siteData.secretGame?.bulletSpawnOffsetY ?? PLAYER_H_BASE / 2);
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            s.bullets.push({
              x: px, y: py,
              vx: Math.cos(angle) * BULLET_SPEED_BASE,
              vy: Math.sin(angle) * BULLET_SPEED_BASE,
              isPlayer: true,
            });
          }
          play("shoot");
        }
      }

      // ── Timed effect: Nuke ───────────────────────────────────────────
      if (playerStats.hasNuke) {
        s.nukeAccum += dt;
        if (s.nukeAccum >= playerStats.nukeCooldown) {
          s.nukeAccum -= playerStats.nukeCooldown;
          // Center nuke on the average position of all alive enemies (or screen centre if none)
          const aliveForNuke = s.enemies.filter((e) => e.alive);
          const nukeCx = aliveForNuke.length > 0
            ? aliveForNuke.reduce((sum, e) => sum + e.x + settingsRef.current.enemy.width / 2, 0) / aliveForNuke.length
            : (s.boss ? s.boss.x + (siteData.secretGame?.boss?.width ?? 40) / 2 : playAreaW / 2);
          const nukeCy = aliveForNuke.length > 0
            ? aliveForNuke.reduce((sum, e) => sum + e.y + settingsRef.current.enemy.height / 2, 0) / aliveForNuke.length
            : (s.boss ? s.boss.y + (siteData.secretGame?.boss?.height ?? 30) / 2 : BASE_H / 3);
          spawnEffect(s.activeEffects, "nuke", nukeCx, nukeCy, siteData.secretGame?.impacts?.nuke ?? { w: 100, h: 100 });
          // Clear all regular enemies
          for (const e of s.enemies) {
            if (e.alive) {
              spawnParticles(e.x + settingsRef.current.enemy.width / 2, e.y, "#ffffff", 6);
              spawnParticles(e.x + settingsRef.current.enemy.width / 2, e.y, "#00f0ff", 3);
              e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
              s.score += 5 * s.wave;
            }
          }
          // Damage boss
          if (s.boss) {
            const totalReduction = playerStats.nukeActivationsPerCooldown * playerStats.nukeBossReduction;
            s.boss.health -= s.boss.maxHealth * totalReduction;
            s.boss.hitFlash = 0.2;
            if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
            spawnEffect(s.activeEffects, "nuke", s.boss.x + 20, s.boss.y + 15, siteData.secretGame?.impacts?.nuke ?? { w: 100, h: 100 });
            spawnParticles(s.boss.x + 20, s.boss.y + 15, "#ffffff", 20);
            spawnParticles(s.boss.x + 20, s.boss.y + 15, "#00f0ff", 12);
            if (s.boss.health <= 0) {
              s.score += (siteData.secretGame?.boss?.scoreReward ?? 500);
              spawnEffect(s.activeEffects, "boss", s.boss.x + 20, s.boss.y + 15, siteData.secretGame?.impacts?.boss ?? { w: 80, h: 80 });
              play("levelComplete");
              s.boss = null;
              onPhaseChange("bossreward");
              onScoreChange(s.score);
              return;
            }
          }
          onScoreChange(s.score);
          // Play a quick hit sound for nuke (NOT levelComplete — that only plays on wave/boss clear)
          play("enemyHit");
        }
      }

      // ── Virus: tick infected enemies/boss ───────────────────────────
      if (playerStats.hasVirus) {
        for (const e of s.enemies) {
          if (!e.alive || e.virusStacks <= 0) continue;
          e.virusTimer -= dt;
          e.virusAccum += dt;
          if (e.virusAccum >= playerStats.virusTickInterval) {
            e.virusAccum -= playerStats.virusTickInterval;
            e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
            s.score += 5 * s.wave;
            spawnEffect(s.activeEffects, "virus", e.x + settingsRef.current.enemy.width / 2, e.y + settingsRef.current.enemy.height / 2, siteData.secretGame?.impacts?.virus ?? { w: 30, h: 30 });
            spawnParticles(e.x + settingsRef.current.enemy.width / 2, e.y, "#39ff14", 5);
          }
          if (e.virusTimer <= 0) { e.virusStacks = 0; e.virusAccum = 0; }
        }
        // Propagate score updates from virus kills to React state
        onScoreChange(s.score);
        if (s.boss && s.boss.virusStacks > 0) {
          s.boss.virusAccum += dt;
          s.boss.virusTimer -= dt;
          if (s.boss.virusAccum >= playerStats.virusTickInterval) {
            s.boss.virusAccum -= playerStats.virusTickInterval;
            const tickDmg = playerStats.virusDamagePerTick * s.boss.virusStacks;
            s.boss.health -= tickDmg;
            s.boss.hitFlash = 0.05;
            if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
            spawnEffect(s.activeEffects, "virus", s.boss.x + 20, s.boss.y + 10, siteData.secretGame?.impacts?.virus ?? { w: 30, h: 30 });
            spawnParticles(s.boss.x + 20, s.boss.y + 10, "#39ff14", 4);
            if (s.boss.health <= 0) {
              s.score += (siteData.secretGame?.boss?.scoreReward ?? 500);
              onScoreChange(s.score);
              play("levelComplete");
              s.boss = null;
              onPhaseChange("bossreward");
              return;
            }
          }
          if (s.boss.virusTimer <= 0) { s.boss.virusStacks = 0; s.boss.virusAccum = 0; }
        }
      }

      // ── Active power-up timers ──
      if (s.activePowerUps.length > 0) {
        for (let i = s.activePowerUps.length - 1; i >= 0; i--) {
          const ap = s.activePowerUps[i];
          if (ap.type === "shield") continue; // shield has no timer
          ap.timer -= dt;
          if (ap.timer <= 0) {
            s.activePowerUps.splice(i, 1);
          }
        }
        if (onPowerUpChange) onPowerUpChange(s.activePowerUps);
      }

      // ── Seeker Missile auto-fire ─────────────────────────────────────
      if (playerStats.hasSeekerMissile) {
        s.seekerMissileAccum += dt;
        if (s.seekerMissileAccum >= playerStats.seekerMissileCooldown) {
          s.seekerMissileAccum -= playerStats.seekerMissileCooldown;
          const pcx = s.playerX + PLAYER_W_BASE / 2;
          const pcy = s.playerY + PLAYER_H_BASE / 2;
          // Build a shuffled list of alive enemies so each missile gets a unique target
          const aliveEnemies = s.enemies.filter(e => e.alive);
          // Fisher-Yates shuffle for random, unique assignment
          for (let i = aliveEnemies.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [aliveEnemies[i], aliveEnemies[j]] = [aliveEnemies[j], aliveEnemies[i]];
          }
          const missileSpeed = BULLET_SPEED_BASE * 1.3;
          for (let mi = 0; mi < playerStats.seekerMissileCount; mi++) {
            // Pick a unique enemy for each missile (wraps around if more missiles than enemies)
            const targetEnemy = aliveEnemies.length > 0
              ? aliveEnemies[mi % aliveEnemies.length]
              : null;
            let targetX: number | null = null, targetY: number | null = null;
            if (targetEnemy) {
              targetX = targetEnemy.x + ew / 2;
              targetY = targetEnemy.y + eh / 2;
            } else if (s.boss) {
              // No enemies — target the boss
              const bw2 = siteData.secretGame?.boss?.width ?? 40;
              const bh2 = siteData.secretGame?.boss?.height ?? 30;
              targetX = s.boss.x + bw2 / 2; targetY = s.boss.y + bh2 / 2;
            }
            let mvx = 0, mvy = -missileSpeed;
            if (targetX !== null && targetY !== null) {
              const tdx = targetX - pcx, tdy = targetY - pcy;
              const tdist = Math.hypot(tdx, tdy);
              if (tdist > 1) {
                const angle = Math.atan2(tdy, tdx);
                mvx = Math.cos(angle) * missileSpeed;
                mvy = Math.sin(angle) * missileSpeed;
              }
            }
            s.bullets.push({
              x: pcx, y: pcy, vx: mvx, vy: mvy,
              isPlayer: true,
              isSeeker: true,
              superBulletDamage: playerStats.seekerMissileDamage,
              seekerTarget: targetEnemy ?? null,
            });
          }
          playFile("/audio/seeker.mp3");
        }
      }

      // ── Orbital orbs: rotate + cooldown ─────────────────────────────
      if (playerStats.hasOrbital) {
        s.orbitalBaseAngle += playerStats.orbitalOrbitSpeed * dt;
        if (s.orbitalActive) {
          s.orbitalTimer -= dt;
          if (s.orbitalTimer <= 0) {
            s.orbitalActive = false;
            s.orbitalAccum = 0;
          }
          // Orbital collision vs enemies
          for (let oi = 0; oi < playerStats.orbitalOrbCount; oi++) {
            const angle = s.orbitalBaseAngle + (oi / playerStats.orbitalOrbCount) * Math.PI * 2;
            const pcx2 = s.playerX + PLAYER_W_BASE / 2;
            const pcy2 = s.playerY + PLAYER_H_BASE / 2;
            const ox = pcx2 + Math.cos(angle) * playerStats.orbitalRadius;
            const oy = pcy2 + Math.sin(angle) * playerStats.orbitalRadius;
            const oR = playerStats.orbitalHitboxSize;
            for (const e of s.enemies) {
              if (!e.alive) continue;
              // Circle vs AABB
              const nearEX = Math.max(e.x, Math.min(ox, e.x + ew));
              const nearEY = Math.max(e.y, Math.min(oy, e.y + eh));
              const dist2 = Math.hypot(ox - nearEX, oy - nearEY);
              if (dist2 <= oR && (e.orbitalHitCooldown ?? 0) <= 0) {
                const dmg = playerStats.orbitalDamage;
                e.hp = (e.hp ?? 1) - dmg;
                s.totalDamageDealt += dmg;
                e.animState = "hurt"; e.animAccum = 0;
                e.orbitalHitCooldown = 0.25; // rate-limit: only hit every 250ms per enemy
                spawnParticles(e.x + ew / 2, e.y + eh / 2, "#00f0ff", 3);
                const dnX = e.x + ew / 2 + (Math.random() - 0.5) * 10;
                const dnY = e.y;
                if (s.damageNumbers.length < 100) {
                  const orbColor = siteDataRef.current.secretGame?.damageNumbers?.orbitalColor ?? "#00f0ff";
                  s.damageNumbers.push({ x: dnX, y: dnY, value: String(dmg), timer: 1.2, maxTimer: 1.2, color: orbColor });
                }
                if (e.hp <= 0) {
                  e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
                  s.score += 10 * s.wave;
                  onScoreChange(s.score);
                  spawnParticles(e.x + ew / 2, e.y + eh / 2, "#ff006e", 6);
                }
              }
            }
            // Orbital vs boss
            if (s.boss) {
              const bw2 = siteData.secretGame?.boss?.width ?? 40;
              const bh2 = siteData.secretGame?.boss?.height ?? 30;
              const nearBX = Math.max(s.boss.x, Math.min(ox, s.boss.x + bw2));
              const nearBY = Math.max(s.boss.y, Math.min(oy, s.boss.y + bh2));
              if (Math.hypot(ox - nearBX, oy - nearBY) <= playerStats.orbitalHitboxSize && (s.boss.orbitalHitCooldown ?? 0) <= 0) {
                const dmg = playerStats.orbitalDamage;
                s.boss.health -= dmg;
                s.totalDamageDealt += dmg;
                s.boss.hitFlash = 0.08;
                s.boss.orbitalHitCooldown = 0.25; // rate-limit boss hits too
                if (s.damageNumbers.length < 100) {
                  const orbColor2 = siteDataRef.current.secretGame?.damageNumbers?.orbitalColor ?? "#00f0ff";
                  s.damageNumbers.push({ x: s.boss.x + bw2 / 2, y: s.boss.y, value: String(dmg), timer: 1.2, maxTimer: 1.2, color: orbColor2 });
                }
                if (s.boss.health <= 0) {
                  s.score += siteData.secretGame?.boss?.scoreReward ?? 500;
                  onScoreChange(s.score);
                  play("levelComplete");
                  s.boss = null;
                  onPhaseChange("bossreward");
                  return;
                }
              }
            }
            // Orbital vs enemy bullets — orbs destroy incoming projectiles
            for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
              const eb = s.bullets[bi];
              if (eb.isPlayer) continue;
              if (Math.hypot(ox - eb.x, oy - eb.y) <= oR + 4) {
                s.bullets.splice(bi, 1);
                spawnParticles(eb.x, eb.y, "#00f0ff", 3);
              }
            }
          }
        } else {
          s.orbitalAccum += dt;
          if (s.orbitalAccum >= playerStats.orbitalCooldown) {
            s.orbitalActive = true;
            s.orbitalTimer = playerStats.orbitalDuration;
          }
        }
      }

      // ── Player shooting ─────────────────────────────────────────────
      s.playerCooldown -= dt;
      const firing = keys.shoot || sharedAim.firing;
      if (firing && s.playerCooldown <= 0) {
        // Temp power-ups still apply on top of perm stats
        const wideShot = s.activePowerUps.find((p) => p.type === "wideshot");
        const projectilePU = s.activePowerUps.find((p) => p.type === "projectile");
        const rapid = s.activePowerUps.find((p) => p.type === "rapid");
        const rapidStacks = rapid?.stacks ?? 0;
        // Temp rapid overrides perm reload if shorter
        const baseCooldown = rapidStacks > 0
          ? Math.min(playerStats.reloadTime, Math.max(0.06, 0.12 - 0.02 * (rapidStacks - 1)))
          : playerStats.reloadTime;

        const px = s.playerX + (siteData.secretGame?.bulletSpawnOffsetX ?? PLAYER_W_BASE / 2);
        const py = s.playerY + (siteData.secretGame?.bulletSpawnOffsetY ?? PLAYER_H_BASE / 2);
        let aimX = px;
        let aimY = py - 10;
        if (sharedAim.aiming && sharedAim.x != null && sharedAim.y != null) {
          aimX = sharedAim.x * (logW / BASE_W);
          aimY = sharedAim.y;
        }
        const dx = aimX - px;
        const dy = aimY - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = BULLET_SPEED_BASE;
        let vx = 0, vy = -speed;
        if (dist > 1) { vx = (dx / dist) * speed; vy = (dy / dist) * speed; }

        // Determine total bullet count: wideshot overrides projectileCount spread
        const permProj = playerStats.projectileCount - 1; // extra perm projectiles
        let totalBullets = wideShot ? (2 + wideShot.stacks + permProj) : playerStats.projectileCount;
        // Projectile temp power-up adds bonus bullets, capped at 3 total
        if (projectilePU) {
          totalBullets += projectilePU.stacks;
        }
        totalBullets = Math.min(totalBullets, 3);
        const baseAngle = Math.atan2(vy, vx);

        const fireBulletNow = (angle: number) => {
          s.bullets.push({
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            isPlayer: true,
            isSuperBullet: playerStats.superBulletTier > 0,
            superBulletTier: playerStats.superBulletTier,
          });
        };

        if (totalBullets > 1) {
          // Multi-shot spread (wideshot / extra projectile)
          const spread = wideShot ? 0.26 : 0.1;
          for (let i = 0; i < totalBullets; i++) {
            const angle = baseAngle - spread + (spread * 2 * i) / (totalBullets - 1);
            fireBulletNow(angle);
          }
          play("shoot");
        } else {
          // Single shot
          fireBulletNow(baseAngle);
          play("shoot");
        }

        s.playerCooldown = baseCooldown;
      }

      // ── Enemy movement ──
      const edgeMargin = 4;
      let hitEdge = false;
      const moveAmount = s.enemySpeed * dt;

      // Check if next move would hit edge BEFORE moving
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const nextX = e.x + s.enemyDir * moveAmount;
        if (nextX <= edgeMargin || nextX + ew >= playAreaW - edgeMargin) {
          hitEdge = true;
          break;
        }
      }

      if (hitEdge) {
        // Reverse direction only — no descent
        s.enemyDir *= -1;
      } else {
        // Safe to move horizontally
        for (const e of s.enemies) {
          if (!e.alive) continue;
          e.x += s.enemyDir * moveAmount;
          // Hard clamp to keep enemies on screen at all times
          e.x = Math.max(edgeMargin, Math.min(playAreaW - edgeMargin - ew, e.x));
        }
      }

      // ── Enemy shooting (rate-limited: 1 shot per second per enemy) ──
      const aliveEnemies = s.enemies.filter((e) => e.alive);
      const cfg = settingsRef.current.enemy;
      // Per-wave projectile speed scaling
      const waveEnemyProjSpeed = cfg.projectileSpeed + (s.wave - 1) * (siteData.secretGame?.enemyProjectileSpeedPerWave ?? 0);
      aliveEnemies.forEach((e) => {
        e.cooldown -= dt;
        if (e.cooldown <= 0 && Math.random() < s.enemyFireChance) {
          s.bullets.push({
            x: e.x + ew / 2,
            y: e.y + eh,
            vx: 0,
            vy: waveEnemyProjSpeed,
            isPlayer: false,
            projectileIndex: e.projectileIndex,
          });
          e.cooldown = 1; // 1 second cooldown
        }
      });

      // ── Boss behaviour ──
      const bossCfg = siteData.secretGame?.boss;
      if (s.boss && bossCfg?.enabled) {
        // Patrol freely left / right, bouncing off walls
        const bw = bossCfg?.width ?? 40;
        const bossSpeed = (bossCfg?.trackSpeed ?? 30);
        s.boss.x += s.boss.dir * bossSpeed * dt;
        if (s.boss.x <= 4) {
          s.boss.x = 4;
          s.boss.dir = 1;
        } else if (s.boss.x + bw >= playAreaW - 4) {
          s.boss.x = playAreaW - 4 - bw;
          s.boss.dir = -1;
        }

        // Fire large projectile at player every N seconds
        s.boss.fireCooldown -= dt;
        if (s.boss.fireCooldown <= 0) {
          const bx = s.boss.x + bw / 2;
          const by = s.boss.y + (bossCfg?.height ?? 30);
          const px = s.playerX + PLAYER_W_BASE / 2;
          const py = s.playerY + PLAYER_H_BASE / 2;
          const bdx = px - bx;
          const bdy = py - by;
          const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
          const pspeed = bossCfg?.projectileSpeed ?? 80;
          const vx = bdist > 1 ? (bdx / bdist) * pspeed : 0;
          const vy = bdist > 1 ? (bdy / bdist) * pspeed : pspeed;
          s.bullets.push({
            x: bx,
            y: by,
            vx,
            vy,
            isPlayer: false,
            isBoss: true,
          });
          s.boss.fireCooldown = bossCfg?.fireInterval ?? 3;
          // Trigger Throwing animation
          s.boss.animState = "throwing";
          s.boss.animAccum = 0;
          play("shoot");
        }

        // Decay hit flash
        if (s.boss.hitFlash > 0) {
          s.boss.hitFlash = Math.max(0, s.boss.hitFlash - dt);
        }

        // ── Boss animation tick ──────────────────────────────────────────
        s.boss.animAccum += dt;
        // One-shot animations return to walking when finished
        if (
          (s.boss.animState === "hurt" || s.boss.animState === "throwing") &&
          isBossAnimComplete(s.boss.animState, s.boss.animAccum)
        ) {
          s.boss.animState = "walking";
          s.boss.animAccum = 0;
        }
      }

      // ── Power-up drift ──
      for (let i = s.powerups.length - 1; i >= 0; i--) {
        const pu = s.powerups[i];
        pu.y += POWERUP_DRIFT_SPEED * dt;
        if (pu.y > BASE_H + 10) {
          s.powerups.splice(i, 1);
        }
      }

      // ── Power-up collection ──
      const powerUpSize = siteData.secretGame?.powerUpSize ?? 8;
      for (let i = s.powerups.length - 1; i >= 0; i--) {
        const pu = s.powerups[i];
        // AABB collision with player — generous 4px padding for better feel
        const pad = 4;
        if (
          pu.x - pad < s.playerX + PLAYER_W_BASE &&
          pu.x + powerUpSize + pad > s.playerX &&
          pu.y - pad < s.playerY + PLAYER_H_BASE &&
          pu.y + powerUpSize + pad > s.playerY
        ) {
          // Apply power-up
          if (pu.type === "choice") {
            // Golden drop — open the permanent power-up selection screen
            spawnParticles(pu.x + powerUpSize / 2, pu.y + powerUpSize / 2, "#ffd700", 10);
            spawnParticles(pu.x + powerUpSize / 2, pu.y + powerUpSize / 2, "#ffffff", 5);
            s.powerups.splice(i, 1);
            play("levelComplete");
            onPhaseChange("bossreward");
            return; // exit update — phase change stops the loop
          } else if (pu.type === "extralife") {
            // Without health powerup (slicesPerHeart === 1) restore a full heart.
            // With health powerup (slicesPerHeart > 1) restore only one slice.
            const healAmount = s.slicesPerHeart > 1 ? 1 : s.slicesPerHeart;
            s.currentSlices = Math.min(s.maxSlices, s.currentSlices + healAmount);
            s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
            onLivesChange(s.lives);
            if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
            play("levelComplete"); // reuse cheerful sound
          } else {
            const durations = siteData.secretGame?.powerUpDurations;
            const duration =
              pu.type === "rapid" ? (durations?.rapid ?? 5) :
              pu.type === "invincible" ? (durations?.invincible ?? 4) :
              pu.type === "projectile" ? (durations?.projectile ?? 4) :
              (durations?.wideShot ?? 4);
            const existing = s.activePowerUps.find((p) => p.type === pu.type);
            const noStackTypes: PowerUpType[] = ["shield", "invincible", "projectile"];
            const maxStack = 5;

            if (existing) {
              if (noStackTypes.includes(pu.type)) {
                // No stacking — just reset timer
                existing.timer = duration;
              } else if (existing.stacks < maxStack) {
                // Stack up to max, reset timer
                existing.stacks = (existing.stacks || 1) + 1;
                existing.timer = duration;
              } else {
                // Already at max stacks — just reset timer
                existing.timer = duration;
              }
            } else {
              s.activePowerUps.push({ type: pu.type, timer: duration, stacks: 1 });
            }
            // Track shield initial duration for animation timing
            if (pu.type === "shield") s.shieldDuration = duration;
            // Projectile temp: recalculate bonus to fill up to cap of 3
            if (pu.type === "projectile" && existing) {
              existing.stacks = Math.max(0, 3 - playerStats.projectileCount);
            }
            if (onPowerUpChange) onPowerUpChange(s.activePowerUps);
          }
          const puColor =
            pu.type === "rapid" ? "#ff8800" :
            pu.type === "shield" ? "#00f0ff" :
            pu.type === "wideshot" ? "#fcee0a" :
            pu.type === "projectile" ? "#ff6600" :
            pu.type === "invincible" ? "#ffd700" : "#ff006e";
          spawnParticles(pu.x + powerUpSize / 2, pu.y + powerUpSize / 2, puColor, 6);
          s.powerups.splice(i, 1);
        }
      }

      // ── Bullet update (includes seeker homing) ──────────────────────
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        // Boss projectiles home in on player
        if (b.isBoss) {
          const px2 = s.playerX + PLAYER_W_BASE / 2;
          const py2 = s.playerY + PLAYER_H_BASE / 2;
          const hdx = px2 - b.x; const hdy = py2 - b.y;
          const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
          if (hdist > 1) {
            const pspeed = bossCfg?.projectileSpeed ?? 80;
            b.vx += ((hdx / hdist) * pspeed - b.vx) * 2 * dt;
            b.vy += ((hdy / hdist) * pspeed - b.vy) * 2 * dt;
          }
        }
        // Seeker missile: home in strongly on assigned target (or nearest if target is dead)
        if (b.isSeeker && b.isPlayer) {
          let nearX: number | null = null, nearY: number | null = null;
          const ecfg = settingsRef.current.enemy;
          if (b.seekerTarget && b.seekerTarget.alive && !b.seekerTarget.dying) {
            // Follow the assigned target
            nearX = b.seekerTarget.x + ecfg.width / 2;
            nearY = b.seekerTarget.y + ecfg.height / 2;
          } else {
            // Target is dead/missing — fall back to nearest alive enemy
            b.seekerTarget = null;
            let nearDist = Infinity;
            for (const e of s.enemies) {
              if (!e.alive) continue;
              const ex = e.x + ecfg.width / 2, ey = e.y + ecfg.height / 2;
              const d = Math.hypot(ex - b.x, ey - b.y);
              if (d < nearDist) { nearDist = d; nearX = ex; nearY = ey; }
            }
            if (s.boss && (nearX === null || Math.hypot(s.boss.x + (siteData.secretGame?.boss?.width ?? 40) / 2 - b.x, s.boss.y + (siteData.secretGame?.boss?.height ?? 30) / 2 - b.y) < nearDist)) {
              nearX = s.boss.x + (siteData.secretGame?.boss?.width ?? 40) / 2;
              nearY = s.boss.y + (siteData.secretGame?.boss?.height ?? 30) / 2;
            }
          }
          if (nearX !== null && nearY !== null) {
            const sdx = nearX - b.x, sdy = nearY - b.y;
            const sdist = Math.hypot(sdx, sdy);
            if (sdist > 1) {
              const missileSpd = BULLET_SPEED_BASE * 1.3;
              const targetVx = (sdx / sdist) * missileSpd;
              const targetVy = (sdy / sdist) * missileSpd;
              b.vx += (targetVx - b.vx) * 5 * dt;
              b.vy += (targetVy - b.vy) * 5 * dt;
            }
          }
        }
        b.x += (b.vx || 0) * dt;
        b.y += b.vy * dt;
        if (b.y < -20 || b.y > BASE_H + 20 || b.x < -20 || b.x > playAreaW + 20) {
          s.bullets.splice(i, 1);
        }
      }

      // ── Bullet overflow guard ──────────────────────────────────────────
      // At high wave numbers with many power-ups, bullets can accumulate faster
      // than they expire. Silently cull the oldest enemy bullets first (never
      // player bullets) to keep collision-detection O(n) cost manageable.
      const MAX_BULLETS = 350;
      if (s.bullets.length > MAX_BULLETS) {
        // Remove oldest enemy bullets from the front until we're within limit
        let removed = 0;
        for (let i = 0; i < s.bullets.length && s.bullets.length > MAX_BULLETS; ) {
          if (!s.bullets[i].isPlayer) {
            s.bullets.splice(i, 1);
            removed++;
          } else {
            i++;
          }
        }
        // If still over limit after removing all enemy bullets, cull oldest player bullets
        while (s.bullets.length > MAX_BULLETS) {
          s.bullets.shift();
        }
      }

      // ── Collision: player bullets vs enemies ──
      // Pre-compute weighted powerup type selector from per-type drop rates
      const dropRates = siteData.secretGame?.powerUpDropRates;
      const dropRateEntries: { type: PowerUpType; weight: number }[] = [
        { type: "rapid",      weight: dropRates?.rapid      ?? 1 },
        { type: "wideshot",   weight: dropRates?.wideshot   ?? 1 },
        { type: "projectile", weight: dropRates?.projectile ?? 1 },
        { type: "extralife",  weight: dropRates?.extralife  ?? 1 },
        { type: "invincible", weight: dropRates?.invincible ?? 1 },
      ];
      const filteredDropRateEntries = dropRateEntries.filter((e) => {
        if (e.type === "projectile" && playerStats.projectileCount >= 3) return false;
        return true;
      });
      const totalDropWeight = dropRateEntries.reduce((s, e) => s + Math.max(0, e.weight), 0);
      const pickDropType = (): PowerUpType => {
        if (totalDropWeight <= 0) return "rapid";
        let r = Math.random() * totalDropWeight;
        for (const entry of dropRateEntries) {
          r -= Math.max(0, entry.weight);
          if (r <= 0) return entry.type;
        }
        return dropRateEntries[dropRateEntries.length - 1].type;
      };

      // Impact size config
      const playerBulletImpact = siteData.secretGame?.impacts?.playerBullet ?? { w: 28, h: 28 };

      // Enemy collision hitbox — offset & size from config, falls back to full cell
      const ehbOffX = enemyCfg.hitboxOffsetX ?? 0;
      const ehbOffY = enemyCfg.hitboxOffsetY ?? 0;
      const ehbW    = enemyCfg.hitboxWidth  ?? ew;
      const ehbH    = enemyCfg.hitboxHeight ?? eh;

      for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
        const b = s.bullets[bi];
        if (!b.isPlayer) continue;
        for (let ei = s.enemies.length - 1; ei >= 0; ei--) {
          const e = s.enemies[ei];
          if (!e.alive) continue;
          const ehx = e.x + ehbOffX;
          const ehy = e.y + ehbOffY;
          if (
            b.x >= ehx - 1 &&
            b.x <= ehx + ehbW + 1 &&
            b.y >= ehy - 1 &&
            b.y <= ehy + ehbH + 1
          ) {
            const impactX = e.x + ew / 2;
            const impactY = e.y + eh / 2;
            // Virus: infect the enemy instead of killing it outright
            if (playerStats.hasVirus && !e.alive) { /* already dead, skip */ }
            else if (playerStats.hasVirus && e.virusStacks < playerStats.virusMaxStacks) {
              e.virusStacks++;
              e.virusTimer = playerStats.virusDuration;
              e.virusAccum = 0;
              // Show hurt animation while infected
              e.animState = "hurt"; e.animAccum = 0;
              s.bullets.splice(bi, 1);
              spawnEffect(s.activeEffects, "virus", impactX, impactY, siteData.secretGame?.impacts?.virus ?? { w: 30, h: 30 });
              spawnParticles(impactX, impactY, "#39ff14", 5);
              play("enemyHit");
            } else {
              // Compute bullet damage — missile uses superBulletDamage, super bullet uses multiplier
              // damageMultiplier from Strength power-up is applied to all player bullets
              const bulletDmg = b.superBulletDamage != null && !b.isSeeker
                ? b.superBulletDamage
                : b.isSeeker
                  ? b.superBulletDamage ?? playerStats.damageMultiplier
                  : b.isSuperBullet
                    ? playerStats.superBulletDamage * playerStats.damageMultiplier
                    : playerStats.damageMultiplier;
              const dnCfg = siteDataRef.current.secretGame?.damageNumbers;
              const dmgColor = b.isSeeker
                ? (dnCfg?.seekerColor ?? "#ff4400")
                : b.superBulletDamage != null
                  ? "#ff4400"
                  : b.isSuperBullet ? (b.superBulletTier === 3 ? "#ffd700" : b.superBulletTier === 2 ? "#cc44ff" : "#ff2222")
                  : (dnCfg?.playerBulletColor ?? "#ffffff");
              e.hp = (e.hp ?? 1) - bulletDmg;
              s.totalDamageDealt += bulletDmg;
              s.bullets.splice(bi, 1);
              // Spawn damage number
              const dnX = impactX + (Math.random() - 0.5) * 8;
              if (s.damageNumbers.length < 100) s.damageNumbers.push({ x: dnX, y: e.y, value: String(Math.round(bulletDmg)), timer: 1.0, maxTimer: 1.0, color: dmgColor });
              if (e.hp <= 0) {
                e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
                s.score += 10 * s.wave;
                onScoreChange(s.score);
                spawnEffect(s.activeEffects, "bullet", impactX, impactY, playerBulletImpact);
                spawnParticles(impactX, impactY, "#ff006e", 8);
                spawnParticles(impactX, impactY, "#fcee0a", 4);
              } else {
                // Hit but not dead — hurt flash
                e.animState = "hurt"; e.animAccum = 0;
                spawnEffect(s.activeEffects, "bullet", impactX, impactY, playerBulletImpact);
                spawnParticles(impactX, impactY, "#ff006e", 3);
              }
              if (b.isSeeker) { playFile("/audio/bomb.mp3"); } else { play("enemyHit"); }
            }

            // Chance to spawn power-up (boosted by Luck perm upgrade) — only on kill
            if (!e.alive || e.hp <= 0) {
              const pSize = siteData.secretGame?.powerUpSize ?? 8;
              // First check for a golden "choose a power-up" drop
              const choiceChance = siteData.secretGame?.enemyChoiceDropChance ?? 0;
              if (choiceChance > 0 && Math.random() < choiceChance) {
                s.powerups.push({ x: impactX - pSize / 2, y: impactY, type: "choice" });
              } else {
                // Otherwise normal temp power-up drop
                const spawnChance = (siteData.secretGame?.powerUpSpawnChance ?? ROGUELIKE_CONFIG.baseEnemyDropChance) + playerStats.luckBonus;
                if (Math.random() < spawnChance) {
                  s.powerups.push({ x: impactX - pSize / 2, y: impactY, type: pickDropType() });
                }
              }
            }
            break;
          }
        }
      }

      // ── Collision: player bullets vs enemy / boss bullets ──
      // NOTE: after a collision we splice TWO bullets (player + enemy). The outer
      // loop's `bi` may now be >= the new array length. Guard both accesses with a
      // null-check so we never dereference `undefined`.
      const ENEMY_BULLET_HITBOX = 10;
      for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
        const pb = s.bullets[bi];
        if (!pb || !pb.isPlayer) continue;
        for (let ebi = s.bullets.length - 1; ebi >= 0; ebi--) {
          const eb = s.bullets[ebi];
          if (!eb || eb.isPlayer) continue;
          if (
            pb.x >= eb.x - ENEMY_BULLET_HITBOX &&
            pb.x <= eb.x + ENEMY_BULLET_HITBOX &&
            pb.y >= eb.y - ENEMY_BULLET_HITBOX &&
            pb.y <= eb.y + ENEMY_BULLET_HITBOX
          ) {
            s.bullets.splice(bi, 1);
            s.bullets.splice(ebi > bi ? ebi - 1 : ebi, 1);
            s.score += 5 * s.wave;
            onScoreChange(s.score);
            spawnParticles(eb.x, eb.y, "#ffffff", 3);
            spawnParticles(eb.x, eb.y, "#00f0ff", 2);
            play("enemyHit");

            // Only BOSS projectiles drop power-ups when destroyed
            if (eb.isBoss) {
              const spawnChance = siteData.secretGame?.bossProjectileDropRate ?? 0.15;
              if (Math.random() < spawnChance) {
                const types: PowerUpType[] = ["rapid", "wideshot", "projectile", "extralife", "invincible"];
                const type = types[Math.floor(Math.random() * types.length)];
                const pSize = siteData.secretGame?.powerUpSize ?? 8;
                s.powerups.push({
                  x: eb.x - pSize / 2,
                  y: eb.y,
                  type,
                });
              }
            }
            break;
          }
        }
      }

      // ── Collision: player bullets vs boss ──
      if (s.boss && bossCfg?.enabled) {
        const bw = bossCfg?.width ?? 40;
        const bh = bossCfg?.height ?? 30;
        for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
          const b = s.bullets[bi];
          if (!b.isPlayer) continue;
          if (
            b.x >= s.boss.x &&
            b.x <= s.boss.x + bw &&
            b.y >= s.boss.y &&
            b.y <= s.boss.y + bh
          ) {
            s.bullets.splice(bi, 1);
            // Apply damage: missile uses superBulletDamage, super bullet uses multiplier, else base
            const baseDmg = bossCfg?.bulletDamage ?? 20;
            const damage = b.superBulletDamage != null
              ? b.superBulletDamage
              : b.isSuperBullet
                ? baseDmg * playerStats.damageMultiplier * playerStats.superBulletDamage
                : baseDmg * playerStats.damageMultiplier;
            s.boss.health -= damage;
            s.totalDamageDealt += damage;
            s.boss.hitFlash = 0.1;
            if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
            spawnEffect(s.activeEffects, "bullet", b.x, b.y, playerBulletImpact);
            spawnParticles(b.x, b.y, "#ff006e", 4);
            spawnParticles(b.x, b.y, "#fcee0a", 3);
            if (b.isSeeker) { playFile("/audio/bomb.mp3"); } else { play("enemyHit"); }
            // Spawn damage number on boss
            {
              const dnCfg2 = siteDataRef.current.secretGame?.damageNumbers;
              const bossDmgColor = b.isSeeker
                ? (dnCfg2?.seekerColor ?? "#ff4400")
                : b.superBulletDamage != null
                  ? "#ff4400"
                  : (dnCfg2?.playerBulletColor ?? "#ffffff");
              if (s.damageNumbers.length < 100) s.damageNumbers.push({ x: b.x + (Math.random() - 0.5) * 10, y: s.boss.y - 2, value: String(Math.round(damage)), timer: 1.0, maxTimer: 1.0, color: bossDmgColor });
            }
            // Virus infection on boss hit
            if (playerStats.hasVirus && s.boss.virusStacks < playerStats.virusMaxStacks) {
              s.boss.virusStacks++;
              s.boss.virusTimer = playerStats.virusDuration;
              s.boss.virusAccum = 0;
              spawnEffect(s.activeEffects, "virus", b.x, b.y, siteData.secretGame?.impacts?.virus ?? { w: 30, h: 30 });
              spawnParticles(b.x, b.y, "#39ff14", 3);
            }
            if (s.boss.health <= 0) {
              s.score += bossCfg?.scoreReward ?? 500;
              onScoreChange(s.score);
              spawnEffect(s.activeEffects, "boss", s.boss.x + bw / 2, s.boss.y + bh / 2, siteData.secretGame?.impacts?.boss ?? { w: 80, h: 80 });
              spawnParticles(s.boss.x + bw / 2, s.boss.y + bh / 2, "#ff006e", 20);
              spawnParticles(s.boss.x + bw / 2, s.boss.y + bh / 2, "#fcee0a", 15);
              spawnParticles(s.boss.x + bw / 2, s.boss.y + bh / 2, "#00f0ff", 10);
              play("levelComplete");
              s.boss = null;
              onPhaseChange("bossreward");
              return;
            }
          }
        }
      }

      // ── Per-wave damage values ──────────────────────────────────────────
      const waveEnemyBulletDmg = Math.max(1, Math.round(
        (siteData.secretGame?.enemyProjectileDamage ?? 1) +
        (s.wave - 1) * (siteData.secretGame?.enemyProjectileDamagePerWave ?? 0),
      ));
      const waveEnemyCollisionDmg = Math.max(1, Math.round(
        (siteData.secretGame?.enemyCollisionDamage ?? 1) +
        (s.wave - 1) * (siteData.secretGame?.enemyCollisionDamagePerWave ?? 0),
      ));

      // ── Collision: enemy bullets vs player ──
      const enemyBulletImpact = siteData.secretGame?.impacts?.enemyBullet ?? { w: 20, h: 20 };
      // Use configurable hitbox from settings (falls back to hard-coded base values)
      const hbCfg = siteData.secretGame?.playerHitbox;
      const hbPoints = hbCfg?.points;
      const usePolygon = hbPoints && hbPoints.length >= 3;
      // Rectangle fallback values (used when no polygon defined)
      const px = s.playerX + (hbCfg?.offsetX ?? 0);
      const py = s.playerY + (hbCfg?.offsetY ?? 0);
      const pw = hbCfg?.width  ?? PLAYER_W_BASE;
      const ph = hbCfg?.height ?? PLAYER_H_BASE;
      const hasShield = s.activePowerUps.some((p) => p.type === "shield");
      const isInvincible = s.activePowerUps.some((p) => p.type === "invincible");
      for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
        const b = s.bullets[bi];
        if (b.isPlayer) continue;
        const hitbox = b.isBoss ? (bossCfg?.projectileSize ?? 10) / 2 : (enemyCfg.projectileSize ?? 10) / 2;
        // Determine if bullet hits the player
        let playerHit: boolean;
        if (usePolygon && hbPoints) {
          // Polygon (ray-cast) test — check bullet centre inside polygon
          const lx = b.x - s.playerX;
          const ly = b.y - s.playerY;
          let inside = false;
          for (let i = 0, j = hbPoints.length - 1; i < hbPoints.length; j = i++) {
            const xi = hbPoints[i].x, yi = hbPoints[i].y;
            const xj = hbPoints[j].x, yj = hbPoints[j].y;
            if (((yi > ly) !== (yj > ly)) && (lx < (xj - xi) * (ly - yi) / (yj - yi) + xi)) {
              inside = !inside;
            }
          }
          // Also run a loose AABB guard with hitbox radius for responsiveness
          playerHit = inside;
        } else {
          playerHit = (
            b.x >= px - hitbox &&
            b.x <= px + pw + hitbox &&
            b.y >= py - hitbox &&
            b.y <= py + ph + hitbox
          );
        }
        if (playerHit) {
          s.bullets.splice(bi, 1);
          if (isInvincible || s.permShieldActive) {
            // Invincible or perm-shield active — ignore hit, spawn small deflect effect
            spawnEffect(s.activeEffects, "bullet", b.x, b.y, enemyBulletImpact);
            continue;
          }
          if (hasShield) {
            // Shield absorbs one hit then breaks
            const shieldIdx = s.activePowerUps.findIndex((p) => p.type === "shield");
            if (shieldIdx >= 0) {
              s.activePowerUps.splice(shieldIdx, 1);
              if (onPowerUpChange) onPowerUpChange(s.activePowerUps);
            }
            spawnEffect(s.activeEffects, "bullet", px + pw / 2, py + ph / 2, enemyBulletImpact);
            spawnParticles(px + pw / 2, py + ph / 2, "#00f0ff", 6);
            playFile("/audio/shield.mp3");
            continue;
          }
          // Heart slicing: remove slices based on per-wave enemy bullet damage
          s.currentSlices = Math.max(0, s.currentSlices - waveEnemyBulletDmg);
          s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
          onLivesChange(s.lives);
          if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
          s.screenShake = 0.2;
          spawnEffect(s.activeEffects, "bullet", px + pw / 2, py + ph / 2, enemyBulletImpact);
          spawnParticles(px + pw / 2, py + ph / 2, "#00f0ff", 10);
          play("playerHit");
          s.damageNumbers.push({ x: px + pw / 2 + (Math.random() - 0.5) * 10, y: py, value: String(waveEnemyBulletDmg), timer: 1.0, maxTimer: 1.0, color: siteDataRef.current.secretGame?.damageNumbers?.playerHitColor ?? "#ff4444" });
          if (s.currentSlices <= 0) {
            play("gameOver");
            onRunStatsChange?.(Math.round(s.totalDamageDealt));
            onPhaseChange("gameover");
            try {
              const currentHigh = parseInt(localStorage.getItem("abch-guitar-invaders-highscore") || "0", 10);
              if (s.score > currentHigh) {
                localStorage.setItem("abch-guitar-invaders-highscore", String(s.score));
              }
            } catch {}
            return;
          }
        }
      }

      // ── Collision: boss vs player (touch damage) ──
      if (s.boss && bossCfg?.enabled) {
        const bw = bossCfg?.width ?? 40;
        const bh = bossCfg?.height ?? 30;
        if (
          s.boss.x < px + pw &&
          s.boss.x + bw > px &&
          s.boss.y < py + ph &&
          s.boss.y + bh > py
        ) {
          if (!isInvincible && !s.permShieldActive && !hasShield) {
            s.currentSlices = Math.max(0, s.currentSlices - waveEnemyCollisionDmg);
            s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
            onLivesChange(s.lives);
            if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
            s.screenShake = 0.3;
            spawnParticles(px + pw / 2, py + ph / 2, "#ff006e", 10);
            play("playerHit");
            s.damageNumbers.push({ x: px + pw / 2, y: py - 5, value: String(waveEnemyCollisionDmg), timer: 1.0, maxTimer: 1.0, color: siteDataRef.current.secretGame?.damageNumbers?.playerHitColor ?? "#ff4444" });
            if (s.currentSlices <= 0) {
              play("gameOver");
              onRunStatsChange?.(Math.round(s.totalDamageDealt));
              onPhaseChange("gameover");
              return;
            }
          }
        }
      }

      // ── Collision: regular enemies vs player (body contact damage) ──
      if (s.playerBodyHitTimer > 0) {
        s.playerBodyHitTimer -= dt;
      } else {
        for (const e of s.enemies) {
          if (!e.alive) continue;
          // AABB check between enemy hitbox and player
          if (
            e.x < px + pw &&
            e.x + ew > px &&
            e.y < py + ph &&
            e.y + eh > py
          ) {
            if (isInvincible || s.permShieldActive || hasShield) break;
            s.currentSlices = Math.max(0, s.currentSlices - waveEnemyCollisionDmg);
            s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
            onLivesChange(s.lives);
            if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
            s.screenShake = 0.25;
            spawnParticles(px + pw / 2, py + ph / 2, "#ff4444", 8);
            play("playerHit");
            s.damageNumbers.push({ x: px + pw / 2 + (Math.random() - 0.5) * 8, y: py - 2, value: String(waveEnemyCollisionDmg), timer: 1.0, maxTimer: 1.0, color: siteDataRef.current.secretGame?.damageNumbers?.playerHitColor ?? "#ff4444" });
            s.playerBodyHitTimer = 1.0; // 1-second invincibility window after collision
            if (s.currentSlices <= 0) {
              play("gameOver");
              onRunStatsChange?.(Math.round(s.totalDamageDealt));
              onPhaseChange("gameover");
              try {
                const currentHigh = parseInt(localStorage.getItem("abch-guitar-invaders-highscore") || "0", 10);
                if (s.score > currentHigh) {
                  localStorage.setItem("abch-guitar-invaders-highscore", String(s.score));
                }
              } catch {}
              return;
            }
            break; // only one collision per frame
          }
        }
      }

      // ── Wave complete? ──
      if (aliveEnemies.length === 0 && !s.boss) {
        play("levelComplete");
        if (s.wave === 100) {
          onPhaseChange("songunlock");
          return;
        }
        // If wave rewards are enabled, go straight to the power-up selection screen;
        // otherwise show the brief "Wave X Clear!" overlay then auto-advance.
        // Default waveRewardEnabled to true so the screen shows even if the field is
        // missing from older versions of the saved data (e.g. stale Supabase config).
        onPhaseChange((siteData.secretGame?.waveRewardEnabled ?? true) ? "wavereward" : "levelcomplete");
        return;
      }

      // ── Enemy animation update ────────────────────────────────────────
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (e.alive) {
          // Advance walking / hurt accumulator
          e.animAccum += dt;
          // Decrement orbital hit cooldown
          if (e.orbitalHitCooldown > 0) e.orbitalHitCooldown -= dt;
          // Hurt is one-shot: return to walking when done
          if (e.animState === "hurt" && isAnimComplete("hurt", e.animAccum)) {
            e.animState = "walking";
            e.animAccum = 0;
          }
        } else if (e.dying) {
          // Advance death animation
          e.animAccum += dt;
          // Remove enemy from array once the dying animation finishes
          if (isAnimComplete("dying", e.animAccum)) {
            e.dying = false;
            s.enemies.splice(i, 1);
          }
        }
      }
      // Decrement boss orbital hit cooldown
      if (s.boss && s.boss.orbitalHitCooldown > 0) s.boss.orbitalHitCooldown -= dt;

      // ── Particles ──
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // ── Screen shake decay ──
      if (s.screenShake > 0) {
        s.screenShake = Math.max(0, s.screenShake - dt);
      }

      // ── Tick GIF effects ──
      tickEffects(s.activeEffects, dt);

      // ── Damage numbers: drift up and fade ──
      {
        const driftSpd = siteDataRef.current.secretGame?.damageNumbers?.driftSpeed ?? 18;
        for (let i = s.damageNumbers.length - 1; i >= 0; i--) {
          const dn = s.damageNumbers[i];
          dn.y -= driftSpd * dt; // drift upward
          dn.timer -= dt;
          if (dn.timer <= 0) s.damageNumbers.splice(i, 1);
        }
      }

      // ── Render ──
      render(ctx, s, CW, CH, sc);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, onPhaseChange, onScoreChange, onLivesChange, onWaveChange, play, setMuted, isMuted, spawnParticles, onPowerUpChange, onHealthDetailChange, playerStats, stageBgImage]
  );

  function render(
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    CW: number,
    CH: number,
    sc: number
  ) {
    // ── Always read fresh data from refs — breaks stale-closure issues ──
    // (update() is a useCallback that may hold an old render() closure;
    //  reading from the ref here ensures we always get the latest siteData.)
    const siteData = siteDataRef.current;
    const spriteConfig = siteData.secretGame?.playerSprite ?? { offsetX: -2, offsetY: -12, width: 14, height: 42 };

    const logW = CW / sc;
    const logH = BASE_H;
    // Always prefer siteData (fresh from siteDataRef.current) over settingsRef,
    // which may lag or be initialised from a stale fallback.
    const _renderPlatform = isMobileAtMount ? "mobile" : "desktop";
    const enemyCfg =
      siteData.secretGame?.[_renderPlatform]?.enemy ??
      settingsRef.current.enemy;

    // ── CRITICAL: clear the ENTIRE physical canvas BEFORE any transform ──
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CW, CH);

    ctx.save();
    ctx.scale(sc, sc);

    // Draw stage background image if loaded, otherwise fall back to dark fill
    if (stageBgImage && stageBgImage.complete && stageBgImage.naturalWidth > 0) {
      ctx.drawImage(stageBgImage, 0, 0, logW, logH);
    } else {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, logW, logH);
    }

    // Screen shake
    if (s.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * 4;
      const shakeY = (Math.random() - 0.5) * 4;
      ctx.translate(shakeX, shakeY);
    }

    // Stars parallax — spread across full logical width
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 37 + s.frame * 0.2) % (logW + 20)) - 10;
      const sy = ((i * 53) % (logH + 20)) - 10;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Draw power-ups
    const puSize = siteData.secretGame?.powerUpSize ?? 8;
    for (const pu of s.powerups) {
      drawPowerUp(ctx, pu.x, pu.y, pu.type, s.frame, puSize);
    }

    // Draw enemies with sprite animation
    for (const e of s.enemies) {
      // Draw alive enemies AND enemies mid-death-animation
      if (!e.alive && !e.dying) continue;

      const spawnScale = e.dying ? 1 : Math.min(1, s.spawnAnim + (e.y / logH) * 0.5);
      // Fade out dying enemies over the duration of their death animation
      const dyingAlpha = e.dying ? Math.max(0, 1 - e.animAccum / animDuration("dying")) : 1;
      ctx.save();
      if (e.dying) {
        ctx.globalAlpha = dyingAlpha;
      } else if (spawnScale < 1) {
        ctx.globalAlpha = spawnScale;
      }

      // spriteScale scales the visual only — grid cell / collision stays the same
      const ss = enemyCfg.spriteScale ?? 1;
      const sprW = enemyCfg.width  * ss;
      const sprH = enemyCfg.height * ss;
      const sprX = e.x - (sprW - enemyCfg.width)  / 2;
      const sprY = e.y - (sprH - enemyCfg.height) / 2;
      drawEnemySprite(
        ctx, sprX, sprY, e.variant, e.animState, e.animAccum,
        sprW, sprH,
        // Procedural fallback while sprites are loading
        () => drawEnemy(ctx, sprX, sprY, e.variant, s.frame, e.cooldown > 0.75, sprW, sprH),
      );
      ctx.restore();
    }

    // Draw player (custom sprite if loaded, else fallback)
    const playerImg = playerImageRef.current;
    if (playerImg && playerImg.complete) {
      ctx.drawImage(
        playerImg,
        s.playerX + spriteConfig.offsetX,
        s.playerY + spriteConfig.offsetY,
        spriteConfig.width,
        spriteConfig.height
      );
    } else {
      drawPlayer(ctx, s.playerX, s.playerY, s.frame);
    }

    // Draw invincibility sparkles (Sonic-style) around the guitar
    if (s.activePowerUps.some((p) => p.type === "invincible")) {
      const sc = spriteConfig;
      const cx = s.playerX + sc.offsetX + sc.width / 2;
      const cy = s.playerY + sc.offsetY + sc.height / 2;
      const sparkleColors = ["#ffd700", "#ffffff", "#00f0ff", "#ff006e", "#fcee0a"];
      for (let i = 0; i < 10; i++) {
        const angle = s.frame * 0.08 + i * ((Math.PI * 2) / 10);
        const radius = 18 + Math.sin(s.frame * 0.05 + i * 1.3) * 8;
        const sx = cx + Math.cos(angle) * radius;
        const sy = cy + Math.sin(angle) * radius * 0.7;
        const size = 1.5 + Math.sin(s.frame * 0.2 + i * 2) * 1;
        const alpha = 0.5 + Math.sin(s.frame * 0.15 + i) * 0.5;
        const color = sparkleColors[i % sparkleColors.length];

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        // Draw a 4-point star shape
        ctx.moveTo(sx, sy - size);
        ctx.lineTo(sx + size * 0.3, sy - size * 0.3);
        ctx.lineTo(sx + size, sy);
        ctx.lineTo(sx + size * 0.3, sy + size * 0.3);
        ctx.lineTo(sx, sy + size);
        ctx.lineTo(sx - size * 0.3, sy + size * 0.3);
        ctx.lineTo(sx - size, sy);
        ctx.lineTo(sx - size * 0.3, sy - size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Shield sprite constants (5×5 grid = 25 frames)
    const SHIELD_COLS = 5;
    const SHIELD_ROWS = 5;
    const SHIELD_FRAMES = 25;

    // Helper: draw one frame of the shield spritesheet centered on (cx, cy) with given radius
    const drawShieldSprite = (cx: number, cy: number, radius: number, progress: number, scale = 1) => {
      const shImg = shieldImageRef.current;
      const effR = radius * scale;
      if (shImg && shImg.complete && shImg.naturalWidth > 0) {
        const frameIdx = Math.min(SHIELD_FRAMES - 1, Math.floor(Math.max(0, Math.min(0.9999, progress)) * SHIELD_FRAMES));
        const col = frameIdx % SHIELD_COLS;
        const row = Math.floor(frameIdx / SHIELD_COLS);
        const fw = shImg.naturalWidth / SHIELD_COLS;
        const fh = shImg.naturalHeight / SHIELD_ROWS;
        const size = effR * 2;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(shImg, col * fw, row * fh, fw, fh, cx - effR, cy - effR, size, size);
        ctx.restore();
      } else {
        // Fallback: procedural arc
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 + Math.sin(s.frame * 0.3) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, effR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(0, 240, 255, 0.08)`;
        ctx.fill();
      }
    };

    // Draw permanent shield bubble (roguelike) — animation spans permShieldDuration
    if (s.permShieldActive) {
      const permShCfg = siteData.secretGame?.permShield;
      const sc2 = spriteConfig;
      const cx2 = s.playerX + sc2.offsetX + sc2.width / 2 + (permShCfg?.offsetX ?? 0);
      const cy2 = s.playerY + sc2.offsetY + sc2.height / 2 + (permShCfg?.offsetY ?? 0);
      const permR = permShCfg?.radius ?? 20;
      const permScale = permShCfg?.size ?? 1;
      const permDuration = playerStats.permShieldDuration;
      const permProgress = permDuration > 0 ? 1 - (s.permShieldTimer / permDuration) : 0;
      drawShieldSprite(cx2, cy2, permR, permProgress, permScale);
    }

    // Draw shield bubble if active — animation spans the temp shield duration
    const shieldPU = s.activePowerUps.find((p) => p.type === "shield");
    if (shieldPU) {
      const shieldCfg = settingsRef.current.shield;
      const sc = spriteConfig;
      const cx = s.playerX + sc.offsetX + sc.width / 2 + (shieldCfg?.offsetX ?? 0);
      const cy = s.playerY + sc.offsetY + sc.height / 2 + (shieldCfg?.offsetY ?? 0);
      const shR = shieldCfg?.radius ?? 16;
      const shDur = s.shieldDuration > 0 ? s.shieldDuration : 4;
      const shProgress = 1 - (shieldPU.timer / shDur);
      drawShieldSprite(cx, cy, shR, shProgress);
    }

    // Draw boss
    if (s.boss) {
      const bossCfg = siteData.secretGame?.boss;
      const bw = bossCfg?.width ?? 40;
      const bh = bossCfg?.height ?? 30;
      // Visual size = hitbox size × sprite scale multipliers (admin-overridable)
      const sprCfg = siteData.secretGame?.roguelikeConfig?.sprites ?? ROGUELIKE_CONFIG.sprites;
      const sprW = bw * (sprCfg.bossWidthMult ?? 2.2);
      const sprH = bh * (sprCfg.bossHeightMult ?? 2.2);
      const sprX = s.boss.x + (sprCfg.bossOffsetX ?? -28);
      const sprY = s.boss.y + (sprCfg.bossOffsetY ?? -35);
      drawBossSprite(
        ctx,
        sprX, sprY, sprW, sprH,
        s.boss.skinIndex,
        s.boss.animState,
        s.boss.animAccum,
        s.boss.hitFlash,
        // No procedural fallback — only render new sprite assets
        () => {},
      );
      // Boss health bar — fixed HUD position from editor, always red
      const bhb = settingsRef.current.bossHealthBar;
      if (bhb?.visible) {
        const barH = bhb.size ?? 6;
        const barW = barH * 10;
        draw8BitHealthBar(ctx, bhb.x, bhb.y, barW, barH, s.boss.health, s.boss.maxHealth, "BOSS", "#ff0000");
      }
    }

    // Draw orbital orbs — use orbs.png spritesheet (4×8 grid, 32×32 per cell, row 0 = first orb)
    const playerStats2 = playerStatsRef.current;
    if (playerStats2.hasOrbital && s.orbitalActive) {
      const pcx3 = s.playerX + PLAYER_W_BASE / 2;
      const pcy3 = s.playerY + PLAYER_H_BASE / 2;
      // Animate through 4 frames of row 0 at ~8fps
      const orbFrame = Math.floor(s.frame / 8) % 4;
      const ORB_CELL = 32; // sprite cell size
      const orbImg = orbsImageRef.current;
      for (let oi = 0; oi < playerStats2.orbitalOrbCount; oi++) {
        const angle = s.orbitalBaseAngle + (oi / playerStats2.orbitalOrbCount) * Math.PI * 2;
        const ox = pcx3 + Math.cos(angle) * playerStats2.orbitalRadius;
        const oy = pcy3 + Math.sin(angle) * playerStats2.orbitalRadius;
        const platProjSizes = siteData.secretGame?.[_renderPlatform]?.projectileSizes;
        const oR = platProjSizes?.orbital ?? playerStats2.orbitalOrbSize; // hitbox radius — sprite drawn at oR*2 × oR*2
        const pulse = 0.8 + Math.sin(s.frame * 0.2 + oi * 2.1) * 0.2;
        ctx.save();
        ctx.globalAlpha = pulse;
        if (orbImg && orbImg.complete) {
          // Draw sprite from row 0, column = orbFrame
          ctx.drawImage(
            orbImg,
            orbFrame * ORB_CELL, 0,   // source x, y
            ORB_CELL, ORB_CELL,       // source w, h
            ox - oR, oy - oR,         // dest x, y (centred on orbit position)
            oR * 2, oR * 2,           // dest w, h (matches hitbox diameter)
          );
        } else {
          // Fallback: simple cyan square while image loads
          ctx.fillStyle = "#00f0ff";
          ctx.fillRect(ox - oR, oy - oR, oR * 2, oR * 2);
        }
        ctx.restore();
      }
    }

    // Draw bullets
    for (const b of s.bullets) {
      if (b.isPlayer) {
        if (b.isSuperBullet && b.superBulletTier != null && b.superBulletTier > 0) {
          // Super bullet: large, colored
          const tier = b.superBulletTier;
          const color = tier >= 3 ? "#ffd700" : tier === 2 ? "#cc44ff" : "#ff2222";
          const glowColor = tier >= 3 ? "#ffaa00" : tier === 2 ? "#9900ff" : "#ff0000";
          const platProjSizes = siteData.secretGame?.[_renderPlatform]?.projectileSizes;
          const tierSizes = [
            platProjSizes?.superRed ?? playerStats2.superBulletSizes[0],
            platProjSizes?.superPurple ?? playerStats2.superBulletSizes[1],
            platProjSizes?.superGold ?? playerStats2.superBulletSizes[2],
          ];
          const sz = tierSizes[tier - 1] ?? 10;
          ctx.save();
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 12;
          ctx.fillStyle = color;
          ctx.fillRect(b.x - sz / 2, b.y - sz / 2, sz, sz);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(b.x - sz * 0.25, b.y - sz * 0.25, sz * 0.5, sz * 0.5);
          ctx.restore();
        } else if (b.isSeeker) {
          // Seeker missile: red with trail
          const platProjSizes = siteData.secretGame?.[_renderPlatform]?.projectileSizes;
          const ssz = platProjSizes?.seeker ?? playerStats2.seekerMissileSize ?? 6;
          const bodyW = ssz;
          const bodyH = ssz * (8 / 6);
          const tipW = ssz * (4 / 6);
          ctx.save();
          ctx.shadowColor = "#ff4400";
          ctx.shadowBlur = 8;
          ctx.fillStyle = "#ff6600";
          ctx.fillRect(b.x - bodyW / 2, b.y - bodyH / 2, bodyW, bodyH);
          ctx.fillStyle = "#ffdd00";
          ctx.fillRect(b.x - tipW / 2, b.y - tipW / 2, tipW, tipW);
          ctx.restore();
        } else {
          const platProjSizes = siteData.secretGame?.[_renderPlatform]?.projectileSizes;
          const bulletSize = platProjSizes?.playerBullet ?? 4;
          drawPlayerBullet(ctx, b.x, b.y, s.frame, bulletSize);
        }
      } else if (b.isBoss) {
        const platProjSizes = siteData.secretGame?.[_renderPlatform]?.projectileSizes;
        const pSize = platProjSizes?.boss ?? siteData.secretGame?.boss?.projectileSize ?? 10;
        drawBossProjectile(ctx, b.x, b.y, s.frame, pSize);
      } else {
        const enemyProjSize = enemyCfg?.projectileSize ?? 10;
        const uwCfg = siteData.secretGame?.roguelikeConfig?.sprites ?? ROGUELIKE_CONFIG.sprites;
        drawEnemyBullet(
          ctx, b.x, b.y,
          b.projectileIndex ?? 0,
          enemyProjSize,
          uwCfg.underwearRows ?? 4,
          uwCfg.underwearCols ?? 4,
        );
      }
    }

    // Draw lightning / Connect beams
    for (const beam of s.lightningBeams) {
      const alpha = Math.min(1, beam.timer * 4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Draw GIF impact effects (below particles so sparks float on top)
    drawEffects(ctx, s.activeEffects);

    // Draw particles
    for (const p of s.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      drawParticle(ctx, p.x, p.y, p.color, p.size);
    }
    ctx.globalAlpha = 1;

    // Draw damage numbers (floating text, fades upward)
    {
      const dnFontSize = siteDataRef.current.secretGame?.damageNumbers?.fontSize ?? 8;
      for (const dn of s.damageNumbers) {
        const alpha = Math.max(0, dn.timer / dn.maxTimer);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = dn.color;
        ctx.shadowColor = dn.color;
        ctx.shadowBlur = 4;
        ctx.font = `bold ${dnFontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(dn.value, dn.x, dn.y);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  useGameLoop(update, phase === "playing" || phase === "menu" || phase === "paused" || phase === "bossreward" || phase === "wavereward");

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-screen h-screen"
      style={{ imageRendering: "pixelated" }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}


