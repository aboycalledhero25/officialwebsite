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

/* ── Enemy dimensions (exported for game engine + editor) ── */
export const ENEMY_W_BASE = 20;
export const ENEMY_H_BASE = 18;

/* ── Enemies: Pop Punk Fans (skater, punk girl, mohawk) ── */
function drawFanBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 0 | 1 | 2,
  frame: number
) {
  const jump = Math.abs(Math.sin(frame * 0.12 + variant * 3)) * 1.5;
  const armWave = Math.sin(frame * 0.25 + variant * 2);
  const headBop = Math.sin(frame * 0.18 + variant * 4) * 0.5;
  const leftLegOffset = Math.sin(frame * 0.2 + variant) * 0.5;
  const rightLegOffset = Math.sin(frame * 0.2 + variant + Math.PI) * 0.5;

  if (variant === 0) {
    /* ═══ SKATER BOY ═══ */
    const cap = "#1a1a2e";
    const skin = "#ffccaa";
    const shirt = "#f0f0f0";
    const logo = "#ff006e";
    const shorts = "#3a5a8a";
    const shoe = "#ffffff";
    const shoeAccent = "#ff2222";

    // Backwards cap
    ctx.fillStyle = cap;
    ctx.fillRect(x + 5, y + headBop + 0, 10, 3);
    ctx.fillRect(x + 3, y + headBop + 2, 4, 2);
    ctx.fillRect(x + 15, y + headBop + 2, 2, 1);

    // Face
    ctx.fillStyle = skin;
    ctx.fillRect(x + 6, y + headBop + 3, 8, 4);
    if (frame % 40 < 38) {
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 7, y + headBop + 4, 2, 1);
      ctx.fillRect(x + 11, y + headBop + 4, 2, 1);
    }
    ctx.fillStyle = "#884444";
    ctx.fillRect(x + 9, y + headBop + 6, 2, 1);

    // Neck
    ctx.fillStyle = skin;
    ctx.fillRect(x + 8, y + headBop + 7, 4, 1);

    // Baggy tee
    ctx.fillStyle = shirt;
    ctx.fillRect(x + 3, y + 8 + jump, 14, 5);
    ctx.fillStyle = logo;
    ctx.fillRect(x + 5, y + 10 + jump, 10, 1);

    // Arms
    const leftArmY = armWave > 0 ? y + 8 + jump : y + 11 + jump;
    const rightArmY = armWave > 0 ? y + 11 + jump : y + 8 + jump;
    ctx.fillStyle = skin;
    ctx.fillRect(x + 0, leftArmY, 3, 4);
    ctx.fillRect(x + 17, rightArmY, 3, 4);
    ctx.fillRect(x - 1, leftArmY + 2, 2, 2);
    ctx.fillRect(x + 19, rightArmY + 2, 2, 2);

    // Baggy shorts
    ctx.fillStyle = shorts;
    ctx.fillRect(x + 4, y + 13 + jump, 12, 2);
    ctx.fillRect(x + 3, y + 14 + jump, 5, 3);
    ctx.fillRect(x + 12, y + 14 + jump, 5, 3);

    // Legs
    ctx.fillStyle = skin;
    ctx.fillRect(x + 4 + leftLegOffset, y + 16 + jump, 3, 2);
    ctx.fillRect(x + 13 + rightLegOffset, y + 16 + jump, 3, 2);

    // Skate shoes (chunky)
    ctx.fillStyle = shoe;
    ctx.fillRect(x + 3 + leftLegOffset, y + 17 + jump, 5, 1);
    ctx.fillRect(x + 12 + rightLegOffset, y + 17 + jump, 5, 1);
    ctx.fillStyle = shoeAccent;
    ctx.fillRect(x + 4 + leftLegOffset, y + 17 + jump, 2, 1);
    ctx.fillRect(x + 13 + rightLegOffset, y + 17 + jump, 2, 1);
  } else if (variant === 1) {
    /* ═══ PUNK GIRL ═══ */
    const hair = "#ff69b4";
    const skin = "#ffccaa";
    const choker = "#111111";
    const top = "#111111";
    const pants = "#1a1a2e";
    const boot = "#111111";
    const bootSo = "#444444";

    // Pink hair (bob + bangs)
    ctx.fillStyle = hair;
    ctx.fillRect(x + 4, y + headBop + 0, 12, 3);
    ctx.fillRect(x + 3, y + headBop + 1, 2, 3);
    ctx.fillRect(x + 15, y + headBop + 1, 2, 3);
    ctx.fillRect(x + 5, y + headBop + 3, 10, 1);

    // Face
    ctx.fillStyle = skin;
    ctx.fillRect(x + 6, y + headBop + 3, 8, 4);
    if (frame % 40 < 38) {
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 7, y + headBop + 4, 2, 1);
      ctx.fillRect(x + 11, y + headBop + 4, 2, 1);
      // Eyeliner
      ctx.fillRect(x + 7, y + headBop + 5, 2, 1);
      ctx.fillRect(x + 11, y + headBop + 5, 2, 1);
    }
    ctx.fillStyle = "#cc4444";
    ctx.fillRect(x + 9, y + headBop + 6, 2, 1);

    // Choker
    ctx.fillStyle = choker;
    ctx.fillRect(x + 8, y + headBop + 7, 4, 1);

    // Crop top
    ctx.fillStyle = top;
    ctx.fillRect(x + 5, y + 8 + jump, 10, 3);
    // Fishnet sleeves
    ctx.fillStyle = "#222222";
    ctx.fillRect(x + 2, y + 9 + jump, 3, 3);
    ctx.fillRect(x + 15, y + 9 + jump, 3, 3);

    // Arms
    const leftArmY = armWave > 0 ? y + 9 + jump : y + 11 + jump;
    const rightArmY = armWave > 0 ? y + 11 + jump : y + 9 + jump;
    ctx.fillStyle = skin;
    ctx.fillRect(x + 0, leftArmY, 2, 4);
    ctx.fillRect(x + 18, rightArmY, 2, 4);
    ctx.fillRect(x - 1, leftArmY + 2, 2, 2);
    ctx.fillRect(x + 19, rightArmY + 2, 2, 2);

    // Ripped jeans
    ctx.fillStyle = pants;
    ctx.fillRect(x + 5, y + 11 + jump, 10, 2);
    ctx.fillRect(x + 4, y + 13 + jump, 5, 3);
    ctx.fillRect(x + 11, y + 13 + jump, 5, 3);
    // Rips (skin showing through)
    ctx.fillStyle = skin;
    ctx.fillRect(x + 6, y + 14 + jump, 1, 1);
    ctx.fillRect(x + 13, y + 15 + jump, 1, 1);

    // Legs
    ctx.fillStyle = skin;
    ctx.fillRect(x + 5 + leftLegOffset, y + 15 + jump, 3, 2);
    ctx.fillRect(x + 12 + rightLegOffset, y + 15 + jump, 3, 2);

    // Platform boots
    ctx.fillStyle = boot;
    ctx.fillRect(x + 4 + leftLegOffset, y + 16 + jump, 5, 2);
    ctx.fillRect(x + 11 + rightLegOffset, y + 16 + jump, 5, 2);
    ctx.fillStyle = bootSo;
    ctx.fillRect(x + 4 + leftLegOffset, y + 17 + jump, 5, 1);
    ctx.fillRect(x + 11 + rightLegOffset, y + 17 + jump, 5, 1);
  } else {
    /* ═══ MOHAWK DUDE ═══ */
    const mohawk = "#39ff14";
    const skin = "#eabb9e";
    const jacket = "#1a1a1a";
    const shirt = "#eeeeee";
    const jeans = "#2a2a3a";
    const boot = "#111111";

    // Tall mohawk
    ctx.fillStyle = mohawk;
    ctx.fillRect(x + 8, y + headBop - 2, 4, 4);
    ctx.fillRect(x + 9, y + headBop - 3, 2, 1);
    // Sides shaved
    ctx.fillStyle = "#5a4a3a";
    ctx.fillRect(x + 6, y + headBop + 1, 2, 2);
    ctx.fillRect(x + 12, y + headBop + 1, 2, 2);

    // Face
    ctx.fillStyle = skin;
    ctx.fillRect(x + 6, y + headBop + 3, 8, 4);
    if (frame % 40 < 38) {
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 7, y + headBop + 4, 2, 1);
      ctx.fillRect(x + 11, y + headBop + 4, 2, 1);
    }
    // Stubble
    ctx.fillStyle = "#bba088";
    ctx.fillRect(x + 7, y + headBop + 6, 6, 1);
    // Earring
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(x + 14, y + headBop + 5, 1, 1);

    // Neck
    ctx.fillStyle = skin;
    ctx.fillRect(x + 8, y + headBop + 7, 4, 1);

    // Leather jacket (open)
    ctx.fillStyle = jacket;
    ctx.fillRect(x + 3, y + 8 + jump, 3, 5);
    ctx.fillRect(x + 14, y + 8 + jump, 3, 5);
    ctx.fillRect(x + 3, y + 8 + jump, 14, 2); // shoulders
    // White tee underneath
    ctx.fillStyle = shirt;
    ctx.fillRect(x + 7, y + 9 + jump, 6, 4);
    // Jacket collar
    ctx.fillStyle = jacket;
    ctx.fillRect(x + 6, y + 8 + jump, 2, 2);
    ctx.fillRect(x + 12, y + 8 + jump, 2, 2);

    // Arms
    const leftArmY = armWave > 0 ? y + 9 + jump : y + 12 + jump;
    const rightArmY = armWave > 0 ? y + 12 + jump : y + 9 + jump;
    ctx.fillStyle = jacket;
    ctx.fillRect(x + 0, leftArmY, 3, 5);
    ctx.fillRect(x + 17, rightArmY, 3, 5);
    // Hands
    ctx.fillStyle = skin;
    ctx.fillRect(x - 1, leftArmY + 3, 2, 2);
    ctx.fillRect(x + 19, rightArmY + 3, 2, 2);

    // Skinny jeans
    ctx.fillStyle = jeans;
    ctx.fillRect(x + 6, y + 13 + jump, 8, 2);
    ctx.fillRect(x + 6, y + 15 + jump, 3, 3);
    ctx.fillRect(x + 11, y + 15 + jump, 3, 3);
    // Rips
    ctx.fillStyle = skin;
    ctx.fillRect(x + 7, y + 16 + jump, 1, 1);
    ctx.fillRect(x + 12, y + 15 + jump, 1, 1);

    // Combat boots
    ctx.fillStyle = boot;
    ctx.fillRect(x + 5 + leftLegOffset, y + 16 + jump, 5, 2);
    ctx.fillRect(x + 10 + rightLegOffset, y + 16 + jump, 5, 2);
  }
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 0 | 1 | 2,
  frame: number
) {
  drawFanBody(ctx, x, y, variant, frame);
}

/* ── Player bullet: 8-bit electricity burst ── */
export function drawPlayerBullet(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const primary = frame % 3 === 0 ? "#ffffff" : "#00f0ff";
  const secondary = frame % 3 === 0 ? "#00f0ff" : "#88ffff";

  ctx.save();
  ctx.fillStyle = primary;

  // Main jagged bolt — 3 vertical segments with horizontal zig-zags
  const zig = (frame % 4) - 1.5; // -1.5, -0.5, 0.5, 1.5
  ctx.fillRect(x + zig, y - 4, 1, 2);
  ctx.fillRect(x - zig, y - 2, 1, 2);
  ctx.fillRect(x + zig * 0.5, y, 1, 2);
  ctx.fillRect(x - zig * 0.5, y + 2, 1, 2);

  // Secondary sparks
  ctx.fillStyle = secondary;
  ctx.fillRect(x + 2, y - 3, 1, 1);
  ctx.fillRect(x - 2, y - 1, 1, 1);
  ctx.fillRect(x + 1, y + 1, 1, 1);
  ctx.fillRect(x - 1, y + 3, 1, 1);

  // Electric glow around core
  ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
  ctx.fillRect(x - 2, y - 5, 4, 10);

  ctx.restore();
}

/* ── Underwear projectiles (Y-fronts, bras, thongs) ── */
export type UnderwearType = "yfront" | "bra" | "thong";

export function drawEnemyBullet(ctx: CanvasRenderingContext2D, x: number, y: number, type: UnderwearType) {
  switch (type) {
    case "yfront": {
      // White Y-fronts — larger, more detailed
      ctx.fillStyle = "#ffffff";
      // Waistband
      ctx.fillRect(x - 5, y - 3, 10, 2);
      // Left leg opening
      ctx.fillRect(x - 5, y - 1, 3, 5);
      // Right leg opening
      ctx.fillRect(x + 2, y - 1, 3, 5);
      // Centre pouch
      ctx.fillRect(x - 2, y - 1, 4, 4);
      // Y-stripe (grey)
      ctx.fillStyle = "#bbbbbb";
      ctx.fillRect(x - 1, y + 1, 2, 3);
      ctx.fillRect(x, y + 1, 1, 3);
      // Elastic trim
      ctx.fillStyle = "#dddddd";
      ctx.fillRect(x - 5, y - 3, 10, 1);
      break;
    }
    case "bra": {
      // Pink bra — larger with proper cups & straps
      ctx.fillStyle = "#ff69b4";
      // Left cup
      ctx.fillRect(x - 5, y - 1, 5, 3);
      ctx.fillRect(x - 4, y + 2, 3, 1);
      // Right cup
      ctx.fillRect(x, y - 1, 5, 3);
      ctx.fillRect(x + 1, y + 2, 3, 1);
      // Centre clasp
      ctx.fillRect(x - 1, y + 1, 2, 2);
      // Underband
      ctx.fillRect(x - 5, y + 2, 10, 1);
      // Straps
      ctx.fillStyle = "#ff69b4";
      ctx.fillRect(x - 3, y - 5, 2, 4);
      ctx.fillRect(x + 1, y - 5, 2, 4);
      // Strap adjusters
      ctx.fillStyle = "#ff88cc";
      ctx.fillRect(x - 3, y - 4, 2, 1);
      ctx.fillRect(x + 1, y - 4, 2, 1);
      break;
    }
    case "thong": {
      // Bright green thong — larger with defined waistband
      ctx.fillStyle = "#39ff14";
      // Waistband
      ctx.fillRect(x - 4, y - 3, 8, 2);
      // Centre pouch
      ctx.fillRect(x - 2, y - 1, 4, 3);
      // Back string
      ctx.fillRect(x - 1, y + 2, 2, 4);
      // Waistband highlight
      ctx.fillStyle = "#66ff44";
      ctx.fillRect(x - 4, y - 3, 8, 1);
      break;
    }
  }
}

/* ── Particles ── */
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

/* ── Power-up: 5 variants with strong pulse + glow ── */
export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: "rapid" | "shield" | "wideshot" | "extralife" | "invincible",
  frame: number,
  size = 8
) {
  const scale = size / 8;
  const pulse = Math.sin(frame * 0.2) * 1.5 * scale; // stronger vertical bob
  const glowPulse = 0.6 + Math.sin(frame * 0.15) * 0.4; // 0.2 -> 1.0 alpha pulse
  const sizePulse = 1 + Math.sin(frame * 0.25) * 0.25; // scale pulse
  const cx = x + size / 2;
  const cy = y + size / 2 + pulse;

  // Color definitions per type
  const colors: Record<string, { core: string; glow: string; bright: string }> = {
    rapid:    { core: "#ffa500", glow: "rgba(255, 165, 0,", bright: "#ffdd44" },
    shield:   { core: "#00f0ff", glow: "rgba(0, 240, 255,", bright: "#ffffff" },
    wideshot: { core: "#fcee0a", glow: "rgba(252, 238, 10,", bright: "#ffffff" },
    extralife:{ core: "#ff006e", glow: "rgba(255, 0, 110,", bright: "#ff88bb" },
    invincible:{ core: "#ffd700", glow: "rgba(255, 215, 0,", bright: "#ffffff" },
  };
  const c = colors[type];

  // Outer aura (large soft glow)
  const auraSize = 7 * sizePulse * scale;
  ctx.fillStyle = `${c.glow} ${0.15 * glowPulse})`;
  ctx.fillRect(cx - auraSize, cy - auraSize, auraSize * 2, auraSize * 2);

  // Middle glow
  const midSize = 5 * sizePulse * scale;
  ctx.fillStyle = `${c.glow} ${0.35 * glowPulse})`;
  ctx.fillRect(cx - midSize, cy - midSize, midSize * 2, midSize * 2);

  // Inner bright glow
  const innerSize = 3 * sizePulse * scale;
  ctx.fillStyle = `${c.glow} ${0.6 * glowPulse})`;
  ctx.fillRect(cx - innerSize, cy - innerSize, innerSize * 2, innerSize * 2);

  // Icon body
  const s = scale;
  switch (type) {
    case "rapid": {
      // Lightning bolt (orange/yellow)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 1 * s, cy - 3 * s, 2 * s, 2 * s);
      ctx.fillRect(cx - 2 * s, cy - 1 * s, 3 * s, 1 * s);
      ctx.fillRect(cx - 1 * s, cy, 2 * s, 1 * s);
      ctx.fillRect(cx, cy + 1 * s, 2 * s, 2 * s);
      // Bright highlight
      ctx.fillStyle = c.bright;
      if (frame % 6 < 3) {
        ctx.fillRect(cx - 1 * s, cy - 2 * s, 1 * s, 1 * s);
        ctx.fillRect(cx, cy + 1 * s, 1 * s, 1 * s);
      }
      break;
    }
    case "shield": {
      // Shield shape (cyan)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 2 * s, cy - 3 * s, 4 * s, 1 * s);
      ctx.fillRect(cx - 3 * s, cy - 2 * s, 6 * s, 1 * s);
      ctx.fillRect(cx - 3 * s, cy - 1 * s, 6 * s, 3 * s);
      ctx.fillRect(cx - 2 * s, cy + 2 * s, 4 * s, 1 * s);
      ctx.fillRect(cx - 1 * s, cy + 3 * s, 2 * s, 1 * s);
      // Bright highlight
      ctx.fillStyle = c.bright;
      if (frame % 8 < 4) {
        ctx.fillRect(cx - 1 * s, cy - 2 * s, 2 * s, 1 * s);
        ctx.fillRect(cx - 2 * s, cy, 1 * s, 1 * s);
        ctx.fillRect(cx + 1 * s, cy, 1 * s, 1 * s);
      }
      break;
    }
    case "wideshot": {
      // Triple chevrons (yellow)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 2 * s, cy - 3 * s, 4 * s, 1 * s);
      ctx.fillRect(cx - 3 * s, cy - 1 * s, 6 * s, 1 * s);
      ctx.fillRect(cx - 2 * s, cy + 1 * s, 4 * s, 1 * s);
      // Bright highlight
      ctx.fillStyle = c.bright;
      if (frame % 5 < 2) {
        ctx.fillRect(cx - 1 * s, cy - 3 * s, 2 * s, 1 * s);
        ctx.fillRect(cx - 2 * s, cy - 1 * s, 1 * s, 1 * s);
        ctx.fillRect(cx + 1 * s, cy - 1 * s, 1 * s, 1 * s);
      }
      break;
    }
    case "extralife": {
      // Heart (pink)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 2 * s, cy - 2 * s, 1 * s, 1 * s);
      ctx.fillRect(cx + 1 * s, cy - 2 * s, 1 * s, 1 * s);
      ctx.fillRect(cx - 3 * s, cy - 1 * s, 3 * s, 1 * s);
      ctx.fillRect(cx, cy - 1 * s, 3 * s, 1 * s);
      ctx.fillRect(cx - 3 * s, cy, 6 * s, 2 * s);
      ctx.fillRect(cx - 2 * s, cy + 2 * s, 4 * s, 1 * s);
      ctx.fillRect(cx - 1 * s, cy + 3 * s, 2 * s, 1 * s);
      // Bright highlight
      ctx.fillStyle = c.bright;
      if (frame % 7 < 3) {
        ctx.fillRect(cx - 1 * s, cy - 1 * s, 2 * s, 1 * s);
        ctx.fillRect(cx - 2 * s, cy, 1 * s, 1 * s);
      }
      break;
    }
    case "invincible": {
      // Flashing star (gold)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 1 * s, cy - 3 * s, 2 * s, 1 * s);
      ctx.fillRect(cx - 2 * s, cy - 2 * s, 4 * s, 1 * s);
      ctx.fillRect(cx - 3 * s, cy - 1 * s, 6 * s, 2 * s);
      ctx.fillRect(cx - 2 * s, cy + 1 * s, 4 * s, 1 * s);
      ctx.fillRect(cx - 1 * s, cy + 2 * s, 2 * s, 1 * s);
      // Bright highlight — flash on/off
      ctx.fillStyle = c.bright;
      if (frame % 4 < 2) {
        ctx.fillRect(cx - 1 * s, cy - 2 * s, 2 * s, 1 * s);
        ctx.fillRect(cx - 2 * s, cy, 1 * s, 1 * s);
        ctx.fillRect(cx + 1 * s, cy, 1 * s, 1 * s);
      }
      break;
    }
  }
}

/* ── Boss: large menacing pixel-art enemy ── */
export function drawBoss(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
  hitFlash: number
) {
  const refW = 40;
  const refH = 30;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / refW, h / refH);

  if (hitFlash > 0) {
    ctx.globalAlpha = 0.6 + Math.sin(frame * 0.8) * 0.4;
  }

  // Main body (dark purple)
  ctx.fillStyle = "#4a004a";
  ctx.fillRect(8, 6, 24, 20);

  // Body outline / armour plates
  ctx.fillStyle = "#6a006a";
  ctx.fillRect(6, 4, 28, 4);
  ctx.fillRect(6, 24, 28, 4);
  ctx.fillRect(4, 8, 4, 16);
  ctx.fillRect(32, 8, 4, 16);

  // Shoulder spikes
  ctx.fillStyle = "#ff006e";
  ctx.fillRect(2, 6, 4, 4);
  ctx.fillRect(0, 8, 2, 4);
  ctx.fillRect(34, 6, 4, 4);
  ctx.fillRect(38, 8, 2, 4);

  // Eye (glowing, pulsating)
  const eyeColor = frame % 10 < 5 ? "#ff006e" : "#ff88bb";
  ctx.fillStyle = eyeColor;
  ctx.fillRect(16, 12, 8, 4);
  ctx.fillRect(18, 10, 4, 2);
  ctx.fillRect(18, 16, 4, 2);

  // Eye pupil
  ctx.fillStyle = "#000000";
  ctx.fillRect(19, 13, 2, 2);

  // Mouth / vent
  ctx.fillStyle = "#220022";
  ctx.fillRect(14, 20, 12, 2);
  ctx.fillRect(16, 22, 8, 2);

  // Side cannons
  ctx.fillStyle = "#888888";
  ctx.fillRect(2, 18, 6, 4);
  ctx.fillRect(32, 18, 6, 4);

  // Cannon barrels
  ctx.fillStyle = "#aaaaaa";
  ctx.fillRect(0, 19, 2, 2);
  ctx.fillRect(38, 19, 2, 2);

  // Bottom thrusters
  ctx.fillStyle = frame % 6 < 3 ? "#ff8800" : "#ff4400";
  ctx.fillRect(10, 28, 4, 2);
  ctx.fillRect(26, 28, 4, 2);

  ctx.restore();
}

/* ── Boss projectile: large glowing orb ── */
export function drawBossProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  size: number
) {
  const pulse = 0.7 + Math.sin(frame * 0.3) * 0.3;
  const s = size / 2;

  // Outer glow
  ctx.fillStyle = `rgba(255, 0, 110, ${0.2 * pulse})`;
  ctx.fillRect(x - s - 2, y - s - 2, size + 4, size + 4);

  // Middle glow
  ctx.fillStyle = `rgba(255, 0, 110, ${0.5 * pulse})`;
  ctx.fillRect(x - s, y - s, size, size);

  // Core
  ctx.fillStyle = `rgba(255, 136, 187, ${pulse})`;
  ctx.fillRect(x - s + 1, y - s + 1, size - 2, size - 2);

  // Bright centre
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 1, y - 1, 2, 2);
}

/* ── 8-bit Health Bar ── */
export function draw8BitHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  current: number,
  max: number,
  label: string,
  fillColor?: string
) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const fillWidth = Math.max(0, Math.floor(width * ratio));

  // Border
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 2, y - 2, width + 4, height + 4);

  // Background
  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y, width, height);

  // Fill — use provided color or default gradient (green → yellow → red)
  let color = fillColor ?? "#00ff00";
  if (!fillColor) {
    if (ratio < 0.3) color = "#ff0000";
    else if (ratio < 0.6) color = "#ffff00";
  }

  if (fillWidth > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fillWidth, height);
  }

  // Label text (8-bit pixel style — white, crisp monospace)
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.max(8, height)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.textRendering = "geometricPrecision";
  ctx.fillText(`${label} ${Math.ceil(current)}/${max}`, x + width / 2, y + height / 2);
}

/* ── Barricade / shield block ── */
export function drawBarricade(ctx: CanvasRenderingContext2D, x: number, y: number, health: number) {
  const alpha = Math.max(0.3, health / 3);
  ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
  ctx.fillRect(x, y, 4, 4);
}
