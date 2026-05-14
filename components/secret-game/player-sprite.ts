/**
 * Player sprite sheet loader and renderer.
 *
 * Sheet layout (read left→right):
 *   Row 0 : walking up    (back)
 *   Row 1 : walking left
 *   Row 2 : walking down  (front)
 *   Row 3 : walking right
 *
 * File: public/player/player.png
 */

export type PlayerFacing = "up" | "down" | "left" | "right";

const ROWS: Record<PlayerFacing, number> = {
  up: 0,
  left: 1,
  down: 2,
  right: 3,
};

/** Default frame count — can be overridden via sprite config. */
const DEFAULT_COLS = 12;

let playerSheet: HTMLImageElement | null = null;
let playerSheetLoaded = false;

export function loadPlayerSprite(): void {
  if (typeof window === "undefined" || playerSheetLoaded) return;
  playerSheetLoaded = true;
  playerSheet = new Image();
  playerSheet.src = "/player/player.png";
}

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: PlayerFacing,
  animAccum: number,
  w: number,
  h: number,
  cols = DEFAULT_COLS,
  fallback: () => void,
): void {
  if (!playerSheet?.complete || playerSheet.naturalWidth === 0) {
    fallback();
    return;
  }

  const fw = playerSheet.naturalWidth / cols;
  const fh = playerSheet.naturalHeight / 4;
  const row = ROWS[facing];
  const frame = Math.floor(animAccum * 10) % cols;

  ctx.drawImage(
    playerSheet,
    frame * fw,
    row * fh,
    fw,
    fh,
    x,
    y,
    w,
    h,
  );
}
