"use client";

import { useRef, useEffect, useCallback } from "react";
import { useGameLoop } from "./use-game-loop";
import { useKeyboardControls, sharedKeys } from "./use-keyboard-controls";
import { useAudioSfx } from "./use-audio-sfx";
import { useSiteData } from "@/components/data-provider";
import {
  drawPlayer,
  drawEnemy,
  drawPlayerBullet,
  drawEnemyBullet,
  drawParticle,
  drawPowerUpBeam,
} from "./draw-sprites";

export type GamePhase = "menu" | "playing" | "paused" | "gameover" | "levelcomplete";

/* ── Base resolution (used for scaling) ── */
const BASE_H = 320;
const BASE_W = 240;

/* ── Game constants (in base units) ── */
const PLAYER_SPEED_BASE = 90;
const BULLET_SPEED_BASE = 180;
const ENEMY_BULLET_SPEED_BASE = 60;
const SHOOT_COOLDOWN_BASE = 0.35;
const ENEMY_COLS_BASE = 5;
const ENEMY_ROWS_BASE = 3;
const ENEMY_W_BASE = 14;
const ENEMY_H_BASE = 10;
const ENEMY_PAD_X_BASE = 6;
const ENEMY_PAD_Y_BASE = 8;
const ENEMY_START_Y_BASE = 30;
const PLAYER_W_BASE = 10;
const PLAYER_H_BASE = 20;
const POWER_UP_DURATION = 1;
const POWER_UP_BEAM_W = 14;
const MAX_LIVES = 3;

interface GameCanvasProps {
  phase: GamePhase;
  resetKey: number;
  onPhaseChange: (p: GamePhase) => void;
  onScoreChange: (s: number) => void;
  onLivesChange: (l: number) => void;
  onWaveChange: (w: number) => void;
  onPowerUpsChange: (p: number) => void;
  score: number;
  lives: number;
  wave: number;
  powerUps: number;
}

export function GameCanvas({
  phase,
  resetKey,
  onPhaseChange,
  onScoreChange,
  onLivesChange,
  onWaveChange,
  onPowerUpsChange,
  score,
  lives,
  wave,
  powerUps,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimsRef = useRef({ w: BASE_W, h: BASE_H, scale: 1 });
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  useKeyboardControls();
  const { play, setMuted, isMuted } = useAudioSfx();
  const siteData = useSiteData();
  const spriteConfig = siteData.secretGame?.playerSprite ?? { offsetX: -2, offsetY: -12, width: 14, height: 42 };

  // Load custom guitar sprite
  useEffect(() => {
    const img = new Image();
    img.src = "/images/guitar.png";
    img.onload = () => {
      playerImageRef.current = img;
    };
  }, []);

  // Mutable game state
  const stateRef = useRef({
    playerX: BASE_W / 2,
    playerY: BASE_H - 28,
    playerCooldown: 0,
    enemies: [] as {
      x: number;
      y: number;
      variant: 0 | 1 | 2;
      alive: boolean;
      cooldown: number;
    }[],
    bullets: [] as { x: number; y: number; vy: number; isPlayer: boolean }[],
    particles: [] as {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      color: string;
      size: number;
    }[],
    enemyDir: 1,
    enemySpeed: 18,
    enemyDropAccum: 0,
    enemyFireChance: 0.003,
    screenShake: 0,
    frame: 0,
    score: 0,
    lives: MAX_LIVES,
    wave: 1,
    spawnAnim: 0,
    powerUps: 0,
    powerUpActive: false,
    powerUpTimer: 0,
    powerUpX: 0,
    powerUpKeyConsumed: false,
  });

  // Resize canvas to fill viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      dimsRef.current = { w, h, scale: h / BASE_H };

      // Keep player in bounds after resize
      const s = stateRef.current;
      const sc = dimsRef.current.scale;
      s.playerX = Math.min(s.playerX, (w / sc) - PLAYER_W_BASE);
      s.playerY = (h / sc) - PLAYER_H_BASE - 8;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getScaled = () => dimsRef.current.scale;

  const initWave = useCallback((w: number) => {
    const s = stateRef.current;
    s.enemies = [];
    s.bullets = []; // clear all projectiles on new wave
    const cols = ENEMY_COLS_BASE + Math.floor((w - 1) / 2);
    const rows = ENEMY_ROWS_BASE + Math.floor((w - 1) / 3);
    const totalW = cols * (ENEMY_W_BASE + ENEMY_PAD_X_BASE) - ENEMY_PAD_X_BASE;
    const startX = (BASE_W - totalW) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        s.enemies.push({
          x: startX + c * (ENEMY_W_BASE + ENEMY_PAD_X_BASE),
          y: ENEMY_START_Y_BASE + r * (ENEMY_H_BASE + ENEMY_PAD_Y_BASE),
          variant: ((r + c) % 3) as 0 | 1 | 2,
          alive: true,
          cooldown: Math.random() * 2, // staggered firing times
        });
      }
    }

    s.enemySpeed = 18 + (w - 1) * 4;
    s.enemyFireChance = 0.003 + (w - 1) * 0.002;
    s.wave = w;
    s.spawnAnim = 0;
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    const sc = getScaled();
    s.playerX = BASE_W / 2;
    s.playerY = BASE_H - 28;
    s.playerCooldown = 0;
    s.bullets = [];
    s.particles = [];
    s.enemyDir = 1;
    s.enemyDropAccum = 0;
    s.screenShake = 0;
    s.frame = 0;
    s.score = 0;
    s.lives = MAX_LIVES;
    s.wave = 1;
    s.powerUps = 0;
    s.powerUpActive = false;
    s.powerUpTimer = 0;
    s.powerUpKeyConsumed = false;
    onScoreChange(0);
    onLivesChange(MAX_LIVES);
    onWaveChange(1);
    onPowerUpsChange(0);
    initWave(1);
  }, [initWave, onScoreChange, onLivesChange, onWaveChange, onPowerUpsChange]);

  const spawnParticles = useCallback(
    (x: number, y: number, color: string, count: number) => {
      const s = stateRef.current;
      for (let i = 0; i < count; i++) {
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

  // Sync external score/lives/wave/powerUps
  useEffect(() => { stateRef.current.score = score; }, [score]);
  useEffect(() => { stateRef.current.lives = lives; }, [lives]);
  useEffect(() => { stateRef.current.wave = wave; }, [wave]);
  useEffect(() => { stateRef.current.powerUps = powerUps; }, [powerUps]);

  // Handle phase transitions
  useEffect(() => {
    if (phase === "playing" && stateRef.current.lives <= 0) {
      resetGame();
    }
    if (phase === "playing" && stateRef.current.enemies.filter((e) => e.alive).length === 0) {
      initWave(stateRef.current.wave);
    }
  }, [phase, resetGame, initWave]);

  // Imperative reset when parent signals a restart (e.g. Try Again)
  useEffect(() => {
    if (resetKey > 0) {
      resetGame();
    }
  }, [resetKey, resetGame]);

  const update = useCallback(
    (dt: number) => {
      const s = stateRef.current;
      const keys = sharedKeys;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w: CW, h: CH, scale: sc } = dimsRef.current;
      const LOG_W = CW / sc;

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

      // ── Player movement ──
      const pSpeed = PLAYER_SPEED_BASE;
      if (keys.left) s.playerX -= pSpeed * dt;
      if (keys.right) s.playerX += pSpeed * dt;
      s.playerX = Math.max(0, Math.min(LOG_W - PLAYER_W_BASE, s.playerX));

      // ── Player shooting ──
      s.playerCooldown -= dt;
      if (keys.shoot && s.playerCooldown <= 0) {
        s.bullets.push({
          x: s.playerX + PLAYER_W_BASE / 2,
          y: s.playerY,
          vy: -BULLET_SPEED_BASE,
          isPlayer: true,
        });
        s.playerCooldown = SHOOT_COOLDOWN_BASE;
        play("shoot");
      }

      // ── Power-up activation ──
      if (keys.powerUp && !s.powerUpKeyConsumed && s.powerUps > 0 && !s.powerUpActive) {
        s.powerUps--;
        onPowerUpsChange(s.powerUps);
        s.powerUpActive = true;
        s.powerUpTimer = POWER_UP_DURATION;
        s.powerUpX = s.playerX + PLAYER_W_BASE / 2;
        s.powerUpKeyConsumed = true;
        play("powerUp");
      }
      if (!keys.powerUp) {
        s.powerUpKeyConsumed = false;
      }

      // ── Power-up active logic ──
      if (s.powerUpActive) {
        s.powerUpTimer -= dt;
        // Move beam with player
        s.powerUpX = s.playerX + PLAYER_W_BASE / 2;

        // Destroy enemies in beam column
        const beamLeft = s.powerUpX - POWER_UP_BEAM_W / 2;
        const beamRight = s.powerUpX + POWER_UP_BEAM_W / 2;
        for (const e of s.enemies) {
          if (!e.alive) continue;
          const enemyLeft = e.x;
          const enemyRight = e.x + ENEMY_W_BASE;
          if (enemyRight >= beamLeft && enemyLeft <= beamRight) {
            e.alive = false;
            s.score += 10 * s.wave;
            onScoreChange(s.score);
            spawnParticles(e.x + ENEMY_W_BASE / 2, e.y + ENEMY_H_BASE / 2, "#00f0ff", 6);
            spawnParticles(e.x + ENEMY_W_BASE / 2, e.y + ENEMY_H_BASE / 2, "#ffffff", 4);
            play("enemyHit");
          }
        }

        if (s.powerUpTimer <= 0) {
          s.powerUpActive = false;
        }
      }

      // ── Enemy movement ──
      const edgeMargin = 4;
      let hitEdge = false;
      const moveAmount = s.enemySpeed * dt;

      for (const e of s.enemies) {
        if (!e.alive) continue;
        e.x += s.enemyDir * moveAmount;
        if (e.x <= edgeMargin || e.x + ENEMY_W_BASE >= LOG_W - edgeMargin) {
          hitEdge = true;
        }
      }

      if (hitEdge) {
        s.enemyDir *= -1;
        s.enemies.forEach((e) => {
          if (e.alive) e.y += 6;
        });
      }

      // ── Enemy shooting (rate-limited: 1 shot per second per enemy) ──
      const aliveEnemies = s.enemies.filter((e) => e.alive);
      aliveEnemies.forEach((e) => {
        e.cooldown -= dt;
        if (e.cooldown <= 0 && Math.random() < s.enemyFireChance) {
          s.bullets.push({
            x: e.x + ENEMY_W_BASE / 2,
            y: e.y + ENEMY_H_BASE,
            vy: ENEMY_BULLET_SPEED_BASE,
            isPlayer: false,
          });
          e.cooldown = 1; // 1 second cooldown
        }
      });

      // ── Bullet update ──
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        b.y += b.vy * dt;
        if (b.y < -20 || b.y > BASE_H + 20) {
          s.bullets.splice(i, 1);
        }
      }

      // ── Collision: player bullets vs enemies ──
      for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
        const b = s.bullets[bi];
        if (!b.isPlayer) continue;
        for (let ei = s.enemies.length - 1; ei >= 0; ei--) {
          const e = s.enemies[ei];
          if (!e.alive) continue;
          if (
            b.x >= e.x - 1 &&
            b.x <= e.x + ENEMY_W_BASE + 1 &&
            b.y >= e.y - 1 &&
            b.y <= e.y + ENEMY_H_BASE + 1
          ) {
            e.alive = false;
            s.bullets.splice(bi, 1);
            s.score += 10 * s.wave;
            onScoreChange(s.score);
            spawnParticles(e.x + ENEMY_W_BASE / 2, e.y + ENEMY_H_BASE / 2, "#ff006e", 8);
            spawnParticles(e.x + ENEMY_W_BASE / 2, e.y + ENEMY_H_BASE / 2, "#fcee0a", 4);
            play("enemyHit");
            break;
          }
        }
      }

      // ── Collision: enemy bullets vs player ──
      const px = s.playerX;
      const py = s.playerY;
      const pw = PLAYER_W_BASE;
      const ph = PLAYER_H_BASE;
      for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
        const b = s.bullets[bi];
        if (b.isPlayer) continue;
        if (b.x >= px && b.x <= px + pw && b.y >= py && b.y <= py + ph) {
          s.bullets.splice(bi, 1);
          s.lives--;
          onLivesChange(s.lives);
          s.screenShake = 0.2;
          spawnParticles(px + pw / 2, py + ph / 2, "#00f0ff", 10);
          play("playerHit");
          if (s.lives <= 0) {
            play("gameOver");
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

      // ── Check enemies reached bottom ──
      for (const e of s.enemies) {
        if (e.alive && e.y + ENEMY_H_BASE >= s.playerY) {
          s.lives = 0;
          onLivesChange(0);
          play("gameOver");
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

      // ── Wave complete? ──
      if (aliveEnemies.length === 0) {
        // Award power-up for clearing wave
        s.powerUps++;
        onPowerUpsChange(s.powerUps);
        play("levelComplete");
        s.wave++;
        onWaveChange(s.wave);
        onPhaseChange("levelcomplete");
        return;
      }

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

      // ── Render ──
      render(ctx, s, CW, CH, sc);
    },
    [phase, onPhaseChange, onScoreChange, onLivesChange, onWaveChange, onPowerUpsChange, play, setMuted, isMuted, spawnParticles]
  );

  function render(
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    CW: number,
    CH: number,
    sc: number
  ) {
    const LOG_W = CW / sc;
    const LOG_H = BASE_H;

    // ── CRITICAL: clear the ENTIRE physical canvas BEFORE any transform ──
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CW, CH);

    ctx.save();
    ctx.scale(sc, sc);

    // Screen shake
    if (s.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * 4;
      const shakeY = (Math.random() - 0.5) * 4;
      ctx.translate(shakeX, shakeY);
    }

    // Stars parallax — spread across full logical width
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 37 + s.frame * 0.2) % (LOG_W + 20)) - 10;
      const sy = ((i * 53) % (LOG_H + 20)) - 10;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Draw power-up beam behind enemies
    if (s.powerUpActive) {
      drawPowerUpBeam(ctx, s.powerUpX, s.frame, LOG_H);
    }

    // Draw enemies with spawn animation
    for (const e of s.enemies) {
      if (!e.alive) continue;
      const spawnScale = Math.min(1, s.spawnAnim + (e.y / LOG_H) * 0.5);
      if (spawnScale < 1) {
        ctx.save();
        ctx.globalAlpha = spawnScale;
        drawEnemy(ctx, e.x, e.y, e.variant, s.frame);
        ctx.restore();
      } else {
        drawEnemy(ctx, e.x, e.y, e.variant, s.frame);
      }
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

    // Draw bullets
    for (const b of s.bullets) {
      if (b.isPlayer) {
        drawPlayerBullet(ctx, b.x, b.y, s.frame);
      } else {
        drawEnemyBullet(ctx, b.x, b.y);
      }
    }

    // Draw particles
    for (const p of s.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      drawParticle(ctx, p.x, p.y, p.color, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  useGameLoop(update, phase === "playing" || phase === "menu" || phase === "paused");

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-screen h-screen"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
