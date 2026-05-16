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
  type EnemyFacing,
} from "./enemy-sprites";
import {
  loadPlayerSprite,
  drawPlayerSprite,
  type PlayerFacing,
} from "./player-sprite";

// ── Reusable offscreen canvas for sprite tinting ─────────────────────
// Canvas 2D "source-atop" only works correctly on a transparent background.
// We draw the sprite here, tint it, then composite the result back.
let _tintCanvas: HTMLCanvasElement | null = null;
let _tintCtx: CanvasRenderingContext2D | null = null;
function getTintCanvas(w: number, h: number) {
  if (!_tintCanvas) {
    _tintCanvas = document.createElement("canvas");
    _tintCtx = _tintCanvas.getContext("2d", { willReadFrequently: false })!;
  }
  if (_tintCanvas.width < w) _tintCanvas.width = w;
  if (_tintCanvas.height < h) _tintCanvas.height = h;
  return { canvas: _tintCanvas, ctx: _tintCtx! };
}

/**
 * Tint a sprite region on the main canvas without affecting the background.
 * Works by drawing the sprite to an offscreen transparent canvas, applying
 * the tint with source-atop (which only affects non-transparent pixels),
 * then drawing the result back.
 */
/** Format a damage value for display — shows 1 decimal place when fractional. */
function fmtDmg(n: number): string {
  const rounded = Math.round(n);
  return Math.abs(n - rounded) < 0.05 ? String(rounded) : n.toFixed(1);
}

function tintSpriteRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tintColor: string,
  alpha: number,
  drawSprite: (c: CanvasRenderingContext2D, sx: number, sy: number, sw: number, sh: number) => void,
) {
  const { canvas: tCan, ctx: tCtx } = getTintCanvas(Math.ceil(w), Math.ceil(h));
  tCtx.clearRect(0, 0, tCan.width, tCan.height);

  // Draw sprite onto transparent offscreen canvas
  drawSprite(tCtx, 0, 0, w, h);

  // Tint only the sprite pixels (source-atop on transparent bg works correctly)
  tCtx.globalCompositeOperation = "source-atop";
  tCtx.fillStyle = tintColor;
  tCtx.fillRect(0, 0, w, h);
  tCtx.globalCompositeOperation = "source-over";

  // Draw tinted result back onto main canvas
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(tCan, 0, 0, w, h, x, y, w, h);
  ctx.restore();
}
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

/**
 * Draw an electricity-style zigzag bolt between two points.
 * @param segments — number of zigzag segments along the line
 * @param jitter  — max perpendicular displacement per segment (in game units)
 */
function drawElectricityBolt(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  segments: number,
  jitter: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  // Unit vector along the line
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular unit vector
  const px = -uy;
  const py = ux;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const bx = x1 + dx * t;
    const by = y1 + dy * t;
    // Random offset perpendicular to the line, fading to 0 at endpoints
    const offset = (Math.random() - 0.5) * 2 * jitter * Math.sin(t * Math.PI);
    ctx.lineTo(bx + px * offset, by + py * offset);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

type PowerUpType = "rapid" | "shield" | "wideshot" | "extralife" | "invincible" | "choice" | "projectile" | "timewarp" | "doubleshot" | "ricochet" | "overcharge" | "groupie";

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

  const shieldImageRef = useRef<HTMLImageElement | null>(null);
  const orbsImageRef = useRef<HTMLImageElement | null>(null);
  const [stageBgDesktop, setStageBgDesktop] = useState<HTMLImageElement | null>(null);
  const [stageBgMobile, setStageBgMobile] = useState<HTMLImageElement | null>(null);
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

  /**
   * Build effective game settings by merging global settings with per-platform overrides.
   * Platform overrides take precedence over global settings.
   */
  const effectiveSettingsRef = useRef(siteData.secretGame);
  useEffect(() => {
    const global = siteDataRef.current?.secretGame;
    const overrides = settingsRef.current?.platformOverrides;
    if (!global) {
      effectiveSettingsRef.current = global;
      return;
    }
    if (!overrides) {
      effectiveSettingsRef.current = global;
      return;
    }
    const merged = { ...global, ...overrides } as typeof global;
    // Deep-merge nested objects that may be partially overridden
    if (overrides.boss) {
      merged.boss = { ...global.boss, ...overrides.boss };
    }
    if (overrides.impacts) {
      merged.impacts = { ...global.impacts, ...overrides.impacts };
    }
    if (overrides.powerUpDurations) {
      merged.powerUpDurations = { ...global.powerUpDurations, ...overrides.powerUpDurations };
    }
    if (overrides.powerUpDropRates) {
      merged.powerUpDropRates = { ...global.powerUpDropRates, ...overrides.powerUpDropRates };
    }
    if (overrides.roguelikeConfig) {
      merged.roguelikeConfig = { ...global.roguelikeConfig, ...overrides.roguelikeConfig };
    }
    if (overrides.damageNumbers) {
      merged.damageNumbers = global.damageNumbers
        ? { ...global.damageNumbers, ...overrides.damageNumbers }
        : overrides.damageNumbers;
    }
    if (overrides.playerHitbox) {
      merged.playerHitbox = global.playerHitbox
        ? { ...global.playerHitbox, ...overrides.playerHitbox }
        : overrides.playerHitbox;
    }
    if (overrides.permShield) {
      merged.permShield = global.permShield
        ? { ...global.permShield, ...overrides.permShield }
        : overrides.permShield;
    }
    effectiveSettingsRef.current = merged;
  });

  // Keep playerStats in a ref so the render function (which is not a useCallback) can
  // access the latest values without stale closures.
  const playerStatsRef = useRef(playerStats);
  useEffect(() => { playerStatsRef.current = playerStats; });

  // Load custom guitar sprite + shield spritesheet + orbital orbs spritesheet
  useEffect(() => {
    loadPlayerSprite();
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
    stageImg.onload = () => {
      setStageBgDesktop(stageImg);
    };
    stageImg.src = "/background/stage.png";
    if (stageImg.complete) setStageBgDesktop(stageImg);

    const stageMobileImg = new Image();
    stageMobileImg.onload = () => {
      setStageBgMobile(stageMobileImg);
    };
    stageMobileImg.src = "/background/stage_mobile.png";
    if (stageMobileImg.complete) setStageBgMobile(stageMobileImg);
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
    playerFacing: "down" as PlayerFacing,
    playerAnimAccum: 0,
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
      // Cold Feet DOT
      coldStacks: number;
      coldTimer: number;
      coldAccum: number;
      // Pyromaniac DOT
      burnStacks: number;
      burnTimer: number;
      burnAccum: number;
      // HP system (hp > 1 = takes multiple hits)
      hp: number;
      maxHp: number;
      // Sprite animation
      animState: EnemyAnimState;
      animAccum: number;    // seconds elapsed in current anim
      dying: boolean;       // true while death anim plays (alive=false)
      facing: EnemyFacing;  // directional sprite facing
      orbitalHitCooldown: number; // prevents orbital from dealing damage every frame
      // Elite champion modifiers
      isElite: boolean;
      eliteType: "shielded" | "explosive" | "regenerating" | "splitter" | null;
      eliteShieldActive: boolean;
      eliteShieldTimer: number;
      eliteHealAccum: number;
    }[],
    bullets: [] as {
      x: number; y: number; vx: number; vy: number;
      angle?: number;           // visual rotation angle
      isPlayer: boolean; isSeeker?: boolean;
      variant?: 0 | 1 | 2; isBoss?: boolean;
      projectileIndex?: number; // 0–15: which projectile sprite this bullet uses
      connectDamaged?: boolean;
      isSuperBullet?: boolean;    // true for super bullet projectiles
      superBulletTier?: number;   // 0=normal, 1=red, 2=purple, 3=gold
      superBulletDamage?: number; // damage override (for seeker missiles)
      // Seeker missile: reference to the specific enemy this missile is tracking
      seekerTarget?: { x: number; y: number; alive: boolean; dying: boolean } | null;
      // Bounce: how many bounces remaining off screen edges
      bouncesRemaining?: number;
      // Pierce: how many enemies can still be pierced through
      pierceRemaining?: number;
      // Track which enemies this bullet has already hit (pierce)
      alreadyHit?: Set<number>;
      // Ricochet: how many enemy bounces remaining
      ricochetRemaining?: number;
      // Projectile size scaling: track spawn position
      spawnX?: number;
      spawnY?: number;
    }[],
    particles: [] as {
      x: number; y: number; vx: number; vy: number;
      life: number; maxLife: number; color: string; size: number;
    }[],
    powerups: [] as PowerUp[],
    activePowerUps: [] as ActivePowerUp[],
    enemySpeed: 18,
    enemyDropAccum: 0,
    powerUpSpawnAccum: 0,
    enemyFireChance: 0.003,
    enemyProjectileSpeed: 60,
    enemyProjectileDamage: 1,
    enemyCollisionDamage: 1,
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
      coldStacks: number; coldTimer: number; coldAccum: number;
      burnStacks: number; burnTimer: number; burnAccum: number;
      orbitalHitCooldown: number; // rate-limits orbital damage per frame
      // Sprite animation
      skinIndex: number;        // 1-18, randomly chosen at wave start
      animState: BossAnimState; // current animation ("walking" | "throwing" | "hurt" | "dying")
      animAccum: number;        // seconds elapsed in current animation
      // Per-wave-group overrides (fallback to bossCfg defaults)
      trackSpeed: number;
      fireInterval: number;
      projectileSpeed: number;
      projectileDamage: number;
      collisionDamage: number;
      // Boss phases
      phase: number;
      isCharging: boolean;
      chargeTimer: number;
      chargeTargetX: number;
      chargeTargetY: number;
      chargeCooldown: number;
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
    blackHoleAccum: 0,
    // ── Pyromaniac: burning enemies (now tracked on enemy objects)
    // ── Cold Feet: frozen enemies (now tracked on enemy objects)
    // ── Roguelike: connect beam visuals ──────────────────────────────
    lightningBeams: [] as { x1: number; y1: number; x2: number; y2: number; timer: number }[],
    // ── Resonance: shockwave ring visuals ─────────────────────────────
    shockwaves: [] as { x: number; y: number; timer: number; maxRadius: number }[],
    // ── GIF impact effects ────────────────────────────────────────────
    activeEffects: [] as ActiveEffect[],
    // ── Shield animation ──────────────────────────────────────────────
    shieldDuration: 4, // stores the initial duration of the last temp-shield activation
    // ── Damage numbers (floating text) ──────────────────────────────
    damageNumbers: [] as { x: number; y: number; value: string; timer: number; maxTimer: number; color: string }[],
    // ── Orbital orbs ─────────────────────────────────────────────────
    orbitalAccum: 0,       // cooldown accumulator
    orbitalActive: false,  // true while orbs are active
    orbitalTimer: 0,       // time remaining in active phase
    orbitalBaseAngle: 0,   // rotating base angle (radians)
    // ── Seeker Missile ────────────────────────────────────────────────
    seekerMissileAccum: 0, // cooldown accumulator
    // ── Run stats ────────────────────────────────────────────────────
    totalDamageDealt: 0,   // accumulated player damage this run
    // ── Horde spawn state ────────────────────────────────────────────
    enemiesToSpawn: 0,     // how many enemies still need to spawn this wave
    spawnTimer: 0,         // countdown until next enemy spawn
    spawnRate: 1,          // enemies per second
    waveCompleteDelay: 0,  // delay before auto-advancing to next wave
    // ── Combo system ───────────────────────────────────────────────────
    comboCount: 0,
    comboTimer: 0,
    maxComboThisRun: 0,
    // ── Vampirism ──────────────────────────────────────────────────────
    vampKillsSinceHeal: 0,
    // ── Time Warp ──────────────────────────────────────────────────────
    timeWarpTimer: 0,
    // ── Overcharge ─────────────────────────────────────────────────────
    overchargeShots: 0,
    // ── Groupie pets ───────────────────────────────────────────────────
    groupies: [] as {
      x: number; y: number;
      angle: number;
      state: "orbit" | "hunt" | "return";
      targetX: number; targetY: number;
      shootCooldown: number;
    }[],
    // ── Perfect Wave Bonus ─────────────────────────────────────────────
    waveDamageTaken: false,
    waveKillScore: 0,
    // ── Perfect wave announcer ─────────────────────────────────────────
    announcerText: null as { text: string; timer: number; maxTimer: number; color: string; scale: number } | null,
    // ── Second Wind / Phoenix tracking ─────────────────────────────────
    secondWindUsed: false,
    phoenixUsed: false,
    // ── Bloodlust: kill streak damage bonus ────────────────────────────
    bloodlustKillCount: 0,
    // ── Last Stand: active when at 1 heart or less ────────────────────
    lastStandActive: false,
    // ── Boss intro animation ───────────────────────────────────────────
    bossIntroTimer: 0,
    bossIntroText: "",
  });

  // Resize canvas to fill viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const vw = window.visualViewport;
      let w = vw ? Math.round(vw.width) : window.innerWidth;
      let h = vw ? Math.round(vw.height) : window.innerHeight;
      // Cap canvas resolution on mobile to reduce GPU fill-rate load
      const isMobile = typeof window !== "undefined" && (window.innerWidth < 768 || "ontouchstart" in window);
      if (isMobile) {
        const MAX_MOBILE_W = 640;
        const MAX_MOBILE_H = 854;
        if (w > MAX_MOBILE_W || h > MAX_MOBILE_H) {
          const scale = Math.min(MAX_MOBILE_W / w, MAX_MOBILE_H / h, 1);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
      }
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
    s.waveDamageTaken = false;
    s.waveKillScore = 0;
    const edgeMargin = 4;
    const { w: CW, h: CH } = dimsRef.current;
    const sc = CH / BASE_H;
    const logW = CW / sc;
    const cfg = settingsRef.current.enemy;
    const bossCfg = effectiveSettingsRef.current?.boss;

    // Check if this is a boss wave
    const isBossWave = bossCfg?.enabled && w > 0 && w % (bossCfg?.interval ?? 10) === 0;

    // Check for per-wave-group difficulty override (applies to both boss and regular waves)
    const groupIdx = Math.floor((w - 1) / 10);
    const groupConfig = effectiveSettingsRef.current?.enemyDifficultyPerWaveGroup?.[groupIdx];

    if (isBossWave) {
      const bossNumber = Math.floor(w / (bossCfg?.interval ?? 10));
      const bossGroupIdx = bossNumber - 1;
      const bossGroupConfig = effectiveSettingsRef.current?.bossDifficultyPerWaveGroup?.[bossGroupIdx];

      // Resolve boss health: full config → legacy HP override → formula
      let bossHealth: number;
      if (bossGroupConfig) {
        bossHealth = bossGroupConfig.hp;
      } else {
        const perGroupHp = effectiveSettingsRef.current?.bossHealthPerWaveGroup;
        bossHealth = (perGroupHp && perGroupHp[bossGroupIdx] != null)
          ? perGroupHp[bossGroupIdx]
          : (bossCfg?.baseHealth ?? 500) + bossGroupIdx * (bossCfg?.healthIncrease ?? 500);
      }

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
        coldStacks: 0,
        coldTimer: 0,
        coldAccum: 0,
        burnStacks: 0,
        burnTimer: 0,
        burnAccum: 0,
        skinIndex,
        animState: "walking",
        animAccum: 0,
        orbitalHitCooldown: 0, // prevents orbital from dealing damage every frame
        trackSpeed: bossGroupConfig?.speed ?? (bossCfg?.trackSpeed ?? 30),
        fireInterval: bossGroupConfig?.fireInterval ?? (bossCfg?.fireInterval ?? 3),
        projectileSpeed: bossGroupConfig?.projectileSpeed ?? (bossCfg?.projectileSpeed ?? 80),
        projectileDamage: bossGroupConfig?.projectileDamage ?? (effectiveSettingsRef.current?.enemyProjectileDamage ?? 1),
        collisionDamage: bossGroupConfig?.collisionDamage ?? (effectiveSettingsRef.current?.enemyCollisionDamage ?? 1),
        phase: 1,
        isCharging: false,
        chargeTimer: 0,
        chargeTargetX: 0,
        chargeTargetY: 0,
        chargeCooldown: 2.0,
      };
      // Boss intro animation
      s.bossIntroTimer = 3.0;
      s.bossIntroText = bossCfg?.names?.[bossNumber - 1] ?? `BOSS ${bossNumber}`;
    } else {
      // Horde wave: set up spawn counters instead of spawning all at once
      const waveConfig = effectiveSettingsRef.current?.waveConfigs?.[w - 1];
      const spawnCount = waveConfig?.spawnCount ?? Math.min(8 + (w - 1) * 4, 60);
      const spawnRate = waveConfig?.spawnRate ?? Math.min(1 + (w - 1) * 0.2, 5);
      const spawnDelay = waveConfig?.spawnDelay ?? 1;
      s.enemiesToSpawn = spawnCount;
      s.spawnRate = spawnRate;
      s.spawnTimer = spawnDelay;
    }

    // Scale difficulty with wave (capped for infinite playability)
    const waveConfig = effectiveSettingsRef.current?.waveConfigs?.[w - 1];
    if (groupConfig) {
      s.enemySpeed = groupConfig.speed;
      s.enemyFireChance = groupConfig.fireRate;
      s.enemyProjectileSpeed = groupConfig.projectileSpeed;
      s.enemyProjectileDamage = waveConfig?.enemyProjectileDamage ?? groupConfig.projectileDamage;
      s.enemyCollisionDamage = groupConfig.collisionDamage;
    } else {
      s.enemySpeed = Math.min(cfg.speed + (w - 1) * 1.2, 90);
      s.enemyFireChance = Math.min(cfg.fireRate * (1 + (w - 1) * 0.025), 0.012);
      s.enemyProjectileSpeed = cfg.projectileSpeed + (w - 1) * (effectiveSettingsRef.current?.enemyProjectileSpeedPerWave ?? 0);
      s.enemyProjectileDamage = waveConfig?.enemyProjectileDamage ?? Math.max(1, Math.round(
        (effectiveSettingsRef.current?.enemyProjectileDamage ?? 1) + (w - 1) * (effectiveSettingsRef.current?.enemyProjectileDamagePerWave ?? 0),
      ));
      s.enemyCollisionDamage = Math.max(1, Math.round(
        (effectiveSettingsRef.current?.enemyCollisionDamage ?? 1) + (w - 1) * (effectiveSettingsRef.current?.enemyCollisionDamagePerWave ?? 0),
      ));
    }
    s.wave = w;
    s.spawnAnim = 0;
    s.playAreaW = logW;
    // Bloodlust: reset kill streak at wave start
    s.bloodlustKillCount = 0;
    // Reset the nuke timer so it fires at the predictable 30s mark into the new wave,
    // not immediately because the previous wave happened to leave the accumulator near 30s.
    s.nukeAccum = 0;
    // Reset player to starting position at wave start so player isn't surrounded
    const xScale = logW / BASE_W;
    s.playerX = settingsRef.current.player.x * xScale;
    s.playerY = settingsRef.current.player.y;
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
    s.enemyDropAccum = 0;
    s.powerUpSpawnAccum = 0;
    s.enemyProjectileSpeed = 60;
    s.enemyProjectileDamage = 1;
    s.enemyCollisionDamage = 1;
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
    s.shockwaves = [];
    s.activeEffects = [];
    s.damageNumbers = [];
    s.orbitalAccum = 0;
    s.orbitalActive = false;
    s.orbitalTimer = 0;
    s.orbitalBaseAngle = 0;
    s.seekerMissileAccum = 0;
    s.blackHoleAccum = 0;

    // Reset combo and vampirism
    s.comboCount = 0;
    s.comboTimer = 0;
    s.maxComboThisRun = 0;
    s.vampKillsSinceHeal = 0;
    s.announcerText = null;
    s.overchargeShots = 0;
    s.groupies = [];
    s.secondWindUsed = false;
    s.phoenixUsed = false;
    s.bloodlustKillCount = 0;
    s.lastStandActive = false;
    s.bossIntroTimer = 0;
    s.bossIntroText = "";
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
      stateRef.current.enemiesToSpawn === 0 &&
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
      // DEBUG: log enemy hitbox config once per session to verify live updates
      if (typeof window !== "undefined" && !(window as any).__enemyHitboxLogged) {
        (window as any).__enemyHitboxLogged = true;
        // eslint-disable-next-line no-console
        console.log("[Game] Enemy config:", {
          width: enemyCfg.width,
          height: enemyCfg.height,
          hitboxOffsetX: enemyCfg.hitboxOffsetX,
          hitboxOffsetY: enemyCfg.hitboxOffsetY,
          hitboxWidth: enemyCfg.hitboxWidth,
          hitboxHeight: enemyCfg.hitboxHeight,
        });
      }
      const ew = enemyCfg.width;
      const eh = enemyCfg.height;
      // Use the same hitbox for body collision as for bullet collision —
      // so the Live Preview Editor only needs one hitbox adjustment.
      const ecw = enemyCfg.hitboxWidth ?? ew;
      const ech = enemyCfg.hitboxHeight ?? eh;
      const ecbOffX = enemyCfg.hitboxOffsetX ?? 0;
      const ecbOffY = enemyCfg.hitboxOffsetY ?? 0;

      // ── Player hitbox (used by all collision sections) ─────────────────
      const hbCfg = effectiveSettingsRef.current?.playerHitbox;
      const hbPoints = hbCfg?.points;
      const usePolygon = hbPoints && hbPoints.length >= 3;
      const px = s.playerX + (hbCfg?.offsetX ?? 0);
      const py = s.playerY + (hbCfg?.offsetY ?? 0);
      const pw = hbCfg?.width  ?? PLAYER_W_BASE;
      const ph = hbCfg?.height ?? PLAYER_H_BASE;
      // ── Cache power-up lookups (scan once per frame) ─────────────────
      let hasShield = false;
      let isInvincible = false;
      let timeWarpPU: ActivePowerUp | undefined;
      let wideShotPU: ActivePowerUp | undefined;
      let projectilePU: ActivePowerUp | undefined;
      let rapidPU: ActivePowerUp | undefined;
      let doubleShotPU: ActivePowerUp | undefined;
      let groupiePU: ActivePowerUp | undefined;
      let ricochetPU: ActivePowerUp | undefined;
      let shieldPU: ActivePowerUp | undefined;
      for (const p of s.activePowerUps) {
        switch (p.type) {
          case "shield": hasShield = true; shieldPU = p; break;
          case "invincible": isInvincible = true; break;
          case "timewarp": timeWarpPU = p; break;
          case "wideshot": wideShotPU = p; break;
          case "projectile": projectilePU = p; break;
          case "rapid": rapidPU = p; break;
          case "doubleshot": doubleShotPU = p; break;
          case "groupie": groupiePU = p; break;
          case "ricochet": ricochetPU = p; break;
        }
      }
      const timeWarpFactor = timeWarpPU ? 0.5 : 1.0;

      // Helper: check if a point is inside a polygon (ray-cast)
      function pointInPolygon(lx: number, ly: number, poly: { x: number; y: number }[]) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const xi = poly[i].x, yi = poly[i].y;
          const xj = poly[j].x, yj = poly[j].y;
          if (((yi > ly) !== (yj > ly)) && (lx < (xj - xi) * (ly - yi) / (yj - yi) + xi)) {
            inside = !inside;
          }
        }
        return inside;
      }

      // Helper: check if enemy rectangle intersects player polygon
      function enemyRectIntersectsPolygon(ex: number, ey: number, ew2: number, eh2: number) {
        if (!hbPoints) return false;
        // 1) Any polygon vertex inside enemy rect?
        for (const p of hbPoints) {
          const vx = s.playerX + p.x;
          const vy = s.playerY + p.y;
          if (vx >= ex && vx <= ex + ew2 && vy >= ey && vy <= ey + eh2) return true;
        }
        // 2) Any enemy rect corner inside polygon?
        const corners = [
          { x: ex, y: ey },
          { x: ex + ew2, y: ey },
          { x: ex + ew2, y: ey + eh2 },
          { x: ex, y: ey + eh2 },
        ];
        for (const c of corners) {
          if (pointInPolygon(c.x - s.playerX, c.y - s.playerY, hbPoints)) return true;
        }
        return false;
      }

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
      let movedX = 0;
      let movedY = 0;
      if (sharedTouch.targetX !== null && sharedTouch.targetY !== null) {
        const targetX = Math.max(0, Math.min(playAreaW - PLAYER_W_BASE, sharedTouch.targetX * (logW / BASE_W)));
        const targetY = Math.max(0, Math.min(BASE_H - PLAYER_H_BASE, sharedTouch.targetY));
        const prevX = s.playerX;
        const prevY = s.playerY;
        s.playerX += (targetX - s.playerX) * Math.min(1, pSpeed * 2.5 * dt);
        s.playerY += (targetY - s.playerY) * Math.min(1, pSpeed * 2.5 * dt);
        movedX = s.playerX - prevX;
        movedY = s.playerY - prevY;
      } else {
        const prevX = s.playerX;
        const prevY = s.playerY;
        if (keys.left) s.playerX -= pSpeed * dt;
        if (keys.right) s.playerX += pSpeed * dt;
        if (keys.up) s.playerY -= pSpeed * dt;
        if (keys.down) s.playerY += pSpeed * dt;
        movedX = s.playerX - prevX;
        movedY = s.playerY - prevY;
      }
      // Update facing based on movement direction
      if (Math.abs(movedX) > 0.01 || Math.abs(movedY) > 0.01) {
        s.playerAnimAccum += dt;
        if (Math.abs(movedX) > Math.abs(movedY)) {
          s.playerFacing = movedX > 0 ? "right" : "left";
        } else {
          s.playerFacing = movedY > 0 ? "down" : "up";
        }
      }
      s.playerX = Math.max(0, Math.min(playAreaW - PLAYER_W_BASE, s.playerX));
      s.playerY = Math.max(0, Math.min(BASE_H - PLAYER_H_BASE, s.playerY));

      // ── Horde spawning ──
      if (s.enemiesToSpawn > 0) {
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          const spawnPoints = settingsRef.current.spawnPoints.filter((sp) => sp.enabled);
          if (spawnPoints.length > 0) {
            const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
            const groupIdx2 = Math.floor((s.wave - 1) / 10);
            const groupConfig2 = effectiveSettingsRef.current?.enemyDifficultyPerWaveGroup?.[groupIdx2];
            const waveConfig2 = effectiveSettingsRef.current?.waveConfigs?.[s.wave - 1];
            let waveHp2: number;
            if (waveConfig2?.enemyHp != null) {
              waveHp2 = Math.max(1, Math.round(waveConfig2.enemyHp));
            } else if (groupConfig2) {
              waveHp2 = Math.max(1, Math.round(groupConfig2.hp));
            } else {
              const baseHp2 = effectiveSettingsRef.current?.enemyBaseHp ?? 1;
              const hpPerWave2 = effectiveSettingsRef.current?.enemyHpPerWave ?? 0;
              waveHp2 = Math.max(1, Math.round(baseHp2 + (s.wave - 1) * hpPerWave2));
            }
            const ew2 = settingsRef.current.enemy.width;
            const eh2 = settingsRef.current.enemy.height;
            const xScale2 = logW / BASE_W;
            const isElite = s.wave >= (effectiveSettingsRef.current?.eliteSpawnWaveStart ?? 5) && Math.random() < (effectiveSettingsRef.current?.eliteSpawnChance ?? 0.15);
            const eliteTypes: Array<"shielded" | "explosive" | "regenerating" | "splitter"> = ["shielded", "explosive", "regenerating", "splitter"];
            const eliteType = isElite ? eliteTypes[Math.floor(Math.random() * eliteTypes.length)] : null;
            s.enemies.push({
              x: sp.x * xScale2 - ew2 / 2,
              y: sp.y,
              variant: Math.floor(Math.random() * 3) as 0 | 1 | 2,
              alive: true,
              cooldown: Math.random() * 2,
              projectileIndex: Math.floor(Math.random() * 16),
              virusStacks: 0,
              virusTimer: 0,
              virusAccum: 0,
              coldStacks: 0,
              coldTimer: 0,
              coldAccum: 0,
              burnStacks: 0,
              burnTimer: 0,
              burnAccum: 0,
              hp: waveHp2,
              maxHp: waveHp2,
              animState: "walking",
              animAccum: Math.random() * 2.5,
              dying: false,
              facing: "down",
              orbitalHitCooldown: 0,
              isElite: isElite,
              eliteType: eliteType,
              eliteShieldActive: isElite && eliteType === "shielded",
              eliteShieldTimer: 0,
              eliteHealAccum: 0,
            });
            s.enemiesToSpawn--;
            s.spawnTimer = 1 / s.spawnRate;
          }
        }
      }

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
              const bossCfg3 = effectiveSettingsRef.current?.boss;
              const bossW = bossCfg3?.width ?? 40;
              const bossH = bossCfg3?.height ?? 30;
              const bhbx3 = s.boss.x + (bossCfg3?.hitboxOffsetX ?? 0);
              const bhby3 = s.boss.y + (bossCfg3?.hitboxOffsetY ?? 0);
              const bhbw3 = bossCfg3?.hitboxWidth ?? bossW;
              const bhbh3 = bossCfg3?.hitboxHeight ?? bossH;
              bx = bhbx3 + bhbw3 / 2;
              by = bhby3 + bhbh3 / 2;
            } else {
              bx = Math.random() * playAreaW;
              by = BASE_H * 0.4;
            }
            spawnEffect(s.activeEffects, "bomb", bx, by, effectiveSettingsRef.current?.impacts?.bomb ?? { w: 60, h: 60 });
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
              // Pyromaniac: chance to set boss on fire
              if (playerStats.hasPyromaniac && Math.random() < playerStats.pyromaniacBurnChance) {
                if (s.boss.burnStacks <= 0) {
                  s.boss.burnStacks = 1;
                  s.boss.burnTimer = playerStats.pyromaniacBurnDuration;
                  s.boss.burnAccum = 0;
                }
              }
              // Cold Feet: chance to inflict boss with frost
              if (playerStats.hasColdFeet && Math.random() < playerStats.coldFeetChance) {
                if (s.boss.coldStacks <= 0) {
                  s.boss.coldStacks = 1;
                  s.boss.coldTimer = playerStats.coldFeetDuration;
                  s.boss.coldAccum = 0;
                }
              }
              if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
              if (s.boss.health <= 0) {
                s.score += (effectiveSettingsRef.current?.boss?.scoreReward ?? 500);
                spawnEffect(s.activeEffects, "boss", s.boss.x + 20, s.boss.y + 15, effectiveSettingsRef.current?.impacts?.boss ?? { w: 80, h: 80 });
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
              spawnEffect(s.activeEffects, "lightning", lx, ly, effectiveSettingsRef.current?.impacts?.lightning ?? { w: 40, h: 40 });
              spawnParticles(lx, ly, "#00f0ff", 8);
              spawnParticles(lx, ly, "#ffffff", 4);
            } else if (s.boss) {
              const bossCfg3 = effectiveSettingsRef.current?.boss;
              const bossW = bossCfg3?.width ?? 40;
              const bossH = bossCfg3?.height ?? 30;
              const bhbx3 = s.boss.x + (bossCfg3?.hitboxOffsetX ?? 0);
              const bhby3 = s.boss.y + (bossCfg3?.hitboxOffsetY ?? 0);
              const bhbw3 = bossCfg3?.hitboxWidth ?? bossW;
              const bhbh3 = bossCfg3?.hitboxHeight ?? bossH;
              lx = bhbx3 + Math.random() * bhbw3;
              ly = bhby3 + bhbh3 / 2;
              s.boss.health -= playerStats.lightningDamage;
              s.boss.hitFlash = 0.1;
              if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
              spawnEffect(s.activeEffects, "lightning", lx, ly, effectiveSettingsRef.current?.impacts?.lightning ?? { w: 40, h: 40 });
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
                  spawnEffect(s.activeEffects, "lightning", ex, ey, effectiveSettingsRef.current?.impacts?.lightning ?? { w: 40, h: 40 });
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
      }
      // Decay beams (outside hasLightning block so Chain Reaction beams also decay)
      for (let i = s.lightningBeams.length - 1; i >= 0; i--) {
        s.lightningBeams[i].timer -= dt;
        if (s.lightningBeams[i].timer <= 0) s.lightningBeams.splice(i, 1);
      }
      // Decay shockwaves
      for (let i = s.shockwaves.length - 1; i >= 0; i--) {
        s.shockwaves[i].timer -= dt;
        if (s.shockwaves[i].timer <= 0) s.shockwaves.splice(i, 1);
      }

      // ── Timed effect: Frenzy ─────────────────────────────────────────
      if (playerStats.hasFrenzy) {
        s.frenzyAccum += dt;
        if (s.frenzyAccum >= playerStats.frenzyCooldown) {
          s.frenzyAccum -= playerStats.frenzyCooldown;
          const count = playerStats.frenzyProjectiles;
          const spriteCfg2 = siteData.secretGame?.playerSprite ?? { offsetX: -2, offsetY: -12, width: 14, height: 42 };
          let dirOffX2 = 0;
          let dirOffY2 = 0;
          switch (s.playerFacing) {
            case "up":    dirOffY2 = -spriteCfg2.height * 0.35; break;
            case "down":  dirOffY2 =  spriteCfg2.height * 0.35; break;
            case "left":  dirOffX2 = -spriteCfg2.width  * 0.35; break;
            case "right": dirOffX2 =  spriteCfg2.width  * 0.35; break;
          }
          const px = s.playerX + (effectiveSettingsRef.current?.bulletSpawnOffsetX ?? PLAYER_W_BASE / 2) + dirOffX2;
          const py = s.playerY + (effectiveSettingsRef.current?.bulletSpawnOffsetY ?? PLAYER_H_BASE / 2) + dirOffY2;
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            s.bullets.push({
              x: px, y: py,
              vx: Math.cos(angle) * BULLET_SPEED_BASE,
              vy: Math.sin(angle) * BULLET_SPEED_BASE,
              angle,
              isPlayer: true,
              bouncesRemaining: playerStats.hasBounce ? playerStats.bounceCount : 0,
              pierceRemaining: playerStats.hasPierce ? playerStats.pierceCount : 0,
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
            : (s.boss ? s.boss.x + (effectiveSettingsRef.current?.boss?.width ?? 40) / 2 : playAreaW / 2);
          const nukeCy = aliveForNuke.length > 0
            ? aliveForNuke.reduce((sum, e) => sum + e.y + settingsRef.current.enemy.height / 2, 0) / aliveForNuke.length
            : (s.boss ? s.boss.y + (effectiveSettingsRef.current?.boss?.height ?? 30) / 2 : BASE_H / 3);
          spawnEffect(s.activeEffects, "nuke", nukeCx, nukeCy, effectiveSettingsRef.current?.impacts?.nuke ?? { w: 100, h: 100 });
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
            spawnEffect(s.activeEffects, "nuke", s.boss.x + 20, s.boss.y + 15, effectiveSettingsRef.current?.impacts?.nuke ?? { w: 100, h: 100 });
            spawnParticles(s.boss.x + 20, s.boss.y + 15, "#ffffff", 20);
            spawnParticles(s.boss.x + 20, s.boss.y + 15, "#00f0ff", 12);
            if (s.boss.health <= 0) {
              s.score += (effectiveSettingsRef.current?.boss?.scoreReward ?? 500);
              spawnEffect(s.activeEffects, "boss", s.boss.x + 20, s.boss.y + 15, effectiveSettingsRef.current?.impacts?.boss ?? { w: 80, h: 80 });
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
            spawnEffect(s.activeEffects, "virus", e.x + settingsRef.current.enemy.width / 2, e.y + settingsRef.current.enemy.height / 2, effectiveSettingsRef.current?.impacts?.virus ?? { w: 30, h: 30 });
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
            spawnEffect(s.activeEffects, "virus", s.boss.x + 20, s.boss.y + 10, effectiveSettingsRef.current?.impacts?.virus ?? { w: 30, h: 30 });
            spawnParticles(s.boss.x + 20, s.boss.y + 10, "#39ff14", 4);
            if (s.boss.health <= 0) {
              s.score += (effectiveSettingsRef.current?.boss?.scoreReward ?? 500);
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

      // ── Boss Pyromaniac burn tick ────────────────────────────────────
      if (s.boss && s.boss.burnStacks > 0) {
        s.boss.burnTimer -= dt;
        s.boss.burnAccum += dt;
        if (s.boss.burnAccum >= playerStats.pyromaniacTickInterval) {
          s.boss.burnAccum -= playerStats.pyromaniacTickInterval;
          s.boss.health -= playerStats.pyromaniacBurnDamagePerTick;
          s.boss.hitFlash = 0.05;
          if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
          spawnParticles(s.boss.x + 20, s.boss.y + 15, "#ff4400", 4);
          if (s.boss.health <= 0) {
            s.score += (effectiveSettingsRef.current?.boss?.scoreReward ?? 500);
            onScoreChange(s.score);
            play("levelComplete");
            s.boss = null;
            onPhaseChange("bossreward");
            return;
          }
        }
        if (s.boss.burnTimer <= 0) { s.boss.burnStacks = 0; s.boss.burnAccum = 0; }
      }

      // ── Boss Cold Feet frost tick ────────────────────────────────────
      if (s.boss && s.boss.coldStacks > 0) {
        s.boss.coldTimer -= dt;
        s.boss.coldAccum += dt;
        if (s.boss.coldAccum >= playerStats.coldFeetTickInterval) {
          s.boss.coldAccum -= playerStats.coldFeetTickInterval;
          s.boss.health -= playerStats.coldFeetDamagePerTick;
          s.boss.hitFlash = 0.05;
          if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
          spawnParticles(s.boss.x + 20, s.boss.y + 15, "#00b4d8", 4);
          if (s.boss.health <= 0) {
            s.score += (effectiveSettingsRef.current?.boss?.scoreReward ?? 500);
            onScoreChange(s.score);
            play("levelComplete");
            s.boss = null;
            onPhaseChange("bossreward");
            return;
          }
        }
        if (s.boss.coldTimer <= 0) { s.boss.coldStacks = 0; s.boss.coldAccum = 0; }
      }

      // ── Black Hole (timed pull effect) ──────────────────────────────
      if (playerStats.hasBlackHole) {
        s.blackHoleAccum += dt;
        if (s.blackHoleAccum >= playerStats.blackHoleCooldown) {
          s.blackHoleAccum -= playerStats.blackHoleCooldown;
          const centerX = s.playAreaW / 2;
          const centerY = BASE_H / 2;
          // Pull all enemies toward center
          for (const e of s.enemies) {
            if (!e.alive) continue;
            const ex = e.x + settingsRef.current.enemy.width / 2;
            const ey = e.y + settingsRef.current.enemy.height / 2;
            const dx = centerX - ex;
            const dy = centerY - ey;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < playerStats.blackHolePullRadius && dist > 1) {
              const pullStrength = (1 - dist / playerStats.blackHolePullRadius) * 100 * dt;
              e.x += (dx / dist) * pullStrength;
              e.y += (dy / dist) * pullStrength;
            }
            // Damage enemies near center
            if (dist < 20) {
              e.hp = (e.hp ?? 1) - playerStats.blackHoleDamage;
              if (e.hp <= 0) {
                e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
                s.score += Math.floor(10 * s.wave);
              }
            }
          }
          // Damage boss if present
          if (s.boss) {
            const bdx = centerX - (s.boss.x + (effectiveSettingsRef.current?.boss?.width ?? 40) / 2);
            const bdy = centerY - (s.boss.y + (effectiveSettingsRef.current?.boss?.height ?? 30) / 2);
            const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
            if (bdist < playerStats.blackHolePullRadius) {
              s.boss.health -= playerStats.blackHoleDamage * 2;
              s.boss.hitFlash = 0.15;
              if (s.boss.health <= 0) {
                s.score += (effectiveSettingsRef.current?.boss?.scoreReward ?? 500);
                onScoreChange(s.score);
                play("levelComplete");
                s.boss = null;
                onPhaseChange("bossreward");
                return;
              }
            }
          }
          spawnParticles(centerX, centerY, "#8b5cf6", 12);
          onScoreChange(s.score);
        }
      }

      // ── Pyromaniac: tick burning enemies ─────────────────────────────
      if (playerStats.hasPyromaniac) {
        for (const e of s.enemies) {
          if (!e.alive || e.burnStacks <= 0) continue;
          e.burnTimer -= dt;
          e.burnAccum += dt;
          if (e.burnAccum >= playerStats.pyromaniacTickInterval) {
            e.burnAccum -= playerStats.pyromaniacTickInterval;
            e.hp = (e.hp ?? 1) - playerStats.pyromaniacBurnDamagePerTick;
            spawnParticles(e.x + settingsRef.current.enemy.width / 2, e.y + settingsRef.current.enemy.height / 2, "#ff4400", 3);
            if (e.hp <= 0) {
              e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
              s.score += Math.floor(10 * s.wave);
            }
          }
          if (e.burnTimer <= 0) { e.burnStacks = 0; e.burnAccum = 0; }
        }
      }

      // ── Cold Feet: tick frozen enemies ─────────────────────────────────
      if (playerStats.hasColdFeet) {
        for (const e of s.enemies) {
          if (!e.alive || e.coldStacks <= 0) continue;
          e.coldTimer -= dt;
          e.coldAccum += dt;
          if (e.coldAccum >= playerStats.coldFeetTickInterval) {
            e.coldAccum -= playerStats.coldFeetTickInterval;
            e.hp = (e.hp ?? 1) - playerStats.coldFeetDamagePerTick;
            spawnParticles(e.x + settingsRef.current.enemy.width / 2, e.y + settingsRef.current.enemy.height / 2, "#00b4d8", 3);
            if (e.hp <= 0) {
              e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
              s.score += Math.floor(10 * s.wave);
            }
          }
          if (e.coldTimer <= 0) { e.coldStacks = 0; e.coldAccum = 0; }
        }
      }

      // ── Active power-up timers ──
      if (s.activePowerUps.length > 0) {
        for (let i = s.activePowerUps.length - 1; i >= 0; i--) {
          const ap = s.activePowerUps[i];
          if (ap.type === "shield") continue; // shield has no timer
          if (ap.type === "overcharge") continue; // overcharge uses shot count, not timer
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
              const bossCfg2 = effectiveSettingsRef.current?.boss;
              const bw2 = bossCfg2?.width ?? 40;
              const bh2 = bossCfg2?.height ?? 30;
              const bhbx2 = s.boss.x + (bossCfg2?.hitboxOffsetX ?? 0);
              const bhby2 = s.boss.y + (bossCfg2?.hitboxOffsetY ?? 0);
              const bhbw2 = bossCfg2?.hitboxWidth ?? bw2;
              const bhbh2 = bossCfg2?.hitboxHeight ?? bh2;
              targetX = bhbx2 + bhbw2 / 2; targetY = bhby2 + bhbh2 / 2;
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
              angle: Math.atan2(mvy, mvx),
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
              const bossCfg2 = effectiveSettingsRef.current?.boss;
              const bw2 = bossCfg2?.width ?? 40;
              const bh2 = bossCfg2?.height ?? 30;
              const bhbx2 = s.boss.x + (bossCfg2?.hitboxOffsetX ?? 0);
              const bhby2 = s.boss.y + (bossCfg2?.hitboxOffsetY ?? 0);
              const bhbw2 = bossCfg2?.hitboxWidth ?? bw2;
              const bhbh2 = bossCfg2?.hitboxHeight ?? bh2;
              const nearBX = Math.max(bhbx2, Math.min(ox, bhbx2 + bhbw2));
              const nearBY = Math.max(bhby2, Math.min(oy, bhby2 + bhbh2));
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
                  s.score += effectiveSettingsRef.current?.boss?.scoreReward ?? 500;
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

      // ── Combo timer decay ───────────────────────────────────────────
      if (s.comboTimer > 0) {
        s.comboTimer -= dt;
        if (s.comboTimer <= 0) {
          s.comboCount = 0;
        }
      }

      // ── Announcer text timer ──
      if (s.announcerText) {
        s.announcerText.timer -= dt;
        if (s.announcerText.timer <= 0) {
          s.announcerText = null;
        }
      }

      // ── Player auto-fire ────────────────────────────────────────────
      // Automatically targets the closest threat (enemy, boss, or enemy projectile).
      // Stops firing when no threats remain on screen.
      s.playerCooldown -= dt;

      const spriteCfg = siteData.secretGame?.playerSprite ?? { offsetX: -2, offsetY: -12, width: 14, height: 42 };
      let dirOffX = 0;
      let dirOffY = 0;
      switch (s.playerFacing) {
        case "up":    dirOffY = -spriteCfg.height * 0.35; break;
        case "down":  dirOffY =  spriteCfg.height * 0.35; break;
        case "left":  dirOffX = -spriteCfg.width  * 0.35; break;
        case "right": dirOffX =  spriteCfg.width  * 0.35; break;
      }
      const bpx = s.playerX + (effectiveSettingsRef.current?.bulletSpawnOffsetX ?? PLAYER_W_BASE / 2) + dirOffX;
      const bpy = s.playerY + (effectiveSettingsRef.current?.bulletSpawnOffsetY ?? PLAYER_H_BASE / 2) + dirOffY;

      // Find all threats and sort by distance so each bullet can target a different one
      type Threat = { x: number; y: number; distSq: number };
      const threats: Threat[] = [];

      // Check alive enemies
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const ex = e.x + ew / 2;
        const ey = e.y + eh / 2;
        const ddx = ex - bpx;
        const ddy = ey - bpy;
        threats.push({ x: ex, y: ey, distSq: ddx * ddx + ddy * ddy });
      }

      // Check boss
      if (s.boss && s.boss.health > 0) {
        const bossCfg2 = effectiveSettingsRef.current?.boss;
        const bw2 = bossCfg2?.width ?? 40;
        const bh2 = bossCfg2?.height ?? 30;
        const bhbx2 = s.boss.x + (bossCfg2?.hitboxOffsetX ?? 0);
        const bhby2 = s.boss.y + (bossCfg2?.hitboxOffsetY ?? 0);
        const bhbw2 = bossCfg2?.hitboxWidth ?? bw2;
        const bhbh2 = bossCfg2?.hitboxHeight ?? bh2;
        const bx2 = bhbx2 + bhbw2 / 2;
        const by2 = bhby2 + bhbh2 / 2;
        const ddx = bx2 - bpx;
        const ddy = by2 - bpy;
        threats.push({ x: bx2, y: by2, distSq: ddx * ddx + ddy * ddy });
      }

      // Check enemy projectiles
      for (const b of s.bullets) {
        if (b.isPlayer) continue;
        const ddx = b.x - bpx;
        const ddy = b.y - bpy;
        threats.push({ x: b.x, y: b.y, distSq: ddx * ddx + ddy * ddy });
      }

      threats.sort((a, b) => a.distSq - b.distSq);
      const bestDist = threats[0]?.distSq ?? Infinity;
      const hasThreat = threats.length > 0;

      const autoFireRange = effectiveSettingsRef.current?.autoFireRange ?? 0;
      if (hasThreat && s.playerCooldown <= 0 && (autoFireRange <= 0 || bestDist <= autoFireRange * autoFireRange)) {
        const rapidStacks = rapidPU?.stacks ?? 0;
        let baseCooldown = rapidStacks > 0
          ? Math.min(playerStats.reloadTime, Math.max(0.06, 0.12 - 0.02 * (rapidStacks - 1)))
          : playerStats.reloadTime;
        // Last Stand: faster fire rate when at 1 heart or less
        if (playerStats.hasLastStand && s.lives <= 1) {
          baseCooldown *= (1 - playerStats.lastStandFireRateBonus);
        }

        const permProj = playerStats.projectileCount - 1;
        let totalBullets = wideShotPU ? (2 + wideShotPU.stacks + permProj) : playerStats.projectileCount;
        if (projectilePU) {
          totalBullets += projectilePU.stacks;
        }
        totalBullets = Math.min(totalBullets, 3);
        const speed = BULLET_SPEED_BASE;

        const doubleShotStacks = doubleShotPU?.stacks ?? 0;
        const overchargeActive = s.overchargeShots > 0;

        const fireBulletNow = (angle: number, offsetX = 0, offsetY = 0) => {
          const bounces = playerStats.hasBounce ? playerStats.bounceCount : 0;
          const pierce = playerStats.hasPierce ? playerStats.pierceCount : 0;
          const isOvercharge = overchargeActive;
          const spawnBX = bpx + offsetX;
          const spawnBY = bpy + offsetY;
          s.bullets.push({
            x: spawnBX,
            y: spawnBY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            angle,
            isPlayer: true,
            isSuperBullet: playerStats.superBulletTier > 0 || isOvercharge,
            superBulletTier: isOvercharge ? Math.max(playerStats.superBulletTier, 1) : playerStats.superBulletTier,
            superBulletDamage: isOvercharge ? playerStats.damageMultiplier * 2 : undefined,
            bouncesRemaining: bounces,
            pierceRemaining: isOvercharge ? Math.max(pierce, 2) : pierce,
            alreadyHit: isOvercharge ? new Set<number>() : undefined,
            spawnX: spawnBX,
            spawnY: spawnBY,
          });
          if (isOvercharge) {
            s.overchargeShots--;
          }
        };

        // Each bullet targets a different threat (1st bullet → closest, 2nd → 2nd closest, etc.)
        for (let i = 0; i < totalBullets; i++) {
          const target = threats[Math.min(i, threats.length - 1)];
          const tdx = target.x - bpx;
          const tdy = target.y - bpy;
          const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
          let angle = -Math.PI / 2; // default straight up
          if (tdist > 1) {
            angle = Math.atan2(tdy, tdx);
          }
          // Wide shot adds a small spread even when multi-targeting
          if (totalBullets > 1 && wideShotPU) {
            const spread = 0.13;
            const spreadOffset = -spread + (spread * 2 * i) / (totalBullets - 1);
            angle += spreadOffset;
          }
          // Double Shot: fire parallel bullets (side by side, perpendicular to aim)
          if (doubleShotStacks > 0) {
            const parallelCount = Math.min(doubleShotStacks + 1, 3);
            const perpX = Math.cos(angle + Math.PI / 2);
            const perpY = Math.sin(angle + Math.PI / 2);
            const spacing = 5;
            const startOffset = -(parallelCount - 1) * spacing / 2;
            for (let d = 0; d < parallelCount; d++) {
              const offset = startOffset + d * spacing;
              fireBulletNow(angle, perpX * offset, perpY * offset);
            }
          } else {
            fireBulletNow(angle);
          }
        }
        play("shoot");

        s.playerCooldown = baseCooldown;
      }

      // ── Enemy movement (individual tracking) ──
      const edgeMargin = 4;
      const pCx = s.playerX + PLAYER_W_BASE / 2;
      const pCy = s.playerY + PLAYER_H_BASE / 2;
      for (const e of s.enemies) {
        if (!e.alive) continue;
        // Determine direction to player
        const ex = e.x + ew / 2;
        const ey = e.y + eh / 2;
        const dx = pCx - ex;
        const dy = pCy - ey;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let vx = 0;
        let vy = 0;
        if (dist > 1) {
          vx = (dx / dist) * s.enemySpeed * timeWarpFactor;
          vy = (dy / dist) * s.enemySpeed * timeWarpFactor;
        }
        e.x += vx * dt;
        e.y += vy * dt;
        // Clamp to play area
        e.x = Math.max(edgeMargin, Math.min(playAreaW - edgeMargin - ew, e.x));
        e.y = Math.max(edgeMargin, Math.min(BASE_H - edgeMargin - eh, e.y));
        // Update facing for sprite rendering
        if (Math.abs(dx) > Math.abs(dy)) {
          e.facing = dx > 0 ? "right" : "left";
        } else {
          e.facing = dy < 0 ? "up" : "down";
        }
        // Elite regenerating heal
        if (e.eliteType === "regenerating") {
          e.eliteHealAccum += dt;
          if (e.eliteHealAccum >= 2.0) {
            e.eliteHealAccum = 0;
            if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + 1);
          }
        }
        // Elite shielded recharge
        if (e.eliteType === "shielded" && !e.eliteShieldActive) {
          e.eliteShieldTimer -= dt;
          if (e.eliteShieldTimer <= 0) {
            e.eliteShieldActive = true;
          }
        }
      }

      const groupieStacks = groupiePU?.stacks ?? 0;
      const expectedGroupies = groupieStacks;
      // Remove excess groupies if power-up expired
      while (s.groupies.length > expectedGroupies) {
        s.groupies.pop();
      }
      for (let gi = 0; gi < s.groupies.length; gi++) {
        const g = s.groupies[gi];
        const pcx = s.playerX + PLAYER_W_BASE / 2;
        const pcy = s.playerY + PLAYER_H_BASE / 2;
        g.shootCooldown -= dt;

        // Find nearest target (enemy or enemy projectile)
        let nearestDist = Infinity;
        let nearestTarget = null as { x: number; y: number; type: "enemy" | "projectile"; idx: number } | null;

        // Check enemies
        for (let ei = 0; ei < s.enemies.length; ei++) {
          const e = s.enemies[ei];
          if (!e.alive) continue;
          const ex = e.x + ew / 2;
          const ey = e.y + eh / 2;
          const gdx = ex - g.x;
          const gdy = ey - g.y;
          const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
          if (gdist < nearestDist && gdist < 80) {
            nearestDist = gdist;
            nearestTarget = { x: ex, y: ey, type: "enemy", idx: ei };
          }
        }
        // Check enemy projectiles
        for (let bi = 0; bi < s.bullets.length; bi++) {
          const b = s.bullets[bi];
          if (b.isPlayer) continue;
          const gdx = b.x - g.x;
          const gdy = b.y - g.y;
          const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
          if (gdist < nearestDist && gdist < 80) {
            nearestDist = gdist;
            nearestTarget = { x: b.x, y: b.y, type: "projectile", idx: bi };
          }
        }

        if (nearestTarget && g.state !== "hunt") {
          g.state = "hunt";
          g.targetX = nearestTarget.x;
          g.targetY = nearestTarget.y;
        }

        if (g.state === "orbit") {
          g.angle += 2 * dt;
          const orbitRadius = 25;
          g.x = pcx + Math.cos(g.angle + gi * 2.1) * orbitRadius;
          g.y = pcy + Math.sin(g.angle + gi * 2.1) * orbitRadius;
        } else if (g.state === "hunt") {
          const hdx = g.targetX - g.x;
          const hdy = g.targetY - g.y;
          const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
          if (hdist > 1) {
            g.x += (hdx / hdist) * 90 * dt;
            g.y += (hdy / hdist) * 90 * dt;
          }
          // Shoot at target
          if (g.shootCooldown <= 0 && hdist < 60) {
            g.shootCooldown = 0.4;
            const aimAngle = Math.atan2(hdy, hdx);
            s.bullets.push({
              x: g.x, y: g.y,
              vx: Math.cos(aimAngle) * BULLET_SPEED_BASE * 0.8,
              vy: Math.sin(aimAngle) * BULLET_SPEED_BASE * 0.8,
              angle: aimAngle,
              isPlayer: true,
              isSuperBullet: false,
              superBulletTier: 0,
              bouncesRemaining: 0,
              pierceRemaining: 0,
            });
          }
          // Check if target is still valid
          let targetStillValid = false;
          if (nearestTarget) {
            const tdx = nearestTarget.x - g.x;
            const tdy = nearestTarget.y - g.y;
            if (Math.sqrt(tdx * tdx + tdy * tdy) < 100) targetStillValid = true;
          }
          if (!targetStillValid) {
            g.state = "return";
          }
        } else if (g.state === "return") {
          const rdx = pcx - g.x;
          const rdy = pcy - g.y;
          const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
          if (rdist > 5) {
            g.x += (rdx / rdist) * 90 * dt;
            g.y += (rdy / rdist) * 90 * dt;
          } else {
            g.state = "orbit";
          }
        }
      }

      // ── Enemy shooting (rate-limited: 1 shot per second per enemy) ──
      const aliveEnemies = s.enemies.filter((e) => e.alive);
      const cfg = settingsRef.current.enemy;
      const waveEnemyProjSpeed = s.enemyProjectileSpeed;
      aliveEnemies.forEach((e) => {
        e.cooldown -= dt * timeWarpFactor;
        if (e.cooldown <= 0 && Math.random() < s.enemyFireChance * timeWarpFactor) {
          const bx = e.x + ew / 2;
          const by = e.y + eh;
          const ex = s.playerX + PLAYER_W_BASE / 2;
          const ey = s.playerY + PLAYER_H_BASE / 2;
          const bdx = ex - bx;
          const bdy = ey - by;
          const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
          const pspeed = waveEnemyProjSpeed * timeWarpFactor;
          const bvx = bdist > 1 ? (bdx / bdist) * pspeed : 0;
          const bvy = bdist > 1 ? (bdy / bdist) * pspeed : pspeed;
          s.bullets.push({
            x: bx,
            y: by,
            vx: bvx,
            vy: bvy,
            isPlayer: false,
            projectileIndex: e.projectileIndex,
          });
          e.cooldown = 1; // 1 second cooldown
        }
      });

      // ── Boss intro timer ──
      if (s.bossIntroTimer > 0) {
        s.bossIntroTimer -= dt;
        if (s.bossIntroTimer <= 0) {
          s.bossIntroTimer = 0;
          s.bossIntroText = "";
        }
      }

      // ── Boss behaviour ──
      const bossCfg = effectiveSettingsRef.current?.boss;
      if (s.boss && bossCfg?.enabled) {
        const bw = bossCfg?.width ?? 40;
        const bh = bossCfg?.height ?? 30;
        // Determine boss phase based on HP
        const hpRatio = s.boss.health / s.boss.maxHealth;
        let phase = 1;
        if (hpRatio <= 0.25) phase = 4;
        else if (hpRatio <= 0.50) phase = 3;
        else if (hpRatio <= 0.75) phase = 2;
        s.boss.phase = phase;

        const enrageMult = phase === 4 ? 1.5 : 1.0;
        const fireRateMult = phase === 4 ? 0.7 : 1.0;
        const bossSpeed = s.boss.trackSpeed * enrageMult * timeWarpFactor;

        // Charge dash (Phase 3)
        if (phase >= 3 && !s.boss.isCharging) {
          s.boss.chargeCooldown = (s.boss.chargeCooldown ?? 0) - dt * timeWarpFactor;
          if ((s.boss.chargeCooldown ?? 0) <= 0) {
            s.boss.isCharging = true;
            s.boss.chargeTimer = 0.8;
            s.boss.chargeTargetX = s.playerX + PLAYER_W_BASE / 2;
            s.boss.chargeTargetY = s.playerY + PLAYER_H_BASE / 2;
            s.boss.chargeCooldown = 4.0;
          }
        }

        if (s.boss.isCharging) {
          s.boss.chargeTimer -= dt * timeWarpFactor;
          const cdx = s.boss.chargeTargetX - (s.boss.x + bw / 2);
          const cdy = s.boss.chargeTargetY - (s.boss.y + bh / 2);
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cdist > 1) {
            s.boss.x += (cdx / cdist) * bossSpeed * 3 * dt;
            s.boss.y += (cdy / cdist) * bossSpeed * 3 * dt;
          }
          if (s.boss.chargeTimer <= 0) {
            s.boss.isCharging = false;
          }
        } else {
          // Track player like regular enemies
          const bcx = s.boss.x + bw / 2;
          const bcy = s.boss.y + bh / 2;
          const bdx2 = pCx - bcx;
          const bdy2 = pCy - bcy;
          const bdist2 = Math.sqrt(bdx2 * bdx2 + bdy2 * bdy2);
          if (bdist2 > 1) {
            s.boss.x += (bdx2 / bdist2) * bossSpeed * dt;
            s.boss.y += (bdy2 / bdist2) * bossSpeed * dt;
          }
        }
        // Clamp to play area
        s.boss.x = Math.max(4, Math.min(playAreaW - 4 - bw, s.boss.x));
        s.boss.y = Math.max(4, Math.min(BASE_H - 4 - bh, s.boss.y));

        // Fire projectiles at player every N seconds
        s.boss.fireCooldown -= dt * timeWarpFactor;
        if (s.boss.fireCooldown <= 0 && !s.boss.isCharging) {
          const bx = s.boss.x + bw / 2;
          const by = s.boss.y + bh;
          const px2 = s.playerX + PLAYER_W_BASE / 2;
          const py2 = s.playerY + PLAYER_H_BASE / 2;
          const bdx3 = px2 - bx;
          const bdy3 = py2 - by;
          const bdist3 = Math.sqrt(bdx3 * bdx3 + bdy3 * bdy3);
          const pspeed = s.boss.projectileSpeed * (phase === 4 ? 1.2 : 1.0) * timeWarpFactor;
          const baseAngle = Math.atan2(bdist3 > 1 ? (bdy3 / bdist3) * pspeed : pspeed, bdist3 > 1 ? (bdx3 / bdist3) * pspeed : 0);

          if (phase === 2) {
            // Spray burst: 8 projectiles in 180° arc
            const sprayCount = 8;
            const arc = Math.PI / 2;
            for (let i = 0; i < sprayCount; i++) {
              const angle = baseAngle - arc / 2 + (arc * i) / (sprayCount - 1);
              s.bullets.push({
                x: bx, y: by,
                vx: Math.cos(angle) * pspeed,
                vy: Math.sin(angle) * pspeed,
                isPlayer: false,
                isBoss: true,
              });
            }
          } else {
            const count = bossCfg?.projectileCount ?? 1;
            const spread = count > 1 ? 0.15 : 0;
            for (let i = 0; i < count; i++) {
              const angle = baseAngle + (count > 1 ? (i - (count - 1) / 2) * spread : 0);
              s.bullets.push({
                x: bx,
                y: by,
                vx: Math.cos(angle) * pspeed,
                vy: Math.sin(angle) * pspeed,
                isPlayer: false,
                isBoss: true,
              });
            }
          }
          s.boss.fireCooldown = s.boss.fireInterval * fireRateMult;
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

      // ── Time-based power-up spawn ──
      // Spawns a temp power-up periodically based on powerUpSpawnChance setting.
      // This ensures power-ups keep appearing even when enemy kills are slow.
      const spawnChance = effectiveSettingsRef.current?.powerUpSpawnChance ?? ROGUELIKE_CONFIG.baseEnemyDropChance;
      s.powerUpSpawnAccum += dt;
      const spawnInterval = Math.max(1, 8 - spawnChance * 40); // 0.15 chance ≈ 2s interval, 0.05 chance ≈ 6s interval
      if (s.powerUpSpawnAccum >= spawnInterval) {
        s.powerUpSpawnAccum = 0;
        // Only spawn if there are enemies alive (no freebies during empty waves)
        const aliveEnemies = s.enemies.filter((e) => e.alive);
        if (aliveEnemies.length > 0 && s.powerups.length < 3) {
          const puSize = effectiveSettingsRef.current?.powerUpSize ?? 8;
          const types: PowerUpType[] = ["rapid", "shield", "wideshot", "extralife", "invincible", "timewarp", "doubleshot", "ricochet", "overcharge", "groupie"];
          const type = types[Math.floor(Math.random() * types.length)];
          s.powerups.push({
            x: Math.random() * (s.playAreaW - puSize * 2) + puSize,
            y: -puSize,
            type,
          });
        }
      }

      // ── Power-up drift ──
      const powerUpSize = effectiveSettingsRef.current?.powerUpSize ?? 8;
      for (let i = s.powerups.length - 1; i >= 0; i--) {
        const pu = s.powerups[i];
        pu.y += POWERUP_DRIFT_SPEED * dt;
        // Magnet pull
        if (playerStats.hasMagnet) {
          const pux = pu.x + powerUpSize / 2;
          const puy = pu.y + powerUpSize / 2;
          const ppx = s.playerX + PLAYER_W_BASE / 2;
          const ppy = s.playerY + PLAYER_H_BASE / 2;
          const mdx = ppx - pux;
          const mdy = ppy - puy;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < playerStats.magnetRadius && mdist > 1) {
            const pullStrength = (1 - mdist / playerStats.magnetRadius) * 120;
            pu.x += (mdx / mdist) * pullStrength * dt;
            pu.y += (mdy / mdist) * pullStrength * dt;
          }
        }
        if (pu.y > BASE_H + 10) {
          s.powerups.splice(i, 1);
        }
      }

      // ── Power-up collection ──
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
            const durations = effectiveSettingsRef.current?.powerUpDurations;
            const duration =
              pu.type === "rapid" ? (durations?.rapid ?? 5) :
              pu.type === "invincible" ? (durations?.invincible ?? 4) :
              pu.type === "projectile" ? (durations?.projectile ?? 4) :
              pu.type === "timewarp" ? (durations?.timewarp ?? 5) :
              pu.type === "doubleshot" ? (durations?.doubleshot ?? 6) :
              pu.type === "ricochet" ? (durations?.ricochet ?? 5) :
              pu.type === "overcharge" ? (durations?.overcharge ?? 0) :
              pu.type === "groupie" ? (durations?.groupie ?? 8) :
              (durations?.wideShot ?? 4);
            const dilatedDuration = duration * (1 + playerStats.timeDilationBonus);
            const existing = s.activePowerUps.find((p) => p.type === pu.type);
            const noStackTypes: PowerUpType[] = ["shield", "invincible", "projectile", "timewarp", "overcharge"];
            const maxStack = 5;

            if (existing) {
              if (noStackTypes.includes(pu.type)) {
                // No stacking — just reset timer
                existing.timer = dilatedDuration;
              } else if (existing.stacks < maxStack) {
                // Stack up to max, reset timer
                existing.stacks = (existing.stacks || 1) + 1;
                existing.timer = dilatedDuration;
              } else {
                // Already at max stacks — just reset timer
                existing.timer = dilatedDuration;
              }
            } else {
              s.activePowerUps.push({ type: pu.type, timer: dilatedDuration, stacks: 1 });
            }
            // Track shield initial duration for animation timing
            if (pu.type === "shield") s.shieldDuration = dilatedDuration;
            // Projectile temp: recalculate bonus to fill up to cap of 3
            if (pu.type === "projectile" && existing) {
              existing.stacks = Math.max(0, 3 - playerStats.projectileCount);
            }
            // Overcharge: add shots (no timer, uses shot count)
            if (pu.type === "overcharge") {
              s.overchargeShots += 5;
            }
            // Groupie: spawn a new groupie pet
            if (pu.type === "groupie") {
              const groupieCount = s.activePowerUps.filter((p) => p.type === "groupie").reduce((sum, p) => sum + p.stacks, 0);
              while (s.groupies.length < groupieCount) {
                s.groupies.push({
                  x: s.playerX + PLAYER_W_BASE / 2,
                  y: s.playerY + PLAYER_H_BASE / 2,
                  angle: Math.random() * Math.PI * 2,
                  state: "orbit",
                  targetX: 0, targetY: 0,
                  shootCooldown: 0,
                });
              }
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
            if (s.boss) {
              const bossCfg3 = effectiveSettingsRef.current?.boss;
              const bossW = bossCfg3?.width ?? 40;
              const bossH = bossCfg3?.height ?? 30;
              const bhbx3 = s.boss.x + (bossCfg3?.hitboxOffsetX ?? 0);
              const bhby3 = s.boss.y + (bossCfg3?.hitboxOffsetY ?? 0);
              const bhbw3 = bossCfg3?.hitboxWidth ?? bossW;
              const bhbh3 = bossCfg3?.hitboxHeight ?? bossH;
              const bossCx = bhbx3 + bhbw3 / 2;
              const bossCy = bhby3 + bhbh3 / 2;
              if (nearX === null || Math.hypot(bossCx - b.x, bossCy - b.y) < nearDist) {
                nearX = bossCx;
                nearY = bossCy;
              }
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
        const bulletTimeFactor = b.isPlayer ? 1.0 : timeWarpFactor;
        b.x += (b.vx || 0) * dt * bulletTimeFactor;
        b.y += b.vy * dt * bulletTimeFactor;
        // Bounce off screen edges
        if (b.isPlayer && playerStats.hasBounce && (b.bouncesRemaining ?? 0) > 0) {
          let bounced = false;
          if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx); bounced = true; }
          else if (b.x > playAreaW) { b.x = playAreaW; b.vx = -Math.abs(b.vx); bounced = true; }
          if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy); bounced = true; }
          else if (b.y > BASE_H) { b.y = BASE_H; b.vy = -Math.abs(b.vy); bounced = true; }
          if (bounced) {
            b.bouncesRemaining = (b.bouncesRemaining ?? 0) - 1;
            b.angle = Math.atan2(b.vy, b.vx);
          }
        }
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
      const dropRates = effectiveSettingsRef.current?.powerUpDropRates;
      const dropRateEntries: { type: PowerUpType; weight: number }[] = [
        { type: "rapid",      weight: dropRates?.rapid      ?? 1 },
        { type: "wideshot",   weight: dropRates?.wideshot   ?? 1 },
        { type: "projectile", weight: dropRates?.projectile ?? 1 },
        { type: "extralife",  weight: dropRates?.extralife  ?? 1 },
        { type: "invincible", weight: dropRates?.invincible ?? 1 },
        { type: "timewarp",   weight: dropRates?.timewarp   ?? 1 },
        { type: "doubleshot", weight: dropRates?.doubleshot ?? 1 },
        { type: "ricochet",   weight: dropRates?.ricochet   ?? 1 },
        { type: "overcharge", weight: dropRates?.overcharge ?? 1 },
        { type: "groupie",    weight: dropRates?.groupie    ?? 1 },

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
      const playerBulletImpact = effectiveSettingsRef.current?.impacts?.playerBullet ?? { w: 28, h: 28 };

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

            // Elite shielded: absorb first hit
            if (e.eliteType === "shielded" && e.eliteShieldActive) {
              e.eliteShieldActive = false;
              e.eliteShieldTimer = 1.0;
              spawnParticles(impactX, impactY, "#00f0ff", 6);
              play("enemyHit");
              // Pierce: bullet may continue
              if (playerStats.hasPierce && (b.pierceRemaining ?? 0) > 0) {
                b.pierceRemaining = (b.pierceRemaining ?? 0) - 1;
                if (!b.alreadyHit) b.alreadyHit = new Set();
                b.alreadyHit.add(ei);
                continue;
              }
              s.bullets.splice(bi, 1);
              break;
            }

            // Skip if already hit this enemy (pierce)
            if (b.alreadyHit && b.alreadyHit.has(ei)) continue;

            // Virus: infect the enemy instead of killing it outright
            if (playerStats.hasVirus && !e.alive) { /* already dead, skip */ }
            else if (playerStats.hasVirus && e.virusStacks < playerStats.virusMaxStacks) {
              e.virusStacks++;
              e.virusTimer = playerStats.virusDuration;
              e.virusAccum = 0;
              // Show hurt animation while infected
              e.animState = "hurt"; e.animAccum = 0;
              if (!playerStats.hasPierce || (b.pierceRemaining ?? 0) <= 0) {
                s.bullets.splice(bi, 1);
              } else {
                b.pierceRemaining = (b.pierceRemaining ?? 0) - 1;
                if (!b.alreadyHit) b.alreadyHit = new Set();
                b.alreadyHit.add(ei);
              }
              spawnEffect(s.activeEffects, "virus", impactX, impactY, effectiveSettingsRef.current?.impacts?.virus ?? { w: 30, h: 30 });
              spawnParticles(impactX, impactY, "#39ff14", 5);
              play("enemyHit");
            } else {
              // Compute bullet damage — missile uses superBulletDamage, super bullet uses multiplier
              // damageMultiplier from Strength power-up is applied to all player bullets
              let bulletDmg = b.superBulletDamage != null && !b.isSeeker
                ? b.superBulletDamage
                : b.isSeeker
                  ? b.superBulletDamage ?? playerStats.damageMultiplier
                  : b.isSuperBullet
                    ? playerStats.superBulletDamage * playerStats.damageMultiplier
                    : playerStats.damageMultiplier;
              // Bloodlust: bonus damage per kill this wave
              if (playerStats.hasBloodlust) {
                bulletDmg *= (1 + s.bloodlustKillCount * playerStats.bloodlustDamagePerStack);
              }
              // Last Stand: bonus damage when at 1 heart or less
              if (playerStats.hasLastStand && s.lives <= 1) {
                bulletDmg *= (1 + playerStats.lastStandDamageBonus);
              }
              // Critical Hit: chance for multiplied damage
              const isCrit = playerStats.hasCriticalHit && Math.random() < playerStats.criticalHitChance;
              if (isCrit) {
                bulletDmg *= playerStats.criticalHitDamageMultiplier;
              }
              const dnCfg = effectiveSettingsRef.current?.damageNumbers;
              const dmgColor = isCrit
                ? "#ff0000"
                : b.isSeeker
                  ? (dnCfg?.seekerColor ?? "#ff4400")
                  : b.superBulletDamage != null
                    ? "#ff4400"
                    : b.isSuperBullet ? (b.superBulletTier === 3 ? "#ffd700" : b.superBulletTier === 2 ? "#cc44ff" : "#ff2222")
                    : (dnCfg?.playerBulletColor ?? "#ffffff");
              e.hp = (e.hp ?? 1) - bulletDmg;
              s.totalDamageDealt += bulletDmg;

              // Pyromaniac: chance to set enemy on fire
              if (playerStats.hasPyromaniac && Math.random() < playerStats.pyromaniacBurnChance) {
                if (e.burnStacks <= 0) {
                  e.burnStacks = 1;
                  e.burnTimer = playerStats.pyromaniacBurnDuration;
                  e.burnAccum = 0;
                }
              }

              // Cold Feet: chance to inflict cold DOT
              if (playerStats.hasColdFeet && Math.random() < playerStats.coldFeetChance) {
                if (e.coldStacks <= 0) {
                  e.coldStacks = 1;
                  e.coldTimer = playerStats.coldFeetDuration;
                  e.coldAccum = 0;
                }
              }

              // Ricochet: redirect to nearest unhit enemy
              const ricochet = ricochetPU;
              const ricochetBounces = ricochet ? ricochet.stacks : 0;
              const canRicochet = ricochetBounces > 0 && (b.ricochetRemaining ?? 0) > 0;

              // Pierce handling
              if (playerStats.hasPierce && (b.pierceRemaining ?? 0) > 0) {
                b.pierceRemaining = (b.pierceRemaining ?? 0) - 1;
                if (!b.alreadyHit) b.alreadyHit = new Set();
                b.alreadyHit.add(ei);
              } else if (canRicochet) {
                // Ricochet to nearest unhit enemy
                b.ricochetRemaining = (b.ricochetRemaining ?? ricochetBounces) - 1;
                if (!b.alreadyHit) b.alreadyHit = new Set();
                b.alreadyHit.add(ei);
                let nearestDist = Infinity;
                let nearestEnemy = null as typeof e | null;
                let nearestIdx = -1;
                for (let ni = 0; ni < s.enemies.length; ni++) {
                  const ne = s.enemies[ni];
                  if (!ne.alive || ne === e) continue;
                  if (b.alreadyHit && b.alreadyHit.has(ni)) continue;
                  const ndx = ne.x + ew / 2 - b.x;
                  const ndy = ne.y + eh / 2 - b.y;
                  const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
                  if (ndist < nearestDist && ndist < 100) {
                    nearestDist = ndist;
                    nearestEnemy = ne;
                    nearestIdx = ni;
                  }
                }
                if (nearestEnemy) {
                  const rdx = nearestEnemy.x + ew / 2 - b.x;
                  const rdy = nearestEnemy.y + eh / 2 - b.y;
                  const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
                  if (rdist > 1) {
                    b.vx = (rdx / rdist) * BULLET_SPEED_BASE;
                    b.vy = (rdy / rdist) * BULLET_SPEED_BASE;
                    b.angle = Math.atan2(b.vy, b.vx);
                  }
                  if (nearestIdx >= 0) b.alreadyHit!.add(nearestIdx);
                  spawnParticles(b.x, b.y, "#fcee0a", 3);
                } else {
                  s.bullets.splice(bi, 1);
                }
              } else {
                s.bullets.splice(bi, 1);
              }

              // Explosive Rounds: AOE damage on impact
              if (playerStats.hasExplosive) {
                const exR = playerStats.explosiveRadius;
                const exD = playerStats.explosiveDamage;
                for (const other of s.enemies) {
                  if (!other.alive || other === e) continue;
                  const odx = other.x + ew / 2 - impactX;
                  const ody = other.y + eh / 2 - impactY;
                  if (Math.sqrt(odx * odx + ody * ody) < exR) {
                    other.hp = (other.hp ?? 1) - exD;
                    if (other.hp <= 0) {
                      other.alive = false; other.dying = true; other.animState = "dying"; other.animAccum = 0;
                      s.score += Math.floor(10 * s.wave * (1 + s.comboCount * (effectiveSettingsRef.current?.comboMultiplierPerKill ?? 0.1)));
                      onScoreChange(s.score);
                    }
                  }
                }
                spawnParticles(impactX, impactY, "#ff8800", 5);
              }

              // Chain Reaction: arc lightning to nearby enemy
              if (playerStats.hasChainReact && Math.random() < playerStats.chainReactChance) {
                let nearestDist = Infinity;
                let nearestEnemy = null as typeof e | null;
                for (const other of s.enemies) {
                  if (!other.alive || other === e) continue;
                  const odx = other.x + ew / 2 - impactX;
                  const ody = other.y + eh / 2 - impactY;
                  const odist = Math.sqrt(odx * odx + ody * ody);
                  if (odist < nearestDist && odist < playerStats.chainReactRange) {
                    nearestDist = odist;
                    nearestEnemy = other;
                  }
                }
                if (nearestEnemy) {
                  nearestEnemy.hp = (nearestEnemy.hp ?? 1) - playerStats.chainReactDamage;
                  s.lightningBeams.push({ x1: impactX, y1: impactY, x2: nearestEnemy.x + ew / 2, y2: nearestEnemy.y + eh / 2, timer: 0.15 });
                  spawnParticles(nearestEnemy.x + ew / 2, nearestEnemy.y + eh / 2, "#fcee0a", 4);
                  if (nearestEnemy.hp <= 0) {
                    nearestEnemy.alive = false; nearestEnemy.dying = true; nearestEnemy.animState = "dying"; nearestEnemy.animAccum = 0;
                    s.score += Math.floor(10 * s.wave * (1 + s.comboCount * (effectiveSettingsRef.current?.comboMultiplierPerKill ?? 0.1)));
                    onScoreChange(s.score);
                  }
                }
              }

              // Spawn damage number
              const dnX = impactX + (Math.random() - 0.5) * 8;
              if (s.damageNumbers.length < 100) {
                if (isCrit) {
                  // Crit: show "Crit" label above the damage number
                  s.damageNumbers.push({ x: dnX, y: e.y - 6, value: "Crit", timer: 1.0, maxTimer: 1.0, color: "#ff0000" });
                  s.damageNumbers.push({ x: dnX, y: e.y, value: fmtDmg(bulletDmg), timer: 1.0, maxTimer: 1.0, color: "#ff8800" });
                } else {
                  s.damageNumbers.push({ x: dnX, y: e.y, value: fmtDmg(bulletDmg), timer: 1.0, maxTimer: 1.0, color: dmgColor });
                }
              }
              if (e.hp <= 0) {
                e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
                // Combo
                const comboDecay = effectiveSettingsRef.current?.comboDecayTime ?? 2.0;
                const comboMult = effectiveSettingsRef.current?.comboMultiplierPerKill ?? 0.1;
                s.comboCount++;
                s.comboTimer = comboDecay;
                if (s.comboCount > s.maxComboThisRun) s.maxComboThisRun = s.comboCount;
                const scoreGain = Math.floor(10 * s.wave * (1 + s.comboCount * comboMult));
                s.score += scoreGain;
                s.waveKillScore += scoreGain;
                onScoreChange(s.score);
                // Bloodlust: increment kill count for damage bonus
                if (playerStats.hasBloodlust) {
                  s.bloodlustKillCount++;
                }
                // Resonance: shockwave damages nearby enemies on kill
                if (playerStats.hasResonance) {
                  const resR = playerStats.resonanceRadius;
                  const resD = playerStats.resonanceDamage;
                  for (const other of s.enemies) {
                    if (!other.alive || other === e) continue;
                    const odx = other.x + ew / 2 - impactX;
                    const ody = other.y + eh / 2 - impactY;
                    if (Math.sqrt(odx * odx + ody * ody) < resR) {
                      other.hp = (other.hp ?? 1) - resD;
                      if (other.hp <= 0) {
                        other.alive = false; other.dying = true; other.animState = "dying"; other.animAccum = 0;
                        s.score += Math.floor(10 * s.wave * (1 + s.comboCount * comboMult));
                        onScoreChange(s.score);
                      }
                    }
                  }
                  // Push a shockwave visual
                  s.shockwaves.push({ x: impactX, y: impactY, timer: 0.3, maxRadius: resR });
                  spawnParticles(impactX, impactY, "#8b5cf6", 6);
                }
                // Vampirism
                if (playerStats.hasVampirism) {
                  s.vampKillsSinceHeal++;
                  if (s.vampKillsSinceHeal >= playerStats.vampirismKillsNeeded) {
                    s.vampKillsSinceHeal = 0;
                    s.currentSlices = Math.min(s.maxSlices, s.currentSlices + 1);
                    s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
                    onLivesChange(s.lives);
                    if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
                    spawnParticles(s.playerX + PLAYER_W_BASE / 2, s.playerY + PLAYER_H_BASE / 2, "#ff0000", 6);
                  }
                }
                // Elite explosive AOE
                if (e.eliteType === "explosive") {
                  const aoeRadius = 30;
                  for (const other of s.enemies) {
                    if (!other.alive || other === e) continue;
                    const odx = other.x + ew / 2 - impactX;
                    const ody = other.y + eh / 2 - impactY;
                    if (Math.sqrt(odx * odx + ody * ody) < aoeRadius) {
                      other.hp = (other.hp ?? 1) - 5;
                      if (other.hp <= 0) {
                        other.alive = false; other.dying = true; other.animState = "dying"; other.animAccum = 0;
                        s.score += Math.floor(10 * s.wave * (1 + s.comboCount * comboMult));
                        onScoreChange(s.score);
                      }
                    }
                  }
                  // Damage player if too close
                  const pdx = s.playerX + PLAYER_W_BASE / 2 - impactX;
                  const pdy = s.playerY + PLAYER_H_BASE / 2 - impactY;
                  if (Math.sqrt(pdx * pdx + pdy * pdy) < aoeRadius && !isInvincible && !hasShield && !s.permShieldActive) {
                    s.currentSlices = Math.max(0, s.currentSlices - 1);
                    s.waveDamageTaken = true;
                    // Bloodlust: reset kill streak on damage taken
                    if (playerStats.hasBloodlust) s.bloodlustKillCount = 0;
                    s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
                    onLivesChange(s.lives);
                    if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
                    play("playerHit");
                    spawnParticles(s.playerX + PLAYER_W_BASE / 2, s.playerY + PLAYER_H_BASE / 2, "#ff4400", 6);
                  }
                  spawnEffect(s.activeEffects, "bomb", impactX, impactY, effectiveSettingsRef.current?.impacts?.bomb ?? { w: 40, h: 40 });
                  spawnParticles(impactX, impactY, "#ff8800", 10);
                }
                // Elite splitter
                if (e.eliteType === "splitter") {
                  for (let si = 0; si < 2; si++) {
                    s.enemies.push({
                      x: e.x + (Math.random() - 0.5) * 10,
                      y: e.y + (Math.random() - 0.5) * 10,
                      variant: e.variant,
                      alive: true,
                      cooldown: Math.random() * 2,
                      projectileIndex: e.projectileIndex,
                      virusStacks: 0,
                      virusTimer: 0,
                      virusAccum: 0,
                      coldStacks: 0,
                      coldTimer: 0,
                      coldAccum: 0,
                      burnStacks: 0,
                      burnTimer: 0,
                      burnAccum: 0,
                      hp: Math.max(1, Math.floor(e.maxHp / 2)),
                      maxHp: Math.max(1, Math.floor(e.maxHp / 2)),
                      animState: "walking",
                      animAccum: 0,
                      dying: false,
                      facing: e.facing,
                      orbitalHitCooldown: 0,
                      isElite: false,
                      eliteType: null,
                      eliteShieldActive: false,
                      eliteShieldTimer: 0,
                      eliteHealAccum: 0,
                    });
                  }
                }
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

            // Chance to spawn temp power-up on kill (boosted by Luck perm upgrade)
            if (!e.alive || e.hp <= 0) {
              const pSize = effectiveSettingsRef.current?.powerUpSize ?? 8;
              const spawnChance = (effectiveSettingsRef.current?.powerUpSpawnChance ?? ROGUELIKE_CONFIG.baseEnemyDropChance) + playerStats.luckBonus;
              if (Math.random() < spawnChance) {
                s.powerups.push({ x: impactX - pSize / 2, y: impactY, type: pickDropType() });
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
              const spawnChance = effectiveSettingsRef.current?.bossProjectileDropRate ?? 0.15;
              if (Math.random() < spawnChance) {
                const types: PowerUpType[] = ["rapid", "wideshot", "projectile", "extralife", "invincible", "timewarp", "doubleshot", "ricochet", "overcharge", "groupie"];
                const type = types[Math.floor(Math.random() * types.length)];
                const pSize = effectiveSettingsRef.current?.powerUpSize ?? 8;
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
        const bhbx = s.boss.x + (bossCfg?.hitboxOffsetX ?? 0);
        const bhby = s.boss.y + (bossCfg?.hitboxOffsetY ?? 0);
        const bhbw = bossCfg?.hitboxWidth ?? bw;
        const bhbh = bossCfg?.hitboxHeight ?? bh;
        for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
          const b = s.bullets[bi];
          if (!b.isPlayer) continue;
          if (
            b.x >= bhbx &&
            b.x <= bhbx + bhbw &&
            b.y >= bhby &&
            b.y <= bhby + bhbh
          ) {
            // Pierce: bullet may continue through boss
            if (playerStats.hasPierce && (b.pierceRemaining ?? 0) > 0) {
              b.pierceRemaining = (b.pierceRemaining ?? 0) - 1;
            } else {
              s.bullets.splice(bi, 1);
            }
            // Apply damage: missile uses superBulletDamage, super bullet uses multiplier, else base
            const baseDmg = bossCfg?.bulletDamage ?? 20;
            const damage = b.superBulletDamage != null
              ? b.superBulletDamage
              : b.isSuperBullet
                ? baseDmg * playerStats.damageMultiplier * playerStats.superBulletDamage
                : baseDmg * playerStats.damageMultiplier;
            s.boss.health -= damage;
            s.totalDamageDealt += damage;
            // Pyromaniac: chance to set boss on fire
            if (playerStats.hasPyromaniac && Math.random() < playerStats.pyromaniacBurnChance) {
              if (s.boss.burnStacks <= 0) {
                s.boss.burnStacks = 1;
                s.boss.burnTimer = playerStats.pyromaniacBurnDuration;
                s.boss.burnAccum = 0;
              }
            }
            // Cold Feet: chance to inflict boss with frost
            if (playerStats.hasColdFeet && Math.random() < playerStats.coldFeetChance) {
              if (s.boss.coldStacks <= 0) {
                s.boss.coldStacks = 1;
                s.boss.coldTimer = playerStats.coldFeetDuration;
                s.boss.coldAccum = 0;
              }
            }
            s.boss.hitFlash = 0.1;
            if (s.boss.animState === "walking") { s.boss.animState = "hurt"; s.boss.animAccum = 0; }
            spawnEffect(s.activeEffects, "bullet", b.x, b.y, playerBulletImpact);
            spawnParticles(b.x, b.y, "#ff006e", 4);
            spawnParticles(b.x, b.y, "#fcee0a", 3);
            if (b.isSeeker) { playFile("/audio/bomb.mp3"); } else { play("enemyHit"); }
            // Spawn damage number on boss
            {
              const dnCfg2 = effectiveSettingsRef.current?.damageNumbers;
              const bossDmgColor = b.isSeeker
                ? (dnCfg2?.seekerColor ?? "#ff4400")
                : b.superBulletDamage != null
                  ? "#ff4400"
                  : (dnCfg2?.playerBulletColor ?? "#ffffff");
              if (s.damageNumbers.length < 100) s.damageNumbers.push({ x: b.x + (Math.random() - 0.5) * 10, y: s.boss.y - 2, value: fmtDmg(damage), timer: 1.0, maxTimer: 1.0, color: bossDmgColor });
            }
            // Virus infection on boss hit
            if (playerStats.hasVirus && s.boss.virusStacks < playerStats.virusMaxStacks) {
              s.boss.virusStacks++;
              s.boss.virusTimer = playerStats.virusDuration;
              s.boss.virusAccum = 0;
              spawnEffect(s.activeEffects, "virus", b.x, b.y, effectiveSettingsRef.current?.impacts?.virus ?? { w: 30, h: 30 });
              spawnParticles(b.x, b.y, "#39ff14", 3);
            }
            if (s.boss.health <= 0) {
              // Combo on boss kill
              const comboDecay = effectiveSettingsRef.current?.comboDecayTime ?? 2.0;
              const comboMult = effectiveSettingsRef.current?.comboMultiplierPerKill ?? 0.1;
              s.comboCount++;
              s.comboTimer = comboDecay;
              if (s.comboCount > s.maxComboThisRun) s.maxComboThisRun = s.comboCount;
              s.score += Math.floor((bossCfg?.scoreReward ?? 500) * (1 + s.comboCount * comboMult));
              onScoreChange(s.score);
              // Vampirism on boss kill
              if (playerStats.hasVampirism) {
                s.vampKillsSinceHeal++;
                if (s.vampKillsSinceHeal >= playerStats.vampirismKillsNeeded) {
                  s.vampKillsSinceHeal = 0;
                  s.currentSlices = Math.min(s.maxSlices, s.currentSlices + 1);
                  s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
                  onLivesChange(s.lives);
                  if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
                  spawnParticles(s.playerX + PLAYER_W_BASE / 2, s.playerY + PLAYER_H_BASE / 2, "#ff0000", 6);
                }
              }
              spawnEffect(s.activeEffects, "boss", s.boss.x + bw / 2, s.boss.y + bh / 2, effectiveSettingsRef.current?.impacts?.boss ?? { w: 80, h: 80 });
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

      // ── Per-wave damage values (computed in initWave) ──────────────────
      const waveEnemyBulletDmg = s.enemyProjectileDamage;
      const waveEnemyCollisionDmg = s.enemyCollisionDamage;

      // ── Collision: enemy bullets vs player ──
      const enemyBulletImpact = effectiveSettingsRef.current?.impacts?.enemyBullet ?? { w: 20, h: 20 };
      for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
        const b = s.bullets[bi];
        if (b.isPlayer) continue;
        const hitbox = b.isBoss ? (bossCfg?.projectileSize ?? 10) / 2 : (enemyCfg.projectileSize ?? 10) / 2;
        // Determine if bullet hits the player
        let playerHit: boolean;
        if (usePolygon && hbPoints) {
          // Polygon (ray-cast) test — check bullet centre inside polygon
          playerHit = pointInPolygon(b.x - s.playerX, b.y - s.playerY, hbPoints);
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
            const shieldIdx = shieldPU ? s.activePowerUps.indexOf(shieldPU) : -1;
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
          const bulletDmg = b.isBoss ? (s.boss?.projectileDamage ?? waveEnemyBulletDmg) : waveEnemyBulletDmg;
          s.currentSlices = Math.max(0, s.currentSlices - bulletDmg);
          s.waveDamageTaken = true;
          // Bloodlust: reset kill streak on damage taken
          if (playerStats.hasBloodlust) s.bloodlustKillCount = 0;
          s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
          onLivesChange(s.lives);
          if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
          s.screenShake = 0.2;
          spawnEffect(s.activeEffects, "bullet", px + pw / 2, py + ph / 2, enemyBulletImpact);
          spawnParticles(px + pw / 2, py + ph / 2, "#00f0ff", 10);
          play("playerHit");
          s.damageNumbers.push({ x: px + pw / 2 + (Math.random() - 0.5) * 10, y: py, value: String(bulletDmg), timer: 1.0, maxTimer: 1.0, color: effectiveSettingsRef.current?.damageNumbers?.playerHitColor ?? "#ff4444" });
          if (s.currentSlices <= 0) {
            // Second Wind: survive with 1 slice
            if (playerStats.hasSecondWind && !s.secondWindUsed) {
              s.secondWindUsed = true;
              s.currentSlices = 1;
              s.lives = 1;
              onLivesChange(1);
              if (onHealthDetailChange) onHealthDetailChange(1, s.maxSlices, s.slicesPerHeart);
              s.announcerText = { text: "SECOND WIND!", timer: 1.5, maxTimer: 1.5, color: "#00f0ff", scale: 0.5 };
              spawnParticles(px + pw / 2, py + ph / 2, "#00f0ff", 15);
              play("levelComplete");
            } else if (playerStats.hasPhoenix && !s.phoenixUsed) {
              // Eleventh Hour Phoenix: explode and revive
              s.phoenixUsed = true;
              const pr = playerStats.phoenixRadius;
              const pd = playerStats.phoenixDamage;
              // Damage all enemies in explosion radius
              for (const e of s.enemies) {
                if (!e.alive) continue;
                const edx = e.x + ew / 2 - (px + pw / 2);
                const edy = e.y + eh / 2 - (py + ph / 2);
                if (Math.sqrt(edx * edx + edy * edy) < pr) {
                  e.hp = (e.hp ?? 1) - pd;
                  if (e.hp <= 0) {
                    e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
                    s.score += Math.floor(10 * s.wave);
                    onScoreChange(s.score);
                  }
                }
              }
              // Damage boss if in range
              if (s.boss) {
                const bdx = s.boss.x + (bossCfg?.width ?? 40) / 2 - (px + pw / 2);
                const bdy = s.boss.y + (bossCfg?.height ?? 30) / 2 - (py + ph / 2);
                if (Math.sqrt(bdx * bdx + bdy * bdy) < pr) {
                  s.boss.health -= pd;
                }
              }
              spawnEffect(s.activeEffects, "bomb", px + pw / 2, py + ph / 2, { w: pr * 2, h: pr * 2 });
              spawnParticles(px + pw / 2, py + ph / 2, "#ff8800", 20);
              spawnParticles(px + pw / 2, py + ph / 2, "#ff4400", 15);
              s.currentSlices = s.slicesPerHeart; // 1 heart
              s.lives = 1;
              onLivesChange(1);
              if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
              s.announcerText = { text: "PHOENIX RISING!", timer: 2.0, maxTimer: 2.0, color: "#ff4400", scale: 0.5 };
              s.screenShake = 0.5;
              playFile("/audio/bomb.mp3");
            } else {
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
      }

      // ── Collision: boss vs player (touch damage) ──
      if (s.boss && bossCfg?.enabled) {
        const bw = bossCfg?.width ?? 40;
        const bh = bossCfg?.height ?? 30;
        // Boss body collision (separate from hitbox)
        const bcbx = s.boss.x + (bossCfg?.collisionOffsetX ?? 0);
        const bcby = s.boss.y + (bossCfg?.collisionOffsetY ?? 0);
        const bcbw = bossCfg?.collisionWidth ?? bw;
        const bcbh = bossCfg?.collisionHeight ?? bh;
        let bossHit: boolean;
        if (usePolygon && hbPoints) {
          bossHit = enemyRectIntersectsPolygon(bcbx, bcby, bcbw, bcbh);
        } else {
          bossHit = (
            bcbx < px + pw &&
            bcbx + bcbw > px &&
            bcby < py + ph &&
            bcby + bcbh > py
          );
        }
        if (bossHit) {
          if (!isInvincible && !s.permShieldActive && !hasShield) {
            const touchDmg = s.boss.collisionDamage;
            s.currentSlices = Math.max(0, s.currentSlices - touchDmg);
            s.waveDamageTaken = true;
            // Bloodlust: reset kill streak on damage taken
            if (playerStats.hasBloodlust) s.bloodlustKillCount = 0;
            s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
            onLivesChange(s.lives);
            if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
            s.screenShake = 0.3;
            spawnParticles(px + pw / 2, py + ph / 2, "#ff006e", 10);
            play("playerHit");
            s.damageNumbers.push({ x: px + pw / 2, y: py - 5, value: String(touchDmg), timer: 1.0, maxTimer: 1.0, color: effectiveSettingsRef.current?.damageNumbers?.playerHitColor ?? "#ff4444" });
            if (s.currentSlices <= 0) {
              if (playerStats.hasSecondWind && !s.secondWindUsed) {
                s.secondWindUsed = true;
                s.currentSlices = 1; s.lives = 1;
                onLivesChange(1);
                if (onHealthDetailChange) onHealthDetailChange(1, s.maxSlices, s.slicesPerHeart);
                s.announcerText = { text: "SECOND WIND!", timer: 1.5, maxTimer: 1.5, color: "#00f0ff", scale: 0.5 };
                spawnParticles(px + pw / 2, py + ph / 2, "#00f0ff", 15);
                play("levelComplete");
              } else if (playerStats.hasPhoenix && !s.phoenixUsed) {
                s.phoenixUsed = true;
                const pr = playerStats.phoenixRadius;
                const pd = playerStats.phoenixDamage;
                for (const e of s.enemies) { if (!e.alive) continue; const edx = e.x + ew / 2 - (px + pw / 2); const edy = e.y + eh / 2 - (py + ph / 2); if (Math.sqrt(edx * edx + edy * edy) < pr) { e.hp = (e.hp ?? 1) - pd; if (e.hp <= 0) { e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0; s.score += Math.floor(10 * s.wave); onScoreChange(s.score); } } }
                if (s.boss) { const bdx = s.boss.x + (bossCfg?.width ?? 40) / 2 - (px + pw / 2); const bdy = s.boss.y + (bossCfg?.height ?? 30) / 2 - (py + ph / 2); if (Math.sqrt(bdx * bdx + bdy * bdy) < pr) s.boss.health -= pd; }
                spawnEffect(s.activeEffects, "bomb", px + pw / 2, py + ph / 2, { w: pr * 2, h: pr * 2 });
                spawnParticles(px + pw / 2, py + ph / 2, "#ff8800", 20);
                s.currentSlices = s.slicesPerHeart; s.lives = 1;
                onLivesChange(1);
                if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
                s.announcerText = { text: "PHOENIX RISING!", timer: 2.0, maxTimer: 2.0, color: "#ff4400", scale: 0.5 };
                s.screenShake = 0.5; playFile("/audio/bomb.mp3");
              } else { play("gameOver"); onRunStatsChange?.(Math.round(s.totalDamageDealt)); onPhaseChange("gameover"); return; }
            }
          }
        }
      }

      // ── Collision: regular enemies vs player (body contact damage) ──
      for (const e of s.enemies) {
        if (!e.alive) continue;
        // Check enemy body against player hitbox (polygon or rect)
        const ecbx = e.x + ecbOffX;
        const ecby = e.y + ecbOffY;
        let bodyHit: boolean;
        if (usePolygon && hbPoints) {
          bodyHit = enemyRectIntersectsPolygon(ecbx, ecby, ecw, ech);
        } else {
          bodyHit = (
            ecbx < px + pw &&
            ecbx + ecw > px &&
            ecby < py + ph &&
            ecby + ech > py
          );
        }
        if (bodyHit) {
          if (isInvincible || s.permShieldActive || hasShield) break;
          s.currentSlices = Math.max(0, s.currentSlices - waveEnemyCollisionDmg);
          s.waveDamageTaken = true;
          // Bloodlust: reset kill streak on damage taken
          if (playerStats.hasBloodlust) s.bloodlustKillCount = 0;
          s.lives = Math.ceil(s.currentSlices / s.slicesPerHeart);
          onLivesChange(s.lives);
          if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
          s.screenShake = 0.25;
          spawnParticles(px + pw / 2, py + ph / 2, "#ff4444", 8);
          play("playerHit");
          s.damageNumbers.push({ x: px + pw / 2 + (Math.random() - 0.5) * 8, y: py - 2, value: String(waveEnemyCollisionDmg), timer: 1.0, maxTimer: 1.0, color: effectiveSettingsRef.current?.damageNumbers?.playerHitColor ?? "#ff4444" });
          // Thorns: damage enemy on contact
          if (playerStats.hasThorns) {
            e.hp = (e.hp ?? 1) - playerStats.thornsDamage;
            spawnParticles(e.x + ew / 2, e.y + eh / 2, "#39ff14", 4);
            if (e.hp <= 0) {
              e.alive = false; e.dying = true; e.animState = "dying"; e.animAccum = 0;
              s.score += Math.floor(10 * s.wave * (1 + s.comboCount * (effectiveSettingsRef.current?.comboMultiplierPerKill ?? 0.1)));
              onScoreChange(s.score);
            }
          }
          if (s.currentSlices <= 0) {
              if (playerStats.hasSecondWind && !s.secondWindUsed) {
                s.secondWindUsed = true;
                s.currentSlices = 1; s.lives = 1;
                onLivesChange(1);
                if (onHealthDetailChange) onHealthDetailChange(1, s.maxSlices, s.slicesPerHeart);
                s.announcerText = { text: "SECOND WIND!", timer: 1.5, maxTimer: 1.5, color: "#00f0ff", scale: 0.5 };
                spawnParticles(px + pw / 2, py + ph / 2, "#00f0ff", 15);
                play("levelComplete");
              } else if (playerStats.hasPhoenix && !s.phoenixUsed) {
                s.phoenixUsed = true;
                const pr = playerStats.phoenixRadius;
                const pd = playerStats.phoenixDamage;
                for (const e2 of s.enemies) { if (!e2.alive) continue; const edx = e2.x + ew / 2 - (px + pw / 2); const edy = e2.y + eh / 2 - (py + ph / 2); if (Math.sqrt(edx * edx + edy * edy) < pr) { e2.hp = (e2.hp ?? 1) - pd; if (e2.hp <= 0) { e2.alive = false; e2.dying = true; e2.animState = "dying"; e2.animAccum = 0; s.score += Math.floor(10 * s.wave); onScoreChange(s.score); } } }
                if (s.boss) { const bdx = s.boss.x + (bossCfg?.width ?? 40) / 2 - (px + pw / 2); const bdy = s.boss.y + (bossCfg?.height ?? 30) / 2 - (py + ph / 2); if (Math.sqrt(bdx * bdx + bdy * bdy) < pr) s.boss.health -= pd; }
                spawnEffect(s.activeEffects, "bomb", px + pw / 2, py + ph / 2, { w: pr * 2, h: pr * 2 });
                spawnParticles(px + pw / 2, py + ph / 2, "#ff8800", 20);
                s.currentSlices = s.slicesPerHeart; s.lives = 1;
                onLivesChange(1);
                if (onHealthDetailChange) onHealthDetailChange(s.currentSlices, s.maxSlices, s.slicesPerHeart);
                s.announcerText = { text: "PHOENIX RISING!", timer: 2.0, maxTimer: 2.0, color: "#ff4400", scale: 0.5 };
                s.screenShake = 0.5; playFile("/audio/bomb.mp3");
              } else { play("gameOver"); onRunStatsChange?.(Math.round(s.totalDamageDealt)); onPhaseChange("gameover"); try { const currentHigh = parseInt(localStorage.getItem("abch-guitar-invaders-highscore") || "0", 10); if (s.score > currentHigh) localStorage.setItem("abch-guitar-invaders-highscore", String(s.score)); } catch {} return; }
            }
            break; // only one collision per frame
          }
        }

      // ── Wave complete? ──
      if (s.enemiesToSpawn === 0 && aliveEnemies.length === 0 && !s.boss) {
        // Perfect Wave Bonus: no damage taken this wave = +50% score
        if (!s.waveDamageTaken && s.waveKillScore > 0) {
          const bonus = Math.floor(s.waveKillScore * 0.5);
          s.score += bonus;
          onScoreChange(s.score);
          s.announcerText = { text: `PERFECT! +${bonus}`, timer: 2.0, maxTimer: 2.0, color: "#ffd700", scale: 1 };
        }
        play("levelComplete");
        if (s.wave === 50) {
          onPhaseChange("songunlock");
          return;
        }
        // If wave rewards are enabled, go straight to the power-up selection screen;
        // otherwise show the brief "Wave X Clear!" overlay then auto-advance.
        // Default waveRewardEnabled to true so the screen shows even if the field is
        // missing from older versions of the saved data (e.g. stale Supabase config).
        onPhaseChange((effectiveSettingsRef.current?.waveRewardEnabled ?? true) ? "wavereward" : "levelcomplete");
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
        const driftSpd = effectiveSettingsRef.current?.damageNumbers?.driftSpeed ?? 18;
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
    [phase, onPhaseChange, onScoreChange, onLivesChange, onWaveChange, play, setMuted, isMuted, spawnParticles, onPowerUpChange, onHealthDetailChange, playerStats, stageBgDesktop, stageBgMobile]
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

    // ── Cache render-phase power-up lookups ──────────────────────────
    let renderTimeWarp = false;
    let renderInvincible = false;
    let renderShieldPU: ActivePowerUp | undefined;
    for (const p of s.activePowerUps) {
      switch (p.type) {
        case "timewarp": renderTimeWarp = true; break;
        case "invincible": renderInvincible = true; break;
        case "shield": renderShieldPU = p; break;
      }
    }

    // ── CRITICAL: clear the ENTIRE physical canvas BEFORE any transform ──
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CW, CH);

    ctx.save();
    ctx.scale(sc, sc);

    // Draw stage background image (cover behaviour)
    const activeStageBg = isMobileAtMount ? stageBgMobile : stageBgDesktop;
    if (activeStageBg && activeStageBg.complete && activeStageBg.naturalWidth > 0) {
      const imgW = activeStageBg.naturalWidth;
      const imgH = activeStageBg.naturalHeight;
      const scale = Math.max(logW / imgW, logH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const offsetX = (logW - drawW) / 2;
      const offsetY = (logH - drawH) / 2;
      ctx.drawImage(activeStageBg, offsetX, offsetY, drawW, drawH);
    }

    // Screen shake
    if (s.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * 4;
      const shakeY = (Math.random() - 0.5) * 4;
      ctx.translate(shakeX, shakeY);
    }

    if (renderTimeWarp) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0, 100, 255, 0.08)";
      ctx.fillRect(0, 0, logW, logH);
      ctx.restore();
    }

    // Boss intro animation
    if (s.bossIntroTimer > 0) {
      const introProgress = 1 - s.bossIntroTimer / 3.0;
      const alpha = introProgress < 0.3 ? introProgress / 0.3 : introProgress > 0.7 ? (1 - introProgress) / 0.3 : 1;
      const scale = 0.5 + introProgress * 0.5;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = "#ff0000";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 20;
      ctx.font = `bold ${Math.floor(16 * scale)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("BOSS APPROACHING", logW / 2, logH * 0.35);
      ctx.font = `bold ${Math.floor(12 * scale)}px monospace`;
      ctx.fillStyle = "#ff8800";
      ctx.shadowColor = "#ff8800";
      ctx.fillText(s.bossIntroText.toUpperCase(), logW / 2, logH * 0.45);
      // Red warning bars
      const barH = 4 * scale;
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.5})`;
      ctx.fillRect(0, logH * 0.3 - barH, logW, barH);
      ctx.fillRect(0, logH * 0.5, logW, barH);
      ctx.restore();
    }

    // Draw power-ups
    const puSize = effectiveSettingsRef.current?.powerUpSize ?? 8;
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
        ctx, sprX, sprY, e.variant, e.animState, e.facing, e.animAccum,
        sprW, sprH,
        // Procedural fallback while sprites are loading
        () => drawEnemy(ctx, sprX, sprY, e.variant, s.frame, e.cooldown > 0.75, sprW, sprH),
      );
      // Elite glow outline — soft outer glow that follows the actual sprite shape
      if (e.isElite && e.alive) {
        const eliteColors: Record<string, string> = {
          shielded: "#00f0ff",
          explosive: "#ff8800",
          regenerating: "#39ff14",
          splitter: "#cc44ff",
        };
        const ec = eliteColors[e.eliteType ?? ""] ?? "#ffffff";
        // Redraw sprite with shadow to create a glow that follows the sprite silhouette
        ctx.save();
        ctx.shadowColor = ec;
        ctx.shadowBlur = 10 + Math.sin(s.frame * 0.15) * 4; // pulsing glow
        ctx.globalAlpha = 0.8 + Math.sin(s.frame * 0.15) * 0.2;
        drawEnemySprite(
          ctx, sprX, sprY, e.variant, e.animState, e.facing, e.animAccum,
          sprW, sprH,
          () => drawEnemy(ctx, sprX, sprY, e.variant, s.frame, e.cooldown > 0.75, sprW, sprH),
        );
        ctx.restore();
        // Label above the enemy
        ctx.fillStyle = ec;
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText(e.eliteType?.toUpperCase() ?? "ELITE", sprX + sprW / 2, sprY - 8);
      }
      // ── DOT status flash overlays (tint only sprite pixels, not bg) ──
      if (e.virusStacks > 0 && e.alive) {
        const flash = Math.sin(s.frame * 0.3) * 0.3 + 0.3;
        tintSpriteRegion(ctx, sprX, sprY, sprW, sprH, "#39ff14", flash, (c, sx, sy, sw, sh) => {
          drawEnemySprite(c, sx, sy, e.variant, e.animState, e.facing, e.animAccum, sw, sh,
            () => drawEnemy(c, sx, sy, e.variant, s.frame, e.cooldown > 0.75, sw, sh));
        });
      }
      if (e.burnStacks > 0 && e.alive) {
        const flash = Math.sin(s.frame * 0.4) * 0.25 + 0.25;
        tintSpriteRegion(ctx, sprX, sprY, sprW, sprH, "#ff4400", flash, (c, sx, sy, sw, sh) => {
          drawEnemySprite(c, sx, sy, e.variant, e.animState, e.facing, e.animAccum, sw, sh,
            () => drawEnemy(c, sx, sy, e.variant, s.frame, e.cooldown > 0.75, sw, sh));
        });
      }
      if (e.coldStacks > 0 && e.alive) {
        const flash = Math.sin(s.frame * 0.35) * 0.25 + 0.25;
        tintSpriteRegion(ctx, sprX, sprY, sprW, sprH, "#a5f3fc", flash, (c, sx, sy, sw, sh) => {
          drawEnemySprite(c, sx, sy, e.variant, e.animState, e.facing, e.animAccum, sw, sh,
            () => drawEnemy(c, sx, sy, e.variant, s.frame, e.cooldown > 0.75, sw, sh));
        });
      }
      ctx.restore();
    }

    // Draw player (custom sprite if loaded, else fallback)
    const pSprX = s.playerX + spriteConfig.offsetX;
    const pSprY = s.playerY + spriteConfig.offsetY;
    drawPlayerSprite(
      ctx,
      pSprX,
      pSprY,
      s.playerFacing,
      s.playerAnimAccum,
      spriteConfig.width,
      spriteConfig.height,
      spriteConfig.cols,
      () => drawPlayer(ctx, pSprX, pSprY, s.frame),
    );

    // Draw invincibility sparkles (Sonic-style) around the guitar
    if (renderInvincible) {
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
      const permShCfg = effectiveSettingsRef.current?.permShield;
      const sc2 = spriteConfig;
      const cx2 = s.playerX + sc2.offsetX + sc2.width / 2 + (permShCfg?.offsetX ?? 0);
      const cy2 = s.playerY + sc2.offsetY + sc2.height / 2 + (permShCfg?.offsetY ?? 0);
      const permR = permShCfg?.radius ?? 20;
      const permScale = permShCfg?.size ?? 1;
      const permDuration = playerStats.permShieldDuration;
      const permProgress = permDuration > 0 ? 1 - (s.permShieldTimer / permDuration) : 0;
      drawShieldSprite(cx2, cy2, permR, permProgress, permScale);
    }

    if (renderShieldPU) {
      const shieldCfg = settingsRef.current.shield;
      const sc = spriteConfig;
      const cx = s.playerX + sc.offsetX + sc.width / 2 + (shieldCfg?.offsetX ?? 0);
      const cy = s.playerY + sc.offsetY + sc.height / 2 + (shieldCfg?.offsetY ?? 0);
      const shR = shieldCfg?.radius ?? 16;
      const shDur = s.shieldDuration > 0 ? s.shieldDuration : 4;
      const shProgress = 1 - (renderShieldPU.timer / shDur);
      drawShieldSprite(cx, cy, shR, shProgress);
    }

    // Draw boss
    if (s.boss) {
      const bossCfg = effectiveSettingsRef.current?.boss;
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
        0, // hurt flash handled below with tintSpriteRegion
        // No procedural fallback — only render new sprite assets
        () => {},
      );
      // Boss hurt flash — tint only sprite pixels red
      if (s.boss.hitFlash > 0) {
        const flashAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.5;
        tintSpriteRegion(ctx, sprX, sprY, sprW, sprH, "#ff0000", flashAlpha, (c, sx, sy, sw, sh) => {
          drawBossSprite(c, sx, sy, sw, sh, s.boss!.skinIndex, s.boss!.animState, s.boss!.animAccum, 0, () => {});
        });
      }
      // Phase 4 enrage tint — tint only sprite pixels
      if (s.boss.phase === 4) {
        const pulse = 0.35 + Math.sin(s.frame * 0.15) * 0.15;
        tintSpriteRegion(ctx, sprX, sprY, sprW, sprH, "#ff1414", pulse, (c, sx, sy, sw, sh) => {
          drawBossSprite(c, sx, sy, sw, sh, s.boss!.skinIndex, s.boss!.animState, s.boss!.animAccum, 0, () => {});
        });
        // Red outer glow — redraw sprite with shadow to create silhouette glow
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowColor = `rgba(255, 0, 0, ${0.4 + Math.sin(s.frame * 0.15) * 0.2})`;
        ctx.shadowBlur = 10 + Math.sin(s.frame * 0.15) * 5;
        drawBossSprite(ctx, sprX, sprY, sprW, sprH, s.boss.skinIndex, s.boss.animState, s.boss.animAccum, 0, () => {});
        ctx.restore();
      }
      // Low-health red tint (< 30% HP) — tint only sprite pixels
      const healthRatio = s.boss.health / s.boss.maxHealth;
      if (healthRatio < 0.3 && s.boss.phase !== 4) {
        const pulse = 0.25 + Math.sin(s.frame * 0.2) * 0.15;
        tintSpriteRegion(ctx, sprX, sprY, sprW, sprH, "#ff2828", pulse, (c, sx, sy, sw, sh) => {
          drawBossSprite(c, sx, sy, sw, sh, s.boss!.skinIndex, s.boss!.animState, s.boss!.animAccum, 0, () => {});
        });
      }
      // Boss DOT status flash overlays (tint only sprite pixels)
      if (s.boss.virusStacks > 0) {
        const flash = Math.sin(s.frame * 0.3) * 0.3 + 0.3;
        tintSpriteRegion(ctx, sprX, sprY, sprW, sprH, "#39ff14", flash, (c, sx, sy, sw, sh) => {
          drawBossSprite(c, sx, sy, sw, sh, s.boss!.skinIndex, s.boss!.animState, s.boss!.animAccum, 0, () => {});
        });
      }
      if (s.boss.burnStacks > 0) {
        const flash = Math.sin(s.frame * 0.4) * 0.25 + 0.25;
        tintSpriteRegion(ctx, sprX, sprY, sprW, sprH, "#ff4400", flash, (c, sx, sy, sw, sh) => {
          drawBossSprite(c, sx, sy, sw, sh, s.boss!.skinIndex, s.boss!.animState, s.boss!.animAccum, 0, () => {});
        });
      }
      if (s.boss.coldStacks > 0) {
        const flash = Math.sin(s.frame * 0.35) * 0.25 + 0.25;
        tintSpriteRegion(ctx, sprX, sprY, sprW, sprH, "#a5f3fc", flash, (c, sx, sy, sw, sh) => {
          drawBossSprite(c, sx, sy, sw, sh, s.boss!.skinIndex, s.boss!.animState, s.boss!.animAccum, 0, () => {});
        });
      }
      // Boss health bar — attached above the boss, editable offset/size
      if (bossCfg?.healthBarVisible !== false) {
        const barW = bossCfg?.healthBarWidth ?? 40;
        const barH = bossCfg?.healthBarHeight ?? 6;
        const barX = s.boss.x + (bossCfg?.healthBarOffsetX ?? 0);
        const barY = s.boss.y + (bossCfg?.healthBarOffsetY ?? -barH - 4);
        draw8BitHealthBar(ctx, barX, barY, barW, barH, s.boss.health, s.boss.maxHealth, "BOSS", "#ff0000", bossCfg?.healthBarTextSize);
      }
    }

    // Draw orbital orbs — use orbs.png spritesheet (4×8 grid, 32×32 per cell, row 0 = first orb)
    const playerStats2 = playerStatsRef.current;
    if (playerStats2.hasOrbital && s.orbitalActive) {
      // Orbital center = player sprite centre + configurable offset
      const pcx3 = s.playerX + spriteConfig.offsetX + spriteConfig.width / 2 + (effectiveSettingsRef.current?.orbitalOffsetX ?? 0);
      const pcy3 = s.playerY + spriteConfig.offsetY + spriteConfig.height / 2 + (effectiveSettingsRef.current?.orbitalOffsetY ?? 0);
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
          const finalSize = platProjSizes?.playerBullet ?? 4;
          // Scale from size 1 at spawn up to finalSize at autoFireRange distance
          const autoRange = effectiveSettingsRef.current?.autoFireRange ?? 0;
          const rangeLimit = autoRange > 0 ? autoRange : 120; // fallback when unlimited
          const distTraveled = Math.sqrt(
            (b.x - (b.spawnX ?? b.x)) ** 2 + (b.y - (b.spawnY ?? b.y)) ** 2
          );
          const progress = Math.min(1, distTraveled / rangeLimit);
          const bulletSize = 1 + (finalSize - 1) * progress;
          const bulletAngle = b.angle ?? Math.atan2(b.vy, b.vx);
          drawPlayerBullet(ctx, b.x, b.y, s.frame, bulletSize, bulletAngle);
        }
      } else if (b.isBoss) {
        const platProjSizes = siteData.secretGame?.[_renderPlatform]?.projectileSizes;
        const pSize = platProjSizes?.boss ?? effectiveSettingsRef.current?.boss?.projectileSize ?? 10;
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

    // Draw lightning / Connect beams (electricity zigzag effect)
    for (const beam of s.lightningBeams) {
      const alpha = Math.min(1, beam.timer * 4);
      ctx.save();
      ctx.globalAlpha = alpha;
      // Main bolt — bright cyan core
      ctx.strokeStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawElectricityBolt(ctx, beam.x1, beam.y1, beam.x2, beam.y2, 6, 3);
      // Inner hot core — white
      ctx.strokeStyle = "#ffffff";
      ctx.shadowBlur = 4;
      ctx.lineWidth = 0.8;
      drawElectricityBolt(ctx, beam.x1, beam.y1, beam.x2, beam.y2, 6, 3);
      ctx.restore();
    }

    // Draw Resonance shockwaves (expanding ring)
    for (const sw of s.shockwaves) {
      const progress = 1 - sw.timer / 0.3;
      const radius = sw.maxRadius * progress;
      const alpha = Math.max(0, 1 - progress);
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = "#8b5cf6";
      ctx.shadowColor = "#8b5cf6";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      // Inner brighter ring
      ctx.globalAlpha = alpha * 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
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
      const dnFontSize = effectiveSettingsRef.current?.damageNumbers?.fontSize ?? 8;
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

    // Draw groupie pets
    for (const g of s.groupies) {
      ctx.save();
      ctx.shadowColor = "#ff69b4";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "#ff69b4";
      // Small heart shape
      const gx = g.x;
      const gy = g.y;
      const gs = 2.5;
      ctx.fillRect(gx - gs, gy - gs * 1.5, gs * 2, gs * 1.5);
      ctx.fillRect(gx - gs * 1.5, gy - gs * 0.5, gs, gs);
      ctx.fillRect(gx + gs * 0.5, gy - gs * 0.5, gs, gs);
      ctx.fillRect(gx - gs * 0.5, gy + gs * 0.5, gs, gs);
      // White highlight
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(gx - gs * 0.5, gy - gs, gs * 0.5, gs * 0.5);
      ctx.restore();
    }

    // Draw announcer text (kill streak, perfect wave)
    if (s.announcerText) {
      const at = s.announcerText;
      const progress = 1 - at.timer / at.maxTimer;
      const bounceScale = at.scale + (1 - at.scale) * Math.sin(progress * Math.PI);
      const alpha = Math.min(1, at.timer / 0.3);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = at.color;
      ctx.shadowColor = at.color;
      ctx.shadowBlur = 12;
      ctx.font = `bold ${Math.floor(14 * bounceScale)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(at.text, logW / 2, logH * 0.25);
      ctx.restore();
    }

    // Draw combo counter
    if (s.comboCount > 0) {
      const comboColors = ["#ffffff", "#ffff00", "#ff8800", "#ff0000"];
      const comboColor = comboColors[Math.min(s.comboCount / 10, 3)];
      ctx.save();
      ctx.fillStyle = comboColor;
      ctx.shadowColor = comboColor;
      ctx.shadowBlur = 6;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`COMBO x${Math.min(s.comboCount, 99)}`, 8, 28);
      ctx.restore();
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


