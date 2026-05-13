/**
 * Impact / effect system.
 *
 * Every effect is drawn with a guaranteed canvas-based procedural animation
 * so it ALWAYS appears regardless of GIF load state.  GIFs are drawn on top
 * when they are ready, giving a richer look without blocking the fallback.
 *
 * Files live in public/effects/spritesheets/<category>/<file>.gif
 */

export type EffectKey =
  | "lightning"   // /effects/spritesheets/lightning/Lightning_1.gif
  | "bomb"        // /effects/spritesheets/bomb/Explosion_8.gif
  | "bullet"      // /effects/spritesheets/bullet/Explosion_1.gif
  | "boss"        // /effects/spritesheets/boss/Explosion_6.gif
  | "nuke"        // /effects/spritesheets/nuke/Explosion_3.gif
  | "virus";      // /effects/spritesheets/virus/Explosion_9.gif

/** Public paths for each effect GIF */
const EFFECT_PATHS: Record<EffectKey, string> = {
  lightning: "/effects/spritesheets/lightning/Lightning_1.gif",
  bomb:      "/effects/spritesheets/bomb/Explosion_8.gif",
  bullet:    "/effects/spritesheets/bullet/Explosion_1.gif",
  boss:      "/effects/spritesheets/boss/Explosion_6.gif",
  nuke:      "/effects/spritesheets/nuke/Explosion_3.gif",
  virus:     "/effects/spritesheets/virus/Explosion_9.gif",
};

/**
 * How long (seconds) to display each effect before removing it.
 */
export const EFFECT_DURATION: Record<EffectKey, number> = {
  lightning: 0.6,
  bomb:      0.8,
  bullet:    0.4,
  boss:      1.2,
  nuke:      1.0,
  virus:     0.6,
};

/**
 * Default draw size in game-coordinate units (240×320 space), centered on impact.
 */
const EFFECT_SIZE: Record<EffectKey, { w: number; h: number }> = {
  lightning: { w: 36, h: 56 },
  bomb:      { w: 56, h: 56 },
  bullet:    { w: 28, h: 28 },
  boss:      { w: 80, h: 80 },
  nuke:      { w: 110, h: 110 },
  virus:     { w: 32, h: 32 },
};

/** One live instance of an effect playing at a world position */
export interface ActiveEffect {
  key: EffectKey;
  cx: number;        // center x in game units
  cy: number;        // center y in game units
  timer: number;     // seconds remaining
  duration: number;  // total duration (for fade calc)
  /** Optional size override (game-coord units). Falls back to EFFECT_SIZE when absent. */
  w?: number;
  h?: number;
}

// ── Image cache ─────────────────────────────────────────────────────────────
const imageCache: Partial<Record<EffectKey, HTMLImageElement>> = {};
let loaded = false;

export function loadEffectSprites(): void {
  if (typeof window === "undefined" || loaded) return;
  loaded = true;
  for (const key of Object.keys(EFFECT_PATHS) as EffectKey[]) {
    const img = new Image();
    img.src = EFFECT_PATHS[key];
    imageCache[key] = img;
  }
}

export function spawnEffect(
  effects: ActiveEffect[],
  key: EffectKey,
  cx: number,
  cy: number,
  size?: { w: number; h: number },
): void {
  const duration = EFFECT_DURATION[key];
  effects.push({ key, cx, cy, timer: duration, duration, ...size });
}

export function tickEffects(effects: ActiveEffect[], dt: number): void {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].timer -= dt;
    if (effects[i].timer <= 0) effects.splice(i, 1);
  }
}

/**
 * Canvas-only procedural effect. Guaranteed to render — no image loading needed.
 * t = 0 → just spawned, t = 1 → about to expire.
 */
function drawProceduralEffect(
  ctx: CanvasRenderingContext2D,
  key: EffectKey,
  cx: number,
  cy: number,
  w: number,
  h: number,
  t: number, // progress 0→1
  alpha: number,
): void {
  const r = Math.max(w, h) / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash([]);

  switch (key) {
    case "bullet": {
      // Small white flash that quickly fades
      const br = r * (1 - t * 0.5);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, br);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.4, "#ffffaa");
      grad.addColorStop(1, "rgba(255,255,100,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, br, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bomb": {
      // Bright orange expanding ring + inner core flash
      const ring = r * (0.3 + t * 0.7);
      const coreR = r * Math.max(0, 0.5 - t);
      // Core flash
      if (coreR > 0) {
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        cg.addColorStop(0, "#ffffff");
        cg.addColorStop(0.5, "#ffdd00");
        cg.addColorStop(1, "rgba(255,100,0,0)");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
      }
      // Expanding ring
      ctx.strokeStyle = `rgba(255,${Math.floor(160 - t * 160)},0,${1 - t})`;
      ctx.lineWidth = Math.max(1, r * 0.15 * (1 - t));
      ctx.beginPath();
      ctx.arc(cx, cy, ring, 0, Math.PI * 2);
      ctx.stroke();
      // Second ring slightly behind
      ctx.strokeStyle = `rgba(255,80,0,${0.5 * (1 - t)})`;
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy, ring * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "nuke": {
      // Large white/cyan shockwave ring
      const nr = r * (0.1 + t * 0.9);
      const coreN = r * Math.max(0, 0.6 - t * 1.2);
      if (coreN > 0) {
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreN);
        ng.addColorStop(0, "#ffffff");
        ng.addColorStop(0.5, "#aaffff");
        ng.addColorStop(1, "rgba(0,220,255,0)");
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(cx, cy, coreN, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(0,220,255,${1 - t})`;
      ctx.lineWidth = Math.max(2, r * 0.12 * (1 - t));
      ctx.beginPath();
      ctx.arc(cx, cy, nr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - t)})`;
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, nr * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "lightning": {
      // Bright yellow/white radial starburst
      const rays = 8;
      const innerR = r * 0.15;
      const outerR = r * (0.6 + Math.sin(t * Math.PI) * 0.4);
      ctx.strokeStyle = `rgba(255,255,100,${1 - t})`;
      ctx.lineWidth = Math.max(1, 2 * (1 - t));
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + t * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      // Center flash
      const lfg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.3);
      lfg.addColorStop(0, `rgba(255,255,255,${1 - t})`);
      lfg.addColorStop(1, "rgba(255,255,0,0)");
      ctx.fillStyle = lfg;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "boss": {
      // Large orange ring, slower expand
      const bossR = r * (0.2 + t * 0.8);
      const bossCoreR = r * Math.max(0, 0.4 - t * 0.8);
      if (bossCoreR > 0) {
        const bcg = ctx.createRadialGradient(cx, cy, 0, cx, cy, bossCoreR);
        bcg.addColorStop(0, "#ffffff");
        bcg.addColorStop(0.5, "#ff8800");
        bcg.addColorStop(1, "rgba(255,50,0,0)");
        ctx.fillStyle = bcg;
        ctx.beginPath();
        ctx.arc(cx, cy, bossCoreR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(255,${Math.floor(100 - t * 100)},0,${1 - t * 0.7})`;
      ctx.lineWidth = Math.max(2, r * 0.1 * (1 - t));
      ctx.beginPath();
      ctx.arc(cx, cy, bossR, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "virus": {
      // Green pulsing ring
      const vr = r * (0.4 + Math.sin(t * Math.PI * 2) * 0.2 + t * 0.4);
      ctx.strokeStyle = `rgba(0,255,100,${1 - t})`;
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath();
      ctx.arc(cx, cy, vr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(100,255,0,${0.5 * (1 - t)})`;
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, vr * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/**
 * Draw all active effects. Procedural canvas animation always renders;
 * GIF is layered on top when available.
 */
export function drawEffects(
  ctx: CanvasRenderingContext2D,
  effects: ActiveEffect[],
): void {
  for (const ef of effects) {
    const defaultSize = EFFECT_SIZE[ef.key];
    const w = ef.w ?? defaultSize.w;
    const h = ef.h ?? defaultSize.h;
    const t = 1 - ef.timer / ef.duration; // 0 = just spawned, 1 = expiring
    const fadeRatio = ef.timer / ef.duration;
    const alpha = fadeRatio < 0.25 ? fadeRatio / 0.25 : 1;

    // ── Guaranteed procedural effect ──────────────────────────────────
    drawProceduralEffect(ctx, ef.key, ef.cx, ef.cy, w, h, t, alpha);

    // ── Optional GIF overlay (drawn on top when loaded) ───────────────
    const img = imageCache[ef.key];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.85; // slightly transparent so procedural shows through
      try {
        ctx.drawImage(img, ef.cx - w / 2, ef.cy - h / 2, w, h);
      } catch {
        // not yet decodable — skip silently
      }
      ctx.restore();
    }
  }
}
