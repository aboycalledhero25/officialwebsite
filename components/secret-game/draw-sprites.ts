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
export const ENEMY_W_BASE = 32;
export const ENEMY_H_BASE = 28;

/* ── Enemies: High-Res Pop Punk Fans (skater, punk girl, mohawk) ── */
function drawFanBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 0 | 1 | 2,
  frame: number
) {
  const jump = Math.abs(Math.sin(frame * 0.12 + variant * 3)) * 2;
  const armWave = Math.sin(frame * 0.25 + variant * 2);
  const headBop = Math.sin(frame * 0.18 + variant * 4) * 0.8;
  const leftLegOffset = Math.sin(frame * 0.2 + variant) * 0.8;
  const rightLegOffset = Math.sin(frame * 0.2 + variant + Math.PI) * 0.8;

  if (variant === 0) {
    /* ═══════════════════════════════════════
       ═══ SKATER BOY ═══
       Backwards cap, baggy band tee, denim
       shorts, chunky skate shoes w/ red stripe
       ═══════════════════════════════════════ */
    const cap = "#1a1f3a";
    const capBrim = "#2a3050";
    const skin = "#ffccaa";
    const shirt = "#f5f5f5";
    const logo = "#ff006e";
    const shorts = "#3a5a8a";
    const shortsDark = "#2a4a7a";
    const shoe = "#eeeeee";
    const shoeAccent = "#dd2222";
    const shoeSole = "#cccccc";

    // ── Backwards cap ──
    ctx.fillStyle = cap;
    ctx.fillRect(x + 9, y + headBop + 0, 14, 4);       // cap dome
    ctx.fillRect(x + 7, y + headBop + 2, 5, 3);        // back of cap
    ctx.fillRect(x + 5, y + headBop + 3, 4, 2);        // cap tail
    ctx.fillStyle = capBrim;
    ctx.fillRect(x + 20, y + headBop + 3, 6, 2);       // brim
    ctx.fillRect(x + 23, y + headBop + 4, 4, 1);
    // Cap logo
    ctx.fillStyle = "#ff006e";
    ctx.fillRect(x + 13, y + headBop + 1, 3, 2);

    // ── Face ──
    ctx.fillStyle = skin;
    ctx.fillRect(x + 10, y + headBop + 4, 12, 6);      // face
    ctx.fillRect(x + 11, y + headBop + 10, 10, 2);     // chin/jaw
    // Eyes
    if (frame % 50 < 47) {
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(x + 12, y + headBop + 6, 3, 2);     // left eye
      ctx.fillRect(x + 18, y + headBop + 6, 3, 2);     // right eye
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 13, y + headBop + 6, 1, 1);     // highlight
      ctx.fillRect(x + 19, y + headBop + 6, 1, 1);
    }
    // Mouth (smirk)
    ctx.fillStyle = "#aa5555";
    ctx.fillRect(x + 14, y + headBop + 9, 4, 1);
    ctx.fillRect(x + 17, y + headBop + 8, 2, 1);

    // ── Neck ──
    ctx.fillStyle = skin;
    ctx.fillRect(x + 13, y + headBop + 11, 6, 2);

    // ── Baggy band tee ──
    ctx.fillStyle = shirt;
    ctx.fillRect(x + 6, y + 12 + jump, 20, 7);         // main torso
    ctx.fillRect(x + 4, y + 13 + jump, 3, 5);          // left sleeve
    ctx.fillRect(x + 25, y + 13 + jump, 3, 5);         // right sleeve
    // Neck hole
    ctx.fillStyle = skin;
    ctx.fillRect(x + 13, y + 12 + jump, 6, 2);
    // Logo stripe (ABCH hint)
    ctx.fillStyle = logo;
    ctx.fillRect(x + 8, y + 15 + jump, 16, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 9, y + 15 + jump, 2, 2);
    ctx.fillRect(x + 12, y + 15 + jump, 2, 2);
    ctx.fillRect(x + 15, y + 15 + jump, 2, 2);
    ctx.fillRect(x + 18, y + 15 + jump, 2, 2);

    // ── Arms / hands ──
    const leftArmY = armWave > 0 ? y + 13 + jump : y + 17 + jump;
    const rightArmY = armWave > 0 ? y + 17 + jump : y + 13 + jump;
    ctx.fillStyle = skin;
    ctx.fillRect(x + 0, leftArmY, 4, 5);               // left arm
    ctx.fillRect(x + 28, rightArmY, 4, 5);             // right arm
    ctx.fillRect(x - 1, leftArmY + 3, 3, 3);           // left hand
    ctx.fillRect(x + 30, rightArmY + 3, 3, 3);         // right hand

    // ── Baggy denim shorts ──
    ctx.fillStyle = shorts;
    ctx.fillRect(x + 7, y + 19 + jump, 18, 3);         // waist
    ctx.fillRect(x + 6, y + 21 + jump, 8, 4);          // left leg
    ctx.fillRect(x + 18, y + 21 + jump, 8, 4);         // right leg
    ctx.fillStyle = shortsDark;
    ctx.fillRect(x + 7, y + 20 + jump, 16, 1);         // belt line
    ctx.fillRect(x + 8, y + 22 + jump, 2, 3);          // pocket L
    ctx.fillRect(x + 22, y + 22 + jump, 2, 3);         // pocket R

    // ── Legs ──
    ctx.fillStyle = skin;
    ctx.fillRect(x + 8 + leftLegOffset, y + 24 + jump, 4, 3);
    ctx.fillRect(x + 20 + rightLegOffset, y + 24 + jump, 4, 3);
    // White tube socks
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 7 + leftLegOffset, y + 26 + jump, 5, 2);
    ctx.fillRect(x + 19 + rightLegOffset, y + 26 + jump, 5, 2);
    // Sock stripes
    ctx.fillStyle = "#ff006e";
    ctx.fillRect(x + 8 + leftLegOffset, y + 27 + jump, 3, 1);
    ctx.fillRect(x + 20 + rightLegOffset, y + 27 + jump, 3, 1);

    // ── Skate shoes (chunky w/ red stripe) ──
    ctx.fillStyle = shoe;
    ctx.fillRect(x + 6 + leftLegOffset, y + 27 + jump, 7, 2);   // left shoe
    ctx.fillRect(x + 19 + rightLegOffset, y + 27 + jump, 7, 2); // right shoe
    ctx.fillStyle = shoeSole;
    ctx.fillRect(x + 6 + leftLegOffset, y + 28 + jump, 7, 1);
    ctx.fillRect(x + 19 + rightLegOffset, y + 28 + jump, 7, 1);
    ctx.fillStyle = shoeAccent;
    ctx.fillRect(x + 8 + leftLegOffset, y + 27 + jump, 3, 2);   // red stripe
    ctx.fillRect(x + 21 + rightLegOffset, y + 27 + jump, 3, 2);

  } else if (variant === 1) {
    /* ═══════════════════════════════════════
       ═══ PUNK GIRL ═══
       Pink split-dye hair, heavy eyeliner,
       choker, fishnet crop top, ripped jeans,
       platform boots with buckles
       ═══════════════════════════════════════ */
    const hairPink = "#ff55aa";
    const hairBlue = "#55aaff";
    const skin = "#ffddcc";
    const choker = "#111111";
    const ring = "#cccccc";
    const top = "#111111";
    const fishnet = "#333333";
    const pants = "#151525";
    const boot = "#0a0a0a";
    const bootSole = "#555555";
    const buckle = "#aaaaaa";

    // ── Split-dye hair (pink left, blue right) ──
    ctx.fillStyle = hairPink;
    ctx.fillRect(x + 7, y + headBop - 1, 9, 4);       // left volume
    ctx.fillRect(x + 5, y + headBop + 1, 5, 4);
    ctx.fillRect(x + 4, y + headBop + 3, 3, 3);
    ctx.fillStyle = hairBlue;
    ctx.fillRect(x + 16, y + headBop - 1, 9, 4);      // right volume
    ctx.fillRect(x + 22, y + headBop + 1, 5, 4);
    ctx.fillRect(x + 25, y + headBop + 3, 3, 3);
    // Bangs
    ctx.fillStyle = hairPink;
    ctx.fillRect(x + 10, y + headBop + 3, 3, 2);
    ctx.fillStyle = hairBlue;
    ctx.fillRect(x + 19, y + headBop + 3, 3, 2);

    // ── Face ──
    ctx.fillStyle = skin;
    ctx.fillRect(x + 11, y + headBop + 4, 10, 6);
    ctx.fillRect(x + 12, y + headBop + 10, 8, 2);
    // Eyes (heavy eyeliner)
    if (frame % 50 < 47) {
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(x + 12, y + headBop + 6, 3, 3);     // left eye
      ctx.fillRect(x + 18, y + headBop + 6, 3, 3);     // right eye
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 13, y + headBop + 7, 1, 1);
      ctx.fillRect(x + 19, y + headBop + 7, 1, 1);
    }
    // Eyeliner wings
    ctx.fillStyle = "#000000";
    ctx.fillRect(x + 11, y + headBop + 7, 1, 2);
    ctx.fillRect(x + 21, y + headBop + 7, 1, 2);
    // Dark lips
    ctx.fillStyle = "#aa2244";
    ctx.fillRect(x + 14, y + headBop + 10, 4, 1);
    ctx.fillRect(x + 15, y + headBop + 9, 2, 1);

    // ── Choker with ring ──
    ctx.fillStyle = choker;
    ctx.fillRect(x + 13, y + headBop + 12, 6, 2);
    ctx.fillStyle = ring;
    ctx.fillRect(x + 15, y + headBop + 12, 2, 2);

    // ── Fishnet crop top ──
    ctx.fillStyle = top;
    ctx.fillRect(x + 10, y + 13 + jump, 12, 4);        // crop body
    ctx.fillRect(x + 7, y + 14 + jump, 4, 4);          // left fishnet sleeve
    ctx.fillRect(x + 21, y + 14 + jump, 4, 4);         // right fishnet sleeve
    // Fishnet pattern
    ctx.fillStyle = fishnet;
    ctx.fillRect(x + 8, y + 15 + jump, 1, 1);
    ctx.fillRect(x + 10, y + 16 + jump, 1, 1);
    ctx.fillRect(x + 22, y + 15 + jump, 1, 1);
    ctx.fillRect(x + 24, y + 16 + jump, 1, 1);
    // Midriff (skin showing)
    ctx.fillStyle = skin;
    ctx.fillRect(x + 13, y + 17 + jump, 6, 2);

    // ── Arms ──
    const leftArmY = armWave > 0 ? y + 14 + jump : y + 18 + jump;
    const rightArmY = armWave > 0 ? y + 18 + jump : y + 14 + jump;
    ctx.fillStyle = skin;
    ctx.fillRect(x + 1, leftArmY, 4, 5);
    ctx.fillRect(x + 27, rightArmY, 4, 5);
    // Hands
    ctx.fillRect(x + 0, leftArmY + 3, 3, 3);
    ctx.fillRect(x + 29, rightArmY + 3, 3, 3);
    // Nail polish
    ctx.fillStyle = "#ff006e";
    ctx.fillRect(x + 0, leftArmY + 5, 1, 1);
    ctx.fillRect(x + 31, rightArmY + 5, 1, 1);

    // ── Ripped skinny jeans ──
    ctx.fillStyle = pants;
    ctx.fillRect(x + 10, y + 19 + jump, 14, 3);        // waist
    ctx.fillRect(x + 9, y + 21 + jump, 6, 5);          // left leg
    ctx.fillRect(x + 19, y + 21 + jump, 6, 5);         // right leg
    // Belt
    ctx.fillStyle = "#000000";
    ctx.fillRect(x + 10, y + 19 + jump, 14, 1);
    ctx.fillStyle = "#444444";
    ctx.fillRect(x + 16, y + 19 + jump, 2, 1);         // buckle
    // Rips (skin showing)
    ctx.fillStyle = skin;
    ctx.fillRect(x + 11, y + 23 + jump, 2, 2);         // left knee rip
    ctx.fillRect(x + 21, y + 24 + jump, 2, 2);         // right thigh rip
    ctx.fillRect(x + 10, y + 25 + jump, 1, 1);         // small rip

    // ── Legs ──
    ctx.fillStyle = skin;
    ctx.fillRect(x + 10 + leftLegOffset, y + 25 + jump, 4, 2);
    ctx.fillRect(x + 20 + rightLegOffset, y + 25 + jump, 4, 2);

    // ── Platform boots w/ buckles ──
    ctx.fillStyle = boot;
    ctx.fillRect(x + 9 + leftLegOffset, y + 26 + jump, 6, 3);   // left boot
    ctx.fillRect(x + 19 + rightLegOffset, y + 26 + jump, 6, 3); // right boot
    ctx.fillStyle = bootSole;
    ctx.fillRect(x + 9 + leftLegOffset, y + 28 + jump, 6, 1);
    ctx.fillRect(x + 19 + rightLegOffset, y + 28 + jump, 6, 1);
    // Platform wedge
    ctx.fillStyle = "#222222";
    ctx.fillRect(x + 9 + leftLegOffset, y + 27 + jump, 6, 1);
    ctx.fillRect(x + 19 + rightLegOffset, y + 27 + jump, 6, 1);
    // Buckles
    ctx.fillStyle = buckle;
    ctx.fillRect(x + 11 + leftLegOffset, y + 27 + jump, 2, 1);
    ctx.fillRect(x + 21 + rightLegOffset, y + 27 + jump, 2, 1);

  } else {
    /* ═══════════════════════════════════════
       ═══ MOHAWK DUDE ═══
       Tall neon green mohawk, shaved sides,
       stubble, gold hoop, studded leather jacket,
       ripped skinny jeans, combat boots
       ═══════════════════════════════════════ */
    const mohawk = "#39ff14";
    const mohawkDark = "#2acc10";
    const stubble = "#5a4a3a";
    const skin = "#eabb9e";
    const jacket = "#0f0f0f";
    const stud = "#888888";
    const shirt = "#dddddd";
    const jeans = "#222233";
    const boot = "#111111";
    const bootSole = "#444444";
    const lace = "#aaaaaa";

    // ── Tall neon mohawk ──
    ctx.fillStyle = mohawk;
    ctx.fillRect(x + 13, y + headBop - 4, 6, 5);       // main crest
    ctx.fillRect(x + 14, y + headBop - 6, 4, 3);       // tip
    ctx.fillRect(x + 12, y + headBop - 2, 8, 3);
    ctx.fillStyle = mohawkDark;
    ctx.fillRect(x + 14, y + headBop - 3, 2, 4);       // shadow
    // Shaved sides (stubble)
    ctx.fillStyle = stubble;
    ctx.fillRect(x + 9, y + headBop + 1, 4, 4);
    ctx.fillRect(x + 19, y + headBop + 1, 4, 4);
    ctx.fillRect(x + 8, y + headBop + 3, 2, 3);
    ctx.fillRect(x + 22, y + headBop + 3, 2, 3);

    // ── Face ──
    ctx.fillStyle = skin;
    ctx.fillRect(x + 11, y + headBop + 4, 10, 6);
    ctx.fillRect(x + 12, y + headBop + 10, 8, 2);
    // Eyes (intense)
    if (frame % 50 < 47) {
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(x + 12, y + headBop + 6, 3, 2);
      ctx.fillRect(x + 18, y + headBop + 6, 3, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 13, y + headBop + 6, 1, 1);
      ctx.fillRect(x + 19, y + headBop + 6, 1, 1);
    }
    // Stubble beard
    ctx.fillStyle = "#b08870";
    ctx.fillRect(x + 12, y + headBop + 9, 8, 2);
    ctx.fillRect(x + 13, y + headBop + 11, 6, 1);
    // Mouth
    ctx.fillStyle = "#884444";
    ctx.fillRect(x + 14, y + headBop + 9, 4, 1);
    // Gold hoop earring
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(x + 21, y + headBop + 8, 2, 2);
    ctx.fillStyle = skin;
    ctx.fillRect(x + 21, y + headBop + 9, 1, 1);

    // ── Neck ──
    ctx.fillStyle = skin;
    ctx.fillRect(x + 13, y + headBop + 12, 6, 2);

    // ── Studded leather jacket (open) ──
    ctx.fillStyle = jacket;
    ctx.fillRect(x + 7, y + 14 + jump, 5, 7);          // left panel
    ctx.fillRect(x + 20, y + 14 + jump, 5, 7);         // right panel
    ctx.fillRect(x + 7, y + 14 + jump, 18, 3);         // shoulders
    // Silver studs on shoulders
    ctx.fillStyle = stud;
    ctx.fillRect(x + 8, y + 15 + jump, 1, 1);
    ctx.fillRect(x + 10, y + 15 + jump, 1, 1);
    ctx.fillRect(x + 21, y + 15 + jump, 1, 1);
    ctx.fillRect(x + 23, y + 15 + jump, 1, 1);
    // Jacket lapels
    ctx.fillStyle = jacket;
    ctx.fillRect(x + 11, y + 14 + jump, 3, 4);
    ctx.fillRect(x + 18, y + 14 + jump, 3, 4);
    // White tee underneath
    ctx.fillStyle = shirt;
    ctx.fillRect(x + 13, y + 15 + jump, 6, 5);
    // Tee graphic (skull hint)
    ctx.fillStyle = "#aaaaaa";
    ctx.fillRect(x + 14, y + 16 + jump, 4, 2);
    ctx.fillRect(x + 15, y + 18 + jump, 2, 1);

    // ── Arms ──
    const leftArmY = armWave > 0 ? y + 15 + jump : y + 19 + jump;
    const rightArmY = armWave > 0 ? y + 19 + jump : y + 15 + jump;
    ctx.fillStyle = jacket;
    ctx.fillRect(x + 1, leftArmY, 5, 6);               // left sleeve
    ctx.fillRect(x + 26, rightArmY, 5, 6);             // right sleeve
    // Hands
    ctx.fillStyle = skin;
    ctx.fillRect(x + 0, leftArmY + 4, 3, 3);
    ctx.fillRect(x + 29, rightArmY + 4, 3, 3);
    // Spiked wristband
    ctx.fillStyle = "#222222";
    ctx.fillRect(x + 1, leftArmY + 3, 4, 2);
    ctx.fillRect(x + 27, rightArmY + 3, 4, 2);
    ctx.fillStyle = stud;
    ctx.fillRect(x + 2, leftArmY + 3, 1, 1);
    ctx.fillRect(x + 28, rightArmY + 3, 1, 1);

    // ── Ripped skinny jeans ──
    ctx.fillStyle = jeans;
    ctx.fillRect(x + 11, y + 20 + jump, 10, 3);        // waist
    ctx.fillRect(x + 10, y + 22 + jump, 5, 5);         // left leg
    ctx.fillRect(x + 17, y + 22 + jump, 5, 5);         // right leg
    // Belt
    ctx.fillStyle = "#111111";
    ctx.fillRect(x + 11, y + 20 + jump, 10, 1);
    ctx.fillStyle = stud;
    ctx.fillRect(x + 15, y + 20 + jump, 2, 1);         // buckle
    // Knee rip
    ctx.fillStyle = skin;
    ctx.fillRect(x + 11, y + 25 + jump, 2, 2);
    ctx.fillRect(x + 19, y + 24 + jump, 1, 1);

    // ── Legs ──
    ctx.fillStyle = skin;
    ctx.fillRect(x + 11 + leftLegOffset, y + 26 + jump, 3, 2);
    ctx.fillRect(x + 18 + rightLegOffset, y + 26 + jump, 3, 2);

    // ── Combat boots w/ laces ──
    ctx.fillStyle = boot;
    ctx.fillRect(x + 10 + leftLegOffset, y + 27 + jump, 5, 2);   // left boot
    ctx.fillRect(x + 17 + rightLegOffset, y + 27 + jump, 5, 2);  // right boot
    ctx.fillStyle = bootSole;
    ctx.fillRect(x + 10 + leftLegOffset, y + 28 + jump, 5, 1);
    ctx.fillRect(x + 17 + rightLegOffset, y + 28 + jump, 5, 1);
    // Laces
    ctx.fillStyle = lace;
    ctx.fillRect(x + 12 + leftLegOffset, y + 27 + jump, 1, 2);
    ctx.fillRect(x + 19 + rightLegOffset, y + 27 + jump, 1, 2);
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
      /* ═══ HIGH-RES Y-FRONTS (16×14) ═══ */
      // Grey elastic waistband
      ctx.fillStyle = "#bbbbbb";
      ctx.fillRect(x - 8, y - 6, 16, 3);
      ctx.fillStyle = "#999999";
      ctx.fillRect(x - 8, y - 6, 16, 1);   // top rib
      ctx.fillRect(x - 8, y - 4, 16, 1);   // bottom rib
      // White body
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 7, y - 3, 14, 4);   // upper body
      ctx.fillRect(x - 6, y + 1, 5, 4);    // left leg
      ctx.fillRect(x + 1, y + 1, 5, 4);    // right leg
      // Centre pouch (slightly rounded)
      ctx.fillRect(x - 4, y - 2, 8, 4);
      // Leg hole curves (shadow)
      ctx.fillStyle = "#eeeeee";
      ctx.fillRect(x - 6, y + 0, 2, 2);
      ctx.fillRect(x + 4, y + 0, 2, 2);
      // Y-stripe (grey seam)
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(x - 1, y + 0, 2, 5);
      ctx.fillRect(x, y + 0, 1, 5);
      // Bottom hem
      ctx.fillStyle = "#dddddd";
      ctx.fillRect(x - 6, y + 4, 5, 1);
      ctx.fillRect(x + 1, y + 4, 5, 1);
      break;
    }
    case "bra": {
      /* ═══ HIGH-RES PINK BRA (16×14) ═══ */
      // Straps
      ctx.fillStyle = "#ff88cc";
      ctx.fillRect(x - 5, y - 6, 3, 5);    // left strap
      ctx.fillRect(x + 2, y - 6, 3, 5);    // right strap
      ctx.fillStyle = "#ff99cc";
      ctx.fillRect(x - 5, y - 5, 3, 1);    // strap highlight
      ctx.fillRect(x + 2, y - 5, 3, 1);
      // Cups (curved shape)
      ctx.fillStyle = "#ff69b4";
      ctx.fillRect(x - 7, y - 2, 7, 4);    // left cup
      ctx.fillRect(x - 6, y + 2, 5, 2);
      ctx.fillRect(x + 0, y - 2, 7, 4);    // right cup
      ctx.fillRect(x + 1, y + 2, 5, 2);
      // Cup shading
      ctx.fillStyle = "#ff5599";
      ctx.fillRect(x - 7, y - 1, 2, 3);
      ctx.fillRect(x + 5, y - 1, 2, 3);
      // Centre clasp/bow
      ctx.fillStyle = "#ff4499";
      ctx.fillRect(x - 1, y + 0, 2, 3);
      ctx.fillRect(x - 2, y + 1, 4, 1);
      // Underband
      ctx.fillStyle = "#ff88cc";
      ctx.fillRect(x - 7, y + 3, 14, 2);
      ctx.fillStyle = "#ff99bb";
      ctx.fillRect(x - 7, y + 3, 14, 1);   // highlight
      break;
    }
    case "thong": {
      /* ═══ HIGH-RES GREEN THONG (14×16) ═══ */
      // Thick waistband
      ctx.fillStyle = "#39ff14";
      ctx.fillRect(x - 7, y - 7, 14, 4);
      ctx.fillStyle = "#66ff44";
      ctx.fillRect(x - 7, y - 7, 14, 1);   // top highlight
      ctx.fillStyle = "#22cc00";
      ctx.fillRect(x - 7, y - 4, 14, 1);   // bottom shadow
      // Centre pouch
      ctx.fillStyle = "#39ff14";
      ctx.fillRect(x - 4, y - 3, 8, 5);
      ctx.fillRect(x - 3, y + 2, 6, 2);
      // Pouch shading
      ctx.fillStyle = "#33dd11";
      ctx.fillRect(x - 4, y - 1, 2, 3);
      ctx.fillRect(x + 2, y - 1, 2, 3);
      // Back string (thin)
      ctx.fillStyle = "#44ee22";
      ctx.fillRect(x - 1, y + 3, 2, 6);
      ctx.fillStyle = "#66ff44";
      ctx.fillRect(x - 1, y + 4, 1, 4);    // highlight
      // String bottom knot
      ctx.fillStyle = "#39ff14";
      ctx.fillRect(x - 2, y + 8, 4, 2);
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
