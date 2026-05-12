/**
 * Boss PNG-sequence animation system.
 *
 * 18 boss skins live in:
 *   public/bosses/spritesheets/boss{1-18}/{Action}/0_{Creature}_{Action}_{###}.png
 *
 * Frame counts per action (same for every boss):
 *   Walking  : 24 frames (loops)
 *   Throwing : 12 frames (one-shot, then returns to Walking)
 *   Hurt     : 12 frames (one-shot, then returns to Walking)
 *   Dying    : 15 frames (one-shot, boss is removed after)
 *
 * Skins are lazy-loaded when a boss wave starts — only the selected
 * skin's images are fetched, keeping initial page load fast.
 */

export type BossAnimState = "walking" | "throwing" | "hurt" | "dying";

/** Seconds per frame (all actions share the same FPS) */
const BOSS_FPS = 12;

const FRAME_COUNTS: Record<BossAnimState, number> = {
  walking:  24,
  throwing: 12,
  hurt:     12,
  dying:    15,
};

/** Maps boss folder number (1-18) to the creature name prefix in filenames */
const BOSS_CREATURE: Partial<Record<number, string>> = {
  1: "Minotaur",           2: "Minotaur",           3: "Minotaur",
  4: "Zombie_Villager",    5: "Zombie_Villager",     6: "Zombie_Villager",
  7: "Skeleton_Warrior",   8: "Skeleton_Warrior",    9: "Skeleton_Warrior",
  // 10, 11, 12 — folders are empty; these fall back to procedural drawing
  13: "Valkyrie",          14: "Valkyrie",           15: "Valkyrie",
  16: "Skeleton_Crusader", 17: "Skeleton_Crusader",  18: "Skeleton_Crusader",
};

const ACTION_FOLDER: Record<BossAnimState, string> = {
  walking:  "Walking",
  throwing: "Throwing",
  hurt:     "Hurt",
  dying:    "Dying",
};

// ── Image cache ──────────────────────────────────────────────────────────────
// imageCache[skinIndex][action] = array of HTMLImageElement (one per frame)
type SkinCache = Partial<Record<BossAnimState, HTMLImageElement[]>>;
const imageCache: Partial<Record<number, SkinCache>> = {};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Begins loading all frames for the given boss skin index (1-18).
 * Safe to call during a wave-start when the skin is first chosen.
 * Already-loaded skins are skipped instantly.
 */
export function loadBossSkin(skinIndex: number): void {
  if (typeof window === "undefined") return;
  if (imageCache[skinIndex]) return; // already in-flight or complete

  const creature = BOSS_CREATURE[skinIndex];
  if (!creature) return; // empty folder — no assets to load

  const cache: SkinCache = {};
  imageCache[skinIndex] = cache;

  for (const state of Object.keys(FRAME_COUNTS) as BossAnimState[]) {
    const count = FRAME_COUNTS[state];
    const folder = ACTION_FOLDER[state];
    const frames: HTMLImageElement[] = [];

    for (let i = 0; i < count; i++) {
      const pad = String(i).padStart(3, "0");
      const img = new Image();
      img.src = `/bosses/spritesheets/boss${skinIndex}/${folder}/0_${creature}_${folder}_${pad}.png`;
      frames.push(img);
    }
    cache[state] = frames;
  }
}

/**
 * Returns true when a one-shot animation (hurt / throwing / dying) has finished.
 * Walking always returns false — it loops forever.
 */
export function isBossAnimComplete(state: BossAnimState, animAccum: number): boolean {
  if (state === "walking") return false;
  return animAccum >= FRAME_COUNTS[state] / BOSS_FPS;
}

/** Total duration (seconds) of one full animation cycle. */
export function bossAnimDuration(state: BossAnimState): number {
  return FRAME_COUNTS[state] / BOSS_FPS;
}

/**
 * Draws the current frame of the boss sprite.
 * Falls back to `fallback()` if assets haven't finished loading yet.
 *
 * @param skinIndex  1-18 (which boss variant to render)
 * @param animAccum  Seconds elapsed in the current animation state
 * @param hitFlash   > 0 while the boss is flashing red after being hit
 */
export function drawBossSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  skinIndex: number,
  state: BossAnimState,
  animAccum: number,
  hitFlash: number,
  fallback: () => void,
): void {
  const skinCache = imageCache[skinIndex];
  const frames = skinCache?.[state];

  // Fallback if no frames available yet
  if (!frames || frames.length === 0) { fallback(); return; }

  const count = FRAME_COUNTS[state];
  const rawFrame = Math.floor(animAccum * BOSS_FPS);
  const frameIndex = state === "walking"
    ? rawFrame % count
    : Math.min(rawFrame, count - 1);

  const img = frames[frameIndex];
  if (!img || !img.complete || img.naturalWidth === 0) { fallback(); return; }

  ctx.save();
  if (hitFlash > 0) {
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.5;
  }
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}
