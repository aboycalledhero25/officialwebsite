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

/* ── Enemy reference dimensions (pixel art is drawn at this size) ── */
const ENEMY_REF_W = 32;
const ENEMY_REF_H = 28;

/* ── Enemies: Punk Rockers with Walk / Throw animations ── */
function drawFanBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 0 | 1 | 2,
  frame: number,
  throwing: boolean
) {
  const walk = Math.sin(frame * 0.25 + variant * 2);
  const bob = Math.abs(Math.sin(frame * 0.15 + variant)) * 1.5;
  const blink = frame % 55 < 52;

  /* ═══════════════════════════════════════════════════
     Helper to draw a basic eye pair
     ═══════════════════════════════════════════════════ */
  const drawEyes = (ex: number, ey: number, skinTone: string) => {
    ctx.fillStyle = skinTone;
    ctx.fillRect(ex + 12, ey, 3, 3);
    ctx.fillRect(ex + 18, ey, 3, 3);
    if (blink) {
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(ex + 12, ey + 1, 3, 2);
      ctx.fillRect(ex + 18, ey + 1, 3, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(ex + 13, ey + 1, 1, 1);
      ctx.fillRect(ex + 19, ey + 1, 1, 1);
    } else {
      // Closed eyes (angry squint)
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(ex + 12, ey + 2, 3, 1);
      ctx.fillRect(ex + 18, ey + 2, 3, 1);
    }
  };

  if (variant === 0) {
    /* ═══════════════════════════════════════════════════
       ═══ VARIANT 0: THE SKINHEAD ═══
       Shaved head, bomber jacket, braces, docs
       ═══════════════════════════════════════════════════ */
    const skin = "#e8b898";
    const head = "#8a7a6a";
    const jacket = "#1a1a1a";
    const jacketLight = "#2a2a2a";
    const shirt = "#f0f0f0";
    const brace = "#cc0000";
    const jeans = "#2a3a5a";
    const boot = "#111111";
    const bootSole = "#8b4513";

    if (throwing) {
      /* ── THROW: lunged forward, right arm hurling down ── */
      const tx = x + 3; // body shifted forward
      // Head (shaved, stubble)
      ctx.fillStyle = head;
      ctx.fillRect(tx + 10, y + 0, 12, 4);
      ctx.fillRect(tx + 8, y + 2, 4, 3);
      ctx.fillRect(tx + 20, y + 2, 4, 3);
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 10, y + 3, 12, 6);
      ctx.fillRect(tx + 11, y + 9, 10, 2);
      drawEyes(tx, y + 4, skin);
      // Shout mouth
      ctx.fillStyle = "#660000";
      ctx.fillRect(tx + 14, y + 8, 4, 2);
      // Neck
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 13, y + 10, 6, 2);
      // Torso twisted into throw
      ctx.fillStyle = jacket;
      ctx.fillRect(tx + 8, y + 12, 16, 8);
      ctx.fillRect(tx + 6, y + 13, 4, 6);   // left shoulder back
      ctx.fillRect(tx + 22, y + 14, 3, 4);  // right shoulder forward
      ctx.fillStyle = jacketLight;
      ctx.fillRect(tx + 9, y + 13, 3, 2);
      ctx.fillRect(tx + 18, y + 15, 3, 2);
      // Braces visible
      ctx.fillStyle = brace;
      ctx.fillRect(tx + 12, y + 14, 2, 5);
      ctx.fillRect(tx + 18, y + 14, 2, 5);
      ctx.fillRect(tx + 12, y + 16, 8, 1);
      // White tee collar
      ctx.fillStyle = shirt;
      ctx.fillRect(tx + 13, y + 12, 6, 2);
      // Left arm (back, balancing)
      ctx.fillStyle = jacket;
      ctx.fillRect(tx + 2, y + 11, 4, 6);
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 1, y + 9, 3, 3);    // hand up
      // Right arm (throwing, extended down-forward)
      ctx.fillStyle = jacket;
      ctx.fillRect(tx + 22, y + 16, 4, 5);  // upper arm
      ctx.fillRect(tx + 23, y + 20, 3, 5);  // forearm down
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 23, y + 24, 3, 3);  // hand open at bottom
      // The projectile in hand (white flash)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(tx + 24, y + 26, 2, 2);
      // Legs in wide lunge
      ctx.fillStyle = jeans;
      ctx.fillRect(tx + 10, y + 20, 12, 3); // waist
      ctx.fillRect(tx + 8, y + 22, 6, 5);   // left leg back
      ctx.fillRect(tx + 18, y + 22, 6, 5);  // right leg forward
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 9, y + 26, 4, 2);   // left ankle
      ctx.fillRect(tx + 19, y + 26, 4, 2);  // right ankle
      // Boots
      ctx.fillStyle = boot;
      ctx.fillRect(tx + 8, y + 27, 6, 2);
      ctx.fillRect(tx + 18, y + 27, 6, 2);
      ctx.fillStyle = bootSole;
      ctx.fillRect(tx + 8, y + 28, 6, 1);
      ctx.fillRect(tx + 18, y + 28, 6, 1);
      // Yellow laces
      ctx.fillStyle = "#ffcc00";
      ctx.fillRect(tx + 10, y + 27, 2, 1);
      ctx.fillRect(tx + 20, y + 27, 2, 1);
    } else {
      /* ── WALK: marching, arms swinging ── */
      const legL = walk * 2.5;
      const legR = -walk * 2.5;
      const armL = -walk * 2;
      const armR = walk * 2;
      const by = y + bob;
      // Head (shaved, stubble)
      ctx.fillStyle = head;
      ctx.fillRect(x + 10, by + 0, 12, 4);
      ctx.fillRect(x + 8, by + 2, 4, 3);
      ctx.fillRect(x + 20, by + 2, 4, 3);
      ctx.fillStyle = skin;
      ctx.fillRect(x + 10, by + 3, 12, 6);
      ctx.fillRect(x + 11, by + 9, 10, 2);
      drawEyes(x, by + 4, skin);
      // Neutral mouth
      ctx.fillStyle = "#884444";
      ctx.fillRect(x + 14, by + 8, 4, 1);
      // Neck
      ctx.fillStyle = skin;
      ctx.fillRect(x + 13, by + 10, 6, 2);
      // Torso
      ctx.fillStyle = jacket;
      ctx.fillRect(x + 8, by + 12, 16, 8);
      ctx.fillRect(x + 6, by + 13, 3, 5);
      ctx.fillRect(x + 23, by + 13, 3, 5);
      ctx.fillStyle = jacketLight;
      ctx.fillRect(x + 9, by + 13, 3, 2);
      ctx.fillRect(x + 18, by + 15, 3, 2);
      // Braces
      ctx.fillStyle = brace;
      ctx.fillRect(x + 12, by + 14, 2, 5);
      ctx.fillRect(x + 18, by + 14, 2, 5);
      ctx.fillRect(x + 12, by + 16, 8, 1);
      // Tee collar
      ctx.fillStyle = shirt;
      ctx.fillRect(x + 13, by + 12, 6, 2);
      // Arms swinging
      ctx.fillStyle = jacket;
      ctx.fillRect(x + 3 + armL, by + 13, 4, 6);  // left
      ctx.fillRect(x + 25 + armR, by + 13, 4, 6); // right
      ctx.fillStyle = skin;
      ctx.fillRect(x + 2 + armL, by + 18, 3, 3);
      ctx.fillRect(x + 27 + armR, by + 18, 3, 3);
      // Legs marching
      ctx.fillStyle = jeans;
      ctx.fillRect(x + 10, by + 20, 12, 3);
      ctx.fillRect(x + 9 + legL, by + 22, 6, 5);
      ctx.fillRect(x + 17 + legR, by + 22, 6, 5);
      ctx.fillStyle = skin;
      ctx.fillRect(x + 10 + legL, by + 26, 4, 2);
      ctx.fillRect(x + 18 + legR, by + 26, 4, 2);
      // Boots
      ctx.fillStyle = boot;
      ctx.fillRect(x + 9 + legL, by + 27, 6, 2);
      ctx.fillRect(x + 17 + legR, by + 27, 6, 2);
      ctx.fillStyle = bootSole;
      ctx.fillRect(x + 9 + legL, by + 28, 6, 1);
      ctx.fillRect(x + 17 + legR, by + 28, 6, 1);
      ctx.fillStyle = "#ffcc00";
      ctx.fillRect(x + 11 + legL, by + 27, 2, 1);
      ctx.fillRect(x + 19 + legR, by + 27, 2, 1);
    }

  } else if (variant === 1) {
    /* ═══════════════════════════════════════════════════
       ═══ VARIANT 1: THE RIOT GRRRL ═══
       Pink spiky hair, band tank, fishnets, combat boots
       ═══════════════════════════════════════════════════ */
    const hair = "#ff006e";
    const hairDark = "#cc0055";
    const skin = "#ffddcc";
    const tank = "#111111";
    const fishnet = "#333333";
    const skirt = "#cc0000";
    const boot = "#0a0a0a";
    const bootSole = "#555555";

    if (throwing) {
      /* ── THROW: fierce lunge, arm whipping down ── */
      const tx = x + 3;
      // Spiky hair (wilder when throwing)
      ctx.fillStyle = hair;
      ctx.fillRect(tx + 10, y - 2, 12, 5);
      ctx.fillRect(tx + 8, y + 0, 4, 4);
      ctx.fillRect(tx + 20, y + 0, 4, 4);
      ctx.fillRect(tx + 12, y - 4, 3, 3);   // extra spike
      ctx.fillRect(tx + 17, y - 3, 3, 3);
      ctx.fillStyle = hairDark;
      ctx.fillRect(tx + 13, y + 0, 2, 2);
      ctx.fillRect(tx + 18, y + 0, 2, 2);
      // Face
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 11, y + 3, 10, 6);
      ctx.fillRect(tx + 12, y + 9, 8, 2);
      drawEyes(tx, y + 4, skin);
      // Eyeliner wings
      ctx.fillStyle = "#000000";
      ctx.fillRect(tx + 11, y + 5, 1, 2);
      ctx.fillRect(tx + 21, y + 5, 1, 2);
      // Open shout mouth
      ctx.fillStyle = "#660000";
      ctx.fillRect(tx + 14, y + 8, 4, 2);
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(tx + 15, y + 9, 2, 1);
      // Neck
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 13, y + 10, 6, 2);
      // Tank top
      ctx.fillStyle = tank;
      ctx.fillRect(tx + 10, y + 12, 12, 5);
      ctx.fillRect(tx + 8, y + 13, 3, 4);   // left strap
      ctx.fillRect(tx + 21, y + 13, 3, 4);  // right strap
      // Band logo on tank
      ctx.fillStyle = "#ff006e";
      ctx.fillRect(tx + 12, y + 14, 8, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(tx + 13, y + 14, 2, 2);
      ctx.fillRect(tx + 17, y + 14, 2, 2);
      // Fishnet arms
      ctx.fillStyle = fishnet;
      ctx.fillRect(tx + 7, y + 13, 3, 4);
      ctx.fillRect(tx + 22, y + 13, 3, 4);
      ctx.fillRect(tx + 8, y + 14, 1, 1);
      ctx.fillRect(tx + 23, y + 15, 1, 1);
      // Left arm back
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 2, y + 11, 3, 5);
      ctx.fillRect(tx + 1, y + 9, 3, 3);
      // Right arm throwing (extended down)
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 22, y + 16, 4, 5);  // upper
      ctx.fillRect(tx + 23, y + 20, 3, 5);  // forearm down
      ctx.fillRect(tx + 23, y + 24, 3, 3);  // hand
      // Projectile in hand
      ctx.fillStyle = "#ff69b4";
      ctx.fillRect(tx + 24, y + 26, 2, 2);
      // Ripped skirt/shorts
      ctx.fillStyle = skirt;
      ctx.fillRect(tx + 10, y + 17, 12, 3);
      ctx.fillRect(tx + 9, y + 19, 6, 3);
      ctx.fillRect(tx + 17, y + 19, 6, 3);
      ctx.fillStyle = "#990000";
      ctx.fillRect(tx + 10, y + 19, 2, 2);  // rip
      ctx.fillRect(tx + 19, y + 20, 2, 1);
      // Fishnet legs
      ctx.fillStyle = fishnet;
      ctx.fillRect(tx + 10, y + 22, 4, 4);
      ctx.fillRect(tx + 18, y + 22, 4, 4);
      ctx.fillRect(tx + 11, y + 23, 1, 1);
      ctx.fillRect(tx + 19, y + 24, 1, 1);
      // Skin showing through nets
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 11, y + 26, 3, 2);
      ctx.fillRect(tx + 19, y + 26, 3, 2);
      // Combat boots
      ctx.fillStyle = boot;
      ctx.fillRect(tx + 10, y + 27, 5, 2);
      ctx.fillRect(tx + 18, y + 27, 5, 2);
      ctx.fillStyle = bootSole;
      ctx.fillRect(tx + 10, y + 28, 5, 1);
      ctx.fillRect(tx + 18, y + 28, 5, 1);
      // Studs
      ctx.fillStyle = "#888888";
      ctx.fillRect(tx + 12, y + 27, 1, 1);
      ctx.fillRect(tx + 20, y + 27, 1, 1);
    } else {
      /* ── WALK: strutting, arms swinging ── */
      const legL = walk * 2.5;
      const legR = -walk * 2.5;
      const armL = -walk * 2;
      const armR = walk * 2;
      const by = y + bob;
      // Spiky hair
      ctx.fillStyle = hair;
      ctx.fillRect(x + 10, by - 1, 12, 5);
      ctx.fillRect(x + 8, by + 1, 4, 4);
      ctx.fillRect(x + 20, by + 1, 4, 4);
      ctx.fillRect(x + 13, by - 3, 2, 3);
      ctx.fillRect(x + 17, by - 2, 2, 3);
      ctx.fillStyle = hairDark;
      ctx.fillRect(x + 13, by + 1, 2, 2);
      ctx.fillRect(x + 18, by + 1, 2, 2);
      // Face
      ctx.fillStyle = skin;
      ctx.fillRect(x + 11, by + 3, 10, 6);
      ctx.fillRect(x + 12, by + 9, 8, 2);
      drawEyes(x, by + 4, skin);
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + 11, by + 5, 1, 2);
      ctx.fillRect(x + 21, by + 5, 1, 2);
      // Neutral lips
      ctx.fillStyle = "#aa2244";
      ctx.fillRect(x + 14, by + 8, 4, 1);
      // Neck
      ctx.fillStyle = skin;
      ctx.fillRect(x + 13, by + 10, 6, 2);
      // Tank
      ctx.fillStyle = tank;
      ctx.fillRect(x + 10, by + 12, 12, 5);
      ctx.fillRect(x + 8, by + 13, 3, 4);
      ctx.fillRect(x + 21, by + 13, 3, 4);
      ctx.fillStyle = "#ff006e";
      ctx.fillRect(x + 12, by + 14, 8, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 13, by + 14, 2, 2);
      ctx.fillRect(x + 17, by + 14, 2, 2);
      // Arms
      ctx.fillStyle = skin;
      ctx.fillRect(x + 4 + armL, by + 13, 4, 5);
      ctx.fillRect(x + 24 + armR, by + 13, 4, 5);
      ctx.fillRect(x + 3 + armL, by + 17, 3, 3);
      ctx.fillRect(x + 26 + armR, by + 17, 3, 3);
      // Fishnet sleeves
      ctx.fillStyle = fishnet;
      ctx.fillRect(x + 5 + armL, by + 14, 2, 3);
      ctx.fillRect(x + 25 + armR, by + 14, 2, 3);
      // Skirt
      ctx.fillStyle = skirt;
      ctx.fillRect(x + 10, by + 17, 12, 3);
      ctx.fillRect(x + 9 + legL, by + 19, 6, 3);
      ctx.fillRect(x + 17 + legR, by + 19, 6, 3);
      ctx.fillStyle = "#990000";
      ctx.fillRect(x + 10 + legL, by + 20, 2, 2);
      ctx.fillRect(x + 18 + legR, by + 21, 2, 1);
      // Fishnet legs
      ctx.fillStyle = fishnet;
      ctx.fillRect(x + 10 + legL, by + 22, 4, 4);
      ctx.fillRect(x + 18 + legR, by + 22, 4, 4);
      ctx.fillStyle = skin;
      ctx.fillRect(x + 11 + legL, by + 26, 3, 2);
      ctx.fillRect(x + 19 + legR, by + 26, 3, 2);
      // Boots
      ctx.fillStyle = boot;
      ctx.fillRect(x + 10 + legL, by + 27, 5, 2);
      ctx.fillRect(x + 18 + legR, by + 27, 5, 2);
      ctx.fillStyle = bootSole;
      ctx.fillRect(x + 10 + legL, by + 28, 5, 1);
      ctx.fillRect(x + 18 + legR, by + 28, 5, 1);
      ctx.fillStyle = "#888888";
      ctx.fillRect(x + 12 + legL, by + 27, 1, 1);
      ctx.fillRect(x + 20 + legR, by + 27, 1, 1);
    }

  } else {
    /* ═══════════════════════════════════════════════════
       ═══ VARIANT 2: THE STREET PUNK ═══
       Liberty spikes, patched vest, ripped jeans, docs
       ═══════════════════════════════════════════════════ */
    const spike = "#ff4400";
    const spikeDark = "#cc3300";
    const skin = "#ddb090";
    const vest = "#3a3a4a";
    const vestLight = "#4a4a5a";
    const hoodie = "#555555";
    const patch1 = "#ff006e";
    const patch2 = "#00f0ff";
    const patch3 = "#fcee0a";
    const jeans = "#1a1a2e";
    const boot = "#0a0a0a";
    const bootSole = "#444444";

    if (throwing) {
      /* ── THROW: whole body into the hurl ── */
      const tx = x + 3;
      // Liberty spikes (wild)
      ctx.fillStyle = spike;
      ctx.fillRect(tx + 13, y - 5, 3, 6);   // centre tall
      ctx.fillRect(tx + 10, y - 3, 3, 5);   // left
      ctx.fillRect(tx + 17, y - 3, 3, 5);   // right
      ctx.fillRect(tx + 14, y - 6, 2, 2);   // tip
      ctx.fillRect(tx + 11, y - 4, 2, 2);
      ctx.fillRect(tx + 18, y - 4, 2, 2);
      ctx.fillStyle = spikeDark;
      ctx.fillRect(tx + 13, y - 2, 1, 3);
      ctx.fillRect(tx + 16, y - 2, 1, 3);
      // Face
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 11, y + 3, 10, 6);
      ctx.fillRect(tx + 12, y + 9, 8, 2);
      drawEyes(tx, y + 4, skin);
      // Snarl mouth
      ctx.fillStyle = "#660000";
      ctx.fillRect(tx + 14, y + 8, 4, 2);
      ctx.fillStyle = "#ffcc00";
      ctx.fillRect(tx + 14, y + 8, 1, 2);
      ctx.fillRect(tx + 17, y + 8, 1, 2);
      // Nose ring
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(tx + 15, y + 7, 2, 1);
      // Neck
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 13, y + 10, 6, 2);
      // Patched vest (open, twisted)
      ctx.fillStyle = vest;
      ctx.fillRect(tx + 8, y + 12, 5, 8);   // left panel
      ctx.fillRect(tx + 19, y + 12, 5, 8);  // right panel
      ctx.fillRect(tx + 8, y + 12, 16, 3);  // shoulders
      // Patches
      ctx.fillStyle = patch1;
      ctx.fillRect(tx + 9, y + 14, 3, 2);
      ctx.fillStyle = patch2;
      ctx.fillRect(tx + 20, y + 15, 2, 2);
      ctx.fillStyle = patch3;
      ctx.fillRect(tx + 10, y + 17, 2, 2);
      // Hoodie underneath
      ctx.fillStyle = hoodie;
      ctx.fillRect(tx + 12, y + 13, 8, 5);
      ctx.fillRect(tx + 14, y + 18, 4, 2);
      // Studded wristbands
      ctx.fillStyle = "#222222";
      ctx.fillRect(tx + 7, y + 18, 3, 2);
      ctx.fillRect(tx + 22, y + 18, 3, 2);
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(tx + 7, y + 18, 1, 1);
      ctx.fillRect(tx + 23, y + 18, 1, 1);
      // Left arm back
      ctx.fillStyle = vest;
      ctx.fillRect(tx + 3, y + 11, 4, 6);
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 2, y + 9, 3, 3);
      // Right arm throwing
      ctx.fillStyle = vest;
      ctx.fillRect(tx + 21, y + 16, 4, 5);
      ctx.fillRect(tx + 22, y + 20, 3, 5);
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 22, y + 24, 3, 3);
      // Projectile in hand
      ctx.fillStyle = "#39ff14";
      ctx.fillRect(tx + 23, y + 26, 2, 2);
      // Ripped jeans
      ctx.fillStyle = jeans;
      ctx.fillRect(tx + 11, y + 20, 10, 3);
      ctx.fillRect(tx + 9, y + 22, 5, 5);
      ctx.fillRect(tx + 18, y + 22, 5, 5);
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 10, y + 24, 2, 2);
      ctx.fillRect(tx + 19, y + 25, 2, 2);
      // Legs
      ctx.fillStyle = skin;
      ctx.fillRect(tx + 10, y + 26, 3, 2);
      ctx.fillRect(tx + 19, y + 26, 3, 2);
      // Boots
      ctx.fillStyle = boot;
      ctx.fillRect(tx + 9, y + 27, 5, 2);
      ctx.fillRect(tx + 18, y + 27, 5, 2);
      ctx.fillStyle = bootSole;
      ctx.fillRect(tx + 9, y + 28, 5, 1);
      ctx.fillRect(tx + 18, y + 28, 5, 1);
      // Yellow laces
      ctx.fillStyle = "#ffcc00";
      ctx.fillRect(tx + 11, y + 27, 1, 1);
      ctx.fillRect(tx + 20, y + 27, 1, 1);
    } else {
      /* ── WALK: marching with swinging arms ── */
      const legL = walk * 2.5;
      const legR = -walk * 2.5;
      const armL = -walk * 2;
      const armR = walk * 2;
      const by = y + bob;
      // Liberty spikes
      ctx.fillStyle = spike;
      ctx.fillRect(x + 13, by - 4, 3, 5);
      ctx.fillRect(x + 10, by - 2, 3, 4);
      ctx.fillRect(x + 17, by - 2, 3, 4);
      ctx.fillRect(x + 14, by - 5, 2, 2);
      ctx.fillStyle = spikeDark;
      ctx.fillRect(x + 13, by - 1, 1, 3);
      ctx.fillRect(x + 16, by - 1, 1, 3);
      // Face
      ctx.fillStyle = skin;
      ctx.fillRect(x + 11, by + 3, 10, 6);
      ctx.fillRect(x + 12, by + 9, 8, 2);
      drawEyes(x, by + 4, skin);
      // Neutral mouth
      ctx.fillStyle = "#884444";
      ctx.fillRect(x + 14, by + 8, 4, 1);
      // Nose ring
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(x + 15, by + 7, 2, 1);
      // Neck
      ctx.fillStyle = skin;
      ctx.fillRect(x + 13, by + 10, 6, 2);
      // Patched vest
      ctx.fillStyle = vest;
      ctx.fillRect(x + 8, by + 12, 5, 8);
      ctx.fillRect(x + 19, by + 12, 5, 8);
      ctx.fillRect(x + 8, by + 12, 16, 3);
      ctx.fillStyle = vestLight;
      ctx.fillRect(x + 9, by + 13, 2, 2);
      ctx.fillRect(x + 20, by + 14, 2, 2);
      // Patches
      ctx.fillStyle = patch1;
      ctx.fillRect(x + 9, by + 14, 3, 2);
      ctx.fillStyle = patch2;
      ctx.fillRect(x + 20, by + 15, 2, 2);
      ctx.fillStyle = patch3;
      ctx.fillRect(x + 10, by + 17, 2, 2);
      // Hoodie
      ctx.fillStyle = hoodie;
      ctx.fillRect(x + 12, by + 13, 8, 5);
      ctx.fillRect(x + 14, by + 18, 4, 2);
      // Arms
      ctx.fillStyle = vest;
      ctx.fillRect(x + 4 + armL, by + 13, 4, 6);
      ctx.fillRect(x + 24 + armR, by + 13, 4, 6);
      ctx.fillStyle = skin;
      ctx.fillRect(x + 3 + armL, by + 18, 3, 3);
      ctx.fillRect(x + 26 + armR, by + 18, 3, 3);
      // Studs
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(x + 5 + armL, by + 14, 1, 1);
      ctx.fillRect(x + 27 + armR, by + 14, 1, 1);
      // Jeans
      ctx.fillStyle = jeans;
      ctx.fillRect(x + 11, by + 20, 10, 3);
      ctx.fillRect(x + 9 + legL, by + 22, 5, 5);
      ctx.fillRect(x + 18 + legR, by + 22, 5, 5);
      ctx.fillStyle = skin;
      ctx.fillRect(x + 10 + legL, by + 24, 2, 2);
      ctx.fillRect(x + 19 + legR, by + 25, 2, 2);
      // Legs
      ctx.fillStyle = skin;
      ctx.fillRect(x + 10 + legL, by + 26, 3, 2);
      ctx.fillRect(x + 19 + legR, by + 26, 3, 2);
      // Boots
      ctx.fillStyle = boot;
      ctx.fillRect(x + 9 + legL, by + 27, 5, 2);
      ctx.fillRect(x + 18 + legR, by + 27, 5, 2);
      ctx.fillStyle = bootSole;
      ctx.fillRect(x + 9 + legL, by + 28, 5, 1);
      ctx.fillRect(x + 18 + legR, by + 28, 5, 1);
      ctx.fillStyle = "#ffcc00";
      ctx.fillRect(x + 11 + legL, by + 27, 1, 1);
      ctx.fillRect(x + 20 + legR, by + 27, 1, 1);
    }
  }
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 0 | 1 | 2,
  frame: number,
  throwing = false,
  w = ENEMY_REF_W,
  h = ENEMY_REF_H
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / ENEMY_REF_W, h / ENEMY_REF_H);
  drawFanBody(ctx, 0, 0, variant, frame, throwing);
  ctx.restore();
}

/* ── Player bullet: 8-bit electricity burst ── */
export function drawPlayerBullet(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, size = 4, angle = -Math.PI / 2) {
  const scale = size / 4;
  const primary = frame % 3 === 0 ? "#ffffff" : "#00f0ff";
  const secondary = frame % 3 === 0 ? "#00f0ff" : "#88ffff";

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2); // bolt is drawn pointing up, rotate to match velocity
  ctx.scale(scale, scale);
  ctx.fillStyle = primary;

  // Main jagged bolt — 3 vertical segments with horizontal zig-zags
  const zig = (frame % 4) - 1.5; // -1.5, -0.5, 0.5, 1.5
  ctx.fillRect(zig, -4, 1, 2);
  ctx.fillRect(-zig, -2, 1, 2);
  ctx.fillRect(zig * 0.5, 0, 1, 2);
  ctx.fillRect(-zig * 0.5, 2, 1, 2);

  // Secondary sparks
  ctx.fillStyle = secondary;
  ctx.fillRect(2, -3, 1, 1);
  ctx.fillRect(-2, -1, 1, 1);
  ctx.fillRect(1, 1, 1, 1);
  ctx.fillRect(-1, 3, 1, 1);

  // Electric glow around core
  ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
  ctx.fillRect(-2, -5, 4, 10);

  ctx.restore();
}

/* ── Enemy projectiles — 4×4 sprite sheet ── */

// ── Enemy projectile sprite sheet loader ────────────────────────────────────
// public/projectiles/spritesheets/underwear.png
// Layout: 4 rows × 4 columns = 16 different projectile sprites.
// Each enemy is assigned a random index (0–15) when it spawns.
// projectileIndex → row = Math.floor(index / 4), col = index % 4
let underwearImg: HTMLImageElement | null = null;
let underwearLoaded = false;

export function loadUnderwearSprite(): void {
  if (typeof window === "undefined" || underwearLoaded) return;
  underwearLoaded = true;
  underwearImg = new Image();
  underwearImg.src = "/projectiles/spritesheets/underwear.png";
}

// Fallback palette: 16 colours cycling through hues for variety when sprite not loaded
const FALLBACK_COLORS = [
  "#ff006e", "#ff4500", "#ff8c00", "#ffd700",
  "#39ff14", "#00f0ff", "#0080ff", "#8000ff",
  "#ff66cc", "#ff3333", "#ffaa00", "#aaff00",
  "#00ffaa", "#00aaff", "#aa00ff", "#ffffff",
];

/**
 * Draw one enemy projectile from the 4×4 sprite sheet.
 * Falls back to a coloured pixel-art diamond when the sheet isn't loaded yet.
 *
 * @param projectileIndex  0–15 — which cell in the 4×4 grid to draw
 * @param size             Rendered size in game units (configurable in editor)
 * @param rows             Rows in the sheet (default 4)
 * @param cols             Columns in the sheet (default 4)
 */
export function drawEnemyBullet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  projectileIndex = 0,
  size = 16,
  rows = 4,
  cols = 4,
) {
  const idx = Math.max(0, Math.min(rows * cols - 1, projectileIndex));

  // Try sprite sheet first
  if (underwearImg && underwearImg.complete && underwearImg.naturalWidth > 0) {
    const fw = underwearImg.naturalWidth  / cols;
    const fh = underwearImg.naturalHeight / rows;
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    ctx.drawImage(underwearImg, col * fw, row * fh, fw, fh, x - size / 2, y - size / 2, size, size);
    return;
  }

  // ── Procedural fallback: small coloured pixel diamond ──────────────────
  const color = FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  const h = Math.ceil(size / 2);
  const w = Math.ceil(size / 3);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2,       y - h,         w,     h / 2); // top
  ctx.fillRect(x - size / 4,    y - h / 2,     size / 2, h); // middle
  ctx.fillRect(x - w / 2,       y + h / 2,     w,     h / 2); // bottom
  // Bright highlight
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - w / 4,       y - h + 1,     Math.max(1, w / 2), 1);
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
  type: "rapid" | "shield" | "wideshot" | "extralife" | "invincible" | "choice" | "projectile" | "timewarp" | "doubleshot" | "ricochet" | "overcharge" | "groupie",
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
    projectile: { core: "#ff6600", glow: "rgba(255, 102, 0,", bright: "#ffaa00" },
    extralife:{ core: "#ff006e", glow: "rgba(255, 0, 110,", bright: "#ff88bb" },
    invincible:{ core: "#ffd700", glow: "rgba(255, 215, 0,", bright: "#ffffff" },
    choice:   { core: "#00CED1", glow: "rgba(0, 206, 209,", bright: "#80FFFF" },
    timewarp: { core: "#00b4d8", glow: "rgba(0, 180, 216,", bright: "#80e5ff" },
    doubleshot:{ core: "#ff8800", glow: "rgba(255, 136, 0,", bright: "#ffcc66" },
    ricochet: { core: "#fcee0a", glow: "rgba(252, 238, 10,", bright: "#ffffff" },
    overcharge:{ core: "#ff2222", glow: "rgba(255, 34, 34,", bright: "#ffaaaa" },
    groupie:  { core: "#ff69b4", glow: "rgba(255, 105, 180,", bright: "#ffcce5" },
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
    case "projectile": {
      // Bullet stack (orange)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 1 * s, cy - 3 * s, 2 * s, 2 * s);
      ctx.fillRect(cx - 2 * s, cy - 1 * s, 4 * s, 2 * s);
      ctx.fillRect(cx - 1 * s, cy + 1 * s, 2 * s, 2 * s);
      // Bright highlight
      ctx.fillStyle = c.bright;
      if (frame % 5 < 2) {
        ctx.fillRect(cx - 1 * s, cy - 2 * s, 2 * s, 1 * s);
        ctx.fillRect(cx - 1 * s, cy, 2 * s, 1 * s);
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
    case "choice": {
      // 8-bit upward-pointing turquoise arrow — pick-this-up for a permanent power-up.
      const blink = frame % 8 < 4; // slow blink for shimmer highlight

      // Arrow body (turquoise)
      ctx.fillStyle = c.core;
      // Arrowhead: tip → wings → base-of-head
      ctx.fillRect(cx - 1 * s, cy - 4 * s, 2 * s, 1 * s); // tip (topmost row)
      ctx.fillRect(cx - 2 * s, cy - 3 * s, 4 * s, 1 * s); // upper wings
      ctx.fillRect(cx - 3 * s, cy - 2 * s, 6 * s, 1 * s); // wide base of arrowhead
      // Stem
      ctx.fillRect(cx - 1 * s, cy - 1 * s, 2 * s, 1 * s);
      ctx.fillRect(cx - 1 * s, cy,          2 * s, 1 * s);
      ctx.fillRect(cx - 1 * s, cy + 1 * s,  2 * s, 1 * s);
      ctx.fillRect(cx - 1 * s, cy + 2 * s,  2 * s, 1 * s);

      // Bright highlight pixels for 8-bit shimmer (alternate frames)
      ctx.fillStyle = c.bright;
      if (blink) {
        ctx.fillRect(cx - 1 * s, cy - 4 * s, 1 * s, 1 * s); // tip left pixel
        ctx.fillRect(cx - 2 * s, cy - 3 * s, 1 * s, 1 * s); // wing left edge
        ctx.fillRect(cx - 1 * s, cy - 1 * s, 1 * s, 1 * s); // top of stem
      }

      // Faint secondary highlight row (outer corner sparks, turquoise sparkle)
      const sparkOn = frame % 6 < 3;
      ctx.fillStyle = sparkOn ? "#ffffff" : c.core;
      ctx.fillRect(cx - 4 * s, cy - 3 * s, 1 * s, 1 * s); // left spark
      ctx.fillRect(cx + 3 * s, cy - 3 * s, 1 * s, 1 * s); // right spark
      break;
    }
    case "timewarp": {
      // Clock icon (cyan)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 3 * s, cy - 3 * s, 6 * s, 6 * s);
      ctx.fillRect(cx - 2 * s, cy - 4 * s, 4 * s, 1 * s);
      ctx.fillRect(cx - 2 * s, cy + 3 * s, 4 * s, 1 * s);
      ctx.fillRect(cx - 4 * s, cy - 2 * s, 1 * s, 4 * s);
      ctx.fillRect(cx + 3 * s, cy - 2 * s, 1 * s, 4 * s);
      // Clock hands
      ctx.fillStyle = c.bright;
      ctx.fillRect(cx - 0.5 * s, cy - 2 * s, 1 * s, 2 * s);
      ctx.fillRect(cx - 0.5 * s, cy, 1.5 * s, 1 * s);
      break;
    }
    case "doubleshot": {
      // Two parallel bullets (orange)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 2.5 * s, cy - 3 * s, 1.5 * s, 5 * s);
      ctx.fillRect(cx + 1 * s, cy - 3 * s, 1.5 * s, 5 * s);
      ctx.fillStyle = c.bright;
      if (frame % 5 < 2) {
        ctx.fillRect(cx - 2.5 * s, cy - 3 * s, 1 * s, 1 * s);
        ctx.fillRect(cx + 1 * s, cy - 3 * s, 1 * s, 1 * s);
      }
      break;
    }
    case "ricochet": {
      // Lightning bounce (yellow)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 1 * s, cy - 3 * s, 2 * s, 2 * s);
      ctx.fillRect(cx - 2 * s, cy - 1 * s, 3 * s, 1 * s);
      ctx.fillRect(cx - 1 * s, cy, 2 * s, 1 * s);
      ctx.fillRect(cx, cy + 1 * s, 2 * s, 2 * s);
      ctx.fillStyle = c.bright;
      if (frame % 4 < 2) {
        ctx.fillRect(cx - 1 * s, cy - 2 * s, 1 * s, 1 * s);
        ctx.fillRect(cx, cy + 1 * s, 1 * s, 1 * s);
      }
      break;
    }
    case "overcharge": {
      // Power bolt (red/gold)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 1 * s, cy - 3 * s, 2 * s, 2 * s);
      ctx.fillRect(cx - 2 * s, cy - 1 * s, 4 * s, 2 * s);
      ctx.fillRect(cx - 1 * s, cy + 1 * s, 2 * s, 2 * s);
      ctx.fillStyle = c.bright;
      if (frame % 3 < 1) {
        ctx.fillRect(cx - 0.5 * s, cy - 2 * s, 1 * s, 1 * s);
        ctx.fillRect(cx - 1 * s, cy, 2 * s, 1 * s);
      }
      break;
    }
    case "groupie": {
      // Small heart (pink)
      ctx.fillStyle = c.core;
      ctx.fillRect(cx - 1 * s, cy - 2 * s, 2 * s, 2 * s);
      ctx.fillRect(cx - 2 * s, cy - 1 * s, 4 * s, 2 * s);
      ctx.fillRect(cx - 1 * s, cy + 1 * s, 2 * s, 1 * s);
      ctx.fillStyle = c.bright;
      if (frame % 6 < 3) {
        ctx.fillRect(cx - 1 * s, cy - 1 * s, 1 * s, 1 * s);
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
  hitFlash: number,
  bossNumber = 1
) {
  const refW = 40;
  const refH = 30;
  const variant = (bossNumber - 1) % 3;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / refW, h / refH);

  if (hitFlash > 0) {
    ctx.globalAlpha = 0.6 + Math.sin(frame * 0.8) * 0.4;
  }

  if (variant === 0) {
    /* ═══════════════════════════════════════
       ═══ BOSS 1: THE WATCHER ═══
       Dark purple mech, single giant eye,
       shoulder spikes, side cannons, thrusters
       ═══════════════════════════════════════ */
    // Main body
    ctx.fillStyle = "#4a004a";
    ctx.fillRect(8, 6, 24, 20);
    // Armour plates
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
    // Giant single eye
    const eyeColor = frame % 10 < 5 ? "#ff006e" : "#ff88bb";
    ctx.fillStyle = eyeColor;
    ctx.fillRect(16, 12, 8, 4);
    ctx.fillRect(18, 10, 4, 2);
    ctx.fillRect(18, 16, 4, 2);
    ctx.fillStyle = "#000000";
    ctx.fillRect(19, 13, 2, 2);
    // Vent mouth
    ctx.fillStyle = "#220022";
    ctx.fillRect(14, 20, 12, 2);
    ctx.fillRect(16, 22, 8, 2);
    // Side cannons
    ctx.fillStyle = "#888888";
    ctx.fillRect(2, 18, 6, 4);
    ctx.fillRect(32, 18, 6, 4);
    ctx.fillStyle = "#aaaaaa";
    ctx.fillRect(0, 19, 2, 2);
    ctx.fillRect(38, 19, 2, 2);
    // Thrusters
    ctx.fillStyle = frame % 6 < 3 ? "#ff8800" : "#ff4400";
    ctx.fillRect(10, 28, 4, 2);
    ctx.fillRect(26, 28, 4, 2);

  } else if (variant === 1) {
    /* ═══════════════════════════════════════
       ═══ BOSS 2: THE BRUTE ═══
       Red horned demon, two glowing eyes,
       sharp teeth, clawed hands, spiked shoulders
       ═══════════════════════════════════════ */
    // Horns (curved back)
    ctx.fillStyle = "#ccaa00";
    ctx.fillRect(8, 0, 3, 5);
    ctx.fillRect(6, 2, 3, 3);
    ctx.fillRect(29, 0, 3, 5);
    ctx.fillRect(31, 2, 3, 3);
    ctx.fillStyle = "#ffdd33";
    ctx.fillRect(8, 0, 2, 3);
    ctx.fillRect(30, 0, 2, 3);
    // Main body (dark red)
    ctx.fillStyle = "#5a0000";
    ctx.fillRect(8, 6, 24, 20);
    // Muscle definition
    ctx.fillStyle = "#7a1010";
    ctx.fillRect(10, 8, 8, 6);
    ctx.fillRect(22, 8, 8, 6);
    ctx.fillRect(12, 16, 16, 4);
    // Spiked shoulder pads
    ctx.fillStyle = "#888888";
    ctx.fillRect(2, 6, 5, 5);
    ctx.fillRect(33, 6, 5, 5);
    ctx.fillStyle = "#aaaaaa";
    ctx.fillRect(2, 6, 2, 3);
    ctx.fillRect(36, 6, 2, 3);
    // Two glowing red eyes
    const eyeGlow = frame % 10 < 5 ? "#ff0000" : "#ff6666";
    ctx.fillStyle = eyeGlow;
    ctx.fillRect(13, 11, 5, 3);
    ctx.fillRect(22, 11, 5, 3);
    ctx.fillStyle = "#000000";
    ctx.fillRect(14, 12, 3, 2);
    ctx.fillRect(23, 12, 3, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(15, 12, 1, 1);
    ctx.fillRect(24, 12, 1, 1);
    // Sharp teeth mouth
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(14, 18, 12, 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(14, 18, 2, 2);
    ctx.fillRect(17, 19, 2, 2);
    ctx.fillRect(20, 18, 2, 2);
    ctx.fillRect(23, 19, 2, 2);
    // Clawed hands
    ctx.fillStyle = "#7a1010";
    ctx.fillRect(0, 14, 5, 6);
    ctx.fillRect(35, 14, 5, 6);
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(0, 16, 2, 3);
    ctx.fillRect(38, 16, 2, 3);
    // Feet / hooves
    ctx.fillStyle = "#3a0000";
    ctx.fillRect(10, 26, 6, 4);
    ctx.fillRect(24, 26, 6, 4);
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(10, 28, 6, 1);
    ctx.fillRect(24, 28, 6, 1);

  } else {
    /* ═══════════════════════════════════════
       ═══ BOSS 3: THE SENTRY ═══
       Cyan cyber skull, hollow eyes, reactor core,
       antenna, mechanical arms, hover jets
       ═══════════════════════════════════════ */
    // Antennae
    ctx.fillStyle = "#00aaaa";
    ctx.fillRect(10, 0, 2, 5);
    ctx.fillRect(28, 0, 2, 5);
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(10, 0, 1, 3);
    ctx.fillRect(28, 0, 1, 3);
    // Main body (dark cyan)
    ctx.fillStyle = "#003a3a";
    ctx.fillRect(8, 6, 24, 20);
    // Metal plates
    ctx.fillStyle = "#005a5a";
    ctx.fillRect(6, 4, 28, 3);
    ctx.fillRect(6, 25, 28, 3);
    ctx.fillRect(4, 7, 4, 18);
    ctx.fillRect(32, 7, 4, 18);
    // Skull face plate
    ctx.fillStyle = "#004444";
    ctx.fillRect(12, 8, 16, 10);
    // Hollow eyes (glowing cyan)
    const eyePulse = frame % 10 < 5 ? "#00ffcc" : "#00aaaa";
    ctx.fillStyle = eyePulse;
    ctx.fillRect(14, 11, 4, 3);
    ctx.fillRect(22, 11, 4, 3);
    ctx.fillStyle = "#000000";
    ctx.fillRect(15, 12, 2, 2);
    ctx.fillRect(23, 12, 2, 2);
    // Nose socket
    ctx.fillStyle = "#002222";
    ctx.fillRect(18, 15, 4, 2);
    // Grinning teeth
    ctx.fillStyle = "#aaaaaa";
    ctx.fillRect(14, 18, 2, 2);
    ctx.fillRect(17, 19, 2, 2);
    ctx.fillRect(20, 19, 2, 2);
    ctx.fillRect(23, 18, 2, 2);
    // Reactor core (chest)
    const coreColor = frame % 8 < 4 ? "#00ffcc" : "#0088aa";
    ctx.fillStyle = coreColor;
    ctx.fillRect(17, 22, 6, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(19, 23, 2, 2);
    // Mechanical tentacle arms
    ctx.fillStyle = "#005a5a";
    ctx.fillRect(0, 10, 4, 10);
    ctx.fillRect(36, 10, 4, 10);
    ctx.fillStyle = "#00aaaa";
    ctx.fillRect(0, 12, 2, 2);
    ctx.fillRect(0, 16, 2, 2);
    ctx.fillRect(38, 12, 2, 2);
    ctx.fillRect(38, 16, 2, 2);
    // Hover jets (bottom)
    ctx.fillStyle = frame % 4 < 2 ? "#00ffcc" : "#0088aa";
    ctx.fillRect(8, 28, 4, 2);
    ctx.fillRect(28, 28, 4, 2);
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(9, 28, 2, 1);
    ctx.fillRect(29, 28, 2, 1);
  }

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
  fillColor?: string,
  textSize?: number,
) {
  const ratio = Math.max(0, Math.min(1, current / max));

  // Fill colour — use provided color or default gradient (green → yellow → red)
  let color = fillColor ?? "#00ff00";
  if (!fillColor) {
    if (ratio < 0.3) color = "#ff0000";
    else if (ratio < 0.6) color = "#ffff00";
  }

  const segW = Math.max(3, Math.floor(height * 0.6)); // segment width
  const gap = Math.max(1, Math.floor(height * 0.15));  // gap between segments
  const totalSegW = segW + gap;
  const maxSegs = Math.max(1, Math.floor((width - gap) / totalSegW));
  const filledSegs = Math.max(0, Math.floor(maxSegs * ratio));

  // Outer border (3px stepped look)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 3, y - 3, width + 6, height + 6);

  // Inner background
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x - 1, y - 1, width + 2, height + 2);

  // Background segments (empty slots)
  ctx.fillStyle = "#0a0a0a";
  for (let i = 0; i < maxSegs; i++) {
    const sx = x + gap + i * totalSegW;
    if (sx + segW > x + width) break;
    ctx.fillRect(sx, y, segW, height);
  }

  // Filled segments
  if (filledSegs > 0) {
    ctx.fillStyle = color;
    for (let i = 0; i < filledSegs; i++) {
      const sx = x + gap + i * totalSegW;
      if (sx + segW > x + width) break;
      ctx.fillRect(sx, y, segW, height);
    }
  }

  // Label text drawn BELOW the bar so high numbers never clip
  const textY = y + height + height + 2;
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.max(8, textSize ?? Math.floor(height * 1.2))}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.textRendering = "geometricPrecision";
  ctx.fillText(`${label} ${Math.ceil(current)}/${max}`, x + width / 2, textY);
}

/* ── Barricade / shield block ── */
export function drawBarricade(ctx: CanvasRenderingContext2D, x: number, y: number, health: number) {
  const alpha = Math.max(0.3, health / 3);
  ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
  ctx.fillRect(x, y, 4, 4);
}
