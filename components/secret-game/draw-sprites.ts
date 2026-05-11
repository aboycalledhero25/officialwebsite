/* ─────────────────────────────────────────────
   Procedural 8-bit sprite drawing helpers.
   All sprites are drawn as pixel grids using
   Canvas 2D fillRect for authentic crisp edges.
   Coordinates are in base resolution units (240×320).
   ───────────────────────────────────────────── */

/* ── Player: vertical pink electric guitar ── */
export function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const pink = "#ff006e";
  const darkPink = "#c40057";
  const neck = "#5a3a2a"; // fretboard wood
  const headstock = "#ff006e";
  const pickup = "#fcee0a";
  const bridge = "#00f0ff";

  // Neck (thin, goes up)
  ctx.fillStyle = neck;
  ctx.fillRect(x + 4, y + 0, 2, 10);

  // Frets (tiny white dots)
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(x + 4, y + 2, 2, 1);
  ctx.fillRect(x + 4, y + 4, 2, 1);
  ctx.fillRect(x + 4, y + 6, 2, 1);
  ctx.fillRect(x + 4, y + 8, 2, 1);

  // Headstock
  ctx.fillStyle = headstock;
  ctx.fillRect(x + 3, y - 2, 4, 3);
  ctx.fillRect(x + 2, y - 1, 1, 2);

  // Tuning pegs
  ctx.fillStyle = "#fcee0a";
  ctx.fillRect(x + 2, y - 1, 1, 1);
  ctx.fillRect(x + 7, y - 1, 1, 1);

  // Guitar body — strat-style double-cutaway shape built from rects
  ctx.fillStyle = pink;
  // Upper horn
  ctx.fillRect(x + 2, y + 10, 2, 3);
  // Lower horn
  ctx.fillRect(x + 6, y + 10, 2, 3);
  // Main body
  ctx.fillRect(x + 1, y + 12, 8, 6);
  // Bottom curve
  ctx.fillRect(x + 2, y + 18, 6, 2);

  // Body outline / depth (darkPink edges)
  ctx.fillStyle = darkPink;
  ctx.fillRect(x + 1, y + 12, 1, 6);
  ctx.fillRect(x + 8, y + 12, 1, 6);
  ctx.fillRect(x + 2, y + 18, 1, 2);
  ctx.fillRect(x + 7, y + 18, 1, 2);

  // Pickguard (yellow accent)
  ctx.fillStyle = pickup;
  ctx.fillRect(x + 3, y + 13, 4, 3);

  // Bridge (cyan)
  ctx.fillStyle = bridge;
  ctx.fillRect(x + 3, y + 17, 4, 1);

  // Knobs
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 1, y + 15, 1, 1);
  ctx.fillRect(x + 8, y + 15, 1, 1);
}

/* ── Enemies: fans invading the stage ── */
function drawFanBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 0 | 1 | 2
) {
  // Fan colour palettes per variant
  const shirtColor = variant === 0 ? "#ff006e" : variant === 1 ? "#00f0ff" : "#fcee0a";
  const skinTone = variant === 0 ? "#ffccaa" : variant === 1 ? "#eabb9e" : "#ddb090";
  const hairColor = variant === 0 ? "#3a2818" : variant === 1 ? "#d4a017" : "#8b0000";
  const pantsColor = "#2a2a3a";

  // ── Legs ──
  ctx.fillStyle = pantsColor;
  ctx.fillRect(x + 2, y + 8, 2, 3); // left leg
  ctx.fillRect(x + 6, y + 8, 2, 3); // right leg

  // ── Torso / Shirt ──
  ctx.fillStyle = shirtColor;
  ctx.fillRect(x + 1, y + 4, 8, 5);

  // Shirt detail (band logo stripe)
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(x + 1, y + 5, 8, 1);

  // ── Arms raised ──
  ctx.fillStyle = skinTone;
  // Left arm angled up
  ctx.fillRect(x + 0, y + 2, 2, 3);
  ctx.fillRect(x - 1, y + 0, 2, 2);
  // Right arm angled up
  ctx.fillRect(x + 8, y + 2, 2, 3);
  ctx.fillRect(x + 9, y + 0, 2, 2);

  // Hands
  ctx.fillStyle = skinTone;
  ctx.fillRect(x - 1, y - 1, 2, 1);
  ctx.fillRect(x + 9, y - 1, 2, 1);

  // ── Head ──
  ctx.fillStyle = skinTone;
  ctx.fillRect(x + 3, y + 0, 4, 4);

  // ── Hair ──
  ctx.fillStyle = hairColor;
  if (variant === 0) {
    // Short dark hair
    ctx.fillRect(x + 3, y - 1, 4, 2);
    ctx.fillRect(x + 2, y + 0, 1, 2);
    ctx.fillRect(x + 7, y + 0, 1, 2);
  } else if (variant === 1) {
    // Blonde long hair
    ctx.fillRect(x + 3, y - 1, 4, 2);
    ctx.fillRect(x + 2, y + 0, 1, 4);
    ctx.fillRect(x + 7, y + 0, 1, 4);
  } else {
    // Red mohawk / spiky
    ctx.fillRect(x + 3, y - 2, 4, 2);
    ctx.fillRect(x + 4, y - 3, 2, 1);
  }

  // ── Face (eyes + mouth) ──
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 4, y + 2, 1, 1); // left eye
  ctx.fillRect(x + 6, y + 2, 1, 1); // right eye

  // Mouth — open cheering
  ctx.fillStyle = "#aa0000";
  ctx.fillRect(x + 4, y + 3, 2, 1);

  // ── Prop in hand ──
  if (variant === 0) {
    // Phone glow
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 2, y - 2, 2, 2);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(x - 3, y - 3, 4, 4);
  } else if (variant === 1) {
    // Glow stick
    ctx.fillStyle = "#00f0ff";
    ctx.fillRect(x + 10, y - 3, 1, 4);
    ctx.fillStyle = "rgba(0,240,255,0.3)";
    ctx.fillRect(x + 9, y - 4, 3, 6);
  } else {
    // Lighter flame
    ctx.fillStyle = "#ff6600";
    ctx.fillRect(x - 2, y - 3, 1, 2);
    ctx.fillRect(x - 3, y - 4, 2, 2);
  }
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 0 | 1 | 2,
  frame: number
) {
  // Subtle bob animation — fans bouncing to the beat
  const bob = Math.sin(frame * 0.2 + variant * 2) * 1;
  drawFanBody(ctx, x, y + bob, variant);
}

/* ── Player bullet: animated electricity strand ── */
export function drawPlayerBullet(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const turquoise = "#00f0ff";
  const bright = "#ffffff";

  // Main jagged strand
  ctx.fillStyle = turquoise;

  // Build a zigzag lightning bolt shape
  const jitter = (n: number) => Math.sin(frame * 0.8 + n * 3) * 1.5;

  // Left edge zigzag
  for (let i = 0; i < 8; i++) {
    const by = y + i;
    const bx = x + jitter(i);
    ctx.fillRect(bx, by, 2, 1);
  }

  // Right edge zigzag (offset phase)
  for (let i = 0; i < 8; i++) {
    const by = y + i;
    const bx = x + 2 + jitter(i + 2);
    ctx.fillRect(bx, by, 1, 1);
  }

  // Bright core (random flicker)
  if (frame % 3 === 0) {
    ctx.fillStyle = bright;
    ctx.fillRect(x + 1 + jitter(0), y + 2, 1, 3);
  }

  // Glow spark at tip
  ctx.fillStyle = turquoise;
  ctx.fillRect(x + jitter(8), y - 1, 2, 1);
}

/* ── Enemy bullet ── */
export function drawEnemyBullet(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#ff006e";
  ctx.fillRect(x, y, 2, 4);
}

/* ── Particle explosion ── */
export function drawParticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number
) {
  ctx.fillStyle = color;
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
}

/* ── Barricade / shield block ── */
export function drawBarricade(ctx: CanvasRenderingContext2D, x: number, y: number, health: number) {
  const alpha = Math.max(0.3, health / 3);
  ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
  ctx.fillRect(x, y, 4, 4);
}
