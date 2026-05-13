/**
 * GIF-based impact / effect system.
 *
 * GIFs are loaded once and drawn onto the canvas via ctx.drawImage().
 * The browser advances GIF frames automatically; each drawImage() call
 * captures whatever frame the GIF is currently showing.
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
 * Should roughly match one full GIF loop duration.
 */
export const EFFECT_DURATION: Record<EffectKey, number> = {
  lightning: 0.5,
  bomb:      0.8,
  bullet:    0.4,
  boss:      1.2,
  nuke:      1.0,
  virus:     0.6,
};

/**
 * Draw size in game-coordinate units (240×320 space), centered on impact.
 * Tweak these to match how large each GIF looks on screen.
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

/**
 * Call once at component mount (client-side only).
 * All GIFs start loading in the background immediately.
 */
export function loadEffectSprites(): void {
  if (typeof window === "undefined" || loaded) return;
  loaded = true;
  for (const key of Object.keys(EFFECT_PATHS) as EffectKey[]) {
    const img = new Image();
    img.src = EFFECT_PATHS[key];
    imageCache[key] = img;
  }
}

/**
 * Add a new effect instance to the active list.
 * @param cx   Center X of the impact in game units
 * @param cy   Center Y of the impact in game units
 * @param size Optional size override `{ w, h }` in game-coordinate units.
 *             When omitted the default EFFECT_SIZE for that key is used.
 */
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

/**
 * Advance all active effect timers. Call once per update tick.
 * Removes effects that have expired.
 */
export function tickEffects(effects: ActiveEffect[], dt: number): void {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].timer -= dt;
    if (effects[i].timer <= 0) effects.splice(i, 1);
  }
}

/**
 * Draw all active effects. Call during the render pass.
 * Effects are drawn centered on (cx, cy) and fade out in the final 25%.
 */
export function drawEffects(
  ctx: CanvasRenderingContext2D,
  effects: ActiveEffect[],
): void {
  for (const ef of effects) {
    const img = imageCache[ef.key];
    // Some browsers (especially with animated GIFs) may report naturalWidth === 0
    // even after the image has loaded. Only skip if the element is missing entirely.
    if (!img || !img.complete) continue;

    const defaultSize = EFFECT_SIZE[ef.key];
    const w = ef.w ?? defaultSize.w;
    const h = ef.h ?? defaultSize.h;
    const fadeRatio = ef.timer / ef.duration;
    const alpha = fadeRatio < 0.25 ? fadeRatio / 0.25 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    try {
      ctx.drawImage(img, ef.cx - w / 2, ef.cy - h / 2, w, h);
    } catch {
      // Image not ready to draw yet — skip this frame silently
    }
    ctx.restore();
  }
}
