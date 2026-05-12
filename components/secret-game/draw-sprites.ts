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

/* ── Enemies: animated fans of A Boy Called Hero ── */
function drawFanBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 0 | 1 | 2,
  frame: number
) {
  // Fan colour palettes per variant
  const shirtColor = variant === 0 ? "#ff006e" : variant === 1 ? "#00f0ff" : "#fcee0a";
  const skinTone = variant === 0 ? "#ffccaa" : variant === 1 ? "#eabb9e" : "#ddb090";
  const hairColor = variant === 0 ? "#3a2818" : variant === 1 ? "#d4a017" : "#8b0000";

  // Animation cycles
  const jump = Math.abs(Math.sin(frame * 0.12 + variant * 3)) * 1.5;
  const armWave = Math.sin(frame * 0.25 + variant * 2);
  const headBop = Math.sin(frame * 0.18 + variant * 4) * 0.5;

  // Hair (bops with head)
  ctx.fillStyle = hairColor;
  ctx.fillRect(x + 2, y + headBop + 0, 6, 2);
  ctx.fillRect(x + 1, y + headBop + 1, 2, 2);
  ctx.fillRect(x + 7, y + headBop + 1, 2, 2);

  // Face (bops with head)
  ctx.fillStyle = skinTone;
  ctx.fillRect(x + 3, y + headBop + 2, 4, 2);

  // Eyes (blink occasionally)
  if (frame % 40 < 38) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(x + 3, y + headBop + 3, 1, 1);
    ctx.fillRect(x + 6, y + headBop + 3, 1, 1);
  }

  // Open mouth (singing along!)
  if (frame % 20 < 10) {
    ctx.fillStyle = "#660000";
    ctx.fillRect(x + 4, y + headBop + 4, 2, 1);
  }

  // Shirt with "ABCH" hint (a small stripe)
  ctx.fillStyle = shirtColor;
  ctx.fillRect(x + 2, y + 4 + jump, 6, 3);
  // White stripe across shirt
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 2, y + 5 + jump, 6, 1);

  // Arms waving in excitement
  ctx.fillStyle = skinTone;
  const leftArmY = armWave > 0 ? y + 2 + jump : y + 4 + jump;
  const rightArmY = armWave > 0 ? y + 4 + jump : y + 2 + jump;
  ctx.fillRect(x + 0, leftArmY, 2, 3);
  ctx.fillRect(x + 8, rightArmY, 2, 3);

  // Hands
  ctx.fillStyle = skinTone;
  ctx.fillRect(x - 1, leftArmY + (armWave > 0 ? 0 : 2), 1, 1);
  ctx.fillRect(x + 10, rightArmY + (armWave > 0 ? 2 : 0), 1, 1);

  // Legs (dancing)
  ctx.fillStyle = "#1a1a2e";
  const leftLegOffset = Math.sin(frame * 0.2 + variant) * 0.5;
  const rightLegOffset = Math.sin(frame * 0.2 + variant + Math.PI) * 0.5;
  ctx.fillRect(x + 3 + leftLegOffset, y + 7 + jump, 2, 2);
  ctx.fillRect(x + 6 + rightLegOffset, y + 7 + jump, 2, 2);

  // Shoes
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 2 + leftLegOffset, y + 9 + jump, 3, 1);
  ctx.fillRect(x + 5 + rightLegOffset, y + 9 + jump, 3, 1);
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

/* ── Bullets ── */
export function drawPlayerBullet(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const flicker = frame % 4 < 2 ? "#00f0ff" : "#ffffff";
  ctx.fillStyle = flicker;
  ctx.fillRect(x - 1, y - 2, 2, 4);
  ctx.fillStyle = "rgba(0, 240, 255, 0.4)";
  ctx.fillRect(x - 2, y - 3, 4, 6);
}

/* ── Underwear projectiles (Y-fronts, bras, thongs) ── */
export type UnderwearType = "yfront" | "bra" | "thong";

export function drawEnemyBullet(ctx: CanvasRenderingContext2D, x: number, y: number, type: UnderwearType) {
  switch (type) {
    case "yfront": {
      // White Y-fronts
      ctx.fillStyle = "#ffffff";
      // Waistband
      ctx.fillRect(x - 3, y - 2, 6, 1);
      // Left leg
      ctx.fillRect(x - 3, y - 1, 2, 3);
      // Right leg
      ctx.fillRect(x + 1, y - 1, 2, 3);
      // Centre pouch
      ctx.fillRect(x - 1, y - 1, 2, 2);
      // Y-stripe
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(x, y, 1, 2);
      break;
    }
    case "bra": {
      // Pink bra
      ctx.fillStyle = "#ff69b4";
      // Left cup
      ctx.fillRect(x - 3, y - 1, 3, 2);
      // Right cup
      ctx.fillRect(x, y - 1, 3, 2);
      // Centre
      ctx.fillRect(x - 1, y, 2, 1);
      // Straps
      ctx.fillStyle = "#ff69b4";
      ctx.fillRect(x - 2, y - 3, 1, 2);
      ctx.fillRect(x + 1, y - 3, 1, 2);
      break;
    }
    case "thong": {
      // Bright green thong
      ctx.fillStyle = "#39ff14";
      // Waistband
      ctx.fillRect(x - 2, y - 2, 4, 1);
      // Centre pouch
      ctx.fillRect(x - 1, y - 1, 2, 2);
      // Back string
      ctx.fillRect(x, y + 1, 1, 2);
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
  frame: number,
  hitFlash: number
) {
  const w = 40;
  const h = 30;

  ctx.save();
  if (hitFlash > 0) {
    ctx.globalAlpha = 0.6 + Math.sin(frame * 0.8) * 0.4;
  }

  // Main body (dark purple)
  ctx.fillStyle = "#4a004a";
  ctx.fillRect(x + 8, y + 6, 24, 20);

  // Body outline / armour plates
  ctx.fillStyle = "#6a006a";
  ctx.fillRect(x + 6, y + 4, 28, 4);
  ctx.fillRect(x + 6, y + 24, 28, 4);
  ctx.fillRect(x + 4, y + 8, 4, 16);
  ctx.fillRect(x + 32, y + 8, 4, 16);

  // Shoulder spikes
  ctx.fillStyle = "#ff006e";
  ctx.fillRect(x + 2, y + 6, 4, 4);
  ctx.fillRect(x + 0, y + 8, 2, 4);
  ctx.fillRect(x + 34, y + 6, 4, 4);
  ctx.fillRect(x + 38, y + 8, 2, 4);

  // Eye (glowing, pulsating)
  const eyeColor = frame % 10 < 5 ? "#ff006e" : "#ff88bb";
  ctx.fillStyle = eyeColor;
  ctx.fillRect(x + 16, y + 12, 8, 4);
  ctx.fillRect(x + 18, y + 10, 4, 2);
  ctx.fillRect(x + 18, y + 16, 4, 2);

  // Eye pupil
  ctx.fillStyle = "#000000";
  ctx.fillRect(x + 19, y + 13, 2, 2);

  // Mouth / vent
  ctx.fillStyle = "#220022";
  ctx.fillRect(x + 14, y + 20, 12, 2);
  ctx.fillRect(x + 16, y + 22, 8, 2);

  // Side cannons
  ctx.fillStyle = "#888888";
  ctx.fillRect(x + 2, y + 18, 6, 4);
  ctx.fillRect(x + 32, y + 18, 6, 4);

  // Cannon barrels
  ctx.fillStyle = "#aaaaaa";
  ctx.fillRect(x + 0, y + 19, 2, 2);
  ctx.fillRect(x + 38, y + 19, 2, 2);

  // Bottom thrusters
  ctx.fillStyle = frame % 6 < 3 ? "#ff8800" : "#ff4400";
  ctx.fillRect(x + 10, y + 28, 4, 2);
  ctx.fillRect(x + 26, y + 28, 4, 2);

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
  label: string
) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const fillWidth = Math.max(0, Math.floor(width * ratio));

  // Border
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 2, y - 2, width + 4, height + 4);

  // Background
  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y, width, height);

  // Fill (green → yellow → red based on health)
  let fillColor = "#00ff00";
  if (ratio < 0.3) fillColor = "#ff0000";
  else if (ratio < 0.6) fillColor = "#ffff00";

  if (fillWidth > 0) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, fillWidth, height);
  }

  // Label text (simple pixel-style)
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.max(8, height)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${label} ${Math.ceil(current)}/${max}`, x + width / 2, y + height / 2);
}

/* ── Barricade / shield block ── */
export function drawBarricade(ctx: CanvasRenderingContext2D, x: number, y: number, health: number) {
  const alpha = Math.max(0.3, health / 3);
  ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
  ctx.fillRect(x, y, 4, 4);
}
