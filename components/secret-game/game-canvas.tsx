"use client";

import { useRef, useEffect, useCallback } from "react";
import { useGameLoop } from "./use-game-loop";
import { useKeyboardControls, sharedKeys, sharedTouch, sharedAim } from "./use-keyboard-controls";
import { useAudioSfx } from "./use-audio-sfx";
import { useSiteData } from "@/components/data-provider";
import {
  drawPlayer,
  drawEnemy,
  drawPlayerBullet,
  drawEnemyBullet,
  drawParticle,
  drawPowerUp,
} from "./draw-sprites";

export type GamePhase = "menu" | "playing" | "paused" | "gameover" | "levelcomplete";

/* ── Base resolution (reference coordinate system) ── */
const BASE_H = 320;
const BASE_W = 240;

/* ── Game constants (in base units) ── */
const PLAYER_SPEED_BASE = 90;
const BULLET_SPEED_BASE = 180;
const ENEMY_W_BASE = 14;
const ENEMY_H_BASE = 10;
const PLAYER_W_BASE = 10;
const PLAYER_H_BASE = 20;
const MAX_LIVES = 3;

/* ── Power-up constants ── */
const POWERUP_DRIFT_SPEED = 20;
const POWERUP_RAPID_DURATION = 5;
const POWERUP_WIDESHOT_DURATION = 4;
const POWERUP_INVINCIBLE_DURATION = 4;

type PowerUpType = "rapid" | "shield" | "wideshot" | "extralife" | "invincible";

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
}

interface ActivePowerUp {
  type: PowerUpType;
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
  score: number;
  lives: number;
  wave: number;
}

export function GameCanvas({
  phase,
  resetKey,
  onPhaseChange,
  onScoreChange,
  onLivesChange,
  onWaveChange,
  onPowerUpChange,
  score,
  lives,
  wave,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimsRef = useRef({ w: BASE_W, h: BASE_H, scale: 1 });
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  useKeyboardControls();
  const { play, setMuted, isMuted } = useAudioSfx();
  const siteData = useSiteData();
  const spriteConfig = siteData.secretGame?.playerSprite ?? { offsetX: -2, offsetY: -12, width: 14, height: 42 };

  // Load platform-specific game settings once at mount
  const isMobileAtMount = typeof window !== "undefined" && (window.innerWidth < 768 || "ontouchstart" in window);
  const platformSettings = siteData.secretGame?.[isMobileAtMount ? "mobile" : "desktop"];
  const settingsRef = useRef(platformSettings ?? {
    player: { x: 115, y: 265 },
    enemy: { speed: 18, fireRate: 0.003, projectileSpeed: 60, columns: 5, rows: 3, startY: 30, paddingX: 6, paddingY: 8, dropDistance: 6 },
  });

  // Load custom guitar sprite
  useEffect(() => {
    const img = new Image();
    img.src = "/images/guitar.png";
    img.onload = () => {
      playerImageRef.current = img;
    };
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
    }[],
    bullets: [] as { x: number; y: number; vx: number; vy: number; isPlayer: boolean; variant?: 0 | 1 | 2 }[],
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
    powerups: [] as PowerUp[],
    activePowerUps: [] as ActivePowerUp[],
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
    playAreaW: BASE_W,
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
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getScaled = () => dimsRef.current.scale;

  const initWave = useCallback((w: number) => {
    const s = stateRef.current;
    s.enemies = [];
    s.bullets = []; // clear all projectiles on new wave
    const edgeMargin = 4;
    const { w: CW, h: CH } = dimsRef.current;
    const sc = CH / BASE_H;
    const logW = CW / sc;
    const cfg = settingsRef.current.enemy;
    const maxW = logW - edgeMargin * 2;
    const colUnit = ENEMY_W_BASE + cfg.paddingX;
    const maxCols = Math.max(1, Math.floor((maxW + cfg.paddingX) / colUnit));
    const cols = Math.min(maxCols, cfg.columns + Math.floor((w - 1) / 2));
    const rows = cfg.rows + Math.floor((w - 1) / 3);
    const totalW = cols * colUnit - cfg.paddingX;
    const startX = Math.max(edgeMargin, (logW - totalW) / 2);
    const startY = Math.max(3, cfg.startY); // ensure enemy hair is visible

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        s.enemies.push({
          x: startX + c * (ENEMY_W_BASE + cfg.paddingX),
          y: startY + r * (ENEMY_H_BASE + cfg.paddingY),
          variant: ((r + c) % 3) as 0 | 1 | 2,
          alive: true,
          cooldown: Math.random() * 2, // staggered firing times
        });
      }
    }

    s.enemySpeed = cfg.speed;
    s.enemyFireChance = cfg.fireRate;
    s.wave = w;
    s.spawnAnim = 0;
    s.playAreaW = logW;
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    const cfg = settingsRef.current;
    const { w: CW, h: CH } = dimsRef.current;
    const sc = CH / BASE_H;
    const logW = CW / sc;
    const xScale = logW / BASE_W;
    s.playerX = cfg.player.x * xScale;
    s.playerY = cfg.player.y;
    s.playerCooldown = 0;
    s.bullets = [];
    s.particles = [];
    s.powerups = [];
    s.activePowerUps = [];
    s.enemyDir = 1;
    s.enemyDropAccum = 0;
    s.screenShake = 0;
    s.frame = 0;
    s.score = 0;
    s.lives = MAX_LIVES;
    s.wave = 1;
    onScoreChange(0);
    onLivesChange(MAX_LIVES);
    onWaveChange(1);
    if (onPowerUpChange) onPowerUpChange([]);
    s.playAreaW = logW;
    initWave(1);
  }, [initWave, onScoreChange, onLivesChange, onWaveChange, onPowerUpChange]);

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

  // Sync external score/lives/wave
  useEffect(() => { stateRef.current.score = score; }, [score]);
  useEffect(() => { stateRef.current.lives = lives; }, [lives]);
  useEffect(() => { stateRef.current.wave = wave; }, [wave]);

  // Handle phase transitions
  useEffect(() => {
    if (phase === "playing" && stateRef.current.lives <= 0) {
      resetGame();
    }
    if (phase === "playing" && stateRef.current.enemies.filter((e) => e.alive).length === 0) {
      const nextWave = stateRef.current.wave + 1;
      onWaveChange(nextWave);
      initWave(nextWave);
    }
  }, [phase, resetGame, initWave, onWaveChange]);

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
      const logW = CW / sc;
      const playAreaW = logW;

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
      if (sharedTouch.targetX !== null && sharedTouch.targetY !== null) {
        // Mobile follow-finger: smooth lerp toward touch target
        const targetX = Math.max(0, Math.min(playAreaW - PLAYER_W_BASE, sharedTouch.targetX * (logW / BASE_W)));
        const targetY = Math.max(0, Math.min(BASE_H - PLAYER_H_BASE, sharedTouch.targetY));
        s.playerX += (targetX - s.playerX) * Math.min(1, pSpeed * 2.5 * dt);
        s.playerY += (targetY - s.playerY) * Math.min(1, pSpeed * 2.5 * dt);
      } else {
        // Keyboard control
        if (keys.left) s.playerX -= pSpeed * dt;
        if (keys.right) s.playerX += pSpeed * dt;
        if (keys.up) s.playerY -= pSpeed * dt;
        if (keys.down) s.playerY += pSpeed * dt;
      }
      s.playerX = Math.max(0, Math.min(playAreaW - PLAYER_W_BASE, s.playerX));
      s.playerY = Math.max(0, Math.min(BASE_H - PLAYER_H_BASE, s.playerY));

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

      // ── Player shooting ──
      s.playerCooldown -= dt;
      const firing = keys.shoot || sharedAim.firing;
      if (firing && s.playerCooldown <= 0) {
        const wideShot = s.activePowerUps.find((p) => p.type === "wideshot");
        const rapid = s.activePowerUps.find((p) => p.type === "rapid");
        const rapidStacks = rapid?.stacks ?? 0;
        const baseCooldown = rapidStacks > 0 ? Math.max(0.06, 0.12 - 0.02 * (rapidStacks - 1)) : 0.35;

        const px = s.playerX + PLAYER_W_BASE / 2;
        const py = s.playerY + PLAYER_H_BASE / 2;
        // Default straight-up aim
        let aimX = px;
        let aimY = py - 10;
        // Use directional aim only when aiming mode is active
        if (sharedAim.aiming && sharedAim.x != null && sharedAim.y != null) {
          aimX = sharedAim.x * (logW / BASE_W);
          aimY = sharedAim.y;
        }
        const dx = aimX - px;
        const dy = aimY - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = BULLET_SPEED_BASE;

        let vx = 0;
        let vy = -speed;
        if (dist > 1) {
          vx = (dx / dist) * speed;
          vy = (dy / dist) * speed;
        }

        if (wideShot) {
          const baseAngle = Math.atan2(vy, vx);
          const spread = 0.26; // ~15°
          const bulletCount = 2 + wideShot.stacks; // 3, 4, 5...
          for (let i = 0; i < bulletCount; i++) {
            const angle = baseAngle - spread + (spread * 2 * i) / (bulletCount - 1);
            s.bullets.push({
              x: px,
              y: py,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              isPlayer: true,
            });
          }
        } else {
          s.bullets.push({
            x: px,
            y: py,
            vx,
            vy,
            isPlayer: true,
          });
        }
        s.playerCooldown = baseCooldown;
        play("shoot");
      }

      // ── Enemy movement ──
      const edgeMargin = 4;
      let hitEdge = false;
      const moveAmount = s.enemySpeed * dt;

      // Check if next move would hit edge BEFORE moving
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const nextX = e.x + s.enemyDir * moveAmount;
        if (nextX <= edgeMargin || nextX + ENEMY_W_BASE >= playAreaW - edgeMargin) {
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
        }
      }

      // ── Enemy shooting (rate-limited: 1 shot per second per enemy) ──
      const aliveEnemies = s.enemies.filter((e) => e.alive);
      const cfg = settingsRef.current.enemy;
      aliveEnemies.forEach((e) => {
        e.cooldown -= dt;
        if (e.cooldown <= 0 && Math.random() < s.enemyFireChance) {
          s.bullets.push({
            x: e.x + ENEMY_W_BASE / 2,
            y: e.y + ENEMY_H_BASE,
            vx: 0,
            vy: cfg.projectileSpeed,
            isPlayer: false,
            variant: Math.floor(Math.random() * 3) as 0 | 1 | 2,
          });
          e.cooldown = 1; // 1 second cooldown
        }
      });

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
        // AABB collision with player
        if (
          pu.x < s.playerX + PLAYER_W_BASE &&
          pu.x + powerUpSize > s.playerX &&
          pu.y < s.playerY + PLAYER_H_BASE &&
          pu.y + powerUpSize > s.playerY
        ) {
          // Apply power-up
          if (pu.type === "extralife") {
            s.lives = Math.min(MAX_LIVES + 2, s.lives + 1); // allow up to 5 lives total
            onLivesChange(s.lives);
            play("levelComplete"); // reuse cheerful sound
          } else {
            const duration =
              pu.type === "rapid" ? POWERUP_RAPID_DURATION :
              pu.type === "invincible" ? POWERUP_INVINCIBLE_DURATION :
              POWERUP_WIDESHOT_DURATION;
            const existing = s.activePowerUps.find((p) => p.type === pu.type);
            if (existing) {
              existing.timer = duration;
              existing.stacks = (existing.stacks || 1) + 1;
            } else {
              s.activePowerUps.push({ type: pu.type, timer: duration, stacks: 1 });
            }
            if (onPowerUpChange) onPowerUpChange(s.activePowerUps);
          }
          const puColor =
            pu.type === "rapid" ? "#ff8800" :
            pu.type === "shield" ? "#00f0ff" :
            pu.type === "wideshot" ? "#fcee0a" :
            pu.type === "invincible" ? "#ffd700" : "#ff006e";
          spawnParticles(pu.x + powerUpSize / 2, pu.y + powerUpSize / 2, puColor, 6);
          s.powerups.splice(i, 1);
        }
      }

      // ── Bullet update ──
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        b.x += (b.vx || 0) * dt;
        b.y += b.vy * dt;
        if (b.y < -20 || b.y > BASE_H + 20 || b.x < -20 || b.x > playAreaW + 20) {
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

            // Chance to spawn power-up
            const spawnChance = siteData.secretGame?.powerUpSpawnChance ?? 0.12;
            if (Math.random() < spawnChance) {
              const types: PowerUpType[] = ["rapid", "shield", "wideshot", "extralife", "invincible"];
              const type = types[Math.floor(Math.random() * types.length)];
              const pSize = siteData.secretGame?.powerUpSize ?? 8;
              s.powerups.push({
                x: e.x + ENEMY_W_BASE / 2 - pSize / 2,
                y: e.y + ENEMY_H_BASE / 2,
                type,
              });
            }
            break;
          }
        }
      }

      // ── Collision: player bullets vs enemy bullets ──
      const ENEMY_BULLET_HITBOX = 4;
      for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
        const pb = s.bullets[bi];
        if (!pb.isPlayer) continue;
        for (let ebi = s.bullets.length - 1; ebi >= 0; ebi--) {
          const eb = s.bullets[ebi];
          if (eb.isPlayer) continue;
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
            break;
          }
        }
      }

      // ── Collision: enemy bullets vs player ──
      const px = s.playerX;
      const py = s.playerY;
      const pw = PLAYER_W_BASE;
      const ph = PLAYER_H_BASE;
      const hasShield = s.activePowerUps.some((p) => p.type === "shield");
      const isInvincible = s.activePowerUps.some((p) => p.type === "invincible");
      for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
        const b = s.bullets[bi];
        if (b.isPlayer) continue;
        if (b.x >= px && b.x <= px + pw && b.y >= py && b.y <= py + ph) {
          s.bullets.splice(bi, 1);
          if (isInvincible) {
            // Invincible — ignore hit
            continue;
          }
          if (hasShield) {
            // Shield absorbs one hit then breaks
            const shieldIdx = s.activePowerUps.findIndex((p) => p.type === "shield");
            if (shieldIdx >= 0) {
              s.activePowerUps.splice(shieldIdx, 1);
              if (onPowerUpChange) onPowerUpChange(s.activePowerUps);
            }
            spawnParticles(px + pw / 2, py + ph / 2, "#00f0ff", 6);
            play("shoot"); // reuse a light sound
            continue;
          }
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

      // ── Wave complete? ──
      if (aliveEnemies.length === 0) {
        play("levelComplete");
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
    [phase, onPhaseChange, onScoreChange, onLivesChange, onWaveChange, play, setMuted, isMuted, spawnParticles, onPowerUpChange]
  );

  function render(
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    CW: number,
    CH: number,
    sc: number
  ) {
    const logW = CW / sc;
    const logH = BASE_H;

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
      const sx = ((i * 37 + s.frame * 0.2) % (logW + 20)) - 10;
      const sy = ((i * 53) % (logH + 20)) - 10;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Draw power-ups
    const puSize = siteData.secretGame?.powerUpSize ?? 8;
    for (const pu of s.powerups) {
      drawPowerUp(ctx, pu.x, pu.y, pu.type, s.frame, puSize);
    }

    // Draw enemies with spawn animation
    for (const e of s.enemies) {
      if (!e.alive) continue;
      const spawnScale = Math.min(1, s.spawnAnim + (e.y / logH) * 0.5);
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

    // Draw shield bubble if active
    if (s.activePowerUps.some((p) => p.type === "shield")) {
      const shieldCfg = settingsRef.current.shield;
      const sc = spriteConfig;
      const cx = s.playerX + sc.offsetX + sc.width / 2 + (shieldCfg?.offsetX ?? 0);
      const cy = s.playerY + sc.offsetY + sc.height / 2 + (shieldCfg?.offsetY ?? 0);
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 + Math.sin(s.frame * 0.3) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, shieldCfg?.radius ?? 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(0, 240, 255, 0.08)`;
      ctx.fill();
    }

    // Draw bullets
    for (const b of s.bullets) {
      if (b.isPlayer) {
        drawPlayerBullet(ctx, b.x, b.y, s.frame);
      } else {
        drawEnemyBullet(ctx, b.x, b.y, b.variant ?? 0);
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


