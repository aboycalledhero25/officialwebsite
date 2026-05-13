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
  machineGun: Partial<RoguelikeConfig['machineGun']>;
  frenzy: Partial<RoguelikeConfig['frenzy']>;
  bomb: Partial<RoguelikeConfig['bomb']>;
  lightning: Partial<RoguelikeConfig['lightning']>;
  connect: Partial<RoguelikeConfig['connect']>;
  seeker: Partial<RoguelikeConfig['seeker']>;
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
    machineGun:  { ...ROGUELIKE_CONFIG.machineGun,  ...(override.machineGun  ?? {}) },
    frenzy:      { ...ROGUELIKE_CONFIG.frenzy,      ...(override.frenzy      ?? {}) },
    bomb:        { ...ROGUELIKE_CONFIG.bomb,        ...(override.bomb        ?? {}) },
    lightning:   { ...ROGUELIKE_CONFIG.lightning,   ...(override.lightning   ?? {}) },
    connect:     { ...ROGUELIKE_CONFIG.connect,     ...(override.connect     ?? {}) },
    seeker:      { ...ROGUELIKE_CONFIG.seeker,      ...(override.seeker      ?? {}) },
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

  // ─── Machine Gun ─────────────────────────────────────────────────────
  isMachineGun: boolean;
  machineGunBurst: number;  // bullets per firing action
  machineGunSpread: number; // angle spread between burst bullets (rad)

  // ─── Seeker ──────────────────────────────────────────────────────────
  isSeeker: boolean;
  seekerStrength: number;   // steering force (higher = tighter homing)
  seekerRange: number;      // px range to seek nearest enemy

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

  const mg = get("machineGun");
  const sk = get("seeker");
  const vr = get("virus");
  const bm = get("bomb");
  const lt = get("lightning");
  const cn = get("connect");
  const fr = get("frenzy");
  const nk = get("nuke");
  const sh = get("shield");

  return {
    maxHearts:       cfg.startingHearts + get("extraLife") * cfg.extraLife.heartsPerStack,
    slicesPerHeart:  cfg.health.slicesProgression[slicesIdx],
    reloadTime,
    movementSpeed:   cfg.baseMovementSpeed * (1 + get("speed") * cfg.speed.speedPerStack),
    damageMultiplier:1 + get("strength") * cfg.strength.damagePerStack,
    projectileCount: 1 + get("projectile") * cfg.projectile.projectilesPerStack,
    luckBonus:       get("luck") * cfg.luck.dropChancePerStack,

    isMachineGun:    mg > 0,
    machineGunBurst: mg > 0 ? cfg.machineGun.baseBurst + (mg - 1) * cfg.machineGun.burstPerStack : 1,
    machineGunSpread:cfg.machineGun.burstSpread,

    isSeeker:        sk > 0,
    seekerStrength:  cfg.seeker.homingStrengthBase + Math.max(0, sk - 1) * cfg.seeker.homingPerStack,
    seekerRange:     cfg.seeker.seekerRange,

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
    frenzyProjectiles: cfg.frenzy.baseProjectiles + Math.max(0, fr - 1) * cfg.frenzy.projectilesPerStack,
    frenzyCooldown:  cfg.frenzy.cooldown,
    frenzyDamage:    cfg.frenzy.damage,

    hasNuke:         nk > 0,
    nukeActivationsPerCooldown: nk * cfg.nuke.nukesPerStack,
    nukeCooldown:    cfg.nuke.cooldown,
    nukeBossReduction: cfg.nuke.bossHPReduction,

    hasPermShield:   sh > 0,
    permShieldDuration: cfg.shield.duration,
    permShieldCooldown: cfg.shield.cooldown,
  };
}
