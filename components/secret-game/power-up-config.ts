/**
 * ROGUELIKE POWER-UP CONFIGURATION
 * ====================================
 * All gameplay values for the permanent power-up system live here.
 * Edit this file to tune balance, or connect the Game Editor app to
 * read/write these values programmatically.
 *
 * ASSET PLACEMENT GUIDE
 * ─────────────────────
 * Power-up icons:         public/powerups/icons/<id>.png
 *   bomb.png  lightning.png  connect.png  extra_life.png
 *   fast_reload.png  frenzy.png  health_refill.png  health.png
 *   luck.png  machine_gun.png  nuke.png  projectile.png
 *   rapid_fire.png  seeker.png  shield.png  speed.png
 *   strength.png  virus.png
 *
 * Enemy sprite sheets:    public/enemies/spritesheets/<name>.png
 * Boss sprite sheets:     public/bosses/spritesheets/<name>.png
 */

export interface RoguelikeConfig {
  // ─── Player starting stats ──────────────────────────────────────────
  startingHearts: number;       // hearts at start of run (default: 3)
  baseReloadTime: number;       // seconds between shots  (lower = faster)
  baseMovementSpeed: number;    // px/sec in base 240×320 coords
  baseBulletDamage: number;     // damage per bullet applied to boss HP
  baseEnemyDropChance: number;  // probability an enemy drops a temp power-up

  // ─── Per power-up stats ─────────────────────────────────────────────
  bomb:        { cooldown: number; damage: number; bombsPerStack: number; crossRadius: number };
  lightning:   { cooldown: number; damage: number; baseStrikes: number; strikesPerStack: number };
  connect:     { damage: number; damagePerStack: number };
  extraLife:   { heartsPerStack: number };
  frenzy:      { cooldown: number; damage: number; baseProjectiles: number; projectilesPerStack: number; damagePerStack: number };
  health: {
    /**
     * Slices per heart at each Health stack level.
     * index 0 = default (1 hit = 1 full heart lost)
     * index 1 = halves (1 hit = half heart lost)
     * index 2 = thirds, index 3 = quarters, etc.
     */
    slicesProgression: number[];
  };
  luck:        { dropChancePerStack: number };
  projectile:  { projectilesPerStack: number; normalMax: number; redDamage: number; purpleDamage: number; goldDamage: number; tierSize: number; superBulletSizeMultiplier: number; redSize: number; purpleSize: number; goldSize: number };
  nuke:        { cooldown: number; bossHPReduction: number; nukesPerStack: number };
  vampirism:   { baseKills: number; killsPerStack: number };
  bounce:      { bouncesPerStack: number; maxBounces: number };
  magnet:      { baseRadius: number; radiusPerStack: number };
  pierce:      { piercePerStack: number };
  rapidFire:   { ratePerStack: number; minCooldown: number };
  /** Seeker Missile: auto-fires a homing missile at the nearest enemy every cooldown seconds. */
  seeker:      { missileDamage: number; missileCooldown: number; missilesPerStack: number; missileSize: number };
  shield:      { duration: number; cooldown: number };
  /** Orbital: spawns energy orbs that orbit the player and damage enemies on contact. */
  orbital:     { damage: number; orbitSpeed: number; orbSize: number; hitboxSize: number; cooldown: number; orbitRadius: number; duration: number };
  speed:       { speedPerStack: number };
  strength:    { damagePerStack: number };
  virus: {
    baseInfectionChance: number;
    chancePerStack: number;
    baseDamagePerTick: number;
    damagePerStack: number;
    tickInterval: number;    // seconds between DOT ticks
    duration: number;        // seconds virus lasts on target
    maxVirusStacks: number;  // max stacks on a single target
  };
  secondWind:   { hasSecondWind: boolean };
  thorns:       { damagePerStack: number; maxStacks: number };
  timeDilation: { durationBonusPerStack: number; maxStacks: number };
  explosive:    { radiusPerStack: number; damagePerStack: number; maxStacks: number };
  phoenix:      { hasPhoenix: boolean; explosionRadius: number; explosionDamage: number };
  chainReact:   { chancePerStack: number; maxStacks: number; arcDamage: number; arcRange: number };
  /** Black Hole: periodically pulls all enemies toward the screen centre. */
  blackHole:    { cooldown: number; pullRadius: number; damage: number };
  /** Cryo Rounds: enemy bullets move slower for a duration after picking this up. */
  cryo:         { slowDurationPerStack: number; maxStacks: number };
  /** Pyromaniac: bullets have a chance to inflict burn DOT on enemies. */
  pyromaniac:   { burnChancePerStack: number; burnDamagePerTick: number; burnDuration: number; tickInterval: number; maxStacks: number };
  /** Take Me Home: player bullets slightly home toward the nearest enemy. */
  takeMeHome:   { homingStrengthPerStack: number; maxStacks: number };

  // ─── Visual / sprite scaling ─────────────────────────────────────────────
  /**
   * Boss PNG sprite sizing relative to the hitbox size defined in data.json.
   * bossWidthMult/bossHeightMult: 1.0 = same size as hitbox; 1.5 = 50% bigger.
   * bossOffsetX/Y: pixel shift applied to the sprite draw position (can be
   *   negative to shift left/up, useful when the PNG has transparent padding).
   *
   * Impact GIF sizes are controlled directly in effect-sprites.ts → EFFECT_SIZE.
   *
   * Enemy projectile sprite sheet layout (underwear.png):
   *   underwearRows: total rows in the sheet  (4 in the 4×4 grid)
   *   underwearCols: total columns in the sheet (4 in the 4×4 grid)
   *   16 projectiles total — each enemy picks a random one (index 0–15).
   *   row = Math.floor(index / cols), col = index % cols
   */
  sprites: {
    bossWidthMult:  number;
    bossHeightMult: number;
    bossOffsetX:    number;
    bossOffsetY:    number;
    underwearRows:  number;
    underwearCols:  number;
  };
}

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  EDIT THESE VALUES to tune game balance.
 *  This object is the single source of truth for all
 *  roguelike power-up stats.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
export const ROGUELIKE_CONFIG: RoguelikeConfig = {
  startingHearts:       3,
  baseReloadTime:       0.35,   // ~3 shots/sec
  baseMovementSpeed:    90,
  baseBulletDamage:     20,
  baseEnemyDropChance:  0.12,

  bomb:       { cooldown: 30, damage: 20, bombsPerStack: 1, crossRadius: 30 },
  lightning:  { cooldown: 30, damage: 50, baseStrikes: 3, strikesPerStack: 1 },
  connect:    { damage: 50, damagePerStack: 25 },
  extraLife:  { heartsPerStack: 1 },
  frenzy:     { cooldown: 30, damage: 20, baseProjectiles: 8, projectilesPerStack: 2, damagePerStack: 5 },
  health:     { slicesProgression: [1, 2, 3, 4] },
  luck:       { dropChancePerStack: 0.01 },
  nuke:       { cooldown: 30, bossHPReduction: 0.25, nukesPerStack: 1 },
  vampirism:  { baseKills: 15, killsPerStack: 3 },
  bounce:     { bouncesPerStack: 1, maxBounces: 3 },
  magnet:     { baseRadius: 40, radiusPerStack: 20 },
  pierce:     { piercePerStack: 1 },
  projectile: { projectilesPerStack: 1, normalMax: 4, redDamage: 30, purpleDamage: 50, goldDamage: 80, tierSize: 5, superBulletSizeMultiplier: 2.5, redSize: 10, purpleSize: 12, goldSize: 14 },
  rapidFire:  { ratePerStack: 0.02, minCooldown: 0.05 },
  seeker:     { missileDamage: 150, missileCooldown: 15, missilesPerStack: 1, missileSize: 6 },
  shield:     { duration: 10, cooldown: 30 },
  orbital:    { damage: 30, orbitSpeed: 2.5, orbSize: 8, hitboxSize: 8, cooldown: 15, orbitRadius: 35, duration: 10 },
  speed:      { speedPerStack: 0.01 },
  strength:   { damagePerStack: 0.01 },
  virus: {
    baseInfectionChance: 0.20,
    chancePerStack:      0.05,
    baseDamagePerTick:   10,
    damagePerStack:      5,
    tickInterval:        0.5,
    duration:            3,
    maxVirusStacks:      3,
  },

  secondWind:   { hasSecondWind: false },
  thorns:       { damagePerStack: 2, maxStacks: 5 },
  timeDilation: { durationBonusPerStack: 0.5, maxStacks: 3 },
  explosive:    { radiusPerStack: 8, damagePerStack: 5, maxStacks: 3 },
  phoenix:      { hasPhoenix: false, explosionRadius: 80, explosionDamage: 50 },
  chainReact:   { chancePerStack: 0.15, maxStacks: 5, arcDamage: 20, arcRange: 60 },
  blackHole:    { cooldown: 45, pullRadius: 80, damage: 10 },
  cryo:         { slowDurationPerStack: 3, maxStacks: 5 },
  pyromaniac:   { burnChancePerStack: 0.10, burnDamagePerTick: 5, burnDuration: 3, tickInterval: 0.5, maxStacks: 5 },
  takeMeHome:   { homingStrengthPerStack: 0.15, maxStacks: 3 },

  sprites: {
    // Boss PNG sprite vs hitbox: 1.0 = exactly matches data.json boss.width/height
    // Increase to make sprites visually larger than the hitbox
    bossWidthMult:  2.2,  // bosses have transparent padding — scale up to fill
    bossHeightMult: 2.2,
    // Pixel offset to re-centre the scaled sprite over the hitbox
    bossOffsetX: -28,  // shift left to keep centred after width increase
    bossOffsetY: -35,  // shift up  to keep centred after height increase

    // underwear.png sprite sheet layout: 4 rows × 4 cols = 16 random projectile types
    underwearRows: 4,
    underwearCols: 4,
  },
};
