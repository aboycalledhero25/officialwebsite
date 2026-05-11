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

/* ── Enemy projectile: 8-bit underwear, bra, or beer can ── */
export function drawEnemyBullet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 0 | 1 | 2
) {
  switch (variant) {
    case 0: {
      // ── Underwear (briefs) ──
      const ux = x - 3;
      const uy = y;
      // Waistband
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(ux + 1, uy, 6, 1);
      // Main body (skin tone base)
      ctx.fillStyle = "#e8c4a0";
      ctx.fillRect(ux, uy + 1, 8, 3);
      // Leg holes
      ctx.fillStyle = "#111";
      ctx.fillRect(ux, uy + 3, 2, 1);
      ctx.fillRect(ux + 6, uy + 3, 2, 1);
      // Fly detail
      ctx.fillStyle = "#d4a574";
      ctx.fillRect(ux + 3, uy + 2, 2, 2);
      break;
    }
    case 1: {
      // ── Bra ──
      const bx = x - 3;
      const by = y;
      // Straps
      ctx.fillStyle = "#ff006e";
      ctx.fillRect(bx + 1, by, 1, 2);
      ctx.fillRect(bx + 6, by, 1, 2);
      // Cups
      ctx.fillStyle = "#ff4d9e";
      ctx.fillRect(bx, by + 2, 4, 3);
      ctx.fillRect(bx + 4, by + 2, 4, 3);
      // Center detail
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(bx + 3, by + 3, 2, 1);
      break;
    }
    case 2: {
      // ── Beer can ──
      const cx = x - 2;
      const cy = y;
      // Can body (silver/grey)
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(cx, cy + 1, 5, 6);
      // Top rim
      ctx.fillStyle = "#a0a0a0";
      ctx.fillRect(cx, cy, 5, 1);
      // Label (gold)
      ctx.fillStyle = "#d4a017";
      ctx.fillRect(cx, cy + 2, 5, 3);
      // Pull tab
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(cx + 1, cy, 3, 1);
      break;
    }
  }
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

/* ── Power-up: 4 variants ── */
export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: "rapid" | "shield" | "wideshot" | "extralife",
  frame: number
) {
  // Small 8x8 pixel-art icons
  const pulse = Math.sin(frame * 0.15) * 1;
  const cx = x + 4;
  const cy = y + 4 + pulse;

  // Outer glow
  const glowColors: Record<string, string> = {
    rapid: "rgba(255, 165, 0, 0.3)",
    shield: "rgba(0, 240, 255, 0.3)",
    wideshot: "rgba(252, 238, 10, 0.3)",
    extralife: "rgba(255, 0, 110, 0.3)",
  };
  ctx.fillStyle = glowColors[type];
  ctx.fillRect(cx - 5, cy - 5, 10, 10);

  // Icon body
  switch (type) {
    case "rapid": {
      // Lightning bolt (orange)
      ctx.fillStyle = "#ffa500";
      ctx.fillRect(cx - 1, cy - 3, 2, 2);
      ctx.fillRect(cx - 2, cy - 1, 3, 1);
      ctx.fillRect(cx - 1, cy, 2, 1);
      ctx.fillRect(cx, cy + 1, 2, 2);
      break;
    }
    case "shield": {
      // Shield shape (cyan)
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(cx - 2, cy - 3, 4, 1);
      ctx.fillRect(cx - 3, cy - 2, 6, 1);
      ctx.fillRect(cx - 3, cy - 1, 6, 3);
      ctx.fillRect(cx - 2, cy + 2, 4, 1);
      ctx.fillRect(cx - 1, cy + 3, 2, 1);
      break;
    }
    case "wideshot": {
      // Triple chevrons (yellow)
      ctx.fillStyle = "#fcee0a";
      ctx.fillRect(cx - 2, cy - 3, 4, 1);
      ctx.fillRect(cx - 3, cy - 1, 6, 1);
      ctx.fillRect(cx - 2, cy + 1, 4, 1);
      break;
    }
    case "extralife": {
      // Heart (pink)
      ctx.fillStyle = "#ff006e";
      ctx.fillRect(cx - 2, cy - 2, 1, 1);
      ctx.fillRect(cx + 1, cy - 2, 1, 1);
      ctx.fillRect(cx - 3, cy - 1, 3, 1);
      ctx.fillRect(cx, cy - 1, 3, 1);
      ctx.fillRect(cx - 3, cy, 6, 2);
      ctx.fillRect(cx - 2, cy + 2, 4, 1);
      ctx.fillRect(cx - 1, cy + 3, 2, 1);
      break;
    }
  }
}

/* ── Barricade / shield block ── */
export function drawBarricade(ctx: CanvasRenderingContext2D, x: number, y: number, health: number) {
  const alpha = Math.max(0.3, health / 3);
  ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
  ctx.fillRect(x, y, 4, 4);
}
