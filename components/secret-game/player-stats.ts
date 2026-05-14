/**
 * PLAYER STATS
 * ─────────────
 * Computed player stats derived from chosen permanent power-ups.
 * computePlayerStats() is the authoritative function – call it whenever
 * chosenPowerUps changes to get a fresh snapshot of all player capabilities.
 */

import { ROGUELIKE_CONFIG, type RoguelikeConfig } from "./power-up-config";

/**
 * Partial override for any subset of RoguelikeConfig sub-objects.
 * Matches the shape of SecretGameSettings.roguelikeConfig in lib/data.ts.
 */
export type RoguelikeConfigOverride = Partial<{
  startingHearts: number;
  baseReloadTime: number;
  baseMovementSpeed: number;
  baseBulletDamage: number;
  baseEnemyDropChance: number;
  rapidFire: Partial<RoguelikeConfig['rapidFire']>;
  frenzy: Partial<RoguelikeConfig['frenzy']>;
  bomb: Partial<RoguelikeConfig['bomb']>;
  lightning: Partial<RoguelikeConfig['lightning']>;
  connect: Partial<RoguelikeConfig['connect']>;
  seeker: Partial<RoguelikeConfig['seeker']>;
  orbital: Partial<RoguelikeConfig['orbital']>;
  virus: Partial<RoguelikeConfig['virus']>;
  nuke: Partial<RoguelikeConfig['nuke']>;
  speed: Partial<RoguelikeConfig['speed']>;
  strength: Partial<RoguelikeConfig['strength']>;
  projectile: Partial<RoguelikeConfig['projectile']>;
  luck: Partial<RoguelikeConfig['luck']>;
  extraLife: Partial<RoguelikeConfig['extraLife']>;
  shield: Partial<RoguelikeConfig['shield']>;
}>;

/**
 * Merges an optional override on top of the default ROGUELIKE_CONFIG.
 * Only the fields provided in the override are changed.
 */
function mergeConfig(override?: RoguelikeConfigOverride): RoguelikeConfig {
  if (!override) return ROGUELIKE_CONFIG;
  return {
    ...ROGUELIKE_CONFIG,
    startingHearts:      override.startingHearts      ?? ROGUELIKE_CONFIG.startingHearts,
    baseReloadTime:      override.baseReloadTime       ?? ROGUELIKE_CONFIG.baseReloadTime,
    baseMovementSpeed:   override.baseMovementSpeed    ?? ROGUELIKE_CONFIG.baseMovementSpeed,
    baseBulletDamage:    override.baseBulletDamage     ?? ROGUELIKE_CONFIG.baseBulletDamage,
    baseEnemyDropChance: override.baseEnemyDropChance  ?? ROGUELIKE_CONFIG.baseEnemyDropChance,
    rapidFire:   { ...ROGUELIKE_CONFIG.rapidFire,   ...(override.rapidFire   ?? {}) },
    frenzy:      { ...ROGUELIKE_CONFIG.frenzy,      ...(override.frenzy      ?? {}) },
    bomb:        { ...ROGUELIKE_CONFIG.bomb,        ...(override.bomb        ?? {}) },
    lightning:   { ...ROGUELIKE_CONFIG.lightning,   ...(override.lightning   ?? {}) },
    connect:     { ...ROGUELIKE_CONFIG.connect,     ...(override.connect     ?? {}) },
    seeker:      { ...ROGUELIKE_CONFIG.seeker,      ...(override.seeker      ?? {}) },
    orbital:     { ...ROGUELIKE_CONFIG.orbital,     ...(override.orbital     ?? {}) },
    virus:       { ...ROGUELIKE_CONFIG.virus,       ...(override.virus       ?? {}) },
    nuke:        { ...ROGUELIKE_CONFIG.nuke,        ...(override.nuke        ?? {}) },
    speed:       { ...ROGUELIKE_CONFIG.speed,       ...(override.speed       ?? {}) },
    strength:    { ...ROGUELIKE_CONFIG.strength,    ...(override.strength    ?? {}) },
    projectile:  { ...ROGUELIKE_CONFIG.projectile,  ...(override.projectile  ?? {}) },
    luck:        { ...ROGUELIKE_CONFIG.luck,        ...(override.luck        ?? {}) },
    extraLife:   { ...ROGUELIKE_CONFIG.extraLife,   ...(override.extraLife   ?? {}) },
    shield:      { ...ROGUELIKE_CONFIG.shield,      ...(override.shield      ?? {}) },
  };
}

/** Maps power-up ID → stack count (number of times chosen this run). */
export type PermPowerUpState = Record<string, number>;

/** All computed stats the game canvas needs to drive gameplay. */
export interface PlayerStats {
  // ─── Core ────────────────────────────────────────────────────────────
  maxHearts: number;
  slicesPerHeart: number;   // 1 = full hearts, 2 = halves, 3 = thirds, etc.
  reloadTime: number;       // effective cooldown between shots (seconds)
  movementSpeed: number;    // px/sec in base 240×320 space
  damageMultiplier: number; // multiplier on baseBulletDamage
  projectileCount: number;  // bullets per standard shot
  luckBonus: number;        // additive bonus on enemy drop chance

  // ─── Seeker Missile ──────────────────────────────────────────────────
  hasSeekerMissile: boolean;
  seekerMissileDamage: number;  // damage per missile hit
  seekerMissileCooldown: number; // seconds between missile volleys
  seekerMissileCount: number;   // number of missiles per volley

  // ─── Orbital ─────────────────────────────────────────────────────────
  hasOrbital: boolean;
  orbitalDamage: number;
  orbitalOrbitSpeed: number;   // radians per second
  orbitalOrbSize: number;      // radius of each orb in game units
  orbitalCooldown: number;     // seconds cooldown after duration expires
  orbitalRadius: number;       // distance from player centre
  orbitalDuration: number;     // seconds orbs are active
  orbitalOrbCount: number;     // number of orbs (stacks)

  // ─── Virus ───────────────────────────────────────────────────────────
  hasVirus: boolean;
  virusChance: number;
  virusDamagePerTick: number;
  virusDuration: number;
  virusMaxStacks: number;
  virusTickInterval: number;

  // ─── Bomb ────────────────────────────────────────────────────────────
  hasBomb: boolean;
  bombCount: number;
  bombCooldown: number;
  bombDamage: number;
  bombCrossRadius: number;

  // ─── Lightning ───────────────────────────────────────────────────────
  hasLightning: boolean;
  lightningStrikes: number;
  lightningCooldown: number;
  lightningDamage: number;

  // ─── Connect (Lightning modifier) ────────────────────────────────────
  hasConnect: boolean;
  connectDamage: number;

  // ─── Frenzy ──────────────────────────────────────────────────────────
  hasFrenzy: boolean;
  frenzyProjectiles: number;
  frenzyCooldown: number;
  frenzyDamage: number;

  // ─── Projectile (including super bullet) ─────────────────────────────
  totalProjectiles: number;          // raw count before super bullet conversion
  superBulletTier: number;           // 0 = normal, 1 = red, 2 = purple, 3 = gold
  effectiveProjectileCount: number;  // actual projectiles fired per shot
  superBulletDamage: number;         // damage per super bullet (multiplied by damageMultiplier)
  superBulletSize: number;           // size of the super bullet relative to normal (current tier)
  superBulletSizes: [number, number, number]; // per-tier sizes: [red, purple, gold]

  // ─── Nuke ────────────────────────────────────────────────────────────
  hasNuke: boolean;
  nukeActivationsPerCooldown: number;
  nukeCooldown: number;
  nukeBossReduction: number;

  // ─── Periodic Shield ─────────────────────────────────────────────────
  hasPermShield: boolean;
  permShieldDuration: number;
  permShieldCooldown: number;
}

/**
 * Derives all PlayerStats from the current set of chosen power-ups.
 * RapidFire reduces the reload cooldown from base,
 * floored at the configured minimum.
 *
 * @param override  Optional values from siteData.secretGame.roguelikeConfig —
 *                  any provided field overrides the hardcoded ROGUELIKE_CONFIG default.
 */
export function computePlayerStats(chosen: PermPowerUpState, override?: RoguelikeConfigOverride): PlayerStats {
  const cfg = mergeConfig(override);
  const get = (id: string) => chosen[id] ?? 0;

  const slicesIdx = Math.min(get("health"), cfg.health.slicesProgression.length - 1);

  const reloadTime = Math.max(
    cfg.rapidFire.minCooldown,
    cfg.baseReloadTime
      * Math.max(0, 1 - get("rapidFire") * cfg.rapidFire.ratePerStack),
  );

  const sk = get("seeker");
  const orb = get("orbital");
  const vr = get("virus");
  const bm = get("bomb");
  const lt = get("lightning");
  const cn = get("connect");
  const fr = get("frenzy");
  const nk = get("nuke");
  const sh = get("shield");

  // ── Projectile tier calculation (Normal → Red → Purple → Gold) ───────
  const projStack = get("projectile");
  const pCfg = cfg.projectile;
  const tierSize = pCfg.tierSize ?? 5;

  let effectiveProjCount = 1;
  let superTier = 0;
  let superBulletDmg = 1;
  let superSize = 1;

  // Per-tier super-bullet sizes (admin-configurable, with legacy fallback)
  const redSize    = pCfg.redSize    ?? (pCfg.superBulletSizeMultiplier ?? 2.5) * 4;
  const purpleSize = pCfg.purpleSize ?? (pCfg.superBulletSizeMultiplier ?? 2.5) * 6;
  const goldSize   = pCfg.goldSize   ?? (pCfg.superBulletSizeMultiplier ?? 2.5) * 8;
  const superBulletSizes: [number, number, number] = [redSize, purpleSize, goldSize];

  if (projStack > 0) {
    if (projStack < tierSize) {
      // Normal: picks 1-4 → 2-5 projectiles
      effectiveProjCount = projStack + 1;
      superTier = 0;
      superBulletDmg = 1;
    } else if (projStack < tierSize * 2) {
      // Red: picks 5-9 → 1-5 red projectiles
      effectiveProjCount = projStack - 4;
      superTier = 1;
      superBulletDmg = pCfg.redDamage ?? 5;
      superSize = redSize;
    } else if (projStack < tierSize * 3) {
      // Purple: picks 10-14 → 1-5 purple projectiles
      effectiveProjCount = projStack - 9;
      superTier = 2;
      superBulletDmg = pCfg.purpleDamage ?? 10;
      superSize = purpleSize;
    } else if (projStack < tierSize * 4) {
      // Gold: picks 15-19 → 1-5 gold projectiles
      effectiveProjCount = projStack - 14;
      superTier = 3;
      superBulletDmg = pCfg.goldDamage ?? 20;
      superSize = goldSize;
    }
  }

  return {
    maxHearts:       cfg.startingHearts + get("extraLife") * cfg.extraLife.heartsPerStack,
    slicesPerHeart:  cfg.health.slicesProgression[slicesIdx],
    reloadTime,
    movementSpeed:   cfg.baseMovementSpeed * (1 + get("speed") * cfg.speed.speedPerStack),
    damageMultiplier:1 + get("strength") * cfg.strength.damagePerStack,
    projectileCount: effectiveProjCount,
    luckBonus:       get("luck") * cfg.luck.dropChancePerStack,
    totalProjectiles: projStack,
    superBulletTier: superTier,
    effectiveProjectileCount: effectiveProjCount,
    superBulletDamage: superBulletDmg,
    superBulletSize: superSize,
    superBulletSizes,

    hasSeekerMissile: sk > 0,
    seekerMissileDamage: cfg.seeker.missileDamage,
    seekerMissileCooldown: cfg.seeker.missileCooldown,
    seekerMissileCount: sk * cfg.seeker.missilesPerStack,

    hasOrbital:      orb > 0,
    orbitalDamage:   cfg.orbital.damage,
    orbitalOrbitSpeed: cfg.orbital.orbitSpeed,
    orbitalOrbSize:  cfg.orbital.orbSize,
    orbitalCooldown: cfg.orbital.cooldown,
    orbitalRadius:   cfg.orbital.orbitRadius,
    orbitalDuration: cfg.orbital.duration,
    orbitalOrbCount: orb,

    hasVirus:        vr > 0,
    virusChance:     Math.min(1, cfg.virus.baseInfectionChance + Math.max(0, vr - 1) * cfg.virus.chancePerStack),
    virusDamagePerTick: cfg.virus.baseDamagePerTick + Math.max(0, vr - 1) * cfg.virus.damagePerStack,
    virusDuration:   cfg.virus.duration,
    virusMaxStacks:  cfg.virus.maxVirusStacks,
    virusTickInterval: cfg.virus.tickInterval,

    hasBomb:         bm > 0,
    bombCount:       bm * cfg.bomb.bombsPerStack,
    bombCooldown:    cfg.bomb.cooldown,
    bombDamage:      cfg.bomb.damage,
    bombCrossRadius: cfg.bomb.crossRadius,

    hasLightning:    lt > 0,
    lightningStrikes:cfg.lightning.baseStrikes + Math.max(0, lt - 1) * cfg.lightning.strikesPerStack,
    lightningCooldown: cfg.lightning.cooldown,
    lightningDamage: cfg.lightning.damage,

    hasConnect:      cn > 0,
    connectDamage:   cfg.connect.damage + Math.max(0, cn - 1) * cfg.connect.damagePerStack,

    hasFrenzy:       fr > 0,
    frenzyProjectiles: fr <= 20
      ? cfg.frenzy.baseProjectiles + Math.max(0, fr - 1) * cfg.frenzy.projectilesPerStack
      : cfg.frenzy.baseProjectiles + 19 * cfg.frenzy.projectilesPerStack,
    frenzyCooldown:  cfg.frenzy.cooldown,
    frenzyDamage:    fr > 20
      ? cfg.frenzy.damage + (fr - 20) * (cfg.frenzy.damagePerStack ?? 5)
      : cfg.frenzy.damage,

    hasNuke:         nk > 0,
    nukeActivationsPerCooldown: nk * cfg.nuke.nukesPerStack,
    nukeCooldown:    cfg.nuke.cooldown,
    nukeBossReduction: cfg.nuke.bossHPReduction,

    hasPermShield:   sh > 0,
    permShieldDuration: cfg.shield.duration,
    permShieldCooldown: cfg.shield.cooldown,
  };
}
