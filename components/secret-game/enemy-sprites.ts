/**
 * Enemy sprite sheet loader and renderer.
 *
 * Sheet layouts (all read left→right, then next row):
 *   Walking : 4 cols × 5 rows = 20 frames
 *   Hurt    : 5 cols × 2 rows = 10 frames
 *   Dying   : 5 cols × 2 rows = 10 frames
 *
 * Files live in public/enemies/spritesheets/<Name><Anim>.png
 * e.g. ThugWalking.png, Thug2Hurt.png, Thug3Dying.png
 */

export type EnemyAnimState = "walking" | "hurt" | "dying";

interface AnimMeta {
  cols: number;
  rows: number;
  totalFrames: number;
  fps: number;
}

const ANIM_META: Record<EnemyAnimState, AnimMeta> = {
  walking: { cols: 4, rows: 5, totalFrames: 20, fps: 8  },
  hurt:    { cols: 5, rows: 2, totalFrames: 10, fps: 15 },
  dying:   { cols: 5, rows: 2, totalFrames: 10, fps: 10 },
};

/** Maps variant index to sprite sheet name prefix */
const VARIANT_NAMES = ["Thug", "Thug2", "Thug3"] as const;

type AnimSuffix = "Walking" | "Hurt" | "Dying";
const ANIM_SUFFIX: Record<EnemyAnimState, AnimSuffix> = {
  walking: "Walking",
  hurt:    "Hurt",
  dying:   "Dying",
};

/** Singleton image cache: key = "Thug_Walking", "Thug2_Hurt", etc. */
const imageCache: Partial<Record<string, HTMLImageElement>> = {};
let spritesLoaded = false;

/**
 * Call once at component mount (client-side only).
 * Starts loading all 9 sprite sheets in the background.
 */
export function loadEnemySprites(): void {
  if (typeof window === "undefined" || spritesLoaded) return;
  spritesLoaded = true;
  for (const name of VARIANT_NAMES) {
    for (const suffix of ["Walking", "Hurt", "Dying"] as AnimSuffix[]) {
      const key = `${name}_${suffix}`;
      if (imageCache[key]) continue;
      const img = new Image();
      img.src = `/enemies/spritesheets/${name}${suffix}.png`;
      imageCache[key] = img;
    }
  }
}

/**
 * Returns true if a one-shot animation (hurt / dying) has finished playing.
 * Walking always returns false (it loops).
 */
export function isAnimComplete(state: EnemyAnimState, animAccum: number): boolean {
  if (state === "walking") return false;
  const meta = ANIM_META[state];
  return animAccum >= meta.totalFrames / meta.fps;
}

/** Total duration in seconds for one full play of an animation. */
export function animDuration(state: EnemyAnimState): number {
  const { totalFrames, fps } = ANIM_META[state];
  return totalFrames / fps;
}

/**
 * Draw one frame of the enemy sprite.
 * Falls back to `fallback()` if the image hasn't loaded yet.
 *
 * @param animAccum  Seconds elapsed in the current animation (resets on state change)
 */
export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 0 | 1 | 2,
  state: EnemyAnimState,
  animAccum: number,
  w: number,
  h: number,
  fallback: () => void,
): void {
  const key = `${VARIANT_NAMES[variant]}_${ANIM_SUFFIX[state]}`;
  const img = imageCache[key];

  if (!img || !img.complete || img.naturalWidth === 0) {
    fallback();
    return;
  }

  const meta = ANIM_META[state];
  // For dying/hurt clamp to last frame; walking loops
  const rawFrame = Math.floor(animAccum * meta.fps);
  const frameIndex = state === "walking"
    ? rawFrame % meta.totalFrames
    : Math.min(rawFrame, meta.totalFrames - 1);

  const col = frameIndex % meta.cols;
  const row = Math.floor(frameIndex / meta.cols);
  const fw = img.naturalWidth  / meta.cols;
  const fh = img.naturalHeight / meta.rows;

  ctx.drawImage(img, col * fw, row * fh, fw, fh, x, y, w, h);
}
